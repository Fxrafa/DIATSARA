/* eslint-disable @typescript-eslint/no-unused-vars */
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface QuotaTicket {
  gare_num: number;
  quota: number;
  gare_detail?: { code: string; gare: string };
}

interface QuotaBagage {
  commune_tutelle: string;
  quota_tonnes: number;
}

interface VenteParGare {
  gare_num: number;
  gare_code: string;
  gare_name: string;
  tickets_vendus: number;
  part_madarail_total: number;
  poids_vendu: number;
  part_madarail_bagage_total: number;
}

interface VoyageDetail {
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
  formation_wagon: number;
  gare_depart_detail?: { code: string; gare: string };
  gare_arrivee_detail?: { code: string; gare: string };
  quota_tickets: QuotaTicket[];
  quota_bagages: QuotaBagage[];
  ventes_par_gare: VenteParGare[];
  total_tickets_vendus: number;
  total_part_madarail: number;
  total_poids_vendu: number;
  total_part_madarail_bagage: number;
}

export async function getVoyagesHistorique() {
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

export async function getVoyageDetailsCTV(voyageId: string) {
  try {
    // 1. Récupérer les détails du voyage
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

    // 2. Récupérer les quotas tickets
    const { data: quotaTickets, error: quotaTicketError } = await supabaseAdmin
      .from('quota_tickets')
      .select(`
        gare_num,
        quota,
        gare_detail:gare_num(code, gare)
      `)
      .eq('voyage_id', voyageId);

    if (quotaTicketError) {
      return { error: 'Erreur lors du chargement des quotas tickets' };
    }

    // 3. Récupérer les quotas bagages
    const { data: quotaBagages, error: quotaBagageError } = await supabaseAdmin
      .from('quota_bagages')
      .select('commune_tutelle, quota_tonnes')
      .eq('voyage_id', voyageId);

    if (quotaBagageError) {
      return { error: 'Erreur lors du chargement des quotas bagages' };
    }

    // 4. Récupérer les tickets voyageurs vendus
    const { data: ticketsVendus, error: ticketsError } = await supabaseAdmin
      .from('ticket_voyageur')
      .select('gare_ref, montant, part_madarail')
      .eq('voyage_id', voyageId);

    if (ticketsError) {
      return { error: 'Erreur lors du chargement des tickets voyageurs' };
    }

    // 5. Récupérer les tickets bagages vendus
    const { data: bagagesVendus, error: bagagesError } = await supabaseAdmin
      .from('ticket_bagage')
      .select('gare_ref, poids, part_madarail')
      .eq('voyage_id', voyageId);

    if (bagagesError) {
      return { error: 'Erreur lors du chargement des tickets bagages' };
    }

    // 6. Récupérer les tickets colis vendus
    const { data: colisVendus, error: colisError } = await supabaseAdmin
      .from('ticket_colis')
      .select('gare_ref, poids, part_madarail')
      .eq('voyage_id', voyageId);

    if (colisError) {
      return { error: 'Erreur lors du chargement des tickets colis' };
    }

    // 7. Récupérer toutes les gares
    const { data: allGares, error: garesError } = await supabaseAdmin
      .from('gare')
      .select('num, code, gare')
      .order('num');

    if (garesError) {
      return { error: 'Erreur lors du chargement des gares' };
    }

    // 8. Construire les ventes par gare
    const ventesParGare: VenteParGare[] = allGares.map(gare => {
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

    // Filtrer les gares qui ont des quotas ou des ventes
    const garesAvecQuotas = new Set(quotaTickets?.map(q => q.gare_num) || []);
    const garesAvecVentes = ventesParGare.filter(v => 
      v.tickets_vendus > 0 || v.poids_vendu > 0
    ).map(v => v.gare_num);

    const garesAffichables = new Set([...garesAvecQuotas, ...garesAvecVentes]);
    const ventesFiltrees = ventesParGare.filter(v => garesAffichables.has(v.gare_num));

    // Calculer les totaux
    const totalTicketsVendus = ventesFiltrees.reduce((sum, v) => sum + v.tickets_vendus, 0);
    const totalPartMadarail = ventesFiltrees.reduce((sum, v) => sum + v.part_madarail_total, 0);
    const totalPoidsVendu = ventesFiltrees.reduce((sum, v) => sum + v.poids_vendu, 0);
    const totalPartMadarailBagage = ventesFiltrees.reduce((sum, v) => sum + v.part_madarail_bagage_total, 0);

    const detail: VoyageDetail = {
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