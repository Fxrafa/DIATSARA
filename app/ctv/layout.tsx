/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Ticket, Package, LogOut } from 'lucide-react';
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
      name: 'Attribution des quotas',
      href: '/ctv/quotas',
      icon: <Ticket className="h-5 w-5" />,
    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-linear-to-b from-green-800 to-green-900 text-white shrink-0 fixed h-full left-0 top-0 z-40 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
              C
            </div>
            <div>
              <h1 className="text-xl font-bold">DIATSARA</h1>
              <p className="text-xs text-green-200">Module CTV</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-green-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-green-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{userName || 'CTV'}</p>
              <p className="text-xs text-green-200">Chef de Train</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}