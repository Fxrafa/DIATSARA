/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Edit, CheckCircle, AlertCircle, Clock, Train } from 'lucide-react';
import { terminerVoyage } from '../actions';
import { useRouter } from 'next/navigation';

interface Voyage {
  id: string;
  date_voyage: string;
  sens: string;
  gare_depart: number;
  gare_arrivee: number;
  formation_voiture: number;
  formation_wagon: number;
  statut: 'actif' | 'termine';
  created_at: string;
  gare_depart_detail?: { code: string; gare: string };
  gare_arrivee_detail?: { code: string; gare: string };
}

export default function HistoriquePage() {
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (statut: string) => {
    if (statut === 'actif') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          <Clock className="h-3 w-3" />
          Actif
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
        <CheckCircle className="h-3 w-3" />
        Terminé
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Historique des voyages</h1>
        <p className="text-gray-600 mt-1">Consultez et gérez tous les voyages planifiés</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Chargement...</p>
        </div>
      ) : voyages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun voyage planifié</p>
          <a
            href="/dco/planification"
            className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Planifier un voyage
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Départ → Arrivée</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {voyages.map((voyage) => (
                  <tr key={voyage.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(voyage.date_voyage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {voyage.sens}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {voyage.gare_depart_detail?.code || voyage.gare_depart}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">
                          {voyage.gare_arrivee_detail?.code || voyage.gare_arrivee}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Train className="h-4 w-4 text-gray-400" />
                        <span>🚗 {voyage.formation_voiture}</span>
                        <span>🚃 {voyage.formation_wagon}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(voyage.statut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {voyage.statut === 'actif' && (
                          <>
                            <button
                              onClick={() => setShowConfirmModal(voyage.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Effectuer
                            </button>
                            <button
                              onClick={() => handleEdit(voyage)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                            >
                              <Edit className="h-3 w-3" />
                              Modifier
                            </button>
                          </>
                        )}
                        {voyage.statut === 'termine' && (
                          <span className="text-gray-400 text-xs">Terminé</span>
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmer l'effectuation</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir marquer ce voyage comme terminé ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => handleTerminer(showConfirmModal)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
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