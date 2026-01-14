'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Info, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

// Demo credentials
const DEMO_USER = {
  email: 'user@demo.com',
  password: 'demo123',
};

export default function UserLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (email === DEMO_USER.email && password === DEMO_USER.password) {
      login(
        {
          id: 'user-2',
          email: DEMO_USER.email,
          name: 'Demo User',
          role: 'user',
          organizationId: 'org-1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'org-1',
          name: 'Demo Organization',
          slug: 'demo-org',
          plan: 'professional',
          createdAt: new Date().toISOString(),
        }
      );
      router.push('/dashboard');
    } else {
      setError('Invalid credentials. Please use the demo credentials shown below.');
    }

    setLoading(false);
  };

  const fillDemoCredentials = () => {
    setEmail(DEMO_USER.email);
    setPassword(DEMO_USER.password);
  };

  return (
    <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-blue-500" />
        </div>
        <CardTitle className="text-white text-2xl">User Sign In</CardTitle>
        <CardDescription className="text-slate-400">
          Access your cloud dashboard
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Demo Credentials Box */}
        <Alert className="bg-blue-500/10 border-blue-500/30">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-slate-300">
            <div className="font-semibold text-blue-400 mb-2">Demo Credentials</div>
            <div className="space-y-1 text-sm">
              <p><span className="text-slate-400">Email:</span> <code className="bg-slate-700 px-2 py-0.5 rounded">{DEMO_USER.email}</code></p>
              <p><span className="text-slate-400">Password:</span> <code className="bg-slate-700 px-2 py-0.5 rounded">{DEMO_USER.password}</code></p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              onClick={fillDemoCredentials}
            >
              Use Demo Credentials
            </Button>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <div className="text-center text-sm text-slate-400">
          Need admin access?{' '}
          <Link href="/auth/admin/login" className="text-red-400 hover:text-red-300">
            Admin Login
          </Link>
        </div>
        <Link href="/" className="flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </CardFooter>
    </Card>
  );
}
