/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import { 
  ArrowLeft, Ticket, User, 
  MapPin, Train, Calendar, AlertCircle, Loader2,
  History, Users
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

interface Stats {
  total_voyageurs: number;
  total_montant: number;
  total_part_madarail: number;
  montant_1ere: number;
  part_madarail_1ere: number;
  montant_2eme: number;
  part_madarail_2eme: number;
}

export default function VBCHistoriquePage() {
  const params = useParams();
  const router = useRouter();
  const voyageId = params.id as string;

  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [ticketsVoyageurs, setTicketsVoyageurs] = useState<TicketVoyageur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    total_voyageurs: 0,
    total_montant: 0,
    total_part_madarail: 0,
    montant_1ere: 0,
    part_madarail_1ere: 0,
    montant_2eme: 0,
    part_madarail_2eme: 0,
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

        // Calculer les statistiques
        const totalVoyageurs = ticketsV?.length || 0;
        
        const montant1ere = ticketsV?.filter(t => t.classe === '1ere').reduce((sum, t) => sum + t.montant, 0) || 0;
        const partMadarail1ere = ticketsV?.filter(t => t.classe === '1ere').reduce((sum, t) => sum + (t.part_madarail || 0), 0) || 0;
        
        const montant2eme = ticketsV?.filter(t => t.classe === '2eme').reduce((sum, t) => sum + t.montant, 0) || 0;
        const partMadarail2eme = ticketsV?.filter(t => t.classe === '2eme').reduce((sum, t) => sum + (t.part_madarail || 0), 0) || 0;
        
        const totalMontant = montant1ere + montant2eme;
        const totalPartMadarail = partMadarail1ere + partMadarail2eme;

        setStats({
          total_voyageurs: totalVoyageurs,
          total_montant: totalMontant,
          total_part_madarail: totalPartMadarail,
          montant_1ere: montant1ere,
          part_madarail_1ere: partMadarail1ere,
          montant_2eme: montant2eme,
          part_madarail_2eme: partMadarail2eme,
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
        <span className="inline-flex items-center px-2.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
          1ère
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-medium">
        2ème
      </span>
    );
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
          <Loader2 className="h-12 w-12 text-amber-600 animate-spin" />
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
            onClick={() => router.push('/vbc')}
            className="mt-4 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700"
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
            onClick={() => router.push('/vbc')}
            className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <History className="h-6 w-6 text-amber-600" />
                Historique des ventes
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Tickets vendus</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total_voyageurs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Montant total</p>
            <p className="text-2xl font-bold text-emerald-600">{formatPrice(stats.total_montant)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Part Madarail total</p>
            <p className="text-2xl font-bold text-indigo-600">{formatPrice(stats.total_part_madarail)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4">
            <p className="text-xs text-stone-500 font-medium">Places vendues</p>
            <p className="text-2xl font-bold text-amber-600">{stats.total_voyageurs}</p>
          </div>
        </div>

        {/* Détails par classe */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-yellow-50/80 rounded-xl p-4 border border-yellow-200/60">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">1ère Classe</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Nombre:</span>
                <span className="font-medium text-yellow-700">
                  {ticketsVoyageurs.filter(t => t.classe === '1ere').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Montant:</span>
                <span className="font-medium text-yellow-700">{formatPrice(stats.montant_1ere)}</span>
              </div>
              <div className="flex justify-between text-xs text-yellow-600">
                <span>Part Madarail:</span>
                <span>{formatPrice(stats.part_madarail_1ere)}</span>
              </div>
            </div>
          </div>

          <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200/60">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="h-5 w-5 text-stone-600" />
              <h3 className="font-semibold text-stone-800">2ème Classe</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Nombre:</span>
                <span className="font-medium text-stone-700">
                  {ticketsVoyageurs.filter(t => t.classe === '2eme').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Montant:</span>
                <span className="font-medium text-stone-700">{formatPrice(stats.montant_2eme)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-600">
                <span>Part Madarail:</span>
                <span>{formatPrice(stats.part_madarail_2eme)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des tickets */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
          <div className="p-5">
            {ticketsVoyageurs.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500">Aucun ticket voyageur vendu</p>
              </div>
            ) : (
              <>
                <div className="mb-3 p-3 bg-amber-50/80 rounded-lg border border-amber-200/60 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-sm font-medium text-amber-800">Total des tickets:</span>
                  <div className="space-x-3 text-sm flex flex-wrap gap-2">
                    <span className="font-bold text-amber-700">Montant: {formatPrice(stats.total_montant)}</span>
                    <span className="text-xs font-medium text-amber-600">PM: {formatPrice(stats.total_part_madarail)}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-stone-50/80 text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">N° Ticket</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Nom</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">CIN</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Départ</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Arrivée</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Classe</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Montant</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Part Madarail</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/60">
                      {ticketsVoyageurs.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-stone-50 transition">
                          <td className="px-4 py-3 text-sm font-medium text-stone-800">{ticket.num_ticket}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{ticket.nom_voyageur}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{ticket.cin}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{ticket.depart}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{ticket.arrivee}</td>
                          <td className="px-4 py-3">{getClasseBadge(ticket.classe)}</td>
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
        </div>
      </div>
    </div>
  );
}