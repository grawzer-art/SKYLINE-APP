-- SKYLINE-TEST UNIQUEMENT — retire l'amorçage : supprime les réservations fictives « test-fictif », les profils CLUB et le journal de consentement de ces comptes.
-- Les accès « participants » et les comptes d'authentification restent (suppression des comptes : tableau de bord).
delete from public.traveler_reservations where edition = 'test-fictif';
delete from public.club_profiles where user_id in (select id from auth.users);
do $u$ begin if to_regclass('public.club_consents') is not null then execute 'delete from public.club_consents where user_id in (select id from auth.users)'; end if; end $u$;
select (select count(*) from public.traveler_reservations) as reservations_restantes, (select count(*) from public.club_profiles) as profils_club_restants;
