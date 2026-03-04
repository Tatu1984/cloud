"use client";

import {
  Building2,
  Users,
  Server,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizations } from "@/lib/mdc/hooks";
import { Organization } from "@/lib/mdc/types";

function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    developer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${variants[role] ?? variants.viewer}`}>
      {role}
    </span>
  );
}

function OrgCard({ org }: { org: Organization }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{org.name}</CardTitle>
              <CardDescription className="text-xs font-mono">{org.id}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {org.active ? (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-300 dark:text-green-400 dark:border-green-700">
                <CheckCircle2 className="h-3 w-3" /> Active
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-red-500 border-red-300">
                <XCircle className="h-3 w-3" /> Inactive
              </Badge>
            )}
            <Link href={`/dashboard/settings/organization/${org.id}`}>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                Details <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold">{org.siteIds.length}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
              <Globe className="h-3 w-3" /> Sites
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold">{org.workspaceIds.length}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
              <Server className="h-3 w-3" /> Workspaces
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold">{org.organizationUserRoles?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
              <Users className="h-3 w-3" /> Members
            </p>
          </div>
        </div>

        {/* Members expandable */}
        {(org.organizationUserRoles?.length ?? 0) > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
              {expanded ? "Hide" : "Show"} members
            </Button>
            {expanded && (
              <div className="mt-2 divide-y rounded-lg border overflow-hidden">
                {org.organizationUserRoles!.map((ur, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-background">
                    <span className="text-sm font-mono text-muted-foreground truncate max-w-[60%]">
                      {ur.userName}
                    </span>
                    <RoleBadge role={ur.role} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrganizationPage() {
  const { data: organizations, isLoading, isError, refetch, isFetching } = useOrganizations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            All organizations registered in the MDC platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((j) => <Skeleton key={j} className="h-16 rounded-lg" />)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Failed to load organizations. <Button variant="link" className="px-1" onClick={() => refetch()}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {organizations && (
        <>
          <p className="text-sm text-muted-foreground">
            {organizations.length} organization{organizations.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {organizations.map((org) => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
