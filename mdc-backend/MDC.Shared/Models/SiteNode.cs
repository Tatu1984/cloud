using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary />
public class SiteNode
{
    /// <summary />
    public required string Name { get; set; }

    /// <summary />
    public required SiteNodeCPUInfo? CPUInfo { get; set; }

    /// <summary />
    public bool? Authorized { get; set; }   // When setting from the client side, this indicates whether the node should be authorized or not.

    ///// <summary />
    // public string[]? IPAssignments { get; set; } = null;  // When setting from the client side, this indicates the desired IP assignments for the node.  Required when Creating a new node, but optional when updating

    /// <summary />
    public required bool Online { get; set; }   // Can only be set when reading the status of the system, not when setting the object from the client side.

    /// <summary />
    // True when the node is configured in the management system
    public required bool? Configured { get; set; }   // Can only be set when reading the status of the system, not when setting the object from the client side.
}
