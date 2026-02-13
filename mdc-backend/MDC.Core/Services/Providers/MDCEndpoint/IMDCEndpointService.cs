using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Providers.MDCEndpoint;

internal interface IMDCEndpointService
{
    Task<MicroDataCenterEndpoint[]> GetMicroDataCenterEndpointsAsync(DbSiteNode[] dbSiteNodes, CancellationToken cancellationToken = default);

    Task<MicroDataCenterEndpoint[]> GetMicroDataCenterEndpointsAsync(DbSite dbSite, CancellationToken cancellationToken = default);

    Task<MicroDataCenterEndpoint> GetMicroDataCenterEndpointAsync(DbSiteNode dbSiteNode, CancellationToken cancellationToken = default);

    Task<MicroDataCenterEndpoint> RegisterMicroDataCenterAsync(string memberAddress, string siteNodeName, string registrationUserName, string registrationPassword, int port = 8006, bool validateServerCertificate = true, int timeout = 30, CancellationToken cancellationToken = default);

    Task<IPVEClientService> CreatePVEClientAsync(string memberAddress, string tokenId, string secret, int port, bool validateServerCertificate, int timeout, CancellationToken cancellationToken = default);

    Task<IPVEClientService[]> CreatePVEClientsAsync(DbSite dbSite, int timeout, CancellationToken cancellationToken = default);

    Task<IPVEClientService> CreatePrivilegedPVEClient(string memberAddress, string username, string password, int port, bool validateServerCertificate, int? timeout, CancellationToken cancellationToken = default);

    Task ConfigureSiteAsync(DbSiteNode dbSiteNode, IPVEClientService priviligedPVEClient, SiteDescriptor siteDescriptor, CancellationToken cancellationToken);

    Task<DownloadableTemplate[]> GetDownloadableTemplatesAsync(DbSite dbSite, CancellationToken cancellationToken = default);

    Task<string> DownloadTemplateAsync(DbSite dbSite, DownloadTemplateDescriptor downloadTemplateDescriptor, CancellationToken cancellationToken = default);
}
