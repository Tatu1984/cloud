namespace MDC.Core.Services.Providers.MDCDatabase;

internal class DbOrganizationUserRole
{
    public Guid Id { get; set; }

    public required string Role { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }

    public required Guid UserId { get; set; }

    public virtual DbUser? User { get; set; }

    public required Guid OrganizationId { get; set; }

    public virtual DbOrganization? Organization { get; set; }
}
