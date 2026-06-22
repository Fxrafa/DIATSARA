/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface Profile {
  id: string;
  nom: string;
  matricule: string;
  role: string;
  gare_ref: number | null;
}

interface Gare {
  num: number;
  code: string;
  gare: string;
  pk: number;
  commune_tutelle: string;
}

export async function getVBCData() {
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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Profil non trouvé' };
  }

  if (profile.role !== 'VBC') {
    return { error: 'Accès non autorisé' };
  }

  let gare: Gare | null = null;
  if (profile.gare_ref) {
    const { data: gareData } = await supabaseAdmin
      .from('gare')
      .select('*')
      .eq('num', profile.gare_ref)
      .single();
    gare = gareData;
  }

  const { data: voyages } = await supabaseAdmin
    .from('voyages')
    .select(`
      *,
      gare_depart_detail:gare_depart(code, gare),
      gare_arrivee_detail:gare_arrivee(code, gare)
    `)
    .eq('statut', 'actif')
    .order('date_voyage', { ascending: true });

  const voyagesWithQuotas = await Promise.all(
    (voyages || []).map(async (voyage) => {
      let quotaTickets: any[] = [];
      let quotaBagages: any[] = [];

      if (profile.gare_ref) {
        const { data: tickets } = await supabaseAdmin
          .from('quota_tickets')
          .select('*')
          .eq('voyage_id', voyage.id)
          .eq('gare_num', profile.gare_ref);
        
        if (tickets) {
          quotaTickets = tickets;
        }
      }

      if (gare?.commune_tutelle) {
        const { data: bagages } = await supabaseAdmin
          .from('quota_bagages')
          .select('*')
          .eq('voyage_id', voyage.id)
          .eq('commune_tutelle', gare.commune_tutelle);
        
        if (bagages) {
          quotaBagages = bagages;
        }
      }

      // Récupérer les tickets déjà vendus pour ce voyage
      const { data: ticketsVendus } = await supabaseAdmin
        .from('ticket_voyageur')
        .select('*')
        .eq('voyage_id', voyage.id)
        .eq('gare_ref', profile.gare_ref);

      const totalTicketsVendus = ticketsVendus?.length || 0;

      // Récupérer les bagages vendus
      const { data: bagagesVendus } = await supabaseAdmin
        .from('ticket_bagage')
        .select('poids')
        .eq('voyage_id', voyage.id)
        .eq('gare_ref', profile.gare_ref);

      const totalBagagesVendus = bagagesVendus?.reduce((sum, b) => sum + (b.poids || 0), 0) || 0;

      const totalTickets = quotaTickets.reduce((sum, q) => sum + q.quota, 0);
      const totalBagages = quotaBagages.reduce((sum, q) => sum + (q.quota_tonnes * 1000), 0);

      // Récupérer les places disponibles par classe
      let places_1ere = 0;
      let places_2eme = 0;

      // Récupérer les tickets vendus par classe pour ce voyage
      if (ticketsVendus) {
        const tickets1ere = ticketsVendus.filter((t: any) => t.classe === '1ere');
        const tickets2eme = ticketsVendus.filter((t: any) => t.classe === '2eme');
        
        // Calculer les places disponibles
        places_1ere = (voyage.formation_voiture * 60) - tickets1ere.length;
        places_2eme = (voyage.formation_voiture2 * 72) - tickets2eme.length;
        
        // Ne pas aller en dessous de 0
        places_1ere = Math.max(0, places_1ere);
        places_2eme = Math.max(0, places_2eme);
      }

      return {
        voyage,
        quota_tickets: quotaTickets,
        quota_bagages: quotaBagages,
        total_tickets: totalTickets,
        total_bagages: totalBagages,
        tickets_vendus: totalTicketsVendus,
        bagages_vendus: totalBagagesVendus,
        places_1ere: places_1ere,
        places_2eme: places_2eme,
      };
    })
  );

  return {
    profile,
    gare,
    voyages: voyagesWithQuotas,
  };
}

export async function getVoyageDetails(voyageId: string) {
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

  let quotaTicketsTotal = 0;
  let quotaBagagesTotal = 0;
  let ticketsVendus = 0;
  let bagagesVendus = 0;
  let places_1ere = 0;
  let places_2eme = 0;

  if (profile?.gare_ref) {
    const { data: tickets } = await supabaseAdmin
      .from('quota_tickets')
      .select('quota')
      .eq('voyage_id', voyageId)
      .eq('gare_num', profile.gare_ref);

    if (tickets) {
      quotaTicketsTotal = tickets.reduce((sum, q) => sum + q.quota, 0);
    }

    // Récupérer les tickets vendus par classe pour ce voyage
    const { data: vendus } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('classe')
      .eq('voyage_id', voyageId)
      .eq('gare_ref', profile.gare_ref);

    ticketsVendus = vendus?.length || 0;

    // Calculer les places disponibles par classe
    if (vendus) {
      const tickets1ere = vendus.filter((t: any) => t.classe === '1ere');
      const tickets2eme = vendus.filter((t: any) => t.classe === '2eme');
      
      places_1ere = (voyage.formation_voiture * 60) - tickets1ere.length;
      places_2eme = (voyage.formation_voiture2 * 72) - tickets2eme.length;
      
      places_1ere = Math.max(0, places_1ere);
      places_2eme = Math.max(0, places_2eme);
    }

    const { data: gareData } = await supabaseAdmin
      .from('gare')
      .select('commune_tutelle')
      .eq('num', profile.gare_ref)
      .single();

    if (gareData) {
      const { data: bagages } = await supabaseAdmin
        .from('quota_bagages')
        .select('quota_tonnes')
        .eq('voyage_id', voyageId)
        .eq('commune_tutelle', gareData.commune_tutelle);

      if (bagages) {
        quotaBagagesTotal = bagages.reduce((sum, q) => sum + (q.quota_tonnes * 1000), 0);
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
    },
    places: {
      places_1ere,
      places_2eme,
    }
  };
}

export async function getTarif(canton: string) {
  const { data: tarif, error } = await supabaseAdmin
    .from('tarifs')
    .select('*')
    .eq('canton', canton)
    .single();

  if (error) {
    return { error: 'Tarif non trouvé' };
  }

  return { tarif };
}

export async function getLastTicketNumber(voyageId: string, gareRef: number) {
  const { data: tickets } = await supabaseAdmin
    .from('ticket_voyageur')
    .select('num_ticket')
    .eq('voyage_id', voyageId)
    .eq('gare_ref', gareRef)
    .order('created_at', { ascending: false })
    .limit(1);

  if (tickets && tickets.length > 0) {
    const num = parseInt(tickets[0].num_ticket.split('-')[0].substring(1));
    return num + 1;
  }

  return 1;
}

export async function getTarifBagageColis(unite: string) {
  const { data: tarif, error } = await supabaseAdmin
    .from('tarif_bagage_colis')
    .select('*')
    .eq('unite', unite)
    .single();

  if (error) {
    return { error: 'Tarif non trouvé' };
  }

  return { tarif };
}

export async function getTicketsVendus(voyageId: string, gareRef: number) {
  // Récupérer les tickets voyageurs
  const { data: voyageurs } = await supabaseAdmin
    .from('ticket_voyageur')
    .select('*')
    .eq('voyage_id', voyageId)
    .eq('gare_ref', gareRef)
    .order('created_at', { ascending: false });

  // Récupérer les tickets bagages
  const { data: bagages } = await supabaseAdmin
    .from('ticket_bagage')
    .select('*')
    .eq('voyage_id', voyageId)
    .eq('gare_ref', gareRef)
    .order('created_at', { ascending: false });

  // Récupérer les tickets colis
  const { data: colis } = await supabaseAdmin
    .from('ticket_colis')
    .select('*')
    .eq('voyage_id', voyageId)
    .eq('gare_ref', gareRef)
    .order('created_at', { ascending: false });

  return {
    voyageurs: voyageurs || [],
    bagages: bagages || [],
    colis: colis || [],
  };
}