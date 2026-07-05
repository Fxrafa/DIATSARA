/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { Fragment, useEffect, useState } from 'react';
import { 
  History, Calendar, Train, MapPin, Users, Package, 
  Ticket, TrendingUp, Loader2, AlertCircle, Eye,
  ArrowLeft, ChevronDown, ChevronUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getVoyagesHistorique, getVoyageDetailsHistorique } from '../actions';

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

interface QuotaTicket {
  gare_num: number;
  quota_2131: number;
  quota_2132: number;
  gare_detail?: { code: string; gare: string };
}

interface QuotaBagage {
  commune_tutelle: string;
  quota_tonnes_2131: number;
  quota_tonnes_2132: number;
}

interface VenteParGare {
  gare_num: number;
  gare_code: string;
  gare_name: string;
  commune_tutelle: string;
  tickets_vendus: number;
  part_madarail_total: number;
  poids_vendu: number;
  part_madarail_bagage_total: number;
}

interface VoyageDetail extends Voyage {
  quota_tickets: QuotaTicket[];
  quota_bagages: QuotaBagage[];
  ventes_par_gare: VenteParGare[];
  total_tickets_vendus: number;
  total_part_madarail: number;
  total_poids_vendu: number;
  total_part_madarail_bagage: number;
}

export default function CTVHistoriquePage() {
  const router = useRouter();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchVoyages = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getVoyagesHistorique();
      
      if (result.error) {
        setError(result.error);
      } else {
        setVoyages(result.voyages || []);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des voyages');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchVoyages();
  }, []);

  const fetchVoyageDetails = async (voyageId: string) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const result = await getVoyageDetailsHistorique(voyageId);
      
      if (result.error) {
        setError(result.error);
      } else if (result.detail) {
        setSelectedVoyage(result.detail);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des détails');
    }

    setLoadingDetail(false);
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

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-700 border-t-transparent"></div>
        <p className="ml-3 text-stone-500">Chargement de l'historique...</p>
      </div>
    );
  }

  if (error && !selectedVoyage) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchVoyages()}
            className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-emerald-700/20"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (selectedVoyage) {
    const sens = selectedVoyage.sens;
    const quotaTicketColumn = sens === '2131' ? 'quota_2131' : 'quota_2132';
    const quotaBagageColumn = sens === '2131' ? 'quota_tonnes_2131' : 'quota_tonnes_2132';
    
    const recetteTotale = selectedVoyage.total_part_madarail + selectedVoyage.total_part_madarail_bagage;

    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => {
              setSelectedVoyage(null);
              fetchVoyages();
            }}
            className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                  <Train className="h-5 w-5 text-emerald-700" />
                  Détails du voyage
                </h1>
                <p className="text-stone-600 text-sm">
                  {selectedVoyage.gare_depart_detail?.code} → {selectedVoyage.gare_arrivee_detail?.code}
                </p>
                <p className="text-xs text-stone-400">
                  {formatDate(selectedVoyage.date_voyage)} • Sens {selectedVoyage.sens} • {getStatusBadge(selectedVoyage.statut)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-500">Formation</p>
                <p className="text-sm font-medium text-stone-700">
                  {selectedVoyage.formation_voiture > 0 && `${selectedVoyage.formation_voiture}×1ère`}
                  {selectedVoyage.formation_voiture > 0 && selectedVoyage.formation_voiture2 > 0 && ' | '}
                  {selectedVoyage.formation_voiture2 > 0 && `${selectedVoyage.formation_voiture2}×2ème`}
                  {(selectedVoyage.formation_voiture > 0 || selectedVoyage.formation_voiture2 > 0) && selectedVoyage.formation_wagon > 0 && ' | '}
                  {selectedVoyage.formation_wagon > 0 && `${selectedVoyage.formation_wagon}×W`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Résumé - 5 colonnes */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Tickets vendus</p>
            <p className="text-2xl font-bold text-blue-600">{selectedVoyage.total_tickets_vendus}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Recette tickets</p>
            <p className="text-2xl font-bold text-emerald-600">{formatPrice(selectedVoyage.total_part_madarail)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Poids vendu</p>
            <p className="text-2xl font-bold text-amber-600">{selectedVoyage.total_poids_vendu.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Recette bagages</p>
            <p className="text-2xl font-bold text-purple-600">{formatPrice(selectedVoyage.total_part_madarail_bagage)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Recette totale</p>
            <p className="text-2xl font-bold text-emerald-700">{formatPrice(recetteTotale)}</p>
          </div>
        </div>

        {/* Tableau des détails par gare */}
        {loadingDetail ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-emerald-700 animate-spin" />
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
                  {selectedVoyage.ventes_par_gare.map((gare) => {
                    const quotaTicket = selectedVoyage.quota_tickets.find(q => q.gare_num === gare.gare_num);
                    const quotaBagage = selectedVoyage.quota_bagages.find(q => q.commune_tutelle === gare.commune_tutelle);
                    const isExpanded = expandedRows.has(gare.gare_code);
                    const recetteGare = gare.part_madarail_total + gare.part_madarail_bagage_total;
                    
                    const ticketQuota = quotaTicket ? quotaTicket[quotaTicketColumn] || 0 : 0;
                    const bagageQuota = quotaBagage ? quotaBagage[quotaBagageColumn] || 0 : 0;
                    const hasDataValue = gare.tickets_vendus > 0 || gare.poids_vendu > 0;
                    
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
                            {ticketQuota}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'text-stone-800 font-medium' : 'text-stone-400'}>
                              {gare.tickets_vendus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'text-emerald-600 font-medium' : 'text-stone-400'}>
                              {hasDataValue ? formatPrice(gare.part_madarail_total) : '0 Ar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-amber-600 font-medium">
                            {bagageQuota > 0 ? `${bagageQuota}T` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'text-amber-600 font-medium' : 'text-stone-400'}>
                              {gare.poids_vendu.toFixed(1)} kg
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'text-purple-600 font-medium' : 'text-stone-400'}>
                              {hasDataValue ? formatPrice(gare.part_madarail_bagage_total) : '0 Ar'}
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
                                      <span className="font-medium text-blue-600">{ticketQuota}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Vendus:</span>
                                      <span className="font-medium text-stone-800">{gare.tickets_vendus}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Recette:</span>
                                      <span className="font-medium text-emerald-600">{formatPrice(gare.part_madarail_total)}</span>
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
                                      <span className="font-medium text-amber-600">{bagageQuota > 0 ? `${bagageQuota}T` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Poids vendu:</span>
                                      <span className="font-medium text-amber-600">{gare.poids_vendu.toFixed(1)} kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Recette:</span>
                                      <span className="font-medium text-purple-600">{formatPrice(gare.part_madarail_bagage_total)}</span>
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
                                        {formatPrice(recetteGare)}
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
                      {selectedVoyage.quota_tickets.reduce((sum, q) => sum + (q[quotaTicketColumn] || 0), 0)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-stone-800">
                      {selectedVoyage.total_tickets_vendus}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600">
                      {formatPrice(selectedVoyage.total_part_madarail)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-amber-600">
                      {selectedVoyage.quota_bagages.reduce((sum, q) => sum + (q[quotaBagageColumn] || 0), 0)}T
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-amber-600">
                      {selectedVoyage.total_poids_vendu.toFixed(1)} kg
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-purple-600">
                      {formatPrice(selectedVoyage.total_part_madarail_bagage)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-emerald-700">
                      {formatPrice(recetteTotale)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Liste des voyages
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-3">
          <History className="h-6 w-6 text-emerald-700" />
          Historique des voyages
        </h1>
        <p className="text-stone-500 text-sm">Consultez les 5 derniers voyages et leurs statistiques</p>
      </div>

      {voyages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200/60">
          <Calendar className="h-16 w-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Aucun voyage trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voyages.map((voyage) => (
            <div
              key={voyage.id}
              className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden hover:shadow-md transition cursor-pointer group"
              onClick={() => fetchVoyageDetails(voyage.id)}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-stone-600">
                    {formatShortDate(voyage.date_voyage)}
                  </span>
                  {getStatusBadge(voyage.statut)}
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <Train className="h-4 w-4" />
                  <span>
                    {voyage.gare_depart_detail?.code} → {voyage.gare_arrivee_detail?.code}
                  </span>
                </div>
                <div className="mt-1 text-xs text-stone-400">
                  Sens {voyage.sens}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-stone-400">
                    {voyage.formation_voiture > 0 && `${voyage.formation_voiture}×1ère`}
                    {voyage.formation_voiture > 0 && voyage.formation_voiture2 > 0 && ' | '}
                    {voyage.formation_voiture2 > 0 && `${voyage.formation_voiture2}×2ème`}
                    {(voyage.formation_voiture > 0 || voyage.formation_voiture2 > 0) && voyage.formation_wagon > 0 && ' | '}
                    {voyage.formation_wagon > 0 && `${voyage.formation_wagon}×W`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchVoyageDetails(voyage.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition shadow-sm shadow-emerald-700/20"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Détails
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}