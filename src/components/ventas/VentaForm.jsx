import { Plus, Trash2, Paperclip, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { ProductSelector } from '../ui/ProductSelector';

export function VentaForm({
  formData,
  setFormData,
  isEditMode,
  isSaving,
  isAddingClient,
  setIsAddingClient,
  newClientData,
  setNewClientData,
  handleSaveNewClient,
  clientsList,
  resellersList,
  productsList,
  bankAccounts,
  isAddingBank,
  setIsAddingBank,
  newBankName,
  setNewBankName,
  handleSaveNewBank,
  handleGlobalChange,
  addItem,
  removeItem,
  updateItem,
  handleSaveWithStatus,
  setComprobanteFile,
  comprobanteFile,
  setIsModalOpen
}) {
  return (
    <form className="invoice-form">
      <div className="invoice-header-grid">
        <div className="form-group" style={{ position: 'relative', gridColumn: isAddingClient ? '1 / -1' : 'auto' }}>
          {!isAddingClient && <label>Cliente</label>}
          {!isAddingClient ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                className="form-input"
                value={formData.clienteId}
                onChange={(e) => {
                  const idx = e.target.selectedIndex;
                  const cName = e.target.options[idx].text;
                  setFormData((prev) => ({ ...prev, clienteId: e.target.value, clienteName: cName }));
                }}
                required
                style={{ flex: 1 }}
              >
                <option value="" disabled>Seleccionar Cliente...</option>
                {clientsList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-outline"
                style={{ padding: '0 0.8rem' }}
                onClick={() => setIsAddingClient(true)}
                title="Añadir nuevo cliente rápido"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--primary-color, rgba(255,255,255,0.2))' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--text-main)' }}>Crear Nuevo Cliente</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Razón Social / Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                    autoFocus
                    placeholder="Ej: Acero S.A."
                  />
                </div>
                {/* ... other fields ... */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>RUT / DNI / CUIT</label>
                  <input type="text" className="form-input" value={newClientData.documentId} onChange={e => setNewClientData({...newClientData, documentId: e.target.value})} placeholder="Opcional" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Persona / Contacto</label>
                  <input type="text" className="form-input" value={newClientData.contact} onChange={e => setNewClientData({...newClientData, contact: e.target.value})} placeholder="Ej: Juan" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Teléfono</label>
                  <input type="text" className="form-input" value={newClientData.phone} onChange={e => setNewClientData({...newClientData, phone: e.target.value})} placeholder="Opcional" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Email</label>
                  <input type="email" className="form-input" value={newClientData.email} onChange={e => setNewClientData({...newClientData, email: e.target.value})} placeholder="Opcional" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Dirección</label>
                  <input type="text" className="form-input" value={newClientData.address} onChange={e => setNewClientData({...newClientData, address: e.target.value})} placeholder="Opcional" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <button type="button" className="btn-outline" onClick={() => setIsAddingClient(false)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={handleSaveNewClient} disabled={!newClientData.name.trim()}>Guardar y Seleccionar</button>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Revendedor (Opcional)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              className="form-input"
              value={formData.resellerId}
              onChange={(e) => {
                const idx = e.target.selectedIndex;
                const rName = e.target.options[idx].text;
                setFormData((prev) => ({ ...prev, resellerId: e.target.value, resellerName: rName }));
              }}
              style={{ flex: 1 }}
            >
              <option value="">Ninguno</option>
              {resellersList.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '0 0.5rem', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
              <input
                type="number"
                className="form-input"
                style={{ width: '60px', border: 'none', background: 'transparent', padding: '0.4rem 0.2rem' }}
                min="0"
                max="100"
                step="0.1"
                value={formData.resellerCommissionPct}
                onChange={(e) => handleGlobalChange('resellerCommissionPct', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Fecha de venta</label>
          <input type="date" className="form-input" value={formData.fechaEmision} onChange={(e) => handleGlobalChange('fechaEmision', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Comprobante</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="form-input" style={{ flex: 1, minWidth: 0 }} value={formData.tipoFactura} onChange={(e) => handleGlobalChange('tipoFactura', e.target.value)}>
              <option value="Factura A">Factura A</option>
              <option value="Factura B">Factura B</option>
              <option value="Factura C">Factura C</option>
              <option value="Recibo X">Recibo X</option>
            </select>
            <input type="text" className="form-input" style={{ flex: 1, minWidth: 0 }} placeholder="0001-00000001" value={formData.nroFactura} onChange={(e) => handleGlobalChange('nroFactura', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="invoice-items-section">
        <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 500 }}>Detalle de Productos</h4>
          <button type="button" className="btn-outline" onClick={addItem} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            + Añadir Línea
          </button>
        </div>

        <table className="invoice-items-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Producto</th>
              <th style={{ width: '10%' }}>Cant.</th>
              <th style={{ width: '15%' }}>Precio</th>
              <th style={{ width: '10%' }}>Desc. %</th>
              <th style={{ width: '10%' }}>IVA</th>
              <th style={{ width: '15%' }}>Total</th>
              <th style={{ width: '5%' }}></th>
            </tr>
          </thead>
          <tbody>
            {formData.items.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay ítems agregados. Haga clic en "+ Añadir Línea"</td>
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
                <td><input type="number" min="1" step="1" value={item.cantidad} onChange={(e) => updateItem(item.id, 'cantidad', e.target.value)} required /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>$</span>
                    <input type="number" min="0" step="0.01" value={item.precio} onChange={(e) => updateItem(item.id, 'precio', e.target.value)} required />
                  </div>
                </td>
                <td><input type="number" min="0" max="100" step="0.1" value={item.descuento} onChange={(e) => updateItem(item.id, 'descuento', e.target.value)} /></td>
                <td><input type="number" min="0" max="100" step="0.1" value={item.iva} onChange={(e) => updateItem(item.id, 'iva', e.target.value)} placeholder="0" /></td>
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(item.total)}</td>
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
        <div className="invoice-notes" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Nota interna</label>
            <textarea className="form-input" style={{ height: '100px', resize: 'none' }} value={formData.observaciones} onChange={(e) => handleGlobalChange('observaciones', e.target.value)} placeholder="Detalles u observaciones solo visibles en el panel..."></textarea>
          </div>
          <div className="form-group">
            <label>Archivo Adjunto</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input
                type="file"
                className="form-input"
                accept="image/*,.pdf"
                onChange={(e) => setComprobanteFile(e.target.files[0])}
                style={{ padding: '0.5rem' }}
              />
              {comprobanteFile && <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>{comprobanteFile.name} seleccionado</span>}
              {formData.comprobanteUrl && !comprobanteFile && (
                <a href={formData.comprobanteUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Paperclip size={14} /> Ver archivo subido
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="invoice-summary">
          <div className="summary-row">
            <span>Descuento General (%)</span>
            <input type="number" className="form-input" min="0" max="100" step="0.1" value={formData.descuentoGeneral} onChange={(e) => handleGlobalChange('descuentoGeneral', e.target.value)} />
          </div>
          <div className="summary-row">
            <span>+ Percepciones ($)</span>
            <input type="number" className="form-input" min="0" step="0.01" value={formData.percepciones} onChange={(e) => handleGlobalChange('percepciones', e.target.value)} />
          </div>
          <div className="summary-row">
            <span>+ Impuestos Int. ($)</span>
            <input type="number" className="form-input" min="0" step="0.01" value={formData.impuestosInternos} onChange={(e) => handleGlobalChange('impuestosInternos', e.target.value)} />
          </div>
          <div className="summary-row">
            <span>+ Intereses ($)</span>
            <input type="number" className="form-input" min="0" step="0.01" value={formData.intereses} onChange={(e) => handleGlobalChange('intereses', e.target.value)} />
          </div>
          <div className="summary-row total">
            <span>TOTAL VENTA</span>
            <span>{formatCurrency(formData.value)}</span>
          </div>

          <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Registro de Cobranza
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>Monto Cobrado Hoy</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>$</span>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    step="0.01"
                    value={formData.montoCobrado}
                    onChange={(e) => handleGlobalChange('montoCobrado', e.target.value)}
                    style={{
                      width: '140px',
                      fontSize: '1.1rem',
                      padding: '0.6rem',
                      fontWeight: 'bold',
                      textAlign: 'right',
                      background: 'rgba(21, 128, 61, 0.1)',
                      borderColor: 'var(--success)',
                      color: 'var(--success)'
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>Cuenta Destino</span>
                {!isAddingBank ? (
                  <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '1rem' }}>
                    <select
                      className="form-input"
                      style={{ width: '160px' }}
                      value={formData.bankAccountId}
                      onChange={(e) => handleGlobalChange('bankAccountId', e.target.value)}
                      required
                    >
                      <option value="" disabled>Seleccionar cuenta...</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <button type="button" className="btn-outline" style={{ padding: '0 0.6rem' }} onClick={() => setIsAddingBank(true)} title="Añadir nueva caja">
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '1rem' }}>
                    <input type="text" className="form-input" placeholder="Nombre banco..." value={newBankName} onChange={(e) => setNewBankName(e.target.value)} autoFocus style={{ width: '120px' }} />
                    <button type="button" className="btn-primary" style={{ padding: '0 0.5rem' }} onClick={handleSaveNewBank}>OK</button>
                    <button type="button" className="btn-outline" style={{ padding: '0 0.5rem' }} onClick={() => setIsAddingBank(false)}>X</button>
                  </div>
                )}
              </div>

              {formData.deuda > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)', fontWeight: 600, borderTop: '1px dashed rgba(239, 68, 68, 0.4)', paddingTop: '0.8rem' }}>
                  <span>Deuda a cargar al cliente</span>
                  <span>{formatCurrency(formData.deuda)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="modal-footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--panel-border)', justifyContent: 'flex-end', gap: '1rem' }}>
        <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
        <button type="button" className="btn-outline" onClick={(e) => handleSaveWithStatus('negociacion', e)} disabled={isSaving}>
          Guardar Borrador
        </button>
        <button type="button" className="btn-primary" onClick={(e) => handleSaveWithStatus('ganados', e)} disabled={isSaving}>
          {isSaving ? (
            <span className="flex-center gap-2"><Loader2 size={16} className="animate-spin" /> Procesando...</span>
          ) : isEditMode ? "Actualizar Venta" : "Cobrar / Confirmar Venta"}
        </button>
      </div>
    </form>
  );
}
