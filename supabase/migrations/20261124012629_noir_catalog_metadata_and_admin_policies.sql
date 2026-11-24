-- NOIR VAULT catalog metadata and admin-only write policies
alter table public.movies add column if not exists duration text;
alter table public.movies add column if not exists art text;
alter table public.movies add column if not exists video_url text;
alter table public.movies add column if not exists creator text;
alter table public.movies add column if not exists license text;
alter table public.movies add column if not exists credit text;
alter table public.movies add column if not exists status text not null default 'soon' check (status in ('available','soon'));
create unique index if not exists movies_title_unique_idx on public.movies(title);
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
revoke all on function private.is_admin() from public,anon;
grant execute on function private.is_admin() to authenticated;
create policy "Admins insert movies" on public.movies for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update movies" on public.movies for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete movies" on public.movies for delete to authenticated using ((select private.is_admin()));
insert into public.movies(title,synopsis,genre,release_year,duration,art,video_url,creator,license,credit,status,published) values
('BIG BUCK BUNNY','Un conejo gigante y tranquilo decide enfrentarse a tres roedores que alteran la paz del bosque.','Animación',2008,'10 min','bunny','https://video.blender.org/static/webseed/bf1f3fb5-b119-4f9f-9930-8e20e892b898-720.mp4','Blender Foundation','Creative Commons Atribución 3.0','© copyright 2008, Blender Foundation / www.bigbuckbunny.org','available',true),
('SINTEL','Una joven atraviesa tierras heladas en busca del pequeño dragón que perdió.','Fantasía',2010,'15 min','sintel','https://video.blender.org/static/webseed/0eb052d0-fd51-43e6-aa33-ecdbf77a5d40-720.mp4','Blender Foundation','Creative Commons Atribución 3.0','© copyright Blender Foundation / www.sintel.org','available',true),
('TEARS OF STEEL','En un futuro devastado, un grupo intenta salvar a la humanidad de una amenaza tecnológica.','Ciencia ficción',2012,'12 min','steel','https://video.blender.org/static/webseed/8533ea43-4271-4a57-9694-e9d0b35e1aa1-720.mp4','Blender Foundation','Creative Commons Atribución 3.0','(CC) Blender Foundation / mango.blender.org','available',true),
('SPRING','Una pastora y su perro se enfrentan a antiguos espíritus para mantener el ciclo de la vida.','Fantasía',2019,'7 min','spring','https://video.blender.org/static/webseed/3d95fb3d-c866-42c8-9db1-fe82f48ccb95-720.mp4','Blender Foundation','Creative Commons Atribución 4.0','© Blender Foundation | cloud.blender.org/spring','available',true),
('SPRITE FRIGHT','Un grupo de adolescentes descubre criaturas del bosque que esconden una fuerza inesperada.','Aventura',2021,'11 min','sprite','https://video.blender.org/download/videos/a69d68a5-a0e0-4a80-9d66-49f093c97aaf-720.mp4','Blender Foundation','Creative Commons Atribución 1.0','(CC) Blender Foundation | studio.blender.org','available',true),
('AGENT 327','Un agente secreto se infiltra en una barbería en una misión que se sale de control.','Comedia',2017,'4 min','agent',null,'Blender Foundation','Pendiente de verificación','Referencia de catálogo; reproducción deshabilitada.','soon',true),
('COSMOS LAUNDROMAT','Una oveja desesperada conoce a un extraño personaje que le ofrece una segunda oportunidad.','Ciencia ficción',2015,'12 min','cosmos',null,'Blender Foundation','Pendiente de verificación','Referencia de catálogo; reproducción deshabilitada.','soon',true),
('CAMINANDES','Koro, una llama obstinada, intenta conseguir una baya en la Patagonia.','Animación',2013,'3 min','caminandes',null,'Blender Foundation','Pendiente de verificación','Referencia de catálogo; reproducción deshabilitada.','soon',true),
('ELEPHANTS DREAM','Dos viajeros exploran una máquina gigantesca y misteriosa.','Ciencia ficción',2006,'11 min','elephants',null,'Blender Foundation','Pendiente de verificación','Referencia de catálogo; reproducción deshabilitada.','soon',true)
on conflict(title) do update set synopsis=excluded.synopsis,genre=excluded.genre,release_year=excluded.release_year,duration=excluded.duration,art=excluded.art,video_url=excluded.video_url,creator=excluded.creator,license=excluded.license,credit=excluded.credit,status=excluded.status,published=excluded.published;
