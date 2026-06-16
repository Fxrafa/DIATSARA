/* eslint-disable @typescript-eslint/no-unused-vars */
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

export async function getVoyagesActifs() {
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

  const { data: voyages, error } = await supabase
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

export async function getQuotasTickets(voyageId: string) {
  const { data: quotas, error } = await supabaseAdmin
    .from('quota_tickets')
    .select('*')
    .eq('voyage_id', voyageId);

  if (error) {
    return { error: 'Erreur lors du chargement des quotas' };
  }

  return { quotas };
}

export async function getQuotasBagages(voyageId: string) {
  const { data: quotas, error } = await supabaseAdmin
    .from('quota_bagages')
    .select('*')
    .eq('voyage_id', voyageId);

  if (error) {
    return { error: 'Erreur lors du chargement des quotas' };
  }

  return { quotas };
}

export async function saveQuotaTickets(
  voyageId: string,
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

  // Vérifier que l'utilisateur est CTV
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'CTV') {
    return { error: 'Accès non autorisé' };
  }

  // Vérifier le voyage
  const { data: voyage } = await supabaseAdmin
    .from('voyages')
    .select('places_max')
    .eq('id', voyageId)
    .single();

  if (!voyage) {
    return { error: 'Voyage non trouvé' };
  }

  // Vérifier que le total des quotas ne dépasse pas les places max
  const totalQuotas = quotas.reduce((sum, q) => sum + q.quota, 0);
  if (totalQuotas > voyage.places_max) {
    return { error: `Le total des quotas (${totalQuotas}) dépasse la capacité du train (${voyage.places_max} places)` };
  }

  // Upsert les quotas
  for (const q of quotas) {
    await supabaseAdmin
      .from('quota_tickets')
      .upsert({
        voyage_id: voyageId,
        gare_num: q.gare_num,
        quota: q.quota,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'voyage_id,gare_num'
      });
  }

  revalidatePath(`/ctv/quotas`);
  return { success: true };
}

export async function saveQuotaBagages(
  voyageId: string,
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

  // Vérifier que l'utilisateur est CTV
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'CTV') {
    return { error: 'Accès non autorisé' };
  }

  // Vérifier le voyage
  const { data: voyage } = await supabaseAdmin
    .from('voyages')
    .select('poids_max')
    .eq('id', voyageId)
    .single();

  if (!voyage) {
    return { error: 'Voyage non trouvé' };
  }

  // Vérifier que le total des quotas ne dépasse pas le poids max
  const totalPoids = quotas.reduce((sum, q) => sum + q.quota_tonnes, 0);
  if (totalPoids > voyage.poids_max) {
    return { error: `Le total des quotas (${totalPoids}T) dépasse la capacité du train (${voyage.poids_max}T)` };
  }

  // Upsert les quotas
  for (const q of quotas) {
    await supabaseAdmin
      .from('quota_bagages')
      .upsert({
        voyage_id: voyageId,
        commune_tutelle: q.commune_tutelle,
        quota_tonnes: q.quota_tonnes,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'voyage_id,commune_tutelle'
      });
  }

  revalidatePath(`/ctv/quotas`);
  return { success: true };
}