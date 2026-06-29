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

  // ✅ Récupérer les quotas GLOBAUX (sans voyage_id)
  const { data: quotaTicketsGlobal } = await supabaseAdmin
    .from('quota_tickets')
    .select('*');

  const { data: quotaBagagesGlobal } = await supabaseAdmin
    .from('quota_bagages')
    .select('*');

  // Créer des maps pour un accès rapide
  const quotaTicketsMap = new Map<number, { quota_2131: number; quota_2132: number }>();
  quotaTicketsGlobal?.forEach(q => {
    quotaTicketsMap.set(q.gare_num, {
      quota_2131: q.quota_2131 || 0,
      quota_2132: q.quota_2132 || 0,
    });
  });

  const quotaBagagesMap = new Map<string, { quota_tonnes_2131: number; quota_tonnes_2132: number }>();
  quotaBagagesGlobal?.forEach(q => {
    quotaBagagesMap.set(q.commune_tutelle, {
      quota_tonnes_2131: q.quota_tonnes_2131 || 0,
      quota_tonnes_2132: q.quota_tonnes_2132 || 0,
    });
  });

  // ✅ Récupérer toutes les gares pour connaître les gares de la même commune
  const { data: allGares } = await supabaseAdmin
    .from('gare')
    .select('num, commune_tutelle');

  const garesParCommune = new Map<string, number[]>();
  allGares?.forEach(g => {
    const gares = garesParCommune.get(g.commune_tutelle) || [];
    gares.push(g.num);
    garesParCommune.set(g.commune_tutelle, gares);
  });

  const voyagesWithQuotas = await Promise.all(
    (voyages || []).map(async (voyage) => {
      let quotaTickets: any[] = [];
      let quotaBagages: any[] = [];
      
      const sens = voyage.sens;
      const gareRef = profile.gare_ref;
      const commune = gare?.commune_tutelle;
      
      // ✅ Récupérer toutes les gares de la commune
      const garesDeLaCommune = commune ? garesParCommune.get(commune) || [] : [];

      // ✅ Récupérer TOUS les tickets bagages vendus pour toutes les gares de la commune pour ce voyage
      const { data: bagagesVendus } = await supabaseAdmin
        .from('ticket_bagage')
        .select('poids, volume, gare_ref')
        .eq('voyage_id', voyage.id)
        .in('gare_ref', garesDeLaCommune);

      // ✅ Récupérer TOUS les tickets colis vendus pour toutes les gares de la commune pour ce voyage
      const { data: colisVendus } = await supabaseAdmin
        .from('ticket_colis')
        .select('poids, volume, gare_ref')
        .eq('voyage_id', voyage.id)
        .in('gare_ref', garesDeLaCommune);

      // ✅ Calcul du poids équivalent total vendu dans la commune (pour ce voyage)
      const poidsEquivalentBagages = bagagesVendus?.reduce((sum, b) => {
        return sum + (b.poids || 0) + ((b.volume || 0) * 500);
      }, 0) || 0;

      const poidsEquivalentColis = colisVendus?.reduce((sum, c) => {
        return sum + (c.poids || 0) + ((c.volume || 0) * 500);
      }, 0) || 0;

      const totalVenduCommune = poidsEquivalentBagages + poidsEquivalentColis;

      // ✅ Récupérer le quota total de la commune (initial)
      const quotaData = commune ? quotaBagagesMap.get(commune) : null;
      let quotaTotalCommune = 0;
      if (quotaData) {
        quotaTotalCommune = sens === '2131' ? quotaData.quota_tonnes_2131 : quotaData.quota_tonnes_2132;
      }

      // ✅ Stocker le quota INITIAL (pas le restant)
      // C'est important pour que le dashboard affiche correctement : Total = 5, Vendus = 1, Reste = 4
      if (commune && quotaTotalCommune > 0) {
        quotaBagages = [{ 
          id: `bagage-${commune}`,
          commune_tutelle: commune, 
          quota_tonnes: quotaTotalCommune, // ← QUOTA INITIAL (pas restant)
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }];
      }

      // ✅ Quota ticket pour cette gare selon le sens du voyage
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

      // ✅ Récupérer les tickets déjà vendus pour ce voyage (pour cette gare uniquement)
      const { data: ticketsVendus } = await supabaseAdmin
        .from('ticket_voyageur')
        .select('*')
        .eq('voyage_id', voyage.id)
        .eq('gare_ref', gareRef);

      const totalTicketsVendus = ticketsVendus?.length || 0;

      // ✅ Récupérer les bagages vendus pour cette gare (pour le poids vendu individuel)
      const { data: bagagesVendusGare } = await supabaseAdmin
        .from('ticket_bagage')
        .select('poids, volume')
        .eq('voyage_id', voyage.id)
        .eq('gare_ref', gareRef);

      const { data: colisVendusGare } = await supabaseAdmin
        .from('ticket_colis')
        .select('poids, volume')
        .eq('voyage_id', voyage.id)
        .eq('gare_ref', gareRef);

      // ✅ Calcul du poids équivalent vendu par cette gare
      const poidsEquivalentBagagesGare = bagagesVendusGare?.reduce((sum, b) => {
        return sum + (b.poids || 0) + ((b.volume || 0) * 500);
      }, 0) || 0;

      const poidsEquivalentColisGare = colisVendusGare?.reduce((sum, c) => {
        return sum + (c.poids || 0) + ((c.volume || 0) * 500);
      }, 0) || 0;

      const totalBagagesVendusGare = poidsEquivalentBagagesGare + poidsEquivalentColisGare;

      const totalTickets = quotaTickets.reduce((sum, q) => sum + q.quota, 0);
      const totalBagages = quotaBagages.reduce((sum, q) => sum + (q.quota_tonnes * 1000), 0);

      // Récupérer les places disponibles par classe
      let places_1ere = 0;
      let places_2eme = 0;

      if (ticketsVendus) {
        const tickets1ere = ticketsVendus.filter((t: any) => t.classe === '1ere');
        const tickets2eme = ticketsVendus.filter((t: any) => t.classe === '2eme');
        
        places_1ere = (voyage.formation_voiture * 60) - tickets1ere.length;
        places_2eme = (voyage.formation_voiture2 * 72) - tickets2eme.length;
        
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
        bagages_vendus: totalBagagesVendusGare,
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
    const sens = voyage.sens;
    
    // ✅ Quotas tickets
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

    // ✅ Tickets vendus
    const { data: vendus } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('classe')
      .eq('voyage_id', voyageId)
      .eq('gare_ref', profile.gare_ref);

    ticketsVendus = vendus?.length || 0;

    if (vendus) {
      const tickets1ere = vendus.filter((t: any) => t.classe === '1ere');
      const tickets2eme = vendus.filter((t: any) => t.classe === '2eme');
      
      places_1ere = (voyage.formation_voiture * 60) - tickets1ere.length;
      places_2eme = (voyage.formation_voiture2 * 72) - tickets2eme.length;
      
      places_1ere = Math.max(0, places_1ere);
      places_2eme = Math.max(0, places_2eme);
    }

    // ✅ Quotas bagages - commun pour toutes les gares de la commune
    const { data: gareData } = await supabaseAdmin
      .from('gare')
      .select('commune_tutelle')
      .eq('num', profile.gare_ref)
      .single();

    if (gareData) {
      const { data: bagages } = await supabaseAdmin
        .from('quota_bagages')
        .select('quota_tonnes_2131, quota_tonnes_2132')
        .eq('commune_tutelle', gareData.commune_tutelle);

      let quotaTotalCommune = 0;
      if (bagages && bagages.length > 0) {
        quotaTotalCommune = sens === '2131' 
          ? bagages[0].quota_tonnes_2131 || 0 
          : bagages[0].quota_tonnes_2132 || 0;
      }

      // ✅ Récupérer toutes les gares de la commune
      const { data: allGares } = await supabaseAdmin
        .from('gare')
        .select('num')
        .eq('commune_tutelle', gareData.commune_tutelle);

      const garesDeLaCommune = allGares?.map(g => g.num) || [];

      // ✅ Récupérer le poids TOTAL vendu dans la commune (toutes les gares)
      const { data: bagagesVendusData } = await supabaseAdmin
        .from('ticket_bagage')
        .select('poids, volume')
        .eq('voyage_id', voyageId)
        .in('gare_ref', garesDeLaCommune);

      const { data: colisVendusData } = await supabaseAdmin
        .from('ticket_colis')
        .select('poids, volume')
        .eq('voyage_id', voyageId)
        .in('gare_ref', garesDeLaCommune);

      const totalPoidsBagages = bagagesVendusData?.reduce((sum, b) => {
        return sum + (b.poids || 0) + ((b.volume || 0) * 500);
      }, 0) || 0;

      const totalPoidsColis = colisVendusData?.reduce((sum, c) => {
        return sum + (c.poids || 0) + ((c.volume || 0) * 500);
      }, 0) || 0;

      const totalVenduCommune = totalPoidsBagages + totalPoidsColis;

      // ✅ bagages_max = quota TOTAL de la commune (pour afficher "X / Y")
      quotaBagagesTotal = quotaTotalCommune * 1000;

      // ✅ bagages_vendus = poids TOTAL vendu dans la commune (toutes les gares)
      // La page de vente utilise getBagageRestant() = bagages_max - bagages_vendus
      bagagesVendus = totalVenduCommune;
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
    console.error('Erreur getTarifBagageColis:', error);
    return { error: 'Tarif non trouvé' };
  }

  return { tarif };
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

  const { data: bagages, error: bagagesError } = await supabaseAdmin
    .from('ticket_bagage')
    .select('*')
    .eq('voyage_id', voyageId)
    .eq('gare_ref', gareRef)
    .order('created_at', { ascending: false });

  if (bagagesError) {
    console.error('Erreur tickets bagages:', bagagesError);
  }

  const { data: colis, error: colisError } = await supabaseAdmin
    .from('ticket_colis')
    .select('*')
    .eq('voyage_id', voyageId)
    .eq('gare_ref', gareRef)
    .order('created_at', { ascending: false });

  if (colisError) {
    console.error('Erreur tickets colis:', colisError);
  }

  return {
    voyageurs: voyageurs || [],
    bagages: bagages || [],
    colis: colis || [],
  };
}