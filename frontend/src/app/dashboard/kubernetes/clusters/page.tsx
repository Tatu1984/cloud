"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, ExternalLink, RefreshCw, Download, Trash2, Loader2, Copy, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { mockK8sClusters } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import { KubernetesCluster } from "@/types";

export default function KubernetesClustersPage() {
  const { currentProject } = useAuthStore();
  const { toast } = useToast();
  const clusters = mockK8sClusters.filter((c) => c.projectId === currentProject?.id);

  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dialog states
  const [clusterForDetails, setClusterForDetails] = useState<KubernetesCluster | null>(null);
  const [clusterForKubeconfig, setClusterForKubeconfig] = useState<KubernetesCluster | null>(null);
  const [clusterToUpgrade, setClusterToUpgrade] = useState<KubernetesCluster | null>(null);
  const [clusterToDelete, setClusterToDelete] = useState<KubernetesCluster | null>(null);

  // Form states
  const [newVersion, setNewVersion] = useState("");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleDownloadKubeconfig = async (cluster: KubernetesCluster) => {
    setIsLoading(`kubeconfig-${cluster.id}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate downloading a kubeconfig file
    const kubeconfigContent = `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: ${cluster.endpoint}
    certificate-authority-data: LS0tLS1...
  name: ${cluster.name}
contexts:
- context:
    cluster: ${cluster.name}
    user: ${cluster.name}-admin
  name: ${cluster.name}
current-context: ${cluster.name}
users:
- name: ${cluster.name}-admin
  user:
    token: <your-token-here>`;

    const blob = new Blob([kubeconfigContent], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kubeconfig-${cluster.name}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsLoading(null);
    toast({
      title: "Kubeconfig Downloaded",
      description: `Kubeconfig for ${cluster.name} has been downloaded`,
    });
  };

  const handleUpgrade = async () => {
    if (!clusterToUpgrade || !newVersion) return;
    setIsLoading("upgrade");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsLoading(null);
    toast({
      title: "Upgrade Started",
      description: `Cluster ${clusterToUpgrade.name} is being upgraded to Kubernetes ${newVersion}`,
    });
    setClusterToUpgrade(null);
    setNewVersion("");
  };

  const handleDelete = async () => {
    if (!clusterToDelete || deleteConfirmName !== clusterToDelete.name) return;
    setIsLoading("delete");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Cluster Deleted",
      description: `Cluster ${clusterToDelete.name} has been deleted`,
      variant: "destructive",
    });
    setClusterToDelete(null);
    setDeleteConfirmName("");
  };

  const handleOpenDashboard = (cluster: KubernetesCluster) => {
    toast({
      title: "Opening Dashboard",
      description: `Kubernetes dashboard for ${cluster.name} will open in a new tab`,
    });
    // In a real app, this would open the actual K8s dashboard
    window.open(`https://dashboard.${cluster.name}.k8s.local`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kubernetes Clusters</h1>
          <p className="text-muted-foreground">
            Manage your managed Kubernetes clusters
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/kubernetes/clusters/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Cluster
          </Link>
        </Button>
      </div>

      {clusters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-1">No Kubernetes clusters</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first Kubernetes cluster
            </p>
            <Button asChild>
              <Link href="/dashboard/kubernetes/clusters/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Cluster
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clusters.map((cluster) => (
            <Card key={cluster.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <button
                      onClick={() => setClusterForDetails(cluster)}
                      className="hover:underline"
                    >
                      {cluster.name}
                    </button>
                    <Badge
                      variant={cluster.status === "running" ? "default" : "secondary"}
                    >
                      {cluster.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Kubernetes {cluster.version} / {cluster.region}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setClusterForDetails(cluster)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadKubeconfig(cluster)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Kubeconfig
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setClusterToUpgrade(cluster);
                      setNewVersion("");
                    }}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Upgrade Version
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setClusterToDelete(cluster)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Cluster
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{cluster.nodeCount}</p>
                    <p className="text-xs text-muted-foreground">Nodes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{cluster.nodePools.length}</p>
                    <p className="text-xs text-muted-foreground">Node Pools</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {cluster.nodePools.reduce((sum, np) => sum + np.nodeCount * 4, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total vCPUs</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">API Endpoint</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {cluster.endpoint?.replace("https://", "")}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => cluster.endpoint && copyToClipboard(cluster.endpoint, "API Endpoint")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Node Pools</h4>
                  {cluster.nodePools.map((pool) => (
                    <div
                      key={pool.id}
                      className="flex items-center justify-between text-sm border rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium">{pool.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pool.machineType} / {pool.nodeCount} nodes
                        </p>
                      </div>
                      <Badge variant="outline">{pool.status}</Badge>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDashboard(cluster)}
                  >
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Open Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownloadKubeconfig(cluster)}
                    disabled={isLoading === `kubeconfig-${cluster.id}`}
                  >
                    {isLoading === `kubeconfig-${cluster.id}` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Get Kubeconfig
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cluster Details Dialog */}
      <Dialog open={!!clusterForDetails} onOpenChange={() => setClusterForDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {clusterForDetails?.name}
              <Badge variant={clusterForDetails?.status === "running" ? "default" : "secondary"}>
                {clusterForDetails?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Kubernetes {clusterForDetails?.version} - {clusterForDetails?.region}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="nodes">Node Pools</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={clusterForDetails?.status === "running" ? "default" : "secondary"}>
                    {clusterForDetails?.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="font-medium">Kubernetes {clusterForDetails?.version}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Nodes</p>
                  <p className="font-medium">{clusterForDetails?.nodeCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Node Pools</p>
                  <p className="font-medium">{clusterForDetails?.nodePools.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Region</p>
                  <p className="font-medium">{clusterForDetails?.region}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {clusterForDetails?.createdAt ? new Date(clusterForDetails.createdAt).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="nodes" className="space-y-4">
              {clusterForDetails?.nodePools.map((pool) => (
                <div key={pool.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{pool.name}</h4>
                    <Badge variant="outline">{pool.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Machine Type</p>
                      <p>{pool.machineType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Node Count</p>
                      <p>{pool.nodeCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Autoscaling</p>
                      <p>{pool.minNodes} - {pool.maxNodes} nodes</p>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="access" className="space-y-4">
              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <div className="flex gap-2">
                  <Input value={clusterForDetails?.endpoint || ""} readOnly />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => clusterForDetails?.endpoint && copyToClipboard(clusterForDetails.endpoint, "API Endpoint")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={() => clusterForDetails && handleDownloadKubeconfig(clusterForDetails)}>
                <Download className="mr-2 h-4 w-4" />
                Download Kubeconfig
              </Button>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClusterForDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Version Dialog */}
      <Dialog open={!!clusterToUpgrade} onOpenChange={() => setClusterToUpgrade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Kubernetes Version</DialogTitle>
            <DialogDescription>
              Upgrade {clusterToUpgrade?.name} to a newer Kubernetes version
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Version</Label>
              <p className="font-medium">Kubernetes {clusterToUpgrade?.version}</p>
            </div>
            <div className="space-y-2">
              <Label>New Version</Label>
              <Select value={newVersion} onValueChange={setNewVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.29">Kubernetes 1.29 (Latest)</SelectItem>
                  <SelectItem value="1.28">Kubernetes 1.28</SelectItem>
                  <SelectItem value="1.27">Kubernetes 1.27</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Upgrade Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Control plane will be upgraded first</li>
                <li>Node pools will be upgraded with rolling updates</li>
                <li>Workloads may experience brief disruptions</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClusterToUpgrade(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade} disabled={!newVersion || isLoading === "upgrade"}>
              {isLoading === "upgrade" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upgrading...
                </>
              ) : (
                "Start Upgrade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Cluster Dialog */}
      <AlertDialog open={!!clusterToDelete} onOpenChange={() => {
        setClusterToDelete(null);
        setDeleteConfirmName("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Kubernetes Cluster?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>{clusterToDelete?.name}</strong>?
                This action cannot be undone.
              </p>
              <p>
                All node pools, workloads, and data will be permanently deleted.
              </p>
              <div className="pt-4">
                <Label>Type the cluster name to confirm:</Label>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={clusterToDelete?.name}
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmName !== clusterToDelete?.name || isLoading === "delete"}
            >
              {isLoading === "delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Cluster"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
