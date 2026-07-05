'use client';

import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Users, MapPin, Train, Shield, Briefcase, Store, User, 
  Edit, Save, X, AlertCircle, DollarSign, Search,
  UserCog, Package
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
  { value: 'ADMIN', label: 'Administrateur', icon: <Shield className="h-4 w-4" />, color: 'purple' },
  { value: 'DCO', label: 'Commercial', icon: <Briefcase className="h-4 w-4" />, color: 'blue' },
  { value: 'CTV', label: 'Chef de Train', icon: <Train className="h-4 w-4" />, color: 'emerald' },
  { value: 'VBC', label: 'Vendeur', icon: <Store className="h-4 w-4" />, color: 'amber' },
  { value: 'RD', label: 'Responsable Déclaration', icon: <Package className="h-4 w-4" />, color: 'indigo' },
];

const ROLES_WITH_GARE = ['VBC', 'RD'];

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
    rds: 0,
    gares: 0,
    tarifs: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
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
          rds: usersData.filter(u => u.role === 'RD').length,
        }));
      }

      const { data: garesData } = await supabase
        .from('gare')
        .select('*')
        .order('num', { ascending: true });
      
      if (garesData) {
        setGares(garesData);
        setStats(prev => ({ ...prev, gares: garesData.length }));
      }

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
      CTV: 'bg-emerald-100 text-emerald-800',
      VBC: 'bg-amber-100 text-amber-800',
      RD: 'bg-indigo-100 text-indigo-800',
    };
    return colors[role] || 'bg-stone-100 text-stone-800';
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, React.ReactNode> = {
      ADMIN: <Shield className="h-4 w-4" />,
      DCO: <Briefcase className="h-4 w-4" />,
      CTV: <Train className="h-4 w-4" />,
      VBC: <Store className="h-4 w-4" />,
      RD: <Package className="h-4 w-4" />,
    };
    return icons[role] || <User className="h-4 w-4" />;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: 'Administrateur',
      DCO: 'Commercial',
      CTV: 'Chef de Train',
      VBC: 'Vendeur',
      RD: 'Responsable Déclaration',
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

    if (ROLES_WITH_GARE.includes(editForm.role) && !editForm.gare_ref) {
      setError(`Pour le rôle ${getRoleLabel(editForm.role)}, une gare doit être attribuée`);
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
        rds: data.filter(u => u.role === 'RD').length,
      }));
    }

    setTimeout(() => {
      setEditingUserId(null);
      setSuccess(null);
    }, 2000);
  };

  const filteredTarifs = tarifs.filter(t => 
    t.canton.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-700 border-t-transparent"></div>
          <p className="ml-3 text-stone-500">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-2">
            <UserCog className="h-7 w-7 text-amber-700" />
            Administration
          </h1>
          <p className="text-stone-500 text-sm">Gestion des utilisateurs, des gares et des tarifs</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition">
            <p className="text-xs text-stone-500 font-medium">Total utilisateurs</p>
            <p className="text-2xl font-bold text-stone-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition">
            <p className="text-xs text-stone-500 font-medium">Administrateurs</p>
            <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition">
            <p className="text-xs text-stone-500 font-medium">Commerciaux</p>
            <p className="text-2xl font-bold text-blue-600">{stats.dcos}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition">
            <p className="text-xs text-stone-500 font-medium">Chefs de train</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.ctvs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition">
            <p className="text-xs text-stone-500 font-medium">Vendeurs</p>
            <p className="text-2xl font-bold text-amber-600">{stats.vbcs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition">
            <p className="text-xs text-stone-500 font-medium">Responsables RD</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.rds}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition">
            <p className="text-xs text-stone-500 font-medium">Gares</p>
            <p className="text-2xl font-bold text-stone-700">{stats.gares}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 p-4 hover:shadow-md transition">
            <p className="text-xs text-stone-500 font-medium">Tarifs</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.tarifs}</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
          <div className="border-b border-stone-200/60 bg-stone-50/80">
            <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('utilisateurs')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'utilisateurs'
                    ? 'border-amber-700 text-amber-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }`}
              >
                <Users className="inline-block h-4 w-4 mr-2" />
                Utilisateurs ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('gares')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'gares'
                    ? 'border-amber-700 text-amber-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }`}
              >
                <MapPin className="inline-block h-4 w-4 mr-2" />
                Gares ({gares.length})
              </button>
              <button
                onClick={() => setActiveTab('tarifs')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'tarifs'
                    ? 'border-amber-700 text-amber-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }`}
              >
                <DollarSign className="inline-block h-4 w-4 mr-2" />
                Tarifs ({tarifs.length})
              </button>
            </nav>
          </div>

          <div className="p-5">
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
                  <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
                    <Save className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-stone-50/80">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Utilisateur</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Matricule</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Rôle</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Gare</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/60">
                      {users.map(user => {
                        const gareAssociee = gares.find(g => g.num === user.gare_ref);
                        const isEditing = editingUserId === user.id;
                        const needsGare = ROLES_WITH_GARE.includes(editForm.role);

                        return (
                          <tr key={user.id} className="hover:bg-stone-50 transition">
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.nom}
                                  onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                                  className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm text-stone-800 font-medium transition"
                                  placeholder="Nom"
                                />
                              ) : (
                                <div className="flex items-center gap-2.5">
                                  <span className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm">
                                    {user.nom.charAt(0).toUpperCase()}
                                  </span>
                                  <span className="font-medium text-stone-800">{user.nom}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.matricule}
                                  onChange={(e) => setEditForm({ ...editForm, matricule: e.target.value.toUpperCase() })}
                                  className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm text-stone-800 font-medium transition"
                                  placeholder="Matricule"
                                />
                              ) : (
                                <span className="text-sm text-stone-800 font-medium">{user.matricule}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">{user.email}</td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select
                                  value={editForm.role}
                                  onChange={(e) => {
                                    const newRole = e.target.value;
                                    setEditForm({ 
                                      ...editForm, 
                                      role: newRole,
                                      gare_ref: ROLES_WITH_GARE.includes(newRole) ? editForm.gare_ref : null
                                    });
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm text-stone-800 font-medium transition"
                                >
                                  {ROLE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                                  {getRoleIcon(user.role)}
                                  {getRoleLabel(user.role)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {isEditing ? (
                                needsGare ? (
                                  <select
                                    value={editForm.gare_ref || ''}
                                    onChange={(e) => setEditForm({ ...editForm, gare_ref: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm text-stone-800 font-medium transition"
                                  >
                                    <option value="">Sélectionner une gare</option>
                                    {gares.map(g => (
                                      <option key={g.num} value={g.num}>
                                        {g.code} - {g.gare}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-stone-400">-</span>
                                )
                              ) : (
                                <span className="text-stone-700 font-medium">
                                  {gareAssociee ? `${gareAssociee.code} - ${gareAssociee.gare}` : '-'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-500">{formatDate(user.created_at)}</td>
                            <td className="px-4 py-3 text-sm">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={handleSave}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                    Enregistrer
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Annuler
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditing(user)}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 mx-auto"
                                >
                                  <Edit className="h-3.5 w-3.5" />
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
                      <tr className="bg-stone-50/80">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">N°</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Code</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Gare</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">PK</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Commune tutelle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/60">
                      {gares.map(gare => (
                        <tr key={gare.num} className="hover:bg-stone-50 transition">
                          <td className="px-4 py-3 text-sm font-medium text-stone-800">{gare.num}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                              {gare.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-800">{gare.gare}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{gare.pk}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{gare.commune_tutelle}</td>
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
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 relative min-w-50">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par canton..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-800 text-sm transition"
                    />
                  </div>
                  <span className="text-sm text-stone-500">{filteredTarifs.length} résultats</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-stone-50/80">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">ID</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Canton</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Distance (km)</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Tarif 1ère Classe</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Tarif 2ème Classe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/60">
                      {filteredTarifs.map(tarif => (
                        <tr key={tarif.id} className="hover:bg-stone-50 transition">
                          <td className="px-4 py-3 text-sm text-stone-600">{tarif.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-stone-800">{tarif.canton}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{tarif.distance}</td>
                          <td className="px-4 py-3 text-sm font-medium text-blue-700">{formatPrice(tarif.tarif_1ere_classe)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-emerald-700">{formatPrice(tarif.tarif_2eme_classe)}</td>
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