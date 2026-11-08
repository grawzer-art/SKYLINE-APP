-- ============================================================================
-- COPIE DE RÉFÉRENCE — migration `direct_staff_mission_assignment` (version 20261107123121)
-- Exportée en LECTURE SEULE depuis supabase_migrations.schema_migrations du projet partagé le 8 nov. 2026. Elle y est APPLIQUÉE mais n'existait PAS dans le dépôt
-- (dérive constatée). Ce fichier n'est PAS dans supabase/migrations/ : il ne doit jamais être réappliqué sur le projet partagé. Il sert uniquement à reconstruire
-- un projet de TEST identique (voir supabase/preview/manifest.json et docs/skyline-staff-v2/SUPABASE-TEST-ENV.md).
-- Effet : create_mission / assign_mission attribuent DIRECTEMENT à un membre STAFF (plus de « proposition »).
-- ============================================================================
create or replace function public.create_mission(p_title text,p_description text,p_assignee uuid,p_validator uuid,p_due date,p_priority public.mission_priority default 'normal'::public.mission_priority,p_status public.mission_status default 'todo'::public.mission_status,p_project uuid default null::uuid)
returns public.missions language plpgsql security definer set search_path = '' as $function$
declare me uuid := auth.uid(); coord boolean; m public.missions;
begin
 if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode='42501'; end if;
 coord := public.is_staff_coordinator();
 if btrim(coalesce(p_title,''))='' or char_length(btrim(p_title))>120 then raise exception 'invalid_title'; end if;
 if char_length(coalesce(p_description,''))>500 then raise exception 'invalid_description'; end if;
 if not public.is_staff_user(p_assignee) then raise exception 'invalid_assignee'; end if;
 if not public.is_validator_user(p_validator) then raise exception 'invalid_validator'; end if;
 if p_validator=p_assignee then raise exception 'validator_conflict'; end if;
 if p_status='done' and not coord then raise exception 'forbidden_status' using errcode='42501'; end if;
 if p_project is not null and not (coord or public.is_project_member(p_project)) then raise exception 'forbidden_project' using errcode='42501'; end if;
 insert into public.missions(title,description,creator_id,assignee_id,proposed_assignee_id,validator_id,project_id,priority,status,due_date)
 values(btrim(p_title),btrim(coalesce(p_description,'')),me,p_assignee,null,p_validator,p_project,p_priority,p_status,p_due) returning * into m;
 insert into public.mission_events(mission_id,actor_id,kind) values(m.id,me,'created');
 return m;
end $function$;
create or replace function public.assign_mission(p_id uuid,p_assignee uuid)
returns public.missions language plpgsql security definer set search_path = '' as $function$
declare me uuid := auth.uid(); m public.missions;
begin
 if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode='42501'; end if;
 select * into m from public.missions where id=p_id for update;
 if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
 if m.archived_at is not null then raise exception 'archived'; end if;
 if not (public.is_staff_coordinator() or m.creator_id=me or m.assignee_id=me) then raise exception 'forbidden' using errcode='42501'; end if;
 if not public.is_staff_user(p_assignee) then raise exception 'invalid_assignee'; end if;
 if p_assignee=m.assignee_id then raise exception 'same_assignee'; end if;
 if p_assignee=m.validator_id then raise exception 'validator_conflict'; end if;
 update public.missions set assignee_id=p_assignee,proposed_assignee_id=null,version=version+1,updated_at=now() where id=p_id returning * into m;
 insert into public.mission_events(mission_id,actor_id,kind,note) values(p_id,me,'reassigned',p_assignee::text);
 return m;
end $function$;
