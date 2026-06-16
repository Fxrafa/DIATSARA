/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { createVoyage } from '../actions';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, MapPin, Train, AlertCircle, CheckCircle } from 'lucide-react';

interface Gare {
  num: number;
  code: string;
  gare: string;
  pk: number;
  commune_tutelle: string;
}

export default function PlanificationPage() {
  const [gares, setGares] = useState<Gare[]>([]);
  const [, setLoading] = useState(true);
  const [state, formAction, isPending] = useActionState(createVoyage, undefined);

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
                  <p className="text-xs text-gray-500">Direction Sud</p>
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
                  <p className="text-xs text-gray-500">Direction Nord</p>
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

          {/* Formation */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Train className="h-4 w-4" />
              Formation du train
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de voitures (0-6)
                </label>
                <input
                  type="number"
                  name="formation_voiture"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  min="0"
                  max="6"
                  defaultValue="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de wagons (0-6)
                </label>
                <input
                  type="number"
                  name="formation_wagon"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  min="0"
                  max="6"
                  defaultValue="0"
                  required
                />
              </div>
            </div>
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