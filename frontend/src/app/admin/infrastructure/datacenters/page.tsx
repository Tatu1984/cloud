"use client";

import { Plus, MoreHorizontal, Server, Activity, Cpu, MemoryStick, HardDrive, Wifi } from "lucide-react";
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
import { mockDatacenters } from "@/stores/mock-data";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

const chartConfig = {
  cpu: { label: "CPU", color: "hsl(var(--chart-1))" },
  memory: { label: "Memory", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

// Generate fake usage data
const generateUsageData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    cpu: 40 + Math.random() * 40,
    memory: 50 + Math.random() * 30,
  }));
};

export default function DatacentersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Datacenters</h1>
          <p className="text-muted-foreground">
            Manage physical datacenter infrastructure
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Register Datacenter
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Datacenters</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDatacenters.length}</div>
            <p className="text-xs text-muted-foreground">
              {mockDatacenters.filter((dc) => dc.status === "online").length} online
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockDatacenters.reduce((sum, dc) => sum + dc.totalNodes, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Physical servers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VMs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockDatacenters.reduce((sum, dc) => sum + dc.totalVMs, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Running instances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                mockDatacenters.reduce((sum, dc) => sum + dc.cpuUsage, 0) /
                  mockDatacenters.length
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground">Average CPU usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Datacenter Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {mockDatacenters.map((dc) => {
          const usageData = generateUsageData();
          return (
            <Card key={dc.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{dc.name}</CardTitle>
                    <Badge
                      variant={
                        dc.status === "online"
                          ? "default"
                          : dc.status === "maintenance"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {dc.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {dc.location} ({dc.region})
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Manage Clusters</DropdownMenuItem>
                    <DropdownMenuItem>Network Topology</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Schedule Maintenance</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resource Overview */}
                <div className="grid grid-cols-3 gap-4 text-center border rounded-lg p-4">
                  <div>
                    <p className="text-2xl font-bold">{dc.totalNodes}</p>
                    <p className="text-xs text-muted-foreground">Nodes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dc.totalVMs}</p>
                    <p className="text-xs text-muted-foreground">VMs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(dc.totalVMs / dc.totalNodes)}
                    </p>
                    <p className="text-xs text-muted-foreground">VMs/Node</p>
                  </div>
                </div>

                {/* Utilization Bars */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> CPU
                      </span>
                      <span className="font-medium">{dc.cpuUsage}%</span>
                    </div>
                    <Progress
                      value={dc.cpuUsage}
                      className={dc.cpuUsage > 80 ? "[&>div]:bg-red-500" : ""}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <MemoryStick className="h-3 w-3" /> Memory
                      </span>
                      <span className="font-medium">{dc.memoryUsage}%</span>
                    </div>
                    <Progress
                      value={dc.memoryUsage}
                      className={dc.memoryUsage > 80 ? "[&>div]:bg-red-500" : ""}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" /> Storage
                      </span>
                      <span className="font-medium">{dc.storageUsage}%</span>
                    </div>
                    <Progress value={dc.storageUsage} />
                  </div>
                </div>

                {/* Mini Chart */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">24h Resource Usage</p>
                  <ChartContainer config={chartConfig} className="h-[100px] w-full">
                    <AreaChart data={usageData}>
                      <defs>
                        <linearGradient id={`cpu-${dc.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="cpu"
                        stroke="hsl(var(--chart-1))"
                        fill={`url(#cpu-${dc.id})`}
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Wifi className="mr-2 h-4 w-4" />
                    Network
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Server className="mr-2 h-4 w-4" />
                    Clusters
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
