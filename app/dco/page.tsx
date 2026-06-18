/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Train, Users, Package, Ticket, Eye } from 'lucide-react';
import { getVoyagesActifsWithQuotas } from './actions';

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

export default function DCOHomePage() {
  const [voyagesActifs, setVoyagesActifs] = useState<VoyageWithQuotas[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    actifs: 0,
    termines: 0,
    placesAttribuees: 0,
    tonnesAttribuees: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer les voyages avec quotas via Server Action
      const result = await getVoyagesActifsWithQuotas();
      
      if (result.error) {
        console.error(result.error);
        setLoading(false);
        return;
      }

      if (result.voyages) {
        setVoyagesActifs(result.voyages);

        // Calculer les statistiques
        let placesAttribuees = 0;
        let tonnesAttribuees = 0;
        result.voyages.forEach(v => {
          placesAttribuees += v.total_places_attribuees;
          tonnesAttribuees += v.total_tonnes_attribuees;
        });

        setStats(prev => ({
          ...prev,
          placesAttribuees,
          tonnesAttribuees,
          actifs: result.voyages.length,
        }));
      }

      setLoading(false);
    };

    fetchData();
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
    if (ratio >= 70) return { color: 'text-orange-600', bg: 'bg-orange-100' };
    return { color: 'text-green-600', bg: 'bg-green-100' };
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord DCO</h1>
      <p className="text-gray-600 mb-8">Gestion des voyages et opérations</p>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Voyages actifs</p>
              <p className="text-2xl font-bold text-green-600">{stats.actifs}</p>
            </div>
            <Clock className="h-8 w-8 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Voyages terminés</p>
              <p className="text-2xl font-bold text-gray-600">{stats.termines}</p>
            </div>
            <Calendar className="h-8 w-8 text-gray-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Places attribuées</p>
              <p className="text-2xl font-bold text-blue-600">{stats.placesAttribuees}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Fret attribué</p>
              <p className="text-2xl font-bold text-orange-600">{stats.tonnesAttribuees}T</p>
            </div>
            <Package className="h-8 w-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="space-y-3">
            <a
              href="/dco/planification"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition"
            >
              Planifier un nouveau voyage
            </a>
            <a
              href="/dco/historique"
              className="block w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg transition"
            >
              Voir l'historique
            </a>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
          <p className="text-gray-600 text-sm">
            Planifiez les voyages, gérez les formations et suivez l'historique des opérations.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Ticket className="h-4 w-4" />
            <span>Total places attribuées: {stats.placesAttribuees}</span>
          </div>
        </div>
      </div>

      {/* Liste des voyages actifs avec leurs quotas */}
      {voyagesActifs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun voyage actif</p>
          <a
            href="/dco/planification"
            className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Planifier un voyage
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Voyages actifs avec quotas</h2>
          {voyagesActifs.map((voyage) => {
            const placesStatus = getQuotaStatus(voyage.total_places_attribuees, voyage.places_max);
            const tonnesStatus = getQuotaStatus(voyage.total_tonnes_attribuees, voyage.poids_max);
            
            return (
              <div key={voyage.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                {/* En-tête du voyage */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-500">
                      {formatDate(voyage.date_voyage)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      <Clock className="h-3 w-3" />
                      Actif
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      Sens {voyage.sens}
                    </span>
                  </div>
                  <a
                    href={`/dco/historique`}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    <Eye className="h-3 w-3" />
                    Voir détails
                  </a>
                </div>

                {/* Détails du voyage avec quotas */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Parcours */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Parcours</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {voyage.gare_depart_detail?.code || voyage.gare_depart}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-gray-900">
                          {voyage.gare_arrivee_detail?.code || voyage.gare_arrivee}
                        </span>
                      </div>
                    </div>

                    {/* Formation */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Formation</p>
                      <div className="flex items-center gap-2">
                        <Train className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{getFormationText(voyage)}</span>
                      </div>
                    </div>

                    {/* Quota Places */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Quota Places</p>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {voyage.total_places_attribuees} / {voyage.places_max}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${placesStatus.bg} ${placesStatus.color}`}>
                          {voyage.places_max > 0 
                            ? Math.round((voyage.total_places_attribuees / voyage.places_max) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>

                    {/* Quota Bagages */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Quota Bagages</p>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {voyage.total_tonnes_attribuees}T / {voyage.poids_max}T
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tonnesStatus.bg} ${tonnesStatus.color}`}>
                          {voyage.poids_max > 0 
                            ? Math.round((voyage.total_tonnes_attribuees / voyage.poids_max) * 100)
                            : 0}%
                        </span>
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