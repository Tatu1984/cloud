// MicroDataCluster API Client
// Connects to https://www.microdatacluster.com/odata

import {
  Organization,
  Site,
  User,
  Workspace,
  RemoteNetwork,
  WorkspaceDescriptor,
  ODataResponse,
  MDCApiError,
} from './types';

const MDC_BASE_URL = process.env.NEXT_PUBLIC_MDC_API_URL || 'https://www.microdatacluster.com';

export interface MDCClientConfig {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | null>;
}

export class MDCClient {
  private baseUrl: string;
  private getAccessToken?: () => Promise<string | null>;

  constructor(config: MDCClientConfig = {}) {
    this.baseUrl = config.baseUrl || MDC_BASE_URL;
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

  // ==================== Sites ====================

  async getSites(): Promise<Site[]> {
    const response = await this.request<ODataResponse<Site>>('/odata/Sites');
    return response.value;
  }

  async getSite(id: string): Promise<Site> {
    return this.request<Site>(`/odata/Sites(${id})`);
  }

  async addWorkspaceToSite(siteId: string, descriptor: WorkspaceDescriptor): Promise<void> {
    await this.request(`/odata/Sites(${siteId})/AddWorkspace`, {
      method: 'POST',
      body: JSON.stringify({ workspaceDescriptor: descriptor }),
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

  async updateWorkspaceDescriptor(
    workspaceId: string,
    delta: Partial<WorkspaceDescriptor>
  ): Promise<WorkspaceDescriptor> {
    return this.request<WorkspaceDescriptor>(`/odata/Workspaces(${workspaceId})/UpdateDescriptor`, {
      method: 'POST',
      body: JSON.stringify({ delta }),
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
