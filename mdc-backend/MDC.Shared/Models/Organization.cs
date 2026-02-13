namespace MDC.Shared.Models;

/// <summary />
public class Organization
{
    /// <summary />
    public required Guid Id { get; set; }

    /// <summary />
    public required string Name { get; set; }

    /// <summary />
    public required bool Active { get; set; }

    /// <summary />
    public required OrganizationUserRole[] OrganizationUserRoles { get; set; }

    /// <summary />
    public required Guid[] SiteIds { get; set; }

    /// <summary />
    public required Guid[] WorkspaceIds { get; set; }
}
