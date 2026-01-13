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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";
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

export default function IAMPage() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
                            <DropdownMenuItem>View Policy</DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
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
                            <DropdownMenuItem>View Role</DropdownMenuItem>
                            <DropdownMenuItem>Edit Policies</DropdownMenuItem>
                            <DropdownMenuItem>View Members</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
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
                            <DropdownMenuItem>
                              <Key className="mr-2 h-4 w-4" />
                              Rotate Keys
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit Role</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {sa.status === "active" ? (
                              <DropdownMenuItem>Deactivate</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem>Activate</DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive">
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
    </div>
  );
}
