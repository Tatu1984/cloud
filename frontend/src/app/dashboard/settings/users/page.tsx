"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Eye,
  Mail,
  Trash2,
  Clock,
  RefreshCw,
  X,
  Check,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserRole = "admin" | "member" | "viewer";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status: "active" | "inactive";
  lastActive: string;
  joinedAt: string;
  mfaEnabled: boolean;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: "pending" | "expired";
}

// Mock data
const teamMembers: TeamMember[] = [
  {
    id: "user-001",
    name: "John Smith",
    email: "john.smith@acme.com",
    role: "admin",
    status: "active",
    lastActive: "2026-01-12T10:30:00Z",
    joinedAt: "2024-01-01T00:00:00Z",
    mfaEnabled: true,
  },
  {
    id: "user-002",
    name: "Sarah Johnson",
    email: "sarah.johnson@acme.com",
    role: "admin",
    status: "active",
    lastActive: "2026-01-12T09:15:00Z",
    joinedAt: "2024-01-15T00:00:00Z",
    mfaEnabled: true,
  },
  {
    id: "user-003",
    name: "Mike Chen",
    email: "mike.chen@acme.com",
    role: "member",
    status: "active",
    lastActive: "2026-01-11T16:45:00Z",
    joinedAt: "2024-02-01T00:00:00Z",
    mfaEnabled: true,
  },
  {
    id: "user-004",
    name: "Emily Davis",
    email: "emily.davis@acme.com",
    role: "member",
    status: "active",
    lastActive: "2026-01-10T14:20:00Z",
    joinedAt: "2024-03-15T00:00:00Z",
    mfaEnabled: false,
  },
  {
    id: "user-005",
    name: "Alex Wilson",
    email: "alex.wilson@acme.com",
    role: "viewer",
    status: "inactive",
    lastActive: "2025-12-20T11:00:00Z",
    joinedAt: "2024-06-01T00:00:00Z",
    mfaEnabled: false,
  },
  {
    id: "user-006",
    name: "Lisa Brown",
    email: "lisa.brown@acme.com",
    role: "member",
    status: "active",
    lastActive: "2026-01-12T08:00:00Z",
    joinedAt: "2024-08-20T00:00:00Z",
    mfaEnabled: true,
  },
];

const pendingInvitations: PendingInvitation[] = [
  {
    id: "inv-001",
    email: "david.miller@acme.com",
    role: "member",
    invitedBy: "John Smith",
    invitedAt: "2026-01-10T14:00:00Z",
    expiresAt: "2026-01-17T14:00:00Z",
    status: "pending",
  },
  {
    id: "inv-002",
    email: "jennifer.taylor@acme.com",
    role: "viewer",
    invitedBy: "Sarah Johnson",
    invitedAt: "2026-01-08T09:00:00Z",
    expiresAt: "2026-01-15T09:00:00Z",
    status: "pending",
  },
  {
    id: "inv-003",
    email: "expired.user@acme.com",
    role: "member",
    invitedBy: "John Smith",
    invitedAt: "2025-12-25T10:00:00Z",
    expiresAt: "2026-01-01T10:00:00Z",
    status: "expired",
  },
];

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string; description: string }> = {
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

const roleBadgeVariants: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  member: "secondary",
  viewer: "outline",
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [userToRemove, setUserToRemove] = useState<TeamMember | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState<string | null>(null);

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleInvite = async () => {
    setIsInviting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsInviting(false);
    setIsInviteDialogOpen(false);
    setInviteEmail("");
    setInviteRole("member");
  };

  const handleCopyInviteLink = (invitationId: string) => {
    navigator.clipboard.writeText(`https://cloudplatform.io/invite/${invitationId}`);
    setCopiedInviteLink(invitationId);
    setTimeout(() => setCopiedInviteLink(null), 2000);
  };

  const adminCount = teamMembers.filter((m) => m.role === "admin").length;
  const memberCount = teamMembers.filter((m) => m.role === "member").length;
  const viewerCount = teamMembers.filter((m) => m.role === "viewer").length;
  const activeCount = teamMembers.filter((m) => m.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users & Teams</h1>
          <p className="text-muted-foreground">
            Manage team members and their access permissions
          </p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleConfig).map(([role, config]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                          <div>
                            <span className="font-medium">{config.label}</span>
                            <p className="text-xs text-muted-foreground">
                              {config.description}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <h4 className="text-sm font-medium mb-2">Role Permissions</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {inviteRole === "admin" && (
                    <>
                      <p>- Full access to all organization resources</p>
                      <p>- Can invite and remove users</p>
                      <p>- Can modify billing and settings</p>
                      <p>- Can delete the organization</p>
                    </>
                  )}
                  {inviteRole === "member" && (
                    <>
                      <p>- Can create and manage resources</p>
                      <p>- Can view all organization resources</p>
                      <p>- Cannot invite or remove users</p>
                      <p>- Cannot modify billing or settings</p>
                    </>
                  )}
                  {inviteRole === "viewer" && (
                    <>
                      <p>- Read-only access to resources</p>
                      <p>- Cannot create or modify resources</p>
                      <p>- Cannot access sensitive data</p>
                      <p>- Cannot access billing information</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={!inviteEmail || isInviting}>
                <Mail className="mr-2 h-4 w-4" />
                {isInviting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCount} active, {teamMembers.length - activeCount} inactive
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

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">
            Team Members ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Pending Invitations ({pendingInvitations.filter((i) => i.status === "pending").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
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
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>MFA</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const roleInfo = roleConfig[member.role];
                    const RoleIcon = roleInfo.icon;

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>
                                {member.name.split(" ").map((n) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RoleIcon className={`h-4 w-4 ${roleInfo.color}`} />
                            <Badge variant={roleBadgeVariants[member.role]}>
                              {roleInfo.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                member.status === "active" ? "bg-green-500" : "bg-slate-400"
                              }`}
                            />
                            <span className="capitalize">{member.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(member.lastActive)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.mfaEnabled ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Disabled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>Edit Permissions</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Shield className="mr-2 h-4 w-4" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => setUserToRemove(member)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <p className="text-muted-foreground">No users found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Manage outstanding invitations to your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map((invitation) => {
                    const roleInfo = roleConfig[invitation.role];
                    const RoleIcon = roleInfo.icon;
                    const isExpired = invitation.status === "expired";

                    return (
                      <TableRow key={invitation.id} className={isExpired ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {invitation.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RoleIcon className={`h-4 w-4 ${roleInfo.color}`} />
                            <Badge variant={roleBadgeVariants[invitation.role]}>
                              {roleInfo.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{invitation.invitedBy}</TableCell>
                        <TableCell>
                          {formatRelativeTime(invitation.invitedAt)}
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {isExpired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!isExpired && (
                                <>
                                  <DropdownMenuItem onSelect={() => handleCopyInviteLink(invitation.id)}>
                                    {copiedInviteLink === invitation.id ? (
                                      <>
                                        <Check className="mr-2 h-4 w-4 text-green-500" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy Invite Link
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Resend Invitation
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {isExpired && (
                                <>
                                  <DropdownMenuItem>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Send New Invitation
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem className="text-destructive">
                                <X className="mr-2 h-4 w-4" />
                                {isExpired ? "Remove" : "Revoke Invitation"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pendingInvitations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <p className="text-muted-foreground">No pending invitations</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remove User Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{userToRemove?.name}</strong> from the
              organization? They will lose access to all resources immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
