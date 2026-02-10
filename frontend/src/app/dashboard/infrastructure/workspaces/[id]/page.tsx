"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Server,
  Network,
  Shield,
  Lock,
  Unlock,
  RefreshCw,
  Loader2,
  Monitor,
  Globe,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/lib/mdc/hooks";
import { VirtualMachine, VirtualNetwork } from "@/lib/mdc/types";

const DEMO_VMS: VirtualMachine[] = [
  {
    index: 0,
    name: "web-server",
    status: "Running",
    networkAdapters: [
      { name: "eth0", isDisconnected: false, macAddress: "00:15:5d:01:01:00" },
    ],
  },
  {
    index: 1,
    name: "db-server",
    status: "Running",
    networkAdapters: [
      { name: "eth0", isDisconnected: false, macAddress: "00:15:5d:01:01:01" },
    ],
  },
  {
    index: 2,
    name: "worker",
    status: "Stopped",
    networkAdapters: [
      { name: "eth0", isDisconnected: true, macAddress: "00:15:5d:01:01:02" },
    ],
  },
];

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  const lower = status.toLowerCase();
  if (lower === "running")
    return <Badge className="bg-green-600 hover:bg-green-600">Running</Badge>;
  if (lower === "stopped")
    return <Badge variant="secondary">Stopped</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const { data: workspace, isLoading, isError, refetch } =
    useWorkspace(workspaceId);

  const realVMs = workspace?.virtualMachines || [];
  const useDemo = realVMs.length === 0 && !isLoading;
  const vms = useDemo ? DEMO_VMS : realVMs;

  const networks = workspace?.virtualNetworks || [];
  const hasBastion = !!workspace?.bastion;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.push("/dashboard/infrastructure/workspaces")
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-7 w-48 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">
                  {workspace?.name || workspaceId}
                </h1>
                {workspace?.description && (
                  <p className="text-muted-foreground">
                    {workspace.description}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {isError && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Unable to load workspace details.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {!isError && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Virtual Machines
                </CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-bold">{vms.length}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bastion</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {hasBastion ? (
                      <Badge className="bg-green-600 hover:bg-green-600">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">None</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Networks</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-bold">{networks.length}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lock</CardTitle>
                {workspace?.locked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {workspace?.locked ? (
                      <Badge variant="destructive">Locked</Badge>
                    ) : (
                      <Badge variant="secondary">Unlocked</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* VM Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Virtual Machines</CardTitle>
                  <CardDescription>
                    Manage VMs and access consoles
                  </CardDescription>
                </div>
                {useDemo && (
                  <Badge
                    variant="outline"
                    className="border-amber-500 text-amber-600"
                  >
                    Demo data
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3"
                    >
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : vms.length === 0 ? (
                <div className="text-center py-8">
                  <Server className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">
                    No virtual machines
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    This workspace has no virtual machines yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Index</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Network Adapters</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vms.map((vm) => (
                      <TableRow key={vm.index}>
                        <TableCell className="font-mono text-sm">
                          {vm.index}
                        </TableCell>
                        <TableCell className="font-medium">{vm.name}</TableCell>
                        <TableCell>
                          <StatusBadge status={vm.status} />
                        </TableCell>
                        <TableCell>
                          {vm.networkAdapters && vm.networkAdapters.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {vm.networkAdapters.map((adapter) => (
                                <Badge
                                  key={adapter.name}
                                  variant={
                                    adapter.isDisconnected
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {adapter.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(
                                `/dashboard/infrastructure/workspaces/${workspaceId}/console?vm=${vm.index}`,
                                '_blank'
                              )
                            }
                          >
                            <Monitor className="mr-2 h-3 w-3" />
                            Console
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Bastion Card */}
          <Card>
            <CardHeader>
              <CardTitle>Bastion Host</CardTitle>
              <CardDescription>
                Secure gateway for console access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-between py-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ) : hasBastion ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {workspace!.bastion!.name || "Bastion"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Index: {workspace!.bastion!.index}
                      </p>
                    </div>
                    <StatusBadge status={workspace!.bastion!.status} />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/dashboard/infrastructure/workspaces/${workspaceId}/console?vm=bastion`,
                        '_blank'
                      )
                    }
                  >
                    <Monitor className="mr-2 h-3 w-3" />
                    Console
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground mt-2 text-sm">
                    No bastion host configured for this workspace.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Networks Card */}
          <Card>
            <CardHeader>
              <CardTitle>Virtual Networks</CardTitle>
              <CardDescription>
                Network configuration for this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="py-3">
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ))}
                </div>
              ) : networks.length === 0 ? (
                <div className="text-center py-6">
                  <Network className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground mt-2 text-sm">
                    No virtual networks in this workspace.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Index</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>VLAN Tag</TableHead>
                      <TableHead>Remote Network</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {networks.map((net) => (
                      <TableRow key={net.id}>
                        <TableCell className="font-mono text-sm">
                          {net.index}
                        </TableCell>
                        <TableCell className="font-medium">{net.name}</TableCell>
                        <TableCell>
                          {net.tag != null ? (
                            <Badge variant="outline">{net.tag}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {net.remoteNetworkId ? (
                            <span className="font-mono text-xs">
                              {net.remoteNetworkId}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
