namespace MDC.Core.Services.Providers.MDCDatabase;

internal class DbWorkspace
{
    public Guid Id { get; set; }

    public required Guid SiteId { get; set; }

    public DbSite Site { get; set; } = null!;

    public required Guid OrganizationId { get; set; }

    public DbOrganization Organization { get; set; } = null!;

    public required int Address { get; set; }

    public required string Name { get; set; }

    public required string? Description { get; set; }

    public required DateTime CreatedAt { get; set; } 

    public required DateTime UpdatedAt { get; set; }

    public required string? Status { get; set; }

    public required bool Locked { get; set; }

    public virtual ICollection<DbVirtualNetwork> VirtualNetworks { get; set; } = new List<DbVirtualNetwork>();
}
