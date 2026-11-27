"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Notice = { kind: "error" | "info"; text: string } | null;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "confirmation") {
      setMessage({ kind: "error", text: "No pudimos confirmar el correo. Solicita un enlace nuevo o vuelve a registrarte." });
    } else if (params.get("error") === "auth") {
      setMessage({ kind: "error", text: "El enlace de acceso no es válido o ya venció. Inténtalo de nuevo." });
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setMessage({ kind: "error", text: "No se encuentra la configuración pública de Supabase. La cuenta no puede iniciar sesión todavía." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const supabase = createBrowserClient(url, key);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const detail = error.message.toLowerCase();
        const friendly = detail.includes("invalid login credentials")
          ? "El correo o la contraseña no son correctos."
          : detail.includes("email not confirmed")
            ? "Primero confirma tu correo desde el enlace que te enviamos."
            : detail.includes("too many requests")
              ? "Hubo demasiados intentos. Espera un momento y vuelve a intentarlo."
              : error.message;
        setMessage({ kind: "error", text: friendly });
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const requestedNext = params.get("next");
      const safeNext = requestedNext?.startsWith("/")
        && !requestedNext.startsWith("//")
        && !requestedNext.includes("\\")
        ? requestedNext
        : "/cuenta";
      router.replace(safeNext);
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "No pudimos conectar con el servicio de acceso. Revisa tu conexión e inténtalo otra vez." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section" style={{ maxWidth: 560, minHeight: "75vh", margin: "0 auto", paddingTop: 56, paddingBottom: 72 }}>
      <Link href="/" style={{ color: "#c7a675", letterSpacing: 2, fontSize: 12 }}>← NOIR VAULT</Link>
      <div style={{ marginTop: 42, padding: "clamp(24px,5vw,42px)", border: "1px solid #39332a", borderRadius: 16, background: "linear-gradient(145deg,#171917,#0c0e0d)" }}>
        <small style={{ color: "#c7a675", letterSpacing: 3 }}>NOIR VAULT MEMBERSHIP</small>
        <h1 style={{ fontSize: "clamp(30px,7vw,44px)", lineHeight: 1.08, margin: "15px 0" }}>Bienvenido <em>de nuevo.</em></h1>
        <p style={{ color: "#aaa", lineHeight: 1.7, marginBottom: 26 }}>Inicia sesión para guardar tu actividad y continuar donde dejaste tus historias.</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 7, color: "#c8c3b8", fontSize: 12 }}>
            CORREO ELECTRÓNICO
            <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com" style={{ width: "100%", padding: 14, border: "1px solid #4b463b", borderRadius: 8, background: "#080909", color: "#f3efe7" }} />
          </label>
          <label style={{ display: "grid", gap: 7, color: "#c8c3b8", fontSize: 12 }}>
            CONTRASEÑA
            <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña" style={{ width: "100%", padding: 14, border: "1px solid #4b463b", borderRadius: 8, background: "#080909", color: "#f3efe7" }} />
          </label>
          {message && <p role="alert" style={{ margin: "4px 0", color: message.kind === "error" ? "#ffb0a8" : "#c7a675", lineHeight: 1.6 }}>{message.text}</p>}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%", minHeight: 48, opacity: busy ? .65 : 1 }}>{busy ? "CONECTANDO…" : "INICIAR SESIÓN"}</button>
        </form>
        <p style={{ margin: "16px 0 0", fontSize: 13 }}><Link href="/recuperar" style={{ color: "#c7a675" }}>¿Olvidaste tu contraseña?</Link></p>
        <p style={{ color: "#aaa", marginTop: 24 }}>¿Aún no tienes cuenta? <Link href="/registro" style={{ color: "#e6cea9" }}>Crear cuenta</Link></p>
      </div>
    </main>
  );
}
