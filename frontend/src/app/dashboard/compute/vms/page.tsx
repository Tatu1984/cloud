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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVMs, setSelectedVMs] = useState<string[]>([]);

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
                <Button variant="outline" size="sm">
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
                <Button variant="outline" size="sm">
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
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
                      <Link
                        href={`/dashboard/compute/vms/${vm.id}`}
                        className="font-medium hover:underline"
                      >
                        {vm.name}
                      </Link>
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
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">Private:</span>
                        <code className="text-xs bg-muted px-1 rounded">{vm.privateIp}</code>
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
                        <DropdownMenuItem>
                          <Terminal className="mr-2 h-4 w-4" />
                          Console
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {vm.status === "running" ? (
                          <>
                            <DropdownMenuItem>
                              <Square className="mr-2 h-4 w-4" />
                              Stop
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restart
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem>
                            <Play className="mr-2 h-4 w-4" />
                            Start
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
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
    </div>
  );
}
