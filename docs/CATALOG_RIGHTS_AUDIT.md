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
| Con `commercial_reuse_permitted = 'true'` | 167 | 144 |
| Sin valor explícito para reutilización comercial | 17 | 40 |
| Con valor explícito `commercial_reuse_permitted = 'false'` | 0 | 0 |

El 27 de noviembre de 2026 se revisaron fuentes individuales: se completaron 51 fundamentos documentales y 31 fechas de revisión. La descripción por título, las URLs de evidencia, las restricciones y los casos ambiguos están en [CATALOG_RIGHTS_SOURCE_REVIEW_2026-11-27.md](./CATALOG_RIGHTS_SOURCE_REVIEW_2026-11-27.md).

Estos indicadores miden la **completitud de los metadatos**, no una conclusión jurídica. Una licencia escrita en la ficha, un enlace a una licencia o una URL reproducible no bastan por sí solos para demostrar que NOIR VAULT puede ofrecer cada obra en streaming comercial. También pueden existir derechos independientes sobre música, imágenes, intérpretes, restauraciones, materiales incorporados y otros componentes.

Los 8 recursos con `audio_url` y los 158 con `reader_url` son campos que pueden coexistir con un vídeo en la misma fila; por eso no se suman como si fueran títulos únicos ni forman parte de las cifras de esta auditoría específica de vídeo.

## Uso comercial todavía sin determinar

17 de los 184 videos no tienen valor explícito en `commercial_reuse_permitted`. No se deben interpretar como 17 infracciones ni como 17 autorizaciones: son registros en los que falta una determinación documentada para la copia concreta y sus componentes.

La revisión del inventario agrupa los 17 registros aún sin determinar en 11 películas de 1904–1908 marcadas con Public Domain Mark de Wikimedia Commons y 6 títulos con condiciones o evidencias adicionales pendientes: Agent 327, Jan Haarhuis, Karinding, Luz y Libertad, Mage Porob y Wikimania 2015.

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

1. `rights_checked_on` registra la fecha de la consulta más reciente de la página de origen. Si se vuelve a consultar la fuente, actualizar la fecha aunque la licencia no cambie. La fecha documenta una revisión, no la obtención de autorización.
2. Completar `license_basis` con la evidencia concreta: declaración del titular, licencia del archivo, registro oficial o análisis de dominio público, junto con la URL primaria y cualquier limitación relevante. No copiar una frase genérica a registros que no se hayan comprobado individualmente.
3. Marcar `commercial_reuse_permitted` como verdadero solo cuando la evidencia cubra el uso comercial y los componentes incorporados relevantes. Un campo nulo debe seguir siendo “no verificado”, no convertirse automáticamente en verdadero o falso.
4. Revisar por separado licencias con condiciones NoDerivatives (ND), ShareAlike (SA), declaraciones de licencia contradictorias y obras que incorporen música, archivos o material de terceros.
5. Mantener bloqueada la reproducción cuando falte autorización suficiente o exista una restricción no resuelta. Una ficha publicada o un enlace externo pueden servir como referencia, pero no sustituyen el permiso para alojar, retransmitir o monetizar la obra.
6. No cambiar licencias, créditos, URLs ni disponibilidad mediante un backfill masivo. Al revisar una fuente concreta, actualizar `rights_checked_on` a la fecha de la consulta más reciente y conservar la URL de evidencia y una nota específica para esa obra.

## Estado de los cambios

Se completaron 51 fundamentos de licencia y 51 fechas de consulta más reciente (31 vacías y 20 actualizadas desde 2026-11-26). Además, 23 registros recibieron `commercial_reuse_permitted = true` y una nota `commercial_reuse_basis` específica: diez determinaciones CC BY/CC BY-SA, una determinación preliminar de dominio público para la copia histórica de Liliputian Dance, tres copias CC BY 4.0 (Charge, Dominion y The Daily Dweebs), ocho episodios de BBS: The Documentary bajo CC BY-SA 3.0 y Cosmos Laundromat bajo CC BY-SA 3.0. No se modificaron licencias declaradas, créditos, URLs ni estados. Los 17 registros restantes siguen sin conclusión comercial. La auditoría no constituye asesoría jurídica ni certificación de derechos para todos los territorios.
