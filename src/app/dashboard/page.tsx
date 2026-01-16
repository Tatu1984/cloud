"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Server,
  Container,
  HardDrive,
  Database,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowUpRight,
  Network,
  Globe,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { mockVMs, mockK8sClusters, mockVolumes, mockDatabases, billingData, cpuMetrics } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useMDCDashboard, useWorkspaces, useSites, useRemoteNetworks } from "@/lib/mdc/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  value: {
    label: "Usage",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { organization, currentProject } = useAuthStore();

  // MicroDataCluster data
  const { data: mdcData, isLoading: mdcLoading, isError: mdcError, refetchAll } = useMDCDashboard();

  const projectVMs = mockVMs.filter((vm) => vm.projectId === currentProject?.id);
  const runningVMs = projectVMs.filter((vm) => vm.status === "running").length;
  const totalVCPUs = projectVMs.reduce((sum, vm) => sum + vm.vcpus, 0);
  const totalMemory = projectVMs.reduce((sum, vm) => sum + vm.memory, 0);
  const totalStorage = mockVolumes
    .filter((v) => v.projectId === currentProject?.id)
    .reduce((sum, v) => sum + v.size, 0);

  const chartData = cpuMetrics.slice(-12).map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString("en-US", { hour: "2-digit" }),
    value: Math.round(m.value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your {currentProject?.name} project.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/compute/vms/create">
              <Plus className="mr-2 h-4 w-4" />
              Create VM
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Virtual Machines</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectVMs.length}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{runningVMs} running</span>
              {projectVMs.length - runningVMs > 0 && (
                <span className="text-yellow-600 ml-2">
                  {projectVMs.length - runningVMs} stopped
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kubernetes Clusters</CardTitle>
            <Container className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockK8sClusters.filter((c) => c.projectId === currentProject?.id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {mockK8sClusters
                .filter((c) => c.projectId === currentProject?.id)
                .reduce((sum, c) => sum + c.nodeCount, 0)}{" "}
              total nodes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStorage} GB</div>
            <p className="text-xs text-muted-foreground">
              Across {mockVolumes.filter((v) => v.projectId === currentProject?.id).length} volumes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${billingData.currentMonthTotal.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
              <span className="text-green-600">+7.2%</span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage Chart */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
            <CardDescription>CPU utilization across all VMs over the last 12 hours</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--chart-1))"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Resource Allocation</CardTitle>
            <CardDescription>Current project resource usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">vCPUs</span>
                  <span className="font-medium">{totalVCPUs} / 128</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(totalVCPUs / 128) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Memory</span>
                  <span className="font-medium">{totalMemory} GB / 512 GB</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${(totalMemory / 512) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Storage</span>
                  <span className="font-medium">{totalStorage} GB / 5000 GB</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${(totalStorage / 5000) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Public IPs</span>
                  <span className="font-medium">4 / 10</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: "40%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent VMs & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Virtual Machines</CardTitle>
              <CardDescription>Latest VMs in your project</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/compute/vms">
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectVMs.slice(0, 5).map((vm) => (
                <div key={vm.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        vm.status === "running"
                          ? "bg-green-500"
                          : vm.status === "stopped"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium leading-none">{vm.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {vm.vcpus} vCPU / {vm.memory} GB RAM
                      </p>
                    </div>
                  </div>
                  <Badge variant={vm.status === "running" ? "default" : "secondary"}>
                    {vm.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/compute/vms/create">
                  <Server className="mr-2 h-4 w-4" />
                  Create Virtual Machine
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/kubernetes/clusters/create">
                  <Container className="mr-2 h-4 w-4" />
                  Create Kubernetes Cluster
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/storage/volumes/create">
                  <HardDrive className="mr-2 h-4 w-4" />
                  Create Block Volume
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/databases/postgresql/create">
                  <Database className="mr-2 h-4 w-4" />
                  Create Database
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/observability/metrics">
                  <Activity className="mr-2 h-4 w-4" />
                  View Metrics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MicroDataCluster Infrastructure */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">MicroDataCluster Infrastructure</h2>
            <p className="text-sm text-muted-foreground">Real-time data from MicroDataCluster API</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchAll()} disabled={mdcLoading}>
            {mdcLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* MDC Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{mdcData?.workspaces.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {mdcData?.totalVMs || 0} total VMs
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sites</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{mdcData?.sites.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">{mdcData?.onlineNodes || 0}</span>
                    <span className="text-muted-foreground"> / {mdcData?.totalNodes || 0} nodes online</span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remote Networks</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{mdcData?.remoteNetworks.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">{mdcData?.onlineMembers || 0}</span>
                    <span className="text-muted-foreground"> / {mdcData?.totalMembers || 0} members online</span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Container className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{mdcData?.organizations.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {mdcData?.organizations.filter(o => o.active).length || 0} active
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MDC Workspaces List */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Workspaces</CardTitle>
              <CardDescription>MicroDataCluster workspaces</CardDescription>
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : mdcError ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Unable to load workspaces</p>
                  <p className="text-xs">Check your authentication</p>
                </div>
              ) : mdcData?.workspaces.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No workspaces found
                </div>
              ) : (
                <div className="space-y-4">
                  {mdcData?.workspaces.slice(0, 5).map((workspace) => (
                    <div key={workspace.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div>
                          <p className="text-sm font-medium leading-none">{workspace.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {workspace.virtualMachines?.length || 0} VMs / {workspace.virtualNetworks?.length || 0} Networks
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {workspace.virtualMachines?.length || 0} VMs
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Site Nodes</CardTitle>
              <CardDescription>Infrastructure node status</CardDescription>
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : mdcError ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Unable to load sites</p>
                  <p className="text-xs">Check your authentication</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mdcData?.sites.flatMap((site) =>
                    (site.nodes || []).slice(0, 5).map((node) => (
                      <div key={`${site.id}-${node.name}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              node.online ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium leading-none">{node.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {node.cpuInfo?.cores || 0} cores @ {node.cpuInfo?.mhz || 0} MHz
                            </p>
                          </div>
                        </div>
                        <Badge variant={node.online ? "default" : "destructive"}>
                          {node.online ? "Online" : "Offline"}
                        </Badge>
                      </div>
                    ))
                  )}
                  {mdcData?.sites.every((s) => !s.nodes?.length) && (
                    <div className="text-center py-4 text-muted-foreground">
                      No nodes found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
