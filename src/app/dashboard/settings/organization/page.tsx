"use client";

import { useState } from "react";
import {
  Building2,
  Upload,
  Save,
  Trash2,
  AlertTriangle,
  CreditCard,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Mock organization data
const organizationData = {
  id: "org-001",
  name: "Acme Corporation",
  slug: "acme-corp",
  logo: null,
  plan: "enterprise" as const,
  billingEmail: "billing@acme.com",
  createdAt: "2024-01-01T00:00:00Z",
  owner: "John Smith",
  website: "https://acme.com",
};

const planDetails = {
  starter: {
    name: "Starter",
    price: 29,
    color: "bg-slate-500",
  },
  professional: {
    name: "Professional",
    price: 99,
    color: "bg-blue-500",
  },
  enterprise: {
    name: "Enterprise",
    price: 299,
    color: "bg-purple-500",
  },
};

const resourceQuotas = {
  vms: { used: 12, limit: 50, label: "Virtual Machines" },
  vcpus: { used: 64, limit: 200, label: "vCPUs" },
  memory: { used: 256, limit: 1024, label: "Memory (GB)" },
  storage: { used: 2500, limit: 10000, label: "Storage (GB)" },
  publicIps: { used: 8, limit: 25, label: "Public IPs" },
  loadBalancers: { used: 3, limit: 10, label: "Load Balancers" },
  k8sClusters: { used: 2, limit: 5, label: "Kubernetes Clusters" },
  databases: { used: 3, limit: 10, label: "Managed Databases" },
};

const planBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
  starter: "outline",
  professional: "secondary",
  enterprise: "default",
};

export default function OrganizationPage() {
  const [orgName, setOrgName] = useState(organizationData.name);
  const [orgSlug, setOrgSlug] = useState(organizationData.slug);
  const [billingEmail, setBillingEmail] = useState(organizationData.billingEmail);
  const [website, setWebsite] = useState(organizationData.website);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [copiedSlug, setCopiedSlug] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleCopySlug = () => {
    navigator.clipboard.writeText(orgSlug);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const currentPlan = planDetails[organizationData.plan];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization profile, subscription, and resource quotas
          </p>
        </div>
      </div>

      {/* Organization Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Profile
          </CardTitle>
          <CardDescription>
            Update your organization&apos;s basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={organizationData.logo || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10">
                {orgName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Upload Logo
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or SVG. Max 2MB. Recommended size: 256x256px
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgSlug">Organization Slug</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="orgSlug"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="organization-slug"
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={handleCopySlug}
                  >
                    {copiedSlug ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Used in URLs: cloudplatform.io/{orgSlug}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingEmail">Billing Email</Label>
              <Input
                id="billingEmail"
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="billing@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.com"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Organization ID: <code className="bg-muted px-1 rounded">{organizationData.id}</code></span>
            <span>Created: {new Date(organizationData.createdAt).toLocaleDateString()}</span>
            <span>Owner: {organizationData.owner}</span>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      {/* Subscription Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Plan
          </CardTitle>
          <CardDescription>
            Your current plan and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg ${currentPlan.color} flex items-center justify-center`}>
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{currentPlan.name} Plan</h3>
                  <Badge variant={planBadgeVariants[organizationData.plan]}>
                    Current
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  ${currentPlan.price}/month per seat
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${currentPlan.price * 5}</p>
              <p className="text-sm text-muted-foreground">5 seats</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">Billing Cycle</p>
              <p className="font-medium">Monthly</p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">Next Invoice</p>
              <p className="font-medium">February 1, 2026</p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-medium">Visa ending in 4242</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex gap-2">
          <Button variant="outline">Change Plan</Button>
          <Button variant="outline">Manage Billing</Button>
        </CardFooter>
      </Card>

      {/* Resource Quotas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Resource Quotas
          </CardTitle>
          <CardDescription>
            Your organization&apos;s resource usage and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(resourceQuotas).map(([key, quota]) => {
              const percentage = (quota.used / quota.limit) * 100;
              const Icon = key === "vcpus" ? Cpu : key === "memory" ? MemoryStick : key === "storage" ? HardDrive : Server;
              const isWarning = percentage >= 80;
              const isCritical = percentage >= 95;

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{quota.label}</span>
                    </div>
                    <span className={`text-sm ${isCritical ? "text-red-500" : isWarning ? "text-yellow-500" : "text-muted-foreground"}`}>
                      {quota.used.toLocaleString()} / {quota.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-2 ${isCritical ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-yellow-500" : ""}`}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {percentage.toFixed(1)}% used
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button variant="outline">Request Quota Increase</Button>
        </CardFooter>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <h4 className="font-medium">Delete Organization</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete this organization and all of its data. This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Organization
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      This action cannot be undone. This will permanently delete the
                      <strong className="text-foreground"> {organizationData.name} </strong>
                      organization and remove all associated data including:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>All virtual machines and compute resources</li>
                      <li>All storage volumes and object storage</li>
                      <li>All databases and their data</li>
                      <li>All networking configurations</li>
                      <li>All user accounts and access permissions</li>
                      <li>All billing history and invoices</li>
                    </ul>
                    <div className="pt-4">
                      <Label htmlFor="deleteConfirm" className="text-foreground">
                        Type <strong>{organizationData.slug}</strong> to confirm:
                      </Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder={organizationData.slug}
                        className="mt-2"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleteConfirmation !== organizationData.slug}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Organization
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <h4 className="font-medium">Transfer Ownership</h4>
              <p className="text-sm text-muted-foreground">
                Transfer this organization to another user. You will lose administrative access.
              </p>
            </div>
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
              Transfer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
