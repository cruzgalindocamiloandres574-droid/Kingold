# Configuración final de NOIR VAULT

## Dar acceso de administrador

El proyecto Supabase conectado tiene una cuenta propietaria con correo confirmado y perfil `admin` (verificación del 2026-11-28). El ascenso se hizo de forma explícita sobre el UUID de esa cuenta, después de comprobar `email_confirmed_at`; NOIR VAULT no asciende automáticamente al primer usuario que se registre.

1. Abre [NOIR VAULT](https://noir-vault-psi.vercel.app/registro) y registra la cuenta que será propietaria.
2. Confirma el correo desde el mensaje que envíe Supabase. El disparador `on_auth_user_created` crea el perfil al insertar el usuario.
3. En Supabase → SQL Editor ejecuta este bloque, sustituyendo `PON_AQUI_EL_CORREO_CONFIRMADO` por el correo exacto que acabas de verificar:

```sql
do $
declare
  v_email text := lower(btrim('PON_AQUI_EL_CORREO_CONFIRMADO'));
  v_user_id uuid;
begin
  if v_email = '' or v_email = 'pon_aqui_el_correo_confirmado' then
    raise exception 'Indica el correo exacto de la cuenta propietaria.';
  end if;

  select id
    into v_user_id
    from auth.users
   where lower(email) = v_email
     and email_confirmed_at is not null;

  if v_user_id is null then
    raise exception 'No existe una cuenta confirmada con ese correo.';
  end if;

  update public.profiles
     set role = 'admin'
   where id = v_user_id;

  if not found then
    raise exception 'No se encontró el perfil creado para esa cuenta.';
  end if;
end $;
```

4. Cierra sesión, vuelve a entrar con esa cuenta y abre `/admin`. La comprobación del rol se hace desde el perfil en Supabase; el navegador no puede actualizar la columna `role`.

No pegues contraseñas, claves API ni tokens en el SQL Editor o en el repositorio. No otorgues el rol a una cuenta que no controles.

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



### Alcance de lectura del bloqueo de Checkout (2026-11-28)

La migración `supabase/migrations/20261128164047_grant_own_checkout_attempt_read_scope.sql` corrige los privilegios que necesita `public.acquire_checkout_attempt()` para limpiar intentos vencidos y devolver el UUID del intento recién creado. La función conserva `SECURITY INVOKER`; no se convirtió en una función privilegiada.

El rol `authenticated` recibe `SELECT` únicamente sobre las columnas `user_id`, `expires_at` y `attempt_id`, acompañado de una política RLS que limita las filas a `user_id = auth.uid()`. No puede leer `created_at` ni usar un `SELECT` de tabla completa. El rol `anon` no recibe lectura ni ejecución de la función. La migración quedó registrada en Supabase como versión `20261128164203`.

Verificación: la función ya no falla por permisos al ejecutar su limpieza; una invocación de prueba con un UUID que no existe avanzó hasta la restricción de clave foránea de `auth.users`, y la tabla sigue con cero intentos almacenados. Como aún no existe una cuenta real, falta validar el recorrido exitoso de Checkout con la primera sesión del propietario. No se creó una cuenta de prueba ni una sesión de Stripe.

## Derechos y reproducción
Solo habilitar reproducción para películas con derechos y fuentes autorizadas. El catálogo incluye fuentes reproducibles y fichas de referencia/enlaces externos; no supongas que una ficha publicada equivale a autorización de exhibición. El host de vídeo externo no es un CDN de producción.


## Estado comprobado de producción — 2026-11-28

- Hay una cuenta propietaria confirmada y un perfil con rol `admin`; el disparador de creación automática de perfiles está habilitado. En la última verificación no había suscripciones ni bloqueos de Checkout.
- La tabla `profiles` tiene RLS activo. Los usuarios autenticados solo reciben permiso de actualización para `display_name`; no tienen privilegio de actualización de tabla ni de columna sobre `role`.
- Las políticas de lectura de contenido exigen `commercial_reuse_permitted = true` para fuentes de reproducción y conservan acceso de revisión para administradores.
- Pruebas sin sesión contra producción: `POST /api/checkout` devuelve 401, `POST /api/portal` devuelve 401 y `POST /api/stripe-webhook` sin firma devuelve 400. El webhook reconoce su configuración de Stripe/Supabase y rechaza la petición sin una firma Stripe válida. Estas pruebas no crean sesiones de pago ni cobran.
- El bloqueo de paginación fuera de rango está desplegado. La página 999 de `/api/catalog` devuelve HTTP 200 y una lista vacía en lugar de consultar un rango inválido a PostgREST.
- El despliegue de producción y el CI de GitHub están aprobados. Stripe permanece en modo de prueba; no habilitar cobros reales sin autorización expresa.


## Corrección de inicio automático de Checkout — 2026-11-28

La página `/planes` ya no crea una sesión de Stripe automáticamente al regresar de `/login` o `/registro`. El visitante debe pulsar expresamente **SUSCRIBIRME**. Esto evita que una redirección de autenticación o una navegación automática cree una sesión de pago que el usuario no solicitó. La sesión de prueba que se detectó durante la auditoría quedó sin pago; se eliminó exclusivamente el bloqueo de base de datos asociado a su `checkout_attempt_id`.

La corrección está en el commit `de8cf31bfe811dad5fea5ef027b9b0b47e739ca6`. Vercel producción: `READY`; comprobación CI: `success`. Stripe continúa en modo test. No se han habilitado cobros reales.
