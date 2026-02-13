using AutoFixture;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Core.Tests.Services.Providers.MDCDatabase;

public class MDCDatabaseServiceTests : BaseServicesTests
{
    protected IServiceScope AssembleMDCDatabaseServiceTest()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();

        IServiceScope serviceScope = AssembleServicesTest(serviceDescriptors, new ConfigurationManager(), true);

        return serviceScope;
    }

    [Fact]
    public async Task ValidateSchema_PopulateDatabaseAsync()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var fixture = new Fixture();

        // Act
        // Create Organization and User
        var dbOrganization = await context.Organizations.AddAsync(fixture.Build<DbOrganization>()
            .Without(x => x.Workspaces)
            .Without(x => x.Sites)
            .Without(x => x.OrganizationUserRoles)
            .Create(),
            TestContext.Current.CancellationToken);

        var dbUser = await context.Users.AddAsync(fixture.Build<DbUser>()
            .Without(x => x.OrganizationUserRoles)
            .Create()
            , TestContext.Current.CancellationToken);

        dbOrganization.Entity.OrganizationUserRoles.Add(fixture.Build<DbOrganizationUserRole>()
            .Without(x => x.Organization)
            .Without(x => x.User)
            .Do(x => x.User = dbUser.Entity)
            .Do(x => x.Organization = dbOrganization.Entity)
            .Create());
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Register Site
        var dbSite = await context.Sites.AddAsync(fixture.Build<DbSite>()
            .Without(x => x.Workspaces)
            .Without(x => x.Organizations)
            .Without(x => x.SiteNodes)
            .Do(x => x.Organizations.Add(dbOrganization.Entity))
            .Create(), 
            TestContext.Current.CancellationToken);

        var dbSiteNode = await context.SiteNodes.AddAsync(fixture.Build<DbSiteNode>()
            .Without(x => x.Site)
            .Do(x => x.Site = dbSite.Entity)
            .Create(), 
            TestContext.Current.CancellationToken);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Create Workspace(Site, Organization)
        // Note: Database Dontext does not enforce that the Organization is a member of the Site.Organizations
        var dbWorkspace = await context.Workspaces.AddAsync(fixture.Build<DbWorkspace>()
            .Without(x => x.Site)
            .Without(x => x.VirtualNetworks)
            .Without(x => x.Organization)
            .Do(x => x.Site = dbSite.Entity)
            .Do(x => x.Organization = dbOrganization.Entity)
            .Create(),
            TestContext.Current.CancellationToken);

        var dbVirtualNetwork = await context.VirtualNetworks.AddAsync(fixture.Build<DbVirtualNetwork>()
            .Without(x => x.Workspace)
            .Do(x => x.Workspace = dbWorkspace.Entity)
            .Create(),
            TestContext.Current.CancellationToken);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Assert
        var actualSite = await context.Sites.SingleAsync(TestContext.Current.CancellationToken);
        Assert.NotEmpty(actualSite.SiteNodes);
    }

    [Fact]
    public async Task Verify_CreateOrganizationAndUserAsync()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        var userRoles = new string[] { "User" };
        var fixture = new Fixture();

        // Act
        // Create Organization and User        
        var dbOrganization = await service.CreateOrganizationAsync(new OrganizationDescriptor
        {
            Name = fixture.Create<string>(),
            SiteIds = Array.Empty<Guid>(),
            OrganizationUserRoles = Array.Empty<OrganizationUserRoleDescriptor>()
        }, TestContext.Current.CancellationToken);
        Assert.NotEqual(Guid.NewGuid(), dbOrganization.Id);
        Assert.True(dbOrganization.Active);
        Assert.Empty(dbOrganization.OrganizationUserRoles);

        var dbUser = await service.CreateUserAsync(fixture.Create<Guid>(), fixture.Create<string>(), userRoles?.Select(role => new UserOrganizationRole { OrganizationId = dbOrganization.Id, Role = role }).ToArray(), TestContext.Current.CancellationToken);
        Assert.NotEqual(Guid.NewGuid(), dbUser.Id);
        Assert.True(dbUser.Active);
        Assert.NotEmpty(dbOrganization.OrganizationUserRoles);
        Assert.NotEmpty(dbUser.OrganizationUserRoles);
        foreach (var role in userRoles ?? [])
        {
            Assert.Contains(dbUser.OrganizationUserRoles, i => i.Role == role && i.UserId == dbUser.Id && i.OrganizationId == dbOrganization.Id);
        }
    }

    [Fact]
    public async Task RegisterSiteAsync()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        var siteNodePort = 8006;
        var validateServerCertificate = false;
        var fixture = new Fixture();

        // Act
        // Create Organization
        var dbOrganization = await service.CreateOrganizationAsync(new OrganizationDescriptor
        {
            Name = fixture.Create<string>(),
            SiteIds = Array.Empty<Guid>(),
            OrganizationUserRoles = Array.Empty<OrganizationUserRoleDescriptor>()
        }, TestContext.Current.CancellationToken);
        Assert.NotEqual(Guid.NewGuid(), dbOrganization.Id);
        Assert.True(dbOrganization.Active);
        Assert.Empty(dbOrganization.OrganizationUserRoles);

        // Register Site
        var dbSite = await service.CreateSiteAsync(fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), TestContext.Current.CancellationToken);
        Assert.NotEqual(Guid.Empty, dbSite.Id);
        Assert.NotEmpty(dbSite.Name);
        Assert.NotEmpty(dbSite.Description);
        Assert.NotEmpty(dbSite.ApiSecret);
        Assert.NotEmpty(dbSite.ApiTokenId);
        Assert.Empty(dbSite.SiteNodes);
        Assert.Empty(dbSite.Organizations);
        Assert.Empty(dbSite.Workspaces);

        dbSite = await service.UpdateSiteAsync(dbSite.Id, null, null, null, [dbOrganization.Id], TestContext.Current.CancellationToken);
        Assert.NotEmpty(dbSite.Organizations);

        var dbSiteNode = await service.CreateSiteNodeAsync(dbSite.Id, fixture.Create<string>(), fixture.Create<string>(), siteNodePort, validateServerCertificate, TestContext.Current.CancellationToken);
        Assert.Equal(dbSite.Id, dbSiteNode.SiteId);
        Assert.NotEmpty(dbSiteNode.Name);
        Assert.NotEmpty(dbSiteNode.MemberAddress);
        Assert.Equal(siteNodePort, dbSiteNode.ApiPort);
        Assert.Equal(validateServerCertificate, dbSiteNode.ApiValidateServerCertificate);

        var dbSites = await service.GetAllSitesAsync(TestContext.Current.CancellationToken);
        Assert.NotEmpty(dbSites);
        Assert.Contains(dbSite, dbSites);
    }

    [Fact]
    public async Task Verify_CreateWorkspaceAsync()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        var fixture = new Fixture();
        var userRoles = new string[] { "User" };
        var siteNodePort = 8006;
        var validateServerCertificate = false;
        var virtualNetworkNames = new string[] { fixture.Create<string>() };

        // Act
        // Create Organization and User        
        var dbOrganization = await service.CreateOrganizationAsync(new OrganizationDescriptor
        {
            Name = fixture.Create<string>(),
            SiteIds = Array.Empty<Guid>(),
            OrganizationUserRoles = Array.Empty<OrganizationUserRoleDescriptor>()
        }, TestContext.Current.CancellationToken);
        var dbUser = await service.CreateUserAsync(fixture.Create<Guid>(), fixture.Create<string>(), userRoles?.Select(role => new UserOrganizationRole { OrganizationId = dbOrganization.Id, Role = role }).ToArray(), TestContext.Current.CancellationToken);

        // Register Site
        var dbSite = await service.CreateSiteAsync(fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), TestContext.Current.CancellationToken);
        var dbSiteNode = await service.CreateSiteNodeAsync(dbSite.Id, fixture.Create<string>(), fixture.Create<string>(), siteNodePort, validateServerCertificate, TestContext.Current.CancellationToken);

        // Add Organization to Site
        dbSite = await service.UpdateSiteAsync(dbSite.Id, null, null, null, [dbOrganization.Id], TestContext.Current.CancellationToken);
        Assert.Contains(dbOrganization.Sites, i => i.Id == dbSite.Id);

        //// Add Organization to Site
        //dbOrganization = await service.UpdateOrganizationAsync(dbOrganization.Id, null, new[] { dbSite.Id }, Array.Empty<Guid>(), TestContext.Current.CancellationToken);
        //Assert.Contains(dbOrganization.Sites, i => i.Id == dbSite.Id);

        // Create Workspace(Site, Organization)
        var dbWorkspace = await service.CreateWorkspaceAsync(dbSite.Id, dbOrganization.Id, fixture.Create<string>(), fixture.Create<string>(), virtualNetworkNames, new DatacenterSettings(), TestContext.Current.CancellationToken);
        Assert.NotEqual(Guid.Empty, dbWorkspace.Id);
        Assert.NotEqual(0, dbWorkspace.Address);
        Assert.Equal(dbSite.Id, dbWorkspace.SiteId);
        Assert.Equal(dbOrganization.Id, dbWorkspace.OrganizationId);
        Assert.NotEmpty(dbWorkspace.Name);
        Assert.NotNull(dbWorkspace.Description);
        Assert.NotEmpty(dbWorkspace.Description);
        Assert.NotNull(dbWorkspace.Status);
        Assert.NotEmpty(dbWorkspace.VirtualNetworks);
        Assert.Single(dbWorkspace.VirtualNetworks);
        foreach (var vnet in virtualNetworkNames)
        {
            Assert.Contains(dbWorkspace.VirtualNetworks, i => i.Name == vnet);
        }
        foreach (var dbVirtualNetwork in dbWorkspace.VirtualNetworks)
        {
            Assert.NotEmpty(dbVirtualNetwork.Name);
            Assert.Equal(dbWorkspace.Id, dbVirtualNetwork.WorkspaceId);
        }
    }

    [Fact]
    public async Task CreateWorkspace_SplitOrganization_Fail_Async()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        var fixture = new Fixture();
        var userRoles = new string[] { "User" };
        var siteNodePort = 8006;
        var validateServerCertificate = false;
        var virtualNetworkNames = new string[] { fixture.Create<string>() };

        // Act
        // Create Organization and User        
        var dbOrganization = await service.CreateOrganizationAsync(new OrganizationDescriptor
        {
            Name = fixture.Create<string>(),
            SiteIds = Array.Empty<Guid>(),
            OrganizationUserRoles = Array.Empty<OrganizationUserRoleDescriptor>()
        }, TestContext.Current.CancellationToken);
        var dbUser = await service.CreateUserAsync(fixture.Create<Guid>(), fixture.Create<string>(), userRoles?.Select(role => new UserOrganizationRole { OrganizationId = dbOrganization.Id, Role = role }).ToArray(), TestContext.Current.CancellationToken);

        var dbOrganization1 = await service.CreateOrganizationAsync(new OrganizationDescriptor
        {
            Name = fixture.Create<string>(),
            SiteIds = Array.Empty<Guid>(),
            OrganizationUserRoles = Array.Empty<OrganizationUserRoleDescriptor>()
        }, TestContext.Current.CancellationToken);
        Assert.NotEqual(dbOrganization.Id, dbOrganization1.Id);

        // Register Site
        var dbSite = await service.CreateSiteAsync(fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), TestContext.Current.CancellationToken);
        var dbSiteNode = await service.CreateSiteNodeAsync(dbSite.Id, fixture.Create<string>(), fixture.Create<string>(), siteNodePort, validateServerCertificate, TestContext.Current.CancellationToken);
        dbSite = await service.UpdateSiteAsync(dbSite.Id, null, null, null, [dbOrganization.Id], TestContext.Current.CancellationToken);

        // Create Workspace(Site, Organization)
        // This should fail because the Organization is not a member of the Site
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await service.CreateWorkspaceAsync(dbSite.Id, dbOrganization1.Id, fixture.Create<string>(), fixture.Create<string>(), virtualNetworkNames, new DatacenterSettings(), TestContext.Current.CancellationToken);
        }, i => i.Message != "Organization is not a member of Site." ? i.Message : null);
    }
}
