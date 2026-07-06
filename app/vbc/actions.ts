/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseAdminSite } from '@/lib/supabaseAdminSite';

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

// Mapping des noms de gares vers leurs codes
const NOM_TO_CODE: { [key: string]: string } = {
  'Moramanga': 'MGA',
  'Andasibe': 'ADB',
  'Fanovana': 'FNV',
  'Ambatovola': 'ABV',
  'Antanifotsy': 'ATY',
  'Andekaleka': 'ADK',
  'Ambalahoraka': 'ABH',
  'Jirama PK206': 'JRM',
  'Lohariandava': 'LHD',
  'Sandrakazomena': 'SKM',
  'Fanasana': 'FNS',
  'Mangabe': 'MGB',
  'Razanaka': 'RZK',
  'Anivorano': 'ANV',
  'Brickaville': 'BKV',
  'Ambila': 'ABL',
  'Vavony': 'VVN',
  'Ampanotoamaizina': 'ZIN',
  'Andranokoditra': 'ADR',
  'Tampina': 'TPN',
  'Tapolo': 'TPL',
  'Ankarefo': 'AKF',
  'Vohiteza': 'VTZ',
  'Ivondro': 'IVD',
  'Manguiers': 'MNG',
};

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

      // Récupérer les tickets vendus pour cette gare
      const { data: ticketsVendus } = await supabaseAdmin
        .from('ticket_voyageur')
        .select('*')
        .eq('voyage_id', voyage.id)
        .eq('gare_ref', gareRef);

      const totalTicketsVendus = ticketsVendus?.length || 0;
      const totalTickets = quotaTickets.reduce((sum, q) => sum + q.quota, 0);

      // Récupérer les tickets réservés sur le site (autre BDD)
      const { data: ticketsSite } = await supabaseAdminSite
        .from('ticket_voyageur_site')
        .select('*')
        .eq('id_voyage', voyage.id)
        .eq('status', 'actif');

      // Filtrer les tickets site par département (nom complet vers code)
      const filteredTicketsSite = ticketsSite?.filter(ticket => {
        if (ticket.depart_code) {
          return ticket.depart_code === gare?.code;
        }
        if (ticket.depart) {
          const code = NOM_TO_CODE[ticket.depart];
          return code === gare?.code;
        }
        return false;
      }) || [];

      const totalTicketsSite = filteredTicketsSite?.length || 0;

      return {
        voyage,
        quota_tickets: quotaTickets,
        total_tickets: totalTickets,
        tickets_vendus: totalTicketsVendus,
        tickets_site: totalTicketsSite,
        places_1ere: 0,
        places_2eme: 0,
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
  let ticketsVendus = 0;
  let ticketsSite = 0;

  if (profile?.gare_ref) {
    const sens = voyage.sens;
    
    // Quotas tickets
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

    // Tickets vendus
    const { data: vendus } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('*')
      .eq('voyage_id', voyageId)
      .eq('gare_ref', profile.gare_ref);

    ticketsVendus = vendus?.length || 0;

    // Récupérer le code de la gare du vendeur
    const { data: gareData } = await supabaseAdmin
      .from('gare')
      .select('code, gare')
      .eq('num', profile.gare_ref)
      .single();

    // Tickets site actifs (autre BDD) - filtrés par depart
    if (gareData) {
      const { data: ticketsSiteData } = await supabaseAdminSite
        .from('ticket_voyageur_site')
        .select('*')
        .eq('id_voyage', voyage.id)
        .eq('status', 'actif');

      // Filtrer par depart (nom complet vers code)
      const filteredTicketsSite = ticketsSiteData?.filter(ticket => {
        if (ticket.depart_code) {
          return ticket.depart_code === gareData.code;
        }
        if (ticket.depart) {
          const code = NOM_TO_CODE[ticket.depart];
          return code === gareData.code;
        }
        return false;
      }) || [];

      ticketsSite = filteredTicketsSite?.length || 0;
    }
  }

  return { 
    voyage,
    quotas: {
      tickets_max: quotaTicketsTotal,
      tickets_vendus: ticketsVendus,
      tickets_site: ticketsSite,
    },
    places: {
      places_1ere: 0,
      places_2eme: 0,
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

// Récupérer les tickets réservés sur le site (autre BDD)
export async function getTicketsSite(voyageId: string, departCode: string) {
  console.log('🔍 Recherche tickets site pour:', { voyageId, departCode });

  const { data: tickets, error } = await supabaseAdminSite
    .from('ticket_voyageur_site')
    .select('*')
    .eq('id_voyage', voyageId)
    .eq('status', 'actif')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur tickets site:', error);
    return { error: error.message };
  }

  console.log('📦 Tickets bruts:', tickets?.length || 0);

  // Filtrer les tickets dont le depart correspond au code
  const filteredTickets = tickets?.filter(ticket => {
    // Si la colonne depart_code existe
    if (ticket.depart_code) {
      return ticket.depart_code === departCode;
    }
    // Si la colonne depart contient le nom complet
    if (ticket.depart) {
      const code = NOM_TO_CODE[ticket.depart];
      return code === departCode;
    }
    return false;
  }) || [];

  console.log('✅ Tickets filtrés:', filteredTickets.length);

  return { tickets: filteredTickets };
}

// ✅ Valider un ticket réservé sur le site - Version corrigée
export async function validerTicketSite(
  ticketId: string,
  voyageId: string,
  gareRef: number,
  nomVendeur: string,
  numTicket: string
) {
  try {
    // 1. Récupérer le ticket du site (autre BDD)
    const { data: ticketSite, error: fetchError } = await supabaseAdminSite
      .from('ticket_voyageur_site')
      .select('*')
      .eq('id', ticketId)
      .eq('status', 'actif')
      .single();

    if (fetchError || !ticketSite) {
      console.error('❌ Ticket non trouvé:', fetchError);
      return { error: 'Ticket non trouvé ou déjà validé' };
    }

    console.log('📦 Ticket site trouvé:', ticketSite);

    // 2. Mettre à jour le statut du ticket site (actif → inactif)
    // ✅ Utiliser uniquement les colonnes qui existent
    const updateData: any = {
      status: 'inactif',
      valide_par: nomVendeur,
    };

    console.log('📝 Mise à jour ticket site:', updateData);

    const { error: updateError } = await supabaseAdminSite
      .from('ticket_voyageur_site')
      .update(updateData)
      .eq('id', ticketId);

    if (updateError) {
      console.error('❌ Erreur mise à jour ticket site:', updateError);
      return { error: 'Erreur lors de la validation du ticket' };
    }

    // 3. Insérer le ticket dans la table ticket_voyageur (BDD principale)
    const insertData = {
      num_ticket: numTicket,
      nom_voyageur: ticketSite.nom_voyageur,
      cin: ticketSite.cin,
      mineur: ticketSite.mineur || false,
      depart: ticketSite.depart,
      arrivee: ticketSite.arrivee,
      classe: ticketSite.classe,
      montant: ticketSite.montant,
      part_madarail: ticketSite.part_madarail,
      voyage_id: voyageId,
      gare_ref: gareRef,
      is_site: true,  // ✅ La colonne doit exister dans la table
    };

    console.log('📝 Insertion ticket voyageur:', insertData);

    const { error: insertError } = await supabaseAdmin
      .from('ticket_voyageur')
      .insert(insertData);

    if (insertError) {
      console.error('❌ Erreur insertion ticket voyageur:', insertError);
      // Annuler la mise à jour du ticket site
      await supabaseAdminSite
        .from('ticket_voyageur_site')
        .update({ 
          status: 'actif', 
          valide_par: null, 
        })
        .eq('id', ticketId);
      return { error: 'Erreur lors du transfert du ticket' };
    }

    console.log('✅ Ticket validé avec succès:', numTicket);
    return { success: true };
  } catch (err) {
    console.error('❌ Erreur validation ticket site:', err);
    return { error: 'Erreur lors de la validation' };
  }
}