using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.MDCDatabase;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Graph;

namespace MDC.Integration.Tests.Services.Api;

public class UserServiceTests : BaseIntegrationTests
{
    [Fact]
    public async Task GetAllAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<IUserService>();
        Assert.NotNull(service);
        Assert.IsType<UserService>(service);
        var users = await service.GetAllAsync(true, TestContext.Current.CancellationToken);
        Assert.NotNull(users);
        Assert.NotEmpty(users);
    }

    //[Fact]
    //public async Task RegisterAndAssignOrganizationAsync()
    //{
    //    var id = "0eb16241-1441-4f1e-b7e1-5799414d0839";

    //    IServiceCollection serviceDescriptors = new ServiceCollection();
    //    using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

    //    var service = serviceScope.ServiceProvider.GetRequiredService<IUserService>();
    //    Assert.NotNull(service);
    //    Assert.IsType<UserService>(service);

    //    var newUser = await service.CreateAsync(new Shared.Models.UserRegistrationDescriptor 
    //    { 
    //        Id = id,
    //        ApplicationRoles = ["WorkspaceUser"]
    //    }, TestContext.Current.CancellationToken);

    //    Assert.NotNull(newUser);
    //    Assert.Equal(id, newUser.Id.ToString());

    //    var datacenterTechnicianUser = await service.UpdateAsync(newUser.Id, new Shared.Models.UserUpdateDescriptor
    //    {
    //        AddApplicationRoles = ["DatacenterTechnician"],
    //    }, TestContext.Current.CancellationToken);

    //    Assert.NotNull(datacenterTechnicianUser);
    //    Assert.Contains("DatacenterTechnician", datacenterTechnicianUser.AppRoles);

    //    var updatedUser = await service.UpdateAsync(newUser.Id, new Shared.Models.UserUpdateDescriptor
    //    {
    //        RemoveApplicationRoles = ["DatacenterTechnician"],
    //    }, TestContext.Current.CancellationToken);

    //    Assert.NotNull(updatedUser);
    //    Assert.DoesNotContain("DatacenterTechnician", updatedUser.AppRoles);
    //}

    [Fact]
    public async Task GetGraphUsers_RemoveInvalidDatabaseEntries()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var graphClient = serviceScope.ServiceProvider.GetRequiredService<GraphServiceClient>();
        Assert.NotNull(graphClient);

        var options = serviceScope.ServiceProvider.GetRequiredService<IOptions<UserServiceOptions>>();
        Assert.NotNull(options);
        Assert.NotNull(options.Value.EnterpriseAppObjectId);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.NotNull(dbContext);

        var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, TestContext.Current.CancellationToken);
        Assert.NotNull(servicePrincipal);
        
        var appRoleAssignments = await graphClient.ServicePrincipals[servicePrincipal.Id].AppRoleAssignments.GetAsync(null, TestContext.Current.CancellationToken);
        Assert.NotNull(appRoleAssignments);

        var users = await graphClient.Users.GetAsync(null, TestContext.Current.CancellationToken);
        Assert.NotNull(users);

        var validUserIDs = (users.Value?.Where(i => i.Id != null).Select(i => i.Id!) ?? []).ToHashSet();

        var dbUsers = await dbContext.Users.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(dbUsers);

        var invalidDbUsers = dbUsers.Where(u => !validUserIDs.Contains(u.Id.ToString())).ToArray();
        if (invalidDbUsers.Length > 0)
        {
            dbContext.RemoveRange(invalidDbUsers);
            await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        }
    }
}
