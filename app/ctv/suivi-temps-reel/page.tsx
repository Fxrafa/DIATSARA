'use client';

import { Eye } from 'lucide-react';

export default function CTVSuiviTempsReelPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100/50 mb-6">
          <Eye className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-stone-800 mb-2">
          Suivi en temps réel
        </h1>
        <p className="text-stone-500 max-w-md">
          Cette page est en cours de développement.
          <br />
          Revenez bientôt pour découvrir les nouvelles fonctionnalités.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-stone-400">En construction</span>
        </div>
      </div>
    </div>
  );
}