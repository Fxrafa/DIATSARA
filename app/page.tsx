'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Utiliser getUser() au lieu de getSession() pour plus de sécurité
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push('/login');
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Erreur de vérification:', error);
        router.push('/login');
      } finally {
        setChecking(false);
      }
    };

    checkUser();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  return null;
}