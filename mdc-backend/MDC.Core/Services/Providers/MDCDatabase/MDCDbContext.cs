using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace MDC.Core.Services.Providers.MDCDatabase
{
    // To Add migration run the following:
    // dotnet ef migrations add InitialCreate --startup-project "MDC.Api" --project "MDC.Core" --output-dir "Migrations"
    // You may need to install dotnet EF: dotnet tool install --global dotnet-ef
    internal class MDCDbContext(IConfiguration configuration) : DbContext
    {
        // public DbSet<DbDatacenter> Datacenters { get; set; }
        public DbSet<DbSite> Sites { get; set; }

        public DbSet<DbSiteNode> SiteNodes { get; set; }

        public DbSet<DbWorkspace> Workspaces { get; set; }

        public DbSet<DbVirtualNetwork> VirtualNetworks { get; set; }

        public DbSet<DbOrganization> Organizations { get; set; }

        public DbSet<DbUser> Users { get; set; }

        public DbSet<DbOrganizationUserRole> OrganizationUserRoles{ get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (optionsBuilder.IsConfigured)
            {
                return;
            }
            // Use the connection string from the configuration
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(connectionString))
            {
                // For testing purposes, use an in-memory database if no connection string is provided
                // optionsBuilder.UseInMemoryDatabase("MDC");
                throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
            }
            //optionsBuilder.UseSqlServer(connectionString, options =>
            //{
            //    options.MigrationsAssembly("MDC.Core");
            //    options.MigrationsHistoryTable("__EFMigrationsHistory");
            //    //options.EnableRetryOnFailure(
            //    //    maxRetryCount: 5,
            //    //    maxRetryDelay: TimeSpan.FromSeconds(10),
            //    //    errorNumbersToAdd: null);
            //});
            optionsBuilder.UseNpgsql(connectionString, options =>
            {
                options.MigrationsAssembly("MDC.Core");
                options.MigrationsHistoryTable("__EFMigrationsHistory");
            });
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<DbSite>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.ApiTokenId).IsRequired().HasMaxLength(255);
                entity.Property(e => e.ApiSecret).IsRequired().HasMaxLength(255);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();

                entity.HasMany(e => e.SiteNodes)
                    .WithOne(sn => sn.Site)
                    .HasForeignKey(sn => sn.SiteId)
                    .IsRequired();

                entity.HasMany(e => e.Workspaces)
                    .WithOne(w => w.Site)
                    .HasForeignKey(w => w.SiteId)
                    .IsRequired();

                entity.HasMany(e => e.Organizations)
                    .WithMany(o => o.Sites);
            });

            modelBuilder.Entity<DbSiteNode>(entity =>
            {
                entity.HasKey(e => e.MemberAddress);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
                entity.Property(e => e.ApiPort).IsRequired().HasDefaultValue(8006);
                entity.Property(e => e.ApiValidateServerCertificate).IsRequired().HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.SiteId).IsRequired();

                entity.HasOne(e => e.Site)
                    .WithMany(e => e.SiteNodes)
                    .HasForeignKey(e => e.SiteId)
                    .IsRequired();
            });

            modelBuilder.Entity<DbWorkspace>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Address).IsRequired();
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.SiteId).IsRequired();
                entity.Property(e => e.OrganizationId).IsRequired();

                entity.HasOne(e => e.Site)
                    .WithMany(d => d.Workspaces)
                    .HasForeignKey(e => e.SiteId)
                    .IsRequired();

                entity.HasMany(e => e.VirtualNetworks)
                    .WithOne(vn => vn.Workspace)
                    .HasForeignKey(vn => vn.WorkspaceId);

                entity.HasOne(e => e.Organization)
                    .WithMany(d => d.Workspaces)
                    .HasForeignKey(w => w.OrganizationId)
                    .IsRequired();
            });

            modelBuilder.Entity<DbVirtualNetwork>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Index).IsRequired();
                entity.Property(e => e.Tag).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.WorkspaceId).IsRequired();
                
                entity.HasOne(e => e.Workspace)
                    .WithMany(w => w.VirtualNetworks)
                    .HasForeignKey(e => e.WorkspaceId)
                    .IsRequired();
            });

            modelBuilder.Entity<DbOrganization>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();

                entity.HasMany(e => e.Sites)
                    .WithMany(s => s.Organizations);

                entity.HasMany(e => e.Workspaces)
                    .WithOne(w => w.Organization)
                    .HasForeignKey(w => w.OrganizationId)
                    .IsRequired();

                entity.HasMany(e => e.OrganizationUserRoles)
                    .WithOne(o => o.Organization)
                    .HasForeignKey(o => o.OrganizationId)
                    .IsRequired();
            });

            modelBuilder.Entity<DbUser>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();

                entity.HasMany(e => e.OrganizationUserRoles)
                    .WithOne(o => o.User)
                    .HasForeignKey(o => o.UserId)
                    .IsRequired();
            });

            modelBuilder.Entity<DbOrganizationUserRole>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.Role).IsRequired().HasMaxLength(255);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.OrganizationId).IsRequired();

                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.OrganizationUserRoles)
                    .HasForeignKey(o => o.OrganizationId)
                    .IsRequired();

                entity.HasOne(e => e.User)
                    .WithMany(o => o.OrganizationUserRoles)
                    .HasForeignKey(o => o.UserId)
                    .IsRequired();
            });
        }
    }
}
