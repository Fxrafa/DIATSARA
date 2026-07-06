/* eslint-disable react-hooks/exhaustive-deps */
 
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { supabaseSite } from '@/lib/supabaseClientSite';
import Navbar from '@/components/Navbar';
import { 
  ArrowLeft, Ticket, User, 
  MapPin, Train, Calendar, AlertCircle, Loader2,
  CheckCircle, Lock, AlertTriangle, Printer, Users,
  X, Globe, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { getVoyageDetails, getTarif, getLastTicketNumber, getTicketsSite, validerTicketSite } from '@/app/vbc/actions';

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

interface Profile {
  id: string;
  nom: string;
  matricule: string;
  role: string;
  gare_ref: number;
}

interface Gare {
  num: number;
  code: string;
  gare: string;
  pk: number;
  commune_tutelle: string;
}

interface TicketSite {
  id: string;
  num_ticket: string;
  nom_voyageur: string;
  cin: number;
  mineur: boolean;
  depart: string;
  arrivee: string;
  classe: string;
  montant: number;
  part_madarail: number;
  created_at: string;
  id_voyageur: string;
  sens: number[];
  id_voyage: string;
  status: string;
}

export default function VBCVentePage() {
  const params = useParams();
  const router = useRouter();
  const voyageId = params.id as string;

  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gare, setGare] = useState<Gare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedTicket, setLastCreatedTicket] = useState<{
    num_ticket: string;
    nom_voyageur: string;
    depart: string;
    arrivee: string;
    classe: string;
    montant: number;
  } | null>(null);
  const [showCreatedTicket, setShowCreatedTicket] = useState(false);

  // Tickets site
  const [ticketsSite, setTicketsSite] = useState<TicketSite[]>([]);
  const [loadingSite, setLoadingSite] = useState(false);
  const [validatingTicket, setValidatingTicket] = useState<string | null>(null);
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState(false);

  // Popup states
  const [popup, setPopup] = useState<{
    type: 'error' | 'success' | 'warning' | 'info';
    title: string;
    message: string;
    visible: boolean;
  }>({
    type: 'error',
    title: '',
    message: '',
    visible: false,
  });

  // Quotas
  const [quotas, setQuotas] = useState({
    tickets_max: 0,
    tickets_vendus: 0,
    tickets_site: 0,
  });

  // Places disponibles pour la 1ère classe pour la gare actuelle
  const [places1ereDisponibles, setPlaces1ereDisponibles] = useState(0);
  const [places1ereMax, setPlaces1ereMax] = useState(0);

  // États des formulaires
  const [voyageurForm, setVoyageurForm] = useState({
    nom: '',
    cin: '',
    mineur: false,
    arrivee: '',
    classe: '2eme',
  });

  // Calculs des montants
  const [tarifInfo, setTarifInfo] = useState<{ tarif_1ere: number; tarif_2eme: number; distance: number } | null>(null);
  const [montantVoyageur, setMontantVoyageur] = useState(0);
  const [numTicketSequential, setNumTicketSequential] = useState(1);

  // Fonctions pour les popups
  const showPopup = (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => {
    setPopup({ type, title, message, visible: true });
    if (type === 'success') {
      setTimeout(() => {
        setPopup(prev => ({ ...prev, visible: false }));
      }, 5000);
    }
  };

  const closePopup = () => {
    setPopup(prev => ({ ...prev, visible: false }));
  };

  // Vérifier si les quotas sont atteints
  const isTicketsFull = quotas.tickets_max > 0 && (quotas.tickets_vendus + quotas.tickets_site) >= quotas.tickets_max;

  // Vérifier si la 1ère classe est disponible
  const is1ereAvailable = places1ereDisponibles > 0;

  // Fonction pour obtenir les gares disponibles selon le sens du voyage
  const getAvailableGares = () => {
    if (!gare || !voyage) return [];
    
    const allGares = [
      { code: 'MGA', name: 'Moramanga', num: 1 },
      { code: 'ADB', name: 'Andasibe', num: 2 },
      { code: 'FNV', name: 'Fanovana', num: 3 },
      { code: 'ABV', name: 'Ambatovola', num: 4 },
      { code: 'ATY', name: 'Antanifotsy', num: 5 },
      { code: 'ADK', name: 'Andekaleka', num: 6 },
      { code: 'ABH', name: 'Ambalahoraka', num: 7 },
      { code: 'JRM', name: 'Jirama PK206', num: 8 },
      { code: 'LHD', name: 'Lohariandava', num: 9 },
      { code: 'SKM', name: 'Sandrakazomena', num: 10 },
      { code: 'FNS', name: 'Fanasana', num: 11 },
      { code: 'MGB', name: 'Mangabe', num: 12 },
      { code: 'RZK', name: 'Razanaka', num: 13 },
      { code: 'ANV', name: 'Anivorano', num: 14 },
      { code: 'BKV', name: 'Brickaville', num: 15 },
      { code: 'ABL', name: 'Ambila', num: 16 },
      { code: 'VVN', name: 'Vavony', num: 17 },
      { code: 'ZIN', name: 'Ampanotoamaizina', num: 18 },
      { code: 'ADR', name: 'Andranokoditra', num: 19 },
      { code: 'TPN', name: 'Tampina', num: 20 },
      { code: 'TPL', name: 'Tapolo', num: 21 },
      { code: 'AKF', name: 'Ankarefo', num: 22 },
      { code: 'VTZ', name: 'Vohiteza', num: 23 },
      { code: 'IVD', name: 'Ivondro', num: 24 },
      { code: 'MNG', name: 'Manguiers', num: 25 },
    ];

    const gareCodes = allGares.map(g => g.code);
    const currentIndex = gareCodes.indexOf(gare.code);
    const departIndex = gareCodes.indexOf(voyage.gare_depart_detail?.code || '');
    const arriveeIndex = gareCodes.indexOf(voyage.gare_arrivee_detail?.code || '');

    const startIndex = Math.min(departIndex, arriveeIndex);
    const endIndex = Math.max(departIndex, arriveeIndex);
    if (currentIndex < startIndex || currentIndex > endIndex) {
      return [];
    }

    if (voyage.sens === '2131') {
      if (currentIndex >= arriveeIndex) {
        return [];
      }
      return allGares.slice(currentIndex + 1, arriveeIndex + 1);
    } else {
      if (currentIndex <= arriveeIndex) {
        return [];
      }
      return allGares.slice(arriveeIndex, currentIndex);
    }
  };

  const availableGares = getAvailableGares();

  // Charger les tickets site
  const loadTicketsSite = async () => {
    if (!voyage || !gare) return;
    
    setLoadingSite(true);
    try {
      const result = await getTicketsSite(voyage.id, gare.code);
      if (result.error) {
        showPopup('error', 'Erreur', result.error);
      } else if (result.tickets) {
        setTicketsSite(result.tickets);
        // ✅ Mettre à jour le quota après chargement des tickets site
        await updateQuota();
      }
    } catch (err) {
      console.error('Erreur chargement tickets site:', err);
    } finally {
      setLoadingSite(false);
    }
  };

  // ✅ Fonction pour mettre à jour le quota
  const updateQuota = async () => {
    if (!voyage) return;
    try {
      const result = await getVoyageDetails(voyage.id);
      if (result && result.quotas) {
        setQuotas({
          tickets_max: result.quotas.tickets_max || 0,
          tickets_vendus: result.quotas.tickets_vendus || 0,
          tickets_site: result.quotas.tickets_site || 0,
        });
      }
    } catch (err) {
      console.error('Erreur mise à jour quota:', err);
    }
  };

  // ✅ Écouteur Realtime pour les tickets site
  useEffect(() => {
    if (!voyage || !gare) return;

    console.log('🔄 Mise en place de l\'écouteur Realtime pour les tickets site...');

    const subscription = supabaseSite
      .channel('ticket-site-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_voyageur_site',
          filter: `id_voyage=eq.${voyage.id}`,
        },
        (payload) => {
          console.log('📡 Changement détecté sur les tickets site:', payload);
          
          // ✅ Recharger les tickets site et le quota
          loadTicketsSite();
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut de la souscription:', status);
      });

    return () => {
      console.log('🧹 Nettoyage de l\'écouteur Realtime');
      subscription.unsubscribe();
    };
  }, [voyage, gare]);

  // Récupérer les places disponibles pour la 1ère classe
  useEffect(() => {
    const fetchPlaces1ere = async () => {
      if (!voyage || !gare) return;

      try {
        const placesMax = voyage.formation_voiture * 60;
        setPlaces1ereMax(placesMax);

        const { data: tickets1ere } = await supabase
          .from('ticket_voyageur')
          .select('arrivee, depart')
          .eq('voyage_id', voyage.id)
          .eq('classe', '1ere');

        if (!tickets1ere || tickets1ere.length === 0) {
          setPlaces1ereDisponibles(placesMax);
          return;
        }

        const allGares = [
          'MGA', 'ADB', 'FNV', 'ABV', 'ATY', 'ADK', 'ABH', 'JRM', 'LHD', 'SKM',
          'FNS', 'MGB', 'RZK', 'ANV', 'BKV', 'ABL', 'VVN', 'ZIN', 'ADR', 'TPN',
          'TPL', 'AKF', 'VTZ', 'IVD', 'MNG'
        ];
        const currentIndex = allGares.indexOf(gare.code);

        let placesOccupees = 0;

        for (const ticket of tickets1ere) {
          const departIndex = allGares.indexOf(ticket.depart);
          const arriveeIndex = allGares.indexOf(ticket.arrivee);

          if (voyage.sens === '2131') {
            if (currentIndex >= departIndex && currentIndex < arriveeIndex) {
              placesOccupees++;
            }
          } else {
            if (currentIndex > arriveeIndex && currentIndex <= departIndex) {
              placesOccupees++;
            }
          }
        }

        setPlaces1ereDisponibles(Math.max(0, placesMax - placesOccupees));

      } catch (err) {
        console.error('Erreur chargement places 1ère classe:', err);
        setPlaces1ereDisponibles(voyage.formation_voiture * 60);
      }
    };

    fetchPlaces1ere();
  }, [voyage, gare]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          showPopup('error', 'Erreur d\'authentification', 'Vous devez être connecté pour effectuer cette action.');
          setLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileData) {
          showPopup('error', 'Profil non trouvé', 'Impossible de récupérer votre profil.');
          setLoading(false);
          return;
        }

        setProfile(profileData);

        if (profileData.gare_ref) {
          const { data: gareData } = await supabase
            .from('gare')
            .select('*')
            .eq('num', profileData.gare_ref)
            .single();
          setGare(gareData);
        }

        const result = await getVoyageDetails(voyageId);
        if (result.error) {
          showPopup('error', 'Erreur', result.error);
          setLoading(false);
          return;
        }
        setVoyage(result.voyage);
        if (result.quotas) {
          setQuotas(result.quotas);
        }

        const lastNum = await getLastTicketNumber(voyageId, profileData.gare_ref);
        setNumTicketSequential(lastNum);

        // Charger les tickets site
        await loadTicketsSite();

      } catch (err) {
        console.error('Erreur:', err);
        showPopup('error', 'Erreur', 'Une erreur est survenue lors du chargement des données.');
      }

      setLoading(false);
    };

    fetchData();
  }, [voyageId]);

  // Calcul du montant voyageur
  useEffect(() => {
    if (voyageurForm.arrivee && gare) {
      const canton = `${gare.code}-${voyageurForm.arrivee}`;
      getTarif(canton).then(result => {
        if (result.tarif) {
          setTarifInfo({
            tarif_1ere: result.tarif.tarif_1ere_classe,
            tarif_2eme: result.tarif.tarif_2eme_classe,
            distance: result.tarif.distance,
          });
          
          const tarif = voyageurForm.classe === '1ere' 
            ? result.tarif.tarif_2eme_classe
            : result.tarif.tarif_1ere_classe;
          
          let montant = 0;
          if (tarif === 5800) montant = 7000;
          else if (tarif === 11600) montant = 14000;
          else if (tarif === 13800) montant = 15000;
          else if (tarif === 8800) montant = 10000;
          else if (tarif === 22600) montant = 25000;
          
          setMontantVoyageur(montant);
        }
      });
    }
  }, [voyageurForm.arrivee, voyageurForm.classe, gare]);

  // Génération du numéro de ticket
  const generateTicketNumber = (prefix: string) => {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');
    
    const seq = String(numTicketSequential).padStart(4, '0');
    const pk = String(gare?.pk || 0).padStart(3, '0');
    
    return `${prefix}${seq}-${dateStr}-${pk}`;
  };

  // Validation du ticket
  const validateVoyageur = () => {
    if (!voyageurForm.nom.trim()) return 'Nom du voyageur requis';
    if (!voyageurForm.cin.trim() || voyageurForm.cin.length !== 12) return 'CIN doit contenir 12 chiffres';
    if (!voyageurForm.arrivee) return 'Arrivée requise';
    if (voyageurForm.classe === '1ere' && !is1ereAvailable) return '1ère classe non disponible';
    return null;
  };

  // Validation d'un ticket site
  const handleValiderTicketSite = async (ticketId: string) => {
    setValidatingTicket(ticketId);
    try {
      const numTicket = generateTicketNumber('V');
      const result = await validerTicketSite(
        ticketId,
        voyageId,
        gare!.num,
        profile!.nom,
        numTicket
      );

      if (result.error) {
        showPopup('error', 'Erreur', result.error);
      } else {
        showPopup('success', 'Ticket validé !', `Ticket ${numTicket} validé avec succès !`);
        
        // ✅ Recharger les tickets site et le quota
        await loadTicketsSite();
        // ✅ Le quota reste inchangé car tickets_site diminue et tickets_vendus augmente
        // Le total reste le même
      }
    } catch (err) {
      console.error('Erreur validation:', err);
      showPopup('error', 'Erreur', 'Une erreur est survenue lors de la validation.');
    } finally {
      setValidatingTicket(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setLastCreatedTicket(null);
    setShowCreatedTicket(false);

    if (!voyage || !profile || !gare) {
      showPopup('error', 'Données manquantes', 'Impossible de créer le ticket. Veuillez réessayer.');
      return;
    }

    // Vérifier si la vente est désactivée
    const { data: desactivee } = await supabase
      .from('vente_desactivee')
      .select('id')
      .eq('voyage_id', voyage.id)
      .eq('gare_num', gare.num)
      .maybeSingle();

    if (desactivee) {
      showPopup('error', 'Vente désactivée', 'La vente est désactivée pour ce voyage.');
      return;
    }

    // Vérifier les quotas (incluant les tickets site)
    if (isTicketsFull) {
      showPopup('error', 'Quota atteint', 'Quota de tickets voyageurs atteint pour ce voyage.');
      return;
    }

    const validationError = validateVoyageur();
    if (validationError) {
      showPopup('error', 'Erreur de validation', validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const gareRef = gare.num;
      const voyageIdStr = voyage.id;

      const departCode = gare.code;
      const arriveeCode = voyageurForm.arrivee;
      
      const canton = `${departCode}-${arriveeCode}`;
      const tarifResult = await getTarif(canton);
      
      let montant = 0;
      let partMadarail = 0;

      if (tarifResult.tarif) {
        const tarif = voyageurForm.classe === '1ere' 
          ? tarifResult.tarif.tarif_2eme_classe
          : tarifResult.tarif.tarif_1ere_classe;
        partMadarail = tarif;
        if (tarif === 5800) montant = 7000;
        else if (tarif === 11600) montant = 14000;
        else if (tarif === 13800) montant = 15000;
        else if (tarif === 8800) montant = 10000;
        else if (tarif === 22600) montant = 25000;
      }

      const numTicket = generateTicketNumber('V');
      const { error: ticketError } = await supabase
        .from('ticket_voyageur')
        .insert({
          num_ticket: numTicket,
          nom_voyageur: voyageurForm.nom,
          cin: voyageurForm.cin,
          mineur: voyageurForm.mineur,
          depart: gare.code,
          arrivee: voyageurForm.arrivee,
          classe: voyageurForm.classe,
          montant: montant,
          part_madarail: partMadarail,
          voyage_id: voyageIdStr,
          gare_ref: gareRef,
          is_site: false,
        });

      if (ticketError) {
        console.error('Erreur ticket voyageur:', ticketError);
        showPopup('error', 'Erreur', 'Erreur lors de la création du ticket voyageur.');
        setIsSubmitting(false);
        return;
      }

      setLastCreatedTicket({
        num_ticket: numTicket,
        nom_voyageur: voyageurForm.nom,
        depart: gare.code,
        arrivee: voyageurForm.arrivee,
        classe: voyageurForm.classe,
        montant: montant,
      });
      setShowCreatedTicket(true);

      setNumTicketSequential(numTicketSequential + 1);
      showPopup('success', 'Ticket créé !', `Ticket voyageur ${numTicket} créé avec succès !`);

      setVoyageurForm({ nom: '', cin: '', mineur: false, arrivee: '', classe: '2eme' });

      // ✅ Mettre à jour le quota (tickets_vendus +1)
      await updateQuota();

      if (voyageurForm.classe === '1ere') {
        setPlaces1ereDisponibles(prev => Math.max(0, prev - 1));
      }

    } catch (err) {
      console.error('Erreur:', err);
      showPopup('error', 'Erreur', 'Une erreur est survenue lors de la création du ticket.');
    }

    setIsSubmitting(false);
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

  if (error || !voyage || !profile || !gare) {
    return (
      <div className="min-h-screen bg-stone-100">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Données manquantes'}
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

  const previewTicketNumber = generateTicketNumber('V');

  const currentNom = voyageurForm.nom;
  const currentArrivee = voyageurForm.arrivee;
  const currentClasse = voyageurForm.classe;
  const currentMontant = montantVoyageur;

  const displayNom = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.nom_voyageur : currentNom;
  const displayArrivee = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.arrivee : currentArrivee;
  const displayClasse = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.classe : currentClasse;
  const displayMontant = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.montant : currentMontant;
  const displayNumTicket = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.num_ticket : previewTicketNumber;
  const isDisplayCreated = showCreatedTicket && lastCreatedTicket;

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/vbc')}
              className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 transition text-sm mb-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <h1 className="text-xl font-serif font-bold text-stone-800">Vente de tickets</h1>
            <p className="text-stone-600 text-xs">
              {voyage.gare_depart_detail?.code} → {voyage.gare_arrivee_detail?.code} • 
              {new Date(voyage.date_voyage).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="text-right text-xs text-stone-500">
            <p>Gare: {gare.code} - {gare.gare}</p>
            <p>PK: {gare.pk}</p>
          </div>
        </div>

        {/* Quota Tickets avec menu déroulant Tickets Site */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-500 font-medium">Quota Tickets Voyageurs</p>
                  <p className="text-lg font-bold text-stone-800">
                    {quotas.tickets_vendus + quotas.tickets_site} / {quotas.tickets_max}
                  </p>
                  <p className="text-xs text-stone-400">
                    {quotas.tickets_vendus} vendus + {quotas.tickets_site} réservés site
                  </p>
                </div>
                {isTicketsFull ? (
                  <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                    <Lock className="h-4 w-4" />
                    <span>Complet</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                    <Ticket className="h-4 w-4" />
                    <span>{quotas.tickets_max - quotas.tickets_vendus - quotas.tickets_site} restants</span>
                  </div>
                )}
              </div>
              <div className="w-full bg-stone-200 rounded-full h-1.5 mt-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all ${isTicketsFull ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${quotas.tickets_max > 0 ? ((quotas.tickets_vendus + quotas.tickets_site) / quotas.tickets_max) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Bouton menu déroulant Tickets Site */}
            <div className="ml-4">
              <button
                onClick={() => {
                  setIsSiteMenuOpen(!isSiteMenuOpen);
                  if (!isSiteMenuOpen) {
                    loadTicketsSite();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isSiteMenuOpen 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Tickets Site</span>
                {loadingSite ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full text-xs font-bold">
                    {ticketsSite.length}
                  </span>
                )}
                {isSiteMenuOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Menu déroulant Tickets Site */}
          {isSiteMenuOpen && (
            <div className="mt-4 border-t border-stone-200/60 pt-4">
              {loadingSite ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                  <span className="ml-2 text-sm text-stone-500">Chargement...</span>
                </div>
              ) : ticketsSite.length === 0 ? (
                <div className="text-center py-4">
                  <Globe className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm text-stone-500">Aucun ticket réservé sur le site</p>
                  <button
                    onClick={loadTicketsSite}
                    className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1 mx-auto"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Actualiser
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50/80">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">N° Ticket</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Voyageur</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Trajet</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Classe</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-stone-600">Montant</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-stone-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/60">
                      {ticketsSite.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-stone-50 transition">
                          <td className="px-3 py-2 text-xs font-mono text-stone-600">{ticket.num_ticket || '---'}</td>
                          <td className="px-3 py-2 text-xs text-stone-700">{ticket.nom_voyageur}</td>
                          <td className="px-3 py-2 text-xs text-stone-600">{ticket.depart} → {ticket.arrivee}</td>
                          <td className="px-3 py-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              ticket.classe === '1ere' ? 'bg-yellow-100 text-yellow-800' : 'bg-stone-100 text-stone-600'
                            }`}>
                              {ticket.classe === '1ere' ? '1ère' : '2ème'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs font-medium text-emerald-600 text-right">
                            {ticket.montant.toLocaleString()} Ar
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleValiderTicketSite(ticket.id)}
                              disabled={validatingTicket === ticket.id || isTicketsFull}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                                validatingTicket === ticket.id || isTicketsFull
                                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {validatingTicket === ticket.id ? (
                                <Loader2 className="h-3 w-3 animate-spin inline" />
                              ) : (
                                'Valider'
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={loadTicketsSite}
                      className="text-xs text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Actualiser
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alertes */}
        {isTicketsFull && (
          <div className="mb-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <span>Le quota de tickets voyageurs est atteint pour ce voyage.</span>
          </div>
        )}

        {/* Formulaire + Aperçu - Single Page */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-stone-200/60 p-5">
            <h2 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-1.5">
              <Ticket className="h-4 w-4 text-amber-600" />
              Informations du voyageur
            </h2>

            {!isTicketsFull ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-0.5">Nom du voyageur *</label>
                  <input
                    type="text"
                    value={voyageurForm.nom}
                    onChange={(e) => {
                      setVoyageurForm({ ...voyageurForm, nom: e.target.value });
                      setShowCreatedTicket(false);
                      setLastCreatedTicket(null);
                    }}
                    className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-800 transition"
                    placeholder="Nom complet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-0.5">CIN *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={voyageurForm.cin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setVoyageurForm({ ...voyageurForm, cin: val });
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className="flex-1 px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-800 transition"
                      placeholder="12 chiffres"
                      required
                    />
                    <label className="flex items-center gap-1 text-xs text-stone-600 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={voyageurForm.mineur}
                        onChange={(e) => {
                          setVoyageurForm({ ...voyageurForm, mineur: e.target.checked });
                          setShowCreatedTicket(false);
                          setLastCreatedTicket(null);
                        }}
                        className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500 rounded"
                      />
                      Mineur
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-0.5">Arrivée *</label>
                  <select
                    value={voyageurForm.arrivee}
                    onChange={(e) => {
                      setVoyageurForm({ ...voyageurForm, arrivee: e.target.value });
                      setShowCreatedTicket(false);
                      setLastCreatedTicket(null);
                    }}
                    className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-800 transition"
                    required
                  >
                    <option value="">Sélectionner</option>
                    {availableGares.map(g => (
                      <option key={g.code} value={g.code}>
                        {g.code} - {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-0.5">Classe *</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setVoyageurForm({ ...voyageurForm, classe: '1ere' });
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      disabled={!is1ereAvailable || !voyageurForm.arrivee}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        voyageurForm.classe === '1ere' && is1ereAvailable && voyageurForm.arrivee
                          ? 'border-amber-600 bg-amber-50 text-amber-700'
                          : (!is1ereAvailable || !voyageurForm.arrivee)
                            ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      1ère {is1ereAvailable ? `(${places1ereDisponibles})` : '(Complet)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoyageurForm({ ...voyageurForm, classe: '2eme' });
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        voyageurForm.classe === '2eme'
                          ? 'border-amber-600 bg-amber-50 text-amber-700'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      2ème
                    </button>
                  </div>
                  {!is1ereAvailable && voyageurForm.arrivee && (
                    <p className="text-[10px] text-red-500 mt-0.5">1ère classe complète pour ce segment</p>
                  )}
                  {!voyageurForm.arrivee && (
                    <p className="text-[10px] text-amber-500 mt-0.5">Sélectionnez une destination</p>
                  )}
                </div>
                {voyageurForm.arrivee && tarifInfo && (
                  <div className="sm:col-span-2 bg-stone-50 rounded-lg p-2 border border-stone-200/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-600">Distance: {tarifInfo.distance} km</span>
                      <span className="font-bold text-amber-700">{montantVoyageur} Ar</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Lock className="h-10 w-10 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-500 font-medium text-sm">Quota atteint</p>
                <p className="text-xs text-stone-400">Le quota de tickets est atteint pour ce voyage</p>
              </div>
            )}

            <div className="border-t border-stone-200/60 pt-4 mt-4">
              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting || 
                  isTicketsFull ||
                  (voyageurForm.classe === '1ere' && !is1ereAvailable) ||
                  !voyageurForm.arrivee
                }
                className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
                  isSubmitting || 
                  isTicketsFull ||
                  (voyageurForm.classe === '1ere' && !is1ereAvailable) ||
                  !voyageurForm.arrivee
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-amber-500/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>En cours...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>VALIDER LE TICKET</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-5 sticky top-24">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                  <Printer className="h-4 w-4 text-amber-600" />
                  Aperçu du ticket
                </h3>
                {isDisplayCreated ? (
                  <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ Enregistré
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
                    ● En direct
                  </span>
                )}
              </div>

              <div className={`bg-linear-to-br from-amber-50 to-stone-50 rounded-xl border-2 ${isDisplayCreated ? 'border-emerald-400' : 'border-amber-200/60'} p-4 relative overflow-hidden transition-all duration-200`}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-700 via-stone-600 to-emerald-700" />
                
                <div className="text-center mb-2">
                  <div className="inline-block p-1 bg-amber-100 rounded-lg">
                    <Ticket className="h-4 w-4 text-amber-700" />
                  </div>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">DIATSARA - VBC</p>
                </div>

                <div className="text-center border-y border-dashed border-amber-200/60 py-1.5 mb-2">
                  <p className="text-xl font-mono font-bold text-stone-800 tracking-wider">
                    {displayNumTicket}
                  </p>
                  <p className="text-[9px] text-stone-400 uppercase tracking-widest">Ticket Voyageur</p>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Voyageur</span>
                    <span className="font-medium text-stone-800 truncate max-w-25 transition-all duration-200">
                      {displayNom || '---'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Trajet</span>
                    <span className="font-medium text-stone-800 transition-all duration-200">
                      {gare ? `${gare.code} → ${displayArrivee || '---'}` : '---'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Classe</span>
                    <span className={`font-medium transition-all duration-200 ${displayClasse === '1ere' ? 'text-yellow-700' : 'text-stone-700'}`}>
                      {displayClasse === '1ere' ? '1ère' : '2ème'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-amber-200/60 pt-1 mt-1">
                    <span className="text-stone-500 font-medium">Montant</span>
                    <span className="font-bold text-amber-700 transition-all duration-200">
                      {displayMontant} Ar
                    </span>
                  </div>
                  <div className="flex justify-between ">
                    <span className="text-stone-500">Date</span>
                    <span className="text-[10px] text-stone-400">
                      {new Date().toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-2 right-2">
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full transition-all duration-200 ${
                    isDisplayCreated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {isDisplayCreated ? '✓ ENREGISTRÉ' : '● APERÇU'}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-stone-400 text-center mt-2 transition-all duration-200">
                {isDisplayCreated ? '✓ Ticket enregistré avec succès' : 
                 (displayNom || displayArrivee) ? '✓ Aperçu en temps réel' : 'Remplissez le formulaire'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {popup.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`bg-white rounded-xl shadow-2xl max-w-md w-full p-5 transform transition-all animate-in fade-in zoom-in duration-200 ${
            popup.type === 'error' ? 'border-l-4 border-red-500' :
            popup.type === 'success' ? 'border-l-4 border-emerald-500' :
            popup.type === 'warning' ? 'border-l-4 border-amber-500' :
            'border-l-4 border-blue-500'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-full shrink-0 ${
                popup.type === 'error' ? 'bg-red-100 text-red-600' :
                popup.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                popup.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {popup.type === 'error' && <AlertCircle className="h-5 w-5" />}
                {popup.type === 'success' && <CheckCircle className="h-5 w-5" />}
                {popup.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
                {popup.type === 'info' && <AlertCircle className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-stone-800 text-sm">{popup.title}</h3>
                <p className="text-xs text-stone-600 mt-0.5">{popup.message}</p>
              </div>
              <button
                onClick={closePopup}
                className="p-1 hover:bg-stone-100 rounded-lg transition shrink-0"
              >
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={closePopup}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  popup.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  popup.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                  popup.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                  'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}