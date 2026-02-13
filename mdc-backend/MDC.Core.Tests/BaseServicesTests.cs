using AutoFixture;
using MDC.Core.Extensions;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Tests;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit.Internal;

namespace MDC.Core.Tests;

public class BaseServicesTests : BaseSharedTests
{
    // All ServicesTests use Sqllite in-memory database
    private class TestMDCDbContext(IConfiguration configuration, System.Data.Common.DbConnection connection) : MDCDbContext(configuration)
    {
        // This is a test context that uses an in-memory database for testing purposes.
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (optionsBuilder.IsConfigured)
            {
                return;
            }
            optionsBuilder.UseSqlite(connection);
        }
    }

    /*
     * This method assembles the service collection and creates a service scope.
     */
    protected IServiceScope AssembleServicesTest(IServiceCollection serviceDescriptors, IConfiguration configuration, bool configureTestDatabase)
    {
        serviceDescriptors.AddLogging();

        if (configureTestDatabase)
            ConfigureTestDatabase(serviceDescriptors, configuration);

        // Add the Principal Accessor service if it is not added already. This mimics the Claims Principal of a User
        serviceDescriptors.TryAddScoped<IMDCPrincipalAccessor>(sp => new TestMDCPrincipalAccessor
        {
            IsAuthenticated = true,
            IsGlobalAdministrator = true,
            IsWorkspaceManager = true,
            ObjectId = Guid.NewGuid()
        });

        serviceDescriptors.AddMicroDatacenterCore(configuration);

        // Add any additional services required for the tests here.
        // TODO:
        //      If IOptions<PVEClientServiceOptions> is not registered, it will throw an exception when trying to resolve IPVEClientService.
        //      If Typed HttpClient for PVEClientServiceOptions is not registered, it will throw an exception when trying to resolve IPVEClientService.
        //      Add mocked services or use a test configuration to avoid these issues.

        IServiceScope serviceScope = AssembleSharedTest(serviceDescriptors);

        if (configureTestDatabase)
        {
            var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
            Assert.True(context.Database.IsSqlite(), "The database should be an in-memory SqLite database for testing purposes.");
            var created = context.Database.EnsureCreated();
            Assert.True(created);
        }

        return serviceScope;
    }

    private void ConfigureTestDatabase(IServiceCollection serviceDescriptors, IConfiguration configuration)
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        serviceDescriptors.AddSingleton<System.Data.Common.DbConnection>(connection);

        serviceDescriptors.AddDbContext<MDCDbContext, TestMDCDbContext>();
    }

    private async Task<(DbOrganization, DbUser)> CreateOrganizationAndUserAsync(IServiceScope serviceScope)
    {
        var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var fixture = new Fixture();

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

        return (dbOrganization.Entity, dbUser.Entity);
    }

    private async Task<DbSite> CreateSiteAsync(IServiceScope serviceScope, DbOrganization[] dbOrganizations)
    {
        var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var fixture = new Fixture();

        // Register Site
        var dbSite = await context.Sites.AddAsync(fixture.Build<DbSite>()
            .Without(x => x.Workspaces)
            .Without(x => x.Organizations)
            .Without(x => x.SiteNodes)
            .Do(x => dbOrganizations.ForEach(y => x.Organizations.Add(y)))
            .Create(),
            TestContext.Current.CancellationToken);

        var dbSiteNode = await context.SiteNodes.AddAsync(fixture.Build<DbSiteNode>()
            .Without(x => x.Site)
            .Do(x => x.Site = dbSite.Entity)
            .Create(),
            TestContext.Current.CancellationToken);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        return dbSite.Entity;
    }

    private async Task<DbWorkspace> CreateWorkspaceAsync(IServiceScope serviceScope, DbSite dbSite, DbOrganization dbOrganization)
    {
        var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var fixture = new Fixture();

        // Create Workspace(Site, Organization)
        // Note: Database Dontext does not enforce that the Organization is a member of the Site.Organizations
        var dbWorkspace = await context.Workspaces.AddAsync(fixture.Build<DbWorkspace>()
            .Without(x => x.Site)
            .Without(x => x.VirtualNetworks)
            .Without(x => x.Organization)
            .Do(x => x.Site = dbSite)
            .Do(x => x.Organization = dbOrganization)
            .Create(),
            TestContext.Current.CancellationToken);

        var dbVirtualNetwork = await context.VirtualNetworks.AddAsync(fixture.Build<DbVirtualNetwork>()
            .Without(x => x.Workspace)
            .Without(x => x.ZeroTierNetworkId)
            .Do(x => x.Workspace = dbWorkspace.Entity)
            .Create(),
            TestContext.Current.CancellationToken);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        return dbWorkspace.Entity;
    }

    protected async Task PopulateDatabaseAsync(IServiceScope serviceScope)
    {
        var (dbOrganization, dbUser) = await CreateOrganizationAndUserAsync(serviceScope);
        var dbSite = await CreateSiteAsync(serviceScope, [dbOrganization]);
        var dbWorkspace = await CreateWorkspaceAsync(serviceScope, dbSite, dbOrganization);
    }
}
