# Configuración final de NOIR VAULT

## Dar acceso de administrador
1. Registra y confirma la cuenta que será propietaria de NOIR VAULT.
2. En Supabase SQL Editor ejecuta la consulta siguiente, reemplazando el correo por el correo exacto de esa cuenta:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('TU_CORREO_ADMIN')
);
```

3. Inicia sesión con esa cuenta y abre `/admin`. El panel permite agregar y eliminar contenido. La base de datos impone las políticas RLS; no basta con ocultar el enlace. Los permisos de usuario no permiten cambiar la columna `role` del perfil desde el navegador.

## Variables privadas de Vercel
Configura las credenciales en Project Settings → Environment Variables y limita los secretos al servidor:
- `SUPABASE_SERVICE_ROLE_KEY`: credencial privada para las operaciones de servidor del webhook y sincronización.
- `STRIPE_SECRET_KEY`: clave secreta de Stripe en modo test. El código mantiene compatibilidad con el nombre heredado `stripe_secret_client`; para nuevas instalaciones usa `STRIPE_SECRET_KEY`.
- `STRIPE_WEBHOOK_SECRET`: secreto de firma del endpoint Stripe.
- `STRIPE_PRICE_ID`: identificador del precio recurrente de NOIR PREMIUM.
- `CRON_SECRET`: secreto requerido por las importaciones programadas.

La URL y la clave publicable de Supabase se usan también en el cliente. Nunca publiques claves secretas en el repositorio, en variables con prefijo `NEXT_PUBLIC_` ni en capturas públicas.

## Stripe en el entorno conectado
- El webhook de Stripe Test del proyecto apunta a `https://noir-vault-psi.vercel.app/api/stripe-webhook`.
- El precio de prueba configurado es mensual en COP por 20.000. Mantén Stripe en modo test hasta completar la validación del flujo y aprobar expresamente el lanzamiento.
- Mantén habilitados los eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid` y `invoice.payment_failed`.
- Guarda el secreto de firma en `STRIPE_WEBHOOK_SECRET`. No copies claves ni secretos de prueba a documentación o Git.

## Bloqueo de Checkout
Las migraciones `20261127200000_prevent_duplicate_checkout_sessions.sql` y `20261127200500_bind_checkout_lock_to_attempt.sql` crean un bloqueo de corta duración por usuario. Impiden dos sesiones simultáneas y asocian cada bloqueo con un UUID único. Los webhooks completado/expirado liberan solo el intento que les corresponde; la caducidad de respaldo es automática.

Estas migraciones ya están aplicadas al proyecto Supabase conectado. En una base nueva, aplícalas después del esquema base y de las migraciones de autenticación y suscripciones.

## Derechos y reproducción
Solo habilitar reproducción para películas con derechos y fuentes autorizadas. El catálogo incluye fuentes reproducibles y fichas de referencia/enlaces externos; no supongas que una ficha publicada equivale a autorización de exhibición. El host de vídeo externo no es un CDN de producción.
