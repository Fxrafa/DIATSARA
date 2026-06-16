/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Clock, Train, Users } from 'lucide-react';

interface Stats {
  total: number;
  actifs: number;
  termines: number;
}

export default function DCOHomePage() {
  const [stats, setStats] = useState<Stats>({ total: 0, actifs: 0, termines: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from('voyages').select('statut');
      if (data) {
        setStats({
          total: data.length,
          actifs: data.filter(v => v.statut === 'actif').length,
          termines: data.filter(v => v.statut === 'termine').length,
        });
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord DCO</h1>
      <p className="text-gray-600 mb-8">Gestion des voyages et opérations</p>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total voyages</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Train className="h-10 w-10 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Voyages actifs</p>
              <p className="text-3xl font-bold text-green-600">{stats.actifs}</p>
            </div>
            <Clock className="h-10 w-10 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Voyages terminés</p>
              <p className="text-3xl font-bold text-gray-600">{stats.termines}</p>
            </div>
            <Calendar className="h-10 w-10 text-gray-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="space-y-3">
            <a
              href="/dco/planification"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition"
            >
              Planifier un nouveau voyage
            </a>
            <a
              href="/dco/historique"
              className="block w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg transition"
            >
              Voir l'historique
            </a>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
          <p className="text-gray-600 text-sm">
            Planifiez les voyages, gérez les formations et suivez l'historique des opérations.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span>Rôle: Commercial (DCO)</span>
          </div>
        </div>
      </div>
    </div>
  );
}