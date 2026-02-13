using MDC.Core.Services.Providers.Authentication;
using System.Security.Claims;
using System.Security.Principal;

namespace MDC.Core.Tests;

internal class TestMDCPrincipalAccessor : IMDCPrincipalAccessor
{
    public ClaimsPrincipal? User => new ClaimsPrincipal(new GenericIdentity("TestUser"));

    public bool IsAuthenticated { get; set; }

    public bool IsGlobalAdministrator { get; set; }

    public bool IsDatacenterTechnician { get; set; }

    public bool IsWorkspaceManager { get; set; }

    public bool IsWorkspaceUser { get; set; }

    public Guid? ObjectId { get; set; }
}