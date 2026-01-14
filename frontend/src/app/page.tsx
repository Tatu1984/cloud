'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Shield, User, Server, Database, Network } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Cloud className="h-12 w-12 text-blue-500" />
            <h1 className="text-4xl font-bold text-white">Cloud Platform</h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Enterprise-grade cloud infrastructure management platform.
            Deploy, manage, and scale your infrastructure with ease.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center p-6">
            <Server className="h-10 w-10 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Compute</h3>
            <p className="text-slate-400 text-sm">Virtual machines, Kubernetes clusters, and container orchestration</p>
          </div>
          <div className="flex flex-col items-center text-center p-6">
            <Database className="h-10 w-10 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Storage</h3>
            <p className="text-slate-400 text-sm">Block storage, object storage, and distributed file systems</p>
          </div>
          <div className="flex flex-col items-center text-center p-6">
            <Network className="h-10 w-10 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Networking</h3>
            <p className="text-slate-400 text-sm">VPCs, load balancers, and software-defined networking</p>
          </div>
        </div>

        {/* Sign In Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* User Sign In */}
          <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle className="text-white">User Dashboard</CardTitle>
              <CardDescription className="text-slate-400">
                Access your cloud resources, manage deployments, and monitor usage
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/auth/login">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Sign In as User
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Sign In */}
          <Card className="bg-slate-800/50 border-slate-700 hover:border-red-500/50 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-white">Admin Console</CardTitle>
              <CardDescription className="text-slate-400">
                Manage infrastructure, tenants, and platform operations
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/auth/admin/login">
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  Sign In as Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-slate-500 text-sm">
          <p>Cloud Platform v1.0 | Powered by Next.js & Go</p>
        </div>
      </div>
    </div>
  );
}
