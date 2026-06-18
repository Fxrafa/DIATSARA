'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Vérifier l'utilisateur avec getUser() pour plus de sécurité
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push('/login');
          return;
        }

        // Récupérer le rôle de l'utilisateur
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile) {
          router.push('/login');
          return;
        }

        // Rediriger selon le rôle
        switch (profile.role) {
          case 'ADMIN':
            router.push('/admin');
            break;
          case 'DCO':
            router.push('/dco');
            break;
          case 'CTV':
            router.push('/ctv');
            break;
          case 'VBC':
            router.push('/vbc');
            break;
          default:
            router.push('/login');
        }
      } catch (error) {
        console.error('Erreur de redirection:', error);
        router.push('/login');
      } finally {
        setChecking(false);
      }
    };

    checkAndRedirect();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return null;
}