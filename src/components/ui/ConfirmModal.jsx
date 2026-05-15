import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import './Modal.css';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", type = "danger" }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content glass-panel confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon-container">
          <AlertTriangle size={32} className={type === 'danger' ? 'text-error' : 'text-warning'} />
        </div>
        
        <div className="confirm-body">
          <h2 className="confirm-title">{title}</h2>
          <p className="confirm-message">{message}</p>
        </div>

        <div className="modal-footer confirm-footer">
          <button className="btn-outline" onClick={onClose}>{cancelText}</button>
          <button 
            className={type === 'danger' ? 'btn-danger' : 'btn-primary'} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
