import { useEffect, useState } from "react";
import { Check, Database, Pencil, Receipt, Ruler, Trash2, X } from "lucide-react";
import Drawer from "../ui/Drawer";
import { ScoreRing } from "../charts/Charts";
import { Delta, EnergyBadge, Person, Skeleton, StatusBadge } from "../ui/primitives";
import { api } from "../../lib/api";
import { GREEN_LABELS, isCertified, isYes } from "../../lib/domain";
import { FEATURES } from "../../lib/meta";
import { formatDate, formatDateTime, formatINR, formatINRCompact, formatNumber } from "../../lib/format";
import PropertyVisual from "./PropertyVisual";

/** Values computed by the MySQL functions calculate_price_per_sqft / calculate_property_tax. */
function DbInsights({ propertyId }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([api.properties.pricePerSqft(propertyId), api.properties.propertyTax(propertyId)]).then(
      ([sqft, tax]) => {
        if (cancelled) return;
        setState({
          loading: false,
          sqft: sqft.status === "fulfilled" ? sqft.value : null,
          tax: tax.status === "fulfilled" ? tax.value : null,
          failed: sqft.status === "rejected" && tax.status === "rejected",
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return (
    <div className="insight-grid">
      <div className="insight">
        <span className="insight-label">
          <Ruler aria-hidden /> Price per sq ft
        </span>
        {state.loading ? <Skeleton width={90} height={20} /> : <strong>{state.sqft != null ? formatINR(state.sqft) : "—"}</strong>}
        <code>calculate_price_per_sqft()</code>
      </div>
      <div className="insight">
        <span className="insight-label">
          <Receipt aria-hidden /> Est. property tax
        </span>
        {state.loading ? <Skeleton width={90} height={20} /> : <strong>{state.tax != null ? formatINR(state.tax) : "—"}</strong>}
        <code>calculate_property_tax()</code>
      </div>
      {state.failed && <p className="field-hint span-all">Couldn't reach the database functions.</p>}
    </div>
  );
}

export default function PropertyDrawer({ property: current, onClose, onEdit, onDelete, canEdit }) {
  const open = !!current;
  // Keep showing the last property while the drawer animates closed.
  const [property, setProperty] = useState(current);
  if (current && current !== property) setProperty(current);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      label={property ? `Property ${property.address}` : "Property"}
      footer={
        property &&
        canEdit && (
          <>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => onEdit(property)}>
              <Pencil /> Edit property
            </button>
            <button type="button" className="btn" onClick={() => onDelete(property)} aria-label="Delete property">
              <Trash2 /> Delete
            </button>
          </>
        )
      }
    >
      {property && (
        <div className="pd">
          <PropertyVisual property={property} tall>
            <button type="button" className="icon-btn pd-close" onClick={onClose} aria-label="Close">
              <X />
            </button>
          </PropertyVisual>

          <div className="pd-head">
            <div className="pd-badges">
              <StatusBadge available={property.available} />
              <EnergyBadge rating={property.energyEfficiency} />
              {isCertified(property.greenCertification) && <span className="badge good">{property.greenCertification}</span>}
              <span className="badge outline">#{property.propertyId}</span>
            </div>
            <h2 className="pd-title">{property.address}</h2>
            <p className="pd-sub">
              {property.type || "Property"}
              {property.size ? ` · ${formatNumber(property.size)} sq ft` : ""}
            </p>
            <div className="pd-price">{formatINR(property.price)}</div>
          </div>

          <section className="pd-section">
            <h3 className="pd-section-title">Sustainability</h3>
            <div className="pd-green">
              <ScoreRing value={property.score} max={3} label={`${property.score}/3`} caption={GREEN_LABELS[property.score]} />
              <ul className="pd-features">
                {FEATURES.map((f) => {
                  const on = isYes(property.features?.[f.key]);
                  return (
                    <li key={f.key} className={on ? "on" : ""}>
                      <span className="pd-feature-icon">
                        <f.icon aria-hidden />
                      </span>
                      <span className="pd-feature-label">{f.label}</span>
                      <span className={`pd-feature-state ${on ? "yes" : "no"}`}>
                        {on ? <Check aria-hidden /> : <X aria-hidden />}
                        {on ? "Yes" : "No"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            {!property.features && <p className="field-hint">No sustainability record yet. Edit the property to add one.</p>}
          </section>

          <section className="pd-section">
            <h3 className="pd-section-title">
              <Database aria-hidden /> Computed by MySQL
            </h3>
            <DbInsights key={`${property.propertyId}-${property.price}`} propertyId={property.propertyId} />
          </section>

          <section className="pd-section">
            <h3 className="pd-section-title">Listing agent</h3>
            {property.agent ? (
              <Person name={property.agent.name} sub={[property.agent.email, property.agent.contactNo].filter(Boolean).join(" · ")} />
            ) : (
              <p className="muted">No agent assigned.</p>
            )}
          </section>

          <section className="pd-section">
            <h3 className="pd-section-title">Transactions</h3>
            {property.transactions.length ? (
              <ul className="mini-list">
                {property.transactions.map((t) => (
                  <li key={t.transactionId}>
                    <div>
                      <div className="mini-title">#{t.transactionId} · Client #{t.clientId}</div>
                      <div className="mini-sub">{formatDate(t.date)}</div>
                    </div>
                    <div className="mini-right">
                      <strong className="num">{formatINRCompact(t.amount)}</strong>
                      <Delta value={property.price ? t.amount / property.price - 1 : NaN} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No transactions yet.</p>
            )}
          </section>

          <section className="pd-section">
            <h3 className="pd-section-title">Price changes</h3>
            {property.logs.filter((l) => Number(l.oldPrice) !== Number(l.newPrice)).length ? (
              <ul className="mini-list">
                {property.logs
                  .filter((l) => Number(l.oldPrice) !== Number(l.newPrice))
                  .map((l) => (
                    <li key={l.logId}>
                      <div>
                        <div className="mini-title">
                          {formatINRCompact(l.oldPrice)} → {formatINRCompact(l.newPrice)}
                        </div>
                        <div className="mini-sub">{formatDateTime(l.updatedAt)}</div>
                      </div>
                      <Delta value={l.oldPrice ? l.newPrice / l.oldPrice - 1 : NaN} />
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="muted">No price changes recorded.</p>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
