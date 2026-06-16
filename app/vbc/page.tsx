'use client';

import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

interface Gare {
  num: number;
  code: string;
  gare: string;
  pk: number;
  commune_tutelle: string;
}

export default function VBCPage() {
  const [gare, setGare] = useState<Gare | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ nom: string; matricule: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Récupérer le profil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nom, matricule, gare_ref')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData);

        // Récupérer la gare
        if (profileData?.gare_ref) {
          const { data: gareData } = await supabase
            .from('gare')
            .select('*')
            .eq('num', profileData.gare_ref)
            .single();
          setGare(gareData);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard VBC</h1>
          <p className="text-gray-600 mt-1">Espace vendeur</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-500">Chargement...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations vendeur */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes informations</h2>
              {profile && (
                <div className="space-y-2">
                  <p><span className="font-medium">Nom :</span> {profile.nom}</p>
                  <p><span className="font-medium">Matricule :</span> {profile.matricule}</p>
                </div>
              )}
            </div>

            {/* Informations gare */}
            {gare ? (
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Gare rattachée</h2>
                <div className="space-y-2">
                  <p><span className="font-medium">Gare :</span> {gare.gare}</p>
                  <p><span className="font-medium">Code :</span> {gare.code}</p>
                  <p><span className="font-medium">PK :</span> {gare.pk}</p>
                  <p><span className="font-medium">Commune :</span> {gare.commune_tutelle}</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500">Aucune gare rattachée</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}