"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Network,
  Users,
  Globe,
  Shield,
  Settings,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Search } from "lucide-react";

// Mock ZeroTier networks
const mockZeroTierNetworks = [
  {
    id: "8056c2e21c000001",
    name: "Production Infrastructure",
    description: "Core production network for all datacenters",
    cidr: "10.147.17.0/24",
    memberCount: 48,
    onlineMembers: 45,
    private: true,
    flowRules: 12,
    createdAt: "2023-06-01T00:00:00Z",
  },
  {
    id: "8056c2e21c000002",
    name: "Management Network",
    description: "Secure management access for administrators",
    cidr: "10.147.18.0/24",
    memberCount: 12,
    onlineMembers: 8,
    private: true,
    flowRules: 8,
    createdAt: "2023-06-15T00:00:00Z",
  },
  {
    id: "8056c2e21c000003",
    name: "Development VPN",
    description: "Developer access to staging environments",
    cidr: "10.147.19.0/24",
    memberCount: 35,
    onlineMembers: 22,
    private: true,
    flowRules: 5,
    createdAt: "2023-08-01T00:00:00Z",
  },
  {
    id: "8056c2e21c000004",
    name: "Inter-DC Backbone",
    description: "High-speed link between datacenters",
    cidr: "10.147.20.0/24",
    memberCount: 8,
    onlineMembers: 8,
    private: true,
    flowRules: 3,
    createdAt: "2023-05-15T00:00:00Z",
  },
];

// Mock ZeroTier members
const mockZeroTierMembers = [
  {
    id: "abc123def456",
    name: "pve-node-east1-01",
    networkId: "8056c2e21c000001",
    ipAddress: "10.147.17.11",
    status: "online",
    authorized: true,
    lastSeen: "2024-03-15T10:30:00Z",
    version: "1.12.2",
  },
  {
    id: "abc123def457",
    name: "pve-node-east1-02",
    networkId: "8056c2e21c000001",
    ipAddress: "10.147.17.12",
    status: "online",
    authorized: true,
    lastSeen: "2024-03-15T10:29:00Z",
    version: "1.12.2",
  },
  {
    id: "abc123def458",
    name: "pve-node-west1-01",
    networkId: "8056c2e21c000001",
    ipAddress: "10.147.17.21",
    status: "online",
    authorized: true,
    lastSeen: "2024-03-15T10:28:00Z",
    version: "1.12.2",
  },
  {
    id: "abc123def459",
    name: "admin-workstation-01",
    networkId: "8056c2e21c000002",
    ipAddress: "10.147.18.100",
    status: "offline",
    authorized: true,
    lastSeen: "2024-03-14T18:00:00Z",
    version: "1.12.1",
  },
  {
    id: "abc123def460",
    name: "dev-laptop-sarah",
    networkId: "8056c2e21c000003",
    ipAddress: "10.147.19.50",
    status: "online",
    authorized: true,
    lastSeen: "2024-03-15T10:25:00Z",
    version: "1.12.2",
  },
  {
    id: "abc123def461",
    name: "unknown-device",
    networkId: "8056c2e21c000003",
    ipAddress: null,
    status: "pending",
    authorized: false,
    lastSeen: "2024-03-15T09:00:00Z",
    version: "1.12.0",
  },
];

export default function ZeroTierPage() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);

  const filteredMembers = mockZeroTierMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.id.includes(search);
    const matchesNetwork = !selectedNetwork || member.networkId === selectedNetwork;
    return matchesSearch && matchesNetwork;
  });

  const totalMembers = mockZeroTierMembers.length;
  const onlineMembers = mockZeroTierMembers.filter((m) => m.status === "online").length;
  const pendingMembers = mockZeroTierMembers.filter((m) => !m.authorized).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ZeroTier Networks</h1>
          <p className="text-muted-foreground">
            Manage software-defined networking overlay
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Network
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create ZeroTier Network</DialogTitle>
              <DialogDescription>
                Create a new virtual network overlay
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Network Name</Label>
                <Input id="name" placeholder="My Network" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Network description..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cidr">IP Range (CIDR)</Label>
                <Input id="cidr" placeholder="10.147.x.0/24" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Private Network</Label>
                  <p className="text-xs text-muted-foreground">Require authorization for new members</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Networks</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockZeroTierNetworks.length}</div>
            <p className="text-xs text-muted-foreground">Virtual networks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">{onlineMembers} online</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Auth</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMembers}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flow Rules</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockZeroTierNetworks.reduce((sum, n) => sum + n.flowRules, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Active rules</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="networks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="networks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {mockZeroTierNetworks.map((network) => (
              <Card key={network.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {network.name}
                        {network.private && (
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <CardDescription>{network.description}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </DropdownMenuItem>
                        <DropdownMenuItem>Flow Rules</DropdownMenuItem>
                        <DropdownMenuItem>View Members</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete Network
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                      {network.id}
                    </code>
                    <Button variant="ghost" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">IP Range</p>
                      <p className="font-mono">{network.cidr}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Members</p>
                      <p>
                        <span className="text-green-500">{network.onlineMembers}</span>
                        /{network.memberCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Flow Rules</p>
                      <p>{network.flowRules}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedNetwork || ""}
              onChange={(e) => setSelectedNetwork(e.target.value || null)}
            >
              <option value="">All Networks</option>
              {mockZeroTierNetworks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Network Members</CardTitle>
              <CardDescription>Devices connected to ZeroTier networks</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const network = mockZeroTierNetworks.find(
                      (n) => n.id === member.networkId
                    );
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {member.id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {member.status === "online" ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : member.status === "offline" ? (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            <Badge
                              variant={
                                member.status === "online"
                                  ? "default"
                                  : member.status === "pending"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {member.status}
                            </Badge>
                            {!member.authorized && (
                              <Badge variant="destructive" className="text-xs">
                                Unauthorized
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {network?.name}
                        </TableCell>
                        <TableCell className="font-mono">
                          {member.ipAddress || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.version}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(member.lastSeen), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!member.authorized && (
                                <DropdownMenuItem className="text-green-600">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Authorize
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>Edit Name</DropdownMenuItem>
                              <DropdownMenuItem>Assign IP</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Remove Member
                              </DropdownMenuItem>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
