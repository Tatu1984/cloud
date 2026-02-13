using MDC.Core.Services.Providers.DatacenterFactory;
using MDC.Core.Services.Providers.MDCDatabase;

namespace MDC.Core.Services.Api;

internal class OrganizationService(IDatacenterFactoryService datacenterFactoryService, IMDCDatabaseService databaseService) : IOrganizationService
{
    public async Task<Organization> CreateAsync(OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default)
    {
        var dbOrganization = await databaseService.CreateOrganizationAsync(organizationDescriptor, cancellationToken);
        return datacenterFactoryService.ComputeOrganizations([dbOrganization]).FirstOrDefault() ?? throw new InvalidOperationException($"Failed to fetch newly created organization Id {dbOrganization.Id}");
    }

    public async Task<Organization[]> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var dbOrganizations = await databaseService.GetOrganizationsAsync(cancellationToken);

        return datacenterFactoryService.ComputeOrganizations(dbOrganizations);
    }

    public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dbOrganization = await databaseService.GetOrganizationByIdAsync(id, cancellationToken);
        if (dbOrganization == null) return null;
        return datacenterFactoryService.ComputeOrganizations([dbOrganization]).FirstOrDefault();
    }

    public async Task<Organization> UpdateAsync(Guid id, OrganizationUpdateDescriptor organizationUpdateDescriptor, CancellationToken cancellationToken = default)
    {
        var existingOrganization = await GetByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Organization Id {id} not found.");
        var dbOrganization = await databaseService.UpdateOrganizationAsync(id, organizationUpdateDescriptor.Name, organizationUpdateDescriptor.Description, organizationUpdateDescriptor.AddSiteIds ?? [], organizationUpdateDescriptor.RemoveSiteIds ?? [], organizationUpdateDescriptor.AddOrganizationUserRoles ?? [], organizationUpdateDescriptor.RemoveOrganizationUserRoles ?? [], cancellationToken);
        return await GetByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Updated Organization Id {id} not found.");
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dbOrganization = await databaseService.GetOrganizationByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Organization Id {id} not found.");
        await databaseService.RemoveOrganizationAsync(id, cancellationToken);
    }
}
