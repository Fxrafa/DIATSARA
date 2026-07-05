'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import LogoutButton from './LogoutButton';
import { User, Shield, Briefcase, Train, Store, Home, Menu, X } from 'lucide-react';

interface Profile {
  nom: string;
  matricule: string;
  role: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('nom, matricule, role')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const getPageTitle = () => {
    if (pathname.includes('/admin')) return 'Administration';
    if (pathname.includes('/dco')) return 'Contrôle des opérations';
    if (pathname.includes('/ctv')) return 'Gestion des trains';
    if (pathname.includes('/vbc')) return 'Espace Vendeur';
    return 'DIATSARA';
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, React.ReactNode> = {
      ADMIN: <Shield className="h-4 w-4" />,
      DCO: <Briefcase className="h-4 w-4" />,
      CTV: <Train className="h-4 w-4" />,
      VBC: <Store className="h-4 w-4" />,
    };
    return icons[role] || <User className="h-4 w-4" />;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: 'Administrateur',
      DCO: 'Commercial',
      CTV: 'Chef de Train',
      VBC: 'Vendeur',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-500',
      DCO: 'bg-blue-500',
      CTV: 'bg-emerald-500',
      VBC: 'bg-amber-500',
    };
    return colors[role] || 'bg-stone-500';
  };

  const pageTitle = getPageTitle();

  return (
    <nav className="bg-linear-to-r from-stone-800 to-stone-900 text-white shadow-lg sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Titre */}
          <div className="flex items-center space-x-3">
            <div className="shrink-0">
              <div className="h-9 w-9 rounded-xl bg-linear-to-br from-amber-700 to-stone-700 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-900/20">
                <Home className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">DIATSARA</h1>
              <p className="text-xs text-amber-400/70 hidden sm:block">{pageTitle}</p>
            </div>
          </div>

          {/* Informations utilisateur - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {!loading && profile && (
              <div className="flex items-center space-x-4 bg-white/10 rounded-xl px-4 py-2 border border-white/5">
                <div className={`h-9 w-9 rounded-full ${getRoleColor(profile.role)} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                  {profile.nom.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium flex items-center gap-1.5 text-white">
                    {getRoleIcon(profile.role)}
                    {profile.nom}
                  </p>
                  <p className="text-xs text-stone-400">
                    {profile.matricule} • {getRoleLabel(profile.role)}
                  </p>
                </div>
              </div>
            )}
            <LogoutButton />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl hover:bg-white/10 transition"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-stone-800/95 border-t border-white/5">
          <div className="px-4 py-4 space-y-3">
            {!loading && profile && (
              <>
                <div className="flex items-center space-x-3 bg-white/10 rounded-xl p-3 border border-white/5">
                  <div className={`h-10 w-10 rounded-full ${getRoleColor(profile.role)} flex items-center justify-center text-white font-bold shadow-lg`}>
                    {profile.nom.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5 text-white">
                      {getRoleIcon(profile.role)}
                      {profile.nom}
                    </p>
                    <p className="text-xs text-stone-400">
                      {profile.matricule} • {getRoleLabel(profile.role)}
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <LogoutButton />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}