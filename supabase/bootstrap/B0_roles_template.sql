-- ============================================================================
-- STAFF HQ V2 — B0 : attribution INITIALE des comptes (à exécuter À LA MAIN, une seule fois)
-- Ce n'est PAS une migration : elle n'est jamais appliquée automatiquement.
-- Prérequis : les trois comptes ont été invités (Authentication → Users → Invite user) et ont les migrations appliquées.
-- À FAIRE : remplacer les trois adresses e-mail ci-dessous par les VRAIES adresses. Rien n'est inventé ici.
-- Exécution : éditeur SQL Supabase (rôle postgres). Ce script ne supprime rien.
-- ============================================================================

begin;

-- GRAW — super_admin (propriétaire technique, seul à gérer comptes, invitations, désactivations et rôles)
update public.profiles set slug = 'graw', display_name = 'Graw', function_title = 'Directeur Artistique & Digital', active = true
where id = (select id from auth.users where email = 'REMPLACER-PAR-L-EMAIL-DE-GRAW');
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'REMPLACER-PAR-L-EMAIL-DE-GRAW'
on conflict do nothing;

-- TOM — admin opérationnel (missions, projets, plannings, validations ; PAS les comptes ni les permissions)
update public.profiles set slug = 'tom', display_name = 'Tom', function_title = 'Fondateur', active = true
where id = (select id from auth.users where email = 'REMPLACER-PAR-L-EMAIL-DE-TOM');
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'REMPLACER-PAR-L-EMAIL-DE-TOM'
on conflict do nothing;

-- QAFARD — member
update public.profiles set slug = 'qafard', display_name = 'Qafard', function_title = 'Photographe', active = true
where id = (select id from auth.users where email = 'REMPLACER-PAR-L-EMAIL-DE-QAFARD');
insert into public.user_roles (user_id, role)
select id, 'member' from auth.users where email = 'REMPLACER-PAR-L-EMAIL-DE-QAFARD'
on conflict do nothing;

-- Contrôle : doit afficher 3 lignes (graw / tom / qafard) avec leur rôle. S'il en manque, ANNULER (rollback) et vérifier les e-mails.
select p.slug, p.display_name, p.active, array_agg(ur.role) as roles
from public.profiles p left join public.user_roles ur on ur.user_id = p.id
group by p.id order by p.slug;

commit;
