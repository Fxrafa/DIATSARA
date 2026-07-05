/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import { 
  ArrowLeft, Ticket, Package, Box, User, 
  MapPin, Train, Calendar, AlertCircle, Loader2,
  CheckCircle, Lock, AlertTriangle, Weight,
  Briefcase, X, Printer, Phone, UserCircle
} from 'lucide-react';
import { getVoyageDetailsRD, getTarifBagageColis, getLastTicketNumber } from '../../actions';

type TicketType = 'bagage' | 'colis';

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

export default function RDVentePage() {
  const params = useParams();
  const router = useRouter();
  const voyageId = params.id as string;

  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gare, setGare] = useState<Gare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState<TicketType>('bagage');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedTicket, setLastCreatedTicket] = useState<{
    num_ticket: string;
    type: string;
    nature: string;
    depart: string;
    arrivee: string;
    poids: number;
    volume: number;
    montant: number;
    nom_expediteur?: string;
    num_tel_expediteur?: string;
    nom_destinataire?: string;
    num_tel_destinataire?: string;
  } | null>(null);
  const [showCreatedTicket, setShowCreatedTicket] = useState(false);

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
    bagages_max: 0,
    bagages_vendus: 0,
  });

  // États des formulaires
  const [bagageForm, setBagageForm] = useState({
    nature: '',
    arrivee: '',
    usePoids: true,
    useVolume: false,
    poids: '15',
    volume: '0.1',
  });

  const [colisForm, setColisForm] = useState({
    nature: '',
    arrivee: '',
    usePoids: true,
    useVolume: false,
    poids: '15',
    volume: '0.1',
    nom_expediteur: '',
    num_tel_expediteur: '03',
    nom_destinataire: '',
    num_tel_destinataire: '03',
  });

  // Calculs des montants
  const [montantBagage, setMontantBagage] = useState(0);
  const [montantColis, setMontantColis] = useState(0);
  const [numTicketSequential, setNumTicketSequential] = useState(1);
  const [tarifKg, setTarifKg] = useState<{ tarif_vente: number; part_madarail: number } | null>(null);
  const [tarifM3, setTarifM3] = useState<{ tarif_vente: number; part_madarail: number } | null>(null);

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

  const getPoidsEquivalent = (poids: number, volume: number) => {
    return poids + (volume * 500);
  };

  const getBagageRestant = () => {
    return quotas.bagages_max - quotas.bagages_vendus;
  };

  const isBagagesFull = quotas.bagages_max > 0 && quotas.bagages_vendus >= quotas.bagages_max;

  const isPoidsDepasseQuotaBagage = () => {
    if (ticketType === 'bagage') {
      const restant = getBagageRestant();
      const poids = bagageForm.usePoids ? parseFloat(bagageForm.poids) || 0 : 0;
      const volume = bagageForm.useVolume ? parseFloat(bagageForm.volume) || 0 : 0;
      const poidsEquivalent = getPoidsEquivalent(poids, volume);
      return restant > 0 && poidsEquivalent > restant;
    }
    return false;
  };

  const isPoidsDepasseQuotaColis = () => {
    if (ticketType === 'colis') {
      const restant = getBagageRestant();
      const poids = colisForm.usePoids ? parseFloat(colisForm.poids) || 0 : 0;
      const volume = colisForm.useVolume ? parseFloat(colisForm.volume) || 0 : 0;
      const poidsEquivalent = getPoidsEquivalent(poids, volume);
      return restant > 0 && poidsEquivalent > restant;
    }
    return false;
  };

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

        const result = await getVoyageDetailsRD(voyageId);
        if (result.error) {
          showPopup('error', 'Erreur', result.error);
          setLoading(false);
          return;
        }
        setVoyage(result.voyage);
        if (result.quotas) {
          setQuotas(result.quotas);
        }

        const lastNum = await getLastTicketNumber(voyageId, profileData.gare_ref, 'B');
        setNumTicketSequential(lastNum);

        const kgResult = await getTarifBagageColis('kg');
        if (kgResult.tarif) {
          setTarifKg({
            tarif_vente: kgResult.tarif.tarif_vente,
            part_madarail: kgResult.tarif.part_madarail,
          });
        }

        const m3Result = await getTarifBagageColis('m3');
        if (m3Result.tarif) {
          setTarifM3({
            tarif_vente: m3Result.tarif.tarif_vente,
            part_madarail: m3Result.tarif.part_madarail,
          });
        }

      } catch (err) {
        console.error('Erreur:', err);
        showPopup('error', 'Erreur', 'Une erreur est survenue lors du chargement des données.');
      }

      setLoading(false);
    };

    fetchData();
  }, [voyageId]);

  // Calcul du montant bagage
  useEffect(() => {
    let montant = 0;
    const poids = bagageForm.usePoids ? parseFloat(bagageForm.poids) || 0 : 0;
    const volume = bagageForm.useVolume ? parseFloat(bagageForm.volume) || 0 : 0;

    if (tarifKg && poids > 0) {
      montant += poids * tarifKg.tarif_vente;
    }
    if (tarifM3 && volume > 0) {
      montant += volume * tarifM3.tarif_vente;
    }
    setMontantBagage(montant);
  }, [bagageForm.poids, bagageForm.volume, bagageForm.usePoids, bagageForm.useVolume, tarifKg, tarifM3]);

  // Calcul du montant colis
  useEffect(() => {
    let montant = 0;
    const poids = colisForm.usePoids ? parseFloat(colisForm.poids) || 0 : 0;
    const volume = colisForm.useVolume ? parseFloat(colisForm.volume) || 0 : 0;

    if (tarifKg && poids > 0) {
      montant += poids * tarifKg.tarif_vente;
    }
    if (tarifM3 && volume > 0) {
      montant += volume * tarifM3.tarif_vente;
    }
    setMontantColis(montant);
  }, [colisForm.poids, colisForm.volume, colisForm.usePoids, colisForm.useVolume, tarifKg, tarifM3]);

  // Formatage du numéro de téléphone
  const formatPhoneNumber = (value: string) => {
    let cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length === 0) return '03';
    
    if (!cleaned.startsWith('03')) {
      cleaned = '03' + cleaned.substring(2);
    }
    
    if (cleaned.length > 10) {
      cleaned = cleaned.substring(0, 10);
    }
    
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 5) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 8) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
    } else {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)}`;
    }
  };

  const handlePhoneChange = (field: 'expediteur' | 'destinataire', value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) {
      if (field === 'expediteur') {
        setColisForm({ ...colisForm, num_tel_expediteur: '03' });
      } else {
        setColisForm({ ...colisForm, num_tel_destinataire: '03' });
      }
      return;
    }
    
    const formatted = formatPhoneNumber(value);
    if (field === 'expediteur') {
      setColisForm({ ...colisForm, num_tel_expediteur: formatted });
    } else {
      setColisForm({ ...colisForm, num_tel_destinataire: formatted });
    }
  };

  // Handlers pour les checkbox poids/volume
  const handleBagagePoidsChange = (checked: boolean) => {
    if (checked) {
      setBagageForm({ ...bagageForm, usePoids: true, useVolume: false });
    } else {
      setBagageForm({ ...bagageForm, usePoids: false });
    }
  };

  const handleBagageVolumeChange = (checked: boolean) => {
    if (checked) {
      setBagageForm({ ...bagageForm, useVolume: true, usePoids: false });
    } else {
      setBagageForm({ ...bagageForm, useVolume: false });
    }
  };

  const handleColisPoidsChange = (checked: boolean) => {
    if (checked) {
      setColisForm({ ...colisForm, usePoids: true, useVolume: false });
    } else {
      setColisForm({ ...colisForm, usePoids: false });
    }
  };

  const handleColisVolumeChange = (checked: boolean) => {
    if (checked) {
      setColisForm({ ...colisForm, useVolume: true, usePoids: false });
    } else {
      setColisForm({ ...colisForm, useVolume: false });
    }
  };

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

  // Validation
  const validateBagage = () => {
    if (!bagageForm.nature.trim()) return 'Nature du bagage requise';
    if (!bagageForm.arrivee) return 'Arrivée requise';
    if (!bagageForm.usePoids && !bagageForm.useVolume) return 'Sélectionnez au moins un mode (Poids ou Volume)';
    
    const restant = getBagageRestant();
    const poids = bagageForm.usePoids ? parseFloat(bagageForm.poids) || 0 : 0;
    const volume = bagageForm.useVolume ? parseFloat(bagageForm.volume) || 0 : 0;
    const poidsEquivalent = getPoidsEquivalent(poids, volume);
    
    if (bagageForm.usePoids && poids <= 0) return 'Poids invalide';
    if (bagageForm.useVolume && volume <= 0) return 'Volume invalide';
    if (poidsEquivalent > restant) {
      return `Le poids équivalent (${poidsEquivalent.toFixed(1)} kg) dépasse le quota restant (${restant.toFixed(1)} kg)`;
    }
    return null;
  };

  const validateColis = () => {
    if (!colisForm.nature.trim()) return 'Nature du colis requise';
    if (!colisForm.arrivee) return 'Arrivée requise';
    if (!colisForm.usePoids && !colisForm.useVolume) return 'Sélectionnez au moins un mode (Poids ou Volume)';
    
    const restant = getBagageRestant();
    const poids = colisForm.usePoids ? parseFloat(colisForm.poids) || 0 : 0;
    const volume = colisForm.useVolume ? parseFloat(colisForm.volume) || 0 : 0;
    const poidsEquivalent = getPoidsEquivalent(poids, volume);
    
    if (colisForm.usePoids && poids <= 0) return 'Poids invalide';
    if (colisForm.useVolume && volume <= 0) return 'Volume invalide';
    if (poidsEquivalent > restant) {
      return `Le poids équivalent (${poidsEquivalent.toFixed(1)} kg) dépasse le quota restant (${restant.toFixed(1)} kg)`;
    }
    if (!colisForm.nom_expediteur.trim()) return 'Nom expéditeur requis';
    if (!colisForm.num_tel_expediteur.trim() || colisForm.num_tel_expediteur.replace(/\s/g, '').length < 10) return 'Téléphone expéditeur invalide (10 chiffres)';
    if (!colisForm.nom_destinataire.trim()) return 'Nom destinataire requis';
    if (!colisForm.num_tel_destinataire.trim() || colisForm.num_tel_destinataire.replace(/\s/g, '').length < 10) return 'Téléphone destinataire invalide (10 chiffres)';
    return null;
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

    if (isBagagesFull) {
      showPopup('error', 'Quota atteint', 'Le quota de bagages est atteint pour ce voyage.');
      return;
    }

    let validationError = null;
    if (ticketType === 'bagage') {
      validationError = validateBagage();
      if (validationError) {
        showPopup('error', 'Erreur de validation', validationError);
        return;
      }
    }

    if (ticketType === 'colis') {
      validationError = validateColis();
      if (validationError) {
        showPopup('error', 'Erreur de validation', validationError);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const gareRef = gare.num;
      const voyageIdStr = voyage.id;

      // Traitement du ticket bagage
      if (ticketType === 'bagage') {
        const poids = bagageForm.usePoids ? parseFloat(bagageForm.poids) || 0 : 0;
        const volume = bagageForm.useVolume ? parseFloat(bagageForm.volume) || 0 : 0;
        
        let montantBag = 0;
        let partMadarailBag = 0;

        if (tarifKg && poids > 0) {
          montantBag += poids * tarifKg.tarif_vente;
          partMadarailBag += poids * tarifKg.part_madarail;
        }
        if (tarifM3 && volume > 0) {
          montantBag += volume * tarifM3.tarif_vente;
          partMadarailBag += volume * tarifM3.part_madarail;
        }

        const poidsEquivalent = getPoidsEquivalent(poids, volume);
        const numTicket = generateTicketNumber('B');

        const { error: bagageError } = await supabase
          .from('ticket_bagage')
          .insert({
            num_ticket: numTicket,
            nature: bagageForm.nature.trim(),
            depart: gare.code,
            arrivee: bagageForm.arrivee,
            poids: poids || 0,
            volume: volume || 0,
            poids_volume: `${poids}kg / ${volume}m3`,
            montant: montantBag,
            part_madarail: partMadarailBag,
            voyage_id: voyageIdStr,
            gare_ref: gareRef,
          });

        if (bagageError) {
          console.error('Erreur ticket bagage:', bagageError);
          showPopup('error', 'Erreur', 'Erreur lors de la création du ticket bagage.');
          setIsSubmitting(false);
          return;
        }

        setLastCreatedTicket({
          num_ticket: numTicket,
          type: 'Bagage',
          nature: bagageForm.nature.trim(),
          depart: gare.code,
          arrivee: bagageForm.arrivee,
          poids: poids || 0,
          volume: volume || 0,
          montant: montantBag,
        });
        setShowCreatedTicket(true);

        setNumTicketSequential(numTicketSequential + 1);
        showPopup('success', 'Ticket créé !', `Ticket bagage ${numTicket} créé avec succès !`);

        setQuotas(prev => ({
          ...prev,
          bagages_vendus: prev.bagages_vendus + poidsEquivalent,
        }));

        // Ne pas réinitialiser le formulaire pour garder l'aperçu
      }

      // Traitement du ticket colis
      if (ticketType === 'colis') {
        const poids = colisForm.usePoids ? parseFloat(colisForm.poids) || 0 : 0;
        const volume = colisForm.useVolume ? parseFloat(colisForm.volume) || 0 : 0;
        
        let montantCol = 0;
        let partMadarailCol = 0;

        if (tarifKg && poids > 0) {
          montantCol += poids * tarifKg.tarif_vente;
          partMadarailCol += poids * tarifKg.part_madarail;
        }
        if (tarifM3 && volume > 0) {
          montantCol += volume * tarifM3.tarif_vente;
          partMadarailCol += volume * tarifM3.part_madarail;
        }

        const poidsEquivalent = getPoidsEquivalent(poids, volume);
        const numTicket = generateTicketNumber('C');

        const { error: colisError } = await supabase
          .from('ticket_colis')
          .insert({
            num_ticket: numTicket,
            nature: colisForm.nature.trim(),
            depart: gare.code,
            arrivee: colisForm.arrivee,
            poids: poids || 0,
            volume: volume || 0,
            poids_volume: `${poids}kg / ${volume}m3`,
            montant: montantCol,
            part_madarail: partMadarailCol,
            nom_expediteur: colisForm.nom_expediteur.trim(),
            num_tel_expediteur: colisForm.num_tel_expediteur,
            nom_destinataire: colisForm.nom_destinataire.trim(),
            num_tel_destinataire: colisForm.num_tel_destinataire,
            voyage_id: voyageIdStr,
            gare_ref: gareRef,
          });

        if (colisError) {
          console.error('Erreur ticket colis:', colisError);
          showPopup('error', 'Erreur', 'Erreur lors de la création du ticket colis.');
          setIsSubmitting(false);
          return;
        }

        setLastCreatedTicket({
          num_ticket: numTicket,
          type: 'Colis',
          nature: colisForm.nature.trim(),
          depart: gare.code,
          arrivee: colisForm.arrivee,
          poids: poids || 0,
          volume: volume || 0,
          montant: montantCol,
          nom_expediteur: colisForm.nom_expediteur.trim(),
          num_tel_expediteur: colisForm.num_tel_expediteur,
          nom_destinataire: colisForm.nom_destinataire.trim(),
          num_tel_destinataire: colisForm.num_tel_destinataire,
        });
        setShowCreatedTicket(true);

        setNumTicketSequential(numTicketSequential + 1);
        showPopup('success', 'Ticket créé !', `Ticket colis ${numTicket} créé avec succès !`);

        setQuotas(prev => ({
          ...prev,
          bagages_vendus: prev.bagages_vendus + poidsEquivalent,
        }));

        // Ne pas réinitialiser le formulaire pour garder l'aperçu
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
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
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

  const bagageRestant = getBagageRestant();
  const previewTicketNumber = generateTicketNumber(ticketType === 'bagage' ? 'B' : 'C');

  // Déterminer les valeurs pour le preview en temps réel
  const currentNature = ticketType === 'bagage' ? bagageForm.nature : colisForm.nature;
  const currentArrivee = ticketType === 'bagage' ? bagageForm.arrivee : colisForm.arrivee;
  const isPoidsUsed = ticketType === 'bagage' ? bagageForm.usePoids : colisForm.usePoids;
  const isVolumeUsed = ticketType === 'bagage' ? bagageForm.useVolume : colisForm.useVolume;
  const currentPoids = ticketType === 'bagage' ? bagageForm.poids : colisForm.poids;
  const currentVolume = ticketType === 'bagage' ? bagageForm.volume : colisForm.volume;
  const currentMontant = ticketType === 'bagage' ? montantBagage : montantColis;

  // Données spécifiques au colis
  const currentNomExpediteur = ticketType === 'colis' ? colisForm.nom_expediteur : '';
  const currentNumTelExpediteur = ticketType === 'colis' ? colisForm.num_tel_expediteur : '';
  const currentNomDestinataire = ticketType === 'colis' ? colisForm.nom_destinataire : '';
  const currentNumTelDestinataire = ticketType === 'colis' ? colisForm.num_tel_destinataire : '';

  // Utiliser les données du ticket créé ou les données en temps réel
  const displayNature = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.nature : currentNature;
  const displayArrivee = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.arrivee : currentArrivee;
  const displayPoids = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.poids : parseFloat(currentPoids) || 0;
  const displayVolume = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.volume : parseFloat(currentVolume) || 0;
  const displayMontant = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.montant : currentMontant;
  const displayNumTicket = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.num_ticket : previewTicketNumber;
  const displayType = showCreatedTicket && lastCreatedTicket ? lastCreatedTicket.type : (ticketType === 'bagage' ? 'Bagage' : 'Colis');
  const isDisplayCreated = showCreatedTicket && lastCreatedTicket;

  // Données colis pour l'affichage
  const displayNomExpediteur = showCreatedTicket && lastCreatedTicket ? (lastCreatedTicket.nom_expediteur || '') : currentNomExpediteur;
  const displayNumTelExpediteur = showCreatedTicket && lastCreatedTicket ? (lastCreatedTicket.num_tel_expediteur || '') : currentNumTelExpediteur;
  const displayNomDestinataire = showCreatedTicket && lastCreatedTicket ? (lastCreatedTicket.nom_destinataire || '') : currentNomDestinataire;
  const displayNumTelDestinataire = showCreatedTicket && lastCreatedTicket ? (lastCreatedTicket.num_tel_destinataire || '') : currentNumTelDestinataire;

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* En-tête */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/rd')}
              className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 transition text-sm mb-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <h1 className="text-xl font-serif font-bold text-stone-800">Déclaration de bagages et colis</h1>
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

        {/* Formulaire + Aperçu - Single Page */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Formulaire */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-stone-200/60 p-5">
            {/* Type de ticket */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-700 mb-2">Type de déclaration</label>
              <div className="flex gap-2 bg-stone-100 rounded-lg p-1 max-w-xs">
                <button
                  onClick={() => {
                    setTicketType('bagage');
                    setShowCreatedTicket(false);
                    setLastCreatedTicket(null);
                  }}
                  disabled={isBagagesFull}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    ticketType === 'bagage' && !isBagagesFull
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : isBagagesFull
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : 'text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Bagage
                </button>
                <button
                  onClick={() => {
                    setTicketType('colis');
                    setShowCreatedTicket(false);
                    setLastCreatedTicket(null);
                  }}
                  disabled={isBagagesFull}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    ticketType === 'colis' && !isBagagesFull
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : isBagagesFull
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : 'text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Box className="h-3.5 w-3.5" />
                  Colis
                </button>
              </div>
            </div>

            {/* Section Bagage */}
            {ticketType === 'bagage' && !isBagagesFull && (
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-blue-600" />
                  Ticket Bagage
                </h2>
                <div className="mb-2 text-xs text-stone-500">
                  Quota restant: <span className="font-bold text-blue-700">{bagageRestant.toFixed(1)} kg</span>
                  <span className="text-stone-400 ml-1">(1m³ = 500kg équivalent)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Nature *</label>
                    <input
                      type="text"
                      value={bagageForm.nature}
                      onChange={(e) => {
                        setBagageForm({ ...bagageForm, nature: e.target.value });
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition"
                      placeholder="Sac, valise..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Arrivée *</label>
                    <select
                      value={bagageForm.arrivee}
                      onChange={(e) => {
                        setBagageForm({ ...bagageForm, arrivee: e.target.value });
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition"
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
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Poids (kg)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={bagageForm.usePoids}
                        onChange={(e) => {
                          handleBagagePoidsChange(e.target.checked);
                          setShowCreatedTicket(false);
                          setLastCreatedTicket(null);
                        }}
                        className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 rounded"
                      />
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <Weight className="h-3.5 w-3.5 text-stone-400" />
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={bagageForm.poids}
                          onChange={(e) => {
                            setBagageForm({ ...bagageForm, poids: e.target.value });
                            setShowCreatedTicket(false);
                            setLastCreatedTicket(null);
                          }}
                          disabled={!bagageForm.usePoids}
                          className={`w-full pl-7 pr-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition ${
                            !bagageForm.usePoids ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200' : 'bg-stone-50 border-stone-200'
                          }`}
                          placeholder="15.0"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Volume (m3)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={bagageForm.useVolume}
                        onChange={(e) => {
                          handleBagageVolumeChange(e.target.checked);
                          setShowCreatedTicket(false);
                          setLastCreatedTicket(null);
                        }}
                        className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 rounded"
                      />
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <Box className="h-3.5 w-3.5 text-stone-400" />
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={bagageForm.volume}
                          onChange={(e) => {
                            setBagageForm({ ...bagageForm, volume: e.target.value });
                            setShowCreatedTicket(false);
                            setLastCreatedTicket(null);
                          }}
                          disabled={!bagageForm.useVolume}
                          className={`w-full pl-7 pr-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition ${
                            !bagageForm.useVolume ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200' : 'bg-stone-50 border-stone-200'
                          }`}
                          placeholder="0.1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {(bagageForm.usePoids || bagageForm.useVolume) && (bagageForm.poids || bagageForm.volume) && (
                  <div className="mt-2 bg-blue-50/80 rounded-lg p-2 border border-blue-200/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-600">Poids équivalent:</span>
                      <span className="font-bold text-blue-700">
                        {getPoidsEquivalent(
                          bagageForm.usePoids ? parseFloat(bagageForm.poids) || 0 : 0,
                          bagageForm.useVolume ? parseFloat(bagageForm.volume) || 0 : 0
                        ).toFixed(1)} kg
                      </span>
                      <span className="text-stone-600">|</span>
                      <span className="text-stone-600">Montant:</span>
                      <span className="font-bold text-blue-700">{montantBagage} Ar</span>
                    </div>
                  </div>
                )}
                {isPoidsDepasseQuotaBagage() && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-red-600 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Dépasse le quota restant ({bagageRestant.toFixed(1)} kg)</span>
                  </div>
                )}
              </div>
            )}

            {/* Section Colis */}
            {ticketType === 'colis' && !isBagagesFull && (
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-1.5">
                  <Box className="h-4 w-4 text-purple-600" />
                  Ticket Colis
                </h2>
                <div className="mb-2 text-xs text-stone-500">
                  Quota restant: <span className="font-bold text-purple-700">{bagageRestant.toFixed(1)} kg</span>
                  <span className="text-stone-400 ml-1">(1m³ = 500kg équivalent)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Nature *</label>
                    <input
                      type="text"
                      value={colisForm.nature}
                      onChange={(e) => {
                        setColisForm({ ...colisForm, nature: e.target.value });
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition"
                      placeholder="Nature du colis"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Arrivée *</label>
                    <select
                      value={colisForm.arrivee}
                      onChange={(e) => {
                        setColisForm({ ...colisForm, arrivee: e.target.value });
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition"
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
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Poids (kg)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={colisForm.usePoids}
                        onChange={(e) => {
                          handleColisPoidsChange(e.target.checked);
                          setShowCreatedTicket(false);
                          setLastCreatedTicket(null);
                        }}
                        className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 rounded"
                      />
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <Weight className="h-3.5 w-3.5 text-stone-400" />
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={colisForm.poids}
                          onChange={(e) => {
                            setColisForm({ ...colisForm, poids: e.target.value });
                            setShowCreatedTicket(false);
                            setLastCreatedTicket(null);
                          }}
                          disabled={!colisForm.usePoids}
                          className={`w-full pl-7 pr-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition ${
                            !colisForm.usePoids ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200' : 'bg-stone-50 border-stone-200'
                          }`}
                          placeholder="15.0"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Volume (m3)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={colisForm.useVolume}
                        onChange={(e) => {
                          handleColisVolumeChange(e.target.checked);
                          setShowCreatedTicket(false);
                          setLastCreatedTicket(null);
                        }}
                        className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 rounded"
                      />
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <Box className="h-3.5 w-3.5 text-stone-400" />
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={colisForm.volume}
                          onChange={(e) => {
                            setColisForm({ ...colisForm, volume: e.target.value });
                            setShowCreatedTicket(false);
                            setLastCreatedTicket(null);
                          }}
                          disabled={!colisForm.useVolume}
                          className={`w-full pl-7 pr-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition ${
                            !colisForm.useVolume ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200' : 'bg-stone-50 border-stone-200'
                          }`}
                          placeholder="0.1"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Nom expéditeur *</label>
                    <input
                      type="text"
                      value={colisForm.nom_expediteur}
                      onChange={(e) => {
                        setColisForm({ ...colisForm, nom_expediteur: e.target.value });
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition"
                      placeholder="Nom complet"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Tél. expéditeur *</label>
                    <input
                      type="text"
                      value={colisForm.num_tel_expediteur}
                      onChange={(e) => {
                        handlePhoneChange('expediteur', e.target.value);
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition"
                      placeholder="03X XX XXX XX"
                      required
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Nom destinataire *</label>
                    <input
                      type="text"
                      value={colisForm.nom_destinataire}
                      onChange={(e) => {
                        setColisForm({ ...colisForm, nom_destinataire: e.target.value });
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition"
                      placeholder="Nom complet"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-0.5">Tél. destinataire *</label>
                    <input
                      type="text"
                      value={colisForm.num_tel_destinataire}
                      onChange={(e) => {
                        handlePhoneChange('destinataire', e.target.value);
                        setShowCreatedTicket(false);
                        setLastCreatedTicket(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800 transition"
                      placeholder="03X XX XXX XX"
                      required
                      maxLength={14}
                    />
                  </div>
                </div>
                {(colisForm.usePoids || colisForm.useVolume) && (colisForm.poids || colisForm.volume) && (
                  <div className="mt-2 bg-purple-50/80 rounded-lg p-2 border border-purple-200/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-600">Poids équivalent:</span>
                      <span className="font-bold text-purple-700">
                        {getPoidsEquivalent(
                          colisForm.usePoids ? parseFloat(colisForm.poids) || 0 : 0,
                          colisForm.useVolume ? parseFloat(colisForm.volume) || 0 : 0
                        ).toFixed(1)} kg
                      </span>
                      <span className="text-stone-600">|</span>
                      <span className="text-stone-600">Montant:</span>
                      <span className="font-bold text-purple-700">{montantColis} Ar</span>
                    </div>
                  </div>
                )}
                {isPoidsDepasseQuotaColis() && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-red-600 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Dépasse le quota restant ({bagageRestant.toFixed(1)} kg)</span>
                  </div>
                )}
              </div>
            )}

            {/* Bouton Valider - réduit */}
            <div className="border-t border-stone-200/60 pt-4">
              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting || 
                  isBagagesFull ||
                  (ticketType === 'bagage' && isPoidsDepasseQuotaBagage()) ||
                  (ticketType === 'colis' && isPoidsDepasseQuotaColis())
                }
                className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
                  isSubmitting || 
                  isBagagesFull ||
                  (ticketType === 'bagage' && isPoidsDepasseQuotaBagage()) ||
                  (ticketType === 'colis' && isPoidsDepasseQuotaColis())
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-500/30'
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
                    <span>VALIDER LA DÉCLARATION</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Aperçu du ticket + Quota en bas - Mise à jour en temps réel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-5 sticky top-24">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                  <Printer className="h-4 w-4 text-indigo-600" />
                  Aperçu du ticket
                </h3>
                {isDisplayCreated ? (
                  <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ Enregistré
                  </span>
                ) : (
                  <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                    ● En direct
                  </span>
                )}
              </div>

              {/* Ticket stylisé - Mise à jour en temps réel */}
              <div className={`bg-linear-to-br from-indigo-50 to-stone-50 rounded-xl border-2 ${isDisplayCreated ? 'border-emerald-400' : 'border-indigo-200/60'} p-4 relative overflow-hidden transition-all duration-200`}>
                {/* Bande décorative */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-indigo-700 via-stone-600 to-purple-700" />
                
                <div className="text-center mb-2">
                  <div className="inline-block p-1 bg-indigo-100 rounded-lg">
                    {ticketType === 'bagage' ? (
                      <Package className="h-4 w-4 text-indigo-700" />
                    ) : (
                      <Box className="h-4 w-4 text-purple-700" />
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">DIATSARA - RD</p>
                </div>

                <div className="text-center border-y border-dashed border-indigo-200/60 py-1.5 mb-2">
                  <p className="text-xl font-mono font-bold text-stone-800 tracking-wider">
                    {displayNumTicket}
                  </p>
                  <p className="text-[9px] text-stone-400 uppercase tracking-widest">
                    {displayType}
                  </p>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Nature</span>
                    <span className="font-medium text-stone-800 truncate max-w-25 transition-all duration-200">
                      {displayNature || '---'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Trajet</span>
                    <span className="font-medium text-stone-800 transition-all duration-200">
                      {gare ? `${gare.code} → ${displayArrivee || '---'}` : '---'}
                    </span>
                  </div>
                  
                  {/* Afficher seulement les informations pertinentes selon les checkbox */}
                  {isPoidsUsed && (
                    <div className="flex justify-between transition-all duration-200">
                      <span className="text-stone-500">Poids</span>
                      <span className="font-medium text-stone-800">
                        {displayPoids} kg
                      </span>
                    </div>
                  )}
                  {isVolumeUsed && (
                    <div className="flex justify-between transition-all duration-200">
                      <span className="text-stone-500">Volume</span>
                      <span className="font-medium text-stone-800">
                        {displayVolume} m³
                      </span>
                    </div>
                  )}
                  {!isPoidsUsed && !isVolumeUsed && (
                    <div className="flex justify-between">
                      <span className="text-stone-500 italic">Aucune dimension</span>
                    </div>
                  )}
                  
                  {/* Afficher les informations du colis si c'est un colis */}
                  {ticketType === 'colis' && (
                    <>
                      <div className="border-t border-indigo-100/60 pt-1 mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-medium">
                          <UserCircle className="h-3 w-3" />
                          Expéditeur
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Nom</span>
                          <span className="font-medium text-stone-800 truncate max-w-25">
                            {displayNomExpediteur || '---'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Tél.</span>
                          <span className="font-medium text-stone-800 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-stone-400" />
                            {displayNumTelExpediteur || '---'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[10px] text-purple-600 font-medium">
                          <UserCircle className="h-3 w-3" />
                          Destinataire
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Nom</span>
                          <span className="font-medium text-stone-800 truncate max-w-25">
                            {displayNomDestinataire || '---'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Tél.</span>
                          <span className="font-medium text-stone-800 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-stone-400" />
                            {displayNumTelDestinataire || '---'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  
                <div className="flex justify-between border-t border-indigo-200/60 pt-1 mt-1 mb-2">
                  <span className="text-stone-500 font-medium">Montant</span>
                  <span className="font-bold text-indigo-700">
                    {lastCreatedTicket ? lastCreatedTicket.montant : 
                    ticketType === 'bagage' ? montantBagage : montantColis} Ar
                  </span>
                </div>
                </div>

                {/* Badge de statut */}
                <div className="absolute bottom-2 right-2">
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full transition-all duration-200 ${
                    isDisplayCreated ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {isDisplayCreated ? '✓ ENREGISTRÉ' : '● APERÇU'}
                  </span>
                </div>
              </div>

              {/* Quota Bagages - en bas du preview */}
              <div className="mt-3 bg-indigo-50/80 rounded-lg p-3 border border-indigo-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-xs font-medium text-stone-700">Quota Bagages</span>
                  </div>
                  <div className="text-xs font-bold text-stone-800">
                    {quotas.bagages_vendus.toFixed(1)} / {quotas.bagages_max} kg
                  </div>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5 mt-1">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${isBagagesFull ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${quotas.bagages_max > 0 ? (quotas.bagages_vendus / quotas.bagages_max) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between mt-0.5 text-[10px] text-stone-500">
                  <span>Restant: {(quotas.bagages_max - quotas.bagages_vendus).toFixed(1)} kg</span>
                  {isBagagesFull && <span className="text-red-600 font-medium">COMPLET</span>}
                </div>
              </div>

              <p className="text-[10px] text-stone-400 text-center mt-2 transition-all duration-200">
                {isDisplayCreated ? '✓ Ticket enregistré avec succès' : 
                 (displayNature || displayArrivee) ? '✓ Aperçu en temps réel' : 'Remplissez le formulaire'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Popup */}
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