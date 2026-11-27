# Auditoría de derechos y reproducción del catálogo

**Última medición:** 2026-11-27  
**Entorno:** proyecto Supabase de producción de NOIR VAULT  
**Alcance:** filas publicadas con `status = 'available'` y `video_url IS NOT NULL`.

## Resultado actual de la medición

| Indicador | Resultado actual | Medición inicial del 2026-11-27 |
| --- | ---: | ---: |
| Videos publicados con URL reproducible | 184 | 184 |
| Sin `content_metadata.rights_checked_on` | 0 | 31 |
| Sin `content_metadata.license_basis` | 0 | 51 |
| Sin perfil de streaming (`streaming_profile` y `stream_profile`) | 0 | 0 |
| Con `commercial_reuse_permitted = 'true'` | 144 | 144 |
| Sin valor explícito para reutilización comercial | 40 | 40 |
| Con valor explícito `commercial_reuse_permitted = 'false'` | 0 | 0 |

El 27 de noviembre de 2026 se revisaron fuentes individuales: se completaron 51 fundamentos documentales y 31 fechas de revisión. La descripción por título, las URLs de evidencia, las restricciones y los casos ambiguos están en [CATALOG_RIGHTS_SOURCE_REVIEW_2026-11-27.md](./CATALOG_RIGHTS_SOURCE_REVIEW_2026-11-27.md).

Estos indicadores miden la **completitud de los metadatos**, no una conclusión jurídica. Una licencia escrita en la ficha, un enlace a una licencia o una URL reproducible no bastan por sí solos para demostrar que NOIR VAULT puede ofrecer cada obra en streaming comercial. También pueden existir derechos independientes sobre música, imágenes, intérpretes, restauraciones, materiales incorporados y otros componentes.

Los 8 recursos con `audio_url` y los 158 con `reader_url` son campos que pueden coexistir con un vídeo en la misma fila; por eso no se suman como si fueran títulos únicos ni forman parte de las cifras de esta auditoría específica de vídeo.

## Uso comercial todavía sin determinar

40 de los 184 videos no tienen valor explícito en `commercial_reuse_permitted`. No se deben interpretar como 40 infracciones ni como 40 autorizaciones: son registros en los que falta una determinación documentada para la copia concreta y sus componentes.

La revisión del inventario agrupó estos 40 registros en 12 películas de 1904–1908 marcadas con Public Domain Mark de Wikimedia Commons, 8 episodios de `BBS: The Documentary` y 20 títulos adicionales con licencias abiertas o condiciones que requieren revisar música, intérpretes, material de archivo, versiones de archivo, restricciones ND o declaraciones de licencia discrepantes.

Public Domain Mark 1.0 es un indicador, no una licencia. Para una determinación en Colombia deben verificarse los artículos 26 y 27 de la Ley 23 de 1982 (artículo 27 modificado por la Ley 1915 de 2018): plazo cinematográfico general de 80 años desde terminación/primera comunicación pública; si el titular es persona jurídica, 70 años desde el final del año de primera publicación autorizada. También deben verificarse titular/productor, fecha de primera comunicación/publicación, bandas sonoras añadidas, restauraciones y derechos complementarios. Fuentes: [Ley 23 de 1982, compilación oficial de Cancillería](https://www.cancilleria.gov.co/normograma/compilacion/docs/ley_0023_1982.htm) y [Ley 1915 de 2018, Gestor Normativo](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=87419).

Los campos se mantienen nulos hasta completar la revisión. No se han convertido en verdaderos por la sola presencia de una etiqueta CC o PDM.

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

Se actualizaron únicamente `content_metadata.rights_checked_on` y `content_metadata.license_basis` en los 51 registros descritos en el documento de revisión de fuentes. No se modificaron licencias declaradas, créditos, URLs, estados, ni la indicación `commercial_reuse_permitted`. La auditoría no constituye asesoría jurídica ni certificación de derechos para todos los territorios.
