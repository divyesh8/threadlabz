"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export function ProductDialog({ title, trigger, triggerLabel, className = "", disabled = false, children }: {
  title: string; trigger: ReactNode; triggerLabel?: string; className?: string; disabled?: boolean; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <>
    <button type="button" className={className} disabled={disabled} aria-label={triggerLabel} aria-haspopup="dialog"
      onClick={() => { dialog.current?.showModal(); setOpen(true); }}>{trigger}</button>
    <dialog ref={dialog} className="product-dialog" aria-labelledby={titleId}
      onClose={() => setOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="product-dialog-surface">
        <div className="product-dialog-heading"><h2 id={titleId}>{title}</h2>
          <button type="button" className="pdp-icon-button" aria-label={`Close ${title.toLowerCase()}`} onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>
        </div>
        {open && children}
      </div>
    </dialog>
  </>;
}
