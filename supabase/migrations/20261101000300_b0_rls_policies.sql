-- ============================================================================
-- STAFF HQ V2 — B0.3 : politiques RLS et privilèges
-- Migration NON destructive. Principe : REFUS PAR DÉFAUT.
--  - `anon` : aucun droit sur aucune table.
--  - `authenticated` : lecture seulement (selon les politiques) ; les écritures passent par les fonctions SECURITY DEFINER.
--  - Aucune politique INSERT / UPDATE / DELETE sur missions, historique, commentaires, rôles.
-- ============================================================================

revoke all on public.accounts, public.platform_roles, public.space_access, public.staff_roles, public.staff_profiles,
              public.projects, public.project_members, public.missions, public.mission_events, public.mission_comments from anon, authenticated;
grant select on public.accounts, public.platform_roles, public.space_access, public.staff_roles, public.staff_profiles,
                public.projects, public.project_members, public.missions, public.mission_events, public.mission_comments to authenticated;
-- Chacun ne peut modifier que SES informations personnelles (jamais `active`, ni accès, ni rôles, ni slug, ni fonction).
grant update (display_name) on public.accounts to authenticated;
grant update (email_pro, phone_pro) on public.staff_profiles to authenticated;

-- accounts : IDENTITÉ GLOBALE. Chacun ne lit que son propre compte ; le super admin lit tout. Un participant ne voit AUCUN autre compte.
create policy accounts_select on public.accounts for select to authenticated
  using (id = auth.uid() or public.is_super_admin());
create policy accounts_update_own on public.accounts for update to authenticated
  using (id = auth.uid() and active) with check (id = auth.uid());

-- platform_roles / space_access / staff_roles : chacun lit ses propres lignes ; le super admin lit tout. Aucune écriture directe (fonctions manage_*).
-- L'annuaire des rôles passe par list_team() (réservé aux membres STAFF) : un membre STAFF ne lit pas directement les accès des autres.
create policy platform_roles_select on public.platform_roles for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy space_access_select   on public.space_access   for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy staff_roles_select    on public.staff_roles    for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

-- staff_profiles : DONNÉES STAFF (fonction, coordonnées pro). Lisibles par les membres STAFF et le super admin ; JAMAIS par un participant.
create policy staff_profiles_select on public.staff_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin() or public.can_view_staff_profile(user_id));
create policy staff_profiles_update_own on public.staff_profiles for update to authenticated
  using (user_id = auth.uid() and public.is_staff_member()) with check (user_id = auth.uid());

-- projects / project_members : coordinateurs STAFF, propriétaire et membres du projet.
create policy projects_select on public.projects for select to authenticated
  using (public.is_staff_member() and (public.is_staff_coordinator() or owner_id = auth.uid() or public.is_project_member(id)));
create policy project_members_select on public.project_members for select to authenticated
  using (public.is_staff_member() and (public.is_staff_coordinator() or user_id = auth.uid() or public.is_project_member(project_id)));

-- missions : coordinateurs STAFF (admin, super admin) = tout ; sinon créateur, responsable, validateur, proposé ou membre du projet.
create policy missions_select on public.missions for select to authenticated
  using (public.is_staff_member() and (public.is_staff_coordinator()
         or auth.uid() in (creator_id, assignee_id, validator_id) or proposed_assignee_id = auth.uid()
         or (project_id is not null and public.is_project_member(project_id))));

create policy mission_events_select on public.mission_events for select to authenticated using (public.can_view_mission(mission_id));
create policy mission_comments_select on public.mission_comments for select to authenticated using (public.can_view_mission(mission_id));

-- Filet de sécurité : les FUTURES fonctions du schéma public ne sont jamais exécutables par l'anonyme par défaut.
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated; -- futures fonctions : droits à accorder explicitement
