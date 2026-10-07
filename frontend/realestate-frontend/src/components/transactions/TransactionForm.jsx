import { useState } from "react";
import { ArrowLeftRight, Pencil, ShieldAlert, ShieldCheck } from "lucide-react";
import Modal from "../ui/Modal";
import { Delta, Field, GreenLeaves } from "../ui/primitives";
import { useAuth, useData, useToast } from "../../context/contexts";
import { api } from "../../lib/api";
import { CLIENT_TYPES, nextId } from "../../lib/domain";
import { CLIENT_META } from "../../lib/meta";
import { formatINR, formatINRCompact, todayISO } from "../../lib/format";

function toISODate(value) {
  if (!value) return todayISO();
  if (Array.isArray(value)) {
    const [y, m, d] = value;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return String(value).slice(0, 10);
}

export default function TransactionForm({ open, transaction, onClose }) {
  const { properties, clients, raw, propertyById, reload } = useData();
  const { user, can } = useAuth();
  const toast = useToast();
  const isEdit = !!transaction;
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [amountEdited, setAmountEdited] = useState(isEdit);
  const [values, setValues] = useState(() =>
    transaction
      ? {
          transactionId: String(transaction.transactionId),
          date: toISODate(transaction.date),
          propertyId: String(transaction.propertyId),
          clientId: String(transaction.clientId),
          amount: String(transaction.amount ?? ""),
        }
      : { transactionId: String(nextId(raw.transactions, "transactionId", 301)), date: todayISO(), propertyId: "", clientId: "", amount: "" }
  );

  const property = values.propertyId ? propertyById.get(Number(values.propertyId)) : null;
  // No green features (or no sustainability record at all) → trg_check_sustainability rejects the sale.
  const blocked = !isEdit && property && property.score === 0;

  const errors = {};
  const id = Number(values.transactionId);
  if (!Number.isInteger(id) || id <= 0) errors.transactionId = "Enter a positive whole number";
  else if (!isEdit && raw.transactions.some((t) => t.transactionId === id)) errors.transactionId = `ID ${id} is already taken`;
  if (!values.propertyId) errors.propertyId = "Choose a property";
  if (!values.clientId) errors.clientId = "Choose a client";
  if (!(Number(values.amount) > 0)) errors.amount = "Enter an amount above zero";
  if (!values.date) errors.date = "Pick a date";
  const shown = touched ? errors : {};

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const onPropertyChange = (e) => {
    const pid = e.target.value;
    const p = propertyById.get(Number(pid));
    setValues((v) => ({ ...v, propertyId: pid, amount: !amountEdited && p ? String(p.price) : v.amount }));
  };

  // Available properties the user may sell (agents: their own listings), plus the current one when editing.
  const choices = properties
    .filter((p) => (p.available && (can.isAdmin || p.agentId === user.agentId)) || String(p.propertyId) === values.propertyId)
    .sort((a, b) => a.address.localeCompare(b.address));

  const submit = async () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      const body = {
        transactionId: id,
        date: values.date,
        propertyId: Number(values.propertyId),
        clientId: Number(values.clientId),
        amount: Number(values.amount),
      };
      if (isEdit) await api.transactions.update(id, body);
      else await api.transactions.create(body);
      await reload(["transactions", "properties", "logs"]);
      toast.success(isEdit ? "Transaction updated" : "Deal recorded", `${property?.address ?? ""} · ${formatINRCompact(values.amount)}`);
      onClose();
    } catch (err) {
      toast.error(isEdit ? "Couldn't update transaction" : "Couldn't record deal", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      as="form"
      onSubmit={submit}
      size="lg"
      icon={isEdit ? Pencil : ArrowLeftRight}
      title={isEdit ? `Edit transaction #${transaction.transactionId}` : "Record a deal"}
      subtitle={isEdit ? undefined : "Closing a deal marks the property as sold/let automatically (database trigger)."}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Record deal"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Property" required error={shown.propertyId} className="span-2">
          <select
            className="select"
            value={values.propertyId}
            onChange={onPropertyChange}
            aria-invalid={!!shown.propertyId}
            disabled={isEdit}
          >
            <option value="">{can.isAdmin ? "Select an available property…" : "Select one of your available listings…"}</option>
            {choices.map((p) => (
              <option key={p.propertyId} value={p.propertyId}>
                {p.address} — {formatINRCompact(p.price)} · {p.score}/3 green
              </option>
            ))}
          </select>
        </Field>

        {property && (
          <div className={`span-2 callout ${blocked ? "bad" : "good"}`}>
            {blocked ? <ShieldAlert /> : <ShieldCheck />}
            <div style={{ flex: 1 }}>
              {blocked ? (
                <>
                  <strong>This sale will be blocked.</strong> The trigger <code>trg_check_sustainability</code> rejects
                  properties with no green features. Add solar, rainwater or waste management to the property first.
                </>
              ) : (
                <>
                  <strong>Passes the sustainability check.</strong> Listed at {formatINR(property.price)}
                  {property.agent ? ` by ${property.agent.name}` : ""}.
                </>
              )}
            </div>
            <GreenLeaves score={property.score} />
          </div>
        )}

        <Field label="Client" required error={shown.clientId} className="span-2">
          <select className="select" value={values.clientId} onChange={set("clientId")} aria-invalid={!!shown.clientId}>
            <option value="">Select a client…</option>
            {CLIENT_TYPES.map((t) => {
              const group = clients.filter((c) => c.kind === t);
              return group.length ? (
                <optgroup key={t} label={`${CLIENT_META[t].label}s`}>
                  {group.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.name} (#{c.clientId})
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        </Field>

        <Field
          label="Amount"
          required
          error={shown.amount}
          hint={
            property && Number(values.amount) > 0 ? (
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                {formatINRCompact(values.amount)} · <Delta value={Number(values.amount) / property.price - 1} /> vs list
              </span>
            ) : undefined
          }
        >
          <div className="input-affix">
            <span className="affix">₹</span>
            <input
              className="input num"
              inputMode="decimal"
              value={values.amount}
              onChange={(e) => {
                setAmountEdited(true);
                set("amount")(e);
              }}
              aria-invalid={!!shown.amount}
            />
          </div>
        </Field>
        <Field label="Date" required error={shown.date}>
          <input className="input" type="date" value={values.date} onChange={set("date")} max={todayISO()} />
        </Field>
        <Field label="Transaction ID" required error={shown.transactionId} hint={isEdit ? "IDs can't be changed" : "Suggested next free ID"}>
          <input
            className="input num"
            inputMode="numeric"
            value={values.transactionId}
            onChange={set("transactionId")}
            disabled={isEdit}
            aria-invalid={!!shown.transactionId}
          />
        </Field>
      </div>
    </Modal>
  );
}
