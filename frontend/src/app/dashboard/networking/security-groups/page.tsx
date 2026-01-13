"use client";

import Link from "next/link";
import { Plus, MoreHorizontal, Shield, ArrowDownLeft, ArrowUpRight } from "lucide-react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { mockSecurityGroups } from "@/stores/mock-data";

export default function SecurityGroupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Groups</h1>
          <p className="text-muted-foreground">
            Configure firewall rules for your resources
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/networking/security-groups/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Security Group
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {mockSecurityGroups.map((sg) => (
          <Card key={sg.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-orange-500/10 p-2">
                  <Shield className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">{sg.name}</CardTitle>
                  <CardDescription>{sg.description}</CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit Rules</DropdownMenuItem>
                  <DropdownMenuItem>View Attached Resources</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    Delete Security Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="inbound">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      Inbound Rules ({sg.rules.filter((r) => r.direction === "inbound").length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocol</TableHead>
                          <TableHead>Port Range</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sg.rules
                          .filter((r) => r.direction === "inbound")
                          .map((rule) => (
                            <TableRow key={rule.id}>
                              <TableCell>
                                <Badge variant="outline">{rule.protocol.toUpperCase()}</Badge>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {rule.portRange}
                                </code>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {rule.source}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={rule.action === "allow" ? "default" : "destructive"}
                                >
                                  {rule.action}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="outbound">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-blue-500" />
                      Outbound Rules ({sg.rules.filter((r) => r.direction === "outbound").length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocol</TableHead>
                          <TableHead>Port Range</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sg.rules
                          .filter((r) => r.direction === "outbound")
                          .map((rule) => (
                            <TableRow key={rule.id}>
                              <TableCell>
                                <Badge variant="outline">{rule.protocol.toUpperCase()}</Badge>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {rule.portRange}
                                </code>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {rule.source}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={rule.action === "allow" ? "default" : "destructive"}
                                >
                                  {rule.action}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
