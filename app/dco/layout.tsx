'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Calendar, History, LayoutDashboard, LogOut, PlusCircle, Activity, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export default function DCOLayout({
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
      href: '/dco',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: 'Planifier voyage',
      href: '/dco/planification',
      icon: <PlusCircle className="h-5 w-5" />,
    },
    {
      name: 'Historique voyages',
      href: '/dco/historique',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      name: 'Historique recette',
      href: '/dco/historique-recette',
      icon: <History className="h-5 w-5" />,
    },
    {
      name: 'Suivi en temps réel',
      href: '/dco/suivi-temps-reel',
      icon: <Activity className="h-5 w-5" />,
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
    // Pour le tableau de bord : correspondance exacte
    if (href === '/dco') {
      return pathname === '/dco';
    }
    
    // Pour les autres : vérifier que le chemin commence par href
    // ET que ce n'est pas un autre chemin qui commence par la même chose
    // Ex: /dco/historique-recette ne doit pas activer /dco/historique
    if (pathname === href) {
      return true;
    }
    
    // Vérifier si le chemin commence par href suivi d'un slash
    // Cela évite que /dco/historique-recette active /dco/historique
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
        {/* Barre décorative haut */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-700 via-stone-600 to-emerald-700" />

        {/* En-tête sidebar */}
        <div className={`p-4 flex items-center gap-3 border-b border-white/10 ${isCollapsed ? 'justify-center' : ''}`}>
          {!isCollapsed && (
            <>
              <div className="h-10 w-10 rounded-xl bg-linear-to-br from-amber-700 to-stone-700 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-900/20 shrink-0">
                D
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white truncate">DIATSARA</h1>
                <p className="text-xs text-amber-400/70 truncate">Module DCO</p>
              </div>
            </>
          )}
          {isCollapsed && (
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-amber-700 to-stone-700 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-900/20">
              D
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
                <span className={isActive ? 'text-amber-400' : ''}>{item.icon}</span>
                {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Pied de sidebar */}
        <div className="border-t border-white/10 p-4">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="h-9 w-9 rounded-full bg-amber-700/30 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0">
              {userName?.charAt(0)?.toUpperCase() || 'D'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName || 'DCO'}</p>
                <p className="text-xs text-stone-400 truncate">Commercial</p>
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