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

3. Inicia sesión con esa cuenta y abre `/admin`. El panel permite agregar y eliminar películas. La base de datos impone las políticas RLS; no basta con ocultar el enlace.

## Variables privadas pendientes en Vercel
Configura en Project Settings → Environment Variables, para Production, Preview y Development:
- `SUPABASE_SERVICE_ROLE_KEY`: clave secreta de servidor del proyecto Supabase. No usar prefijo NEXT_PUBLIC.
- `STRIPE_SECRET_KEY`: clave secreta de Stripe en modo test.
- `STRIPE_WEBHOOK_SECRET`: secreto de firma del endpoint Stripe.
- `STRIPE_PRICE_ID`: identificador del precio recurrente de NOIR PREMIUM.

La URL y la clave publicable de Supabase ya están configuradas. Nunca publiques claves secretas en el repositorio ni en el navegador.

## Stripe
- Crear un producto NOIR PREMIUM y un precio recurrente mensual en COP (el importe debe decidirlo el propietario).
- Registrar el webhook `https://noir-vault-cruzgalindocamiloandres574-8998.vercel.app/api/stripe-webhook`.
- Suscribir los eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` y `invoice.payment_failed`.
- Guardar el secreto de firma en `STRIPE_WEBHOOK_SECRET`.

## Derechos y reproducción
Solo habilitar reproducción para películas con derechos y fuentes autorizadas. El catálogo inicial incluye cinco obras abiertas de Blender con créditos; las demás están visibles como referencias y bloqueadas para reproducción. El host de vídeo de muestra no es un CDN de producción.
