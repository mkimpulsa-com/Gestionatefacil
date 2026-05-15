import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Plus, Search, Loader2, MoreVertical, Edit2, Trash2, Paperclip, CheckCircle, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, storage } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, increment, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ProductSelector } from '../components/ui/ProductSelector';
import { useData } from '../contexts/DataContext';
import './Compras.css';

export function Compras() {
  const { 
    inventory: productsList, 
    contacts, 
    banks: bankAccounts, 
    purchases, 
    isLoading: loading 
  } = useData();

  const providersList = contacts.filter(doc => doc.type === 'Proveedor');
  
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [newProviderData, setNewProviderData] = useState({
    name: '', contact: '', email: '', phone: '', documentId: '', address: '', city: '', notes: ''
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPurchaseForPay, setSelectedPurchaseForPay] = useState(null);
  const [paymentData, setPaymentData] = useState({ amount: '', accountId: '' });
  
  const initialFormState = {
    name: '', 
    proveedorId: '',
    proveedorName: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    tipoFactura: 'Factura A',
    nroFactura: '',
    status: 'completada', // Podría ser pendiente o completada
    date: new Date().toISOString().split('T')[0],
    items: [],
    notas: '',
    observaciones: '',
    descuentoGeneral: 0,
    percepciones: 0,
    impuestosInternos: 0,
    intereses: 0,
    value: 0,
    montoPagado: 0,
    deuda: 0,
    comprobanteUrl: '',
    bankAccountId: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const calculateTotals = (data) => {
    const itemsTotal = data.items.reduce((acc, item) => acc + item.total, 0);
    const discountAmt = itemsTotal * ((parseFloat(data.descuentoGeneral) || 0) / 100);
    const sub = itemsTotal - discountAmt;
    const finalTotal = sub 
      + (parseFloat(data.percepciones) || 0) 
      + (parseFloat(data.impuestosInternos) || 0) 
      + (parseFloat(data.intereses) || 0);

    const deuda = Math.max(0, finalTotal - (parseFloat(data.montoPagado) || 0));

    return { ...data, value: finalTotal, deuda };
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items, 
        { id: Date.now().toString(), productId: '', descripcion: '', cantidad: 1, precio: 0, descuento: 0, iva: '21', subtotal: 0, total: 0 }
      ]
    }));
  };

  const removeItem = (id) => {
    setFormData(prev => {
      const newItems = prev.items.filter(item => item.id !== id);
      return calculateTotals({ ...prev, items: newItems });
    });
  };

  const updateItem = (id, field, val) => {
    setFormData(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          let updated = { ...item };
          if (field === 'productId') {
            const prod = productsList.find(p => p.id === val);
            if (prod) {
              updated.productId = val;
              updated.descripcion = prod.name;
              // Para compras, usar costPrice si existe, sino 0
              updated.precio = parseFloat(prod.costPrice?.toString().replace(/[^0-9.-]+/g,"")) || 0;
            } else {
              updated.productId = val;
            }
          } else {
            updated[field] = field === 'descripcion' || field === 'iva' ? val : parseFloat(val) || 0;
          }
          
          updated.subtotal = updated.cantidad * updated.precio;
          const discountAmt = updated.subtotal * (updated.descuento / 100);
          const subtotalDisc = updated.subtotal - discountAmt;
          const ivaRate = parseFloat(updated.iva) || 0;
          const ivaAmt = subtotalDisc * (ivaRate / 100);
          updated.total = subtotalDisc + ivaAmt;
          
          return updated;
        }
        return item;
      });
      return calculateTotals({ ...prev, items: newItems });
    });
  };

  const handleGlobalChange = (field, val) => {
    setFormData(prev => calculateTotals({ ...prev, [field]: val }));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveNewProvider = async () => {
    if(!newProviderData.name.trim()) return;
    try {
      const newRef = await addDoc(collection(db, 'clients'), {
        name: newProviderData.name,
        contact: newProviderData.contact || '',
        email: newProviderData.email || '',
        phone: newProviderData.phone || '',
        documentId: newProviderData.documentId || '',
        address: newProviderData.address || '',
        city: newProviderData.city || '',
        notes: newProviderData.notes || '',
        status: 'Activo',
        type: 'Proveedor', // Specific type for compras
        deuda: 0,
        userId: currentUser.uid,
        spent: '$0',
        createdAt: serverTimestamp()
      });
      setFormData(prev => calculateTotals({ ...prev, proveedorId: newRef.id, proveedorName: newProviderData.name }));
      setIsAddingProvider(false);
      setNewProviderData({ name: '', contact: '', email: '', phone: '', documentId: '', address: '', city: '', notes: ''});
      toast.success("Gestionate Fácil: Proveedor agregado a la base de datos");
    } catch (e) {
      toast.error("Gestionate Fácil: Error al guardar proveedor");
    }
  };

  const handleUpdateContactSpent = async (contactId, deltaAmount) => {
    if (!contactId || deltaAmount === 0) return;
    try {
      const contactRef = doc(db, 'clients', contactId);
      const cSnap = await getDoc(contactRef);
      if (cSnap.exists()) {
        const val = cSnap.data().spent || 0;
        let currentSpentNum = 0;
        
        if (typeof val === 'number') {
          currentSpentNum = val;
        } else {
          // Parse old string format: "$ 1.250,50" -> 1250.5
          let clean = val.replace(/[$\s]/g, "");
          if (clean.includes(',') && clean.includes('.')) {
            clean = clean.replace(/\./g, "").replace(',', '.');
          } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
          }
          currentSpentNum = parseFloat(clean) || 0;
        }

        const newSpentNum = currentSpentNum + deltaAmount;
        // Save as Number now
        await updateDoc(contactRef, { spent: newSpentNum });
      }
    } catch (e) {
      console.error("Error updating contact spent:", e);
    }
  };

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

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if(isSaving) return;
    setIsSaving(true);
    
    try {
      let finalComprobanteUrl = formData.comprobanteUrl || '';
      
      if (comprobanteFile) {
        const toastId = toast.loading('Gestionate Fácil: Subiendo factura...');
        const storageRef = ref(storage, `purchases/${currentUser.uid}/${Date.now()}_${comprobanteFile.name}`);
        const snapshot = await uploadBytes(storageRef, comprobanteFile);
        finalComprobanteUrl = await getDownloadURL(snapshot.ref);
        toast.dismiss(toastId);
      }

      const finalData = calculateTotals({ ...formData, comprobanteUrl: finalComprobanteUrl });
      
      // Enforce Bank Account if money is paid
      if (parseFloat(finalData.montoPagado || 0) > 0 && !finalData.bankAccountId) {
        toast.error("Gestionate Fácil: Debe seleccionar una cuenta de origen para el registrar el pago.");
        setIsSaving(false);
        return;
      }

      const purchaseData = {
        ...finalData,
        name: finalData.proveedorName || 'Compra sin proveedor',
        date: finalData.fechaEmision
      };

      if (isEditMode && selectedPurchase) {
        const oldDeuda = parseFloat(selectedPurchase.deuda) || 0;
        const newDeuda = parseFloat(purchaseData.deuda) || 0;
        const deudaDelta = newDeuda - oldDeuda;

        await updateDoc(doc(db, 'purchases', selectedPurchase.id), {
          ...purchaseData,
          updatedAt: serverTimestamp()
        });

        // Spent Sync
        const oldValue = parseFloat(selectedPurchase.value) || 0;
        const newValue = parseFloat(purchaseData.value) || 0;
        const valueDelta = newValue - oldValue;

        if (valueDelta !== 0 && purchaseData.proveedorId) {
          await handleUpdateContactSpent(purchaseData.proveedorId, valueDelta);
        }

        // Sync debt delta to Provider if applicable (a provider whom we owe money)
        if (purchaseData.proveedorId && deudaDelta !== 0) {
           const provRef = doc(db, 'clients', purchaseData.proveedorId);
           try {
             const cSnap = await getDoc(provRef);
             if (cSnap.exists()) {
               const currDeuda = parseFloat(cSnap.data().deuda) || 0;
               await updateDoc(provRef, { deuda: currDeuda + deudaDelta });
             }
           } catch (e) {
             console.error("Error updating provider debt:", e);
           }
        }
        
        // Bank Account Sync - Invert logic for Purchases (Paid means we LOSE money from bank)
        // We restore old payment, then deduct new payment.
        const oldBankAccountId = selectedPurchase.bankAccountId;
        const newBankAccountId = purchaseData.bankAccountId;
        const oldMontoPagado = parseFloat(selectedPurchase.montoPagado) || 0;
        const newMontoPagado = parseFloat(purchaseData.montoPagado) || 0;

        if (oldBankAccountId === newBankAccountId && newBankAccountId) {
            const montoDelta = newMontoPagado - oldMontoPagado; 
            // if we now paid MORE, we deduct the delta extra.
            if (montoDelta !== 0) {
               await handleUpdateAccountBalance(newBankAccountId, -montoDelta);
            }
        } else {
           if (oldBankAccountId && oldMontoPagado > 0) {
               // Restore money to old bank account
               await handleUpdateAccountBalance(oldBankAccountId, oldMontoPagado);
           }
           if (newBankAccountId && newMontoPagado > 0) {
               // Deduct money from new bank account
               await handleUpdateAccountBalance(newBankAccountId, -newMontoPagado);
           }
        }
      } else {
        await addDoc(collection(db, 'purchases'), {
          ...purchaseData,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
        
        // Sync Spent to Provider
        if (purchaseData.proveedorId) await handleUpdateContactSpent(purchaseData.proveedorId, purchaseData.value);

        // Aumentar stock de forma permanente tras la compra
        for (const it of purchaseData.items) {
          if (it.productId) {
            const prodRef = doc(db, 'products', it.productId);
            await updateDoc(prodRef, { stock: increment(it.cantidad) }).catch(e=>console.error(e));
          }
        }
        
        // Cargar Deuda al Proveedor si hubiere
        if (purchaseData.proveedorId && purchaseData.deuda > 0) {
           const provRef = doc(db, 'clients', purchaseData.proveedorId);
           try {
             const cSnap = await getDoc(provRef);
             if (cSnap.exists()) {
               const currDeuda = parseFloat(cSnap.data().deuda) || 0;
               await updateDoc(provRef, { deuda: currDeuda + purchaseData.deuda });
             }
           } catch (e) {
             console.error("Error setting initial provider debt:", e);
           }
        }
        
        // Restar Saldo a la Cuenta Bancaria origen
        if (purchaseData.bankAccountId && parseFloat(purchaseData.montoPagado) > 0) {
           await handleUpdateAccountBalance(purchaseData.bankAccountId, -parseFloat(purchaseData.montoPagado));
        }
      }
      
      toast.success(isEditMode ? "Gestionate Fácil: Compra actualizada" : "Gestionate Fácil: Compra registrada, stock incrementado y saldo ajustado.");
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Gestionate Fácil: Error al registrar compra");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const purToDel = purchases.find(p => p.id === itemToDelete);
      if (purToDel) {
        // Revertir stock (restarlo)
        if (purToDel.items) {
          for (const it of purToDel.items) {
            if (it.productId) {
              const prodRef = doc(db, 'products', it.productId);
              await updateDoc(prodRef, { stock: increment(-it.cantidad) }).catch(err => console.error(err));
            }
          }
        }
        // Revertir Deuda Proveedor
        if (purToDel.proveedorId && purToDel.deuda > 0) {
            const provRef = doc(db, 'clients', purToDel.proveedorId);
            try {
              const cSnap = await getDoc(provRef);
              if (cSnap.exists()) {
                const currDeuda = parseFloat(cSnap.data().deuda) || 0;
                await updateDoc(provRef, { deuda: Math.max(0, currDeuda - purToDel.deuda) });
              }
            } catch (e) {
              console.error("Error reverting provider debt:", e);
            }
        }
        // Revertir/Devolver plata a la cuenta bancaria origen
        if (purToDel.bankAccountId && parseFloat(purToDel.montoPagado) > 0) {
            await handleUpdateAccountBalance(purToDel.bankAccountId, parseFloat(purToDel.montoPagado));
        }
      }
      // Revert Spent on Delete
      const valToRevert = parseFloat(purToDel.value) || 0;
      if (purToDel.proveedorId) await handleUpdateContactSpent(purToDel.proveedorId, -valToRevert);

      await deleteDoc(doc(db, 'purchases', itemToDelete));
      toast.success("Gestionate Fácil: Compra anulada, stock retrocedido e importe devuelto.");
      setIsConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting purchase:", error);
      toast.error("Gestionate Fácil: Error al anular compra");
    }
  };

  const openEditModal = (purchase) => {
    setSelectedPurchase(purchase);
    setFormData({
      ...initialFormState,
      ...purchase,
      // Si antes se llamaba montoCobrado por error, usar montoPagado
      montoPagado: purchase.montoPagado || 0 
    });
    setIsEditMode(true);
    setIsModalOpen(true);
    setActiveMenuId(null);
    setComprobanteFile(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsEditMode(false);
    setIsModalOpen(true);
    setComprobanteFile(null);
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setSelectedPurchase(null);
    setComprobanteFile(null);
  };

  const handleOpenPayModal = (purchase) => {
    setSelectedPurchaseForPay(purchase);
    setPaymentData({ amount: purchase.deuda.toString(), accountId: '' });
    setIsPayModalOpen(true);
    setActiveMenuId(null);
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!selectedPurchaseForPay || !paymentData.accountId || !paymentData.amount) return;
    setIsSaving(true);

    try {
      const payAmt = parseFloat(paymentData.amount);
      const newMontoPagado = (parseFloat(selectedPurchaseForPay.montoPagado) || 0) + payAmt;
      const newDeuda = Math.max(0, (parseFloat(selectedPurchaseForPay.deuda) || 0) - payAmt);

      // 1. Update Purchase
      await updateDoc(doc(db, 'purchases', selectedPurchaseForPay.id), {
        montoPagado: newMontoPagado,
        deuda: newDeuda,
        updatedAt: serverTimestamp()
      });

      // 2. Update Bank Account Balance (Subtract money)
      await handleUpdateAccountBalance(paymentData.accountId, -payAmt);

      // 3. Update Provider Debt
      if (selectedPurchaseForPay.proveedorId) {
        const provRef = doc(db, 'clients', selectedPurchaseForPay.proveedorId);
        const provSnap = await getDoc(provRef);
        if (provSnap.exists()) {
           const currentProvDeuda = parseFloat(provSnap.data().deuda) || 0;
           await updateDoc(provRef, { deuda: Math.max(0, currentProvDeuda - payAmt) });
        }
      }

      toast.success("Gestionate Fácil: Pago registrado correctamente");
      setIsPayModalOpen(false);
      setSelectedPurchaseForPay(null);
    } catch (error) {
      console.error("Error registering payment:", error);
      toast.error("Gestionate Fácil: Error al registrar el pago");
    } finally {
      setIsSaving(false);
    }
  };

  const stats = {
    totalInvertido: purchases.reduce((acc, p) => acc + (p.value || 0), 0),
    totalPagado: purchases.reduce((acc, p) => acc + (parseFloat(p.montoPagado) || 0), 0),
    totalDeuda: purchases.reduce((acc, p) => acc + (parseFloat(p.deuda) || 0), 0)
  };

  return (
    <div className="compras-container animate-fade-in">
      <header className="ventas-header">
        <div>
          <h1 className="page-title">Compras y Abastecimiento</h1>
          <p className="page-subtitle">Registra compras de mercadería a proveedores. Al guardar, aumentará tu inventario de stock.</p>
        </div>
        <button className="btn-danger flex-center gap-2" onClick={openAddModal}>
          <Plus size={18} />
          <span>Nueva Compra</span>
        </button>
      </header>

      <div className="ventas-stats">
        <div className="glass-card stat-card">
          <div className="stat-title">Inversión Total (Histórica)</div>
          <div className="stat-value danger">{formatCurrency(stats.totalInvertido)}</div>
          <div className="stat-meta">Valor de mercadería adquirida</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-title">Total Pagado a Proveedores</div>
          <div className="stat-value text-gradient">{formatCurrency(stats.totalPagado)}</div>
          <div className="stat-meta">Egresos bancarios en compras</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-title">Deuda Vigente</div>
          <div className="stat-value text-muted">{formatCurrency(stats.totalDeuda)}</div>
          <div className="stat-meta">Pendiente de pago o en cuenta corriente</div>
        </div>
      </div>

      <div className="glass-panel main-crm-panel">
        <div className="table-responsive">
          <table className="crm-table purchases-table">
            <thead>
              <tr>
                <th>Fecha Ingreso</th>
                <th>Comprobante</th>
                <th>Proveedor</th>
                <th>Total Compra</th>
                <th>Abonado</th>
                <th>Estado Deuda</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>Aún no tienes abastecimientos registrados.</td></tr>
              ) : (
                purchases.sort((a,b) => new Date(b.date) - new Date(a.date)).map(pur => (
                  <tr key={pur.id}>
                    <td data-label="Fecha Ingreso">
                      <div className="contact-cell">
                        <span className="contact-name">{pur.date}</span>
                      </div>
                    </td>
                    <td data-label="Comprobante">
                      <div className="contact-meta">
                        <span className="meta-item" style={{color: 'var(--text-main)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px'}}>
                          {pur.tipoFactura} {pur.nroFactura}
                        </span>
                      </div>
                    </td>
                    <td data-label="Proveedor">
                      <span className="company-name">{pur.name}</span>
                    </td>
                    <td data-label="Total Compra"><span style={{fontWeight: 600, color: 'var(--danger)'}}>{formatCurrency(pur.value)}</span></td>
                    <td data-label="Abonado"><span style={{color: 'var(--text-dim)', fontWeight: 500}}>{formatCurrency(pur.montoPagado !== undefined ? pur.montoPagado : pur.value)}</span></td>
                    <td data-label="Estado Deuda">
                      {parseFloat(pur.deuda) > 0 ? (
                        <span style={{color: '#f97316', fontWeight: 600, background: 'rgba(249, 115, 22, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px'}}>
                          Adeduda {formatCurrency(pur.deuda)}
                        </span>
                      ) : (
                        <span style={{color: 'var(--success)'}}>Pagado</span>
                      )}
                    </td>
                    <td data-label="Acciones">
                      <div className="action-dropdown-container" ref={activeMenuId === pur.id ? menuRef : null}>
                        <button 
                          className="btn-icon" 
                          onClick={() => setActiveMenuId(activeMenuId === pur.id ? null : pur.id)}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {activeMenuId === pur.id && (
                          <div className="dropdown-menu">
                            <button className="dropdown-item" onClick={() => openEditModal(pur)}>
                              <Edit2 size={14} />
                              <span>Ver / Editar Detalle</span>
                            </button>
                            {parseFloat(pur.deuda) > 0 && (
                              <button className="dropdown-item" onClick={() => handleOpenPayModal(pur)}>
                                <DollarSign size={14} style={{ color: 'var(--success)' }} />
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Abonar Deuda</span>
                              </button>
                            )}
                            {pur.comprobanteUrl && (
                              <button className="dropdown-item" onClick={() => window.open(pur.comprobanteUrl, '_blank')}>
                                <Paperclip size={14} />
                                <span>Ver Remito/Factura</span>
                              </button>
                            )}
                            <button className="dropdown-item delete" onClick={() => handleDeleteClick(pur.id)}>
                              <Trash2 size={14} />
                              <span>Anular e Invertir Stock</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={handleConfirmDelete}
        title="Anular Registro de Compra"
        message="Atención: Al anular esta compra, se restará correspondientemente del inventario el stock que sumó previamente. También se restaurará el dinero pagado en tu sistema bancario."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "Tiquete de Compra" : "Registrar Nueva Compra"}
        className="large-modal"
      >
        <form className="invoice-form" onSubmit={handleSavePurchase}>
          <div className="invoice-header-grid">
            <div className="form-group" style={{position: 'relative', gridColumn: isAddingProvider ? '1 / -1' : 'auto'}}>
              {!isAddingProvider && <label>Proveedor *</label>}
              {!isAddingProvider ? (
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <select 
                    className="form-input" 
                    value={formData.proveedorId} 
                    onChange={e => {
                       const idx = e.target.selectedIndex;
                       const cName = e.target.options[idx].text;
                       setFormData(prev => ({ ...prev, proveedorId: e.target.value, proveedorName: cName }));
                    }} 
                    required 
                    style={{flex: 1}}
                  >
                    <option value="" disabled>Seleccionar Proveedor...</option>
                    {providersList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-outline" style={{padding: '0 0.8rem'}} onClick={() => setIsAddingProvider(true)} title="Añadir nuevo proveedor rápido">
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <div style={{background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px dashed rgba(239, 68, 68, 0.2)'}}>
                  <h4 style={{marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--text-main)'}}>Crear Nuevo Proveedor</h4>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label>Razón Social / Nombre *</label>
                      <input type="text" className="form-input" value={newProviderData.name} onChange={e => setNewProviderData({...newProviderData, name: e.target.value})} autoFocus placeholder="Ej: Importadora G" />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label>Teléfono o Email</label>
                      <input type="text" className="form-input" value={newProviderData.contact} onChange={e => setNewProviderData({...newProviderData, contact: e.target.value})} placeholder="Opcional" />
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '0.8rem', marginTop: '1.5rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem'}}>
                    <button type="button" className="btn-outline" onClick={() => setIsAddingProvider(false)}>Cancelar</button>
                    <button type="button" className="btn-danger" onClick={handleSaveNewProvider} disabled={!newProviderData.name.trim()}>Guardar Proveedor</button>
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Fecha de Recepción / Remito</label>
              <input type="date" className="form-input" value={formData.fechaEmision} onChange={e => handleGlobalChange('fechaEmision', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Comprobante Físico (Opcional)</label>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <select className="form-input" style={{flex: 1, minWidth: 0}} value={formData.tipoFactura} onChange={e => handleGlobalChange('tipoFactura', e.target.value)}>
                  <option value="Factura A">Factura A</option>
                  <option value="Factura B">Factura B</option>
                  <option value="Factura C">Factura C</option>
                  <option value="Remito">Remito / Despacho</option>
                  <option value="Recibo">Recibo Informal</option>
                </select>
                <input type="text" className="form-input" style={{flex: 1, minWidth: 0}} placeholder="Nro de envío..." value={formData.nroFactura} onChange={e => handleGlobalChange('nroFactura', e.target.value)} />
              </div>
            </div>

          </div>

          <div className="invoice-items-section" style={{background: 'linear-gradient(to top right, rgba(239, 68, 68, 0.02), rgba(0,0,0,0.2))'}}>
            <div className="flex-between" style={{marginBottom: '0.5rem'}}>
              <h4 style={{fontSize: '0.95rem', fontWeight: 500}}>Mercadería / Insumos a abastecer</h4>
              <button type="button" className="btn-outline" onClick={addItem} style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.5)'}}>
                + Añadir Línea de Stock
              </button>
            </div>
            
            <table className="invoice-items-table">
              <thead>
                <tr>
                  <th style={{width: '35%'}}>Producto a Ingresar</th>
                  <th style={{width: '10%'}}>Cant. ⬆</th>
                  <th style={{width: '15%'}}>Costo Unit.</th>
                  <th style={{width: '10%'}}>Desc. %</th>
                  <th style={{width: '10%'}}>IVA</th>
                  <th style={{width: '15%'}}>Total Línea</th>
                  <th style={{width: '5%'}}></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No hay ítems para abastecer en el remito. Haga clic en "+ Añadir Línea"</td>
                  </tr>
                )}
                {formData.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <ProductSelector 
                        products={productsList} 
                        value={item.productId || ''} 
                        onChange={(productId) => updateItem(item.id, 'productId', productId)} 
                      />
                    </td>
                    <td><input type="number" min="1" step="0.1" value={item.cantidad} onChange={e => updateItem(item.id, 'cantidad', e.target.value)} required /></td>
                    <td>
                       <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                         <span style={{color:'var(--text-muted)'}}>$</span>
                         <input type="number" min="0" step="0.01" value={item.precio} onChange={e => updateItem(item.id, 'precio', e.target.value)} required />
                       </div>
                    </td>
                    <td><input type="number" min="0" max="100" step="0.1" value={item.descuento} onChange={e => updateItem(item.id, 'descuento', e.target.value)} /></td>
                    <td><input type="number" min="0" max="100" step="0.1" value={item.iva} onChange={e => updateItem(item.id, 'iva', e.target.value)} placeholder="0" /></td>
                    <td style={{fontWeight: 600, color: '#ef4444'}}>{formatCurrency(item.total)}</td>
                    <td>
                      <button type="button" className="btn-icon delete" onClick={() => removeItem(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="invoice-footer-grid">
            <div className="invoice-notes" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              
              <div style={{background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed rgba(239, 68, 68, 0.3)'}}>
                 <h4 style={{fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: '#fca5a5'}}>Condiciones de Pago</h4>
                 <div className="form-group" style={{marginBottom: '1rem'}}>
                    <label>Egresar plata de:</label>
                    <select 
                      className="form-input" 
                      value={formData.bankAccountId} 
                      onChange={e => handleGlobalChange('bankAccountId', e.target.value)}
                      required
                    >
                      <option value="" disabled>Seleccionar cuenta...</option>
                      {bankAccounts.map(b => (
                         <option key={b.id} value={b.id}>{b.name} (Disp: {formatCurrency(b.balance||0)})</option>
                      ))}
                    </select>
                 </div>
                 <div className="form-group">
                    <label>Monto a entregar ahora ($)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0"
                      step="0.01"
                      value={formData.montoPagado} 
                      onChange={e => handleGlobalChange('montoPagado', e.target.value)} 
                      placeholder="Ej: $0 o el Total."
                    />
                    <p style={{fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)'}}>* La diferencia pasará a deuda con el proveedor.</p>
                 </div>
              </div>

              <div className="form-group">
                <label>Foto de la factura recibida</label>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem'}}>
                  <input 
                    type="file" 
                    className="form-input" 
                    accept="image/*,.pdf" 
                    onChange={(e) => setComprobanteFile(e.target.files[0])}
                    style={{padding: '0.5rem'}}
                  />
                  {comprobanteFile && <span style={{fontSize: '0.8rem', color: 'var(--success)'}}>{comprobanteFile.name}</span>}
                  {formData.comprobanteUrl && !comprobanteFile && (
                    <a href={formData.comprobanteUrl} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <Paperclip size={14} /> Ver archivo subido
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="invoice-summary">
              <div className="summary-row">
                <span>Descuento de Proveedor (%)</span>
                <input type="number" className="form-input" min="0" max="100" step="0.1" value={formData.descuentoGeneral} onChange={e => handleGlobalChange('descuentoGeneral', e.target.value)} />
              </div>
              <div className="summary-row">
                <span>+ Flete / Envío ($)</span>
                <input type="number" className="form-input" min="0" step="0.01" value={formData.percepciones} onChange={e => handleGlobalChange('percepciones', e.target.value)} />
              </div>
              <div className="summary-row">
                <span>+ Impuestos Int. ($)</span>
                <input type="number" className="form-input" min="0" step="0.01" value={formData.impuestosInternos} onChange={e => handleGlobalChange('impuestosInternos', e.target.value)} />
              </div>
              <div className="summary-row">
                <span>+ Intereses Resarcitorios ($)</span>
                <input type="number" className="form-input" min="0" step="0.01" value={formData.intereses} onChange={e => handleGlobalChange('intereses', e.target.value)} />
              </div>
              
              <div className="summary-row total" style={{color: '#ef4444', borderTopColor: 'rgba(239, 68, 68, 0.2)'}}>
                <span>TOTAL COMPRA</span>
                <span>{formatCurrency(formData.value)}</span>
              </div>

              {parseFloat(formData.deuda) > 0 && (
                <div style={{marginTop: '1.5rem', background: 'rgba(249, 115, 22, 0.1)', padding:'1rem', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#f97316', fontWeight: 600}}>DEUDA PROVEEDOR</span>
                  <span style={{color: '#f97316', fontWeight: 700}}>{formatCurrency(formData.deuda)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="modal-footer" style={{marginTop: '2rem'}}>
            <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-danger" disabled={isSaving || formData.items.length === 0}>
              {isSaving ? "Guardando..." : isEditMode ? "Actualizar Inventario y Saldo" : "Ingresar Compra y Stock"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Pago de Deuda */}
      <Modal 
        isOpen={isPayModalOpen} 
        onClose={() => setIsPayModalOpen(false)} 
        title="Ajuste de Deuda (Registrar Pago)"
      >
        <form onSubmit={handleRegisterPayment}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Registra un pago para reducir la deuda de esta compra. El dinero se descontará de la cuenta seleccionada.
            </p>
            <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>Proveedor:</span>
                  <span style={{ fontWeight: 600 }}>{selectedPurchaseForPay?.name}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem' }}>Deuda Pendiente:</span>
                  <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(selectedPurchaseForPay?.deuda || 0)}</span>
               </div>
            </div>

            <div className="form-group">
              <label>Cuenta de Origen (Donde sale el dinero)</label>
              <select 
                className="form-input" 
                required 
                value={paymentData.accountId}
                onChange={e => setPaymentData({ ...paymentData, accountId: e.target.value })}
              >
                <option value="" disabled>Seleccionar cuenta...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatCurrency(acc.balance || 0)})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Monto a Abonar ($)</label>
              <input 
                type="number" 
                className="form-input" 
                required 
                min="0.01" 
                max={selectedPurchaseForPay?.deuda}
                step="0.01"
                value={paymentData.amount}
                onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setIsPayModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-danger" disabled={isSaving}>
              {isSaving ? "Procesando..." : "Confirmar Pago y Ajustar Deuda"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
