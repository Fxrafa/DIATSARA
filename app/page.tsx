'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    };
    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full">
          <Loader2 className="h-12 w-12 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600 font-medium">Redirection en cours...</p>
        <p className="text-sm text-gray-400">DIATSARA</p>
      </div>
    </div>
  );
}