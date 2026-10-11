import React, { ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  isDanger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  children?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  description,
  isDanger = false,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm Action',
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isDanger && (
              <span style={{ color: 'var(--traffic-red)' }}>
                <AlertTriangle size={22} />
              </span>
            )}
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              {title}
            </h2>
          </div>
          <button 
            className="icon-button" 
            onClick={onClose}
            style={{ width: '32px', height: '32px' }}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {description && (
          <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
            {description}
          </p>
        )}

        {children}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className={isDanger ? 'danger-button' : 'primary-button'} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
