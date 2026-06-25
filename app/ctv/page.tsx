'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Clock, Users, Package, Train, Ticket } from 'lucide-react';

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

interface VoyageWithQuotas extends Voyage {
  total_places_attribuees: number;
  total_tonnes_attribuees: number;
}

export default function CTVPage() {
  const [voyages, setVoyages] = useState<VoyageWithQuotas[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoyages = async () => {
      // Récupérer les voyages actifs
      const { data: voyagesData } = await supabase
        .from('voyages')
        .select(`
          *,
          gare_depart_detail:gare_depart(code, gare),
          gare_arrivee_detail:gare_arrivee(code, gare)
        `)
        .eq('statut', 'actif')
        .order('date_voyage', { ascending: true });

      if (!voyagesData) {
        setLoading(false);
        return;
      }

      // ✅ Récupérer les quotas GLOBAUX (sans voyage_id)
      const { data: ticketsQuotas } = await supabase
        .from('quota_tickets')
        .select('quota');

      const { data: bagagesQuotas } = await supabase
        .from('quota_bagages')
        .select('quota_tonnes');

      const totalPlacesGlobal = ticketsQuotas?.reduce((sum, t) => sum + t.quota, 0) || 0;
      const totalTonnesGlobal = bagagesQuotas?.reduce((sum, b) => sum + b.quota_tonnes, 0) || 0;

      // Pour chaque voyage, les quotas sont les mêmes (globaux)
      const voyagesWithQuotas = voyagesData.map((voyage) => ({
        ...voyage,
        total_places_attribuees: totalPlacesGlobal,
        total_tonnes_attribuees: totalTonnesGlobal,
      }));

      setVoyages(voyagesWithQuotas);
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

  const getQuotaStatus = (attribue: number, max: number) => {
    const ratio = max > 0 ? (attribue / max) * 100 : 0;
    if (ratio >= 100) return { color: 'text-red-600', bg: 'bg-red-100' };
    if (ratio >= 70) return { color: 'text-orange-600', bg: 'bg-orange-100' };
    return { color: 'text-green-600', bg: 'bg-green-100' };
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
        <p className="text-gray-600 mt-1">Gestion des voyages actifs</p>
      </div>

      {/* Statistiques - Seulement le nombre de voyages actifs */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8 max-w-xs">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Voyages actifs</p>
              <p className="text-3xl font-bold text-gray-900">{voyages.length}</p>
            </div>
            <Train className="h-10 w-10 text-green-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Liste des voyages actifs avec leurs quotas */}
      {voyages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun voyage actif</p>
          <p className="text-sm text-gray-400">Les voyages planifiés par le DCO apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-6">
          {voyages.map((voyage) => {
            const placesStatus = getQuotaStatus(voyage.total_places_attribuees, voyage.places_max);
            const tonnesStatus = getQuotaStatus(voyage.total_tonnes_attribuees, voyage.poids_max);
            
            return (
              <div key={voyage.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                {/* En-tête du voyage */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-500">
                      {formatDate(voyage.date_voyage)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      <Clock className="h-3 w-3" />
                      Actif
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      Sens {voyage.sens}
                    </span>
                  </div>
                  <a
                    href={`/ctv/quotas`}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    <Ticket className="h-3 w-3" />
                    Attribuer quotas
                  </a>
                </div>

                {/* Détails du voyage */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Parcours */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Parcours</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {voyage.gare_depart_detail?.code || voyage.gare_depart}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-gray-900">
                          {voyage.gare_arrivee_detail?.code || voyage.gare_arrivee}
                        </span>
                      </div>
                    </div>

                    {/* Formation */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Formation</p>
                      <div className="flex items-center gap-2">
                        <Train className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{getFormationText(voyage)}</span>
                      </div>
                    </div>

                    {/* Quota Places */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Quota Places</p>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {voyage.total_places_attribuees} / {voyage.places_max}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${placesStatus.bg} ${placesStatus.color}`}>
                          {voyage.places_max > 0 
                            ? Math.round((voyage.total_places_attribuees / voyage.places_max) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>

                    {/* Quota Bagages */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Quota Bagages</p>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {voyage.total_tonnes_attribuees}T / {voyage.poids_max}T
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tonnesStatus.bg} ${tonnesStatus.color}`}>
                          {voyage.poids_max > 0 
                            ? Math.round((voyage.total_tonnes_attribuees / voyage.poids_max) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}