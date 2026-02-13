namespace MDC.Core.Services.Providers.MDCDatabase;

internal class DbSiteNode
{
    public required string MemberAddress { get; set; }     // MemberAddress of the ZeroTier node running on pve host

    public required Guid SiteId { get; set; }

    public virtual DbSite? Site { get; set; }

    public required string Name { get; set; }   // Name of the pve node.  Will be the same as DbSite.Name for single-node pve clusters

    public required int ApiPort { get; set; }

    public required bool ApiValidateServerCertificate { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }
}
