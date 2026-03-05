"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Server,
  Building2,
  Cpu,
  CheckCircle2,
  XCircle,
  FileBox,
  MemoryStick,
  HardDrive,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSite, useOrganizations, useDownloadableTemplates, useDownloadTemplate } from "@/lib/mdc/hooks";
import { Site, Template } from "@/lib/mdc/types";
import { useToast } from "@/hooks/use-toast";

function formatMemory(memory?: string): string {
  if (!memory) return "N/A";
  const mb = parseInt(memory, 10);
  if (isNaN(mb)) return memory;
  return mb >= 1024 ? `${Math.round(mb / 1024)} GB` : `${mb} MB`;
}

function getTotalStorage(storage?: { size?: number }[]): string {
  if (!storage || storage.length === 0) return "N/A";
  const total = storage.reduce((sum, s) => sum + (s.size || 0), 0);
  return total === 0 ? "N/A" : `${total} GB`;
}

function TemplatesTab({ site }: { site: Site }) {
  const { toast } = useToast();
  const { data: downloadable, isLoading: loadingDownloadable } = useDownloadableTemplates(site.id);
  const downloadMutation = useDownloadTemplate();

  const handleDownload = async (template: Template) => {
    try {
      await downloadMutation.mutateAsync({ siteId: site.id, descriptor: { digest: template.digest } });
      toast({ title: "Download started", description: `"${template.name}" is being downloaded to ${site.name}.` });
    } catch (err: unknown) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const hasLocalTemplates =
    (site.virtualMachineTemplates?.length || 0) + (site.gatewayTemplates?.length || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Downloadable Templates */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          Available to Download
          {loadingDownloadable && <Loader2 className="h-3 w-3 animate-spin" />}
        </h4>
        {downloadable && downloadable.length > 0 ? (
          <div className="space-y-2">
            {downloadable.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">v{t.revision}</Badge>
                  <Badge variant="secondary">{t.type}</Badge>
                  {t.downloaded && <Badge className="bg-green-500">Downloaded</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    {t.cores && <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{t.cores}</span>}
                    {t.memory && <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{formatMemory(t.memory)}</span>}
                  </span>
                  {!t.downloaded && (
                    <Button size="sm" variant="outline" onClick={() => handleDownload(t)} disabled={downloadMutation.isPending}>
                      {downloadMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Download"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !loadingDownloadable ? (
          <p className="text-sm text-muted-foreground">No templates available for download.</p>
        ) : null}
      </div>

      {/* Installed VM Templates */}
      {site.virtualMachineTemplates && site.virtualMachineTemplates.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Installed VM Templates</h4>
          <div className="space-y-2">
            {site.virtualMachineTemplates.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">v{t.revision}</Badge>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-2">
                  {t.cores && <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{t.cores}</span>}
                  {t.memory && <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{formatMemory(t.memory)}</span>}
                  {t.storage && <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{getTotalStorage(t.storage)}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gateway Templates */}
      {site.gatewayTemplates && site.gatewayTemplates.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Gateway Templates</h4>
          <div className="space-y-2">
            {site.gatewayTemplates.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="default">v{t.revision}</Badge>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-2">
                  {t.cores && <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{t.cores}</span>}
                  {t.memory && <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{formatMemory(t.memory)}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasLocalTemplates && (!downloadable || downloadable.length === 0) && !loadingDownloadable && (
        <div className="text-center py-8 text-muted-foreground">
          <FileBox className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No templates available for this site</p>
        </div>
      )}
    </div>
  );
}

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

  const { data: site, isLoading, isError, refetch, isFetching } = useSite(siteId);
  const { data: organizations } = useOrganizations();

  const getOrgName = (orgId: string) =>
    organizations?.find((o) => o.id === orgId)?.name || orgId;

  const onlineNodes = (site?.nodes || []).filter((n) => n.online).length;
  const totalNodes = (site?.nodes || []).length;
  const totalTemplates =
    (site?.virtualMachineTemplates?.length || 0) + (site?.gatewayTemplates?.length || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{site?.name ?? "Site"}</h1>
          )}
          <p className="text-sm text-muted-foreground font-mono">{siteId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Failed to load site
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {site && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalNodes}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{onlineNodes}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offline</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{totalNodes - onlineNodes}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <FileBox className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalTemplates}</div></CardContent>
            </Card>
          </div>

          {/* Info + Tabs */}
          <Tabs defaultValue="nodes">
            <TabsList>
              <TabsTrigger value="nodes">Nodes ({totalNodes})</TabsTrigger>
              <TabsTrigger value="templates">Templates ({totalTemplates})</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="nodes" className="mt-4 space-y-3">
              {site.nodes && site.nodes.length > 0 ? (
                site.nodes.map((node, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          {node.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {node.online ? (
                            <Badge className="bg-green-500">Online</Badge>
                          ) : (
                            <Badge variant="destructive">Offline</Badge>
                          )}
                          {node.authorized && <Badge variant="outline">Authorized</Badge>}
                          {node.configured && <Badge variant="secondary">Configured</Badge>}
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
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Server className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No nodes registered for this site</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="mt-4">
              <TemplatesTab site={site} />
            </TabsContent>

            <TabsContent value="info" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Site ID</dt>
                      <dd className="mt-1 font-mono text-sm break-all">{site.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Workspaces</dt>
                      <dd className="mt-1 font-medium">{site.workspaceIds?.length || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Description</dt>
                      <dd className="mt-1 text-sm">{site.description || <span className="italic text-muted-foreground">—</span>}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Organizations</dt>
                      <dd className="mt-1 flex flex-wrap gap-1">
                        {site.organizationIds?.length ? (
                          site.organizationIds.map((id) => (
                            <Badge key={id} variant="outline">{getOrgName(id)}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">None assigned</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
