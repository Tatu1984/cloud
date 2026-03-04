"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  Server,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useOrganization } from "@/lib/mdc/hooks";

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

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const { data: org, isLoading, isError, refetch, isFetching } = useOrganization(orgId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{org?.name ?? "Organization"}</h1>
          )}
          <p className="text-sm text-muted-foreground font-mono">{orgId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              {[0,1,2].map(i => <Skeleton key={i} className="h-4 w-full" />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[0,1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Failed to load organization.{" "}
            <Button variant="link" className="px-1" onClick={() => refetch()}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {org && (
        <>
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">Name</dt>
                  <dd className="mt-1 font-medium">{org.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">Status</dt>
                  <dd className="mt-1">
                    {org.active ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 text-sm font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">Description</dt>
                  <dd className="mt-1 text-sm">{org.description || <span className="text-muted-foreground italic">—</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">ID</dt>
                  <dd className="mt-1 font-mono text-xs text-muted-foreground break-all">{org.id}</dd>
                </div>
              </dl>

              <Separator className="my-4" />

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-3xl font-bold">{org.siteIds.length}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <Globe className="h-3 w-3" /> Sites
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-3xl font-bold">{org.workspaceIds.length}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <Server className="h-3 w-3" /> Workspaces
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-3xl font-bold">{org.organizationUserRoles?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <Users className="h-3 w-3" /> Members
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Members
              </CardTitle>
              <CardDescription>
                Users with access to this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(org.organizationUserRoles?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No members assigned</p>
              ) : (
                <div className="divide-y rounded-lg border overflow-hidden">
                  {org.organizationUserRoles!.map((ur, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-mono text-foreground">{ur.userName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{ur.userId}</p>
                      </div>
                      <RoleBadge role={ur.role} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Site IDs */}
          {org.siteIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4" />
                  Sites
                </CardTitle>
                <CardDescription>{org.siteIds.length} site{org.siteIds.length !== 1 ? "s" : ""} linked to this organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {org.siteIds.map((id) => (
                    <Badge key={id} variant="outline" className="font-mono text-xs">
                      {id}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workspace IDs */}
          {org.workspaceIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="h-4 w-4" />
                  Workspaces
                </CardTitle>
                <CardDescription>{org.workspaceIds.length} workspace{org.workspaceIds.length !== 1 ? "s" : ""} in this organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {org.workspaceIds.map((id) => (
                    <Badge key={id} variant="outline" className="font-mono text-xs">
                      {id}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
