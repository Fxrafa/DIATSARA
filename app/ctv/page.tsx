/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Clock, Users, Package, Train, MapPin } from 'lucide-react';

interface Voyage {
  id: string;
  date_voyage: string;
  sens: string;
  gare_depart: number;
  gare_arrivee: number;
  formation_voiture: number;
  formation_voiture2: number;
  formation_wagon: number;
  places_max: number;
  poids_max: number;
  statut: string;
  gare_depart_detail?: { code: string; gare: string };
  gare_arrivee_detail?: { code: string; gare: string };
}

export default function CTVPage() {
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActifs: 0,
    placesDisponibles: 0,
    tonnesDisponibles: 0,
  });

  useEffect(() => {
    const fetchVoyages = async () => {
      const { data } = await supabase
        .from('voyages')
        .select(`
          *,
          gare_depart_detail:gare_depart(code, gare),
          gare_arrivee_detail:gare_arrivee(code, gare)
        `)
        .eq('statut', 'actif')
        .order('date_voyage', { ascending: true });

      if (data) {
        setVoyages(data);
        // Calculer les statistiques
        let places = 0;
        let tonnes = 0;
        data.forEach(v => {
          places += v.places_max || 0;
          tonnes += v.poids_max || 0;
        });
        setStats({
          totalActifs: data.length,
          placesDisponibles: places,
          tonnesDisponibles: tonnes,
        });
      }
      setLoading(false);
    };
    fetchVoyages();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getFormationText = (voyage: Voyage) => {
    const parts = [];
    if (voyage.formation_voiture > 0) parts.push(`${voyage.formation_voiture}×1ère`);
    if (voyage.formation_voiture2 > 0) parts.push(`${voyage.formation_voiture2}×2ème`);
    if (voyage.formation_wagon > 0) parts.push(`${voyage.formation_wagon}×W`);
    return parts.join(' | ') || 'Aucune formation';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord CTV</h1>
        <p className="text-gray-600 mt-1">Gestion des voyages actifs et attribution des quotas</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Voyages actifs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalActifs}</p>
            </div>
            <Train className="h-10 w-10 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Places maximales</p>
              <p className="text-3xl font-bold text-blue-600">{stats.placesDisponibles}</p>
            </div>
            <Users className="h-10 w-10 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Capacité de fret</p>
              <p className="text-3xl font-bold text-orange-600">{stats.tonnesDisponibles}T</p>
            </div>
            <Package className="h-10 w-10 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Liste des voyages actifs */}
      {voyages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun voyage actif</p>
          <p className="text-sm text-gray-400">Les voyages planifiés par le DCO apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Voyages actifs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {voyages.map((voyage) => (
                  <tr key={voyage.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(voyage.date_voyage)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        {voyage.sens}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {voyage.gare_depart_detail?.code || voyage.gare_depart}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">
                          {voyage.gare_arrivee_detail?.code || voyage.gare_arrivee}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Train className="h-4 w-4 text-gray-400" />
                        <span>{getFormationText(voyage)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span>{voyage.places_max} places</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-orange-500" />
                          <span>{voyage.poids_max} tonnes</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <a
                        href={`/ctv/quotas?voyage=${voyage.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition"
                      >
                        <Clock className="h-3 w-3" />
                        Attribuer quotas
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}