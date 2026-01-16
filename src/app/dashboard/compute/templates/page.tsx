"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { vmTemplates } from "@/stores/mock-data";
import { Badge } from "@/components/ui/badge";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">VM Templates</h1>
      <p className="text-muted-foreground">Pre-configured operating system images</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vmTemplates.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="text-lg">{t.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
              <div className="flex gap-2">
                <Badge variant="outline">{t.minVcpus}+ vCPU</Badge>
                <Badge variant="outline">{t.minMemory}+ GB RAM</Badge>
                <Badge variant="secondary">{t.category}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
