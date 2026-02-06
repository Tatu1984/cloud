// MicroDataCluster API Client
// Connects to the MDC WebAPI backend (OData endpoints)

import {
  Organization,
  Site,
  User,
  Workspace,
  RemoteNetwork,
  WorkspaceDescriptor,
  ODataResponse,
  MDCApiError,
  SiteDescriptor,
  Template,
  DownloadTemplateDescriptor,
  OrganizationDescriptor,
  RemoteNetworkUpdate,
} from './types';

// Production MDC API URL
const PRODUCTION_MDC_URL = 'https://www.microdatacluster.com';
const LOCAL_MDC_URL = 'http://localhost:5000';

// Get MDC API URL - called at runtime, not build time
function getMdcBaseUrl(): string {
  // If explicitly set via environment variable, use that
  if (process.env.NEXT_PUBLIC_MDC_API_URL) {
    return process.env.NEXT_PUBLIC_MDC_API_URL;
  }

  // In browser, check if we're on localhost for local development
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // Only use localhost API when running locally
    if (isLocalhost) {
      return LOCAL_MDC_URL;
    }
  }

  // Default to production URL (safe for SSR and production deployments)
  return PRODUCTION_MDC_URL;
}

export interface MDCClientConfig {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | null>;
}

export class MDCClient {
  private baseUrl: string;
  private getAccessToken?: () => Promise<string | null>;

  constructor(config: MDCClientConfig = {}) {
    // Call getMdcBaseUrl() at runtime so browser can detect hostname
    this.baseUrl = config.baseUrl || getMdcBaseUrl();
    this.getAccessToken = config.getAccessToken;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData: MDCApiError = await response.json().catch(() => ({}));
      throw new MDCError(
        errorData.error?.message || `Request failed: ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  // ==================== Organizations ====================

  async getOrganizations(): Promise<Organization[]> {
    const response = await this.request<ODataResponse<Organization>>('/odata/Organizations');
    return response.value;
  }

  async getOrganization(id: string): Promise<Organization> {
    return this.request<Organization>(`/odata/Organizations(${id})`);
  }

  async createOrganization(descriptor: OrganizationDescriptor): Promise<Organization> {
    return this.request<Organization>('/odata/Organizations', {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async updateOrganization(id: string, descriptor: Partial<OrganizationDescriptor>): Promise<void> {
    await this.request(`/odata/Organizations(${id})`, {
      method: 'PATCH',
      body: JSON.stringify(descriptor),
    });
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.request(`/odata/Organizations(${id})`, {
      method: 'DELETE',
    });
  }

  // ==================== Sites ====================

  async getSites(): Promise<Site[]> {
    const response = await this.request<ODataResponse<Site>>('/odata/Sites');
    return response.value;
  }

  async getSite(id: string): Promise<Site> {
    return this.request<Site>(`/odata/Sites(${id})`);
  }

  async getSiteWorkspaces(siteId: string): Promise<Workspace[]> {
    const response = await this.request<ODataResponse<Workspace>>(`/odata/Sites(${siteId})/Workspaces`);
    return response.value;
  }

  async createSite(descriptor: SiteDescriptor): Promise<Site> {
    return this.request<Site>('/odata/Sites', {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async updateSite(siteId: string, delta: Partial<Site>): Promise<void> {
    await this.request(`/odata/Sites(${siteId})`, {
      method: 'PATCH',
      body: JSON.stringify(delta),
    });
  }

  async deleteSite(siteId: string): Promise<void> {
    await this.request(`/odata/Sites(${siteId})`, {
      method: 'DELETE',
    });
  }

  async getDownloadableTemplates(siteId: string): Promise<Template[]> {
    const response = await this.request<ODataResponse<Template>>(`/odata/Sites(${siteId})/DownloadableTemplates`);
    return response.value;
  }

  async downloadTemplate(siteId: string, descriptor: DownloadTemplateDescriptor): Promise<void> {
    await this.request(`/odata/Sites(${siteId})/DownloadTemplate`, {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async addWorkspaceToSite(siteId: string, descriptor: WorkspaceDescriptor): Promise<Workspace> {
    return this.request<Workspace>(`/odata/Sites(${siteId})/Workspaces`, {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  // ==================== Users ====================

  async getUsers(): Promise<User[]> {
    const response = await this.request<ODataResponse<User>>('/odata/Users');
    return response.value;
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/odata/Users(${id})`);
  }

  // ==================== Workspaces ====================

  async getWorkspaces(): Promise<Workspace[]> {
    const response = await this.request<ODataResponse<Workspace>>('/odata/Workspaces');
    return response.value;
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.request<Workspace>(`/odata/Workspaces(${id})`);
  }

  async getWorkspaceDescriptor(workspaceId: string): Promise<WorkspaceDescriptor> {
    return this.request<WorkspaceDescriptor>(`/odata/Workspaces(${workspaceId})/Descriptor`);
  }

  async createWorkspace(siteId: string, descriptor: WorkspaceDescriptor): Promise<Workspace> {
    return this.request<Workspace>(`/odata/Workspaces?siteId=${siteId}`, {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async updateWorkspaceDescriptor(
    workspaceId: string,
    delta: Partial<WorkspaceDescriptor>
  ): Promise<WorkspaceDescriptor> {
    return this.request<WorkspaceDescriptor>(`/odata/Workspaces(${workspaceId})/UpdateDescriptor`, {
      method: 'PUT',
      body: JSON.stringify(delta),
    });
  }

  async lockWorkspace(workspaceId: string, locked: boolean): Promise<void> {
    await this.request(`/odata/Workspaces(${workspaceId})/Lock`, {
      method: 'PUT',
      body: JSON.stringify({ locked }),
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.request(`/odata/Workspaces(${workspaceId})`, {
      method: 'DELETE',
    });
  }

  // ==================== Remote Networks ====================

  async getRemoteNetworks(): Promise<RemoteNetwork[]> {
    const response = await this.request<ODataResponse<RemoteNetwork>>('/odata/RemoteNetworks');
    return response.value;
  }

  async getRemoteNetwork(id: string): Promise<RemoteNetwork> {
    return this.request<RemoteNetwork>(`/odata/RemoteNetworks(${id})`);
  }

  async updateRemoteNetwork(id: string, update: RemoteNetworkUpdate): Promise<void> {
    await this.request(`/odata/RemoteNetworks(${id})`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  // ==================== Auth Test ====================

  async testAuth(): Promise<boolean> {
    try {
      await this.request('/api/AuthTest/authenticated');
      return true;
    } catch {
      return false;
    }
  }

  async testAdminAuth(): Promise<boolean> {
    try {
      await this.request('/api/AuthTest/admin');
      return true;
    } catch {
      return false;
    }
  }
}

// Custom error class for MDC API errors
export class MDCError extends Error {
  public statusCode: number;
  public details: MDCApiError;

  constructor(message: string, statusCode: number, details: MDCApiError = {}) {
    super(message);
    this.name = 'MDCError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Default client instance
let defaultClient: MDCClient | null = null;

export function getMDCClient(config?: MDCClientConfig): MDCClient {
  if (!defaultClient || config) {
    defaultClient = new MDCClient(config);
  }
  return defaultClient;
}

// Helper to create client with MSAL token
export function createMDCClientWithMSAL(
  getAccessToken: () => Promise<string | null>
): MDCClient {
  return new MDCClient({
    getAccessToken,
  });
}
