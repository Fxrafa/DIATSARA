'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    // Le middleware fera le travail, mais on peut ajouter un fallback
    router.push('/');
  }, [router]);
  return <div>Redirection...</div>;
}