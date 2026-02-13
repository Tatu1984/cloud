namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class Workspace
{
    /// <summary/>
    public required Guid Id { get; set; }

    /// <summary/>
    public required Guid SiteId { get; set; }

    /// <summary/>
    public required Guid OrganizationId { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required int Address { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string? Description { get; set; }

    /// <summary/>
    public required bool Locked { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required DateTime CreatedAt { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required DateTime UpdatedAt { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required VirtualMachine? Bastion{ get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required VirtualMachine[]? VirtualMachines { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required VirtualNetwork[]? VirtualNetworks { get; set; }
    
    ///// <summary>
    ///// 
    ///// </summary>
    //public required Device[]? Devices { get; set; }
}
