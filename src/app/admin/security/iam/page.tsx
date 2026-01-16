"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Shield,
  Users,
  Key,
  FileText,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Mock IAM policies
const mockPolicies = [
  {
    id: "policy-001",
    name: "TenantAdmin",
    description: "Full administrative access for tenant resources",
    type: "managed",
    attachedCount: 15,
    statements: 12,
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2024-02-15T10:00:00Z",
  },
  {
    id: "policy-002",
    name: "VMOperator",
    description: "Create, start, stop, and delete virtual machines",
    type: "managed",
    attachedCount: 42,
    statements: 8,
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
  },
  {
    id: "policy-003",
    name: "ReadOnlyAccess",
    description: "View-only access to all resources",
    type: "managed",
    attachedCount: 28,
    statements: 5,
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2023-12-10T09:00:00Z",
  },
  {
    id: "policy-004",
    name: "NetworkAdmin",
    description: "Manage VPCs, subnets, and security groups",
    type: "managed",
    attachedCount: 8,
    statements: 15,
    createdAt: "2023-08-15T00:00:00Z",
    updatedAt: "2024-03-01T11:00:00Z",
  },
  {
    id: "policy-005",
    name: "BillingAccess",
    description: "View billing information and manage payment methods",
    type: "managed",
    attachedCount: 12,
    statements: 6,
    createdAt: "2023-07-01T00:00:00Z",
    updatedAt: "2023-11-05T16:00:00Z",
  },
  {
    id: "policy-006",
    name: "CustomDatabasePolicy",
    description: "Custom policy for database team",
    type: "custom",
    attachedCount: 4,
    statements: 10,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-03-10T08:00:00Z",
  },
];

// Mock roles
const mockRoles = [
  {
    id: "role-001",
    name: "SuperAdmin",
    description: "Full platform administrative access",
    type: "system",
    policies: ["TenantAdmin", "NetworkAdmin", "BillingAccess"],
    members: 3,
  },
  {
    id: "role-002",
    name: "TenantOperator",
    description: "Manage tenant resources",
    type: "system",
    policies: ["VMOperator", "ReadOnlyAccess"],
    members: 25,
  },
  {
    id: "role-003",
    name: "SecurityAuditor",
    description: "Security audit and compliance",
    type: "custom",
    policies: ["ReadOnlyAccess"],
    members: 5,
  },
  {
    id: "role-004",
    name: "BillingManager",
    description: "Financial operations",
    type: "custom",
    policies: ["BillingAccess", "ReadOnlyAccess"],
    members: 8,
  },
];

// Mock service accounts
const mockServiceAccounts = [
  {
    id: "sa-001",
    name: "backup-service",
    description: "Automated backup service",
    role: "TenantOperator",
    lastUsed: "2024-03-15T10:30:00Z",
    status: "active",
  },
  {
    id: "sa-002",
    name: "monitoring-agent",
    description: "Prometheus monitoring",
    role: "ReadOnlyAccess",
    lastUsed: "2024-03-15T10:32:00Z",
    status: "active",
  },
  {
    id: "sa-003",
    name: "ci-cd-pipeline",
    description: "CI/CD deployment automation",
    role: "VMOperator",
    lastUsed: "2024-03-15T09:45:00Z",
    status: "active",
  },
  {
    id: "sa-004",
    name: "old-service",
    description: "Deprecated service",
    role: "ReadOnlyAccess",
    lastUsed: "2024-01-05T12:00:00Z",
    status: "inactive",
  },
];

interface Policy {
  id: string;
  name: string;
  description: string;
  type: string;
  attachedCount: number;
  statements: number;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  type: string;
  policies: string[];
  members: number;
}

interface ServiceAccount {
  id: string;
  name: string;
  description: string;
  role: string;
  lastUsed: string;
  status: string;
}

export default function IAMPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Policy state
  const [viewPolicyDialogOpen, setViewPolicyDialogOpen] = useState(false);
  const [editPolicyDialogOpen, setEditPolicyDialogOpen] = useState(false);
  const [deletePolicyDialogOpen, setDeletePolicyDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  // Role state
  const [viewRoleDialogOpen, setViewRoleDialogOpen] = useState(false);
  const [editPoliciesDialogOpen, setEditPoliciesDialogOpen] = useState(false);
  const [viewMembersDialogOpen, setViewMembersDialogOpen] = useState(false);
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Service Account state
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [deleteServiceAccountDialogOpen, setDeleteServiceAccountDialogOpen] = useState(false);
  const [selectedServiceAccount, setSelectedServiceAccount] = useState<ServiceAccount | null>(null);

  // Policy handlers
  const handleViewPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setViewPolicyDialogOpen(true);
  };

  const handleEditPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setEditPolicyDialogOpen(true);
  };

  const handleDuplicatePolicy = (policy: Policy) => {
    toast({
      title: "Policy Duplicated",
      description: `${policy.name} has been duplicated as "${policy.name}-copy".`,
    });
  };

  const handleDeletePolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setDeletePolicyDialogOpen(true);
  };

  const confirmDeletePolicy = () => {
    toast({
      title: "Policy Deleted",
      description: `${selectedPolicy?.name} has been deleted.`,
    });
    setDeletePolicyDialogOpen(false);
    setSelectedPolicy(null);
  };

  // Role handlers
  const handleViewRole = (role: Role) => {
    setSelectedRole(role);
    setViewRoleDialogOpen(true);
  };

  const handleEditPolicies = (role: Role) => {
    setSelectedRole(role);
    setEditPoliciesDialogOpen(true);
  };

  const handleViewMembers = (role: Role) => {
    setSelectedRole(role);
    setViewMembersDialogOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setDeleteRoleDialogOpen(true);
  };

  const confirmDeleteRole = () => {
    toast({
      title: "Role Deleted",
      description: `${selectedRole?.name} has been deleted.`,
    });
    setDeleteRoleDialogOpen(false);
    setSelectedRole(null);
  };

  // Service Account handlers
  const handleRotateKeys = (sa: ServiceAccount) => {
    toast({
      title: "Keys Rotated",
      description: `New keys have been generated for ${sa.name}. Download them now.`,
    });
  };

  const handleEditRole = (sa: ServiceAccount) => {
    setSelectedServiceAccount(sa);
    setEditRoleDialogOpen(true);
  };

  const handleToggleServiceAccount = (sa: ServiceAccount) => {
    const newStatus = sa.status === "active" ? "inactive" : "active";
    toast({
      title: `Service Account ${newStatus === "active" ? "Activated" : "Deactivated"}`,
      description: `${sa.name} is now ${newStatus}.`,
    });
  };

  const handleDeleteServiceAccount = (sa: ServiceAccount) => {
    setSelectedServiceAccount(sa);
    setDeleteServiceAccountDialogOpen(true);
  };

  const confirmDeleteServiceAccount = () => {
    toast({
      title: "Service Account Deleted",
      description: `${selectedServiceAccount?.name} has been deleted.`,
    });
    setDeleteServiceAccountDialogOpen(false);
    setSelectedServiceAccount(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IAM Policies</h1>
          <p className="text-muted-foreground">
            Identity and access management configuration
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create IAM Policy</DialogTitle>
              <DialogDescription>
                Define permissions for platform resources
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Policy Name</Label>
                <Input placeholder="MyCustomPolicy" />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input placeholder="What this policy allows..." />
              </div>
              <div className="grid gap-2">
                <Label>Policy Document (JSON)</Label>
                <Textarea
                  className="font-mono text-sm h-48"
                  placeholder={`{
  "Version": "2024-01-01",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["vm:*"],
      "Resource": "*"
    }
  ]
}`}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Create Policy</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Policies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPolicies.length}</div>
            <p className="text-xs text-muted-foreground">
              {mockPolicies.filter((p) => p.type === "managed").length} managed, {mockPolicies.filter((p) => p.type === "custom").length} custom
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockRoles.length}</div>
            <p className="text-xs text-muted-foreground">Permission groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Accounts</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockServiceAccounts.length}</div>
            <p className="text-xs text-muted-foreground">
              {mockServiceAccounts.filter((s) => s.status === "active").length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attachments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockPolicies.reduce((sum, p) => sum + p.attachedCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Policy attachments</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="service-accounts">Service Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>IAM Policies</CardTitle>
              <CardDescription>Permission policies for resource access</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Statements</TableHead>
                    <TableHead>Attached</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>
                        <Badge variant={policy.type === "managed" ? "default" : "secondary"}>
                          {policy.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {policy.description}
                      </TableCell>
                      <TableCell>{policy.statements}</TableCell>
                      <TableCell>{policy.attachedCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(policy.updatedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleViewPolicy(policy)}>
                              View Policy
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEditPolicy(policy)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDuplicatePolicy(policy)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleDeletePolicy(policy)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Permission groups with attached policies</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Policies</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>
                        <Badge variant={role.type === "system" ? "default" : "outline"}>
                          {role.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.policies.map((policy) => (
                            <Badge key={policy} variant="secondary" className="text-xs">
                              {policy}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{role.members}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleViewRole(role)}>
                              View Role
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEditPolicies(role)}>
                              Edit Policies
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleViewMembers(role)}>
                              View Members
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteRole(role)}>
                              Delete Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service-accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Service Accounts</CardTitle>
                <CardDescription>Non-human identities for automation</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Service Account
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockServiceAccounts.map((sa) => (
                    <TableRow key={sa.id}>
                      <TableCell className="font-medium font-mono">{sa.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {sa.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sa.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sa.status === "active" ? "default" : "secondary"}>
                          {sa.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(sa.lastUsed), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleRotateKeys(sa)}>
                              <Key className="mr-2 h-4 w-4" />
                              Rotate Keys
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEditRole(sa)}>
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {sa.status === "active" ? (
                              <DropdownMenuItem onSelect={() => handleToggleServiceAccount(sa)}>
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => handleToggleServiceAccount(sa)}>
                                Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteServiceAccount(sa)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Policy Dialog */}
      <Dialog open={viewPolicyDialogOpen} onOpenChange={setViewPolicyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPolicy?.name}</DialogTitle>
            <DialogDescription>{selectedPolicy?.description}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="font-medium">{selectedPolicy?.type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Statements</Label>
                <p className="font-medium">{selectedPolicy?.statements}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Attached To</Label>
                <p className="font-medium">{selectedPolicy?.attachedCount} entities</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Policy Document</Label>
              <pre className="bg-muted p-4 rounded-md text-sm mt-2 overflow-x-auto">
{`{
  "Version": "2024-01-01",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["vm:*"],
      "Resource": "*"
    }
  ]
}`}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPolicyDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog open={editPolicyDialogOpen} onOpenChange={setEditPolicyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Policy</DialogTitle>
            <DialogDescription>Update policy configuration</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Policy Name</Label>
              <Input defaultValue={selectedPolicy?.name} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input defaultValue={selectedPolicy?.description} />
            </div>
            <div className="grid gap-2">
              <Label>Policy Document (JSON)</Label>
              <Textarea className="font-mono text-sm h-48" defaultValue={`{
  "Version": "2024-01-01",
  "Statement": []
}`} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPolicyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Policy Updated", description: `${selectedPolicy?.name} has been updated.` });
              setEditPolicyDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Policy Confirmation */}
      <AlertDialog open={deletePolicyDialogOpen} onOpenChange={setDeletePolicyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPolicy?.name}"? This will remove the policy from all {selectedPolicy?.attachedCount} attached entities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePolicy}>Delete Policy</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Role Dialog */}
      <Dialog open={viewRoleDialogOpen} onOpenChange={setViewRoleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRole?.name}</DialogTitle>
            <DialogDescription>{selectedRole?.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="font-medium">{selectedRole?.type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Members</Label>
                <p className="font-medium">{selectedRole?.members}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Attached Policies</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedRole?.policies.map((policy) => (
                  <Badge key={policy} variant="secondary">{policy}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRoleDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Policies Dialog */}
      <Dialog open={editPoliciesDialogOpen} onOpenChange={setEditPoliciesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Role Policies</DialogTitle>
            <DialogDescription>Manage policies attached to {selectedRole?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {mockPolicies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{policy.name}</p>
                  <p className="text-sm text-muted-foreground">{policy.description}</p>
                </div>
                <Switch defaultChecked={selectedRole?.policies.includes(policy.name)} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPoliciesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Role Updated", description: `${selectedRole?.name} policies have been updated.` });
              setEditPoliciesDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog open={viewMembersDialogOpen} onOpenChange={setViewMembersDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRole?.name} Members</DialogTitle>
            <DialogDescription>{selectedRole?.members} members with this role</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Admin User</TableCell>
                  <TableCell>admin@company.com</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Operations Team</TableCell>
                  <TableCell>ops@company.com</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMembersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={deleteRoleDialogOpen} onOpenChange={setDeleteRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRole?.name}"? This will affect {selectedRole?.members} members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRole}>Delete Role</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Service Account Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Service Account Role</DialogTitle>
            <DialogDescription>Change role for {selectedServiceAccount?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {mockRoles.map((role) => (
              <div key={role.id} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="role"
                  id={role.id}
                  defaultChecked={selectedServiceAccount?.role === role.name}
                  className="h-4 w-4"
                />
                <Label htmlFor={role.id} className="flex-1 cursor-pointer">
                  <p className="font-medium">{role.name}</p>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Role Updated", description: `${selectedServiceAccount?.name} role has been updated.` });
              setEditRoleDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Account Confirmation */}
      <AlertDialog open={deleteServiceAccountDialogOpen} onOpenChange={setDeleteServiceAccountDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedServiceAccount?.name}"? This action cannot be undone and any services using this account will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteServiceAccount}>Delete Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
