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
  X,
  Shield,
  Router,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { ConsoleOpenButton } from "@/components/console-open-button";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  useWorkspaces,
  useSites,
  useSite,
  useOrganizations,
  useCreateWorkspace,
  useLockWorkspace,
} from "@/lib/mdc/hooks";
import {
  Workspace,
  WorkspaceDescriptor,
  VirtualMachineTemplate,
} from "@/lib/mdc/types";

// ==================== Types ====================

interface NetworkAdapterForm {
  name: string;
  refVirtualNetworkName: string;
  isFirewallEnabled: boolean;
  enableRemoteNetwork: boolean;
}

interface VMForm {
  name: string;
  templateName: string;
  templateRevision: number;
  cpuCores: number;
  networkAdapters: NetworkAdapterForm[];
  expanded: boolean;
}

interface GatewayForm {
  templateName: string;
  templateRevision: number;
  wanNetworkType: number;
  refInternalWANVirtualNetworkName: string;
}

interface VNetForm {
  name: string;
  gateway: GatewayForm | null;
  enableRemoteNetwork: boolean;
  remoteNetworkAddressCIDR: string;
  remoteNetworkIPRangeStart: string;
  remoteNetworkIPRangeEnd: string;
  remoteNetworkBastionIPAddress: string;
  expanded: boolean;
}

// ==================== Clean Payload Helper ====================

function cleanPayload(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj
      .map((item) => cleanPayload(item))
      .filter((item) => {
        if (Array.isArray(item)) return item.length > 0;
        if (typeof item === "object" && item !== null)
          return Object.keys(item).length > 0;
        return true;
      });
  }

  if (obj !== null && typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value === null || value === undefined || value === "") continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (key === "operation" && (value === "None" || value === null)) continue;

      if (typeof value === "object") {
        const cleanedValue = cleanPayload(value);
        if (Array.isArray(cleanedValue)) {
          if (cleanedValue.length > 0) cleaned[key] = cleanedValue;
        } else if (
          cleanedValue !== null &&
          Object.keys(cleanedValue as object).length > 0
        ) {
          cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  return obj;
}

// ==================== Helper ====================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ==================== Create Workspace Dialog ====================

function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  // Form state
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [bastionTemplate, setBastionTemplate] = useState("");
  const [vms, setVms] = useState<VMForm[]>([]);
  const [vnets, setVnets] = useState<VNetForm[]>([]);

  // Queries
  const { data: sites } = useSites();
  const { data: siteDetail, isLoading: loadingSiteDetail } = useSite(
    selectedSiteId,
    { enabled: !!selectedSiteId }
  );
  const { data: organizations } = useOrganizations();

  // Mutation — use ?siteId= query param endpoint (correct per MDC-web-dashboard)
  const createWorkspaceMutation = useCreateWorkspace();

  // Derived data from site detail
  const vmTemplates: VirtualMachineTemplate[] =
    siteDetail?.virtualMachineTemplates || [];
  const bastionTemplates: VirtualMachineTemplate[] =
    siteDetail?.bastionTemplates || [];
  const gatewayTemplates: VirtualMachineTemplate[] =
    siteDetail?.gatewayTemplates || [];

  const siteOrgIds = siteDetail?.organizationIds || [];
  const availableOrgs =
    organizations?.filter((org) => siteOrgIds.includes(org.id)) || [];

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    setSelectedOrgId("");
    setBastionTemplate("");
    setVms([]);
    setVnets([]);
  };

  const resetForm = () => {
    setWorkspaceName("");
    setWorkspaceDescription("");
    setSelectedSiteId("");
    setSelectedOrgId("");
    setBastionTemplate("");
    setVms([]);
    setVnets([]);
  };

  // ---- Virtual Network helpers ----
  const addVNet = () => {
    setVnets((prev) => [
      ...prev,
      {
        name: `vnet-${prev.length + 1}`,
        gateway: null,
        enableRemoteNetwork: false,
        remoteNetworkAddressCIDR: "",
        remoteNetworkIPRangeStart: "",
        remoteNetworkIPRangeEnd: "",
        remoteNetworkBastionIPAddress: "",
        expanded: true,
      },
    ]);
  };

  const updateVNet = (index: number, updates: Partial<VNetForm>) => {
    setVnets((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...updates } : v))
    );

    // MDC API rule: if remote network is disabled on a vnet, also disable it
    // on any adapter that references this vnet (adapter cannot be true when vnet is false).
    if (updates.enableRemoteNetwork === false) {
      const vnetName = vnets[index]?.name;
      if (vnetName) {
        setVms((prev) =>
          prev.map((vm) => ({
            ...vm,
            networkAdapters: vm.networkAdapters.map((a) =>
              a.refVirtualNetworkName === vnetName
                ? { ...a, enableRemoteNetwork: false }
                : a
            ),
          }))
        );
      }
    }
  };

  const removeVNet = (index: number) => {
    setVnets((prev) => prev.filter((_, i) => i !== index));
    // Remove network adapters referencing this network
    const removedName = vnets[index]?.name;
    if (removedName) {
      setVms((prev) =>
        prev.map((vm) => ({
          ...vm,
          networkAdapters: vm.networkAdapters.filter(
            (a) => a.refVirtualNetworkName !== removedName
          ),
        }))
      );
    }
  };

  const addGatewayToVNet = (vnetIndex: number, templateName: string) => {
    const tpl = gatewayTemplates.find((t) => t.name === templateName);
    updateVNet(vnetIndex, {
      gateway: {
        templateName,
        templateRevision: tpl?.revision ?? 0,
        wanNetworkType: 0,
        refInternalWANVirtualNetworkName: "",
      },
    });
  };

  const removeGatewayFromVNet = (vnetIndex: number) => {
    updateVNet(vnetIndex, { gateway: null });
  };

  // ---- VM helpers ----
  const addVM = () => {
    const firstTemplate = vmTemplates[0];
    setVms((prev) => [
      ...prev,
      {
        name: `vm-${prev.length + 1}`,
        templateName: firstTemplate?.name || "",
        templateRevision: firstTemplate?.revision ?? 0,
        cpuCores: firstTemplate?.cores ?? 2,
        networkAdapters: [],
        expanded: true,
      },
    ]);
  };

  const updateVM = (index: number, updates: Partial<VMForm>) => {
    setVms((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...updates } : v))
    );
  };

  const removeVM = (index: number) => {
    setVms((prev) => prev.filter((_, i) => i !== index));
  };

  const addNetworkAdapter = (vmIndex: number) => {
    const firstVnet = vnets[0]?.name || "";
    updateVM(vmIndex, {
      networkAdapters: [
        ...vms[vmIndex].networkAdapters,
        {
          name: `eth${vms[vmIndex].networkAdapters.length}`,
          refVirtualNetworkName: firstVnet,
          isFirewallEnabled: true,
          enableRemoteNetwork: false,
        },
      ],
    });
  };

  const updateNetworkAdapter = (
    vmIndex: number,
    adapterIndex: number,
    updates: Partial<NetworkAdapterForm>
  ) => {
    const updatedAdapters = vms[vmIndex].networkAdapters.map((a, i) =>
      i === adapterIndex ? { ...a, ...updates } : a
    );
    updateVM(vmIndex, { networkAdapters: updatedAdapters });

    // MDC API rule: adapter enableRemoteNetwork must match the referenced vnet.
    const adapterAfterUpdate = { ...vms[vmIndex].networkAdapters[adapterIndex], ...updates };
    if (updates.enableRemoteNetwork === true) {
      // Adapter turned on → ensure referenced vnet is also on
      const vnetIdx = vnets.findIndex((v) => v.name === adapterAfterUpdate.refVirtualNetworkName);
      if (vnetIdx !== -1 && !vnets[vnetIdx].enableRemoteNetwork) {
        updateVNet(vnetIdx, { enableRemoteNetwork: true });
      }
    } else if (updates.refVirtualNetworkName !== undefined && adapterAfterUpdate.enableRemoteNetwork) {
      // Adapter switched to a different vnet while remote is on → disable remote if new vnet doesn't support it
      const newVnet = vnets.find((v) => v.name === updates.refVirtualNetworkName);
      if (newVnet && !newVnet.enableRemoteNetwork) {
        const fixedAdapters = vms[vmIndex].networkAdapters.map((a, i) =>
          i === adapterIndex ? { ...a, ...updates, enableRemoteNetwork: false } : a
        );
        updateVM(vmIndex, { networkAdapters: fixedAdapters });
      }
    }
  };

  const removeNetworkAdapter = (vmIndex: number, adapterIndex: number) => {
    updateVM(vmIndex, {
      networkAdapters: vms[vmIndex].networkAdapters.filter(
        (_, i) => i !== adapterIndex
      ),
    });
  };

  // ---- Submit ----
  const handleCreate = async () => {
    if (!selectedSiteId || !workspaceName) {
      toast({
        title: "Validation Error",
        description: "Workspace name and site are required",
        variant: "destructive",
      });
      return;
    }

    const payload: Record<string, unknown> = {
      name: workspaceName,
    };

    if (workspaceDescription) payload.description = workspaceDescription;
    if (selectedOrgId && selectedOrgId !== "__none__") payload.organizationId = selectedOrgId;

    // Bastion — include templateRevision from site detail
    const effectiveBastionTemplate = bastionTemplate === "__none__" ? "" : bastionTemplate;
    if (effectiveBastionTemplate) {
      const tpl = bastionTemplates.find((t) => t.name === effectiveBastionTemplate);
      const bastionRevision = tpl != null ? tpl.revision : undefined;
      payload.bastion = {
        templateName: effectiveBastionTemplate,
        ...(bastionRevision !== undefined ? { templateRevision: bastionRevision } : {}),
        operation: "Add",
      };
    }

    // Virtual Networks
    if (vnets.length > 0) {
      payload.virtualNetworks = vnets.map((vnet) => {
        const vnetPayload: Record<string, unknown> = {
          name: vnet.name,
          enableRemoteNetwork: vnet.enableRemoteNetwork,
          operation: "Add",
        };
        if (vnet.gateway) {
          const gwTpl = gatewayTemplates.find((t) => t.name === vnet.gateway!.templateName);
          const gwRevision = gwTpl != null ? gwTpl.revision : vnet.gateway.templateRevision;
          vnetPayload.gateway = {
            templateName: vnet.gateway.templateName,
            templateRevision: gwRevision,
            wanNetworkType: vnet.gateway.wanNetworkType,
            ...(vnet.gateway.refInternalWANVirtualNetworkName
              ? {
                  refInternalWANVirtualNetworkName:
                    vnet.gateway.refInternalWANVirtualNetworkName,
                }
              : {}),
            operation: "Add",
          };
        }
        if (vnet.enableRemoteNetwork) {
          if (vnet.remoteNetworkAddressCIDR)
            vnetPayload.remoteNetworkAddressCIDR = vnet.remoteNetworkAddressCIDR;
          if (vnet.remoteNetworkIPRangeStart)
            vnetPayload.remoteNetworkIPRangeStart =
              vnet.remoteNetworkIPRangeStart;
          if (vnet.remoteNetworkIPRangeEnd)
            vnetPayload.remoteNetworkIPRangeEnd = vnet.remoteNetworkIPRangeEnd;
          if (vnet.remoteNetworkBastionIPAddress)
            vnetPayload.remoteNetworkBastionIPAddress =
              vnet.remoteNetworkBastionIPAddress;
        }
        return vnetPayload;
      });
    }

    // Virtual Machines — include templateRevision from site detail
    if (vms.length > 0) {
      payload.virtualMachines = vms.map((vm) => {
        const tpl = vmTemplates.find((t) => t.name === vm.templateName);
        // Use revision from site detail exactly (including 0). Omit if unknown.
        const revision = tpl != null ? tpl.revision : undefined;
        const vmPayload: Record<string, unknown> = {
          name: vm.name,
          templateName: vm.templateName,
          ...(revision !== undefined ? { templateRevision: revision } : {}),
          cpuCores: vm.cpuCores,
          operation: "Add",
        };
        if (vm.networkAdapters.length > 0) {
          vmPayload.networkAdapters = vm.networkAdapters.map((a) => ({
            // "name" (e.g. "eth0") is NOT sent — the MDC API treats it as an
            // additional property key and rejects it with a schema error
            refVirtualNetworkName: a.refVirtualNetworkName,
            isFirewallEnabled: a.isFirewallEnabled,
            enableRemoteNetwork: a.enableRemoteNetwork,
            operation: "Add",
          }));
        }
        return vmPayload;
      });
    }

    const cleanedPayload = cleanPayload(payload) as Record<string, unknown>;

    try {
      await createWorkspaceMutation.mutateAsync({
        siteId: selectedSiteId,
        // cleanPayload strips empty strings/nulls so type-cast is safe
        descriptor: cleanedPayload as unknown as WorkspaceDescriptor,
      });

      toast({
        title: "Workspace Created",
        description: `Workspace "${workspaceName}" created successfully`,
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create workspace",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Configure a workspace with virtual networks, gateways, bastion host,
            and virtual machines
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Basic Info */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Workspace Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="my-workspace"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Site <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedSiteId} onValueChange={handleSiteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites?.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select
                value={selectedOrgId || "__none__"}
                onValueChange={(v) => setSelectedOrgId(v === "__none__" ? "" : v)}
                disabled={!selectedSiteId || loadingSiteDetail}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedSiteId
                        ? "Select a site first"
                        : loadingSiteDetail
                        ? "Loading..."
                        : "Select organization (optional)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None — no organization</SelectItem>
                  {availableOrgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description"
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                rows={2}
              />
            </div>
          </section>

          <Separator />

          {/* Bastion */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-semibold">
                Bastion Host{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </h3>
            </div>
            <div className="space-y-2">
              <Label>Bastion Template</Label>
              <Select
                value={bastionTemplate || "__none__"}
                onValueChange={(v) => setBastionTemplate(v === "__none__" ? "" : v)}
                disabled={!selectedSiteId || loadingSiteDetail}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingSiteDetail
                        ? "Loading templates..."
                        : "None — skip bastion"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None — skip bastion</SelectItem>
                  {bastionTemplates.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name} (Rev. {t.revision})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSiteId &&
                !loadingSiteDetail &&
                bastionTemplates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No bastion templates available for this site
                  </p>
                )}
            </div>
          </section>

          <Separator />

          {/* Virtual Networks */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold">
                  Virtual Networks{" "}
                  <Badge variant="secondary" className="ml-1">
                    {vnets.length}
                  </Badge>
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVNet}
                disabled={!selectedSiteId}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Network
              </Button>
            </div>

            {vnets.length === 0 && selectedSiteId && (
              <div className="rounded-lg border border-dashed p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  No virtual networks. Add one to enable VM networking.
                </p>
              </div>
            )}

            {vnets.map((vnet, vnetIdx) => (
              <div key={vnetIdx} className="rounded-lg border">
                {/* Vnet header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  onClick={() =>
                    updateVNet(vnetIdx, { expanded: !vnet.expanded })
                  }
                >
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{vnet.name}</span>
                    {vnet.gateway && (
                      <Badge variant="secondary" className="text-xs">
                        Gateway
                      </Badge>
                    )}
                    {vnet.enableRemoteNetwork && (
                      <Badge variant="secondary" className="text-xs">
                        Remote
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVNet(vnetIdx);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {vnet.expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {vnet.expanded && (
                  <div className="border-t px-4 py-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Network Name</Label>
                      <Input
                        value={vnet.name}
                        onChange={(e) =>
                          updateVNet(vnetIdx, { name: e.target.value })
                        }
                      />
                    </div>

                    {/* Gateway */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Router className="h-4 w-4 text-orange-500" />
                          <Label className="text-sm">Gateway</Label>
                        </div>
                        {vnet.gateway ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-7 text-xs"
                            onClick={() => removeGatewayFromVNet(vnetIdx)}
                          >
                            Remove Gateway
                          </Button>
                        ) : (
                          <Select
                            onValueChange={(v) =>
                              addGatewayToVNet(vnetIdx, v)
                            }
                          >
                            <SelectTrigger className="w-[200px] h-7 text-xs">
                              <SelectValue placeholder="Add gateway..." />
                            </SelectTrigger>
                            <SelectContent>
                              {gatewayTemplates.map((t) => (
                                <SelectItem key={t.name} value={t.name}>
                                  {t.name} (Rev. {t.revision})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {vnet.gateway && (
                        <div className="rounded-md bg-muted p-3 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Template</Label>
                              <Input
                                value={vnet.gateway.templateName}
                                disabled
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Revision</Label>
                              <Input
                                value={vnet.gateway.templateRevision}
                                disabled
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">WAN Network Type</Label>
                              <Input
                                type="number"
                                value={vnet.gateway.wanNetworkType}
                                onChange={(e) =>
                                  updateVNet(vnetIdx, {
                                    gateway: {
                                      ...vnet.gateway!,
                                      wanNetworkType: parseInt(e.target.value),
                                    },
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Internal WAN VNet Name
                              </Label>
                              <Input
                                value={
                                  vnet.gateway.refInternalWANVirtualNetworkName
                                }
                                onChange={(e) =>
                                  updateVNet(vnetIdx, {
                                    gateway: {
                                      ...vnet.gateway!,
                                      refInternalWANVirtualNetworkName:
                                        e.target.value,
                                    },
                                  })
                                }
                                className="h-8 text-xs"
                                placeholder="optional"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remote Network */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={vnet.enableRemoteNetwork}
                          onCheckedChange={(v) =>
                            updateVNet(vnetIdx, { enableRemoteNetwork: v })
                          }
                        />
                        <Label className="text-sm">Enable Remote Network</Label>
                        {/* Required when any VM adapter referencing this vnet has enableRemoteNetwork = true */}
                      </div>
                      {vnet.enableRemoteNetwork && (
                        <div className="grid gap-3 sm:grid-cols-2 pl-2">
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Address CIDR
                            </Label>
                            <Input
                              value={vnet.remoteNetworkAddressCIDR}
                              onChange={(e) =>
                                updateVNet(vnetIdx, {
                                  remoteNetworkAddressCIDR: e.target.value,
                                })
                              }
                              placeholder="192.168.1.0/24"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Bastion IP</Label>
                            <Input
                              value={vnet.remoteNetworkBastionIPAddress}
                              onChange={(e) =>
                                updateVNet(vnetIdx, {
                                  remoteNetworkBastionIPAddress: e.target.value,
                                })
                              }
                              placeholder="192.168.1.1"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">IP Range Start</Label>
                            <Input
                              value={vnet.remoteNetworkIPRangeStart}
                              onChange={(e) =>
                                updateVNet(vnetIdx, {
                                  remoteNetworkIPRangeStart: e.target.value,
                                })
                              }
                              placeholder="192.168.1.10"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">IP Range End</Label>
                            <Input
                              value={vnet.remoteNetworkIPRangeEnd}
                              onChange={(e) =>
                                updateVNet(vnetIdx, {
                                  remoteNetworkIPRangeEnd: e.target.value,
                                })
                              }
                              placeholder="192.168.1.254"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>

          <Separator />

          {/* Virtual Machines */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-semibold">
                  Virtual Machines{" "}
                  <Badge variant="secondary" className="ml-1">
                    {vms.length}
                  </Badge>
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVM}
                disabled={!selectedSiteId || vmTemplates.length === 0}
                title={
                  vmTemplates.length === 0
                    ? "No VM templates available for this site"
                    : ""
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add VM
              </Button>
            </div>

            {selectedSiteId && !loadingSiteDetail && vmTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No VM templates available for this site
              </p>
            )}

            {vms.map((vm, vmIdx) => (
              <div key={vmIdx} className="rounded-lg border">
                {/* VM header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  onClick={() => updateVM(vmIdx, { expanded: !vm.expanded })}
                >
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{vm.name}</span>
                    {vm.templateName && (
                      <Badge variant="outline" className="text-xs">
                        {vm.templateName}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {vm.networkAdapters.length} adapter
                      {vm.networkAdapters.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVM(vmIdx);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {vm.expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {vm.expanded && (
                  <div className="border-t px-4 py-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>VM Name</Label>
                        <Input
                          value={vm.name}
                          onChange={(e) =>
                            updateVM(vmIdx, { name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Template</Label>
                        <Select
                          value={vm.templateName}
                          onValueChange={(v) => {
                            const tpl = vmTemplates.find((t) => t.name === v);
                            updateVM(vmIdx, {
                              templateName: v,
                              templateRevision: tpl?.revision ?? 0,
                              cpuCores: tpl?.cores ?? vm.cpuCores,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            {vmTemplates.map((t) => (
                              <SelectItem key={t.name} value={t.name}>
                                {t.name} (Rev. {t.revision})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>CPU Cores</Label>
                        <Select
                          value={vm.cpuCores.toString()}
                          onValueChange={(v) =>
                            updateVM(vmIdx, { cpuCores: parseInt(v) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 4, 8, 16, 32].map((cores) => (
                              <SelectItem key={cores} value={cores.toString()}>
                                {cores} {cores === 1 ? "Core" : "Cores"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Network Adapters */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Network Adapters</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addNetworkAdapter(vmIdx)}
                          disabled={vnets.length === 0}
                          title={
                            vnets.length === 0
                              ? "Add a virtual network first"
                              : ""
                          }
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Adapter
                        </Button>
                      </div>

                      {vm.networkAdapters.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {vnets.length === 0
                            ? "Add a virtual network first to attach adapters"
                            : "No adapters. Click Add Adapter to connect this VM to a network."}
                        </p>
                      ) : (
                        <div className="rounded-md border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">
                                  Name
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  Network
                                </th>
                                <th className="px-3 py-2 text-center font-medium">
                                  Firewall
                                </th>
                                <th className="px-3 py-2 text-center font-medium">
                                  Remote
                                </th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {vm.networkAdapters.map((adapter, adapterIdx) => (
                                <tr
                                  key={adapterIdx}
                                  className="border-t"
                                >
                                  <td className="px-3 py-2">
                                    <Input
                                      value={adapter.name}
                                      onChange={(e) =>
                                        updateNetworkAdapter(
                                          vmIdx,
                                          adapterIdx,
                                          { name: e.target.value }
                                        )
                                      }
                                      className="h-7 text-xs w-20"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Select
                                      value={adapter.refVirtualNetworkName}
                                      onValueChange={(v) =>
                                        updateNetworkAdapter(
                                          vmIdx,
                                          adapterIdx,
                                          { refVirtualNetworkName: v }
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-7 text-xs w-28">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {vnets.map((vn) => (
                                          <SelectItem
                                            key={vn.name}
                                            value={vn.name}
                                          >
                                            {vn.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <Switch
                                      checked={adapter.isFirewallEnabled}
                                      onCheckedChange={(v) =>
                                        updateNetworkAdapter(
                                          vmIdx,
                                          adapterIdx,
                                          { isFirewallEnabled: v }
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <Switch
                                      checked={adapter.enableRemoteNetwork}
                                      onCheckedChange={(v) =>
                                        updateNetworkAdapter(
                                          vmIdx,
                                          adapterIdx,
                                          { enableRemoteNetwork: v }
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() =>
                                        removeNetworkAdapter(vmIdx, adapterIdx)
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              !workspaceName ||
              !selectedSiteId ||
              createWorkspaceMutation.isPending
            }
          >
            {createWorkspaceMutation.isPending ? (
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
  );
}

// ==================== Main Page ====================

export default function WorkspacesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
    null
  );

  const { data: workspaces, isLoading, isError, refetch } = useWorkspaces();
  const lockWorkspace = useLockWorkspace();

  const handleToggleLock = async (workspace: Workspace) => {
    const newLocked = !workspace.locked;
    try {
      await lockWorkspace.mutateAsync({ workspaceId: workspace.id, locked: newLocked });
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

  const filteredWorkspaces =
    workspaces?.filter((workspace) =>
      workspace.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const handleViewWorkspace = (workspace: Workspace) => {
    router.push(`/dashboard/infrastructure/workspaces/${workspace.id}`);
  };

  const handleManageWorkspace = (workspace: Workspace) => {
    toast({
      title: "Manage Workspace",
      description: `Opening management console for ${workspace.name}`,
    });
  };

  const totalVMs =
    workspaces?.reduce(
      (sum, ws) => sum + (ws.virtualMachines?.length || 0),
      0
    ) || 0;

  const totalNetworks =
    workspaces?.reduce(
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
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </Button>
        </div>
      </div>

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Workspaces
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {workspaces?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active workspaces
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Virtual Machines
            </CardTitle>
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
              <p className="text-muted-foreground">
                Unable to load workspaces
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Check your authentication and try again
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
              >
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
                  <TableHead>Status</TableHead>
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
                      {workspace.locked ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Unlock className="h-3 w-3" />
                          Unlocked
                        </Badge>
                      )}
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
                          <ConsoleOpenButton
                            variant="dropdown-item"
                            workspaceId={workspace.id}
                          />
                          <DropdownMenuItem
                            onSelect={() => handleManageWorkspace(workspace)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Manage
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => handleToggleLock(workspace)}
                            disabled={lockWorkspace.isPending}
                          >
                            {workspace.locked ? (
                              <>
                                <Unlock className="mr-2 h-4 w-4" />
                                Unlock Workspace
                              </>
                            ) : (
                              <>
                                <Lock className="mr-2 h-4 w-4" />
                                Lock Workspace
                              </>
                            )}
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
