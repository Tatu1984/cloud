using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class VirtualMachineNetworkAdapter
{
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required Guid? VirtualNetworkId { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string? MACAddress { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required bool IsDisconnected { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required VirtualMachineNetworkInterface[]? NetworkInterfaces { get; set; } 
}
