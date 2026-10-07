import { useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import useOverlayBehaviour from "../../hooks/useOverlayBehaviour";

export default function Drawer({ open, onClose, label, footer, children }) {
  const panelRef = useRef(null);
  useOverlayBehaviour(open, onClose, panelRef);

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
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            key="drawer"
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 320 }}
          >
            <div className="drawer-body">{children}</div>
            {footer && <div className="drawer-foot">{footer}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
