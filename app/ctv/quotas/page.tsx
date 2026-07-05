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
  ArrowLeftRight,
  RefreshCw
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
      // Récupérer les gares triées par num (ordre croissant = MGA → MNG)
      const { data: garesData } = await supabase
        .from('gare')
        .select('*')
        .order('num', { ascending: true });
      setGares(garesData || []);

      // Récupérer les communes uniques dans l'ordre des gares
      const communesUniques: string[] = [];
      const communesSet = new Set<string>();
      garesData?.forEach(g => {
        if (!communesSet.has(g.commune_tutelle)) {
          communesSet.add(g.commune_tutelle);
          communesUniques.push(g.commune_tutelle);
        }
      });
      setCommunes(communesUniques);

      // Récupérer les quotas tickets GLOBAUX
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
        const initialTickets = garesData?.map(g => ({ 
          gare_num: g.num, 
          quota_2131: 50,
          quota_2132: 50
        })) || [];
        setQuotaTickets(initialTickets);
      }

      // Récupérer les quotas bagages GLOBAUX
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
      setTimeout(() => setSuccess(null), 3000);
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
      setTimeout(() => setSuccess(null), 3000);
    }
    setSaving(false);
  };

  // Obtenir les gares triées selon le sens
  const getSortedGares = () => {
    if (sensTab === '2131') {
      // Sens impair (MGA → MNG) : ordre croissant (1 → 25)
      return [...gares].sort((a, b) => a.num - b.num);
    } else {
      // Sens pair (MNG → MGA) : ordre décroissant (25 → 1)
      return [...gares].sort((a, b) => b.num - a.num);
    }
  };

  // Obtenir les communes triées selon le sens
  const getSortedCommunes = () => {
    if (sensTab === '2131') {
      return [...communes];
    } else {
      return [...communes].reverse();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-700 border-t-transparent"></div>
        <p className="ml-3 text-stone-500">Chargement des données...</p>
      </div>
    );
  }

  const currentTotal = activeTab === 'tickets' 
    ? (sensTab === '2131' ? totalTickets2131 : totalTickets2132)
    : (sensTab === '2131' ? totalBagages2131 : totalBagages2132);

  const sortedGares = getSortedGares();
  const sortedCommunes = getSortedCommunes();

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-2">
              <Ticket className="h-6 w-6 text-emerald-700" />
              Attribution des quotas
            </h1>
            <p className="text-stone-500 text-sm">
              Quotas applicables à tous les voyages actifs
            </p>
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
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Switch Tabs - Type de quota */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-1 flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition ${
            activeTab === 'tickets'
              ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Ticket className="h-5 w-5" />
          Quota Ticket Voyageur
        </button>
        <button
          onClick={() => setActiveTab('bagages')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition ${
            activeTab === 'bagages'
              ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Package className="h-5 w-5" />
          Quota Ticket Bagage
        </button>
      </div>

      {/* Switch Tabs - Sens */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-1 flex gap-1 max-w-md mb-6">
        <button
          onClick={() => setSensTab('2131')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
            sensTab === '2131'
              ? 'bg-amber-700 text-white shadow-lg shadow-amber-700/20'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Sens 2131 (Impair)
          <span className="text-xs opacity-70">MGA → MNG</span>
        </button>
        <button
          onClick={() => setSensTab('2132')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
            sensTab === '2132'
              ? 'bg-amber-700 text-white shadow-lg shadow-amber-700/20'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Sens 2132 (Pair)
          <span className="text-xs opacity-70">MNG → MGA</span>
        </button>
      </div>

      {/* Indicateur de total simplifié */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${activeTab === 'tickets' ? 'bg-blue-100' : 'bg-amber-100'}`}>
            {activeTab === 'tickets' ? (
              <Users className="h-5 w-5 text-blue-600" />
            ) : (
              <Package className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div>
            <p className="text-sm text-stone-600">
              Total quotas attribués <span className="font-semibold text-stone-800">{currentTotal}</span>
              {activeTab === 'tickets' ? ' places' : ' tonnes'}
            </p>
            <p className="text-xs text-stone-400">
              Répartis sur {activeTab === 'tickets' ? gares.length : communes.length} {activeTab === 'tickets' ? 'gares' : 'communes'}
            </p>
          </div>
        </div>
      </div>

      {/* Quota Tickets */}
      {activeTab === 'tickets' && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-200/60 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <Ticket className="h-4 w-4 text-emerald-600" />
                Quotas par gare - Sens {sensTab}
              </h2>
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <ArrowLeftRight className="h-3 w-3" />
                {sensTab === '2131' ? 'MGA → MNG' : 'MNG → MGA'}
              </span>
            </div>
            <button
              onClick={handleSaveTickets}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 shadow-sm shadow-emerald-700/20"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder
            </button>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">
                    {sensTab === '2131' ? 'N°' : 'N° ↓'}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Gare</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Code</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Commune</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">Quota {sensTab}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {sortedGares.map((gare) => {
                  const quota = quotaTickets.find(q => q.gare_num === gare.num);
                  const currentQuota = sensTab === '2131' ? quota?.quota_2131 || 0 : quota?.quota_2132 || 0;
                  return (
                    <tr key={gare.num} className="hover:bg-stone-50 transition">
                      <td className="px-3 py-2.5 text-sm text-stone-400 font-mono">{gare.num}</td>
                      <td className="px-3 py-2.5 text-sm text-stone-800">{gare.gare}</td>
                      <td className="px-3 py-2.5 text-sm text-stone-600">{gare.code}</td>
                      <td className="px-3 py-2.5 text-sm text-stone-600">{gare.commune_tutelle}</td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          value={currentQuota}
                          onChange={(e) => handleTicketChange(gare.num, sensTab, parseInt(e.target.value) || 0)}
                          className="w-24 px-3 py-1.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right text-stone-800 font-medium text-sm bg-white transition"
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
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-200/60 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                Quotas par commune - Sens {sensTab}
              </h2>
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <ArrowLeftRight className="h-3 w-3" />
                {sensTab === '2131' ? 'MGA → MNG' : 'MNG → MGA'}
              </span>
            </div>
            <button
              onClick={handleSaveBagages}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 shadow-sm shadow-emerald-700/20"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder
            </button>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">
                    {sensTab === '2131' ? 'Ordre' : 'Ordre ↓'}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Commune tutelle</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Gares associées</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">Quota (tonnes) {sensTab}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {sortedCommunes.map((commune, index) => {
                  const garesAssociees = gares.filter(g => g.commune_tutelle === commune);
                  const quota = quotaBagages.find(q => q.commune_tutelle === commune);
                  const currentQuota = sensTab === '2131' 
                    ? quota?.quota_tonnes_2131 || 0 
                    : quota?.quota_tonnes_2132 || 0;
                  return (
                    <tr key={commune} className="hover:bg-stone-50 transition">
                      <td className="px-3 py-2.5 text-sm text-stone-400 font-mono">
                        {sensTab === '2131' ? index + 1 : sortedCommunes.length - index}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-stone-800 font-medium">{commune}</td>
                      <td className="px-3 py-2.5 text-sm text-stone-600">
                        {garesAssociees.map(g => g.code).join(', ')}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={currentQuota}
                          onChange={(e) => handleBagageChange(commune, sensTab, parseFloat(e.target.value) || 0)}
                          className="w-24 px-3 py-1.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right text-stone-800 font-medium text-sm bg-white transition"
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