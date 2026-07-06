/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
 
'use client';

import { Fragment, useEffect, useState } from 'react';
import { 
  History, Calendar, Train, Users, Package, 
  Ticket, Loader2, AlertCircle, Eye,
  ArrowLeft, ChevronDown, ChevronUp, Search, X,
  BarChart3, PieChart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getVoyagesHistoriqueRecetteFiltre, getVoyageDetailsRecette, getQuotasEnregistres } from '../actions';

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

interface QuotaTicketEnregistre {
  id: string;
  id_voyage: string;
  sens: string;
  gare_mga?: number;
  gare_adb?: number;
  gare_fnv?: number;
  gare_abv?: number;
  gare_aty?: number;
  gare_adk?: number;
  gare_abh?: number;
  gare_jrm?: number;
  gare_lhd?: number;
  gare_skm?: number;
  gare_fns?: number;
  gare_mgb?: number;
  gare_rzk?: number;
  gare_anv?: number;
  gare_bkv?: number;
  gare_abl?: number;
  gare_vvn?: number;
  gare_zin?: number;
  gare_adr?: number;
  gare_tpn?: number;
  gare_tpl?: number;
  gare_akf?: number;
  gare_vtz?: number;
  gare_ivd?: number;
  gare_mng?: number;
  created_at?: string;
  [key: string]: string | number | undefined; // Pour les propriétés dynamiques
}

interface QuotaBagageEnregistre {
  id: string;
  id_voyage: string;
  sens: string;
  commune_moramanga?: number;
  commune_ambatovola?: number;
  commune_antalova?: number;
  commune_mahialambo?: number;
  commune_maromby?: number;
  commune_ambatolampy?: number;
  commune_ambohibe?: number;
  commune_morafeno?: number;
  commune_ambodifarihy?: number;
  commune_mahasoa?: number;
  commune_ambohimandroso?: number;
  commune_miarinarivo?: number;
  commune_mandialaza?: number;
  created_at?: string;
  [key: string]: string | number | undefined; // Pour les propriétés dynamiques
}

interface QuotasEnregistres {
  tickets: QuotaTicketEnregistre[];
  bagages: QuotaBagageEnregistre[];
}

export default function DCOHistoriqueRecettePage() {
  const router = useRouter();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showQuotasModal, setShowQuotasModal] = useState(false);
  const [quotasEnregistres, setQuotasEnregistres] = useState<QuotasEnregistres | null>(null);

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
      // Récupérer les détails du voyage
      const result = await getVoyageDetailsRecette(voyageId);
      
      if (result.error) {
        setError(result.error);
      } else if (result.detail) {
        setSelectedVoyage(result.detail);
      }

      // Récupérer les quotas enregistrés pour ce voyage
      const quotasResult = await getQuotasEnregistres(voyageId);
      if (quotasResult && !('error' in quotasResult)) {
        setQuotasEnregistres({
          tickets: quotasResult.tickets || [],
          bagages: quotasResult.bagages || [],
        });
      } else {
        setQuotasEnregistres(null);
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
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Actif</span>;
    }
    return <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-medium">Terminé</span>;
  };

  const hasData = (gare: VenteParGare) => {
    return gare.tickets_vendus > 0 || gare.poids_vendu > 0 || gare.recette_totale > 0;
  };

  // Fonction pour obtenir les noms des gares depuis les quotas
  const getGareNameFromQuota = (key: string): string => {
    const gareMapping: Record<string, string> = {
      'gare_mga': 'MGA - Moramanga',
      'gare_adb': 'ADB - Andasibe',
      'gare_fnv': 'FNV - Fanovana',
      'gare_abv': 'ABV - Ambatovola',
      'gare_aty': 'ATY - Antanifotsy',
      'gare_adk': 'ADK - Andekaleka',
      'gare_abh': 'ABH - Ambalahoraka',
      'gare_jrm': 'JRM - Jirama PK206',
      'gare_lhd': 'LHD - Lohariandava',
      'gare_skm': 'SKM - Sandrakazomena',
      'gare_fns': 'FNS - Fanasana',
      'gare_mgb': 'MGB - Mangabe',
      'gare_rzk': 'RZK - Razanaka',
      'gare_anv': 'ANV - Anivorano',
      'gare_bkv': 'BKV - Brickaville',
      'gare_abl': 'ABL - Ambila',
      'gare_vvn': 'VVN - Vavony',
      'gare_zin': 'ZIN - Ampanotoamaizina',
      'gare_adr': 'ADR - Andranokoditra',
      'gare_tpn': 'TPN - Tampina',
      'gare_tpl': 'TPL - Tapolo',
      'gare_akf': 'AKF - Ankarefo',
      'gare_vtz': 'VTZ - Vohiteza',
      'gare_ivd': 'IVD - Ivondro',
      'gare_mng': 'MNG - Manguiers',
    };
    return gareMapping[key] || key;
  };

  // Fonction pour obtenir les noms des communes depuis les quotas bagages
  const getCommuneNameFromQuota = (key: string): string => {
    const communeMapping: Record<string, string> = {
      'commune_moramanga': 'Moramanga',
      'commune_ambatovola': 'Ambatovola',
      'commune_antalova': 'Antalova',
      'commune_mahialambo': 'Mahialambo',
      'commune_maromby': 'Maromby',
      'commune_ambatolampy': 'Ambatolampy',
      'commune_ambohibe': 'Ambohibe',
      'commune_morafeno': 'Morafeno',
      'commune_ambodifarihy': 'Ambodifarihy',
      'commune_mahasoa': 'Mahasoa',
      'commune_ambohimandroso': 'Ambohimandroso',
      'commune_miarinarivo': 'Miarinarivo',
      'commune_mandialaza': 'Mandialaza',
    };
    return communeMapping[key] || key;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-amber-700 animate-spin mx-auto" />
          <p className="mt-4 text-stone-500">Chargement de l&apos;historique...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedVoyage) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">{error}</p>
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
              setQuotasEnregistres(null);
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
                <h1 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-2">
                  <Train className="h-6 w-6 text-amber-700" />
                  Détails du voyage
                </h1>
                <p className="text-stone-600 text-sm">
                  {selectedVoyage.gare_depart_detail?.code} → {selectedVoyage.gare_arrivee_detail?.code}
                </p>
                <p className="text-xs text-stone-400">
                  {formatDate(selectedVoyage.date_voyage)} • Sens {selectedVoyage.sens} • {getStatusBadge(selectedVoyage.statut)}
                </p>
              </div>
              <div className="flex items-center gap-3">
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
                {quotasEnregistres && (quotasEnregistres.tickets.length > 0 || quotasEnregistres.bagages.length > 0) && (
                  <button
                    onClick={() => setShowQuotasModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition shadow-sm shadow-indigo-600/20"
                  >
                    <PieChart className="h-4 w-4" />
                    Voir les quotas
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Résumé */}
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
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Tickets Vendus</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Recette Tickets</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Poids Vendu</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Recette Bagages</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Recette Totale</th>
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

        {/* Modal des quotas enregistrés */}
        {showQuotasModal && quotasEnregistres && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-200/60 bg-stone-50/80 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                    Quotas enregistrés
                  </h2>
                  <p className="text-xs text-stone-500">
                    Voyage du {formatDate(selectedVoyage.date_voyage)} • Sens {selectedVoyage.sens}
                  </p>
                </div>
                <button
                  onClick={() => setShowQuotasModal(false)}
                  className="p-2 hover:bg-stone-100 rounded-lg transition"
                >
                  <X className="h-5 w-5 text-stone-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Quotas Tickets */}
                {quotasEnregistres.tickets.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-blue-600" />
                      Quotas Tickets
                    </h3>
                    <div className="bg-stone-50/80 rounded-lg border border-stone-200/60 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-stone-100/80">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Gare</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">Quota</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200/60">
                            {quotasEnregistres.tickets.map((quota) => {
                              const entries = Object.entries(quota).filter(([key]) => 
                                key.startsWith('gare_') && typeof key === 'string'
                              );
                              return entries.map(([key, value]) => (
                                <tr key={key} className="hover:bg-stone-50 transition">
                                  <td className="px-3 py-2 text-xs text-stone-700">{getGareNameFromQuota(key)}</td>
                                  <td className="px-3 py-2 text-xs font-medium text-blue-600 text-right">{value as number}</td>
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quotas Bagages */}
                {quotasEnregistres.bagages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-amber-600" />
                      Quotas Bagages
                    </h3>
                    <div className="bg-stone-50/80 rounded-lg border border-stone-200/60 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-stone-100/80">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Commune</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">Quota (tonnes)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200/60">
                            {quotasEnregistres.bagages.map((quota) => {
                              const entries = Object.entries(quota).filter(([key]) => 
                                key.startsWith('commune_') && typeof key === 'string'
                              );
                              return entries.map(([key, value]) => (
                                <tr key={key} className="hover:bg-stone-50 transition">
                                  <td className="px-3 py-2 text-xs text-stone-700">{getCommuneNameFromQuota(key)}</td>
                                  <td className="px-3 py-2 text-xs font-medium text-amber-600 text-right">{value as number}</td>
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowQuotasModal(false)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-indigo-600/20"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Liste des voyages avec filtre
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
                    {formatDate(voyage.date_voyage)}
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