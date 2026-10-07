import { motion } from "framer-motion";
import { AlertCircle, ArrowDownRight, ArrowUpRight, CircleSlash, Leaf, Minus, Search, X } from "lucide-react";
import { avatarColor, formatSignedPercent, initials } from "../../lib/format";
import { energyTier, GREEN_LABELS } from "../../lib/domain";
import { CLIENT_META } from "../../lib/meta";

export function PageHeader({ eyebrow, icon: Icon, title, description, actions }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && (
          <div className="page-eyebrow">
            {Icon && <Icon />}
            {eyebrow}
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon = CircleSlash, title, text, action, error }) {
  return (
    <div className={`empty ${error ? "error" : ""}`}>
      <div className="empty-icon">{error ? <AlertCircle /> : <Icon />}</div>
      <div className="empty-title">{title}</div>
      {text && <p className="empty-text">{text}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ width = "100%", height = 14, radius, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function StatCard({ label, value, icon: Icon, foot, loading }) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="stat-icon">
            <Icon />
          </span>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton width="60%" height={26} style={{ marginTop: 12 }} />
          <Skeleton width="80%" height={12} style={{ marginTop: 10 }} />
        </>
      ) : (
        <>
          <div className="stat-value">{value}</div>
          {foot && <div className="stat-foot">{foot}</div>}
        </>
      )}
    </div>
  );
}

export function Delta({ value, goodWhenUp = true, digits = 1 }) {
  if (!Number.isFinite(value)) return null;
  const dir = value > 0.0005 ? "up" : value < -0.0005 ? "down" : "flat";
  const good = dir === "flat" ? "flat" : (dir === "up") === goodWhenUp ? "up" : "down";
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return (
    <span className={`delta ${good}`}>
      <Icon aria-hidden />
      {formatSignedPercent(value, digits)}
    </span>
  );
}

export function Field({ label, required, hint, error, children, className = "" }) {
  return (
    <label className={`field ${className}`}>
      {label && (
        <span className="field-label">
          {label}
          {required && <span className="req">*</span>}
        </span>
      )}
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="search">
      <Search />
      <input
        className="input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button type="button" className="icon-btn clear" onClick={() => onChange("")} aria-label="Clear search">
          <X />
        </button>
      )}
    </div>
  );
}

/** options: [{ value, label, icon?, count? }] */
export function Segmented({ options, value, onChange, id, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            title={opt.title}
            aria-label={opt.label ? undefined : opt.title}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="seg-pill"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="seg-label">
              {Icon && <Icon />}
              {opt.label}
              {opt.count !== undefined && <span className="seg-count">{opt.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Avatar({ name, size = "" }) {
  return (
    <span className={`avatar ${size}`} style={{ background: avatarColor(name || "") }} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function Person({ name, sub, size }) {
  return (
    <div className="person">
      <Avatar name={name} size={size} />
      <div style={{ minWidth: 0 }}>
        <div className="person-name">{name || "Unknown"}</div>
        {sub && <div className="person-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ available }) {
  return available ? (
    <span className="badge good">
      <span className="dot" />
      Available
    </span>
  ) : (
    <span className="badge">
      <span className="dot" />
      Sold / Let
    </span>
  );
}

export function EnergyBadge({ rating }) {
  const tier = energyTier(rating);
  return (
    <span className={`rating r-${tier}`} title={`Energy efficiency: ${rating || "not rated"}`}>
      {rating || "—"}
    </span>
  );
}

export function GreenLeaves({ score, showLabel }) {
  return (
    <span className="leaves" title={`${score}/3 green features · ${GREEN_LABELS[score]}`}>
      {[0, 1, 2].map((i) => (
        <Leaf key={i} className={i < score ? "on" : ""} aria-hidden />
      ))}
      <span className={showLabel ? "leaves-label" : "sr-only"}>
        {showLabel ? GREEN_LABELS[score] : `${score} of 3 green features`}
      </span>
    </span>
  );
}

export function ClientTypeBadge({ type }) {
  const meta = CLIENT_META[type];
  if (!meta) return <span className="badge outline">{type || "—"}</span>;
  const Icon = meta.icon;
  return (
    <span className={`badge ${meta.tone}`}>
      <Icon />
      {meta.label}
    </span>
  );
}
