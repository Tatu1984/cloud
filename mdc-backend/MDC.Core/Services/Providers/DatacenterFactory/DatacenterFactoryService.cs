using MDC.Core.Models;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;

namespace MDC.Core.Services.Providers.DatacenterFactory;

internal class DatacenterFactoryService(IMDCDatabaseService databaseService, IMDCEndpointService mdcEndpointService, ILogger<DatacenterFactoryService> logger) : IDatacenterFactoryService
{
    public async Task ImportSiteAsync(DbSiteNode dbSiteNode, Guid organizationId, CancellationToken cancellationToken = default)
    {
        if (dbSiteNode.Site == null) throw new InvalidOperationException($"Unable to find Site record for SiteNode.");

        logger.LogInformation("Importing Site '{siteName}' using Site Node '{siteNodeName}' to Organization Id '{organizationId}'.", dbSiteNode.Site.Name, dbSiteNode.Name, organizationId);

        var mdcEndpoint = await mdcEndpointService.GetMicroDataCenterEndpointAsync(dbSiteNode, cancellationToken);
        var pveClient = mdcEndpoint.CreatePVEClient();

        var pveResources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var datacenterSettings = await pveClient.GetDatacenterSettingsAsync(cancellationToken);

        var clusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
        var nodeStatuses = await Task.WhenAll(clusterStatus.GetHostNodes().Select(async node =>
            (node, status: (await pveClient.GetNodeStatusAsync(node.Name, cancellationToken)))
        ));

        var datacenterEntry = pveResources.ToDatacenterEntry(pveClient, dbSiteNode.Site, datacenterSettings, nodeStatuses, true);

        // Populate Storage information for the Virtual Machine Template Entires
        await PopulateTemplateConfigurationAsync(pveClient, datacenterEntry, cancellationToken);
        await PopulateVirtualNetworkEntriesAsync(pveClient, datacenterEntry, cancellationToken);

        var dbCreatedWorkspaces = await databaseService.ImportWorkspacesAsync(dbSiteNode.SiteId, organizationId, datacenterEntry.Workspaces, cancellationToken);
        var dbCreatedVirtualNetworks = await databaseService.ImportVirtualNetworksAsync(datacenterEntry.Workspaces, cancellationToken);
    }

    public async Task<DatacenterEntry> GetDatacenterEntryAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        var dbSite = await databaseService.FindSiteAsync(siteId, cancellationToken);
        if (dbSite == null)
        {
            throw new InvalidOperationException($"Site with Id '{siteId}' not found in the database.");
        }
        if (dbSite.Workspaces == null)
        {
            throw new InvalidOperationException($"Unable to retrieve Workspaces for Site Id '{siteId}' from the database.");
        }

        return await GetDatacenterEntryAsync(dbSite, cancellationToken);
    }


    // Load Datacenter information for a single Site
    public async Task<DatacenterEntry> GetDatacenterEntryAsync(DbSite dbSite, CancellationToken cancellationToken = default)
    {
        var pveClients = await mdcEndpointService.CreatePVEClientsAsync(dbSite, 30, cancellationToken);
        var pveClient = pveClients.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available for Site Id '{dbSite.Id}'.");

        var pveResources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var datacenterSettings = await pveClient.GetDatacenterSettingsAsync(cancellationToken);
        
        var clusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
        var nodeStatuses = await Task.WhenAll(clusterStatus.GetHostNodes().Select(async node =>
            (node, status: (await pveClient.GetNodeStatusAsync(node.Name, cancellationToken)))
        ));

        var datacenterEntry = pveResources.ToDatacenterEntry(pveClient, dbSite, datacenterSettings, nodeStatuses, false);

        // Populate Storage information for the Virtual Machine Template Entires
        await PopulateTemplateConfigurationAsync(pveClient, datacenterEntry, cancellationToken);

        return datacenterEntry;
    }

    public async Task<DatacenterEntry> GetDatacenterEntryByWorkspaceIdAsync(Guid workspaceId, bool populateDatacenterTemplates = false, CancellationToken cancellationToken = default)
    {
        var dbWorkspace = await databaseService.GetWorkspaceByIdAsync(workspaceId, cancellationToken);
        if (dbWorkspace == null)
        {
            throw new KeyNotFoundException($"Workspace Id '{workspaceId}' not found.");
        }

        var dbSite = dbWorkspace.Site;
        if (dbSite == null)
            throw new InvalidOperationException($"Unable to retrieve Site for Workspace Id '{workspaceId}'.");

//         var pveClients = await mdcEndpointService.CreatePVEClientsAsync(dbSite, 30, cancellationToken);
        var mdcEndpoints = await mdcEndpointService.GetMicroDataCenterEndpointsAsync(dbSite, cancellationToken);
        var mdcEndpoint = mdcEndpoints.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available to Site for Workspace Id '{workspaceId}'.");
        
        var pveClient = mdcEndpoint.CreatePVEClient();

        var pveResources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var datacenterSettings = await pveClient.GetDatacenterSettingsAsync(cancellationToken);

        var clusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
        var nodeStatuses = await Task.WhenAll(clusterStatus.GetHostNodes().Select(async node =>
            (node, status: (await pveClient.GetNodeStatusAsync(node.Name, cancellationToken)))
        ));

        var datacenterEntry = pveResources.ToDatacenterEntry(pveClient, dbWorkspace, datacenterSettings, nodeStatuses);

        // Populate Storage information for the Virtual Machine Template Entires
        if (populateDatacenterTemplates)
            await PopulateTemplateConfigurationAsync(pveClient, datacenterEntry, cancellationToken);

        await PopulateVirtualNetworkEntriesAsync(pveClient, datacenterEntry, cancellationToken);

        return datacenterEntry;
    }

    public async Task<VNCSession> CreateVNCProxyAsync(Guid workspaceId, int? virtualMachineIndex, CancellationToken cancellationToken = default)
    {
        var dbWorkspace = await databaseService.GetWorkspaceByIdAsync(workspaceId, cancellationToken);
        if (dbWorkspace == null)
        {
            throw new KeyNotFoundException($"Workspace Id '{workspaceId}' not found.");
        }

        var dbSite = dbWorkspace.Site;
        if (dbSite == null)
            throw new InvalidOperationException($"Unable to retrieve Site for Workspace Id '{workspaceId}'.");

        var mdcEndpoints = await mdcEndpointService.GetMicroDataCenterEndpointsAsync(dbSite, cancellationToken);
        var mdcEndpoint = mdcEndpoints.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available to Site for Workspace Id '{workspaceId}'.");
        
        var pveClient = mdcEndpoint.CreatePVEClient();

        var pveResources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var datacenterSettings = await pveClient.GetDatacenterSettingsAsync(cancellationToken);

        var clusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
        var nodeStatuses = await Task.WhenAll(clusterStatus.GetHostNodes().Select(async node =>
            (node, status: (await pveClient.GetNodeStatusAsync(node.Name, cancellationToken)))
        ));

        var datacenterEntry = pveResources.ToDatacenterEntry(pveClient, dbWorkspace, datacenterSettings, nodeStatuses);

        var workspaceEntry = datacenterEntry.Workspaces.FirstOrDefault(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry == null)
        {
            throw new InvalidOperationException("Workspace Not Found");
        }

        PVEResource? resource = null;
        
        if (virtualMachineIndex.HasValue)
        {
            var vmEntry = workspaceEntry.VirtualMachines.FirstOrDefault(vm => vm.Index == virtualMachineIndex) ?? throw new InvalidOperationException($"Virtual Machine Index '{virtualMachineIndex}' not found in Workspace Id '{workspaceId}'");
            resource = vmEntry.PVEResource;
        }
        else
            resource = workspaceEntry.Bastion?.PVEResource;
        if (resource == null)
        {
            throw new InvalidOperationException($"Bastion resource not found for Workspace Id '{workspaceId}'.");
        }

        // Always request password
        var vncProxy = await pveClient.CreateVNCProxyAsync(resource.Node!, resource.VmId!.Value, true, cancellationToken);

        var path = $"/api2/json/nodes/{resource.Node!}/qemu/{resource.VmId!.Value}/vncwebsocket?port={vncProxy.Port}&vncticket={Uri.EscapeDataString(vncProxy.Ticket)}";

        var url = mdcEndpoint.PVEClientConfiguration.ProxyBaseUrl == null ? $"wss://{mdcEndpoint.PVEClientConfiguration.Host}:{mdcEndpoint.PVEClientConfiguration.Port}{path}" : $"{mdcEndpoint.PVEClientConfiguration.ProxyBaseUrl.Replace("http", "ws").TrimEnd('/')}{path}";

        var ws = new ClientWebSocket();
        ws.Options.SetRequestHeader("Authorization", $"{mdcEndpoint.PVEClientConfiguration.AuthenticationScheme}={mdcEndpoint.PVEClientConfiguration.TokenId}={mdcEndpoint.PVEClientConfiguration.Secret}");
        if (mdcEndpoint.PVEClientConfiguration.ProxyBaseUrl != null)
        {
            ws.Options.SetRequestHeader("X-Proxmox-Host", mdcEndpoint.PVEClientConfiguration.Host.ToString());
            ws.Options.SetRequestHeader("X-Proxmox-Port", mdcEndpoint.PVEClientConfiguration.Port.ToString());
        }

        if (!mdcEndpoint.PVEClientConfiguration.ValidateServerCertificate)
        {
            ws.Options.RemoteCertificateValidationCallback += (sender, certificate, chain, sslPolicyErrors) => true;
        }

        return new VNCSession
        {
            ClientWebSocket = ws,
            Url = url,
            Password = vncProxy.Password
        };
    }

    public async Task SetWorkspaceLockAsync(Guid workspaceId, bool locked, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await GetDatacenterEntryByWorkspaceIdAsync(workspaceId, false, cancellationToken);
        var workspaceEntry = datacenterEntry.Workspaces.FirstOrDefault(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry == null)
        {
            throw new InvalidOperationException("Workspace Not Found");
        }

        var vmids = workspaceEntry.VirtualMachines.Select(i => i.PVEResource!.VmId!.Value)
            .Concat([workspaceEntry.Bastion!.PVEResource!.VmId!.Value])
            .Concat(workspaceEntry.VirtualNetworks.Where(i => i.PVEResource != null).Select(i => i.PVEResource!.VmId!.Value))
            .ToList();

        if (locked)
        {
            // Set the lock in the database first, then lock the VMs
            workspaceEntry.DbWorkspace!.Locked = true;
            await databaseService.SetWorkspaceLockAsync(workspaceEntry.DbWorkspace!, true, cancellationToken);

            foreach (var vmid in vmids)
            {
                await datacenterEntry.PVEClient.UpdateAccessControlListAsync($"/vms/{vmid}", [MDCConstants.PVE_LockRoleId], [MDCConstants.PVE_ApiGroupId], true, cancellationToken);
            }
        }
        else
        {
            foreach (var vmid in vmids)
            {
                await datacenterEntry.PVEClient.DeleteAccessControlListAsync($"/vms/{vmid}", [MDCConstants.PVE_LockRoleId], [MDCConstants.PVE_ApiGroupId], cancellationToken);
            }

            await databaseService.SetWorkspaceLockAsync(workspaceEntry.DbWorkspace!, false, cancellationToken);
        }
    }

    private static async Task PopulateTemplateConfigurationAsync(IPVEClientService pveClient, DatacenterEntry datacenterEntry, CancellationToken cancellationToken = default)
    {
        // Populate Storage information for the Virtual Machine Template Entires
        var templateEntries = datacenterEntry.BastionTemplates
            .Concat(datacenterEntry.GatewayTemplates)
            .Concat(datacenterEntry.VirtualMachineTemplates);
        _ = await QueryQemuConfigsAsync(pveClient, templateEntries, cancellationToken);
        foreach (var virtualMachineTemplateEntry in templateEntries)
        {
            if (virtualMachineTemplateEntry.PVEQemuConfig == null || virtualMachineTemplateEntry.PVEResource == null || virtualMachineTemplateEntry.Storage != null) continue;    // Skip.  Note: This should never happen
            virtualMachineTemplateEntry.Storage = virtualMachineTemplateEntry.PVEQemuConfig.ParseStorage();
        }
    }

    private static async Task<PVEQemuConfig?[]> QueryQemuConfigsAsync(IPVEClientService pveClient, IEnumerable<ResourceEntry> resourceEntries, CancellationToken cancellationToken)
    {
        return await Task.WhenAll(resourceEntries
            .Select(async re => re.PVEQemuConfig = await pveClient.GetQemuConfigAsync(re.PVEResource!.Node!, re.PVEResource.VmId!.Value, cancellationToken))
        );
    }

    private static async Task PopulateVirtualNetworkEntriesAsync(IPVEClientService pveClient, DatacenterEntry datacenterEntry, CancellationToken cancellationToken = default)
    {
        // Populate Virtual Network Entries for Workspace Entries
        var resourceEntries = datacenterEntry.Workspaces.Where(i => i.Address >= datacenterEntry.DatacenterSettings.MinWorkspaceAddress)
            .SelectMany(
                entry => entry.ResourceEntries
                    .Where(re => re.PVEQemuConfig == null && re.PVEResource != null && re.PVEResource.Node != null && re.PVEResource.VmId.HasValue),
                (workspaceEntry, resourceEntry) => resourceEntry);
        _ = await QueryQemuConfigsAsync(pveClient, resourceEntries, cancellationToken);
        foreach (var workspaceEntry in datacenterEntry.Workspaces.Where(i => i.Address >= datacenterEntry.DatacenterSettings.MinWorkspaceAddress))
        {
            if (workspaceEntry.Bastion == null || workspaceEntry.Bastion.PVEQemuConfig == null) continue;   // Skip the Workspaces where a Virtual Network record cannot be created

            // Update the VirtualNetworkEntry Tag values based on the QemuConfig NetworkInterface and DbVirtualNetwork based on the Tag
            foreach (var virtualNetworkEntry in workspaceEntry.VirtualNetworks
                .Where(virtualNetworkEntry => virtualNetworkEntry.PVEResource != null && virtualNetworkEntry.PVEQemuConfig != null))
            {
                var (wanNetworkAdapter, lanNetworkAdapter) = virtualNetworkEntry.PVEQemuConfig!.ParseGatewayNetworkAdapters();

                // The lanNetworkAdapter Tag is expected to have a valid value
                //if (lanNetworkAdapter.Tag == null || lanNetworkAdapter.Tag.Value < minWorkspaceAddress)   // TODO: Get the minimum tag value from Datacenter Settings
                //    throw new InvalidOperationException($"Workspace '{workspaceEntry.Address}' Gateway Virtual Machine '{virtualNetworkEntry.PVEResource!.Name}' Network Adapter '{lanNetworkAdapter.DeviceId}' has invalid Tag value '{Convert.ToString(lanNetworkAdapter.Tag) ?? "<none>"}'.");

                // If the wanNetworkAdapter Tag has a value, it is expected to be valid
                if (wanNetworkAdapter != null
                    && !(
                        // Valid Egress WAN Tag
                        (wanNetworkAdapter.Bridge == datacenterEntry.DatacenterSettings.WanBridgeName && wanNetworkAdapter.Tag == datacenterEntry.DatacenterSettings.WanBridgeTag)
                        ||
                        // Valid Internal WAN tag
                        (wanNetworkAdapter.Bridge == datacenterEntry.DatacenterSettings.LanBridgeName && wanNetworkAdapter.Tag != null && wanNetworkAdapter.Tag.Value >= datacenterEntry.DatacenterSettings.MinVirtualNetworkTag)
                       )
                    )
                    // logger.LogError(new InvalidOperationException($"Workspace '{workspaceEntry.Address}' Gateway Virtual Machine '{virtualNetworkEntry.PVEResource!.Name}' Network Adapter '{wanNetworkAdapter.DeviceId}' has invalid Tag value '{Convert.ToString(wanNetworkAdapter.Tag) ?? "<none>"}'."), "Unexpected Virtual Machine Configuration");

                    if (virtualNetworkEntry.DbVirtualNetwork == null)   // *** REVISIT *** Note: This should never happen because DbVirtaulNetwork is created when the WorkspaceEntry is created
                    {
                        System.Diagnostics.Debugger.Break();
                    }
                
                // Set the Virtual Network Tag value here if dbVirtualNetwork has not been created yet
                virtualNetworkEntry.Tag ??= lanNetworkAdapter?.Tag;

                //if (virtualNetworkEntry.DbVirtualNetwork != null)
                //{
                //    System.Diagnostics.Debugger.Break();
                //}

                //// Note: When repopulating the datatabase, DbWorkspace will be null
                //virtualNetworkEntry.DbVirtualNetwork = workspaceEntry.DbWorkspace?.VirtualNetworks.FirstOrDefault(i => i.Tag == virtualNetworkEntry.Tag);
            }

            // Find all of the network interfaces from the Qemu Configs for the Workspace Bastion and create Virtual Network Entries where there is none already - These are the Virtual Networks with no gateway
            foreach (var networkAdapter in workspaceEntry.Bastion.PVEQemuConfig.ParseNetworkAdapters())
            {
                if (networkAdapter.Tag == null)
                    continue;   // Skip network interfaces with no tag

                // Throw an exception if there is not a Virtual Network Entry for this tag.  There is a Gateway VM specified for this tag
                var virtualNetworkEntry = workspaceEntry.VirtualNetworks.FirstOrDefault(i => i.Tag.HasValue && i.Tag.Value == networkAdapter.Tag.Value)
                    ?? throw new InvalidOperationException($"Workspace '{workspaceEntry.Address}' Bastion Virtual Machine '{workspaceEntry.Bastion.PVEResource!.Name}' Network Adapter '{networkAdapter.DeviceId}' has Tag value '{networkAdapter.Tag.Value}' with no corresponding Virtual Network Entry.");

                // The Virtual Network Index must match the network adapter device index
                if (virtualNetworkEntry.Index != networkAdapter.DeviceIndex)
                {
                    throw new InvalidOperationException($"Workspace '{workspaceEntry.Address}' Bastion Virtual Machine '{workspaceEntry.Bastion.PVEResource!.Name}' Network Adapter '{networkAdapter.DeviceId}' has Tag value '{networkAdapter.Tag.Value}' with mismatched Virtual Network Entry index '{virtualNetworkEntry.Index}' (expected '{networkAdapter.DeviceIndex}').");
                }
            }

            // Update the NetworkAdapter in the WorkspaceDescriptor for each of the VirtualMachines
            foreach (var virtualMachine in workspaceEntry.VirtualMachines.Where(i => i.PVEResource != null && i.PVEQemuConfig != null))
            {
                if (virtualMachine.VirtualMachineDescriptor == null) continue;  // Skip.  Note: This should never happen

                var networkAdapters = virtualMachine.PVEQemuConfig?.ParseNetworkAdapters(); // Force parsing of the config to populate the network adapters

                virtualMachine.VirtualMachineDescriptor.NetworkAdapters = networkAdapters?
                    .Select(na => new VirtualMachineNetworkAdapterDescriptor
                    {
                        Name = na.DeviceId,
                        IsDisconnected = na.IsDisconnected,
                        MACAddress = na.MACAddress,
                        IsFirewallEnabled = na.IsFirewallEnabled,
                        RefVirtualNetworkName = na.Tag == null ? null : workspaceEntry.VirtualNetworks.FirstOrDefault(vn => vn.Tag == na.Tag)?.Name,
                    })
                    .ToArray();
            }
        }
    }

    public static VirtualMachine ToVirtualMachine(VirtualMachineEntry? entry, IEnumerable<VirtualNetworkEntry> virtualNetworks)
    {
        return new VirtualMachine
        {
            Index = entry?.Index ?? 0,
            Name = entry?.Name ?? string.Empty,
            Status = entry?.PVEQemuStatus?.Qmpstatus ?? "unknown",
            NetworkAdapters = entry?.PVEQemuConfig == null ? null :
                entry.PVEQemuConfig.ParseNetworkAdapters().Select(networkDevice => new VirtualMachineNetworkAdapter
                {
                    Name = networkDevice.DeviceId,
                    IsDisconnected = networkDevice.IsDisconnected ?? false,
                    MACAddress = networkDevice.MACAddress,
                    VirtualNetworkId = virtualNetworks.FirstOrDefault(vn => vn.Tag == networkDevice.Tag)?.DbVirtualNetwork?.Id,
                    NetworkInterfaces = entry.PVEQemuAgentNetworkInterfaces?
                        .Select(ni => new VirtualMachineNetworkInterface
                        {
                            Name = ni.Name,
                            MACAddress = ni.MACAddress,
                            IPAddress = ni.IPAddress?.ToString(),
                            Prefix = ni.Prefix
                        })
                        .ToArray()
                })
                .ToArray()
        };
    }

    public static Workspace[] ToWorkspaces(IEnumerable<WorkspaceEntry> workspaceEntries)
    {
        return workspaceEntries
                .Where(entry => entry.DbWorkspace != null && entry.DbWorkspace.Id != Guid.Empty)
                .Select(entry => new Workspace
                {
                    Id = entry.DbWorkspace!.Id,
                    SiteId = entry.DbWorkspace.SiteId,
                    OrganizationId = entry.DbWorkspace.OrganizationId,
                    Address = entry.Address,
                    Name = entry.Name,
                    Locked = entry.Locked,
                    CreatedAt = entry.DbWorkspace.CreatedAt,
                    UpdatedAt = entry.DbWorkspace.UpdatedAt,
                    Description = entry.DbWorkspace.Description,
                    Bastion = DatacenterFactoryService.ToVirtualMachine(entry.Bastion, entry.VirtualNetworks),
                    VirtualNetworks = DatacenterFactoryService.ToVirtualNetworks(entry.VirtualNetworks),
                    VirtualMachines = entry.VirtualMachines.Select(vm => DatacenterFactoryService.ToVirtualMachine(vm, entry.VirtualNetworks)).ToArray()
                    //Devices = []
                })
                .ToArray();
    }

    public static VirtualNetwork[] ToVirtualNetworks(IEnumerable<VirtualNetworkEntry> virtualNetworkEntries)
    {
        return virtualNetworkEntries
                .Where(entry => entry.DbVirtualNetwork != null && entry.DbVirtualNetwork.Id != Guid.Empty && entry.Name != null)
                .Select(entry => new VirtualNetwork
                {
                    Id = entry.DbVirtualNetwork!.Id,
                    Index = entry.DbVirtualNetwork.Index,
                    Name = entry.Name!,
                    Tag = entry.Tag,
                    ZeroTierNetworkId = entry.DbVirtualNetwork.ZeroTierNetworkId,
                    RemoteNetworkId = entry.DbVirtualNetwork.ZeroTierNetworkId == null ? null : Guid.ParseExact(new string('0', 16) + entry.DbVirtualNetwork.ZeroTierNetworkId, "N"), // Convert virtualNetwork.ZeroTierNetworkId to 16 digit hex string containing the last 8 bytes of the Guid
                })
                .ToArray();
    }

    public async Task<Site[]> ComputeSitesAsync(DbSite[] dbSites, bool fetchPVEInformation, CancellationToken cancellationToken = default)
    {
        // Get the organizations for the user to ensure the Organization Ids are filter to only include those allowed for this user
        var dbOrganizations = await databaseService.GetOrganizationsAsync(cancellationToken);

        // Get the workpaces for the user to ensure the Workspace Ids are filter to only include those allowed for this user
        var dbWorkspaces = await databaseService.GetAllWorkspacesAsync(cancellationToken);

        var dbSiteNodes = dbSites.SelectMany(i => i.SiteNodes).ToArray();
        var mdcEndpoints = await mdcEndpointService.GetMicroDataCenterEndpointsAsync(dbSiteNodes, cancellationToken);

        var dictMdcEndpoints = mdcEndpoints.ToDictionary(i => i.ZTMember.NodeId);

        var sites = dbSites.Select(async dbSite =>
        {
            DatacenterEntry? datacenterEntry = null;
            if (fetchPVEInformation)
            {
                datacenterEntry = await GetDatacenterEntryAsync(dbSite, cancellationToken);
            }

            // Create a full join between dbSite.SiteNodes[name] and NodeEntry[node.Name] to yield a collection of { name, mdcEndpoint?, pveStatus? }
            var leftJoin = from dbSiteNode in dbSite.SiteNodes
                           join nodeStatus in (datacenterEntry?.Nodes ?? []) on dbSiteNode.Name equals nodeStatus.PVEClusterStatus.Name into joined
                           from nodeStatus in joined.DefaultIfEmpty((NodeEntry?)null)
                           select ToSiteNode(dbSiteNode.Name, dictMdcEndpoints.GetValueOrDefault(dbSiteNode.MemberAddress), nodeStatus?.PVENodeStatus);
            var rightJoin = from nodeStatus in (datacenterEntry?.Nodes ?? [])
                            join dbSiteNode in dbSite.SiteNodes on nodeStatus.PVEClusterStatus.Name equals dbSiteNode.Name into joined
                            from dbSiteNode in joined.DefaultIfEmpty((DbSiteNode?)null)
                            select ToSiteNode(nodeStatus.PVEClusterStatus.Name, dbSiteNode == null ? null : dictMdcEndpoints.GetValueOrDefault(dbSiteNode.MemberAddress), nodeStatus.PVENodeStatus);

            var fullJoin = leftJoin.UnionBy(rightJoin, i => i.Name);

            return new Site
            {
                Id = dbSite.Id,
                Name = dbSite.Name,
                Description = dbSite.Description,
                OrganizationIds = dbSite.Organizations.Intersect(dbOrganizations).Select(i => i.Id).ToArray(),
                WorkspaceIds = dbSite.Workspaces.Intersect(dbWorkspaces).Select(i => i.Id).ToArray(),
                BastionTemplates = datacenterEntry?.BastionTemplates.Select(entry => ToVirtualMachineTemplate(entry)).ToArray(),
                GatewayTemplates = datacenterEntry?.GatewayTemplates.Select(entry => ToVirtualMachineTemplate(entry)).ToArray(),
                VirtualMachineTemplates = datacenterEntry?.VirtualMachineTemplates.Select(entry => ToVirtualMachineTemplate(entry)).ToArray(),
                Nodes = fullJoin.ToArray()
            };
        }).ToArray();

        return await Task.WhenAll(sites);
    }

    public Organization[] ComputeOrganizations(DbOrganization[] dbOrganizations)
    {
        return dbOrganizations
            .Select(dbOrganization =>
             new Organization
             {
                 Id = dbOrganization.Id,
                 Name = dbOrganization.Name,
                 Description = dbOrganization.Description,
                 Active = dbOrganization.Active,
                 SiteIds = dbOrganization.Sites.Select(dbSite => dbSite.Id).ToArray(),
                 WorkspaceIds = dbOrganization.Workspaces.Select(dbWorkspace => dbWorkspace.Id).ToArray(),
                 OrganizationUserRoles = dbOrganization.OrganizationUserRoles.Select(our => new OrganizationUserRole
                 {
                     OrganizationId = dbOrganization.Id,
                     OrganizationName = dbOrganization.Name,
                     Role = our.Role,
                     UserId = our.UserId,
                     UserName = our.User?.Name ?? throw new InvalidOperationException($"Unable to load User Name for User Id {our.UserId}")
                 }).ToArray()
             })
            .ToArray();
    }

    private static SiteNode ToSiteNode(string name, MicroDataCenterEndpoint? mdcEndpoint, PVENodeStatus? pveNodeStatus)
    {
        return new SiteNode
        {
            CPUInfo = pveNodeStatus == null ? null :
            new SiteNodeCPUInfo
            {
                Cores = pveNodeStatus.CPUInfo.Cores,
                CPUs = pveNodeStatus.CPUInfo.CPUs,
                MHZ = pveNodeStatus.CPUInfo.MHZ,
                Model = pveNodeStatus.CPUInfo.Model,
                Sockets = pveNodeStatus.CPUInfo.Sockets
            },
            Name = name,
            Online = mdcEndpoint?.ZTMember.Online == 1,
            Authorized = mdcEndpoint?.ZTMember.Config.Authorized,
            Configured = mdcEndpoint?.PVEClientConfiguration != null,
        };
    }

    private static VirtualMachineTemplate ToVirtualMachineTemplate(VirtualMachineTemplateEntry entry)
    {
        return new VirtualMachineTemplate
        {
            Name = entry.Name!,
            Revision = entry.Index!.Value,
            Cores = entry.PVEQemuConfig?.Cores,
            Memory = entry.PVEQemuConfig?.Memory,
            Storage = (entry.Storage ?? []).Select(i => new VirtualMachineTemplateStorage
            {
                ControllerType = i.ControllerType,
                ControllerIndex = i.ControllerIndex,
                Size = i.GetSize()
            })
            .ToArray()
        };
    }
}
