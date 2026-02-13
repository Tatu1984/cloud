using MDC.Core.Models;
using System.Threading;

namespace MDC.Core.Services.Providers.MDCDatabase
{
    internal interface IMDCDatabaseService
    {
        Task<DbSite> CreateSiteAsync(string name, string description, string apiTokenId, string apiSecret, CancellationToken cancellationToken = default);

        Task<DbSiteNode> CreateSiteNodeAsync(Guid siteId, string memberAddress, string name, int apiPort, bool apiValidateServerCertificate, CancellationToken cancellationToken = default);

        Task<DbSite> UpdateSiteAsync(Guid id, string? description, string? apiTokenId, string? apiSecret, Guid[]? organizationIds, CancellationToken cancellationToken = default);

        Task<DbSite?> GetSiteByNameAsync(string name, CancellationToken cancellationToken = default);

        Task<DbSite?> FindSiteAsync(Guid siteId, CancellationToken cancellationToken = default);

        Task<DbSite[]> GetAllSitesAsync(CancellationToken cancellationToken = default);

        Task<DbSiteNode[]> GetAllSitesNodesAsync(CancellationToken cancellationToken = default);

        Task<DbSiteNode?> GetSiteNodeAsync(string memberAddress, CancellationToken cancellationToken = default);

        Task<DbWorkspace[]> ImportWorkspacesAsync(Guid siteId, Guid organizationId, IEnumerable<WorkspaceEntry> workspaceEntries, CancellationToken cancellationToken = default);

        Task<DbVirtualNetwork[]> ImportVirtualNetworksAsync(IEnumerable<WorkspaceEntry> workspaceEntries, CancellationToken cancellationToken = default);

        Task<DbWorkspace?> GetWorkspaceByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<IEnumerable<DbWorkspace>> GetAllWorkspacesAsync(CancellationToken cancellationToken = default);

        Task<IEnumerable<DbWorkspace>> GetAllWorkspacesForSiteAsync(Guid siteId, CancellationToken cancellationToken = default);

        Task<DbWorkspace> CreateWorkspaceAsync(Guid siteId, Guid organizationId, string workspaceName, string? description, string[] virtualNetworkNames, DatacenterSettings datacenterSettings, CancellationToken cancellationToken = default);

        Task<DbWorkspace> UpdateWorkspaceAsync(DatacenterEntry datacenterEntry, Guid workspaceId, WorkspaceDescriptor workspaceDescriptor, CancellationToken cancellationToken = default);

        Task<int> DeleteWorkspaceAsync(DbWorkspace dbWorkpace, CancellationToken cancellationToken = default);

        Task SetWorkspaceLockAsync(DbWorkspace dbWorkpace, bool locked, CancellationToken cancellationToken = default);

        Task<DbVirtualNetwork> UpdateVirtualNetworkAsync(DbVirtualNetwork dbVirtualNetwork, CancellationToken cancellationToken = default);

        #region Users
        Task<DbUser[]> GetUsersAsync(CancellationToken cancellationToken = default);

        Task<DbUser?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<DbUser> CreateUserAsync(Guid id, string name, UserOrganizationRole[]? userOrganizationRoles, CancellationToken cancellationToken = default);

        // Task<DbUser> UpdateUserAsync(Guid id,string[]? addOrganizationUserRoles, string[]? removeOrganizationUserRoles, CancellationToken cancellationToken = default);

        Task<bool> RemoveUserAsync(Guid id, CancellationToken cancellationToken = default);
        #endregion

        #region Organizations
        //Task<DbOrganization> GetDefaultOrganizationAsync(DbSite site, CancellationToken cancellationToken = default);

        Task<DbOrganization[]> GetOrganizationsAsync(CancellationToken cancellationToken = default);

        Task<DbOrganization?> GetOrganizationByIdAsync(Guid Id, CancellationToken cancellationToken = default);

        Task<DbOrganization> CreateOrganizationAsync(OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default);

        Task<DbOrganization> UpdateOrganizationAsync(Guid id, string? name, string? description, Guid[] addSiteIds, Guid[] removeSiteIds, OrganizationUserRoleDescriptor[] addUsers, OrganizationUserRoleDescriptor[] removeUsers, CancellationToken cancellationToken = default);

        Task<bool> RemoveOrganizationAsync(Guid id, CancellationToken cancellationToken = default);

        Task<DbVirtualNetwork?> GetVirtualNetworkByRemoteNetworkIdAsync(string id, CancellationToken cancellationToken = default);
        #endregion
    }
}
