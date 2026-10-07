import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeftRight, BadgeIndianRupee, Calculator, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { useAuth, useConfirm, useData, useToast } from "../context/contexts";
import DataTable from "../components/ui/DataTable";
import { ClientTypeBadge, Delta, EmptyState, PageHeader, Person, SearchInput, StatCard } from "../components/ui/primitives";
import TransactionForm from "../components/transactions/TransactionForm";
import { api } from "../lib/api";
import { matches, stop } from "../lib/events";
import { formatDate, formatINR, formatINRCompact, formatSignedPercent, parseDate } from "../lib/format";

export default function Transactions() {
  const { transactions, loading, reload } = useData();
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const creatingFromUrl = params.get("new") === "1" && can.createTransaction;

  const openForm = (t) => {
    setEditing(t);
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

  const handleDelete = async (t) => {
    const ok = await confirm({
      title: `Delete transaction #${t.transactionId}?`,
      text: "The record will be removed and the property relisted as available (database trigger).",
      confirmLabel: "Delete transaction",
    });
    if (!ok) return;
    try {
      await api.transactions.remove(t.transactionId);
      await reload(["transactions", "properties"]);
      toast.success("Transaction deleted", `#${t.transactionId}`);
    } catch (err) {
      toast.error("Couldn't delete transaction", err.message);
    }
  };

  const rows = useMemo(
    () =>
      transactions.filter((t) =>
        matches(query, t.transactionId, t.property?.address, t.client?.name, t.propertyId, t.clientId)
      ),
    [transactions, query]
  );

  const stats = useMemo(() => {
    const total = transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const withList = transactions.filter((t) => t.property?.price);
    const vsList = withList.length
      ? withList.reduce((s, t) => s + (t.amount / t.property.price - 1), 0) / withList.length
      : NaN;
    return { total, avg: transactions.length ? total / transactions.length : 0, vsList };
  }, [transactions]);

  const columns = [
    {
      key: "id",
      header: "ID",
      sort: (t) => t.transactionId,
      render: (t) => <span className="num muted">#{t.transactionId}</span>,
    },
    {
      key: "date",
      header: "Date",
      sort: (t) => parseDate(t.date)?.getTime() ?? 0,
      render: (t) => formatDate(t.date),
    },
    {
      key: "property",
      header: "Property",
      sort: (t) => t.property?.address,
      className: "cell-wrap",
      render: (t) =>
        t.property ? (
          <Link to={`/properties?id=${t.propertyId}`} className="link-strong" onClick={(e) => e.stopPropagation()}>
            {t.property.address}
            <div className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
              {t.property.type} · listed {formatINRCompact(t.property.price)}
            </div>
          </Link>
        ) : (
          <span className="muted">Property #{t.propertyId}</span>
        ),
    },
    {
      key: "client",
      header: "Client",
      sort: (t) => t.client?.name,
      render: (t) =>
        t.client ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Person name={t.client.name} size="sm" />
            <ClientTypeBadge type={t.client.type?.toLowerCase()} />
          </div>
        ) : (
          <span className="muted">Client #{t.clientId}</span>
        ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sort: (t) => Number(t.amount),
      render: (t) => <span className="num cell-strong">{formatINR(t.amount)}</span>,
    },
    {
      key: "vs",
      header: "vs list",
      align: "right",
      sort: (t) => (t.property?.price ? t.amount / t.property.price : null),
      render: (t) => (t.property?.price ? <Delta value={t.amount / t.property.price - 1} /> : <span className="muted">—</span>),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (t) => (
        <div className="row-actions">
          {can.editTransaction(t) && (
            <button type="button" className="icon-btn" onClick={stop(() => openForm(t))} aria-label={`Edit transaction ${t.transactionId}`}>
              <Pencil />
            </button>
          )}
          {can.deleteTransaction && (
            <button type="button" className="icon-btn danger" onClick={stop(() => handleDelete(t))} aria-label={`Delete transaction ${t.transactionId}`}>
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
        eyebrow="Deals"
        icon={ArrowLeftRight}
        title={can.isClient ? "My deals" : "Transactions"}
        description={
          can.isClient
            ? "Properties you've bought or rented through us."
            : "Every closed deal. A database trigger blocks sales of properties with no sustainability features."
        }
        actions={
          can.createTransaction && (
            <button className="btn btn-primary" onClick={() => openForm(null)}>
              <Plus /> Record deal
            </button>
          )
        }
      />

      <div className="stats" style={{ marginBottom: 20 }}>
        <StatCard loading={loading} label="Total volume" icon={BadgeIndianRupee} value={formatINRCompact(stats.total)} foot={formatINR(stats.total)} />
        <StatCard loading={loading} label="Deals closed" icon={ArrowLeftRight} value={transactions.length} foot="All time" />
        <StatCard loading={loading} label="Average deal" icon={Calculator} value={formatINRCompact(stats.avg)} foot="Mean transaction amount" />
        <StatCard
          loading={loading}
          label="Price achieved"
          icon={Scale}
          value={Number.isFinite(stats.vsList) ? formatSignedPercent(stats.vsList) : "—"}
          foot="Average vs. current list price"
        />
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by property, client or ID…" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(t) => t.transactionId}
        loading={loading}
        onRowClick={(t) => can.editTransaction(t) && openForm(t)}
        initialSort={{ key: "date", dir: "desc" }}
        footer={`${rows.length} of ${transactions.length} transactions`}
        empty={
          <EmptyState
            icon={ArrowLeftRight}
            title={transactions.length ? "No transactions match" : "No deals yet"}
            text={transactions.length ? "Try another search." : "Record your first deal to see it here."}
            action={
              !transactions.length && can.createTransaction && (
                <button className="btn btn-primary" onClick={() => openForm(null)}>
                  <Plus /> Record deal
                </button>
              )
            }
          />
        }
      />

      <TransactionForm
        key={`${formKey}-${loading}`}
        open={(formOpen || creatingFromUrl) && !loading}
        transaction={formOpen ? editing : null}
        onClose={closeForm}
      />
    </>
  );
}
