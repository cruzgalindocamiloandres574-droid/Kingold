# Auditoría de derechos y reproducción del catálogo

**Última medición:** 2026-11-27  
**Entorno:** proyecto Supabase de producción de NOIR VAULT  
**Alcance:** filas publicadas con `status = 'available'` y `video_url IS NOT NULL`.

## Resultado actual de la medición

| Indicador | Resultado actual | Medición inicial del 2026-11-27 |
| --- | ---: | ---: |
| Videos publicados con URL reproducible | 184 | 184 |
| Sin `content_metadata.rights_checked_on` | 8 | 31 |
| Sin `content_metadata.license_basis` | 28 | 51 |
| Sin perfil de streaming (`streaming_profile` y `stream_profile`) | 0 | 0 |
| Con `commercial_reuse_permitted = 'true'` | 144 | 144 |
| Sin valor explícito para reutilización comercial | 40 | 40 |
| Con valor explícito `commercial_reuse_permitted = 'false'` | 0 | 0 |

El 27 de noviembre de 2026 se revisaron fuentes individuales y se añadieron fecha y fundamento documental a 23 registros. La descripción por título, las URLs de evidencia, las restricciones y los casos ambiguos están en [CATALOG_RIGHTS_SOURCE_REVIEW_2026-11-27.md](./CATALOG_RIGHTS_SOURCE_REVIEW_2026-11-27.md).

Estos indicadores miden la **completitud de los metadatos**, no una conclusión jurídica. Una licencia escrita en la ficha, un enlace a una licencia o una URL reproducible no bastan por sí solos para demostrar que NOIR VAULT puede ofrecer cada obra en streaming comercial. También pueden existir derechos independientes sobre música, imágenes, intérpretes, restauraciones, materiales incorporados y otros componentes.

Los 8 recursos con `audio_url` y los 158 con `reader_url` son campos que pueden coexistir con un vídeo en la misma fila; por eso no se suman como si fueran títulos únicos ni forman parte de las cifras de esta auditoría específica de vídeo.

## Consulta de verificación

Ejecutar en Supabase SQL Editor. Es una consulta de solo lectura y permite reproducir los indicadores:

```sql
select
  count(*) as playable_video,
  count(*) filter (
    where coalesce(content_metadata->>'rights_checked_on', '') = ''
  ) as missing_rights_checked_on,
  count(*) filter (
    where coalesce(content_metadata->>'license_basis', '') = ''
  ) as missing_license_basis,
  count(*) filter (
    where coalesce(content_metadata->>'streaming_profile', '') = ''
      and coalesce(content_metadata->>'stream_profile', '') = ''
  ) as missing_stream_profile,
  count(*) filter (
    where content_metadata->>'commercial_reuse_permitted' = 'true'
  ) as commercial_reuse_true,
  count(*) filter (
    where content_metadata->>'commercial_reuse_permitted' = 'false'
  ) as commercial_reuse_false,
  count(*) filter (
    where coalesce(content_metadata->>'commercial_reuse_permitted', '') = ''
  ) as commercial_reuse_unset
from public.movies
where published = true
  and status = 'available'
  and video_url is not null;
```

Para obtener las filas que requieren revisión de evidencia:

```sql
select
  id,
  title,
  release_year,
  creator,
  license,
  credit,
  catalog_source,
  content_metadata->>'source_page_url' as source_page_url,
  content_metadata->>'license_url' as license_url,
  content_metadata->>'rights_checked_on' as rights_checked_on,
  content_metadata->>'license_basis' as license_basis,
  content_metadata->>'commercial_reuse_permitted' as commercial_reuse_permitted
from public.movies
where published = true
  and status = 'available'
  and video_url is not null
  and (
    coalesce(content_metadata->>'rights_checked_on', '') = ''
    or coalesce(content_metadata->>'license_basis', '') = ''
    or coalesce(content_metadata->>'commercial_reuse_permitted', '') = ''
  )
order by title;
```

## Criterios operativos

1. Registrar `rights_checked_on` únicamente después de abrir y revisar la página de origen; la fecha significa que hubo revisión, no que se obtuvo una autorización.
2. Completar `license_basis` con la evidencia concreta: declaración del titular, licencia del archivo, registro oficial o análisis de dominio público, junto con la URL primaria y cualquier limitación relevante. No copiar una frase genérica a registros que no se hayan comprobado individualmente.
3. Marcar `commercial_reuse_permitted` como verdadero solo cuando la evidencia cubra el uso comercial y los componentes incorporados relevantes. Un campo nulo debe seguir siendo “no verificado”, no convertirse automáticamente en verdadero o falso.
4. Revisar por separado licencias con condiciones NoDerivatives (ND), ShareAlike (SA), declaraciones de licencia contradictorias y obras que incorporen música, archivos o material de terceros.
5. Mantener bloqueada la reproducción cuando falte autorización suficiente o exista una restricción no resuelta. Una ficha publicada o un enlace externo pueden servir como referencia, pero no sustituyen el permiso para alojar, retransmitir o monetizar la obra.
6. No cambiar derechos, licencia, créditos, fecha de revisión ni disponibilidad mediante un backfill masivo. Cada modificación debe conservar la URL de evidencia y una nota específica para esa obra.

## Estado de los cambios

Se actualizaron únicamente `content_metadata.rights_checked_on` y `content_metadata.license_basis` en los 23 registros enumerados en el documento de revisión de fuentes. No se modificaron licencias declaradas, créditos, URLs, estados, ni la indicación `commercial_reuse_permitted`. La auditoría no constituye asesoría jurídica ni certificación de derechos para todos los territorios.
