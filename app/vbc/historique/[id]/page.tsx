/* eslint-disable @typescript-eslint/no-unused-vars */
 
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import { 
  ArrowLeft, Ticket, Package, Box, User, 
  MapPin, Train, Calendar, AlertCircle, Loader2,
  Users, Weight, Clock, CheckCircle, History,
  TrendingUp
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

interface TicketVoyageur {
  id: string;
  num_ticket: string;
  nom_voyageur: string;
  cin: string;
  mineur: boolean;
  depart: string;
  arrivee: string;
  classe: string;
  montant: number;
  part_madarail: number;
  created_at: string;
}

interface TicketBagage {
  id: string;
  num_ticket: string;
  nature: string;
  depart: string;
  arrivee: string;
  poids: number;
  volume: number;
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
  montant: number;
  part_madarail: number;
  nom_expediteur: string;
  num_tel_expediteur: string;
  nom_destinataire: string;
  num_tel_destinataire: string;
  created_at: string;
}

interface Stats {
  total_voyageurs: number;
  total_bagages: number;
  total_colis: number;
  total_montant: number;
  total_part_madarail: number;
  total_places_vendues: number;
  total_poids_vendu: number;
  montant_1ere: number;
  part_madarail_1ere: number;
  montant_2eme: number;
  part_madarail_2eme: number;
  montant_voyageurs: number;
  part_madarail_voyageurs: number;
  montant_bagages: number;
  part_madarail_bagages: number;
  montant_colis: number;
  part_madarail_colis: number;
}

type TabType = 'voyageurs' | 'bagages' | 'colis';

export default function HistoriqueVentePage() {
  const params = useParams();
  const router = useRouter();
  const voyageId = params.id as string;

  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [ticketsVoyageurs, setTicketsVoyageurs] = useState<TicketVoyageur[]>([]);
  const [ticketsBagages, setTicketsBagages] = useState<TicketBagage[]>([]);
  const [ticketsColis, setTicketsColis] = useState<TicketColis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('voyageurs');
  const [stats, setStats] = useState<Stats>({
    total_voyageurs: 0,
    total_bagages: 0,
    total_colis: 0,
    total_montant: 0,
    total_part_madarail: 0,
    total_places_vendues: 0,
    total_poids_vendu: 0,
    montant_1ere: 0,
    part_madarail_1ere: 0,
    montant_2eme: 0,
    part_madarail_2eme: 0,
    montant_voyageurs: 0,
    part_madarail_voyageurs: 0,
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Non authentifié');
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('gare_ref')
          .eq('id', user.id)
          .single();

        if (!profile) {
          setError('Profil non trouvé');
          setLoading(false);
          return;
        }

        const { data: voyageData } = await supabase
          .from('voyages')
          .select(`
            *,
            gare_depart_detail:gare_depart(code, gare),
            gare_arrivee_detail:gare_arrivee(code, gare)
          `)
          .eq('id', voyageId)
          .single();

        if (voyageData) {
          setVoyage(voyageData);
        } else {
          setError('Voyage non trouvé');
          setLoading(false);
          return;
        }

        // Récupérer les tickets voyageurs
        const { data: ticketsV } = await supabase
          .from('ticket_voyageur')
          .select('*')
          .eq('voyage_id', voyageId)
          .eq('gare_ref', profile.gare_ref)
          .order('created_at', { ascending: false });

        if (ticketsV) {
          setTicketsVoyageurs(ticketsV);
        }

        // Récupérer les tickets bagages
        const { data: ticketsB } = await supabase
          .from('ticket_bagage')
          .select('*')
          .eq('voyage_id', voyageId)
          .eq('gare_ref', profile.gare_ref)
          .order('created_at', { ascending: false });

        if (ticketsB) {
          setTicketsBagages(ticketsB);
        }

        // Récupérer les tickets colis
        const { data: ticketsC } = await supabase
          .from('ticket_colis')
          .select('*')
          .eq('voyage_id', voyageId)
          .eq('gare_ref', profile.gare_ref)
          .order('created_at', { ascending: false });

        if (ticketsC) {
          setTicketsColis(ticketsC);
        }

        // Calculer les statistiques
        const totalVoyageurs = ticketsV?.length || 0;
        const totalBagages = ticketsB?.length || 0;
        const totalColis = ticketsC?.length || 0;
        
        // Montants et part Madarail par type
        const montantVoyageurs = ticketsV?.reduce((sum, t) => sum + t.montant, 0) || 0;
        const partMadarailVoyageurs = ticketsV?.reduce((sum, t) => sum + (t.part_madarail || 0), 0) || 0;
        
        const montantBagages = ticketsB?.reduce((sum, t) => sum + t.montant, 0) || 0;
        const partMadarailBagages = ticketsB?.reduce((sum, t) => sum + (t.part_madarail || 0), 0) || 0;
        
        const montantColis = ticketsC?.reduce((sum, t) => sum + t.montant, 0) || 0;
        const partMadarailColis = ticketsC?.reduce((sum, t) => sum + (t.part_madarail || 0), 0) || 0;
        
        // Montants et part Madarail par classe pour les voyageurs
        const montant1ere = ticketsV?.filter(t => t.classe === '1ere').reduce((sum, t) => sum + t.montant, 0) || 0;
        const partMadarail1ere = ticketsV?.filter(t => t.classe === '1ere').reduce((sum, t) => sum + (t.part_madarail || 0), 0) || 0;
        
        const montant2eme = ticketsV?.filter(t => t.classe === '2eme').reduce((sum, t) => sum + t.montant, 0) || 0;
        const partMadarail2eme = ticketsV?.filter(t => t.classe === '2eme').reduce((sum, t) => sum + (t.part_madarail || 0), 0) || 0;
        
        const placesVendues = ticketsV?.length || 0;
        
        // Calcul du poids équivalent pour les bagages (poids + volume * 500)
        const poidsBagages = ticketsB?.reduce((sum, t) => {
          const poids = t.poids || 0;
          const volume = t.volume || 0;
          return sum + poids + (volume * 500);
        }, 0) || 0;
        
        // Calcul du poids équivalent pour les colis (poids + volume * 500)
        const poidsColis = ticketsC?.reduce((sum, t) => {
          const poids = t.poids || 0;
          const volume = t.volume || 0;
          return sum + poids + (volume * 500);
        }, 0) || 0;
        
        const totalPoidsVendu = poidsBagages + poidsColis;
        const totalMontant = montantVoyageurs + montantBagages + montantColis;
        const totalPartMadarail = partMadarailVoyageurs + partMadarailBagages + partMadarailColis;

        setStats({
          total_voyageurs: totalVoyageurs,
          total_bagages: totalBagages,
          total_colis: totalColis,
          total_montant: totalMontant,
          total_part_madarail: totalPartMadarail,
          total_places_vendues: placesVendues,
          total_poids_vendu: totalPoidsVendu,
          montant_1ere: montant1ere,
          part_madarail_1ere: partMadarail1ere,
          montant_2eme: montant2eme,
          part_madarail_2eme: partMadarail2eme,
          montant_voyageurs: montantVoyageurs,
          part_madarail_voyageurs: partMadarailVoyageurs,
          montant_bagages: montantBagages,
          part_madarail_bagages: partMadarailBagages,
          montant_colis: montantColis,
          part_madarail_colis: partMadarailColis,
        });

      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors du chargement des données');
      }

      setLoading(false);
    };

    fetchData();
  }, [voyageId]);

  const formatDate = (date: string) => {
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

  const getClasseBadge = (classe: string) => {
    if (classe === '1ere') {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
          1ère
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
        2ème
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 text-orange-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !voyage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Voyage non trouvé'}
          </div>
          <button
            onClick={() => router.push('/vbc')}
            className="mt-4 inline-flex items-center gap-2 text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/vbc')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <History className="h-6 w-6 text-blue-600" />
                Historique des ventes
              </h1>
              <p className="text-gray-600">
                {voyage.gare_depart_detail?.code} → {voyage.gare_arrivee_detail?.code} • 
                {new Date(voyage.date_voyage).toLocaleDateString('fr-FR')} • Sens {voyage.sens}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Statut: <span className={`font-medium ${voyage.statut === 'actif' ? 'text-green-600' : 'text-gray-600'}`}>
                {voyage.statut === 'actif' ? 'Actif' : 'Terminé'}
              </span></p>
            </div>
          </div>
        </div>

        {/* Statistiques générales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-500">Tickets voyageurs</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total_voyageurs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-500">Tickets bagages</p>
            <p className="text-2xl font-bold text-green-600">{stats.total_bagages}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-500">Tickets colis</p>
            <p className="text-2xl font-bold text-purple-600">{stats.total_colis}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-500">Montant total</p>
            <p className="text-2xl font-bold text-orange-600">{formatPrice(stats.total_montant)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-indigo-500">
            <p className="text-xs text-gray-500">Part Madarail total</p>
            <p className="text-2xl font-bold text-indigo-600">{formatPrice(stats.total_part_madarail)}</p>
          </div>
        </div>

        {/* Détails des montants par type avec Part Madarail */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Tickets Voyageurs</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">1ère classe:</span>
                <span className="font-medium text-yellow-700">{formatPrice(stats.montant_1ere)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pl-4">
                <span>Part Madarail:</span>
                <span>{formatPrice(stats.part_madarail_1ere)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">2ème classe:</span>
                <span className="font-medium text-gray-700">{formatPrice(stats.montant_2eme)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pl-4">
                <span>Part Madarail:</span>
                <span>{formatPrice(stats.part_madarail_2eme)}</span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-1 mt-1 font-semibold">
                <span className="text-blue-800">Total:</span>
                <span className="text-blue-800">{formatPrice(stats.montant_voyageurs)}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600 font-medium">
                <span>Part Madarail total:</span>
                <span>{formatPrice(stats.part_madarail_voyageurs)}</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Tickets Bagages</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-medium text-green-700">{stats.total_bagages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Poids total:</span>
                <span className="font-medium text-green-700">{stats.total_poids_vendu.toFixed(1)} kg</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-1 mt-1 font-semibold">
                <span className="text-green-800">Montant total:</span>
                <span className="text-green-800">{formatPrice(stats.montant_bagages)}</span>
              </div>
              <div className="flex justify-between text-xs text-green-600 font-medium">
                <span>Part Madarail total:</span>
                <span>{formatPrice(stats.part_madarail_bagages)}</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Box className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-800">Tickets Colis</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-medium text-purple-700">{stats.total_colis}</span>
              </div>
              <div className="flex justify-between border-t border-purple-200 pt-1 mt-1 font-semibold">
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

        {/* Statistiques supplémentaires */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Places vendues</p>
                <p className="text-lg font-bold text-gray-900">{stats.total_places_vendues}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2">
              <Weight className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Poids total vendu</p>
                <p className="text-lg font-bold text-gray-900">{stats.total_poids_vendu.toFixed(1)} kg</p>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('voyageurs')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'voyageurs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Ticket className="inline-block h-4 w-4 mr-2" />
                Voyageurs ({ticketsVoyageurs.length})
              </button>
              <button
                onClick={() => setActiveTab('bagages')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'bagages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="inline-block h-4 w-4 mr-2" />
                Bagages ({ticketsBagages.length})
              </button>
              <button
                onClick={() => setActiveTab('colis')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'colis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Box className="inline-block h-4 w-4 mr-2" />
                Colis ({ticketsColis.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Onglet Voyageurs */}
            {activeTab === 'voyageurs' && (
              <div>
                {ticketsVoyageurs.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Aucun ticket voyageur vendu</p>
                  </div>
                ) : (
                  <>
                    {/* Sous-total pour l'onglet voyageurs avec Part Madarail */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex flex-wrap justify-between items-center gap-2">
                      <span className="text-sm font-medium text-blue-800">Total des tickets voyageurs:</span>
                      <div className="space-x-4 text-sm flex flex-wrap gap-2">
                        <span className="text-yellow-700">1ère: {formatPrice(stats.montant_1ere)}</span>
                        <span className="text-xs text-yellow-600">(PM: {formatPrice(stats.part_madarail_1ere)})</span>
                        <span className="text-gray-700">2ème: {formatPrice(stats.montant_2eme)}</span>
                        <span className="text-xs text-gray-600">(PM: {formatPrice(stats.part_madarail_2eme)})</span>
                        <span className="font-bold text-blue-700">Total: {formatPrice(stats.montant_voyageurs)}</span>
                        <span className="text-xs font-medium text-blue-600">PM: {formatPrice(stats.part_madarail_voyageurs)}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">N° Ticket</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Nom</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">CIN</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Départ</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Arrivée</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Classe</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Montant</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Part Madarail</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {ticketsVoyageurs.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">{ticket.num_ticket}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.nom_voyageur}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.cin}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.depart}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.arrivee}</td>
                              <td className="px-4 py-2">{getClasseBadge(ticket.classe)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-orange-700">{formatPrice(ticket.montant)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-indigo-600">{formatPrice(ticket.part_madarail)}</td>
                              <td className="px-4 py-2 text-sm text-gray-500">{formatDate(ticket.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Onglet Bagages */}
            {activeTab === 'bagages' && (
              <div>
                {ticketsBagages.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Aucun ticket bagage vendu</p>
                  </div>
                ) : (
                  <>
                    {/* Sous-total pour l'onglet bagages avec Part Madarail */}
                    <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200 flex flex-wrap justify-between items-center gap-2">
                      <span className="text-sm font-medium text-green-800">Total des tickets bagages:</span>
                      <div className="space-x-4 text-sm flex flex-wrap gap-2">
                        <span className="font-bold text-green-700">Montant: {formatPrice(stats.montant_bagages)}</span>
                        <span className="text-xs font-medium text-green-600">PM: {formatPrice(stats.part_madarail_bagages)}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">N° Ticket</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Nature</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Départ</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Arrivée</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Poids</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Volume</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Montant</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Part Madarail</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {ticketsBagages.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">{ticket.num_ticket}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.nature}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.depart}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.arrivee}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.poids || '-'} kg</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.volume || '-'} m³</td>
                              <td className="px-4 py-2 text-sm font-medium text-orange-700">{formatPrice(ticket.montant)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-indigo-600">{formatPrice(ticket.part_madarail)}</td>
                              <td className="px-4 py-2 text-sm text-gray-500">{formatDate(ticket.created_at)}</td>
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
                  <div className="text-center py-8">
                    <Box className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Aucun ticket colis vendu</p>
                  </div>
                ) : (
                  <>
                    {/* Sous-total pour l'onglet colis avec Part Madarail */}
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200 flex flex-wrap justify-between items-center gap-2">
                      <span className="text-sm font-medium text-purple-800">Total des tickets colis:</span>
                      <div className="space-x-4 text-sm flex flex-wrap gap-2">
                        <span className="font-bold text-purple-700">Montant: {formatPrice(stats.montant_colis)}</span>
                        <span className="text-xs font-medium text-purple-600">PM: {formatPrice(stats.part_madarail_colis)}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">N° Ticket</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Nature</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Expéditeur</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Destinataire</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Départ</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Arrivée</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Poids</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Volume</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Montant</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Part Madarail</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {ticketsColis.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">{ticket.num_ticket}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.nature}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.nom_expediteur}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.nom_destinataire}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.depart}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.arrivee}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.poids || '-'} kg</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{ticket.volume || '-'} m³</td>
                              <td className="px-4 py-2 text-sm font-medium text-orange-700">{formatPrice(ticket.montant)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-indigo-600">{formatPrice(ticket.part_madarail)}</td>
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