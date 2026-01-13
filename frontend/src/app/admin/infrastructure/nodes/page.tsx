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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { mockPhysicalNodes, mockProxmoxClusters } from "@/stores/mock-data";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");

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
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
          <Button>
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
                          <DropdownMenuItem>
                            <Terminal className="mr-2 h-4 w-4" />
                            SSH Console
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Network className="mr-2 h-4 w-4" />
                            IPMI Console
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Server className="mr-2 h-4 w-4" />
                            View VMs
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {node.status === "online" ? (
                            <DropdownMenuItem>
                              <Wrench className="mr-2 h-4 w-4" />
                              Enter Maintenance
                            </DropdownMenuItem>
                          ) : node.status === "maintenance" ? (
                            <DropdownMenuItem>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Exit Maintenance
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem>
                            <Power className="mr-2 h-4 w-4" />
                            Power Actions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
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
    </div>
  );
}
