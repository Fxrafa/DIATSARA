/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { createVoyage } from '../actions';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, MapPin, Train, AlertCircle, CheckCircle, Users, Package } from 'lucide-react';

interface Gare {
  num: number;
  code: string;
  gare: string;
  pk: number;
  commune_tutelle: string;
}

interface Calculs {
  placesMax: number;
  poidsMax: number;
}

export default function PlanificationPage() {
  const [gares, setGares] = useState<Gare[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, formAction, isPending] = useActionState(createVoyage, undefined);

  // États pour les calculs
  const [voiture1, setVoiture1] = useState(0);
  const [voiture2, setVoiture2] = useState(0);
  const [wagon, setWagon] = useState(2);
  const [calculs, setCalculs] = useState<Calculs>({ placesMax: 0, poidsMax: 0 });

  useEffect(() => {
    const fetchGares = async () => {
      const { data } = await supabase
        .from('gare')
        .select('*')
        .order('num');
      setGares(data || []);
      setLoading(false);
    };
    fetchGares();
  }, []);

  // Calcul automatique des places et du poids
  useEffect(() => {
    const placesMax = (voiture1 * 60) + (voiture2 * 72);
    const poidsMax = wagon * 20;
    setCalculs({ placesMax, poidsMax });
  }, [voiture1, voiture2, wagon]);

  const handleVoiture1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setVoiture1(Math.min(2, Math.max(0, val)));
  };

  const handleVoiture2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setVoiture2(Math.min(4, Math.max(0, val)));
  };

  const handleWagonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 2;
    setWagon(Math.min(6, Math.max(2, val)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-700 border-t-transparent"></div>
        <p className="ml-3 text-stone-500">Chargement des gares...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-stone-800">Planifier un voyage</h1>
        <p className="text-stone-500 text-sm">Créez un nouveau voyage en remplissant le formulaire</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-5">
        <form action={formAction} className="space-y-4">
          {/* Date + Sens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Date du voyage
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-stone-400" />
                </div>
                <input
                  type="date"
                  name="date_voyage"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Sens */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Sens du train
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center p-2.5 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer transition has-checked:border-amber-700 has-checked:bg-amber-50/50">
                  <input
                    type="radio"
                    name="sens"
                    value="2131"
                    className="h-3.5 w-3.5 text-amber-700 focus:ring-amber-700"
                    required
                  />
                  <span className="ml-2 text-sm font-medium text-stone-700">2131 (Impair)</span>
                </label>
                <label className="flex items-center p-2.5 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer transition has-checked:border-amber-700 has-checked:bg-amber-50/50">
                  <input
                    type="radio"
                    name="sens"
                    value="2132"
                    className="h-3.5 w-3.5 text-amber-700 focus:ring-amber-700"
                    required
                  />
                  <span className="ml-2 text-sm font-medium text-stone-700">2132 (Pair)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Gares */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Gare de départ
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-stone-400" />
                </div>
                <select
                  name="gare_depart"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all appearance-none"
                  required
                >
                  <option value="">Sélectionner une gare</option>
                  {gares.map((gare) => (
                    <option key={gare.num} value={gare.num}>
                      {gare.code} - {gare.gare}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Gare d'arrivée
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-stone-400" />
                </div>
                <select
                  name="gare_arrivee"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all appearance-none"
                  required
                >
                  <option value="">Sélectionner une gare</option>
                  {gares.map((gare) => (
                    <option key={gare.num} value={gare.num}>
                      {gare.code} - {gare.gare}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Formation du train */}
          <div className="bg-stone-50/80 rounded-lg p-4 border border-stone-200/60">
            <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Train className="h-4 w-4 text-amber-700" />
              Formation du train
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  1ère classe <span className="text-stone-400">(0-2)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="formation_voiture"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all"
                    min="0"
                    max="2"
                    value={voiture1}
                    onChange={handleVoiture1Change}
                    required
                  />
                  <span className="text-xs text-stone-400 whitespace-nowrap">× 60 pl.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  2ème classe <span className="text-stone-400">(0-4)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="formation_voiture2"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all"
                    min="0"
                    max="4"
                    value={voiture2}
                    onChange={handleVoiture2Change}
                    required
                  />
                  <span className="text-xs text-stone-400 whitespace-nowrap">× 72 pl.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Wagons <span className="text-stone-400">(2-6)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="formation_wagon"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all"
                    min="2"
                    max="6"
                    value={wagon}
                    onChange={handleWagonChange}
                    required
                  />
                  <span className="text-xs text-stone-400 whitespace-nowrap">× 20 t</span>
                </div>
              </div>
            </div>
          </div>

          {/* Résumé des calculs */}
          <div className="bg-amber-50/80 rounded-lg p-4 border border-amber-200/60">
            <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Récapitulatif
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm border border-stone-200/60">
                <Users className="h-4 w-4 text-amber-700" />
                <div>
                  <p className="text-xs text-stone-500">Places maximales</p>
                  <p className="text-lg font-bold text-amber-800">{calculs.placesMax}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm border border-stone-200/60">
                <Package className="h-4 w-4 text-emerald-700" />
                <div>
                  <p className="text-xs text-stone-500">Capacité maximale</p>
                  <p className="text-lg font-bold text-emerald-800">{calculs.poidsMax} t</p>
                </div>
              </div>
            </div>
            <input type="hidden" name="places_max" value={calculs.placesMax} />
            <input type="hidden" name="poids_max" value={calculs.poidsMax} />
          </div>

          {/* Erreur */}
          {state?.error && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Bouton */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-linear-to-r from-amber-800 to-stone-800 hover:from-amber-700 hover:to-stone-700 text-white py-2.5 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-amber-900/20 hover:shadow-amber-900/30"
          >
            {isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Planification en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>PLANIFIER</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}