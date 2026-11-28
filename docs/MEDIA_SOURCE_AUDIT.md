# Auditoría de fuentes multimedia

NOIR VAULT incluye una comprobación periódica de accesibilidad HTTP para las fuentes directas de video y audio del catálogo público.

## Ejecución

- Automática: cada lunes a las 08:17 UTC mediante GitHub Actions.
- Manual: GitHub → Actions → **NOIR VAULT media source audit** → Run workflow. Se puede indicar la URL de una vista previa o dejar la URL de producción predeterminada.
- Local: `node scripts/audit-media-sources.mjs` con Node.js 20 o superior.

## Qué comprueba

1. Lee las páginas de `/api/catalog?playback=internal` del despliegue elegido, respetando la paginación de 20 registros.
2. Reúne y deduplica `video_url`, `fallback_video_url`, `audio_url` y las URL de `audio_tracks`.
3. Envía una petición HTTP con `Range: bytes=0-0`; no descarga el archivo completo.
4. Acepta respuestas HTTP 200/206 con un tipo de contenido de medio o playlist, y registra fallos, códigos, tipo de contenido y títulos afectados.
5. Sigue como máximo tres redirecciones HTTPS y bloquea hosts locales o direcciones IP privadas. Los informes muestran la ruta de la URL, no sus parámetros de consulta.

El resultado aparece en los logs y en el resumen de la ejecución de GitHub Actions. Las respuestas HTTP 429 se clasifican como **inconclusas por límite del origen**, no como enlaces rotos. Si hay otros fallos confirmados, el trabajo termina con error para que se revisen las fuentes.

## Límites importantes

- La consulta se hace como visitante anónimo y respeta RLS. **No incluye títulos premium que requieren una sesión autenticada**.
- Los reproductores externos se contabilizan, pero no se prueban. Los registros que solo tienen enlaces de lectura quedan fuera de la consulta `playback=internal` y no se auditan con este script.
- Una respuesta 200/206 solo confirma que el servidor respondió a una petición parcial; no garantiza que el navegador pueda decodificar el códec, que el reproductor funcione, que no haya restricciones del proveedor ni que la reproducción sea correcta en Android.
- Un 403 puede indicar protección contra bots o hotlinking y requiere comprobación manual antes de declarar rota una fuente. Un 429 significa que el proveedor limitó la frecuencia de solicitudes; el script lo informa por separado y no lo cuenta como fallo confirmado.
- Esta auditoría no reemplaza las pruebas reales de reproducción, derechos de distribución ni revisión de DRM, subtítulos o pistas de audio.

## Interpretación

Los resultados distinguen accesibilidad HTTP de reproducción real. No se debe activar un título solo porque su URL responda: también deben estar resueltos sus derechos, disponibilidad y compatibilidad con el reproductor de NOIR VAULT.
