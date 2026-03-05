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
  Server,
  Building2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useSites } from "@/lib/mdc/hooks";

export default function SitesPage() {
  const router = useRouter();
  const { data: sites, isLoading, isError, error, refetch } = useSites();

  // Calculate node stats
  const nodeStats = useMemo(() => {
    if (!sites) return { total: 0, online: 0, offline: 0 };
    const allNodes = sites.flatMap((s) => s.nodes || []);
    return {
      total: allNodes.length,
      online: allNodes.filter((n) => n.online).length,
      offline: allNodes.filter((n) => !n.online).length,
    };
  }, [sites]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading sites...</p>
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
              Failed to Load Sites
            </CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred while loading sites"}
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

  if (!sites || sites.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sites</h1>
            <p className="text-muted-foreground">Infrastructure locations and compute nodes</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Sites Available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Sites are physical or virtual locations containing compute nodes.
              Contact your administrator to add sites.
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
          <h1 className="text-3xl font-bold">Sites</h1>
          <p className="text-muted-foreground">
            {sites.length} site{sites.length !== 1 ? "s" : ""} with {nodeStats.total} compute node
            {nodeStats.total !== 1 ? "s" : ""}
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
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sites.length}</div>
            <p className="text-xs text-muted-foreground">Infrastructure locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodeStats.total}</div>
            <p className="text-xs text-muted-foreground">Compute hosts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{nodeStats.online}</div>
            <p className="text-xs text-muted-foreground">Healthy nodes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{nodeStats.offline}</div>
            <p className="text-xs text-muted-foreground">Unavailable nodes</p>
          </CardContent>
        </Card>
      </div>

      {/* Sites list */}
      <Card>
        <CardHeader>
          <CardTitle>All Sites</CardTitle>
          <CardDescription>Click on a site to view details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Nodes</TableHead>
                <TableHead>Templates</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => {
                const onlineNodes = (site.nodes || []).filter((n) => n.online).length;
                const totalNodes = (site.nodes || []).length;
                const totalTemplates =
                  (site.gatewayTemplates?.length || 0) +
                  (site.virtualMachineTemplates?.length || 0);

                return (
                  <TableRow
                    key={site.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/infrastructure/sites/${site.id}`)}
                  >
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.description || "No description"}
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600">{onlineNodes}</span>
                      <span className="text-muted-foreground"> / {totalNodes}</span>
                    </TableCell>
                    <TableCell>{totalTemplates}</TableCell>
                    <TableCell>{site.workspaceIds?.length || 0}</TableCell>
                    <TableCell>
                      {onlineNodes > 0 ? (
                        <Badge variant="default" className="bg-green-500">
                          Online
                        </Badge>
                      ) : totalNodes > 0 ? (
                        <Badge variant="destructive">Offline</Badge>
                      ) : (
                        <Badge variant="secondary">No nodes</Badge>
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
