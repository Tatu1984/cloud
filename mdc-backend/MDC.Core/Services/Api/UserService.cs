using MDC.Core.Services.Providers.MDCDatabase;
using Microsoft.Extensions.Options;
using Microsoft.Graph;

namespace MDC.Core.Services.Api;

internal class UserService(IMDCDatabaseService databaseService, GraphServiceClient  graphClient, IOptions<UserServiceOptions> options) : IUserService
{
    public async Task<User> CreateAsync(UserRegistrationDescriptor userDescriptor, CancellationToken cancellationToken = default)
    {
        // Validate that the User exists in the Directory
        var graphUser = await graphClient.Users[userDescriptor.Id].GetAsync(i => i.QueryParameters.Expand = ["AppRoleAssignments"], cancellationToken) ?? throw new InvalidOperationException($"Failed to find user in Microsoft Graph with Id {userDescriptor.Id}");
        if (!Guid.TryParse(graphUser.Id, out var id))         
        {
            throw new InvalidOperationException($"Graph User Id {graphUser.Id} is not a valid GUID");
        }
        if (graphUser.UserPrincipalName == null)
        {
            throw new InvalidOperationException($"Graph User with Id {graphUser.Id} has no UserPrincipalName");
        }

        // Validate that ApplicationRoles can be assigned
        userDescriptor.ApplicationRoles ??= [];
        if (userDescriptor.ApplicationRoles.Length > 0 && options.Value.EnterpriseAppObjectId == null)
            throw new InvalidOperationException("Unable to manage Application Roles because Enterprise App Id is not configured");
        
        // Execute the actions
        var dbUser = await databaseService.CreateUserAsync(id, graphUser.UserPrincipalName, userDescriptor.OrganizationRoles, cancellationToken);

        if (userDescriptor.ApplicationRoles.Length > 0)
        {
            var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, cancellationToken) ?? throw new InvalidOperationException("Unable to fetch Application Registration from Azure AD");
            var addAppRoles = userDescriptor.ApplicationRoles.Select(i => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.DisplayName == i) ?? throw new InvalidOperationException($"Application Role {i} is not a valid.")).ToArray();

            foreach (var addAppRole in addAppRoles.ExceptBy(graphUser!.AppRoleAssignments!.Select(i => i.AppRoleId), i => i.Id))
            {
                var assignment = new Microsoft.Graph.Models.AppRoleAssignment()
                {
                    ResourceId = Guid.Parse(options.Value.EnterpriseAppObjectId!),
                    PrincipalId = id,
                    AppRoleId = addAppRole.Id
                };

                var appRemoteAssignment = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].AppRoleAssignedTo.PostAsync(assignment, null, cancellationToken);
            }
        }

        return (await ComputeUsersAsync([dbUser], false, cancellationToken)).FirstOrDefault() ?? throw new InvalidOperationException($"Failed to fetch newly registered User with Id {userDescriptor.Id}");
    }

    public async Task<User[]> GetAllAsync(bool getUnregisteredUsers, CancellationToken cancellationToken = default)
    {
        var dbUsers = await databaseService.GetUsersAsync(cancellationToken);

        return await ComputeUsersAsync(dbUsers,getUnregisteredUsers, cancellationToken);
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dbUser = await databaseService.GetUserByIdAsync(id, cancellationToken);
        if (dbUser == null) return null;
        return (await ComputeUsersAsync([dbUser], false, cancellationToken)).FirstOrDefault();
    }

    public async Task<User> UpdateAsync(Guid id, UserUpdateDescriptor userDescriptor, CancellationToken cancellationToken = default)
    {
        var dbUser = await databaseService.GetUserByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"User with Id {id} not registered");

        userDescriptor.AddOrganizationRoles ??= [];
        userDescriptor.RemoveOrganizationRoles ??= [];

        var organizationOperations = userDescriptor
            .AddOrganizationRoles
            .Select(i => new
            {
                Operation = "add",
                Data = i
            })
            .Concat(userDescriptor.RemoveOrganizationRoles.Select(i => new
            {
                Operation = "remove",
                Data = i
            }))
            .ToLookup(i => i.Data.OrganizationId);

        foreach (var organizationOperation in organizationOperations)
        {
            var dbOrganization = await databaseService.UpdateOrganizationAsync(organizationOperation.Key, null, [], [],
                (organizationOperation.Where(i => i.Operation == "add")).Select(i => new OrganizationUserRoleDescriptor
                {
                    Role = i.Data.Role,
                    UserId = id
                }).ToArray(),
                (organizationOperation.Where(i => i.Operation == "remove")).Select(i => new OrganizationUserRoleDescriptor
                {
                    Role = i.Data.Role,
                    UserId = id
                }).ToArray(), 
                cancellationToken);
        }
       
        userDescriptor.RemoveApplicationRoles ??= [];
        userDescriptor.AddApplicationRoles ??= [];

        if (userDescriptor.RemoveApplicationRoles.Length > 0 || userDescriptor.AddApplicationRoles.Length > 0)
        {
            var graphUser = await graphClient.Users[dbUser.Id.ToString()].GetAsync(i => i.QueryParameters.Expand = ["AppRoleAssignments"], cancellationToken) ?? throw new InvalidOperationException($"Failed to find user in Microsoft Graph with Id {dbUser.Id}");

            if (options.Value.EnterpriseAppObjectId == null)
                throw new InvalidOperationException("Unable to manage Application Roles because Enterprise App Id is not configured");

            var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, cancellationToken) ?? throw new InvalidOperationException("Unable to fetch Application Registration from Azure AD");

            var removeAppRoles = userDescriptor.RemoveApplicationRoles.Select(i => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.DisplayName == i) ?? throw new InvalidOperationException($"Application Role {i} is not a valid.")).ToArray();
            var addAppRoles = userDescriptor.AddApplicationRoles.Select(i => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.DisplayName == i) ?? throw new InvalidOperationException($"Application Role {i} is not a valid.")).ToArray();

            foreach (var removeAppRole in removeAppRoles)
            {
                var appRoleAssignment = graphUser.AppRoleAssignments?.FirstOrDefault(i => i.AppRoleId == removeAppRole.Id);
                if (appRoleAssignment == null)
                    continue;

                //var assignment = new Microsoft.Graph.Models.AppRoleAssignment()
                //{
                //    ResourceId = Guid.Parse(options.Value.EnterpriseAppObjectId),
                //    PrincipalId = id,
                //    AppRoleId = appRoleAssignment.Id
                //};

                await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].AppRoleAssignedTo[appRoleAssignment.Id].DeleteAsync(null, cancellationToken);
            }

            foreach (var addAppRole in addAppRoles.ExceptBy(graphUser!.AppRoleAssignments!.Select(i => i.AppRoleId), i => i.Id))
            {
                var assignment = new Microsoft.Graph.Models.AppRoleAssignment()
                {
                    ResourceId = Guid.Parse(options.Value.EnterpriseAppObjectId),
                    PrincipalId = id,
                    AppRoleId = addAppRole.Id
                };

                var appRemoteAssignment = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].AppRoleAssignedTo.PostAsync(assignment, null, cancellationToken);
            }
        }

        return await GetByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Failed to fetch updated User with Id {id}");
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        // Note: Deleting the user does not remove them from Azure AD at this time
        await databaseService.RemoveUserAsync(id, cancellationToken); 
    }

    private async Task<User[]> ComputeUsersAsync(DbUser[] dbUsers, bool getUnregisteredUsers, CancellationToken cancellationToken = default)
    {
        var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, cancellationToken) ?? throw new InvalidOperationException("Unable to fetch Application Registration from Azure AD");

        var appRoleAssignments = await GetAppRoleAssignments(cancellationToken);
        var lookup = appRoleAssignments.ToLookup(a => a.PrincipalId!.Value);

        var users = dbUsers
            .Where(dbUser => lookup.Contains(dbUser.Id))
            .Select(dbUser =>
            new User
            {
                Id = dbUser.Id,
                DisplayName = lookup[dbUser.Id].FirstOrDefault()?.PrincipalDisplayName ?? dbUser.Name,
                IsRegistered = true,
                OrganizationRoles = dbUser.OrganizationUserRoles.Select(our => new UserOrganizationRole
                {
                    OrganizationId = our.OrganizationId,
                    Role = our.Role,
                }).ToArray(),
                AppRoles = lookup[dbUser.Id]
                    .Select(a => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.Id == a.AppRoleId))
                    .Where(appRole => appRole != null && appRole.DisplayName != null)
                    .Select(appRole => appRole!.DisplayName!)
                    .ToArray()
            })
            .ToList();

        // Retrieve the unregistered users
        if (getUnregisteredUsers)
        {
            var unregisteredUsers = lookup
            .Where(g => !dbUsers.Any(u => u.Id == g.Key))
            .Select(g => g.Key)
            .ToArray();

            if (unregisteredUsers.Length > 0)
            {
                var graphUsers = (await graphClient.Users.GetAsync(null, cancellationToken))?.Value?.ToDictionary(i => i.Id!) ?? throw new InvalidOperationException("Unable to retrieve users from Azure Ad.");

                users.AddRange(unregisteredUsers.Select(user => new User
                {
                    Id = user,
                    DisplayName = graphUsers.GetValueOrDefault(user.ToString())?.DisplayName ?? user.ToString(),
                    IsRegistered = false,
                    OrganizationRoles = Array.Empty<UserOrganizationRole>(),
                    AppRoles = lookup[user]
                        .Select(a => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.Id == a.AppRoleId))
                        .Where(appRole => appRole != null && appRole.DisplayName != null)
                        .Select(appRole => appRole!.DisplayName!)
                        .ToArray()
                }));
            }
        }
        return users.ToArray();
    }

    private async Task<Microsoft.Graph.Models.AppRoleAssignment[]> GetAppRoleAssignments(CancellationToken cancellationToken = default)
    {
        if (options.Value.EnterpriseAppObjectId == null)
            throw new InvalidOperationException("Unable to manage Application Roles because Enterprise App Id is not configured");

        var assignments = new List<Microsoft.Graph.Models.AppRoleAssignment>();

        // 1️⃣ Get all assignments (paged)
        var page = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId]
            .AppRoleAssignedTo
            .GetAsync(null, cancellationToken);

        while (true)
        {
            assignments.AddRange(page!.Value!);

            if (page.OdataNextLink == null)
                break;

            page = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId]
                .AppRoleAssignments
                .WithUrl(page.OdataNextLink)
                .GetAsync(null, cancellationToken);
        }

        return assignments.Where(i => i.PrincipalType == "User").ToArray();
    }
}
