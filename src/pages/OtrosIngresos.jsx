import { useState, useEffect, useRef } from 'react';
import { Plus, Search, MoreVertical, Edit2, Trash2, PiggyBank, ArrowUpRight, Loader2, Download, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { SkeletonRow } from '../components/ui/Skeleton';
import './OtrosIngresos.css';

export function OtrosIngresos() {
  const { currentUser } = useAuth();
  const [incomes, setIncomes] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const menuRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({ 
    description: '', 
    amount: '', 
    category: 'Comisiones', 
    date: new Date().toISOString().split('T')[0],
    accountId: ''
  });

  useEffect(() => {
    if (!currentUser) return;

    // Fetch Incomes
    const qIncomes = query(
      collection(db, 'otherIncomes'),
      where('userId', '==', currentUser.uid)
    );
    const unsubIncomes = onSnapshot(qIncomes, (snapshot) => {
      const incData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIncomes(incData.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    });

    // Fetch Bank Accounts for destination
    const qAccounts = query(collection(db, 'bankAccounts'), where('userId', '==', currentUser.uid));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
       const accs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
       setBankAccounts(accs);
    });

    return () => {
      unsubIncomes();
      unsubAccounts();
    };
  }, [currentUser]);

  // Click outside menu listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdateAccountBalance = async (accountId, deltaAmount) => {
    if (!accountId || deltaAmount === 0) return;
    try {
      const accRef = doc(db, 'bankAccounts', accountId);
      const accSnap = await getDoc(accRef);
      if (accSnap.exists()) {
        const currentBalance = parseFloat(accSnap.data().balance) || 0;
        await updateDoc(accRef, { balance: Math.max(0, currentBalance + deltaAmount) });
      }
    } catch (e) {
      console.error("Failed to update account balance", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accountId) {
      toast.error("Gestionate Fácil: Debe seleccionar una cuenta de destino para el ingreso.");
      return;
    }
    setIsSaving(true);
    try {
      const amountNum = parseFloat(formData.amount) || 0;
      
      if (isEditMode && selectedIncome) {
        // Handle Balance Deltas mapping
        const oldAmount = selectedIncome.amount || 0;
        const oldAccount = selectedIncome.accountId;
        const newAccount = formData.accountId;

        if (oldAccount !== newAccount) {
           // Revert old account minus amount
           await handleUpdateAccountBalance(oldAccount, -oldAmount);
           // Add new amount to new account
           await handleUpdateAccountBalance(newAccount, amountNum);
        } else {
           // Same account, just apply delta offset
           const delta = amountNum - oldAmount;
           await handleUpdateAccountBalance(oldAccount, delta);
        }

        await updateDoc(doc(db, 'otherIncomes', selectedIncome.id), {
          ...formData,
          amount: amountNum,
          updatedAt: serverTimestamp()
        });
        toast.success("Gestionate Fácil: Ingreso actualizado correctamente");

      } else {
        await addDoc(collection(db, 'otherIncomes'), {
          ...formData,
          amount: amountNum,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
        // Increase target account balance
        await handleUpdateAccountBalance(formData.accountId, amountNum);
        toast.success("Gestionate Fácil: Ingreso guardado exitosamente");
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving income:", error);
      toast.error("Gestionate Fácil: Error al guardar el ingreso");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (income) => {
    setItemToDelete(income);
    setIsConfirmOpen(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      // Revert account balance
      await handleUpdateAccountBalance(itemToDelete.accountId, -(itemToDelete.amount || 0));
      await deleteDoc(doc(db, 'otherIncomes', itemToDelete.id));
      
      toast.success("Gestionate Fácil: Ingreso eliminado");
      setIsConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting income: ", error);
      toast.error("Gestionate Fácil: Error al eliminar ingreso");
    }
  };

  const openEditModal = (income) => {
    setSelectedIncome(income);
    setFormData({
      description: income.description,
      amount: income.amount.toString(),
      category: income.category,
      date: income.date,
      accountId: income.accountId || ''
    });
    setIsEditMode(true);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      description: '', 
      amount: '', 
      category: 'Comisiones', 
      date: new Date().toISOString().split('T')[0],
      accountId: ''
    });
    setSelectedIncome(null);
  };

  const filteredIncomes = [...incomes].filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalOtherIncomes = incomes.reduce((acc, t) => acc + (t.amount || 0), 0);

  return (
    <div className="otros-ingresos-container animate-fade-in">
      <header className="oi-header">
        <div>
          <h1 className="page-title">Otros Ingresos</h1>
          <p className="page-subtitle">Gestiona rentas, comisiones e ingresos adicionales (no vinculados a ventas de productos).</p>
        </div>
        <div className="flex-center gap-2">
          <button className="btn-primary flex-center gap-2" onClick={openAddModal}>
            <Plus size={18} />
            <span>Nuevo Ingreso</span>
          </button>
        </div>
      </header>

      <div className="oi-stats">
        <div className="glass-card stat-card balance-card" style={{ maxWidth: '400px' }}>
          <div className="stat-title flex-center gap-2" style={{justifyContent: 'flex-start'}}>
             <PiggyBank size={18} />
             <span>Total Otros Ingresos Mapeados</span>
          </div>
          <div className="stat-value text-gradient">{formatCurrency(totalOtherIncomes)}</div>
          <div className="stat-meta"><ArrowUpRight size={14} className="success" /> Efecto Positivo</div>
        </div>
      </div>

      <div className="oi-content">
        <div className="glass-panel main-panel">
          <div className="panel-header" style={{flexWrap: 'wrap', gap: '1rem'}}>
            <h3>Listado de Registros</h3>
            <div className="search-bar" style={{maxWidth: '300px', flex: 1}}>
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Buscar por descripción..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="oi-table">
              <thead>
                <tr>
                  <th>Concepto / Detalle</th>
                  <th>Monto</th>
                  <th>Categoría</th>
                  <th>Cuenta de Destino</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6"><SkeletonRow columns={6} /></td></tr>
                ) : filteredIncomes.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-muted">No se encontraron ingresos extras.</td></tr>
                ) : (
                  filteredIncomes.map(inc => {
                    const accDest = bankAccounts.find(b => b.id === inc.accountId);
                    return (
                      <tr key={inc.id}>
                        <td data-label="Concepto / Detalle">
                          <div className="flex-center" style={{justifyContent: 'flex-start', gap: '10px'}}>
                            <div className="oi-avatar-icon"><ArrowUpRight size={16} /></div>
                            <span style={{fontWeight: 500}}>{inc.description}</span>
                          </div>
                        </td>
                        <td data-label="Monto" className="success fw-bold">+{formatCurrency(inc.amount)}</td>
                        <td data-label="Categoría"><span className="category-tag">{inc.category}</span></td>
                        <td data-label="Destino">
                          {accDest ? (
                            <div className="flex-center gap-1" style={{justifyContent: 'flex-start'}}>
                               <Landmark size={14} className="text-muted"/>
                               <span>{accDest.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted" style={{fontStyle: 'italic'}}>- Sin cuenta -</span>
                          )}
                        </td>
                        <td data-label="Fecha">{inc.date}</td>
                        <td data-label="Acciones">
                          <div className="action-dropdown-container" ref={activeMenuId === inc.id ? menuRef : null}>
                            <button className="btn-icon" onClick={() => setActiveMenuId(activeMenuId === inc.id ? null : inc.id)}>
                              <MoreVertical size={18} />
                            </button>
                            {activeMenuId === inc.id && (
                              <div className="dropdown-menu">
                                <button className="dropdown-item" onClick={() => openEditModal(inc)}>
                                  <Edit2 size={14} />
                                  <span>Editar</span>
                                </button>
                                <button className="dropdown-item delete" onClick={() => handleDeleteClick(inc)}>
                                  <Trash2 size={14} />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={handleConfirmDelete}
        title="Eliminar Ingreso"
        message={`¿Estás seguro de que deseas eliminar "${itemToDelete?.description}"? El monto se descontará del saldo de la cuenta de destino.`}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "Editar Otro Ingreso" : "Registrar Otro Ingreso"}
      >
        <form onSubmit={handleSubmit} className="oi-form">
          <div className="form-group">
            <label>Descripción / Concepto</label>
            <input 
              type="text" 
              required 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="form-input"
              placeholder="Ej: Cobro de Alquiler / Comisión XYZ"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Monto ($)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                required 
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className="form-input"
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="form-input"
              >
                <option value="Comisiones">Comisiones</option>
                <option value="Rentas">Rentas de Alquiler</option>
                <option value="Inversiones">Inversiones</option>
                <option value="Honorarios">Honorarios Profesionales</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cuenta Destino</label>
              <select 
                required
                value={formData.accountId}
                onChange={e => setFormData({...formData, accountId: e.target.value})}
                className="form-input"
              >
                <option value="" disabled>Selecciona una cuenta</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} (Disp: {formatCurrency(acc.balance||0)})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de Cobro</label>
              <input 
                type="date" 
                required 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="form-input"
              />
            </div>
          </div>
          <div className="modal-footer" style={{marginTop: '2rem'}}>
            <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : isEditMode ? "Actualizar Registro" : "Guardar Ingreso"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
