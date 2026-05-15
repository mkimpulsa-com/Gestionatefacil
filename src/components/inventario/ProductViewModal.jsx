import { Package } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { Modal } from '../ui/Modal';

export function ProductViewModal({ isOpen, onClose, product }) {
  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ficha del Producto">
      <div className="product-view-modal">
        <div className="product-view-header">
          <div className="product-view-image-container">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} />
            ) : (
              <Package size={64} style={{ opacity: 0.2, margin: '3rem auto' }} />
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{product.name}</h2>
            <span
              className={`status-badge status-${
                product.isActive === false
                  ? 'inactivo'
                  : product.stock === 0
                  ? 'danger'
                  : product.stock < (product.minStock || 5)
                  ? 'pendiente'
                  : 'activo'
              }`}
            >
              {product.isActive === false
                ? 'Inactivo'
                : product.stock === 0
                ? 'Sin Stock'
                : product.stock < (product.minStock || 5)
                ? 'Bajo Stock'
                : 'Stock Óptimo'}
            </span>
            {product.description && (
              <p style={{ 
                marginTop: '1rem', 
                fontSize: '0.9rem', 
                color: 'var(--text-muted)', 
                lineHeight: '1.5',
                background: 'var(--surface-soft)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--panel-border)',
                textAlign: 'left'
              }}>
                {product.description}
              </p>
            )}
          </div>
        </div>

        <div className="product-view-grid">
          <div className="view-card">
            <h5>Stock y Disponibilidad</h5>
            <div className="view-row">
              <span>Actual</span>{' '}
              <strong className={product.stock === 0 ? 'text-danger' : ''}>{product.stock} unid.</strong>
            </div>
            <div className="view-row">
              <span>Mínimo</span> <strong>{product.minStock || 5} unid.</strong>
            </div>
            {product.hasVariants ? (
              <div className="view-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>Variantes y Stock</span>
                <div
                  style={{
                    width: '100%',
                    background: 'rgba(var(--primary-rgb), 0.05)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}
                >
                  {(product.variants || []).map((v, i) => (
                    <div
                      key={v.id || i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        marginBottom: '0.4rem',
                        borderBottom: '1px dashed var(--panel-border)',
                        paddingBottom: '0.3rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-main)' }}>
                        {Object.values(v.attributes || {}).join(' / ')}{' '}
                        {v.sku ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            (SKU: {v.sku})
                          </span>
                        ) : (
                          ''
                        )}{' '}
                        {v.price ? <span className="text-gradient"> {v.price}</span> : ''}
                      </span>
                      <strong className={(parseInt(v.stock) || 0) === 0 ? 'text-danger' : 'text-success'}>
                        {parseInt(v.stock) || 0} unid.
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="view-row">
                  <span>Talle / Tamaño</span> <strong>{product.size || '-'}</strong>
                </div>
                <div className="view-row">
                  <span>Color</span> <strong>{product.color || '-'}</strong>
                </div>
              </>
            )}
          </div>

          <div className="view-card">
            <h5>Comercial</h5>
            <div className="view-row">
              <span>Costo</span>{' '}
              <strong>{product.costPrice ? formatCurrency(product.costPrice) : '-'}</strong>
            </div>
            <div className="view-row">
              <span>Precio Venta</span>{' '}
              <strong className="text-success">
                {product.sellingPrice ? formatCurrency(product.sellingPrice) : '-'}
              </strong>
            </div>
            <div className="view-row">
              <span>Categoría</span> <strong>{product.category || '-'}</strong>
            </div>
            <div className="view-row">
              <span>Marca</span> <strong>{product.brand || '-'}</strong>
            </div>
            <div className="view-row">
              <span>Proveedor</span> <strong>{product.supplier || '-'}</strong>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
