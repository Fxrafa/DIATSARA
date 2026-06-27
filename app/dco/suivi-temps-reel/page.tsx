/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Fragment, useEffect, useState } from 'react';
import { 
  Activity, Calendar, Train, Users, Package, 
  Ticket, Loader2, AlertCircle, Eye,
  ArrowLeft, ChevronDown, ChevronUp, Power,
  PowerOff, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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

  const fetchVoyages = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getVoyagesActifsSuivi();
      
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
          <p className="mt-4 text-gray-500">Chargement des voyages actifs...</p>
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
            onClick={() => fetchVoyages()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </button>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="h-6 w-6 text-blue-600" />
                  Suivi en temps réel
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

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <RefreshCw className="h-5 w-5 text-green-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* ✅ Résumé - 6 colonnes */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-500">Tickets vendus</p>
            <p className="text-2xl font-bold text-blue-600">{selectedVoyage.total_tickets_vendus}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-500">Recette tickets</p>
            <p className="text-2xl font-bold text-green-600">{formatPrice(selectedVoyage.total_recette_tickets)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-500">Poids vendu (kg équiv.)</p>
            <p className="text-2xl font-bold text-orange-600">{selectedVoyage.total_poids_vendu.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-500">Recette bagages</p>
            <p className="text-2xl font-bold text-purple-600">{formatPrice(selectedVoyage.total_recette_bagages)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-xs text-gray-500">Recette totale</p>
            <p className="text-2xl font-bold text-yellow-600">{formatPrice(selectedVoyage.total_recette)}</p>
          </div>
          <div className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${nbGaresDesactivees > 0 ? 'border-red-500' : 'border-green-500'}`}>
            <p className="text-xs text-gray-500">Ventes désactivées</p>
            <p className={`text-2xl font-bold ${nbGaresDesactivees > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {nbGaresDesactivees} / {totalGares}
            </p>
          </div>
        </div>

        {nbGaresDesactivees > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleActiverToutes}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2"
            >
              <Power className="h-4 w-4" />
              Activer toutes les ventes
            </button>
          </div>
        )}

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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quota Tickets</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tickets Vendus</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Recette</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quota Bagages</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Poids Vendu</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Recette</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedVoyage.ventes_par_gare.map((gare) => {
                    const isExpanded = expandedRows.has(gare.gare_code);
                    const hasDataValue = hasData(gare);
                    const isDesactivee = gare.desactivee;
                    
                    return (
                      <Fragment key={gare.gare_num}>
                        <tr className={`hover:bg-gray-50 transition ${isDesactivee ? 'bg-gray-100' : ''}`}>
                          <td className="px-4 py-3 text-sm font-medium">
                            <span className={isDesactivee ? 'text-gray-500 line-through' : hasDataValue ? 'text-gray-900' : 'text-gray-500'}>
                              {gare.gare_code} - {gare.gare_name}
                            </span>
                            {isDesactivee && (
                              <span className="ml-2 text-xs text-red-500 font-medium">(Vente désactivée)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-blue-600 font-medium">
                            {gare.quota_tickets}
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
                          <td className="px-4 py-3 text-center text-sm text-orange-600 font-medium">
                            {gare.quota_bagages}T
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
                          <td className="px-4 py-3 text-center">
                            {isDesactivee ? (
                              <button
                                onClick={() => handleActiverVente(gare.gare_num, gare.gare_code, gare.gare_name)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 mx-auto"
                              >
                                <Power className="h-3 w-3" />
                                Activer
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDesactiverVente(gare.gare_num, gare.gare_code, gare.gare_name)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 mx-auto"
                              >
                                <PowerOff className="h-3 w-3" />
                                Désactiver
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && hasDataValue && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="px-4 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <Ticket className="h-3 w-3" />
                                    Tickets Voyageurs
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Quota:</span>
                                      <span className="font-medium text-blue-600">{gare.quota_tickets}</span>
                                    </div>
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
                                      <span className="text-gray-600">Quota bagages:</span>
                                      <span className="font-medium text-orange-600">{gare.quota_bagages}T</span>
                                    </div>
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
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Statut:</span>
                                      <span className={`font-medium ${isDesactivee ? 'text-red-600' : 'text-green-600'}`}>
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
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">
                      {selectedVoyage.ventes_par_gare.reduce((sum, v) => sum + v.quota_tickets, 0)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                      {selectedVoyage.total_tickets_vendus}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-green-600">
                      {formatPrice(selectedVoyage.total_recette_tickets)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-orange-600">
                      {selectedVoyage.ventes_par_gare.reduce((sum, v) => sum + v.quota_bagages, 0)}T
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-orange-600">
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
                <AlertTriangle className={`h-6 w-6 ${confirmModal.type === 'desactiver' ? 'text-red-500' : 'text-green-500'}`} />
                <h3 className="text-xl font-bold text-gray-900">Confirmer l'action</h3>
              </div>
              <p className="text-gray-600 mb-6">
                {confirmModal.type === 'desactiver' && (
                  <>Êtes-vous sûr de vouloir <span className="text-red-600 font-medium">désactiver</span> la vente pour la gare <span className="font-medium">{confirmModal.gareCode} - {confirmModal.gareName}</span> ?</>
                )}
                {confirmModal.type === 'activer' && (
                  <>Êtes-vous sûr de vouloir <span className="text-green-600 font-medium">activer</span> la vente pour la gare <span className="font-medium">{confirmModal.gareCode} - {confirmModal.gareName}</span> ?</>
                )}
                {confirmModal.type === 'activer_toutes' && (
                  <>Êtes-vous sûr de vouloir <span className="text-green-600 font-medium">activer</span> les ventes pour <span className="font-medium">toutes les gares</span> ?</>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmAction}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition ${
                    confirmModal.type === 'desactiver' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-600" />
          Suivi en temps réel
        </h1>
        <p className="text-gray-600 mt-1">Gérez les ventes des voyages actifs par gare</p>
      </div>

      {voyages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun voyage actif</p>
          <p className="text-sm text-gray-400 mt-1">Les voyages planifiés apparaîtront ici</p>
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