import React from 'react';
import { 
  Camera, X, Plus, GripVertical, ChevronUp, ChevronDown, 
  Trash2, Package, Layers, Info, Tag, Bookmark, Truck, 
  DollarSign, Hash, AlertCircle, Image as ImageIcon,
  Settings, CheckCircle2
} from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

export function ProductForm({
  formData,
  setFormData,
  isEditMode,
  isUploading,
  handleSubmit,
  brands,
  isAddingBrand,
  setIsAddingBrand,
  categories,
  isAddingCategory,
  setIsAddingCategory,
  suppliers,
  isAddingSupplier,
  setIsAddingSupplier,
  newSupplierData,
  setNewSupplierData,
  handleSaveNewSupplier,
  handleSaveQuickItem,
  quickItemData,
  setQuickItemData,
  quickItemPreview,
  setQuickItemPreview,
  handleQuickFileChange,
  imagePreview,
  removeSelectedImage,
  handleFileChange,
  imageFile,
  editingOptionIdx,
  setEditingOptionIdx,
  handleVariantOptionsChange,
  expandedGroups,
  toggleGroupExpansion,
  handleVariantImageUpload,
  setIsModalOpen
}) {
  
  const parseCurrency = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/[$\s.]/g, '').replace(',', '.')) || 0;
  };

  const handleAddTalleInternal = (colorName, value, colorVariants) => {
    const val = value.trim();
    if (!val) return false;
    
    const existing = colorVariants.find(cv => cv.attributes.Talle === val);
    if (existing) {
      toast.error('Este talle ya existe para este color');
      return false;
    }

    const newId = `Color-${colorName}_Talle-${val}`;
    const newVariant = {
      id: newId,
      attributes: { Color: colorName, Talle: val },
      stock: 0,
      price: colorVariants[0]?.price || formData.sellingPrice || '',
      imageUrl: colorVariants[0]?.imageUrl || '',
      imagePath: colorVariants[0]?.imagePath || ''
    };

    const newOpts = [...(formData.variantOptions || [])];
    let talleOpt = newOpts.find(o => o.name === 'Talle');
    if (!talleOpt) {
      talleOpt = { name: 'Talle', values: [] };
      newOpts.push(talleOpt);
    }
    if (!talleOpt.values.includes(val)) talleOpt.values.push(val);

    setFormData({
      ...formData,
      variantOptions: newOpts,
      variants: [...formData.variants, newVariant]
    });
    return true;
  };

  const handleAddColorInternal = (value, groups) => {
    const val = value.trim();
    if (!val) return false;
    if (groups[val]) {
      toast.error('Este color ya existe');
      return false;
    }

    const newId = `Color-${val}_Talle-Base`;
    const newVariant = {
      id: newId,
      attributes: { Color: val, Talle: '' },
      stock: 0,
      price: formData.sellingPrice || '',
      imageUrl: '',
      imagePath: ''
    };

    const newOpts = [...(formData.variantOptions || [])];
    let colorOpt = newOpts.find(o => o.name === 'Color');
    if (!colorOpt) {
      colorOpt = { name: 'Color', values: [] };
      newOpts.push(colorOpt);
    }
    if (!colorOpt.values.includes(val)) colorOpt.values.push(val);

    setFormData({
      ...formData,
      variantOptions: newOpts,
      variants: [...(formData.variants || []), newVariant]
    });
    return true;
  };

  return (
    <div className="premium-form-wrapper">
      <form className="premium-form-layout" onSubmit={handleSubmit}>
        
        {/* Header de Sección: Información General */}
        <div className="form-section-header">
           <div className="section-icon"><Info size={18} /></div>
           <div className="section-text">
              <h3>Información General</h3>
              <p>Datos principales y clasificación del producto</p>
           </div>
        </div>

        <div className="premium-grid-main">
          {/* Lado Izquierdo: Datos y Clasificación */}
          <div className="premium-column">
            <div className="premium-field-group">
              <label className="premium-label">
                <Tag size={14} /> Nombre del Producto
              </label>
              <div className="premium-input-wrapper">
                <input
                  type="text"
                  className="premium-input"
                  required
                  placeholder="Ej: Teclado Mecánico RGB Pro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="premium-field-group">
              <label className="premium-label">Descripción del Producto</label>
              <div className="premium-input-wrapper">
                <textarea
                  className="premium-input"
                  rows="3"
                  placeholder="Describa las características, materiales, usos, etc."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ resize: 'none', minHeight: '80px', padding: '0.75rem' }}
                />
              </div>
            </div>

            <div className="premium-field-group">
              <label className="premium-label">Estado del Producto</label>
              <div 
                className={`stock-alert-toggle ${formData.isActive ? 'active' : ''}`}
                onClick={() => setFormData({...formData, isActive: !formData.isActive})}
              >
                 <div className={`premium-switch small ${formData.isActive ? 'on' : ''}`}>
                    <div className="switch-knob" />
                 </div>
                 <span className="toggle-label">{formData.isActive ? 'Producto Activo' : 'Producto Inactivo'}</span>
              </div>
            </div>

            <div className="premium-row">
              <div className="premium-field-group flex-1">
                <label className="premium-label">
                  <Bookmark size={14} /> Marca
                </label>
                {!isAddingBrand ? (
                  <div className="premium-select-wrapper">
                    <select
                      className="premium-select"
                      value={formData.brand}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') setIsAddingBrand(true);
                        else setFormData({ ...formData, brand: e.target.value });
                      }}
                    >
                      <option value="">Sin Marca</option>
                      {brands.sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                      <option value="ADD_NEW" className="add-new-option">+ Nueva Marca</option>
                    </select>
                  </div>
                ) : (
                  <div className="quick-add-bubble animate-in">
                    <div className="bubble-header">
                      <span>Nueva Marca</span>
                      <X size={14} onClick={() => setIsAddingBrand(false)} />
                    </div>
                    <div className="bubble-content">
                       <div className="quick-img-upload">
                          {quickItemPreview ? <img src={quickItemPreview} alt="" /> : <Camera size={14} />}
                          <input type="file" onChange={handleQuickFileChange} />
                       </div>
                       <input 
                         className="bubble-input" 
                         placeholder="Nombre..." 
                         autoFocus 
                         value={quickItemData.name}
                         onChange={e => setQuickItemData({...quickItemData, name: e.target.value})}
                       />
                       <button type="button" className="bubble-btn" onClick={() => handleSaveQuickItem('brand')}>OK</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="premium-field-group flex-1">
                <label className="premium-label">
                  <Layers size={14} /> Categoría
                </label>
                {!isAddingCategory ? (
                  <div className="premium-select-wrapper">
                    <select
                      className="premium-select"
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') setIsAddingCategory(true);
                        else setFormData({ ...formData, category: e.target.value });
                      }}
                    >
                      <option value="">Sin Categoría</option>
                      {categories.sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      <option value="ADD_NEW" className="add-new-option">+ Nueva Categoría</option>
                    </select>
                  </div>
                ) : (
                  <div className="quick-add-bubble animate-in">
                    <div className="bubble-header">
                      <span>Nueva Categoría</span>
                      <X size={14} onClick={() => setIsAddingCategory(false)} />
                    </div>
                    <div className="bubble-content">
                       <input 
                         className="bubble-input" 
                         placeholder="Nombre..." 
                         autoFocus 
                         value={quickItemData.name}
                         onChange={e => setQuickItemData({...quickItemData, name: e.target.value})}
                       />
                       <button type="button" className="bubble-btn" onClick={() => handleSaveQuickItem('category')}>OK</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="premium-field-group">
              <label className="premium-label">
                <Truck size={14} /> Proveedor Principal
              </label>
              {!isAddingSupplier ? (
                <div className="flex gap-2">
                  <div className="premium-select-wrapper flex-1">
                    <select
                      className="premium-select"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    >
                      <option value="">Sin Proveedor</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="premium-icon-btn" onClick={() => setIsAddingSupplier(true)}>
                    <Plus size={18} />
                  </button>
                </div>
              ) : (
                <div className="quick-add-bubble full animate-in">
                   <div className="bubble-header">
                      <span>Nuevo Proveedor</span>
                      <X size={14} onClick={() => setIsAddingSupplier(false)} />
                    </div>
                    <div className="bubble-content grid-2">
                       <input className="bubble-input" placeholder="Nombre..." value={newSupplierData.name} onChange={e => setNewSupplierData({...newSupplierData, name: e.target.value})} />
                       <input className="bubble-input" placeholder="Teléfono..." value={newSupplierData.phone} onChange={e => setNewSupplierData({...newSupplierData, phone: e.target.value})} />
                       <button type="button" className="bubble-btn col-span-2" onClick={handleSaveNewSupplier}>Guardar Proveedor</button>
                    </div>
                </div>
              )}
            </div>
          </div>

          {/* Lado Derecho: Multimedia y Precios Rápidos */}
          <div className="premium-column multimedia-col">
             <div className="premium-card image-card">
                <label className="premium-label mb-3"><ImageIcon size={14} /> Galería del Producto</label>
                <div className={`premium-dropzone ${imagePreview ? 'has-image' : ''}`}>
                   {imagePreview ? (
                      <div className="image-overlay-wrapper">
                         <img src={imagePreview} alt="Preview" />
                         <div className="image-actions">
                            <button type="button" className="action-btn delete" onClick={removeSelectedImage}><Trash2 size={16} /></button>
                            <div className="change-hint">Click para cambiar</div>
                         </div>
                         <input type="file" accept="image/*" onChange={handleFileChange} />
                      </div>
                   ) : (
                      <div className="dropzone-placeholder">
                         <div className="icon-circle"><Camera size={24} /></div>
                         <p className="main-text">Subir Imagen Principal</p>
                         <p className="sub-text">Formatos sugeridos: JPG, PNG, WEBP</p>
                         <input type="file" accept="image/*" onChange={handleFileChange} />
                      </div>
                   )}
                </div>
             </div>

             <div className="premium-card pricing-card">
                <div className="pricing-grid-3">
                   <div className="premium-field-group">
                      <label className="premium-label"><DollarSign size={14} /> Costo</label>
                      <div className="premium-currency-input">
                         <span>$</span>
                         <input type="text" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} placeholder="0.00" />
                      </div>
                   </div>
                   <div className="premium-field-group">
                      <label className="premium-label"><CheckCircle2 size={14} /> Venta</label>
                      <div className="premium-currency-input highlighted">
                         <span>$</span>
                         <input type="text" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} placeholder="0.00" />
                      </div>
                   </div>
                   <div className="premium-field-group">
                      <label className="premium-label">Análisis de Margen</label>
                      <div className={`margin-badge-vibrant ${
                        (parseCurrency(formData.sellingPrice) - parseCurrency(formData.costPrice)) >= 0 ? 'success' : 'danger'
                      }`}>
                         {formData.costPrice && formData.sellingPrice ? (
                           <>
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] uppercase font-bold opacity-60">Rentabilidad:</span>
                               <span className="percent">
                                 {((parseCurrency(formData.sellingPrice) - parseCurrency(formData.costPrice)) / (parseCurrency(formData.costPrice) || 1) * 100).toFixed(0)}%
                               </span>
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] uppercase font-bold opacity-60">Ganancia:</span>
                               <span className="amount">
                                 ${(parseCurrency(formData.sellingPrice) - parseCurrency(formData.costPrice)).toLocaleString()}
                               </span>
                             </div>
                           </>
                         ) : <span className="opacity-40 text-xs">Ingrese precios para calcular</span>}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Header de Sección: Stock y Logística */}
        <div className="form-section-header mt-8">
           <div className="section-icon"><Package size={18} /></div>
           <div className="section-text">
              <h3>Stock y Logística</h3>
              <p>Control de existencias y alertas de reposición</p>
           </div>
        </div>

        <div className="premium-grid-logistics">
           <div className="premium-field-group">
              <label className="premium-label"><Hash size={14} /> Stock Actual</label>
              <div className="premium-input-wrapper">
                 <input 
                   type="number" 
                   className="premium-input" 
                   disabled={formData.hasVariants}
                   value={formData.hasVariants ? (formData.variants || []).reduce((a, b) => a + (parseInt(b.stock) || 0), 0) : formData.stock}
                   onChange={e => !formData.hasVariants && setFormData({...formData, stock: e.target.value})}
                 />
                 {formData.hasVariants && <div className="input-hint">Calculado automáticamente por variantes</div>}
              </div>
           </div>

           <div className="premium-field-group">
              <label className="premium-label">
                <AlertCircle size={14} /> Alerta de Stock
              </label>
              <div 
                className={`stock-alert-toggle ${formData.stockAlertEnabled ? 'active' : ''}`}
                onClick={() => setFormData({...formData, stockAlertEnabled: !formData.stockAlertEnabled})}
              >
                 <div className={`premium-switch small ${formData.stockAlertEnabled ? 'on' : ''}`}>
                    <div className="switch-knob" />
                 </div>
                 <span className="toggle-label">{formData.stockAlertEnabled ? 'Activada' : 'Desactivada'}</span>
              </div>
           </div>

           <div className={`premium-field-group ${!formData.stockAlertEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
              <label className="premium-label">Stock Mínimo</label>
              <div className="premium-input-wrapper">
                 <input 
                   type="number" 
                   className="premium-input warning" 
                   value={formData.minStock}
                   disabled={!formData.stockAlertEnabled}
                   onChange={e => setFormData({...formData, minStock: e.target.value})}
                 />
              </div>
           </div>

           {!formData.hasVariants && (
             <>
               <div className="premium-field-group">
                  <label className="premium-label">Talle / Medida</label>
                  <input className="premium-input" placeholder="Ej: XL, 42" value={formData.size || ''} onChange={e => setFormData({...formData, size: e.target.value})} />
               </div>
               <div className="premium-field-group">
                  <label className="premium-label">Color</label>
                  <input className="premium-input" placeholder="Ej: Negro" value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})} />
               </div>
             </>
           )}
        </div>

        {/* Sección de Variantes con Estilo Profesional */}
        <div className="premium-variants-module">
           <div 
             className={`variants-toggle-card ${formData.hasVariants ? 'active' : ''}`}
             onClick={() => setFormData({...formData, hasVariants: !formData.hasVariants})}
           >
              <div className="toggle-info">
                 <div className={`status-dot ${formData.hasVariants ? 'on' : ''}`} />
                 <div>
                    <h4>Gestionar Variantes Complejas</h4>
                    <p>Activa para definir talles, colores, materiales o packs específicos.</p>
                 </div>
              </div>
              <div className="toggle-action">
                 <div className={`premium-switch ${formData.hasVariants ? 'on' : ''}`}>
                    <div className="switch-knob" />
                 </div>
              </div>
           </div>

           {formData.hasVariants && (
              <div className="variants-unified-manager mt-6">
                    <div className="manager-header mb-6">
                       <div className="flex items-center gap-3">
                          <div className="icon-badge"><Layers size={20} /></div>
                          <div>
                             <h4 className="text-lg font-bold">Gestión de Colores y Talles</h4>
                             <p className="text-sm opacity-60">Agregue colores, sus fotos y los talles disponibles para cada uno.</p>
                          </div>
                       </div>
                       <div className="total-badge-vibrant">
                          STOCK TOTAL: <span>{(formData.variants || []).reduce((a, b) => a + (parseInt(b.stock) || 0), 0)}</span>
                       </div>
                    </div>

                    <div className="colors-container">
                       {(() => {
                         // Grouping by Color
                         const groups = {};
                         (formData.variants || []).forEach((v, idx) => {
                           const color = v.attributes.Color || 'Sin Color';
                           if (!groups[color]) groups[color] = [];
                           groups[color].push({ ...v, idx });
                         });

                         return (
                           <div className="color-groups-list">
                              {Object.entries(groups).map(([colorName, colorVariants]) => {
                                const totalColorStock = colorVariants.reduce((a, b) => a + (parseInt(b.stock) || 0), 0);
                                return (
                                  <div key={colorName} className="unified-color-card animate-in">
                                     <div className="color-card-sidebar">
                                        <div className="color-photo-uploader">
                                           {colorVariants[0].imageUrl ? (
                                             <div className="photo-preview">
                                                <img src={colorVariants[0].imageUrl} alt={colorName} />
                                                <div className="photo-overlay">
                                                   <Camera size={18} />
                                                   <input type="file" onChange={e => handleVariantImageUpload(e.target.files[0], colorVariants[0].id)} />
                                                </div>
                                             </div>
                                           ) : (
                                             <div className="photo-placeholder">
                                                <Camera size={28} />
                                                <span>Subir Foto</span>
                                                <input type="file" onChange={e => handleVariantImageUpload(e.target.files[0], colorVariants[0].id)} />
                                             </div>
                                           )}
                                        </div>
                                        <div className="color-identity">
                                           <span className="label">Color</span>
                                           <h5 className="name">{colorName}</h5>
                                        </div>
                                        <div className="color-total-stock">
                                           <span className="label">Stock Total</span>
                                           <span className="value">{totalColorStock}</span>
                                        </div>
                                        <button 
                                          type="button" 
                                          className="remove-color-btn"
                                          onClick={() => {
                                            const newV = formData.variants.filter(v => v.attributes.Color !== colorName);
                                            const newOpts = [...formData.variantOptions];
                                            const colorOpt = newOpts.find(o => o.name === 'Color');
                                            if (colorOpt) {
                                              colorOpt.values = colorOpt.values.filter(v => v !== colorName);
                                            }
                                            setFormData({ ...formData, variants: newV, variantOptions: newOpts });
                                          }}
                                        >
                                           <Trash2 size={14} /> Eliminar Color
                                        </button>
                                     </div>

                                     <div className="color-card-content">
                                        <div className="talles-header">
                                           <span className="col-talle">Talle / Medida</span>
                                           <span className="col-price">Precio</span>
                                           <span className="col-stock">Stock</span>
                                           <span className="col-action"></span>
                                        </div>
                                        <div className="talles-list">
                                           {colorVariants.map((v) => (
                                             <div key={v.id} className="talle-row animate-in">
                                                <div className="talle-name">{v.attributes.Talle || 'Único'}</div>
                                                <div className="talle-price">
                                                   <div className="mini-currency-input">
                                                      <span>$</span>
                                                      <input 
                                                        type="text" 
                                                        value={v.price} 
                                                        placeholder="0.00"
                                                        onChange={e => {
                                                           const newV = [...formData.variants];
                                                           newV[v.idx].price = e.target.value;
                                                           setFormData({...formData, variants: newV});
                                                        }} 
                                                      />
                                                   </div>
                                                </div>
                                                <div className="talle-stock">
                                                   <input 
                                                     type="number" 
                                                     className="mini-input" 
                                                     value={v.stock} 
                                                     onChange={e => {
                                                        const newV = [...formData.variants];
                                                        newV[v.idx].stock = e.target.value;
                                                        setFormData({...formData, variants: newV});
                                                     }} 
                                                   />
                                                </div>
                                                <div className="talle-action">
                                                   <button 
                                                     type="button" 
                                                     className="delete-talle"
                                                     onClick={() => {
                                                       const newV = formData.variants.filter(varnt => varnt.id !== v.id);
                                                       setFormData({...formData, variants: newV});
                                                     }}
                                                   >
                                                      <Trash2 size={16} />
                                                   </button>
                                                </div>
                                             </div>
                                           ))}
                                        </div>
                                        
                                        <div className="add-talle-form mt-4 flex items-center gap-2">
                                            <input 
                                              type="text" 
                                              className="flex-1"
                                              placeholder="Nuevo talle (ej: 39, M...)" 
                                              id={`new-talle-${colorName}`}
                                              onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const val = e.target.value.trim();
                                                  const success = handleAddTalleInternal(colorName, val, colorVariants);
                                                  if (success) e.target.value = '';
                                                }
                                              }}
                                            />
                                            <button 
                                              type="button" 
                                              className="add-btn-mini"
                                              onClick={() => {
                                                const input = document.getElementById(`new-talle-${colorName}`);
                                                const val = input.value.trim();
                                                const success = handleAddTalleInternal(colorName, val, colorVariants);
                                                if (success) input.value = '';
                                              }}
                                            >
                                              <Plus size={16} />
                                            </button>
                                         </div>
                                         <p className="hint">Presione Enter o el botón + para añadir talle</p>
                                     </div>
                                  </div>
                                );
                              })}

                              <div className="add-color-section">
                                 <div className="add-color-input flex items-center gap-2">
                                     <Tag size={16} />
                                     <input 
                                       type="text" 
                                       id="new-color-input"
                                       placeholder="Añadir nuevo color (ej: Negro, Verde...)" 
                                       onKeyDown={e => {
                                         if (e.key === 'Enter') {
                                           e.preventDefault();
                                           const val = e.target.value.trim();
                                           const success = handleAddColorInternal(val, groups);
                                           if (success) e.target.value = '';
                                         }
                                       }}
                                     />
                                     <button 
                                       type="button" 
                                       className="add-btn-mini"
                                       onClick={() => {
                                         const input = document.getElementById('new-color-input');
                                         const val = input.value.trim();
                                         const success = handleAddColorInternal(val, groups);
                                         if (success) input.value = '';
                                       }}
                                     >
                                       <Plus size={16} />
                                     </button>
                                  </div>
                              </div>
                           </div>
                         );
                       })()}
                    </div>
                 </div>
           )}
        </div>

        <div className="premium-form-footer">
           <div className="footer-info">
              <AlertCircle size={16} className="text-primary" />
              <span>Los campos marcados son obligatorios para el control de inventario.</span>
           </div>
           <div className="footer-actions">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isUploading}>Descartar</Button>
              <Button variant="primary" type="submit" isLoading={isUploading} className="save-btn">
                 {isEditMode ? 'Actualizar Producto' : 'Publicar Producto'}
              </Button>
           </div>
        </div>
      </form>
    </div>
  );
}
