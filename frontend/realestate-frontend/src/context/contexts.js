import { createContext, useContext } from "react";

export const DataContext = createContext(null);
export const ToastContext = createContext(null);
export const ConfirmContext = createContext(null);
export const PaletteContext = createContext(null);
export const AuthContext = createContext(null);

/** { user, can, login, logout, refreshUser } — `can` holds the role's permissions. */
export const useAuth = () => useContext(AuthContext);

/** All backend data, joined + helpers ({ reload, status, error, ... }). */
export const useData = () => useContext(DataContext);

/** toast.success(title, text) / toast.error(title, text) / toast.info(title, text) */
export const useToast = () => useContext(ToastContext);

/** const ok = await confirm({ title, text, confirmLabel, tone }) */
export const useConfirm = () => useContext(ConfirmContext);

/** { open, setOpen } for the ⌘K command palette */
export const usePalette = () => useContext(PaletteContext);
