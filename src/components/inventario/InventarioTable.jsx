import { Package, Layers, Edit2, Trash2, ExternalLink, AlertTriangle, CheckCircle2, MoreVertical } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { SkeletonRow } from '../ui/Skeleton';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function InventarioTable({
  loading,
  paginatedInventory,
  openViewModal,
  openAdjustModal,
  openEditModal,
  handleDeleteClick
}) {
  return (
    <div className="premium-table-container">
      <Table className="premium-table">
        <Thead>
          <Tr>
            <Th>Detalle del Producto</Th>
            <Th>Clasificación</Th>
            <Th>Existencias</Th>
            <Th>Valor Unitario</Th>
            <Th>Estado</Th>
            <Th>Operaciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Tr key={i}>
                <Td colSpan="6">
                  <SkeletonRow columns={6} />
                </Td>
              </Tr>
            ))
          ) : paginatedInventory.length === 0 ? (
            <Tr>
              <Td colSpan="6" className="empty-state-cell">
                <div className="empty-state-content">
                   <Package size={48} className="opacity-10 mb-4" />
                   <p>No se encontraron productos en el inventario</p>
                   <span className="text-xs opacity-50">Prueba con otros términos de búsqueda</span>
                </div>
              </Td>
            </Tr>
          ) : (
            paginatedInventory.map((item) => {
              const stock = parseInt(item.stock) || 0;
              const minStock = parseInt(item.minStock) || 0;
              const isLowStock = item.stockAlertEnabled && stock < minStock;
              const isOutOfStock = stock === 0;
              const inactive = item.isActive === false;

              let status = isOutOfStock ? 'SIN STOCK' : isLowStock ? 'CRÍTICO' : 'DISPONIBLE';
              if (inactive) status = 'INACTIVO';

              let variant = inactive ? 'info' : isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success';
              
              // Si las alertas están desactivadas, el ratio de stock siempre se ve lleno (verde) a menos que sea 0
              const stockRatio = !item.stockAlertEnabled 
                ? (stock > 0 ? 100 : 0)
                : Math.min((stock / (minStock || 1)) * 100, 100);

              return (
                <Tr
                  key={item.id}
                  className={`premium-row ${inactive ? 'is-inactive' : ''}`}
                  onClick={() => openViewModal(item)}
                >
                  <Td label="Producto">
                    <div className="premium-product-cell">
                      <div className="image-box">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} />
                        ) : (
                          <Package size={20} className="opacity-20" />
                        )}
                        {isOutOfStock && <div className="image-badge danger">!</div>}
                        {isLowStock && !isOutOfStock && <div className="image-badge warning">!</div>}
                      </div>
                      <div className="product-info">
                        <span className="product-title">{item.name}</span>
                        <div className="product-metadata">
                          {item.hasVariants ? (
                            <span className="meta-tag variants">
                               <Layers size={10} /> MULTIVARIANTE
                            </span>
                          ) : (
                            <>
                              {item.size && <span className="meta-tag">T: {item.size}</span>}
                              {item.color && <span className="meta-tag">C: {item.color}</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Td>
                  
                  <Td label="Clasificación">
                    <div className="classification-cell">
                      <span className="brand-name">{item.brand || 'Genérico'}</span>
                      <span className="category-label">{item.category || 'Sin Cat.'}</span>
                    </div>
                  </Td>

                  <Td label="Existencias">
                    <div className="stock-visual-cell">
                       <div className="stock-values">
                          <span className={`main-stock ${isOutOfStock ? 'text-danger' : isLowStock ? 'text-warning' : 'text-success'}`}>
                             {stock}
                          </span>
                          {item.stockAlertEnabled && <span className="min-stock-ref">/ {minStock}</span>}
                       </div>
                       <div className="stock-progress-bg">
                          <div 
                            className={`stock-progress-bar ${isOutOfStock ? 'bg-danger' : isLowStock ? 'bg-warning' : 'bg-success'}`}
                            style={{ width: `${stockRatio}%` }}
                          />
                       </div>
                    </div>
                  </Td>

                  <Td label="Valor Unitario">
                    <div className="price-cell">
                       <span className="selling-price">{item.sellingPrice ? formatCurrency(item.sellingPrice) : '-'}</span>
                       {item.costPrice && (
                         <span className="profit-hint text-xs opacity-40">
                           Costo: {formatCurrency(item.costPrice)}
                         </span>
                       )}
                    </div>
                  </Td>

                  <Td label="Estado">
                    <Badge variant={variant} className="premium-badge">
                       {status === 'DISPONIBLE' && <CheckCircle2 size={10} className="mr-1" />}
                       {status === 'CRÍTICO' && <AlertTriangle size={10} className="mr-1" />}
                       {status}
                    </Badge>
                  </Td>

                  <Td label="Operaciones" className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="premium-actions-group">
                      <button className="action-circle-btn" onClick={() => openAdjustModal(item)} title="Ajuste Rápido">
                        <Layers size={16} />
                      </button>
                      <button className="action-circle-btn primary" onClick={() => openEditModal(item)} title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button className="action-circle-btn danger" onClick={() => handleDeleteClick(item.id)} title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })
          )}
        </Tbody>
      </Table>
    </div>
  );
}
