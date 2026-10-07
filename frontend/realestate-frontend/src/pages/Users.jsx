import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, ShieldCheck, Trash2, UserCheck, UserX, Wand2 } from "lucide-react";
import { useAuth, useConfirm, useData, useToast } from "../context/contexts";
import DataTable from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import { EmptyState, Field, PageHeader, Person, SearchInput, Segmented, StatCard } from "../components/ui/primitives";
import { api } from "../lib/api";
import { matches, stop } from "../lib/events";
import { formatDateTime, formatRelative } from "../lib/format";
import { ROLE_LABELS } from "../lib/permissions";

const ROLE_TONES = { ADMIN: "bad", AGENT: "info", CLIENT: "good" };

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function CreateUserModal({ open, onClose, users, onCreated }) {
  const { agents, clients } = useData();
  const toast = useToast();
  const [role, setRole] = useState("AGENT");
  const [linkId, setLinkId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const linkedAgentIds = new Set(users.map((u) => u.agentId).filter(Boolean));
  const linkedClientIds = new Set(users.map((u) => u.clientId).filter(Boolean));
  const agentChoices = agents.filter((a) => !linkedAgentIds.has(a.agentId));
  const clientChoices = clients.filter((c) => !linkedClientIds.has(c.clientId));

  const pickLink = (value) => {
    setLinkId(value);
    if (!username && value) setUsername(`${role === "AGENT" ? "agent" : "client"}${value}`);
  };

  const submit = async () => {
    setError(null);
    if (role !== "ADMIN" && !linkId) {
      setError(`Choose the ${role === "AGENT" ? "agent" : "client"} this login belongs to.`);
      return;
    }
    setSaving(true);
    try {
      await api.users.create({
        username: username.trim(),
        password,
        role,
        agentId: role === "AGENT" ? Number(linkId) : null,
        clientId: role === "CLIENT" ? Number(linkId) : null,
      });
      toast.success("Login created", `${username.trim()} can now sign in.`);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
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
      icon={KeyRound}
      title="Create a login"
      subtitle="Give an agent or client access, or add another admin."
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create login"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="span-2">
          <Segmented
            id="new-user-role"
            label="Role"
            value={role}
            onChange={(r) => {
              setRole(r);
              setLinkId("");
            }}
            options={["AGENT", "CLIENT", "ADMIN"].map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          />
        </div>
        {role === "AGENT" && (
          <Field label="Agent" required className="span-2" hint={agentChoices.length ? undefined : "Every agent already has a login."}>
            <select className="select" value={linkId} onChange={(e) => pickLink(e.target.value)}>
              <option value="">Select an agent…</option>
              {agentChoices.map((a) => (
                <option key={a.agentId} value={a.agentId}>
                  {a.name} (#{a.agentId})
                </option>
              ))}
            </select>
          </Field>
        )}
        {role === "CLIENT" && (
          <Field label="Client" required className="span-2" hint={clientChoices.length ? undefined : "Every client already has a login."}>
            <select className="select" value={linkId} onChange={(e) => pickLink(e.target.value)}>
              <option value="">Select a client…</option>
              {clientChoices.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.name} (#{c.clientId})
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Username" required hint="3–40 letters, numbers, dots, dashes or underscores">
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Temporary password" required hint="Share it securely; they can change it from their profile.">
          <div className="input-affix">
            <input
              className="input num"
              style={{ paddingLeft: 12, paddingRight: 42 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="icon-btn password-toggle"
              onClick={() => setPassword(generatePassword())}
              aria-label="Generate a new password"
              title="Generate"
            >
              <Wand2 />
            </button>
          </div>
        </Field>
        {error && <p className="span-2 field-error">{error}</p>}
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState(generatePassword);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.users.update(user.userId, { password });
      toast.success("Password reset", `New password for ${user.username}: ${password}`);
      onClose();
    } catch (err) {
      toast.error("Couldn't reset password", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      as="form"
      onSubmit={submit}
      size="sm"
      icon={KeyRound}
      title="Reset password"
      subtitle={user ? `For ${user.username}` : undefined}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Reset password"}
          </button>
        </>
      }
    >
      <Field label="New password" hint="At least 6 characters. Share it securely.">
        <div className="input-affix">
          <input
            className="input num"
            style={{ paddingLeft: 12, paddingRight: 42 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="icon-btn password-toggle"
            onClick={() => setPassword(generatePassword())}
            aria-label="Generate a new password"
          >
            <Wand2 />
          </button>
        </div>
      </Field>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [state, setState] = useState({ loading: true, users: [], error: null });
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [createKey, setCreateKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetting, setResetting] = useState(null);

  const load = useCallback(async () => {
    try {
      const users = await api.users.list();
      setState({ loading: false, users, error: null });
    } catch (err) {
      setState({ loading: false, users: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.users
      .list()
      .then((users) => !cancelled && setState({ loading: false, users, error: null }))
      .catch((err) => !cancelled && setState({ loading: false, users: [], error: err.message }));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleEnabled = async (u) => {
    if (u.enabled) {
      const ok = await confirm({
        title: `Disable ${u.username}?`,
        text: "They won't be able to sign in until you enable the account again.",
        confirmLabel: "Disable login",
      });
      if (!ok) return;
    }
    try {
      await api.users.update(u.userId, { enabled: !u.enabled });
      await load();
      toast.success(u.enabled ? "Login disabled" : "Login enabled", u.username);
    } catch (err) {
      toast.error("Couldn't update login", err.message);
    }
  };

  const remove = async (u) => {
    const ok = await confirm({
      title: `Delete ${u.username}?`,
      text: "The login is removed. Their agent or client record stays.",
      confirmLabel: "Delete login",
    });
    if (!ok) return;
    try {
      await api.users.remove(u.userId);
      await load();
      toast.success("Login deleted", u.username);
    } catch (err) {
      toast.error("Couldn't delete login", err.message);
    }
  };

  const counts = useMemo(() => {
    const c = { all: state.users.length, ADMIN: 0, AGENT: 0, CLIENT: 0 };
    state.users.forEach((u) => (c[u.role] += 1));
    return c;
  }, [state.users]);

  const rows = state.users
    .filter((u) => role === "all" || u.role === role)
    .filter((u) => matches(query, u.username, u.linkedName, u.role));

  const columns = [
    {
      key: "user",
      header: "Login",
      sort: (u) => u.username,
      render: (u) => (
        <Person
          name={u.linkedName || (u.role === "ADMIN" ? "Administrator" : u.username)}
          sub={`${u.username}${u.userId === me.userId ? " · you" : ""}`}
        />
      ),
    },
    {
      key: "role",
      header: "Role",
      sort: (u) => u.role,
      render: (u) => <span className={`badge ${ROLE_TONES[u.role]}`}>{ROLE_LABELS[u.role]}</span>,
    },
    {
      key: "status",
      header: "Status",
      sort: (u) => (u.enabled ? 0 : 1),
      render: (u) =>
        u.enabled ? (
          <span className="badge good">
            <span className="dot" /> Active
          </span>
        ) : (
          <span className="badge">
            <span className="dot" /> Disabled
          </span>
        ),
    },
    {
      key: "last",
      header: "Last sign-in",
      sort: (u) => u.lastLogin || "",
      render: (u) =>
        u.lastLogin ? <span title={formatDateTime(u.lastLogin)}>{formatRelative(u.lastLogin)}</span> : <span className="muted">Never</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (u) =>
        u.userId === me.userId ? (
          <span className="muted" style={{ fontSize: 12 }}>
            Manage in Profile
          </span>
        ) : (
          <div className="row-actions">
            <button type="button" className="icon-btn" onClick={stop(() => setResetting(u))} aria-label={`Reset password for ${u.username}`} title="Reset password">
              <KeyRound />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={stop(() => toggleEnabled(u))}
              aria-label={`${u.enabled ? "Disable" : "Enable"} ${u.username}`}
              title={u.enabled ? "Disable login" : "Enable login"}
            >
              {u.enabled ? <UserX /> : <UserCheck />}
            </button>
            <button type="button" className="icon-btn danger" onClick={stop(() => remove(u))} aria-label={`Delete ${u.username}`} title="Delete login">
              <Trash2 />
            </button>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        icon={ShieldCheck}
        title="Users & access"
        description="Who can sign in, and as what. Agents manage their own listings and deals; clients see only their own records."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => {
              setCreateKey((k) => k + 1);
              setCreateOpen(true);
            }}
          >
            <Plus /> Create login
          </button>
        }
      />

      <div className="stats" style={{ marginBottom: 20 }}>
        <StatCard loading={state.loading} label="Logins" icon={KeyRound} value={counts.all} foot={`${state.users.filter((u) => u.enabled).length} active`} />
        <StatCard loading={state.loading} label="Admins" icon={ShieldCheck} value={counts.ADMIN} foot="Full access" />
        <StatCard loading={state.loading} label="Agents" icon={UserCheck} value={counts.AGENT} foot="Own listings & deals" />
        <StatCard loading={state.loading} label="Clients" icon={UserCheck} value={counts.CLIENT} foot="Own profile & deals" />
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search logins…" />
        <Segmented
          id="user-role"
          label="Filter by role"
          value={role}
          onChange={setRole}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "ADMIN", label: "Admins", count: counts.ADMIN },
            { value: "AGENT", label: "Agents", count: counts.AGENT },
            { value: "CLIENT", label: "Clients", count: counts.CLIENT },
          ]}
        />
      </div>

      {state.error ? (
        <div className="card">
          <EmptyState error title="Couldn't load logins" text={state.error} />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(u) => u.userId}
          loading={state.loading}
          initialSort={{ key: "role", dir: "asc" }}
          footer={`${rows.length} of ${state.users.length} logins`}
          empty={<EmptyState icon={KeyRound} title="No logins match" />}
        />
      )}

      <CreateUserModal
        key={createKey}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        users={state.users}
        onCreated={load}
      />
      <ResetPasswordModal key={resetting?.userId ?? "none"} user={resetting} onClose={() => setResetting(null)} />
    </>
  );
}
