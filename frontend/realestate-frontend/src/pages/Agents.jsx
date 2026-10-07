import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Mail, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { useAuth, useConfirm, useData, useToast } from "../context/contexts";
import { Avatar, EmptyState, PageHeader, SearchInput, Skeleton } from "../components/ui/primitives";
import { AgentForm } from "../components/people/PersonForms";
import { api } from "../lib/api";
import { matches } from "../lib/events";
import { formatINRCompact } from "../lib/format";

const SORTS = {
  closed: { label: "Top performers", fn: (a, b) => b.closedValue - a.closedValue || b.portfolioValue - a.portfolioValue },
  portfolio: { label: "Largest portfolio", fn: (a, b) => b.portfolioValue - a.portfolioValue },
  name: { label: "Name A–Z", fn: (a, b) => a.name.localeCompare(b.name) },
};

function AgentCard({ agent: a, rank, onEdit, onDelete, index, canEdit, canDelete, isMe, showStats }) {
  return (
    <motion.article
      className="card agent-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="agent-top">
        <Avatar name={a.name} size="lg" />
        <div className="agent-id">
          <h3 className="agent-name">{a.name}</h3>
          <div className="agent-meta">
            <span className="muted">Agent #{a.agentId}</span>
            {isMe && <span className="badge info">You</span>}
            {showStats && rank === 0 && a.closedValue > 0 && <span className="badge good">Top performer</span>}
          </div>
        </div>
        <div className="agent-actions">
          {canEdit && (
            <button type="button" className="icon-btn" onClick={() => onEdit(a)} aria-label={`Edit ${a.name}`}>
              <Pencil />
            </button>
          )}
          {canDelete && (
            <button type="button" className="icon-btn danger" onClick={() => onDelete(a)} aria-label={`Delete ${a.name}`}>
              <Trash2 />
            </button>
          )}
        </div>
      </div>

      <div className="agent-contact">
        {a.email ? (
          <a href={`mailto:${a.email}`}>
            <Mail aria-hidden /> {a.email}
          </a>
        ) : (
          <span className="muted">
            <Mail aria-hidden /> No email
          </span>
        )}
        {a.contactNo ? (
          <a href={`tel:${a.contactNo}`}>
            <Phone aria-hidden /> {a.contactNo}
          </a>
        ) : (
          <span className="muted">
            <Phone aria-hidden /> No phone
          </span>
        )}
      </div>

      {showStats && (
      <dl className="agent-stats">
        <div>
          <dt>Listings</dt>
          <dd>
            {a.listings.length}
            <small> · {a.availableCount} open</small>
          </dd>
        </div>
        <div>
          <dt>Portfolio</dt>
          <dd>{formatINRCompact(a.portfolioValue)}</dd>
        </div>
        <div>
          <dt>Closed deals</dt>
          <dd>
            {a.deals.length}
            <small> · {formatINRCompact(a.closedValue)}</small>
          </dd>
        </div>
        <div>
          <dt title="3% of closed deal value">Est. commission</dt>
          <dd className="accent">{formatINRCompact(a.commission)}</dd>
        </div>
      </dl>
      )}

      {a.listings.length > 0 && (
        <div className="agent-listings">
          {a.listings.slice(0, 3).map((p) => (
            <Link key={p.propertyId} to={`/properties?id=${p.propertyId}`} className="agent-listing">
              <Building2 aria-hidden />
              <span>{p.address}</span>
            </Link>
          ))}
          {a.listings.length > 3 && <span className="muted">+{a.listings.length - 3} more</span>}
        </div>
      )}
    </motion.article>
  );
}

export default function Agents() {
  const { agents, loading, reload } = useData();
  const { user, can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [sort, setSort] = useState("closed");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const creatingFromUrl = params.get("new") === "1" && can.createAgent;

  const openForm = (agent) => {
    setEditing(agent);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    if (creatingFromUrl) {
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });
    }
  };

  const handleDelete = async (a) => {
    if (a.listings.length) {
      toast.error(
        "Can't delete this agent",
        `${a.name} is the listing agent on ${a.listings.length} propert${a.listings.length > 1 ? "ies" : "y"}. Reassign them first.`
      );
      return;
    }
    const ok = await confirm({ title: "Delete agent?", text: `${a.name} will be permanently removed.`, confirmLabel: "Delete agent" });
    if (!ok) return;
    try {
      await api.agents.remove(a.agentId);
      await reload(["agents"]);
      toast.success("Agent deleted", a.name);
    } catch (err) {
      toast.error("Couldn't delete agent", err.message);
    }
  };

  const ranked = useMemo(() => [...agents].sort(SORTS.closed.fn), [agents]);
  const topId = ranked[0]?.agentId;

  const rows = useMemo(
    () => agents.filter((a) => matches(query, a.agentId, a.name, a.email, a.contactNo)).sort(SORTS[sort].fn),
    [agents, query, sort]
  );

  const totals = useMemo(
    () => ({
      listings: agents.reduce((s, a) => s + a.listings.length, 0),
      closed: agents.reduce((s, a) => s + a.closedValue, 0),
      commission: agents.reduce((s, a) => s + a.commission, 0),
    }),
    [agents]
  );

  return (
    <>
      <PageHeader
        eyebrow="People"
        icon={UserRound}
        title="Agents"
        description={
          loading || can.isClient
            ? can.isClient
              ? "Get in touch with the agent handling a property you like."
              : "Your team and how their portfolios are performing."
            : `${agents.length} agents managing ${totals.listings} listings · ${formatINRCompact(totals.closed)} closed · ${formatINRCompact(
                totals.commission
              )} est. commission`
        }
        actions={
          can.createAgent && (
            <button className="btn btn-primary" onClick={() => openForm(null)}>
              <Plus /> Add agent
            </button>
          )
        }
      />

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search agents…" />
        <span className="spacer" />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort agents">
          {Object.entries(SORTS).map(([k, s]) => (
            <option key={k} value={k}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="agent-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card card-pad" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Skeleton width={52} height={52} radius="50%" />
                <Skeleton width="50%" height={18} />
              </div>
              <Skeleton height={60} />
            </div>
          ))}
        </div>
      ) : rows.length ? (
        <div className="agent-grid">
          {rows.map((a, i) => (
            <AgentCard
              key={a.agentId}
              agent={a}
              index={i}
              rank={a.agentId === topId ? 0 : 1}
              onEdit={openForm}
              onDelete={handleDelete}
              canEdit={can.editAgent(a)}
              canDelete={can.deleteAgent}
              isMe={a.agentId === user.agentId}
              showStats={!can.isClient}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={UserRound}
            title={agents.length ? "No agents match" : "No agents yet"}
            text={agents.length ? "Try a different search." : "Add an agent so they can be assigned to listings."}
            action={
              !agents.length && can.createAgent && (
                <button className="btn btn-primary" onClick={() => openForm(null)}>
                  <Plus /> Add agent
                </button>
              )
            }
          />
        </div>
      )}

      <AgentForm
        key={`${formKey}-${loading}`}
        open={(formOpen || creatingFromUrl) && !loading}
        agent={formOpen ? editing : null}
        onClose={closeForm}
      />
    </>
  );
}
