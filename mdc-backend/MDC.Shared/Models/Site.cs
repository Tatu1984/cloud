using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary />
public class Site
{
    /// <summary />
    public required Guid Id { get; set;  }

    /// <summary />
    public required string Name { get; set; }

    /// <summary />
    public string? Description { get; set; }

    /// <summary />
    public required SiteNode[] Nodes { get; set; }

    /// <summary />
    public required Guid[] OrganizationIds { get; set; }

    /// <summary />
    public required Guid[] WorkspaceIds { get; set; }

    /// <summary />
    public VirtualMachineTemplate[]? GatewayTemplates { get; set; }

    /// <summary />
    public VirtualMachineTemplate[]? BastionTemplates { get; set; }

    /// <summary />
    public VirtualMachineTemplate[]? VirtualMachineTemplates { get; set; }

    /// <summary />
    public Workspace[]? Workspaces { get; set; }
}
