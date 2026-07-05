/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import { 
  ArrowLeft, Package, Box, MapPin, 
  Train, Calendar, AlertCircle, Loader2,
  History, User, Phone, Weight
} from 'lucide-react';

interface Voyage {
  id: string;
  date_voyage: string;
  sens: string;
  gare_depart: number;
  gare_arrivee: number;
  statut: string;
  gare_depart_detail?: { code: string; gare: string };
  gare_arrivee_detail?: { code: string; gare: string };
}

interface TicketBagage {
  id: string;
  num_ticket: string;
  nature: string;
  depart: string;
  arrivee: string;
  poids: number;
  volume: number;
  poids_volume: string;
  montant: number;
  part_madarail: number;
  created_at: string;
}

interface TicketColis {
  id: string;
  num_ticket: string;
  nature: string;
  depart: string;
  arrivee: string;
  poids: number;
  volume: number;
  poids_volume: string;
  montant: number;
  part_madarail: number;
  nom_expediteur: string;
  num_tel_expediteur: string;
  nom_destinataire: string;
  num_tel_destinataire: string;
  created_at: string;
}

interface Stats {
  total_bagages: number;
  total_colis: number;
  total_montant: number;
  total_part_madarail: number;
  total_poids_vendu: number;
  montant_bagages: number;
  part_madarail_bagages: number;
  montant_colis: number;
  part_madarail_colis: number;
}

type TabType = 'bagages' | 'colis';

export default function RDHistoriquePage() {
  const params = useParams();
  const router = useRouter();
  const voyageId = params.id as string;

  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [ticketsBagages, setTicketsBagages] = useState<TicketBagage[]>([]);
  const [ticketsColis, setTicketsColis] = useState<TicketColis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('bagages');
  const [stats, setStats] = useState<Stats>({
    total_bagages: 0,
    total_colis: 0,
    total_montant: 0,
    total_part_madarail: 0,
    total_poids_vendu: 0,
    montant_bagages: 0,
    part_madarail_bagages: 0,
    montant_colis: 0,
    part_madarail_colis: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Récupérer l'utilisateur connecté
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('Non authentifié');
          setLoading(false);
          return;
        }

        // Récupérer le profil pour avoir gare_ref
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('gare_ref')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          setError('Profil non trouvé');
          setLoading(false);
          return;
        }

        console.log('Profile gare_ref:', profile.gare_ref);

        // Récupérer les détails du voyage
        const { data: voyageData, error: voyageError } = await supabase
          .from('voyages')
          .select(`
            *,
            gare_depart_detail:gare_depart(code, gare),
            gare_arrivee_detail:gare_arrivee(code, gare)
          `)
          .eq('id', voyageId)
          .single();

        if (voyageError || !voyageData) {
          setError('Voyage non trouvé');
          setLoading(false);
          return;
        }

        setVoyage(voyageData);
        console.log('Voyage:', voyageData);

        // Récupérer les tickets bagages avec le client normal
        const { data: ticketsB, error: bagagesError } = await supabase
          .from('ticket_bagage')
          .select('*')
          .eq('voyage_id', voyageId)
          .eq('gare_ref', profile.gare_ref)
          .order('created_at', { ascending: false });

        if (bagagesError) {
          console.error('Erreur bagages:', bagagesError);
        } else {
          console.log('Tickets bagages trouvés:', ticketsB?.length || 0);
          setTicketsBagages(ticketsB || []);
        }

        // Récupérer les tickets colis avec le client normal
        const { data: ticketsC, error: colisError } = await supabase
          .from('ticket_colis')
          .select('*')
          .eq('voyage_id', voyageId)
          .eq('gare_ref', profile.gare_ref)
          .order('created_at', { ascending: false });

        if (colisError) {
          console.error('Erreur colis:', colisError);
        } else {
          console.log('Tickets colis trouvés:', ticketsC?.length || 0);
          setTicketsColis(ticketsC || []);
        }

        // Calculer les statistiques
        const totalBagages = ticketsB?.length || 0;
        const totalColis = ticketsC?.length || 0;
        
        const montantBagages = ticketsB?.reduce((sum, t) => sum + (t.montant || 0), 0) || 0;
        const partMadarailBagages = ticketsB?.reduce((sum, t) => sum + (t.part_madarail || 0), 0) || 0;
        
        const montantColis = ticketsC?.reduce((sum, t) => sum + (t.montant || 0), 0) || 0;
        const partMadarailColis = ticketsC?.reduce((sum, t) => sum + (t.part_madarail || 0), 0) || 0;
        
        const poidsBagages = ticketsB?.reduce((sum, t) => {
          const poids = t.poids || 0;
          const volume = t.volume || 0;
          return sum + poids + (volume * 500);
        }, 0) || 0;
        
        const poidsColis = ticketsC?.reduce((sum, t) => {
          const poids = t.poids || 0;
          const volume = t.volume || 0;
          return sum + poids + (volume * 500);
        }, 0) || 0;
        
        const totalPoidsVendu = poidsBagages + poidsColis;
        const totalMontant = montantBagages + montantColis;
        const totalPartMadarail = partMadarailBagages + partMadarailColis;

        setStats({
          total_bagages: totalBagages,
          total_colis: totalColis,
          total_montant: totalMontant,
          total_part_madarail: totalPartMadarail,
          total_poids_vendu: totalPoidsVendu,
          montant_bagages: montantBagages,
          part_madarail_bagages: partMadarailBagages,
          montant_colis: montantColis,
          part_madarail_colis: partMadarailColis,
        });

        console.log('Stats calculées:', {
          totalBagages,
          totalColis,
          totalMontant,
          totalPartMadarail,
          totalPoidsVendu
        });

      } catch (err) {
        console.error('Erreur fetchData:', err);
        setError('Erreur lors du chargement des données');
      }

      setLoading(false);
    };

    if (voyageId) {
      fetchData();
    }
  }, [voyageId]);

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR') + ' Ar';
  };

  const getStatusBadge = (statut: string) => {
    if (statut === 'actif') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
          Actif
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-medium">
        Terminé
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !voyage) {
    return (
      <div className="min-h-screen bg-stone-100">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Voyage non trouvé'}
          </div>
          <button
            onClick={() => router.push('/rd')}
            className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/rd')}
            className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <History className="h-6 w-6 text-indigo-600" />
                Historique des déclarations
              </h1>
              <p className="text-stone-600 text-sm">
                {voyage.gare_depart_detail?.code} → {voyage.gare_arrivee_detail?.code} • 
                {new Date(voyage.date_voyage).toLocaleDateString('fr-FR')} • Sens {voyage.sens}
              </p>
            </div>
            <div className="text-right text-sm text-stone-500">
              <p>Statut: {getStatusBadge(voyage.statut)}</p>
            </div>
          </div>
        </div>

        {/* Statistiques générales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Tickets bagages</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total_bagages}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Tickets colis</p>
            <p className="text-2xl font-bold text-purple-600">{stats.total_colis}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Poids total vendu</p>
            <p className="text-2xl font-bold text-amber-600">{stats.total_poids_vendu.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Montant total</p>
            <p className="text-2xl font-bold text-emerald-600">{formatPrice(stats.total_montant)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Part Madarail total</p>
            <p className="text-2xl font-bold text-indigo-600">{formatPrice(stats.total_part_madarail)}</p>
          </div>
        </div>

        {/* Détails des montants par type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-200/60">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Tickets Bagages</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Nombre:</span>
                <span className="font-medium text-blue-700">{stats.total_bagages}</span>
              </div>
              <div className="flex justify-between border-t border-blue-200/60 pt-1 mt-1 font-semibold">
                <span className="text-blue-800">Montant total:</span>
                <span className="text-blue-800">{formatPrice(stats.montant_bagages)}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600 font-medium">
                <span>Part Madarail total:</span>
                <span>{formatPrice(stats.part_madarail_bagages)}</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50/80 rounded-xl p-4 border border-purple-200/60">
            <div className="flex items-center gap-2 mb-2">
              <Box className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-800">Tickets Colis</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Nombre:</span>
                <span className="font-medium text-purple-700">{stats.total_colis}</span>
              </div>
              <div className="flex justify-between border-t border-purple-200/60 pt-1 mt-1 font-semibold">
                <span className="text-purple-800">Montant total:</span>
                <span className="text-purple-800">{formatPrice(stats.montant_colis)}</span>
              </div>
              <div className="flex justify-between text-xs text-purple-600 font-medium">
                <span>Part Madarail total:</span>
                <span>{formatPrice(stats.part_madarail_colis)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
          <div className="border-b border-stone-200/60">
            <nav className="flex -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('bagages')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'bagages'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }`}
              >
                <Package className="inline-block h-4 w-4 mr-2" />
                Bagages ({ticketsBagages.length})
              </button>
              <button
                onClick={() => setActiveTab('colis')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'colis'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }`}
              >
                <Box className="inline-block h-4 w-4 mr-2" />
                Colis ({ticketsColis.length})
              </button>
            </nav>
          </div>

          <div className="p-5">
            {/* Onglet Bagages */}
            {activeTab === 'bagages' && (
              <div>
                {ticketsBagages.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-500">Aucun ticket bagage déclaré</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 p-3 bg-blue-50/80 rounded-lg border border-blue-200/60 flex flex-wrap justify-between items-center gap-2">
                      <span className="text-sm font-medium text-blue-800">Total des tickets bagages:</span>
                      <div className="space-x-3 text-sm flex flex-wrap gap-2">
                        <span className="font-bold text-blue-700">Montant: {formatPrice(stats.montant_bagages)}</span>
                        <span className="text-xs font-medium text-blue-600">PM: {formatPrice(stats.part_madarail_bagages)}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-stone-50/80 text-left">
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">N° Ticket</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Nature</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Départ</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Arrivée</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Poids</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Volume</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Montant</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Part Madarail</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200/60">
                          {ticketsBagages.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-stone-50 transition">
                              <td className="px-4 py-3 text-sm font-medium text-stone-800">{ticket.num_ticket}</td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.nature}</td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.depart}</td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.arrivee}</td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.poids || '-'} kg</td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.volume || '-'} m³</td>
                              <td className="px-4 py-3 text-sm font-medium text-emerald-700">{formatPrice(ticket.montant)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-indigo-600">{formatPrice(ticket.part_madarail)}</td>
                              <td className="px-4 py-3 text-sm text-stone-500">{formatDate(ticket.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Onglet Colis */}
            {activeTab === 'colis' && (
              <div>
                {ticketsColis.length === 0 ? (
                  <div className="text-center py-12">
                    <Box className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-500">Aucun ticket colis déclaré</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 p-3 bg-purple-50/80 rounded-lg border border-purple-200/60 flex flex-wrap justify-between items-center gap-2">
                      <span className="text-sm font-medium text-purple-800">Total des tickets colis:</span>
                      <div className="space-x-3 text-sm flex flex-wrap gap-2">
                        <span className="font-bold text-purple-700">Montant: {formatPrice(stats.montant_colis)}</span>
                        <span className="text-xs font-medium text-purple-600">PM: {formatPrice(stats.part_madarail_colis)}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-stone-50/80 text-left">
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">N° Ticket</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Nature</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Expéditeur</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Destinataire</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Départ</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Arrivée</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Poids</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Volume</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Montant</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Part Madarail</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200/60">
                          {ticketsColis.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-stone-50 transition">
                              <td className="px-4 py-3 text-sm font-medium text-stone-800">{ticket.num_ticket}</td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.nature}</td>
                              <td className="px-4 py-3 text-sm text-stone-600">
                                <div>{ticket.nom_expediteur}</div>
                                <div className="text-xs text-stone-400 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {ticket.num_tel_expediteur}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-stone-600">
                                <div>{ticket.nom_destinataire}</div>
                                <div className="text-xs text-stone-400 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {ticket.num_tel_destinataire}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.depart}</td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.arrivee}</td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.poids || '-'} kg</td>
                              <td className="px-4 py-3 text-sm text-stone-600">{ticket.volume || '-'} m³</td>
                              <td className="px-4 py-3 text-sm font-medium text-emerald-700">{formatPrice(ticket.montant)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-indigo-600">{formatPrice(ticket.part_madarail)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}