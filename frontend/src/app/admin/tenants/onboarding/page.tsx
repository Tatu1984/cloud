"use client";

import { useState } from "react";
import {
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Mail,
  Building,
  Calendar,
  ArrowRight,
  FileText,
  CreditCard,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { format } from "date-fns";
import { Search } from "lucide-react";

// Mock onboarding requests
const mockOnboardingRequests = [
  {
    id: "onb-001",
    companyName: "Innovative Tech Solutions",
    contactName: "Sarah Johnson",
    email: "sarah@innovativetech.io",
    phone: "+1-555-0123",
    requestedPlan: "enterprise",
    estimatedSpend: 5000,
    useCase: "Cloud migration for legacy applications",
    status: "pending_review",
    source: "website",
    createdAt: "2024-03-14T10:30:00Z",
    assignedTo: null,
  },
  {
    id: "onb-002",
    companyName: "DataFlow Analytics",
    contactName: "Michael Chen",
    email: "mchen@dataflow.com",
    phone: "+1-555-0456",
    requestedPlan: "professional",
    estimatedSpend: 2500,
    useCase: "Big data processing and ML workloads",
    status: "in_progress",
    source: "sales_referral",
    createdAt: "2024-03-13T14:00:00Z",
    assignedTo: "Alex Thompson",
    currentStep: "technical_review",
  },
  {
    id: "onb-003",
    companyName: "GreenLeaf Retail",
    contactName: "Emma Williams",
    email: "emma@greenleaf.shop",
    phone: "+1-555-0789",
    requestedPlan: "starter",
    estimatedSpend: 500,
    useCase: "E-commerce hosting",
    status: "pending_verification",
    source: "website",
    createdAt: "2024-03-12T09:15:00Z",
    assignedTo: "Jordan Lee",
    currentStep: "identity_verification",
  },
  {
    id: "onb-004",
    companyName: "FinSecure Corp",
    contactName: "Robert Davis",
    email: "rdavis@finsecure.com",
    phone: "+1-555-0321",
    requestedPlan: "enterprise",
    estimatedSpend: 15000,
    useCase: "PCI-compliant financial services infrastructure",
    status: "approved",
    source: "partner_referral",
    createdAt: "2024-03-10T11:00:00Z",
    assignedTo: "Sarah Miller",
    currentStep: "provisioning",
  },
  {
    id: "onb-005",
    companyName: "QuickStart Games",
    contactName: "Lisa Park",
    email: "lisa@quickstartgames.io",
    phone: "+1-555-0654",
    requestedPlan: "professional",
    estimatedSpend: 3500,
    useCase: "Game server hosting and CDN",
    status: "rejected",
    source: "website",
    createdAt: "2024-03-08T16:30:00Z",
    assignedTo: null,
    rejectionReason: "High-risk industry, compliance concerns",
  },
];

const statusConfig = {
  pending_review: { label: "Pending Review", color: "secondary", icon: Clock },
  in_progress: { label: "In Progress", color: "default", icon: ArrowRight },
  pending_verification: { label: "Pending Verification", color: "secondary", icon: FileText },
  approved: { label: "Approved", color: "default", icon: CheckCircle },
  rejected: { label: "Rejected", color: "destructive", icon: XCircle },
};

const planConfig = {
  starter: { label: "Starter", color: "outline" },
  professional: { label: "Professional", color: "secondary" },
  enterprise: { label: "Enterprise", color: "default" },
};

export default function OnboardingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredRequests = mockOnboardingRequests.filter((req) => {
    const matchesSearch =
      req.companyName.toLowerCase().includes(search.toLowerCase()) ||
      req.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = mockOnboardingRequests.filter(
    (r) => r.status === "pending_review"
  ).length;
  const inProgressCount = mockOnboardingRequests.filter(
    (r) => r.status === "in_progress" || r.status === "pending_verification"
  ).length;
  const approvedCount = mockOnboardingRequests.filter(
    (r) => r.status === "approved"
  ).length;
  const potentialMRR = mockOnboardingRequests
    .filter((r) => r.status !== "rejected")
    .reduce((sum, r) => sum + r.estimatedSpend, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Onboarding</h1>
          <p className="text-muted-foreground">
            Review and process new tenant applications
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Manual Onboard
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manual Tenant Onboarding</DialogTitle>
              <DialogDescription>
                Create a new tenant account manually
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" placeholder="Acme Corporation" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">Contact Name</Label>
                <Input id="contact" placeholder="John Doe" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@acme.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan">Initial Plan</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Internal notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>
                Create Tenant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting initial review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <ArrowRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved (30d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Ready to provision</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential MRR</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${potentialMRR.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From pending tenants</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="pending_verification">Pending Verification</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Onboarding Table */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Requests</CardTitle>
          <CardDescription>
            New tenant applications and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Est. Spend</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => {
                const StatusIcon = statusConfig[request.status as keyof typeof statusConfig].icon;
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{request.companyName}</p>
                          <p className="text-xs text-muted-foreground">{request.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        <Badge
                          variant={
                            statusConfig[request.status as keyof typeof statusConfig]
                              .color as any
                          }
                        >
                          {statusConfig[request.status as keyof typeof statusConfig].label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          planConfig[request.requestedPlan as keyof typeof planConfig]
                            .color as any
                        }
                      >
                        {planConfig[request.requestedPlan as keyof typeof planConfig].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        ${request.estimatedSpend.toLocaleString()}/mo
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {request.source.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      {request.assignedTo || (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(request.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Contact
                          </DropdownMenuItem>
                          <DropdownMenuItem>Assign to Me</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {request.status === "pending_review" && (
                            <>
                              <DropdownMenuItem className="text-green-600">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
