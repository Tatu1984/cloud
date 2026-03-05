"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Loader2,
  AlertCircle,
  RefreshCw,
  Globe,
  Users,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { useRemoteNetworks, useWorkspaces, useSites } from "@/lib/mdc/hooks";

export default function RemoteNetworksPage() {
  const router = useRouter();
  const { data: networks, isLoading, isError, error, refetch } = useRemoteNetworks();
  const { data: workspaces } = useWorkspaces();
  const { data: sites } = useSites();

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
                    onClick={() => router.push(`/dashboard/infrastructure/remote-networks/${network.id}`)}
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

    </div>
  );
}
