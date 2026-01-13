"use client";

import Link from "next/link";
import { Plus, MoreHorizontal, HardDrive, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { Progress } from "@/components/ui/progress";
import { mockVolumes, mockVMs } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";

export default function VolumesPage() {
  const { currentProject } = useAuthStore();
  const volumes = mockVolumes.filter((v) => v.projectId === currentProject?.id);
  const totalStorage = volumes.reduce((sum, v) => sum + v.size, 0);
  const usedStorage = volumes.filter((v) => v.status === "in-use").reduce((sum, v) => sum + v.size, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Block Volumes</h1>
          <p className="text-muted-foreground">
            Manage persistent block storage volumes
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/storage/volumes/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Volume
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volumes</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{volumes.length}</div>
            <p className="text-xs text-muted-foreground">
              {volumes.filter((v) => v.status === "in-use").length} attached,{" "}
              {volumes.filter((v) => v.status === "available").length} available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStorage} GB</div>
            <Progress value={(usedStorage / totalStorage) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usedStorage} GB attached
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <span className="text-2xl">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalStorage * 0.10).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              $0.10 per GB/month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volumes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Volumes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attached To</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {volumes.map((volume) => {
                const attachedVM = mockVMs.find((vm) => vm.id === volume.attachedTo);
                return (
                  <TableRow key={volume.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{volume.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{volume.size} GB</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {volume.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          volume.status === "in-use"
                            ? "default"
                            : volume.status === "available"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {volume.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {attachedVM ? (
                        <Link
                          href={`/dashboard/compute/vms/${attachedVM.id}`}
                          className="flex items-center gap-1 text-sm hover:underline"
                        >
                          <Link2 className="h-3 w-3" />
                          {attachedVM.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{volume.region}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {volume.status === "available" ? (
                            <DropdownMenuItem>Attach to VM</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>Detach</DropdownMenuItem>
                          )}
                          <DropdownMenuItem>Resize</DropdownMenuItem>
                          <DropdownMenuItem>Create Snapshot</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            Delete Volume
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
