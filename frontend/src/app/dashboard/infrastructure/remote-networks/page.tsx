"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Globe,
  Network,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Shield,
  Router,
} from "lucide-react";
import { useRemoteNetworks, useWorkspaces, useSites } from "@/lib/mdc/hooks";
import { RemoteNetwork, RemoteNetworkMember } from "@/lib/mdc/types";
import { useToast } from "@/hooks/use-toast";

// Format date for display
function formatDate(dateStr?: string): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

// Format relative time
function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function RemoteNetworksPage() {
  const { toast } = useToast();
  const { data: networks, isLoading, isError, error, refetch } = useRemoteNetworks();
  const { data: workspaces } = useWorkspaces();
  const { data: sites } = useSites();
  const [selectedNetwork, setSelectedNetwork] = useState<RemoteNetwork | null>(null);

  // Calculate member stats
  const memberStats = useMemo(() => {
    if (!networks) return { total: 0, online: 0, authorized: 0 };
    const allMembers = networks.flatMap((n) => n.members || []);
    return {
      total: allMembers.length,
      online: allMembers.filter((m) => m.online).length,
      authorized: allMembers.filter((m) => m.authorized).length,
    };
  }, [networks]);

  // Get workspace name by ID
  const getWorkspaceName = (workspaceId: string): string => {
    return workspaces?.find((w) => w.id === workspaceId)?.name || "Unknown";
  };

  // Get site name by ID
  const getSiteName = (siteId: string): string => {
    return sites?.find((s) => s.id === siteId)?.name || "Unknown";
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading remote networks...</p>
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
              Failed to Load Networks
            </CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred while loading networks"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!networks || networks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Remote Networks</h1>
            <p className="text-muted-foreground">ZeroTier overlay networks for secure connectivity</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Remote Networks</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Remote networks are automatically created when you enable remote access on a workspace
              virtual network. Create a workspace with remote network enabled to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Remote Networks</h1>
          <p className="text-muted-foreground">
            {networks.length} network{networks.length !== 1 ? "s" : ""} with {memberStats.total}{" "}
            member{memberStats.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Networks</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networks.length}</div>
            <p className="text-xs text-muted-foreground">ZeroTier networks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberStats.total}</div>
            <p className="text-xs text-muted-foreground">Connected devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{memberStats.online}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authorized</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{memberStats.authorized}</div>
            <p className="text-xs text-muted-foreground">Approved members</p>
          </CardContent>
        </Card>
      </div>

      {/* Networks list */}
      <Card>
        <CardHeader>
          <CardTitle>All Networks</CardTitle>
          <CardDescription>Click on a network to view details and members</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / ID</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Online</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {networks.map((network) => {
                const onlineMembers = (network.members || []).filter((m) => m.online).length;
                const totalMembers = (network.members || []).length;

                return (
                  <TableRow
                    key={network.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedNetwork(network)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{network.name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{network.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getWorkspaceName(network.workspaceId)}</TableCell>
                    <TableCell>{getSiteName(network.siteId)}</TableCell>
                    <TableCell>{totalMembers}</TableCell>
                    <TableCell>
                      <span className="text-green-600">{onlineMembers}</span>
                      <span className="text-muted-foreground"> / {totalMembers}</span>
                    </TableCell>
                    <TableCell>
                      {onlineMembers > 0 ? (
                        <Badge variant="default" className="bg-green-500">
                          Active
                        </Badge>
                      ) : totalMembers > 0 ? (
                        <Badge variant="secondary">Idle</Badge>
                      ) : (
                        <Badge variant="outline">Empty</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Network Details Dialog */}
      <Dialog open={!!selectedNetwork} onOpenChange={() => setSelectedNetwork(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {selectedNetwork?.name || "Remote Network"}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span className="font-mono">{selectedNetwork?.id}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => copyToClipboard(selectedNetwork?.id || "", "Network ID")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="members" className="mt-4">
            <TabsList>
              <TabsTrigger value="members">
                Members ({selectedNetwork?.members?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="routes">Routes</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4">
              {selectedNetwork?.members && selectedNetwork.members.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>IP Addresses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Online</TableHead>
                      <TableHead>Latency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedNetwork.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{member.name || member.id}</p>
                            {member.description && (
                              <p className="text-xs text-muted-foreground">{member.description}</p>
                            )}
                            <p className="text-xs font-mono text-muted-foreground">{member.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {member.ipAddresses?.map((ip, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <code className="text-xs bg-muted px-1 rounded">{ip}</code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => copyToClipboard(ip, "IP")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {(!member.ipAddresses || member.ipAddresses.length === 0) && (
                              <span className="text-muted-foreground text-sm">No IP assigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {member.online ? (
                              <Badge variant="default" className="bg-green-500 w-fit">
                                Online
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="w-fit">
                                Offline
                              </Badge>
                            )}
                            {member.authorized ? (
                              <Badge variant="outline" className="w-fit text-blue-600">
                                Authorized
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="w-fit text-yellow-600">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(member.lastOnline)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.latency !== undefined ? (
                            <span className="text-sm">{member.latency}ms</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No members in this network</p>
                  <p className="text-sm mt-1">
                    Join this network using the network ID: {selectedNetwork?.id}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="routes" className="space-y-4">
              {/* IP Assignment Pools */}
              {selectedNetwork?.ipAssignmentPools &&
                selectedNetwork.ipAssignmentPools.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      IP Assignment Pools
                    </h4>
                    <div className="space-y-2">
                      {selectedNetwork.ipAssignmentPools.map((pool, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 rounded-lg border">
                          <code className="text-sm">
                            {pool.ipRangeStart} - {pool.ipRangeEnd}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Managed Routes */}
              {selectedNetwork?.managedRoutes &&
                selectedNetwork.managedRoutes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Router className="h-4 w-4" />
                      Managed Routes
                    </h4>
                    <div className="space-y-2">
                      {selectedNetwork.managedRoutes.map((route, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <code className="text-sm">{route.target}</code>
                          {route.via && (
                            <span className="text-sm text-muted-foreground">
                              via <code>{route.via}</code>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {!selectedNetwork?.ipAssignmentPools?.length &&
                !selectedNetwork?.managedRoutes?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Router className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No routes configured</p>
                  </div>
                )}
            </TabsContent>

            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Network ID</p>
                  <p className="font-mono text-sm">{selectedNetwork?.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Virtual Network ID</p>
                  <p className="font-mono text-sm">{selectedNetwork?.virtualNetworkId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Workspace</p>
                  <p className="font-medium">{getWorkspaceName(selectedNetwork?.workspaceId || "")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Site</p>
                  <p className="font-medium">{getSiteName(selectedNetwork?.siteId || "")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-2">How to Join</p>
                  <div className="bg-muted p-3 rounded-lg">
                    <code className="text-sm">zerotier-cli join {selectedNetwork?.id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() =>
                        copyToClipboard(
                          `zerotier-cli join ${selectedNetwork?.id}`,
                          "Join command"
                        )
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
