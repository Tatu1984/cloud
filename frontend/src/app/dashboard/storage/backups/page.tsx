"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Archive,
  Clock,
  Calendar,
  Shield,
  Settings,
  Trash2,
  Copy,
  Play,
  Pause,
  RotateCcw,
  HardDrive,
  Database,
  Server,
  FolderOpen,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  Edit,
  AlertTriangle,
  Download,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockBackups, mockBackupPolicies } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import { Backup, BackupPolicy } from "@/types";

// Source type icons and colors
const sourceTypeConfig: Record<Backup["sourceType"], { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  vm: { icon: Server, color: "text-blue-500", label: "Virtual Machine" },
  volume: { icon: HardDrive, color: "text-purple-500", label: "Volume" },
  database: { icon: Database, color: "text-green-500", label: "Database" },
  "file-share": { icon: FolderOpen, color: "text-orange-500", label: "File Share" },
};

// Status configuration
const statusConfig: Record<Backup["status"], { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500", variant: "default" },
  running: { icon: Loader2, color: "text-blue-500", bgColor: "bg-blue-500", variant: "outline" },
  failed: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-500", variant: "destructive" },
  pending: { icon: Clock, color: "text-yellow-500", bgColor: "bg-yellow-500", variant: "secondary" },
};

// Format relative time
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

// Format future time
const formatFutureTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `in ${diffMins} minutes`;
  if (diffHours < 24) return `in ${diffHours} hours`;
  if (diffDays < 7) return `in ${diffDays} days`;
  return date.toLocaleDateString();
};

export default function BackupsPage() {
  const { currentProject } = useAuthStore();
  const [search, setSearch] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("backups");

  const backups = mockBackups.filter((b) => b.projectId === currentProject?.id);
  const policies = mockBackupPolicies.filter((p) => p.projectId === currentProject?.id);

  const filteredBackups = backups.filter((backup) => {
    const matchesSearch =
      backup.name.toLowerCase().includes(search.toLowerCase()) ||
      backup.sourceName.toLowerCase().includes(search.toLowerCase());
    const matchesSourceType = sourceTypeFilter === "all" || backup.sourceType === sourceTypeFilter;
    const matchesStatus = statusFilter === "all" || backup.status === statusFilter;
    const matchesType = typeFilter === "all" || backup.type === typeFilter;
    return matchesSearch && matchesSourceType && matchesStatus && matchesType;
  });

  // Calculate stats
  const totalBackups = backups.length;
  const completedBackups = backups.filter((b) => b.status === "completed").length;
  const failedBackups = backups.filter((b) => b.status === "failed").length;
  const totalBackupSize = backups.reduce((sum, b) => sum + b.size, 0);
  const activePolicies = policies.filter((p) => p.status === "active").length;

  // Calculate backups by source type
  const backupsByType = {
    vm: backups.filter((b) => b.sourceType === "vm").length,
    volume: backups.filter((b) => b.sourceType === "volume").length,
    database: backups.filter((b) => b.sourceType === "database").length,
    "file-share": backups.filter((b) => b.sourceType === "file-share").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup Management</h1>
          <p className="text-muted-foreground">
            Manage backup policies, schedules, and restore points
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/storage/backups/policies/create">
              <Calendar className="mr-2 h-4 w-4" />
              Create Policy
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/storage/backups/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Backup
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBackups}</div>
            <p className="text-xs text-muted-foreground">
              {completedBackups} completed, {failedBackups} failed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalBackupSize / 1000).toFixed(1)} TB</div>
            <p className="text-xs text-muted-foreground">
              Across all restore points
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePolicies}</div>
            <p className="text-xs text-muted-foreground">
              of {policies.length} total policies
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalBackups > 0 ? Math.round((completedBackups / totalBackups) * 100) : 0}%
            </div>
            <Progress
              value={totalBackups > 0 ? (completedBackups / totalBackups) * 100 : 0}
              className="mt-2"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <span className="text-2xl text-muted-foreground">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalBackupSize * 0.05).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              $0.05 per GB/month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Backup Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup Distribution by Source Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {(Object.entries(backupsByType) as [Backup["sourceType"], number][]).map(([type, count]) => {
              const config = sourceTypeConfig[type];
              const Icon = config.icon;
              return (
                <div key={type} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`rounded-lg bg-muted p-2 ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="backups" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Restore Points
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Backup Policies
          </TabsTrigger>
        </TabsList>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search backups..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Source Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="vm">VMs</SelectItem>
                    <SelectItem value="volume">Volumes</SelectItem>
                    <SelectItem value="database">Databases</SelectItem>
                    <SelectItem value="file-share">File Shares</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBackups.map((backup) => {
                    const sourceConfig = sourceTypeConfig[backup.sourceType];
                    const statusCfg = statusConfig[backup.status];
                    const SourceIcon = sourceConfig.icon;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <TableRow key={backup.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{backup.name}</p>
                              <p className="text-xs text-muted-foreground">{backup.region}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <SourceIcon className={`h-4 w-4 ${sourceConfig.color}`} />
                            <div>
                              <p className="text-sm">{backup.sourceName}</p>
                              <p className="text-xs text-muted-foreground">{sourceConfig.label}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {backup.size > 0 ? (
                            <span className="font-medium">{backup.size} GB</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={backup.type === "scheduled" ? "outline" : "secondary"}>
                            {backup.type === "scheduled" ? (
                              <Calendar className="h-3 w-3 mr-1" />
                            ) : (
                              <Play className="h-3 w-3 mr-1" />
                            )}
                            {backup.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusCfg.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className={`h-3 w-3 ${backup.status === "running" ? "animate-spin" : ""}`} />
                            {backup.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatRelativeTime(backup.createdAt)}</span>
                        </TableCell>
                        <TableCell>
                          {backup.expiresAt ? (
                            <span className="text-sm">{formatFutureTime(backup.expiresAt)}</span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
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
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={backup.status !== "completed"}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Restore
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                Clone Backup
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Backup
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredBackups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Archive className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No backups found</p>
                          <Button asChild variant="outline" size="sm">
                            <Link href="/dashboard/storage/backups/create">
                              <Plus className="mr-2 h-4 w-4" />
                              Create your first backup
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy) => (
              <Card key={policy.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${policy.status === "active" ? "bg-green-500/10" : "bg-gray-500/10"}`}>
                      <Calendar className={`h-5 w-5 ${policy.status === "active" ? "text-green-500" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{policy.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {policy.scheduleDescription}
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
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Policy
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Play className="mr-2 h-4 w-4" />
                        Run Now
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {policy.status === "active" ? (
                        <DropdownMenuItem>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause Policy
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Resume Policy
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Policy
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={policy.status === "active" ? "default" : "secondary"}>
                      {policy.status === "active" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Pause className="h-3 w-3 mr-1" />
                      )}
                      {policy.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {policy.targets.reduce((sum, t) => sum + t.ids.length, 0)} targets
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Target Resources</p>
                    <div className="flex flex-wrap gap-1">
                      {policy.targets.map((target, idx) => {
                        const config = sourceTypeConfig[target.type];
                        const Icon = config.icon;
                        return (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Icon className={`h-3 w-3 mr-1 ${config.color}`} />
                            {target.ids.length} {target.type}
                            {target.ids.length > 1 ? "s" : ""}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg border p-3">
                    <div className="text-center">
                      <p className="text-lg font-bold">{policy.retention.daily}</p>
                      <p className="text-xs text-muted-foreground">Daily</p>
                    </div>
                    <div className="text-center border-x">
                      <p className="text-lg font-bold">{policy.retention.weekly}</p>
                      <p className="text-xs text-muted-foreground">Weekly</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{policy.retention.monthly}</p>
                      <p className="text-xs text-muted-foreground">Monthly</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <History className="h-3 w-3" />
                        Last run
                      </span>
                      <span>
                        {policy.lastRun ? formatRelativeTime(policy.lastRun) : "Never"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Next run
                      </span>
                      <span className={policy.status === "active" ? "text-green-600" : "text-muted-foreground"}>
                        {policy.status === "active" ? formatFutureTime(policy.nextRun) : "Paused"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Play className="mr-2 h-4 w-4" />
                      Run Now
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <History className="mr-2 h-4 w-4" />
                      History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add New Policy Card */}
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">Create Backup Policy</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Set up automated backups with retention rules
                </p>
                <Button asChild variant="outline">
                  <Link href="/dashboard/storage/backups/policies/create">
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Policy
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {policies.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No backup policies</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  Create backup policies to automatically protect your resources with scheduled backups and retention rules.
                </p>
                <Button asChild>
                  <Link href="/dashboard/storage/backups/policies/create">
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Your First Policy
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Retention Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retention Best Practices</CardTitle>
          <CardDescription>Recommended retention settings for different workloads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium">Production VMs</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Critical workloads requiring frequent recovery points
              </p>
              <div className="space-y-1 text-sm">
                <p>Daily: 7 days</p>
                <p>Weekly: 4 weeks</p>
                <p>Monthly: 12 months</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                <h4 className="font-medium">Databases</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Transactional data with compliance requirements
              </p>
              <div className="space-y-1 text-sm">
                <p>Daily: 14 days</p>
                <p>Weekly: 8 weeks</p>
                <p>Monthly: 24 months</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-orange-500" />
                <h4 className="font-medium">File Storage</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Document archives and shared files
              </p>
              <div className="space-y-1 text-sm">
                <p>Daily: 3 days</p>
                <p>Weekly: 4 weeks</p>
                <p>Monthly: 6 months</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
