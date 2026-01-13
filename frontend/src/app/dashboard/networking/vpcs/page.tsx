"use client";

import Link from "next/link";
import { Plus, MoreHorizontal, Network, Globe, Lock } from "lucide-react";
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
import { mockVPCs } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";

export default function VPCsPage() {
  const { currentProject } = useAuthStore();
  const vpcs = mockVPCs.filter((v) => v.projectId === currentProject?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virtual Private Clouds</h1>
          <p className="text-muted-foreground">
            Manage isolated virtual networks for your resources
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/networking/vpcs/create">
            <Plus className="mr-2 h-4 w-4" />
            Create VPC
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {vpcs.map((vpc) => (
          <Card key={vpc.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Network className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{vpc.name}</CardTitle>
                  <CardDescription>
                    {vpc.cidr} / {vpc.region}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit VPC</DropdownMenuItem>
                  <DropdownMenuItem>Add Subnet</DropdownMenuItem>
                  <DropdownMenuItem>Route Tables</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    Delete VPC
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center border rounded-lg p-4">
                  <div>
                    <p className="text-2xl font-bold">{vpc.subnets.length}</p>
                    <p className="text-xs text-muted-foreground">Subnets</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vpc.subnets.filter((s) => s.isPublic).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Public</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vpc.subnets.filter((s) => !s.isPublic).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Private</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {new Set(vpc.subnets.map((s) => s.zone)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">AZs</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subnet Name</TableHead>
                      <TableHead>CIDR Block</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vpc.subnets.map((subnet) => (
                      <TableRow key={subnet.id}>
                        <TableCell className="font-medium">{subnet.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {subnet.cidr}
                          </code>
                        </TableCell>
                        <TableCell>{subnet.zone}</TableCell>
                        <TableCell>
                          <Badge variant={subnet.isPublic ? "default" : "secondary"}>
                            {subnet.isPublic ? (
                              <><Globe className="mr-1 h-3 w-3" /> Public</>
                            ) : (
                              <><Lock className="mr-1 h-3 w-3" /> Private</>
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
