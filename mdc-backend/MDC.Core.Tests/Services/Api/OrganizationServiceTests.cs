using AutoFixture;
using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.ZeroTier;
using MDC.Shared.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit.Internal;

namespace MDC.Core.Tests.Services.Api;

public class OrganizationServiceTests : BaseServicesTests
{
    private Mock<IZeroTierTokenProvider> mockZeroTierTokenProvider = new Mock<IZeroTierTokenProvider>();
    private Mock<IZeroTierService> mockZeroTierService = new Mock<IZeroTierService>();

    internal IServiceScope AssembleSiteServiceTest(TestMDCPrincipalAccessor? principalAccessor)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        serviceDescriptors.AddScoped<IZeroTierTokenProvider>(sp => mockZeroTierTokenProvider.Object);
        serviceDescriptors.AddScoped<IZeroTierService>(sp => mockZeroTierService.Object);

        if (principalAccessor != null)
        {
            serviceDescriptors.TryAddScoped<IMDCPrincipalAccessor>(sp => principalAccessor);
        }

        IServiceScope serviceScope = AssembleServicesTest(serviceDescriptors, new ConfigurationManager(), true);

        return serviceScope;
    }

    [Fact]
    public async Task NoWorkspaces_GetAllAsync()
    {
        using var serviceScope = AssembleSiteServiceTest(null);
        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();

        var organizations = await organizationService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Empty(organizations);
    }

    [Fact]
    public async Task SingleWorkspace_GetAll()
    {
        using var serviceScope = AssembleSiteServiceTest(null);
        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();

        await PopulateDatabaseAsync(serviceScope);

        var organizations = await organizationService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Single(organizations);

        var organization = organizations.Single();
        {
            Assert.NotNull(organization.Name);
            Assert.NotEmpty(organization.Name);
            Assert.True(organization.Active);
            Assert.Single(organization.SiteIds);
            Assert.Single(organization.WorkspaceIds);
            Assert.Single(organization.OrganizationUserRoles);
            var our = organization.OrganizationUserRoles.Single();
            Assert.NotEmpty(our.Role);
            Assert.NotEmpty(our.UserName);
        }

        {
            var singleOrganization = await organizationService.GetByIdAsync(organization.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(singleOrganization);
            Assert.NotNull(singleOrganization.Name);
            Assert.Single(singleOrganization.SiteIds);
            Assert.Single(singleOrganization.WorkspaceIds);
            var our = singleOrganization.OrganizationUserRoles.Single();
            Assert.NotEmpty(our.Role);
            Assert.NotEmpty(our.UserName);
        }
    }
}
