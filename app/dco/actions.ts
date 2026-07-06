/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

interface ActionResponse {
  error?: string;
  success?: boolean;
}

export async function createVoyage(
  prevState: ActionResponse | undefined,
  formData: FormData
): Promise<ActionResponse> {
  const date_voyage = formData.get('date_voyage') as string;
  const sens = formData.get('sens') as string;
  const gare_depart = parseInt(formData.get('gare_depart') as string);
  const gare_arrivee = parseInt(formData.get('gare_arrivee') as string);
  const formation_voiture = parseInt(formData.get('formation_voiture') as string);
  const formation_voiture2 = parseInt(formData.get('formation_voiture2') as string);
  const formation_wagon = parseInt(formData.get('formation_wagon') as string);
  const places_max = parseInt(formData.get('places_max') as string);
  const poids_max = parseInt(formData.get('poids_max') as string);

  // Validation
  if (!date_voyage || !sens || !gare_depart || !gare_arrivee) {
    return { error: 'Tous les champs sont requis' };
  }

  if (gare_depart === gare_arrivee) {
    return { error: 'La gare de départ et d\'arrivée doivent être différentes' };
  }

  if (formation_voiture < 0 || formation_voiture > 2) {
    return { error: 'Le nombre de voitures 1ère classe doit être entre 0 et 2' };
  }

  if (formation_voiture2 < 0 || formation_voiture2 > 4) {
    return { error: 'Le nombre de voitures 2ème classe doit être entre 0 et 4' };
  }

  if (formation_wagon < 2 || formation_wagon > 6) {
    return { error: 'Le nombre de wagons marchandises doit être entre 2 et 6' };
  }

  if (formation_voiture === 0 && formation_voiture2 === 0 && formation_wagon === 0) {
    return { error: 'La formation doit contenir au moins un élément' };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Non authentifié' };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'DCO') {
    return { error: 'Accès non autorisé' };
  }

  // 1. Créer le voyage
  const { data: voyage, error: voyageError } = await supabaseAdmin
    .from('voyages')
    .insert({
      date_voyage,
      sens,
      gare_depart,
      gare_arrivee,
      formation_voiture,
      formation_voiture2,
      formation_wagon,
      places_max,
      poids_max,
      statut: 'actif',
    })
    .select()
    .single();

  if (voyageError) {
    console.error('Erreur création voyage:', voyageError);
    return { error: 'Erreur lors de la création du voyage' };
  }

  // 2. Désactiver TOUTES les ventes (toutes les gares)
  const { data: allGares } = await supabaseAdmin
    .from('gare')
    .select('num')
    .order('num');

  if (allGares) {
    const toutesLesGares = allGares.map(gare => ({
      voyage_id: voyage.id,
      gare_num: gare.num,
    }));

    const { error: desactError } = await supabaseAdmin
      .from('vente_desactivee')
      .insert(toutesLesGares);

    if (desactError) {
      console.error('Erreur désactivation des ventes:', desactError);
    }
  }

  revalidatePath('/dco/planification');
  revalidatePath('/dco/historique');
  revalidatePath('/dco/suivi-temps-reel');
  redirect('/dco/historique');
}

export async function updateVoyage(
  prevState: ActionResponse | undefined,
  formData: FormData
): Promise<ActionResponse> {
  const id = formData.get('id') as string;
  const date_voyage = formData.get('date_voyage') as string;
  const sens = formData.get('sens') as string;
  const gare_depart = parseInt(formData.get('gare_depart') as string);
  const gare_arrivee = parseInt(formData.get('gare_arrivee') as string);
  const formation_voiture = parseInt(formData.get('formation_voiture') as string);
  const formation_voiture2 = parseInt(formData.get('formation_voiture2') as string);
  const formation_wagon = parseInt(formData.get('formation_wagon') as string);
  const places_max = parseInt(formData.get('places_max') as string);
  const poids_max = parseInt(formData.get('poids_max') as string);

  if (!id || !date_voyage || !sens || !gare_depart || !gare_arrivee) {
    return { error: 'Tous les champs sont requis' };
  }

  if (gare_depart === gare_arrivee) {
    return { error: 'La gare de départ et d\'arrivée doivent être différentes' };
  }

  if (formation_voiture < 0 || formation_voiture > 2) {
    return { error: 'Le nombre de voitures 1ère classe doit être entre 0 et 2' };
  }

  if (formation_voiture2 < 0 || formation_voiture2 > 4) {
    return { error: 'Le nombre de voitures 2ème classe doit être entre 0 et 4' };
  }

  if (formation_wagon < 2 || formation_wagon > 6) {
    return { error: 'Le nombre de wagons marchandises doit être entre 2 et 6' };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Non authentifié' };
  }

  const { data: voyage, error: fetchError } = await supabaseAdmin
    .from('voyages')
    .select('statut')
    .eq('id', id)
    .single();

  if (fetchError || !voyage) {
    return { error: 'Voyage non trouvé' };
  }

  if (voyage.statut === 'termine') {
    return { error: 'Impossible de modifier un voyage terminé' };
  }

  const { error } = await supabaseAdmin
    .from('voyages')
    .update({
      date_voyage,
      sens,
      gare_depart,
      gare_arrivee,
      formation_voiture,
      formation_voiture2,
      formation_wagon,
      places_max,
      poids_max,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: 'Erreur lors de la modification' };
  }

  revalidatePath('/dco/historique');
  redirect('/dco/historique');
}

// ==================== ENREGISTREMENT DES QUOTAS ====================
// ✅ Enregistrer les quotas d'un voyage terminé
export async function enregistrerQuotasVoyage(voyageId: string, sens: string) {
  try {
    // 1. Récupérer les quotas tickets actuels
    const { data: quotasTickets, error: errorTickets } = await supabaseAdmin
      .from('quota_tickets')
      .select('*')
      .order('gare_num');

    if (errorTickets) {
      console.error('Erreur récupération quotas tickets:', errorTickets);
      return { error: 'Erreur lors de la récupération des quotas tickets' };
    }

    // 2. Récupérer les quotas bagages actuels
    const { data: quotasBagages, error: errorBagages } = await supabaseAdmin
      .from('quota_bagages')
      .select('*')
      .order('commune_tutelle');

    if (errorBagages) {
      console.error('Erreur récupération quotas bagages:', errorBagages);
      return { error: 'Erreur lors de la récupération des quotas bagages' };
    }

    // 3. Construire l'objet pour quota_ticket_enregistre
    const gareMapping: { [key: number]: string } = {
      1: 'gare_mga',
      2: 'gare_adb',
      3: 'gare_fnv',
      4: 'gare_abv',
      5: 'gare_aty',
      6: 'gare_adk',
      7: 'gare_abh',
      8: 'gare_jrm',
      9: 'gare_lhd',
      10: 'gare_skm',
      11: 'gare_fns',
      12: 'gare_mgb',
      13: 'gare_rzk',
      14: 'gare_anv',
      15: 'gare_bkv',
      16: 'gare_abl',
      17: 'gare_vvn',
      18: 'gare_zin',
      19: 'gare_adr',
      20: 'gare_tpn',
      21: 'gare_tpl',
      22: 'gare_akf',
      23: 'gare_vtz',
      24: 'gare_ivd',
      25: 'gare_mng',
    };

    const ticketData: any = {
      id_voyage: voyageId,
      sens: sens,
    };

    quotasTickets?.forEach(q => {
      const columnName = gareMapping[q.gare_num];
      if (columnName) {
        const quota = sens === '2131' ? q.quota_2131 : q.quota_2132;
        ticketData[columnName] = quota || 0;
      }
    });

    // 4. Construire l'objet pour quota_bagagecolis_enregistre
    // ✅ Mapping corrigé avec les noms EXACTS des communes
    const communeMapping: { [key: string]: string } = {
      'Moramanga': 'commune_moramanga',
      'Andasibe': 'commune_andasibe',
      'Ambatovola': 'commune_ambatovola',
      'Andekaleka': 'commune_andekaleka',
      'Lohariandava': 'commune_lohariandava',
      'Fanasana': 'commune_fanasana',
      'Razanaka': 'commune_razanaka',
      'Anivorano': 'commune_anivorano',
      'Brickaville': 'commune_brickaville',
      'Andovoranto': 'commune_andovoranto',
      'Ambinaninony': 'commune_ambinaninony',
      'Amboditandro': 'commune_amboditandro',
      'CU Toamasina': 'commune_cu_toamasina',
    };

    const bagageData: any = {
      id_voyage: voyageId,
      sens: sens,
    };

    quotasBagages?.forEach(q => {
      const columnName = communeMapping[q.commune_tutelle];
      if (columnName) {
        const quota = sens === '2131' ? q.quota_tonnes_2131 : q.quota_tonnes_2132;
        bagageData[columnName] = quota || 0;
      }
    });

    // 5. Insérer ou mettre à jour les quotas enregistrés
    const { error: insertTicketError } = await supabaseAdmin
      .from('quota_ticket_enregistre')
      .upsert(ticketData, { onConflict: 'id_voyage, sens' });

    if (insertTicketError) {
      console.error('Erreur insertion quotas tickets enregistrés:', insertTicketError);
      return { error: 'Erreur lors de l\'enregistrement des quotas tickets' };
    }

    const { error: insertBagageError } = await supabaseAdmin
      .from('quota_bagagecolis_enregistre')
      .upsert(bagageData, { onConflict: 'id_voyage, sens' });

    if (insertBagageError) {
      console.error('Erreur insertion quotas bagages enregistrés:', insertBagageError);
      return { error: 'Erreur lors de l\'enregistrement des quotas bagages' };
    }

    console.log('✅ Quotas enregistrés pour le voyage:', voyageId);
    return { success: true };
  } catch (err) {
    console.error('Erreur enregistrement quotas:', err);
    return { error: 'Erreur lors de l\'enregistrement des quotas' };
  }
}

// ✅ Récupérer les quotas enregistrés pour un voyage
export async function getQuotasEnregistres(voyageId: string) {
  try {
    const { data: tickets, error: ticketError } = await supabaseAdmin
      .from('quota_ticket_enregistre')
      .select('*')
      .eq('id_voyage', voyageId);

    if (ticketError) {
      console.error('Erreur récupération quotas tickets enregistrés:', ticketError);
    }

    const { data: bagages, error: bagageError } = await supabaseAdmin
      .from('quota_bagagecolis_enregistre')
      .select('*')
      .eq('id_voyage', voyageId);

    if (bagageError) {
      console.error('Erreur récupération quotas bagages enregistrés:', bagageError);
    }

    return {
      tickets: tickets || [],
      bagages: bagages || [],
    };
  } catch (err) {
    console.error('Erreur récupération quotas enregistrés:', err);
    return { error: 'Erreur lors de la récupération des quotas' };
  }
}

// ==================== TERMINER UN VOYAGE ====================

export async function terminerVoyage(id: string): Promise<ActionResponse> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Non authentifié' };
  }

  // Récupérer le sens du voyage avant de le terminer
  const { data: voyage, error: voyageError } = await supabaseAdmin
    .from('voyages')
    .select('sens')
    .eq('id', id)
    .single();

  if (voyageError || !voyage) {
    return { error: 'Voyage non trouvé' };
  }

  // Mettre à jour le statut du voyage
  const { error } = await supabaseAdmin
    .from('voyages')
    .update({ statut: 'termine' })
    .eq('id', id);

  if (error) {
    return { error: 'Erreur lors de la mise à jour' };
  }

  // ✅ Enregistrer les quotas du voyage terminé
  try {
    const result = await enregistrerQuotasVoyage(id, voyage.sens);
    if (result.error) {
      console.error('Erreur enregistrement quotas:', result.error);
    }
  } catch (err) {
    console.error('Erreur lors de l\'enregistrement des quotas:', err);
  }

  revalidatePath('/dco/historique');
  revalidatePath('/dco/historique-recette');
  return { success: true };
}

// ==================== FONCTIONS POUR LES VOYAGES ACTIFS ====================

// Récupérer les voyages actifs avec leurs quotas GLOBAUX
export async function getVoyagesActifsWithQuotas() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Non authentifié' };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'DCO') {
    return { error: 'Accès non autorisé' };
  }

  // Récupérer les voyages actifs
  const { data: voyages, error: voyagesError } = await supabaseAdmin
    .from('voyages')
    .select(`
      *,
      gare_depart_detail:gare_depart(code, gare),
      gare_arrivee_detail:gare_arrivee(code, gare)
    `)
    .eq('statut', 'actif')
    .order('date_voyage', { ascending: true });

  if (voyagesError) {
    return { error: 'Erreur lors du chargement des voyages' };
  }

  return { voyages: voyages || [] };
}

// ==================== FONCTIONS POUR L'HISTORIQUE RECETTE ====================

export async function getVoyagesHistoriqueRecetteFiltre(
  dateDebut?: string,
  dateFin?: string
) {
  let query = supabaseAdmin
    .from('voyages')
    .select(`
      *,
      gare_depart_detail:gare_depart(code, gare),
      gare_arrivee_detail:gare_arrivee(code, gare)
    `)
    .eq('statut', 'termine')
    .order('date_voyage', { ascending: false });

  if (dateDebut) {
    query = query.gte('date_voyage', dateDebut);
  }
  if (dateFin) {
    query = query.lte('date_voyage', dateFin);
  }

  const { data: voyages, error } = await query;

  if (error) {
    return { error: 'Erreur lors du chargement des voyages' };
  }

  return { voyages };
}

export async function getVoyageDetailsRecette(voyageId: string) {
  try {
    const { data: voyageData, error: voyageError } = await supabaseAdmin
      .from('voyages')
      .select(`
        *,
        gare_depart_detail:gare_depart(code, gare),
        gare_arrivee_detail:gare_arrivee(code, gare)
      `)
      .eq('id', voyageId)
      .single();

    if (voyageError) {
      return { error: 'Voyage non trouvé' };
    }

    // Récupérer les tickets voyageurs vendus par gare
    const { data: ticketsVendus, error: ticketsError } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('gare_ref, part_madarail')
      .eq('voyage_id', voyageId);

    if (ticketsError) {
      return { error: 'Erreur lors du chargement des tickets voyageurs' };
    }

    // Récupérer les tickets bagages avec poids et volume
    const { data: bagagesVendus, error: bagagesError } = await supabaseAdmin
      .from('ticket_bagage')
      .select('gare_ref, poids, volume, part_madarail')
      .eq('voyage_id', voyageId);

    if (bagagesError) {
      return { error: 'Erreur lors du chargement des tickets bagages' };
    }

    // Récupérer les tickets colis avec poids et volume
    const { data: colisVendus, error: colisError } = await supabaseAdmin
      .from('ticket_colis')
      .select('gare_ref, poids, volume, part_madarail')
      .eq('voyage_id', voyageId);

    if (colisError) {
      return { error: 'Erreur lors du chargement des tickets colis' };
    }

    const { data: allGares, error: garesError } = await supabaseAdmin
      .from('gare')
      .select('num, code, gare')
      .order('num');

    if (garesError) {
      return { error: 'Erreur lors du chargement des gares' };
    }

    // Construire les ventes par gare avec poids équivalent
    const ventesParGare = allGares.map(gare => {
      const tickets = ticketsVendus?.filter(t => t.gare_ref === gare.num) || [];
      const bagages = bagagesVendus?.filter(b => b.gare_ref === gare.num) || [];
      const colis = colisVendus?.filter(c => c.gare_ref === gare.num) || [];

      const ticketsVendusCount = tickets.length;
      const recetteTickets = tickets.reduce((sum, t) => sum + (t.part_madarail || 0), 0);
      
      const poidsBagages = bagages.reduce((sum, b) => sum + (b.poids || 0) + ((b.volume || 0) * 500), 0);
      const poidsColis = colis.reduce((sum, c) => sum + (c.poids || 0) + ((c.volume || 0) * 500), 0);
      const poidsTotal = poidsBagages + poidsColis;
      
      const recetteBagages = bagages.reduce((sum, b) => sum + (b.part_madarail || 0), 0);
      const recetteColis = colis.reduce((sum, c) => sum + (c.part_madarail || 0), 0);
      const recetteBagagesTotal = recetteBagages + recetteColis;

      return {
        gare_num: gare.num,
        gare_code: gare.code,
        gare_name: gare.gare,
        tickets_vendus: ticketsVendusCount,
        recette_tickets: recetteTickets,
        poids_vendu: poidsTotal,
        recette_bagages: recetteBagagesTotal,
        recette_totale: recetteTickets + recetteBagagesTotal,
      };
    });

    // Filtrer les gares qui ont des ventes (tickets ou poids)
    const garesAvecVentes = ventesParGare.filter(v => 
      v.tickets_vendus > 0 || v.poids_vendu > 0
    );

    // Si aucune vente, retourner un tableau vide
    if (garesAvecVentes.length === 0) {
      return {
        detail: {
          ...voyageData,
          ventes_par_gare: [],
          total_tickets_vendus: 0,
          total_recette_tickets: 0,
          total_poids_vendu: 0,
          total_recette_bagages: 0,
          total_recette: 0,
        }
      };
    }

    // Calculer les totaux
    const totalTicketsVendus = garesAvecVentes.reduce((sum, v) => sum + v.tickets_vendus, 0);
    const totalRecetteTickets = garesAvecVentes.reduce((sum, v) => sum + v.recette_tickets, 0);
    const totalPoidsVendu = garesAvecVentes.reduce((sum, v) => sum + v.poids_vendu, 0);
    const totalRecetteBagages = garesAvecVentes.reduce((sum, v) => sum + v.recette_bagages, 0);
    const totalRecette = garesAvecVentes.reduce((sum, v) => sum + v.recette_totale, 0);

    const detail = {
      ...voyageData,
      ventes_par_gare: garesAvecVentes,
      total_tickets_vendus: totalTicketsVendus,
      total_recette_tickets: totalRecetteTickets,
      total_poids_vendu: totalPoidsVendu,
      total_recette_bagages: totalRecetteBagages,
      total_recette: totalRecette,
    };

    return { detail };
  } catch (error) {
    console.error('Erreur:', error);
    return { error: 'Erreur lors du chargement des détails' };
  }
}

// ==================== FONCTIONS POUR LE SUIVI TEMPS RÉEL ====================

export async function getVoyagesActifsSuivi() {
  const { data: voyages, error } = await supabaseAdmin
    .from('voyages')
    .select(`
      *,
      gare_depart_detail:gare_depart(code, gare),
      gare_arrivee_detail:gare_arrivee(code, gare)
    `)
    .eq('statut', 'actif')
    .order('date_voyage', { ascending: true });

  if (error) {
    return { error: 'Erreur lors du chargement des voyages' };
  }

  return { voyages };
}

export async function getVoyageDetailsSuivi(voyageId: string) {
  try {
    const { data: voyageData, error: voyageError } = await supabaseAdmin
      .from('voyages')
      .select(`
        *,
        gare_depart_detail:gare_depart(code, gare),
        gare_arrivee_detail:gare_arrivee(code, gare)
      `)
      .eq('id', voyageId)
      .single();

    if (voyageError) {
      return { error: 'Voyage non trouvé' };
    }

    // Récupérer les quotas tickets GLOBAUX
    const { data: quotaTickets, error: quotaTicketError } = await supabaseAdmin
      .from('quota_tickets')
      .select(`
        gare_num,
        quota_2131,
        quota_2132,
        gare_detail:gare_num(code, gare)
      `);

    if (quotaTicketError) {
      return { error: 'Erreur lors du chargement des quotas tickets' };
    }

    // Récupérer les quotas bagages GLOBAUX (par commune)
    const { data: quotaBagages, error: quotaBagageError } = await supabaseAdmin
      .from('quota_bagages')
      .select('commune_tutelle, quota_tonnes_2131, quota_tonnes_2132');

    if (quotaBagageError) {
      return { error: 'Erreur lors du chargement des quotas bagages' };
    }

    // Créer un map commune -> quota (selon le sens)
    const quotaBagagesMap = new Map<string, { quota_tonnes_2131: number; quota_tonnes_2132: number }>();
    quotaBagages?.forEach(q => {
      quotaBagagesMap.set(q.commune_tutelle, {
        quota_tonnes_2131: q.quota_tonnes_2131 || 0,
        quota_tonnes_2132: q.quota_tonnes_2132 || 0,
      });
    });

    // Récupérer toutes les gares
    const { data: allGares, error: garesError } = await supabaseAdmin
      .from('gare')
      .select('num, code, gare, commune_tutelle')
      .order('num');

    if (garesError) {
      return { error: 'Erreur lors du chargement des gares' };
    }

    // Récupérer les tickets vendus
    const { data: ticketsVendus, error: ticketsError } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('gare_ref, part_madarail')
      .eq('voyage_id', voyageId);

    if (ticketsError) {
      return { error: 'Erreur lors du chargement des tickets voyageurs' };
    }

    const { data: bagagesVendus, error: bagagesError } = await supabaseAdmin
      .from('ticket_bagage')
      .select('gare_ref, poids, volume, part_madarail')
      .eq('voyage_id', voyageId);

    if (bagagesError) {
      return { error: 'Erreur lors du chargement des tickets bagages' };
    }

    const { data: colisVendus, error: colisError } = await supabaseAdmin
      .from('ticket_colis')
      .select('gare_ref, poids, volume, part_madarail')
      .eq('voyage_id', voyageId);

    if (colisError) {
      return { error: 'Erreur lors du chargement des tickets colis' };
    }

    const { data: ventesDesactivees, error: venteDesactiveeError } = await supabaseAdmin
      .from('vente_desactivee')
      .select('gare_num')
      .eq('voyage_id', voyageId);

    if (venteDesactiveeError) {
      return { error: 'Erreur lors du chargement des désactivations' };
    }

    const garesDesactivees = new Set(ventesDesactivees?.map(v => v.gare_num) || []);

    // Créer un map pour les quotas tickets
    const quotaTicketsMap = new Map<number, { quota_2131: number; quota_2132: number }>();
    quotaTickets?.forEach(q => {
      quotaTicketsMap.set(q.gare_num, {
        quota_2131: q.quota_2131 || 0,
        quota_2132: q.quota_2132 || 0,
      });
    });

    const gareCodes = allGares.map(g => g.num);
    const departIndex = gareCodes.indexOf(voyageData.gare_depart);
    const arriveeIndex = gareCodes.indexOf(voyageData.gare_arrivee);
    
    let garesFiltrees = allGares;
    if (voyageData.sens === '2131') {
      garesFiltrees = allGares.slice(departIndex, arriveeIndex);
    } else {
      garesFiltrees = allGares.slice(arriveeIndex + 1, departIndex + 1);
    }

    const sens = voyageData.sens;

    // Construire les données par gare
    const ventesParGare = garesFiltrees.map(gare => {
      const quotaData = quotaTicketsMap.get(gare.num);
      const quotaTicketsValue = quotaData ? (sens === '2131' ? quotaData.quota_2131 : quotaData.quota_2132) : 0;

      const tickets = ticketsVendus?.filter(t => t.gare_ref === gare.num) || [];
      const bagages = bagagesVendus?.filter(b => b.gare_ref === gare.num) || [];
      const colis = colisVendus?.filter(c => c.gare_ref === gare.num) || [];

      const ticketsVendusCount = tickets.length;
      const recetteTickets = tickets.reduce((sum, t) => sum + (t.part_madarail || 0), 0);
      
      const poidsBagages = bagages.reduce((sum, b) => sum + (b.poids || 0) + ((b.volume || 0) * 500), 0);
      const poidsColis = colis.reduce((sum, c) => sum + (c.poids || 0) + ((c.volume || 0) * 500), 0);
      const poidsTotal = poidsBagages + poidsColis;
      
      const recetteBagages = bagages.reduce((sum, b) => sum + (b.part_madarail || 0), 0);
      const recetteColis = colis.reduce((sum, c) => sum + (c.part_madarail || 0), 0);
      const recetteBagagesTotal = recetteBagages + recetteColis;

      const quotaTotalCommune = quotaBagagesMap.get(gare.commune_tutelle);
      const quotaBagagesValue = quotaTotalCommune 
        ? (sens === '2131' ? quotaTotalCommune.quota_tonnes_2131 : quotaTotalCommune.quota_tonnes_2132)
        : 0;

      return {
        gare_num: gare.num,
        gare_code: gare.code,
        gare_name: gare.gare,
        commune_tutelle: gare.commune_tutelle,
        quota_tickets: quotaTicketsValue,
        tickets_vendus: ticketsVendusCount,
        recette_tickets: recetteTickets,
        quota_bagages: quotaBagagesValue,
        poids_vendu: poidsTotal,
        recette_bagages: recetteBagagesTotal,
        recette_totale: recetteTickets + recetteBagagesTotal,
        desactivee: garesDesactivees.has(gare.num),
      };
    });

    // Calculer les totaux
    const totalTicketsVendus = ventesParGare.reduce((sum, v) => sum + v.tickets_vendus, 0);
    const totalRecetteTickets = ventesParGare.reduce((sum, v) => sum + v.recette_tickets, 0);
    const totalPoidsVendu = ventesParGare.reduce((sum, v) => sum + v.poids_vendu, 0);
    const totalRecetteBagages = ventesParGare.reduce((sum, v) => sum + v.recette_bagages, 0);
    const totalRecette = ventesParGare.reduce((sum, v) => sum + v.recette_totale, 0);

    const totalQuotaBagages = ventesParGare.reduce((sum, v) => sum + v.quota_bagages, 0);

    const detail = {
      ...voyageData,
      ventes_par_gare: ventesParGare,
      total_tickets_vendus: totalTicketsVendus,
      total_recette_tickets: totalRecetteTickets,
      total_poids_vendu: totalPoidsVendu,
      total_recette_bagages: totalRecetteBagages,
      total_recette: totalRecette,
      gares_desactivees: garesDesactivees,
      total_quota_bagages: totalQuotaBagages,
    };

    return { detail };
  } catch (error) {
    console.error('Erreur:', error);
    return { error: 'Erreur lors du chargement des détails' };
  }
}

export async function desactiverVenteGare(voyageId: string, gareNum: number) {
  try {
    const { error } = await supabaseAdmin
      .from('vente_desactivee')
      .insert({
        voyage_id: voyageId,
        gare_num: gareNum,
      });

    if (error) {
      return { error: 'Erreur lors de la désactivation' };
    }

    revalidatePath('/dco/suivi-temps-reel');
    return { success: true };
  } catch (error) {
    console.error('Erreur:', error);
    return { error: 'Erreur lors de la désactivation' };
  }
}

export async function activerVenteGare(voyageId: string, gareNum: number) {
  try {
    const { error } = await supabaseAdmin
      .from('vente_desactivee')
      .delete()
      .eq('voyage_id', voyageId)
      .eq('gare_num', gareNum);

    if (error) {
      return { error: 'Erreur lors de l\'activation' };
    }

    revalidatePath('/dco/suivi-temps-reel');
    return { success: true };
  } catch (error) {
    console.error('Erreur:', error);
    return { error: 'Erreur lors de l\'activation' };
  }
}

export async function activerToutesVentes(voyageId: string) {
  try {
    // Récupérer le voyage pour connaître le trajet
    const { data: voyage, error: voyageError } = await supabaseAdmin
      .from('voyages')
      .select('gare_depart, gare_arrivee, sens')
      .eq('id', voyageId)
      .single();

    if (voyageError || !voyage) {
      return { error: 'Voyage non trouvé' };
    }

    // Récupérer toutes les gares
    const { data: allGares } = await supabaseAdmin
      .from('gare')
      .select('num')
      .order('num');

    if (!allGares) {
      return { error: 'Erreur lors du chargement des gares' };
    }

    const gareCodes = allGares.map(g => g.num);
    const departIndex = gareCodes.indexOf(voyage.gare_depart);
    const arriveeIndex = gareCodes.indexOf(voyage.gare_arrivee);

    // Déterminer les gares du trajet (départ inclus, arrivée exclu)
    let garesTrajet: number[] = [];
    if (departIndex < arriveeIndex) {
      // Sens 2131 (Nord) - MGA vers MNG
      garesTrajet = gareCodes.slice(departIndex, arriveeIndex);
    } else {
      // Sens 2132 (Sud) - MNG vers MGA
      garesTrajet = gareCodes.slice(arriveeIndex + 1, departIndex + 1);
    }

    // Supprimer toutes les désactivations pour ce voyage
    const { error: deleteAllError } = await supabaseAdmin
      .from('vente_desactivee')
      .delete()
      .eq('voyage_id', voyageId);

    if (deleteAllError) {
      return { error: 'Erreur lors de la suppression des désactivations' };
    }

    // Désactiver les gares hors trajet (toutes les gares - garesTrajet)
    const garesHorsTrajet = gareCodes.filter(g => !garesTrajet.includes(g));

    if (garesHorsTrajet.length > 0) {
      const desactivations = garesHorsTrajet.map(gareNum => ({
        voyage_id: voyageId,
        gare_num: gareNum,
      }));

      const { error: desactError } = await supabaseAdmin
        .from('vente_desactivee')
        .insert(desactivations);

      if (desactError) {
        return { error: 'Erreur lors de la désactivation des gares hors trajet' };
      }
    }

    revalidatePath('/dco/suivi-temps-reel');
    return { success: true };
  } catch (error) {
    console.error('Erreur:', error);
    return { error: 'Erreur lors de l\'activation' };
  }
}