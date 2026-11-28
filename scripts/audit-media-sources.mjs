#!/usr/bin/env node

import { isIP } from "node:net";
import { appendFile } from "node:fs/promises";

const baseUrl = (process.env.NOIR_VAULT_BASE_URL || "https://noir-vault-psi.vercel.app").replace(/\/$/, "");
const timeoutMs = Number(process.env.MEDIA_AUDIT_TIMEOUT_MS || 10000);
const concurrency = Math.max(1, Math.min(6, Number(process.env.MEDIA_AUDIT_CONCURRENCY || 2)));
const maxRedirects = 3;

function isPrivateAddress(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;

  const kind = isIP(host);
  if (kind === 4) {
    const octets = host.split(".").map(Number);
    const [a, b] = octets;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
  }
  if (kind === 6) {
    return host === "::" || host === "::1" || host.startsWith("fc") ||
      host.startsWith("fd") || host.startsWith("fe80:") || host.startsWith("fec0:");
  }
  return false;
}

function validatePublicHttps(rawUrl) {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:") throw new Error("URL no HTTPS");
  if (parsed.username || parsed.password) throw new Error("URL contiene credenciales");
  if (isPrivateAddress(parsed.hostname)) throw new Error("Host local o privado bloqueado");
  return parsed;
}

function displayUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.origin + parsed.pathname;
  } catch {
    return "[URL inválida]";
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCatalogPage(page) {
  const url = new URL("/api/catalog", baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("playback", "internal");
  const response = await fetchWithTimeout(url, {
    redirect: "error",
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  });
  if (!response.ok) throw new Error(`Catálogo página ${page}: HTTP ${response.status}`);
  return response.json();
}

function addCandidate(map, record, kind, rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return;
  const url = rawUrl.trim();
  const existing = map.get(url);
  if (existing) {
    if (!existing.titles.includes(record.title)) existing.titles.push(record.title);
    if (!existing.kinds.includes(kind)) existing.kinds.push(kind);
    return;
  }
  map.set(url, { url, title: record.title || "Sin título", titles: [record.title || "Sin título"], id: record.id || null, kinds: [kind] });
}

function collectCandidates(records) {
  const candidates = new Map();
  let externalEmbeds = 0;

  for (const record of records) {
    addCandidate(candidates, record, "video", record.video_url);
    addCandidate(candidates, record, "video-fallback", record.fallback_video_url);
    addCandidate(candidates, record, "audio", record.audio_url);

    const tracks = Array.isArray(record.audio_tracks)
      ? record.audio_tracks
      : Array.isArray(record.audio_tracks?.tracks)
        ? record.audio_tracks.tracks
        : [];
    for (const [index, track] of tracks.entries()) {
      addCandidate(candidates, record, `audio-track-${index + 1}`, track?.url);
    }

    if (record.content_metadata?.external_embed_url) externalEmbeds += 1;
  }

  return { candidates: [...candidates.values()], externalEmbeds };
}

async function checkMedia(candidate) {
  let currentUrl = candidate.url;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    try {
      validatePublicHttps(currentUrl);
      const response = await fetchWithTimeout(currentUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "*/*",
          Range: "bytes=0-0",
          "User-Agent": "NOIR-VAULT-Media-Source-Audit/1.0",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => {});
        if (!location) return { ...candidate, ok: false, status: response.status, error: "Redirección sin destino", checkedUrl: displayUrl(currentUrl) };
        if (redirectCount === maxRedirects) return { ...candidate, ok: false, status: response.status, error: "Demasiadas redirecciones", checkedUrl: displayUrl(currentUrl) };
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      const finalUrl = displayUrl(currentUrl);
      if (response.status === 429) {
        await response.body?.cancel().catch(() => {});
        return { ...candidate, ok: false, rateLimited: true, status: 429, contentType, checkedUrl: finalUrl, error: "El origen limitó la auditoría (HTTP 429); resultado inconcluso, no es prueba de que el medio esté roto." };
      }
      const playlist = /\.(m3u8?|mpd)(?:$|\?)/i.test(new URL(currentUrl).pathname);
      const html = /text\/html/i.test(contentType);
      const acceptableType = !contentType || /video\/|audio\/|application\/(octet-stream|vnd\.apple\.mpegurl|x-mpegurl|dash\+xml)/i.test(contentType) || playlist;
      const ok = [200, 206].includes(response.status) && !html && acceptableType;
      await response.body?.cancel().catch(() => {});
      return {
        ...candidate,
        ok,
        status: response.status,
        contentType: contentType || "no declarado",
        acceptRanges: response.headers.get("accept-ranges") || "no declarado",
        contentRange: response.headers.get("content-range") || "no declarado",
        checkedUrl: finalUrl,
        ...(!ok ? { error: html ? "El origen devolvió HTML, no un medio" : "Estado o tipo de contenido no reproducible" } : {}),
      };
    } catch (error) {
      if (redirectCount === maxRedirects) {
        return { ...candidate, ok: false, error: error instanceof Error ? error.message : String(error), checkedUrl: displayUrl(currentUrl) };
      }
      return { ...candidate, ok: false, error: error instanceof Error ? error.message : String(error), checkedUrl: displayUrl(currentUrl) };
    }
  }

  return { ...candidate, ok: false, error: "No se pudo resolver la URL", checkedUrl: displayUrl(currentUrl) };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  validatePublicHttps(baseUrl);
  const firstPage = await fetchCatalogPage(1);
  const totalPages = Number(firstPage.totalPages || 0);
  if (!Array.isArray(firstPage.results) || totalPages < 1) {
    throw new Error("El catálogo público no devolvió páginas reproducibles para playback=internal.");
  }
  if (totalPages > 100) throw new Error(`La consulta devolvió ${totalPages} páginas; se detiene para evitar una auditoría excesiva.`);

  const records = [...firstPage.results];
  for (let page = 2; page <= totalPages; page += 1) {
    const payload = await fetchCatalogPage(page);
    if (!Array.isArray(payload.results)) throw new Error(`Respuesta inválida del catálogo en página ${page}`);
    records.push(...payload.results);
  }

  const { candidates, externalEmbeds } = collectCandidates(records);
  const results = await mapWithConcurrency(candidates, concurrency, checkMedia);
  const rateLimitedResults = results.filter((result) => result.rateLimited);
  const failures = results.filter((result) => !result.ok && !result.rateLimited);
  const summary = {
    checkedAt: new Date().toISOString(),
    baseUrl,
    publicInternalPlaybackRecords: records.length,
    reportedInternalPlaybackTotal: firstPage.total,
    pages: totalPages,
    uniqueDirectMediaUrls: candidates.length,
    checked: results.length,
    reachable: results.filter((result) => result.ok).length,
    failed: failures.length,
    rateLimited: rateLimitedResults.length,
    rateLimitedSample: rateLimitedResults.slice(0, 10).map((result) => ({ title: result.title, kinds: result.kinds, url: result.checkedUrl })),
    externalEmbedsNotProbed: externalEmbeds,
    limitations: [
      "La API pública aplica RLS: el inventario premium que requiere sesión no aparece en esta auditoría.",
      "HTTP 200/206 y una respuesta parcial no garantizan decodificación ni reproducción real en Android.",
      "Los reproductores externos se contabilizan, pero no se prueban. Los registros que solo tienen enlaces de lectura no entran en la consulta playback=internal.",
    ],
    failures: failures.map((result) => ({
      title: result.title,
      kinds: result.kinds,
      url: result.checkedUrl || displayUrl(result.url),
      status: result.status || null,
      error: result.error || null,
      contentType: result.contentType || null,
    })),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      "## NOIR VAULT — auditoría de fuentes multimedia",
      "",
      `- Registros públicos con reproducción interna consultados: **${summary.publicInternalPlaybackRecords}** (API informa ${summary.reportedInternalPlaybackTotal}).`,
      `- URLs directas únicas probadas: **${summary.uniqueDirectMediaUrls}**.`,
      `- Comprobadas: **${summary.checked}** · Accesibles: **${summary.reachable}** · Fallos confirmados: **${summary.failed}** · Limitadas por el origen (inconcluso): **${summary.rateLimited}**.`,
      `- Reproductores externos detectados pero no probados: **${summary.externalEmbedsNotProbed}**.`,
      "",
      "La API pública aplica RLS; el contenido premium que requiere sesión no está incluido. HTTP 200/206 no garantiza reproducción real en un dispositivo.",
    ];
    if (rateLimitedResults.length) {
      lines.push("", `### Respuestas limitadas por el origen (HTTP 429): ${rateLimitedResults.length}`, "Se consideran inconclusas y no se reportan como fuentes rotas. Muestra:");
      for (const result of summary.rateLimitedSample) lines.push(`- ${result.title} — ${result.kinds.join(", ")} — ${result.url}`);
    }
    if (failures.length) {
      lines.push("", "### Fuentes que requieren revisión", "", "| Título | Tipo | Estado | Error |", "|---|---|---:|---|");
      for (const failure of failures) {
        lines.push(`| ${failure.title.replaceAll("|", "\\|")} | ${failure.kinds.join(", ")} | ${failure.status || "—"} | ${(failure.error || "—").replaceAll("|", "\\|")} |`);
      }
    }
    await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  }

  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Media source audit failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
