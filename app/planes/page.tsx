"use client";

import Link from "next/link";
import { useState } from "react";

export default function Plans() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function checkout() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setMessage("Para continuar, inicia sesión o crea tu cuenta. Después vuelve a esta página.");
        return;
      }
      if (!response.ok || !data.url) {
        setMessage(data.error || "No se pudo iniciar el pago. Inténtalo de nuevo más tarde.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setMessage("No pudimos conectar con el servicio de pago. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section">
      <Link href="/">← NOIR VAULT</Link>
      <small>SUSCRIPCIÓN</small>
      <h1>NOIR PREMIUM</h1>
      <p>Una membresía mensual para acompañar la biblioteca curada de NOIR VAULT.</p>
      <div className="membershipPrice">
        <strong>$20.000</strong>
        <span>COP / MES</span>
      </div>
      <button className="btn" onClick={checkout} disabled={busy}>
        {busy ? "CONECTANDO CON STRIPE…" : "SUSCRIBIRME"}
      </button>
      {message && (
        <p role="alert" aria-live="polite" style={{ maxWidth: 520, marginTop: 18 }}>
          {message}
        </p>
      )}
      <p style={{ marginTop: 18 }}>
        ¿Aún no tienes cuenta? <Link href="/registro">Crear cuenta</Link>
        {" · "}
        <Link href="/login">Iniciar sesión</Link>
      </p>
      <p className="note">
        Stripe está conectado en modo de prueba. No se realizan cobros reales mientras se completan las pruebas de compra y la preparación del catálogo comercial con licencias de distribución.
      </p>
    </main>
  );
}
