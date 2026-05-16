import { useState, useEffect, useRef } from 'react';
import { User, Shield, CreditCard, Bell, Monitor, Store, Lock, Camera, X, Wallet, Landmark, Plus, ArrowRightLeft, MoreVertical, Edit2, Trash2, DollarSign, ArrowDownRight, ShoppingBag, Tag, Bookmark, Box, Package, AlertTriangle, AlertCircle, TrendingUp, BarChart2, Sparkles, Calendar, Zap, Activity, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../config/firebase';
import { doc, getDoc, getDocs, setDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { uploadFile, deleteFile, generateUniquePath } from '../services/storageService';
import { formatCurrency } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import './Settings.css';

export function Settings() {
  const { currentUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('perfil');

  // Company State
  const [companyName, setCompanyName] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [companyLogoPath, setCompanyLogoPath] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const profileFileInputRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  // Profile State
  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    email: '',
    photoUrl: '',
    role: 'Administrador'
  });
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isEditAccount, setIsEditAccount] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountFormData, setAccountFormData] = useState({ name: '', details: '', balance: 0, type: 'Banco' });

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({ action: 'add', amount: '' });

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: '' });

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  // Notifications State
  const [notifSettings, setNotifSettings] = useState({
    lowStock: true,
    outOfStock: true,
    debtAlerts: true,
    weeklyReport: false,
    aiSuggestions: true,
    expenseAlerts: false
  });
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);

  // Online Store / Inventory Organization State
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemImageFile, setNewItemImageFile] = useState(null);
  const [newItemImagePreview, setNewItemImagePreview] = useState(null);
  
  // Logic for Brand/Cat management
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemData, setEditingItemData] = useState(null);
  const [isConfirmDeleteItemOpen, setIsConfirmDeleteItemOpen] = useState(false);
  const [itemToDeleteData, setItemToDeleteData] = useState(null);
  const [itemToDeleteType, setItemToDeleteType] = useState(null);

  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'companies', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompanyName(data.name || '');
          setCompanyLogoUrl(data.logoUrl || '');
          setCompanyLogoPath(data.logoPath || '');
          setLogoPreview(data.logoUrl || '');
        }
      } catch (error) {
        console.error("Error al obtener la empresa:", error);
      }
    };
    const fetchProfileData = async () => {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData({
            fullName: data.fullName || '',
            phone: data.phone || '',
            email: data.email || currentUser.email,
            photoUrl: data.photoUrl || '',
            role: data.role || 'Administrador'
          });
          setProfilePreview(data.photoUrl || null);
        }
      } catch (error) {
        console.error("Error al obtener perfil:", error);
      }
    };

    fetchCompanyData();
    fetchProfileData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const qAccounts = query(collection(db, 'bankAccounts'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(qAccounts, (snap) => {
       const accs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       setBankAccounts(accs);
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    const fetchNotifSettings = async () => {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'settings', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().notifications) {
          setNotifSettings(docSnap.data().notifications);
        }
      } catch (error) {
        console.error("Error fetching notifications settings:", error);
      }
    };
    fetchNotifSettings();

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    // Fetch Categories and Brands
    if (!currentUser) return;
    const qCats = query(collection(db, 'product_categories'), where('userId', '==', currentUser.uid));
    const unsubCats = onSnapshot(qCats, (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qBrands = query(collection(db, 'product_brands'), where('userId', '==', currentUser.uid));
    const unsubBrands = onSnapshot(qBrands, (snap) => {
      setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      unsubCats();
      unsubBrands();
    };
  }, [currentUser]);

  const tabs = [
    { id: 'perfil', label: 'Mi Perfil', icon: User },
    { id: 'empresa', label: 'Mi Empresa', icon: Store },
    { id: 'catalogo', label: 'Catálogo Público', icon: Box },
    { id: 'cuentas', label: 'Cuentas y Cajas', icon: Landmark },
    { id: 'tienda', label: 'Tienda Online', icon: ShoppingBag },
    { id: 'apariencia', label: 'Apariencia', icon: Monitor },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'seguridad', label: 'Seguridad', icon: Shield },
    { id: 'facturacion', label: 'Facturación', icon: CreditCard },
  ];

  /* --- Company Handlers --- */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      let finalLogoUrl = companyLogoUrl;
      let finalLogoPath = companyLogoPath;

      if (logoFile) {
        if (companyLogoPath) {
          try { await deleteFile(companyLogoPath); } catch(e) { console.error(e); }
        }
        const path = generateUniquePath(currentUser.uid, 'logos', logoFile.name);
        finalLogoUrl = await uploadFile(logoFile, path);
        finalLogoPath = path;
      } else if (!logoPreview && companyLogoPath) {
        try { await deleteFile(companyLogoPath); } catch(e) { console.error(e); }
        finalLogoUrl = '';
        finalLogoPath = '';
      }

      await setDoc(doc(db, 'companies', currentUser.uid), {
        name: companyName,
        logoUrl: finalLogoUrl,
        logoPath: finalLogoPath,
        updatedAt: new Date()
      }, { merge: true });

      setCompanyLogoUrl(finalLogoUrl);
      setCompanyLogoPath(finalLogoPath);
      setLogoFile(null);

      toast.success('Gestionate Fácil: ¡Datos de la empresa actualizados correctamente!');
    } catch (error) {
      console.error("Error guardando empresa:", error);
      toast.error('Gestionate Fácil: Error al guardar los datos de la empresa');
    } finally {
      setIsSaving(false);
    }
  };

  /* --- Profile Handlers --- */
  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      let finalPhotoUrl = profileData.photoUrl;

      if (profileFile) {
        const path = generateUniquePath(currentUser.uid, 'avatars', profileFile.name);
        finalPhotoUrl = await uploadFile(profileFile, path);
      }

      await updateDoc(doc(db, 'users', currentUser.uid), {
        fullName: profileData.fullName,
        phone: profileData.phone,
        photoUrl: finalPhotoUrl,
        updatedAt: serverTimestamp()
      });

      setProfileData(prev => ({ ...prev, photoUrl: finalPhotoUrl }));
      setProfileFile(null);
      toast.success('Gestionate Fácil: ¡Perfil actualizado con éxito!');
    } catch (error) {
      console.error("Error guardando perfil:", error);
      toast.error('Gestionate Fácil: Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  /* --- Bank Accounts Handlers --- */
  const resetAccountForm = () => {
     setAccountFormData({ name: '', details: '', balance: 0, type: 'Banco' });
     setSelectedAccount(null);
     setIsEditAccount(false);
  };

  const handleOpenAddAccount = () => {
    resetAccountForm();
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc) => {
    setSelectedAccount(acc);
    setAccountFormData({
       name: acc.name || '',
       details: acc.details || '',
       balance: acc.balance || 0,
       type: acc.type || 'Banco'
    });
    setIsEditAccount(true);
    setIsAccountModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
       if (isEditAccount && selectedAccount) {
          await updateDoc(doc(db, 'bankAccounts', selectedAccount.id), {
             name: accountFormData.name,
             details: accountFormData.details,
             type: accountFormData.type,
             // Intentionally not mutating balance here to prevent overrides, 
             // balance is updated via Adjust logic unless it's initial creation.
             updatedAt: serverTimestamp()
          });
          toast.success("Gestionate Fácil: Cuenta actualizada");
       } else {
          await addDoc(collection(db, 'bankAccounts'), {
             userId: currentUser.uid,
             name: accountFormData.name,
             details: accountFormData.details,
             type: accountFormData.type,
             balance: parseFloat(accountFormData.balance) || 0,
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp()
          });
          toast.success("Gestionate Fácil: Cuenta creada");
       }
       setIsAccountModalOpen(false);
       resetAccountForm();
    } catch(err) {
       console.error("Error saving account:", err);
       toast.error("Gestionate Fácil: Error al guardar cuenta");
    } finally {
       setIsSaving(false);
    }
  };

  const handleDeleteAccount = (acc) => {
    setAccountToDelete(acc);
    setIsConfirmDeleteOpen(true);
    setActiveMenuId(null);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
       await deleteDoc(doc(db, 'bankAccounts', accountToDelete.id));
       toast.success("Gestionate Fácil: Cuenta eliminada");
       setIsConfirmDeleteOpen(false);
       setAccountToDelete(null);
    } catch(err) {
       toast.error("Gestionate Fácil: Error al eliminar cuenta");
    }
  };

  const handleOpenAdjust = (acc) => {
    setSelectedAccount(acc);
    setAdjustData({ action: 'add', amount: '' });
    setIsAdjustModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSaveAdjust = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setIsSaving(true);
    try {
       const amt = parseFloat(adjustData.amount) || 0;
       let newBal = parseFloat(selectedAccount.balance) || 0;
       
       if (adjustData.action === 'add') newBal += amt;
       if (adjustData.action === 'subtract') newBal -= amt;
       if (adjustData.action === 'set') newBal = amt;

       await updateDoc(doc(db, 'bankAccounts', selectedAccount.id), {
          balance: newBal,
          updatedAt: serverTimestamp()
       });
       toast.success("Gestionate Fácil: Saldo ajustado");
       setIsAdjustModalOpen(false);
    } catch(err) {
       toast.error("Gestionate Fácil: Error al ajustar saldo");
    } finally {
       setIsSaving(false);
    }
  };

  const handleOpenTransfer = () => {
    if (bankAccounts.length < 2) {
       toast.error("Gestionate Fácil: Necesitas al menos 2 cuentas para transferir");
       return;
    }
    setTransferData({ fromId: bankAccounts[0].id, toId: bankAccounts[1].id, amount: '' });
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = async (e) => {
    e.preventDefault();
    const { fromId, toId, amount } = transferData;
    if (fromId === toId) {
       toast.error("Gestionate Fácil: No puedes transferir a la misma cuenta");
       return;
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;

    setIsSaving(true);
    try {
       const fromAcc = bankAccounts.find(a => a.id === fromId);
       const toAcc = bankAccounts.find(a => a.id === toId);
       if (!fromAcc || !toAcc) throw new Error("Cuentas inválidas");

       const fromBal = parseFloat(fromAcc.balance) || 0;
       if (fromBal < amt) {
          toast.error("Gestionate Fácil: Saldo insuficiente en la cuenta de origen");
          setIsSaving(false);
          return;
       }

       // Transfer Logic (without transactions for simplicity, just atomic updates conceptually)
       await updateDoc(doc(db, 'bankAccounts', fromId), {
          balance: fromBal - amt,
          updatedAt: serverTimestamp()
       });

       const toBal = parseFloat(toAcc.balance) || 0;
       await updateDoc(doc(db, 'bankAccounts', toId), {
          balance: toBal + amt,
          updatedAt: serverTimestamp()
       });

       toast.success("Gestionate Fácil: Transferencia exitosa");
       setIsTransferModalOpen(false);
    } catch(err) {
       toast.error("Gestionate Fácil: Error al transferir");
    } finally {
       setIsSaving(false);
    }
  };


  const handleToggleNotif = async (key) => {
    if (!currentUser) return;
    const newSettings = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(newSettings);
    
    // Auto-save to Firestore
    try {
      await setDoc(doc(db, 'settings', currentUser.uid), {
        notifications: newSettings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Gestionate Fácil: Error al guardar preferencia");
    }
  };

  const handleItemImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewItemImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewItemImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const resetItemForm = () => {
    setNewItemName('');
    setNewItemDescription('');
    setNewItemImageFile(null);
    setNewItemImagePreview(null);
    setIsEditingItem(false);
    setEditingItemData(null);
  };

  const handleEditItem = (item, type) => {
    setIsEditingItem(true);
    setEditingItemData(item);
    setNewItemName(item.name || '');
    setNewItemDescription(item.description || '');
    setNewItemImagePreview(item.imageUrl || null);
    setNewItemImageFile(null);
    if (type === 'category') setIsCategoryModalOpen(true);
    else setIsBrandModalOpen(true);
  };

  const handleAddItem = async (type) => {
    if (!newItemName.trim() || !currentUser) return;
    setIsSaving(true);
    try {
      let imageUrl = isEditingItem ? editingItemData.imageUrl : '';
      let imagePath = isEditingItem ? editingItemData.imagePath : '';

      if (newItemImageFile) {
        // If editing and has previous image, delete it
        if (isEditingItem && editingItemData.imagePath) {
          try { await deleteFile(editingItemData.imagePath); } catch(e) { console.error(e); }
        }
        const folder = type === 'category' ? 'categories' : 'brands';
        const path = generateUniquePath(currentUser.uid, folder, newItemImageFile.name);
        imageUrl = await uploadFile(newItemImageFile, path);
        imagePath = path;
      }

      const collName = type === 'category' ? 'product_categories' : 'product_brands';
      
      const payload = {
        name: newItemName.trim(),
        description: newItemDescription.trim(),
        imageUrl,
        imagePath,
        userId: currentUser.uid,
        updatedAt: serverTimestamp()
      };

      if (isEditingItem) {
        await updateDoc(doc(db, collName, editingItemData.id), payload);
        toast.success(`Gestionate Fácil: ${type === 'category' ? 'Categoría' : 'Marca'} actualizada`);
      } else {
        await addDoc(collection(db, collName), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success(`Gestionate Fácil: ${type === 'category' ? 'Categoría' : 'Marca'} añadida`);
      }
      
      resetItemForm();
      setIsCategoryModalOpen(false);
      setIsBrandModalOpen(false);
    } catch (error) {
       console.error("Error saving item:", error);
      toast.error("Gestionate Fácil: Error al guardar ítem");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItemClick = (item, type) => {
    setItemToDeleteData(item);
    setItemToDeleteType(type);
    setIsConfirmDeleteItemOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDeleteData || !itemToDeleteType) return;
    try {
      if (itemToDeleteData.imagePath) {
        try { await deleteFile(itemToDeleteData.imagePath); } catch(e) { console.error(e); }
      }
      const collName = itemToDeleteType === 'category' ? 'product_categories' : 'product_brands';
      await deleteDoc(doc(db, collName, itemToDeleteData.id));
      toast.success("Gestionate Fácil: Eliminado correctamente");
      setIsConfirmDeleteItemOpen(false);
      setItemToDeleteData(null);
    } catch (error) {
      toast.error("Gestionate Fácil: Error al eliminar");
    }
  };

  const handleFormatApp = async () => {
    if (!currentUser) return;
    setIsFormatting(true);
    const toastId = toast.loading('Gestionate Fácil: Formateando aplicación...');
    
    try {
      const collectionsToDelete = [
        'deals', 'expenses', 'purchases', 'products', 'clients', 
        'bankAccounts', 'product_categories', 'product_brands', 
        'otherIncomes', 'notifications'
      ];

      for (const colName of collectionsToDelete) {
        const q = query(collection(db, colName), where('userId', '==', currentUser.uid));
        const snap = await getDocs(q);
        
        if (snap.empty) continue;

        const batch = writeBatch(db);
        snap.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      toast.success('Gestionate Fácil: Aplicación formateada correctamente', { id: toastId });
      setIsFormatModalOpen(false);
      window.location.reload(); // Refresh to clear context
    } catch (error) {
      console.error("Error formatting app:", error);
      toast.error('Gestionate Fácil: Error al formatear la aplicación', { id: toastId });
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className="settings-container animate-fade-in">
      <header className="settings-header">
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Gestiona tus preferencias de cuenta, facturación y sistema.</p>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar glass-panel">
          <nav className="settings-nav">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} className="tab-icon" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-content glass-panel">
          {activeTab === 'perfil' && (
            <div className="settings-section animate-fade-in">
              <h2>Información del Perfil</h2>
              <p className="section-desc">Actualiza tu información personal y de contacto.</p>
              
              <form className="settings-form" onSubmit={handleSaveProfile}>
                <div className="form-group row-group avatar-group">
                  <div className="profile-avatar-wrapper">
                    {profilePreview ? (
                      <img src={profilePreview} alt="Profile" className="profile-avatar-img" />
                    ) : (
                      <div className="avatar-placeholder">{profileData.fullName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}</div>
                    )}
                    <button 
                      type="button" 
                      className="avatar-edit-btn" 
                      onClick={() => profileFileInputRef.current?.click()}
                    >
                      <Camera size={14} />
                    </button>
                    <input 
                      type="file" 
                      ref={profileFileInputRef} 
                      onChange={handleProfilePhotoChange} 
                      accept="image/*" 
                      style={{display: 'none'}} 
                    />
                  </div>
                  <div className="avatar-info">
                    <h3 style={{margin: 0}}>{profileData.fullName || 'Usuario'}</h3>
                    <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)'}}>{profileData.role}</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Nombre Completo</label>
                  <input 
                    type="text" 
                    value={profileData.fullName} 
                    onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                    className="form-input" 
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono de Contacto</label>
                  <input 
                    type="tel" 
                    value={profileData.phone} 
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    className="form-input" 
                    placeholder="Ej: +54 9 11 ..."
                  />
                </div>

                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input type="email" value={profileData.email} className="form-input" disabled />
                  <span className="input-help">El correo electrónico no puede ser modificado por seguridad.</span>
                </div>

                <div className="form-actions" style={{marginTop: '2rem'}}>
                  <button type="submit" className="btn-primary" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'empresa' && (
            <div className="settings-section animate-fade-in">
              <h2>Identidad de la Empresa</h2>
              <p className="section-desc">Personaliza cómo se ve Gestionate Fácil con tu propia marca.</p>

              <form className="settings-form" onSubmit={handleSaveCompany}>
                <div className="form-group">
                  <label>Logo de la Marca (Redondeado)</label>
                  <div className="image-upload-wrapper" style={{maxWidth: '300px'}}>
                    <div className="image-preview-container" style={{borderRadius: '50%'}}>
                      {logoPreview ? (
                        <>
                          <img src={logoPreview} alt="Logo Empresa" style={{borderRadius: '50%', objectFit: 'cover'}}/>
                          <button type="button" className="remove-image-btn" onClick={removeLogo}><X size={12} /></button>
                        </>
                      ) : <Store size={24} style={{opacity: 0.3}} />}
                    </div>
                    <div className="file-input-custom" onClick={() => fileInputRef.current?.click()} style={{cursor: 'pointer'}}>
                      <div className="file-input-label">
                        <Camera size={16} />
                        <span>{logoPreview ? 'Cambiar Logo' : 'Subir Logo'}</span>
                      </div>
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoChange} style={{display:'none'}} />
                    </div>
                  </div>
                  <span className="input-help" style={{marginTop:'0.5rem', display:'block'}}>Se recomienda una imagen cuadrada/redondeada de 300x300px.</span>
                </div>

                <div className="form-group" style={{marginTop: '2rem'}}>
                  <label>Nombre de la Empresa</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Mi Super Empresa" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="form-input" 
                    required
                  />
                  <span className="input-help">Este nombre aparecerá en el menú lateral.</span>
                </div>

                <div className="form-actions" style={{marginTop: '2rem'}}>
                  <button type="submit" className="btn-primary" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar Marca'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'catalogo' && (
            <div className="settings-section animate-fade-in">
              <h2>Configuración del Catálogo Público</h2>
              <p className="section-desc">Gestiona cómo tus clientes ven tus productos en línea.</p>

              <div className="glass-card" style={{padding: '2rem', marginTop: '1.5rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem'}}>
                  <div style={{background: 'var(--primary-glow)', padding: '1.5rem', borderRadius: '16px'}}>
                    <Box size={32} className="text-gradient" />
                  </div>
                  <div>
                    <h3 style={{fontSize: '1.25rem', marginBottom: '0.25rem'}}>Tu Link de Catálogo</h3>
                    <p style={{color: 'var(--text-dim)', fontSize: '0.9rem'}}>Comparte este enlace con tus clientes para que vean tus productos.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>URL Pública</label>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/catalogo/${currentUser?.uid}`} 
                      className="form-input"
                      style={{background: 'rgba(0,0,0,0.2)', cursor: 'default'}}
                    />
                    <button 
                      className="btn-primary" 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/catalogo/${currentUser?.uid}`);
                        toast.success("Gestionate Fácil: ¡Link copiado al portapapeles!");
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <div style={{marginTop: '2rem', padding: '1.5rem', background: 'rgba(52, 211, 153, 0.05)', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.1)'}}>
                  <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-start'}}>
                    <div style={{color: '#15803d', marginTop: '2px'}}><Shield size={20} /></div>
                    <div>
                      <h4 style={{margin: 0, color: '#15803d'}}>Filtrado de Privacidad Activo</h4>
                      <p style={{margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                        Solo los productos marcados como <strong>"Activos"</strong> en tu inventario son visibles para los clientes. 
                        Los precios y el stock se sincronizan automáticamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cuentas' && (
            <div className="settings-section animate-fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <div>
                  <h2>Cuentas Bancarias y Cajas</h2>
                  <p className="section-desc" style={{margin:0}}>Administra tus saldos y cuentas de ingreso/egreso.</p>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <button className="btn-outline flex-center gap-2" onClick={handleOpenTransfer}>
                    <ArrowRightLeft size={16} />
                    <span>Transferir</span>
                  </button>
                  <button className="btn-primary flex-center gap-2" onClick={handleOpenAddAccount}>
                    <Plus size={16} />
                    <span>Añadir Cuenta</span>
                  </button>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem'}}>
                {bankAccounts.length === 0 ? (
                  <div style={{gridColumn:'1/-1', textAlign:'center', padding:'3rem', background:'rgba(255,255,255,0.02)', borderRadius:'8px', border:'1px dashed rgba(255,255,255,0.1)'}}>
                    <Landmark size={32} style={{margin:'0 auto 1rem', opacity:0.5}} />
                    <p style={{color:'var(--text-muted)'}}>No tienes cuentas creadas. ¡Añade tu primera caja o banco!</p>
                  </div>
                ) : (
                  bankAccounts.map(acc => (
                    <div key={acc.id} className="glass-card" style={{padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                      
                      <div style={{position: 'absolute', top: '1rem', right: '1rem'}}>
                        <div className="action-dropdown-container" ref={activeMenuId === acc.id ? menuRef : null}>
                          <button className="btn-icon" onClick={() => setActiveMenuId(activeMenuId === acc.id ? null : acc.id)}>
                            <MoreVertical size={18} />
                          </button>
                          {activeMenuId === acc.id && (
                            <div className="dropdown-menu">
                              <button className="dropdown-item" onClick={() => handleOpenAdjust(acc)}>
                                <DollarSign size={14} />
                                <span>Ajustar Saldo</span>
                              </button>
                              <button className="dropdown-item" onClick={() => handleOpenEditAccount(acc)}>
                                <Edit2 size={14} />
                                <span>Editar Detalles</span>
                              </button>
                              <button className="dropdown-item delete" onClick={() => handleDeleteAccount(acc)}>
                                <Trash2 size={14} />
                                <span>Eliminar Cuenta</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                        <div style={{background:'var(--surface-hover)', padding:'0.8rem', borderRadius:'8px', color:'var(--primary)'}}>
                          {acc.type === 'Efectivo' ? <Wallet size={24} /> : <Landmark size={24} />}
                        </div>
                        <div>
                          <h3 style={{fontSize:'1.1rem', margin:0, fontWeight:600}}>{acc.name}</h3>
                          <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{acc.type}</span>
                        </div>
                      </div>

                      {acc.details && (
                        <div style={{fontSize:'0.85rem', color:'var(--text-muted)', background:'rgba(0,0,0,0.2)', padding:'0.5rem', borderRadius:'4px'}}>
                          {acc.details}
                        </div>
                      )}

                      <div style={{marginTop:'auto', paddingTop:'1rem', borderTop:'1px solid var(--panel-border)'}}>
                        <div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Saldo Disponible</div>
                        <div style={{fontSize:'1.6rem', fontWeight:'bold', color:'var(--text-main)'}}>
                          {formatCurrency(acc.balance || 0)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'tienda' && (
            <div className="settings-section animate-fade-in">
              <h2>Configuración de Tienda Online</h2>
              <p className="section-desc">Gestiona marcas y categorías para organizar tu catálogo de venta.</p>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1.5rem'}}>
                {/* Categorías Card */}
                <div className="glass-card" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <div className="flex-center gap-2">
                       <div style={{background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '0.5rem', borderRadius: '8px'}}>
                        <Tag size={20} />
                       </div>
                       <h3 style={{margin: 0, fontSize: '1.1rem'}}>Categorías</h3>
                    </div>
                    <button className="btn-icon" onClick={() => { resetItemForm(); setIsCategoryModalOpen(true); }} title="Añadir Categoría">
                      <Plus size={18} />
                    </button>
                  </div>
                  
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem'}}>
                    {categories.length === 0 ? (
                      <p style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem'}}>No hay categorías.</p>
                    ) : (
                      categories.sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(cat => (
                        <div key={cat.id} className="flex-center" style={{justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--panel-border)'}}>
                          <div className="flex-center gap-3">
                            <div style={{width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                              {cat.imageUrl ? <img src={cat.imageUrl} alt={cat.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <Tag size={14} style={{opacity: 0.3}} />}
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column'}}>
                              <span style={{fontSize: '0.9rem', fontWeight: 500}}>{cat.name}</span>
                              {cat.description && <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px'}}>{cat.description}</span>}
                            </div>
                          </div>
                          <div className="flex-center gap-2">
                            <button className="btn-icon" onClick={() => handleEditItem(cat, 'category')} style={{width: '28px', height: '28px', color: 'var(--primary)'}}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn-icon delete" onClick={() => handleDeleteItemClick(cat, 'category')} style={{width: '28px', height: '28px'}}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Marcas Card */}
                <div className="glass-card" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <div className="flex-center gap-2">
                       <div style={{background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', padding: '0.5rem', borderRadius: '8px'}}>
                        <Bookmark size={20} />
                       </div>
                       <h3 style={{margin: 0, fontSize: '1.1rem'}}>Marcas</h3>
                    </div>
                    <button className="btn-icon" onClick={() => { resetItemForm(); setIsBrandModalOpen(true); }} title="Añadir Marca">
                      <Plus size={18} />
                    </button>
                  </div>
                  
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem'}}>
                    {brands.length === 0 ? (
                      <p style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem'}}>No hay marcas.</p>
                    ) : (
                      brands.sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(brand => (
                        <div key={brand.id} className="flex-center" style={{justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--panel-border)'}}>
                          <div className="flex-center gap-3">
                            <div style={{width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                              {brand.imageUrl ? <img src={brand.imageUrl} alt={brand.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <Bookmark size={14} style={{opacity: 0.3}} />}
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column'}}>
                              <span style={{fontSize: '0.9rem', fontWeight: 500}}>{brand.name}</span>
                              {brand.description && <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px'}}>{brand.description}</span>}
                            </div>
                          </div>
                          <div className="flex-center gap-2">
                            <button className="btn-icon" onClick={() => handleEditItem(brand, 'brand')} style={{width: '28px', height: '28px', color: 'var(--primary)'}}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn-icon delete" onClick={() => handleDeleteItemClick(brand, 'brand')} style={{width: '28px', height: '28px'}}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apariencia' && (
            <div className="settings-section animate-fade-in">
              <h2>Apariencia del Sistema</h2>
              <p className="section-desc">Personaliza la forma en que ves Gestionate Fácil.</p>
              <div className="settings-form">
                <div className="theme-selector">
                  <div className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
                    <div className="theme-preview light-theme"></div>
                    <span>Claro</span>
                  </div>
                  <div className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
                    <div className="theme-preview dark-theme"></div>
                    <span>Oscuro</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notificaciones' && (
            <div className="settings-section animate-fade-in">
              <h2>Notificaciones del Sistema</h2>
              <p className="section-desc">Personaliza las alertas que recibes en el centro de notificaciones.</p>
              
              <div className="notif-settings-grid">
                {/* Categoría: Inventario */}
                <div className="notif-card-pro">
                  <div className="notif-card-header">
                    <Package size={20} className="notif-icon-category" />
                    <h3>Gestión de Inventario</h3>
                  </div>
                  <div className="notif-items-container">
                    <div className="notif-item-pro" onClick={() => handleToggleNotif('lowStock')}>
                      <div className="notif-icon-box warn">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="notif-text">
                        <span className="notif-label">Stock Bajo</span>
                        <p>Nivel de existencias menor al mínimo establecido.</p>
                      </div>
                      <label className="notif-switch-pro">
                        <input type="checkbox" checked={notifSettings.lowStock} onChange={() => {}} />
                        <span className="slider-pro round"></span>
                      </label>
                    </div>

                    <div className="notif-item-pro" onClick={() => handleToggleNotif('outOfStock')}>
                      <div className="notif-icon-box danger">
                        <AlertCircle size={18} />
                      </div>
                      <div className="notif-text">
                        <span className="notif-label">Productos Agotados</span>
                        <p>Alertas críticas cuando una variante llega a cero.</p>
                      </div>
                      <label className="notif-switch-pro">
                        <input type="checkbox" checked={notifSettings.outOfStock} onChange={() => {}} />
                        <span className="slider-pro round"></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Categoría: Finanzas */}
                <div className="notif-card-pro">
                  <div className="notif-card-header">
                    <CreditCard size={20} className="notif-icon-category" />
                    <h3>Finanzas y Cobros</h3>
                  </div>
                  <div className="notif-items-container">
                    <div className="notif-item-pro" onClick={() => handleToggleNotif('debtAlerts')}>
                      <div className="notif-icon-box success">
                        <TrendingUp size={18} />
                      </div>
                      <div className="notif-text">
                        <span className="notif-label">Deudas por Vencer</span>
                        <p>Avisar cuando un cliente esté próximo a su fecha límite.</p>
                      </div>
                      <label className="notif-switch-pro">
                        <input type="checkbox" checked={notifSettings.debtAlerts} onChange={() => {}} />
                        <span className="slider-pro round"></span>
                      </label>
                    </div>

                    <div className="notif-item-pro" onClick={() => handleToggleNotif('expenseAlerts')}>
                      <div className="notif-icon-box info">
                        <BarChart2 size={18} />
                      </div>
                      <div className="notif-text">
                        <span className="notif-label">Control de Gastos</span>
                        <p>Notificar exceso de presupuesto mensual (Nivel Pro).</p>
                      </div>
                      <label className="notif-switch-pro">
                        <input type="checkbox" checked={notifSettings.expenseAlerts} onChange={() => {}} />
                        <span className="slider-pro round"></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Categoría: Inteligencia */}
                <div className="notif-card-pro">
                  <div className="notif-card-header">
                    <Sparkles size={20} className="notif-icon-category" />
                    <h3>Inteligencia de Negocio</h3>
                  </div>
                  <div className="notif-items-container">
                    <div className="notif-item-pro" onClick={() => handleToggleNotif('aiSuggestions')}>
                      <div className="notif-icon-box spark">
                        <Sparkles size={18} />
                      </div>
                      <div className="notif-text">
                        <span className="notif-label">Sugerencias Estratégicas</span>
                        <p>Permitir que la IA sugiera compras o ajustes de precios.</p>
                      </div>
                      <label className="notif-switch-pro">
                        <input type="checkbox" checked={notifSettings.aiSuggestions} onChange={() => {}} />
                        <span className="slider-pro round"></span>
                      </label>
                    </div>

                    <div className="notif-item-pro" onClick={() => handleToggleNotif('weeklyReport')}>
                      <div className="notif-icon-box default">
                        <Calendar size={18} />
                      </div>
                      <div className="notif-text">
                        <span className="notif-label">Reporte Semanal</span>
                        <p>Resumen consolidado automático cada lunes mañana.</p>
                      </div>
                      <label className="notif-switch-pro">
                        <input type="checkbox" checked={notifSettings.weeklyReport} onChange={() => {}} />
                        <span className="slider-pro round"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seguridad' && (
             <div className="settings-section animate-fade-in center-msg">
                <Lock size={32} style={{color: 'var(--text-muted)', margin: '0 auto 1rem auto'}}/>
                <h2 style={{textAlign:'center'}}>Seguridad y Accesos</h2>
                <p className="section-desc" style={{textAlign:'center'}}>Próximamente: Autenticación en dos pasos y auditoría de sesiones.</p>
             </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="settings-section animate-fade-in">
              <h2>Seguridad y Datos</h2>
              <p className="section-desc">Gestiona la integridad de tu información y la seguridad de tu cuenta.</p>
              
              <div className="security-cards-grid" style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px' }}>
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>Zona de Peligro</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Acciones irreversibles sobre tus datos.</p>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '16px', padding: '1.5rem' }}>
                    <h4 style={{ color: 'var(--danger)', marginTop: 0 }}>Formatear Aplicación</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                      Esta acción eliminará <strong>absolutamente todos</strong> tus datos de Gestionate Fácil: ventas, compras, gastos, contactos, inventario y configuraciones. 
                      <br /><br />
                      <strong>Atención:</strong> No existe forma de recuperar esta información una vez eliminada.
                    </p>
                    <button 
                      className="btn-danger" 
                      onClick={() => setIsFormatModalOpen(true)}
                      style={{ padding: '0.8rem 2rem', fontWeight: 600 }}
                    >
                      Formatear Todo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'facturacion' && (
             <div className="settings-section animate-fade-in">
                <h2>Facturación y Plan</h2>
                <p className="section-desc">Consulta el estado de tu suscripción y gestiona tu acceso.</p>
                
                <div className="glass-card billing-card" style={{padding: '3rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <div className="plan-status-badge" style={{
                    marginBottom: '1.5rem', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.6rem 1.8rem', 
                    borderRadius: '100px', 
                    background: 'rgba(59, 130, 246, 0.15)', 
                    color: 'var(--primary-light)', 
                    fontWeight: 800, 
                    fontSize: '0.85rem', 
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    <Zap size={14} fill="currentColor" />
                    <span>PLAN {currentUser?.plan || 'EMPRENDEDOR'}</span>
                  </div>
                  
                  <h3 style={{fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--text-main)', textAlign: 'center'}}>
                    {currentUser?.plan === 'Trial' ? 'Prueba Gratuita' : `Gestionate Fácil ${currentUser?.plan || 'Pro'}`}
                  </h3>

                  <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2.5rem'}}>
                    <div style={{width: '8px', height: '8px', borderRadius: '50%', background: currentUser?.status === 'suspendido' ? '#ef4444' : '#10b981', boxShadow: `0 0 10px ${currentUser?.status === 'suspendido' ? '#ef4444' : '#10b981'}`}}></div>
                    <span style={{fontWeight: 600}}>Estado: <span style={{color: 'var(--text-main)'}}>{currentUser?.status?.toUpperCase() || 'ACTIVO'}</span></span>
                  </div>
                  
                  <div className="benefits-grid">
                    {[
                      { title: 'IA Predictiva', desc: 'Asistente inteligente 24/7', active: true },
                      { title: 'Inventario Pro', desc: 'Alertas y trazabilidad completa', active: true },
                      { title: 'Finanzas Reales', desc: 'Cuentas, cajas y reportes', active: true },
                      { title: 'Soporte VIP', desc: 'Prioridad en consultas', active: currentUser?.plan !== 'Trial' }
                    ].map((benefit, i) => (
                      <div key={i} className="benefit-item">
                        <div className={`benefit-icon ${benefit.active ? 'active' : ''}`}>
                          {benefit.active ? <CheckCircle size={14} /> : <Clock size={14} />}
                        </div>
                        <div className="benefit-info">
                          <h4>{benefit.title}</h4>
                          <p>{benefit.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{marginTop: '3rem', width: '100%', height: '1px', background: 'linear-gradient(to right, transparent, var(--panel-border), transparent)'}}></div>

                  <div style={{marginTop: '3rem', textAlign: 'center'}}>
                    {currentUser?.plan === 'Trial' ? (
                      <div style={{marginBottom: '2rem'}}>
                        <p style={{color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 1.5rem'}}>
                          Estás usando la versión completa de Gestionate Fácil. No dejes que tus herramientas de control se detengan.
                        </p>
                        <button 
                          className="btn-primary" 
                          style={{padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 700, borderRadius: '14px', boxShadow: '0 10px 20px -5px var(--primary-glow)'}} 
                          onClick={() => window.open('https://wa.me/5491112345678', '_blank')}
                        >
                          Convertirme en Pro Ahora
                        </button>
                      </div>
                    ) : (
                      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem'}}>
                         <button 
                          className="btn-primary" 
                          style={{padding: '1rem 2.5rem', fontWeight: 700}} 
                          onClick={() => window.open('https://wa.me/5491112345678', '_blank')}
                        >
                          Gestionar Suscripción
                        </button>
                        <button className="btn-outline" style={{padding: '1rem 2.5rem'}}>
                          Descargar Facturas
                        </button>
                      </div>
                    )}
                    <p style={{marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)'}}>
                      Seguridad SSL Encriptada • Pagos procesados por Mercado Pago / Stripe
                    </p>
                  </div>
                </div>
             </div>
          )}
        </main>
      </div>

      {/* --- Modals --- */}
      
      {/* Añadir/Editar Cuenta Modal */}
      <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title={isEditAccount ? "Editar Cuenta" : "Añadir Cuenta"}>
        <form onSubmit={handleSaveAccount} className="settings-form">
          <div className="form-group">
            <label>Nombre de la Cuenta</label>
            <input type="text" className="form-input" required placeholder="Ej: Banco Galicia" value={accountFormData.name} onChange={e => setAccountFormData({...accountFormData, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select className="form-input" value={accountFormData.type} onChange={e => setAccountFormData({...accountFormData, type: e.target.value})}>
              <option value="Banco">Banco / Billetera Virtual</option>
              <option value="Efectivo">Caja Efectivo</option>
            </select>
          </div>
          <div className="form-group">
            <label>Detalles (CBU, Alias, Nro de cuenta)</label>
            <input type="text" className="form-input" placeholder="Opcional" value={accountFormData.details} onChange={e => setAccountFormData({...accountFormData, details: e.target.value})} />
          </div>
          {!isEditAccount && (
            <div className="form-group">
              <label>Saldo Inicial ($)</label>
              <input type="number" step="0.01" className="form-input" required placeholder="0.00" value={accountFormData.balance} onChange={e => setAccountFormData({...accountFormData, balance: e.target.value})} />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={() => setIsAccountModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>Guardar Cuenta</button>
          </div>
        </form>
      </Modal>

      {/* Ajustar Saldo Modal */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title={`Ajustar Saldo: ${selectedAccount?.name || ''}`}>
        <form onSubmit={handleSaveAdjust} className="settings-form">
          <div style={{background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
             <span style={{color: 'var(--text-muted)'}}>Saldo Actual:</span>
             <span style={{fontWeight: 'bold', fontSize: '1.2rem'}}>{formatCurrency(selectedAccount?.balance || 0)}</span>
          </div>
          <div className="form-group">
            <label>Acción</label>
            <select className="form-input" value={adjustData.action} onChange={e => setAdjustData({...adjustData, action: e.target.value})}>
               <option value="add">Ingreso / Sumar (+)</option>
               <option value="subtract">Egreso / Restar (-)</option>
               <option value="set">Fijar Nuevo Saldo (=)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Monto ($)</label>
            <input type="number" step="0.01" min="0" required className="form-input" placeholder="0.00" autoFocus value={adjustData.amount} onChange={e => setAdjustData({...adjustData, amount: e.target.value})} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={() => setIsAdjustModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>Actualizar</button>
          </div>
        </form>
      </Modal>

      {/* Transferir Modal */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Transferir Saldo">
        <form onSubmit={handleSaveTransfer} className="settings-form">
          <div className="form-group">
            <label>Cuenta Origen</label>
            <select className="form-input" required value={transferData.fromId} onChange={e => setTransferData({...transferData, fromId: e.target.value})}>
              {bankAccounts.map(acc => (
                 <option key={acc.id} value={acc.id}>{acc.name} (Disp: {formatCurrency(acc.balance||0)})</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{textAlign:'center', color:'var(--primary)', margin:'-0.5rem 0'}}>
             <ArrowDownRight size={24} style={{margin:'0 auto'}} />
          </div>
          <div className="form-group">
            <label>Cuenta Destino</label>
            <select className="form-input" required value={transferData.toId} onChange={e => setTransferData({...transferData, toId: e.target.value})}>
              {bankAccounts.map(acc => (
                 <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
             <label>Monto a transferir ($)</label>
             <input type="number" step="0.01" min="0" required className="form-input" placeholder="0.00" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={() => setIsTransferModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>Confirmar Transferencia</button>
          </div>
        </form>
      </Modal>

      {/* Modales de Tienda */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => { setIsCategoryModalOpen(false); resetItemForm(); }} title={isEditingItem ? "Editar Categoría" : "Nueva Categoría"}>
        <div className="settings-form" style={{padding: '0.5rem'}}>
          <div className="form-group" style={{textAlign: 'center'}}>
             <label>{isEditingItem ? 'Cambiar Imagen' : 'Imagen / Icono'}</label>
             <div className="image-upload-wrapper" style={{margin: '0 auto', maxWidth: '120px'}}>
                <div className="image-preview-container" style={{width: '100px', height: '100px', borderRadius: '8px', margin: '0 auto'}}>
                   {newItemImagePreview ? (
                     <img src={newItemImagePreview} alt="Preview" style={{borderRadius: '8px', objectFit: 'cover'}} />
                   ) : <Tag size={24} style={{opacity: 0.2}} />}
                </div>
                <input type="file" accept="image/*" onChange={handleItemImageChange} id="category-img" style={{display: 'none'}} />
                <button className="btn-text-sm" onClick={() => document.getElementById('category-img').click()}>
                   {newItemImagePreview ? 'Cambiar Imagen' : 'Subir Imagen'}
                </button>
             </div>
          </div>

          <div className="form-group">
            <label>Nombre de la Categoría</label>
            <input type="text" className="form-input" placeholder="Ej: Electrónica, Calzado..." value={newItemName} onChange={e => setNewItemName(e.target.value)} autoFocus />
          </div>

          <div className="form-group">
            <label>Descripción Corta</label>
            <textarea 
              className="form-input" 
              placeholder="¿Qué productos incluye esta categoría?" 
              rows="3" 
              value={newItemDescription} 
              onChange={e => setNewItemDescription(e.target.value)}
              style={{resize: 'none', padding: '0.8rem'}}
            />
          </div>

          <div className="modal-actions">
            <button className="btn-outline" onClick={() => { setIsCategoryModalOpen(false); resetItemForm(); }}>Cancelar</button>
            <button className="btn-primary" onClick={() => handleAddItem('category')} disabled={isSaving || !newItemName.trim()}>
              {isSaving ? 'Guardando...' : (isEditingItem ? 'Actualizar Categoría' : 'Añadir Categoría')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isBrandModalOpen} onClose={() => { setIsBrandModalOpen(false); resetItemForm(); }} title={isEditingItem ? "Editar Marca" : "Nueva Marca"}>
        <div className="settings-form" style={{padding: '0.5rem'}}>
          <div className="form-group" style={{textAlign: 'center'}}>
             <label>{isEditingItem ? 'Cambiar Logo' : 'Logo de la Marca'}</label>
             <div className="image-upload-wrapper" style={{margin: '0 auto', maxWidth: '120px'}}>
                <div className="image-preview-container" style={{width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto'}}>
                   {newItemImagePreview ? (
                     <img src={newItemImagePreview} alt="Preview" style={{borderRadius: '50%', objectFit: 'cover'}} />
                   ) : <Bookmark size={24} style={{opacity: 0.2}} />}
                </div>
                <input type="file" accept="image/*" onChange={handleItemImageChange} id="brand-img" style={{display: 'none'}} />
                <button className="btn-text-sm" onClick={() => document.getElementById('brand-img').click()}>
                   {newItemImagePreview ? 'Cambiar Logo' : 'Subir Logo'}
                </button>
             </div>
          </div>

          <div className="form-group">
            <label>Nombre de la Marca</label>
            <input type="text" className="form-input" placeholder="Ej: Nike, Samsung..." value={newItemName} onChange={e => setNewItemName(e.target.value)} autoFocus />
          </div>

          <div className="form-group">
            <label>Sobre la Marca</label>
            <textarea 
              className="form-input" 
              placeholder="Breve historia o detalles de la marca..." 
              rows="3" 
              value={newItemDescription} 
              onChange={e => setNewItemDescription(e.target.value)}
              style={{resize: 'none', padding: '0.8rem'}}
            />
          </div>

          <div className="modal-actions">
            <button className="btn-outline" onClick={() => { setIsBrandModalOpen(false); resetItemForm(); }}>Cancelar</button>
            <button className="btn-primary" onClick={() => handleAddItem('brand')} disabled={isSaving || !newItemName.trim()}>
              {isSaving ? 'Guardando...' : (isEditingItem ? 'Actualizar Marca' : 'Añadir Marca')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={isConfirmDeleteItemOpen}
        onClose={() => setIsConfirmDeleteItemOpen(false)}
        onConfirm={confirmDeleteItem}
        title={`Eliminar ${itemToDeleteType === 'category' ? 'Categoría' : 'Marca'}`}
        message={`¿Estás seguro de que quieres eliminar "${itemToDeleteData?.name}"? Esta acción no se puede deshacer y el ítem se borrará de tus listas.`}
      />

      <ConfirmModal 
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={confirmDeleteAccount}
        title="Eliminar Cuenta"
        message="¿Estás seguro de eliminar esta cuenta? Perderás el registro de su saldo. No se puede deshacer."
      />

      <ConfirmModal 
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        onConfirm={handleFormatApp}
        title="¡ALERTA CRÍTICA: Formatear Aplicación!"
        message="¿ESTÁS SEGURO? Esta acción borrará permanentemente todas tus ventas, gastos, productos, contactos y configuraciones. No existe forma de recuperar estos datos una vez eliminados. Escribe 'CONFIRMAR' para proceder."
        confirmText={isFormatting ? "Borrando..." : "SÍ, BORRAR TODO"}
        danger={true}
      />
    </div>
  );
}

