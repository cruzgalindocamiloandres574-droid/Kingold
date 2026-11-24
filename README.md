# NOIR VAULT v7

Aplicación web de streaming premium en desarrollo, construida con Next.js, React, TypeScript, Supabase y Stripe.

## Incluido en este repositorio
- Landing page premium responsive con catálogo de muestra, filtros y búsqueda.
- Páginas de registro e inicio de sesión con Supabase Auth.
- Página de cuenta protegida por sesión y estado de suscripción.
- Estructura de administración protegida por rol.
- Inicio de Stripe Checkout con referencia segura al usuario autenticado.
- Webhook Stripe con verificación de firma y sincronización de suscripciones en Supabase.
- Esquema SQL inicial para perfiles, películas, progreso y suscripciones.
- Plantilla de variables de entorno sin secretos y validación automática en GitHub Actions.

## Requisitos y ejecución
Node.js 20.9 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrir http://localhost:3000.

## Configuración pendiente
1. Crear un proyecto Supabase y definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
2. Ejecutar supabase/schema.sql y supabase/migrations/002_subscriptions.sql en el SQL Editor de Supabase.
3. Guardar SUPABASE_SERVICE_ROLE_KEY únicamente como variable privada del servidor en el host (nunca en el navegador ni en GitHub).
4. Crear un precio recurrente en Stripe y configurar STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET y NEXT_PUBLIC_SITE_URL.
5. Configurar el webhook de Stripe para /api/stripe-webhook y habilitar los eventos checkout.session.completed, customer.subscription.created, customer.subscription.updated y customer.subscription.deleted.
6. Configurar un proveedor de vídeo legítimo, derechos de distribución, almacenamiento seguro y URLs de reproducción firmadas.
7. Desplegar en Vercel u otro host compatible y añadir las variables de entorno.

## Limitaciones de esta versión
Esta entrega es una base técnica en desarrollo, no una plataforma de streaming lista para producción. No incluye reproducción real, películas con licencia ni CRUD completo de administración. El acceso al contenido premium todavía debe protegerse en cada ruta/API y validarse con pruebas integrales. No introduzcas claves privadas en GitHub. Usa únicamente contenido audiovisual para el que tengas derechos de distribución.
