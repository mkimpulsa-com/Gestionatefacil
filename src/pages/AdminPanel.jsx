import { useState, useEffect } from 'react';
import { Users, CreditCard, TrendingUp, Search, MoreVertical, Edit2, Shield, UserX, CheckCircle, Clock, Phone, Building2, User as UserIcon, Mail, LogOut, Moon, Sun, Activity, Zap } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import { Skeleton, SkeletonRow } from '../components/ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './AdminPanel.css';

export function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState('');
  const [activeTab, setActiveTab] = useState('pro'); // 'pro', 'trial', 'paused'

  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("AdminPanel: Montando...");

    // Fetch Users
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers,
      (snap) => {
        console.log("AdminPanel: Usuarios recibidos:", snap.size);
        const usersData = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersData);
        setLoading(false);
      },
      (err) => {
        console.error("AdminPanel Error Users:", err);
        setLoading(false);
        toast.error("Gestionate Fácil: Error al cargar usuarios: " + err.message);
      }
    );

    // Fetch Companies
    const qCompanies = query(collection(db, 'companies'));
    const unsubCompanies = onSnapshot(qCompanies,
      (snap) => {
        console.log("AdminPanel: Empresas recibidas:", snap.size);
        const companiesData = {};
        snap.docs.forEach(doc => {
          companiesData[doc.id] = doc.data();
        });
        setCompanies(companiesData);
      },
      (err) => {
        console.error("AdminPanel Error Companies:", err);
      }
    );

    return () => {
      unsubUsers();
      unsubCompanies();
    };
  }, []);

  const mergedUsers = users.map(user => ({
    ...user,
    companyName: companies[user.id]?.name || 'Sin empresa',
    companyLogo: companies[user.id]?.logoUrl || null,
    companyPhone: companies[user.id]?.phone || null
  }));

  const filteredUsers = mergedUsers.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const dateA = a.lastLogin?.toDate?.() || (a.lastLogin ? new Date(a.lastLogin) : new Date(0));
    const dateB = b.lastLogin?.toDate?.() || (b.lastLogin ? new Date(b.lastLogin) : new Date(0));
    return dateB - dateA;
  });

  const stats = {
    total: users.length,
    activeToday: users.filter(u => {
      if (!u.lastLogin) return false;
      const today = new Date();
      const lastLogin = typeof u.lastLogin.toDate === 'function' ? u.lastLogin.toDate() : new Date(u.lastLogin);
      return lastLogin.getDate() === today.getDate() &&
        lastLogin.getMonth() === today.getMonth() &&
        lastLogin.getFullYear() === today.getFullYear();
    }).length,
    suspended: users.filter(u => u.status === 'suspendido').length,
    premium: users.filter(u => u.plan === 'Negocio' || u.plan === 'Emprendedor').length,
    mrr: users.reduce((acc, u) => {
      if (u.status === 'suspendido') return acc;
      if (u.plan === 'Emprendedor') return acc + 15;
      if (u.plan === 'Negocio') return acc + 29;
      return acc;
    }, 0)
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const tabCounts = {
    pro: filteredUsers.filter(u => u.plan !== 'Trial' && u.plan !== 'Pausado' && u.status !== 'suspendido').length,
    trial: filteredUsers.filter(u => u.plan === 'Trial' && u.status !== 'suspendido').length,
    paused: filteredUsers.filter(u => u.plan === 'Pausado' || u.status === 'suspendido').length
  };

  const getFilteredUsersByTab = () => {
    switch (activeTab) {
      case 'pro':
        return filteredUsers.filter(u => u.plan !== 'Trial' && u.plan !== 'Pausado' && u.status !== 'suspendido');
      case 'trial':
        return filteredUsers.filter(u => u.plan === 'Trial' && u.status !== 'suspendido');
      case 'paused':
        return filteredUsers.filter(u => u.plan === 'Pausado' || u.status === 'suspendido');
      default:
        return filteredUsers;
    }
  };

  const currentTabUsers = getFilteredUsersByTab();
  const totalPages = Math.ceil(currentTabUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = currentTabUsers.slice(startIndex, startIndex + itemsPerPage);

  const handleEditPlan = (user) => {
    setSelectedUser(user);
    setNewPlan(user.plan || 'Emprendedor');
    setIsPlanModalOpen(true);
  };

  const handleQuickActivate = async (user) => {
    if (!window.confirm(`¿Activar Plan Emprendedor para ${user.email}?`)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        plan: 'Emprendedor',
        updatedAt: serverTimestamp()
      });
      toast.success(`Gestionate Fácil: Plan Emprendedor activado para ${user.email}`);
    } catch (error) {
      toast.error('Gestionate Fácil: Error al activar plan');
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'suspendido' ? 'activo' : 'suspendido';
    const confirmMsg = newStatus === 'suspendido'
      ? `¿Suspender acceso para ${user.email}? El usuario no podrá usar la app hasta que regularice su pago.`
      : `¿Reactivar acceso para ${user.email}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(newStatus === 'suspendido' ? 'Gestionate Fácil: Acceso suspendido' : 'Gestionate Fácil: Acceso reactivado');
    } catch (error) {
      toast.error('Gestionate Fácil: Error al cambiar estado');
    }
  };

  const saveNewPlan = async () => {
    if (!selectedUser) return;
    try {
      const updates = {
        plan: newPlan,
        updatedAt: serverTimestamp()
      };
      
      // Lógica de sincronización de estado según el plan
      if (newPlan === 'Pausado') {
        updates.status = 'suspendido';
      } else if (selectedUser.status === 'suspendido') {
        // Si activamos un plan real y estaba suspendido, lo reactivamos
        updates.status = 'activo';
      }

      await updateDoc(doc(db, 'users', selectedUser.id), updates);
      toast.success(`Gestionate Fácil: Plan actualizado y estado sincronizado.`);
      setIsPlanModalOpen(false);
    } catch (error) {
      toast.error('Gestionate Fácil: Error al actualizar el plan');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Gestionate Fácil: Error al cerrar sesión');
    }
  };

  const formatDate = (date, formatStr = 'dd MMM yyyy') => {
    if (!date) return 'Nunca';
    try {
      const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      return format(d, formatStr, { locale: es });
    } catch (e) {
      return 'Error fecha';
    }
  };

  return (
    <div className="admin-page-wrapper">
      {/* Navbar de Administrador Independiente */}
      <nav className="admin-navbar">
        <div className="admin-nav-left">
          <div className="admin-brand-logo">
            <Shield size={24} className="shield-icon" />
            <div className="brand-texts">
              <span className="brand-main">MODO DIOS</span>
              <span className="brand-sub">Centro de Control Maestro</span>
            </div>
          </div>
          <div className="admin-nav-divider"></div>
          <div className="system-monitors">
            <div className="monitor-item">
              <Activity size={14} className="monitor-icon pulse" />
              <span>SISTEMA: <strong>ACTIVO</strong></span>
            </div>
            <div className="monitor-item">
              <Users size={14} className="monitor-icon" />
              <span>USUARIOS: <strong>{stats.total}</strong></span>
            </div>
          </div>
        </div>

        <div className="admin-nav-right">
          <button className="nav-tool-btn" onClick={toggleTheme} title="Cambiar Tema">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="admin-nav-divider"></div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Salir del Sistema</span>
          </button>
        </div>
      </nav>

      <div className="admin-container animate-fade-in">
        <header className="admin-header">
          <div>
            <h1 className="page-title text-gradient">Dashboard Administrativo</h1>
            <p className="page-subtitle">Supervisión en tiempo real de la plataforma Gestionate Fácil.</p>
          </div>
          <div className="header-actions">
            <div className="uptime-badge">
              <Zap size={14} />
              <span>UPTIME: 99.9%</span>
            </div>
          </div>
        </header>

        {/* Métricas */}
        <div className="admin-stats-grid">
          <div className="stat-card glass-panel">
            <div className="stat-icon users"><Users size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Total Usuarios</span>
              <span className="stat-value">{loading ? <Skeleton width="60px" height="28px" /> : stats.total}</span>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon active"><Clock size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Activos Hoy</span>
              <span className="stat-value">{loading ? <Skeleton width="60px" height="28px" /> : stats.activeToday}</span>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon premium"><Shield size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Clientes Premium</span>
              <span className="stat-value">{loading ? <Skeleton width="60px" height="28px" /> : stats.premium}</span>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon revenue"><TrendingUp size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">MRR Estimado</span>
              <span className="stat-value">{loading ? <Skeleton width="80px" height="28px" /> : `$${stats.mrr}`}</span>
            </div>
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="admin-content glass-panel">
          <div className="content-header">
            <div className="header-left">
              <h2>Directorio de Clientes</h2>
              <span className="results-count">{filteredUsers.length} usuarios encontrados</span>
            </div>
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar por email, nombre o empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-tabs-container">
            <div className="admin-tabs">
              <button 
                className={`admin-tab ${activeTab === 'pro' ? 'active' : ''}`}
                onClick={() => { setActiveTab('pro'); setCurrentPage(1); }}
              >
                <Shield size={16} />
                <span>Clientes Pro</span>
                <span className="tab-count">{tabCounts.pro}</span>
              </button>
              <button 
                className={`admin-tab ${activeTab === 'trial' ? 'active' : ''}`}
                onClick={() => { setActiveTab('trial'); setCurrentPage(1); }}
              >
                <Zap size={16} />
                <span>Pruebas (Trial)</span>
                <span className="tab-count">{tabCounts.trial}</span>
              </button>
              <button 
                className={`admin-tab ${activeTab === 'paused' ? 'active' : ''}`}
                onClick={() => { setActiveTab('paused'); setCurrentPage(1); }}
              >
                <UserX size={16} />
                <span>Pausados / Bajas</span>
                <span className="tab-count">{tabCounts.paused}</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario / Empresa</th>
                  <th>Email</th>
                  <th>Celular</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Registro / Actividad</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7"><SkeletonRow columns={7} /></td></tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-8 text-muted">No se encontraron usuarios.</td></tr>
                ) : paginatedUsers.map(user => (
                  <tr key={user.id}>
                    <td data-label="Usuario / Empresa">
                      <div className="user-profile-cell">
                        <div className="user-avatar-group">
                          {user.companyLogo ? (
                            <img src={user.companyLogo} alt="Logo" className="admin-company-logo" />
                          ) : (
                            <div className="user-avatar">{user.fullName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}</div>
                          )}
                        </div>
                        <div className="user-identity">
                          <span className="user-full-name">{user.fullName || 'Sin nombre'}</span>
                          <span className="user-company-name"><Building2 size={12} /> {user.companyName}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Email">
                      <div className="contact-cell">
                        <div className="contact-item"><Mail size={12} /> <span>{user.email}</span></div>
                      </div>
                    </td>
                    <td data-label="Celular">
                      <div className="contact-cell">
                        {(user.phone || user.companyPhone) ? (
                          <div className="contact-item">
                            <Phone size={12} />
                            <span>{user.phone || user.companyPhone}</span>
                          </div>
                        ) : (
                          <span className="text-muted" style={{ opacity: 0.3 }}>—</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Plan">
                      <span className={`plan-badge ${user.plan?.toLowerCase() || 'emprendedor'}`}>
                        {user.plan || 'Emprendedor'}
                      </span>
                    </td>
                    <td data-label="Estado">
                      <span className={`status-pill ${user.status || 'activo'}`}>
                        <span className="status-dot"></span>
                        {user.status || 'activo'}
                      </span>
                    </td>
                    <td data-label="Actividad">
                      <div className="activity-cell">
                        <div className="activity-item">
                          <span className="activity-label">Registro:</span>
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                        <div className="activity-item">
                          <span className="activity-label">Último:</span>
                          <span className="last-login-text">{formatDate(user.lastLogin, 'dd/MM HH:mm')}</span>
                        </div>
                        {user.lastLogin && (
                          <div className="activity-item inactivity-info">
                            <span className="activity-label">Inactivo:</span>
                            <span className={`inactivity-days ${differenceInDays(new Date(), user.lastLogin?.toDate?.() || new Date(user.lastLogin)) > 7 ? 'critical' : ''}`}>
                              {differenceInDays(new Date(), user.lastLogin?.toDate?.() || new Date(user.lastLogin))} días
                            </span>
                          </div>
                        )}
                        {user.plan === 'Trial' && (
                          <div className="activity-item trial-info">
                            <span className="activity-label">Trial:</span>
                            <span className={`trial-days-left ${7 - differenceInDays(new Date(), user.createdAt?.toDate?.() || new Date(user.createdAt)) <= 2 ? 'urgent' : ''}`}>
                              {Math.max(0, 7 - differenceInDays(new Date(), user.createdAt?.toDate?.() || new Date(user.createdAt)))} días restantes
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td data-label="Acciones" className="text-right">
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className={`admin-action-btn ${user.status === 'suspendido' ? 'reactivate' : 'suspend'}`}
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'suspendido' ? 'Reactivar Acceso' : 'Suspender Acceso'}
                          style={{
                            background: user.status === 'suspendido' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: user.status === 'suspendido' ? '#22c55e' : '#ef4444',
                            borderColor: user.status === 'suspendido' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                          }}
                        >
                          {user.status === 'suspendido' ? <CheckCircle size={16} /> : <UserX size={16} />}
                        </button>
                        <button
                          className="admin-action-btn quick-activate"
                          onClick={() => handleQuickActivate(user)}
                          title="Activar Plan Emprendedor"
                          style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                        >
                          <Zap size={16} />
                        </button>
                        <button className="admin-action-btn" onClick={() => handleEditPlan(user)} title="Editar Plan">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {!loading && totalPages > 1 && (
            <div className="admin-pagination">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Anterior
              </button>
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    className={`pagination-num ${currentPage === num ? 'active' : ''}`}
                    onClick={() => setCurrentPage(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <button
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title="Gestionar Plan de Usuario">
          <div className="plan-edit-modal">
            <div className="selected-user-info">
              <div className="user-avatar">{selectedUser?.fullName?.charAt(0) || selectedUser?.email?.charAt(0)}</div>
              <div>
                <h3>{selectedUser?.fullName || 'Usuario'}</h3>
                <p>{selectedUser?.email}</p>
              </div>
            </div>

            <p className="modal-desc">Cambiar el plan de acceso para este usuario:</p>

            <div className="plan-options">
              {[
                { id: 'Trial', name: 'Periodo de Prueba', price: 'Gratis', desc: '7 días de acceso inicial' },
                { id: 'Emprendedor', name: 'Plan Emprendedor', price: '$15/mes', desc: 'Funciones básicas para iniciar' },
                { id: 'Pausado', name: 'Plan Pausado', price: 'Bloqueado', desc: 'Acceso restringido por falta de pago' }
              ].map(plan => (
                <label key={plan.id} className={`plan-option-card ${newPlan === plan.id ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={newPlan === plan.id}
                    onChange={(e) => setNewPlan(e.target.value)}
                  />
                  <div className="plan-card-content">
                    <div className="plan-card-header">
                      <span className="plan-name">{plan.name}</span>
                      <span className="plan-price">{plan.price}</span>
                    </div>
                    <p className="plan-desc">{plan.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setIsPlanModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={saveNewPlan}>Actualizar Suscripción</button>
            </div>
          </div>
        </Modal>
      </div>
      );
}
