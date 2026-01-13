"use client";

import Link from "next/link";
import { Plus, MoreHorizontal, ExternalLink, ArrowUpRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import { mockK8sClusters } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";

export default function KubernetesClustersPage() {
  const { currentProject } = useAuthStore();
  const clusters = mockK8sClusters.filter((c) => c.projectId === currentProject?.id);

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
                    {cluster.name}
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
                    <DropdownMenuItem>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Download Kubeconfig
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Upgrade Version
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
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
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {cluster.endpoint?.replace("https://", "")}
                    </code>
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
                  <Button variant="outline" size="sm" className="flex-1">
                    Open Dashboard
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Get Kubeconfig
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
