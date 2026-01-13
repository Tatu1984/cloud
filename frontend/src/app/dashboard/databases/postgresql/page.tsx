"use client";

import Link from "next/link";
import { Plus, MoreHorizontal, Database, Activity, Clock, Copy } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { mockDatabases } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";

export default function PostgreSQLPage() {
  const { currentProject } = useAuthStore();
  const databases = mockDatabases.filter(
    (db) => db.projectId === currentProject?.id && db.engine === "postgresql"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PostgreSQL Databases</h1>
          <p className="text-muted-foreground">
            Managed PostgreSQL database instances
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/databases/postgresql/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Database
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {databases.map((db) => (
          <Card key={db.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Database className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">{db.name}</CardTitle>
                  <CardDescription>PostgreSQL {db.version}</CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Connection Info</DropdownMenuItem>
                  <DropdownMenuItem>Create Backup</DropdownMenuItem>
                  <DropdownMenuItem>Resize</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Stop Database</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Delete Database
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={db.status === "running" ? "default" : "secondary"}>
                  {db.status}
                </Badge>
                <span className="text-sm text-muted-foreground">{db.region}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center border rounded-lg p-3">
                <div>
                  <p className="text-lg font-bold">{db.vcpus}</p>
                  <p className="text-xs text-muted-foreground">vCPUs</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{db.memory}</p>
                  <p className="text-xs text-muted-foreground">GB RAM</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{db.storage}</p>
                  <p className="text-xs text-muted-foreground">GB</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Storage Used</span>
                  <span>{Math.round(db.storage * 0.45)} / {db.storage} GB</span>
                </div>
                <Progress value={45} />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Endpoint</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                  {db.endpoint}
                </code>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Activity className="mr-2 h-4 w-4" />
                  Metrics
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Clock className="mr-2 h-4 w-4" />
                  Backups
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {databases.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No PostgreSQL databases</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first managed PostgreSQL database
            </p>
            <Button asChild>
              <Link href="/dashboard/databases/postgresql/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Database
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
