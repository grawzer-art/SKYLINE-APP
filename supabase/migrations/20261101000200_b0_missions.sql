-- ============================================================================
-- STAFF HQ V2 — B0.2 : projets et missions
-- Migration NON destructive (création uniquement). Aucune donnée insérée.
-- Écritures : UNIQUEMENT via les fonctions ci-dessous (pas de INSERT/UPDATE/DELETE direct pour les utilisateurs).
-- Les règles reprennent src/domain/missions.ts ; la base est la source de vérité.
-- ============================================================================

create type public.mission_status   as enum ('todo', 'in_progress', 'review', 'done');
create type public.mission_priority as enum ('normal', 'high', 'urgent');

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  owner_id    uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  primary key (project_id, user_id)
);

create table public.missions (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null check (char_length(btrim(title)) between 1 and 120),
  description          text not null default '' check (char_length(description) <= 500),
  creator_id           uuid not null references public.profiles (id),
  assignee_id          uuid not null references public.profiles (id),
  -- Attribution PROPOSÉE par un membre pour un autre : sans effet tant qu'un admin ne l'a pas approuvée.
  proposed_assignee_id uuid references public.profiles (id),
  -- Validateur désigné : un administrateur (GRAW ou TOM). GRAW garde un droit d'intervention global.
  validator_id         uuid not null references public.profiles (id),
  project_id           uuid references public.projects (id) on delete set null,
  priority             public.mission_priority not null default 'normal',
  status               public.mission_status not null default 'todo',
  due_date             date,
  archived_at          timestamptz,
  version              integer not null default 1,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint missions_validator_not_assignee check (validator_id <> assignee_id),
  constraint missions_proposed_valid check (proposed_assignee_id is null or (proposed_assignee_id <> assignee_id and proposed_assignee_id <> validator_id))
);
create index missions_assignee_idx  on public.missions (assignee_id);
create index missions_creator_idx   on public.missions (creator_id);
create index missions_validator_idx on public.missions (validator_id);
create index missions_status_idx    on public.missions (status) where archived_at is null;
create index missions_due_idx       on public.missions (due_date) where archived_at is null;
create index missions_project_idx   on public.missions (project_id);

-- Historique : ajout seulement (aucune politique de modification ni de suppression).
create table public.mission_events (
  id          bigint generated always as identity primary key,
  mission_id  uuid not null references public.missions (id) on delete cascade,
  at          timestamptz not null default now(),
  actor_id    uuid not null references public.profiles (id),
  kind        text not null check (kind in ('created', 'edited', 'status', 'validated', 'returned', 'assignment_proposed',
                                            'assignment_approved', 'assignment_rejected', 'reassigned', 'archived')),
  from_status public.mission_status,
  to_status   public.mission_status,
  note        text check (note is null or char_length(note) <= 200)
);
create index mission_events_mission_idx on public.mission_events (mission_id, at);

create table public.mission_comments (
  id         uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  author_id  uuid not null references public.profiles (id),
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index mission_comments_mission_idx on public.mission_comments (mission_id, created_at);

alter table public.projects         enable row level security;
alter table public.project_members  enable row level security;
alter table public.missions         enable row level security;
alter table public.mission_events   enable row level security;
alter table public.mission_comments enable row level security;

-- Appartenance à un projet (SECURITY DEFINER : évite la récursion de la RLS sur project_members).
create or replace function public.is_project_member(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.project_members pm where pm.project_id = p_project and pm.user_id = auth.uid()) $$;

-- ---------------------------------------------------------------- Visibilité d'une mission
create or replace function public.can_view_mission(p_mission uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_member() and exists (
    select 1 from public.missions m
    where m.id = p_mission and (
      public.is_coordinator()
      or auth.uid() in (m.creator_id, m.assignee_id, m.validator_id)
      or m.proposed_assignee_id = auth.uid()
      or (m.project_id is not null and public.is_project_member(m.project_id))
    ))
$$;

-- ---------------------------------------------------------------- Écritures contrôlées
create or replace function public.create_mission(
  p_title text, p_description text, p_assignee uuid, p_validator uuid, p_due date,
  p_priority public.mission_priority default 'normal', p_status public.mission_status default 'todo', p_project uuid default null
) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); coord boolean; eff uuid; proposed uuid; m public.missions;
begin
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  coord := public.is_coordinator();
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'invalid_description'; end if;
  if not public.is_active_user(p_assignee) then raise exception 'invalid_assignee'; end if;
  if not public.is_validator_user(p_validator) then raise exception 'invalid_validator'; end if;
  if p_status = 'done' and not coord then raise exception 'forbidden_status' using errcode = '42501'; end if;
  if p_assignee <> me and not coord then eff := me; proposed := p_assignee; else eff := p_assignee; proposed := null; end if;
  if p_validator = eff or p_validator = proposed then raise exception 'validator_conflict'; end if;
  if p_project is not null and not (coord or public.is_project_member(p_project))
  then raise exception 'forbidden_project' using errcode = '42501'; end if;

  insert into public.missions (title, description, creator_id, assignee_id, proposed_assignee_id, validator_id, project_id, priority, status, due_date)
  values (btrim(p_title), btrim(coalesce(p_description, '')), me, eff, proposed, p_validator, p_project, p_priority, p_status, p_due)
  returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind) values (m.id, me, 'created');
  if proposed is not null then
    insert into public.mission_events (mission_id, actor_id, kind, note) values (m.id, me, 'assignment_proposed', proposed::text);
  end if;
  return m;
end $$;

create or replace function public.update_mission(
  p_id uuid, p_expected_version integer, p_title text, p_description text, p_validator uuid,
  p_due date, p_priority public.mission_priority, p_project uuid default null
) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions; changed text[] := '{}';
begin
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if not (public.is_coordinator() or m.creator_id = me) then raise exception 'forbidden' using errcode = '42501'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'invalid_description'; end if;
  if not public.is_validator_user(p_validator) then raise exception 'invalid_validator'; end if;
  if p_validator = m.assignee_id or p_validator = m.proposed_assignee_id then raise exception 'validator_conflict'; end if;
  if p_project is not null and not (public.is_coordinator() or public.is_project_member(p_project))
  then raise exception 'forbidden_project' using errcode = '42501'; end if;
  if btrim(p_title) <> m.title then changed := array_append(changed, 'title'); end if;
  if btrim(coalesce(p_description, '')) <> m.description then changed := array_append(changed, 'description'); end if;
  if p_validator <> m.validator_id then changed := array_append(changed, 'validatorId'); end if;
  if p_due is distinct from m.due_date then changed := array_append(changed, 'dueDate'); end if;
  if p_priority <> m.priority then changed := array_append(changed, 'priority'); end if;
  if p_project is distinct from m.project_id then changed := array_append(changed, 'project'); end if;
  if cardinality(changed) = 0 then return m; end if;
  update public.missions set title = btrim(p_title), description = btrim(coalesce(p_description, '')), validator_id = p_validator,
         due_date = p_due, priority = p_priority, project_id = p_project, version = version + 1, updated_at = now()
  where id = p_id returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'edited', array_to_string(changed, ', '));
  return m;
end $$;

create or replace function public.set_mission_status(p_id uuid, p_to public.mission_status, p_note text default null) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions; old public.mission_status; ok boolean := false; k text := 'status'; n text := nullif(left(btrim(coalesce(p_note, '')), 200), '');
begin
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if p_to = m.status then raise exception 'same_status'; end if;
  old := m.status;
  if public.is_coordinator() then ok := true;
  else
    -- Validateur désigné : valider (terminée) ou renvoyer en cours, uniquement depuis « en validation ».
    if m.validator_id = me and old = 'review' and p_to in ('done', 'in_progress') then ok := true; end if;
    -- Responsable : jamais « terminée » (seule la validation clôt une mission).
    if m.assignee_id = me and (
         (old = 'todo' and p_to = 'in_progress')
      or (old = 'in_progress' and p_to in ('todo', 'review'))
      or (old = 'review' and p_to = 'in_progress')) then ok := true; end if;
  end if;
  if not ok then raise exception 'forbidden_transition' using errcode = '42501'; end if;
  if old = 'review' and p_to = 'done' then k := 'validated';
  elsif old = 'review' and p_to = 'in_progress' and m.validator_id = me then k := 'returned'; end if;
  update public.missions set status = p_to, version = version + 1, updated_at = now() where id = p_id returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind, from_status, to_status, note) values (p_id, me, k, old, p_to, n);
  return m;
end $$;

-- Attribuer / réattribuer. Admin : effet immédiat. Créateur ou responsable (member) : PROPOSITION à valider par un admin.
create or replace function public.assign_mission(p_id uuid, p_assignee uuid) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions;
begin
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if not public.is_active_user(p_assignee) then raise exception 'invalid_assignee'; end if;
  if p_assignee = m.assignee_id then raise exception 'same_assignee'; end if;
  if p_assignee = m.validator_id then raise exception 'validator_conflict'; end if;
  if public.is_coordinator() then
    update public.missions set assignee_id = p_assignee, proposed_assignee_id = null, version = version + 1, updated_at = now() where id = p_id returning * into m;
    insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'reassigned', p_assignee::text);
  elsif m.creator_id = me or m.assignee_id = me then
    update public.missions set proposed_assignee_id = p_assignee, version = version + 1, updated_at = now() where id = p_id returning * into m;
    insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'assignment_proposed', p_assignee::text);
  else raise exception 'forbidden' using errcode = '42501'; end if;
  return m;
end $$;

-- Approuver ou refuser une proposition d'attribution : admin et super admin uniquement.
create or replace function public.resolve_assignment(p_id uuid, p_approve boolean, p_note text default null) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions; proposed uuid; n text := nullif(left(btrim(coalesce(p_note, '')), 200), '');
begin
  if me is null or not public.is_coordinator() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  proposed := m.proposed_assignee_id;
  if proposed is null then raise exception 'no_pending_assignment'; end if;
  if p_approve then
    if proposed = m.validator_id then raise exception 'validator_conflict'; end if;
    if not public.is_active_user(proposed) then raise exception 'invalid_assignee'; end if;
    update public.missions set assignee_id = proposed, proposed_assignee_id = null, version = version + 1, updated_at = now() where id = p_id returning * into m;
    insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'assignment_approved', coalesce(n, proposed::text));
  else
    update public.missions set proposed_assignee_id = null, version = version + 1, updated_at = now() where id = p_id returning * into m;
    insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'assignment_rejected', coalesce(n, proposed::text));
  end if;
  return m;
end $$;

create or replace function public.add_mission_comment(p_id uuid, p_body text) returns public.mission_comments
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); c public.mission_comments;
begin
  if me is null or not public.is_active_member() or not public.can_view_mission(p_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if btrim(coalesce(p_body, '')) = '' or char_length(btrim(p_body)) > 1000 then raise exception 'invalid_comment'; end if;
  insert into public.mission_comments (mission_id, author_id, body) values (p_id, me, btrim(p_body)) returning * into c;
  return c;
end $$;

create or replace function public.archive_mission(p_id uuid) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions;
begin
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if not (public.is_coordinator() or m.creator_id = me) then raise exception 'forbidden' using errcode = '42501'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  update public.missions set archived_at = now(), version = version + 1, updated_at = now() where id = p_id returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind) values (p_id, me, 'archived');
  return m;
end $$;

-- Suppression DÉFINITIVE (avec son historique et ses commentaires) : admin et super admin uniquement. Préférer l'archivage.
create or replace function public.delete_mission(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_coordinator() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.missions where id = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;

-- ---------------------------------------------------------------- Droits d'exécution : jamais pour l'anonyme
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_project_member(uuid), public.can_view_mission(uuid),
  public.create_mission(text, text, uuid, uuid, date, public.mission_priority, public.mission_status, uuid),
  public.update_mission(uuid, integer, text, text, uuid, date, public.mission_priority, uuid),
  public.set_mission_status(uuid, public.mission_status, text),
  public.assign_mission(uuid, uuid), public.resolve_assignment(uuid, boolean, text),
  public.add_mission_comment(uuid, text), public.archive_mission(uuid), public.delete_mission(uuid)
  to authenticated;
