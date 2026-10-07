import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, LayoutGrid, List, Maximize2, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth, useConfirm, useData, useToast } from "../context/contexts";
import DataTable from "../components/ui/DataTable";
import {
  EmptyState,
  EnergyBadge,
  GreenLeaves,
  PageHeader,
  SearchInput,
  Segmented,
  Skeleton,
  StatusBadge,
  Avatar,
} from "../components/ui/primitives";
import PropertyForm from "../components/properties/PropertyForm";
import PropertyDrawer from "../components/properties/PropertyDrawer";
import PropertyVisual from "../components/properties/PropertyVisual";
import { api } from "../lib/api";
import { energyRank, isCertified } from "../lib/domain";
import { matches, stop } from "../lib/events";
import { formatINR, formatINRCompact, formatNumber } from "../lib/format";

const SORTS = {
  newest: { label: "Newest first", fn: (a, b) => b.propertyId - a.propertyId },
  priceDesc: { label: "Price: high to low", fn: (a, b) => b.price - a.price },
  priceAsc: { label: "Price: low to high", fn: (a, b) => a.price - b.price },
  green: { label: "Greenest first", fn: (a, b) => b.score - a.score || energyRank(a.energyEfficiency) - energyRank(b.energyEfficiency) },
  size: { label: "Largest first", fn: (a, b) => (b.size || 0) - (a.size || 0) },
};

function readView() {
  try {
    return localStorage.getItem("properties.view") === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
}

function PropertyCard({ property: p, onOpen, index }) {
  return (
    <motion.article
      className="card prop-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <button type="button" className="prop-card-btn" onClick={() => onOpen(p)} aria-label={`Open ${p.address}`}>
        <PropertyVisual property={p} />
        <div className="prop-card-status">
          <StatusBadge available={p.available} />
        </div>
        <div className="prop-card-body">
          <div className="prop-card-price">
            <span>{formatINRCompact(p.price)}</span>
            {p.pricePerSqft && <small className="num">{formatINR(p.pricePerSqft)}/sq ft</small>}
          </div>
          <h3 className="prop-card-title">{p.address}</h3>
          <div className="prop-card-meta">
            <span>
              <Maximize2 aria-hidden /> {p.size ? `${formatNumber(p.size)} sq ft` : "Size n/a"}
            </span>
            <span>#{p.propertyId}</span>
          </div>
          <div className="prop-card-foot">
            <div className="prop-card-green">
              <GreenLeaves score={p.score} />
              <EnergyBadge rating={p.energyEfficiency} />
              {isCertified(p.greenCertification) && <span className="badge good">{p.greenCertification}</span>}
            </div>
            {p.agent && (
              <span title={`Agent: ${p.agent.name}`}>
                <Avatar name={p.agent.name} size="sm" />
              </span>
            )}
          </div>
        </div>
      </button>
    </motion.article>
  );
}

export default function Properties() {
  const data = useData();
  const { properties, loading, reload } = data;
  const { user, can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState(params.get("q") || "");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setViewState] = useState(readView);
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  const setView = (v) => {
    setViewState(v);
    try {
      localStorage.setItem("properties.view", v);
    } catch {
      /* ignore */
    }
  };

  const creatingFromUrl = params.get("new") === "1" && can.createProperty;
  const selectedId = Number(params.get("id")) || null;
  const selected = selectedId ? data.propertyById.get(selectedId) || null : null;

  const updateParams = (fn) => {
    const next = new URLSearchParams(params);
    fn(next);
    setParams(next, { replace: true });
  };

  const openCreate = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const openEdit = (p) => {
    updateParams((n) => n.delete("id"));
    setEditing(p);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    if (creatingFromUrl) updateParams((n) => n.delete("new"));
  };

  const handleDelete = async (p) => {
    if (p.transactions.length) {
      toast.error(
        "Can't delete this property",
        `It has ${p.transactions.length} transaction${p.transactions.length > 1 ? "s" : ""}. Delete those first.`
      );
      return;
    }
    const ok = await confirm({
      title: "Delete property?",
      text: `“${p.address}” and its sustainability record will be permanently removed.`,
      confirmLabel: "Delete property",
    });
    if (!ok) return;
    try {
      await api.properties.remove(p.propertyId);
      updateParams((n) => n.delete("id"));
      await reload(["properties", "features", "logs"]);
      toast.success("Property deleted", p.address);
    } catch (err) {
      toast.error("Couldn't delete property", err.message);
    }
  };

  const types = useMemo(() => [...new Set(properties.map((p) => p.type).filter(Boolean))].sort(), [properties]);

  const filtered = useMemo(
    () =>
      properties
        .filter((p) => matches(query, p.propertyId, p.address, p.type, p.greenCertification, p.agent?.name))
        .filter((p) => (status === "all" ? true : status === "available" ? p.available : !p.available))
        .filter((p) => type === "all" || p.type === type)
        .filter((p) => owner === "all" || p.agentId === user.agentId)
        .sort(SORTS[sort].fn),
    [properties, query, status, type, sort, owner, user.agentId]
  );

  const availableCount = properties.filter((p) => p.available).length;

  const columns = [
    {
      key: "address",
      header: "Property",
      className: "cell-wrap",
      sort: (p) => p.address,
      render: (p) => (
        <div>
          <div className="cell-strong">{p.address}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            #{p.propertyId} · {p.type || "—"}
          </div>
        </div>
      ),
    },
    { key: "price", header: "Price", align: "right", sort: (p) => p.price, render: (p) => <span className="num cell-strong">{formatINR(p.price)}</span> },
    { key: "size", header: "Size", align: "right", sort: (p) => p.size, render: (p) => <span className="num">{p.size ? `${formatNumber(p.size)} sq ft` : "—"}</span> },
    { key: "energy", header: "Energy", align: "center", sort: (p) => energyRank(p.energyEfficiency), render: (p) => <EnergyBadge rating={p.energyEfficiency} /> },
    { key: "green", header: "Green", sort: (p) => p.score, render: (p) => <GreenLeaves score={p.score} /> },
    {
      key: "cert",
      header: "Certification",
      sort: (p) => p.greenCertification,
      render: (p) => (isCertified(p.greenCertification) ? <span className="badge good">{p.greenCertification}</span> : <span className="muted">None</span>),
    },
    { key: "status", header: "Status", sort: (p) => (p.available ? 0 : 1), render: (p) => <StatusBadge available={p.available} /> },
    { key: "agent", header: "Agent", sort: (p) => p.agent?.name, render: (p) => p.agent?.name ?? <span className="muted">—</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (p) =>
        can.editProperty(p) ? (
          <div className="row-actions">
            <button type="button" className="icon-btn" onClick={stop(() => openEdit(p))} aria-label={`Edit ${p.address}`}>
              <Pencil />
            </button>
            <button type="button" className="icon-btn danger" onClick={stop(() => handleDelete(p))} aria-label={`Delete ${p.address}`}>
              <Trash2 />
            </button>
          </div>
        ) : null,
    },
  ];

  const emptyState = (
    <EmptyState
      icon={Building2}
      title={properties.length ? "No properties match" : "No properties yet"}
      text={properties.length ? "Try a different search or clear the filters." : "Add your first listing to get started."}
      action={
        properties.length ? (
          <button
            className="btn"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setType("all");
              setOwner("all");
            }}
          >
            Clear filters
          </button>
        ) : can.createProperty ? (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus /> Add property
          </button>
        ) : null
      }
    />
  );

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        icon={Building2}
        title="Properties"
        description={
          can.isClient
            ? "Browse listings and their green credentials. Click a property for full details."
            : can.isAgent
              ? "Every listing in the portfolio. You can edit and sell the ones assigned to you."
              : "Every listing with its price, energy rating and green credentials. Click a property for full details."
        }
        actions={
          can.createProperty && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus /> Add property
            </button>
          )
        }
      />

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search properties…" />
        <Segmented
          id="prop-status"
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All", count: properties.length },
            { value: "available", label: "Available", count: availableCount },
            { value: "sold", label: "Sold / let", count: properties.length - availableCount },
          ]}
        />
        {can.isAgent && (
          <Segmented
            id="prop-owner"
            label="Whose listings"
            value={owner}
            onChange={setOwner}
            options={[
              { value: "all", label: "All listings" },
              { value: "mine", label: "My listings", count: properties.filter((p) => p.agentId === user.agentId).length },
            ]}
          />
        )}
        <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <span className="spacer" />
        {view === "grid" && (
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {Object.entries(SORTS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        <Segmented
          id="prop-view"
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "grid", label: "", icon: LayoutGrid, title: "Grid view" },
            { value: "table", label: "", icon: List, title: "Table view" },
          ]}
        />
      </div>

      {view === "grid" ? (
        loading ? (
          <div className="prop-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ overflow: "hidden" }}>
                <Skeleton height={130} radius={0} />
                <div style={{ padding: 16, display: "grid", gap: 10 }}>
                  <Skeleton width="40%" height={20} />
                  <Skeleton width="80%" />
                  <Skeleton width="60%" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length ? (
          <div className="prop-grid">
            {filtered.map((p, i) => (
              <PropertyCard key={p.propertyId} property={p} index={i} onOpen={(x) => updateParams((n) => n.set("id", x.propertyId))} />
            ))}
          </div>
        ) : (
          <div className="card">{emptyState}</div>
        )
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.propertyId}
          loading={loading}
          onRowClick={(p) => updateParams((n) => n.set("id", p.propertyId))}
          empty={emptyState}
          footer={`${filtered.length} of ${properties.length} properties`}
        />
      )}

      {!loading && view === "grid" && filtered.length > 0 && (
        <p className="result-count" style={{ marginTop: 14 }}>
          Showing {filtered.length} of {properties.length} properties
        </p>
      )}

      <PropertyForm
        key={`${formKey}-${loading}`}
        open={(formOpen || creatingFromUrl) && !loading}
        property={formOpen ? editing : null}
        onClose={closeForm}
      />

      <PropertyDrawer
        property={selected}
        onClose={() => updateParams((n) => n.delete("id"))}
        onEdit={openEdit}
        onDelete={handleDelete}
        canEdit={selected ? can.editProperty(selected) : false}
      />
    </>
  );
}
