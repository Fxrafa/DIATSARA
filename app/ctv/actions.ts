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

// Récupérer les données du CTV (voyages actifs avec quotas globaux)
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

// Récupérer les détails d'un voyage pour le CTV (avec quotas globaux)
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
    // ✅ Quotas tickets GLOBAUX (sans voyage_id)
    const { data: tickets } = await supabaseAdmin
      .from('quota_tickets')
      .select('quota')
      .eq('gare_num', profile.gare_ref);

    if (tickets && tickets.length > 0) {
      quotaTicketsTotal = tickets[0].quota;
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
      // ✅ Quotas bagages GLOBAUX (sans voyage_id)
      const { data: bagages } = await supabaseAdmin
        .from('quota_bagages')
        .select('quota_tonnes')
        .eq('commune_tutelle', gareData.commune_tutelle);

      if (bagages && bagages.length > 0) {
        quotaBagagesTotal = bagages[0].quota_tonnes * 1000;
      }

      const { data: bagagesVendusData } = await supabaseAdmin
        .from('ticket_bagage')
        .select('poids')
        .eq('voyage_id', voyageId)
        .eq('gare_ref', profile.gare_ref);

      bagagesVendus = bagagesVendusData?.reduce((sum, b) => sum + (b.poids || 0), 0) || 0;
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
  quotas: { gare_num: number; quota: number }[]
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
        quota: q.quota,
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
  quotas: { commune_tutelle: string; quota_tonnes: number }[]
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
        quota_tonnes: q.quota_tonnes,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'commune_tutelle'
      });
  }

  revalidatePath('/ctv/quotas');
  return { success: true };
}

// ==================== FONCTIONS POUR L'HISTORIQUE CTV ====================

// Récupérer l'historique des voyages pour le CTV
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

// ALIAS pour compatibilité avec l'ancien nom
export const getVoyagesHistorique = getVoyagesHistoriqueCTV;

// Récupérer les détails d'un voyage pour l'historique CTV
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

    // ✅ Quotas tickets GLOBAUX (sans voyage_id)
    const { data: quotaTickets, error: quotaTicketError } = await supabaseAdmin
      .from('quota_tickets')
      .select(`
        gare_num,
        quota,
        gare_detail:gare_num(code, gare)
      `);

    if (quotaTicketError) {
      return { error: 'Erreur lors du chargement des quotas tickets' };
    }

    // ✅ Quotas bagages GLOBAUX (sans voyage_id)
    const { data: quotaBagages, error: quotaBagageError } = await supabaseAdmin
      .from('quota_bagages')
      .select('commune_tutelle, quota_tonnes');

    if (quotaBagageError) {
      return { error: 'Erreur lors du chargement des quotas bagages' };
    }

    const { data: ticketsVendus, error: ticketsError } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('gare_ref, part_madarail')
      .eq('voyage_id', voyageId);

    if (ticketsError) {
      return { error: 'Erreur lors du chargement des tickets voyageurs' };
    }

    const { data: bagagesVendus, error: bagagesError } = await supabaseAdmin
      .from('ticket_bagage')
      .select('gare_ref, poids, part_madarail')
      .eq('voyage_id', voyageId);

    if (bagagesError) {
      return { error: 'Erreur lors du chargement des tickets bagages' };
    }

    const { data: colisVendus, error: colisError } = await supabaseAdmin
      .from('ticket_colis')
      .select('gare_ref, poids, part_madarail')
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

    const ventesParGare = allGares.map(gare => {
      const tickets = ticketsVendus?.filter(t => t.gare_ref === gare.num) || [];
      const bagages = bagagesVendus?.filter(b => b.gare_ref === gare.num) || [];
      const colis = colisVendus?.filter(c => c.gare_ref === gare.num) || [];

      const ticketsVendusCount = tickets.length;
      const partMadarailTotal = tickets.reduce((sum, t) => sum + (t.part_madarail || 0), 0);
      
      const poidsBagages = bagages.reduce((sum, b) => sum + (b.poids || 0), 0);
      const poidsColis = colis.reduce((sum, c) => sum + (c.poids || 0), 0);
      const poidsTotal = poidsBagages + poidsColis;
      
      const partMadarailBagages = bagages.reduce((sum, b) => sum + (b.part_madarail || 0), 0);
      const partMadarailColis = colis.reduce((sum, c) => sum + (c.part_madarail || 0), 0);

      return {
        gare_num: gare.num,
        gare_code: gare.code,
        gare_name: gare.gare,
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

// ALIAS pour compatibilité avec l'ancien nom
export const getVoyageDetailsHistorique = getVoyageHistoriqueDetailsCTV;