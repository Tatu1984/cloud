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
  Server,
  Building2,
  Cpu,
  CheckCircle2,
  XCircle,
  FileBox,
  MemoryStick,
  HardDrive,
} from "lucide-react";
import { useSites, useOrganizations, useDownloadableTemplates, useDownloadTemplate } from "@/lib/mdc/hooks";
import { Site, SiteNode, VirtualMachineTemplate, Template } from "@/lib/mdc/types";
import { useToast } from "@/hooks/use-toast";

// Format memory string
function formatMemory(memory?: string): string {
  if (!memory) return "N/A";
  const mb = parseInt(memory, 10);
  if (isNaN(mb)) return memory;
  if (mb >= 1024) {
    return `${Math.round(mb / 1024)} GB`;
  }
  return `${mb} MB`;
}

// Calculate total storage
function getTotalStorage(storage?: { size?: number }[]): string {
  if (!storage || storage.length === 0) return "N/A";
  const total = storage.reduce((sum, s) => sum + (s.size || 0), 0);
  if (total === 0) return "N/A";
  return `${total} GB`;
}

function SiteTemplatesTab({ site }: { site: Site }) {
  const { toast } = useToast();
  const { data: downloadable, isLoading: loadingDownloadable } = useDownloadableTemplates(site.id);
  const downloadMutation = useDownloadTemplate();

  const hasLocalTemplates =
    (site.virtualMachineTemplates?.length || 0) +
    (site.bastionTemplates?.length || 0) +
    (site.gatewayTemplates?.length || 0) > 0;

  const handleDownload = async (template: Template) => {
    try {
      await downloadMutation.mutateAsync({
        siteId: site.id,
        descriptor: { digest: template.digest },
      });
      toast({
        title: "Template download started",
        description: `"${template.name}" is being downloaded to ${site.name}.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to download template";
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Downloadable Templates */}
      <div>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          Available Templates
          {loadingDownloadable && <Loader2 className="h-3 w-3 animate-spin" />}
        </h4>
        {downloadable && downloadable.length > 0 ? (
          <div className="grid gap-2">
            {downloadable.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">v{t.revision}</Badge>
                  <Badge variant="secondary">{t.type}</Badge>
                  {t.downloaded && (
                    <Badge className="bg-green-500">Downloaded</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {t.cores && (
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        {t.cores}
                      </span>
                    )}
                    {t.memory && (
                      <span className="flex items-center gap-1">
                        <MemoryStick className="h-3 w-3" />
                        {formatMemory(t.memory)}
                      </span>
                    )}
                  </div>
                  {!t.downloaded && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(t)}
                      disabled={downloadMutation.isPending}
                    >
                      {downloadMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Download"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !loadingDownloadable ? (
          <p className="text-sm text-muted-foreground">
            No templates available for download. Templates must be published to the registry first.
          </p>
        ) : null}
      </div>

      {/* Installed VM Templates */}
      {site.virtualMachineTemplates && site.virtualMachineTemplates.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Installed VM Templates</h4>
          <div className="grid gap-2">
            {site.virtualMachineTemplates.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">v{t.revision}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {t.cores && (
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {t.cores}
                    </span>
                  )}
                  {t.memory && (
                    <span className="flex items-center gap-1">
                      <MemoryStick className="h-3 w-3" />
                      {formatMemory(t.memory)}
                    </span>
                  )}
                  {t.storage && (
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {getTotalStorage(t.storage)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bastion Templates */}
      {site.bastionTemplates && site.bastionTemplates.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Bastion Templates</h4>
          <div className="grid gap-2">
            {site.bastionTemplates.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="secondary">v{t.revision}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {t.cores && (
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {t.cores}
                    </span>
                  )}
                  {t.memory && (
                    <span className="flex items-center gap-1">
                      <MemoryStick className="h-3 w-3" />
                      {formatMemory(t.memory)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gateway Templates */}
      {site.gatewayTemplates && site.gatewayTemplates.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Gateway Templates</h4>
          <div className="grid gap-2">
            {site.gatewayTemplates.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="default">v{t.revision}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {t.cores && (
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {t.cores}
                    </span>
                  )}
                  {t.memory && (
                    <span className="flex items-center gap-1">
                      <MemoryStick className="h-3 w-3" />
                      {formatMemory(t.memory)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasLocalTemplates && (!downloadable || downloadable.length === 0) && !loadingDownloadable && (
        <div className="text-center py-8 text-muted-foreground">
          <FileBox className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No templates available for this site</p>
          <p className="text-xs mt-1">Templates need to be published to the registry and downloaded to sites.</p>
        </div>
      )}
    </div>
  );
}

export default function SitesPage() {
  const { data: sites, isLoading, isError, error, refetch } = useSites();
  const { data: organizations } = useOrganizations();
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

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

  // Get organization name by ID
  const getOrgName = (orgId: string): string => {
    return organizations?.find((o) => o.id === orgId)?.name || "Unknown";
  };

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
                  (site.bastionTemplates?.length || 0) +
                  (site.virtualMachineTemplates?.length || 0);

                return (
                  <TableRow
                    key={site.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedSite(site)}
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

      {/* Site Details Dialog */}
      <Dialog open={!!selectedSite} onOpenChange={() => setSelectedSite(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedSite?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedSite?.description || "No description provided"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="nodes" className="mt-4">
            <TabsList>
              <TabsTrigger value="nodes">
                Nodes ({selectedSite?.nodes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="templates">
                Templates (
                {(selectedSite?.virtualMachineTemplates?.length || 0) +
                  (selectedSite?.bastionTemplates?.length || 0) +
                  (selectedSite?.gatewayTemplates?.length || 0)}
                )
              </TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="nodes" className="space-y-4">
              {selectedSite?.nodes && selectedSite.nodes.length > 0 ? (
                <div className="space-y-3">
                  {selectedSite.nodes.map((node, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            {node.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            {node.online ? (
                              <Badge variant="default" className="bg-green-500">
                                Online
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Offline</Badge>
                            )}
                            {node.authorized && (
                              <Badge variant="outline">Authorized</Badge>
                            )}
                            {node.configured && (
                              <Badge variant="secondary">Configured</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {node.cpuInfo && (
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">CPU Model</p>
                              <p className="font-medium">{node.cpuInfo.model}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Sockets</p>
                              <p className="font-medium">{node.cpuInfo.sockets}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Cores</p>
                              <p className="font-medium">{node.cpuInfo.cores}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">MHz</p>
                              <p className="font-medium">{node.cpuInfo.mhz}</p>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No nodes registered for this site</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              {selectedSite && <SiteTemplatesTab site={selectedSite} />}
            </TabsContent>

            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Site ID</p>
                  <p className="font-mono text-sm">{selectedSite?.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Workspaces</p>
                  <p className="font-medium">{selectedSite?.workspaceIds?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organizations</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedSite?.organizationIds?.map((orgId) => (
                      <Badge key={orgId} variant="outline">
                        {getOrgName(orgId)}
                      </Badge>
                    ))}
                    {!selectedSite?.organizationIds?.length && (
                      <span className="text-muted-foreground">None assigned</span>
                    )}
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
