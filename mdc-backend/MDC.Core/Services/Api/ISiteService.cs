using System.Text.Json.Nodes;

namespace MDC.Core.Services.Api;

/// <summary />
public interface ISiteService
{
    /// <summary/>
    Task<Site[]> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Site?> GetByNameAsync(string name, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Site?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Site> CreateAsync(SiteDescriptor siteDescriptor, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Site> UpdateAsync(Guid id, JsonNode delta, CancellationToken cancellationToken = default);

    /// <summary/>
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<DownloadableTemplate[]> GetDownloadableTemplatesAsync(Guid siteId, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<string> DownloadTemplateAsync(Guid siteId, DownloadTemplateDescriptor downloadTemplateDescriptor, CancellationToken cancellationToken = default);
}
