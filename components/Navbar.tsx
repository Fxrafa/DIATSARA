'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import LogoutButton from './LogoutButton';
import { User, Shield, Briefcase, Train, Store, Home, Menu, X } from 'lucide-react';

interface Profile {
  nom: string;
  matricule: string;
  role: string;
}

export default function Navbar() {
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
    if (typeof window === 'undefined') return 'DIATSARA';
    const path = window.location.pathname;
    if (path.includes('/admin')) return 'Administration';
    if (path.includes('/dco')) return 'Contrôle des opérations';
    if (path.includes('/ctv')) return 'Gestion des trains';
    if (path.includes('/vbc')) return 'Espace Vendeur';
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
      CTV: 'bg-green-500',
      VBC: 'bg-orange-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  return (
    <nav className="bg-linear-to-r from-blue-700 to-blue-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Titre */}
          <div className="flex items-center space-x-3">
            <div className="shrink-0">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                <Home className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">DIATSARA</h1>
              <p className="text-xs text-blue-200 hidden sm:block">{getPageTitle()}</p>
            </div>
          </div>

          {/* Informations utilisateur - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {!loading && profile && (
              <div className="flex items-center space-x-4 bg-white/10 rounded-lg px-4 py-2">
                <div className={`h-9 w-9 rounded-full ${getRoleColor(profile.role)} flex items-center justify-center text-white font-bold text-sm`}>
                  {profile.nom.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium flex items-center gap-1">
                    {getRoleIcon(profile.role)}
                    {profile.nom}
                  </p>
                  <p className="text-xs text-blue-200">
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
              className="p-2 rounded-lg hover:bg-white/10 transition"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-blue-800/95 border-t border-blue-700">
          <div className="px-4 py-3 space-y-3">
            {!loading && profile && (
              <>
                <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3">
                  <div className={`h-10 w-10 rounded-full ${getRoleColor(profile.role)} flex items-center justify-center text-white font-bold`}>
                    {profile.nom.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      {getRoleIcon(profile.role)}
                      {profile.nom}
                    </p>
                    <p className="text-xs text-blue-200">
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