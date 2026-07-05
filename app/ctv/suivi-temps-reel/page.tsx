/* eslint-disable react-hooks/immutability */
 
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Fragment, useEffect, useState } from 'react';
import { 
  Activity, Calendar, Train, Users, Package, 
  Ticket, Loader2, AlertCircle, Eye,
  ArrowLeft, ChevronDown, ChevronUp, UserCheck,
  Weight, Gauge
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Voyage {
  id: string;
  date_voyage: string;
  sens: string;
  gare_depart: number;
  gare_arrivee: number;
  places_max: number;
  poids_max: number;
  statut: string;
  formation_voiture: number;
  formation_voiture2: number;
  formation_wagon: number;
  gare_depart_detail?: { code: string; gare: string };
  gare_arrivee_detail?: { code: string; gare: string };
}

interface VenteParGare {
  gare_num: number;
  gare_code: string;
  gare_name: string;
  commune_tutelle: string;
  quota_tickets: number;
  tickets_vendus: number;
  recette_tickets: number;
  quota_bagages: number;
  poids_vendu: number;
  recette_bagages: number;
  recette_totale: number;
}

interface VoyageDetail extends Voyage {
  ventes_par_gare: VenteParGare[];
  total_tickets_vendus: number;
  total_recette_tickets: number;
  total_poids_vendu: number;
  total_recette_bagages: number;
  total_recette: number;
}

export default function CTVSuiviTempsReelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const voyageId = searchParams?.get('voyage');
  
  const [voyage, setVoyage] = useState<VoyageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!voyageId) {
      setError('Aucun voyage spécifié');
      setLoading(false);
      return;
    }
    fetchVoyageDetails(voyageId);
  }, [voyageId]);

  const fetchVoyageDetails = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Récupérer les détails du voyage
      const { data: voyageData, error: voyageError } = await supabase
        .from('voyages')
        .select(`
          *,
          gare_depart_detail:gare_depart(code, gare),
          gare_arrivee_detail:gare_arrivee(code, gare)
        `)
        .eq('id', id)
        .single();

      if (voyageError || !voyageData) {
        setError('Voyage non trouvé');
        setLoading(false);
        return;
      }

      // Récupérer les quotas tickets globaux
      const { data: quotaTickets } = await supabase
        .from('quota_tickets')
        .select('*');

      // Récupérer les quotas bagages globaux
      const { data: quotaBagages } = await supabase
        .from('quota_bagages')
        .select('*');

      // Récupérer toutes les gares
      const { data: allGares } = await supabase
        .from('gare')
        .select('num, code, gare, commune_tutelle')
        .order('num');

      // Récupérer les tickets vendus pour ce voyage
      const { data: ticketsVendus } = await supabase
        .from('ticket_voyageur')
        .select('gare_ref, part_madarail')
        .eq('voyage_id', id);

      const { data: bagagesVendus } = await supabase
        .from('ticket_bagage')
        .select('gare_ref, poids, volume, part_madarail')
        .eq('voyage_id', id);

      const { data: colisVendus } = await supabase
        .from('ticket_colis')
        .select('gare_ref, poids, volume, part_madarail')
        .eq('voyage_id', id);

      // Créer un map pour les quotas tickets
      const quotaTicketsMap = new Map<number, { quota_2131: number; quota_2132: number }>();
      quotaTickets?.forEach(q => {
        quotaTicketsMap.set(q.gare_num, {
          quota_2131: q.quota_2131 || 0,
          quota_2132: q.quota_2132 || 0,
        });
      });

      // Créer un map pour les quotas bagages
      const quotaBagagesMap = new Map<string, { quota_tonnes_2131: number; quota_tonnes_2132: number }>();
      quotaBagages?.forEach(q => {
        quotaBagagesMap.set(q.commune_tutelle, {
          quota_tonnes_2131: q.quota_tonnes_2131 || 0,
          quota_tonnes_2132: q.quota_tonnes_2132 || 0,
        });
      });

      const sens = voyageData.sens;
      const allGareCodes = allGares?.map(g => g.num) || [];
      const departIndex = allGareCodes.indexOf(voyageData.gare_depart);
      const arriveeIndex = allGareCodes.indexOf(voyageData.gare_arrivee);

      // Filtrer les gares du trajet
      let garesFiltrees = allGares || [];
      if (sens === '2131') {
        garesFiltrees = garesFiltrees.slice(departIndex, arriveeIndex);
      } else {
        garesFiltrees = garesFiltrees.slice(arriveeIndex + 1, departIndex + 1);
      }

      // Construire les ventes par gare
      const ventesParGare = garesFiltrees.map(gare => {
        const quotaData = quotaTicketsMap.get(gare.num);
        const quotaTicketsValue = quotaData ? (sens === '2131' ? quotaData.quota_2131 : quotaData.quota_2132) : 0;

        const tickets = ticketsVendus?.filter(t => t.gare_ref === gare.num) || [];
        const bagages = bagagesVendus?.filter(b => b.gare_ref === gare.num) || [];
        const colis = colisVendus?.filter(c => c.gare_ref === gare.num) || [];

        const ticketsVendusCount = tickets.length;
        const recetteTickets = tickets.reduce((sum, t) => sum + (t.part_madarail || 0), 0);

        const poidsBagages = bagages.reduce((sum, b) => sum + (b.poids || 0) + ((b.volume || 0) * 500), 0);
        const poidsColis = colis.reduce((sum, c) => sum + (c.poids || 0) + ((c.volume || 0) * 500), 0);
        const poidsTotal = poidsBagages + poidsColis;

        const recetteBagages = bagages.reduce((sum, b) => sum + (b.part_madarail || 0), 0);
        const recetteColis = colis.reduce((sum, c) => sum + (c.part_madarail || 0), 0);
        const recetteBagagesTotal = recetteBagages + recetteColis;

        const quotaTotalCommune = quotaBagagesMap.get(gare.commune_tutelle);
        const quotaBagagesValue = quotaTotalCommune 
          ? (sens === '2131' ? quotaTotalCommune.quota_tonnes_2131 : quotaTotalCommune.quota_tonnes_2132)
          : 0;

        return {
          gare_num: gare.num,
          gare_code: gare.code,
          gare_name: gare.gare,
          commune_tutelle: gare.commune_tutelle,
          quota_tickets: quotaTicketsValue,
          tickets_vendus: ticketsVendusCount,
          recette_tickets: recetteTickets,
          quota_bagages: quotaBagagesValue,
          poids_vendu: poidsTotal,
          recette_bagages: recetteBagagesTotal,
          recette_totale: recetteTickets + recetteBagagesTotal,
        };
      });

      // Filtrer les gares avec des quotas ou des ventes
      const ventesFiltrees = ventesParGare.filter(v => 
        v.quota_tickets > 0 || v.quota_bagages > 0 || v.tickets_vendus > 0 || v.poids_vendu > 0
      );

      // Calculer les totaux
      const totalTicketsVendus = ventesFiltrees.reduce((sum, v) => sum + v.tickets_vendus, 0);
      const totalRecetteTickets = ventesFiltrees.reduce((sum, v) => sum + v.recette_tickets, 0);
      const totalPoidsVendu = ventesFiltrees.reduce((sum, v) => sum + v.poids_vendu, 0);
      const totalRecetteBagages = ventesFiltrees.reduce((sum, v) => sum + v.recette_bagages, 0);
      const totalRecette = ventesFiltrees.reduce((sum, v) => sum + v.recette_totale, 0);

      const detail: VoyageDetail = {
        ...voyageData,
        ventes_par_gare: ventesFiltrees,
        total_tickets_vendus: totalTicketsVendus,
        total_recette_tickets: totalRecetteTickets,
        total_poids_vendu: totalPoidsVendu,
        total_recette_bagages: totalRecetteBagages,
        total_recette: totalRecette,
      };

      setVoyage(detail);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des données');
    }

    setLoading(false);
  };

  const toggleRow = (gareCode: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(gareCode)) {
      newExpanded.delete(gareCode);
    } else {
      newExpanded.add(gareCode);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR') + ' Ar';
  };

  const getStatusBadge = (statut: string) => {
    if (statut === 'actif') {
      return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Actif</span>;
    }
    return <span className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-medium">Terminé</span>;
  };

  const hasData = (gare: VenteParGare) => {
    return gare.tickets_vendus > 0 || gare.poids_vendu > 0 || gare.recette_totale > 0;
  };

  // Calcul du taux de remplissage
  const getFillRate = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getFillStatus = (rate: number) => {
    if (rate >= 100) return { color: 'text-red-600', bg: 'bg-red-100', label: 'Complet' };
    if (rate >= 80) return { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Presque plein' };
    if (rate >= 50) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'En cours' };
    return { color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Disponible' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-700 border-t-transparent"></div>
        <p className="ml-3 text-stone-500">Chargement des données...</p>
      </div>
    );
  }

  if (error || !voyage) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Voyage non trouvé'}</p>
          <button
            onClick={() => router.push('/ctv')}
            className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-emerald-700/20"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const placesRate = getFillRate(voyage.total_tickets_vendus, voyage.places_max);
  const poidsRate = getFillRate(voyage.total_poids_vendu, voyage.poids_max * 1000);
  const placesStatus = getFillStatus(placesRate);
  const poidsStatus = getFillStatus(poidsRate);

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push('/ctv')}
          className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-700" />
                Suivi en temps réel
              </h1>
              <p className="text-stone-600 text-sm">
                {voyage.gare_depart_detail?.code} → {voyage.gare_arrivee_detail?.code}
              </p>
              <p className="text-xs text-stone-400">
                {formatDate(voyage.date_voyage)} • Sens {voyage.sens} • {getStatusBadge(voyage.statut)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500">Formation</p>
              <p className="text-sm font-medium text-stone-700">
                {voyage.formation_voiture > 0 && `${voyage.formation_voiture}×1ère`}
                {voyage.formation_voiture > 0 && voyage.formation_voiture2 > 0 && ' | '}
                {voyage.formation_voiture2 > 0 && `${voyage.formation_voiture2}×2ème`}
                {(voyage.formation_voiture > 0 || voyage.formation_voiture2 > 0) && voyage.formation_wagon > 0 && ' | '}
                {voyage.formation_wagon > 0 && `${voyage.formation_wagon}×W`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicateurs de remplissage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Places */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-stone-800">Places occupées</h3>
            </div>
            <span className={`text-sm font-bold ${placesStatus.color}`}>
              {voyage.total_tickets_vendus} / {voyage.places_max}
            </span>
          </div>
          <div className="relative">
            <div className="w-full bg-stone-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  placesRate >= 100 ? 'bg-red-500' :
                  placesRate >= 80 ? 'bg-amber-500' :
                  placesRate >= 50 ? 'bg-blue-500' :
                  'bg-emerald-500'
                }`}
                style={{ width: `${placesRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className={`text-xs font-medium ${placesStatus.color}`}>
                {placesStatus.label}
              </span>
              <span className="text-xs text-stone-400">
                {placesRate.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-stone-400 flex items-center gap-4">
            <span>Capacité: {voyage.places_max} places</span>
            <span>•</span>
            <span>Restant: {voyage.places_max - voyage.total_tickets_vendus} places</span>
          </div>
        </div>

        {/* Poids/Colis */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Weight className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium text-stone-800">Fret occupé</h3>
            </div>
            <span className={`text-sm font-bold ${poidsStatus.color}`}>
              {(voyage.total_poids_vendu / 1000).toFixed(1)}T / {voyage.poids_max}T
            </span>
          </div>
          <div className="relative">
            <div className="w-full bg-stone-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  poidsRate >= 100 ? 'bg-red-500' :
                  poidsRate >= 80 ? 'bg-amber-500' :
                  poidsRate >= 50 ? 'bg-blue-500' :
                  'bg-emerald-500'
                }`}
                style={{ width: `${poidsRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className={`text-xs font-medium ${poidsStatus.color}`}>
                {poidsStatus.label}
              </span>
              <span className="text-xs text-stone-400">
                {poidsRate.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-stone-400 flex items-center gap-4">
            <span>Capacité: {voyage.poids_max} tonnes</span>
            <span>•</span>
            <span>Restant: {(voyage.poids_max - voyage.total_poids_vendu / 1000).toFixed(1)} tonnes</span>
          </div>
        </div>
      </div>

      {/* Tableau des détails par gare */}
      {voyage.ventes_par_gare.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-stone-200/60">
          <Package className="h-12 w-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">Aucune vente enregistrée pour ce voyage</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50/80">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Gare</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Quota Tickets</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Vendus</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Recette</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Quota Bag.</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Poids</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Recette</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {voyage.ventes_par_gare.map((gare) => {
                  const isExpanded = expandedRows.has(gare.gare_code);
                  const hasDataValue = hasData(gare);
                  
                  return (
                    <Fragment key={gare.gare_num}>
                      <tr className={`hover:bg-stone-50 transition ${!hasDataValue ? 'text-stone-400' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium">
                          <span className={hasDataValue ? 'text-stone-800' : 'text-stone-400'}>
                            {gare.gare_code} - {gare.gare_name}
                          </span>
                          {!hasDataValue && (
                            <span className="ml-2 text-xs text-stone-400">(aucune vente)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-blue-600 font-medium">
                          {gare.quota_tickets}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className={hasDataValue ? 'text-stone-800 font-medium' : 'text-stone-400'}>
                            {gare.tickets_vendus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className={hasDataValue ? 'text-emerald-600 font-medium' : 'text-stone-400'}>
                            {hasDataValue ? formatPrice(gare.recette_tickets) : '0 Ar'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-amber-600 font-medium">
                          {gare.quota_bagages}T
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className={hasDataValue ? 'text-amber-600 font-medium' : 'text-stone-400'}>
                            {gare.poids_vendu.toFixed(1)} kg
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className={hasDataValue ? 'text-purple-600 font-medium' : 'text-stone-400'}>
                            {hasDataValue ? formatPrice(gare.recette_bagages) : '0 Ar'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasDataValue && (
                            <button
                              onClick={() => toggleRow(gare.gare_code)}
                              className="p-1 hover:bg-stone-100 rounded transition"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-stone-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-stone-500" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasDataValue && (
                        <tr className="bg-stone-50/50">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="bg-white rounded-lg p-3 border border-stone-200/60">
                                <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Ticket className="h-3.5 w-3.5" />
                                  Tickets Voyageurs
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-stone-500">Quota:</span>
                                    <span className="font-medium text-blue-600">{gare.quota_tickets}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-stone-500">Vendus:</span>
                                    <span className="font-medium text-stone-800">{gare.tickets_vendus}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-stone-500">Recette:</span>
                                    <span className="font-medium text-emerald-600">{formatPrice(gare.recette_tickets)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-3 border border-stone-200/60">
                                <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Package className="h-3.5 w-3.5" />
                                  Bagages + Colis
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-stone-500">Quota bagages:</span>
                                    <span className="font-medium text-amber-600">{gare.quota_bagages}T</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-stone-500">Poids vendu:</span>
                                    <span className="font-medium text-amber-600">{gare.poids_vendu.toFixed(1)} kg</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-stone-500">Recette:</span>
                                    <span className="font-medium text-purple-600">{formatPrice(gare.recette_bagages)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-200/60">
                                <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Résumé</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-stone-500">Total vendu:</span>
                                    <span className="font-medium text-stone-800">
                                      {gare.tickets_vendus} tickets + {gare.poids_vendu.toFixed(1)} kg
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-stone-500">Recette totale:</span>
                                    <span className="font-bold text-emerald-700">
                                      {formatPrice(gare.recette_totale)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-stone-100/80 border-t-2 border-stone-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-stone-800">TOTAL</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">
                    {voyage.ventes_par_gare.reduce((sum, v) => sum + v.quota_tickets, 0)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-stone-800">
                    {voyage.total_tickets_vendus}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600">
                    {formatPrice(voyage.total_recette_tickets)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-amber-600">
                    {voyage.ventes_par_gare.reduce((sum, v) => sum + v.quota_bagages, 0)}T
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-amber-600">
                    {voyage.total_poids_vendu.toFixed(1)} kg
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-purple-600">
                    {formatPrice(voyage.total_recette_bagages)}
                  </td>
                  <td className="px-4 py-3 text-center"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}