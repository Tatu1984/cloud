"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Users,
  Server,
  HardDrive,
  Network,
  Database,
  Infinity,
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
  CardFooter,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTenants } from "@/stores/mock-data";

// Mock plans data
const mockPlans = [
  {
    id: "plan-starter",
    name: "Starter",
    description: "For small teams and startups",
    basePrice: 0,
    active: true,
    tenantCount: 15,
    quotas: {
      maxVMs: 5,
      maxvCPUs: 16,
      maxMemory: 32,
      maxStorage: 500,
      maxSnapshots: 10,
      maxLoadBalancers: 1,
      maxDatabases: 2,
      maxUsers: 5,
      supportLevel: "community",
      backupRetention: 7,
    },
    features: ["Basic monitoring", "Email support", "99.9% SLA"],
  },
  {
    id: "plan-professional",
    name: "Professional",
    description: "For growing businesses",
    basePrice: 99,
    active: true,
    tenantCount: 42,
    quotas: {
      maxVMs: 25,
      maxvCPUs: 64,
      maxMemory: 256,
      maxStorage: 5000,
      maxSnapshots: 50,
      maxLoadBalancers: 5,
      maxDatabases: 10,
      maxUsers: 25,
      supportLevel: "business",
      backupRetention: 30,
    },
    features: [
      "Advanced monitoring",
      "24/7 email support",
      "99.95% SLA",
      "Managed databases",
      "Auto-scaling",
    ],
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    description: "For large organizations",
    basePrice: 499,
    active: true,
    tenantCount: 8,
    quotas: {
      maxVMs: -1,
      maxvCPUs: -1,
      maxMemory: -1,
      maxStorage: -1,
      maxSnapshots: -1,
      maxLoadBalancers: -1,
      maxDatabases: -1,
      maxUsers: -1,
      supportLevel: "premium",
      backupRetention: 90,
    },
    features: [
      "Full monitoring suite",
      "24/7 phone + email support",
      "99.99% SLA",
      "Dedicated account manager",
      "Custom integrations",
      "Compliance reports",
      "Private networking",
    ],
  },
];

// Default quota templates
const quotaTemplates = [
  { name: "Compute Heavy", vms: 50, vcpus: 256, memory: 512, storage: 2000 },
  { name: "Storage Heavy", vms: 10, vcpus: 32, memory: 64, storage: 20000 },
  { name: "Balanced", vms: 25, vcpus: 128, memory: 256, storage: 5000 },
];

function formatQuota(value: number): string {
  if (value === -1) return "Unlimited";
  return value.toLocaleString();
}

export default function PlansPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const planDistribution = {
    starter: mockTenants.filter((t) => t.organization.plan === "starter").length,
    professional: mockTenants.filter((t) => t.organization.plan === "professional").length,
    enterprise: mockTenants.filter((t) => t.organization.plan === "enterprise").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans & Quotas</h1>
          <p className="text-muted-foreground">
            Manage subscription plans and resource quotas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Define a new subscription plan with custom quotas
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" placeholder="Custom Plan" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Base Price ($/mo)</Label>
                  <Input id="price" type="number" placeholder="199" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Plan description..." />
              </div>
              <div className="border-t pt-4">
                <Label className="text-base">Resource Quotas</Label>
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div className="grid gap-2">
                    <Label htmlFor="vms" className="text-xs">Max VMs</Label>
                    <Input id="vms" type="number" placeholder="25" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vcpus" className="text-xs">Max vCPUs</Label>
                    <Input id="vcpus" type="number" placeholder="64" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="memory" className="text-xs">Max Memory (GB)</Label>
                    <Input id="memory" type="number" placeholder="256" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="storage" className="text-xs">Max Storage (GB)</Label>
                    <Input id="storage" type="number" placeholder="5000" />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Create Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="quotas">Quota Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          {/* Plan Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {mockPlans.map((plan) => (
              <Card key={plan.id} className="relative">
                {plan.name === "Professional" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold">
                      ${plan.basePrice}
                    </span>
                    <span className="text-muted-foreground">/month base</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{planDistribution[plan.name.toLowerCase() as keyof typeof planDistribution] || 0}</span>
                    <span className="text-muted-foreground">active tenants</span>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">Resource Limits</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Server className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxVMs)} VMs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Server className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxvCPUs)} vCPUs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxMemory)} GB RAM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxStorage)} GB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Network className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxLoadBalancers)} LBs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxDatabases)} DBs</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">Features</p>
                    <ul className="space-y-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm text-muted-foreground">
                      {plan.active ? "Active" : "Inactive"}
                    </span>
                    <Switch checked={plan.active} />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quota Templates</CardTitle>
              <CardDescription>
                Pre-defined quota configurations for quick tenant setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Max VMs</TableHead>
                    <TableHead>Max vCPUs</TableHead>
                    <TableHead>Max Memory</TableHead>
                    <TableHead>Max Storage</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotaTemplates.map((template, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.vms}</TableCell>
                      <TableCell>{template.vcpus}</TableCell>
                      <TableCell>{template.memory} GB</TableCell>
                      <TableCell>{template.storage} GB</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>Apply to Tenant</DropdownMenuItem>
                            <DropdownMenuSeparator />
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

          {/* Default Limits Card */}
          <Card>
            <CardHeader>
              <CardTitle>Default Resource Limits</CardTitle>
              <CardDescription>
                Global defaults applied to new tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Max VMs per Tenant</Label>
                  <Input type="number" defaultValue="10" />
                </div>
                <div className="space-y-2">
                  <Label>Max vCPUs per VM</Label>
                  <Input type="number" defaultValue="32" />
                </div>
                <div className="space-y-2">
                  <Label>Max Memory per VM (GB)</Label>
                  <Input type="number" defaultValue="128" />
                </div>
                <div className="space-y-2">
                  <Label>Max Disk per VM (GB)</Label>
                  <Input type="number" defaultValue="2000" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button>Save Defaults</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
