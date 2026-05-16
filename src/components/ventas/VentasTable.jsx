import { FileText, MoreVertical, Edit2, Paperclip, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { SkeletonRow } from '../ui/Skeleton';

export function VentasTable({ 
  deals, 
  loading, 
  activeMenuId, 
  setActiveMenuId, 
  menuRef,
  handleViewDirectly,
  openEditModal,
  handleDeleteClick
}) {
  return (
    <div className="table-responsive">
      <table className="crm-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Comprobante</th>
            <th>Cliente</th>
            <th>Total Venta</th>
            <th>Cobrado</th>
            <th>Estado Deuda</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan="7"><SkeletonRow columns={7} /></td>
              </tr>
            ))
          ) : deals.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                No hay ventas registradas. ¡Crea la primera!
              </td>
            </tr>
          ) : (
            deals.map((deal) => (
                <tr key={deal.id}>
                  <td data-label="Fecha">
                    <div className="contact-cell">
                      <span className="contact-name">{deal.date}</span>
                    </div>
                  </td>
                  <td data-label="Comprobante">
                    <div className="contact-meta">
                      <span
                        className="meta-item"
                        style={{
                          color: 'var(--text-main)',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {deal.tipoFactura} {deal.nroFactura}
                      </span>
                    </div>
                  </td>
                  <td data-label="Cliente">
                    <span className="company-name">{deal.name}</span>
                  </td>
                  <td data-label="Total">
                    <span style={{ fontWeight: 600 }}>{formatCurrency(deal.value)}</span>
                  </td>
                  <td data-label="Cobrado">
                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                      {formatCurrency(deal.montoCobrado !== undefined ? deal.montoCobrado : deal.value)}
                    </span>
                  </td>
                  <td data-label="Saldo">
                    {parseFloat(deal.deuda) > 0 ? (
                      <span
                        style={{
                          color: 'var(--danger)',
                          fontWeight: 600,
                          background: 'rgba(239, 68, 68, 0.1)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                        }}
                      >
                        Debe {formatCurrency(deal.deuda)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Saldado</span>
                    )}
                  </td>
                  <td data-label="Acciones">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleViewDirectly(deal)}
                        title="Ver Comprobante Moderno"
                        style={{ color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)' }}
                      >
                        <FileText size={16} />
                      </button>
                      <div
                        className="action-dropdown-container"
                        ref={activeMenuId === deal.id ? menuRef : null}
                      >
                        <button
                          className="btn-icon"
                          onClick={() => setActiveMenuId(activeMenuId === deal.id ? null : deal.id)}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {activeMenuId === deal.id && (
                          <div className="dropdown-menu">
                            <button className="dropdown-item" onClick={() => openEditModal(deal)}>
                              <Edit2 size={14} />
                              <span>Editar Venta</span>
                            </button>
                            <button className="dropdown-item" onClick={() => handleViewDirectly(deal)}>
                              <FileText size={14} />
                              <span>Ver Comprobante</span>
                            </button>
                            {deal.comprobanteUrl && (
                              <button
                                className="dropdown-item"
                                onClick={() => window.open(deal.comprobanteUrl, '_blank')}
                              >
                                <Paperclip size={14} />
                                <span>Ver Adjunto</span>
                              </button>
                            )}
                            <button
                              className="dropdown-item delete"
                              onClick={() => handleDeleteClick(deal.id)}
                            >
                              <Trash2 size={14} />
                              <span>Anular</span>
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
  );
}
