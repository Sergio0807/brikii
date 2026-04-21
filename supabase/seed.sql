-- ============================================================
-- SEED : Grands réseaux immobiliers français
-- source='brikii', statut='active', owner_id=NULL (autorisé)
-- ============================================================

insert into public.agences (nom, type, siret, source, statut, ville, sirene_data) values

-- Réseaux de mandataires
('IAD France',              'reseau', '50810836100019', 'brikii', 'active', 'Lieusaint',       '{"codeNaf":"6820A","formeJuridique":"SAS"}'),
('SAFTI',                   'reseau', '53193279700027', 'brikii', 'active', 'Toulouse',        '{"codeNaf":"6820A","formeJuridique":"SAS"}'),
('Propriétés Privées',      'reseau', '49355873500019', 'brikii', 'active', 'Sainte-Luce-sur-Loire', '{"codeNaf":"6820A","formeJuridique":"SAS"}'),
('Capifrance',              'reseau', '44247280900025', 'brikii', 'active', 'Colomiers',       '{"codeNaf":"6820A","formeJuridique":"SAS"}'),
('Optimhome',               'reseau', '49847131800021', 'brikii', 'active', 'Colomiers',       '{"codeNaf":"6820A","formeJuridique":"SAS"}'),
('BSK Immobilier',          'reseau', '80892992800012', 'brikii', 'active', 'Paris',           '{"codeNaf":"6820A","formeJuridique":"SAS"}'),
('EffiCity',                'reseau', '53356278700017', 'brikii', 'active', 'Paris',           '{"codeNaf":"6820A","formeJuridique":"SAS"}'),
('Megagence',               'reseau', '75392280900014', 'brikii', 'active', 'Montpellier',     '{"codeNaf":"6820A","formeJuridique":"SAS"}'),

-- Réseaux d''agences franchisées
('Century 21 France',       'reseau', '31948972200016', 'brikii', 'active', 'Paris',           '{"codeNaf":"6831Z","formeJuridique":"SA"}'),
('ERA Immobilier France',    'reseau', '38307151900037', 'brikii', 'active', 'Paris',           '{"codeNaf":"6831Z","formeJuridique":"SA"}'),
('Guy Hoquet L''Immobilier', 'reseau', '38901697900027', 'brikii', 'active', 'Paris',           '{"codeNaf":"6831Z","formeJuridique":"SAS"}'),
('Laforêt Immobilier',      'reseau', '34176773400025', 'brikii', 'active', 'Paris',           '{"codeNaf":"6831Z","formeJuridique":"SA"}'),
('Orpi',                    'reseau', '57203474800026', 'brikii', 'active', 'Paris',           '{"codeNaf":"6831Z","formeJuridique":"SA coop"}')

on conflict do nothing;
