import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';

export function CatalogModal({ isOpen, onClose, catalogUrl, handleCopyLink }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tu Catálogo Digital">
      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-main)' }}>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-dim)' }}>
          Comparte este código QR o el enlace para que tus clientes vean tus productos disponibles.
        </p>

        <div
          style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '1rem',
            display: 'inline-block',
            marginBottom: '1.5rem',
          }}
        >
          {catalogUrl && <QRCodeSVG value={catalogUrl} size={200} />}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-secondary flex-center gap-2" onClick={handleCopyLink}>
            <Copy size={16} /> Copiar Enlace
          </button>
          <a
            href={catalogUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary flex-center gap-2"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={16} /> Abrir Catálogo
          </a>
        </div>
      </div>
    </Modal>
  );
}
