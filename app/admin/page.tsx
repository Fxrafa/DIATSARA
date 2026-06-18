'use client';

import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Users, MapPin, Train, Shield, Briefcase, Store, User, 
  Edit, Save, X, AlertCircle, DollarSign, Search 
} from 'lucide-react';
import { updateUserProfile } from './actions';

interface User {
  id: string;
  nom: string;
  matricule: string;
  email: string;
  role: string;
  gare_ref: number | null;
  created_at: string;
}

interface Gare {
  num: number;
  code: string;
  gare: string;
  pk: number;
  commune_tutelle: string;
}

interface Tarif {
  id: number;
  canton: string;
  tarif_1ere_classe: number;
  distance: number;
  tarif_2eme_classe: number;
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administrateur', icon: <Shield className="h-4 w-4" /> },
  { value: 'DCO', label: 'Commercial', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'CTV', label: 'Chef de Train', icon: <Train className="h-4 w-4" /> },
  { value: 'VBC', label: 'Vendeur', icon: <Store className="h-4 w-4" /> },
];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [gares, setGares] = useState<Gare[]>([]);
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'utilisateurs' | 'gares' | 'tarifs'>('utilisateurs');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ 
    nom: string; 
    matricule: string; 
    role: string;
    gare_ref: number | null;
  }>({
    nom: '',
    matricule: '',
    role: 'VBC',
    gare_ref: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ 
    total: 0, 
    admins: 0, 
    dcos: 0, 
    ctvs: 0, 
    vbcs: 0,
    gares: 0,
    tarifs: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Récupérer les utilisateurs
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersData) {
        setUsers(usersData);
        setStats(prev => ({
          ...prev,
          total: usersData.length,
          admins: usersData.filter(u => u.role === 'ADMIN').length,
          dcos: usersData.filter(u => u.role === 'DCO').length,
          ctvs: usersData.filter(u => u.role === 'CTV').length,
          vbcs: usersData.filter(u => u.role === 'VBC').length,
        }));
      }

      // Récupérer les gares
      const { data: garesData } = await supabase
        .from('gare')
        .select('*')
        .order('num', { ascending: true });
      
      if (garesData) {
        setGares(garesData);
        setStats(prev => ({ ...prev, gares: garesData.length }));
      }

      // Récupérer les tarifs
      const { data: tarifsData } = await supabase
        .from('tarifs')
        .select('*')
        .order('id', { ascending: true });
      
      if (tarifsData) {
        setTarifs(tarifsData);
        setStats(prev => ({ ...prev, tarifs: tarifsData.length }));
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-800',
      DCO: 'bg-blue-100 text-blue-800',
      CTV: 'bg-green-100 text-green-800',
      VBC: 'bg-orange-100 text-orange-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, React.ReactNode> = {
      ADMIN: <Shield className="h-4 w-4" />,
      DCO: <Briefcase className="h-4 w-4" />,
      CTV: <Train className="h-4 w-4" />,
      VBC: <Store className="h-4 w-4" />,
    };
    return icons[role] || <User className="h-4 w-4" />;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: 'Administrateur',
      DCO: 'Commercial',
      CTV: 'Chef de Train',
      VBC: 'Vendeur',
    };
    return labels[role] || role;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR') + ' Ar';
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditForm({
      nom: user.nom,
      matricule: user.matricule,
      role: user.role,
      gare_ref: user.gare_ref || null,
    });
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!editingUserId) return;

    setError(null);
    setSuccess(null);

    if (editForm.role === 'VBC' && !editForm.gare_ref) {
      setError('Pour le rôle VBC, une gare doit être attribuée');
      return;
    }

    const result = await updateUserProfile(
      editingUserId,
      editForm.nom,
      editForm.matricule,
      editForm.role,
      editForm.gare_ref
    );

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess('Utilisateur modifié avec succès !');
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setUsers(data);
      setStats(prev => ({
        ...prev,
        total: data.length,
        admins: data.filter(u => u.role === 'ADMIN').length,
        dcos: data.filter(u => u.role === 'DCO').length,
        ctvs: data.filter(u => u.role === 'CTV').length,
        vbcs: data.filter(u => u.role === 'VBC').length,
      }));
    }

    setTimeout(() => {
      setEditingUserId(null);
      setSuccess(null);
    }, 2000);
  };

  // Filtrer les tarifs par recherche
  const filteredTarifs = tarifs.filter(t => 
    t.canton.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-500">Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600 mt-1">Gestion des utilisateurs, des gares et des tarifs</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-500">Total utilisateurs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-500">Administrateurs</p>
            <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-500">Commerciaux</p>
            <p className="text-2xl font-bold text-blue-600">{stats.dcos}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-500">Chefs de train</p>
            <p className="text-2xl font-bold text-green-600">{stats.ctvs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-500">Vendeurs</p>
            <p className="text-2xl font-bold text-orange-600">{stats.vbcs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-indigo-500">
            <p className="text-xs text-gray-500">Gares / Tarifs</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.gares} / {stats.tarifs}</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('utilisateurs')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'utilisateurs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline-block h-4 w-4 mr-2" />
                Utilisateurs ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('gares')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'gares'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MapPin className="inline-block h-4 w-4 mr-2" />
                Gares ({gares.length})
              </button>
              <button
                onClick={() => setActiveTab('tarifs')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'tarifs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="inline-block h-4 w-4 mr-2" />
                Tarifs ({tarifs.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Onglet Utilisateurs */}
            {activeTab === 'utilisateurs' && (
              <div>
                {error && (
                  <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    <Save className="h-5 w-5 text-green-500 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Gare</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map(user => {
                        const gareAssociee = gares.find(g => g.num === user.gare_ref);
                        const isEditing = editingUserId === user.id;

                        return (
                          <tr key={user.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.nom}
                                  onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 font-medium"
                                  placeholder="Nom"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                    {user.nom.charAt(0).toUpperCase()}
                                  </span>
                                  <span className="font-medium text-gray-900">{user.nom}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.matricule}
                                  onChange={(e) => setEditForm({ ...editForm, matricule: e.target.value.toUpperCase() })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 font-medium"
                                  placeholder="Matricule"
                                />
                              ) : (
                                <span className="text-sm text-gray-900 font-medium">{user.matricule}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select
                                  value={editForm.role}
                                  onChange={(e) => {
                                    const newRole = e.target.value;
                                    setEditForm({ 
                                      ...editForm, 
                                      role: newRole,
                                      gare_ref: newRole === 'VBC' ? editForm.gare_ref : null
                                    });
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 font-medium bg-white"
                                >
                                  {ROLE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                                  {getRoleIcon(user.role)}
                                  {getRoleLabel(user.role)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {isEditing ? (
                                editForm.role === 'VBC' ? (
                                  <select
                                    value={editForm.gare_ref || ''}
                                    onChange={(e) => setEditForm({ ...editForm, gare_ref: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 font-medium bg-white"
                                  >
                                    <option value="">Sélectionner une gare</option>
                                    {gares.map(g => (
                                      <option key={g.num} value={g.num}>
                                        {g.code} - {g.gare}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )
                              ) : (
                                <span className="text-gray-900 font-medium">
                                  {gareAssociee ? `${gareAssociee.code} - ${gareAssociee.gare}` : '-'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                            <td className="px-4 py-3 text-sm">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={handleSave}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                                  >
                                    <Save className="h-3 w-3" />
                                    Enregistrer
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
                                  >
                                    <X className="h-3 w-3" />
                                    Annuler
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditing(user)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  Modifier
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Onglet Gares */}
            {activeTab === 'gares' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">N°</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Gare</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">PK</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Commune tutelle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {gares.map(gare => (
                        <tr key={gare.num} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{gare.num}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {gare.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{gare.gare}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{gare.pk}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{gare.commune_tutelle}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Onglet Tarifs */}
            {activeTab === 'tarifs' && (
              <div>
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par canton (ex: ABH-ABL)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <span className="text-sm text-gray-500">{filteredTarifs.length} résultats</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Canton</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Distance (km)</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tarif 1ère Classe</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tarif 2ème Classe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTarifs.map(tarif => (
                        <tr key={tarif.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm text-gray-600">{tarif.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{tarif.canton}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{tarif.distance}</td>
                          <td className="px-4 py-3 text-sm font-medium text-blue-700">{formatPrice(tarif.tarif_1ere_classe)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-green-700">{formatPrice(tarif.tarif_2eme_classe)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}