/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

interface ActionResponse {
  error?: string;
  success?: boolean;
}

export async function updateUserProfile(
  userId: string,
  nom: string,
  matricule: string,
  role: string,
  gareRef: number | null
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

  if (profile?.role !== 'ADMIN') {
    return { error: 'Accès non autorisé' };
  }

  if (!nom || nom.trim().length < 2) {
    return { error: 'Le nom doit contenir au moins 2 caractères' };
  }

  if (!matricule || matricule.trim().length < 3) {
    return { error: 'Le matricule doit contenir au moins 3 caractères' };
  }

  if (!role || !['ADMIN', 'DCO', 'CTV', 'VBC'].includes(role)) {
    return { error: 'Rôle invalide' };
  }

  const { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('matricule', matricule.trim().toUpperCase())
    .neq('id', userId)
    .single();

  if (existingUser) {
    return { error: 'Ce matricule est déjà utilisé' };
  }

  const updateData: any = {
    nom: nom.trim(),
    matricule: matricule.trim().toUpperCase(),
    role: role,
  };

  if (role === 'VBC') {
    updateData.gare_ref = gareRef || null;
  } else {
    updateData.gare_ref = null;
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Erreur mise à jour:', error);
    return { error: 'Erreur lors de la mise à jour' };
  }

  revalidatePath('/admin');
  return { success: true };
}