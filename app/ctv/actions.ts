/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

interface ActionResponse {
  error?: string;
  success?: boolean;
}

// ==================== FONCTIONS POUR LE CTV ====================

export async function getVoyagesCTV() {
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

export async function getVoyageDetailsCTV(voyageId: string) {
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
    .select('gare_ref')
    .eq('id', user.id)
    .single();

  const { data: voyage, error } = await supabaseAdmin
    .from('voyages')
    .select(`
      *,
      gare_depart_detail:gare_depart(code, gare),
      gare_arrivee_detail:gare_arrivee(code, gare)
    `)
    .eq('id', voyageId)
    .single();

  if (error) {
    return { error: 'Voyage non trouvé' };
  }

  let quotaTicketsTotal = 0;
  let quotaBagagesTotal = 0;
  let ticketsVendus = 0;
  let bagagesVendus = 0;

  if (profile?.gare_ref) {
    // ✅ Quotas tickets GLOBAUX selon le sens du voyage
    const sens = voyage.sens;
    
    const { data: tickets } = await supabaseAdmin
      .from('quota_tickets')
      .select('quota_2131, quota_2132')
      .eq('gare_num', profile.gare_ref);

    if (tickets && tickets.length > 0) {
      // ✅ Accès direct aux propriétés avec vérification
      if (sens === '2131') {
        quotaTicketsTotal = tickets[0].quota_2131 || 0;
      } else {
        quotaTicketsTotal = tickets[0].quota_2132 || 0;
      }
    }

    const { data: vendus } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('*')
      .eq('voyage_id', voyageId)
      .eq('gare_ref', profile.gare_ref);

    ticketsVendus = vendus?.length || 0;

    const { data: gareData } = await supabaseAdmin
      .from('gare')
      .select('commune_tutelle')
      .eq('num', profile.gare_ref)
      .single();

    if (gareData) {
      // ✅ Quotas bagages GLOBAUX selon le sens du voyage
      const { data: bagages } = await supabaseAdmin
        .from('quota_bagages')
        .select('quota_tonnes_2131, quota_tonnes_2132')
        .eq('commune_tutelle', gareData.commune_tutelle);

      if (bagages && bagages.length > 0) {
        // ✅ Accès direct aux propriétés avec vérification
        if (sens === '2131') {
          quotaBagagesTotal = (bagages[0].quota_tonnes_2131 || 0) * 1000;
        } else {
          quotaBagagesTotal = (bagages[0].quota_tonnes_2132 || 0) * 1000;
        }
      }

      const { data: bagagesVendusData } = await supabaseAdmin
        .from('ticket_bagage')
        .select('poids, volume')
        .eq('voyage_id', voyageId)
        .eq('gare_ref', profile.gare_ref);

      const { data: colisVendusData } = await supabaseAdmin
        .from('ticket_colis')
        .select('poids, volume')
        .eq('voyage_id', voyageId)
        .eq('gare_ref', profile.gare_ref);

      const totalPoidsBagages = bagagesVendusData?.reduce((sum, b) => sum + (b.poids || 0) + ((b.volume || 0) * 500), 0) || 0;
      const totalPoidsColis = colisVendusData?.reduce((sum, c) => sum + (c.poids || 0) + ((c.volume || 0) * 500), 0) || 0;
      
      bagagesVendus = totalPoidsBagages + totalPoidsColis;
    }
  }

  return { 
    voyage,
    quotas: {
      tickets_max: quotaTicketsTotal,
      tickets_vendus: ticketsVendus,
      bagages_max: quotaBagagesTotal,
      bagages_vendus: bagagesVendus,
    }
  };
}

// ✅ Récupérer les quotas tickets GLOBAUX (sans voyage_id)
export async function getQuotaTickets() {
  const { data: quotas, error } = await supabaseAdmin
    .from('quota_tickets')
    .select('*')
    .order('gare_num');

  if (error) {
    return { error: 'Erreur lors du chargement des quotas' };
  }

  return { quotas };
}

// ✅ Récupérer les quotas bagages GLOBAUX (sans voyage_id)
export async function getQuotaBagages() {
  const { data: quotas, error } = await supabaseAdmin
    .from('quota_bagages')
    .select('*')
    .order('commune_tutelle');

  if (error) {
    return { error: 'Erreur lors du chargement des quotas' };
  }

  return { quotas };
}

// ✅ Sauvegarder les quotas tickets GLOBAUX (sans voyage_id)
export async function saveQuotaTickets(
  quotas: { gare_num: number; quota_2131: number; quota_2132: number }[]
): Promise<ActionResponse> {
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

  if (profile?.role !== 'CTV') {
    return { error: 'Accès non autorisé' };
  }

  for (const q of quotas) {
    await supabaseAdmin
      .from('quota_tickets')
      .upsert({
        gare_num: q.gare_num,
        quota_2131: q.quota_2131,
        quota_2132: q.quota_2132,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'gare_num'
      });
  }

  revalidatePath('/ctv/quotas');
  return { success: true };
}

// ✅ Sauvegarder les quotas bagages GLOBAUX (sans voyage_id)
export async function saveQuotaBagages(
  quotas: { commune_tutelle: string; quota_tonnes_2131: number; quota_tonnes_2132: number }[]
): Promise<ActionResponse> {
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

  if (profile?.role !== 'CTV') {
    return { error: 'Accès non autorisé' };
  }

  for (const q of quotas) {
    await supabaseAdmin
      .from('quota_bagages')
      .upsert({
        commune_tutelle: q.commune_tutelle,
        quota_tonnes_2131: q.quota_tonnes_2131,
        quota_tonnes_2132: q.quota_tonnes_2132,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'commune_tutelle'
      });
  }

  revalidatePath('/ctv/quotas');
  return { success: true };
}

// ==================== FONCTIONS POUR L'HISTORIQUE CTV ====================

export async function getVoyagesHistoriqueCTV() {
  const { data: voyages, error } = await supabaseAdmin
    .from('voyages')
    .select(`
      *,
      gare_depart_detail:gare_depart(code, gare),
      gare_arrivee_detail:gare_arrivee(code, gare)
    `)
    .order('date_voyage', { ascending: false })
    .limit(5);

  if (error) {
    return { error: 'Erreur lors du chargement des voyages' };
  }

  return { voyages };
}

export const getVoyagesHistorique = getVoyagesHistoriqueCTV;

export async function getVoyageHistoriqueDetailsCTV(voyageId: string) {
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

    // ✅ Récupérer les quotas tickets GLOBAUX (sans voyage_id)
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

    // ✅ Récupérer les quotas bagages GLOBAUX (sans voyage_id)
    const { data: quotaBagages, error: quotaBagageError } = await supabaseAdmin
      .from('quota_bagages')
      .select('commune_tutelle, quota_tonnes_2131, quota_tonnes_2132');

    if (quotaBagageError) {
      return { error: 'Erreur lors du chargement des quotas bagages' };
    }

    const sens = voyageData.sens;

    // Récupérer les tickets voyageurs vendus
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

    const { data: allGares, error: garesError } = await supabaseAdmin
      .from('gare')
      .select('num, code, gare, commune_tutelle')
      .order('num');

    if (garesError) {
      return { error: 'Erreur lors du chargement des gares' };
    }

    const ventesParGare = allGares.map(gare => {
      const tickets = ticketsVendus?.filter(t => t.gare_ref === gare.num) || [];
      const bagages = bagagesVendus?.filter(b => b.gare_ref === gare.num) || [];
      const colis = colisVendus?.filter(c => c.gare_ref === gare.num) || [];

      const ticketsVendusCount = tickets.length;
      const partMadarailTotal = tickets.reduce((sum, t) => sum + (t.part_madarail || 0), 0);
      
      const poidsBagages = bagages.reduce((sum, b) => sum + (b.poids || 0) + ((b.volume || 0) * 500), 0);
      const poidsColis = colis.reduce((sum, c) => sum + (c.poids || 0) + ((c.volume || 0) * 500), 0);
      const poidsTotal = poidsBagages + poidsColis;
      
      const partMadarailBagages = bagages.reduce((sum, b) => sum + (b.part_madarail || 0), 0);
      const partMadarailColis = colis.reduce((sum, c) => sum + (c.part_madarail || 0), 0);

      return {
        gare_num: gare.num,
        gare_code: gare.code,
        gare_name: gare.gare,
        commune_tutelle: gare.commune_tutelle,
        tickets_vendus: ticketsVendusCount,
        part_madarail_total: partMadarailTotal,
        poids_vendu: poidsTotal,
        part_madarail_bagage_total: partMadarailBagages + partMadarailColis,
      };
    });

    const garesAvecQuotas = new Set(quotaTickets?.map(q => q.gare_num) || []);
    const garesAvecVentes = ventesParGare.filter(v => 
      v.tickets_vendus > 0 || v.poids_vendu > 0
    ).map(v => v.gare_num);

    const garesAffichables = new Set([...garesAvecQuotas, ...garesAvecVentes]);
    const ventesFiltrees = ventesParGare.filter(v => garesAffichables.has(v.gare_num));

    if (ventesFiltrees.length === 0) {
      return {
        detail: {
          ...voyageData,
          quota_tickets: quotaTickets || [],
          quota_bagages: quotaBagages || [],
          ventes_par_gare: [],
          total_tickets_vendus: 0,
          total_part_madarail: 0,
          total_poids_vendu: 0,
          total_part_madarail_bagage: 0,
        }
      };
    }

    const totalTicketsVendus = ventesFiltrees.reduce((sum, v) => sum + v.tickets_vendus, 0);
    const totalPartMadarail = ventesFiltrees.reduce((sum, v) => sum + v.part_madarail_total, 0);
    const totalPoidsVendu = ventesFiltrees.reduce((sum, v) => sum + v.poids_vendu, 0);
    const totalPartMadarailBagage = ventesFiltrees.reduce((sum, v) => sum + v.part_madarail_bagage_total, 0);

    const detail = {
      ...voyageData,
      quota_tickets: quotaTickets || [],
      quota_bagages: quotaBagages || [],
      ventes_par_gare: ventesFiltrees,
      total_tickets_vendus: totalTicketsVendus,
      total_part_madarail: totalPartMadarail,
      total_poids_vendu: totalPoidsVendu,
      total_part_madarail_bagage: totalPartMadarailBagage,
    };

    return { detail };
  } catch (error) {
    console.error('Erreur:', error);
    return { error: 'Erreur lors du chargement des détails' };
  }
}

export const getVoyageDetailsHistorique = getVoyageHistoriqueDetailsCTV;

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
    // Mapping gare_num → colonne
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
        // Prendre le bon quota selon le sens
        const quota = sens === '2131' ? q.quota_2131 : q.quota_2132;
        ticketData[columnName] = quota || 0;
      }
    });

    // 4. Construire l'objet pour quota_bagagecolis_enregistre
    const bagageData: any = {
      id_voyage: voyageId,
      sens: sens,
    };

    // Mapping commune_tutelle → colonne
    const communeMapping: { [key: string]: string } = {
      'Moramanga': 'commune_moramanga',
      'Ambatovola': 'commune_ambatovola',
      'Antalova': 'commune_antalova',
      'Mahialambo': 'commune_mahialambo',
      'Maromby': 'commune_maromby',
      'Ambatolampy': 'commune_ambatolampy',
      'Ambohibe': 'commune_ambohibe',
      'Morafeno': 'commune_morafeno',
      'Ambodifarihy': 'commune_ambodifarihy',
      'Mahasoa': 'commune_mahasoa',
      'Ambohimandroso': 'commune_ambohimandroso',
      'Miarinarivo': 'commune_miarinarivo',
      'Mandialaza': 'commune_mandialaza',
    };

    quotasBagages?.forEach(q => {
      const columnName = communeMapping[q.commune_tutelle];
      if (columnName) {
        // Prendre le bon quota selon le sens
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