/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-unused-vars */
 
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Ticket, 
  Package, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  Train,
  MapPin,
  Loader2,
  ArrowLeftRight
} from 'lucide-react';
import { saveQuotaTickets, saveQuotaBagages } from '../actions';

interface Gare {
  num: number;
  code: string;
  gare: string;
  commune_tutelle: string;
}

interface QuotaTicket {
  gare_num: number;
  quota_2131: number;
  quota_2132: number;
}

interface QuotaBagage {
  commune_tutelle: string;
  quota_tonnes_2131: number;
  quota_tonnes_2132: number;
}

type TabType = 'tickets' | 'bagages';

export default function QuotasPage() {
  const router = useRouter();

  const [gares, setGares] = useState<Gare[]>([]);
  const [communes, setCommunes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [sensTab, setSensTab] = useState<'2131' | '2132'>('2131');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // États pour les quotas globaux
  const [quotaTickets, setQuotaTickets] = useState<QuotaTicket[]>([]);
  const [quotaBagages, setQuotaBagages] = useState<QuotaBagage[]>([]);

  // Total des quotas
  const [totalTickets2131, setTotalTickets2131] = useState(0);
  const [totalTickets2132, setTotalTickets2132] = useState(0);
  const [totalBagages2131, setTotalBagages2131] = useState(0);
  const [totalBagages2132, setTotalBagages2132] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Récupérer les gares
      const { data: garesData } = await supabase
        .from('gare')
        .select('*')
        .order('num');
      setGares(garesData || []);

      // Récupérer les communes uniques
      const communesUniques = [...new Set(garesData?.map(g => g.commune_tutelle) || [])];
      setCommunes(communesUniques);

      // ✅ Récupérer les quotas tickets GLOBAUX
      const { data: ticketsData } = await supabase
        .from('quota_tickets')
        .select('*')
        .order('gare_num');

      if (ticketsData && ticketsData.length > 0) {
        setQuotaTickets(ticketsData.map(t => ({ 
          gare_num: t.gare_num, 
          quota_2131: t.quota_2131 || 50,
          quota_2132: t.quota_2132 || 50
        })));
      } else {
        // Initialiser avec 50 pour toutes les gares
        const initialTickets = garesData?.map(g => ({ 
          gare_num: g.num, 
          quota_2131: 50,
          quota_2132: 50
        })) || [];
        setQuotaTickets(initialTickets);
      }

      // ✅ Récupérer les quotas bagages GLOBAUX
      const { data: bagagesData } = await supabase
        .from('quota_bagages')
        .select('*')
        .order('commune_tutelle');

      if (bagagesData && bagagesData.length > 0) {
        setQuotaBagages(bagagesData.map(b => ({ 
          commune_tutelle: b.commune_tutelle,
          quota_tonnes_2131: b.quota_tonnes_2131 || 3,
          quota_tonnes_2132: b.quota_tonnes_2132 || 3
        })));
      } else {
        // Initialiser avec 3 tonnes pour toutes les communes
        const initialBagages = communesUniques.map(c => ({ 
          commune_tutelle: c,
          quota_tonnes_2131: 3,
          quota_tonnes_2132: 3
        }));
        setQuotaBagages(initialBagages);
      }

    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des données');
    }

    setLoading(false);
  };

  // Mettre à jour les totaux
  useEffect(() => {
    const total2131 = quotaTickets.reduce((sum, q) => sum + q.quota_2131, 0);
    const total2132 = quotaTickets.reduce((sum, q) => sum + q.quota_2132, 0);
    setTotalTickets2131(total2131);
    setTotalTickets2132(total2132);
  }, [quotaTickets]);

  useEffect(() => {
    const total2131 = quotaBagages.reduce((sum, q) => sum + q.quota_tonnes_2131, 0);
    const total2132 = quotaBagages.reduce((sum, q) => sum + q.quota_tonnes_2132, 0);
    setTotalBagages2131(total2131);
    setTotalBagages2132(total2132);
  }, [quotaBagages]);

  const handleTicketChange = (gareNum: number, sens: '2131' | '2132', value: number) => {
    const newValue = Math.max(0, value);
    setQuotaTickets(prev =>
      prev.map(q =>
        q.gare_num === gareNum 
          ? { ...q, [sens === '2131' ? 'quota_2131' : 'quota_2132']: newValue } 
          : q
      )
    );
  };

  const handleBagageChange = (commune: string, sens: '2131' | '2132', value: number) => {
    const newValue = Math.max(0, value);
    setQuotaBagages(prev =>
      prev.map(q =>
        q.commune_tutelle === commune 
          ? { ...q, [sens === '2131' ? 'quota_tonnes_2131' : 'quota_tonnes_2132']: newValue } 
          : q
      )
    );
  };

  const handleSaveTickets = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await saveQuotaTickets(
      quotaTickets.map(q => ({ 
        gare_num: q.gare_num, 
        quota_2131: q.quota_2131,
        quota_2132: q.quota_2132
      }))
    );

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Quotas tickets sauvegardés avec succès !');
    }
    setSaving(false);
  };

  const handleSaveBagages = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await saveQuotaBagages(
      quotaBagages.map(q => ({ 
        commune_tutelle: q.commune_tutelle,
        quota_tonnes_2131: q.quota_tonnes_2131,
        quota_tonnes_2132: q.quota_tonnes_2132
      }))
    );

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Quotas bagages sauvegardés avec succès !');
    }
    setSaving(false);
  };

  // Calcul du total des places max (pour l'affichage)
  const [placesMax, setPlacesMax] = useState(0);
  const [poidsMax, setPoidsMax] = useState(0);

  useEffect(() => {
    const fetchMax = async () => {
      const { data } = await supabase
        .from('voyages')
        .select('places_max, poids_max')
        .eq('statut', 'actif')
        .limit(1);
      
      if (data && data.length > 0) {
        setPlacesMax(data[0].places_max);
        setPoidsMax(data[0].poids_max);
      }
    };
    fetchMax();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Chargement des données...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attribution des quotas</h1>
            <p className="text-gray-600 mt-1">
              Quotas applicables à tous les voyages actifs
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Capacité maximale (par voyage)</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <Users className="h-4 w-4" /> {placesMax} places
              </span>
              <span className="flex items-center gap-1 text-orange-600 font-medium">
                <Package className="h-4 w-4" /> {poidsMax} tonnes
              </span>
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
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Switch Tabs - Type de quota */}
      <div className="bg-white rounded-xl shadow-sm mb-4 p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
            activeTab === 'tickets'
              ? 'bg-green-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Ticket className="h-5 w-5" />
          Quota Ticket Voyageur
        </button>
        <button
          onClick={() => setActiveTab('bagages')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
            activeTab === 'bagages'
              ? 'bg-green-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Package className="h-5 w-5" />
          Quota Ticket Bagage
        </button>
      </div>

      {/* Switch Tabs - Sens */}
      <div className="bg-gray-100 rounded-xl shadow-sm mb-6 p-1 flex gap-1 max-w-md">
        <button
          onClick={() => setSensTab('2131')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
            sensTab === '2131'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Sens 2131 (Impair)
        </button>
        <button
          onClick={() => setSensTab('2132')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
            sensTab === '2132'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Sens 2132 (Pair)
        </button>
      </div>

      {/* Total indicateur - en lecture seule */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-blue-800">
            {activeTab === 'tickets' ? (
              <>
                <Users className="h-5 w-5" />
                <span>
                  Total quotas attribués : 
                  <strong className="ml-1">
                    {sensTab === '2131' ? totalTickets2131 : totalTickets2132}
                  </strong>
                  {sensTab === '2131' ? ' (2131)' : ' (2132)'}
                </span>
              </>
            ) : (
              <>
                <Package className="h-5 w-5" />
                <span>
                  Total quotas attribués : 
                  <strong className="ml-1">
                    {sensTab === '2131' ? totalBagages2131 : totalBagages2132}
                  </strong>
                  tonnes {sensTab === '2131' ? ' (2131)' : ' (2132)'}
                </span>
              </>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {activeTab === 'tickets' ? (
              <span>Répartis sur {gares.length} gares</span>
            ) : (
              <span>Répartis sur {communes.length} communes</span>
            )}
          </div>
        </div>
      </div>

      {/* Quota Tickets */}
      {activeTab === 'tickets' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-green-600" />
              Quotas par gare - Sens {sensTab}
            </h2>
            <button
              onClick={handleSaveTickets}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder
            </button>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gare</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commune</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quota {sensTab}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {gares.map((gare) => {
                  const quota = quotaTickets.find(q => q.gare_num === gare.num);
                  const currentQuota = sensTab === '2131' ? quota?.quota_2131 || 0 : quota?.quota_2132 || 0;
                  return (
                    <tr key={gare.num} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-sm text-gray-900">{gare.gare}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{gare.code}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{gare.commune_tutelle}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={currentQuota}
                          onChange={(e) => handleTicketChange(gare.num, sensTab, parseInt(e.target.value) || 0)}
                          className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right text-gray-900 font-medium"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota Bagages */}
      {activeTab === 'bagages' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Quotas par commune - Sens {sensTab}
            </h2>
            <button
              onClick={handleSaveBagages}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder
            </button>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commune tutelle</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gares associées</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quota (tonnes) {sensTab}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {communes.map((commune) => {
                  const garesAssociees = gares.filter(g => g.commune_tutelle === commune);
                  const quota = quotaBagages.find(q => q.commune_tutelle === commune);
                  const currentQuota = sensTab === '2131' 
                    ? quota?.quota_tonnes_2131 || 0 
                    : quota?.quota_tonnes_2132 || 0;
                  return (
                    <tr key={commune} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{commune}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {garesAssociees.map(g => g.code).join(', ')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={currentQuota}
                          onChange={(e) => handleBagageChange(commune, sensTab, parseFloat(e.target.value) || 0)}
                          className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right text-gray-900 font-medium"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}