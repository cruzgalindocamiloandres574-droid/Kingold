"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function ResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError(true);
      setMessage("No se encuentra la configuración pública de Supabase.");
      setReady(true);
      return;
    }

    const supabase = createBrowserClient(url, key);
    let active = true;
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      setHasSession(Boolean(data.user && !authError));
      if (authError || !data.user) {
        setError(true);
        setMessage("El enlace no es válido, ya se utilizó o ha vencido. Solicita uno nuevo.");
      }
      setReady(true);
    }).catch(() => {
      if (!active) return;
      setError(true);
      setMessage("No pudimos validar el enlace. Solicita uno nuevo.");
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !hasSession) return;
    if (password.length < 8) {
      setError(true);
      setMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError(true);
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    setBusy(true);
    setMessage("");
    try {
      const supabase = createBrowserClient(url, key);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(true);
        setMessage(updateError.message);
        return;
      }
      setError(false);
      setMessage("Contraseña actualizada. Abriendo tu cuenta…");
      router.replace("/cuenta");
      router.refresh();
    } catch {
      setError(true);
      setMessage("No pudimos guardar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section" style={{ maxWidth: 560, minHeight: "75vh", margin: "0 auto", paddingTop: 56, paddingBottom: 72 }}>
      <Link href="/" style={{ color: "#c7a675", letterSpacing: 2, fontSize: 12 }}>← NOIR VAULT</Link>
      <div style={{ marginTop: 42, padding: "clamp(24px,5vw,42px)", border: "1px solid #39332a", borderRadius: 16, background: "linear-gradient(145deg,#171917,#0c0e0d)" }}>
        <small style={{ color: "#c7a675", letterSpacing: 3 }}>NOIR VAULT MEMBERSHIP</small>
        <h1 style={{ fontSize: "clamp(30px,7vw,44px)", lineHeight: 1.08, margin: "15px 0" }}>Crea una contraseña <em>nueva.</em></h1>
        {!ready ? <p style={{ color: "#aaa" }}>Validando el enlace seguro…</p> : (
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 7, color: "#c8c3b8", fontSize: 12 }}>
              NUEVA CONTRASEÑA
              <input type="password" autoComplete="new-password" minLength={8} required disabled={!hasSession} value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" style={{ width: "100%", padding: 14, border: "1px solid #4b463b", borderRadius: 8, background: "#080909", color: "#f3efe7" }} />
            </label>
            <label style={{ display: "grid", gap: 7, color: "#c8c3b8", fontSize: 12 }}>
              CONFIRMAR CONTRASEÑA
              <input type="password" autoComplete="new-password" minLength={8} required disabled={!hasSession} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repite la contraseña" style={{ width: "100%", padding: 14, border: "1px solid #4b463b", borderRadius: 8, background: "#080909", color: "#f3efe7" }} />
            </label>
            {message && <p role={error ? "alert" : "status"} style={{ margin: "4px 0", color: error ? "#ffb0a8" : "#c7d9b2", lineHeight: 1.6 }}>{message}</p>}
            <button className="btn" type="submit" disabled={!hasSession || busy} style={{ width: "100%", minHeight: 48, opacity: !hasSession || busy ? .65 : 1 }}>{busy ? "GUARDANDO…" : "ACTUALIZAR CONTRASEÑA"}</button>
          </form>
        )}
        <p style={{ color: "#aaa", marginTop: 24 }}><Link href="/login" style={{ color: "#e6cea9" }}>Volver a iniciar sesión</Link></p>
      </div>
    </main>
  );
}
