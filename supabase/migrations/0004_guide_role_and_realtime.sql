-- Renomme le rôle voyageur "concierge" en "guide" (plus clair : un guide qui
-- accompagne physiquement le voyage, à distinguer du compte admin d'Alexia
-- dans la table `admins`).
alter table travelers drop constraint if exists travelers_role_check;
update travelers set role = 'guide' where role = 'concierge';
alter table travelers add constraint travelers_role_check check (role in ('member', 'guide'));

-- Active la diffusion temps réel sur les messages, pour que le destinataire
-- voie apparaître un nouveau message sans recharger la page.
alter publication supabase_realtime add table messages;
