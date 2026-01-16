import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Organization, Project } from '@/types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  currentProject: Project | null;
  projects: Project[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissions: string[];
  accessToken: string | null;
  _hasHydrated: boolean;

  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setPermissions: (permissions: string[]) => void;
  setAccessToken: (token: string | null) => void;
  login: (user: User, org: Organization, accessToken?: string) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
  hasPermission: (permission: string) => boolean;
}

// Mock data for demo
const mockUser: User = {
  id: 'user-1',
  email: 'demo@cloudplatform.io',
  name: 'Demo User',
  role: 'admin',
  organizationId: 'org-1',
  avatar: undefined,
  createdAt: '2024-01-01T00:00:00Z',
};

const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Acme Corporation',
  slug: 'acme-corp',
  plan: 'professional',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Production',
    organizationId: 'org-1',
    description: 'Production environment',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'proj-2',
    name: 'Staging',
    organizationId: 'org-1',
    description: 'Staging environment',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'proj-3',
    name: 'Development',
    organizationId: 'org-1',
    description: 'Development sandbox',
    createdAt: '2024-02-01T00:00:00Z',
  },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      currentProject: null,
      projects: [],
      isAuthenticated: false,
      isAdmin: false,
      permissions: [],
      accessToken: null,
      _hasHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setOrganization: (organization) => set({ organization }),
      setCurrentProject: (currentProject) => set({ currentProject }),
      setProjects: (projects) => set({ projects }),
      setPermissions: (permissions) => set({ permissions }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      login: (user, organization, accessToken) => set({
        user,
        organization,
        currentProject: mockProjects[0],
        projects: mockProjects,
        isAuthenticated: true,
        isAdmin: user.role === 'admin' || user.role === 'operator',
        accessToken: accessToken || null,
      }),

      logout: () => set({
        user: null,
        organization: null,
        currentProject: null,
        projects: [],
        isAuthenticated: false,
        isAdmin: false,
        permissions: [],
        accessToken: null,
      }),

      hasPermission: (permission: string) => {
        const { permissions, isAdmin } = get();
        if (isAdmin) return true;

        return permissions.some(p => {
          if (p === permission) return true;
          // Check for wildcard permissions
          if (p.endsWith(':*')) {
            const resource = p.slice(0, -2);
            return permission.startsWith(resource + ':');
          }
          return false;
        });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
