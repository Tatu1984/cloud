// MicroDataCluster API Types
// Based on https://www.microdatacluster.com/swagger/index.html

// ==================== Core Entities ====================

export interface Organization {
  id: string; // UUID
  name: string;
  description?: string;
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
  displayName: string;
  isRegistered: boolean;
  appRoles: string[];
  organizationRoles: UserOrganizationRole[];
}

export interface UserOrganizationRole {
  organizationId: string;
  role: string;
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
  locked: boolean; // Prevents modification when true
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
  None = "None",
  Add = "add",
  Update = "Update",
  Remove = "Remove",
  Reboot = "Reboot",
  Restart = "Restart",
  Redeploy = "Redeploy",
}

export enum VirtualNetworkDescriptorOperation {
  None = "None",
  Add = "add",
  Update = "Update",
  Remove = "Remove",
}

export enum VirtualNetworkGatewayWANNetworkType {
  Egress = "Egress",
  Internal = "Internal",
  Public = "Public",
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

// ==================== Site Descriptor Types ====================

export interface SiteDescriptor {
  memberAddress: string; // ZeroTier node address
  registrationUserName: string; // Proxmox user
  registrationPassword: string; // Proxmox password
  description?: string;
  validateServerCertificate?: boolean;
  port?: number;
  timeout?: number;
  organizationIds?: string[];
  importToOrganizationId?: string;
}

// ==================== Template Types ====================

export interface Template {
  name: string;
  revision: number;
  type: string;
  cores?: number;
  memory?: string;
  storage?: VirtualMachineTemplateStorage[];
  size?: number;
  downloaded: boolean;
  digest: string;
}

export interface DownloadTemplateDescriptor {
  digest: string;
}

// ==================== Organization Descriptor Types ====================

export interface OrganizationDescriptor {
  name: string;
  organizationUserRoles?: OrganizationUserRoleDescriptor[];
  siteIds: string[];
}

export interface OrganizationUserRoleDescriptor {
  userId: string;
  role: string;
}

// ==================== Remote Network Update Types ====================

export interface RemoteNetworkUpdate {
  ipAssignmentPools?: RemoteNetworkIPAssignmentPool[];
  managedRoutes?: RemoteNetworkRoute[];
  members?: RemoteNetworkMemberUpdate[];
}

export interface RemoteNetworkMemberUpdate {
  id: string;
  authorized?: boolean;
  name?: string;
  description?: string;
  ipAssignments?: string[];
}

// ==================== User Registration Types ====================

export interface UserRegistrationDescriptor {
  id: string; // Azure AD Object ID
  organizationRoles?: UserOrganizationRole[];
  applicationRoles?: string[];
}

export interface UserUpdateDescriptor {
  addOrganizationRoles?: UserOrganizationRole[];
  removeOrganizationRoles?: UserOrganizationRole[];
  addApplicationRoles?: string[];
  removeApplicationRoles?: string[];
}

// ==================== Workspace Lock Types ====================

export interface WorkspaceLockDescriptor {
  locked: boolean;
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
