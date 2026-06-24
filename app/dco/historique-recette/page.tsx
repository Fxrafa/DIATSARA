/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Fragment, useEffect, useState } from 'react';
import { 
  History, Calendar, Train, Users, Package, 
  Ticket, Loader2, AlertCircle, Eye,
  ArrowLeft, ChevronDown, ChevronUp, Search, X
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

  // États pour les filtres
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [isFiltering, setIsFiltering] = useState(false);

  // Initialiser avec le mois actuel
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

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR') + ' Ar';
  };

  const getStatusBadge = (statut: string) => {
    if (statut === 'actif') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Actif</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Terminé</span>;
  };

  const hasData = (gare: VenteParGare) => {
    return gare.tickets_vendus > 0 || gare.poids_vendu > 0 || gare.recette_totale > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Chargement de l&apos;historique...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedVoyage) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">{error}</p>
          <button
            onClick={() => handleReset()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </button>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Train className="h-6 w-6 text-blue-600" />
                  Détails du voyage
                </h1>
                <p className="text-gray-600 mt-1">
                  {selectedVoyage.gare_depart_detail?.code} → {selectedVoyage.gare_arrivee_detail?.code}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedVoyage.date_voyage)} • Sens {selectedVoyage.sens} • {getStatusBadge(selectedVoyage.statut)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Formation</p>
                <p className="text-sm font-medium text-gray-900">
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

        {/* Résumé */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-500">Tickets vendus</p>
            <p className="text-2xl font-bold text-blue-600">{selectedVoyage.total_tickets_vendus}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-500">Recette tickets</p>
            <p className="text-2xl font-bold text-green-600">{formatPrice(selectedVoyage.total_recette_tickets)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-500">Poids vendu (bagages+colis)</p>
            <p className="text-2xl font-bold text-orange-600">{selectedVoyage.total_poids_vendu.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-500">Recette bagages+colis</p>
            <p className="text-2xl font-bold text-purple-600">{formatPrice(selectedVoyage.total_recette_bagages)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-xs text-gray-500">Recette totale</p>
            <p className="text-2xl font-bold text-yellow-600">{formatPrice(selectedVoyage.total_recette)}</p>
          </div>
        </div>

        {/* Tableau des détails par gare */}
        {loadingDetail ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gare</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tickets Vendus</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Recette Tickets</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Poids Vendu</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Recette Bagages</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Recette Totale</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedVoyage.ventes_par_gare.map((gare) => {
                    const isExpanded = expandedRows.has(gare.gare_code);
                    const hasDataValue = hasData(gare);
                    
                    return (
                      <Fragment key={gare.gare_num}>
                        <tr className={`hover:bg-gray-50 transition ${!hasDataValue ? 'text-gray-400' : ''}`}>
                          <td className="px-4 py-3 text-sm font-medium">
                            <span className={hasDataValue ? 'text-gray-900' : 'text-gray-400'}>
                              {gare.gare_code} - {gare.gare_name}
                            </span>
                            {!hasDataValue && (
                              <span className="ml-2 text-xs text-gray-400">(aucune vente)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                              {gare.tickets_vendus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'text-green-600 font-medium' : 'text-gray-400'}>
                              {hasDataValue ? formatPrice(gare.recette_tickets) : '0 Ar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                              {gare.poids_vendu.toFixed(1)} kg
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'text-purple-600 font-medium' : 'text-gray-400'}>
                              {hasDataValue ? formatPrice(gare.recette_bagages) : '0 Ar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={hasDataValue ? 'font-bold text-yellow-600' : 'text-gray-400'}>
                              {hasDataValue ? formatPrice(gare.recette_totale) : '0 Ar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasDataValue && (
                              <button
                                onClick={() => toggleRow(gare.gare_code)}
                                className="p-1 hover:bg-gray-100 rounded transition"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && hasDataValue && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="px-4 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <Ticket className="h-3 w-3" />
                                    Tickets Voyageurs
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Vendus:</span>
                                      <span className="font-medium text-gray-900">{gare.tickets_vendus}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Recette:</span>
                                      <span className="font-medium text-green-600">{formatPrice(gare.recette_tickets)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    Bagages + Colis
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Poids vendu:</span>
                                      <span className="font-medium text-orange-600">{gare.poids_vendu.toFixed(1)} kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Recette:</span>
                                      <span className="font-medium text-purple-600">{formatPrice(gare.recette_bagages)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-gray-100 rounded-lg p-3 border border-gray-200">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Résumé</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Total vendu:</span>
                                      <span className="font-medium text-gray-900">
                                        {gare.tickets_vendus} tickets + {gare.poids_vendu.toFixed(1)} kg
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Recette totale:</span>
                                      <span className="font-medium text-yellow-600">
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
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                      {selectedVoyage.total_tickets_vendus}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-green-600">
                      {formatPrice(selectedVoyage.total_recette_tickets)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-orange-600">
                      {selectedVoyage.total_poids_vendu.toFixed(1)} kg
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-purple-600">
                      {formatPrice(selectedVoyage.total_recette_bagages)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-yellow-600">
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

  // Liste des voyages avec filtre
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <History className="h-8 w-8 text-blue-600" />
          Historique des recettes
        </h1>
        <p className="text-gray-600 mt-1">Consultez les voyages terminés et leurs recettes par gare</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Filtrer
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </button>
          {isFiltering && (
            <span className="text-sm text-blue-600 font-medium">
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
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun voyage terminé trouvé pour cette période</p>
          <p className="text-sm text-gray-400 mt-1">Modifiez les filtres pour voir plus de voyages</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voyages.map((voyage) => (
            <div
              key={voyage.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition cursor-pointer"
              onClick={() => fetchVoyageDetails(voyage.id)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    {formatDate(voyage.date_voyage)}
                  </span>
                  {getStatusBadge(voyage.statut)}
                </div>
                <div className="flex items-center gap-2 text-blue-600 font-medium">
                  <Train className="h-4 w-4" />
                  <span>
                    {voyage.gare_depart_detail?.code} → {voyage.gare_arrivee_detail?.code}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Sens {voyage.sens}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
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
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    <Eye className="h-3 w-3" />
                    Voir détails
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