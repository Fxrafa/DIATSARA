'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { redirect } from 'next/navigation'

export async function loginWithMatricule(
  prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const matricule = formData.get('matricule') as string
  const password = formData.get('password') as string

  if (!matricule || !password) {
    return { error: 'Matricule et mot de passe requis' }
  }

  // 1. Chercher l'email dans la table profiles à partir du matricule
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('matricule', matricule.trim().toUpperCase())
    .single()

  if (profileError || !profile) {
    return { error: 'Matricule ou mot de passe incorrect' }
  }

  const email = profile.email

  // 2. Créer le client Supabase avec les cookies (pour établir la session)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // 3. Authentifier avec l'email et le mot de passe
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { error: 'Matricule ou mot de passe incorrect' }
  }

  // 4. Redirection après connexion réussie
  redirect('/dashboard')
}