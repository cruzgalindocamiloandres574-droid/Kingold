# NOIR VAULT v7

Aplicación web de streaming premium en desarrollo, construida con Next.js, React, TypeScript, Supabase y Stripe.

## Incluido en este repositorio
- Landing page premium responsive con catálogo de muestra, filtros y búsqueda.
- Páginas de registro e inicio de sesión con Supabase Auth.
- Página de cuenta protegida por sesión.
- Estructura de administración protegida por rol.
- Inicio de Stripe Checkout para suscripciones (requiere configurar un precio recurrente).
- Endpoint de webhook Stripe con verificación de firma.
- Esquema SQL inicial para perfiles, películas, progreso y suscripciones.
- Plantilla de variables de entorno sin secretos.

## Requisitos y ejecución
Node.js 20.9 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrir http://localhost:3000.

## Configuración pendiente
1. Crear proyecto Supabase y definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
2. Ejecutar supabase/schema.sql y supabase/migrations/002_subscriptions.sql en el SQL Editor de Supabase.
3. Crear un precio recurrente en Stripe y configurar STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET y NEXT_PUBLIC_SITE_URL.
4. Configurar webhook de Stripe apuntando a /api/stripe-webhook. La persistencia de eventos y actualización de suscripciones en Supabase aún debe implementarse antes de conceder acceso premium.
5. Configurar un proveedor de vídeo legítimo, derechos de distribución, almacenamiento seguro y URLs de reproducción firmadas.
6. Desplegar en Vercel u otro host compatible y añadir las variables de entorno.

## Limitaciones de esta versión
Esta entrega es una base funcional de interfaz y estructura técnica, no una plataforma de streaming lista para producción. No incluye reproducción real, películas con licencia, cobros en vivo verificados, recuperación de contraseña ni CRUD completo de administración. No introduzcas claves privadas en GitHub. Usa únicamente contenido audiovisual para el que tengas derechos de distribución.
