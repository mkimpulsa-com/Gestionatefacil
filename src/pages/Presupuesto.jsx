import { useState, useEffect, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Plus, Filter, Target, Loader2, Calendar, MoreVertical, Edit2, Trash2, Paperclip, Send, CheckCircle, XCircle, ShoppingCart, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, storage } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, increment, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ProductSelector } from '../components/ui/ProductSelector';
import './Presupuesto.css';

export function Presupuesto() {
  const { currentUser } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '', contact: '', email: '', phone: '', documentId: '', address: '', city: '', notes: ''
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [isConvertConfirmOpen, setIsConvertConfirmOpen] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState(null);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const menuRef = useRef(null);
  
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [companyData, setCompanyData] = useState({ name: 'Gestionate Fácil', logoUrl: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptRef = useRef(null);
  
  const initialFormState = {
    name: '', 
    clienteId: '',
    clienteName: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaValidez: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 días default
    status: 'Borrador', // Borrador, Enviado, Aprobado, Rechazado, Convertido
    items: [],
    notas: 'Presupuesto válido por 15 días.',
    observaciones: '',
    descuentoGeneral: 0,
    percepciones: 0,
    impuestosInternos: 0,
    intereses: 0,
    value: 0,
    comprobanteUrl: ''
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

    return { ...data, value: finalTotal };
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

    const qQuotes = query(collection(db, 'quotes'), where('userId', '==', currentUser.uid));
    const unsubQuotes = onSnapshot(qQuotes, (snapshot) => {
      const quotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuotes(quotesData);
      setLoading(false);
    });

    const qClients = query(collection(db, 'clients'), where('userId', '==', currentUser.uid));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(doc => doc.type === 'Cliente' || !doc.type);
      setClientsList(clientsData);
    });

    const qProducts = query(collection(db, 'products'), where('userId', '==', currentUser.uid));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProductsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.isActive !== false));
    });
    
    // Alistamos cuentas bancarias por si al "Cotizar a Venta" pedimos esto en un futuro o lo dejamos vacío inicial.
    const qAccounts = query(collection(db, 'bankAccounts'), where('userId', '==', currentUser.uid));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      setBankAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubQuotes();
      unsubClients();
      unsubProducts();
      unsubAccounts();
    };
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleSaveQuote = async (e) => {
    e.preventDefault();
    if(isSaving) return;
    setIsSaving(true);
    
    try {
      let finalComprobanteUrl = formData.comprobanteUrl || '';
      
      if (comprobanteFile) {
        const toastId = toast.loading('Gestionate Fácil: Subiendo adjunto...');
        const storageRef = ref(storage, `quotes/${currentUser.uid}/${Date.now()}_${comprobanteFile.name}`);
        const snapshot = await uploadBytes(storageRef, comprobanteFile);
        finalComprobanteUrl = await getDownloadURL(snapshot.ref);
        toast.dismiss(toastId);
      }

      const finalData = calculateTotals({ ...formData, comprobanteUrl: finalComprobanteUrl });
      const quoteData = {
        ...finalData,
        name: finalData.clienteName || 'Presupuesto sin cliente',
      };

      if (isEditMode && selectedQuote) {
        await updateDoc(doc(db, 'quotes', selectedQuote.id), {
          ...quoteData,
          updatedAt: serverTimestamp()
        });
        toast.success("Gestionate Fácil: Presupuesto actualizado correctamente");
      } else {
        await addDoc(collection(db, 'quotes'), {
          ...quoteData,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
        toast.success("Gestionate Fácil: Presupuesto creado exitosamente");
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Gestionate Fácil: Error al guardar presupuesto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (quoteId, newStatus) => {
    try {
      await updateDoc(doc(db, 'quotes', quoteId), { status: newStatus, updatedAt: serverTimestamp() });
      toast.success(`Gestionate Fácil: Presupuesto marcado como ${newStatus}`);
    } catch (e) {
      toast.error("Gestionate Fácil: Error actualizando estado");
    }
  };

  const promptConvertToSale = (quote) => {
    setQuoteToConvert(quote);
    setIsConvertConfirmOpen(true);
    setActiveMenuId(null);
  };

  const handleConvertToSale = async () => {
    if (!quoteToConvert || isSaving) return;
    setIsSaving(true);
    try {
      // 1. Create a deal from the quote data
      const dealData = {
        name: quoteToConvert.clienteName || 'Venta desde presupuesto',
        clienteId: quoteToConvert.clienteId || '',
        clienteName: quoteToConvert.clienteName || '',
        fechaEmision: new Date().toISOString().split('T')[0],
        fechaVtoCobro: new Date().toISOString().split('T')[0],
        tipoFactura: 'Factura C',
        nroFactura: '',
        status: 'ganados', // already won since client accepted quote
        date: new Date().toISOString().split('T')[0],
        probability: '100%',
        items: quoteToConvert.items || [],
        notas: quoteToConvert.notas || '',
        observaciones: quoteToConvert.observaciones || '',
        descuentoGeneral: quoteToConvert.descuentoGeneral || 0,
        percepciones: quoteToConvert.percepciones || 0,
        impuestosInternos: quoteToConvert.impuestosInternos || 0,
        intereses: quoteToConvert.intereses || 0,
        value: quoteToConvert.value || 0,
        montoCobrado: 0, // Inicia con todo como deuda hasta que lo cobren
        deuda: quoteToConvert.value || 0,
        comprobanteUrl: quoteToConvert.comprobanteUrl || '',
        bankAccountId: '', // No cobrado aún
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'deals'), dealData);

      // 2. Descontar stock general porque ahora es una Venta oficial (Batch update)
      if (dealData.items && dealData.items.length > 0) {
        const stockUpdates = dealData.items
          .filter(it => it.productId)
          .map(it => {
            const prodRef = doc(db, 'products', it.productId);
            return updateDoc(prodRef, { stock: increment(-it.cantidad) });
          });
        await Promise.all(stockUpdates).catch(e => console.error("Error updating stock in conversion:", e));
      }

      // 3. Aumentar Deuda del Cliente (la venta se transformó, el cliente ahora nos debe esto)
      if (dealData.clienteId && dealData.deuda > 0) {
          const clientRef = doc(db, 'clients', dealData.clienteId);
          try {
            const cSnap = await getDoc(clientRef);
            if (cSnap.exists()) {
              const currDeuda = parseFloat(cSnap.data().deuda) || 0;
              await updateDoc(clientRef, { deuda: currDeuda + dealData.deuda });
            }
          } catch (e) {
             // Ignorar en catch por brevity
          }
      }

      // 4. Update the quote status to Convertido
      await updateDoc(doc(db, 'quotes', quoteToConvert.id), { status: 'Convertido', updatedAt: serverTimestamp() });

      toast.success("Gestionate Fácil: ¡Presupuesto transformado a Venta exitosamente!");
      setIsConvertConfirmOpen(false);
      setQuoteToConvert(null);
    } catch (err) {
      console.error(err);
      toast.error("Gestionate Fácil: Error al convertir presupuesto");
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
      await deleteDoc(doc(db, 'quotes', itemToDelete));
      toast.success("Gestionate Fácil: Presupuesto eliminado");
      setIsConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error("Gestionate Fácil: Error al eliminar");
    }
  };

  const openEditModal = (quote) => {
    setSelectedQuote(quote);
    setFormData({ ...initialFormState, ...quote });
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
    setSelectedQuote(null);
    setComprobanteFile(null);
  };

  const handleViewDirectly = (quote) => {
    setReceiptData(quote);
    setShowReceipt(true);
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || isDownloading) return;
    setIsDownloading(true);
    const toastId = toast.loading('Gestionate Fácil: Generando PDF profesional...');
    
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
      pdf.save(`Presupuesto_${receiptData?.id?.substring(0,8).toUpperCase() || 'PRO'}.pdf`);
      toast.success('Gestionate Fácil: PDF descargado con éxito', { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gestionate Fácil: Error al generar el PDF', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const stats = useMemo(() => ({
    totalCotizado: quotes.reduce((acc, q) => acc + (q.status !== 'Rechazado' ? q.value : 0), 0),
    aprobadosYconvertidos: quotes.filter(q => q.status === 'Aprobado' || q.status === 'Convertido').length,
    tasa: quotes.length > 0 ? Math.round((quotes.filter(q => q.status === 'Convertido').length / quotes.length) * 100) : 0
  }), [quotes]);
  
  const sortedQuotes = useMemo(() => {
    return [...quotes].sort((a,b) => new Date(b.fechaEmision) - new Date(a.fechaEmision));
  }, [quotes]);

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Borrador': return <span className="quote-status draft">Borrador</span>;
      case 'Enviado': return <span className="quote-status sent">Enviado</span>;
      case 'Aprobado': return <span className="quote-status approved">Aprobado</span>;
      case 'Rechazado': return <span className="quote-status rejected">Rechazado</span>;
      case 'Convertido': return <span className="quote-status converted">Ganado/Convertido</span>;
      default: return <span className="quote-status draft">{status}</span>;
    }
  };

  return (
    <div className="presupuesto-container animate-fade-in">
      <header className="ventas-header">
        <div>
          <h1 className="page-title">Gestión de Presupuestos</h1>
          <p className="page-subtitle">Crea estimaciones y cotizaciones para tus clientes sin afectar stock.</p>
        </div>
        <button className="btn-primary flex-center gap-2" onClick={openAddModal}>
          <Plus size={18} />
          <span>Nuevo Presupuesto</span>
        </button>
      </header>

      <div className="ventas-stats">
        <div className="glass-card stat-card">
          <div className="stat-title">Total Activo Cotizado</div>
          <div className="stat-value text-gradient">{formatCurrency(stats.totalCotizado)}</div>
          <div className="stat-meta">Cotizaciones que podrían cerrarse</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-title">Presupuestos Aprobados</div>
          <div className="stat-value success">{stats.aprobadosYconvertidos}</div>
          <div className="stat-meta">Esperando conversión o ya cerrados</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-title">Tasa de Conversión a Venta</div>
          <div className="stat-value">{stats.tasa}%</div>
          <div className="stat-meta">Cotizaciones generadas vs ventas cerradas</div>
        </div>
      </div>

      <div className="glass-panel main-crm-panel">
        <div className="table-responsive">
          <table className="crm-table quote-table">
            <thead>
              <tr>
                <th>Emisión / Validez</th>
                <th>Cliente</th>
                <th>Total Presupuestado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No hay cotizaciones registradas.</td></tr>
              ) : (
                sortedQuotes.map(quote => (
                  <tr key={quote.id}>
                    <td data-label="Emisión / Validez">
                      <div className="contact-cell">
                        <span className="contact-name">{quote.fechaEmision}</span>
                        <span className="contact-meta" style={{fontSize: '0.8rem'}}>Vence: {quote.fechaValidez}</span>
                      </div>
                    </td>
                    <td data-label="Cliente">
                      <span className="company-name">{quote.name}</span>
                    </td>
                    <td data-label="Total"><span style={{fontWeight: 600, fontSize: '1.05rem'}}>{formatCurrency(quote.value)}</span></td>
                    <td data-label="Estado">{renderStatusBadge(quote.status)}</td>
                    <td data-label="Acciones">
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleViewDirectly(quote)}
                          title="Ver Presupuesto Profesional"
                          style={{color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)'}}
                        >
                          <FileText size={16} />
                        </button>
                        <div className="action-dropdown-container" ref={activeMenuId === quote.id ? menuRef : null}>
                        <button className="btn-icon" onClick={() => setActiveMenuId(activeMenuId === quote.id ? null : quote.id)}>
                          <MoreVertical size={18} />
                        </button>
                        {activeMenuId === quote.id && (
                          <div className="dropdown-menu">
                            {quote.status !== 'Convertido' && (
                              <button className="dropdown-item" onClick={() => promptConvertToSale(quote)} style={{ color: 'var(--success)' }}>
                                <ShoppingCart size={14} />
                                <span>Convertir a Venta Oficial</span>
                              </button>
                            )}
                            {quote.status === 'Borrador' && (
                              <button className="dropdown-item" onClick={() => handleUpdateStatus(quote.id, 'Enviado')}>
                                <Send size={14} /> <span>Marcar como Enviado</span>
                              </button>
                            )}
                            {quote.status === 'Enviado' && (
                              <>
                                <button className="dropdown-item" onClick={() => handleUpdateStatus(quote.id, 'Aprobado')}>
                                  <CheckCircle size={14} /> <span>Marcar Aprobado</span>
                                </button>
                                <button className="dropdown-item" onClick={() => handleUpdateStatus(quote.id, 'Rechazado')}>
                                  <XCircle size={14} /> <span>Marcar Rechazado</span>
                                </button>
                              </>
                            )}
                            
                            <hr style={{margin: '0.5rem 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)'}} />
                            
                            <button className="dropdown-item" onClick={() => handleViewDirectly(quote)}>
                              <FileText size={14} />
                              <span>Ver PDF Profesional</span>
                            </button>

                            <button className="dropdown-item" onClick={() => openEditModal(quote)}>
                              <Edit2 size={14} />
                              <span>Editar Presupuesto</span>
                            </button>
                            {quote.comprobanteUrl && (
                              <button className="dropdown-item" onClick={() => window.open(quote.comprobanteUrl, '_blank')}>
                                <Paperclip size={14} />
                                <span>Ver Adjunto</span>
                              </button>
                            )}
                            <button className="dropdown-item delete" onClick={() => handleDeleteClick(quote.id)}>
                              <Trash2 size={14} />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </div>
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
        title="Eliminar Presupuesto"
        message="¿Estás seguro de que deseas eliminar esta cotización? No podrá restaurarse."
      />

      <ConfirmModal 
        isOpen={isConvertConfirmOpen} 
        onClose={() => setIsConvertConfirmOpen(false)} 
        onConfirm={handleConvertToSale}
        title="Convertir a Venta Oficial"
        message="¿Estás seguro? Al convertir, el inventario se descontará y el monto pasará a considerarse Deuda del Cliente en el CRM de ventas."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "Editar Presupuesto" : "Nuevo Presupuesto"}
        className="large-modal"
      >
        <form className="invoice-form" onSubmit={handleSaveQuote}>
          <div className="invoice-header-grid">
            <div className="form-group" style={{position: 'relative', gridColumn: isAddingClient ? '1 / -1' : 'auto'}}>
              {!isAddingClient && <label>Cliente a Cotizar</label>}
              {!isAddingClient ? (
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <select 
                    className="form-input" 
                    value={formData.clienteId} 
                    onChange={e => {
                       const idx = e.target.selectedIndex;
                       const cName = e.target.options[idx].text;
                       setFormData(prev => ({ ...prev, clienteId: e.target.value, clienteName: cName }));
                    }} 
                    required 
                    style={{flex: 1}}
                  >
                    <option value="" disabled>Seleccionar Cliente...</option>
                    {clientsList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-outline" style={{padding: '0 0.8rem'}} onClick={() => setIsAddingClient(true)} title="Añadir nuevo cliente rápido">
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <div style={{background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--primary-color, rgba(255,255,255,0.2))'}}>
                  <h4 style={{marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--text-main)'}}>Crear Nuevo Cliente Prospecto</h4>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label>Razón Social / Nombre *</label>
                      <input type="text" className="form-input" value={newClientData.name} onChange={e => setNewClientData({...newClientData, name: e.target.value})} autoFocus placeholder="Ej: Acero S.A." />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label>Email</label>
                      <input type="email" className="form-input" value={newClientData.email} onChange={e => setNewClientData({...newClientData, email: e.target.value})} placeholder="Opcional" />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label>Teléfono</label>
                      <input type="text" className="form-input" value={newClientData.phone} onChange={e => setNewClientData({...newClientData, phone: e.target.value})} placeholder="Opcional" />
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '0.8rem', marginTop: '1.5rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem'}}>
                    <button type="button" className="btn-outline" onClick={() => setIsAddingClient(false)}>Cancelar</button>
                    <button type="button" className="btn-primary" onClick={handleSaveNewClient} disabled={!newClientData.name.trim()}>Guardar y Seleccionar</button>
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Fecha de Emisión</label>
              <input type="date" className="form-input" value={formData.fechaEmision} onChange={e => handleGlobalChange('fechaEmision', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Válido Hasta</label>
              <input type="date" className="form-input" value={formData.fechaValidez} onChange={e => handleGlobalChange('fechaValidez', e.target.value)} required />
            </div>
          </div>

          <div className="invoice-items-section">
            <div className="flex-between" style={{marginBottom: '0.5rem'}}>
              <h4 style={{fontSize: '0.95rem', fontWeight: 500}}>Detalle de Ítems a Presupuestar</h4>
              <button type="button" className="btn-outline" onClick={addItem} style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}}>
                + Añadir Línea
              </button>
            </div>
            
            <table className="invoice-items-table">
              <thead>
                <tr>
                  <th style={{width: '35%'}}>Producto Serv.</th>
                  <th style={{width: '10%'}}>Cant.</th>
                  <th style={{width: '15%'}}>Precio Unit.</th>
                  <th style={{width: '10%'}}>Desc. %</th>
                  <th style={{width: '10%'}}>IVA</th>
                  <th style={{width: '15%'}}>Subtotal</th>
                  <th style={{width: '5%'}}></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>Inicia el presupuesto agregando líneas.</td>
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
                    <td><input type="number" min="1" step="1" value={item.cantidad} onChange={e => updateItem(item.id, 'cantidad', e.target.value)} required /></td>
                    <td>
                       <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                         <span style={{color:'var(--text-muted)'}}>$</span>
                         <input type="number" min="0" step="0.01" value={item.precio} onChange={e => updateItem(item.id, 'precio', e.target.value)} required />
                       </div>
                    </td>
                    <td><input type="number" min="0" max="100" step="0.1" value={item.descuento} onChange={e => updateItem(item.id, 'descuento', e.target.value)} /></td>
                    <td><input type="number" min="0" max="100" step="0.1" value={item.iva} onChange={e => updateItem(item.id, 'iva', e.target.value)} placeholder="0" /></td>
                    <td style={{fontWeight: 600, color: 'var(--success)'}}>{formatCurrency(item.total)}</td>
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
              <div className="form-group">
                <label>Notas de Presupuesto (Públicas)</label>
                <textarea className="form-input" style={{height: '100px', resize: 'none'}} value={formData.notas} onChange={e => handleGlobalChange('notas', e.target.value)} placeholder="Términos y condiciones, plazos de entrega que leerá el cliente..."></textarea>
              </div>
              <div className="form-group">
                <label>Boceto o Archivo Relacionado</label>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem'}}>
                  <input 
                    type="file" 
                    className="form-input" 
                    accept="image/*,.pdf" 
                    onChange={(e) => setComprobanteFile(e.target.files[0])}
                    style={{padding: '0.5rem'}}
                  />
                  {comprobanteFile && <span style={{fontSize: '0.8rem', color: 'var(--success)'}}>{comprobanteFile.name} pre-cargado</span>}
                  {formData.comprobanteUrl && !comprobanteFile && (
                    <a href={formData.comprobanteUrl} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <Paperclip size={14} /> Ver archivo adjunto
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="invoice-summary">
              <div className="summary-row">
                <span>Descuento Comercial (%)</span>
                <input type="number" className="form-input" min="0" max="100" step="0.1" value={formData.descuentoGeneral} onChange={e => handleGlobalChange('descuentoGeneral', e.target.value)} />
              </div>
              <div className="summary-row">
                <span>+ Cargos Envío/Extras ($)</span>
                <input type="number" className="form-input" min="0" step="0.01" value={formData.percepciones} onChange={e => handleGlobalChange('percepciones', e.target.value)} />
              </div>
              <div className="summary-row total">
                <span>TOTAL A COTIZAR</span>
                <span>{formatCurrency(formData.value)}</span>
              </div>
            </div>
          </div>
          
          <div className="modal-footer" style={{marginTop: '2rem'}}>
            <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSaving || formData.items.length === 0}>
              {isSaving ? "Guardando Presupuesto..." : isEditMode ? "Actualizar Cotización" : "Crear Presupuesto"}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Presupuesto Profesional A4 Modal --- */}
      <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} title="Presupuesto Profesional" className="wide-modal">
        <div className="receipt-container" id="printable-receipt">
          <div className="receipt-a4" ref={receiptRef}>
            {/* Cabecera Profesional */}
            <div className="receipt-banner-stripe"></div>
            
            <header className="receipt-header-modern">
              <div className="header-left">
                <div className="receipt-logo-pro">
                  {companyData.logoUrl ? (
                    <img src={companyData.logoUrl} alt="Logo" />
                  ) : (
                    <div className="logo-placeholder-pro">{companyData.name?.charAt(0)}</div>
                  )}
                </div>
                <div className="company-details-pro">
                  <h2 className="company-name-pro">{companyData.name || 'Gestionate Fácil'}</h2>
                  <div className="company-contact-pro">
                    <p>Cotización Comercial Especializada</p>
                    <p>Documento de Validez Temporal</p>
                  </div>
                </div>
              </div>

              <div className="header-right">
                <div className="receipt-type-box">
                  <span className="type-label">PRESUPUESTO</span>
                  <span className="type-letter">P</span>
                </div>
                <div className="receipt-meta-pro">
                  <div className="meta-row">
                    <span className="label">Presupuesto:</span>
                    <span className="value"># {receiptData?.id?.substring(0,8).toUpperCase() || 'PRO-0001'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Emisión:</span>
                    <span className="value">{receiptData?.fechaEmision}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Validez:</span>
                    <span className="value">{receiptData?.fechaValidez}</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Panel de Cliente */}
            <section className="receipt-client-panel">
              <div className="section-title-pro">DATOS DEL DESTINATARIO</div>
              <div className="client-grid-pro">
                <div className="client-col">
                  <div className="data-item">
                    <span className="label">Cliente / Solicitante:</span>
                    <span className="value highlight">{receiptData?.clienteName || 'Portador'}</span>
                  </div>
                  <div className="data-item">
                    <span className="label">Referencia:</span>
                    <span className="value">{receiptData?.name || '-'}</span>
                  </div>
                </div>
                <div className="client-col">
                  <div className="data-item">
                    <span className="label">Condición:</span>
                    <span className="value">Sujeto a Stock</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Tabla de Items */}
            <table className="receipt-table-pro">
              <thead>
                <tr>
                  <th className="t-left">Descripción / Ítem</th>
                  <th className="t-center">Cant.</th>
                  <th className="t-right">Precio Unit.</th>
                  <th className="t-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {receiptData?.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="t-left">
                      <div className="item-name">{item.descripcion}</div>
                    </td>
                    <td className="t-center">{item.cantidad}</td>
                    <td className="t-right">{formatCurrency(item.precio)}</td>
                    <td className="t-right semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer y Totales */}
            <div className="receipt-footer-pro">
              <div className="footer-left">
                <div className="notes-box-pro">
                  <span className="notes-label">TÉRMINOS Y CONDICIONES</span>
                  <p>{receiptData?.notas || 'Este presupuesto tiene una validez de 15 días. Precios sujetos a cambios sin previo aviso.'}</p>
                </div>
                <div className="legal-disclaimer-pro">
                   Documento informativo generado por Gestionate Fácil. El presente no constituye una factura definitiva hasta su confirmación y pago.
                </div>
              </div>

              <div className="footer-right">
                <div className="totals-container-pro">
                  <div className="total-row-pro">
                    <span>Subtotal Ítems:</span>
                    <span>{formatCurrency(receiptData?.items.reduce((acc, i) => acc + i.total, 0) || 0)}</span>
                  </div>
                  {receiptData?.descuentoGeneral > 0 && (
                    <div className="total-row-pro discount">
                      <span>Descuento Aplicado ({receiptData.descuentoGeneral}%):</span>
                      <span>-{formatCurrency(receiptData.items.reduce((acc, i) => acc + i.total, 0) * (receiptData.descuentoGeneral / 100))}</span>
                    </div>
                  )}
                  {receiptData?.percepciones > 0 && (
                    <div className="total-row-pro">
                      <span>Cargos Adicionales:</span>
                      <span>{formatCurrency(receiptData.percepciones)}</span>
                    </div>
                  )}
                  <div className="total-row-pro main-total">
                    <span className="total-label">TOTAL PRESUPUESTO</span>
                    <span className="total-amount">{formatCurrency(receiptData?.value || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="receipt-bottom-bar">
               {companyData.name?.toUpperCase() || 'GESTIONATE FÁCIL'} | SOLUCIONES PROFESIONALES PARA TU CRECIMIENTO
            </div>
          </div>
        </div>
        <div className="modal-actions no-print" style={{marginTop: '2rem'}}>
          <button className="btn-outline" onClick={() => setShowReceipt(false)}>Cerrar</button>
          <button className="btn-outline flex-center gap-2" onClick={() => window.print()}>
            <FileText size={18} />
            <span>Vista Previa Impresión</span>
          </button>
          <button className="btn-primary flex-center gap-2" onClick={handleDownloadPDF} disabled={isDownloading}>
            {isDownloading ? (
               <Loader2 size={18} className="animate-spin" />
            ) : (
               <FileText size={18} />
            )}
            <span>{isDownloading ? 'Generando...' : 'Descargar PDF Profesional'}</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
