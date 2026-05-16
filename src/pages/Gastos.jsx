import { useState, useEffect, useRef } from 'react';
import { Plus, Search, MoreVertical, Edit2, Trash2, Receipt, ArrowDownRight, Loader2, Download, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { SkeletonRow } from '../components/ui/Skeleton';
import './Gastos.css';

export function Gastos() {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const menuRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({ 
    description: '', 
    amount: '', 
    category: 'Servicios', 
    date: new Date().toISOString().split('T')[0],
    accountId: ''
  });

  useEffect(() => {
    if (!currentUser) return;

    // Fetch Expenses
    const qExpenses = query(
      collection(db, 'expenses'),
      where('userId', '==', currentUser.uid)
    );
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const expData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(expData.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    });

    // Fetch Bank Accounts for destination
    const qAccounts = query(collection(db, 'bankAccounts'), where('userId', '==', currentUser.uid));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
       const accs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
       setBankAccounts(accs);
    });

    return () => {
      unsubExpenses();
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
        await updateDoc(accRef, { balance: currentBalance + deltaAmount });
      }
    } catch (e) {
      console.error("Failed to update account balance", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accountId) {
      toast.error("Gestionate Fácil: Debe seleccionar una cuenta de origen para el gasto.");
      return;
    }
    setIsSaving(true);
    try {
      const amountNum = parseFloat(formData.amount) || 0;
      
      if (isEditMode && selectedExpense) {
        // Handle Balance Deltas mapping
        const oldAmount = selectedExpense.amount || 0;
        const oldAccount = selectedExpense.accountId;
        const newAccount = formData.accountId;

        if (oldAccount !== newAccount) {
           // Devolver plata a la cuenta anterior
           await handleUpdateAccountBalance(oldAccount, oldAmount);
           // Restar plata de la nueva cuenta
           await handleUpdateAccountBalance(newAccount, -amountNum);
        } else {
           // Misma cuenta, calcular diferencia y restarla
           const delta = amountNum - oldAmount;
           await handleUpdateAccountBalance(oldAccount, -delta);
        }

        await updateDoc(doc(db, 'expenses', selectedExpense.id), {
          ...formData,
          amount: amountNum,
          updatedAt: serverTimestamp()
        });
        toast.success("Gestionate Fácil: Gasto actualizado correctamente");

      } else {
        await addDoc(collection(db, 'expenses'), {
          ...formData,
          amount: amountNum,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
        // Descontar saldo de la cuenta de origen
        await handleUpdateAccountBalance(formData.accountId, -amountNum);
        toast.success("Gestionate Fácil: Gasto registrado exitosamente");
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Gestionate Fácil: Error al guardar el gasto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (expense) => {
    setItemToDelete(expense);
    setIsConfirmOpen(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      // Devolver saldo a la cuenta
      await handleUpdateAccountBalance(itemToDelete.accountId, (itemToDelete.amount || 0));
      await deleteDoc(doc(db, 'expenses', itemToDelete.id));
      
      toast.success("Gestionate Fácil: Gasto eliminado (saldo devuelto)");
      setIsConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting expense: ", error);
      toast.error("Gestionate Fácil: Error al eliminar gasto");
    }
  };

  const openEditModal = (expense) => {
    setSelectedExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      accountId: expense.accountId || ''
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
      category: 'Servicios', 
      date: new Date().toISOString().split('T')[0],
      accountId: ''
    });
    setSelectedExpense(null);
  };

  const filteredExpenses = expenses.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = expenses.reduce((acc, t) => acc + (t.amount || 0), 0);

  return (
    <div className="gastos-container animate-fade-in">
      <header className="gastos-header">
        <div>
          <h1 className="page-title">Egresos y Gastos</h1>
          <p className="page-subtitle">Registra salidas de dinero como alquiler, servicios, salarios e impuestos.</p>
        </div>
        <div className="flex-center gap-2">
          <button className="btn-primary flex-center gap-2" onClick={openAddModal}>
            <Plus size={18} />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </header>

      <div className="gastos-stats">
        <div className="glass-card stat-card balance-card expense-card" style={{ maxWidth: '400px' }}>
          <div className="stat-title flex-center gap-2" style={{justifyContent: 'flex-start'}}>
             <Receipt size={18} />
             <span>Total de Gastos Mapeados</span>
          </div>
          <div className="stat-value danger">{formatCurrency(totalExpenses)}</div>
          <div className="stat-meta"><ArrowDownRight size={14} className="danger" /> Impacto Negativo</div>
        </div>
      </div>

      <div className="gastos-content">
        <div className="glass-panel main-panel">
          <div className="panel-header" style={{flexWrap: 'wrap', gap: '1rem'}}>
            <h3>Listado de Gastos</h3>
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
            <table className="gastos-table">
              <thead>
                <tr>
                  <th>Concepto / Detalle</th>
                  <th>Monto</th>
                  <th>Categoría</th>
                  <th>Cuenta de Origen</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6"><SkeletonRow columns={6} /></td></tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-muted">No se encontraron gastos registrados.</td></tr>
                ) : (
                  filteredExpenses.map(exp => {
                    const accDest = bankAccounts.find(b => b.id === exp.accountId);
                    return (
                      <tr key={exp.id}>
                        <td data-label="Concepto / Detalle">
                          <div className="flex-center" style={{justifyContent: 'flex-start', gap: '10px'}}>
                            <div className="gastos-avatar-icon"><ArrowDownRight size={16} /></div>
                            <span style={{fontWeight: 500}}>{exp.description}</span>
                          </div>
                        </td>
                        <td data-label="Monto" className="danger fw-bold">-{formatCurrency(exp.amount)}</td>
                        <td data-label="Categoría"><span className="category-tag danger-tag">{exp.category}</span></td>
                        <td data-label="Origen">
                          {accDest ? (
                            <div className="flex-center gap-1" style={{justifyContent: 'flex-start'}}>
                               <Landmark size={14} className="text-muted"/>
                               <span>{accDest.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted" style={{fontStyle: 'italic'}}>- Sin cuenta -</span>
                          )}
                        </td>
                        <td data-label="Fecha">{exp.date}</td>
                        <td data-label="Acciones">
                          <div className="action-dropdown-container" ref={activeMenuId === exp.id ? menuRef : null}>
                            <button className="btn-icon" onClick={() => setActiveMenuId(activeMenuId === exp.id ? null : exp.id)}>
                              <MoreVertical size={18} />
                            </button>
                            {activeMenuId === exp.id && (
                              <div className="dropdown-menu">
                                <button className="dropdown-item" onClick={() => openEditModal(exp)}>
                                  <Edit2 size={14} />
                                  <span>Editar</span>
                                </button>
                                <button className="dropdown-item delete" onClick={() => handleDeleteClick(exp)}>
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
        title="Eliminar Gasto"
        message={`¿Estás seguro de que deseas eliminar "${itemToDelete?.description}"? El monto se devolverá al saldo de la cuenta bancaria de la que salió originalmente.`}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "Editar Gasto" : "Registrar Nuevo Gasto"}
      >
        <form onSubmit={handleSubmit} className="gastos-form">
          <div className="form-group">
            <label>Descripción / Concepto</label>
            <input 
              type="text" 
              required 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="form-input"
              placeholder="Ej: Pago de Luz, Alquiler de Oficina"
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
                <option value="Servicios">Servicios (Luz, Agua, Internet)</option>
                <option value="Impuestos">Impuestos / Tasas</option>
                <option value="Infraestructura">Mantenimiento / Infraestructura</option>
                <option value="Salarios">Salarios / Honorarios</option>
                <option value="Alquiler">Alquiler de Inmuebles</option>
                <option value="Marketing">Marketing / Publicidad</option>
                <option value="Otros">Otros Egresos</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Pagar desde Cuenta</label>
              <select 
                required
                value={formData.accountId}
                onChange={e => setFormData({...formData, accountId: e.target.value})}
                className="form-input"
              >
                <option value="" disabled>Selecciona la cuenta/caja de origen</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} (Disp: {formatCurrency(acc.balance||0)})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de Pago</label>
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
            <button type="submit" className="btn-danger" disabled={isSaving}>
              {isSaving ? "Guardando..." : isEditMode ? "Actualizar Gasto" : "Registrar Gasto"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
