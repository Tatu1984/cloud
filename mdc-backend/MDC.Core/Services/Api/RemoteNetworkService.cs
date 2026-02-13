using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.ZeroTier;
using System.Net;

namespace MDC.Core.Services.Api;

internal class RemoteNetworkService(IMDCDatabaseService databaseService, IZeroTierService zeroTierService) : IRemoteNetworkService
{
    public async Task<RemoteNetwork[]> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var dbWorkspaces = await databaseService.GetAllWorkspacesAsync(cancellationToken);
        
        var ztNetworks = await zeroTierService.GetNetworksAsync(cancellationToken);
        var dictNetworks = ztNetworks.ToDictionary(i => i.Id);

        List<RemoteNetwork> result = new List<RemoteNetwork>();
        foreach (var workspace in dbWorkspaces)
        {
            foreach (var virtualNetwork in workspace.VirtualNetworks)
            {
                if (virtualNetwork.ZeroTierNetworkId == null)
                    continue;

                dictNetworks.TryGetValue(virtualNetwork.ZeroTierNetworkId, out var ztNetwork);  // Note: database could specify a zerotier network that does not exist

                var remoteNetwork = await ToRemoteNetworkAsync(virtualNetwork, ztNetwork, cancellationToken);
                if (remoteNetwork != null)
                {
                    result.Add(remoteNetwork);
                }
            }
        }

        return result.ToArray();
    }

    public async Task<RemoteNetwork?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        // Convert id to 16 digit hex string containing the last 8 bytes of the Guid
        var networkId = id.ToString("N").Substring(16);

        var dbVirtualNetwork = await databaseService.GetVirtualNetworkByRemoteNetworkIdAsync(networkId, cancellationToken);
        if (dbVirtualNetwork == null)
            return null;

        var ztNetwork = await zeroTierService.GetNetworkByIdAsync(networkId, cancellationToken);

        return await ToRemoteNetworkAsync(dbVirtualNetwork, ztNetwork, cancellationToken);

    }

    public async Task<RemoteNetwork?> UpdateAsync(Guid id, RemoteNetworkUpdate remoteNetworkUpdate, CancellationToken cancellationToken = default)
    {
        // Convert id to 16 digit hex string containing the last 8 bytes of the Guid
        var networkId = id.ToString("N").Substring(16);

        var dbVirtualNetwork = await databaseService.GetVirtualNetworkByRemoteNetworkIdAsync(networkId, cancellationToken);
        if (dbVirtualNetwork == null)
            return null;

        var ztNetwork = await zeroTierService.GetNetworkByIdAsync(networkId, cancellationToken);

        if (remoteNetworkUpdate.Members != null)
        {
            var ztMembers = await zeroTierService.GetNetworkMembersAsync(ztNetwork.Id, cancellationToken);

            var members = (from updateMember in remoteNetworkUpdate.Members
                           join ztMember in ztMembers on updateMember.Id equals ztMember.NodeId into updateGroup
                           from item in updateGroup.DefaultIfEmpty()
                           select new
                           {
                               Update = updateMember,
                               ZTMember = item
                           })
                          .ToArray();

            var notFound = members.Where(i => i.ZTMember == null).ToArray();
            if (notFound.Length > 0)
                throw new InvalidOperationException($"Cannot update members with Id {string.Join(',', notFound.Select(i => i.Update.Id).Distinct())}");

            foreach (var member in members)
            {
                if (member.Update.IPAddresses != null)
                {
                    var ipAddresses = member.Update.IPAddresses.Select(i => IPAddress.Parse(i)).ToArray();
                    var updated = await zeroTierService.SetNetworkMemberIpAssignmentsAsync(networkId, member.Update.Id, ipAddresses, cancellationToken);
                }

                if (member.Update.Name != null)
                {
                    var updated = await zeroTierService.SetNetworkMemberNameAsync(networkId, member.Update.Id, member.Update.Name, cancellationToken);
                }

                if (member.Update.Description != null)
                {
                    var updated = await zeroTierService.SetNetworkMemberDescriptionAsync(networkId, member.Update.Id, member.Update.Description, cancellationToken);
                }

                if (member.Update.Authorized.HasValue)
                {
                    var updated = await zeroTierService.SetNetworkMemberAuthorizationAsync(networkId, member.Update.Id, member.Update.Authorized.Value, cancellationToken);
                }
            }
        }

        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task<RemoteNetwork?> ToRemoteNetworkAsync(DbVirtualNetwork virtualNetwork, ZTNetwork? ztNetwork, CancellationToken cancellationToken = default)
    {
        if (virtualNetwork.ZeroTierNetworkId == null)
            return null;

        ZTMember[]? ztMembers = null;
        if (ztNetwork != null)
        {
            ztMembers = await zeroTierService.GetNetworkMembersAsync(ztNetwork.Id, cancellationToken);
        }

        // Convert virtualNetwork.ZeroTierNetworkId to 16 digit hex string containing the last 8 bytes of the Guid
        var id = Guid.ParseExact(new string('0', 16) + virtualNetwork.ZeroTierNetworkId, "N");

        return new RemoteNetwork
        {
            Id = id,
            NetworkId = virtualNetwork.ZeroTierNetworkId,
            Name = ztNetwork?.Config.Name,
            SiteId = virtualNetwork.Workspace?.SiteId ?? throw new InvalidOperationException($"Unable to retrieve SiteId for Virtual Network Id '{virtualNetwork.Id}'"),
            WorkspaceId = virtualNetwork.WorkspaceId,
            VirtualNetworkId = virtualNetwork.Id,
            IPAssignmentPools = (ztNetwork?.Config.IpAssignmentPools ?? []).Select(i => new RemoteNetworkIPAssignmentPool { IPRangeEnd = i.IPRangeEnd, IPRangeStart = i.IPRangeStart }).ToArray(),
            ManagedRoutes = (ztNetwork?.Config.Routes ?? []).Select(i => new RemoteNetworkRoute { Target = i.Target, Via = i.Via }).ToArray(),
            Members = (ztMembers ?? []).Select(i => new RemoteNetworkMember
            {
                Id = i.NodeId,
                Description = i.Description,
                Name = i.Name,
                Online = i.Online == 1,
                Authorized = i.Config.Authorized,
                IPAddresses = i.Config.IPAssignments,
                ClientVersion = i.ClientVersion,
                Latency = i.Latency,
                PhyiscalIPAddress = i.PhysicalAddress,
                Created = DateTimeOffset.FromUnixTimeMilliseconds(i.Config.CreationTime),
                LastOnline = i.LastOnline == null ? null : DateTimeOffset.FromUnixTimeMilliseconds(i.LastOnline.Value)
            }).ToArray()
        };
    }
}
