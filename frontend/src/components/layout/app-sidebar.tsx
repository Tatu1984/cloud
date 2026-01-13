"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Server,
  Container,
  Network,
  HardDrive,
  Database,
  BarChart3,
  CreditCard,
  Settings,
  LayoutDashboard,
  Shield,
  Users,
  Building2,
  Globe,
  Activity,
  Boxes,
  Wallet,
  Cloud,
  ChevronDown,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";

const tenantNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Compute",
    icon: Server,
    items: [
      { title: "Virtual Machines", url: "/dashboard/compute/vms" },
      { title: "Templates", url: "/dashboard/compute/templates" },
      { title: "Snapshots", url: "/dashboard/compute/snapshots" },
    ],
  },
  {
    title: "Kubernetes",
    icon: Container,
    items: [
      { title: "Clusters", url: "/dashboard/kubernetes/clusters" },
      { title: "Node Pools", url: "/dashboard/kubernetes/node-pools" },
      { title: "Registry", url: "/dashboard/kubernetes/registry" },
    ],
  },
  {
    title: "Networking",
    icon: Network,
    items: [
      { title: "VPCs", url: "/dashboard/networking/vpcs" },
      { title: "Subnets", url: "/dashboard/networking/subnets" },
      { title: "Security Groups", url: "/dashboard/networking/security-groups" },
      { title: "Load Balancers", url: "/dashboard/networking/load-balancers" },
      { title: "Public IPs", url: "/dashboard/networking/public-ips" },
      { title: "DNS", url: "/dashboard/networking/dns" },
    ],
  },
  {
    title: "Storage",
    icon: HardDrive,
    items: [
      { title: "Block Volumes", url: "/dashboard/storage/volumes" },
      { title: "Object Storage", url: "/dashboard/storage/buckets" },
      { title: "File Storage", url: "/dashboard/storage/file-shares" },
      { title: "Backups", url: "/dashboard/storage/backups" },
    ],
  },
  {
    title: "Databases",
    icon: Database,
    items: [
      { title: "PostgreSQL", url: "/dashboard/databases/postgresql" },
      { title: "MySQL", url: "/dashboard/databases/mysql" },
      { title: "Backups", url: "/dashboard/databases/backups" },
    ],
  },
  {
    title: "Observability",
    icon: BarChart3,
    items: [
      { title: "Metrics", url: "/dashboard/observability/metrics" },
      { title: "Logs", url: "/dashboard/observability/logs" },
      { title: "Alerts", url: "/dashboard/observability/alerts" },
    ],
  },
  {
    title: "Billing",
    icon: CreditCard,
    items: [
      { title: "Usage", url: "/dashboard/billing/usage" },
      { title: "Invoices", url: "/dashboard/billing/invoices" },
      { title: "Payment Methods", url: "/dashboard/billing/payment" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      { title: "Organization", url: "/dashboard/settings/organization" },
      { title: "Users & Teams", url: "/dashboard/settings/users" },
      { title: "API Keys", url: "/dashboard/settings/api-keys" },
      { title: "Audit Log", url: "/dashboard/settings/audit-log" },
    ],
  },
];

export function TenantSidebar() {
  const pathname = usePathname();
  const { user, organization, currentProject, projects, setCurrentProject } = useAuthStore();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cloud className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Cloud Platform</span>
            <span className="text-xs text-muted-foreground">{organization?.name}</span>
          </div>
        </div>
        <div className="px-2 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                <span>{currentProject?.name || "Select project"}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]" align="start">
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => setCurrentProject(project)}
                >
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {tenantNavItems.map((item) => {
                if (!item.items) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link href={item.url!}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const isActive = item.items.some((sub) => pathname.startsWith(sub.url));

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                              >
                                <Link href={subItem.url}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-muted-foreground">{user?.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin">Admin Console</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

const adminNavItems = [
  {
    title: "Overview",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Tenants",
    icon: Users,
    items: [
      { title: "All Tenants", url: "/admin/tenants" },
      { title: "Onboarding", url: "/admin/tenants/onboarding" },
      { title: "Plans & Quotas", url: "/admin/tenants/plans" },
    ],
  },
  {
    title: "Infrastructure",
    icon: Building2,
    items: [
      { title: "Datacenters", url: "/admin/infrastructure/datacenters" },
      { title: "Proxmox Clusters", url: "/admin/infrastructure/clusters" },
      { title: "Nodes", url: "/admin/infrastructure/nodes" },
    ],
  },
  {
    title: "Network Fabric",
    icon: Globe,
    items: [
      { title: "Topology", url: "/admin/network/topology" },
      { title: "ZeroTier Networks", url: "/admin/network/zerotier" },
      { title: "Traffic Control", url: "/admin/network/traffic" },
    ],
  },
  {
    title: "Storage",
    icon: Boxes,
    items: [
      { title: "Ceph Clusters", url: "/admin/storage/ceph" },
      { title: "Storage Pools", url: "/admin/storage/pools" },
      { title: "Replication", url: "/admin/storage/replication" },
    ],
  },
  {
    title: "Security",
    icon: Shield,
    items: [
      { title: "IAM Policies", url: "/admin/security/iam" },
      { title: "Certificates", url: "/admin/security/certificates" },
      { title: "Audit Logs", url: "/admin/security/audit" },
    ],
  },
  {
    title: "Operations",
    icon: Activity,
    items: [
      { title: "Control Plane", url: "/admin/operations/control-plane" },
      { title: "Service Health", url: "/admin/operations/health" },
      { title: "Maintenance", url: "/admin/operations/maintenance" },
    ],
  },
  {
    title: "Financials",
    icon: Wallet,
    items: [
      { title: "Revenue", url: "/admin/financials/revenue" },
      { title: "Usage Analytics", url: "/admin/financials/usage" },
      { title: "Pricing", url: "/admin/financials/pricing" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Admin Console</span>
            <span className="text-xs text-muted-foreground">Cloud Operator</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                if (!item.items) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link href={item.url!}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const isActive = item.items.some((sub) => pathname.startsWith(sub.url));

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                              >
                                <Link href={subItem.url}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-destructive text-destructive-foreground">
                      {user?.name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-muted-foreground">Super Admin</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">User Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
