using System.Text.Json.Nodes;

namespace MDC.Core.Services.Api;

/// <summary/>
public interface IWorkspaceService
{
    /// <summary/>
    Task<Workspace[]> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Workspace[]> GetAllForSiteAsync(Guid siteId, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<WorkspaceDescriptor?> GetWorkspaceDescriptorAsync(Guid workspaceId, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Workspace?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Workspace?> GetByAddressAsync(string siteName, int address, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Workspace> CreateAsync(Guid siteId, WorkspaceDescriptor workspace, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Workspace> UpdateAsync(Guid workspaceId, JsonNode delta, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Workspace> SetWorkspaceLockAsync(Guid workspaceId, bool locked, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<bool> GetWorkspaceLockAsync(Guid workspaceId, CancellationToken cancellationToken = default);

    /// <summary/>
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<VNCSession> InitializeVNCSessionAsync(Guid workspaceId, int? virtualMachineIndex, CancellationToken cancellationToken = default);
}
