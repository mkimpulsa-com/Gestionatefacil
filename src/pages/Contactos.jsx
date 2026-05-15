import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';

import { Search, Plus, Filter, MoreVertical, Building2, Mail, Phone, ArrowUpRight, Edit2, Trash2, Truck, Store, UserCheck, DollarSign, Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { uploadFile, deleteFile, generateUniquePath } from '../services/storageService';
import { SkeletonRow } from '../components/ui/Skeleton';
import './Contactos.css';


export function Contactos() {
  const { type } = useParams(); // 'clientes', 'proveedores', 'revendedores'
  const { currentUser } = useAuth();
  const [allDeals, setAllDeals] = useState([]);
  const location = useLocation();
  const [contacts, setContacts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewContact, setViewContact] = useState(null);
  const menuRef = useRef(null);
  
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtAction, setDebtAction] = useState('add'); // 'add', 'subtract', 'set'
  const [debtBankId, setDebtBankId] = useState('');
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Transform URL slug to display title and DB filter
  const typeMap = {
    clientes: { title: 'Clientes', icon: UserCheck, firestore: 'Cliente' },
    proveedores: { title: 'Proveedores', icon: Truck, firestore: 'Proveedor' },
    revendedores: { title: 'Revendedores', icon: Store, firestore: 'Revendedor' }
  };

  const currentType = typeMap[type] || typeMap.clientes;

  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    documentId: '',
    address: '',
    city: '',
    notes: '',
    birthday: '',
    deuda: 0,
    status: 'Activo',
    type: currentType.firestore // Default based on current section
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);


  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const q = query(
      collection(db, 'clients'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contactsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(doc => {
        // If we are in 'Clientes', show matches or those with no type (legacy)
        if (currentType.firestore === 'Cliente') {
          return doc.type === 'Cliente' || !doc.type;
        }
        // For others, must match exactly
        return doc.type === currentType.firestore;
      });
      setContacts(contactsData);
      setLoading(false);
    });
    
    const qAccounts = query(
      collection(db, 'bankAccounts'),
      where('userId', '==', currentUser.uid)
    );
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      setBankAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubDeals = onSnapshot(
      query(collection(db, 'deals'), where('userId', '==', currentUser.uid)),
      (snapshot) => {
        setAllDeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => {
      unsubscribe();
      unsubAccounts();
      unsubDeals();
    };
  }, [currentUser, type, currentType.firestore]);


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

  useEffect(() => {
    if (location.state?.searchName) {
      setSearchTerm(location.state.searchName);
    }
  }, [location.state]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let imageUrl = isEditMode && selectedContact ? selectedContact.imageUrl : null;
      let imagePath = isEditMode && selectedContact ? selectedContact.imagePath : null;

      if (imageFile) {
        if (imagePath) await deleteFile(imagePath);
        const path = generateUniquePath(currentUser.uid, 'contacts', imageFile.name);
        imageUrl = await uploadFile(imageFile, path);
        imagePath = path;
      }

      const contactData = {
        ...formData,
        imageUrl,
        imagePath,
        updatedAt: serverTimestamp()
      };

      if (isEditMode && selectedContact) {
        await updateDoc(doc(db, 'clients', selectedContact.id), contactData);
      } else {
        await addDoc(collection(db, 'clients'), {
          ...contactData,
          userId: currentUser.uid,
          spent: '$0',
          totalCommissions: 0,
          createdAt: serverTimestamp()
        });
      }
      
      toast.success(isEditMode ? "Gestionate Fácil: Contacto actualizado correctamente" : "Gestionate Fácil: Contacto guardado exitosamente");
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving contact: ", error);
      toast.error("Gestionate Fácil: Error al guardar contacto");
    } finally {
      setIsUploading(false);
      setIsSaving(false);
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
      setDebtBankId(newBankRef.id);
      setIsAddingBank(false);
      setNewBankName('');
      toast.success("Gestionate Fácil: Cuenta creada rápida");
    } catch (e) {
      toast.error("Gestionate Fácil: Error al crear cuenta rápida");
    }
  };

  const openDebtModal = (contact) => {
    setSelectedContact(contact);
    setDebtAmount('');
    setDebtAction('add');
    setDebtBankId('');
    setIsAddingBank(false);
    setIsDebtModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDebtSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(debtAmount) || 0;
    
    if (amount > 0 && !debtBankId) {
      toast.error("Gestionate Fácil: Debe seleccionar una cuenta para registrar el movimiento de dinero del ajuste.");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const amount = parseFloat(debtAmount) || 0;
      let oldDebt = parseFloat(selectedContact.deuda) || 0;
      let newDebt = oldDebt;
      
      if (debtAction === 'add') newDebt += amount;
      if (debtAction === 'subtract') newDebt = Math.max(0, newDebt - amount);
      if (debtAction === 'set') newDebt = Math.max(0, amount);
      
      const debtReduction = oldDebt - newDebt;
      
      await updateDoc(doc(db, 'clients', selectedContact.id), {
        deuda: newDebt,
        updatedAt: serverTimestamp()
      });
      
      // Update Bank Account if one was selected
      if (debtBankId) {
         if (debtReduction > 0) {
            // Debt reduced: money came into the bank
            try {
               const bankRef = doc(db, 'bankAccounts', debtBankId);
               const bSnap = await getDoc(bankRef);
               if (bSnap.exists()) {
                  await updateDoc(bankRef, { balance: parseFloat(bSnap.data().balance || 0) + debtReduction });
               }
            } catch(e) {}
         } else if (debtReduction < 0) {
            // Debt increased: money lent out of the bank
            try {
               const bankRef = doc(db, 'bankAccounts', debtBankId);
               const bSnap = await getDoc(bankRef);
               if (bSnap.exists()) {
                  const currentBal = parseFloat(bSnap.data().balance || 0);
                  const newBal = Math.max(0, currentBal - Math.abs(debtReduction));
                  await updateDoc(bankRef, { balance: newBal });
               }
            } catch(e) {}
         }
      }
      
      // If we reduced the global debt, cascade that reduction to unpaid tickets (oldest first)
      if (debtReduction > 0) {
         const qDeals = query(collection(db, 'deals'), where('clienteId', '==', selectedContact.id));
         const dealsSnap = await getDocs(qDeals);
         let dealsList = dealsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => (parseFloat(d.deuda) || 0) > 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
            
         let remainingToAllocate = debtReduction;

         for (const d of dealsList) {
            if (remainingToAllocate <= 0) break;
            
            const dealDeuda = parseFloat(d.deuda) || 0;
            const dealMontoCobrado = parseFloat(d.montoCobrado) || 0;
            
            const paymentForThisDeal = Math.min(dealDeuda, remainingToAllocate);
            
            await updateDoc(doc(db, 'deals', d.id), {
               deuda: dealDeuda - paymentForThisDeal,
               montoCobrado: dealMontoCobrado + paymentForThisDeal,
               updatedAt: serverTimestamp()
            });

            remainingToAllocate -= paymentForThisDeal;
         }
      }
      
      toast.success("Gestionate Fácil: Deuda balanceada y facturas actualizadas");
      setIsDebtModalOpen(false);
    } catch (error) {
       console.error(error);
       toast.error("Gestionate Fácil: Error al actualizar deuda");
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
      const contact = contacts.find(c => c.id === itemToDelete);
      if (contact && contact.imagePath) await deleteFile(contact.imagePath);
      await deleteDoc(doc(db, 'clients', itemToDelete));
      toast.success("Gestionate Fácil: Contacto eliminado");
      setIsConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting client: ", error);
      toast.error("Gestionate Fácil: Error al eliminar contacto");
    }
  };

  const openEditModal = (contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      contact: contact.contact || '',
      email: contact.email || '',
      phone: contact.phone || '',
      documentId: contact.documentId || '',
      address: contact.address || '',
      city: contact.city || '',
      notes: contact.notes || '',
      birthday: contact.birthday || '',
      deuda: contact.deuda || 0,
      status: contact.status || 'Activo',
      type: contact.type || currentType.firestore
    });
    setIsEditMode(true);
    setImagePreview(contact.imageUrl || null);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const openViewModal = (contact) => {
    setViewContact(contact);
    setIsViewModalOpen(true);
  };


  const openAddModal = () => {
    resetForm();
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleRecalculateTotals = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const toastId = toast.loading('Gestionate Fácil: Recalculando totales históricos de forma precisa...');

    try {
      // 1. Get all deals and purchases
      const dealsSnap = await getDocs(query(collection(db, 'deals'), where('userId', '==', currentUser.uid)));
      const purchasesSnap = await getDocs(query(collection(db, 'purchases'), where('userId', '==', currentUser.uid)));
      const contactsSnap = await getDocs(query(collection(db, 'clients'), where('userId', '==', currentUser.uid)));

      const contactTotals = {};
      
      // Initialize totals for ALL contacts
      contactsSnap.docs.forEach(d => {
        contactTotals[d.id] = { spent: 0, totalCommissions: 0 };
      });

      // Process Sales (Deals)
      dealsSnap.docs.forEach(d => {
        const data = d.data();
        const value = parseFloat(data.value) || 0;
        const comm = parseFloat(data.resellerCommissionAmt) || 0;

        if (data.clienteId && contactTotals[data.clienteId]) {
          contactTotals[data.clienteId].spent += value;
        }
        if (data.resellerId && contactTotals[data.resellerId]) {
          contactTotals[data.resellerId].spent += value;
          contactTotals[data.resellerId].totalCommissions += comm;
        }
      });

      // Process Purchases
      purchasesSnap.docs.forEach(d => {
        const data = d.data();
        const value = parseFloat(data.value) || 0;
        if (data.proveedorId && contactTotals[data.proveedorId]) {
          contactTotals[data.proveedorId].spent += value;
        }
      });

      // Update Firestore
      const updatePromises = Object.entries(contactTotals).map(([id, totals]) => {
        return updateDoc(doc(db, 'clients', id), {
          spent: totals.spent,
          totalCommissions: totals.totalCommissions
        });
      });

      await Promise.all(updatePromises);
      toast.success('Gestionate Fácil: ¡Historial corregido! Todos los totales coinciden ahora con tus ventas reales.', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Gestionate Fácil: Error al recalcular totales.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      contact: '', 
      email: '', 
      phone: '', 
      documentId: '',
      address: '',
      city: '',
      notes: '',
      birthday: '',
      deuda: 0,
      status: 'Activo',
      type: currentType.firestore 
    });
    setImagePreview(null);
  };


  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: contacts.length,
    activos: contacts.filter(c => c.status === 'Activo').length,
    deuda: formatCurrency(contacts.reduce((acc, c) => acc + (parseFloat(c.deuda) || 0), 0))
  };


  return (
    <div className="clientes-container animate-fade-in">
      <header className="clientes-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
           <div className="type-icon-wrapper" style={{background: 'var(--primary-glow)', padding: '1rem', borderRadius: 'var(--radius-lg)'}}>
              <currentType.icon size={28} className="text-gradient" />
           </div>
           <div>
              <h1 className="page-title">Gestión de {currentType.title}</h1>
              <p className="page-subtitle">Administra tu cartera de {currentType.title.toLowerCase()} e historial de contacto.</p>
           </div>
        </div>
         <div style={{display: 'flex', gap: '1rem'}}>
           <button 
             className="btn-outline flex-center gap-2" 
             onClick={handleRecalculateTotals} 
             disabled={isSyncing}
             style={{borderStyle: 'dashed', opacity: isSyncing ? 0.7 : 1}}
             title="Recalcular todos los totales analizando ventas históricas"
           >
             <ArrowUpRight size={18} style={{transform: isSyncing ? 'rotate(45deg)' : 'none', transition: 'transform 0.5s'}} />
             <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Totales'}</span>
           </button>
           <button className="btn-primary flex-center gap-2" onClick={openAddModal}>
             <Plus size={18} />
             <span>Añadir {currentType.title.slice(0, -1)}</span>
           </button>
         </div>
      </header>


      <div className="crm-stats">
        <div className="glass-card stat-card">
          <div className="stat-title">Total {currentType.title}</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-trend success"><ArrowUpRight size={16} /> En tiempo real</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-title">{currentType.title} Activos</div>

          <div className="stat-value">{stats.activos}</div>
          <div className="stat-trend success"><ArrowUpRight size={16} /> Clientes leales</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-title">Deuda Activa Pendiente</div>
          <div className="stat-value text-danger">{stats.deuda}</div>
          <div className="stat-trend" style={{color: 'var(--text-muted)'}}>Saldos a cobrar</div>
        </div>
      </div>

      <div className="glass-panel main-crm-panel">
        <div className="toolbar">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, empresa o email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-outline flex-center gap-2">
            <Filter size={18} />
            <span>Filtros</span>
          </button>
        </div>

        <div className="table-responsive">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Saldo Deudor</th>
                <th>Facturación Total</th>
                {type === 'revendedores' && <th>Comisión del Revendedor</th>}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><SkeletonRow columns={6} /></td></tr>
              ) : filteredContacts.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No se encontraron {currentType.title.toLowerCase()}. ¡Añade el primero!</td></tr>
              ) : (
                filteredContacts.map(contact => (
                  <tr key={contact.id} onClick={() => openViewModal(contact)} className="table-row-hover">

                    <td data-label="Nombre / Razón Social">
                      <div className="company-cell">
                        <div className="company-avatar">
                          {contact.imageUrl ? (
                            <img src={contact.imageUrl} alt={contact.name} className="contact-avatar-img" />
                          ) : (
                            <Building2 size={16} />
                          )}
                        </div>
                        <span className="company-name">{contact.name}</span>
                      </div>
                    </td>
                    <td data-label="Contacto">
                      <div className="contact-cell">
                        <span className="contact-name">{contact.contact}</span>
                        <div className="contact-meta">
                          <span className="meta-item"><Mail size={12}/> {contact.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Estado">
                      <span className={`status-badge status-${contact.status.toLowerCase()}`}>
                        {contact.status}
                      </span>
                    </td>
                    <td data-label="Deuda">
                      <div className="flex-center" style={{justifyContent: 'flex-start'}}>
                        {parseFloat(contact.deuda) > 0 ? (
                          <span style={{color: 'var(--danger)', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px'}}>
                            {formatCurrency(contact.deuda)}
                          </span>
                        ) : (
                          <span style={{color: 'var(--text-muted)'}}>$0.00</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Facturado">
                      <span className="spent-amount">{formatCurrency(contact.spent || 0)}</span>
                    </td>
                    {type === 'revendedores' && (
                      <td data-label="Comisiones">
                        <span style={{fontWeight: 600, color: 'var(--primary)'}}>
                          {formatCurrency(contact.totalCommissions || 0)}
                        </span>
                      </td>
                    )}

                    <td data-label="Acciones">
                      <div className="action-dropdown-container" ref={activeMenuId === contact.id ? menuRef : null}>
                        <button 
                          className="btn-icon" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === contact.id ? null : contact.id);
                          }}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {activeMenuId === contact.id && (
                          <div className="dropdown-menu">
                            <button className="dropdown-item" onClick={() => openEditModal(contact)}>
                              <Edit2 size={14} />
                              <span>Editar</span>
                            </button>
                            <button className="dropdown-item" onClick={() => openDebtModal(contact)}>
                              <DollarSign size={14} />
                              <span>Ajustar Deuda</span>
                            </button>
                            <button className="dropdown-item delete" onClick={() => handleDeleteClick(contact.id)}>
                              <Trash2 size={14} />
                              <span>Eliminar</span>
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
        title={`Eliminar ${currentType.title.slice(0, -1)}`}
        message={`¿Estás seguro de que deseas eliminar este ${currentType.title.slice(0, -1).toLowerCase()}? Esta acción no se puede deshacer y se borrarán todos sus datos vinculados.`}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? `Editar ${currentType.title.slice(0, -1)}` : `Añadir ${currentType.title.slice(0, -1)}`}
      >

        <form onSubmit={handleSubmit} className="add-client-form">
          <div className="form-group">
            <label>Foto de Perfil / Logo</label>
            <div className="image-upload-wrapper">
              <div className="image-preview-container">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" />
                    <button type="button" className="remove-image-btn" onClick={removeSelectedImage}><X size={14} /></button>
                  </>
                ) : <Camera size={32} style={{opacity: 0.2}} />}
              </div>
              <div className="file-input-custom">
                <div className="file-input-label">
                  <Camera size={16} />
                  <span>{imageFile ? 'Cambiar Foto' : 'Subir Foto'}</span>
                </div>
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Nombre / Razón Social</label>
            <input 
              type="text" 
              required 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="form-input"
              placeholder="Ej: Acero S.A."
            />
          </div>
          <div className="form-group">
            <label>Persona / Cargo de Contacto</label>
            <input 
              type="text" 
              required 
              value={formData.contact}
              onChange={e => setFormData({...formData, contact: e.target.value})}
              className="form-input"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                required 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="form-input"
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="form-input"
                placeholder="+54 9 11..."
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>RUT / DNI / CUIT</label>
              <input type="text" value={formData.documentId} onChange={e => setFormData({...formData, documentId: e.target.value})} className="form-input" placeholder="Ej: 20-30000000-1" />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="form-input" placeholder="Calle 123" />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Ciudad</label>
              <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="form-input" placeholder="Ej: Madrid" />
            </div>
            <div className="form-group">
              <label>Saldo Deudor Ajuste Manual ($)</label>
              <input type="number" step="0.01" value={formData.deuda} onChange={e => setFormData({...formData, deuda: parseFloat(e.target.value) || 0})} className="form-input" placeholder="0.00" style={formData.deuda > 0 ? {borderColor:'var(--danger)', color:'var(--danger)'}: {}} />
            </div>
          </div>
          
          <div className="form-group">
            <label>Notas Internas</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="form-input" style={{height:'60px', resize: 'none'}} placeholder="Observaciones adicionales sobre este contacto..."></textarea>
          </div>

          <div className="form-group">
            <label>Fecha de Cumpleaños</label>
            <input 
              type="date" 
              value={formData.birthday} 
              onChange={e => setFormData({...formData, birthday: e.target.value})} 
              className="form-input" 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Estado</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="form-input"
              >
                <option value="Activo">Activo</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de Contacto</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="form-input"
                disabled // Disabled if we want to force the type of the section, or enabled if we want to allow cross-creation
              >
                <option value="Cliente">Cliente</option>
                <option value="Proveedor">Proveedor</option>
                <option value="Revendedor">Revendedor</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isUploading}>
              {isUploading ? 'Guardando...' : (isEditMode ? `Actualizar ${currentType.title.slice(0, -1)}` : `Guardar ${currentType.title.slice(0, -1)}`)}
            </button>
          </div>

        </form>
      </Modal>

      <Modal 
        isOpen={isDebtModalOpen} 
        onClose={() => setIsDebtModalOpen(false)} 
        title={`Ajustar Deuda: ${selectedContact?.name || ''}`}
      >
        <form onSubmit={handleDebtSubmit} className="add-client-form">
          <div style={{background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
             <span style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Deuda Actual:</span>
             <span style={{fontWeight: 'bold', fontSize: '1.2rem', color: parseFloat(selectedContact?.deuda)>0 ? 'var(--danger)' : 'var(--success)'}}>
               {formatCurrency(selectedContact?.deuda || 0)}
             </span>
          </div>
          
          <div className="form-group">
             <label>Tipo de ajuste</label>
             <select className="form-input" value={debtAction} onChange={e => setDebtAction(e.target.value)}>
                <option value="add">Aumentar deuda (+)</option>
                <option value="subtract">Registrar pago / Reducir (-)</option>
                <option value="set">Fijar monto exacto (=)</option>
             </select>
          </div>
          
          <div className="form-group">
            <label>Monto a ajustar ($)</label>
            <input 
              type="number" 
              required 
              min="0"
              step="0.01"
              value={debtAmount}
              onChange={e => setDebtAmount(e.target.value)}
              className="form-input"
              placeholder="0.00"
              autoFocus
            />
          </div>
          
          <div className="form-group">
             <label>De (Egreso) / Hacia (Ingreso) - Cuenta</label>
             {!isAddingBank ? (
               <div style={{display: 'flex', gap: '0.4rem'}}>
                 <select className="form-input" style={{flex: 1}} value={debtBankId} onChange={e => setDebtBankId(e.target.value)} required>
                    <option value="" disabled>Seleccionar cuenta...</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                 </select>
                 <button type="button" className="btn-outline" style={{padding: '0 0.6rem'}} onClick={() => setIsAddingBank(true)} title="Añadir nueva caja"><Plus size={16} /></button>
               </div>
             ) : (
               <div style={{display: 'flex', gap: '0.4rem'}}>
                 <input type="text" className="form-input" style={{flex: 1}} placeholder="Nombre banco..." value={newBankName} onChange={e=>setNewBankName(e.target.value)} autoFocus />
                 <button type="button" className="btn-primary" style={{padding: '0 0.6rem'}} onClick={handleSaveNewBank}>OK</button>
                 <button type="button" className="btn-outline" style={{padding: '0 0.6rem'}} onClick={() => setIsAddingBank(false)}>X</button>
               </div>
             )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setIsDebtModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              Actualizar Saldo
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title={`Ficha de ${currentType.title.slice(0, -1)}`}
      >
        {viewContact && (
          <div className="product-view-modal">
            <div className="product-view-header">
              <div className="image-preview-container" style={{ width: '150px', height: '150px', margin: '0 auto 1.5rem' }}>
                {viewContact.imageUrl ? (
                  <img src={viewContact.imageUrl} alt={viewContact.name} className="contact-avatar-img" />
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.05)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justify_content: 'center' }}>
                    <currentType.icon size={64} style={{ opacity: 0.2 }} />
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{viewContact.name}</h2>
                <span className={`status-badge status-${viewContact.status.toLowerCase()}`}>
                  {viewContact.status}
                </span>
              </div>
            </div>

            <div className="product-view-grid" style={{ marginTop: '2rem' }}>
              <div className="view-card">
                <h5>Información de Contacto</h5>
                <div className="view-row"><span>Persona</span> <strong>{viewContact.contact || '-'}</strong></div>
                <div className="view-row"><span>Email</span> <strong>{viewContact.email || '-'}</strong></div>
                <div className="view-row"><span>Teléfono</span> <strong>{viewContact.phone || '-'}</strong></div>
                <div className="view-row"><span>Documento</span> <strong>{viewContact.documentId || '-'}</strong></div>
              </div>

              <div className="view-card">
                <h5>Ubicación y Totales</h5>
                <div className="view-row"><span>Dirección</span> <strong>{viewContact.address || '-'}</strong></div>
                <div className="view-row"><span>Ciudad</span> <strong>{viewContact.city || '-'}</strong></div>
                <div className="view-row"><span>Facturación Total</span> <strong style={{color: 'var(--text-main)'}}>{formatCurrency(viewContact.spent || 0)}</strong></div>
                {viewContact.type === 'Revendedor' && (
                   <div className="view-row"><span>Comisión Acumulada</span> <strong style={{color: 'var(--primary)'}}>{formatCurrency(viewContact.totalCommissions || 0)}</strong></div>
                )}
                <div className="view-row"><span>Saldo Deudor</span> <strong className={parseFloat(viewContact.deuda) > 0 ? 'text-danger' : 'text-success'}>{formatCurrency(viewContact.deuda || 0)}</strong></div>
                <div className="view-row"><span>Tipo</span> <strong>{viewContact.type || currentType.firestore}</strong></div>
              </div>

              <div className="view-card" style={{ gridColumn: '1 / -1' }}>
                <h5>Notas Internas</h5>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {viewContact.notes || 'Sin observaciones adicionales.'}
                </p>
              </div>

              {/* Historial de Productos Comprados (Purchase History) */}
              {viewContact.type === 'Cliente' && (
                <div className="view-card" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                  <h5>Historial de Productos Comprados</h5>
                  <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="crm-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Producto</th>
                          <th>Cant.</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allDeals
                          .filter(d => d.clienteId === viewContact.id && d.status === 'ganados')
                          .flatMap(d => (d.items || []).map(item => ({ ...item, date: d.date })))
                          .length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No hay compras registradas.</td></tr>
                          ) : (
                            allDeals
                              .filter(d => d.clienteId === viewContact.id && d.status === 'ganados')
                              .flatMap(d => (d.items || []).map(item => ({ ...item, date: d.date })))
                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                              .map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.date}</td>
                                  <td>{item.descripcion}</td>
                                  <td>{item.cantidad}</td>
                                  <td>{formatCurrency(item.total)}</td>
                                </tr>
                              ))
                          )
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
