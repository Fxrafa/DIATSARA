/* eslint-disable @typescript-eslint/no-unused-vars */ 
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

export async function createTicketBagage(data: {
  num_ticket: string;
  nature: string;
  depart: string;
  arrivee: string;
  poids: number;
  volume: number;
  poids_volume: string;
  montant: number;
  part_madarail: number;
  voyage_id: string;
  gare_ref: number;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('ticket_bagage')
      .insert(data);

    if (error) {
      console.error('Erreur createTicketBagage:', error);
      return { error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Erreur:', err);
    return { error: 'Erreur lors de la création' };
  }
}

export async function createTicketColis(data: {
  num_ticket: string;
  nature: string;
  depart: string;
  arrivee: string;
  poids: number;
  volume: number;
  poids_volume: string;
  montant: number;
  part_madarail: number;
  nom_expediteur: string;
  num_tel_expediteur: string;
  nom_destinataire: string;
  num_tel_destinataire: string;
  voyage_id: string;
  gare_ref: number;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('ticket_colis')
      .insert(data);

    if (error) {
      console.error('Erreur createTicketColis:', error);
      return { error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Erreur:', err);
    return { error: 'Erreur lors de la création' };
  }
}

export async function getRDDashboardData() {
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

  if (profile.role !== 'RD') {
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

  // Récupérer les quotas bagages
  const { data: quotaBagagesGlobal } = await supabaseAdmin
    .from('quota_bagages')
    .select('*');

  const quotaBagagesMap = new Map<string, { quota_tonnes_2131: number; quota_tonnes_2132: number }>();
  quotaBagagesGlobal?.forEach(q => {
    quotaBagagesMap.set(q.commune_tutelle, {
      quota_tonnes_2131: q.quota_tonnes_2131 || 0,
      quota_tonnes_2132: q.quota_tonnes_2132 || 0,
    });
  });

  // Récupérer toutes les gares
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
      const sens = voyage.sens;
      const commune = gare?.commune_tutelle;
      
      const garesDeLaCommune = commune ? garesParCommune.get(commune) || [] : [];

      // Récupérer les bagages vendus
      const { data: bagagesVendus } = await supabaseAdmin
        .from('ticket_bagage')
        .select('poids, volume')
        .eq('voyage_id', voyage.id)
        .in('gare_ref', garesDeLaCommune);

      const { data: colisVendus } = await supabaseAdmin
        .from('ticket_colis')
        .select('poids, volume')
        .eq('voyage_id', voyage.id)
        .in('gare_ref', garesDeLaCommune);

      const poidsEquivalentBagages = bagagesVendus?.reduce((sum, b) => {
        return sum + (b.poids || 0) + ((b.volume || 0) * 500);
      }, 0) || 0;

      const poidsEquivalentColis = colisVendus?.reduce((sum, c) => {
        return sum + (c.poids || 0) + ((c.volume || 0) * 500);
      }, 0) || 0;

      const totalVenduCommune = poidsEquivalentBagages + poidsEquivalentColis;

      const quotaData = commune ? quotaBagagesMap.get(commune) : null;
      let quotaTotalCommune = 0;
      if (quotaData) {
        quotaTotalCommune = sens === '2131' ? quotaData.quota_tonnes_2131 : quotaData.quota_tonnes_2132;
      }

      const totalBagages = quotaTotalCommune * 1000;

      // Vérifier si la vente est désactivée
      const { data: desactivee } = await supabaseAdmin
        .from('vente_desactivee')
        .select('id')
        .eq('voyage_id', voyage.id)
        .eq('gare_num', profile.gare_ref)
        .maybeSingle();

      return {
        voyage,
        total_bagages: totalBagages,
        bagages_vendus: totalVenduCommune,
        vente_desactivee: !!desactivee,
      };
    })
  );

  return {
    profile,
    gare,
    voyages: voyagesWithQuotas,
  };
}

export async function getVoyageDetailsRD(voyageId: string) {
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

  let quotaBagagesTotal = 0;
  let bagagesVendus = 0;

  if (profile?.gare_ref) {
    const sens = voyage.sens;

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

      const { data: allGares } = await supabaseAdmin
        .from('gare')
        .select('num')
        .eq('commune_tutelle', gareData.commune_tutelle);

      const garesDeLaCommune = allGares?.map(g => g.num) || [];

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

      bagagesVendus = totalPoidsBagages + totalPoidsColis;
      quotaBagagesTotal = quotaTotalCommune * 1000;
    }
  }

  return { 
    voyage,
    quotas: {
      bagages_max: quotaBagagesTotal,
      bagages_vendus: bagagesVendus,
    }
  };
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

export async function getLastTicketNumber(voyageId: string, gareRef: number, prefix: string) {
  const table = prefix === 'B' ? 'ticket_bagage' : 'ticket_colis';
  const { data: tickets } = await supabaseAdmin
    .from(table)
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