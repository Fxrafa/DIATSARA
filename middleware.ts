/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next()

  // Créer le client Supabase avec les cookies de la requête
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Ajouter le cookie à la réponse
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )

  // Récupérer la session
  const { data: { session } } = await supabase.auth.getSession()

  // Pas de session -> redirection vers /login (sauf si déjà sur /login)
  if (!session && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session) {
    // Récupérer le rôle de l'utilisateur depuis la table profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = profile?.role
    const path = req.nextUrl.pathname

    // Redirection racine /dashboard vers le tableau de bord spécifique
    if (path === '/dashboard') {
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url))
      if (role === 'DCO') return NextResponse.redirect(new URL('/dco', req.url))
      if (role === 'CTV') return NextResponse.redirect(new URL('/ctv', req.url))
      if (role === 'VBC') return NextResponse.redirect(new URL('/vbc', req.url))
    }

    // Vérifier que l'utilisateur n'accède pas à un rôle qui n'est pas le sien
    if (path.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    if (path.startsWith('/dco') && role !== 'DCO') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    if (path.startsWith('/ctv') && role !== 'CTV') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    if (path.startsWith('/vbc') && role !== 'VBC') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}