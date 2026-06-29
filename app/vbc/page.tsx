/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Users, Package, Ticket, MapPin, Train, Calendar, 
  CheckCircle, Clock, AlertCircle, Loader2, History,
  Lock
} from 'lucide-react';
import { getVBCData } from './actions';
import { supabase } from '@/lib/supabaseClient';

interface Gare {
  num: number;
  code: string;
  gare: string;
  pk: number;
  commune_tutelle: string;
}

interface QuotaTicket {
  id: string;
  gare_num: number;
  quota: number;
  created_at: string;
  updated_at: string;
}

interface QuotaBagage {
  id: string;
  commune_tutelle: string;
  quota_tonnes: number;
  created_at: string;
  updated_at: string;
}

interface Voyage {
  id: string;
  date_voyage: string;
  sens: string;
  gare_depart: number;
  gare_arrivee: number;
  places_max: number;
  poids_max: number;
  statut: string;
  formation_voiture: number;
  formation_voiture2: number;
  gare_depart_detail?: { code: string; gare: string };
  gare_arrivee_detail?: { code: string; gare: string };
}

interface VoyageWithQuotasBase {
  voyage: Voyage;
  quota_tickets: QuotaTicket[];
  quota_bagages: QuotaBagage[];
  total_tickets: number;
  total_bagages: number;
  tickets_vendus: number;
  bagages_vendus: number;
  places_1ere: number;
  places_2eme: number;
}

interface VoyageWithQuotas extends VoyageWithQuotasBase {
  vente_desactivee: boolean;
}

export default function VBCPage() {
  const [profile, setProfile] = useState<any>(null);
  const [gare, setGare] = useState<Gare | null>(null);
  const [voyages, setVoyages] = useState<VoyageWithQuotas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getVBCData();
        
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        setProfile(result.profile);
        setGare(result.gare || null);

        const voyagesWithStatus: VoyageWithQuotas[] = await Promise.all(
          (result.voyages || []).map(async (voyageData: VoyageWithQuotasBase) => {
            let venteDesactivee = false;
            
            if (result.profile?.gare_ref) {
              const { data: desactivee } = await supabase
                .from('vente_desactivee')
                .select('id')
                .eq('voyage_id', voyageData.voyage.id)
                .eq('gare_num', result.profile.gare_ref)
                .maybeSingle();
              
              if (desactivee) {
                venteDesactivee = true;
              }
            }
            
            return {
              ...voyageData,
              vente_desactivee: venteDesactivee,
            };
          })
        );

        setVoyages(voyagesWithStatus);

      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors du chargement des données');
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

  const getStatusBadge = (statut: string) => {
    if (statut === 'actif') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          <Clock className="h-3 w-3" />
          Actif
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
        <CheckCircle className="h-3 w-3" />
        Terminé
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-orange-600 animate-spin mx-auto" />
            <p className="mt-4 text-gray-500">Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Espace Vendeur</h1>
          <p className="text-gray-600 mt-1">
            {profile?.nom} • {profile?.matricule}
          </p>
        </div>

        {/* Informations de la gare */}
        {gare && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border-l-4 border-orange-500">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <MapPin className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ma gare</h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-500">Gare</p>
                    <p className="font-medium text-gray-900">{gare.gare}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Code</p>
                    <p className="font-medium text-gray-900">{gare.code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">PK</p>
                    <p className="font-medium text-gray-900">{gare.pk}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Commune tutelle</p>
                    <p className="font-medium text-gray-900">{gare.commune_tutelle}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quotas par voyage */}
        {voyages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun voyage actif avec des quotas attribués</p>
            <p className="text-sm text-gray-400 mt-1">Les voyages planifiés apparaîtront ici</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-orange-600" />
              Mes quotas par voyage
            </h2>

            <div className="space-y-4">
              {voyages.map(({ voyage, quota_tickets, quota_bagages, total_tickets, total_bagages, tickets_vendus, bagages_vendus, places_1ere, places_2eme, vente_desactivee }) => (
                <div key={voyage.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-500">
                        {formatDate(voyage.date_voyage)}
                      </span>
                      {getStatusBadge(voyage.statut)}
                      <span className="text-sm font-medium text-gray-700">
                        Sens {voyage.sens}
                      </span>
                      {vente_desactivee && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <Lock className="h-3 w-3" />
                          Vente désactivée
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-blue-600">
                        <Train className="h-4 w-4" />
                        {voyage.gare_depart_detail?.code} → {voyage.gare_arrivee_detail?.code}
                      </span>
                      {vente_desactivee ? (
                        <button
                          disabled
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-300 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed"
                        >
                          <Lock className="h-3 w-3" />
                          Vente désactivée
                        </button>
                      ) : (
                        <a
                          href={`/vbc/vente/${voyage.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition"
                        >
                          <Ticket className="h-3 w-3" />
                          Vendre
                        </a>
                      )}
                      <a
                        href={`/vbc/historique/${voyage.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                      >
                        <History className="h-3 w-3" />
                        Historique
                      </a>
                    </div>
                  </div>

                  {/* Détails des quotas */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quota Tickets*/}
                  <div className="space-y-1">
                    {quota_tickets.map((q, index) => (
                      <div key={q.id || `ticket-${index}`} className="flex justify-between text-sm">
                        <span className="text-gray-600">Places attribuées</span>
                        <span className="font-medium text-blue-700">{q.quota}</span>
                      </div>
                    ))}
                    <div className="border-t border-blue-200 pt-1 mt-1 flex justify-between text-sm  text-gray-500">
                      <span>Total</span>
                      <span className="text-blue-700">{total_tickets}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Vendus</span>
                      <span className="font-medium">{tickets_vendus}</span>
                    </div>
                    <div className="flex justify-between text-sm  text-gray-500">
                      <span>Restants</span>
                      <span className={`${total_tickets - tickets_vendus > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {total_tickets - tickets_vendus}
                      </span>
                    </div>
                    {/* Places par classe */}
                    <div className="mt-2 border-t border-blue-200 pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">1ère classe</span>
                        <span className="font-medium text-blue-700">{places_1ere} / {voyage.formation_voiture * 60}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">2ème classe</span>
                        <span className="font-medium text-blue-700">{places_2eme} / {voyage.formation_voiture2 * 72}</span>
                      </div>
                    </div>
                  </div>

                  {/*Quota Bagages*/}
                  <div className="space-y-1">
                    {quota_bagages.map((q, index) => (
                      <div key={q.id || `bagage-${index}`} className="flex justify-between text-sm">
                        <span className="text-gray-600">Capacité fret</span>
                        <span className="font-medium text-orange-700">{q.quota_tonnes} tonnes</span>
                      </div>
                    ))}
                    <div className="border-t border-orange-200 pt-1 mt-1 flex justify-between text-sm  text-gray-500">
                      <span>Total</span>
                      <span className="text-orange-700">{(total_bagages / 1000).toFixed(1)}T</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Vendus</span>
                      <span className="font-medium">{(bagages_vendus / 1000).toFixed(1)}T</span>
                    </div>
                  </div>
                    </div>

                    {/* Taux d'occupation */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Taux d'occupation places</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              total_tickets > 0 && tickets_vendus / total_tickets > 0.7 
                                ? 'bg-green-500' 
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${total_tickets > 0 ? Math.min((tickets_vendus / total_tickets) * 100, 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 mt-1">
                          {total_tickets > 0 ? Math.round((tickets_vendus / total_tickets) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}