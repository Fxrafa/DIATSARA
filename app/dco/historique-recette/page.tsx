/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Fragment, useEffect, useState } from 'react';
import { 
  History, Calendar, Train, Users, Package, 
  Ticket, Loader2, AlertCircle, Eye,
  ArrowLeft, ChevronDown, ChevronUp, Search, X,
  TrendingUp, DollarSign
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getVoyagesHistoriqueRecetteFiltre, getVoyageDetailsRecette } from '../actions';

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
  tickets_vendus: number;
  recette_tickets: number;
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

export default function DCOHistoriqueRecettePage() {
  const router = useRouter();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    const now = new Date();
    const premierJour = new Date(now.getFullYear(), now.getMonth(), 1);
    const dernierJour = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setDateDebut(premierJour.toISOString().split('T')[0]);
    setDateFin(dernierJour.toISOString().split('T')[0]);
    
    fetchVoyages(
      premierJour.toISOString().split('T')[0],
      dernierJour.toISOString().split('T')[0]
    );
  }, []);

  const fetchVoyages = async (debut?: string, fin?: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getVoyagesHistoriqueRecetteFiltre(debut, fin);
      
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

  const handleFilter = () => {
    if (dateDebut && dateFin) {
      if (dateDebut > dateFin) {
        setError('La date de début doit être antérieure à la date de fin');
        return;
      }
      setIsFiltering(true);
      fetchVoyages(dateDebut, dateFin);
      setError(null);
    } else {
      setError('Veuillez sélectionner une plage de dates');
    }
  };

  const handleReset = () => {
    const now = new Date();
    const premierJour = new Date(now.getFullYear(), now.getMonth(), 1);
    const dernierJour = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setDateDebut(premierJour.toISOString().split('T')[0]);
    setDateFin(dernierJour.toISOString().split('T')[0]);
    setIsFiltering(false);
    fetchVoyages(
      premierJour.toISOString().split('T')[0],
      dernierJour.toISOString().split('T')[0]
    );
    setError(null);
  };

  const fetchVoyageDetails = async (voyageId: string) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const result = await getVoyageDetailsRecette(voyageId);
      
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

  const hasData = (gare: VenteParGare) => {
    return gare.tickets_vendus > 0 || gare.poids_vendu > 0 || gare.recette_totale > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-700 border-t-transparent"></div>
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
            onClick={() => handleReset()}
            className="mt-4 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-amber-700/20"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (selectedVoyage) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => {
              setSelectedVoyage(null);
              handleReset();
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
                  <Train className="h-5 w-5 text-amber-700" />
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
            <p className="text-2xl font-bold text-emerald-600">{formatPrice(selectedVoyage.total_recette_tickets)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Poids vendu</p>
            <p className="text-2xl font-bold text-amber-600">{selectedVoyage.total_poids_vendu.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Recette bagages</p>
            <p className="text-2xl font-bold text-purple-600">{formatPrice(selectedVoyage.total_recette_bagages)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Recette totale</p>
            <p className="text-2xl font-bold text-amber-700">{formatPrice(selectedVoyage.total_recette)}</p>
          </div>
        </div>

        {/* Tableau des détails par gare */}
        {loadingDetail ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-amber-700 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50/80">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Gare</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Tickets</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Recette</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Poids</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Recette Bag.</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/60">
                  {selectedVoyage.ventes_par_gare.map((gare) => {
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
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'font-bold text-amber-700' : 'text-stone-400'}>
                              {hasDataValue ? formatPrice(gare.recette_totale) : '0 Ar'}
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
                            <td colSpan={7} className="px-4 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-white rounded-lg p-3 border border-stone-200/60">
                                  <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Ticket className="h-3.5 w-3.5" />
                                    Tickets Voyageurs
                                  </h4>
                                  <div className="space-y-1 text-sm">
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
                                      <span className="text-stone-500">Poids vendu:</span>
                                      <span className="font-medium text-amber-600">{gare.poids_vendu.toFixed(1)} kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Recette:</span>
                                      <span className="font-medium text-purple-600">{formatPrice(gare.recette_bagages)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-200/60">
                                  <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Résumé</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Total vendu:</span>
                                      <span className="font-medium text-stone-800">
                                        {gare.tickets_vendus} tickets + {gare.poids_vendu.toFixed(1)} kg
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Recette totale:</span>
                                      <span className="font-bold text-amber-700">
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
                    <td className="px-4 py-3 text-center text-sm font-bold text-stone-800">
                      {selectedVoyage.total_tickets_vendus}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600">
                      {formatPrice(selectedVoyage.total_recette_tickets)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-amber-600">
                      {selectedVoyage.total_poids_vendu.toFixed(1)} kg
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-purple-600">
                      {formatPrice(selectedVoyage.total_recette_bagages)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-amber-700">
                      {formatPrice(selectedVoyage.total_recette)}
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-3">
          <History className="h-6 w-6 text-amber-700" />
          Historique des recettes
        </h1>
        <p className="text-stone-500 text-sm">Consultez les voyages terminés et leurs recettes par gare</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all"
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm shadow-amber-700/20"
          >
            <Search className="h-4 w-4" />
            Filtrer
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </button>
          {isFiltering && (
            <span className="text-sm text-amber-700 font-medium">
              {voyages.length} voyage(s) trouvé(s)
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {voyages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200/60">
          <Calendar className="h-16 w-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Aucun voyage terminé trouvé</p>
          <p className="text-sm text-stone-400 mt-1">Modifiez les filtres pour voir plus de voyages</p>
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
                <div className="flex items-center gap-2 text-amber-700 font-medium">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium transition shadow-sm shadow-amber-700/20"
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