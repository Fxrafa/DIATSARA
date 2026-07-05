/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Edit, CheckCircle, AlertCircle, Clock, Train, Users, Package, Eye, PlusCircle } from 'lucide-react';
import { terminerVoyage } from '../actions';
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
  statut: 'actif' | 'termine';
  created_at: string;
  gare_depart_detail?: { code: string; gare: string };
  gare_arrivee_detail?: { code: string; gare: string };
}

export default function HistoriquePage() {
  const router = useRouter();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'tous' | 'actif' | 'termine'>('tous');

  const fetchVoyages = async () => {
    setLoading(true);
    const { data: voyagesData, error: fetchError } = await supabase
      .from('voyages')
      .select(`
        *,
        gare_depart_detail:gare_depart(code, gare),
        gare_arrivee_detail:gare_arrivee(code, gare)
      `)
      .order('date_voyage', { ascending: false });

    if (fetchError) {
      console.error('Erreur:', fetchError);
    } else {
      setVoyages(voyagesData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVoyages();
  }, []);

  const handleTerminer = async (id: string) => {
    setError(null);
    const result = await terminerVoyage(id);
    if (result.error) {
      setError(result.error);
    } else {
      setShowConfirmModal(null);
      await fetchVoyages();
      router.refresh();
    }
  };

  const handleEdit = (voyage: Voyage) => {
    if (voyage.statut === 'termine') {
      setError('Impossible de modifier un voyage terminé');
      setTimeout(() => setError(null), 3000);
      return;
    }
    router.push(`/dco/historique/modifier/${voyage.id}`);
  };

  const handleRowClick = (voyage: Voyage) => {
    if (voyage.statut === 'actif') {
      router.push(`/dco/suivi-temps-reel?voyage=${voyage.id}`);
    } else {
      router.push(`/dco/historique-recette?voyage=${voyage.id}`);
    }
  };

  const filteredVoyages = voyages.filter(v => {
    if (activeFilter === 'actif') return v.statut === 'actif';
    if (activeFilter === 'termine') return v.statut === 'termine';
    return true;
  });

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

  const getStatusBadge = (statut: string) => {
    if (statut === 'actif') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
          <Clock className="h-3 w-3" />
          Actif
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-medium">
        <CheckCircle className="h-3 w-3" />
        Terminé
      </span>
    );
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
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-700 border-t-transparent"></div>
        <p className="ml-3 text-stone-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-800">Historique des voyages</h1>
          <p className="text-stone-500 text-sm">Consultez et gérez tous les voyages planifiés</p>
        </div>
        <a
          href="/dco/planification"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-amber-700/20"
        >
          <PlusCircle className="h-4 w-4" />
          Nouveau voyage
        </a>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('tous')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              activeFilter === 'tous'
                ? 'bg-amber-700 text-white shadow-sm shadow-amber-700/20'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setActiveFilter('actif')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              activeFilter === 'actif'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Actifs
          </button>
          <button
            onClick={() => setActiveFilter('termine')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              activeFilter === 'termine'
                ? 'bg-stone-600 text-white shadow-sm shadow-stone-600/20'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Terminés
          </button>
          <span className="ml-auto text-xs text-stone-400 self-center">
            {filteredVoyages.length} voyage(s)
          </span>
        </div>
      </div>

      {filteredVoyages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200/60">
          <Calendar className="h-16 w-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Aucun voyage trouvé</p>
          <p className="text-sm text-stone-400 mt-1">
            {activeFilter === 'tous' ? 'Aucun voyage planifié' : 
             activeFilter === 'actif' ? 'Aucun voyage actif' : 'Aucun voyage terminé'}
          </p>
          {activeFilter !== 'termine' && (
            <a
              href="/dco/planification"
              className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium hover:underline"
            >
              Planifier un voyage →
            </a>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Sens</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Départ → Arrivée</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Formation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Capacité</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {filteredVoyages.map((voyage) => (
                  <tr
                    key={voyage.id}
                    onClick={() => handleRowClick(voyage)}
                    className={`
                      transition cursor-pointer
                      ${voyage.statut === 'actif' 
                        ? 'hover:bg-emerald-50/50' 
                        : 'hover:bg-stone-50'
                      }
                    `}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-stone-800">{formatShortDate(voyage.date_voyage)}</div>
                      <div className="text-xs text-stone-400">
                        {new Date(voyage.date_voyage).toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 bg-stone-100 text-stone-700 rounded text-xs font-medium">
                        {voyage.sens}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-800">
                          {voyage.gare_depart_detail?.code || voyage.gare_depart}
                        </span>
                        <span className="text-stone-400 text-xs">→</span>
                        <span className="text-sm font-medium text-stone-800">
                          {voyage.gare_arrivee_detail?.code || voyage.gare_arrivee}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <Train className="h-3.5 w-3.5 text-stone-400" />
                        <span>{getFormationText(voyage)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span className="text-stone-600">{voyage.places_max} places</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Package className="h-3 w-3 text-amber-500" />
                          <span className="text-stone-600">{voyage.poids_max} tonnes</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(voyage.statut)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {voyage.statut === 'actif' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowConfirmModal(voyage.id);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                              title="Marquer comme terminé"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Effectuer
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(voyage);
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                              title="Modifier"
                            >
                              <Edit className="h-3 w-3" />
                              Modifier
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(voyage);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                              title="Suivi en temps réel"
                            >
                              <Eye className="h-3 w-3" />
                              Suivi
                            </button>
                          </>
                        )}
                        {voyage.statut === 'termine' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(voyage);
                              }}
                              className="px-3 py-1.5 bg-stone-600 hover:bg-stone-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                              title="Voir la recette"
                            >
                              <Eye className="h-3 w-3" />
                              Recette
                            </button>
                            <span className="text-xs text-stone-400">Terminé</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-800">Confirmer l'effectuation</h3>
                <p className="text-sm text-stone-500">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-stone-600 mb-6">
              Êtes-vous sûr de vouloir marquer ce voyage comme <span className="font-semibold text-amber-700">terminé</span> ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-50 transition font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => handleTerminer(showConfirmModal)}
                className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg transition font-medium shadow-sm shadow-amber-700/20"
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