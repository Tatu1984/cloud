'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useMicrosoftAuth } from '@/hooks/use-microsoft-auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { handleRedirectCallback } = useMicrosoftAuth();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const result = await handleRedirectCallback();

        if (result) {
          // Successfully authenticated - redirect based on role
          if (result.user?.roles?.includes('admin') || result.user?.roles?.includes('operator')) {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        } else {
          // No result - might be a fresh page load, redirect to login
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    processCallback();
  }, [handleRedirectCallback, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <a href="/auth/login" className="text-blue-400 hover:text-blue-300">
                Return to login
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-slate-300 text-lg">Completing authentication...</p>
          <p className="text-slate-500 text-sm mt-2">Please wait while we sign you in</p>
        </CardContent>
      </Card>
    </div>
  );
}
