/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  // Utiliser getUser() pour vérifier l'authentification
  const { data: { user }, error } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  // Si pas d'utilisateur et pas sur login -> rediriger vers login
  if ((!user || error) && path !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Si utilisateur est sur login -> rediriger vers dashboard
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (user) {
    // Récupérer le rôle - avec gestion d'erreur
    let role = null;
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(); // Utiliser maybeSingle() au lieu de single()

      if (!profileError && profile) {
        role = profile.role;
      }
    } catch (err) {
      console.error('Erreur lors de la récupération du rôle:', err);
    }

    // Redirection racine /dashboard
    if (path === '/dashboard') {
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url));
      if (role === 'DCO') return NextResponse.redirect(new URL('/dco', req.url));
      if (role === 'CTV') return NextResponse.redirect(new URL('/ctv', req.url));
      if (role === 'VBC') return NextResponse.redirect(new URL('/vbc', req.url));
      // Si pas de rôle, rediriger vers login
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Vérification des accès par rôle
    if (path.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (path.startsWith('/dco') && role !== 'DCO') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (path.startsWith('/ctv') && role !== 'CTV') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (path.startsWith('/vbc') && role !== 'VBC') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};