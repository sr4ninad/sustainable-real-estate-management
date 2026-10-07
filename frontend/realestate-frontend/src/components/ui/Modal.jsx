import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import useOverlayBehaviour from "../../hooks/useOverlayBehaviour";

export default function Modal({ open, onClose, title, subtitle, icon: Icon, tone, size, footer, children, as = "div", onSubmit }) {
  const titleId = useId();
  const panelRef = useRef(null);
  useOverlayBehaviour(open, onClose, panelRef);

  // Focus the first field when the modal opens.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector(
        "input:not([disabled]), select:not([disabled]), textarea, button[data-autofocus]"
      );
      el?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [open]);

  const Panel = as === "form" ? motion.form : motion.div;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <div className="modal-layer" key="layer">
            <Panel
              ref={panelRef}
              className={`modal ${size || ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              onSubmit={
                onSubmit
                  ? (e) => {
                      e.preventDefault();
                      onSubmit(e);
                    }
                  : undefined
              }
              noValidate={as === "form" ? true : undefined}
            >
              <div className="modal-head">
                {Icon && (
                  <div className={`modal-head-icon ${tone || ""}`}>
                    <Icon />
                  </div>
                )}
                <div>
                  <h2 className="modal-title" id={titleId}>
                    {title}
                  </h2>
                  {subtitle && <p className="modal-sub">{subtitle}</p>}
                </div>
                <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                  <X />
                </button>
              </div>
              <div className="modal-body">{children}</div>
              {footer && <div className="modal-foot">{footer}</div>}
            </Panel>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
