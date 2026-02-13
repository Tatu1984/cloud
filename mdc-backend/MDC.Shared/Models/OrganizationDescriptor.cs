namespace MDC.Shared.Models;

/// <summary />
public class OrganizationDescriptor
{
    /// <summary />
    public required string Name { get; set; }

    /// <summary />
    public string? Description { get; set; }

    /// <summary />
    public required OrganizationUserRoleDescriptor[] OrganizationUserRoles { get; set; }

    /// <summary />
    public required Guid[] SiteIds { get; set; }
}
