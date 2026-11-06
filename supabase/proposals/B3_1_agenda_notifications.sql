-- ============================================================================
-- SKYLINE — B3.1 : agenda (heure facultative, réunions / événements) + notifications STAFF / participants + appareils Web Push
--
-- *** PROPOSITION — NON APPLIQUÉE. *** Ce fichier est volontairement HORS de supabase/migrations/ : il ne peut pas être appliqué par erreur.
-- À appliquer seulement après validation explicite. Non destructif (création et remplacement de deux fonctions ; aucune donnée supprimée).
-- Validé sur un Postgres local (tests/proposal-b3.test.mts) : B0 + cette proposition, RLS, droits, séparation STAFF / participants.
--
-- Principes (mêmes que B0) : REFUS PAR DÉFAUT · RLS partout · aucun droit pour `anon` · écritures UNIQUEMENT par fonctions SECURITY DEFINER
-- (search_path vide, objets qualifiés) · séparation stricte des destinataires (audience `staff` / `participants`).
--
-- COMPATIBILITÉ : les fonctions B0 (create_mission, update_mission, …) restent STRICTEMENT inchangées (aucun DROP, aucun CREATE OR REPLACE) : un client
-- B2 continue de fonctionner à l'identique, avant comme après cette migration, et ne peut PAS effacer `due_time`. Les clients B3 utilisent les fonctions
-- `_v2` (heure explicite). Le client B3 n'appelle ces fonctions qu'une fois la migration appliquée (réglage serveur STAFF_DB_SCHEMA=b3).
-- ============================================================================

-- ---------------------------------------------------------------- 1. Heure facultative + mission privée (COMPATIBLE avec les clients B2)
-- STRATÉGIE : les fonctions B0 `create_mission` et `update_mission` ne sont NI supprimées, NI remplacées, NI modifiées (mêmes signatures, même corps,
-- mêmes droits d'exécution, même OID). Aucun DROP : aucune dépendance PostgreSQL, aucun privilège ni signature RPC n'est touché.
-- L'heure s'écrit par de NOUVELLES fonctions `create_mission_v2` / `update_mission_v2` (noms distincts : aucune surcharge ambiguë côté RPC),
-- dont le paramètre `p_time` est OBLIGATOIRE (pas de défaut) : l'omettre est une ERREUR, jamais un effacement silencieux.
-- Un client B2 qui appelle l'ancienne `update_mission` ne touche pas à `due_time` : l'heure est CONSERVÉE (sauf si la date est effacée : voir déclencheur).
alter table public.missions add column due_time time;
-- Mission privée : exclue de l'agenda collectif (list_team_agenda). Défaut false = partagée avec l'équipe STAFF (règle à valider, voir §2bis).
alter table public.missions add column is_private boolean not null default false;
alter table public.missions add constraint missions_due_time_needs_date check (due_time is null or due_date is not null);

-- Cohérence : sans date, pas d'heure. Un ancien client qui efface la DATE d'une mission horodatée n'obtient donc pas d'erreur : l'heure suit (déclencheur BEFORE).
create function public.missions_keep_time_consistent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.due_date is null then new.due_time := null; end if;
  return new;
end $$;
create trigger missions_time_consistency before insert or update of due_date, due_time on public.missions
for each row execute function public.missions_keep_time_consistent();

-- create_mission_v2 : corps B0 + heure. `p_time` obligatoire (avant les paramètres à valeur par défaut).
create function public.create_mission_v2(
  p_title text, p_description text, p_assignee uuid, p_validator uuid, p_due date, p_time time,
  p_priority public.mission_priority default 'normal', p_status public.mission_status default 'todo', p_project uuid default null
) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); coord boolean; eff uuid; proposed uuid; m public.missions;
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  coord := public.is_staff_coordinator();
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'invalid_description'; end if;
  if p_time is not null and p_due is null then raise exception 'invalid_time'; end if;
  if not public.is_staff_user(p_assignee) then raise exception 'invalid_assignee'; end if;
  if not public.is_validator_user(p_validator) then raise exception 'invalid_validator'; end if;
  if p_status = 'done' and not coord then raise exception 'forbidden_status' using errcode = '42501'; end if;
  if p_assignee <> me and not coord then eff := me; proposed := p_assignee; else eff := p_assignee; proposed := null; end if;
  if p_validator = eff or p_validator = proposed then raise exception 'validator_conflict'; end if;
  if p_project is not null and not (coord or public.is_project_member(p_project))
  then raise exception 'forbidden_project' using errcode = '42501'; end if;

  insert into public.missions (title, description, creator_id, assignee_id, proposed_assignee_id, validator_id, project_id, priority, status, due_date, due_time)
  values (btrim(p_title), btrim(coalesce(p_description, '')), me, eff, proposed, p_validator, p_project, p_priority, p_status, p_due, p_time)
  returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind) values (m.id, me, 'created');
  if proposed is not null then
    insert into public.mission_events (mission_id, actor_id, kind, note) values (m.id, me, 'assignment_proposed', proposed::text);
  end if;
  return m;
end $$;

-- update_mission_v2 : corps B0 + heure, contrôle de version inchangé. `p_time` obligatoire : null = « aucune heure » (explicite).
create function public.update_mission_v2(
  p_id uuid, p_expected_version integer, p_title text, p_description text, p_validator uuid, p_due date, p_time time,
  p_priority public.mission_priority, p_project uuid default null
) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions; changed text[] := '{}'; v_time time;
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if not (public.is_staff_coordinator() or m.creator_id = me) then raise exception 'forbidden' using errcode = '42501'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'invalid_description'; end if;
  if p_time is not null and p_due is null then raise exception 'invalid_time'; end if;
  if not public.is_validator_user(p_validator) then raise exception 'invalid_validator'; end if;
  if p_validator = m.assignee_id or p_validator = m.proposed_assignee_id then raise exception 'validator_conflict'; end if;
  if p_project is not null and not (public.is_staff_coordinator() or public.is_project_member(p_project))
  then raise exception 'forbidden_project' using errcode = '42501'; end if;
  v_time := case when p_due is null then null else p_time end;
  if btrim(p_title) <> m.title then changed := array_append(changed, 'title'); end if;
  if btrim(coalesce(p_description, '')) <> m.description then changed := array_append(changed, 'description'); end if;
  if p_validator <> m.validator_id then changed := array_append(changed, 'validatorId'); end if;
  if p_due is distinct from m.due_date then changed := array_append(changed, 'dueDate'); end if;
  if v_time is distinct from m.due_time then changed := array_append(changed, 'dueTime'); end if;
  if p_priority <> m.priority then changed := array_append(changed, 'priority'); end if;
  if p_project is distinct from m.project_id then changed := array_append(changed, 'project'); end if;
  if cardinality(changed) = 0 then return m; end if;
  update public.missions set title = btrim(p_title), description = btrim(coalesce(p_description, '')), validator_id = p_validator,
         due_date = p_due, due_time = v_time, priority = p_priority, project_id = p_project, version = version + 1, updated_at = now()
  where id = p_id returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'edited', array_to_string(changed, ', '));
  return m;
end $$;

-- Mission privée : le créateur ou un coordinateur la retire (ou la remet) dans l'agenda collectif. Ne change pas la visibilité B0 (RLS inchangée).
create function public.set_mission_private(p_id uuid, p_private boolean) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions;
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if not (public.is_staff_coordinator() or m.creator_id = me) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.missions set is_private = coalesce(p_private, false), version = version + 1, updated_at = now() where id = p_id returning * into m;
  return m;
end $$;

-- ---------------------------------------------------------------- 1bis. AGENDA COLLECTIF : lecture sécurisée, colonnes MINIMALES
-- Tout membre STAFF actif consulte le planning de l'équipe SANS pouvoir lire les missions des autres (la RLS B0 reste inchangée).
-- EXPOSÉ : id, titre, responsable (id), date, heure, statut, priorité — et rien d'autre.
-- JAMAIS EXPOSÉ : description, créateur, validateur, personne proposée, projet, commentaires, historique, version.
-- RÈGLES DE CONFIDENTIALITÉ (à valider) : 1) membres STAFF actifs uniquement (participants, comptes inactifs, anonymes : refus) ;
-- 2) missions archivées exclues ; 3) missions marquées privées (is_private) exclues ; 4) seulement les missions DATÉES, dans une fenêtre bornée
-- (62 jours max, 500 lignes max : pas d'export en masse) ; 5) le titre d'une mission non privée est visible de toute l'équipe STAFF.
create function public.list_team_agenda(p_from date, p_to date)
returns table (id uuid, title text, assignee_id uuid, due_date date, due_time time, status public.mission_status, priority public.mission_priority)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62 then raise exception 'invalid_range'; end if;
  return query
    select m.id, m.title, m.assignee_id, m.due_date, m.due_time, m.status, m.priority
    from public.missions m
    where m.archived_at is null and not m.is_private and m.due_date between p_from and p_to
    order by m.due_date, m.due_time nulls last, m.title
    limit 500;
end $$;

-- ---------------------------------------------------------------- 2. Réunions et événements (type DISTINCT des missions)
create type public.agenda_event_kind as enum ('meeting', 'event');
create type public.agenda_scope      as enum ('team', 'me');
create table public.agenda_events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(btrim(title)) between 1 and 80),
  kind       public.agenda_event_kind not null,
  date       date not null,
  start_time time,
  end_time   time,
  place      text not null default '' check (char_length(place) <= 80),
  scope      public.agenda_scope not null default 'team',
  creator_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint agenda_end_needs_start check (end_time is null or start_time is not null),
  constraint agenda_end_after_start check (end_time is null or end_time > start_time)
);
create index agenda_events_date_idx on public.agenda_events (date);
alter table public.agenda_events enable row level security;

-- Création : tout membre STAFF crée un événement PERSONNEL ; seuls les coordinateurs créent un événement d'ÉQUIPE.
create function public.create_agenda_event(p_title text, p_kind public.agenda_event_kind, p_date date, p_start time, p_end time, p_place text, p_scope public.agenda_scope)
returns public.agenda_events language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); e public.agenda_events;
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_scope = 'team' and not public.is_staff_coordinator() then raise exception 'forbidden' using errcode = '42501'; end if;
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 80 then raise exception 'invalid_title'; end if;
  if p_date is null then raise exception 'invalid_date'; end if;
  if p_end is not null and (p_start is null or p_end <= p_start) then raise exception 'invalid_time'; end if;
  insert into public.agenda_events (title, kind, date, start_time, end_time, place, scope, creator_id)
  values (btrim(p_title), p_kind, p_date, p_start, p_end, left(btrim(coalesce(p_place, '')), 80), p_scope, me) returning * into e;
  return e;
end $$;

-- Modification : le CRÉATEUR seulement (la portée ne change pas).
create function public.update_agenda_event(p_id uuid, p_title text, p_kind public.agenda_event_kind, p_date date, p_start time, p_end time, p_place text)
returns public.agenda_events language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); e public.agenda_events;
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into e from public.agenda_events where id = p_id and (scope = 'team' or creator_id = me);
  if not found then raise exception 'not_found'; end if;
  if e.creator_id <> me then raise exception 'forbidden' using errcode = '42501'; end if;
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 80 then raise exception 'invalid_title'; end if;
  if p_date is null then raise exception 'invalid_date'; end if;
  if p_end is not null and (p_start is null or p_end <= p_start) then raise exception 'invalid_time'; end if;
  update public.agenda_events set title = btrim(p_title), kind = p_kind, date = p_date, start_time = p_start, end_time = p_end, place = left(btrim(coalesce(p_place, '')), 80)
  where id = p_id returning * into e;
  return e;
end $$;

-- Suppression : le créateur, ou un coordinateur pour un événement d'équipe.
create function public.delete_agenda_event(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); e public.agenda_events;
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into e from public.agenda_events where id = p_id and (scope = 'team' or creator_id = me);
  if not found then raise exception 'not_found'; end if;
  if not (e.creator_id = me or (e.scope = 'team' and public.is_staff_coordinator())) then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.agenda_events where id = p_id;
end $$;

-- ---------------------------------------------------------------- 3. Notifications (STAFF et participants : audiences SÉPARÉES)
create type public.notification_audience as enum ('staff', 'participants');
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  audience     public.notification_audience not null,
  -- null = toute l'audience (annonce) ; sinon un destinataire nominatif (qui doit appartenir à l'audience).
  recipient_id uuid references public.accounts (id) on delete cascade,
  category     text not null,
  title        text not null check (char_length(btrim(title)) between 1 and 80),
  body         text not null check (char_length(btrim(body)) between 1 and 280),
  href         text check (href is null or href ~ '^/[^/]'),
  urgent       boolean not null default false,
  created_by   uuid references public.accounts (id) on delete set null,
  created_at   timestamptz not null default now(),
  -- Les catégories STAFF et participants ne se croisent JAMAIS.
  constraint notifications_category_matches_audience check (
    (audience = 'staff' and category in ('missions', 'proposals', 'validations', 'comments', 'reminders', 'announcements'))
    or (audience = 'participants' and category in ('artists', 'flight', 'program', 'departure', 'official')))
);
create index notifications_audience_idx on public.notifications (audience, created_at desc);
create index notifications_recipient_idx on public.notifications (recipient_id) where recipient_id is not null;
alter table public.notifications enable row level security;

create table public.notification_reads (
  user_id uuid not null references public.accounts (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);
alter table public.notification_reads enable row level security;

create table public.notification_preferences (
  user_id uuid primary key references public.accounts (id) on delete cascade,
  categories jsonb not null default '{}'::jsonb check (jsonb_typeof(categories) = 'object'),
  reminder_lead text not null default 'day_before' check (reminder_lead in ('same_day', 'day_before', 'two_days')),
  push boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;

-- Appareils Web Push. `endpoint`, `p256dh` et `auth` sont des SECRETS : jamais lisibles par les utilisateurs (droits par colonnes ci-dessous) ;
-- l'envoi se fait côté serveur uniquement (rôle de service), jamais depuis le navigateur.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.accounts (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  device_label text not null default '' check (char_length(device_label) <= 60),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

-- Visibilité d'une notification (SECURITY DEFINER : évite la récursion de RLS ; faux pour tout compte hors audience).
create function public.can_view_notification(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.notifications n
    where n.id = p_id and (
      (n.audience = 'staff' and public.is_staff_member() and (n.recipient_id is null or n.recipient_id = auth.uid()))
      or (n.audience = 'participants' and public.has_space('members') and (n.recipient_id is null or n.recipient_id = auth.uid()))
      -- « boîte d'envoi » : les coordinateurs relisent les annonces adressées à l'ensemble des participants
      or (n.audience = 'participants' and n.recipient_id is null and public.is_staff_coordinator())))
$$;

create policy notifications_select on public.notifications for select to authenticated using (public.can_view_notification(id));
create policy notification_reads_select on public.notification_reads for select to authenticated using (user_id = auth.uid());
create policy notification_preferences_select on public.notification_preferences for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());

-- Marquer comme lues (uniquement des notifications VISIBLES par l'appelant ; les autres identifiants sont ignorés).
create function public.mark_notifications_read(p_ids uuid[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); n integer;
begin
  if me is null or not public.is_account_active() then raise exception 'forbidden' using errcode = '42501'; end if;
  if cardinality(coalesce(p_ids, '{}')) > 200 then raise exception 'too_many'; end if;
  insert into public.notification_reads (user_id, notification_id)
  select me, x from unnest(coalesce(p_ids, '{}')) as x where public.can_view_notification(x)
  on conflict do nothing;
  get diagnostics n = row_count; return n;
end $$;

create function public.set_notification_preferences(p_categories jsonb, p_reminder_lead text, p_push boolean) returns public.notification_preferences
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); r public.notification_preferences;
begin
  if me is null or not public.is_account_active() then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(coalesce(p_categories, '{}'::jsonb)) <> 'object' or exists (select 1 from jsonb_each(coalesce(p_categories, '{}'::jsonb)) e where jsonb_typeof(e.value) <> 'boolean') then raise exception 'invalid_preferences'; end if;
  if p_reminder_lead not in ('same_day', 'day_before', 'two_days') then raise exception 'invalid_preferences'; end if;
  insert into public.notification_preferences (user_id, categories, reminder_lead, push) values (me, coalesce(p_categories, '{}'::jsonb), p_reminder_lead, coalesce(p_push, false))
  on conflict (user_id) do update set categories = excluded.categories, reminder_lead = excluded.reminder_lead, push = excluded.push, updated_at = now()
  returning * into r;
  return r;
end $$;

-- Enregistrer / révoquer un appareil Web Push. Réservé aux comptes actifs ayant un accès (STAFF ou MEMBERS).
create function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_label text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); v_id uuid;
begin
  if me is null or not (public.is_staff_member() or public.has_space('members')) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_label) values (me, p_endpoint, p_p256dh, p_auth, left(btrim(coalesce(p_label, '')), 60))
  on conflict (endpoint) do update set user_id = me, p256dh = excluded.p256dh, auth = excluded.auth, device_label = excluded.device_label, revoked_at = null, last_seen_at = now()
  returning id into v_id;
  return v_id;
end $$;
create function public.revoke_push_subscription(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.push_subscriptions set revoked_at = now() where id = p_id and user_id = auth.uid() and revoked_at is null;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Annonce : ADMINISTRATEURS seulement (admin STAFF, super admin avec accès STAFF), confirmation EXPLICITE obligatoire. Écrit une annonce ;
-- n'envoie AUCUNE notification push (l'envoi push est un traitement serveur distinct, hors de cette migration).
create function public.send_announcement(p_audience public.notification_audience, p_title text, p_body text, p_urgent boolean, p_confirm boolean)
returns public.notifications language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); n public.notifications;
begin
  if me is null or not public.is_staff_coordinator() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_confirm is distinct from true then raise exception 'confirmation_required'; end if;
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 80 then raise exception 'invalid_title'; end if;
  if btrim(coalesce(p_body, '')) = '' or char_length(btrim(p_body)) > 280 then raise exception 'invalid_body'; end if;
  insert into public.notifications (audience, recipient_id, category, title, body, urgent, created_by)
  values (p_audience, null, case when p_audience = 'staff' then 'announcements' else 'official' end, btrim(p_title), btrim(p_body), coalesce(p_urgent, false), me)
  returning * into n;
  return n;
end $$;

-- ---------------------------------------------------------------- 4. Privilèges (refus par défaut)
revoke all on public.agenda_events, public.notifications, public.notification_reads, public.notification_preferences, public.push_subscriptions from anon, authenticated;
grant select on public.agenda_events, public.notifications, public.notification_reads, public.notification_preferences to authenticated;
-- Appareils : seulement les colonnes NON secrètes (jamais endpoint, p256dh, auth).
grant select (id, user_id, device_label, created_at, last_seen_at, revoked_at) on public.push_subscriptions to authenticated;
create policy agenda_events_select on public.agenda_events for select to authenticated using (public.is_staff_member() and (scope = 'team' or creator_id = auth.uid()));

-- Droits d'exécution : EXPLICITES, uniquement pour les NOUVELLES fonctions. Les fonctions B0 ne sont pas touchées (leurs droits restent identiques).
-- (Les privilèges par défaut de Supabase peuvent accorder EXECUTE à anon / authenticated : on révoque donc explicitement pour `public` et `anon`.)
revoke execute on function
  public.create_mission_v2(text, text, uuid, uuid, date, time, public.mission_priority, public.mission_status, uuid),
  public.update_mission_v2(uuid, integer, text, text, uuid, date, time, public.mission_priority, uuid),
  public.set_mission_private(uuid, boolean), public.list_team_agenda(date, date),
  public.create_agenda_event(text, public.agenda_event_kind, date, time, time, text, public.agenda_scope),
  public.update_agenda_event(uuid, text, public.agenda_event_kind, date, time, time, text), public.delete_agenda_event(uuid),
  public.can_view_notification(uuid), public.mark_notifications_read(uuid[]), public.set_notification_preferences(jsonb, text, boolean),
  public.register_push_subscription(text, text, text, text), public.revoke_push_subscription(uuid),
  public.send_announcement(public.notification_audience, text, text, boolean, boolean)
  from public, anon;
-- Interne (déclencheur) : inexécutable par les utilisateurs.
revoke execute on function public.missions_keep_time_consistent() from public, anon, authenticated;
grant execute on function
  public.create_mission_v2(text, text, uuid, uuid, date, time, public.mission_priority, public.mission_status, uuid),
  public.update_mission_v2(uuid, integer, text, text, uuid, date, time, public.mission_priority, uuid),
  public.set_mission_private(uuid, boolean), public.list_team_agenda(date, date),
  public.create_agenda_event(text, public.agenda_event_kind, date, time, time, text, public.agenda_scope),
  public.update_agenda_event(uuid, text, public.agenda_event_kind, date, time, time, text),
  public.delete_agenda_event(uuid),
  public.can_view_notification(uuid), public.mark_notifications_read(uuid[]),
  public.set_notification_preferences(jsonb, text, boolean),
  public.register_push_subscription(text, text, text, text), public.revoke_push_subscription(uuid),
  public.send_announcement(public.notification_audience, text, text, boolean, boolean)
  to authenticated;
