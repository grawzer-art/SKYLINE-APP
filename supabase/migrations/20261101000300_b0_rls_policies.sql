-- ============================================================================
-- STAFF HQ V2 — B0.3 : politiques RLS et privilèges
-- Migration NON destructive. Principe : REFUS PAR DÉFAUT.
--  - `anon` : aucun droit sur aucune table.
--  - `authenticated` : lecture seulement (selon les politiques) ; les écritures passent par les fonctions SECURITY DEFINER.
--  - Aucune politique INSERT / UPDATE / DELETE sur missions, historique, commentaires, rôles.
-- ============================================================================

revoke all on public.profiles, public.user_roles, public.projects, public.project_members,
              public.missions, public.mission_events, public.mission_comments from anon, authenticated;
grant select on public.profiles, public.user_roles, public.projects, public.project_members,
                public.missions, public.mission_events, public.mission_comments to authenticated;
-- Chacun ne peut modifier que SES informations personnelles (jamais `active`, `slug`, la fonction ni les rôles).
grant update (display_name, email_pro, phone_pro) on public.profiles to authenticated;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (active and public.is_active_member()) or public.is_super_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() and active) with check (id = auth.uid());

-- user_roles : chacun lit ses propres rôles ; le super admin lit tout. Aucune écriture directe (voir manage_set_roles).
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

-- projects / project_members : coordinateurs, propriétaire et membres du projet.
create policy projects_select on public.projects for select to authenticated
  using (public.is_active_member() and (public.is_coordinator() or owner_id = auth.uid() or public.is_project_member(id)));
create policy project_members_select on public.project_members for select to authenticated
  using (public.is_active_member() and (public.is_coordinator() or user_id = auth.uid() or public.is_project_member(project_id)));

-- missions : coordinateurs (admin, super_admin) = tout ; sinon créateur, responsable, validateur, proposé ou membre du projet.
create policy missions_select on public.missions for select to authenticated
  using (public.is_active_member() and (public.is_coordinator()
         or auth.uid() in (creator_id, assignee_id, validator_id) or proposed_assignee_id = auth.uid()
         or (project_id is not null and public.is_project_member(project_id))));

create policy mission_events_select on public.mission_events for select to authenticated using (public.can_view_mission(mission_id));
create policy mission_comments_select on public.mission_comments for select to authenticated using (public.can_view_mission(mission_id));

-- Filet de sécurité : les FUTURES fonctions du schéma public ne sont jamais exécutables par l'anonyme par défaut.
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon;
