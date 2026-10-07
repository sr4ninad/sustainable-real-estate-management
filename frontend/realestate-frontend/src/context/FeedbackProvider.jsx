import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import Modal from "../components/ui/Modal";
import { ConfirmContext, ToastContext } from "./contexts";

const TOAST_ICONS = { success: CheckCircle2, error: XCircle, info: Info };

/** Provides toasts and a promise-based confirm dialog to the whole app. */
export default function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, title, text) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, type, title, text }]);
      setTimeout(() => dismiss(id), type === "error" ? 7000 : 4000);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (title, text) => push("success", title, text),
      error: (title, text) => push("error", title, text),
      info: (title, text) => push("info", title, text),
    }),
    [push]
  );

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setDialog(options);
      }),
    []
  );

  const settle = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setDialog(null);
  };

  const danger = dialog?.tone !== "neutral";

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <Modal
          open={!!dialog}
          onClose={() => settle(false)}
          size="sm"
          icon={AlertTriangle}
          tone={danger ? "bad" : undefined}
          title={dialog?.title}
          subtitle={dialog?.subtitle}
          footer={
            <>
              <button type="button" className="btn" onClick={() => settle(false)}>
                Cancel
              </button>
              <button
                type="button"
                data-autofocus
                className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => settle(true)}
              >
                {dialog?.confirmLabel || "Confirm"}
              </button>
            </>
          }
        >
          <p style={{ color: "var(--text-2)" }}>{dialog?.text}</p>
        </Modal>

        {createPortal(
          <div className="toasts" role="region" aria-live="polite" aria-label="Notifications">
            <AnimatePresence initial={false}>
              {toasts.map((t) => {
                const Icon = TOAST_ICONS[t.type];
                return (
                  <motion.div
                    key={t.id}
                    layout
                    className={`toast ${t.type}`}
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
                    transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    <span className="toast-icon">
                      <Icon />
                    </span>
                    <div className="toast-body">
                      <div className="toast-title">{t.title}</div>
                      {t.text && <div className="toast-text">{t.text}</div>}
                    </div>
                    <button className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                      <X />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>,
          document.body
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
