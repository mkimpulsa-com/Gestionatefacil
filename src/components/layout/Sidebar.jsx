import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, Package, DollarSign, BrainCircuit, Shield, Settings as SettingsIcon, ChevronDown, ChevronRight, Truck, Store, LogOut, TrendingUp, TrendingDown, PlusCircle, PieChart, ShoppingBag, Receipt, Bell, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

import './Sidebar.css';

export function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isContactsOpen, setIsContactsOpen] = useState(location.pathname.startsWith('/app/contactos'));
  const [isIngresosOpen, setIsIngresosOpen] = useState(location.pathname.startsWith('/app/ingresos') || location.pathname === '/app/ventas');
  const [isEgresosOpen, setIsEgresosOpen] = useState(location.pathname.startsWith('/app/egresos'));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'companies', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyData(docSnap.data());
      }
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    setIsContactsOpen(location.pathname.startsWith('/app/contactos'));
    setIsIngresosOpen(location.pathname.startsWith('/app/ingresos') || location.pathname === '/app/ventas');
    setIsEgresosOpen(location.pathname.startsWith('/app/egresos'));
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-active' : ''}`}>
      <div className="sidebar-header">
        <h2 className="logo-text">{companyData?.name || 'Mi Empresa'}</h2>
        {companyData?.logoUrl ? (
          <img src={companyData.logoUrl} alt="Logo" className="company-logo" style={{width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.1)'}} />
        ) : (
          <div className="logo-icon" style={{width: '80px', height: '80px', borderRadius: '50%', fontSize: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'}}>
            {companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'M'}
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <p className="nav-subtitle">PRINCIPAL</p>
        <ul>
          {/* Dashboard Item */}
          <li>
            <Link to="/app" className={`nav-link ${location.pathname === '/app' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
              <LayoutDashboard size={20} className="nav-icon" />
              <span>Panel de control</span>
              {location.pathname === '/app' && <div className="active-indicator"></div>}
            </Link>
          </li>
          
          <li>
            <Link to="/app/estado-negocio" className={`nav-link ${location.pathname === '/app/estado-negocio' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
              <Activity size={20} className="nav-icon" />
              <span>Estado del Negocio</span>
              {location.pathname === '/app/estado-negocio' && <div className="active-indicator"></div>}
            </Link>
          </li>

          {/* Ingresos Dropdown */}
          <li className={`nav-dropdown ${isIngresosOpen ? 'open' : ''}`}>
             <div className={`nav-link ${(location.pathname.startsWith('/app/ingresos') || location.pathname === '/app/ventas') ? 'active' : ''}`} 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsIngresosOpen(prev => !prev);
                  }}>
                <TrendingUp size={20} className="nav-icon" />
                <span>Ingresos</span>
                <span className="dropdown-arrow">
                  {isIngresosOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
             </div>
             
             {isIngresosOpen && (
               <ul className="sub-nav">
                 <li>
                   <Link to="/app/ventas" className={`sub-nav-link ${location.pathname === '/app/ventas' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
                     <ShoppingCart size={16} />
                     <span>Ventas</span>
                   </Link>
                 </li>
                 <li>
                   <Link to="/app/ingresos/otros" className={`sub-nav-link ${location.pathname === '/app/ingresos/otros' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
                     <PlusCircle size={16} />
                     <span>Otros ingresos</span>
                   </Link>
                 </li>
                 <li>
                   <Link to="/app/ingresos/presupuesto" className={`sub-nav-link ${location.pathname === '/app/ingresos/presupuesto' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
                     <PieChart size={16} />
                     <span>Presupuesto</span>
                   </Link>
                 </li>
               </ul>
             )}
          </li>

          {/* Egresos Dropdown */}
          <li className={`nav-dropdown ${isEgresosOpen ? 'open' : ''}`}>
             <div className={`nav-link ${location.pathname.startsWith('/app/egresos') ? 'active' : ''}`} 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEgresosOpen(prev => !prev);
                  }}>
                <TrendingDown size={20} className="nav-icon" />
                <span>Egresos</span>
                <span className="dropdown-arrow">
                  {isEgresosOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
             </div>
             
             {isEgresosOpen && (
               <ul className="sub-nav">
                 <li>
                   <Link to="/app/egresos/compras" className={`sub-nav-link ${location.pathname === '/app/egresos/compras' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
                     <ShoppingBag size={16} />
                     <span>Compras</span>
                   </Link>
                 </li>
                 <li>
                   <Link to="/app/egresos/gastos" className={`sub-nav-link ${location.pathname === '/app/egresos/gastos' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
                     <Receipt size={16} />
                     <span>Gastos</span>
                   </Link>
                 </li>
               </ul>
             )}
          </li>

          {/* Inventario Item */}
          <li>
            <Link to="/app/inventario" className={`nav-link ${location.pathname === '/app/inventario' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
              <Package size={20} className="nav-icon" />
              <span>Inventario</span>
              {location.pathname === '/app/inventario' && <div className="active-indicator"></div>}
            </Link>
          </li>

          {/* Finanzas Item */}
          <li>
            <Link to="/app/finanzas" className={`nav-link ${location.pathname === '/app/finanzas' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
              <DollarSign size={20} className="nav-icon" />
              <span>Finanzas Contables</span>
              {location.pathname === '/app/finanzas' && <div className="active-indicator"></div>}
            </Link>
          </li>

          {/* Contacts Dropdown */}
          <li className={`nav-dropdown ${isContactsOpen ? 'open' : ''}`}>
             <div className={`nav-link ${location.pathname.startsWith('/app/contactos') ? 'active' : ''}`} 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsContactsOpen(prev => !prev);
                  }}>
                <Users size={20} className="nav-icon" />
                <span>Contactos</span>
                <span className="dropdown-arrow">
                  {isContactsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                {location.pathname.startsWith('/app/contactos') && <div className="active-indicator"></div>}
             </div>
             
             {isContactsOpen && (
               <ul className="sub-nav">
                 <li>
                   <Link to="/app/contactos/clientes" className={`sub-nav-link ${location.pathname === '/app/contactos/clientes' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
                     <Users size={16} />
                     <span>Clientes</span>
                   </Link>
                 </li>
                 <li>
                   <Link to="/app/contactos/proveedores" className={`sub-nav-link ${location.pathname === '/app/contactos/proveedores' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
                     <Truck size={16} />
                     <span>Proveedores</span>
                   </Link>
                 </li>
                 <li>
                   <Link to="/app/contactos/revendedores" className={`sub-nav-link ${location.pathname === '/app/contactos/revendedores' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
                     <Store size={16} />
                     <span>Revendedores</span>
                   </Link>
                 </li>
               </ul>
             )}
          </li>
          <li>
            <Link to="/app/recordatorios" className={`nav-link ${location.pathname === '/app/recordatorios' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
              <Bell size={20} className="nav-icon" />
              <span>Recordatorios</span>
              {location.pathname === '/app/recordatorios' && <div className="active-indicator"></div>}
            </Link>
          </li>
        </ul>


        <p className="nav-subtitle mt-6">INTELIGENCIA</p>
        <ul>
          <li>
            <Link to="/app/ai" className="nav-link ai-link" onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
              <BrainCircuit size={20} className="nav-icon" />
              <span>Asistente IA</span>
              <span className="badge-new">PRO</span>
            </Link>
          </li>
          <li>
            <Link to="/app/settings" className={`nav-link ${location.pathname === '/app/settings' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}>
              <SettingsIcon size={20} className="nav-icon" />
              <span>Configuración</span>
              {location.pathname === '/app/settings' && <div className="active-indicator"></div>}
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer" style={{ padding: '0 1rem 1rem 1rem' }}>
        <div className="user-profile-container" ref={profileRef} style={{ position: 'relative' }}>
          
          {isProfileMenuOpen && (
            <div className="profile-dropdown-menu" style={{
              position: 'absolute',
              bottom: 'calc(100% + 5px)',
              left: 0,
              width: '100%',
              background: 'rgba(26, 31, 46, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 'var(--radius-md)',
              padding: '0.25rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
              zIndex: 10
            }}>
              <button onClick={handleLogout} className="nav-link logout-btn" style={{ padding: '0.4rem 0.5rem', width: '100%', fontSize: '0.85rem' }}>
                <LogOut size={16} className="nav-icon" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}

          <div className="user-profile" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
            <div className="avatar">{currentUser?.email?.charAt(0).toUpperCase() || 'A'}</div>
            <div className="user-info">
              <p className="user-name">Administrador</p>
              <p className="user-role">{currentUser?.email || 'Admin'}</p>
            </div>
            <ChevronDown size={14} className={`dropdown-arrow ${isProfileMenuOpen ? 'open' : ''}`} />
          </div>
        </div>
        
        <div className="app-watermark" style={{ textAlign: 'center', marginTop: '0.5rem', opacity: 0.2, fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.05em' }}>
          GESTIONATE FÁCIL
        </div>
      </div>
    </aside>
  );
}
