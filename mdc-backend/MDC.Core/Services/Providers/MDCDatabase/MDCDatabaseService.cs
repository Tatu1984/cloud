using MDC.Core.Models;
using MDC.Core.Services.Providers.Authentication;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Graph.Models;
using System;
using System.Linq;

namespace MDC.Core.Services.Providers.MDCDatabase;

internal class MDCDatabaseService(MDCDbContext dbContext, IMDCPrincipalAccessor mdcPrincipalAccessor, ILogger<MDCDatabaseService> logger) : IMDCDatabaseService
{
    const string DefaultOrganizationName = "Default";

    public async Task<DbSite> CreateSiteAsync(string name, string description, string apiTokenId, string apiSecret, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        //// When creating a site, at least one active organization must be specified
        //if (organizationIds.Length == 0) throw new InvalidOperationException("No organizations are specified for the site.");

        //var dbOrganizations = await dbContext.Organizations.Where(i => i.Active && organizationIds.Contains(i.Id)).ToArrayAsync(cancellationToken);
        //if (dbOrganizations.Length != organizationIds.Length) throw new InvalidOperationException("One or more organizations not found.");

        var site = await dbContext.Sites.FirstOrDefaultAsync(site => site.Name == name, cancellationToken);
        var now = DateTime.UtcNow;
        if (site == null)
        {
            var newSite = await dbContext.Sites.AddAsync(new DbSite
            {
                Name = name,
                Description = description,
                ApiTokenId = apiTokenId,
                ApiSecret = apiSecret,
                CreatedAt = now,
                UpdatedAt = now,
                //Organizations = dbOrganizations
            }, cancellationToken);
            site = newSite.Entity;
        }
        else
        {
            site.Name = name;
            site.Description = description;
            site.ApiTokenId = apiTokenId;
            site.ApiSecret = apiSecret;
            site.UpdatedAt = now;

            //foreach (var dbOrganization in dbOrganizations)
            //{
            //    if (site.Organizations.Contains(dbOrganization))
            //        continue;
            //    site.Organizations.Add(dbOrganization);
            //}
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return site;
    }

    public async Task<DbSite> UpdateSiteAsync(Guid id, string? description, string? apiTokenId, string? apiSecret, Guid[]? organizationIds, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        var dbSite = await dbContext.Sites.FindAsync([id], cancellationToken) ?? throw new InvalidOperationException("Site not found.");
        var now = DateTime.UtcNow;

        if (description != null)
            dbSite.Description = description;

        if (apiTokenId != null)
            dbSite.ApiTokenId = apiTokenId;

        if (apiSecret != null)
            dbSite.ApiSecret = apiSecret;

        if (organizationIds != null)
        {
            var dbOrganizations = await dbContext.Organizations.Where(i => i.Active && organizationIds.Contains(i.Id)).ToArrayAsync(cancellationToken);
            if (dbOrganizations.Length != organizationIds.Length) throw new InvalidOperationException("One or more organizations not found.");

            foreach (var dbOrganization in dbOrganizations)
            {
                if (dbSite.Organizations.Contains(dbOrganization))
                    continue;
                dbSite.Organizations.Add(dbOrganization);
            }
        }
        dbSite.UpdatedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);
        return dbSite;
    }

    public async Task<DbSiteNode> CreateSiteNodeAsync(Guid siteId, string memberAddress, string name, int apiPort, bool apiValidateServerCertificate, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        var siteNode = await dbContext.SiteNodes.FirstOrDefaultAsync(siteNode => siteNode.MemberAddress == memberAddress, cancellationToken);
        var now = DateTime.UtcNow;
        if (siteNode == null)
        {
            var newSiteNode = await dbContext.SiteNodes.AddAsync(new DbSiteNode
            { 
                MemberAddress = memberAddress,
                Name = name,
                ApiPort = apiPort,
                ApiValidateServerCertificate = apiValidateServerCertificate,
                CreatedAt = now,
                UpdatedAt = now,
                SiteId = siteId
            }, cancellationToken);
            siteNode = newSiteNode.Entity;
        }
        else
        {
            siteNode.UpdatedAt = now;
            siteNode.Name = name;
            siteNode.ApiPort = apiPort;
            siteNode.ApiValidateServerCertificate = apiValidateServerCertificate;
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return siteNode;
    }

    public async Task<DbSite?> GetSiteByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .SelectMany(i => i.Sites).Distinct()
            .Include(i => i.Workspaces)
            .Include(i => i.SiteNodes)
            .Include(i => i.Organizations)
            .FirstOrDefaultAsync(site => site.Name == name, cancellationToken);
    }

    public async Task<DbSite?> FindSiteAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        var dbSite = await UserOrganizations
            .SelectMany(i => i.Sites).Distinct()
            .Include(i => i.Workspaces)
            .Include(i => i.Organizations)
            .Include(i => i.SiteNodes)
            .FirstOrDefaultAsync(i => i.Id == siteId, cancellationToken);
        if (dbSite == null) return null;

        return dbSite;
    }

    public async Task<DbSite[]> GetAllSitesAsync(CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .SelectMany(i => i.Sites).Distinct()
            .Include(i => i.Workspaces)
            .Include(i => i.Organizations)
            .Include(i => i.SiteNodes)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<DbSiteNode[]> GetAllSitesNodesAsync(CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .SelectMany(i => i.Sites).Distinct()
            .SelectMany(i => i.SiteNodes)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<DbSiteNode?> GetSiteNodeAsync(string memberAddress, CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .SelectMany(i => i.Sites).Distinct()
            .SelectMany(i => i.SiteNodes)
            .FirstOrDefaultAsync(siteNode => siteNode.MemberAddress == memberAddress, cancellationToken);
    }

    public async Task<DbWorkspace[]> ImportWorkspacesAsync(Guid siteId, Guid organizationId, IEnumerable<WorkspaceEntry> workspaceEntries, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        var existing = await dbContext.Workspaces
            .Where(i => i.SiteId == siteId)
            .Select(i => i.Address)
            .ToArrayAsync(cancellationToken);
        
        var now = DateTime.UtcNow;
        var dbWorkspaces = workspaceEntries
            .Where(entry => entry.DbWorkspace == null && entry.Address != 0 && !string.IsNullOrEmpty(entry.Name) && !existing.Contains(entry.Address))
            .Select(entry => entry.DbWorkspace = new DbWorkspace
            {
                OrganizationId = organizationId,
                SiteId = siteId,
                Address = entry.Address,
                Name = entry.Name,
                Description = string.Empty,
                CreatedAt = now,
                UpdatedAt = now,
                Status = null,
                Locked = entry.Locked
            })
            .ToArray();

        if (dbWorkspaces.Length == 0) return Array.Empty<DbWorkspace>();

        logger.LogInformation("Adding {importWorkspacesCount} New Workspaces to database for Side Id '{siteId}', Organization Id '{organizationId}'.", dbWorkspaces.Length, siteId, organizationId);
        await dbContext.Workspaces.AddRangeAsync(dbWorkspaces, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return dbWorkspaces.ToArray();
    }

    public async Task<DbVirtualNetwork[]> ImportVirtualNetworksAsync(IEnumerable<WorkspaceEntry> workspaceEntries, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        var now = DateTime.UtcNow;
        var dbVirtualNetworks = workspaceEntries.Where(i => i.DbWorkspace != null)
            .SelectMany(we => we.VirtualNetworks.Where(i => i.DbVirtualNetwork == null && i.Index.HasValue && i.Name != null && i.Tag.HasValue), 
                (we,vn) => new
                    {
                        WorkspaceEntry = we,
                        VirtualNetworkEntry = vn
                    }
            )
            .Select(i =>
                i.VirtualNetworkEntry.DbVirtualNetwork = new DbVirtualNetwork
                {
                    WorkspaceId = i.WorkspaceEntry.DbWorkspace!.Id,
                    Index = i.VirtualNetworkEntry.Index!.Value,
                    Name = i.VirtualNetworkEntry.Name!,
                    Tag = i.VirtualNetworkEntry.Tag!.Value,
                    CreatedAt = now,
                    UpdatedAt = now,
                    ZeroTierNetworkId = null
                }
            )
            .ToArray();

        var existing = await dbContext.VirtualNetworks
            .Where(i => dbVirtualNetworks.Select(vn => vn.WorkspaceId).Contains(i.WorkspaceId))
            .Select(i => new { i.WorkspaceId, i.Tag })
            .ToListAsync(cancellationToken);

        var updateDbVirtualNetworks = dbVirtualNetworks
            .Where(vn => !existing.Any(e => e.WorkspaceId == vn.WorkspaceId && e.Tag == vn.Tag))
            .ToArray();

        if (updateDbVirtualNetworks.Length == 0) return Array.Empty<DbVirtualNetwork>();

        logger.LogInformation("Adding {importVirtualNetworkCount} New Virtual Networks to database.", dbVirtualNetworks.Length);
        await dbContext.VirtualNetworks.AddRangeAsync(updateDbVirtualNetworks, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return dbVirtualNetworks;
    }

    public async Task<DbWorkspace?> GetWorkspaceByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .SelectMany(i => i.Workspaces)
            .Include(i =>i.Site)
            .ThenInclude(i => i.SiteNodes)
            .Include(i => i.Organization)
            .Include(i => i.VirtualNetworks)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<DbWorkspace>> GetAllWorkspacesAsync(CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .SelectMany(i => i.Workspaces)
            .Include(i => i.Site)
            .Include(i => i.Organization)
            .Include(i => i.VirtualNetworks)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<IEnumerable<DbWorkspace>> GetAllWorkspacesForSiteAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .SelectMany(i => i.Workspaces)
            .Include(i => i.Site)
            .Include(i => i.Organization)
            .Include(i => i.VirtualNetworks)
            .Where(i => i.SiteId == siteId)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<DbWorkspace> CreateWorkspaceAsync(Guid siteId, Guid? organizationId, string workspaceName, string? description, string[] virtualNetworkNames, DatacenterSettings datacenterSettings, CancellationToken cancellationToken = default)
    {
        if (!mdcPrincipalAccessor.IsWorkspaceManager && !mdcPrincipalAccessor.IsGlobalAdministrator) throw new InvalidOperationException("Not authorized.");
        var dbSite = await FindSiteAsync(siteId, cancellationToken) ?? throw new InvalidOperationException("Site not found.");

        var dbOrganization = organizationId == null 
            ? await GetDefaultOrganizationAsync(dbSite, cancellationToken)
            : await dbContext.Organizations.FindAsync([organizationId], cancellationToken) ?? throw new InvalidOperationException($"Organization '{organizationId}' not found.");
        
        if (!dbSite.Organizations.Contains(dbOrganization)) throw new InvalidOperationException("Organization is not a member of Site.");

        using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        try
        {
            // Compute Next Available Address
            var exisingAddresses = await dbContext.Workspaces.Where(i => i.SiteId == siteId).Select(i => i.Address).ToArrayAsync(cancellationToken);
            if (exisingAddresses.Length >= (9999 - datacenterSettings.MinWorkspaceAddress)) throw new InvalidOperationException("Unable to create new Workspace.  Maximum number of Workspaces has been reached.");

            var existingTags = await dbContext.VirtualNetworks.Where(i => i.Workspace!.SiteId == siteId).Select(i => i.Tag).ToListAsync(cancellationToken);
            if (existingTags.Count >= (4096 - datacenterSettings.MinVirtualNetworkTag - virtualNetworkNames.Length)) throw new InvalidOperationException("Unable to create new Workspace.  Maximum number of Virtual Networks has been reached.");

            var now = DateTime.UtcNow;
            var dbWorkspace = new DbWorkspace
            {
                OrganizationId = dbOrganization.Id,
                SiteId = siteId,
                Address = Enumerable.Range(datacenterSettings.MinWorkspaceAddress, exisingAddresses.Length + 1).Except(exisingAddresses).First(),  // The lowest Address available
                Name = workspaceName,
                Description = description,
                CreatedAt = now,
                UpdatedAt = now,
                Status = "Creating",
                Locked = false
            };
            var newWorkspace = await dbContext.Workspaces.AddAsync(dbWorkspace, cancellationToken);

            for (int index = 0; index < virtualNetworkNames.Length; index++)
            {
                var dbVirtualNetwork = new DbVirtualNetwork
                {
                    Index = index,
                    Tag = Enumerable.Range(datacenterSettings.MinVirtualNetworkTag, existingTags.Count + 1).Except(existingTags).First(),  // The lowest Address Tag
                    Name = virtualNetworkNames[index],
                    CreatedAt = now,
                    UpdatedAt = now,
                    WorkspaceId = newWorkspace.Entity.Id,
                    Workspace = newWorkspace.Entity,
                    ZeroTierNetworkId = null
                };
                var newVirtualNetwork = await dbContext.VirtualNetworks.AddAsync(dbVirtualNetwork, cancellationToken);
                existingTags.Add(dbVirtualNetwork.Tag);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return newWorkspace.Entity;
        }
        catch (Exception)
        {
            // TODO: Log this exception
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<DbWorkspace> UpdateWorkspaceAsync(DatacenterEntry datacenterEntry, Guid workspaceId, WorkspaceDescriptor workspaceDescriptor, CancellationToken cancellationToken = default)
    {
        if (!mdcPrincipalAccessor.IsWorkspaceManager) throw new InvalidOperationException("Not authorized.");
        if (!UserOrganizations.Any(i => i.Workspaces.Any(w => w.Id == workspaceId)))
            throw new InvalidOperationException($"Workspace '{workspaceId}' not found.");

        using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        try
        {
            var dbWorkspace = await dbContext.Workspaces
                .Include(i => i.VirtualNetworks)
                .FirstOrDefaultAsync(i => i.Id == workspaceId && i.SiteId == datacenterEntry.DbSite.Id, cancellationToken)
                ?? throw new InvalidOperationException($"Workspace '{workspaceId}' not found.");

            var now = DateTime.UtcNow;

            if (dbWorkspace.Name != workspaceDescriptor.Name)
            {
                dbWorkspace.Name = workspaceDescriptor.Name;
                dbWorkspace.UpdatedAt = now;
            }

            // First, process all of the Virtual Network deletions
            foreach (var virtualNetworkDescriptor in (workspaceDescriptor.VirtualNetworks ?? []).Where(i => i.Operation == VirtualNetworkDescriptorOperation.Remove))
            {
                var dbVirtualNetwork = dbWorkspace.VirtualNetworks.FirstOrDefault(i => i.Name == virtualNetworkDescriptor.Name);     // Note that the Virtual Networks within a Workspace must have unique names
                if (dbVirtualNetwork == null) continue; // A name was specified that does not exist, so just ignore it

                dbContext.Remove(dbVirtualNetwork);
            }

            // Next, process all of the Virtual Network additions
            var addVirtualNetworkDescriptors = (workspaceDescriptor.VirtualNetworks ?? []).Where(i => i.Operation == VirtualNetworkDescriptorOperation.Add).ToArray() ?? [];
            if (addVirtualNetworkDescriptors.Length > 0) 
            {
                var existingTags = await dbContext.VirtualNetworks.Where(i => i.Workspace!.SiteId == datacenterEntry.DbSite.Id).Select(i => i.Tag).ToListAsync(cancellationToken);
                if (existingTags.Count >= (4096 - datacenterEntry.DatacenterSettings.MinVirtualNetworkTag - addVirtualNetworkDescriptors.Length)) throw new InvalidOperationException("Unable to create new Virtual Networks.  Maximum number of Virtual Networks has been reached.");

                for (int index = 0; index < addVirtualNetworkDescriptors.Length; index++)
                {
                    var dbVirtualNetwork = new DbVirtualNetwork
                    {
                        Index = index,
                        Tag = Enumerable.Range(datacenterEntry.DatacenterSettings.MinVirtualNetworkTag, existingTags.Count + 1).Except(existingTags).First(),  // The lowest Address Tag
                        Name = addVirtualNetworkDescriptors[index].Name!,
                        CreatedAt = now,
                        UpdatedAt = now,
                        WorkspaceId = dbWorkspace.Id,
                        Workspace = dbWorkspace,
                        ZeroTierNetworkId = null
                    };
                    var newVirtualNetwork = await dbContext.VirtualNetworks.AddAsync(dbVirtualNetwork, cancellationToken);
                    existingTags.Add(dbVirtualNetwork.Tag);
                }
            }

            // Finally, process all of the Virtual Network updates
            foreach (var virtualNetworkDescriptor in (workspaceDescriptor.VirtualNetworks ?? []).Where(i => i.Operation == VirtualNetworkDescriptorOperation.Update))
            {
                var dbVirtualNetwork = dbWorkspace.VirtualNetworks.FirstOrDefault(i => i.Name == virtualNetworkDescriptor.Name) ?? throw new InvalidOperationException($"Virtual Network '{virtualNetworkDescriptor.Name}' not found in database for Workspace '{workspaceId}'.");

                // TODO: Update the ZeroTierNetworkId if it has changed
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return dbWorkspace;
        }
        catch (Exception)
        {
            // TODO: Log this exception
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<int> DeleteWorkspaceAsync(DbWorkspace dbWorkspace, CancellationToken cancellationToken = default)
    {
        if (!mdcPrincipalAccessor.IsWorkspaceManager && !mdcPrincipalAccessor.IsGlobalAdministrator) throw new InvalidOperationException("Not authorized.");
        
        var changes = dbContext.Remove(dbWorkspace);
        var rows = await dbContext.SaveChangesAsync(cancellationToken);
        return rows;
    }

    public async Task SetWorkspaceLockAsync(DbWorkspace dbWorkpace, bool locked, CancellationToken cancellationToken = default)
    {
        if (!mdcPrincipalAccessor.IsWorkspaceManager && !mdcPrincipalAccessor.IsGlobalAdministrator) throw new InvalidOperationException("Not authorized.");

        dbWorkpace.Locked = locked;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<DbVirtualNetwork> UpdateVirtualNetworkAsync(DbVirtualNetwork dbVirtualNetwork, CancellationToken cancellationToken = default)
    {
        if (!mdcPrincipalAccessor.IsWorkspaceManager && !mdcPrincipalAccessor.IsGlobalAdministrator) throw new InvalidOperationException("Not authorized.");

        dbVirtualNetwork.UpdatedAt = DateTime.UtcNow;
        dbContext.VirtualNetworks.Update(dbVirtualNetwork);
        await dbContext.SaveChangesAsync(cancellationToken);
        return dbVirtualNetwork;
    }

    public async Task<DbUser[]> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        return await AvailableUsers
            .ToArrayAsync(cancellationToken);
    }

    public async Task<DbUser?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await AvailableUsers
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<DbUser> CreateUserAsync(Guid id, string name, UserOrganizationRole[]? userOrganizationRoles, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        // TODO: Validate that userOrganizationRoles are valid
        userOrganizationRoles ??= [];

        // Update user and organizations within a database transaction
        using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        try
        {
            var user = await dbContext
            .Users
            .Include(i => i.OrganizationUserRoles)
            .FirstOrDefaultAsync(i => i.Id == id && i.Active, cancellationToken);

            var now = DateTime.UtcNow;
            if (user != null)
            {
                user.Name = name;
                user.UpdatedAt = now;
                user.Active = true;
            }
            else
            {
                var newUser = await dbContext.Users.AddAsync(new DbUser
                {
                    Id = id,
                    Name = name,
                    Active = true,
                    CreatedAt = now,
                    UpdatedAt = now
                }, cancellationToken);
                user = newUser.Entity;
            }

            foreach (var role in userOrganizationRoles)
            {
                // Add OrganizationUserRole if the role does not already exist for this user in this organization
                if (!user.OrganizationUserRoles.Any(i => i.OrganizationId == role.OrganizationId && i.Role == role.Role))
                {
                    user.OrganizationUserRoles.Add(new DbOrganizationUserRole
                    {
                        UserId = id,
                        OrganizationId = role.OrganizationId,
                        Role = role.Role,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return user;
        }
        catch (Exception)
        {
            // TODO: Log this exception
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    //public async Task<DbUser> UpdateUserAsync(Guid id, string[]? addOrganizationUserRoles, string[]? removeOrganizationUserRoles, CancellationToken cancellationToken = default)
    //{
    //    if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

    //    removeOrganizationUserRoles ??= [];

    //    var dbUser = await dbContext
    //        .Users
    //        .Include(i => i.OrganizationUserRoles)
    //        .FirstOrDefaultAsync(i => i.Id == id && i.Active, cancellationToken) ?? throw new InvalidOperationException($"User Id '{id}' not found.");

    //    var existingRoles = dbUser.OrganizationUserRoles.Select(i => i.Role).ToHashSet(StringComparer.OrdinalIgnoreCase);
    //    if (removeOrganizationUserRoles.Except(existingRoles).Any())
    //    {
    //        throw new InvalidOperationException("Organization User Roles being removed must belong to the user being updated");
    //    }

    //    if (dbUser.OrganizationUserRoles.Any(i => removeOrganizationUserRoles != null && removeOrganizationUserRoles.Contains(i.Role)))
    //    {
    //        var rolesToRemove = dbUser.OrganizationUserRoles.Where(i => removeOrganizationUserRoles != null && removeOrganizationUserRoles.Contains(i.Role)).ToArray();
    //        dbContext.OrganizationUserRoles.RemoveRange(rolesToRemove);
    //    }


    //    if (addOrganizationUserRoles.Concat(removeOrganizationUserRoles).Concat(updateOrganizationUserRoles).Any(i => i.UserId != id))
    //        throw new InvalidOperationException("Organization User Roles must belong to the user being updated");

    //    var user = await dbContext
    //        .Users
    //        .Include(i => i.OrganizationUserRoles)
    //        .FirstOrDefaultAsync(i => i.Id == id, cancellationToken) ?? throw new InvalidOperationException($"User Id '{id}' not found.");
    //    var now = DateTime.UtcNow;
    //    user.UpdatedAt = now;

    //    dbContext.RemoveRange(removeOrganizationUserRoles);
    //    dbContext.AddRange(addOrganizationUserRoles);
    //    dbContext.UpdateRange(updateOrganizationUserRoles);

    //    await dbContext.SaveChangesAsync(cancellationToken);

    //    return user;
    //}

    public async Task<bool> RemoveUserAsync(Guid id, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        var user = await dbContext
            .Users
            .FirstOrDefaultAsync(i => i.Id == id && i.Active, cancellationToken) ?? throw new InvalidOperationException($"User Id '{id}' not found.");

        var now = DateTime.UtcNow;
        user.Active = false;
        user.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    #region Organizations
    public async Task<DbOrganization> GetDefaultOrganizationAsync(DbSite site, CancellationToken cancellationToken = default)
    {
        var dbOrganization = (await GetOrganizationsByNameAsync(DefaultOrganizationName, cancellationToken)).FirstOrDefault();
        if (dbOrganization == null)
        {
            dbOrganization = await CreateOrganizationAsync(new OrganizationDescriptor
            { 
                Name = DefaultOrganizationName,
                SiteIds = Array.Empty<Guid>() ,
                OrganizationUserRoles = Array.Empty<OrganizationUserRoleDescriptor>()
            }, cancellationToken);
        }

        if (!dbOrganization.Sites.Contains(site))
        {
            dbOrganization.Sites.Add(site);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        
        return dbOrganization;
    }
    
    public async Task<DbOrganization[]> GetOrganizationsAsync(CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .ToArrayAsync(cancellationToken);
    }

    public async Task<DbOrganization?> GetOrganizationByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .Include(i => i.OrganizationUserRoles.Where(j => j.User!.Active))
            .ThenInclude(i => i.User)
            .Include(i => i.Sites)
            .Include(i => i.Workspaces)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<DbOrganization[]> GetOrganizationsByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .Include(i => i.OrganizationUserRoles.Where(j => j.User!.Active))
            .Include(i => i.Sites)
            .Include(i => i.Workspaces)
            .Where(i => i.Name == name)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<DbOrganization> CreateOrganizationAsync(OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        if (organizationDescriptor.Name == DefaultOrganizationName) throw new InvalidOperationException($"Cannot create Organization with the default Organization Name: '{DefaultOrganizationName}'");

        // Ensure that all of the Sites and Users are valid
        var sites = organizationDescriptor.SiteIds.Length > 0 ? (await dbContext.Sites.Where(i => organizationDescriptor.SiteIds.Contains(i.Id)).ToListAsync(cancellationToken)) : new List<DbSite>();
        if (sites.Count != organizationDescriptor.SiteIds.Length) throw new InvalidOperationException($"Site Id Not found: '{string.Join(',', organizationDescriptor.SiteIds.Except(sites.Select(i => i.Id)))}'");

        var dictOrganizationUserRoles = organizationDescriptor.OrganizationUserRoles.ToDictionary(i => i.UserId);
        var users = organizationDescriptor.OrganizationUserRoles.Length > 0 ? (await dbContext.Users.Where(i => i.Active && dictOrganizationUserRoles.Keys.Contains(i.Id)).ToListAsync(cancellationToken)) : new List<DbUser>();
        if (users.Count != dictOrganizationUserRoles.Keys.Count) throw new InvalidOperationException($"User Id Not found: '{string.Join(',', dictOrganizationUserRoles.Keys.Except(users.Select(i => i.Id)))}'");

        var now = DateTime.UtcNow;
        var organization = await dbContext.Organizations.AddAsync(new DbOrganization
        {
            Name = organizationDescriptor.Name,
            Active = true,
            CreatedAt = now,
            UpdatedAt = now,
            Sites = sites,
            OrganizationUserRoles = new List<DbOrganizationUserRole>()
        }, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        if (organizationDescriptor.OrganizationUserRoles.Length > 0)
        {
            var organizationUserRoles = organizationDescriptor.OrganizationUserRoles.Select(i => new DbOrganizationUserRole
            {
                CreatedAt = now,
                UpdatedAt = now,
                OrganizationId = organization.Entity.Id,
                Role = i.Role,
                UserId = i.UserId
            }).ToArray();
            await dbContext.OrganizationUserRoles.AddRangeAsync(organizationUserRoles, cancellationToken);

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return organization.Entity;
    }

    public async Task<DbOrganization> UpdateOrganizationAsync(Guid id, string? name, Guid[] addSiteIds, Guid[] removeSiteIds, OrganizationUserRoleDescriptor[] addUsers, OrganizationUserRoleDescriptor[] removeUsers, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        if (name == DefaultOrganizationName) throw new InvalidOperationException($"Cannot change Organization name with the default Organization Name: '{DefaultOrganizationName}'");

        var dbOrganization = await dbContext
            .Organizations
            .Include(i => i.Sites)
            .FirstOrDefaultAsync(i => i.Id == id && i.Active, cancellationToken) ?? throw new InvalidOperationException($"Organization Id '{id}' not found.");

        // Check that the sites being removed are all already assigned
        var sitesToRemove = dbOrganization.Sites.IntersectBy(removeSiteIds, i => i.Id).ToList();
        if (sitesToRemove.Count != removeSiteIds.Length) throw new InvalidOperationException("Cannot remove sites which are not assigned to Organization");

        // Check that the sites being added are not already added
        var sitesIdsToAdd = addSiteIds.Except(dbOrganization.Sites.Select(i => i.Id)).ToList();
        if (sitesIdsToAdd.Count != addSiteIds.Length) throw new InvalidOperationException("Cannot add sites which are already assigned to Organization");

        // Check that the users being added exist
        var uniqueUsers = addUsers.Select(i => i.UserId).Distinct().ToArray();
        var existingUsers = await dbContext.Users.Where(i => uniqueUsers.Contains(i.Id)).ToListAsync(cancellationToken);
        if (uniqueUsers.Length != existingUsers.Count) throw new InvalidOperationException("Cannot assign users which don't exist");

        // Check that the users being removed are all already assigned
        var usersToRemove = dbOrganization.OrganizationUserRoles.IntersectBy(removeUsers.Select(i => new { i.UserId, i.Role }), i => new { i.UserId, i.Role }).ToList();
        if (usersToRemove.Count != removeUsers.Length) throw new InvalidOperationException("Cannot remove user roles which are not members of Organization");

        // Check that the users being added are not already added
        var usersToAdd = addUsers.ExceptBy(dbOrganization.OrganizationUserRoles.Select(i => new { i.UserId, i.Role }), i => new { i.UserId, i.Role }).ToList();
        if (usersToAdd.Count != addUsers.Length) throw new InvalidOperationException("Cannot add users roles which are already members of Organization");

        var now = DateTime.UtcNow;
        if (name != null)
            dbOrganization.Name = name;
        dbOrganization.UpdatedAt = now;

        foreach (var site in sitesToRemove)
        {
            dbOrganization.Sites.Remove(site);
        }

        foreach (var siteId in sitesIdsToAdd)
        {
            var site = await dbContext.Sites.FindAsync([siteId], cancellationToken) ?? throw new InvalidOperationException($"Site Id '{siteId}' not found.");
            dbOrganization.Sites.Add(site);
        }

        foreach (var user in usersToRemove)
        {
            dbOrganization.OrganizationUserRoles.Remove(user);
        }

        foreach (var user in usersToAdd)
        {
            dbContext.OrganizationUserRoles.Add(new DbOrganizationUserRole
            {
                OrganizationId = id,
                UserId = user.UserId,
                Role = user.Role,
                CreatedAt = now,
                UpdatedAt = now

            });
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        return dbOrganization;
    }

    public async Task<bool> RemoveOrganizationAsync(Guid id, CancellationToken cancellationToken = default)
    {
        if (!IsPrivilegedUser) throw new InvalidOperationException("Not authorized.");

        var organization = await dbContext
            .Organizations
            .Include(i => i.OrganizationUserRoles)
            .FirstOrDefaultAsync(i => i.Id == id && i.Active, cancellationToken) ?? throw new InvalidOperationException($"Organization Id '{id}' not found.");
        dbContext.Remove(organization);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }
    #endregion

    public async Task<DbVirtualNetwork?> GetVirtualNetworkByRemoteNetworkIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await UserOrganizations
            .SelectMany(i => i.Workspaces)
            .SelectMany(i => i.VirtualNetworks)
            .Include(i => i.Workspace)
            .FirstOrDefaultAsync(i => i.ZeroTierNetworkId == id, cancellationToken);
    }

    #region Private Members
    private bool IsPrivilegedUser => mdcPrincipalAccessor.IsGlobalAdministrator || mdcPrincipalAccessor.IsDatacenterTechnician;

    private Guid UserObjectId => mdcPrincipalAccessor.ObjectId ?? throw new InvalidOperationException("Unable to Obtain ObjectId for User.");

    private IQueryable<DbOrganization> UserOrganizations => dbContext.Organizations
        //.Include(i => i.OrganizationUserRoles)
        //.Include(i => i.Sites
        //    .Where(s => s.Organizations
        //        .Any(o => o.Active && IsPrivilegedUser ? true : o.OrganizationUserRoles.Any(our => our.UserId == UserObjectId && our.User!.Active))))
        //.ThenInclude(i => i.SiteNodes)
        //.Include(i => i.Workspaces)
        .Where(o => o.Active && IsPrivilegedUser? true : o.OrganizationUserRoles.Any(our => our.UserId == UserObjectId && our.User!.Active));

    private IQueryable<DbUser> AvailableUsers => dbContext
            .Users
            .Include(i => i.OrganizationUserRoles)
            .ThenInclude(i => i.Organization)
            .Where(u => u.Active && IsPrivilegedUser ? true : u.OrganizationUserRoles.Any(our => our.UserId == UserObjectId && our.Organization!.Active));
    #endregion
}
