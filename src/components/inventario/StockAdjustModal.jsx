import { Modal } from '../ui/Modal';

export function StockAdjustModal({
  isOpen,
  onClose,
  adjustProduct,
  adjustVariantsTemp,
  setAdjustVariantsTemp,
  adjustStockTemp,
  setAdjustStockTemp,
  handleSaveAdjustment,
  loading,
  isUploading
}) {
  if (!adjustProduct) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajuste Rápido de Stock">
      {adjustProduct && (
        <div className="adjust-modal-content">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.3rem' }}>
              {adjustProduct.name}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              Ajuste manual de existencias físicas.
            </p>
          </div>

          {adjustProduct.hasVariants ? (
            <div className="variants-adjust-table">
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Variante</th>
                    <th style={{ textAlign: 'right' }}>Stock Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {(adjustVariantsTemp || []).map((v, idx) => (
                    <tr key={v.id || idx}>
                      <td>{Object.values(v.attributes || {}).join(' / ')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '80px', textAlign: 'right', padding: '0.3rem' }}
                          value={v.stock}
                          onChange={(e) => {
                            const newVariants = [...adjustVariantsTemp];
                            newVariants[idx].stock = e.target.value;
                            setAdjustVariantsTemp(newVariants);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="simple-adjust">
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                Nuevo Stock Total:
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  background: 'var(--surface-color)',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--panel-border)',
                }}
              >
                <button
                  className="btn-outline"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '1.5rem',
                    height: '50px',
                    width: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => setAdjustStockTemp((prev) => Math.max(0, (parseInt(prev) || 0) - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', width: '120px', height: '60px' }}
                  value={adjustStockTemp}
                  onChange={(e) => setAdjustStockTemp(e.target.value)}
                  min="0"
                  autoFocus
                />
                <button
                  className="btn-outline"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '1.5rem',
                    height: '50px',
                    width: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => setAdjustStockTemp((prev) => (parseInt(prev) || 0) + 1)}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button className="btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSaveAdjustment} disabled={loading || isUploading}>
              Guardar Ajuste
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
