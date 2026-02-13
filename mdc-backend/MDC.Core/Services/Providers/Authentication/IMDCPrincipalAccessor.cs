using System.Security.Claims;

namespace MDC.Core.Services.Providers.Authentication;

/// <summary>
/// 
/// </summary>
public interface IMDCPrincipalAccessor
{
    /// <summary/>
    public ClaimsPrincipal? User { get; }

    /// <summary/>
    public bool IsAuthenticated { get; }

    /// <summary/>
    public bool IsGlobalAdministrator { get; }

    /// <summary/>
    public bool IsDatacenterTechnician { get; }

    /// <summary/>
    public bool IsWorkspaceManager { get; }

    /// <summary/>
    public bool IsWorkspaceUser { get; }

    /// <summary/>
    public Guid? ObjectId { get; }
}
