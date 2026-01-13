"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Package,
  HardDrive,
  Download,
  Upload,
  Tag,
  Calendar,
  Copy,
  Trash2,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Globe,
  Shield,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/auth-store";

// Container image interface
interface ContainerImage {
  id: string;
  name: string;
  repository: string;
  tags: ImageTag[];
  visibility: "private" | "public";
  size: number; // bytes
  pullCount: number;
  pushCount: number;
  lastPush: string;
  lastPull: string;
  createdAt: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface ImageTag {
  name: string;
  digest: string;
  size: number;
  pushedAt: string;
  architecture: string;
  os: string;
}

// Registry statistics
interface RegistryStats {
  totalRepositories: number;
  totalImages: number;
  totalStorage: number;
  totalPulls: number;
  totalPushes: number;
  storageLimit: number;
}

// Mock data for container images
const mockImages: ContainerImage[] = [
  {
    id: "img-001",
    name: "api-server",
    repository: "acme-corp/api-server",
    tags: [
      {
        name: "latest",
        digest: "sha256:abc123def456...",
        size: 245000000,
        pushedAt: "2024-03-18T14:30:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v2.5.1",
        digest: "sha256:abc123def456...",
        size: 245000000,
        pushedAt: "2024-03-18T14:30:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v2.5.0",
        digest: "sha256:def789ghi012...",
        size: 243000000,
        pushedAt: "2024-03-15T10:15:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v2.4.3",
        digest: "sha256:ghi345jkl678...",
        size: 240000000,
        pushedAt: "2024-03-01T08:45:00Z",
        architecture: "amd64",
        os: "linux",
      },
    ],
    visibility: "private",
    size: 973000000,
    pullCount: 15420,
    pushCount: 342,
    lastPush: "2024-03-18T14:30:00Z",
    lastPull: "2024-03-18T16:45:00Z",
    createdAt: "2024-01-15T09:00:00Z",
    vulnerabilities: { critical: 0, high: 2, medium: 5, low: 12 },
  },
  {
    id: "img-002",
    name: "web-frontend",
    repository: "acme-corp/web-frontend",
    tags: [
      {
        name: "latest",
        digest: "sha256:mno901pqr234...",
        size: 185000000,
        pushedAt: "2024-03-17T11:20:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v3.1.0",
        digest: "sha256:mno901pqr234...",
        size: 185000000,
        pushedAt: "2024-03-17T11:20:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v3.0.2",
        digest: "sha256:stu567vwx890...",
        size: 182000000,
        pushedAt: "2024-03-10T09:30:00Z",
        architecture: "amd64",
        os: "linux",
      },
    ],
    visibility: "private",
    size: 552000000,
    pullCount: 8945,
    pushCount: 256,
    lastPush: "2024-03-17T11:20:00Z",
    lastPull: "2024-03-18T15:30:00Z",
    createdAt: "2024-01-15T09:15:00Z",
    vulnerabilities: { critical: 0, high: 0, medium: 3, low: 8 },
  },
  {
    id: "img-003",
    name: "worker-service",
    repository: "acme-corp/worker-service",
    tags: [
      {
        name: "latest",
        digest: "sha256:yza123bcd456...",
        size: 312000000,
        pushedAt: "2024-03-16T16:45:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v1.8.0",
        digest: "sha256:yza123bcd456...",
        size: 312000000,
        pushedAt: "2024-03-16T16:45:00Z",
        architecture: "amd64",
        os: "linux",
      },
    ],
    visibility: "private",
    size: 624000000,
    pullCount: 5672,
    pushCount: 128,
    lastPush: "2024-03-16T16:45:00Z",
    lastPull: "2024-03-18T12:00:00Z",
    createdAt: "2024-02-01T14:00:00Z",
    vulnerabilities: { critical: 1, high: 3, medium: 7, low: 15 },
  },
  {
    id: "img-004",
    name: "nginx-proxy",
    repository: "acme-corp/nginx-proxy",
    tags: [
      {
        name: "latest",
        digest: "sha256:efg789hij012...",
        size: 45000000,
        pushedAt: "2024-03-10T08:00:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v1.25.4",
        digest: "sha256:efg789hij012...",
        size: 45000000,
        pushedAt: "2024-03-10T08:00:00Z",
        architecture: "amd64",
        os: "linux",
      },
    ],
    visibility: "public",
    size: 90000000,
    pullCount: 25890,
    pushCount: 45,
    lastPush: "2024-03-10T08:00:00Z",
    lastPull: "2024-03-18T17:00:00Z",
    createdAt: "2024-01-20T10:00:00Z",
    vulnerabilities: { critical: 0, high: 0, medium: 1, low: 4 },
  },
  {
    id: "img-005",
    name: "redis-cache",
    repository: "acme-corp/redis-cache",
    tags: [
      {
        name: "latest",
        digest: "sha256:klm345nop678...",
        size: 128000000,
        pushedAt: "2024-03-05T14:30:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "7.2-alpine",
        digest: "sha256:klm345nop678...",
        size: 128000000,
        pushedAt: "2024-03-05T14:30:00Z",
        architecture: "amd64",
        os: "linux",
      },
    ],
    visibility: "private",
    size: 256000000,
    pullCount: 12340,
    pushCount: 78,
    lastPush: "2024-03-05T14:30:00Z",
    lastPull: "2024-03-18T16:00:00Z",
    createdAt: "2024-01-25T11:00:00Z",
    vulnerabilities: { critical: 0, high: 1, medium: 2, low: 6 },
  },
  {
    id: "img-006",
    name: "ml-pipeline",
    repository: "acme-corp/ml-pipeline",
    tags: [
      {
        name: "latest",
        digest: "sha256:qrs901tuv234...",
        size: 2850000000,
        pushedAt: "2024-03-14T09:00:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v0.9.5-cuda12",
        digest: "sha256:qrs901tuv234...",
        size: 2850000000,
        pushedAt: "2024-03-14T09:00:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v0.9.4-cuda12",
        digest: "sha256:wxy567zab890...",
        size: 2800000000,
        pushedAt: "2024-03-01T15:20:00Z",
        architecture: "amd64",
        os: "linux",
      },
    ],
    visibility: "private",
    size: 8500000000,
    pullCount: 2456,
    pushCount: 89,
    lastPush: "2024-03-14T09:00:00Z",
    lastPull: "2024-03-18T10:30:00Z",
    createdAt: "2024-02-15T08:00:00Z",
    vulnerabilities: { critical: 2, high: 5, medium: 12, low: 28 },
  },
  {
    id: "img-007",
    name: "postgres-backup",
    repository: "acme-corp/postgres-backup",
    tags: [
      {
        name: "latest",
        digest: "sha256:cde123fgh456...",
        size: 95000000,
        pushedAt: "2024-02-28T12:00:00Z",
        architecture: "amd64",
        os: "linux",
      },
      {
        name: "v1.2.0",
        digest: "sha256:cde123fgh456...",
        size: 95000000,
        pushedAt: "2024-02-28T12:00:00Z",
        architecture: "amd64",
        os: "linux",
      },
    ],
    visibility: "private",
    size: 190000000,
    pullCount: 3210,
    pushCount: 34,
    lastPush: "2024-02-28T12:00:00Z",
    lastPull: "2024-03-18T06:00:00Z",
    createdAt: "2024-01-30T09:00:00Z",
    vulnerabilities: { critical: 0, high: 0, medium: 0, low: 3 },
  },
];

// Mock registry stats
const mockStats: RegistryStats = {
  totalRepositories: 7,
  totalImages: 18,
  totalStorage: 11185000000, // ~11 GB
  totalPulls: 73933,
  totalPushes: 972,
  storageLimit: 50000000000, // 50 GB
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function getVulnerabilityBadge(vulns: ContainerImage["vulnerabilities"]) {
  const total = vulns.critical + vulns.high + vulns.medium + vulns.low;
  if (vulns.critical > 0) {
    return (
      <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/25 border-0">
        <AlertCircle className="mr-1 h-3 w-3" />
        {vulns.critical} Critical
      </Badge>
    );
  }
  if (vulns.high > 0) {
    return (
      <Badge className="bg-orange-500/15 text-orange-700 hover:bg-orange-500/25 border-0">
        {vulns.high} High
      </Badge>
    );
  }
  if (total === 0) {
    return (
      <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-0">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Clean
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-0">
      {total} Issues
    </Badge>
  );
}

export default function RegistryPage() {
  const { currentProject } = useAuthStore();
  const [images, setImages] = useState<ContainerImage[]>(mockImages);
  const [stats] = useState<RegistryStats>(mockStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ContainerImage | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    visibility: "private" as "private" | "public",
    description: "",
  });

  // Filter images
  const filteredImages = images.filter((image) => {
    const matchesSearch =
      image.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      image.repository.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVisibility =
      visibilityFilter === "all" || image.visibility === visibilityFilter;
    return matchesSearch && matchesVisibility;
  });

  const handleCreateRepository = () => {
    const newImage: ContainerImage = {
      id: `img-${Date.now()}`,
      name: formData.name,
      repository: `acme-corp/${formData.name}`,
      tags: [],
      visibility: formData.visibility,
      size: 0,
      pullCount: 0,
      pushCount: 0,
      lastPush: "",
      lastPull: "",
      createdAt: new Date().toISOString(),
      vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
    };
    setImages([newImage, ...images]);
    setCreateDialogOpen(false);
    setFormData({ name: "", visibility: "private", description: "" });
  };

  const handleDeleteImage = (imageId: string) => {
    setImages(images.filter((img) => img.id !== imageId));
  };

  const handleViewImage = (image: ContainerImage) => {
    setSelectedImage(image);
    setViewDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const storagePercentage = Math.round((stats.totalStorage / stats.storageLimit) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Container Registry</h1>
          <p className="text-muted-foreground">
            Store and manage your container images
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Repository
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Repository</DialogTitle>
              <DialogDescription>
                Create a new container image repository
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="repo-name">Repository Name</Label>
                <Input
                  id="repo-name"
                  placeholder="e.g., my-application"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Full path: registry.cloudplatform.io/acme-corp/{formData.name || "my-application"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: "private" | "public") =>
                    setFormData({ ...formData, visibility: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      <div className="flex items-center">
                        <Lock className="mr-2 h-4 w-4" />
                        Private
                      </div>
                    </SelectItem>
                    <SelectItem value="public">
                      <div className="flex items-center">
                        <Globe className="mr-2 h-4 w-4" />
                        Public
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.visibility === "private"
                    ? "Only authenticated users can pull images"
                    : "Anyone can pull images from this repository"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRepository}
                disabled={!formData.name}
              >
                Create Repository
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repositories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRepositories}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalImages} total images
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(stats.totalStorage)}
            </div>
            <div className="mt-2">
              <Progress value={storagePercentage} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">
                {storagePercentage}% of {formatBytes(stats.storageLimit)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pulls</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalPulls)}
            </div>
            <p className="text-xs text-muted-foreground">All time downloads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pushes</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalPushes)}
            </div>
            <p className="text-xs text-muted-foreground">All time uploads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registry URL</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded truncate">
                registry.cloudplatform.io
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard("registry.cloudplatform.io")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Repositories List */}
      {filteredImages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Box className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No repositories found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? "No repositories match your search"
                : "Create your first repository to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Repository
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Repositories</CardTitle>
            <CardDescription>
              {filteredImages.length} repositories found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Pulls / Pushes</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredImages.map((image) => (
                  <TableRow key={image.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{image.name}</span>
                            {image.visibility === "private" ? (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Globe className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-muted-foreground">
                              {image.repository}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() =>
                                copyToClipboard(
                                  `registry.cloudplatform.io/${image.repository}`
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        <span>{image.tags.length}</span>
                      </div>
                      {image.tags.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Latest: {image.tags[0].name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatBytes(image.size)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <ArrowDownToLine className="h-3 w-3 text-green-600" />
                          <span>{formatNumber(image.pullCount)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowUpFromLine className="h-3 w-3 text-blue-600" />
                          <span>{formatNumber(image.pushCount)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getVulnerabilityBadge(image.vulnerabilities)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {image.lastPush && (
                          <div className="flex items-center gap-1">
                            <Upload className="h-3 w-3 text-muted-foreground" />
                            <span>{formatRelativeTime(image.lastPush)}</span>
                          </div>
                        )}
                        {image.lastPull && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Download className="h-3 w-3" />
                            <span>{formatRelativeTime(image.lastPull)}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewImage(image)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Tags
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              copyToClipboard(
                                `docker pull registry.cloudplatform.io/${image.repository}:latest`
                              )
                            }
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Pull Command
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="mr-2 h-4 w-4" />
                            Scan for Vulnerabilities
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteImage(image.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Repository
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* View Image Tags Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedImage?.name}
            </DialogTitle>
            <DialogDescription>
              <code className="text-xs">
                registry.cloudplatform.io/{selectedImage?.repository}
              </code>
            </DialogDescription>
          </DialogHeader>

          {selectedImage && (
            <Tabs defaultValue="tags" className="mt-4">
              <TabsList>
                <TabsTrigger value="tags">Tags ({selectedImage.tags.length})</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="usage">Usage</TabsTrigger>
              </TabsList>

              <TabsContent value="tags" className="mt-4">
                {selectedImage.tags.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tags found. Push an image to create the first tag.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Digest</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>OS/Arch</TableHead>
                        <TableHead>Pushed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedImage.tags.map((tag, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">
                              <Tag className="mr-1 h-3 w-3" />
                              {tag.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {tag.digest.substring(0, 20)}...
                            </code>
                          </TableCell>
                          <TableCell>{formatBytes(tag.size)}</TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {tag.os}/{tag.architecture}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatRelativeTime(tag.pushedAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  `docker pull registry.cloudplatform.io/${selectedImage.repository}:${tag.name}`
                                )
                              }
                            >
                              <Copy className="mr-2 h-3 w-3" />
                              Copy
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="security" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-red-600">
                            {selectedImage.vulnerabilities.critical}
                          </div>
                          <p className="text-sm text-muted-foreground">Critical</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-orange-600">
                            {selectedImage.vulnerabilities.high}
                          </div>
                          <p className="text-sm text-muted-foreground">High</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-yellow-600">
                            {selectedImage.vulnerabilities.medium}
                          </div>
                          <p className="text-sm text-muted-foreground">Medium</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">
                            {selectedImage.vulnerabilities.low}
                          </div>
                          <p className="text-sm text-muted-foreground">Low</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">Last scanned: 2 hours ago</span>
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Rescan
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="usage" className="mt-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Pull Command
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded overflow-x-auto">
                            docker pull registry.cloudplatform.io/{selectedImage.repository}:latest
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(
                                `docker pull registry.cloudplatform.io/${selectedImage.repository}:latest`
                              )
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Push Command
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded overflow-x-auto">
                            docker push registry.cloudplatform.io/{selectedImage.repository}:TAG
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(
                                `docker push registry.cloudplatform.io/${selectedImage.repository}:TAG`
                              )
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold">
                            {formatNumber(selectedImage.pullCount)}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Pulls</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {formatNumber(selectedImage.pushCount)}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Pushes</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {formatBytes(selectedImage.size)}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Size</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {selectedImage.tags.length}
                          </div>
                          <p className="text-xs text-muted-foreground">Tags</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Kubernetes Deployment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${selectedImage.name}
spec:
  template:
    spec:
      containers:
      - name: ${selectedImage.name}
        image: registry.cloudplatform.io/${selectedImage.repository}:latest
        imagePullSecrets:
        - name: registry-credentials`}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
