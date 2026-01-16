"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Thermometer,
  Zap,
  Clock,
  Network,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wrench,
  Power,
  RefreshCw,
  Terminal,
  Loader2,
  Trash2,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { mockPhysicalNodes, mockProxmoxClusters, PhysicalNode } from "@/stores/mock-data";
import { Search } from "lucide-react";

const statusConfig = {
  online: { icon: CheckCircle, color: "text-green-500", variant: "default" as const },
  offline: { icon: XCircle, color: "text-red-500", variant: "destructive" as const },
  maintenance: { icon: Wrench, color: "text-yellow-500", variant: "secondary" as const },
  error: { icon: AlertTriangle, color: "text-orange-500", variant: "destructive" as const },
};

function formatUptime(seconds: number): string {
  if (seconds === 0) return "Offline";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export default function NodesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dialog states
  const [nodeForConsole, setNodeForConsole] = useState<PhysicalNode | null>(null);
  const [nodeForIPMI, setNodeForIPMI] = useState<PhysicalNode | null>(null);
  const [nodeForVMs, setNodeForVMs] = useState<PhysicalNode | null>(null);
  const [nodeForMaintenance, setNodeForMaintenance] = useState<PhysicalNode | null>(null);
  const [nodeForPower, setNodeForPower] = useState<PhysicalNode | null>(null);
  const [nodeToRemove, setNodeToRemove] = useState<PhysicalNode | null>(null);
  const [addNodeOpen, setAddNodeOpen] = useState(false);

  // Form states
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeIP, setNewNodeIP] = useState("");
  const [newNodeCluster, setNewNodeCluster] = useState("");
  const [powerAction, setPowerAction] = useState("");

  const filteredNodes = mockPhysicalNodes.filter((node) => {
    const matchesSearch =
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.ipAddress.includes(search);
    const matchesStatus = statusFilter === "all" || node.status === statusFilter;
    const matchesCluster = clusterFilter === "all" || node.clusterId === clusterFilter;
    return matchesSearch && matchesStatus && matchesCluster;
  });

  const totalNodes = mockPhysicalNodes.length;
  const onlineNodes = mockPhysicalNodes.filter((n) => n.status === "online").length;
  const totalCores = mockPhysicalNodes.reduce((sum, n) => sum + n.cpuCores, 0);
  const totalMemory = mockPhysicalNodes.reduce((sum, n) => sum + n.totalMemory, 0);
  const totalPower = mockPhysicalNodes
    .filter((n) => n.status === "online")
    .reduce((sum, n) => sum + n.powerConsumption, 0);

  const handleRefreshAll = async () => {
    setIsLoading("refresh");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Nodes Refreshed",
      description: "All node data has been refreshed",
    });
  };

  const handleAddNode = async () => {
    if (!newNodeName || !newNodeIP || !newNodeCluster) return;
    setIsLoading("add");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Node Added",
      description: `${newNodeName} has been added to the cluster`,
    });
    setAddNodeOpen(false);
    setNewNodeName("");
    setNewNodeIP("");
    setNewNodeCluster("");
  };

  const handleMaintenance = async (enter: boolean) => {
    if (!nodeForMaintenance) return;
    setIsLoading("maintenance");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: enter ? "Entered Maintenance" : "Exited Maintenance",
      description: `${nodeForMaintenance.name} is ${enter ? "now in maintenance mode" : "back online"}`,
    });
    setNodeForMaintenance(null);
  };

  const handlePowerAction = async () => {
    if (!nodeForPower || !powerAction) return;
    setIsLoading("power");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Power Action Executed",
      description: `${powerAction} command sent to ${nodeForPower.name}`,
    });
    setNodeForPower(null);
    setPowerAction("");
  };

  const handleRemove = async () => {
    if (!nodeToRemove) return;
    setIsLoading("remove");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Node Removed",
      description: `${nodeToRemove.name} has been removed from the cluster`,
      variant: "destructive",
    });
    setNodeToRemove(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Physical Nodes</h1>
          <p className="text-muted-foreground">
            Manage physical server infrastructure
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={isLoading === "refresh"}
          >
            {isLoading === "refresh" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh All
          </Button>
          <Button onClick={() => setAddNodeOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Node
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNodes}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">{onlineNodes} online</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CPU Cores</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCores}</div>
            <p className="text-xs text-muted-foreground">Physical cores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Memory</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalMemory / 1024)} TB</div>
            <p className="text-xs text-muted-foreground">RAM capacity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Power Usage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalPower / 1000).toFixed(1)} kW</div>
            <p className="text-xs text-muted-foreground">Current draw</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running VMs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockPhysicalNodes.reduce((sum, n) => sum + n.vmsRunning, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Active instances</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clusterFilter} onValueChange={setClusterFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Cluster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clusters</SelectItem>
            {mockProxmoxClusters.map((cluster) => (
              <SelectItem key={cluster.id} value={cluster.id}>
                {cluster.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nodes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Nodes</CardTitle>
          <CardDescription>
            Physical servers across all Proxmox clusters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>VMs</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>Power</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNodes.map((node) => {
                const StatusIcon = statusConfig[node.status].icon;
                const memPercent = Math.round((node.usedMemory / node.totalMemory) * 100);

                return (
                  <TableRow key={node.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{node.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {node.model}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {node.ipAddress}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusConfig[node.status].color}`} />
                        <Badge variant={statusConfig[node.status].variant}>
                          {node.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {node.clusterName}
                    </TableCell>
                    <TableCell>
                      <div className="w-20 space-y-1">
                        <Progress
                          value={node.cpuUsage}
                          className={node.cpuUsage > 80 ? "[&>div]:bg-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          {node.cpuUsage}% ({node.cpuCores} cores)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-20 space-y-1">
                        <Progress
                          value={memPercent}
                          className={memPercent > 80 ? "[&>div]:bg-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          {node.usedMemory}/{node.totalMemory} GB
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{node.vmsRunning}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Thermometer
                          className={`h-4 w-4 ${
                            node.temperature > 60
                              ? "text-red-500"
                              : node.temperature > 45
                              ? "text-yellow-500"
                              : "text-green-500"
                          }`}
                        />
                        <span className={node.temperature > 60 ? "text-red-500 font-medium" : ""}>
                          {node.temperature > 0 ? `${node.temperature}°C` : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span>{node.powerConsumption > 0 ? `${node.powerConsumption}W` : "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatUptime(node.uptime)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setNodeForConsole(node)}>
                            <Terminal className="mr-2 h-4 w-4" />
                            SSH Console
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setNodeForIPMI(node)}>
                            <Network className="mr-2 h-4 w-4" />
                            IPMI Console
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setNodeForVMs(node)}>
                            <Server className="mr-2 h-4 w-4" />
                            View VMs
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {node.status === "online" ? (
                            <DropdownMenuItem onSelect={() => setNodeForMaintenance(node)}>
                              <Wrench className="mr-2 h-4 w-4" />
                              Enter Maintenance
                            </DropdownMenuItem>
                          ) : node.status === "maintenance" ? (
                            <DropdownMenuItem onSelect={() => setNodeForMaintenance(node)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Exit Maintenance
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onSelect={() => setNodeForPower(node)}>
                            <Power className="mr-2 h-4 w-4" />
                            Power Actions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setNodeToRemove(node)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove from Cluster
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

      {/* Add Node Dialog */}
      <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Node</DialogTitle>
            <DialogDescription>
              Add a new physical server to a Proxmox cluster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="node-name">Node Name</Label>
              <Input
                id="node-name"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="node-04"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-ip">IP Address</Label>
              <Input
                id="node-ip"
                value={newNodeIP}
                onChange={(e) => setNewNodeIP(e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label>Cluster</Label>
              <Select value={newNodeCluster} onValueChange={setNewNodeCluster}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cluster" />
                </SelectTrigger>
                <SelectContent>
                  {mockProxmoxClusters.map((cluster) => (
                    <SelectItem key={cluster.id} value={cluster.id}>
                      {cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNodeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNode}
              disabled={!newNodeName || !newNodeIP || !newNodeCluster || isLoading === "add"}
            >
              {isLoading === "add" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Node"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SSH Console Dialog */}
      <Dialog open={!!nodeForConsole} onOpenChange={() => setNodeForConsole(null)}>
        <DialogContent className="max-w-4xl h-[600px]">
          <DialogHeader>
            <DialogTitle>SSH Console - {nodeForConsole?.name}</DialogTitle>
            <DialogDescription>
              Terminal access to {nodeForConsole?.ipAddress}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-black rounded-lg p-4 font-mono text-green-400 text-sm overflow-auto h-[450px]">
            <div>$ ssh root@{nodeForConsole?.ipAddress}</div>
            <div className="mt-2">Last login: {new Date().toLocaleString()}</div>
            <div className="mt-2">
              <span className="text-blue-400">root@{nodeForConsole?.name}</span>
              <span className="text-white">:~# </span>
              <span className="animate-pulse">_</span>
            </div>
            <div className="mt-4 text-muted-foreground text-xs">
              Note: This is a simulated console. In production, this would connect to an actual SSH session.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* IPMI Console Dialog */}
      <Dialog open={!!nodeForIPMI} onOpenChange={() => setNodeForIPMI(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>IPMI Console</DialogTitle>
            <DialogDescription>
              Out-of-band management for {nodeForIPMI?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">IPMI IP</span>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  {nodeForIPMI?.ipAddress.replace(/\.\d+$/, ".254")}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="default">Connected</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline">Power Status</Button>
              <Button variant="outline">SOL Console</Button>
              <Button variant="outline">Sensor Data</Button>
              <Button variant="outline">Event Logs</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeForIPMI(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View VMs Dialog */}
      <Dialog open={!!nodeForVMs} onOpenChange={() => setNodeForVMs(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>VMs on {nodeForVMs?.name}</DialogTitle>
            <DialogDescription>
              {nodeForVMs?.vmsRunning} virtual machines running
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
            {Array.from({ length: nodeForVMs?.vmsRunning || 0 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">vm-{100 + i}</p>
                    <p className="text-xs text-muted-foreground">2 vCPU / 4GB RAM</p>
                  </div>
                </div>
                <Badge variant="default">Running</Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeForVMs(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Mode Confirmation */}
      <AlertDialog open={!!nodeForMaintenance} onOpenChange={() => setNodeForMaintenance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {nodeForMaintenance?.status === "online" ? "Enter Maintenance Mode?" : "Exit Maintenance Mode?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {nodeForMaintenance?.status === "online"
                ? `This will migrate all VMs off ${nodeForMaintenance?.name} and prevent new VMs from being scheduled.`
                : `This will bring ${nodeForMaintenance?.name} back online and allow VMs to be scheduled.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleMaintenance(nodeForMaintenance?.status === "online")}
              disabled={isLoading === "maintenance"}
            >
              {isLoading === "maintenance" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : nodeForMaintenance?.status === "online" ? (
                "Enter Maintenance"
              ) : (
                "Exit Maintenance"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Power Actions Dialog */}
      <Dialog open={!!nodeForPower} onOpenChange={() => setNodeForPower(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Power Actions</DialogTitle>
            <DialogDescription>
              Control power state for {nodeForPower?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={powerAction} onValueChange={setPowerAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restart">Restart (Graceful)</SelectItem>
                  <SelectItem value="shutdown">Shutdown (Graceful)</SelectItem>
                  <SelectItem value="power-cycle">Power Cycle (Hard)</SelectItem>
                  <SelectItem value="power-off">Power Off (Hard)</SelectItem>
                  <SelectItem value="power-on">Power On</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Warning:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Hard power actions may cause data loss</li>
                <li>VMs will be affected by node power changes</li>
                <li>Consider entering maintenance mode first</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeForPower(null)}>
              Cancel
            </Button>
            <Button
              onClick={handlePowerAction}
              disabled={!powerAction || isLoading === "power"}
              variant={powerAction?.includes("power-off") ? "destructive" : "default"}
            >
              {isLoading === "power" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                "Execute"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Cluster Confirmation */}
      <AlertDialog open={!!nodeToRemove} onOpenChange={() => setNodeToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Node from Cluster?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{nodeToRemove?.name}</strong> from the cluster?
              All VMs must be migrated off this node first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading === "remove"}
            >
              {isLoading === "remove" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Node"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
