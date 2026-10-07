import { useEffect, useState } from "react";
import { Calculator, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { CLIENT_TYPES } from "../../lib/domain";
import { CLIENT_META } from "../../lib/meta";
import { formatINR, formatINRCompact } from "../../lib/format";
import { useData } from "../../context/contexts";
import { Delta, EmptyState, Segmented, Skeleton } from "../ui/primitives";

// Rates come from ConfigManager (Singleton); only buyers get the promotional discount.
const EXPLAIN = {
  buyer: { strategy: "BuyerStrategy", steps: ["5% buyer discount", "10% promotion (ConfigManager.discountRate)"], net: "85.5% of list price" },
  seller: { strategy: "SellerStrategy", steps: ["10% markup (ConfigManager.sellerMarkup)"], net: "110% of list price" },
  renter: { strategy: "RenterStrategy", steps: ["2% of price per month (ConfigManager.monthlyRentRate)"], net: "2% of list price, per month" },
};

function StrategyTable({ type }) {
  const { propertyById } = useData();
  const [state, setState] = useState({ loading: true, rows: [] });

  useEffect(() => {
    let cancelled = false;
    api.properties
      .withStrategy(type)
      .then((rows) => !cancelled && setState({ loading: false, rows: Array.isArray(rows) ? rows : [] }))
      .catch((err) => !cancelled && setState({ loading: false, rows: [], error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [type]);

  if (state.loading) {
    return (
      <div style={{ display: "grid", gap: 10, padding: "4px 0" }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={28} />
        ))}
      </div>
    );
  }
  if (state.error) return <EmptyState error title="Couldn't load pricing" text={state.error} />;
  if (!state.rows.length) return <EmptyState icon={Calculator} title="No properties to price" />;

  return (
    <div className="table-wrap">
      <table className="table compact">
        <thead>
          <tr>
            <th>Property</th>
            <th className="align-right">List price</th>
            <th className="align-right">{CLIENT_META[type].strategy}</th>
            <th className="align-right">Change</th>
          </tr>
        </thead>
        <tbody>
          {state.rows.map((row) => {
            const list = propertyById.get(row.propertyId)?.price;
            return (
              <tr key={row.propertyId}>
                <td>
                  <div className="cell-strong">{row.address}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    #{row.propertyId} · {row.type}
                  </div>
                </td>
                <td className="align-right num muted">{list != null ? formatINRCompact(list) : "—"}</td>
                <td className="align-right num cell-strong">
                  {formatINR(row.price)}
                  {type === "renter" && <span className="muted"> /mo</span>}
                </td>
                <td className="align-right">{list ? <Delta value={row.price / list - 1} goodWhenUp={type === "seller"} /> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Shows the backend's Strategy pattern (+ Singleton config) applied to every property. */
export default function StrategyExplorer({ initialType = "buyer" }) {
  const [type, setType] = useState(initialType);
  const info = EXPLAIN[type];

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">
            <Sparkles className="title-icon" aria-hidden /> Dynamic pricing
          </h2>
          <p className="card-sub">What each property costs for each kind of client, calculated by the backend.</p>
        </div>
        <Segmented
          id="strategy"
          label="Client type"
          value={type}
          onChange={setType}
          options={CLIENT_TYPES.map((t) => ({ value: t, label: CLIENT_META[t].label, icon: CLIENT_META[t].icon }))}
        />
      </div>
      <div className="card-body">
        <div className="formula">
          <code>{info.strategy}</code>
          {info.steps.map((step, i) => (
            <span key={step} className="formula-step">
              {i > 0 && <span className="formula-op">then</span>} {step}
            </span>
          ))}
          <span className="formula-op">=</span>
          <strong>{info.net}</strong>
        </div>
        <StrategyTable key={type} type={type} />
      </div>
    </section>
  );
}
