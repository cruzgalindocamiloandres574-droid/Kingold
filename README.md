# NOIR VAULT

Plataforma web de descubrimiento y reproducción de cine, series, anime, manga, documentales, cortometrajes, podcasts y otros formatos. Construida con Next.js 15, React 19, TypeScript, Supabase y Stripe.

## Funcionalidades implementadas

- Portada editorial responsive con fondo cinematográfico animado y soporte para `prefers-reduced-motion`.
- Catálogo conectado a Supabase, paginado y con búsqueda por título, sinopsis y género.
- Filtros por formato, género, idioma de audio, tipo de acceso y largometrajes.
- Fichas con póster, sinopsis, autoría, créditos, fuente y licencia.
- Reproducción HTML5 de fuentes de vídeo y audio registradas, con fuente alternativa cuando existe, selección de pistas de audio/subtítulos y diagnósticos básicos del navegador.
- Enlaces a fuentes y lectores oficiales para contenidos que NOIR VAULT no aloja.
- Seguimiento del progreso de reproducción para usuarios autenticados.
- Registro, inicio de sesión, recuperación de contraseña y página de cuenta.
- Panel de administración protegido por rol, con altas de catálogo, contadores por sección e importaciones.
- Importadores de metadatos desde Wikidata/Wikimedia Commons y fichas de audiolibros de LibriVox.
- Integración de Stripe Checkout, portal de facturación y webhook de sincronización de suscripciones.

## Estado y límites importantes

NOIR VAULT es una biblioteca multiformato en desarrollo, no un servicio con derechos universales sobre películas comerciales. El catálogo mezcla obras con fuentes reproducibles y fichas que abren plataformas externas. La reproducción externa, las pistas disponibles y la disponibilidad territorial dependen del titular o proveedor correspondiente.

El reproductor HTML5 utiliza archivos directos registrados en el catálogo; no proporciona DRM, CDN privada, transcodificación propia ni garantías de reproducción para todos los códecs y dispositivos. Una URL externa puede dejar de funcionar sin que NOIR VAULT controle ese servicio.

Stripe y el estado de suscripción están conectados a nivel de checkout/webhook/cuenta, pero antes de vender una membresía debe completarse y probarse la autorización de contenidos premium en cada ruta y flujo de reproducción. No asumir que la suscripción por sí sola protege todo el catálogo.

El importador de Wikidata crea fichas de metadatos, no importa películas ni concede derechos de exhibición. Las imágenes de Commons solo se usan cuando la licencia identificada es reutilizable. Cada fuente audiovisual debe revisarse por separado antes de activarse.

## Requisitos

- Node.js 20.9 o superior.
- npm.
- Proyecto Supabase.
- Cuenta de Stripe para pruebas; las claves y el precio deben configurarse antes de usar checkout.
- Proyecto Vercel para despliegue y tareas programadas.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Comprobaciones disponibles:

```bash
npm run lint
npm run build
```

## Variables de entorno

Copia `.env.example` en `.env.local` y completa los valores:

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública/publishable para navegador y sesiones.
- `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY`: credencial privada para tareas administrativas del servidor. Configura solo la que corresponda y nunca la expongas con prefijo `NEXT_PUBLIC_`.
- `STRIPE_SECRET_KEY`: clave secreta de Stripe. Mantén una clave de prueba hasta completar validaciones y aprobar el lanzamiento.
- `STRIPE_WEBHOOK_SECRET`: secreto de firma del webhook.
- `STRIPE_PRICE_ID`: identificador del precio de suscripción.
- `NEXT_PUBLIC_SITE_URL`: URL pública del sitio.
- `CRON_SECRET`: secreto opcional/recomendado para autorizar las invocaciones programadas de Vercel.

Las claves privadas solo deben guardarse en el entorno del servidor (por ejemplo, variables de entorno de Vercel), no en GitHub, código cliente ni capturas públicas.

## Supabase

El esquema inicial y los cambios versionados están en `supabase/schema.sql` y `supabase/migrations/`. El proyecto desplegado ya contiene cambios posteriores al esquema inicial; **no ejecutes el archivo `schema.sql` sobre la base de datos existente**. Antes de instalar en una base nueva, revisa y aplica las migraciones en el orden correspondiente y comprueba las políticas RLS. La clave privada de Supabase nunca debe usarse en componentes cliente.

La lectura pública del catálogo está limitada a registros publicados por las políticas RLS. Las escrituras de administración requieren el rol `admin`; las importaciones usan una credencial privada del servidor.

## Tareas programadas

`vercel.json` define dos importaciones diarias:

- `/api/catalog/sync`: metadatos de cine desde Wikidata y datos/imágenes reutilizables de Wikimedia Commons.
- `/api/catalog/sync/librivox`: fichas de audiolibros de LibriVox.

Las rutas de sincronización exigen una sesión administradora o un encabezado `Authorization: Bearer <CRON_SECRET>`. No publiques ni compartas ese secreto.

## Stripe

Rutas implementadas:

- `POST /api/checkout`: crea una sesión de Checkout para el usuario autenticado.
- `POST /api/portal`: abre el portal de facturación del cliente autenticado.
- `POST /api/stripe-webhook`: valida la firma del webhook y sincroniza el estado de suscripción.

Configura en Stripe los eventos utilizados por el webhook, entre ellos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` e `invoice.payment_failed`. Prueba el flujo completo en modo test antes de activar cobros reales.

## Repositorio

- Aplicación: `app/`
- Endpoints: `app/api/`
- Cliente de Supabase: `lib/supabase/`
- Esquema y migraciones: `supabase/`
- Configuración de tareas programadas: `vercel.json`
- Integración continua: `.github/workflows/`
