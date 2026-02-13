using MDC.Core.Services.Providers.PVEClient;

namespace MDC.Core.Models;

internal class WorkspaceAssignmentEntry
{
    public required WorkspaceDescriptor WorkspaceDescriptor;
    public required VirtualMachineTemplateEntry BastionTemplate;
    public required PVEResource BastionNode;
    public required (int Index, VirtualNetworkDescriptor VirtualNetworkDescriptor, VirtualMachineTemplateEntry GatewayTemplate, PVEResource GatewayNode)[] VirtualNetworkAssignments;
    public required (int Index, VirtualMachineDescriptor VirtualMachineDescriptor, VirtualMachineTemplateEntry VirtualMachineTemplate, PVEResource VirtualMachineNode)[] VirtualMachineAssignments;
}
