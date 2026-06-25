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
  Briefcase
} from 'lucide-react';
import { getVoyageDetails, getTarif, getLastTicketNumber, getTarifBagageColis } from '@/app/vbc/actions';

type TicketType = 'voyageur' | 'voyageur_bagage' | 'bagage' | 'colis';

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

export default function VentePage() {
  const params = useParams();
  const router = useRouter();
  const voyageId = params.id as string;

  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gare, setGare] = useState<Gare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState<TicketType>('voyageur');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quotas
  const [quotas, setQuotas] = useState({
    tickets_max: 0,
    tickets_vendus: 0,
    bagages_max: 0,
    bagages_vendus: 0,
  });

  // Places disponibles par classe
  const [places, setPlaces] = useState({
    places_1ere: 0,
    places_2eme: 0,
  });

  // États des formulaires
  const [voyageurForm, setVoyageurForm] = useState({
    nom: '',
    cin: '',
    mineur: false,
    arrivee: '',
    classe: '2eme',
  });

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
  const [tarifInfo, setTarifInfo] = useState<{ tarif_1ere: number; tarif_2eme: number; distance: number } | null>(null);
  const [montantVoyageur, setMontantVoyageur] = useState(0);
  const [montantBagage, setMontantBagage] = useState(0);
  const [montantColis, setMontantColis] = useState(0);
  const [montantTotal, setMontantTotal] = useState(0);
  const [numTicketSequential, setNumTicketSequential] = useState(1);
  const [tarifKg, setTarifKg] = useState<{ tarif_vente: number; part_madarail: number } | null>(null);
  const [tarifM3, setTarifM3] = useState<{ tarif_vente: number; part_madarail: number } | null>(null);

  // Fonction pour calculer le poids équivalent (poids + volume * 500) - utilisé uniquement pour le quota
  const getPoidsEquivalent = (poids: number, volume: number) => {
    return poids + (volume * 500);
  };

  // Calcul du quota restant pour les bagages
  const getBagageRestant = () => {
    return quotas.bagages_max - quotas.bagages_vendus;
  };

  // Vérifier si les quotas sont atteints
  const isTicketsFull = quotas.tickets_max > 0 && quotas.tickets_vendus >= quotas.tickets_max;
  const isBagagesFull = quotas.bagages_max > 0 && quotas.bagages_vendus >= quotas.bagages_max;

  // Vérifier si les classes sont pleines
  const is1ereFull = places.places_1ere <= 0;
  const is2emeFull = places.places_2eme <= 0;
  const isAllClassesFull = is1ereFull && is2emeFull;

  // Vérifier si le poids dépasse le quota restant pour le bagage
  const isPoidsDepasseQuotaBagage = () => {
    if (ticketType === 'bagage' || ticketType === 'voyageur_bagage') {
      const restant = getBagageRestant();
      const poids = bagageForm.usePoids ? parseFloat(bagageForm.poids) || 0 : 0;
      const volume = bagageForm.useVolume ? parseFloat(bagageForm.volume) || 0 : 0;
      const poidsEquivalent = getPoidsEquivalent(poids, volume);
      return restant > 0 && poidsEquivalent > restant;
    }
    return false;
  };

  // Vérifier si le poids dépasse le quota restant pour le colis
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

    // Si la gare du VBC n'est pas sur le trajet, il ne peut pas vendre
    if (currentIndex < Math.min(departIndex, arriveeIndex) || currentIndex > Math.max(departIndex, arriveeIndex)) {
      return [];
    }

    // Sens impair (2131): direction MGA -> MNG (Nord)
    if (voyage.sens === '2131') {
      // Le VBC doit être avant l'arrivée
      if (currentIndex >= arriveeIndex) {
        return [];
      }
      // Gares après la gare du VBC jusqu'à l'arrivée (exclure la gare actuelle)
      return allGares.slice(currentIndex + 1, arriveeIndex + 1);
    } 
    // Sens pair (2132): direction MNG -> MGA (Sud)
    else {
      // Pour le sens pair (Sud), le VBC vend vers les gares avant lui (vers le Sud)
      // Le VBC doit être après le départ
      if (currentIndex <= departIndex) {
        return [];
      }
      // Gares entre le départ et la gare du VBC (exclure la gare actuelle)
      return allGares.slice(departIndex, currentIndex);
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
          setError('Non authentifié');
          setLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileData) {
          setError('Profil non trouvé');
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
          setError(result.error);
          setLoading(false);
          return;
        }
        setVoyage(result.voyage);
        if (result.quotas) {
          setQuotas(result.quotas);
        }
        if (result.places) {
          setPlaces(result.places);
        }

        const lastNum = await getLastTicketNumber(voyageId, profileData.gare_ref);
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
        setError('Erreur lors du chargement des données');
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

  // Calcul du montant bagage (avec tarifs séparés pour poids et volume)
  useEffect(() => {
    let montant = 0;
    const poids = bagageForm.usePoids ? parseFloat(bagageForm.poids) || 0 : 0;
    const volume = bagageForm.useVolume ? parseFloat(bagageForm.volume) || 0 : 0;

    // Prix basé sur les tarifs réels de la base de données
    if (tarifKg && poids > 0) {
      montant += poids * tarifKg.tarif_vente;
    }
    if (tarifM3 && volume > 0) {
      montant += volume * tarifM3.tarif_vente;
    }
    setMontantBagage(montant);
  }, [bagageForm.poids, bagageForm.volume, bagageForm.usePoids, bagageForm.useVolume, tarifKg, tarifM3]);

  // Calcul du montant colis (avec tarifs séparés pour poids et volume)
  useEffect(() => {
    let montant = 0;
    const poids = colisForm.usePoids ? parseFloat(colisForm.poids) || 0 : 0;
    const volume = colisForm.useVolume ? parseFloat(colisForm.volume) || 0 : 0;

    // Prix basé sur les tarifs réels de la base de données
    if (tarifKg && poids > 0) {
      montant += poids * tarifKg.tarif_vente;
    }
    if (tarifM3 && volume > 0) {
      montant += volume * tarifM3.tarif_vente;
    }
    setMontantColis(montant);
  }, [colisForm.poids, colisForm.volume, colisForm.usePoids, colisForm.useVolume, tarifKg, tarifM3]);

  // Calcul du montant total pour Voyageur + Bagage
  useEffect(() => {
    if (ticketType === 'voyageur_bagage') {
      setMontantTotal(montantVoyageur + montantBagage);
    } else {
      setMontantTotal(0);
    }
  }, [montantVoyageur, montantBagage, ticketType]);

  // Formatage du numéro de téléphone (03X XX XXX XX)
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

  // Handlers pour les checkbox poids/volume (s'excluent mutuellement)
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

  // Validation des formulaires
  const validateVoyageur = () => {
    if (!voyageurForm.nom.trim()) return 'Nom du voyageur requis';
    if (!voyageurForm.cin.trim() || voyageurForm.cin.length !== 12) return 'CIN doit contenir 12 chiffres';
    if (!voyageurForm.arrivee) return 'Arrivée requise';
    if (voyageurForm.classe === '1ere' && is1ereFull) return '1ère classe complète';
    if (voyageurForm.classe === '2eme' && is2emeFull) return '2ème classe complète';
    return null;
  };

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

    if (!voyage || !profile || !gare) {
      setError('Données manquantes');
      return;
    }

    // Vérifier les quotas
    if (ticketType === 'voyageur' || ticketType === 'voyageur_bagage') {
      if (isTicketsFull) {
        setError('Quota de tickets voyageurs atteint pour ce voyage');
        return;
      }
      if (is1ereFull && voyageurForm.classe === '1ere') {
        setError('1ère classe complète');
        return;
      }
      if (is2emeFull && voyageurForm.classe === '2eme') {
        setError('2ème classe complète');
        return;
      }
    }

    if (ticketType === 'bagage' || ticketType === 'voyageur_bagage' || ticketType === 'colis') {
      if (isBagagesFull) {
        setError('Quota de bagages atteint pour ce voyage');
        return;
      }
      
      const restant = getBagageRestant();
      let poidsEquivalent = 0;
      if (ticketType === 'bagage' || ticketType === 'voyageur_bagage') {
        const poids = bagageForm.usePoids ? parseFloat(bagageForm.poids) || 0 : 0;
        const volume = bagageForm.useVolume ? parseFloat(bagageForm.volume) || 0 : 0;
        poidsEquivalent = getPoidsEquivalent(poids, volume);
      } else if (ticketType === 'colis') {
        const poids = colisForm.usePoids ? parseFloat(colisForm.poids) || 0 : 0;
        const volume = colisForm.useVolume ? parseFloat(colisForm.volume) || 0 : 0;
        poidsEquivalent = getPoidsEquivalent(poids, volume);
      }
      
      if (poidsEquivalent > restant) {
        setError(`Le poids équivalent (${poidsEquivalent.toFixed(1)} kg) dépasse le quota restant (${restant.toFixed(1)} kg)`);
        return;
      }
    }

    let validationError = null;
    if (ticketType === 'voyageur' || ticketType === 'voyageur_bagage') {
      validationError = validateVoyageur();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (ticketType === 'bagage' || ticketType === 'voyageur_bagage') {
      validationError = validateBagage();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (ticketType === 'colis') {
      validationError = validateColis();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const gareRef = gare.num;
      const voyageIdStr = voyage.id;

      const departCode = gare.code;
      const arriveeCode = ticketType === 'voyageur' || ticketType === 'voyageur_bagage' 
        ? voyageurForm.arrivee 
        : bagageForm.arrivee || colisForm.arrivee;
      
      const canton = `${departCode}-${arriveeCode}`;
      const tarifResult = await getTarif(canton);
      
      let montant = 0;
      let partMadarail = 0;

      // Traitement du ticket voyageur
      if (ticketType === 'voyageur' || ticketType === 'voyageur_bagage') {
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
          });

        if (ticketError) {
          console.error('Erreur ticket voyageur:', ticketError);
          setError('Erreur lors de la création du ticket voyageur');
          setIsSubmitting(false);
          return;
        }

        setNumTicketSequential(numTicketSequential + 1);
        setSuccess(`Ticket voyageur ${numTicket} créé avec succès !`);
      }

      // Traitement du ticket bagage
      if (ticketType === 'bagage' || ticketType === 'voyageur_bagage') {
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
            nature: bagageForm.nature,
            depart: gare.code,
            arrivee: bagageForm.arrivee,
            poids: poids,
            volume: volume,
            poids_volume: `${poids}kg / ${volume}m3`,
            montant: montantBag,
            part_madarail: partMadarailBag,
            voyage_id: voyageIdStr,
            gare_ref: gareRef,
          });

        if (bagageError) {
          console.error('Erreur ticket bagage:', bagageError);
          setError('Erreur lors de la création du ticket bagage');
          setIsSubmitting(false);
          return;
        }

        setNumTicketSequential(numTicketSequential + 1);
        setSuccess(`Ticket bagage ${numTicket} créé avec succès !`);

        setQuotas(prev => ({
          ...prev,
          bagages_vendus: prev.bagages_vendus + poidsEquivalent,
        }));
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
            nature: colisForm.nature,
            depart: gare.code,
            arrivee: colisForm.arrivee,
            poids: poids,
            volume: volume,
            poids_volume: `${poids}kg / ${volume}m3`,
            montant: montantCol,
            part_madarail: partMadarailCol,
            nom_expediteur: colisForm.nom_expediteur,
            num_tel_expediteur: colisForm.num_tel_expediteur,
            nom_destinataire: colisForm.nom_destinataire,
            num_tel_destinataire: colisForm.num_tel_destinataire,
            voyage_id: voyageIdStr,
            gare_ref: gareRef,
          });

        if (colisError) {
          console.error('Erreur ticket colis:', colisError);
          setError('Erreur lors de la création du ticket colis');
          setIsSubmitting(false);
          return;
        }

        setNumTicketSequential(numTicketSequential + 1);
        setSuccess(`Ticket colis ${numTicket} créé avec succès !`);

        setQuotas(prev => ({
          ...prev,
          bagages_vendus: prev.bagages_vendus + poidsEquivalent,
        }));
      }

      // Réinitialiser les formulaires
      setVoyageurForm({ nom: '', cin: '', mineur: false, arrivee: '', classe: '2eme' });
      setBagageForm({ nature: '', arrivee: '', usePoids: true, useVolume: false, poids: '15', volume: '0.1' });
      setColisForm({ 
        nature: '', arrivee: '', usePoids: true, useVolume: false, poids: '15', volume: '0.1',
        nom_expediteur: '', num_tel_expediteur: '03',
        nom_destinataire: '', num_tel_destinataire: '03'
      });

      if (ticketType === 'voyageur' || ticketType === 'voyageur_bagage') {
        setQuotas(prev => ({
          ...prev,
          tickets_vendus: prev.tickets_vendus + 1,
        }));
        if (voyageurForm.classe === '1ere') {
          setPlaces(prev => ({
            ...prev,
            places_1ere: prev.places_1ere - 1,
          }));
        } else {
          setPlaces(prev => ({
            ...prev,
            places_2eme: prev.places_2eme - 1,
          }));
        }
      }

    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la création du ticket');
    }

    setIsSubmitting(false);
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

  if (error || !voyage || !profile || !gare) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Données manquantes'}
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

  const bagageRestant = getBagageRestant();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/vbc')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Vente de tickets</h1>
            <p className="text-gray-600">
              {voyage.gare_depart_detail?.code} → {voyage.gare_arrivee_detail?.code} • 
              {new Date(voyage.date_voyage).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Gare: {gare.code} - {gare.gare}</p>
            <p>PK: {gare.pk}</p>
          </div>
        </div>

        {/* Quotas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${isTicketsFull ? 'border-red-500' : 'border-green-500'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Quota Tickets Voyageurs</p>
                <p className="text-lg font-bold">
                  {quotas.tickets_vendus} / {quotas.tickets_max}
                </p>
              </div>
              {isTicketsFull ? (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <Lock className="h-4 w-4" />
                  <span>Complet</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Ticket className="h-4 w-4" />
                  <span>{quotas.tickets_max - quotas.tickets_vendus} restants</span>
                </div>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${isTicketsFull ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${quotas.tickets_max > 0 ? (quotas.tickets_vendus / quotas.tickets_max) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${isBagagesFull ? 'border-red-500' : 'border-blue-500'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Quota Bagages (poids équivalent)</p>
                <p className="text-lg font-bold">
                  {quotas.bagages_vendus.toFixed(1)} / {quotas.bagages_max} kg
                </p>
              </div>
              {isBagagesFull ? (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <Lock className="h-4 w-4" />
                  <span>Complet</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-blue-600 text-sm">
                  <Package className="h-4 w-4" />
                  <span>{(quotas.bagages_max - quotas.bagages_vendus).toFixed(1)} kg restants</span>
                </div>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${isBagagesFull ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${quotas.bagages_max > 0 ? (quotas.bagages_vendus / quotas.bagages_max) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Alertes de quotas atteints */}
        {isTicketsFull && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span>Le quota de tickets voyageurs est atteint pour ce voyage. Vous ne pouvez plus vendre de tickets voyageurs.</span>
          </div>
        )}
        {isBagagesFull && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span>Le quota de bagages est atteint pour ce voyage. Vous ne pouvez plus vendre de tickets bagages.</span>
          </div>
        )}
        {isAllClassesFull && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span>Toutes les classes sont complètes pour ce voyage.</span>
          </div>
        )}

        {/* Type de ticket - Toggle Switch */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Type de ticket</label>
          <div className="flex flex-wrap gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTicketType('voyageur')}
              disabled={isTicketsFull || isAllClassesFull}
              className={`flex-1 min-w-25 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
                ticketType === 'voyageur' && !isTicketsFull && !isAllClassesFull
                  ? 'bg-orange-600 text-white shadow-lg'
                  : isTicketsFull || isAllClassesFull
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <User className="h-4 w-4" />
              Voyageur
            </button>
            <button
              onClick={() => setTicketType('bagage')}
              disabled={isBagagesFull}
              className={`flex-1 min-w-25 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
                ticketType === 'bagage' && !isBagagesFull
                  ? 'bg-orange-600 text-white shadow-lg'
                  : isBagagesFull
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Package className="h-4 w-4" />
              Bagage
            </button>
            <button
              onClick={() => setTicketType('voyageur_bagage')}
              disabled={isTicketsFull || isBagagesFull || isAllClassesFull}
              className={`flex-1 min-w-30 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
                ticketType === 'voyageur_bagage' && !isTicketsFull && !isBagagesFull && !isAllClassesFull
                  ? 'bg-orange-600 text-white shadow-lg'
                  : isTicketsFull || isBagagesFull || isAllClassesFull
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Voyageur + Bagage
            </button>
            <button
              onClick={() => setTicketType('colis')}
              disabled={isBagagesFull}
              className={`flex-1 min-w-25 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
                ticketType === 'colis' && !isBagagesFull
                  ? 'bg-orange-600 text-white shadow-lg'
                  : isBagagesFull
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Box className="h-4 w-4" />
              Colis
            </button>
          </div>
        </div>

        {/* Messages */}
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

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Section Voyageur */}
          {(ticketType === 'voyageur' || ticketType === 'voyageur_bagage') && !isTicketsFull && !isAllClassesFull && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-orange-600" />
                Ticket Voyageur
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du voyageur *</label>
                  <input
                    type="text"
                    value={voyageurForm.nom}
                    onChange={(e) => setVoyageurForm({ ...voyageurForm, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                    placeholder="Nom complet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CIN *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={voyageurForm.cin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setVoyageurForm({ ...voyageurForm, cin: val });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                      placeholder="12 chiffres"
                      required
                    />
                    <label className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={voyageurForm.mineur}
                        onChange={(e) => setVoyageurForm({ ...voyageurForm, mineur: e.target.checked })}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                      />
                      Mineur
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrivée *</label>
                  <select
                    value={voyageurForm.arrivee}
                    onChange={(e) => setVoyageurForm({ ...voyageurForm, arrivee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Classe *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVoyageurForm({ ...voyageurForm, classe: '1ere' })}
                      disabled={is1ereFull}
                      className={`flex-1 px-4 py-2 rounded-lg border transition ${
                        voyageurForm.classe === '1ere' && !is1ereFull
                          ? 'border-orange-600 bg-orange-50 text-orange-700 font-medium'
                          : is1ereFull
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      1ère {is1ereFull ? '(Complet)' : `(${places.places_1ere} dispo)`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoyageurForm({ ...voyageurForm, classe: '2eme' })}
                      disabled={is2emeFull}
                      className={`flex-1 px-4 py-2 rounded-lg border transition ${
                        voyageurForm.classe === '2eme' && !is2emeFull
                          ? 'border-orange-600 bg-orange-50 text-orange-700 font-medium'
                          : is2emeFull
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      2ème {is2emeFull ? '(Complet)' : `(${places.places_2eme} dispo)`}
                    </button>
                  </div>
                  {(is1ereFull || is2emeFull) && (
                    <p className="text-xs text-red-500 mt-1">
                      {is1ereFull && is2emeFull ? 'Toutes les classes sont complètes' : 
                       is1ereFull ? '1ère classe complète' : '2ème classe complète'}
                    </p>
                  )}
                </div>
                {voyageurForm.arrivee && tarifInfo && (
                  <div className="md:col-span-2 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Distance: {tarifInfo.distance} km</span>
                      <span className="text-sm font-bold text-orange-700">Montant: {montantVoyageur} Ar</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section Bagage */}
          {(ticketType === 'bagage' || ticketType === 'voyageur_bagage') && !isBagagesFull && (
            <div className={`mb-6 ${ticketType === 'voyageur_bagage' ? 'border-t border-gray-200 pt-6' : ''}`}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Ticket Bagage
              </h2>
              <div className="mb-3 text-sm text-gray-600">
                Quota restant: <span className="font-bold text-blue-700">{bagageRestant.toFixed(1)} kg</span>
                <span className="text-xs text-gray-400 ml-2">(1m³ = 500kg équivalent)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nature *</label>
                  <input
                    type="text"
                    value={bagageForm.nature}
                    onChange={(e) => setBagageForm({ ...bagageForm, nature: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                    placeholder="Sac, valise, etc."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrivée *</label>
                  <select
                    value={bagageForm.arrivee}
                    onChange={(e) => setBagageForm({ ...bagageForm, arrivee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={bagageForm.usePoids}
                      onChange={(e) => handleBagagePoidsChange(e.target.checked)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Weight className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={bagageForm.poids}
                        onChange={(e) => setBagageForm({ ...bagageForm, poids: e.target.value })}
                        disabled={!bagageForm.usePoids}
                        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 ${!bagageForm.usePoids ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                        placeholder="15.0"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (m3)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={bagageForm.useVolume}
                      onChange={(e) => handleBagageVolumeChange(e.target.checked)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Box className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={bagageForm.volume}
                        onChange={(e) => setBagageForm({ ...bagageForm, volume: e.target.value })}
                        disabled={!bagageForm.useVolume}
                        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 ${!bagageForm.useVolume ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                        placeholder="0.1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              {(bagageForm.usePoids || bagageForm.useVolume) && (bagageForm.poids || bagageForm.volume) && (
                <div className="mt-3 bg-blue-50 rounded-lg p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Poids équivalent (pour quota):</span>
                      <span className="font-bold text-blue-700">
                        {getPoidsEquivalent(
                          bagageForm.usePoids ? parseFloat(bagageForm.poids) || 0 : 0,
                          bagageForm.useVolume ? parseFloat(bagageForm.volume) || 0 : 0
                        ).toFixed(1)} kg
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Montant estimé:</span>
                      <span className="font-bold text-blue-700">{montantBagage} Ar</span>
                    </div>
                    {bagageForm.usePoids && tarifKg && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Poids: {parseFloat(bagageForm.poids) || 0} kg × {tarifKg.tarif_vente} Ar/kg</span>
                        <span>{(parseFloat(bagageForm.poids) || 0) * tarifKg.tarif_vente} Ar</span>
                      </div>
                    )}
                    {bagageForm.useVolume && tarifM3 && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Volume: {parseFloat(bagageForm.volume) || 0} m³ × {tarifM3.tarif_vente} Ar/m³</span>
                        <span>{(parseFloat(bagageForm.volume) || 0) * tarifM3.tarif_vente} Ar</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {isPoidsDepasseQuotaBagage() && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Le poids équivalent dépasse le quota restant ({bagageRestant.toFixed(1)} kg)</span>
                </div>
              )}
            </div>
          )}

          {/* Section Colis */}
          {ticketType === 'colis' && !isBagagesFull && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Box className="h-5 w-5 text-purple-600" />
                Ticket Colis
              </h2>
              <div className="mb-3 text-sm text-gray-600">
                Quota restant: <span className="font-bold text-purple-700">{bagageRestant.toFixed(1)} kg</span>
                <span className="text-xs text-gray-400 ml-2">(1m³ = 500kg équivalent)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nature *</label>
                  <input
                    type="text"
                    value={colisForm.nature}
                    onChange={(e) => setColisForm({ ...colisForm, nature: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                    placeholder="Nature du colis"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrivée *</label>
                  <select
                    value={colisForm.arrivee}
                    onChange={(e) => setColisForm({ ...colisForm, arrivee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={colisForm.usePoids}
                      onChange={(e) => handleColisPoidsChange(e.target.checked)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Weight className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={colisForm.poids}
                        onChange={(e) => setColisForm({ ...colisForm, poids: e.target.value })}
                        disabled={!colisForm.usePoids}
                        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 ${!colisForm.usePoids ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                        placeholder="15.0"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (m3)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={colisForm.useVolume}
                      onChange={(e) => handleColisVolumeChange(e.target.checked)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Box className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={colisForm.volume}
                        onChange={(e) => setColisForm({ ...colisForm, volume: e.target.value })}
                        disabled={!colisForm.useVolume}
                        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 ${!colisForm.useVolume ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                        placeholder="0.1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom expéditeur *</label>
                  <input
                    type="text"
                    value={colisForm.nom_expediteur}
                    onChange={(e) => setColisForm({ ...colisForm, nom_expediteur: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                    placeholder="Nom complet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone expéditeur *</label>
                  <input
                    type="text"
                    value={colisForm.num_tel_expediteur}
                    onChange={(e) => handlePhoneChange('expediteur', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                    placeholder="03X XX XXX XX"
                    required
                    maxLength={14}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom destinataire *</label>
                  <input
                    type="text"
                    value={colisForm.nom_destinataire}
                    onChange={(e) => setColisForm({ ...colisForm, nom_destinataire: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                    placeholder="Nom complet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone destinataire *</label>
                  <input
                    type="text"
                    value={colisForm.num_tel_destinataire}
                    onChange={(e) => handlePhoneChange('destinataire', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                    placeholder="03X XX XXX XX"
                    required
                    maxLength={14}
                  />
                </div>
              </div>
              {(colisForm.usePoids || colisForm.useVolume) && (colisForm.poids || colisForm.volume) && (
                <div className="mt-3 bg-purple-50 rounded-lg p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Poids équivalent (pour quota):</span>
                      <span className="font-bold text-purple-700">
                        {getPoidsEquivalent(
                          colisForm.usePoids ? parseFloat(colisForm.poids) || 0 : 0,
                          colisForm.useVolume ? parseFloat(colisForm.volume) || 0 : 0
                        ).toFixed(1)} kg
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Montant estimé:</span>
                      <span className="font-bold text-purple-700">{montantColis} Ar</span>
                    </div>
                    {colisForm.usePoids && tarifKg && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Poids: {parseFloat(colisForm.poids) || 0} kg × {tarifKg.tarif_vente} Ar/kg</span>
                        <span>{(parseFloat(colisForm.poids) || 0) * tarifKg.tarif_vente} Ar</span>
                      </div>
                    )}
                    {colisForm.useVolume && tarifM3 && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Volume: {parseFloat(colisForm.volume) || 0} m³ × {tarifM3.tarif_vente} Ar/m³</span>
                        <span>{(parseFloat(colisForm.volume) || 0) * tarifM3.tarif_vente} Ar</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {isPoidsDepasseQuotaColis() && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Le poids équivalent dépasse le quota restant ({bagageRestant.toFixed(1)} kg)</span>
                </div>
              )}
            </div>
          )}

          {/* Montant total pour Voyageur + Bagage */}
          {ticketType === 'voyageur_bagage' && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Montant total (Voyageur + Bagage):</span>
                <span className="text-xl font-bold text-orange-700">{montantTotal} Ar</span>
              </div>
            </div>
          )}

          {/* Bouton Valider */}
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                (ticketType === 'voyageur' && (isTicketsFull || isAllClassesFull)) ||
                (ticketType === 'bagage' && isBagagesFull) ||
                (ticketType === 'voyageur_bagage' && (isTicketsFull || isBagagesFull || isAllClassesFull)) ||
                (ticketType === 'bagage' && isPoidsDepasseQuotaBagage()) ||
                (ticketType === 'voyageur_bagage' && (isPoidsDepasseQuotaBagage() || isAllClassesFull)) ||
                (ticketType === 'colis' && (isPoidsDepasseQuotaColis() || isBagagesFull))
              }
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
                isSubmitting || 
                (ticketType === 'voyageur' && (isTicketsFull || isAllClassesFull)) ||
                (ticketType === 'bagage' && isBagagesFull) ||
                (ticketType === 'voyageur_bagage' && (isTicketsFull || isBagagesFull || isAllClassesFull)) ||
                (ticketType === 'bagage' && isPoidsDepasseQuotaBagage()) ||
                (ticketType === 'voyageur_bagage' && (isPoidsDepasseQuotaBagage() || isAllClassesFull)) ||
                (ticketType === 'colis' && (isPoidsDepasseQuotaColis() || isBagagesFull))
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-linear-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-orange-500/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>En cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>VALIDER TICKET</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}