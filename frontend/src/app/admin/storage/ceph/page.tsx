"use client";

import { useState } from "react";
import {
  HardDrive,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  MoreHorizontal,
  Database,
  Gauge,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock Ceph clusters
const cephClusters = [
  {
    id: "ceph-001",
    name: "ceph-east-primary",
    datacenter: "US-East Primary",
    status: "HEALTH_OK",
    version: "18.2.0 (Reef)",
    mons: 3,
    mgrs: 2,
    osds: 48,
    osdsUp: 48,
    osdsIn: 48,
    pgs: 256,
    pgActive: 256,
    totalCapacity: 480000,
    usedCapacity: 312000,
    availableCapacity: 168000,
    iops: 45200,
    throughput: 2.8,
    pools: 8,
    objects: 15420000,
  },
  {
    id: "ceph-002",
    name: "ceph-west-primary",
    datacenter: "US-West Primary",
    status: "HEALTH_WARN",
    statusDetail: "1 OSD near full",
    version: "18.2.0 (Reef)",
    mons: 3,
    mgrs: 2,
    osds: 36,
    osdsUp: 36,
    osdsIn: 36,
    pgs: 192,
    pgActive: 192,
    totalCapacity: 360000,
    usedCapacity: 288000,
    availableCapacity: 72000,
    iops: 32100,
    throughput: 2.1,
    pools: 6,
    objects: 10890000,
  },
  {
    id: "ceph-003",
    name: "ceph-eu-primary",
    datacenter: "EU-West Primary",
    status: "HEALTH_OK",
    version: "18.1.2 (Reef)",
    mons: 3,
    mgrs: 2,
    osds: 24,
    osdsUp: 24,
    osdsIn: 24,
    pgs: 128,
    pgActive: 128,
    totalCapacity: 240000,
    usedCapacity: 120000,
    availableCapacity: 120000,
    iops: 18500,
    throughput: 1.4,
    pools: 5,
    objects: 5230000,
  },
];

// Mock OSDs
const mockOSDs = [
  { id: 0, name: "osd.0", host: "ceph-node-01", status: "up", weight: 1.0, reweight: 1.0, size: 10000, used: 6500, utilization: 65, class: "ssd" },
  { id: 1, name: "osd.1", host: "ceph-node-01", status: "up", weight: 1.0, reweight: 1.0, size: 10000, used: 7200, utilization: 72, class: "ssd" },
  { id: 2, name: "osd.2", host: "ceph-node-02", status: "up", weight: 1.0, reweight: 1.0, size: 10000, used: 5800, utilization: 58, class: "ssd" },
  { id: 3, name: "osd.3", host: "ceph-node-02", status: "up", weight: 1.0, reweight: 1.0, size: 10000, used: 8900, utilization: 89, class: "ssd" },
  { id: 4, name: "osd.4", host: "ceph-node-03", status: "down", weight: 1.0, reweight: 0, size: 10000, used: 0, utilization: 0, class: "ssd" },
];

const statusConfig = {
  HEALTH_OK: { icon: CheckCircle, color: "text-green-500", variant: "default" as const },
  HEALTH_WARN: { icon: AlertTriangle, color: "text-yellow-500", variant: "secondary" as const },
  HEALTH_ERR: { icon: XCircle, color: "text-red-500", variant: "destructive" as const },
};

export default function CephPage() {
  const [selectedCluster, setSelectedCluster] = useState(cephClusters[0].id);

  const totalCapacity = cephClusters.reduce((sum, c) => sum + c.totalCapacity, 0);
  const usedCapacity = cephClusters.reduce((sum, c) => sum + c.usedCapacity, 0);
  const totalOSDs = cephClusters.reduce((sum, c) => sum + c.osds, 0);
  const totalIOPS = cephClusters.reduce((sum, c) => sum + c.iops, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ceph Clusters</h1>
          <p className="text-muted-foreground">
            Distributed storage cluster management
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Status
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalCapacity / 1000).toFixed(0)} TB</div>
            <Progress value={(usedCapacity / totalCapacity) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((usedCapacity / totalCapacity) * 100)}% used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total OSDs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOSDs}</div>
            <p className="text-xs text-muted-foreground">
              {cephClusters.reduce((sum, c) => sum + c.osdsUp, 0)} up, {cephClusters.reduce((sum, c) => sum + c.osdsIn, 0)} in
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IOPS</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalIOPS / 1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground">Across all clusters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cluster Health</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cephClusters.filter((c) => c.status === "HEALTH_OK").length}/{cephClusters.length}
            </div>
            <p className="text-xs text-muted-foreground">Clusters healthy</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clusters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clusters">Clusters</TabsTrigger>
          <TabsTrigger value="osds">OSDs</TabsTrigger>
        </TabsList>

        <TabsContent value="clusters" className="space-y-4">
          <div className="grid gap-4">
            {cephClusters.map((cluster) => {
              const StatusIcon = statusConfig[cluster.status as keyof typeof statusConfig].icon;
              const usagePercent = Math.round((cluster.usedCapacity / cluster.totalCapacity) * 100);

              return (
                <Card key={cluster.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Database className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {cluster.name}
                            <Badge
                              variant={statusConfig[cluster.status as keyof typeof statusConfig].variant}
                              className="flex items-center gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {cluster.status.replace("HEALTH_", "")}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {cluster.datacenter} | {cluster.version}
                            {cluster.statusDetail && (
                              <span className="text-yellow-500 ml-2">- {cluster.statusDetail}</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem>View Dashboard</DropdownMenuItem>
                          <DropdownMenuItem>Health Details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Scrub All</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-5">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Storage</p>
                        <Progress value={usagePercent} className={usagePercent > 80 ? "[&>div]:bg-red-500" : ""} />
                        <p className="text-sm">
                          {(cluster.usedCapacity / 1000).toFixed(0)} / {(cluster.totalCapacity / 1000).toFixed(0)} TB
                          <span className="text-muted-foreground ml-1">({usagePercent}%)</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">MONs / MGRs</p>
                        <p className="text-xl font-medium">{cluster.mons} / {cluster.mgrs}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">OSDs (up/in)</p>
                        <p className="text-xl font-medium">
                          {cluster.osdsUp}/{cluster.osdsIn}/{cluster.osds}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">IOPS / Throughput</p>
                        <p className="text-xl font-medium">
                          {(cluster.iops / 1000).toFixed(1)}K / {cluster.throughput} GB/s
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pools / Objects</p>
                        <p className="text-xl font-medium">
                          {cluster.pools} / {(cluster.objects / 1000000).toFixed(1)}M
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="osds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OSD Status</CardTitle>
              <CardDescription>Object Storage Daemon status across clusters</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OSD</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOSDs.map((osd) => (
                    <TableRow key={osd.id}>
                      <TableCell className="font-medium">{osd.name}</TableCell>
                      <TableCell className="text-muted-foreground">{osd.host}</TableCell>
                      <TableCell>
                        <Badge variant={osd.status === "up" ? "default" : "destructive"}>
                          {osd.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{osd.class}</Badge>
                      </TableCell>
                      <TableCell>{osd.weight.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="w-24 space-y-1">
                          <Progress
                            value={osd.utilization}
                            className={osd.utilization > 85 ? "[&>div]:bg-red-500" : osd.utilization > 70 ? "[&>div]:bg-yellow-500" : ""}
                          />
                          <p className="text-xs text-muted-foreground">{osd.utilization}%</p>
                        </div>
                      </TableCell>
                      <TableCell>{(osd.size / 1000).toFixed(0)} TB</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Reweight</DropdownMenuItem>
                            <DropdownMenuItem>Mark Out</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Remove OSD
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
