/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Train, Eye, Users, Package, PlusCircle, History, Activity, BarChart3 } from 'lucide-react';
import { getVoyagesActifsWithQuotas } from './actions';
import { supabase } from '@/lib/supabaseClient';

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

export default function DCOHomePage() {
  const [voyagesActifs, setVoyagesActifs] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    actifs: 0,
  });

  // Fonction pour récupérer les données
  const fetchData = async () => {
    setLoading(true);

    try {
      // Récupérer les voyages actifs
      const result = await getVoyagesActifsWithQuotas();
      
      if (result.error) {
        console.error(result.error);
        setLoading(false);
        return;
      }

      // Mettre à jour les états
      setVoyagesActifs(result.voyages || []);
      setStats({
        actifs: result.voyages?.length || 0,
      });

    } catch (err) {
      console.error('Erreur:', err);
    }

    setLoading(false);
  };

  useEffect(() => {
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

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-700 border-t-transparent"></div>
        <p className="mt-2 text-stone-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-stone-800">Tableau de bord DCO</h1>
        <p className="text-stone-500 mt-1">Gestion des voyages et opérations</p>
      </div>

      {/* Statistique - Voyages actifs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500 font-medium">Voyages actifs</p>
              <p className="text-3xl font-bold text-amber-700">{stats.actifs}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100/50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides - 4 boutons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <a
          href="/dco/planification"
          className="group bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100/50 group-hover:bg-amber-100 transition flex items-center justify-center shrink-0">
              <PlusCircle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Planifier</p>
              <p className="text-xs text-stone-500">Nouveau voyage</p>
            </div>
          </div>
        </a>

        <a
          href="/dco/historique"
          className="group bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-stone-100/50 group-hover:bg-stone-100 transition flex items-center justify-center shrink-0">
              <History className="h-5 w-5 text-stone-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Historique</p>
              <p className="text-xs text-stone-500">Voyages effectués</p>
            </div>
          </div>
        </a>

        <a
          href="/dco/historique-recette"
          className="group bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100/50 group-hover:bg-emerald-100 transition flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Recettes</p>
              <p className="text-xs text-stone-500">Historique des ventes</p>
            </div>
          </div>
        </a>

        <a
          href="/dco/suivi-temps-reel"
          className="group bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100/50 group-hover:bg-blue-100 transition flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Suivi</p>
              <p className="text-xs text-stone-500">Temps réel</p>
            </div>
          </div>
        </a>
      </div>

      {/* Liste des voyages actifs - En colonnes */}
      {voyagesActifs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200/60">
          <Calendar className="h-16 w-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Aucun voyage actif</p>
          <p className="text-sm text-stone-400 mt-1">Les voyages planifiés apparaîtront ici</p>
          <a
            href="/dco/planification"
            className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium hover:underline"
          >
            Planifier un voyage →
          </a>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-serif font-semibold text-stone-800 flex items-center gap-2 mb-4">
            <Train className="h-5 w-5 text-amber-700" />
            Voyages actifs
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {voyagesActifs.map((voyage) => {
              return (
                <div key={voyage.id} className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden hover:shadow-md transition-shadow group">
                  {/* En-tête compact */}
                  <div className="px-4 py-3 bg-stone-50/80 border-b border-stone-200/60 flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-500">
                      {formatShortDate(voyage.date_voyage)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                      <Clock className="h-3 w-3" />
                      Actif
                    </span>
                  </div>

                  {/* Corps compact */}
                  <div className="p-4 space-y-3">
                    {/* Parcours */}
                    <div>
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Parcours</p>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                        <span>{voyage.gare_depart_detail?.code || voyage.gare_depart}</span>
                        <span className="text-stone-300">→</span>
                        <span>{voyage.gare_arrivee_detail?.code || voyage.gare_arrivee}</span>
                      </div>
                      <span className="text-xs text-stone-400">Sens {voyage.sens}</span>
                    </div>

                    {/* Formation */}
                    <div>
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Formation</p>
                      <div className="flex items-center gap-1.5 text-sm text-stone-700">
                        <Train className="h-3.5 w-3.5 text-stone-400" />
                        <span>{getFormationText(voyage)}</span>
                      </div>
                    </div>

                    {/* Capacité */}
                    <div>
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Capacité</p>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-stone-700">{voyage.places_max} pl.</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-stone-700">{voyage.poids_max} t</span>
                        </div>
                      </div>
                    </div>

                    {/* Bouton Suivi */}
                    <div className="pt-2 border-t border-stone-200/60">
                      <a
                        href={`/dco/suivi-temps-reel?voyage=${voyage.id}`}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium transition shadow-sm shadow-amber-700/20"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Suivi
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}