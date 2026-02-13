namespace MDC.Shared.Models;

/// <summary />
public class User
{
    /// <summary>
    /// The Principal ID of the user
    /// </summary>
    public required Guid Id { get; set; }

    /// <summary />
    public required string DisplayName { get; set; }

    /// <summary />
    public required bool IsRegistered { get; set; }

    /// <summary />
    public required UserOrganizationRole[] OrganizationRoles { get; set; }

    /// <summary>
    /// The application roles assigned to the user
    /// </summary>
    public required string[] AppRoles { get; set; }
}
