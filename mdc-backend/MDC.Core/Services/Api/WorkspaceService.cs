using MDC.Core.Models;
using MDC.Core.Services.Providers.DatacenterFactory;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.ZeroTier;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Api;

internal class WorkspaceService(IDatacenterFactoryService datacenterFactoryService, IMDCDatabaseService databaseService, IZeroTierService zeroTier) : IWorkspaceService
{
    public async Task<Workspace> CreateAsync(Guid siteId, WorkspaceDescriptor workspaceDescriptor, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryAsync(siteId, cancellationToken);
        // var defaultDbOrganization = await databaseService.GetDefaultOrganizationAsync(datacenterEntry.DbSite, cancellationToken);

        List<Func<Task>> actions = new();

        // 1. Validate the Workspace creation parameters
        actions.Add(async () => await Task.Run(workspaceDescriptor.Validate));

        // 2. Compute request against available capacity
        WorkspaceOperation[] workspaceOperations = [];
        actions.Add(async () => await Task.Run(() => workspaceOperations = datacenterEntry.ComputeWorkspaceOperations(workspaceDescriptor, null)));
        
        // 3. [Database] Create Database rows for Workspace and Virtual Network VLANs to reserve the Workspace resources
        DbWorkspace? dbWorkspace = null;
        actions.Add(async () => dbWorkspace = await databaseService.CreateWorkspaceAsync(datacenterEntry.DbSite.Id, workspaceDescriptor.OrganizationId, workspaceDescriptor.Name, workspaceDescriptor.Description, workspaceDescriptor.VirtualNetworks!.Select(i => i.Name!).ToArray(), datacenterEntry.DatacenterSettings,cancellationToken));

        // 4. [PVE] Create Virtual Machines
        actions.Add(async () => await ApplyWorkspaceOperationsAsync(workspaceOperations, dbWorkspace!, datacenterEntry, cancellationToken));

    
        // Execute all of the actions
        foreach (var action in actions)
        {
            await action();
        }

        return await GetByIdAsync(dbWorkspace!.Id, cancellationToken) ?? throw new InvalidOperationException($"Unable to retrieve Workspace Address '{dbWorkspace.Address}' after creation.");
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(id, false, cancellationToken);
        var workspace = datacenterEntry.Workspaces.Single();

        if (workspace.Locked)
            throw new InvalidOperationException($"Workspace Id '{id}' is locked and cannot be modified.");

        // Stop the VMs
        foreach (var re in workspace.ResourceEntries.Where(i => i.PVEResource != null))
        {
            var upid = await datacenterEntry.PVEClient.QemuStatusStopAsync(re.PVEResource!.Node!, re.PVEResource!.VmId!.Value, true, cancellationToken);
            await datacenterEntry.PVEClient.WaitForTaskAsync(re.PVEResource!.Node!, upid, cancellationToken);
        }

        // Remove the VMs
        foreach (var re in workspace.ResourceEntries.Where(i => i.PVEResource != null))
        {
            var upid = await datacenterEntry.PVEClient.DeleteQemuAsync(re.PVEResource!.Node!, re.PVEResource!.VmId!.Value, true, true, cancellationToken);
            await datacenterEntry.PVEClient.WaitForTaskAsync(re.PVEResource!.Node!, upid, cancellationToken);
        }

        // Remove the ZeroTier Network from the Controller
        foreach (var virtualNetwork in workspace.VirtualNetworks)
        {
            if (virtualNetwork.DbVirtualNetwork?.ZeroTierNetworkId == null)
            {
                continue;
            }
            await zeroTier.DeleteNetworkAsync(virtualNetwork.DbVirtualNetwork.ZeroTierNetworkId, cancellationToken);
        }

        // Delete the Database row
        var rows = await databaseService.DeleteWorkspaceAsync(workspace.DbWorkspace!, cancellationToken);
    }

    public async Task<Workspace[]> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var dbWorkspaces = await databaseService.GetAllWorkspacesAsync(cancellationToken);
        return dbWorkspaces.Select(entry => new Workspace
        {
            Id = entry.Id,
            SiteId = entry.SiteId,
            OrganizationId = entry.OrganizationId,
            Address = entry.Address,
            Name = entry.Name,
            Locked = entry.Locked,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt,
            Description = entry.Description,
            Bastion = null,
            VirtualNetworks = entry.VirtualNetworks.Select(vnet => new VirtualNetwork
            {
                Id = vnet.Id,
                Index = vnet.Index,
                Name = vnet.Name,
                RemoteNetworkId = vnet.ZeroTierNetworkId == null? null : Guid.ParseExact(new string('0', 16) + vnet.ZeroTierNetworkId, "N"), // Convert virtualNetwork.ZeroTierNetworkId to 16 digit hex string containing the last 8 bytes of the Guid
                ZeroTierNetworkId = vnet.ZeroTierNetworkId,
                Tag = vnet.Tag
            }).ToArray(),
            VirtualMachines = null
            //Devices = []
        })
        .ToArray();
    }

    public async Task<Workspace[]> GetAllForSiteAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        var dbWorkspaces = await databaseService.GetAllWorkspacesForSiteAsync(siteId, cancellationToken);
        return dbWorkspaces.Select(entry => new Workspace
        {
            Id = entry.Id,
            SiteId = entry.SiteId,
            OrganizationId = entry.OrganizationId,
            Address = entry.Address,
            Name = entry.Name,
            Locked = entry.Locked,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt,
            Description = entry.Description,
            Bastion = null,
            VirtualNetworks = entry.VirtualNetworks.Select(vnet => new VirtualNetwork
            {
                Id = vnet.Id,
                Index = vnet.Index,
                Name = vnet.Name,
                RemoteNetworkId = vnet.ZeroTierNetworkId == null ? null : Guid.ParseExact(new string('0', 16) + vnet.ZeroTierNetworkId, "N"), // Convert virtualNetwork.ZeroTierNetworkId to 16 digit hex string containing the last 8 bytes of the Guid
                ZeroTierNetworkId = vnet.ZeroTierNetworkId,
                Tag = vnet.Tag
            }).ToArray(),
            VirtualMachines = null
            //Devices = []
        })
        .ToArray();
    }

    public async Task<WorkspaceDescriptor?> GetWorkspaceDescriptorAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(workspaceId, false, cancellationToken);

        var workspaceEntry = datacenterEntry.Workspaces.Single(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry.WorkspaceDescriptor == null)
            throw new InvalidOperationException($"Workspace Descriptor is not available for Workspace Id '{workspaceId}'");

        return workspaceEntry.WorkspaceDescriptor;
    }


    public async Task<Workspace?> GetByIdAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(workspaceId, false, cancellationToken);

        var workspaceEntry = datacenterEntry.Workspaces.FirstOrDefault(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry == null)
        {
            return null;
        }

        // Populate the latest status information
        foreach (var re in workspaceEntry.ResourceEntries.Where(i => i.PVEResource != null && i.PVEResource.VmId != null))
        {
            re.PVEQemuStatus = await datacenterEntry.PVEClient.GetQemuStatusCurrentAsync(re.PVEResource!.Node!, re.PVEResource!.VmId!.Value, cancellationToken);
            re.PVEQemuConfig = await datacenterEntry.PVEClient.GetQemuConfigAsync(re.PVEResource!.Node!, re.PVEResource!.VmId!.Value, cancellationToken);
        }

        if (workspaceEntry.Bastion != null)
        {
            if (workspaceEntry.VirtualNetworks.Any(i => i.DbVirtualNetwork?.ZeroTierNetworkId != null)) // If any of the Virtual Networks has a Remote Network (ZeroTier) then get the ZeroTier Config
            {
                workspaceEntry.Bastion.ZTNodeConfig = await zeroTier.GetNodeStatusAsync(datacenterEntry, workspaceEntry.Bastion.PVEResource!.Node!, workspaceEntry.Bastion.PVEResource!.VmId!.Value, cancellationToken);
                workspaceEntry.Bastion.ZTNetworkMembership = await zeroTier.GetNetworkMembershipAsync(datacenterEntry, workspaceEntry.Bastion.PVEResource!.Node!, workspaceEntry.Bastion.PVEResource!.VmId!.Value, workspaceEntry.VirtualNetworks.Single().DbVirtualNetwork!.ZeroTierNetworkId!, cancellationToken);
            }
            // workspaceEntry.Bastion.PVEQemuAgentNetworkInterfaces = await datacenterEntry.PVEClient.QemuAgentGetNetworkInterfacesAsync(workspaceEntry.Bastion.PVEResource!.Node!, workspaceEntry.Bastion.PVEResource!.VmId!.Value, cancellationToken);
        }

        // Get the Network Interfaces from the Agent for all VMs that have an agent
        await Task.WhenAll(
            workspaceEntry.VirtualMachines.Concat(workspaceEntry.Bastion == null ? [] : [workspaceEntry.Bastion]).Where(entry => entry.PVEQemuStatus?.Agent == 1 && entry.PVEQemuStatus?.Qmpstatus != "stopped" && entry.PVEQemuAgentNetworkInterfaces == null)
            .Select(async entry => {
                return entry.PVEQemuAgentNetworkInterfaces = await datacenterEntry.PVEClient.QemuAgentGetNetworkInterfacesAsync(entry.PVEResource!.Node!, entry.PVEResource!.VmId!.Value, cancellationToken);
            }));

        var result = DatacenterFactoryService.ToWorkspaces([workspaceEntry]).Single();

        if (result.Bastion == null)
        {
            throw new InvalidOperationException($"Workspace Address '{result.Address}' is missing the Bastion resource.");
        }
        return result;
    }

    public Task<Workspace?> GetByAddressAsync(string site, int address, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
        // return Task.FromResult(_workspaces.FirstOrDefault(w => w.Address == address));
    }

    public async Task<Workspace> UpdateAsync(Guid workspaceId,JsonNode delta, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(workspaceId, true, cancellationToken);
        
        var workspaceEntry = datacenterEntry.Workspaces.Single(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry.WorkspaceDescriptor == null)
            throw new InvalidOperationException($"Workspace Descriptor is not available for Workspace Id '{workspaceId}'");

        if (workspaceEntry.Locked)
            throw new InvalidOperationException($"Workspace Id '{workspaceId}' is locked and cannot be modified.");

        //var defaultDbOrganization = await databaseService.GetDefaultOrganizationAsync(datacenterEntry.DbSite, cancellationToken);

        var workspaceDescriptor = MDCHelper.Patch(workspaceEntry.WorkspaceDescriptor, delta);

        List<Func<Task>> actions = new();

        // 1. Validate the Workspace creation parameters
        actions.Add(async () => await Task.Run(workspaceDescriptor.Validate));

        // 2. Compute request against available capacity
        WorkspaceOperation[] workspaceOperations = [];
        actions.Add(async () => await Task.Run(() => workspaceOperations = datacenterEntry.ComputeWorkspaceOperations(workspaceDescriptor, workspaceEntry)));

        // 3. [Database] Update Database rows for Workspace and Virtual Network VLANs to reserve the Workspace resources
        DbWorkspace? dbWorkspace = null;
        actions.Add(async () => dbWorkspace = await databaseService.UpdateWorkspaceAsync(datacenterEntry, workspaceId, workspaceDescriptor, cancellationToken));

        // 4. [PVE] Create Virtual Machines
        actions.Add(async () => await ApplyWorkspaceOperationsAsync(workspaceOperations, dbWorkspace!, datacenterEntry, cancellationToken));

        // Execute all of the actions
        foreach (var action in actions)
        {
            await action();
        }

        return await GetByIdAsync(workspaceId, cancellationToken) ?? throw new InvalidOperationException($"Unable to retrieve Workspace Address '{workspaceEntry.Address}' after update.");
    }

    public async Task<Workspace> SetWorkspaceLockAsync(Guid workspaceId, bool locked, CancellationToken cancellationToken = default)
    {
        await datacenterFactoryService.SetWorkspaceLockAsync(workspaceId, locked, cancellationToken);
        return await GetByIdAsync(workspaceId, cancellationToken) ?? throw new InvalidOperationException($"Unable to retrieve Workspace Id '{workspaceId}' after setting lock.");
    }

    public async Task<bool> GetWorkspaceLockAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(workspaceId, false, cancellationToken);
        var workspaceEntry = datacenterEntry.Workspaces.FirstOrDefault(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry == null)
        {
            throw new InvalidOperationException("Workspace Not Found");
        }

        return workspaceEntry.Locked;
    }

    public async Task<VNCSession> InitializeVNCSessionAsync(Guid workspaceId, int? virtualMachineIndex, CancellationToken cancellationToken = default)
    {
        return await datacenterFactoryService.CreateVNCProxyAsync(workspaceId, virtualMachineIndex, cancellationToken);
    }

    #region Private Methods

    private async Task ApplyWorkspaceOperationsAsync(WorkspaceOperation[] workspaceOperations, DbWorkspace dbWorkspace, DatacenterEntry datacenterEntry, CancellationToken cancellationToken = default)
    {
        List<WorkspaceOperationTask> workspaceOperationTasks = new List<WorkspaceOperationTask>();

        foreach (var operation in workspaceOperations)
        {
            workspaceOperationTasks.AddRange(operation.GenerateTasks(zeroTier, databaseService, datacenterEntry, dbWorkspace, cancellationToken));
        }

        // Stop all of the VMs that are going to be modified or deleted
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.RemoveVirtualMachine).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));

        // Clone VM Must be done synchronously to avoid VMID conflicts
        foreach (var task in workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.CloneVirtualMachine).OrderBy(i => i.Order))
        {
            await task.ExecuteAsync();
        }

        // Update the VM Configurations
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.UpdateVirtualMachineConfiguration).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));

        // Create any ZeroTier Networks
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.CreateZeroTierNetwork).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));

        // Start the VMs
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.StartVirtualMachine).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));

        // Join ZeroTier Networks
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.JoinZeroTierNetwork).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));
    }

    #endregion
}
