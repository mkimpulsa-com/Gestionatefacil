import { useState, useRef, useEffect } from 'react';
import { Bell, Search, PlusCircle, Sparkles, Menu, AlertTriangle, PackageX, Package, Trophy, Info, Trash2, Check, Sun, Moon, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Modal } from '../ui/Modal';
import { formatCurrency } from '../../utils/format';
import { GlobalSearch } from '../ui/GlobalSearch';
import './Topbar.css';

export function Topbar({ toggleMobileMenu }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stockNotifications, setStockNotifications] = useState([]);
  const [dbNotifications, setDbNotifications] = useState([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();

   const [notifSettings, setNotifSettings] = useState({
    lowStock: true,
    outOfStock: true
  });

  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    const saved = localStorage.getItem('dismissedStockAlerts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!currentUser) return;

    // 0. Notification Settings Listener
    const unsubSettings = onSnapshot(doc(db, 'settings', currentUser.uid), (snap) => {
      if (snap.exists() && snap.data().notifications) {
        setNotifSettings(snap.data().notifications);
      }
    });
    
    // 1. Stock Alerts Listener (Dynamic)
    const qProducts = query(collection(db, 'products'), where('userId', '==', currentUser.uid));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const alerts = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.isActive !== false) {
          const minStock = data.minStock !== undefined ? data.minStock : 5;
          if (data.stock === 0 && notifSettings.outOfStock !== false) {
            alerts.push({
              id: `stock-0-${doc.id}`,
              type: 'out-of-stock',
              title: 'Sin Stock',
              message: `${data.name} se ha agotado.`,
              isCritical: true,
              productData: { id: doc.id, ...data },
              createdAt: new Date()
            });
          } else if (data.stock < minStock && notifSettings.lowStock === true) {
            alerts.push({
              id: `stock-low-${doc.id}`,
              type: 'low-stock',
              title: 'Stock Bajo',
              message: `Quedan solo ${data.stock} de ${data.name}.`,
              isCritical: false,
              productData: { id: doc.id, ...data },
              createdAt: new Date()
            });
          }
        }
      });
      setStockNotifications(alerts);
    });

    // 2. Database Notifications Listener (Persistent)
    const qNotifs = query(
      collection(db, 'notifications'), 
      where('userId', '==', currentUser.uid),
      limit(20)
    );
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      setDbNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSettings();
      unsubProducts();
      unsubNotifs();
    };
  }, [currentUser, notifSettings.lowStock, notifSettings.outOfStock]);

  // Merge and sort all notifications
  const allNotifications = [
    ...stockNotifications,
    ...dbNotifications
  ].sort((a, b) => {
    const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
    const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  const handleDismissStockAlert = (alertId, e) => {
    e.stopPropagation();
    const newDismissed = [...dismissedAlerts, alertId];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissedStockAlerts', JSON.stringify(newDismissed));
  };

  const unreadCount = allNotifications.filter(n => {
    if (n.id.toString().includes('stock')) {
      return !dismissedAlerts.includes(n.id);
    }
    return !n.isRead;
  }).length;

  const visibleNotifications = allNotifications.filter(n => {
    if (n.id.toString().includes('stock')) {
      return !dismissedAlerts.includes(n.id);
    }
    return true;
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleNotificationAction = async (notif, e) => {
    e.stopPropagation();
    if (notif.type === 'out-of-stock' || notif.type === 'low-stock') {
      setViewProduct(notif.productData);
      setIsViewModalOpen(true);
      setIsDropdownOpen(false);
    } else {
      // Mark as read in DB
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
      } catch (err) {
        console.error("Error marking as read:", err);
      }
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const clearAllNotifications = async () => {
    const batch = writeBatch(db);
    dbNotifications.forEach(notif => {
      batch.delete(doc(db, 'notifications', notif.id));
    });
    // Also clear dismissed local alerts to allow fresh ones
    setDismissedAlerts([]);
    localStorage.removeItem('dismissedStockAlerts');
    await batch.commit();
  };

  const registrationDate = currentUser?.createdAt?.toDate ? currentUser.createdAt.toDate() : new Date(currentUser?.createdAt || Date.now());
  const daysSinceRegistration = Math.floor((new Date() - registrationDate) / (1000 * 60 * 60 * 24));
  const trialDaysLeft = Math.max(0, 7 - daysSinceRegistration);
  const isTrial = (currentUser?.plan === 'Trial' || !currentUser?.plan) && currentUser?.email !== 'guananjacarlosenrique@gmail.com';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <Menu size={24} />
        </button>
        
        {isTrial && (
          <div className="trial-banner-top animate-fade-in">
            <div className="trial-info">
              <Clock size={14} />
              <span className="trial-days">Quedan <strong>{trialDaysLeft} días</strong> de prueba</span>
            </div>
            <a 
              href="https://wa.me/5493741443674?text=Hola!%20Estoy%20en%20mi%20periodo%20de%20prueba%20y%20quiero%20activar%20mi%20Plan%20Emprendedor." 
              className="trial-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              Activar ahora
            </a>
          </div>
        )}

        <div className="topbar-search glass-panel" onClick={() => setIsSearchOpen(true)} style={{ cursor: 'text' }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar clientes, ventas o productos (⌘+K)" 
            readOnly 
            style={{ pointerEvents: 'none' }}
          />
        </div>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <div className="topbar-actions">
        <button 
          className="btn-ai animate-pulse-subtle"
          onClick={() => navigate('/app/ai')}
        >
          <Sparkles size={16} />
          <span>IA Manager</span>
        </button>
        
        <button 
          className="action-icon" 
          onClick={toggleTheme} 
          title={isDark ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative" ref={menuRef}>
          <button 
            className="action-icon"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-dot">{unreadCount}</span>}
          </button>
          
           {isDropdownOpen && (
            <div className="notifications-dropdown glass-panel">
               <div className="dropdown-header">
                 <h3>Notificaciones</h3>
                 <div className="header-actions">
                   {visibleNotifications.some(n => !n.isRead && !n.id.toString().includes('stock')) && (
                     <button className="btn-text-sm" onClick={async () => {
                       const batch = writeBatch(db);
                       dbNotifications.filter(n => !n.isRead).forEach(notif => {
                         batch.update(doc(db, 'notifications', notif.id), { isRead: true });
                       });
                       await batch.commit();
                     }}>Leído</button>
                   )}
                   {visibleNotifications.length > 0 && (
                     <button className="btn-text-sm" onClick={clearAllNotifications}>Limpiar</button>
                   )}
                 </div>
               </div>
               
               {visibleNotifications.length === 0 ? (
                 <div className="notification-empty">
                   <Bell size={32} opacity={0.1} />
                   <p>No tienes notificaciones nuevas.</p>
                 </div>
               ) : (
                 <div className="notifications-list">
                   {visibleNotifications.map(notif => (
                     <div 
                       key={notif.id} 
                       className={`notification-item ${notif.isRead || notif.id.toString().includes('stock') ? 'read' : ''} ${notif.isCritical ? 'critical' : ''}`}
                       onClick={(e) => handleNotificationAction(notif, e)}
                     >
                       <div className={`notification-icon-bg ${notif.type}`}>
                         {notif.type === 'goal_achieved' ? <Trophy size={16} /> : 
                          notif.type === 'out-of-stock' ? <PackageX size={16} /> : 
                          notif.type === 'low-stock' ? <AlertTriangle size={16} /> : 
                          notif.type === 'sale_success' ? <Check size={16} /> :
                          <Info size={16} />}
                       </div>
                       <div className="notification-info">
                         <div className="notif-header">
                            <p className="notif-title">{notif.title}</p>
                            {!notif.isRead && !notif.id.toString().includes('stock') && <span className="unread-dot"></span>}
                         </div>
                         <p className="notif-msg">{notif.message}</p>
                       </div>
                       <div className="notif-actions">
                         {notif.id.toString().includes('stock') ? (
                           <button className="btn-notif-del" onClick={(e) => handleDismissStockAlert(notif.id, e)} title="Marcar como leída"><Check size={14} /></button>
                         ) : (
                           <button className="btn-notif-del" onClick={(e) => deleteNotification(notif.id, e)} title="Eliminar"><Trash2 size={14} /></button>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}
        </div>

        <button className="btn-primary flex items-center justify-center gap-2" onClick={() => navigate('/app/ventas')}>
          <PlusCircle size={18} />
          <span>Venta</span>
        </button>
      </div>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Detalle de Stock">
        {viewProduct && (
          <div className="product-view-modal">
             <div className="product-view-header">
               <div className="product-view-image-container">
                 {viewProduct.imageUrl ? (
                   <img src={viewProduct.imageUrl} alt={viewProduct.name} />
                 ) : (
                   <Package size={64} style={{ opacity: 0.2, margin: '3rem auto' }} />
                 )}
               </div>
               <div style={{ textAlign: 'center' }}>
                 <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{viewProduct.name}</h2>
                 <span className={`status-badge status-${viewProduct.stock === 0 ? 'danger' : 'pendiente'}`}>
                   {viewProduct.stock === 0 ? 'Sin Stock' : 'Bajo Stock'}
                 </span>
               </div>
             </div>
             <div className="product-view-grid">
               <div className="view-card">
                 <h5>Estado actual</h5>
                 <div className="view-row"><span>Stock</span> <strong className={viewProduct.stock === 0 ? 'text-danger' : ''}>{viewProduct.stock} unid.</strong></div>
                 <div className="view-row"><span>Mínimo</span> <strong>{viewProduct.minStock || 5} unid.</strong></div>
               </div>
               <button className="btn-primary w-full mt-4" onClick={() => { setIsViewModalOpen(false); navigate('/app/inventario'); }}>Ir a Inventario</button>
             </div>
          </div>
        )}
      </Modal>
    </header>
  );
}
