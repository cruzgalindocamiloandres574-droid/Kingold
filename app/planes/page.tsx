"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function Plans() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [returnedFromLogin, setReturnedFromLogin] = useState(false);

  const checkout = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setMessage("Para continuar, inicia sesión o crea tu cuenta. Te devolveremos automáticamente al pago.");
        return;
      }
      if (response.status === 409 && data.code === "SUBSCRIPTION_ALREADY_EXISTS") {
        setMessage("Ya existe una suscripción activa o pendiente en tu cuenta. Revisa su estado desde Mi cuenta.");
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
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnedFromLogin(params.get("checkout") === "1");
  }, []);

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
      {returnedFromLogin && (
        <p role="status" aria-live="polite" style={{ maxWidth: 520, marginTop: 18 }}>
          Tu sesión está iniciada. No abriremos un pago automáticamente: pulsa “SUSCRIBIRME” solo cuando decidas continuar.
        </p>
      )}
      <button className="btn" onClick={checkout} disabled={busy}>
        {busy ? "CONECTANDO CON STRIPE…" : "SUSCRIBIRME"}
      </button>
      {message && (
        <p role="alert" aria-live="polite" style={{ maxWidth: 520, marginTop: 18 }}>
          {message}
        </p>
      )}
      <p style={{ marginTop: 18 }}>
        ¿Aún no tienes cuenta? <Link href={"/registro?next=" + encodeURIComponent("/planes?checkout=1")}>Crear cuenta</Link>
        {" · "}
        <Link href={"/login?next=" + encodeURIComponent("/planes?checkout=1")}>Iniciar sesión</Link>
      </p>
      <p className="note">
        Stripe está conectado en modo de prueba. No se realizan cobros reales mientras se completan las pruebas de compra y la preparación del catálogo comercial con licencias de distribución.
      </p>
    </main>
  );
}
