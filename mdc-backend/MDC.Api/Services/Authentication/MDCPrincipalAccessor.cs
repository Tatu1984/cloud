using MDC.Core.Services.Providers.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Identity.Web;

namespace MDC.Api.Services.Authentication;

internal class MDCPrincipalAccessor(IHttpContextAccessor httpContextAccessor) : IMDCPrincipalAccessor
{
    public ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public bool IsGlobalAdministrator => httpContextAccessor.HttpContext?.User.IsInRole(UserRoles.GlobalAdministrator) ?? false;

    public bool IsDatacenterTechnician => httpContextAccessor.HttpContext?.User.IsInRole(UserRoles.DatacenterTechnician) ?? false;

    public bool IsWorkspaceManager => httpContextAccessor.HttpContext?.User.IsInRole(UserRoles.WorkspaceManager) ?? false;

    public bool IsWorkspaceUser => httpContextAccessor.HttpContext?.User.IsInRole(UserRoles.WorkspaceUser) ?? false;

    public Guid? ObjectId => Guid.TryParse(httpContextAccessor.HttpContext?.User.GetObjectId(), out var id) ? id : null;
}
