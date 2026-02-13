using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.WebSockets;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MDC.Integration.Tests.Services.Api;

public class WorkspaceServiceTests : BaseIntegrationTests
{
    private async Task DeleteWorkspaceAsync(IServiceScope serviceScope, string[] workspaceNames)
    {
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        var existingWorkpaces = (await workspaceService.GetAllAsync(TestContext.Current.CancellationToken)).ToArray();
        foreach (var existing in existingWorkpaces.Where(i => workspaceNames.Contains(i.Name)))
        {
            await workspaceService.SetWorkspaceLockAsync(existing.Id, false, TestContext.Current.CancellationToken);
            await workspaceService.DeleteAsync(existing.Id, TestContext.Current.CancellationToken);
        }
    }

    private async Task<Workspace> CreateWorkspaceAsync(IServiceScope serviceScope, Guid siteId, WorkspaceDescriptor descriptor)
    {
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        var remoteNetworkService = serviceScope.ServiceProvider.GetRequiredService<IRemoteNetworkService>();

        // Clone the descriptor by serializing and deserializing to ensure no reference issues
        var targetDescriptor = JsonSerializer.Deserialize<WorkspaceDescriptor>(JsonSerializer.Serialize(descriptor, JsonSerializerOptions.Web), JsonSerializerOptions.Web);
        Assert.NotNull(targetDescriptor);

        var workspace = await workspaceService.CreateAsync(siteId, targetDescriptor);
        Assert.Equal(descriptor.Name, workspace.Name);

        // Validate the Bastion property is populated
        Assert.NotNull(workspace.Bastion);
        Assert.Equal(0, workspace.Bastion.Index);
        Assert.Equal(descriptor.Name, workspace.Bastion.Name);
        Assert.Equal("running", workspace.Bastion.Status);
        Assert.NotNull(workspace.Bastion.NetworkAdapters);
        Assert.NotEmpty(workspace.Bastion.NetworkAdapters);
        Assert.Equal(descriptor.VirtualNetworks?.Length ?? 1, workspace.Bastion.NetworkAdapters.Length);
        if (descriptor.VirtualNetworks?.Any(i => i.EnableRemoteNetwork == true) == true)
        {
            foreach (var networkAdapter in workspace.Bastion.NetworkAdapters)
            {
                Assert.NotNull(networkAdapter.NetworkInterfaces);
                var ztNetwork = networkAdapter.NetworkInterfaces.FirstOrDefault(i => i.Name.StartsWith("zt") && i.Prefix <= 32);    // Look for IPv4 addresses only
                Assert.NotNull(ztNetwork);
                Assert.NotNull(ztNetwork.IPAddress);
                Assert.True(IPAddress.TryParse(ztNetwork.IPAddress, out var address));
                Assert.Equal(System.Net.Sockets.AddressFamily.InterNetwork, address.AddressFamily);
            }
        }
        else
        {
            Assert.All(workspace.Bastion.NetworkAdapters, adapter => Assert.NotNull(adapter.VirtualNetworkId));
        }

        // These values will be set if the Create() waited for the VMs to boot and agent is running
        //Assert.All(workspace.Bastion.NetworkAdapters, adapter => Assert.NotNull(adapter.NetworkInterfaces));
        //Assert.All(workspace.Bastion.NetworkAdapters, adapter => Assert.NotEmpty(adapter.NetworkInterfaces!));

        // Validate the Virtual Networks are created
        Assert.NotNull(workspace.VirtualNetworks);
        Assert.NotEmpty(workspace.VirtualNetworks);
        if (descriptor.VirtualNetworks == null)
        {
            Assert.Single(workspace.VirtualNetworks);
            var virtualNetwork = workspace.VirtualNetworks.First();
            Assert.Equal("vnet0", virtualNetwork.Name);
            Assert.Equal(0, virtualNetwork.Index);
            Assert.Null(virtualNetwork.RemoteNetworkId);
        }
        else
        {
            Assert.NotNull(descriptor.VirtualNetworks);
            Assert.NotNull(workspace.VirtualNetworks);
            Assert.Equal(descriptor.VirtualNetworks.Length, workspace.VirtualNetworks.Count());
            for (int i = 0; i < descriptor.VirtualNetworks!.Length; i++)
            {
                Assert.Single(workspace.VirtualNetworks, vn => vn.Index == i);
                var virtualNetwork = workspace.VirtualNetworks.Single(vn => vn.Index == i);
                Assert.Equal(descriptor.VirtualNetworks[i].Name ?? $"vnet{i}", virtualNetwork.Name);

                if (descriptor.VirtualNetworks[i].EnableRemoteNetwork == true)
                {
                    Assert.NotNull(virtualNetwork.RemoteNetworkId);
                    Assert.NotNull(virtualNetwork.ZeroTierNetworkId);
                    Assert.NotEmpty(virtualNetwork.ZeroTierNetworkId);

                    var remoteNetwork = await remoteNetworkService.GetByIdAsync(virtualNetwork.Id, TestContext.Current.CancellationToken);
                    Assert.NotNull(remoteNetwork);

                    Assert.NotEmpty(remoteNetwork.Members); // Should at least have the Bastion as a remote network member
                }
                else
                {
                    Assert.Null(virtualNetwork.RemoteNetworkId);
                    Assert.Null(virtualNetwork.ZeroTierNetworkId);
                }
            }
        }

        if (descriptor.VirtualMachines != null)
        {
            for (int idx = 0; idx < descriptor.VirtualMachines.Length; idx++)
            // foreach (var virtualMachineDescriptor in descriptor.VirtualMachines)
            {
                var virtualMachineDescriptor = descriptor.VirtualMachines[idx];

                Assert.NotNull(workspace.VirtualMachines);

                var virtualMachine = workspace.VirtualMachines.SingleOrDefault(i => i.Name == (virtualMachineDescriptor.Name ?? $"VirtualMachine{idx:D2}"));
                Assert.NotNull(virtualMachine);

                Assert.NotNull(virtualMachine.NetworkAdapters);
                Assert.NotEmpty(virtualMachine.NetworkAdapters);

                if (virtualMachineDescriptor.NetworkAdapters != null)
                {
                    Assert.NotNull(virtualMachine.NetworkAdapters);
                    Assert.Equal(virtualMachineDescriptor.NetworkAdapters.Length, virtualMachine.NetworkAdapters.Length);

                    for (int adapterIdx = 0; adapterIdx < virtualMachineDescriptor.NetworkAdapters.Length; adapterIdx++)
                    {
                        var adapterDescriptor = virtualMachineDescriptor.NetworkAdapters[adapterIdx];

                        var virtualNetwork = workspace.VirtualNetworks.Single(i => i.Id == virtualMachine.NetworkAdapters[adapterIdx].VirtualNetworkId);
                        Assert.Equal(adapterDescriptor.RefVirtualNetworkName, virtualNetwork.Name);

                        if (adapterDescriptor.EnableRemoteNetwork)
                        {
                            // Find the VM actual network adapter for the network adapter specified in the descriptor
                            var networkAdapter = virtualMachine.NetworkAdapters.Single(i => i.Name == adapterDescriptor.Name);

                            Assert.NotNull(networkAdapter.NetworkInterfaces);
                            var ztNetwork = networkAdapter.NetworkInterfaces.FirstOrDefault(i => i.Name.StartsWith("zt") && i.Prefix <= 32);    // Look for IPv4 addresses only
                            Assert.NotNull(ztNetwork);
                            Assert.NotNull(ztNetwork.IPAddress);
                            Assert.True(IPAddress.TryParse(ztNetwork.IPAddress, out var address));
                            Assert.Equal(System.Net.Sockets.AddressFamily.InterNetwork, address.AddressFamily);
                        }
                    }
                }
            }
        }

        var workspaces = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotEmpty(workspaces);
        Assert.Single(workspaces, i => i.Id == workspace.Id);

        return workspace;
    }

    [Fact]
    public void GetWorkspaceService()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(service);
        Assert.IsType<WorkspaceService>(service);
    }

    [Fact]
    public async Task GetAllAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(service);
        Assert.IsType<WorkspaceService>(service);

        // ACT: Call the method to get the workspaces data
        var workspaces = await service.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(workspaces);
        Assert.NotEmpty(workspaces);

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var json = JsonSerializer.Serialize(workspaces, options);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.NotNull(dbContext);

        var dbWorkspaces = await dbContext.Workspaces.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(dbWorkspaces);
        Assert.NotEmpty(dbWorkspaces);

        foreach (var dbWorkspace in dbWorkspaces)
        {
            Assert.Single(workspaces, i => i.Id == dbWorkspace.Id);   
            var workspace = workspaces.Single(i => i.Id == dbWorkspace.Id);
            Assert.Equal(dbWorkspace.Name, workspace.Name);

            var dbVirtualNetworks = await dbContext.VirtualNetworks
                .Where(vn => vn.WorkspaceId == dbWorkspace.Id)
                .ToArrayAsync(TestContext.Current.CancellationToken);
            Assert.NotNull(workspace.VirtualNetworks);
            Assert.Equal(dbVirtualNetworks.Length, workspace.VirtualNetworks.Count());
        }
    }

    private class WorkspaceDescriptorActivity
    {
        public required string Action { get; set; }
        public required string FileName { get; set; } 
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "WorkspaceDescriptors")]
    public async Task CreateWorkspacesAsync(IConfigurationSection theoryConfiguration)
    {
        string[] actions =
            [
                "create",
                "update"
            ];

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var siteName = theoryConfiguration.GetValue<string>("siteName");
        Assert.NotNull(siteName);

        var activities = theoryConfiguration.GetRequiredSection("activities").Get<WorkspaceDescriptorActivity[]>();
        Assert.NotNull(activities);
        Assert.NotEmpty(activities);
        Assert.All(activities, activity => Assert.True(File.Exists(activity.FileName)));
        Assert.All(activities, activity => Assert.Contains(activity.Action, actions, StringComparer.OrdinalIgnoreCase));

        var activityDescriptors = activities
            .Select(activity => new
            {
                activity.Action,
                Descriptor = JsonSerializer.Deserialize<WorkspaceDescriptor>(File.ReadAllText(activity.FileName), JsonSerializerOptions.Web)
            })
            .ToArray();

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        var site = await siteService.GetByNameAsync(siteName, TestContext.Current.CancellationToken);
        Assert.NotNull(site);

        var workspaceNames = activityDescriptors
            .Select(i => i.Descriptor)
            .Where(i => i != null)
            .Select(i => i!.Name)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        await DeleteWorkspaceAsync(serviceScope, workspaceNames);

        // ACT: Call the method to get the workspaces data
        Workspace? workspace = null; ;
        foreach (var activity in activityDescriptors)
        {
            switch (activity.Action.ToLowerInvariant())
            {
                case "create":
                    {
                        Assert.NotNull(activity.Descriptor);
                        workspace = await CreateWorkspaceAsync(serviceScope, site.Id, activity.Descriptor);
                        break;
                    }
                case "update":
                    {
                        Assert.NotNull(workspace);
                        var delta = JsonSerializer.SerializeToNode(activity.Descriptor);
                        Assert.NotNull(delta);

                        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
                        
                        var updatedWorkspace = await workspaceService.UpdateAsync(workspace.Id, delta, TestContext.Current.CancellationToken);
                        break;
                    }
                default:
                    throw new InvalidOperationException($"Unsupported action '{activity.Action}'.");
            }
        }
        // var workspace = await CreateWorkspaceAsync(serviceScope, site.Id, descriptor);

        await DeleteWorkspaceAsync(serviceScope, workspaceNames);
    }

    [Fact]
    public async Task TestLockUnlockAsync()
    {
        var siteName = "mdc0003";
        var workspaceName = "LockUnlockTestWorkspace";

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var workspaceService= serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(workspaceService);
        
        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);

        // Delete Workspace if it exists
        await DeleteWorkspaceAsync(serviceScope, [workspaceName]);

        // Create Workspace
        var site = await siteService.GetByNameAsync(siteName, TestContext.Current.CancellationToken);
        Assert.NotNull(site);

        var workspace = await workspaceService.CreateAsync(site.Id, new WorkspaceDescriptor
        {
            Name = workspaceName,
        }, TestContext.Current.CancellationToken);
        Assert.False(workspace.Locked);

        // Lock Workspace
        await workspaceService.SetWorkspaceLockAsync(workspace.Id, true, TestContext.Current.CancellationToken);
        workspace = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(workspace);
        Assert.True(workspace.Locked);

        var locked = await workspaceService.GetWorkspaceLockAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.True(locked);

        // Attempt to modify locked Workspace
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            var delta = JsonSerializer.SerializeToNode(new
            {
                Description = "Updated description on locked workspace"
            }, JsonSerializerOptions.Web);
            Assert.NotNull(delta);
            await workspaceService.UpdateAsync(workspace.Id, delta, TestContext.Current.CancellationToken);
        });

        // Unlock Workspace
        await workspaceService.SetWorkspaceLockAsync(workspace.Id, false, TestContext.Current.CancellationToken);
        workspace = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(workspace);
        Assert.False(workspace.Locked);

        locked = await workspaceService.GetWorkspaceLockAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.False(locked);

        // Delete Workspace
        await DeleteWorkspaceAsync(serviceScope, [workspaceName]);
    }

    [Fact]
    public async Task TestVMRemoteNetwork()
    {
        var workspaceId = Guid.Parse("019bd856-a20c-7f73-843a-de3c8136f6f1");
        var delta = JsonNode.Parse("{\r\n    \"virtualNetworks\": [\r\n    {\r\n\"name\": \"vnet0\",\r\n      \"enableRemoteNetwork\": true\r\n    }\r\n  ],\r\n  \"virtualMachines\": [\r\n    {\r\n      \"name\": \"DistributiveWorker\",\r\n      \"networkAdapters\": [\r\n        {\r\n\"name\": \"net0\",\r\n          \"enableRemoteNetwork\": false\r\n        }\r\n      ]\r\n    }\r\n  ]\r\n}");

        Assert.NotNull(delta);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(workspaceService);


        var workspace = await workspaceService.UpdateAsync(workspaceId, delta, TestContext.Current.CancellationToken);
    }


    [Fact]
    public async Task TestConsoleWebSocketAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(workspaceService);

        var workspaceId = Guid.Parse("019bd856-a20c-7f73-843a-de3c8136f6f1");
        
        var workspace = await workspaceService.GetByIdAsync(workspaceId, TestContext.Current.CancellationToken);
        Assert.NotNull(workspace);

        using var vncSession = await workspaceService.InitializeVNCSessionAsync(workspaceId, 0, TestContext.Current.CancellationToken);
        Assert.NotNull(vncSession);

        await vncSession.ClientWebSocket.ConnectAsync(new Uri(vncSession.Url), TestContext.Current.CancellationToken);

        var buffer = new byte[8192];

        var result = await vncSession.ClientWebSocket.ReceiveAsync(new ArraySegment<byte>(buffer), TestContext.Current.CancellationToken);
        Assert.True(result.EndOfMessage);

        Assert.Equal(WebSocketMessageType.Binary, result.MessageType);
    
        var message = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
        //Assert.NotNull(message);

        await vncSession.ClientWebSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed", TestContext.Current.CancellationToken);
    }


    /*
    [Theory]
    [ClassData(typeof(TheoryConfigurationKeys))]
    public async Task GetByIdAsync(string theoryConfigurationKey)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfigurationKey);

        var service = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(service);
        Assert.IsType<WorkspaceService>(service);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.NotNull(dbContext);

        var dbWorkspaces = await dbContext.Workspaces
            .Where(i => i.Datacenter!.Name == theoryConfigurationKey)
            .Include(i => i.VirtualNetworks)
            .ToArrayAsync();
        Assert.NotNull(dbWorkspaces);
        Assert.NotEmpty(dbWorkspaces);

        // ACT: Call the method to get the workspaces data
        foreach (var dbWorkspace in dbWorkspaces)
        {
            var workspace = await service.GetByIdAsync(theoryConfigurationKey, dbWorkspace.Id);
            Assert.NotNull(workspace);

            Assert.Equal(dbWorkspace.Id, workspace.Id);
            Assert.Equal(dbWorkspace.Name, workspace.Name);
            Assert.Equal(dbWorkspace.Address, workspace.Address);
            Assert.Equal(dbWorkspace.VirtualNetworks.Count, workspace.VirtualNetworks.Count());
        }
    }
    */

    /*    

   
    [Theory]
    [ClassData(typeof(TheoryConfigurationKeys))]
    public async Task UpdateWorkspaceAsync_AddVirtualMachine(string theoryConfigurationKey)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfigurationKey);

        var service = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(service);
        Assert.IsType<WorkspaceService>(service);

        await DeleteWorkspaceAsync(serviceScope, theoryConfigurationKey);

        // ACT: Call the method to get the workspaces data
        var workspace = await CreateWorkspaceAsync(serviceScope, theoryConfigurationKey);

        var delta = JsonSerializer.SerializeToNode(new
        {
            VirtualMachines = new[]
            {
                new 
                {
                    TemplateName = "UbuntuDesktop",
                    Name = VirtualMachineName
                }
            }
        }, JsonSerializerOptions.Web);
        Assert.NotNull(delta);

        var updatedWorkspace = await service.UpdateAsync(theoryConfigurationKey, workspace.Id, delta);

        await DeleteWorkspaceAsync(serviceScope, theoryConfigurationKey);
    }

    */
}
