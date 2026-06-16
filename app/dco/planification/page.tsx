/* eslint-disable @typescript-eslint/no-unused-vars */
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Planifier un voyage</h1>
        <p className="text-gray-600 mt-1">Créez un nouveau voyage en remplissant le formulaire ci-dessous</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-3xl">
        <form action={formAction} className="space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date du voyage
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                name="date_voyage"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Sens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sens du train
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition has-checked:border-blue-500 has-checked:bg-blue-50">
                <input
                  type="radio"
                  name="sens"
                  value="2131"
                  className="h-4 w-4 text-blue-600"
                  required
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">2131 (Impair)</p>
                </div>
              </label>
              <label className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition has-checked:border-blue-500 has-checked:bg-blue-50">
                <input
                  type="radio"
                  name="sens"
                  value="2132"
                  className="h-4 w-4 text-blue-600"
                  required
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">2132 (Pair)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Gares */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gare de départ
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  name="gare_depart"
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gare d'arrivée
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  name="gare_arrivee"
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
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
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Train className="h-4 w-4" />
              Formation du train
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Voitures 1ère classe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voitures 1ère classe (0-2)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="formation_voiture"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    min="0"
                    max="2"
                    value={voiture1}
                    onChange={handleVoiture1Change}
                    required
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">× 60 places</span>
                </div>
              </div>

              {/* Voitures 2ème classe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voitures 2ème classe (0-4)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="formation_voiture2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    min="0"
                    max="4"
                    value={voiture2}
                    onChange={handleVoiture2Change}
                    required
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">× 72 places</span>
                </div>
              </div>

              {/* Wagons marchandises */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wagons marchandises (2-6)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="formation_wagon"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    min="2"
                    max="6"
                    value={wagon}
                    onChange={handleWagonChange}
                    required
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">× 20 tonnes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Résumé des calculs */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Récapitulatif de la formation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Places maximales</p>
                  <p className="text-xl font-bold text-blue-700">{calculs.placesMax}</p>
                  <p className="text-xs text-gray-400">
                    ({voiture1} × 60) + ({voiture2} × 72)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
                <Package className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-xs text-gray-500">Capacité maximale</p>
                  <p className="text-xl font-bold text-orange-700">{calculs.poidsMax} tonnes</p>
                  <p className="text-xs text-gray-400">{wagon} × 20 tonnes</p>
                </div>
              </div>
            </div>
            {/* Champs cachés pour les calculs */}
            <input type="hidden" name="places_max" value={calculs.placesMax} />
            <input type="hidden" name="poids_max" value={calculs.poidsMax} />
          </div>

          {state?.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
          >
            {isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Planification en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>PLANIFIER</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}