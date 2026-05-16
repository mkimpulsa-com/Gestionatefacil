import { useState, useEffect, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, storage } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, increment, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { VentasStats } from '../components/ventas/VentasStats';
import { VentasTable } from '../components/ventas/VentasTable';
import { VentaForm } from '../components/ventas/VentaForm';
import { ReceiptPreview } from '../components/ventas/ReceiptPreview';
import { useData } from '../contexts/DataContext';
import './Ventas.css';

export function Ventas() {
  const { currentUser } = useAuth();
  const { 
    inventory: productsListRaw, 
    contacts, 
    banks: bankAccounts, 
    deals, 
    isLoading: loading 
  } = useData();

  const productsList = productsListRaw.filter(p => p.isActive !== false);
  const clientsList = contacts.filter(doc => doc.type === 'Cliente' || !doc.type);
  const resellersList = contacts.filter(doc => doc.type === 'Revendedor');

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newClientData, setNewClientData] = useState({
    name: '', contact: '', email: '', phone: '', documentId: '', address: '', city: '', notes: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);
  
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [companyData, setCompanyData] = useState({ name: 'Gestionate Fácil', logoUrl: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptRef = useRef(null);
  
  // New Advanced Deal/Invoice Form
  const initialFormState = {
    name: '', // used for the Kanban board general title
    clienteId: '',
    clienteName: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaVtoCobro: new Date().toISOString().split('T')[0],
    tipoFactura: 'Factura C',
    nroFactura: '',
    status: 'prospectos',
    date: new Date().toISOString().split('T')[0],
    items: [],
    notas: '',
    observaciones: '',
    descuentoGeneral: 0,
    percepciones: 0,
    impuestosInternos: 0,
    intereses: 0,
    value: 0,
    montoCobrado: 0,
    deuda: 0,
    comprobanteUrl: '',
    bankAccountId: '',
    resellerId: '',
    resellerName: '',
    resellerCommissionPct: 0
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

    const deuda = Math.max(0, finalTotal - (parseFloat(data.montoCobrado) || 0));

    return { ...data, value: finalTotal, deuda };
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items, 
        { id: Date.now().toString(), productId: '', descripcion: '', cantidad: 1, precio: 0, descuento: 0, iva: '0', subtotal: 0, total: 0 }
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
              updated.precio = parseFloat(prod.sellingPrice?.toString().replace(/[^0-9.-]+/g,"")) || 0;
              updated.costPrice = parseFloat(prod.costPrice?.toString().replace(/[^0-9.-]+/g,"")) || 0;
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
    if (!currentUser) return;

    const fetchCompanyData = async () => {
      const docRef = doc(db, 'companies', currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCompanyData(docSnap.data());
      }
    };
    fetchCompanyData();
  }, [currentUser]);

  const handleSaveNewClient = async () => {
    if(!newClientData.name.trim()) return;
    try {
      const newClientRef = await addDoc(collection(db, 'clients'), {
        name: newClientData.name,
        contact: newClientData.contact || '',
        email: newClientData.email || '',
        phone: newClientData.phone || '',
        documentId: newClientData.documentId || '',
        address: newClientData.address || '',
        city: newClientData.city || '',
        notes: newClientData.notes || '',
        status: 'Activo',
        type: 'Cliente',
        deuda: 0,
        userId: currentUser.uid,
        spent: '$0',
        createdAt: serverTimestamp()
      });
      setFormData(prev => calculateTotals({ ...prev, clienteId: newClientRef.id, clienteName: newClientData.name }));
      setIsAddingClient(false);
      setNewClientData({ name: '', contact: '', email: '', phone: '', documentId: '', address: '', city: '', notes: ''});
      toast.success("Gestionate Fácil: Cliente agregado a la base de datos");
    } catch (e) {
      toast.error("Gestionate Fácil: Error al guardar cliente");
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

  const handleUpdateContactCommission = async (contactId, deltaAmount) => {
    if (!contactId || deltaAmount === 0) return;
    try {
      const contactRef = doc(db, 'clients', contactId);
      const cSnap = await getDoc(contactRef);
      if (cSnap.exists()) {
        const currentComm = parseFloat(cSnap.data().totalCommissions) || 0;
        await updateDoc(contactRef, { totalCommissions: currentComm + deltaAmount });
      }
    } catch (e) {
      console.error("Error updating contact commission:", e);
    }
  };

  const handleSaveNewBank = async () => {
    if(!newBankName.trim()) return;
    try {
      const newBankRef = await addDoc(collection(db, 'bankAccounts'), {
        userId: currentUser.uid,
        name: newBankName,
        details: '',
        type: 'Banco',
        balance: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setFormData(prev => calculateTotals({ ...prev, bankAccountId: newBankRef.id }));
      setIsAddingBank(false);
      setNewBankName('');
      toast.success("Gestionate Fácil: Cuenta creada");
    } catch (e) {
      toast.error("Gestionate Fácil: Error al crear cuenta");
    }
  };

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

  const handleSaveWithStatus = async (status, e) => {
    e.preventDefault();
    if(isSaving) return;

    // VALIDACIONES ESTRICTAS
    if (!formData.clienteId) {
      toast.error("Gestionate Fácil: Debe seleccionar un cliente para la venta.");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Gestionate Fácil: Debe agregar al menos un producto a la venta.");
      return;
    }

    if (!formData.bankAccountId) {
      toast.error("Gestionate Fácil: Debe seleccionar una cuenta bancaria/caja para registrar la operación.");
      return;
    }

    setIsSaving(true);
    try {
      let finalComprobanteUrl = formData.comprobanteUrl || '';
      
      if (comprobanteFile) {
        const toastId = toast.loading('Gestionate Fácil: Subiendo comprobante...');
        const storageRef = ref(storage, `comprobantes/${currentUser.uid}/${Date.now()}_${comprobanteFile.name}`);
        const snapshot = await uploadBytes(storageRef, comprobanteFile);
        finalComprobanteUrl = await getDownloadURL(snapshot.ref);
        toast.dismiss(toastId);
      }

      const currentData = { ...formData, status, comprobanteUrl: finalComprobanteUrl };
      const finalData = calculateTotals(currentData);
      
      const commPct = parseFloat(finalData.resellerCommissionPct) || 0;
      const commissionAmt = finalData.value * (commPct / 100);

      const dealData = {
        ...finalData,
        name: finalData.clienteName || 'Venta sin cliente',
        date: finalData.fechaEmision,
        probability: status === 'ganados' ? '100%' : status === 'negociacion' ? '70%' : '30%',
        resellerCommissionAmt: commissionAmt
      };

      if (isEditMode && selectedDeal) {
        const oldDeuda = parseFloat(selectedDeal.deuda) || 0;
        const newDeuda = parseFloat(dealData.deuda) || 0;
        const deudaDelta = newDeuda - oldDeuda;

        await updateDoc(doc(db, 'deals', selectedDeal.id), {
          ...dealData,
          updatedAt: serverTimestamp()
        });

        // Spent Sync
        const oldValue = parseFloat(selectedDeal.value) || 0;
        const newValue = parseFloat(dealData.value) || 0;
        const valueDelta = newValue - oldValue;

        if (valueDelta !== 0) {
          if (dealData.clienteId) await handleUpdateContactSpent(dealData.clienteId, valueDelta);
          if (dealData.resellerId) await handleUpdateContactSpent(dealData.resellerId, valueDelta);
        }

        // Commission Sync
        const oldComm = parseFloat(selectedDeal.resellerCommissionAmt) || 0;
        const newComm = parseFloat(dealData.resellerCommissionAmt) || 0;
        const commDelta = newComm - oldComm;
        if (commDelta !== 0 && dealData.resellerId) {
          await handleUpdateContactCommission(dealData.resellerId, commDelta);
        }

        // Sync debt delta to client if applicable
        if (dealData.clienteId && deudaDelta !== 0) {
           const clientRef = doc(db, 'clients', dealData.clienteId);
           try {
             const cSnap = await getDoc(clientRef);
             if (cSnap.exists()) {
               const currDeuda = parseFloat(cSnap.data().deuda) || 0;
               await updateDoc(clientRef, { deuda: currDeuda + deudaDelta });
             }
           } catch (e) {
             console.error("Error updating client debt:", e);
           }
        }
        
        // Bank Account Sync (Option B: Auto-revert)
        const oldBankAccountId = selectedDeal.bankAccountId;
        const newBankAccountId = dealData.bankAccountId;
        const oldMontoCobrado = parseFloat(selectedDeal.montoCobrado) || 0;
        const newMontoCobrado = parseFloat(dealData.montoCobrado) || 0;

        if (oldBankAccountId === newBankAccountId && newBankAccountId) {
            const montoDelta = newMontoCobrado - oldMontoCobrado;
            if (montoDelta !== 0) {
               const bankRef = doc(db, 'bankAccounts', newBankAccountId);
               try {
                 const bSnap = await getDoc(bankRef);
                 if (bSnap.exists()) {
                   await updateDoc(bankRef, { balance: parseFloat(bSnap.data().balance || 0) + montoDelta });
                 }
               } catch(e) {}
            }
        } else {
           if (oldBankAccountId && oldMontoCobrado > 0) {
               const oldBankRef = doc(db, 'bankAccounts', oldBankAccountId);
                try {
                  const bSnap = await getDoc(oldBankRef);
                  if (bSnap.exists()) {
                    await updateDoc(oldBankRef, { balance: parseFloat(bSnap.data().balance || 0) - oldMontoCobrado });
                  }
                } catch(e) {}
           }
           if (newBankAccountId && newMontoCobrado > 0) {
               const newBankRef = doc(db, 'bankAccounts', newBankAccountId);
               try {
                 const bSnap = await getDoc(newBankRef);
                 if (bSnap.exists()) {
                   await updateDoc(newBankRef, { balance: parseFloat(bSnap.data().balance || 0) + newMontoCobrado });
                 }
               } catch(e) {}
           }
        }
      } else {
        await addDoc(collection(db, 'deals'), {
          ...dealData,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
        
        // Sync Spent to Client and Reseller
        if (dealData.clienteId) await handleUpdateContactSpent(dealData.clienteId, dealData.value);
        if (dealData.resellerId) {
           await handleUpdateContactSpent(dealData.resellerId, dealData.value);
           if (dealData.resellerCommissionAmt > 0) {
              await handleUpdateContactCommission(dealData.resellerId, dealData.resellerCommissionAmt);
           }
        }

        // Descontar stock (Batch update to prevent multiple snapshots)
        if (dealData.items && dealData.items.length > 0) {
          const stockUpdates = dealData.items
            .filter(it => it.productId)
            .map(it => {
              const prodRef = doc(db, 'products', it.productId);
              return updateDoc(prodRef, { stock: increment(-it.cantidad) });
            });
          await Promise.all(stockUpdates).catch(e => console.error("Error batch updating stock:", e));
        }
        
        // Cargar Deuda al Cliente si aplica
        if (dealData.clienteId && dealData.deuda > 0) {
           const clientRef = doc(db, 'clients', dealData.clienteId);
           try {
             const cSnap = await getDoc(clientRef);
             if (cSnap.exists()) {
               const currDeuda = parseFloat(cSnap.data().deuda) || 0;
               await updateDoc(clientRef, { deuda: currDeuda + dealData.deuda });
             }
           } catch (e) {
             console.error("Error setting initial client debt:", e);
           }
        }
        
        // Sumar Saldo a la Cuenta Bancaria
        if (dealData.bankAccountId && parseFloat(dealData.montoCobrado) > 0) {
           const bankRef = doc(db, 'bankAccounts', dealData.bankAccountId);
           try {
             const bSnap = await getDoc(bankRef);
             if (bSnap.exists()) {
               await updateDoc(bankRef, { balance: parseFloat(bSnap.data().balance || 0) + parseFloat(dealData.montoCobrado) });
             }
           } catch(e) {}
        }
      }
      
      // Trigger Automatic Receipt for WON sales
      if (status === 'ganados') {
        setReceiptData(dealData);
        setShowReceipt(true);
        
        // Add persistent notification
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: currentUser.uid,
            title: '¡Venta Realizada!',
            message: `Se registró una venta por ${formatCurrency(dealData.value)} para ${dealData.clienteName}.`,
            type: 'sale_success',
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Error creating notification:", err);
        }
      }

      toast.success(isEditMode ? "Gestionate Fácil: Venta actualizada correctamente" : "Gestionate Fácil: Venta guardada exitosamente");
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Gestionate Fácil: Error al guardar la venta");
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
      const dealToDel = deals.find(d => d.id === itemToDelete);
      if (dealToDel) {
        if (dealToDel.items) {
          for (const it of dealToDel.items) {
            if (it.productId) {
              const prodRef = doc(db, 'products', it.productId);
              await updateDoc(prodRef, { stock: increment(it.cantidad) }).catch(err => console.error("Error updating stock:", err));
            }
          }
        }
        if (dealToDel.clienteId && dealToDel.deuda > 0) {
            const clientRef = doc(db, 'clients', dealToDel.clienteId);
            try {
              const cSnap = await getDoc(clientRef);
              if (cSnap.exists()) {
                const currDeuda = parseFloat(cSnap.data().deuda) || 0;
                await updateDoc(clientRef, { deuda: Math.max(0, currDeuda - dealToDel.deuda) });
              }
            } catch (e) {
              console.error("Error reverting client debt:", e);
            }
        }
        if (dealToDel.bankAccountId && parseFloat(dealToDel.montoCobrado) > 0) {
            try {
                const bankRef = doc(db, 'bankAccounts', dealToDel.bankAccountId);
                const bSnap = await getDoc(bankRef);
                if (bSnap.exists()) {
                   await updateDoc(bankRef, { balance: parseFloat(bSnap.data().balance || 0) - parseFloat(dealToDel.montoCobrado) });
                }
            } catch(e) {}
        }
      }
      // Revert Spent on Delete
      const valToRevert = parseFloat(dealToDel.value) || 0;
      if (dealToDel.clienteId) await handleUpdateContactSpent(dealToDel.clienteId, -valToRevert);
      if (dealToDel.resellerId) {
        await handleUpdateContactSpent(dealToDel.resellerId, -valToRevert);
        const commToRevert = parseFloat(dealToDel.resellerCommissionAmt) || 0;
        if (commToRevert > 0) await handleUpdateContactCommission(dealToDel.resellerId, -commToRevert);
      }

      await deleteDoc(doc(db, 'deals', itemToDelete));
      toast.success("Gestionate Fácil: Venta eliminada y stock recuperado");
      setIsConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting deal:", error);
      toast.error("Gestionate Fácil: Error al eliminar venta");
    }
  };

  const openEditModal = (deal) => {
    setSelectedDeal(deal);
    setFormData({
      ...initialFormState,
      ...deal
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
    setSelectedDeal(null);
    setComprobanteFile(null);
  };

  const updateDealStatus = async (dealId, newStatus) => {
    try {
      const dealRef = doc(db, 'deals', dealId);
      await updateDoc(dealRef, { 
        status: newStatus,
        probability: newStatus === 'ganados' ? '100%' : '50%'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewDirectly = (deal) => {
    setReceiptData(deal);
    setShowReceipt(true);
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || isDownloading) return;
    setIsDownloading(true);
    const toastId = toast.loading('Gestionate Fácil: Generando Comprobante PDF...');
    
    try {
      const element = receiptRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Comprobante_${receiptData?.nroFactura || receiptData?.id?.substring(0,8).toUpperCase()}.pdf`);
      toast.success('Gestionate Fácil: Comprobante descargado con éxito', { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gestionate Fácil: Error al generar el PDF', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const pipeline = useMemo(() => ({
    prospectos: deals.filter(d => d.status === 'prospectos'),
    negociacion: deals.filter(d => d.status === 'negociacion'),
    ganados: deals.filter(d => d.status === 'ganados')
  }), [deals]);

  const stats = useMemo(() => ({
    pipeline: deals.reduce((acc, d) => acc + (d.status !== 'ganados' ? d.value : 0), 0),
    ganados: deals.reduce((acc, d) => acc + (d.status === 'ganados' ? d.value : 0), 0),
    conversion: deals.length > 0 ? Math.round((deals.filter(d => d.status === 'ganados').length / deals.length) * 100) : 0
  }), [deals]);

  const sortedDeals = useMemo(() => {
    return [...deals].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [deals]);

  return (
    <div className="ventas-container animate-fade-in">
      <header className="ventas-header">
        <div>
          <h1 className="page-title">Gestión de Ventas</h1>
          <p className="page-subtitle">Sigue tu ciclo de ventas y proyecta tus ingresos futuros.</p>
        </div>
        <button className="btn-primary flex-center gap-2" onClick={openAddModal}>
          <Plus size={18} />
          <span>Nueva Venta</span>
        </button>
      </header>

      <VentasStats deals={deals} loading={loading} />

      <div className="glass-panel main-crm-panel">
        <VentasTable 
          deals={sortedDeals}
          loading={loading}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          menuRef={menuRef}
          handleViewDirectly={handleViewDirectly}
          openEditModal={openEditModal}
          handleDeleteClick={handleDeleteClick}
        />
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={handleConfirmDelete}
        title="Anular Venta"
        message="¿Estás seguro de que deseas anular esta venta? El stock se devolverá automáticamente al inventario y se ajustarán los saldos del cliente."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "Editar Venta" : "Nueva Venta / Facturación"}
        className="large-modal"
      >
        <VentaForm 
          formData={formData}
          setFormData={setFormData}
          isEditMode={isEditMode}
          isSaving={isSaving}
          isAddingClient={isAddingClient}
          setIsAddingClient={setIsAddingClient}
          newClientData={newClientData}
          setNewClientData={setNewClientData}
          handleSaveNewClient={handleSaveNewClient}
          clientsList={clientsList}
          resellersList={resellersList}
          productsList={productsList}
          bankAccounts={bankAccounts}
          isAddingBank={isAddingBank}
          setIsAddingBank={setIsAddingBank}
          newBankName={newBankName}
          setNewBankName={setNewBankName}
          handleSaveNewBank={handleSaveNewBank}
          handleGlobalChange={handleGlobalChange}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          handleSaveWithStatus={handleSaveWithStatus}
          setComprobanteFile={setComprobanteFile}
          comprobanteFile={comprobanteFile}
          setIsModalOpen={setIsModalOpen}
        />
      </Modal>

      <ReceiptPreview 
        showReceipt={showReceipt}
        setShowReceipt={setShowReceipt}
        receiptRef={receiptRef}
        receiptData={receiptData}
        companyData={companyData}
        handleDownloadPDF={handleDownloadPDF}
        isDownloading={isDownloading}
      />
    </div>
  );
}
