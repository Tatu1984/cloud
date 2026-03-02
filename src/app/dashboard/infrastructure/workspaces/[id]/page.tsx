"use client";

import { useState } from "react";
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
  Globe,
  Plus,
  X,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ConsoleOpenButton } from "@/components/console-open-button";
import { useWorkspace, useSite, useOrganization, useUpdateWorkspaceDescriptor, useLockWorkspace } from "@/lib/mdc/hooks";
import {
  VirtualMachine,
  VirtualNetwork,
  VirtualMachineDescriptorOperation,
} from "@/lib/mdc/types";

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
  const { toast } = useToast();
  const workspaceId = params.id as string;

  const { data: workspace, isLoading, isFetching, isError, refetch } =
    useWorkspace(workspaceId, { staleTime: 0 });

  // Fetch site to get available VM templates and site name
  const { data: site } = useSite(workspace?.siteId || "", {
    enabled: !!workspace?.siteId,
  });
  const availableTemplates = site?.virtualMachineTemplates || [];

  // Fetch organization to get organization name
  const { data: organization } = useOrganization(workspace?.organizationId || "", {
    enabled: !!workspace?.organizationId,
  });

  const updateDescriptor = useUpdateWorkspaceDescriptor();
  const lockWorkspace = useLockWorkspace();

  const handleToggleLock = async () => {
    if (!workspace) return;
    const newLocked = !workspace.locked;
    try {
      await lockWorkspace.mutateAsync({ workspaceId, locked: newLocked });
      toast({
        title: newLocked ? "Workspace locked" : "Workspace unlocked",
        description: `"${workspace.name}" has been ${newLocked ? "locked" : "unlocked"}.`,
      });
    } catch {
      toast({
        title: "Action failed",
        description: `Could not ${newLocked ? "lock" : "unlock"} "${workspace.name}".`,
        variant: "destructive",
      });
    }
  };

  // Create VM dialog state
  const [createVMOpen, setCreateVMOpen] = useState(false);
  const [vmName, setVmName] = useState("");
  const [vmTemplateName, setVmTemplateName] = useState("");
  const [vmCpuCores, setVmCpuCores] = useState("2");
  const [vmMemoryMB, setVmMemoryMB] = useState("2048");

  const resetVMForm = () => {
    setVmName("");
    setVmTemplateName("");
    setVmCpuCores("2");
    setVmMemoryMB("2048");
  };

  const handleCreateVM = async () => {
    if (!vmName.trim() || !vmTemplateName.trim()) {
      toast({
        title: "Validation Error",
        description: "VM name and template are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDescriptor.mutateAsync({
        workspaceId,
        delta: {
          virtualMachines: [
            {
              name: vmName.trim(),
              templateName: vmTemplateName.trim(),
              cpuCores: parseInt(vmCpuCores),
              memoryMB: vmMemoryMB,
              operation: VirtualMachineDescriptorOperation.Add,
            },
          ],
        },
      });

      toast({
        title: "VM created",
        description: `Virtual machine "${vmName}" is being provisioned.`,
      });
      setCreateVMOpen(false);
      resetVMForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create VM";
      toast({
        title: "Error creating VM",
        description: `${message}. Ensure the template exists on the site and the site node is online.`,
        variant: "destructive",
      });
    }
  };

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
        <div className="flex items-center gap-2">
          {!isLoading && workspace && (
            <Button
              variant="outline"
              onClick={handleToggleLock}
              disabled={lockWorkspace.isPending}
            >
              {lockWorkspace.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : workspace.locked ? (
                <Unlock className="mr-2 h-4 w-4" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {workspace.locked ? "Unlock" : "Lock"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
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
                <CardTitle className="text-sm font-medium">Workspace Lock</CardTitle>
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
                      <Badge variant="secondary">Locked</Badge>
                    ) : (
                      <Badge variant="secondary">Unlocked</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Workspace information</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Site</dt>
                  <dd className="mt-1 font-medium">
                    {isLoading ? <Skeleton className="h-4 w-24" /> : (site?.name || workspace?.siteId || "—")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Organization</dt>
                  <dd className="mt-1 font-medium">
                    {isLoading ? <Skeleton className="h-4 w-24" /> : (organization?.name || workspace?.organizationId || "—")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created At</dt>
                  <dd className="mt-1 font-medium">
                    {isLoading ? <Skeleton className="h-4 w-32" /> : (workspace?.createdAt ? new Date(workspace.createdAt).toLocaleString() : "—")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Updated At</dt>
                  <dd className="mt-1 font-medium">
                    {isLoading ? <Skeleton className="h-4 w-32" /> : (workspace?.updatedAt ? new Date(workspace.updatedAt).toLocaleString() : "—")}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

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
                <div className="flex items-center gap-2">
                  {useDemo && (
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-amber-600"
                    >
                      Demo data
                    </Badge>
                  )}
                  <Dialog open={createVMOpen} onOpenChange={(open) => {
                    setCreateVMOpen(open);
                    if (!open) resetVMForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create VM
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Create Virtual Machine</DialogTitle>
                        <DialogDescription>
                          Add a new VM to workspace &quot;{workspace?.name}&quot;
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="vm-name">Name</Label>
                          <Input
                            id="vm-name"
                            placeholder="e.g. web-server"
                            value={vmName}
                            onChange={(e) => setVmName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vm-template">Template</Label>
                          {availableTemplates.length > 0 ? (
                            <Select value={vmTemplateName} onValueChange={setVmTemplateName}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select template" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTemplates.map((t) => (
                                  <SelectItem key={`${t.name}-${t.revision}`} value={t.name}>
                                    {t.name} (rev {t.revision})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="vm-template"
                              placeholder="e.g. UbuntuDesktop"
                              value={vmTemplateName}
                              onChange={(e) => setVmTemplateName(e.target.value)}
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>CPU Cores</Label>
                            <Select value={vmCpuCores} onValueChange={setVmCpuCores}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 4, 8, 16].map((c) => (
                                  <SelectItem key={c} value={c.toString()}>
                                    {c} {c === 1 ? "core" : "cores"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Memory</Label>
                            <Select value={vmMemoryMB} onValueChange={setVmMemoryMB}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[
                                  { label: "512 MB", value: "512" },
                                  { label: "1 GB", value: "1024" },
                                  { label: "2 GB", value: "2048" },
                                  { label: "4 GB", value: "4096" },
                                  { label: "8 GB", value: "8192" },
                                  { label: "16 GB", value: "16384" },
                                ].map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCreateVMOpen(false);
                            resetVMForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateVM}
                          disabled={!vmName.trim() || !vmTemplateName.trim() || updateDescriptor.isPending}
                        >
                          {updateDescriptor.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          Create VM
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
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
                          <ConsoleOpenButton
                            variant="button"
                            workspaceId={workspaceId}
                            vm={String(vm.index)}
                          />
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
                  <ConsoleOpenButton
                    variant="button"
                    workspaceId={workspaceId}
                    vm="bastion"
                  />
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
