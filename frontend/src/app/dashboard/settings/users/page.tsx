"use client";

import { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUsers, useOrganizations } from "@/lib/mdc/hooks";
import { User, Organization, UserOrganizationRole } from "@/lib/mdc/types";

type DisplayRole = "admin" | "member" | "viewer";

interface DisplayUser {
  id: string;
  name: string;
  roles: UserOrganizationRole[];
  primaryRole: DisplayRole;
  organizationCount: number;
}

const roleConfig: Record<DisplayRole, { label: string; icon: React.ElementType; color: string; description: string }> = {
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    color: "text-red-500",
    description: "Full access to all resources and settings",
  },
  member: {
    label: "Member",
    icon: Shield,
    color: "text-blue-500",
    description: "Can create and manage resources",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-slate-500",
    description: "Read-only access to resources",
  },
};

const roleBadgeVariants: Record<DisplayRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  member: "secondary",
  viewer: "outline",
};

// Map MDC role string to display role
function mapRole(role: string): DisplayRole {
  const lowerRole = role.toLowerCase();
  if (lowerRole.includes("admin") || lowerRole.includes("owner")) return "admin";
  if (lowerRole.includes("viewer") || lowerRole.includes("read")) return "viewer";
  return "member";
}

// Get the highest priority role from a list of roles
function getPrimaryRole(roles: UserOrganizationRole[]): DisplayRole {
  if (roles.some(r => mapRole(r.role) === "admin")) return "admin";
  if (roles.some(r => mapRole(r.role) === "member")) return "member";
  return "viewer";
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UsersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");

  // Fetch users and organizations from MDC API
  const { data: users, isLoading: usersLoading, isError: usersError, error: usersErrorData, refetch: refetchUsers } = useUsers({});
  const { data: organizations, isLoading: orgsLoading, isError: orgsError, refetch: refetchOrgs } = useOrganizations();

  // Org name lookup
  const orgNameMap = useMemo(() => {
    const map = new Map<string, string>();
    organizations?.forEach((org) => map.set(org.id, org.name));
    return map;
  }, [organizations]);

  const isLoading = usersLoading || orgsLoading;
  const isError = usersError || orgsError;

  // Transform users for display
  const displayUsers = useMemo<DisplayUser[]>(() => {
    if (!users) return [];
    return users.map((user) => ({
      id: user.id,
      name: user.displayName,
      roles: user.organizationRoles || [],
      primaryRole: getPrimaryRole(user.organizationRoles || []),
      organizationCount: new Set(user.organizationRoles?.map(r => r.organizationId) || []).size,
    }));
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return displayUsers.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || user.primaryRole === roleFilter;
      const matchesOrg = orgFilter === "all" || user.roles.some(r => r.organizationId === orgFilter);
      return matchesSearch && matchesRole && matchesOrg;
    });
  }, [displayUsers, search, roleFilter, orgFilter]);

  // Stats
  const adminCount = displayUsers.filter((u) => u.primaryRole === "admin").length;
  const memberCount = displayUsers.filter((u) => u.primaryRole === "member").length;
  const viewerCount = displayUsers.filter((u) => u.primaryRole === "viewer").length;

  const handleRefresh = () => {
    refetchUsers();
    refetchOrgs();
  };

  const handleViewProfile = (user: DisplayUser) => {
    toast({
      title: "View Profile",
      description: `Opening profile for ${user.name}`,
    });
  };

  const handleEditPermissions = (user: DisplayUser) => {
    toast({
      title: "Edit Permissions",
      description: `Opening permission settings for ${user.name}`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Failed to Load Users
            </CardTitle>
            <CardDescription>
              {usersErrorData instanceof Error ? usersErrorData.message : "An error occurred while loading users"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users & Teams</h1>
          <p className="text-muted-foreground">
            Manage users and their organization roles
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {organizations?.length || 0} organizations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground">Full access</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount}</div>
            <p className="text-xs text-muted-foreground">Standard access</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viewers</CardTitle>
            <Eye className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{viewerCount}</div>
            <p className="text-xs text-muted-foreground">Read-only access</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            Users ({displayUsers.length})
          </TabsTrigger>
          <TabsTrigger value="organizations">
            Organizations ({organizations?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="member">Members</SelectItem>
                    <SelectItem value="viewer">Viewers</SelectItem>
                  </SelectContent>
                </Select>
                {organizations && organizations.length > 0 && (
                  <Select value={orgFilter} onValueChange={setOrgFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by org" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All organizations</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Primary Role</TableHead>
                      <TableHead>Organizations</TableHead>
                      <TableHead>Role Details</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const roleInfo = roleConfig[user.primaryRole];
                      const RoleIcon = roleInfo.icon;

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback>
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {user.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <RoleIcon className={`h-4 w-4 ${roleInfo.color}`} />
                              <Badge variant={roleBadgeVariants[user.primaryRole]}>
                                {roleInfo.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{user.organizationCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {user.roles.slice(0, 3).map((role, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {orgNameMap.get(role.organizationId) || role.organizationId.slice(0, 8)}: {role.role}
                                </Badge>
                              ))}
                              {user.roles.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.roles.length - 3} more
                                </Badge>
                              )}
                              {user.roles.length === 0 && (
                                <span className="text-muted-foreground text-sm">No roles assigned</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleViewProfile(user)}>
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleEditPermissions(user)}>
                                  Edit Permissions
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>
                View all organizations and their members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!organizations || organizations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No organizations found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sites</TableHead>
                      <TableHead>Workspaces</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{org.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {org.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.active ? "default" : "secondary"}>
                            {org.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.siteIds?.length || 0}</TableCell>
                        <TableCell>{org.workspaceIds?.length || 0}</TableCell>
                        <TableCell>
                          {org.organizationUserRoles?.length || 0}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => {
                                  setOrgFilter(org.id);
                                  const tabsList = document.querySelector('[role="tablist"]');
                                  const usersTab = tabsList?.querySelector('[value="users"]') as HTMLButtonElement;
                                  usersTab?.click();
                                }}
                              >
                                View Members
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => toast({ title: "View Details", description: `Opening details for ${org.name}` })}>
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
