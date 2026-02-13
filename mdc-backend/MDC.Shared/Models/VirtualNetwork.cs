namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class VirtualNetwork
{
    /// <summary>
    /// 
    /// </summary>
    public Guid Id { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required int Index { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; } = string.Empty;
    /// <summary>
    /// 
    /// </summary>
    public int? Tag { get; set; } = null;
    /// <summary>
    /// 
    /// </summary>
    public Guid? RemoteNetworkId { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public string? ZeroTierNetworkId { get; set; }
}
