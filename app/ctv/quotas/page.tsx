/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Loader2
} from 'lucide-react';
import { saveQuotaTickets, saveQuotaBagages } from '../actions';

interface Gare {
  num: number;
  code: string;
  gare: string;
  commune_tutelle: string;
}

interface Voyage {
  id: string;
  date_voyage: string;
  sens: string;
  gare_depart: number;
  gare_arrivee: number;
  places_max: number;
  poids_max: number;
  gare_depart_detail?: { code: string; gare: string };
  gare_arrivee_detail?: { code: string; gare: string };
}

interface QuotaTicket {
  gare_num: number;
  quota: number;
}

interface QuotaBagage {
  commune_tutelle: string;
  quota_tonnes: number;
}

type TabType = 'tickets' | 'bagages';

export default function QuotasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const voyageId = searchParams.get('voyage');

  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [gares, setGares] = useState<Gare[]>([]);
  const [communes, setCommunes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // États pour les quotas
  const [quotaTickets, setQuotaTickets] = useState<QuotaTicket[]>([]);
  const [quotaBagages, setQuotaBagages] = useState<QuotaBagage[]>([]);

  // Total des quotas
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalBagages, setTotalBagages] = useState(0);

  useEffect(() => {
    if (!voyageId) {
      router.push('/ctv');
      return;
    }
    fetchData();
  }, [voyageId]);

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

      // Récupérer le voyage
      const { data: voyageData } = await supabase
        .from('voyages')
        .select(`
          *,
          gare_depart_detail:gare_depart(code, gare),
          gare_arrivee_detail:gare_arrivee(code, gare)
        `)
        .eq('id', voyageId)
        .single();

      if (!voyageData) {
        setError('Voyage non trouvé');
        setLoading(false);
        return;
      }

      if (voyageData.statut === 'termine') {
        setError('Ce voyage est déjà terminé');
        setLoading(false);
        return;
      }

      setVoyage(voyageData);

      // Récupérer les quotas existants pour les tickets
      const { data: ticketsData } = await supabase
        .from('quota_tickets')
        .select('*')
        .eq('voyage_id', voyageId);

      if (ticketsData && ticketsData.length > 0) {
        setQuotaTickets(ticketsData.map(t => ({ gare_num: t.gare_num, quota: t.quota })));
      } else {
        // Initialiser avec 0 pour toutes les gares
        const initialTickets = garesData?.map(g => ({ gare_num: g.num, quota: 0 })) || [];
        setQuotaTickets(initialTickets);
      }

      // Récupérer les quotas existants pour les bagages
      const { data: bagagesData } = await supabase
        .from('quota_bagages')
        .select('*')
        .eq('voyage_id', voyageId);

      if (bagagesData && bagagesData.length > 0) {
        setQuotaBagages(bagagesData.map(b => ({ commune_tutelle: b.commune_tutelle, quota_tonnes: b.quota_tonnes })));
      } else {
        // Initialiser avec 0 pour toutes les communes
        const initialBagages = communesUniques.map(c => ({ commune_tutelle: c, quota_tonnes: 0 }));
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
    const total = quotaTickets.reduce((sum, q) => sum + q.quota, 0);
    setTotalTickets(total);
  }, [quotaTickets]);

  useEffect(() => {
    const total = quotaBagages.reduce((sum, q) => sum + q.quota_tonnes, 0);
    setTotalBagages(total);
  }, [quotaBagages]);

  const handleTicketChange = (gareNum: number, value: number) => {
    const newValue = Math.max(0, value);
    const maxPlaces = voyage?.places_max || 0;
    const currentOther = quotaTickets
      .filter(q => q.gare_num !== gareNum)
      .reduce((sum, q) => sum + q.quota, 0);
    
    // Ne pas dépasser les places max
    const maxAllowed = maxPlaces - currentOther;
    const finalValue = Math.min(newValue, maxAllowed);

    setQuotaTickets(prev =>
      prev.map(q =>
        q.gare_num === gareNum ? { ...q, quota: finalValue } : q
      )
    );
  };

  const handleBagageChange = (commune: string, value: number) => {
    const newValue = Math.max(0, value);
    const maxPoids = voyage?.poids_max || 0;
    const currentOther = quotaBagages
      .filter(q => q.commune_tutelle !== commune)
      .reduce((sum, q) => sum + q.quota_tonnes, 0);
    
    const maxAllowed = maxPoids - currentOther;
    const finalValue = Math.min(newValue, maxAllowed);

    setQuotaBagages(prev =>
      prev.map(q =>
        q.commune_tutelle === commune ? { ...q, quota_tonnes: finalValue } : q
      )
    );
  };

  const handleSaveTickets = async () => {
    if (!voyageId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await saveQuotaTickets(
      voyageId,
      quotaTickets.map(q => ({ gare_num: q.gare_num, quota: q.quota }))
    );

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Quotas tickets sauvegardés avec succès !');
    }
    setSaving(false);
  };

  const handleSaveBagages = async () => {
    if (!voyageId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await saveQuotaBagages(
      voyageId,
      quotaBagages.map(q => ({ commune_tutelle: q.commune_tutelle, quota_tonnes: q.quota_tonnes }))
    );

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Quotas bagages sauvegardés avec succès !');
    }
    setSaving(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Chargement des données...</p>
      </div>
    );
  }

  if (!voyage) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error || 'Voyage non trouvé'}</p>
        <a href="/ctv" className="inline-block mt-4 text-green-600 hover:underline">
          Retour au tableau de bord
        </a>
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
              Voyage du {formatDate(voyage.date_voyage)} - Sens {voyage.sens}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Capacité maximale</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <Users className="h-4 w-4" /> {voyage.places_max} places
              </span>
              <span className="flex items-center gap-1 text-orange-600 font-medium">
                <Package className="h-4 w-4" /> {voyage.poids_max} tonnes
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

      {/* Switch Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6 p-1 flex gap-1">
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

      {/* Total indicateur */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-800">
            {activeTab === 'tickets' ? (
              <>
                <Users className="h-5 w-5" />
                <span>Total quotas attribués : <strong>{totalTickets}</strong> / {voyage.places_max} places</span>
              </>
            ) : (
              <>
                <Package className="h-5 w-5" />
                <span>Total quotas attribués : <strong>{totalBagages}</strong> / {voyage.poids_max} tonnes</span>
              </>
            )}
          </div>
          <div className="text-sm text-gray-900 font-semibold">
            {activeTab === 'tickets' ? (
              <span>Restant : <span className="text-blue-600">{voyage.places_max - totalTickets}</span></span>
            ) : (
              <span>Restant : <span className="text-orange-600">{voyage.poids_max - totalBagages} tonnes</span></span>
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
              Quotas par gare
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {gares.map((gare) => {
                  const quota = quotaTickets.find(q => q.gare_num === gare.num);
                  return (
                    <tr key={gare.num} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-sm text-gray-900">{gare.gare}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{gare.code}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{gare.commune_tutelle}</td>
                      <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={quota?.quota || 0}
                        onChange={(e) => handleTicketChange(gare.num, parseInt(e.target.value) || 0)}
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
              Quotas par commune
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quota (tonnes)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {communes.map((commune) => {
                  const garesAssociees = gares.filter(g => g.commune_tutelle === commune);
                  const quota = quotaBagages.find(q => q.commune_tutelle === commune);
                  return (
                    <tr key={commune} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{commune}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {garesAssociees.map(g => g.code).join(', ')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={quota?.quota_tonnes || 0}
                          onChange={(e) => handleBagageChange(commune, parseInt(e.target.value) || 0)}
                          className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right text-gray-900 font-medium"                        />
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