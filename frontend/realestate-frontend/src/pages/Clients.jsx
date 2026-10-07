import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { useAuth, useConfirm, useData, useToast } from "../context/contexts";
import DataTable from "../components/ui/DataTable";
import { ClientTypeBadge, EmptyState, PageHeader, Person, SearchInput, Segmented } from "../components/ui/primitives";
import { ClientForm } from "../components/people/PersonForms";
import StrategyExplorer from "../components/people/StrategyExplorer";
import { api } from "../lib/api";
import { CLIENT_TYPES } from "../lib/domain";
import { CLIENT_META } from "../lib/meta";
import { matches, stop } from "../lib/events";
import { formatINRCompact } from "../lib/format";

export default function Clients() {
  const { clients, loading, reload } = useData();
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [kind, setKind] = useState("all");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const creatingFromUrl = params.get("new") === "1" && can.createClient;

  const openForm = (client) => {
    setEditing(client);
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

  const handleDelete = async (c) => {
    if (c.deals.length) {
      toast.error("Can't delete this client", `${c.name} has ${c.deals.length} transaction${c.deals.length > 1 ? "s" : ""} on record.`);
      return;
    }
    const ok = await confirm({ title: "Delete client?", text: `${c.name} will be permanently removed.`, confirmLabel: "Delete client" });
    if (!ok) return;
    try {
      await api.clients.remove(c.clientId);
      await reload(["clients"]);
      toast.success("Client deleted", c.name);
    } catch (err) {
      toast.error("Couldn't delete client", err.message);
    }
  };

  const counts = useMemo(() => {
    const out = { all: clients.length };
    CLIENT_TYPES.forEach((t) => (out[t] = clients.filter((c) => c.kind === t).length));
    return out;
  }, [clients]);

  const rows = useMemo(
    () =>
      clients
        .filter((c) => kind === "all" || c.kind === kind)
        .filter((c) => matches(query, c.clientId, c.name, c.email, c.contactNo, c.type)),
    [clients, kind, query]
  );

  const columns = [
    {
      key: "name",
      header: "Client",
      sort: (c) => c.name,
      render: (c) => <Person name={c.name} sub={`#${c.clientId}${c.email ? ` · ${c.email}` : ""}`} />,
    },
    {
      key: "contact",
      header: "Contact",
      render: (c) => (
        <div className="contact-links">
          {c.contactNo && (
            <a href={`tel:${c.contactNo}`} onClick={(e) => e.stopPropagation()}>
              <Phone aria-hidden /> {c.contactNo}
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} title={c.email}>
              <Mail aria-hidden /> Email
            </a>
          )}
          {!c.contactNo && !c.email && <span className="muted">—</span>}
        </div>
      ),
    },
    { key: "type", header: "Type", sort: (c) => c.kind, render: (c) => <ClientTypeBadge type={c.kind} /> },
    { key: "deals", header: "Deals", align: "right", sort: (c) => c.deals.length, render: (c) => <span className="num">{c.deals.length}</span> },
    {
      key: "value",
      header: "Deal value",
      align: "right",
      sort: (c) => c.totalValue,
      render: (c) => (c.totalValue ? <span className="num cell-strong">{formatINRCompact(c.totalValue)}</span> : <span className="muted">—</span>),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (c) => (
        <div className="row-actions">
          {can.editClient(c) && (
            <button type="button" className="icon-btn" onClick={stop(() => openForm(c))} aria-label={`Edit ${c.name}`}>
              <Pencil />
            </button>
          )}
          {can.deleteClient && (
            <button type="button" className="icon-btn danger" onClick={stop(() => handleDelete(c))} aria-label={`Delete ${c.name}`}>
              <Trash2 />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="People"
        icon={Users}
        title="Clients"
        description="Buyers, sellers and renters, with their deal history."
        actions={
          can.createClient && (
            <button className="btn btn-primary" onClick={() => openForm(null)}>
              <Plus /> Add client
            </button>
          )
        }
      />

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, phone…" />
        <Segmented
          id="client-kind"
          label="Filter by client type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "All", count: counts.all },
            ...CLIENT_TYPES.map((t) => ({ value: t, label: `${CLIENT_META[t].label}s`, count: counts[t] })),
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.clientId}
        loading={loading}
        onRowClick={(c) => can.editClient(c) && openForm(c)}
        initialSort={{ key: "name", dir: "asc" }}
        footer={`${rows.length} of ${clients.length} clients`}
        empty={
          <EmptyState
            icon={Users}
            title={clients.length ? "No clients match" : "No clients yet"}
            text={clients.length ? "Try another search or type." : "Add your first buyer, seller or renter."}
            action={
              !clients.length && (
                <button className="btn btn-primary" onClick={() => openForm(null)}>
                  <Plus /> Add client
                </button>
              )
            }
          />
        }
      />

      <div className="section">
        <StrategyExplorer />
      </div>

      <ClientForm
        key={`${formKey}-${loading}`}
        open={(formOpen || creatingFromUrl) && !loading}
        client={formOpen ? editing : null}
        onClose={closeForm}
      />
    </>
  );
}
