import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, AlertTriangle, Search, Filter, Download, UploadCloud, QrCode, ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, parseCurrency } from '../utils/format';
import Papa from 'papaparse';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { uploadFile, deleteFile, generateUniquePath } from '../services/storageService';
import { InventarioStats } from '../components/inventario/InventarioStats';
import { InventarioTable } from '../components/inventario/InventarioTable';
import { ProductForm } from '../components/inventario/ProductForm';
import { ProductViewModal } from '../components/inventario/ProductViewModal';
import { StockAdjustModal } from '../components/inventario/StockAdjustModal';
import { CatalogModal } from '../components/inventario/CatalogModal';
import { useData } from '../contexts/DataContext';
import './Inventario.css';

export function Inventario() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    deals: allDeals,
    categories = [],
    brands = [],
    inventory: contextInventory,
    contacts: contextContacts,
    isLoading: dataLoading 
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCriticalFilterActive, setIsCriticalFilterActive] = useState(false);
  const fileInputRef = useRef(null);

  // Derivamos el estado local del contexto
  const inventory = contextInventory;
  const contacts = contextContacts;
  const loading = dataLoading;

  // Estados para Modales y Operaciones
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustStockTemp, setAdjustStockTemp] = useState('');
  const [adjustVariantsTemp, setAdjustVariantsTemp] = useState([]);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  
  // Estados para Proveedores, Categorías y Marcas Rápidas
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ name: '', phone: '', email: '' });
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [quickItemData, setQuickItemData] = useState({ name: '', description: '' });
  const [quickItemFile, setQuickItemFile] = useState(null);
  const [quickItemPreview, setQuickItemPreview] = useState(null);

  // Estados para Variantes
  const [editingOptionIdx, setEditingOptionIdx] = useState(null); 
  const [expandedGroups, setExpandedGroups] = useState(new Set()); 
  const [quickVariantImageId, setQuickVariantImageId] = useState(null);

  // Memoized derived data
  const sortedInventory = React.useMemo(() => {
    return [...inventory].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [inventory]);
  
  const suppliers = contacts.filter(c => c.type === 'Proveedor');

  const catalogUrl = currentUser ? `${window.location.origin}/catalogo/${currentUser.uid}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(catalogUrl);
    toast.success('Gestionate Fácil: ¡Enlace del catálogo copiado al portapapeles!');
  };

  // Form State
  const [formData, setFormData] = useState({ 
    name: '', description: '', stock: '', minStock: '0', costPrice: '', sellingPrice: '', 
    brand: '', category: '', supplier: '', isActive: true, size: '', color: '',
    hasVariants: false, variantOptions: [], variants: [],
    showInCatalog: true,
    stockAlertEnabled: false
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);



  useEffect(() => {
    if (location.state?.viewProductId && inventory.length > 0) {
      const product = inventory.find(p => p.id === location.state.viewProductId);
      if (product) {
        setViewProduct(product);
        setIsViewModalOpen(true);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, inventory, navigate, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleQuickFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setQuickItemFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setQuickItemPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Variant Logic
  const generateCombinations = (options) => {
    if (!options || options.length === 0) return [];
    const validOptions = options.filter(o => o.name && o.values.length > 0);
    if(validOptions.length === 0) return [];

    let combinations = [{}];
    for (const option of validOptions) {
      const nextCombinations = [];
      for (const current of combinations) {
        for (const value of option.values) {
          nextCombinations.push({ ...current, [option.name]: value });
        }
      }
      combinations = nextCombinations;
    }
    
    return combinations.map(combo => {
      const id = Object.entries(combo).map(([k, v]) => `${k}-${v}`).join('_');
      return { id, attributes: combo, stock: 0, price: '', sku: '' };
    });
  };

  const handleVariantOptionsChange = (newOptions) => {
    const newCombinations = generateCombinations(newOptions);
    // Merge existing variants to keep stock/price/sku and IMAGE data
    const mergedVariants = newCombinations.map(newVar => {
      const existing = formData.variants?.find(v => v.id === newVar.id);
      return existing ? { 
        ...newVar, 
        stock: existing.stock, 
        price: existing.price, 
        sku: existing.sku,
        imageUrl: existing.imageUrl,
        imagePath: existing.imagePath
      } : newVar;
    });
    setFormData({ ...formData, variantOptions: newOptions, variants: mergedVariants });
  };

  const toggleGroupExpansion = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) newExpanded.delete(groupId);
    else newExpanded.add(groupId);
    setExpandedGroups(newExpanded);
  };

  const handleVariantImageUpload = async (file, variantId) => {
    if (!file || !currentUser) return;
    setIsUploading(true);
    try {
      const path = generateUniquePath(currentUser.uid, 'variants', file.name);
      const imageUrl = await uploadFile(file, path);
      
      const targetVariant = formData.variants.find(v => v.id === variantId);
      if (!targetVariant) return;

      // Logic: Sync with others sharing the SAME "Main Attribute" (usually the first one, or the one that makes sense)
      // For now, let's say if they share the SAME values for ALL attributes EXCEPT one (or just the same value for THE attribute that was clicked)
      // Actually, simplest and most common: "If I set a photo for Azul / S, apply to all Azul".
      
      // Let's identify which attribute the user likely wants to sync.
      // Usually, if they have Color, that's the one.
      const syncKey = Object.keys(targetVariant.attributes).find(k => k.toLowerCase().includes('color')) || Object.keys(targetVariant.attributes)[0];
      const syncValue = targetVariant.attributes[syncKey];

      const newVariants = formData.variants.map(v => {
        if (v.attributes[syncKey] === syncValue) {
          return { ...v, imageUrl, imagePath: path };
        }
        return v;
      });

      setFormData({ ...formData, variants: newVariants });
      toast.success(`Gestionate Fácil: Foto aplicada a todas las variantes "${syncValue}"`);
    } catch (e) {
      console.error(e);
      toast.error("Gestionate Fácil: Error al subir foto de variante");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!formData.name) return;

    setIsUploading(true);
    try {
      let stockNum = 0;
      if (formData.hasVariants && formData.variants && formData.variants.length > 0) {
        stockNum = formData.variants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0);
      } else {
        stockNum = parseInt(formData.stock) || 0;
      }
      const minStockNum = parseInt(formData.minStock) || 0;
      let imageUrl = isEditMode && selectedProduct ? selectedProduct.imageUrl : null;
      let imagePath = isEditMode && selectedProduct ? selectedProduct.imagePath : null;

      if (imageFile) {
        if (imagePath) await deleteFile(imagePath);
        const path = generateUniquePath(currentUser.uid, 'products', imageFile.name);
        imageUrl = await uploadFile(imageFile, path);
        imagePath = path;
      }

      const productData = {
        ...formData,
        stock: stockNum,
        minStock: minStockNum,
        isActive: formData.isActive === true || formData.isActive === 'true',
        hasVariants: formData.hasVariants,
        variantOptions: formData.hasVariants ? formData.variantOptions : [],
        variants: formData.hasVariants ? formData.variants : [],
        showInCatalog: formData.showInCatalog !== false,
        stockAlertEnabled: formData.stockAlertEnabled === true,
        imageUrl,
        imagePath,
        updatedAt: serverTimestamp()
      };

      if (isEditMode && selectedProduct) {
        await updateDoc(doc(db, 'products', selectedProduct.id), productData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
      
      setIsModalOpen(false);
      resetForm();
      toast.success(isEditMode ? 'Gestionate Fácil: Producto actualizado' : 'Gestionate Fácil: Producto creado');
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(`Gestionate Fácil: Error al guardar producto: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveNewSupplier = async () => {
    if (!newSupplierData.name.trim() || !currentUser) return;
    setIsUploading(true);
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...newSupplierData,
        type: 'Proveedor',
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        spent: 0,
        status: 'Activo'
      });
      setFormData({ ...formData, supplier: newSupplierData.name });
      setIsAddingSupplier(false);
      setNewSupplierData({ name: '', phone: '', email: '' });
      toast.success('Gestionate Fácil: Proveedor añadido con éxito');
    } catch (e) {
      console.error("Error creating supplier:", e);
      toast.error(`Gestionate Fácil: Error al crear proveedor: ${e.message || 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveQuickItem = async (type) => {
    if (!quickItemData.name.trim() || !currentUser) return;
    setIsUploading(true);
    try {
      let imageUrl = '';
      let imagePath = '';

      if (quickItemFile) {
        const folder = type === 'category' ? 'categories' : 'brands';
        const path = generateUniquePath(currentUser.uid, folder, quickItemFile.name);
        imageUrl = await uploadFile(quickItemFile, path);
        imagePath = path;
      }

      const collName = type === 'category' ? 'product_categories' : 'product_brands';
      await addDoc(collection(db, collName), {
        name: quickItemData.name.trim(),
        description: (quickItemData.description || '').trim(),
        imageUrl,
        imagePath,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      setFormData({ ...formData, [type]: quickItemData.name.trim() });
      setQuickItemData({ name: '', description: '' });
      setQuickItemFile(null);
      setQuickItemPreview(null);
      if (type === 'category') setIsAddingCategory(false);
      else setIsAddingBrand(false);
      toast.success(`Gestionate Fácil: ${type === 'category' ? 'Categoría' : 'Marca'} creada y vinculada`);
    } catch (e) {
      console.error(`Error in handleSaveQuickItem (${type}):`, e);
      toast.error(`Gestionate Fácil: Error al crear ítem rápido: ${e.message || 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const product = inventory.find(p => p.id === itemToDelete);
      if (product && product.imagePath) await deleteFile(product.imagePath);
      await deleteDoc(doc(db, 'products', itemToDelete));
      setIsConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Gestionate Fácil: Error al eliminar producto");
    }
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      stock: product.stock !== undefined ? product.stock.toString() : '0',
      minStock: product.minStock !== undefined ? product.minStock.toString() : '0',
      costPrice: product.costPrice || '',
      sellingPrice: product.sellingPrice || '',
      brand: product.brand || '',
      category: product.category || '',
      supplier: product.supplier || '',
      isActive: product.isActive !== undefined ? product.isActive : true,
      size: product.size || '',
      color: product.color || '',
      hasVariants: product.hasVariants || false,
      variantOptions: product.variantOptions || [],
      variants: product.variants || [],
      showInCatalog: product.showInCatalog !== false,
      stockAlertEnabled: product.stockAlertEnabled || false
    });
    setImagePreview(product.imageUrl || null);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    resetForm();
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openViewModal = (product) => {
    setViewProduct(product);
    setIsViewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      name: '', description: '', stock: '', minStock: '0', costPrice: '', sellingPrice: '', 
      brand: '', category: '', supplier: '', isActive: true, showInCatalog: true, 
      size: '', color: '', hasVariants: false, variantOptions: [], variants: [],
      stockAlertEnabled: false 
    });
    setSelectedProduct(null);
    setImageFile(null);
    setImagePreview(null);
    setIsAddingSupplier(false);
    setIsAddingCategory(false);
    setIsAddingBrand(false);
    setNewSupplierData({ name: '', phone: '', email: '' });
    setQuickItemData({ name: '', description: '' });
    setQuickItemFile(null);
    setQuickItemPreview(null);
  };

  const exportToCSV = () => {
    const csvData = inventory.map(item => ({
      'Nombre': item.name || '',
      'Stock': item.stock || 0,
      'Stock Minimo': item.minStock || 0,
      'Precio Costo': item.costPrice || '',
      'Precio Venta': item.sellingPrice || '',
      'Marca': item.brand || '',
      'Categoria': item.category || '',
      'Proveedor': item.supplier || '',
      'Activo': item.isActive !== false ? 'Si' : 'No',
      'Tamaño': item.size || '',
      'Color': item.color || ''
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: function(h) {
        // Remove invisibles, trim, lower case, remove accents
        let lower = h.trim().replace(/^\uFEFF/, '').toLowerCase();
        lower = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
        return lower;
      },
      complete: (results) => {
        // En tu archivo puede venir "name" o "nombre"
        const validData = results.data.filter(row => row.nombre || row.name);
        if (validData.length > 0) {
          const formattedData = validData.map(row => ({
            name: row.nombre || row.name || '',
            stock: row.stock || row.cantidad || 0,
            minStock: row['stock minimo'] || row.lowstockthreshold || 0,
            costPrice: row['precio costo'] || row.costprice || '',
            sellingPrice: row['precio venta'] || row.sellingprice || '',
            brand: row.marca || row.brand || '',
            category: row.categoria || row.category || '',
            supplier: row.proveedor || row.supplier || '',
            isActive: (row.activo || row.isactive || '').toString().toLowerCase() !== 'no' && (row.activo || row.isactive || '').toString().toLowerCase() !== 'false',
            size: row.tamano || row.size || '',
            color: row.color || ''
          }));
          setParsedData(formattedData);
          setIsImportConfirmOpen(true);
        } else {
          console.error("Columnas detectadas en el CSV:", results.meta.fields);
          toast.error('Gestionate Fácil: El archivo no tiene el formato correcto. Asegúrate de incluir la columna "Nombre" o "Name".');
        }
        e.target.value = null;
      }
    });
  };

  const confirmImport = async () => {
    if (!parsedData.length || !currentUser) return;
    setIsUploading(true);
    try {
      for (const row of parsedData) {
        const existingProduct = inventory.find(p => p.name.toLowerCase() === row.name.toLowerCase());
        const productData = {
          name: row.name,
          stock: parseInt(row.stock) || 0,
          minStock: parseInt(row.minStock) || 0,
          costPrice: row.costPrice,
          sellingPrice: row.sellingPrice,
          brand: row.brand,
          category: row.category,
          supplier: row.supplier,
          isActive: row.isActive,
          size: row.size,
          color: row.color,
        };

        if (existingProduct) {
          await updateDoc(doc(db, 'products', existingProduct.id), {
            ...productData,
            updatedAt: serverTimestamp()
          });
        } else {
          await addDoc(collection(db, 'products'), {
            ...productData,
            userId: currentUser.uid,
            createdAt: serverTimestamp()
          });
        }
      }
      setIsImportConfirmOpen(false);
      setParsedData([]);
      toast.success(`Gestionate Fácil: ¡Se procesaron ${parsedData.length} productos con éxito!`);
    } catch (error) {
      console.error("Error al importar:", error);
      toast.error('Gestionate Fácil: Hubo un error al importar los productos.');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, isCriticalFilterActive]);

  const filteredInventory = (sortedInventory || []).filter(item => {
    if (!item) return false;
    
    const searchLower = String(searchTerm || '').toLowerCase().trim();
    const name = String(item.name || '').toLowerCase();
    const category = String(item.category || '').toLowerCase();
    const brand = String(item.brand || '').toLowerCase();
    const supplier = String(item.supplier || '').toLowerCase();

    const matchesSearch = !searchLower || 
      name.includes(searchLower) || 
      category.includes(searchLower) || 
      brand.includes(searchLower) ||
      supplier.includes(searchLower);
    
    // Filtro por categoría seleccionada
    const matchesCategory = !selectedCategory || String(item.category || '') === selectedCategory;

    if (isCriticalFilterActive) {
      const stock = parseInt(item.stock) || 0;
      const minStock = parseInt(item.minStock) || 0;
      const isCritical = item.stockAlertEnabled && stock < minStock;
      return matchesSearch && matchesCategory && isCritical;
    }
    
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const paginatedInventory = filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalProducts = (sortedInventory || []).length;
  const criticalStock = (sortedInventory || []).filter(item => 
    item && item.stockAlertEnabled && (parseInt(item.stock) || 0) < (parseInt(item.minStock) || 0)
  ).length;
  
  // New Analytics
  const totalCostValue = (sortedInventory || []).reduce((acc, item) => {
    if (!item) return acc;
    const cost = parseCurrency(item.costPrice);
    return acc + (cost * (parseInt(item.stock) || 0));
  }, 0);

  const totalExpectedProfit = (sortedInventory || []).reduce((acc, item) => {
    if (!item) return acc;
    const cost = parseCurrency(item.costPrice);
    const selling = parseCurrency(item.sellingPrice);
    const profitPerUnit = selling - cost;
    return acc + (profitPerUnit * (parseInt(item.stock) || 0));
  }, 0);

  const totalInventoryValue = totalCostValue + totalExpectedProfit;

  const openAdjustModal = (item) => {
    setAdjustProduct(item);
    if (item.hasVariants) {
      setAdjustVariantsTemp(item.variants ? JSON.parse(JSON.stringify(item.variants)) : []);
      setAdjustStockTemp('');
    } else {
      setAdjustStockTemp(item.stock?.toString() || '0');
      setAdjustVariantsTemp([]);
    }
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!adjustProduct || !currentUser) return;
    setIsUploading(true);
    try {
      const productRef = doc(db, 'products', adjustProduct.id);
      
      if (adjustProduct.hasVariants) {
        const newTotalStock = adjustVariantsTemp.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0);
        await updateDoc(productRef, {
          variants: adjustVariantsTemp,
          stock: newTotalStock,
          updatedAt: serverTimestamp()
        });
      } else {
        const newStock = parseInt(adjustStockTemp) || 0;
        await updateDoc(productRef, {
          stock: newStock,
          updatedAt: serverTimestamp()
        });
      }
      
      toast.success('Gestionate Fácil: Stock actualizado correctamente');
      setIsAdjustModalOpen(false);
    } catch (error) {
      console.error('Error updating stock', error);
      toast.error('Gestionate Fácil: Error al actualizar el stock');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="inventario-container animate-fade-in">
      <header className="premium-header">
        <div className="header-main">
           <div className="header-icon-box">
              <Package size={28} className="text-primary" />
           </div>
           <div>
              <h1 className="header-title flex-center gap-3">
                 Gestión de Inventario
                 {criticalStock > 0 && (
                   <span 
                     className={`premium-critical-badge ${isCriticalFilterActive ? 'active' : ''}`}
                     onClick={() => setIsCriticalFilterActive(!isCriticalFilterActive)}
                   >
                     <AlertTriangle size={14} />
                     <span>{criticalStock} ALERTAS</span>
                   </span>
                 )}
              </h1>
              <p className="header-subtitle">Control total de stock, alertas y valoración en tiempo real</p>
           </div>
        </div>
        
        <div className="header-actions">
          <div className="secondary-actions">
            <button className="premium-btn-outline" onClick={() => setIsCatalogModalOpen(true)} title="Catálogo Digital">
              <QrCode size={18} />
              <span>Catálogo</span>
            </button>
            <button className="premium-btn-outline" onClick={exportToCSV} title="Exportar CSV">
              <Download size={18} />
              <span>Exportar</span>
            </button>
            <button className="premium-btn-outline" onClick={() => fileInputRef.current?.click()} title="Importar CSV">
              <UploadCloud size={18} />
              <span>Importar</span>
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
          </div>

          <button className="premium-btn-primary" onClick={openAddModal}>
            <Plus size={20} />
            <span>Añadir Producto</span>
          </button>
        </div>
      </header>

      <InventarioStats 
        loading={loading}
        totalCostValue={totalCostValue}
        totalInventoryValue={totalInventoryValue}
        totalExpectedProfit={totalExpectedProfit}
      />

      <div className="main-inv-panel premium-panel-container">
        <div className="premium-toolbar">
          {isCriticalFilterActive && (
            <div className="critical-stock-alert animate-in">
               <div className="alert-content">
                  <AlertTriangle size={18} />
                  <span>Modo Filtro: Stock Crítico ({filteredInventory.length} productos)</span>
               </div>
               <button className="close-alert-btn" onClick={() => setIsCriticalFilterActive(false)}>Desactivar Filtro</button>
            </div>
          )}
          
          <div className="toolbar-actions-row">
            <div className="premium-search-container">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                className="premium-search-input"
                placeholder="Buscar productos, categorías o marcas..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>
                   <X size={14} />
                </button>
              )}
            </div>

            <div className="filter-dropdown-wrapper" ref={filterMenuRef}>
              <button 
                className={`premium-filter-btn ${selectedCategory ? 'has-active' : ''}`}
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              >
                <div className="btn-inner">
                   <Filter size={18} />
                   <span>{selectedCategory || 'Filtrar por Categoría'}</span>
                   {isFilterMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
                {selectedCategory && <div className="active-dot" />}
              </button>

              {isFilterMenuOpen && (
                <div className="premium-dropdown animate-in">
                  <div className="dropdown-header">Categorías</div>
                  <button 
                    className={`dropdown-opt ${!selectedCategory ? 'selected' : ''}`} 
                    onClick={() => { setSelectedCategory(null); setIsFilterMenuOpen(false); }}
                  >
                    <Package size={14} /> Todas las existencias
                  </button>
                  <div className="dropdown-divider" />
                  {categories.sort((a,b) => a.name.localeCompare(b.name)).map(cat => (
                    <button 
                      key={cat.id} 
                      className={`dropdown-opt ${selectedCategory === cat.name ? 'selected' : ''}`}
                      onClick={() => { setSelectedCategory(cat.name); setIsFilterMenuOpen(false); }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <InventarioTable 
          loading={loading}
          paginatedInventory={paginatedInventory}
          openViewModal={openViewModal}
          openAdjustModal={openAdjustModal}
          openEditModal={openEditModal}
          handleDeleteClick={handleDeleteClick}
        />

        <div className="premium-pagination">
          <div className="pagination-info">
             <span className="total-count">Mostrando {paginatedInventory.length} de {filteredInventory.length} productos</span>
             <div className="page-size-selector">
                <label>Ver:</label>
                <select 
                  value={itemsPerPage === 999999 ? 'all' : itemsPerPage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemsPerPage(val === 'all' ? 999999 : parseInt(val));
                    setCurrentPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="all">Todos</option>
                </select>
             </div>
          </div>

          {totalPages > 1 && (
            <div className="pagination-nav">
              <button 
                className="nav-btn" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <div className="page-indicator">
                 Página <span>{currentPage}</span> de {totalPages}
              </div>
              <button 
                className="nav-btn" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Eliminar Producto" message="¿Estás seguro de que deseas eliminar este producto del inventario? Esta acción es permanente." />
      <ConfirmModal isOpen={isImportConfirmOpen} onClose={() => { setIsImportConfirmOpen(false); setParsedData([]); }} onConfirm={confirmImport} title="Confirmar Importación" message={`¿Estás seguro de que deseas importar/actualizar ${parsedData.length} productos desde este archivo CSV? Esta acción modificará tu base de datos y no se puede deshacer.`} />

      <StockAdjustModal 
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        adjustProduct={adjustProduct}
        adjustVariantsTemp={adjustVariantsTemp}
        setAdjustVariantsTemp={setAdjustVariantsTemp}
        adjustStockTemp={adjustStockTemp}
        setAdjustStockTemp={setAdjustStockTemp}
        handleSaveAdjustment={handleSaveAdjustment}
        loading={loading}
        isUploading={isUploading}
      />

      <ProductViewModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        product={viewProduct}
      />

      <CatalogModal 
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        catalogUrl={catalogUrl}
        handleCopyLink={handleCopyLink}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Editar Producto" : "Añadir Nuevo Producto"} className="wide-modal">
        <ProductForm 
          formData={formData}
          setFormData={setFormData}
          isEditMode={isEditMode}
          isUploading={isUploading}
          handleSubmit={handleSubmit}
          brands={brands}
          isAddingBrand={isAddingBrand}
          setIsAddingBrand={setIsAddingBrand}
          categories={categories}
          isAddingCategory={isAddingCategory}
          setIsAddingCategory={setIsAddingCategory}
          suppliers={suppliers}
          isAddingSupplier={isAddingSupplier}
          setIsAddingSupplier={setIsAddingSupplier}
          newSupplierData={newSupplierData}
          setNewSupplierData={setNewSupplierData}
          handleSaveNewSupplier={handleSaveNewSupplier}
          handleSaveQuickItem={handleSaveQuickItem}
          quickItemData={quickItemData}
          setQuickItemData={setQuickItemData}
          quickItemPreview={quickItemPreview}
          setQuickItemPreview={setQuickItemPreview}
          handleQuickFileChange={handleQuickFileChange}
          imagePreview={imagePreview}
          removeSelectedImage={removeSelectedImage}
          handleFileChange={handleFileChange}
          imageFile={imageFile}
          editingOptionIdx={editingOptionIdx}
          setEditingOptionIdx={setEditingOptionIdx}
          handleVariantOptionsChange={handleVariantOptionsChange}
          expandedGroups={expandedGroups}
          toggleGroupExpansion={toggleGroupExpansion}
          handleVariantImageUpload={handleVariantImageUpload}
          setIsModalOpen={setIsModalOpen}
        />
      </Modal>

    </div>
  );
}
