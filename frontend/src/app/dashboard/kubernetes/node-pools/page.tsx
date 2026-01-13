"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Server,
  Cpu,
  HardDrive,
  Activity,
  TrendingUp,
  TrendingDown,
  Settings,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import { mockK8sClusters } from "@/stores/mock-data";

// Extended node pool interface with more details
interface ExtendedNodePool {
  id: string;
  name: string;
  clusterId: string;
  clusterName: string;
  nodeCount: number;
  minNodes: number;
  maxNodes: number;
  machineType: string;
  status: "active" | "scaling" | "error" | "provisioning" | "deleting";
  autoScaling: boolean;
  diskSize: number;
  diskType: "ssd" | "standard";
  preemptible: boolean;
  labels: Record<string, string>;
  taints: { key: string; value: string; effect: string }[];
  cpuUsage: number;
  memoryUsage: number;
  zone: string;
  nodeVersion: string;
  createdAt: string;
  lastScaleTime?: string;
}

// Machine types available
const machineTypes = [
  { id: "standard-2x4", name: "Standard", vcpus: 2, memory: 4, price: 0.048 },
  { id: "standard-4x8", name: "Standard", vcpus: 4, memory: 8, price: 0.096 },
  { id: "standard-8x16", name: "Standard", vcpus: 8, memory: 16, price: 0.192 },
  { id: "highmem-4x16", name: "High Memory", vcpus: 4, memory: 16, price: 0.134 },
  { id: "highmem-8x32", name: "High Memory", vcpus: 8, memory: 32, price: 0.268 },
  { id: "highmem-16x64", name: "High Memory", vcpus: 16, memory: 64, price: 0.536 },
  { id: "highcpu-4x4", name: "High CPU", vcpus: 4, memory: 4, price: 0.085 },
  { id: "highcpu-8x8", name: "High CPU", vcpus: 8, memory: 8, price: 0.170 },
  { id: "highcpu-16x16", name: "High CPU", vcpus: 16, memory: 16, price: 0.340 },
];

// Mock extended node pools data
const mockNodePools: ExtendedNodePool[] = [
  {
    id: "np-001",
    name: "default-pool",
    clusterId: "k8s-001",
    clusterName: "prod-cluster-main",
    nodeCount: 3,
    minNodes: 2,
    maxNodes: 10,
    machineType: "standard-4x8",
    status: "active",
    autoScaling: true,
    diskSize: 100,
    diskType: "ssd",
    preemptible: false,
    labels: { environment: "production", tier: "general" },
    taints: [],
    cpuUsage: 67,
    memoryUsage: 72,
    zone: "us-east-1a",
    nodeVersion: "1.29.1",
    createdAt: "2024-01-20T08:00:00Z",
    lastScaleTime: "2024-03-15T14:30:00Z",
  },
  {
    id: "np-002",
    name: "high-memory",
    clusterId: "k8s-001",
    clusterName: "prod-cluster-main",
    nodeCount: 3,
    minNodes: 1,
    maxNodes: 5,
    machineType: "highmem-8x32",
    status: "active",
    autoScaling: true,
    diskSize: 200,
    diskType: "ssd",
    preemptible: false,
    labels: { environment: "production", tier: "memory-intensive" },
    taints: [{ key: "workload", value: "memory", effect: "NoSchedule" }],
    cpuUsage: 45,
    memoryUsage: 85,
    zone: "us-east-1b",
    nodeVersion: "1.29.1",
    createdAt: "2024-01-25T10:00:00Z",
    lastScaleTime: "2024-03-10T09:15:00Z",
  },
  {
    id: "np-003",
    name: "spot-workers",
    clusterId: "k8s-001",
    clusterName: "prod-cluster-main",
    nodeCount: 5,
    minNodes: 0,
    maxNodes: 20,
    machineType: "standard-4x8",
    status: "scaling",
    autoScaling: true,
    diskSize: 50,
    diskType: "standard",
    preemptible: true,
    labels: { environment: "production", tier: "batch" },
    taints: [{ key: "preemptible", value: "true", effect: "NoSchedule" }],
    cpuUsage: 82,
    memoryUsage: 58,
    zone: "us-east-1c",
    nodeVersion: "1.29.1",
    createdAt: "2024-02-01T14:00:00Z",
    lastScaleTime: "2024-03-18T11:45:00Z",
  },
  {
    id: "np-004",
    name: "default-pool",
    clusterId: "k8s-002",
    clusterName: "staging-cluster",
    nodeCount: 3,
    minNodes: 1,
    maxNodes: 5,
    machineType: "standard-2x4",
    status: "active",
    autoScaling: false,
    diskSize: 50,
    diskType: "ssd",
    preemptible: false,
    labels: { environment: "staging" },
    taints: [],
    cpuUsage: 35,
    memoryUsage: 42,
    zone: "us-east-1a",
    nodeVersion: "1.29.1",
    createdAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "np-005",
    name: "gpu-pool",
    clusterId: "k8s-001",
    clusterName: "prod-cluster-main",
    nodeCount: 2,
    minNodes: 1,
    maxNodes: 4,
    machineType: "highcpu-8x8",
    status: "active",
    autoScaling: true,
    diskSize: 200,
    diskType: "ssd",
    preemptible: false,
    labels: { environment: "production", tier: "ml-workloads" },
    taints: [{ key: "gpu", value: "true", effect: "NoSchedule" }],
    cpuUsage: 78,
    memoryUsage: 65,
    zone: "us-east-1a",
    nodeVersion: "1.29.1",
    createdAt: "2024-03-01T09:00:00Z",
    lastScaleTime: "2024-03-17T16:20:00Z",
  },
];

function getStatusBadge(status: ExtendedNodePool["status"]) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-0">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active
        </Badge>
      );
    case "scaling":
      return (
        <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 border-0">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Scaling
        </Badge>
      );
    case "provisioning":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-0">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Provisioning
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/25 border-0">
          <AlertCircle className="mr-1 h-3 w-3" />
          Error
        </Badge>
      );
    case "deleting":
      return (
        <Badge className="bg-gray-500/15 text-gray-700 hover:bg-gray-500/25 border-0">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Deleting
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getMachineTypeDetails(machineType: string) {
  const type = machineTypes.find((t) => t.id === machineType);
  if (!type) return { vcpus: 0, memory: 0, price: 0, name: "Unknown" };
  return type;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NodePoolsPage() {
  const { currentProject } = useAuthStore();
  const [nodePools, setNodePools] = useState<ExtendedNodePool[]>(mockNodePools);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<ExtendedNodePool | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string>("all");

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: "",
    clusterId: "",
    machineType: "standard-4x8",
    nodeCount: 3,
    minNodes: 1,
    maxNodes: 10,
    autoScaling: true,
    diskSize: 100,
    diskType: "ssd" as "ssd" | "standard",
    preemptible: false,
  });

  // Get available clusters
  const clusters = mockK8sClusters.filter((c) => c.projectId === currentProject?.id);

  // Filter node pools by cluster
  const filteredNodePools =
    selectedCluster === "all"
      ? nodePools.filter((np) =>
          clusters.some((c) => c.id === np.clusterId)
        )
      : nodePools.filter((np) => np.clusterId === selectedCluster);

  // Calculate totals
  const totalNodes = filteredNodePools.reduce((sum, np) => sum + np.nodeCount, 0);
  const totalVCPUs = filteredNodePools.reduce((sum, np) => {
    const type = getMachineTypeDetails(np.machineType);
    return sum + np.nodeCount * type.vcpus;
  }, 0);
  const totalMemory = filteredNodePools.reduce((sum, np) => {
    const type = getMachineTypeDetails(np.machineType);
    return sum + np.nodeCount * type.memory;
  }, 0);
  const avgCpuUsage =
    filteredNodePools.length > 0
      ? Math.round(
          filteredNodePools.reduce((sum, np) => sum + np.cpuUsage, 0) /
            filteredNodePools.length
        )
      : 0;

  const handleCreatePool = () => {
    const newPool: ExtendedNodePool = {
      id: `np-${Date.now()}`,
      name: formData.name,
      clusterId: formData.clusterId,
      clusterName: clusters.find((c) => c.id === formData.clusterId)?.name || "",
      nodeCount: formData.nodeCount,
      minNodes: formData.minNodes,
      maxNodes: formData.maxNodes,
      machineType: formData.machineType,
      status: "provisioning",
      autoScaling: formData.autoScaling,
      diskSize: formData.diskSize,
      diskType: formData.diskType,
      preemptible: formData.preemptible,
      labels: {},
      taints: [],
      cpuUsage: 0,
      memoryUsage: 0,
      zone: "us-east-1a",
      nodeVersion: "1.29.1",
      createdAt: new Date().toISOString(),
    };
    setNodePools([...nodePools, newPool]);
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleEditPool = () => {
    if (!selectedPool) return;
    setNodePools(
      nodePools.map((np) =>
        np.id === selectedPool.id
          ? {
              ...np,
              minNodes: formData.minNodes,
              maxNodes: formData.maxNodes,
              autoScaling: formData.autoScaling,
            }
          : np
      )
    );
    setEditDialogOpen(false);
    setSelectedPool(null);
    resetForm();
  };

  const handleScalePool = (newCount: number) => {
    if (!selectedPool) return;
    setNodePools(
      nodePools.map((np) =>
        np.id === selectedPool.id
          ? { ...np, nodeCount: newCount, status: "scaling" as const }
          : np
      )
    );
    setScaleDialogOpen(false);
    setSelectedPool(null);
  };

  const handleDeletePool = (poolId: string) => {
    setNodePools(
      nodePools.map((np) =>
        np.id === poolId ? { ...np, status: "deleting" as const } : np
      )
    );
    // Simulate deletion
    setTimeout(() => {
      setNodePools((prev) => prev.filter((np) => np.id !== poolId));
    }, 2000);
  };

  const openEditDialog = (pool: ExtendedNodePool) => {
    setSelectedPool(pool);
    setFormData({
      name: pool.name,
      clusterId: pool.clusterId,
      machineType: pool.machineType,
      nodeCount: pool.nodeCount,
      minNodes: pool.minNodes,
      maxNodes: pool.maxNodes,
      autoScaling: pool.autoScaling,
      diskSize: pool.diskSize,
      diskType: pool.diskType,
      preemptible: pool.preemptible,
    });
    setEditDialogOpen(true);
  };

  const openScaleDialog = (pool: ExtendedNodePool) => {
    setSelectedPool(pool);
    setFormData((prev) => ({ ...prev, nodeCount: pool.nodeCount }));
    setScaleDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      clusterId: "",
      machineType: "standard-4x8",
      nodeCount: 3,
      minNodes: 1,
      maxNodes: 10,
      autoScaling: true,
      diskSize: 100,
      diskType: "ssd",
      preemptible: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Node Pools</h1>
          <p className="text-muted-foreground">
            Manage Kubernetes node pools across your clusters
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Node Pool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Node Pool</DialogTitle>
              <DialogDescription>
                Add a new node pool to your Kubernetes cluster
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Node Pool Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., worker-pool"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cluster">Cluster</Label>
                  <Select
                    value={formData.clusterId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clusterId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cluster" />
                    </SelectTrigger>
                    <SelectContent>
                      {clusters.map((cluster) => (
                        <SelectItem key={cluster.id} value={cluster.id}>
                          {cluster.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Machine Type</Label>
                <Select
                  value={formData.machineType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, machineType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {machineTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>
                            {type.name} - {type.vcpus} vCPUs, {type.memory} GB RAM
                          </span>
                          <span className="text-muted-foreground ml-2">
                            ${type.price}/hr
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Disk Size (GB)</Label>
                  <Input
                    type="number"
                    min={20}
                    max={1000}
                    value={formData.diskSize}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        diskSize: parseInt(e.target.value) || 100,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Disk Type</Label>
                  <Select
                    value={formData.diskType}
                    onValueChange={(value: "ssd" | "standard") =>
                      setFormData({ ...formData, diskType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ssd">SSD (Recommended)</SelectItem>
                      <SelectItem value="standard">Standard HDD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-scaling</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically adjust the number of nodes based on demand
                    </p>
                  </div>
                  <Switch
                    checked={formData.autoScaling}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, autoScaling: checked })
                    }
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Initial Nodes</Label>
                    <Input
                      type="number"
                      min={formData.minNodes}
                      max={formData.maxNodes}
                      value={formData.nodeCount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nodeCount: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Nodes</Label>
                    <Input
                      type="number"
                      min={0}
                      max={formData.maxNodes}
                      value={formData.minNodes}
                      disabled={!formData.autoScaling}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minNodes: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Nodes</Label>
                    <Input
                      type="number"
                      min={formData.minNodes}
                      max={100}
                      value={formData.maxNodes}
                      disabled={!formData.autoScaling}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxNodes: parseInt(e.target.value) || 10,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Preemptible / Spot Nodes</Label>
                  <p className="text-sm text-muted-foreground">
                    Use preemptible VMs for significant cost savings (up to 80%
                    off)
                  </p>
                </div>
                <Switch
                  checked={formData.preemptible}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, preemptible: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePool}
                disabled={!formData.name || !formData.clusterId}
              >
                Create Node Pool
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNodes}</div>
            <p className="text-xs text-muted-foreground">
              Across {filteredNodePools.length} pools
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total vCPUs</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVCPUs}</div>
            <p className="text-xs text-muted-foreground">
              {avgCpuUsage}% avg utilization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Memory</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMemory} GB</div>
            <p className="text-xs text-muted-foreground">RAM allocated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-scaling</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredNodePools.filter((np) => np.autoScaling).length}/
              {filteredNodePools.length}
            </div>
            <p className="text-xs text-muted-foreground">Pools with auto-scaling</p>
          </CardContent>
        </Card>
      </div>

      {/* Cluster Filter */}
      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium">Filter by Cluster:</Label>
        <Select value={selectedCluster} onValueChange={setSelectedCluster}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Clusters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clusters</SelectItem>
            {clusters.map((cluster) => (
              <SelectItem key={cluster.id} value={cluster.id}>
                {cluster.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Node Pools Table */}
      {filteredNodePools.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No node pools</h3>
            <p className="text-muted-foreground text-center mb-4">
              {selectedCluster === "all"
                ? "Create your first node pool to get started"
                : "No node pools found for this cluster"}
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Node Pool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Node Pools</CardTitle>
            <CardDescription>
              Manage compute resources for your Kubernetes workloads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead>Auto-scaling</TableHead>
                  <TableHead>Resource Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNodePools.map((pool) => {
                  const machineDetails = getMachineTypeDetails(pool.machineType);
                  return (
                    <TableRow key={pool.id}>
                      <TableCell>
                        <div className="font-medium">{pool.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {pool.zone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{pool.clusterName}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(pool.status)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{pool.nodeCount}</div>
                        {pool.autoScaling && (
                          <div className="text-xs text-muted-foreground">
                            {pool.minNodes}-{pool.maxNodes} range
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {machineDetails.vcpus} vCPUs, {machineDetails.memory} GB
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pool.diskSize} GB {pool.diskType.toUpperCase()}
                          {pool.preemptible && " (Spot)"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {pool.autoScaling ? (
                          <Badge variant="outline" className="bg-blue-500/10">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Pause className="mr-1 h-3 w-3" />
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-32">
                          <div className="flex items-center justify-between text-xs">
                            <span>CPU</span>
                            <span>{pool.cpuUsage}%</span>
                          </div>
                          <Progress value={pool.cpuUsage} className="h-1" />
                          <div className="flex items-center justify-between text-xs">
                            <span>Memory</span>
                            <span>{pool.memoryUsage}%</span>
                          </div>
                          <Progress value={pool.memoryUsage} className="h-1" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openScaleDialog(pool)}
                              disabled={pool.status !== "active"}
                            >
                              <TrendingUp className="mr-2 h-4 w-4" />
                              Scale
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(pool)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Edit Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Upgrade Nodes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeletePool(pool.id)}
                              disabled={pool.status === "deleting"}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node Pool</DialogTitle>
            <DialogDescription>
              Update auto-scaling settings for {selectedPool?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-scaling</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically adjust nodes based on demand
                </p>
              </div>
              <Switch
                checked={formData.autoScaling}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoScaling: checked })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Nodes</Label>
                <Input
                  type="number"
                  min={0}
                  max={formData.maxNodes}
                  value={formData.minNodes}
                  disabled={!formData.autoScaling}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minNodes: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Nodes</Label>
                <Input
                  type="number"
                  min={formData.minNodes}
                  max={100}
                  value={formData.maxNodes}
                  disabled={!formData.autoScaling}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxNodes: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPool}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scale Dialog */}
      <Dialog open={scaleDialogOpen} onOpenChange={setScaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scale Node Pool</DialogTitle>
            <DialogDescription>
              Adjust the number of nodes in {selectedPool?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Nodes</span>
                <Badge variant="outline">{selectedPool?.nodeCount}</Badge>
              </div>
              <div className="space-y-2">
                <Label>New Node Count: {formData.nodeCount}</Label>
                <Slider
                  value={[formData.nodeCount]}
                  onValueChange={(value) =>
                    setFormData({ ...formData, nodeCount: value[0] })
                  }
                  min={selectedPool?.autoScaling ? selectedPool.minNodes : 1}
                  max={selectedPool?.autoScaling ? selectedPool.maxNodes : 100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Min: {selectedPool?.autoScaling ? selectedPool.minNodes : 1}
                  </span>
                  <span>
                    Max:{" "}
                    {selectedPool?.autoScaling ? selectedPool.maxNodes : 100}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium">Impact Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Node Change:</span>
                <span
                  className={
                    formData.nodeCount > (selectedPool?.nodeCount || 0)
                      ? "text-green-600"
                      : formData.nodeCount < (selectedPool?.nodeCount || 0)
                      ? "text-red-600"
                      : ""
                  }
                >
                  {formData.nodeCount > (selectedPool?.nodeCount || 0)
                    ? `+${formData.nodeCount - (selectedPool?.nodeCount || 0)}`
                    : formData.nodeCount - (selectedPool?.nodeCount || 0)}{" "}
                  nodes
                </span>
                <span className="text-muted-foreground">Estimated Time:</span>
                <span>~5-10 minutes</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScaleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleScalePool(formData.nodeCount)}
              disabled={formData.nodeCount === selectedPool?.nodeCount}
            >
              {formData.nodeCount > (selectedPool?.nodeCount || 0) ? (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Scale Up
                </>
              ) : (
                <>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Scale Down
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
