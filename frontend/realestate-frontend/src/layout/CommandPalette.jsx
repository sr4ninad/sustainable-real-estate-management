import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Building2, CornerDownLeft, Plus, Search, UserRound, Users } from "lucide-react";
import { useAuth, useData } from "../context/contexts";
import useOverlayBehaviour from "../hooks/useOverlayBehaviour";
import { matches } from "../lib/events";
import { capitalize, formatDate, formatINRCompact } from "../lib/format";
import { navFor } from "./nav";

const LIMIT = 6;

function buildGroups(data, query, user, can) {
  const actions = [
    can.createProperty && { id: "a-prop", title: "Add property", sub: "Create a new listing", icon: Plus, to: "/properties?new=1" },
    can.createClient && { id: "a-client", title: "Add client", sub: "Register a buyer, seller or renter", icon: Plus, to: "/clients?new=1" },
    can.createAgent && { id: "a-agent", title: "Add agent", sub: "Onboard a new agent", icon: Plus, to: "/agents?new=1" },
    can.createTransaction && { id: "a-tx", title: "Record transaction", sub: "Close a deal on a property", icon: Plus, to: "/transactions?new=1" },
  ].filter((a) => a && matches(query, a.title, a.sub));

  const pages = navFor(user.role).flatMap((g) => g.items).filter((n) => matches(query, n.label)).map((n) => ({
    id: `p-${n.to}`,
    title: n.label,
    sub: "Go to page",
    icon: n.icon,
    to: n.to,
  }));

  const properties = data.properties
    .filter((p) => matches(query, p.propertyId, p.address, p.type, p.greenCertification))
    .slice(0, LIMIT)
    .map((p) => ({
      id: `pr-${p.propertyId}`,
      title: p.address,
      sub: `#${p.propertyId} · ${p.type || "Property"} · ${formatINRCompact(p.price)}`,
      icon: Building2,
      to: `/properties?id=${p.propertyId}`,
    }));

  const clients = (can.viewClients ? data.clients : [])
    .filter((c) => matches(query, c.clientId, c.name, c.email, c.type))
    .slice(0, LIMIT)
    .map((c) => ({
      id: `c-${c.clientId}`,
      title: c.name,
      sub: `${capitalize(c.type)} · ${c.email || `#${c.clientId}`}`,
      icon: Users,
      to: `/clients?q=${encodeURIComponent(c.name)}`,
    }));

  const agents = data.agents
    .filter((a) => matches(query, a.agentId, a.name, a.email))
    .slice(0, LIMIT)
    .map((a) => ({
      id: `ag-${a.agentId}`,
      title: a.name,
      sub: `${a.listings.length} listings · ${a.email || `#${a.agentId}`}`,
      icon: UserRound,
      to: `/agents?q=${encodeURIComponent(a.name)}`,
    }));

  const transactions = query.trim()
    ? data.transactions
        .filter((t) => matches(query, t.transactionId, t.property?.address, t.client?.name))
        .slice(0, LIMIT)
        .map((t) => ({
          id: `t-${t.transactionId}`,
          title: `Transaction #${t.transactionId}`,
          sub: `${t.property?.address ?? `Property #${t.propertyId}`} · ${formatDate(t.date)}`,
          icon: ArrowLeftRight,
          to: `/transactions?q=${t.transactionId}`,
        }))
    : [];

  let index = 0;
  return [
    { title: "Pages", items: pages },
    { title: "Quick actions", items: actions },
    { title: "Properties", items: properties },
    { title: "Clients", items: clients },
    { title: "Agents", items: agents },
    { title: "Transactions", items: transactions },
  ]
    .filter((g) => g.items.length)
    .map((g) => ({ ...g, items: g.items.map((item) => ({ ...item, index: index++ })) }));
}

function PaletteBody({ onClose }) {
  const data = useData();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef(null);

  const groups = useMemo(() => buildGroups(data, query, user, can), [data, query, user, can]);
  const flat = groups.flatMap((g) => g.items);
  const active = Math.min(cursor, Math.max(0, flat.length - 1));

  const go = (item) => {
    onClose();
    navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + flat.length) % Math.max(1, flat.length);
      setCursor(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    }
  };

  return (
    <motion.div
      className="cmdk"
      role="dialog"
      aria-modal="true"
      aria-label="Search and quick actions"
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="cmdk-input">
        <Search aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search properties, clients, agents, or jump to a page…"
          aria-label="Search"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={flat[active] ? `cmdk-${flat[active].id}` : undefined}
        />
        <kbd>Esc</kbd>
      </div>
      <div className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
        {flat.length === 0 && <div className="cmdk-empty">No results for “{query}”</div>}
        {groups.map((group) => (
          <div key={group.title} role="group" aria-label={group.title}>
            <div className="cmdk-group">{group.title}</div>
            {group.items.map((item) => {
              const i = item.index;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`cmdk-${item.id}`}
                  type="button"
                  role="option"
                  data-index={i}
                  aria-selected={i === active}
                  className="cmdk-item"
                  onMouseMove={() => i !== active && setCursor(i)}
                  onClick={() => go(item)}
                >
                  <span className="cmdk-item-icon">
                    <Icon />
                  </span>
                  <span className="cmdk-item-text">
                    <span className="cmdk-item-title" style={{ display: "block" }}>
                      {item.title}
                    </span>
                    <span className="cmdk-item-sub" style={{ display: "block" }}>
                      {item.sub}
                    </span>
                  </span>
                  <CornerDownLeft className="enter" width={15} height={15} aria-hidden />
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="cmdk-foot">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> navigate
        </span>
        <span>
          <kbd>↵</kbd> open
        </span>
        <span>
          <kbd>Esc</kbd> close
        </span>
      </div>
    </motion.div>
  );
}

export default function CommandPalette({ open, onClose }) {
  const layerRef = useRef(null);
  useOverlayBehaviour(open, onClose, layerRef);

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
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <div className="modal-layer" key="layer" ref={layerRef}>
            <PaletteBody onClose={onClose} />
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
