/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Clock, Users, Package, Train, Ticket, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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
        .select('quota_2131, quota_2132');

      const { data: bagagesQuotas } = await supabase
        .from('quota_bagages')
        .select('quota_tonnes_2131, quota_tonnes_2132');

      // Calculer les totaux pour chaque sens
      const totalPlaces2131 = ticketsQuotas?.reduce((sum, t) => sum + (t.quota_2131 || 0), 0) || 0;
      const totalPlaces2132 = ticketsQuotas?.reduce((sum, t) => sum + (t.quota_2132 || 0), 0) || 0;
      const totalTonnes2131 = bagagesQuotas?.reduce((sum, b) => sum + (b.quota_tonnes_2131 || 0), 0) || 0;
      const totalTonnes2132 = bagagesQuotas?.reduce((sum, b) => sum + (b.quota_tonnes_2132 || 0), 0) || 0;

      // Pour chaque voyage, appliquer le quota correspondant au sens
      const voyagesWithQuotas = voyagesData.map((voyage) => {
        const isSens2131 = voyage.sens === '2131';
        return {
          ...voyage,
          total_places_attribuees: isSens2131 ? totalPlaces2131 : totalPlaces2132,
          total_tonnes_attribuees: isSens2131 ? totalTonnes2131 : totalTonnes2132,
        };
      });

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
    if (ratio >= 70) return { color: 'text-amber-600', bg: 'bg-amber-100' };
    return { color: 'text-emerald-600', bg: 'bg-emerald-100' };
  };

  const handleVoyageClick = (voyageId: string) => {
    router.push(`/ctv/suivi-temps-reel?voyage=${voyageId}`);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
        <p className="mt-2 text-stone-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-stone-800">Tableau de bord CTV</h1>
        <p className="text-stone-500 mt-1">Gestion des voyages actifs</p>
      </div>

      {/* Statistiques - Seulement le nombre de voyages actifs */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8 max-w-xs">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500 font-medium">Voyages actifs</p>
              <p className="text-3xl font-bold text-emerald-700">{voyages.length}</p>
            </div>
            <Train className="h-10 w-10 text-emerald-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Liste des voyages actifs avec leurs quotas */}
      {voyages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200/60">
          <Calendar className="h-16 w-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Aucun voyage actif</p>
          <p className="text-sm text-stone-400 mt-1">Les voyages planifiés par le DCO apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-serif font-semibold text-stone-800 flex items-center gap-2">
            <Train className="h-5 w-5 text-emerald-700" />
            Voyages actifs
          </h2>
          
          {voyages.map((voyage) => {
            const placesStatus = getQuotaStatus(voyage.total_places_attribuees, voyage.places_max);
            const tonnesStatus = getQuotaStatus(voyage.total_tonnes_attribuees, voyage.poids_max);
            
            return (
              <div 
                key={voyage.id} 
                className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleVoyageClick(voyage.id)}
              >
                {/* En-tête du voyage */}
                <div className="px-6 py-4 bg-stone-50/80 border-b border-stone-200/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium text-stone-600">
                      {formatDate(voyage.date_voyage)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                      <Clock className="h-3 w-3" />
                      Actif
                    </span>
                    <span className="text-sm font-medium text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                      Sens {voyage.sens}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      Cliquer pour suivre
                    </span>
                  </div>
                </div>

                {/* Détails du voyage */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Parcours */}
                    <div>
                      <p className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-1.5">Parcours</p>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-800">
                          {voyage.gare_depart_detail?.code || voyage.gare_depart}
                        </span>
                        <span className="text-stone-400">→</span>
                        <span className="font-semibold text-stone-800">
                          {voyage.gare_arrivee_detail?.code || voyage.gare_arrivee}
                        </span>
                      </div>
                    </div>

                    {/* Formation */}
                    <div>
                      <p className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-1.5">Formation</p>
                      <div className="flex items-center gap-2">
                        <Train className="h-4 w-4 text-stone-400" />
                        <span className="text-sm text-stone-700">{getFormationText(voyage)}</span>
                      </div>
                    </div>

                    {/* Quota Places */}
                    <div>
                      <p className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-1.5">Quota Places</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-semibold text-stone-800">
                            {voyage.total_places_attribuees} / {voyage.places_max}
                          </span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${placesStatus.bg} ${placesStatus.color}`}>
                          {voyage.places_max > 0 
                            ? Math.round((voyage.total_places_attribuees / voyage.places_max) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-1.5 mt-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all ${placesStatus.color.replace('text-', 'bg-')}`}
                          style={{ width: `${voyage.places_max > 0 ? Math.min((voyage.total_places_attribuees / voyage.places_max) * 100, 100) : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Quota Bagages */}
                    <div>
                      <p className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-1.5">Quota Bagages</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-semibold text-stone-800">
                            {voyage.total_tonnes_attribuees}T / {voyage.poids_max}T
                          </span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tonnesStatus.bg} ${tonnesStatus.color}`}>
                          {voyage.poids_max > 0 
                            ? Math.round((voyage.total_tonnes_attribuees / voyage.poids_max) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-1.5 mt-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all ${tonnesStatus.color.replace('text-', 'bg-')}`}
                          style={{ width: `${voyage.poids_max > 0 ? Math.min((voyage.total_tonnes_attribuees / voyage.poids_max) * 100, 100) : 0}%` }}
                        />
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