'use client';

import { useActionState } from 'react';
import { loginWithMatricule } from './actions';
import { User, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginWithMatricule,
    undefined
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-brrom-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all">
        {/* Logo / En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 text-white mb-4 shadow-lg">
            <span className="text-3xl font-bold">D</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">DIATSARA</h1>
          <p className="text-gray-600 mt-1">Système de gestion des gares</p>
        </div>

        {/* Formulaire */}
        <form action={formAction} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matricule
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="matricule"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                placeholder="Ex: ADM001"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                name="password"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                placeholder="Votre mot de passe"
                required
              />
            </div>
          </div>

          {state?.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Utilisez votre matricule pour vous connecter
          </p>
          <div className="mt-2 flex justify-center gap-2">
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">ADM001</span>
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">DCO001</span>
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">CTV001</span>
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">VBC001</span>
          </div>
        </div>
      </div>
    </div>
  );
}