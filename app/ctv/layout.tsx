'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, History, Ticket, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export default function CTVLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('nom')
          .eq('id', user.id)
          .single();
        if (data) setUserName(data.nom);
      }
    };
    fetchUser();
  }, []);

  const sidebarItems: SidebarItem[] = [
    {
      name: 'Tableau de bord',
      href: '/ctv',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: 'Historique',
      href: '/ctv/historique',
      icon: <History className="h-5 w-5" />,
    },
    {
      name: 'Modifier quota',
      href: '/ctv/quotas',
      icon: <Ticket className="h-5 w-5" />,
    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Vérifier si un chemin est actif
  const isActivePath = (href: string) => {
    if (href === '/ctv') {
      return pathname === '/ctv';
    }
    
    if (pathname === href) {
      return true;
    }
    
    if (pathname.startsWith(href + '/')) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-stone-800 hover:bg-stone-700 rounded-xl text-white transition shadow-lg shadow-black/30"
        aria-label="Menu"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40
          bg-linear-to-b from-stone-800 to-stone-900 text-white
          transition-all duration-300 ease-in-out
          flex flex-col
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          shadow-2xl shadow-black/30
        `}
      >
        {/* Barre décorative haut - Couleurs CTV (vert) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-700 via-stone-600 to-teal-700" />

        {/* En-tête sidebar */}
        <div className={`p-4 flex items-center gap-3 border-b border-white/10 ${isCollapsed ? 'justify-center' : ''}`}>
          {!isCollapsed && (
            <>
              <div className="h-10 w-10 rounded-xl bg-linear-to-br from-emerald-700 to-stone-700 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-900/20 shrink-0">
                C
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white truncate">DIATSARA</h1>
                <p className="text-xs text-emerald-400/70 truncate">Module CTV</p>
              </div>
            </>
          )}
          {isCollapsed && (
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-emerald-700 to-stone-700 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-900/20">
              C
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = isActivePath(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setIsMobileOpen(false);
                }}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-white/15 text-white shadow-lg shadow-black/20 border border-white/10'
                    : 'text-stone-300 hover:bg-white/5 hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.name : ''}
              >
                <span className={isActive ? 'text-emerald-400' : ''}>{item.icon}</span>
                {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Pied de sidebar */}
        <div className="border-t border-white/10 p-4">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="h-9 w-9 rounded-full bg-emerald-700/30 flex items-center justify-center text-emerald-300 font-bold text-sm shrink-0">
              {userName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName || 'CTV'}</p>
                <p className="text-xs text-stone-400 truncate">Chef de Train</p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-lg transition text-stone-400 hover:text-white"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button
              onClick={handleLogout}
              className="mt-3 w-full p-2 hover:bg-white/10 rounded-lg transition text-stone-400 hover:text-white flex justify-center"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Bouton de collapse */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-6 h-6 bg-stone-700 hover:bg-stone-600 rounded-full border border-white/10 text-white shadow-lg transition-colors hover:scale-110"
          aria-label={isCollapsed ? 'Développer' : 'Réduire'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Main content */}
      <main
        className={`
          transition-all duration-300
          ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
          ${isMobileOpen ? 'blur-sm lg:blur-none' : ''}
        `}
      >
        <div className="lg:hidden h-16" />
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}