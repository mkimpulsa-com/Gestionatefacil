import { useState, useEffect, useRef } from 'react';
import { Search, Users, ShoppingBag, PlusCircle, ArrowRight, Package, History, X, Command, Tag, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';
import { createPortal } from 'react-dom';
import './GlobalSearch.css';

export function GlobalSearch({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState({ products: [], clients: [], actions: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const quickActions = [
    { id: 'act-1', type: 'action', title: 'Nueva Venta', icon: <PlusCircle size={18} />, path: '/app/ventas', keywords: ['venta', 'nueva', 'vender'] },
    { id: 'act-2', type: 'action', title: 'Añadir Cliente', icon: <Users size={18} />, path: '/app/contactos/clientes', keywords: ['cliente', 'nuevo', 'añadir'] },
    { id: 'act-3', type: 'action', title: 'Ver Inventario', icon: <Package size={18} />, path: '/app/inventario', keywords: ['stock', 'inventario', 'productos'] },
    { id: 'act-4', type: 'action', title: 'Asistente IA', icon: <Command size={18} />, path: '/app/ai', keywords: ['ia', 'asistente', 'ayuda'] },
  ];

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!searchTerm || searchTerm.length < 2 || !currentUser) {
        setResults({ products: [], clients: [], actions: quickActions });
        return;
      }

      setLoading(true);
      try {
        const term = searchTerm.toLowerCase();
        
        // 1. Filter local quick actions
        const matchedActions = quickActions.filter(a => 
          a.title.toLowerCase().includes(term) || a.keywords.some(k => k.includes(term))
        );

        // 2. Fetch Products
        const qProducts = query(
          collection(db, 'products'),
          where('userId', '==', currentUser.uid),
          limit(30)
        );
        const prodSnap = await getDocs(qProducts);
        const matchedProducts = prodSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data(), type: 'product' }))
          .filter(p => p.name.toLowerCase().includes(term) || (p.category && p.category.toLowerCase().includes(term)));

        // 3. Fetch Clients
        const qClients = query(
          collection(db, 'clients'),
          where('userId', '==', currentUser.uid),
          limit(30)
        );
        const clientSnap = await getDocs(qClients);
        const matchedClients = clientSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data(), type: 'client' }))
          .filter(c => c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term)));

        setResults({
          products: matchedProducts.slice(0, 5),
          clients: matchedClients.slice(0, 5),
          actions: matchedActions
        });
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, currentUser]);

  const flattenedResults = [
    ...results.actions,
    ...results.products,
    ...results.clients
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % flattenedResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flattenedResults.length) % flattenedResults.length);
    } else if (e.key === 'Enter' && flattenedResults[selectedIndex]) {
      handleSelect(flattenedResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (item) => {
    onClose();
    if (item.type === 'action') {
      navigate(item.path);
    } else if (item.type === 'product') {
      navigate('/app/inventario', { state: { viewProductId: item.id } });
    } else if (item.type === 'client') {
      navigate('/app/contactos/clientes', { state: { searchName: item.name } });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="search-overlay animate-fade-in" onClick={onClose}>
      <div className="search-container glass-panel animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="search-header">
          <Search size={22} className="search-icon-main" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Buscar por nombre, categoría, teléfono..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="search-hint">
            <kbd>ESC</kbd> <span>para cerrar</span>
          </div>
        </div>

        <div className="search-body custom-scrollbar">
          {loading ? (
            <div className="search-loading">
              <div className="spinner"></div>
              <span>Buscando en tu negocio...</span>
            </div>
          ) : flattenedResults.length === 0 ? (
            <div className="search-empty">
              <Search size={40} opacity={0.1} />
              <p>No encontramos resultados para "{searchTerm}"</p>
            </div>
          ) : (
            <>
              {results.actions.length > 0 && (
                <div className="search-section">
                  <div className="section-title">Acciones Rápidas</div>
                  {results.actions.map((act, idx) => {
                    const globalIdx = idx;
                    return (
                      <div 
                        key={act.id} 
                        className={`search-item ${selectedIndex === globalIdx ? 'selected' : ''}`}
                        onClick={() => handleSelect(act)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <div className="item-icon action">{act.icon}</div>
                        <div className="item-info">
                          <span className="item-title">{act.title}</span>
                          <span className="item-meta">Ejecutar comando</span>
                        </div>
                        <ArrowRight size={16} className="item-arrow" />
                      </div>
                    );
                  })}
                </div>
              )}

              {results.products.length > 0 && (
                <div className="search-section">
                  <div className="section-title">Productos</div>
                  {results.products.map((prod, idx) => {
                    const globalIdx = results.actions.length + idx;
                    return (
                      <div 
                        key={prod.id} 
                        className={`search-item ${selectedIndex === globalIdx ? 'selected' : ''}`}
                        onClick={() => handleSelect(prod)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <div className="item-icon product">
                          {prod.imageUrl ? <img src={prod.imageUrl} alt="" /> : <Package size={18} />}
                        </div>
                        <div className="item-info">
                          <span className="item-title">{prod.name}</span>
                          <span className="item-meta">
                            {prod.category} • <Tag size={12} style={{display: 'inline', verticalAlign: 'middle'}} /> {formatCurrency(prod.sellingPrice)}
                          </span>
                        </div>
                        <div className="item-badge">{prod.stock} stock</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {results.clients.length > 0 && (
                <div className="search-section">
                  <div className="section-title">Clientes</div>
                  {results.clients.map((client, idx) => {
                    const globalIdx = results.actions.length + results.products.length + idx;
                    return (
                      <div 
                        key={client.id} 
                        className={`search-item ${selectedIndex === globalIdx ? 'selected' : ''}`}
                        onClick={() => handleSelect(client)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <div className="item-icon client">
                          <Users size={18} />
                        </div>
                        <div className="item-info">
                          <span className="item-title">{client.name}</span>
                          <span className="item-meta">
                            <Phone size={12} style={{display: 'inline', verticalAlign: 'middle'}} /> {client.phone || 'Sin teléfono'}
                          </span>
                        </div>
                        <ArrowRight size={16} className="item-arrow" />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="search-footer">
          <div className="footer-keys">
            <div className="key-item"><kbd>↑↓</kbd> <span>Navegar</span></div>
            <div className="key-item"><kbd>↵</kbd> <span>Seleccionar</span></div>
          </div>
          <div className="search-version">Omnisearch v1.0</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
