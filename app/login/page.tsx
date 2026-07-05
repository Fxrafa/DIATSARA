/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useActionState, useState, useEffect } from 'react';
import { loginWithMatricule } from './actions';
import { User, Lock, LogIn, AlertCircle, Train } from 'lucide-react';

// ── Horloge de style gare ferroviaire ──────────────────────────────
function RailwayClock() {
  const [time, setTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ⚠️ Ne pas rendre l'horloge côté serveur pour éviter l'erreur d'hydratation
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-72 h-72 rounded-full bg-stone-100 border-12 border-stone-800 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-stone-300 border-t-amber-700"></div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <div className="text-4xl font-mono font-bold text-stone-100 tracking-widest tabular-nums drop-shadow-lg">
            --:--<span className="text-amber-400">:--</span>
          </div>
          <div className="mt-2 text-stone-300 font-serif text-sm uppercase tracking-[0.2em]">
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourDeg = (hours % 12) * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const secondDeg = seconds * 6;

  const romanNumerals = [
    'XII', 'I', 'II', 'III', 'IV', 'V',
    'VI', 'VII', 'VIII', 'IX', 'X', 'XI'
  ];

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Cadran */}
      <div className="relative w-72 h-72 rounded-full bg-stone-100 border-12 border-stone-800 shadow-2xl shadow-black/40">
        {/* Cercles concentriques */}
        <div className="absolute inset-2 rounded-full border-2 border-stone-300/50" />
        <div className="absolute inset-4 rounded-full border border-stone-200/30" />

        {/* Chiffres romains */}
        {romanNumerals.map((num, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 50 + 38 * Math.cos(angle);
          const y = 50 + 38 * Math.sin(angle);
          return (
            <span
              key={num}
              className="absolute text-stone-800 font-serif font-bold text-lg"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {num}
            </span>
          );
        })}

        {/* Uniquement les petits traits des minutes (pas de grands traits) */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const r1 = 45;
          const r2 = 48;
          const x1 = 50 + r1 * Math.cos(angle);
          const y1 = 50 + r1 * Math.sin(angle);
          const x2 = 50 + r2 * Math.cos(angle);
          const y2 = 50 + r2 * Math.sin(angle);
          return (
            <div
              key={i}
              className="absolute bg-stone-400 w-0.5 h-1.5"
              style={{
                left: `${x1}%`,
                top: `${y1}%`,
                transform: `rotate(${i * 6}deg)`,
                transformOrigin: 'top center',
              }}
            />
          );
        })}

        {/* Aiguille des heures */}
        <div
          className="absolute w-1.5 h-16 bg-stone-900 rounded-full origin-bottom"
          style={{
            left: 'calc(50% - 3px)',
            bottom: '50%',
            transform: `rotate(${hourDeg}deg)`,
          }}
        />

        {/* Aiguille des minutes */}
        <div
          className="absolute w-1 h-24 bg-stone-700 rounded-full origin-bottom"
          style={{
            left: 'calc(50% - 2px)',
            bottom: '50%',
            transform: `rotate(${minuteDeg}deg)`,
          }}
        />

        {/* Aiguille des secondes */}
        <div
          className="absolute w-0.5 h-28 bg-amber-700 rounded-full origin-bottom"
          style={{
            left: 'calc(50% - 1px)',
            bottom: '50%',
            transform: `rotate(${secondDeg}deg)`,
          }}
        />

        {/* Centre */}
        <div className="absolute w-4 h-4 bg-amber-700 rounded-full border-2 border-stone-100"
          style={{ left: 'calc(50% - 8px)', top: 'calc(50% - 8px)' }}
        />
      </div>

      {/* Date et heure digitale */}
      <div className="mt-6 text-center">
        <div className="text-4xl font-mono font-bold text-stone-100 tracking-widest tabular-nums drop-shadow-lg">
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
          <span className="text-amber-400">:{String(seconds).padStart(2, '0')}</span>
        </div>
        <div className="mt-2 text-stone-300 font-serif text-sm uppercase tracking-[0.2em]">
          {time.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page de login ──────────────────────────────────────────────────
export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginWithMatricule,
    undefined
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-stone-900">
      {/* Arrière-plan avec grille subtile */}
      <div className="absolute inset-0 bg-linear-to-br from-stone-900/95 via-stone-800/95 to-amber-950/85 backdrop-blur-[2px]" />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Lignes décoratives style gare */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-700 via-stone-600 to-emerald-700" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-700 via-stone-600 to-amber-700" />

      {/* Conteneur principal : formulaire + horloge côte à côte */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">

        {/* ── Panneau gauche : Horloge ── */}
        <div className="flex flex-col items-center">
          <div className="mb-4 flex items-center gap-3">
            <Train className="h-6 w-6 text-amber-500" />
            <span className="text-amber-500 font-serif text-sm uppercase tracking-[0.3em]">
              HORLOGE
            </span>
          </div>
          <RailwayClock />
        </div>

        {/* ── Panneau droit : Formulaire ── */}
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/25 border border-white/20 p-8 overflow-hidden">
            {/* Barre décorative haut */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-amber-700 via-stone-600 to-emerald-700" />

            {/* Logo / En-tête */}
            <div className="text-center mb-10 mt-2">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-linear-to-br from-amber-700 to-stone-700 text-white flex items-center justify-center mb-5 shadow-lg shadow-amber-900/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                <Train className="h-10 w-10" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
                DIATSARA
              </h1>
              <p className="mt-1 text-stone-400 text-sm font-serif italic">
                Système de gestion ferroviaire
              </p>
            </div>

            {/* Formulaire */}
            <form action={formAction} className="space-y-5">
              {/* Matricule */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Matricule
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-stone-400 group-focus-within:text-amber-700 transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="matricule"
                    className="w-full pl-11 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all"
                    placeholder="Votre matricule"
                    required
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-stone-400 group-focus-within:text-amber-700 transition-colors" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    className="w-full pl-11 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all"
                    placeholder="Votre mot de passe"
                    required
                  />
                </div>
              </div>

              {/* Erreur */}
              {state?.error && (
                <div className="flex items-center gap-3 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-700 text-sm animate-pulse">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* Bouton */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-linear-to-r from-amber-800 to-stone-800 hover:from-amber-700 hover:to-stone-700 text-white py-3.5 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 hover:shadow-amber-900/30 hover:-translate-y-0.5"
              >
                {isPending ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    <span>Se connecter</span>
                  </>
                )}
              </button>
            </form>

            {/* Pied de page */}
            <div className="mt-8 pt-6 border-t border-stone-100 text-center">
              <p className="text-xs text-stone-400">
                © {new Date().getFullYear()} DIATSARA
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}