"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function RecoverAccount() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError(true);
      setMessage("No se encuentra la configuración pública de Supabase.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const supabase = createBrowserClient(url, key);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/auth/callback?next=/restablecer",
      });
      if (resetError) {
        setError(true);
        setMessage(resetError.message);
        return;
      }
      setError(false);
      setMessage("Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña. Revisa también la carpeta de correo no deseado.");
    } catch {
      setError(true);
      setMessage("No pudimos conectar con el servicio. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section" style={{ maxWidth: 560, minHeight: "75vh", margin: "0 auto", paddingTop: 56, paddingBottom: 72 }}>
      <Link href="/" style={{ color: "#c7a675", letterSpacing: 2, fontSize: 12 }}>← NOIR VAULT</Link>
      <div style={{ marginTop: 42, padding: "clamp(24px,5vw,42px)", border: "1px solid #39332a", borderRadius: 16, background: "linear-gradient(145deg,#171917,#0c0e0d)" }}>
        <small style={{ color: "#c7a675", letterSpacing: 3 }}>NOIR VAULT MEMBERSHIP</small>
        <h1 style={{ fontSize: "clamp(30px,7vw,44px)", lineHeight: 1.08, margin: "15px 0" }}>Recupera tu <em>acceso.</em></h1>
        <p style={{ color: "#aaa", lineHeight: 1.7, marginBottom: 26 }}>Escribe el correo de tu cuenta. Te enviaremos un enlace seguro para crear una contraseña nueva.</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 7, color: "#c8c3b8", fontSize: 12 }}>
            CORREO ELECTRÓNICO
            <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com" style={{ width: "100%", padding: 14, border: "1px solid #4b463b", borderRadius: 8, background: "#080909", color: "#f3efe7" }} />
          </label>
          {message && <p role={error ? "alert" : "status"} style={{ margin: "4px 0", color: error ? "#ffb0a8" : "#c7d9b2", lineHeight: 1.6 }}>{message}</p>}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%", minHeight: 48, opacity: busy ? .65 : 1 }}>{busy ? "ENVIANDO…" : "ENVIAR ENLACE DE RECUPERACIÓN"}</button>
        </form>
        <p style={{ color: "#aaa", marginTop: 24 }}><Link href="/login" style={{ color: "#e6cea9" }}>Volver a iniciar sesión</Link></p>
      </div>
    </main>
  );
}
