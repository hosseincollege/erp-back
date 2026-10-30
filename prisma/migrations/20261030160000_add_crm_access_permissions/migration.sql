INSERT INTO "permissions" ("id", "key", "name", "description")
VALUES
  ('perm_crm_read', 'crm.read', 'CRM read access', 'View organization customers, contacts, leads, and opportunities'),
  ('perm_crm_write', 'crm.write', 'CRM write access', 'Create and update organization customers, contacts, leads, and opportunities')
ON CONFLICT ("key") DO NOTHING;
