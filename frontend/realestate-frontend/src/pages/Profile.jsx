import { useState } from "react";
import { KeyRound, Mail, Pencil, Phone, UserCog } from "lucide-react";
import { useAuth, useData, useToast } from "../context/contexts";
import { AgentForm, ClientForm } from "../components/people/PersonForms";
import { Avatar, ClientTypeBadge, Field, PageHeader } from "../components/ui/primitives";
import { api } from "../lib/api";
import { formatINRCompact } from "../lib/format";
import { ROLE_LABELS } from "../lib/permissions";

function PasswordCard() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (next.length < 6) return setError("The new password must be at least 6 characters.");
    if (next !== confirmNext) return setError("The new passwords don't match.");
    setSaving(true);
    try {
      await api.auth.changePassword(current, next);
      toast.success("Password changed", "Use your new password next time you sign in.");
      setCurrent("");
      setNext("");
      setConfirmNext("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={submit} noValidate>
      <div className="card-head">
        <div>
          <h2 className="card-title">
            <KeyRound className="title-icon" aria-hidden /> Change password
          </h2>
          <p className="card-sub">At least 6 characters.</p>
        </div>
      </div>
      <div className="card-body stack-16">
        <Field label="Current password">
          <input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password">
          <input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password" error={error}>
          <input className="input" type="password" autoComplete="new-password" value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} />
        </Field>
        <div>
          <button type="submit" className="btn btn-primary" disabled={saving || !current || !next}>
            {saving ? "Saving…" : "Update password"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { agentById, clientById, agents, clients } = useData();
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState(false);

  const record = user.agentId ? agentById.get(user.agentId) : user.clientId ? clientById.get(user.clientId) : null;
  const richAgent = user.agentId ? agents.find((a) => a.agentId === user.agentId) : null;
  const richClient = user.clientId ? clients.find((c) => c.clientId === user.clientId) : null;

  return (
    <>
      <PageHeader eyebrow="Account" icon={UserCog} title="Your profile" description="Your sign-in details and contact information." />

      <div className="profile-grid">
        <section className="card card-pad profile-card">
          <div className="profile-top">
            <Avatar name={user.displayName} size="lg" />
            <div>
              <h2 className="profile-name">{user.displayName}</h2>
              <div className="profile-meta">
                <span className="badge outline">{ROLE_LABELS[user.role]}</span>
                {user.clientType && <ClientTypeBadge type={user.clientType} />}
                <span className="muted">Signed in as {user.username}</span>
              </div>
            </div>
          </div>

          {record ? (
            <>
              <dl className="profile-details">
                <div>
                  <dt>
                    <Mail aria-hidden /> Email
                  </dt>
                  <dd>{record.email || <span className="muted">Not set</span>}</dd>
                </div>
                <div>
                  <dt>
                    <Phone aria-hidden /> Phone
                  </dt>
                  <dd>{record.contactNo || <span className="muted">Not set</span>}</dd>
                </div>
                {richAgent && (
                  <div>
                    <dt>Your listings</dt>
                    <dd>
                      {richAgent.listings.length} · {formatINRCompact(richAgent.portfolioValue)}
                    </dd>
                  </div>
                )}
                {richClient && (
                  <div>
                    <dt>Your deals</dt>
                    <dd>
                      {richClient.deals.length} · {formatINRCompact(richClient.totalValue)}
                    </dd>
                  </div>
                )}
              </dl>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setFormKey((k) => k + 1);
                  setEditing(true);
                }}
              >
                <Pencil /> Edit contact details
              </button>
            </>
          ) : (
            <p className="muted">Admin accounts aren't linked to an agent or client record.</p>
          )}
        </section>

        <PasswordCard />
      </div>

      {user.agentId && record && (
        <AgentForm key={formKey} open={editing} agent={record} onClose={() => setEditing(false)} onSaved={refreshUser} />
      )}
      {user.clientId && record && (
        <ClientForm key={formKey} open={editing} client={record} lockType onClose={() => setEditing(false)} onSaved={refreshUser} />
      )}
    </>
  );
}
