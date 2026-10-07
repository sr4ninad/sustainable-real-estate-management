import { useState } from "react";
import { UserPlus, UserRound, Pencil } from "lucide-react";
import Modal from "../ui/Modal";
import { Field } from "../ui/primitives";
import { useData, useToast } from "../../context/contexts";
import { api } from "../../lib/api";
import { CLIENT_TYPES, clientType, nextId } from "../../lib/domain";
import { CLIENT_META } from "../../lib/meta";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s-]{6,14}$/;

function validatePerson(v, { idKey, isEdit, existing }) {
  const errors = {};
  const id = Number(v[idKey]);
  if (!v[idKey] || !Number.isInteger(id) || id <= 0) errors[idKey] = "Enter a positive whole number";
  else if (!isEdit && existing.some((x) => x[idKey] === id)) errors[idKey] = `ID ${id} is already taken`;
  if (!v.name.trim()) errors.name = "Name is required";
  if (v.email && !EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email";
  if (v.contactNo && !PHONE_RE.test(v.contactNo.trim())) errors.contactNo = "Enter a valid phone number (max 15 characters)";
  return errors;
}

function usePersonForm({ initial, idKey, isEdit, existing, extraValidate }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const run = (v) => ({ ...validatePerson(v, { idKey, isEdit, existing }), ...(extraValidate?.(v) || {}) });

  const set = (key) => (e) => {
    const next = { ...values, [key]: e?.target ? e.target.value : e };
    setValues(next);
    if (touched) setErrors(run(next));
  };

  const check = () => {
    setTouched(true);
    const errs = run(values);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  return { values, errors, set, check };
}

function ContactFields({ values, errors, set }) {
  return (
    <>
      <Field label="Email" error={errors.email}>
        <input className="input" type="email" value={values.email} onChange={set("email")} placeholder="name@example.com" aria-invalid={!!errors.email} />
      </Field>
      <Field label="Phone" error={errors.contactNo}>
        <input className="input num" type="tel" value={values.contactNo} onChange={set("contactNo")} placeholder="98765 43210" aria-invalid={!!errors.contactNo} maxLength={15} />
      </Field>
    </>
  );
}

export function ClientForm({ open, client, onClose, onSaved, lockType }) {
  const { raw, reload } = useData();
  const toast = useToast();
  const isEdit = !!client;
  const [saving, setSaving] = useState(false);
  const { values, errors, set, check } = usePersonForm({
    idKey: "clientId",
    isEdit,
    existing: raw.clients,
    initial: client
      ? { clientId: String(client.clientId), name: client.name ?? "", email: client.email ?? "", contactNo: client.contactNo ?? "", type: clientType(client) || "buyer" }
      : { clientId: String(nextId(raw.clients, "clientId", 101)), name: "", email: "", contactNo: "", type: "buyer" },
  });

  const submit = async () => {
    if (!check()) return;
    setSaving(true);
    try {
      const body = {
        clientId: Number(values.clientId),
        name: values.name.trim(),
        email: values.email.trim() || null,
        contactNo: values.contactNo.trim() || null,
        // DB column is ENUM('Buyer','Seller','Renter')
        type: CLIENT_META[values.type].label,
      };
      if (isEdit) await api.clients.update(client.clientId, body);
      else await api.clients.create(body);
      await reload(["clients"]);
      onSaved?.();
      toast.success(isEdit ? "Client updated" : "Client added", values.name.trim());
      onClose();
    } catch (err) {
      toast.error("Couldn't save client", err.message);
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
      icon={isEdit ? Pencil : UserPlus}
      title={isEdit ? `Edit ${client.name}` : "Add a client"}
      subtitle={isEdit ? `Client #${client.clientId}` : "Register a buyer, seller or renter."}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add client"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        {!lockType && <div className="span-2 type-picker" role="radiogroup" aria-label="Client type">
          {CLIENT_TYPES.map((t) => {
            const meta = CLIENT_META[t];
            const on = values.type === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={on}
                className={`type-option ${on ? "on" : ""}`}
                onClick={() => set("type")(t)}
              >
                <meta.icon aria-hidden />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>}
        <Field label="Client ID" required error={errors.clientId} hint={isEdit ? "IDs can't be changed" : "Suggested next free ID"}>
          <input className="input num" inputMode="numeric" value={values.clientId} onChange={set("clientId")} disabled={isEdit} aria-invalid={!!errors.clientId} />
        </Field>
        <Field label="Full name" required error={errors.name}>
          <input className="input" value={values.name} onChange={set("name")} placeholder="e.g. Priya Sharma" aria-invalid={!!errors.name} />
        </Field>
        <ContactFields values={values} errors={errors} set={set} />
      </div>
    </Modal>
  );
}

export function AgentForm({ open, agent, onClose, onSaved }) {
  const { raw, reload } = useData();
  const toast = useToast();
  const isEdit = !!agent;
  const [saving, setSaving] = useState(false);
  const { values, errors, set, check } = usePersonForm({
    idKey: "agentId",
    isEdit,
    existing: raw.agents,
    initial: agent
      ? { agentId: String(agent.agentId), name: agent.name ?? "", email: agent.email ?? "", contactNo: agent.contactNo ?? "" }
      : { agentId: String(nextId(raw.agents, "agentId", 1)), name: "", email: "", contactNo: "" },
  });

  const submit = async () => {
    if (!check()) return;
    setSaving(true);
    try {
      const body = {
        agentId: Number(values.agentId),
        name: values.name.trim(),
        email: values.email.trim() || null,
        contactNo: values.contactNo.trim() || null,
      };
      if (isEdit) await api.agents.update(agent.agentId, body);
      else await api.agents.create(body);
      await reload(["agents"]);
      onSaved?.();
      toast.success(isEdit ? "Agent updated" : "Agent added", values.name.trim());
      onClose();
    } catch (err) {
      toast.error("Couldn't save agent", err.message);
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
      icon={isEdit ? Pencil : UserRound}
      title={isEdit ? `Edit ${agent.name}` : "Add an agent"}
      subtitle={isEdit ? `Agent #${agent.agentId}` : "Agents can be assigned as the listing agent on properties."}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add agent"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Agent ID" required error={errors.agentId} hint={isEdit ? "IDs can't be changed" : "Suggested next free ID"}>
          <input className="input num" inputMode="numeric" value={values.agentId} onChange={set("agentId")} disabled={isEdit} aria-invalid={!!errors.agentId} />
        </Field>
        <Field label="Full name" required error={errors.name}>
          <input className="input" value={values.name} onChange={set("name")} placeholder="e.g. Arjun Mehta" aria-invalid={!!errors.name} />
        </Field>
        <ContactFields values={values} errors={errors} set={set} />
      </div>
    </Modal>
  );
}
