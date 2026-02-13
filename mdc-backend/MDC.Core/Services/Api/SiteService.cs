using MDC.Core.Services.Providers.DatacenterFactory;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Shared.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Api;

internal class SiteService(IDatacenterFactoryService datacenterFactoryService, IMDCEndpointService mdcEndpointService, IMDCDatabaseService databaseService, ILogger<SiteService> logger) : ISiteService
{
    public async Task<Site> CreateAsync(SiteDescriptor siteDescriptor, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Register Site Node with Member Address '{memberAddress}'.", siteDescriptor.MemberAddress);

        // Ensure that if no organization is specified that the default organization is a member of the site
        var port = siteDescriptor.Port ?? 8006;
        int timeout = siteDescriptor.Timeout ?? 30;

        // Before making changes, Get the cluster information using privileged access
        var priviligedPVEClient = await mdcEndpointService.CreatePrivilegedPVEClient(siteDescriptor.MemberAddress, siteDescriptor.RegistrationUserName, siteDescriptor.RegistrationPassword, port, siteDescriptor.ValidateServerCertificate, timeout, cancellationToken);
        var clusterStatus = await priviligedPVEClient.GetClusterStatusAsync(cancellationToken);
        logger.LogInformation("Privileged PVE Client for Site Node with Member Address '{memberAddress}' fetched Cluster Status '{@clusterStatus}'.", siteDescriptor.MemberAddress, clusterStatus);
        var siteName = clusterStatus.GetClusterNode().Name;
        var siteNodeName = clusterStatus.GetLocalNode().Name;

        // Check if the Site is already registered
        var dbSite = await databaseService.GetSiteByNameAsync(siteName, cancellationToken);
        if (dbSite == null)
        {
            logger.LogInformation("Creating new Site named '{siteName}' from Site Node with Member Address '{memberAddress}'.", siteName, siteDescriptor.MemberAddress);

            // Always create new Site registration (API token) when creating a new Site
            var newEndpoint = await mdcEndpointService.RegisterMicroDataCenterAsync(siteDescriptor.MemberAddress, siteNodeName, siteDescriptor.RegistrationUserName, siteDescriptor.RegistrationPassword, port, siteDescriptor.ValidateServerCertificate, timeout, cancellationToken);

            // Site does not exist in database so create it
            dbSite = await databaseService.CreateSiteAsync(siteName, siteDescriptor.Description ?? string.Empty, newEndpoint.PVEClientConfiguration.TokenId, newEndpoint.PVEClientConfiguration.Secret, cancellationToken);
        }

        // Check to see if the Site node is already registered 
        var dbSiteNode = await databaseService.GetSiteNodeAsync(siteDescriptor.MemberAddress, cancellationToken);
        if (dbSiteNode == null)
        {
            logger.LogInformation("Adding Site Node with Member Address '{memberAddress}' named '{siteNodeName}' to Site named '{siteName}' Site Id '{siteId}'.", siteDescriptor.MemberAddress, siteNodeName, siteName, dbSite.Id);

            // Create the Site Node in the database
            dbSiteNode = await databaseService.CreateSiteNodeAsync(dbSite.Id, siteDescriptor.MemberAddress, siteNodeName, port, siteDescriptor.ValidateServerCertificate, cancellationToken);
        }

        // Ensure that the Site Node belongs to the site - in case the MemberAddress finds an existing SiteNode that does not belong to the site looked up by name
        if (dbSiteNode.SiteId != dbSite.Id)
        {
            throw new InvalidOperationException($"Member Address {siteDescriptor} is Site Node {siteNodeName} for Site {siteName} but is already registered for a different Site.");
        }
        
        // Ensure organizations are set for the site
        var dbOrganizationDefault = await databaseService.GetDefaultOrganizationAsync(dbSite, cancellationToken);
        var organizationIds = siteDescriptor.OrganizationIds ?? [dbOrganizationDefault.Id];
        dbSite = await databaseService.UpdateSiteAsync(dbSite.Id, null, null, null, organizationIds, cancellationToken);

        // Verify that the Site credentials still work and create new Registration if it does not
        var mdcEndpoint = await mdcEndpointService.GetMicroDataCenterEndpointAsync(dbSiteNode, cancellationToken);
        var pveClient = mdcEndpoint.CreatePVEClient();
        try
        {
            var verifyClusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
            logger.LogInformation("Verified API Token Access to Site '{siteName}' using Site Node '{siteNodeName}'  Cluster Status '{@clusterStatus}'.", siteName, siteNodeName, verifyClusterStatus);
        }
        catch (Exception)   // TODO: catch a Not Authorized exception then re-register the MicroDatacenter
        {
            mdcEndpoint = await mdcEndpointService.RegisterMicroDataCenterAsync(siteDescriptor.MemberAddress, siteNodeName, siteDescriptor.RegistrationUserName, siteDescriptor.RegistrationPassword, port, siteDescriptor.ValidateServerCertificate, timeout, cancellationToken);
            dbSite = await databaseService.UpdateSiteAsync(dbSite.Id, null, mdcEndpoint.PVEClientConfiguration.TokenId, mdcEndpoint.PVEClientConfiguration.Secret, null, cancellationToken);
        }

        // Ensure the Site is Configured to be a MicroDatacenter
        await mdcEndpointService.ConfigureSiteAsync(dbSiteNode, priviligedPVEClient, siteDescriptor, cancellationToken);

        // Always Import workspaces from the Site.  Use the specified organization otherwise import to Default organization
        if (siteDescriptor.ImportToOrganizationId.HasValue)
        {
            await datacenterFactoryService.ImportSiteAsync(dbSiteNode, siteDescriptor.ImportToOrganizationId.Value, cancellationToken);
        }
        else
        {
            await datacenterFactoryService.ImportSiteAsync(dbSiteNode, dbOrganizationDefault.Id, cancellationToken);
        }

        return (await datacenterFactoryService.ComputeSitesAsync([dbSite], true, cancellationToken)).FirstOrDefault() ?? throw new InvalidOperationException($"Site '{siteName}' not found.");
    }

    public Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public async Task<Site[]> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var dbSites = await databaseService.GetAllSitesAsync(cancellationToken);

        return await datacenterFactoryService.ComputeSitesAsync(dbSites, false, cancellationToken);
    }

    public async Task<Site?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        var dbSite = await databaseService.GetSiteByNameAsync(name, cancellationToken) ?? throw new InvalidOperationException($"Site '{name}' not found.");
        
        return (await datacenterFactoryService.ComputeSitesAsync([dbSite], true, cancellationToken)).FirstOrDefault();
    }

    public async Task<Site?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dbSite = await databaseService.FindSiteAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Site Id '{id}' not found.");

        return (await datacenterFactoryService.ComputeSitesAsync([dbSite], true, cancellationToken)).FirstOrDefault();
    }

    public Task<Site> UpdateAsync(Guid id, JsonNode delta, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public async Task<DownloadableTemplate[]> GetDownloadableTemplatesAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        var dbSite = await databaseService.FindSiteAsync(siteId, cancellationToken) ?? throw new InvalidOperationException($"Site Id '{siteId}' not found.");

        return await mdcEndpointService.GetDownloadableTemplatesAsync(dbSite, cancellationToken);
    }

    public async Task<string> DownloadTemplateAsync(Guid siteId, DownloadTemplateDescriptor downloadTemplateDescriptor, CancellationToken cancellationToken = default)
    {
        var dbSite = await databaseService.FindSiteAsync(siteId, cancellationToken) ?? throw new InvalidOperationException($"Site Id '{siteId}' not found.");

        return await mdcEndpointService.DownloadTemplateAsync(dbSite, downloadTemplateDescriptor, cancellationToken);
    }
}
