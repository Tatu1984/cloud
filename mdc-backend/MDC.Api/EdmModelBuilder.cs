using Microsoft.OData.Edm;
using Microsoft.OData.ModelBuilder;

namespace MDC.Api
{
    internal class EdmModelBuilder
    {
        // Learn more about OData Model Builder: https://learn.microsoft.com/odata/webapi/model-builder-abstract
        public static IEdmModel GetEdmModel()
        {
            var builder = new ODataConventionModelBuilder();
            builder.EnableLowerCamelCase();
            builder.Namespace = "MDC.Shared.Models";

            builder.EntitySet<Workspace>("Workspaces").EntityType
                .HasKey(i => i.Id);
            builder.EntitySet<Workspace>("Workspaces").EntityType
                .CollectionProperty(w => w.VirtualMachines)
                .IsNullable();
            builder.EntitySet<Workspace>("Workspaces").EntityType
                .CollectionProperty(w => w.VirtualNetworks);

            builder.EntitySet<Workspace>("Workspaces").EntityType
                .Function("Descriptor").Returns<WorkspaceDescriptor>();
            var updateDescriptorAction = builder.EntitySet<Workspace>("Workspaces").EntityType
                .Action("UpdateDescriptor");
            // updateDescriptorAction.Parameter<JsonNode>("workspaceDescriptor").Required();
            updateDescriptorAction.Returns<WorkspaceDescriptor>();

            builder.EntitySet<Workspace>("Workspaces").EntityType
                .Action("Lock");

            builder.EntitySet<Organization>("Organizations").EntityType
                .HasKey(i => i.Id);

            builder.EntitySet<Site>("Sites").EntityType
                .HasKey(i => i.Id);

            //builder.EntitySet<Site>("Sites").EntityType
            //    .Action("AddWorkspace").Parameter<WorkspaceDescriptor>("workspaceDescriptor").Required();

            builder.EntitySet<Site>("Sites").EntityType
                .Function("DownloadableTemplates")
                .Returns<DownloadableTemplate[]>();
            builder.EntitySet<Site>("Sites").EntityType
                .Action("DownloadTemplate")
                .Parameter<DownloadTemplateDescriptor>("downloadTemplateDescriptor").Required();
            // builder.EntitySet<Site>("Sites").EntityType.HasMany(s => s.Workspaces);


            builder.EntitySet<User>("Users").EntityType
                .HasKey(i => i.Id);

            builder.EntitySet<RemoteNetwork>("RemoteNetworks").EntityType
                .HasKey(i => i.Id);
            builder.EntitySet<RemoteNetwork>("RemoteNetworks").EntityType
                .CollectionProperty<RemoteNetworkMember>(i => i.Members);






            //builder.EntitySet<Site>("Sites").EntityType
            //    .Function("GetWorkspacesForSiteAsync")
            //    .Returns<Workspace[]>();

            //builder.EntitySet<Order>("Orders");

            //var customerType = builder.EntityType<Customer>();

            //// Define the Bound function to a single entity
            //customerType
            //    .Function("GetCustomerOrdersTotalAmount")
            //    .Returns<int>();

            //// Define theBound function to collection
            //customerType
            //    .Collection
            //    .Function("GetCustomerByName")
            //    .ReturnsFromEntitySet<Customer>("Customers")
            //    .Parameter<string>("name");

            return builder.GetEdmModel();
        }
    }
}