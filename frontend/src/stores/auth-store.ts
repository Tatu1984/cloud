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

  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  login: (user: User, org: Organization) => void;
  logout: () => void;
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
    (set) => ({
      user: null,
      organization: null,
      currentProject: null,
      projects: [],
      isAuthenticated: false,
      isAdmin: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setOrganization: (organization) => set({ organization }),
      setCurrentProject: (currentProject) => set({ currentProject }),
      setProjects: (projects) => set({ projects }),

      login: (user, organization) => set({
        user,
        organization,
        currentProject: mockProjects[0],
        projects: mockProjects,
        isAuthenticated: true,
        isAdmin: user.role === 'admin' || user.role === 'operator',
      }),

      logout: () => set({
        user: null,
        organization: null,
        currentProject: null,
        projects: [],
        isAuthenticated: false,
        isAdmin: false,
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
