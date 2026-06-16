'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Type pour le retour des actions
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
  const formation_wagon = parseInt(formData.get('formation_wagon') as string);

  // Validation
  if (!date_voyage || !sens || !gare_depart || !gare_arrivee) {
    return { error: 'Tous les champs sont requis' };
  }

  if (gare_depart === gare_arrivee) {
    return { error: 'La gare de départ et d\'arrivée doivent être différentes' };
  }

  if (formation_voiture < 0 || formation_voiture > 6) {
    return { error: 'Le nombre de voitures doit être entre 0 et 6' };
  }

  if (formation_wagon < 0 || formation_wagon > 6) {
    return { error: 'Le nombre de wagons doit être entre 0 et 6' };
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

  // Vérifier que l'utilisateur est DCO
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'DCO') {
    return { error: 'Accès non autorisé' };
  }

  // Créer le voyage
  const { error } = await supabaseAdmin
    .from('voyages')
    .insert({
      date_voyage,
      sens,
      gare_depart,
      gare_arrivee,
      formation_voiture,
      formation_wagon,
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
  const formation_wagon = parseInt(formData.get('formation_wagon') as string);

  if (!id || !date_voyage || !sens || !gare_depart || !gare_arrivee) {
    return { error: 'Tous les champs sont requis' };
  }

  if (gare_depart === gare_arrivee) {
    return { error: 'La gare de départ et d\'arrivée doivent être différentes' };
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

  // Vérifier que le voyage existe et est actif
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

  // Mettre à jour
  const { error } = await supabaseAdmin
    .from('voyages')
    .update({
      date_voyage,
      sens,
      gare_depart,
      gare_arrivee,
      formation_voiture,
      formation_wagon,
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