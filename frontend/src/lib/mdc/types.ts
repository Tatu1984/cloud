// MicroDataCluster API Types
// Based on https://www.microdatacluster.com/swagger/index.html

// ==================== Core Entities ====================

export interface Organization {
  id: string; // UUID
  name: string;
  active: boolean;
  organizationUserRoles?: OrganizationUserRole[];
  siteIds: string[]; // UUIDs
  workspaceIds: string[]; // UUIDs
}

export interface OrganizationUserRole {
  organizationId: string;
  organizationName: string;
  role: string;
  userId: string;
  userName: string;
}

export interface Site {
  id: string; // UUID
  name: string;
  description?: string;
  nodes?: SiteNode[];
  organizationIds: string[];
  workspaceIds: string[];
  gatewayTemplates?: VirtualMachineTemplate[];
  bastionTemplates?: VirtualMachineTemplate[];
  virtualMachineTemplates?: VirtualMachineTemplate[];
}

export interface SiteNode {
  name: string;
  cpuInfo?: SiteNodeCPUInfo;
  authorized?: boolean;
  online: boolean;
  configured?: boolean;
}

export interface SiteNodeCPUInfo {
  sockets: number;
  cores: number;
  model: string;
  cpUs: number;
  mhz: number;
}

export interface User {
  id: string; // UUID
  name: string;
  organizationUserRoles?: OrganizationUserRole[];
}

export interface Workspace {
  id: string; // UUID
  virtualMachines?: VirtualMachine[];
  virtualNetworks: VirtualNetwork[];
  siteId: string;
  organizationId: string;
  address: number;
  name: string;
  description?: string;
  createdAt: string; // ISO DateTime
  updatedAt: string; // ISO DateTime
  bastion?: VirtualMachine;
}

export interface RemoteNetwork {
  id: string;
  members: RemoteNetworkMember[];
  name?: string;
  siteId: string;
  workspaceId: string;
  virtualNetworkId: string;
  ipAssignmentPools?: RemoteNetworkIPAssignmentPool[];
  managedRoutes?: RemoteNetworkRoute[];
}

// ==================== Virtual Machine Types ====================

export interface VirtualMachine {
  index: number;
  name: string;
  status?: string;
  networkAdapters?: VirtualMachineNetworkAdapter[];
}

export interface VirtualMachineNetworkAdapter {
  name: string;
  virtualNetworkId?: string;
  macAddress?: string;
  isDisconnected: boolean;
  networkInterfaces?: VirtualMachineNetworkInterface[];
}

export interface VirtualMachineNetworkInterface {
  name: string;
  macAddress: string;
  ipAddress?: string;
  prefix?: number;
}

export interface VirtualMachineTemplate {
  name: string;
  revision: number;
  cores?: number;
  memory?: string;
  storage?: VirtualMachineTemplateStorage[];
}

export interface VirtualMachineTemplateStorage {
  controllerType: string;
  controllerIndex: number;
  size?: number;
}

// ==================== Virtual Network Types ====================

export interface VirtualNetwork {
  id: string; // UUID
  index: number;
  name: string;
  tag?: number;
  remoteNetworkId?: string;
}

// ==================== Remote Network Types ====================

export interface RemoteNetworkMember {
  id: string;
  name?: string;
  description?: string;
  ipAddresses?: string[];
  online: boolean;
  authorized: boolean;
  created: string; // ISO DateTime
  lastOnline?: string;
  latency?: number;
  phyiscalIPAddress?: string; // Note: typo in API
  clientVersion?: string;
}

export interface RemoteNetworkIPAssignmentPool {
  ipRangeEnd: string;
  ipRangeStart: string;
}

export interface RemoteNetworkRoute {
  target: string;
  via?: string;
}

// ==================== Descriptor Types (for creating/updating) ====================

export interface WorkspaceDescriptor {
  name: string;
  description?: string;
  organizationId?: string;
  bastion?: BastionDescriptor;
  virtualNetworks?: VirtualNetworkDescriptor[];
  virtualMachines?: VirtualMachineDescriptor[];
}

export interface BastionDescriptor {
  templateName?: string;
  templateRevision?: number;
  operation?: VirtualMachineDescriptorOperation;
}

export interface VirtualNetworkDescriptor {
  name?: string;
  gateway?: VirtualNetworkGatewayDescriptor;
  enableRemoteNetwork: boolean;
  remoteNetworkAddressCIDR?: string;
  remoteNetworkIPRangeStart?: string;
  remoteNetworkIPRangeEnd?: string;
  remoteNetworkBastionIPAddress?: string;
  operation?: VirtualNetworkDescriptorOperation;
}

export interface VirtualNetworkGatewayDescriptor {
  templateName?: string;
  templateRevision?: number;
  wanNetworkType?: VirtualNetworkGatewayWANNetworkType;
  refInternalWANVirtualNetworkName?: string;
  operation?: VirtualMachineDescriptorOperation;
}

export interface VirtualMachineDescriptor {
  name?: string;
  templateName?: string;
  templateRevision?: number;
  cpuCores?: number;
  memoryMB?: string;
  networkAdapters?: VirtualMachineNetworkAdapterDescriptor[];
  operation?: VirtualMachineDescriptorOperation;
}

export interface VirtualMachineNetworkAdapterDescriptor {
  name?: string;
  refVirtualNetworkName?: string;
  macAddress?: string;
  isDisconnected?: boolean;
  isFirewallEnabled?: boolean;
  enableRemoteNetwork: boolean;
  remoteNetworkIPAddress?: string;
  operation?: VirtualNetworkDescriptorOperation;
}

// ==================== Enums ====================

export enum VirtualMachineDescriptorOperation {
  None = 0,
  Add = 1,
  Update = 2,
  Remove = 3,
  Reboot = 4,
  Restart = 5,
  Redeploy = 6,
}

export enum VirtualNetworkDescriptorOperation {
  None = 0,
  Add = 1,
  Update = 2,
  Remove = 3,
}

export enum VirtualNetworkGatewayWANNetworkType {
  Egress = 0,
  Internal = 1,
  Public = 2,
}

// ==================== OData Response Types ====================

export interface ODataResponse<T> {
  '@odata.context'?: string;
  '@odata.count'?: number;
  value: T[];
}

export interface ODataSingleResponse<T> extends Omit<T, never> {
  '@odata.context'?: string;
}

// ==================== API Error Types ====================

export interface MDCApiError {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{
      code?: string;
      message?: string;
      target?: string;
    }>;
  };
}
