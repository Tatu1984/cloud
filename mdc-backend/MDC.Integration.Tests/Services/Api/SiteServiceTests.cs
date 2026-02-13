using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Integration.Tests.Services.Api;

public class SiteServiceTests : BaseIntegrationTests
{
    private async Task CompareSite(IServiceScope serviceScope, Guid expectedSiteId, Site actualSite)
    {
        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var dbSite = await dbContext.Sites
                .Include(s => s.Organizations)
                .Include(s => s.SiteNodes)
                .Include(s => s.Workspaces)
                .FirstOrDefaultAsync(s => s.Id == expectedSiteId, TestContext.Current.CancellationToken);
        Assert.NotNull(dbSite);

        Assert.Equal(dbSite.Name, actualSite.Name);
        Assert.Equal(dbSite.Description, actualSite.Description);
        Assert.Equal(dbSite.SiteNodes.Select(i => i.Name).Order(), actualSite.Nodes.Where(i => i.Configured == true).Select(i => i.Name).Order());
        Assert.Equal(dbSite.Organizations.Select(i => i.Id).Order(), actualSite.OrganizationIds.Order());
        Assert.Equal(dbSite.Workspaces.Select(i => i.Id).Order(), actualSite.WorkspaceIds.Order());
    }

    [Fact]
    public void GetSiteService()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);
    }

    [Fact]
    public async Task GetAllAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);

        var sites = await service.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        foreach (var site in sites)
        {
            await CompareSite(serviceScope, site.Id, site);
        }
    }

    [Fact]
    public async Task GetSiteByIdAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);

        var sites = await service.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        foreach (var _site in sites)
        {
            // Act
            var site = await service.GetByIdAsync(_site.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(site);

            // Assert
            await CompareSite(serviceScope, site.Id, site);
        }
    }

    [Fact]
    public async Task GetSiteByNameAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);

        var sites = await service.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        foreach (var _site in sites)
        {
            // Act
            var site = await service.GetByNameAsync(_site.Name, TestContext.Current.CancellationToken);
            Assert.NotNull(site);
            Assert.Equal(_site.Id, site.Id);

            // Assert
            await CompareSite(serviceScope, site.Id, site);
        }
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "RegisterSites")]
    public async Task CreateSitesAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.GetRequiredSection("siteDescriptor").Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        var expectedSiteNodeName = theoryConfiguration.GetValue<string>("siteNodeName");
        Assert.NotNull(expectedSiteNodeName);
        var expectedSiteName = theoryConfiguration.GetValue<string>("siteName");
        Assert.NotNull(expectedSiteName);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);
        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);

        var site = await service.CreateAsync(siteDescriptor, TestContext.Current.CancellationToken);
        Assert.NotNull(site);
        Assert.Equal(expectedSiteName, site.Name);

        var siteNode = site.Nodes.FirstOrDefault(i => i.Name == expectedSiteNodeName);
        Assert.NotNull(siteNode);

        Assert.True(siteNode.Online);
        Assert.True(siteNode.Configured);
        Assert.True(siteNode.Authorized);

        await CompareSite(serviceScope, site.Id, site);
    }
}
