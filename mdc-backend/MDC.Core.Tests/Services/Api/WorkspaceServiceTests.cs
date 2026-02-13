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

public class WorkspaceServiceTests : BaseServicesTests
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
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        var sites = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Empty(sites);
    }

    [Fact]
    public async Task SingleWorkspace_GetAll()
    {
        using var serviceScope = AssembleSiteServiceTest(null);
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        await PopulateDatabaseAsync(serviceScope);

        var workspaces = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Single(workspaces);

        var workspace = workspaces.Single();
        Assert.NotNull(workspace.Name);
        Assert.NotEmpty(workspace.Name);
        Assert.NotNull(workspace.Description);
        Assert.NotEmpty(workspace.Description);
        Assert.NotNull(workspace.VirtualNetworks);
        Assert.NotEmpty(workspace.VirtualNetworks);

        // Note: GetByIdAsync needs to mock PVE and ZeroTier services
        //var singleWorkspace = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
        //Assert.NotNull(singleWorkspace);
        //Assert.NotNull(singleWorkspace.Name);
        //Assert.NotNull(singleWorkspace.Description);
        //Assert.NotEmpty(singleWorkspace.VirtualNetworks);

    }
}
