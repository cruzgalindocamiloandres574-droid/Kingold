"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Notice = { kind: "error" | "success"; text: string } | null;

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setMessage({ kind: "error", text: "No se encuentra la configuración pública de Supabase. El registro no puede completarse todavía." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const requestedNext = params.get("next");
      const safeNext = requestedNext?.startsWith("/")
        && !requestedNext.startsWith("//")
        && !requestedNext.includes("\\")
        ? requestedNext
        : "/cuenta";

      const supabase = createBrowserClient(url, key);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent(safeNext),
        },
      });

      if (error) {
        const detail = error.message.toLowerCase();
        const friendly = detail.includes("password")
          ? "La contraseña no cumple los requisitos del proyecto. Usa al menos 8 caracteres y vuelve a intentarlo."
          : detail.includes("too many requests")
            ? "Se han solicitado demasiados registros. Espera un momento antes de volver a intentarlo."
            : error.message;
        setMessage({ kind: "error", text: friendly });
        return;
      }

      if (data.session) {
        router.replace(safeNext);
        router.refresh();
        return;
      }

      setMessage({
        kind: "success",
        text: "Solicitud recibida. Revisa tu correo y abre el enlace de confirmación para activar tu cuenta. Después volverás automáticamente a NOIR VAULT.",
      });
    } catch {
      setMessage({ kind: "error", text: "No pudimos conectar con el servicio de registro. Revisa tu conexión e inténtalo otra vez." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section" style={{ maxWidth: 560, minHeight: "75vh", margin: "0 auto", paddingTop: 56, paddingBottom: 72 }}>
      <Link href="/" style={{ color: "#c7a675", letterSpacing: 2, fontSize: 12 }}>← NOIR VAULT</Link>
      <div style={{ marginTop: 42, padding: "clamp(24px,5vw,42px)", border: "1px solid #39332a", borderRadius: 16, background: "linear-gradient(145deg,#171917,#0c0e0d)" }}>
        <small style={{ color: "#c7a675", letterSpacing: 3 }}>NOIR VAULT MEMBERSHIP</small>
        <h1 style={{ fontSize: "clamp(30px,7vw,44px)", lineHeight: 1.08, margin: "15px 0" }}>Entra a un mundo <em>de historias.</em></h1>
        <p style={{ color: "#aaa", lineHeight: 1.7, marginBottom: 26 }}>Crea tu cuenta para guardar tu actividad y seguir explorando el catálogo desde cualquier dispositivo.</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 7, color: "#c8c3b8", fontSize: 12 }}>
            CORREO ELECTRÓNICO
            <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com" style={{ width: "100%", padding: 14, border: "1px solid #4b463b", borderRadius: 8, background: "#080909", color: "#f3efe7" }} />
          </label>
          <label style={{ display: "grid", gap: 7, color: "#c8c3b8", fontSize: 12 }}>
            CONTRASEÑA
            <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" style={{ width: "100%", padding: 14, border: "1px solid #4b463b", borderRadius: 8, background: "#080909", color: "#f3efe7" }} />
          </label>
          <small style={{ color: "#8f8d85", lineHeight: 1.5 }}>Te enviaremos un correo de confirmación cuando el proyecto tenga habilitada la verificación por email.</small>
          {message && <p role={message.kind === "error" ? "alert" : "status"} style={{ margin: "4px 0", color: message.kind === "error" ? "#ffb0a8" : "#c7d9b2", lineHeight: 1.6 }}>{message.text}</p>}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%", minHeight: 48, opacity: busy ? .65 : 1 }}>{busy ? "CREANDO CUENTA…" : "CREAR MI CUENTA"}</button>
        </form>
        <p style={{ color: "#aaa", marginTop: 24 }}>¿Ya tienes una cuenta? <Link href="/login" style={{ color: "#e6cea9" }}>Iniciar sesión</Link></p>
      </div>
    </main>
  );
}
