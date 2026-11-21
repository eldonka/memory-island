import React from 'react';
import { IcoBack } from './Icons';

export function TopBar({ crumbs, onBack, backLabel, children }: { crumbs: React.ReactNode[]; onBack?: () => void; backLabel?: string; children?: React.ReactNode }) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="btn btn-sm btn-ghost" onClick={onBack} aria-label={backLabel || 'Back'}>
          <IcoBack /> {backLabel && <span className="topbar-backlabel">{backLabel}</span>}
        </button>
      )}
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">›</span>}
            {i === crumbs.length - 1 ? <b>{c}</b> : <span>{c}</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="spacer" />
      {children}
    </div>
  );
}

export function Modal({ onClose, children, wide }: { onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`panel panel-strong modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
