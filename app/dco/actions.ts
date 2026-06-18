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

  const { error } = await supabaseAdmin
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
    });

  if (error) {
    console.error('Erreur création voyage:', error);
    return { error: 'Erreur lors de la création du voyage' };
  }

  revalidatePath('/dco/planification');
  revalidatePath('/dco/historique');
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

  const { error } = await supabaseAdmin
    .from('voyages')
    .update({ statut: 'termine' })
    .eq('id', id);

  if (error) {
    return { error: 'Erreur lors de la mise à jour' };
  }

  revalidatePath('/dco/historique');
  return { success: true };
}

// NOUVELLE FONCTION : Récupérer les voyages actifs avec leurs quotas
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

  // Vérifier que l'utilisateur est DCO
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

  // Pour chaque voyage, récupérer les quotas
  const voyagesWithQuotas = await Promise.all(
    (voyages || []).map(async (voyage) => {
      // Récupérer les quotas tickets
      const { data: tickets } = await supabaseAdmin
        .from('quota_tickets')
        .select('quota')
        .eq('voyage_id', voyage.id);

      // Récupérer les quotas bagages
      const { data: bagages } = await supabaseAdmin
        .from('quota_bagages')
        .select('quota_tonnes')
        .eq('voyage_id', voyage.id);

      const totalPlaces = tickets?.reduce((sum, t) => sum + t.quota, 0) || 0;
      const totalTonnes = bagages?.reduce((sum, b) => sum + b.quota_tonnes, 0) || 0;

      return {
        ...voyage,
        total_places_attribuees: totalPlaces,
        total_tonnes_attribuees: totalTonnes,
      };
    })
  );

  return { voyages: voyagesWithQuotas };
}