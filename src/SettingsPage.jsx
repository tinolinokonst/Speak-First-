import React, { useState } from "react";
import { supabase } from "./supabase.js";
import { ArrowLeft, LogOut, Trash2, User, Lock, ShieldAlert } from "lucide-react";

// Design tokens — kept in sync with App.jsx.
const T = {
  bg:          "#FBF8F4",
  surface:     "#FFFFFF",
  surfaceWarm: "#FDF9F5",
  text:        "#1E1B16",
  textSub:     "#6B6560",
  border:      "#EDE8E2",
  accent:      "#E8654E",
  accentTint:  "#FBE9E3",
  support:     "#5C7A6B",
  supportTint: "#E8F0EB",
  danger:      "#C0392B",
  dangerTint:  "#FBEAEA",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  card: 18,
  pill: 100,
  shadowCard: "0 1px 3px rgba(30,27,22,.05), 0 4px 12px rgba(30,27,22,.04)",
};
const OL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" };

// ── Shared section wrapper ────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.card,
        overflow: "hidden",
        boxShadow: T.shadowCard,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "20px 24px",
          borderBottom: `1px solid ${T.border}`,
          background: T.bg,
        }}
      >
        <span style={{ color: T.textSub, display: "flex" }}>{icon}</span>
        <span style={{ ...OL, color: T.text, letterSpacing: "0.09em" }}>{title}</span>
      </div>
      <div style={{ padding: "24px 24px" }}>{children}</div>
    </div>
  );
}

// ── Field row — label + value ─────────────────────────────────────────────────
function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: T.textSub, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color: T.text, wordBreak: "break-all" }}>{value || "—"}</div>
    </div>
  );
}

// ── Inline feedback banner ────────────────────────────────────────────────────
function Banner({ type, children }) {
  const styles = {
    success: { color: T.support, bg: T.supportTint, border: "rgba(92,122,107,.2)" },
    error:   { color: T.accent,  bg: T.accentTint,  border: "rgba(232,101,78,.2)"  },
  }[type] || { color: T.text, bg: T.surfaceWarm, border: T.border };
  return (
    <div style={{
      fontSize: 14,
      color: styles.color,
      background: styles.bg,
      border: `1px solid ${styles.border}`,
      borderRadius: 10,
      padding: "10px 14px",
      lineHeight: 1.45,
      marginTop: 12,
    }}>
      {children}
    </div>
  );
}

// ── Change password section ───────────────────────────────────────────────────
function ChangePasswordSection({ user }) {
  const isOAuthOnly = !user?.app_metadata?.providers?.includes("email") &&
    (user?.app_metadata?.provider === "google" ||
     user?.app_metadata?.providers?.some(p => p !== "email"));

  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading]     = useState(false);
  const [status, setStatus]       = useState(null); // null | {type, msg}

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (newPw.length < 8) {
      setStatus({ type: "error", msg: "Password must be at least 8 characters." });
      return;
    }
    if (newPw !== confirmPw) {
      setStatus({ type: "error", msg: "Passwords don't match." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setStatus({ type: "success", msg: "Password updated successfully." });
      setNewPw(""); setConfirmPw("");
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  if (isOAuthOnly) {
    return (
      <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.6, margin: 0 }}>
        Your account uses Google sign-in. To change your password, visit your{" "}
        <a
          href="https://myaccount.google.com/security"
          target="_blank"
          rel="noreferrer"
          style={{ color: T.accent }}
        >
          Google account security settings
        </a>.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input
        type="password"
        placeholder="New password"
        value={newPw}
        onChange={e => setNewPw(e.target.value)}
        required
        minLength={8}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirmPw}
        onChange={e => setConfirmPw(e.target.value)}
        required
        style={inputStyle}
      />
      {status && <Banner type={status.type}>{status.msg}</Banner>}
      <button
        type="submit"
        disabled={loading}
        style={{ ...secondaryBtnStyle, opacity: loading ? 0.6 : 1, marginTop: 4 }}
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

// ── Delete account section ────────────────────────────────────────────────────
function DeleteAccountSection({ user, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [showDialog, setShowDialog]   = useState(false);

  const confirmed = confirmText.trim().toUpperCase() === "DELETE";

  async function handleDelete() {
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No active session.");

      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Deletion failed.");

      await supabase.auth.signOut();
      onDeleted();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.6, margin: "0 0 16px" }}>
        Permanently delete your account and all associated data. This cannot be undone.
      </p>

      {!showDialog ? (
        <button
          onClick={() => setShowDialog(true)}
          style={dangerOutlineBtnStyle}
        >
          <Trash2 size={15} />
          Delete my account
        </button>
      ) : (
        <div
          style={{
            background: T.dangerTint,
            border: `1px solid rgba(192,57,43,.2)`,
            borderRadius: T.card,
            padding: "18px 20px",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: T.danger, margin: "0 0 8px" }}>
            This is permanent and cannot be undone.
          </p>
          <p style={{ fontSize: 13, color: T.text, lineHeight: 1.55, margin: "0 0 14px" }}>
            Your account, practice history, and all data will be erased immediately.
            Type <strong>DELETE</strong> below to confirm.
          </p>
          <input
            type="text"
            placeholder="Type DELETE to confirm"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12, borderColor: "rgba(192,57,43,.3)" }}
          />
          {error && <Banner type="error">{error}</Banner>}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={handleDelete}
              disabled={!confirmed || loading}
              style={{
                ...dangerBtnStyle,
                opacity: (!confirmed || loading) ? 0.5 : 1,
                cursor: (!confirmed || loading) ? "default" : "pointer",
              }}
            >
              {loading ? "Deleting…" : "Yes, delete my account"}
            </button>
            <button
              onClick={() => { setShowDialog(false); setConfirmText(""); setError(null); }}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main settings page ────────────────────────────────────────────────────────
export default function SettingsPage({ user, onBack, onSignOut, onDeleted }) {
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <div className="sf-screen" style={{ paddingTop: 64, paddingBottom: 96 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <button onClick={onBack} style={iconBtnStyle} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: T.text, letterSpacing: "-0.02em" }}>
          Account
        </h1>
      </div>

      {/* ── 1. Account info */}
      <Section icon={<User size={15} />} title="Account info">
        <Field label="Email" value={user?.email} />
        {createdAt && <Field label="Member since" value={createdAt} />}
      </Section>

      {/* ── 2. Change password */}
      <Section icon={<Lock size={15} />} title="Password">
        <ChangePasswordSection user={user} />
      </Section>

      {/* ── 3. Sign out */}
      <Section icon={<LogOut size={15} />} title="Session">
        <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.6, margin: "0 0 14px" }}>
          You're signed in as <strong>{user?.email}</strong>.
        </p>
        <button onClick={onSignOut} style={secondaryBtnStyle}>
          <LogOut size={15} />
          Sign out
        </button>
      </Section>

      {/* ── 4. Delete account */}
      <Section icon={<ShieldAlert size={15} />} title="Delete account">
        <DeleteAccountSection user={user} onDeleted={onDeleted} />
      </Section>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  fontSize: 15,
  fontFamily: T.sans,
  color: T.text,
  background: T.bg,
  border: `1px solid ${T.border}`,
  borderRadius: T.card,
  outline: "none",
  boxSizing: "border-box",
};

const secondaryBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "none",
  color: T.text,
  border: `1.5px solid ${T.border}`,
  borderRadius: T.pill,
  padding: "12px 20px",
  fontSize: 15,
  fontWeight: 600,
  fontFamily: T.sans,
  cursor: "pointer",
  transition: "transform .13s ease, box-shadow .13s ease, border-color .14s ease",
};

const iconBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: T.textSub,
  display: "flex",
  alignItems: "center",
  padding: 4,
};

const dangerOutlineBtnStyle = {
  ...secondaryBtnStyle,
  color: T.danger,
  borderColor: "rgba(192,57,43,.3)",
};

const dangerBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  background: T.danger,
  color: "#fff",
  border: "none",
  borderRadius: T.pill,
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: T.sans,
};
