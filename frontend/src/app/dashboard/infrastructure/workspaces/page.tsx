"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Plus,
  Search,
  MoreHorizontal,
  Server,
  Network,
  RefreshCw,
  Loader2,
  Trash2,
  Eye,
  Settings,
  Monitor,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useWorkspaces,
  useSites,
  useOrganizations,
  useAddWorkspaceToSite,
} from "@/lib/mdc/hooks";
import {
  Workspace,
  Site,
  Organization,
  WorkspaceDescriptor,
  VirtualMachineDescriptor,
  VirtualMachineDescriptorOperation,
} from "@/lib/mdc/types";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface VMFormData {
  name: string;
  templateName: string;
  cpuCores: number;
  memoryMB: string;
}

export default function WorkspacesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);

  // Form state
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [vms, setVms] = useState<VMFormData[]>([]);

  // Queries
  const { data: workspaces, isLoading, isError, refetch } = useWorkspaces();
  const { data: sites } = useSites();
  const { data: organizations } = useOrganizations();

  // Mutations
  const addWorkspaceMutation = useAddWorkspaceToSite();

  const filteredWorkspaces = workspaces?.filter((workspace) =>
    workspace.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleAddVM = () => {
    setVms([
      ...vms,
      {
        name: `vm-${vms.length + 1}`,
        templateName: "",
        cpuCores: 2,
        memoryMB: "2048",
      },
    ]);
  };

  const handleRemoveVM = (index: number) => {
    setVms(vms.filter((_, i) => i !== index));
  };

  const handleVMChange = (index: number, field: keyof VMFormData, value: string | number) => {
    const updatedVms = [...vms];
    updatedVms[index] = { ...updatedVms[index], [field]: value };
    setVms(updatedVms);
  };

  const resetForm = () => {
    setWorkspaceName("");
    setWorkspaceDescription("");
    setSelectedSiteId("");
    setSelectedOrgId("");
    setVms([]);
  };

  const handleCreateWorkspace = async () => {
    if (!selectedSiteId || !workspaceName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const descriptor: WorkspaceDescriptor = {
      name: workspaceName,
      description: workspaceDescription || undefined,
      organizationId: selectedOrgId || undefined,
      virtualMachines: vms.length > 0
        ? vms.map((vm): VirtualMachineDescriptor => ({
            name: vm.name,
            templateName: vm.templateName || undefined,
            cpuCores: vm.cpuCores,
            memoryMB: vm.memoryMB,
            operation: VirtualMachineDescriptorOperation.Add,
          }))
        : undefined,
    };

    try {
      await addWorkspaceMutation.mutateAsync({
        siteId: selectedSiteId,
        descriptor,
      });

      toast({
        title: "Workspace Created",
        description: `Workspace "${workspaceName}" has been created successfully`,
      });

      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create workspace",
        variant: "destructive",
      });
    }
  };

  const handleViewWorkspace = (workspace: Workspace) => {
    router.push(`/dashboard/infrastructure/workspaces/${workspace.id}`);
  };

  const handleManageWorkspace = (workspace: Workspace) => {
    toast({
      title: "Manage Workspace",
      description: `Opening management console for ${workspace.name}`,
    });
  };

  // Get available templates from selected site
  const selectedSite = sites?.find((s) => s.id === selectedSiteId);
  const availableTemplates = selectedSite?.virtualMachineTemplates || [];

  const totalVMs = workspaces?.reduce(
    (sum, ws) => sum + (ws.virtualMachines?.length || 0),
    0
  ) || 0;

  const totalNetworks = workspaces?.reduce(
    (sum, ws) => sum + (ws.virtualNetworks?.length || 0),
    0
  ) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">
            Manage MicroDataCluster workspaces and virtual machines
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setIsCreateDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Create a new MicroDataCluster workspace with optional virtual machines
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Basic Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Workspace Name *</Label>
                      <Input
                        id="name"
                        placeholder="my-workspace"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="site">Site *</Label>
                      <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a site" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites?.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              <div className="flex flex-col">
                                <span>{site.name}</span>
                                {site.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {site.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an organization (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations?.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Optional description for this workspace"
                      value={workspaceDescription}
                      onChange={(e) => setWorkspaceDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Virtual Machines */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Virtual Machines</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddVM}
                      disabled={!selectedSiteId}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add VM
                    </Button>
                  </div>

                  {!selectedSiteId && (
                    <p className="text-sm text-muted-foreground">
                      Select a site first to add virtual machines
                    </p>
                  )}

                  {vms.length === 0 && selectedSiteId && (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <Server className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No virtual machines added yet
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={handleAddVM}
                      >
                        Add your first VM
                      </Button>
                    </div>
                  )}

                  {vms.map((vm, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">VM {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveVM(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>VM Name</Label>
                          <Input
                            placeholder="web-server"
                            value={vm.name}
                            onChange={(e) =>
                              handleVMChange(index, "name", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Template</Label>
                          <Select
                            value={vm.templateName}
                            onValueChange={(v) =>
                              handleVMChange(index, "templateName", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTemplates.length > 0 ? (
                                availableTemplates.map((template) => (
                                  <SelectItem
                                    key={template.name}
                                    value={template.name}
                                  >
                                    {template.name}
                                    {template.cores && (
                                      <span className="text-muted-foreground ml-2">
                                        ({template.cores} cores, {template.memory})
                                      </span>
                                    )}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="ubuntu-22.04" disabled>
                                  No templates available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>CPU Cores</Label>
                          <Select
                            value={vm.cpuCores.toString()}
                            onValueChange={(v) =>
                              handleVMChange(index, "cpuCores", parseInt(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 4, 8, 16].map((cores) => (
                                <SelectItem key={cores} value={cores.toString()}>
                                  {cores} {cores === 1 ? "Core" : "Cores"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Memory (MB)</Label>
                          <Select
                            value={vm.memoryMB}
                            onValueChange={(v) =>
                              handleVMChange(index, "memoryMB", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                { value: "1024", label: "1 GB" },
                                { value: "2048", label: "2 GB" },
                                { value: "4096", label: "4 GB" },
                                { value: "8192", label: "8 GB" },
                                { value: "16384", label: "16 GB" },
                                { value: "32768", label: "32 GB" },
                              ].map((mem) => (
                                <SelectItem key={mem.value} value={mem.value}>
                                  {mem.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWorkspace}
                  disabled={!workspaceName || !selectedSiteId || addWorkspaceMutation.isPending}
                >
                  {addWorkspaceMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Workspace"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workspaces</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{workspaces?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active workspaces
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Virtual Machines</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalVMs}</div>
                <p className="text-xs text-muted-foreground">
                  Across all workspaces
                </p>
              </>
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
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalNetworks}</div>
                <p className="text-xs text-muted-foreground">
                  Virtual networks
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workspaces Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workspaces..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Unable to load workspaces</p>
              <p className="text-xs text-muted-foreground mt-1">
                Check your authentication and try again
              </p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No workspaces found</h3>
              <p className="text-muted-foreground mt-2">
                {search
                  ? "No workspaces match your search"
                  : "Get started by creating your first workspace"}
              </p>
              {!search && (
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workspace
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>VMs</TableHead>
                  <TableHead>Networks</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkspaces.map((workspace) => (
                  <TableRow
                    key={workspace.id}
                    className="cursor-pointer"
                    onClick={() => handleViewWorkspace(workspace)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div>
                          <p className="font-medium">{workspace.name}</p>
                          {workspace.description && (
                            <p className="text-sm text-muted-foreground">
                              {workspace.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <span>{workspace.virtualMachines?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-muted-foreground" />
                        <span>{workspace.virtualNetworks?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(workspace.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(workspace.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => handleViewWorkspace(workspace)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              window.open(
                                `/dashboard/infrastructure/workspaces/${workspace.id}/console`,
                                '_blank'
                              )
                            }
                          >
                            <Monitor className="mr-2 h-4 w-4" />
                            Console
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleManageWorkspace(workspace)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Manage
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setWorkspaceToDelete(workspace)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!workspaceToDelete}
        onOpenChange={() => setWorkspaceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                {workspaceToDelete?.name}
              </strong>
              ? This action cannot be undone and will remove all virtual
              machines and networks in this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Delete not available",
                  description:
                    "Workspace deletion is not yet available in the MDC API",
                  variant: "destructive",
                });
                setWorkspaceToDelete(null);
              }}
            >
              Delete Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
