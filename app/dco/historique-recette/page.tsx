/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { Fragment, useEffect, useState, Suspense } from 'react';
import { 
  Activity, Calendar, Train, Users, Package, 
  Ticket, Loader2, AlertCircle, Eye,
  ArrowLeft, ChevronDown, ChevronUp, Power,
  PowerOff, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

import { 
  getVoyagesActifsSuivi, 
  getVoyageDetailsSuivi,
  desactiverVenteGare,
  activerVenteGare,
  activerToutesVentes
} from '../actions';

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
  desactivee: boolean;
}

interface VoyageDetail extends Voyage {
  ventes_par_gare: VenteParGare[];
  total_tickets_vendus: number;
  total_recette_tickets: number;
  total_poids_vendu: number;
  total_recette_bagages: number;
  total_recette: number;
  gares_desactivees: Set<number>;
}

export default function DCOSuiviTempsReelPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-700 border-t-transparent"></div>
        <p className="ml-3 text-stone-500">Chargement...</p>
      </div>
    }>
      <SuiviTempsReelContent />
    </Suspense>
  );
}

function SuiviTempsReelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{
    type: 'desactiver' | 'activer' | 'activer_toutes';
    gareNum?: number;
    gareCode?: string;
    gareName?: string;
  } | null>(null);

  // Récupérer l'ID du voyage depuis l'URL
  const voyageIdFromUrl = searchParams?.get('voyage');

  const fetchVoyages = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getVoyagesActifsSuivi();
      
      if (result.error) {
        setError(result.error);
      } else {
        setVoyages(result.voyages || []);
        
        // Si un voyageId est dans l'URL, charger ses détails
        if (voyageIdFromUrl && result.voyages) {
          const voyage = result.voyages.find(v => v.id === voyageIdFromUrl);
          if (voyage) {
            fetchVoyageDetails(voyageIdFromUrl);
          }
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des voyages');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchVoyages();
  }, [voyageIdFromUrl]);

  const fetchVoyageDetails = async (voyageId: string) => {
    setLoadingDetail(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await getVoyageDetailsSuivi(voyageId);
      
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

  const handleDesactiverVente = async (gareNum: number, gareCode: string, gareName: string) => {
    if (!selectedVoyage) return;
    
    setConfirmModal({
      type: 'desactiver',
      gareNum,
      gareCode,
      gareName,
    });
  };

  const handleActiverVente = async (gareNum: number, gareCode: string, gareName: string) => {
    if (!selectedVoyage) return;
    
    setConfirmModal({
      type: 'activer',
      gareNum,
      gareCode,
      gareName,
    });
  };

  const handleActiverToutes = async () => {
    if (!selectedVoyage) return;
    
    setConfirmModal({
      type: 'activer_toutes',
    });
  };

  const confirmAction = async () => {
    if (!selectedVoyage || !confirmModal) return;

    setError(null);
    setSuccess(null);

    try {
      if (confirmModal.type === 'desactiver' && confirmModal.gareNum) {
        const result = await desactiverVenteGare(selectedVoyage.id, confirmModal.gareNum);
        if (result.error) {
          setError(result.error);
          setConfirmModal(null);
          return;
        }

        setSelectedVoyage(prev => {
          if (!prev) return prev;
          const newVentes = prev.ventes_par_gare.map(v => 
            v.gare_num === confirmModal.gareNum ? { ...v, desactivee: true } : v
          );
          const newGaresDesactivees = new Set(prev.gares_desactivees);
          newGaresDesactivees.add(confirmModal.gareNum!);
          return {
            ...prev,
            ventes_par_gare: newVentes,
            gares_desactivees: newGaresDesactivees,
          };
        });
        setSuccess(`Vente désactivée pour la gare ${confirmModal.gareCode}`);

      } else if (confirmModal.type === 'activer' && confirmModal.gareNum) {
        const result = await activerVenteGare(selectedVoyage.id, confirmModal.gareNum);
        if (result.error) {
          setError(result.error);
          setConfirmModal(null);
          return;
        }

        setSelectedVoyage(prev => {
          if (!prev) return prev;
          const newVentes = prev.ventes_par_gare.map(v => 
            v.gare_num === confirmModal.gareNum ? { ...v, desactivee: false } : v
          );
          const newGaresDesactivees = new Set(prev.gares_desactivees);
          newGaresDesactivees.delete(confirmModal.gareNum!);
          return {
            ...prev,
            ventes_par_gare: newVentes,
            gares_desactivees: newGaresDesactivees,
          };
        });
        setSuccess(`Vente activée pour la gare ${confirmModal.gareCode}`);

      } else if (confirmModal.type === 'activer_toutes') {
        const result = await activerToutesVentes(selectedVoyage.id);
        if (result.error) {
          setError(result.error);
          setConfirmModal(null);
          return;
        }

        setSelectedVoyage(prev => {
          if (!prev) return prev;
          const newVentes = prev.ventes_par_gare.map(v => ({ ...v, desactivee: false }));
          return {
            ...prev,
            ventes_par_gare: newVentes,
            gares_desactivees: new Set(),
          };
        });
        setSuccess('Toutes les ventes ont été activées');
      }

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de l\'opération');
    }

    setConfirmModal(null);
  };

  const cancelConfirm = () => {
    setConfirmModal(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-700 border-t-transparent"></div>
        <p className="ml-3 text-stone-500">Chargement des voyages actifs...</p>
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
            className="mt-4 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-amber-700/20"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (selectedVoyage) {
    const nbGaresDesactivees = selectedVoyage.gares_desactivees.size;
    const totalGares = selectedVoyage.ventes_par_gare.length;

    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => {
              setSelectedVoyage(null);
              setSuccess(null);
              setError(null);
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
                  <Activity className="h-5 w-5 text-amber-700" />
                  Suivi en temps réel
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

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
            <RefreshCw className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-stone-500">
            {nbGaresDesactivees > 0 ? (
              <span className="text-red-600">{nbGaresDesactivees} gare(s) désactivée(s)</span>
            ) : (
              <span className="text-emerald-600">Toutes les ventes sont actives</span>
            )}
          </div>
          {nbGaresDesactivees > 0 && (
            <button
              onClick={handleActiverToutes}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm shadow-emerald-600/20"
            >
              <Power className="h-4 w-4" />
              Activer toutes les ventes
            </button>
          )}
        </div>

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
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Gare</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Quota Tickets</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Vendus</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Recette</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Quota Bag.</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Poids</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Recette</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/60">
                  {selectedVoyage.ventes_par_gare.map((gare, index) => {
                    const isExpanded = expandedRows.has(gare.gare_code);
                    const hasDataValue = hasData(gare);
                    const isDesactivee = gare.desactivee;
                    
                    return (
                      <Fragment key={gare.gare_num}>
                        <tr className={`hover:bg-stone-50 transition ${isDesactivee ? 'bg-stone-50/80' : ''}`}>
                          <td className="px-4 py-3 text-sm text-stone-400 font-mono text-center">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            <span className={isDesactivee ? 'text-stone-400 line-through' : hasDataValue ? 'text-stone-800' : 'text-stone-400'}>
                              {gare.gare_code} - {gare.gare_name}
                            </span>
                            {isDesactivee && (
                              <span className="ml-2 text-xs text-red-500 font-medium">(Désactivée)</span>
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
                            {isDesactivee ? (
                              <button
                                onClick={() => handleActiverVente(gare.gare_num, gare.gare_code, gare.gare_name)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 mx-auto"
                              >
                                <Power className="h-3.5 w-3.5" />
                                Activer
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDesactiverVente(gare.gare_num, gare.gare_code, gare.gare_name)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 mx-auto"
                              >
                                <PowerOff className="h-3.5 w-3.5" />
                                Désactiver
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && hasDataValue && (
                          <tr className="bg-stone-50/50">
                            <td colSpan={9} className="px-4 py-3">
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

                                <div className={`rounded-lg p-3 border ${isDesactivee ? 'bg-red-50/50 border-red-200/60' : 'bg-emerald-50/50 border-emerald-200/60'}`}>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-2">Résumé</h4>
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
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Statut:</span>
                                      <span className={`font-medium ${isDesactivee ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {isDesactivee ? 'Vente désactivée' : 'Vente active'}
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
                    <td className="px-4 py-3 text-sm font-bold text-stone-800" colSpan={2}>TOTAL</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">
                      {selectedVoyage.ventes_par_gare.reduce((sum, v) => sum + v.quota_tickets, 0)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-stone-800">
                      {selectedVoyage.total_tickets_vendus}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600">
                      {formatPrice(selectedVoyage.total_recette_tickets)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-amber-600">
                      {selectedVoyage.ventes_par_gare.reduce((sum, v) => sum + v.quota_bagages, 0)}T
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-amber-600">
                      {selectedVoyage.total_poids_vendu.toFixed(1)} kg
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-purple-600">
                      {formatPrice(selectedVoyage.total_recette_bagages)}
                    </td>
                    <td className="px-4 py-3 text-center"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {confirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${confirmModal.type === 'desactiver' ? 'bg-red-100' : 'bg-emerald-100'}`}>
                  {confirmModal.type === 'desactiver' ? (
                    <PowerOff className="h-5 w-5 text-red-600" />
                  ) : (
                    <Power className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-800">Confirmer l'action</h3>
                  <p className="text-sm text-stone-500">
                    {confirmModal.type === 'desactiver' ? 'Désactivation de la vente' : 'Activation de la vente'}
                  </p>
                </div>
              </div>
              <p className="text-stone-600 mb-6">
                {confirmModal.type === 'desactiver' && (
                  <>Êtes-vous sûr de vouloir <span className="font-semibold text-red-600">désactiver</span> la vente pour la gare <span className="font-medium text-stone-800">{confirmModal.gareCode} - {confirmModal.gareName}</span> ?</>
                )}
                {confirmModal.type === 'activer' && (
                  <>Êtes-vous sûr de vouloir <span className="font-semibold text-emerald-600">activer</span> la vente pour la gare <span className="font-medium text-stone-800">{confirmModal.gareCode} - {confirmModal.gareName}</span> ?</>
                )}
                {confirmModal.type === 'activer_toutes' && (
                  <>Êtes-vous sûr de vouloir <span className="font-semibold text-emerald-600">activer</span> les ventes pour <span className="font-medium text-stone-800">toutes les gares</span> ?</>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelConfirm}
                  className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmAction}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white transition font-medium shadow-sm ${
                    confirmModal.type === 'desactiver' 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  Confirmer
                </button>
              </div>
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
          <Activity className="h-6 w-6 text-amber-700" />
          Suivi en temps réel
        </h1>
        <p className="text-stone-500 text-sm">Gérez les ventes des voyages actifs par gare</p>
      </div>

      {voyages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200/60">
          <Activity className="h-16 w-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Aucun voyage actif</p>
          <p className="text-sm text-stone-400 mt-1">Les voyages planifiés apparaîtront ici</p>
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
                    {new Date(voyage.date_voyage).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
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
                    Suivi
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