using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Providers.MDCEndpoint;

internal class MDCEndpointService(IZeroTierService zeroTierService, IOptions<MDCEndpointServiceOptions> options, ILogger<MDCEndpointService> logger) : IMDCEndpointService
{

    public async Task<MicroDataCenterEndpoint[]> GetMicroDataCenterEndpointsAsync(DbSiteNode[] dbSiteNodes, CancellationToken cancellationToken = default)
    {
        var members = await zeroTierService.GetNetworkMembersAsync(options.Value.MgmtNetworkId, cancellationToken);
        return members
            .Where(i => i.NodeId != i.ControllerId && (i.Config.IPAssignments ?? []).Length != 0)
            .Join(dbSiteNodes.Where(i => i.Site != null), member => member.NodeId, dbSiteNode => dbSiteNode.MemberAddress, (member, dbSiteNode) =>
            ComputeMicroDataCenterEndpoint(member, PVEClientServiceOptions.Create(dbSiteNode.Site!.ApiTokenId, dbSiteNode.Site.ApiSecret, member.Config.IPAssignments!.First(), dbSiteNode.ApiPort, dbSiteNode.ApiValidateServerCertificate, proxyBaseUrl: options.Value.ProxyBaseUrl)))
            .ToArray();
    }

    public async Task<MicroDataCenterEndpoint[]> GetMicroDataCenterEndpointsAsync(DbSite dbSite, CancellationToken cancellationToken = default)
    {
        var members = await zeroTierService.GetNetworkMembersAsync(options.Value.MgmtNetworkId, cancellationToken);
        return members
            .Where(i => i.NodeId != i.ControllerId && i.Online == 1 && i.Config.Authorized && (i.Config.IPAssignments ?? []).Length != 0)
            // .Where(i => i.NodeId != i.ControllerId && (i.Config.IPAssignments ?? []).Length != 0)
            .Join(dbSite.SiteNodes.Where(i => i.Site != null), member => member.NodeId, dbSiteNode => dbSiteNode.MemberAddress, (member, dbSiteNode) =>
            ComputeMicroDataCenterEndpoint(member, PVEClientServiceOptions.Create(dbSiteNode.Site!.ApiTokenId, dbSiteNode.Site.ApiSecret, member.Config.IPAssignments!.First(), dbSiteNode.ApiPort, dbSiteNode.ApiValidateServerCertificate, proxyBaseUrl: options.Value.ProxyBaseUrl)))
            .ToArray();
    }

    public async Task<MicroDataCenterEndpoint> GetMicroDataCenterEndpointAsync(DbSiteNode dbSiteNode, CancellationToken cancellationToken = default)
    {
        if (dbSiteNode.Site == null) throw new InvalidOperationException($"Unable to find Site record for SiteNode.");

        // If the member has not joined the network yet, we cannot proceed
        var member = await LookupZTMemberAsync(dbSiteNode.MemberAddress, true, cancellationToken);

        // The member must have an IP address to proceed
        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0) throw new InvalidOperationException($"ZeroTier member with address '{dbSiteNode.MemberAddress}' does not have any IP assignments.");

        var pveClientServiceOptions = PVEClientServiceOptions.Create(dbSiteNode.Site.ApiTokenId, dbSiteNode.Site.ApiSecret, member.Config.IPAssignments[0], dbSiteNode.ApiPort, dbSiteNode.ApiValidateServerCertificate, proxyBaseUrl: options.Value.ProxyBaseUrl);

        return ComputeMicroDataCenterEndpoint(member, pveClientServiceOptions);
    }

    public async Task<MicroDataCenterEndpoint> RegisterMicroDataCenterAsync(string memberAddress, string siteNodeName, string registrationUserName, string registrationPassword, int port = 8006, bool validateServerCertificate = true, int timeout = 30, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Registering new Site with Member Address '{memberAddress}' with Site Node Name '{siteNodeName}'", memberAddress, siteNodeName);

        // If the member has not joined the network yet, we cannot proceed
        var member = await LookupZTMemberAsync(memberAddress, false, cancellationToken);
        
        // Ensure Member is authorized
        if (!member.Config.Authorized)
        {
            member = await zeroTierService.SetNetworkMemberAuthorizationAsync(options.Value.MgmtNetworkId, member.NodeId, true, cancellationToken);
        }

        // Ensure the member has auto assigned IP Address
        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0)
        {
            member = await zeroTierService.WaitForMemberIPAssignmentAsync(options.Value.MgmtNetworkId, member.NodeId, cancellationToken);
        }

        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0)
        {
            throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' does not have any IP assignments.");
        }

        var ipAddress = member.Config.IPAssignments[0];
        var (tokenId, secret) = await CreatePVEAPITokenAsync(registrationUserName, registrationPassword, ipAddress, port, validateServerCertificate, timeout, cancellationToken);

        // Now that the member has the correct IP address, verify connectivity to the PVEClient
        var pveClientServiceOptions = PVEClientServiceOptions.Create(tokenId, secret, ipAddress, port, validateServerCertificate, timeout, proxyBaseUrl: options.Value.ProxyBaseUrl);

        // Set the member name if it is not set
        if (string.IsNullOrEmpty(member.Name))
        {
            // Update the member name to match the local node name
            member = await zeroTierService.SetNetworkMemberNameAsync(
                options.Value.MgmtNetworkId,
                member.NodeId,
                siteNodeName,
                cancellationToken);
        }

        return ComputeMicroDataCenterEndpoint(member, pveClientServiceOptions) ?? throw new InvalidOperationException("Failed to register valid MDC Endpoint");
    }

    public async Task<IPVEClientService> CreatePVEClientAsync(string memberAddress, string tokenId, string secret, int port, bool validateServerCertificate, int timeout, CancellationToken cancellationToken = default)
    {
        // If the member has not joined the network yet, we cannot proceed
        var member = await LookupZTMemberAsync(memberAddress, true, cancellationToken);

        // The member must have an IP address to proceed
        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0) throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' does not have any IP assignments.");

        return PVEClientServiceOptions
            .Create(tokenId, secret, member.Config.IPAssignments[0], port, validateServerCertificate, timeout, proxyBaseUrl: options.Value.ProxyBaseUrl)
            ._CreatePVEClient();
    }

    public async Task<IPVEClientService[]> CreatePVEClientsAsync(DbSite dbSite, int timeout, CancellationToken cancellationToken = default)
    {
        // Lookup members from specified addresses
        var members = await zeroTierService.GetNetworkMembersAsync(options.Value.MgmtNetworkId, cancellationToken);

        // Consinder only the members from the list of memberAddresses which are not a controller, online, authorized, and have an IP address
        return members
            .Where(i => i.NodeId != i.ControllerId && i.Online == 1 && i.Config.Authorized && (i.Config.IPAssignments ?? []).Length != 0)
            .Join(
                dbSite.SiteNodes, 
                member => member.NodeId, 
                dbSiteNode => dbSiteNode.MemberAddress, 
                (member, dbSiteNode) => ComputeMicroDataCenterEndpoint(member, PVEClientServiceOptions.Create(dbSiteNode.Site!.ApiTokenId, dbSiteNode.Site.ApiSecret, member.Config.IPAssignments!.First(), dbSiteNode.ApiPort, dbSiteNode.ApiValidateServerCertificate, proxyBaseUrl: options.Value.ProxyBaseUrl)).CreatePVEClient())
            .ToArray();
    }

    public async Task<IPVEClientService> CreatePrivilegedPVEClient(string memberAddress, string username, string password, int port, bool validateServerCertificate, int? timeout, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Creating Privileged PVE Client for Site Member Address '{memberAddress}' using Proxy '{useProxy}'.", memberAddress, options.Value.ProxyBaseUrl != null);

        var member = await LookupZTMemberAsync(memberAddress, true, cancellationToken);

        // The member must have an IP address to proceed
        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0) throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' does not have any IP assignments.");

        return await PVEClientService.AuthenticateWithAccessTicketAsync(username, password, member.Config.IPAssignments[0], port, validateServerCertificate, timeout, options.Value.ProxyBaseUrl, cancellationToken);
    }

    public async Task ConfigureSiteAsync(DbSiteNode dbSiteNode, IPVEClientService priviligedPVEClient, SiteDescriptor siteDescriptor, CancellationToken cancellationToken)
    {
        // Setup Networks
        await ConfigureNetworksAsync(priviligedPVEClient, false, null,  cancellationToken);

        // Setup Workspace Lock Permissions
        await ConfigureLockPermissionsAsync(priviligedPVEClient, cancellationToken);

        // Configure Metric Server

        // Configure PBS
        await ConfigureProxmoxBackupServerAsync(priviligedPVEClient, cancellationToken);

        // Download ISO Images(?)

        // Download VM Templates
    }

    public async Task<DownloadableTemplate[]> GetDownloadableTemplatesAsync(DbSite dbSite, CancellationToken cancellationToken = default)
    {
        var pveClients = await CreatePVEClientsAsync(dbSite, 30, cancellationToken);
        var pveClient = pveClients.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available to Site Id '{dbSite.Id}'.");

        if (!(options.Value.ProxmoxBackupServer != null && options.Value.ProxmoxBackupServer.UserName != null && options.Value.ProxmoxBackupServer.Password != null))
        {
            throw new InvalidOperationException("Proxmox Backup Server is not configured.");
        }

        var resources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var existingTemplates = resources
            .Where(i => i.Template == true)
            .Select(i =>
            {
                if (!MDCHelper.ParseMDCVirtualMachineName(i.Name, true, out var workspaceAddress, out var type, out var index, out var name))
                    return null;
                return new
                {
                    PVEResource = i,
                    WorkspaceAddress = workspaceAddress,
                    Type = type,
                    Index = index,
                    Name = name
                };
            })
            .Where(i => i != null)
            .Select(i => i!)
            .ToArray();

        var storageContents = await pveClient.GetStorageContentAsync("localhost", options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);

        var siteStorageContents = await Task.WhenAll(storageContents.Select(async item =>
        {
            if (item?["content"]?.GetValue<string>() != "backup" && item?["subtype"]?.GetValue<string>() != "qemu")
                return null;

            var volumeId = item["volid"]?.GetValue<string>();
            if (volumeId == null)
                return null;

            var size = item["size"]?.GetValue<long>();

            var config = await pveClient.StorageExtractConfigAsync("localhost", volumeId, cancellationToken);
            var node = new JsonObject();
            foreach (var entry in config.Split('\n').Where(i => !i.StartsWith("#")).Select(i => i.Split(':', 2, StringSplitOptions.TrimEntries)))
            {
                var key = entry.ElementAtOrDefault(0);
                if (key == null) continue;
                node[key.Trim()] = entry.ElementAtOrDefault(1)?.Trim();
            }
            var qemuConfig = node.Deserialize<PVEQemuConfig>(JsonSerializerOptions.Web);
            if (qemuConfig == null) return null;


            if (!qemuConfig.UnknownProperties.TryGetValue("template", out var templateElement) || templateElement.GetString() != "1") return null;
            if (qemuConfig.Name == null) return null;
            if (!MDCHelper.ParseMDCVirtualMachineName(qemuConfig.Name, true, out var workspaceAddress, out var type, out var index, out var name) || name == null || index == null || type == null) return null;

            using var md5 = MD5.Create();

            return new DownloadableTemplate
            {
                Name = name,
                Revision = index.Value,
                Cores = qemuConfig.Cores,
                Memory = qemuConfig.Memory,
                Storage = (qemuConfig.ParseStorage() ?? []).Select(i => new VirtualMachineTemplateStorage
                {
                    ControllerType = i.ControllerType,
                    ControllerIndex = i.ControllerIndex,
                    Size = i.GetSize()
                }).ToArray(),
                Type = type,
                Size = size,
                Downloaded = existingTemplates.Any(t => t.Name == name && t.Index == index.Value && t.Type == type),
                Digest = BitConverter.ToString(md5.ComputeHash(Encoding.UTF8.GetBytes(volumeId)))
            };
        }));

        return siteStorageContents.Where(i => i != null).Select(i => i!).ToArray();
    }

    public async Task<string> DownloadTemplateAsync(DbSite dbSite, DownloadTemplateDescriptor downloadTemplateDescriptor, CancellationToken cancellationToken = default)
    {
        var pveClients = await CreatePVEClientsAsync(dbSite, 30, cancellationToken);
        var pveClient = pveClients.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available to Site Id '{dbSite.Id}'.");

        if (!(options.Value.ProxmoxBackupServer != null && options.Value.ProxmoxBackupServer.UserName != null && options.Value.ProxmoxBackupServer.Password != null))
        {
            throw new InvalidOperationException("Proxmox Backup Server is not configured.");
        }

        // First check if there is an existing qmrestore task running.   Only one restore can happen at a time
        var tasks = await pveClient.GetTasksAsync(cancellationToken);
        if (tasks.Any(i => i.Type == "qmrestore" && i.EndTime == null)) throw new InvalidOperationException("Cannot download template while another download is in progress");

        var storageContents = await pveClient.GetStorageContentAsync("localhost", options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);

        // Find the archive matching the downloadTemplateDescriptor
        using var md5 = MD5.Create();
        var target = storageContents
            .FirstOrDefault(item => item?["content"]?.GetValue<string>() == "backup" && item?["subtype"]?.GetValue<string>() == "qemu" && item["volid"]?.GetValue<string>() != null && downloadTemplateDescriptor.Digest == BitConverter.ToString(md5.ComputeHash(Encoding.UTF8.GetBytes(item["volid"]?.GetValue<string>()!))));

        if (target == null) throw new InvalidOperationException("Not Found");

        var vmid = target["vmid"]?.GetValue<int>() ?? throw new InvalidOperationException("Unable to determine VMID");

        var resources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var existingVMIDs = resources.Where(i => i.VmId != null && i.VmId > vmid).Select(i => i.VmId!.Value).Order().ToArray();
        var newId = Enumerable.Range(existingVMIDs.FirstOrDefault(vmid), existingVMIDs.Length + 1).Except(existingVMIDs).FirstOrDefault();

        var volumeId = target["volid"]?.GetValue<string>() ?? throw new InvalidOperationException("Unable to determine VolumeId");

        var storages = resources.Where(i => i.Type == PVEResourceType.Storage).ToArray();
        var imageStorage = storages.FirstOrDefault(i => (i.Content ?? string.Empty).Split(',').Contains("images")) ?? throw new InvalidOperationException($"Unable to determine storage capacity for Datacenter");

        var upid = await pveClient.CreateQemuAsync("localhost", newId, true, imageStorage.Id.Split('/').Last(), volumeId, cancellationToken);
        return upid;
    }

    #region Private

    private async Task<ZTMember> LookupZTMemberAsync(string memberAddress, bool authorizationRequired, CancellationToken cancellationToken = default)
    {
        // If the member has not joined the network yet, we cannot proceed
        var member = await zeroTierService.GetNetworkMemberByIdAsync(options.Value.MgmtNetworkId, memberAddress, cancellationToken) ?? throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' does not exist in the MDC Management Network.");

        // The member must be online to proceed
        if (member.Online != 1) throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' is not online. It must be online to create a PVE Client.");

        // The member must be authorized to proceed
        if (authorizationRequired && !member.Config.Authorized) throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' is not authorized. It must be authorized to create a PVE Client.");

        return member;
    }

    private async Task<(string tokenId, string secret)> CreatePVEAPITokenAsync(string username, string password, string ipAddress, int port, bool validateServerCertificate, int? timeout, CancellationToken cancellationToken = default)
    {
        // Create a PVEClient to authenticate and create the API token
        var privilegedPVEClient = await PVEClientService.AuthenticateWithAccessTicketAsync(username, password, ipAddress, port, validateServerCertificate, timeout, options.Value.ProxyBaseUrl, cancellationToken);

        // Ensure permissions are setup
        var apiRoleId = "MDCApiRole";
        var apiRoleprivileges = new string[]
        {
            "Sys.Audit",
            "VM.Allocate",
            "VM.Audit",
            "VM.Clone",
            "VM.Config.Network",
            "VM.Config.CPU",
            "VM.Config.Memory",
            "VM.GuestAgent.Unrestricted",
            "VM.PowerMgmt",
            "VM.Backup",
            "Datastore.Audit",
            "Datastore.AllocateSpace",
            "SDN.Use",
            "Permission.Modify"
        };
        var apiACLPath = "/";
        var apiUserId = "MDCApiUser@pve";
        var apiTokenId = "MDCApiToken";

        // Ensure the role is created and has expected permissions
        {
            var roles = await privilegedPVEClient.GetRolesAsync(cancellationToken);
            var role = roles.FirstOrDefault(r => r?["roleId"]?.GetValue<string>() == apiRoleId);
            if (role == null)
            {
                var success = await privilegedPVEClient.CreateRoleAsync(apiRoleId, apiRoleprivileges, cancellationToken);
                roles = await privilegedPVEClient.GetRolesAsync(cancellationToken);
                role = roles.FirstOrDefault(r => r?["roleId"]?.GetValue<string>() == apiRoleId);
            }

            var rolePrivileges = role?["privs"]?.GetValue<string>().Split(',') ?? throw new InvalidOperationException("Unable to retrieve privileges for role.");
            if (!rolePrivileges.Order().SequenceEqual(apiRoleprivileges.Order()))
            {
                var success = await privilegedPVEClient.UpdateRoleAsync(apiRoleId, apiRoleprivileges, cancellationToken);
            }
        }

        // Ensure the group is created
        {
            var groups = await privilegedPVEClient.GetGroupsAsync(cancellationToken);
            var group = groups.FirstOrDefault(g => g?["groupid"]?.GetValue<string>() == MDCConstants.PVE_ApiGroupId);
            if (group == null)
            {
                var success = await privilegedPVEClient.CreateGroupAsync(MDCConstants.PVE_ApiGroupId, MDCConstants.PVE_ApiGroupId, cancellationToken);
            }
        }

        // Ensure access list entry is created
        {
            var acl = await privilegedPVEClient.GetAccessControlListAsync(cancellationToken);
            var aclEntry = acl.FirstOrDefault(entry => entry.Path == apiACLPath && entry.Type == "group" && entry.UserGroupId == MDCConstants.PVE_ApiGroupId && entry.RoleId == apiRoleId);
            if (aclEntry == null)
            {
                var success = await privilegedPVEClient.UpdateAccessControlListAsync(apiACLPath, new string[] { MDCConstants.PVE_ApiGroupId }, new string[] { MDCConstants.PVE_ApiGroupId }, true, cancellationToken);
            }
        }

        // Ensure user and user api token are created
        {
            var users = await privilegedPVEClient.GetUsersAsync(cancellationToken);
            var user = users.FirstOrDefault(u => u?["userid"]?.GetValue<string>() == apiUserId);
            if (user == null)
            {
                var success = await privilegedPVEClient.CreateUserAsync(apiUserId, GeneratePassword(10), new string[] { MDCConstants.PVE_ApiGroupId }, "Created by MDC Registration", cancellationToken);
            }
            user = await privilegedPVEClient.GetUserAsync(apiUserId, cancellationToken);

            // Ensure that the user is a member of the group
            var groups = user["groups"]?.AsArray()?.Select(i => i?.GetValue<string>()).ToArray() ?? [];
            if (!groups.Contains(MDCConstants.PVE_ApiGroupId))
            {
                var success = await privilegedPVEClient.UpdateUserAsync(apiUserId, new string[] { MDCConstants.PVE_ApiGroupId }, null, cancellationToken);
            }

            // Always generate a new API Token
            var apiTokens = await privilegedPVEClient.GetUserAPITokensAsync(apiUserId, cancellationToken);
            var existing = apiTokens.Select(i => i?["tokenId"]?.GetValue<string>()).ToHashSet();
            string targetId = apiTokenId;
            for (int x = 0;x<100; x++)
            {
                targetId = $"{apiTokenId}{x:D03}";
                if (!existing.Contains(targetId)) break;
            }
            var apiTokenResponse = await privilegedPVEClient.CreateUserAPITokenAsync(apiUserId, targetId, "Created By MDC Registration", false, cancellationToken);
            var fullTokenId = apiTokenResponse?["full-tokenid"]?.GetValue<string>() ?? throw new InvalidOperationException("Unable to retrieve API token id");
            var value = apiTokenResponse?["value"]?.GetValue<string>() ?? throw new InvalidOperationException("Unable to retrieve API secret");

            return (fullTokenId, value);
        }
    }

    private async Task ConfigureNetworksAsync(IPVEClientService priviligedPVEClient, bool dataEgressOnMgmtNetwork, string? overrideDataBridgeNetworkInterfaceName, CancellationToken cancellationToken = default)
    {
        // ** BUGBUG: SECURITY WARNING **
        // When dataEgressOnMgmtNetwork==TRUE, the DATA Gateway VM will share the MGMT network interface.  This does not separate MGMT and DATA network and exposes the host MGMT network to guests.

        // When overrideDataBridgeNetworkInterfaceName is specified, Bridge vmbr01 will be assigned to this Network Interface if it exists (and is not being used by MGMT or CLUSTER; otherwise an exception is thrown)
        // Whe both dataEgressOnMgmtNetwork==TRUE and overrideDataBridgeNetworkInterfaceName has a value, vmbr01 will be assigned to the overrideDataBridgeNetworkInterfaceName but the DATA Gateway VM will use vmbr0;  as a result vmbr01 exists but is not used.

        string node = "localhost";
        //string trunkComment = "TRUNK";

        DatacenterSettings datacenterSettings = new DatacenterSettings();
        var nodeNetworks = await priviligedPVEClient.GetNodeNetworkAsync(node, cancellationToken);

        // Determine which networks should be MGMT, DATA, TRUNK, and CLUSTER

        // MGMT network has
        //  - a required entry where NetworkInterfaceName == "vmbr0" and NetworkInterfaceType == "bridge".  This entry must have a value for address, gateway and bridge_ports. 
        //  - each of the values in (vmbr0, bridge) bridge_ports property are the MGMT network physical nics.  Each of these have NetworkInterfaceName == <bridge port item> and NetworkInterfaceType == "eth"
        //  - NOTE: it is assumed that vmbr0 has CIDR, Address and Gateway property values
        var mgmtNetworkBridge = nodeNetworks.FirstOrDefault(i => i.NetworkInterfaceType == "vmbr0" && i.NetworkInterfaceType == "bridge") ?? throw new InvalidOperationException($"Node does not have MGMT network. Bridge network named 'vmbr0' is required.");
        var _mgmtNetworkBridgePorts = (mgmtNetworkBridge.BridgePorts ?? string.Empty).Split(' ');
        if (_mgmtNetworkBridgePorts.Length == 0) throw new InvalidOperationException("MGMT network bridge 'vmbr0' does not have any bridge ports defined. This is required.");
        var mgmtNetworkInterfaces = nodeNetworks.Where(i => _mgmtNetworkBridgePorts.Contains(i.NetworkInterfaceName)).ToArray(); // Note: it is assumed that these also have NetworkInterfaceType == "eth" because Proxmox will not allow BridgePort entry to be a node network where type is not eth (this is an assumption)
        // Check that all of the bridge ports refernced in vmbr0 exist
        if (mgmtNetworkInterfaces.Length != _mgmtNetworkBridgePorts.Length) throw new InvalidOperationException($"MGMT network bridge 'vmbr0' has bridge ports defined which do not exist: {string.Join(',', _mgmtNetworkBridgePorts.Except(mgmtNetworkInterfaces.Select(i => i.NetworkInterfaceName)))}");
        var nodeNetwork_vmbr0 = new PVENodeNetwork
        {
            NetworkInterfaceName = "vmbr0",
            NetworkInterfaceType = "bridge",
            Comments = "MGMT"
        };

        // Of the remaining nodeNetworks:
        // - (optional) CLUSTER network has a single entry where NetworkInterfaceType == eth and CIDR has a value.  At this time a cluster must be created manually, which would result in this scenario being true
        var clusterNetworkInterfaces = nodeNetworks.Except(mgmtNetworkInterfaces).Where(i => i.NetworkInterfaceType == "eth" && i.CIDR != null).ToArray();

        // The rest of the networks where NetworkInterfacType == eth must be either DATA or TRUNK based on the number of dataOrTrunkNetworkInterfaces entries
        var dataOrTrunkNetworkInterfaces = nodeNetworks
            .Except(mgmtNetworkInterfaces.Concat(clusterNetworkInterfaces))
            .Where(i => i.NetworkInterfaceType == "eth")
            .ToArray();
        PVENodeNetwork? dataNetworkInterface = null;
        PVENodeNetwork[]? trunkNetworkInterfaces = null;
        PVENodeNetwork? nodeNetwork_vmbr02 = null;
        PVENodeNetwork? nodeNetwork_vmbr01 = null;
        switch (dataOrTrunkNetworkInterfaces.Length)
        {
            // ** BUGBUG: SECURITY WARNING **
            // When 0 there are no physical network interfaces available to isolate DATA and TRUNK network segments.  As a result:
            // * mgmtNetworkInterfaces (vmbr0) must be shared for DATA bridge (there will be no bridge vmbr01)
            // * mgmtNetworkInterfaces must be shared for TRUNK bridge (there will be no bridge vmbr01 or bridgevmbr02; Bridge vmbr0 must have VlanAware==1)
            // * DATA Gateway VM's WAN must be assigned to vmbr0 
            //      => ** BUGBUG: SECURITY WARNING ** this does not separate MGMT and DATA network segments and exposes the host's MGMT network to guests.
            case 0:
                {
                    //dataNetworkInterfaces = mgmtNetworkInterfaces;
                    //trunkNetworkInterfaces = mgmtNetworkInterfaces;
                    nodeNetwork_vmbr0.BridgeVLANAware = 1;
                    dataEgressOnMgmtNetwork = true;
                    break;
                }
            // When 1 the physical network interface is used for both DATA and TRUNK network segments. As a result:
            // * dataOrTrunkNetworkInterfaces must be assigned for TRUNK bridge (vmbr02)
            // * dataOrTrunkNetworkInterfaces (vmbr02) must be shared for DATA bridge (there will be no bridge vmbr01) 
            //
            // - When dataEgressOnMgmtNetwork == FALSE:
            //      * DATA gateway VM's WAN must be assigned to vmbr02 (with DatacenterSettings.WanBridgeTag = null, even though vmbr02 is a trunk / carries VLAN traffic)
            //      * Physical network interface for dataOrTrunkNetworkInterfaces is expected to be connected to a router with internet access.
            //  - When dataEgressOnMgmtNetwork==TRUE:
            //      * DATA Gateway VM's WAN must be assigned to vmbr0
            //      => ** BUGBUG: SECURITY WARNING ** this does not separate MGMT and DATA network segments and exposes the host MGMT network to guests.
            case 1:
                {
                    //dataNetworkInterfaces = dataEgressOnMgmtNetwork ? mgmtNetworkInterfaces : dataOrTrunkNetworkInterfaces;
                    trunkNetworkInterfaces = dataOrTrunkNetworkInterfaces;

                    nodeNetwork_vmbr02 = new PVENodeNetwork
                    {
                        NetworkInterfaceName = "vmbr02",
                        NetworkInterfaceType = "bridge",
                        BridgeVLANAware = 1,
                        Comments = "TRUNK",
                        BridgePorts = string.Join(' ', dataOrTrunkNetworkInterfaces.Select(i => i.NetworkInterfaceName))
                    };
                    break;
                }
            // When 2 or higher the physical network interfaces for DATA and TRUNK network segments can be isolated.
            // - When overrideDataBridgeNetworkInterfaceName is null
            //      * DATA bridge (vmbr01) BridgePorts value will be the dataOrTrunkNetworkInterfaces entry with the lowest priority
            // - When overrideDataBridgeNetworkInterfaceName is not null
            //      * DATA bridge (vmbr01) BridgePorts value will be the dataOrTrunkNetworkInterfaces entry with the matching Network Interface Name or altname
            // * The TRUNK bridge (vmbr02) BridgePorts value will be the remaining dataOrTrunkNetworkInterfaces
            //
            // - When dataEgressOnMgmtNetwork == FALSE:
            //      * DATA gateway VM's WAN must be assigned to vmbr01
            //      * Physical network interface for DATA bridge (vmbr01) is expected to be connected to a router with internet access.
            //  - When dataEgressOnMgmtNetwork==TRUE:
            //      * DATA gateway VM's WAN must be assigned to vmbr0
            //      => ** BUGBUG: SECURITY WARNING ** this does not separate MGMT and DATA network segments and exposes the host MGMT network to guests.
            case 2:
                {
                    dataNetworkInterface = dataOrTrunkNetworkInterfaces
                        .OrderBy(i => i.Priority ?? 0)
                        .First(i => overrideDataBridgeNetworkInterfaceName == null || i.NetworkInterfaceName == overrideDataBridgeNetworkInterfaceName || (i.AltNames ?? []).Contains(overrideDataBridgeNetworkInterfaceName));
                    
                    trunkNetworkInterfaces = dataOrTrunkNetworkInterfaces.Except([dataNetworkInterface]).ToArray();

                    nodeNetwork_vmbr01 = new PVENodeNetwork
                    {
                        NetworkInterfaceName = "vmbr01",
                        NetworkInterfaceType = "bridge",
                        Comments = "DATA",
                        BridgePorts = dataNetworkInterface.NetworkInterfaceName
                    };

                    nodeNetwork_vmbr02 = new PVENodeNetwork
                    {
                        NetworkInterfaceName = "vmbr02",
                        NetworkInterfaceType = "bridge",
                        BridgeVLANAware = 1,
                        Comments = "TRUNK",
                        BridgePorts = string.Join(' ', trunkNetworkInterfaces.Select(i => i.NetworkInterfaceName))
                    };
                    break;
                }
        }

        // Execute changes
        //bool nodeNetworkChanged = false;
        //if (nodeNetwork_vmbr01 != null)
        //{

        //}

        //if (nodeNetwork_vmbr02 != null)
        //{

        //}

        //// Ensure the Lan Bridge (Trunk) network exists
        //{
        //    var lanBridge = nodeNetworks.FirstOrDefault(n => n.NetworkInterfaceName == datacenterSettings.LanBridgeName);
        //    if (lanBridge == null)
        //    {
        //        var success = await priviligedPVEClient.CreateNodeNetworkAsync(node, new PVENodeNetwork()
        //        {
        //            NetworkInterfaceName = datacenterSettings.LanBridgeName,
        //            NetworkInterfaceType = "bridge",
        //            Autostart = 1,
        //            BridgePorts = string.Join(' ', trunkBridgePorts),
        //            Comments = trunkComment
        //        }, cancellationToken);
        //        nodeNetworkChanged = true;
        //    }
        //}

        //if (nodeNetworkChanged)
        //{
        //    await priviligedPVEClient.ApplyNodeNetworkChangesAsync(node, cancellationToken);
        //}
    }

    private async Task ConfigureLockPermissionsAsync(IPVEClientService priviligedPVEClient, CancellationToken cancellationToken = default)
    {
        // Create a role that prevents deletion and changes of VMs when the workspace is locked but allows other operations
        var lockRoleprivileges = new string[]
        {
            "Sys.Audit",
            "VM.Audit",
            "VM.GuestAgent.Unrestricted",
            "VM.PowerMgmt",
            "Datastore.Audit",
            "SDN.Use",
            "Permissions.Modify"
        };

        // Ensure the role is created and has expected permissions
        {
            var roles = await priviligedPVEClient.GetRolesAsync(cancellationToken);
            var role = roles.FirstOrDefault(r => r?["roleId"]?.GetValue<string>() == MDCConstants.PVE_LockRoleId);
            if (role == null)
            {
                var success = await priviligedPVEClient.CreateRoleAsync(MDCConstants.PVE_LockRoleId, lockRoleprivileges, cancellationToken);
                roles = await priviligedPVEClient.GetRolesAsync(cancellationToken);
                role = roles.FirstOrDefault(r => r?["roleId"]?.GetValue<string>() == MDCConstants.PVE_LockRoleId);
            }
            var rolePrivileges = role?["privs"]?.GetValue<string>().Split(',') ?? throw new InvalidOperationException("Unable to retrieve privileges for role.");
            if (!rolePrivileges.Order().SequenceEqual(lockRoleprivileges.Order()))
            {
                var success = await priviligedPVEClient.UpdateRoleAsync(MDCConstants.PVE_LockRoleId, lockRoleprivileges, cancellationToken);
            }
        }
    }

    private async Task ConfigureProxmoxBackupServerAsync(IPVEClientService priviligedPVEClient, CancellationToken cancellationToken = default)
    {
        // Configure Proxmox Backup Server connection used for distributing images
        if (options.Value.ProxmoxBackupServer != null && options.Value.ProxmoxBackupServer.UserName != null && options.Value.ProxmoxBackupServer.Password != null)
        {
            var existingStorage = await priviligedPVEClient.GetStorageAsync(cancellationToken);
            var pbs = existingStorage.FirstOrDefault(i => i?["storage"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Id);

            if (pbs != null)
            {
                // If the parameters are different then recreate the storage
                if (pbs?["server"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Server
                    && pbs?["namespace"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Namespace
                    && pbs?["content"]?.GetValue<string>() == "backup"
                    && pbs?["username"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.UserName
                    && pbs?["datastore"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Datastore
                    && pbs?["fingerprint"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Fingerprint
                    && pbs?["type"]?.GetValue<string>() == "pbs"
                    )
                {
                    // Validate that backups can be retrieved
                    var backupsTest = await priviligedPVEClient.GetStorageContentAsync("localhost", options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);
                    return; // No Change
                }  

                // Remove then re-create
                await priviligedPVEClient.DeleteStorageAsync(options.Value.ProxmoxBackupServer.Id, cancellationToken);
            }

            // Create
            pbs = await priviligedPVEClient.CreateStorageAsync(
                options.Value.ProxmoxBackupServer.Id,
                options.Value.ProxmoxBackupServer.Server,
                options.Value.ProxmoxBackupServer.Datastore,
                options.Value.ProxmoxBackupServer.Namespace,
                options.Value.ProxmoxBackupServer.UserName,
                options.Value.ProxmoxBackupServer.Password,
                options.Value.ProxmoxBackupServer.Fingerprint, cancellationToken: cancellationToken);

            // Validate that backups can be retrieved
            var backups = await priviligedPVEClient.GetStorageContentAsync("localhost", options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);
        }
    }

    private static string GeneratePassword(int length)
    {
        const string characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        Random rand = new Random();
        StringBuilder sb = new StringBuilder(length);
        for (int x=0;x<length;x++)
        {
            sb.Append(characters[rand.Next(characters.Length)]);
        }
        return sb.ToString();
    }

    private static bool IsInRange(IPAddress ipToTest, IPAddress rangeStart, IPAddress rangeEnd)
    {
        byte[] testBytes = ipToTest.GetAddressBytes();
        byte[] startBytes = rangeStart.GetAddressBytes();
        byte[] endBytes = rangeEnd.GetAddressBytes();

        // Ensure IP addresses are of the same family (IPv4 or IPv6)
        if (testBytes.Length != startBytes.Length || testBytes.Length != endBytes.Length)
        {
            throw new ArgumentException("IP addresses must be of the same family (IPv4 or IPv6).");
        }

        bool greaterThanOrEqualStart = true;
        bool lessThanOrEqualEnd = true;

        for (int i = 0; i < testBytes.Length; i++)
        {
            if (testBytes[i] < startBytes[i])
            {
                greaterThanOrEqualStart = false;
                break;
            }
            if (testBytes[i] > startBytes[i])
            {
                break; // testBytes[i] is greater, so no need to check further for start
            }
        }

        for (int i = 0; i < testBytes.Length; i++)
        {
            if (testBytes[i] > endBytes[i])
            {
                lessThanOrEqualEnd = false;
                break;
            }
            if (testBytes[i] < endBytes[i])
            {
                break; // testBytes[i] is smaller, so no need to check further for end
            }
        }

        return greaterThanOrEqualStart && lessThanOrEqualEnd;
    }

    private List<(IPAddress start, IPAddress end)> ComputeIPAssignmentPools(ZTNetwork network)
    {
        List<(IPAddress start, IPAddress end)> ipAssignmentPools = new();
        foreach (var pool in network.Config.IpAssignmentPools)
        {
            if (IPAddress.TryParse(pool.IPRangeStart, out var start) && IPAddress.TryParse(pool.IPRangeEnd, out var end))
            {
                ipAssignmentPools.Add((start, end));
            }
        }
        return ipAssignmentPools;
    }

    private MicroDataCenterEndpoint ComputeMicroDataCenterEndpoint(ZTMember member, PVEClientServiceOptions pveClientServiceOptions)
    {
        var ipAddresses = member.Config.IPAssignments?.Select(i => IPAddress.Parse(i)).ToArray();
        return new MicroDataCenterEndpoint
        {
            PVEClientConfiguration = pveClientServiceOptions,
            IPAddresses = ipAddresses ?? [],
            ZTMember = member
        };
    }
    #endregion
}
