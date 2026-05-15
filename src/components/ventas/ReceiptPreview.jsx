import { FileText, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { Modal } from '../ui/Modal';

export function ReceiptPreview({ 
  showReceipt, 
  setShowReceipt, 
  receiptRef, 
  receiptData, 
  companyData, 
  handleDownloadPDF, 
  isDownloading 
}) {
  return (
    <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} title="Comprobante de Ventas" className="wide-modal">
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
                  <p>Soporte y Ventas Especializadas</p>
                  <p>Documento de Control Interno</p>
                </div>
              </div>
            </div>

            <div className="header-right">
              <div className="receipt-type-box">
                <span className="type-label">COMPROBANTE</span>
                <span className="type-letter">X</span>
              </div>
              <div className="receipt-meta-pro">
                <div className="meta-row">
                  <span className="label">Número:</span>
                  <span className="value"># {receiptData?.nroFactura || '0001-00000001'}</span>
                </div>
                <div className="meta-row">
                  <span className="label">Fecha:</span>
                  <span className="value">{receiptData?.fechaEmision || receiptData?.date}</span>
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
                  <span className="label">Cliente / Razón Social:</span>
                  <span className="value highlight">{receiptData?.clienteName || 'Consumidor Final'}</span>
                </div>
                <div className="data-item">
                  <span className="label">Condición IVA:</span>
                  <span className="value">Consumidor Final</span>
                </div>
              </div>
              <div className="client-col">
                <div className="data-item">
                  <span className="label">DNI / CUIT:</span>
                  <span className="value">-</span>
                </div>
                <div className="data-item">
                  <span className="label">Ubicación:</span>
                  <span className="value">-</span>
                </div>
              </div>
            </div>
          </section>

          {/* Tabla de Items */}
          <table className="receipt-table-pro">
            <thead>
              <tr>
                <th className="t-left">Descripción del Producto</th>
                <th className="t-center">Cant.</th>
                <th className="t-right">P. Unitario</th>
                <th className="t-right">Total</th>
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
                <span className="notes-label">OBSERVACIONES</span>
                <p>{receiptData?.observaciones || '¡Muchas gracias por su compra! Esperamos volver a verle pronto.'}</p>
              </div>
              <div className="legal-disclaimer-pro">
                 Este documento es un comprobante de control interno sin validez legal ni fiscal. Generado por la plataforma Gestionate Fácil.
              </div>
            </div>

            <div className="footer-right">
              <div className="totals-container-pro">
                <div className="total-row-pro">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(receiptData?.items.reduce((acc, i) => acc + i.total, 0) || 0)}</span>
                </div>
                {receiptData?.descuentoGeneral > 0 && (
                  <div className="total-row-pro discount">
                    <span>Descuento ({receiptData.descuentoGeneral}%):</span>
                    <span>-{formatCurrency(receiptData.items.reduce((acc, i) => acc + i.total, 0) * (receiptData.descuentoGeneral / 100))}</span>
                  </div>
                )}
                <div className="total-row-pro main-total">
                  <span className="total-label">TOTAL FINAL</span>
                  <span className="total-amount">{formatCurrency(receiptData?.value || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="receipt-bottom-bar">
             GESTIONATE FÁCIL | POTENCIANDO TU NEGOCIO CON INTELIGENCIA
          </div>
        </div>
      </div>
      <div className="modal-actions no-print" style={{marginTop: '2rem'}}>
        <button className="btn-outline" onClick={() => setShowReceipt(false)}>Cerrar Ventana</button>
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
          <span>{isDownloading ? 'Generando...' : 'Descargar Factura PDF'}</span>
        </button>
      </div>
    </Modal>
  );
}
