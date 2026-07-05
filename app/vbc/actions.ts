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

  // Récupérer les quotas tickets GLOBAUX
  const { data: quotaTicketsGlobal } = await supabaseAdmin
    .from('quota_tickets')
    .select('*');

  const quotaTicketsMap = new Map<number, { quota_2131: number; quota_2132: number }>();
  quotaTicketsGlobal?.forEach(q => {
    quotaTicketsMap.set(q.gare_num, {
      quota_2131: q.quota_2131 || 0,
      quota_2132: q.quota_2132 || 0,
    });
  });

  const voyagesWithQuotas = await Promise.all(
    (voyages || []).map(async (voyage) => {
      let quotaTickets: any[] = [];
      
      const sens = voyage.sens;
      const gareRef = profile.gare_ref;

      // Quota ticket pour cette gare selon le sens du voyage
      if (gareRef) {
        const quotaDataTicket = quotaTicketsMap.get(gareRef);
        let quota = 0;
        if (quotaDataTicket) {
          quota = sens === '2131' ? quotaDataTicket.quota_2131 : quotaDataTicket.quota_2132;
        }
        
        if (quota > 0) {
          quotaTickets = [{ 
            id: `ticket-${gareRef}`, 
            gare_num: gareRef, 
            quota: quota,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }];
        }
      }

      // ✅ Récupérer TOUS les tickets vendus pour ce voyage (toutes gares confondues)
      const { data: allTicketsVendus } = await supabaseAdmin
        .from('ticket_voyageur')
        .select('classe')
        .eq('voyage_id', voyage.id);

      // ✅ Récupérer les tickets vendus pour cette gare spécifique
      const { data: ticketsVendusGare } = await supabaseAdmin
        .from('ticket_voyageur')
        .select('*')
        .eq('voyage_id', voyage.id)
        .eq('gare_ref', gareRef);

      const totalTicketsVendusGare = ticketsVendusGare?.length || 0;
      const totalTickets = quotaTickets.reduce((sum, q) => sum + q.quota, 0);

      // ✅ Calculer les places disponibles globalement
      const totalTickets1ere = allTicketsVendus?.filter((t: any) => t.classe === '1ere').length || 0;
      const totalTickets2eme = allTicketsVendus?.filter((t: any) => t.classe === '2eme').length || 0;
      
      const places_1ere = (voyage.formation_voiture * 60) - totalTickets1ere;
      const places_2eme = (voyage.formation_voiture2 * 72) - totalTickets2eme;
      
      // Ne pas descendre en dessous de 0
      const places_1ere_dispo = Math.max(0, places_1ere);
      const places_2eme_dispo = Math.max(0, places_2eme);

      return {
        voyage,
        quota_tickets: quotaTickets,
        total_tickets: totalTickets,
        tickets_vendus: totalTicketsVendusGare,
        places_1ere: places_1ere_dispo,
        places_2eme: places_2eme_dispo,
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
  let ticketsVendusGare = 0;
  let places_1ere = 0;
  let places_2eme = 0;

  if (profile?.gare_ref) {
    const sens = voyage.sens;
    
    // Quotas tickets pour cette gare
    const { data: tickets } = await supabaseAdmin
      .from('quota_tickets')
      .select('quota_2131, quota_2132')
      .eq('gare_num', profile.gare_ref);

    if (tickets && tickets.length > 0) {
      if (sens === '2131') {
        quotaTicketsTotal = tickets[0].quota_2131 || 0;
      } else {
        quotaTicketsTotal = tickets[0].quota_2132 || 0;
      }
    }

    // ✅ Tickets vendus pour cette gare
    const { data: vendusGare } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('classe')
      .eq('voyage_id', voyageId)
      .eq('gare_ref', profile.gare_ref);

    ticketsVendusGare = vendusGare?.length || 0;

    // ✅ Récupérer TOUS les tickets vendus pour ce voyage (toutes gares)
    const { data: allVendus } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('classe')
      .eq('voyage_id', voyageId);

    // ✅ Calculer les places disponibles globalement
    const totalTickets1ere = allVendus?.filter((t: any) => t.classe === '1ere').length || 0;
    const totalTickets2eme = allVendus?.filter((t: any) => t.classe === '2eme').length || 0;
    
    places_1ere = (voyage.formation_voiture * 60) - totalTickets1ere;
    places_2eme = (voyage.formation_voiture2 * 72) - totalTickets2eme;
    
    places_1ere = Math.max(0, places_1ere);
    places_2eme = Math.max(0, places_2eme);
  }

  return { 
    voyage,
    quotas: {
      tickets_max: quotaTicketsTotal,
      tickets_vendus: ticketsVendusGare,
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

export async function getTicketsVendus(voyageId: string, gareRef: number) {
  const { data: voyageurs, error: voyageursError } = await supabaseAdmin
    .from('ticket_voyageur')
    .select('*')
    .eq('voyage_id', voyageId)
    .eq('gare_ref', gareRef)
    .order('created_at', { ascending: false });

  if (voyageursError) {
    console.error('Erreur tickets voyageurs:', voyageursError);
  }

  return {
    voyageurs: voyageurs || [],
  };
}