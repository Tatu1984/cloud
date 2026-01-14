"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Terminal,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { mockVMs } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import { VM } from "@/types";

const statusColors: Record<VM["status"], string> = {
  running: "bg-green-500",
  stopped: "bg-yellow-500",
  pending: "bg-blue-500",
  error: "bg-red-500",
};

const statusBadgeVariants: Record<VM["status"], "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  stopped: "secondary",
  pending: "outline",
  error: "destructive",
};

export default function VMsPage() {
  const { currentProject } = useAuthStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVMs, setSelectedVMs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dialog states
  const [vmToDelete, setVmToDelete] = useState<VM | null>(null);
  const [vmToClone, setVmToClone] = useState<VM | null>(null);
  const [vmForConsole, setVmForConsole] = useState<VM | null>(null);
  const [vmForDetails, setVmForDetails] = useState<VM | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const projectVMs = mockVMs.filter((vm) => vm.projectId === currentProject?.id);

  const filteredVMs = projectVMs.filter((vm) => {
    const matchesSearch =
      vm.name.toLowerCase().includes(search.toLowerCase()) ||
      vm.privateIp.includes(search) ||
      vm.publicIp?.includes(search);
    const matchesStatus = statusFilter === "all" || vm.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedVMs.length === filteredVMs.length) {
      setSelectedVMs([]);
    } else {
      setSelectedVMs(filteredVMs.map((vm) => vm.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedVMs((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleVMAction = async (vm: VM, action: "start" | "stop" | "restart") => {
    setIsLoading(`${vm.id}-${action}`);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);

    const actionLabels = {
      start: "started",
      stop: "stopped",
      restart: "restarted",
    };

    toast({
      title: "Success",
      description: `VM "${vm.name}" has been ${actionLabels[action]}`,
    });
  };

  const handleDelete = async () => {
    if (!vmToDelete) return;
    setIsLoading(`${vmToDelete.id}-delete`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    setVmToDelete(null);
    toast({
      title: "VM Deleted",
      description: `VM "${vmToDelete.name}" has been deleted`,
      variant: "destructive",
    });
  };

  const handleClone = async () => {
    if (!vmToClone || !cloneName) return;
    setIsLoading(`${vmToClone.id}-clone`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    setVmToClone(null);
    setCloneName("");
    toast({
      title: "VM Cloned",
      description: `VM "${vmToClone.name}" has been cloned as "${cloneName}"`,
    });
  };

  const handleBulkAction = async (action: "start" | "stop" | "delete") => {
    if (action === "delete") {
      setBulkDeleteOpen(true);
      return;
    }

    setIsLoading(`bulk-${action}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    setSelectedVMs([]);

    toast({
      title: "Bulk Action Complete",
      description: `${selectedVMs.length} VMs have been ${action === "start" ? "started" : "stopped"}`,
    });
  };

  const handleBulkDelete = async () => {
    setIsLoading("bulk-delete");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    setBulkDeleteOpen(false);
    const count = selectedVMs.length;
    setSelectedVMs([]);
    toast({
      title: "VMs Deleted",
      description: `${count} VMs have been deleted`,
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virtual Machines</h1>
          <p className="text-muted-foreground">
            Manage and monitor your virtual machine instances
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/compute/vms/create">
            <Plus className="mr-2 h-4 w-4" />
            Create VM
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, IP address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            {selectedVMs.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("start")}
                  disabled={isLoading === "bulk-start"}
                >
                  {isLoading === "bulk-start" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Start
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("stop")}
                  disabled={isLoading === "bulk-stop"}
                >
                  {isLoading === "bulk-stop" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Square className="mr-2 h-4 w-4" />
                  )}
                  Stop
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction("delete")}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedVMs.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedVMs.length === filteredVMs.length && filteredVMs.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Configuration</TableHead>
                <TableHead>IP Addresses</TableHead>
                <TableHead>Region / Zone</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVMs.map((vm) => (
                <TableRow key={vm.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedVMs.includes(vm.id)}
                      onCheckedChange={() => toggleSelect(vm.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusColors[vm.status]}`} />
                      <button
                        onClick={() => setVmForDetails(vm)}
                        className="font-medium hover:underline text-left"
                      >
                        {vm.name}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{vm.os}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariants[vm.status]}>{vm.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {vm.vcpus} vCPU / {vm.memory} GB RAM
                    </div>
                    <div className="text-xs text-muted-foreground">{vm.disk} GB disk</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {vm.publicIp && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-muted-foreground">Public:</span>
                          <code className="text-xs bg-muted px-1 rounded">{vm.publicIp}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(vm.publicIp!, "Public IP")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">Private:</span>
                        <code className="text-xs bg-muted px-1 rounded">{vm.privateIp}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => copyToClipboard(vm.privateIp, "Private IP")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{vm.region}</div>
                    <div className="text-xs text-muted-foreground">{vm.zone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {vm.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {vm.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{vm.tags.length - 2}
                        </Badge>
                      )}
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
                        <DropdownMenuItem onSelect={() => setVmForConsole(vm)}>
                          <Terminal className="mr-2 h-4 w-4" />
                          Console
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setVmForDetails(vm)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {vm.status === "running" ? (
                          <>
                            <DropdownMenuItem
                              onSelect={() => handleVMAction(vm, "stop")}
                              disabled={isLoading === `${vm.id}-stop`}
                            >
                              {isLoading === `${vm.id}-stop` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Square className="mr-2 h-4 w-4" />
                              )}
                              Stop
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleVMAction(vm, "restart")}
                              disabled={isLoading === `${vm.id}-restart`}
                            >
                              {isLoading === `${vm.id}-restart` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="mr-2 h-4 w-4" />
                              )}
                              Restart
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() => handleVMAction(vm, "start")}
                            disabled={isLoading === `${vm.id}-start`}
                          >
                            {isLoading === `${vm.id}-start` ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            Start
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => {
                          setVmToClone(vm);
                          setCloneName(`${vm.name}-clone`);
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setVmToDelete(vm)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredVMs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No virtual machines found</p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/compute/vms/create">
                          <Plus className="mr-2 h-4 w-4" />
                          Create your first VM
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!vmToDelete} onOpenChange={() => setVmToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Virtual Machine?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{vmToDelete?.name}</strong>?
              This action cannot be undone. All data on this VM will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading === `${vmToDelete?.id}-delete`}
            >
              {isLoading === `${vmToDelete?.id}-delete` ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete VM"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedVMs.length} Virtual Machines?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedVMs.length} VMs?
              This action cannot be undone. All data on these VMs will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading === "bulk-delete"}
            >
              {isLoading === "bulk-delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedVMs.length} VMs`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone VM Dialog */}
      <Dialog open={!!vmToClone} onOpenChange={() => setVmToClone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Virtual Machine</DialogTitle>
            <DialogDescription>
              Create a copy of <strong>{vmToClone?.name}</strong> with the same configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">New VM Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for the cloned VM"
              />
            </div>
            {vmToClone && (
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Configuration</span>
                  <span>{vmToClone.vcpus} vCPU / {vmToClone.memory} GB RAM / {vmToClone.disk} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operating System</span>
                  <span>{vmToClone.os}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <span>{vmToClone.region}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVmToClone(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleClone}
              disabled={!cloneName || isLoading === `${vmToClone?.id}-clone`}
            >
              {isLoading === `${vmToClone?.id}-clone` ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cloning...
                </>
              ) : (
                "Clone VM"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Console Dialog */}
      <Dialog open={!!vmForConsole} onOpenChange={() => setVmForConsole(null)}>
        <DialogContent className="max-w-4xl h-[600px]">
          <DialogHeader>
            <DialogTitle>Console - {vmForConsole?.name}</DialogTitle>
            <DialogDescription>
              Terminal access to your virtual machine
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-black rounded-lg p-4 font-mono text-green-400 text-sm overflow-auto h-[450px]">
            <div>Last login: {new Date().toLocaleString()}</div>
            <div className="mt-2">
              <span className="text-blue-400">{vmForConsole?.name}</span>
              <span className="text-white">:</span>
              <span className="text-blue-400">~</span>
              <span className="text-white">$ </span>
              <span className="animate-pulse">_</span>
            </div>
            <div className="mt-4 text-muted-foreground text-xs">
              Note: This is a simulated console. In production, this would connect to an actual terminal session via WebSocket.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VM Details Dialog */}
      <Dialog open={!!vmForDetails} onOpenChange={() => setVmForDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${vmForDetails ? statusColors[vmForDetails.status] : ''}`} />
              {vmForDetails?.name}
            </DialogTitle>
            <DialogDescription>
              Virtual machine details and configuration
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={vmForDetails ? statusBadgeVariants[vmForDetails.status] : 'default'}>
                    {vmForDetails?.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Operating System</p>
                  <p className="font-medium">{vmForDetails?.os}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">vCPUs</p>
                  <p className="font-medium">{vmForDetails?.vcpus}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Memory</p>
                  <p className="font-medium">{vmForDetails?.memory} GB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Disk</p>
                  <p className="font-medium">{vmForDetails?.disk} GB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Region / Zone</p>
                  <p className="font-medium">{vmForDetails?.region} / {vmForDetails?.zone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{vmForDetails?.createdAt ? new Date(vmForDetails.createdAt).toLocaleDateString() : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {vmForDetails?.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="network" className="space-y-4">
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">IP Addresses</h4>
                  <div className="space-y-2">
                    {vmForDetails?.publicIp && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Public IP</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">{vmForDetails.publicIp}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(vmForDetails.publicIp!, "Public IP")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Private IP</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm">{vmForDetails?.privateIp}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => vmForDetails && copyToClipboard(vmForDetails.privateIp, "Private IP")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">Security Groups</h4>
                  <p className="text-sm text-muted-foreground">default-sg, web-sg</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="storage" className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Boot Disk</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span>{vmForDetails?.disk} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span>SSD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Encryption</span>
                    <span>Enabled</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="monitoring" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <p>CPU, Memory, and Network metrics would be displayed here.</p>
                <p className="text-sm mt-2">Connect to monitoring service to view real-time data.</p>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVmForDetails(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (vmForDetails) {
                setVmForDetails(null);
                setVmForConsole(vmForDetails);
              }
            }}>
              <Terminal className="mr-2 h-4 w-4" />
              Open Console
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
