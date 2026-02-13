namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class VirtualMachine
{
    /// <summary>
    /// 
    /// </summary>
    public int Index { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public string? Status { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required VirtualMachineNetworkAdapter[]? NetworkAdapters { get; set; }
}
