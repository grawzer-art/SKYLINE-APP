-- ============================================================================
-- SKYLINE 2027 — B4.2c : durcissement signalé par l'advisor de sécurité Supabase (lint 0028 / 0029)
--
-- *** PROPOSITION — NON APPLIQUÉE. *** Constat (lecture seule, 8 nov. 2026, projet partagé) : `public.rls_auto_enable()` (SECURITY DEFINER, fonction de déclencheur
-- d'événement installée par Supabase, volontairement laissée INTACTE par B0) est exécutable par `anon` et `authenticated` via /rest/v1/rpc. Elle ne renvoie que
-- `event_trigger` (appel REST inutilisable) mais l'exposition n'a aucune raison d'être. Un déclencheur d'événement n'exige pas EXECUTE au moment du tir (le droit est
-- vérifié à la création, par un super-utilisateur) : la révocation n'empêche donc pas l'activation automatique de la RLS.
-- À appliquer d'abord sur le projet de test, puis de vérifier qu'une `create table` y active toujours la RLS. N'affecte AUCUNE fonction du projet.
-- ============================================================================
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
