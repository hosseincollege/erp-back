UPDATE "organization_settings"
SET "shell_visibility" = jsonb_set(
  jsonb_set(
    COALESCE("shell_visibility", '{}'::jsonb),
    '{navigationModules}',
    COALESCE("shell_visibility"->'navigationModules', '{}'::jsonb) - 'rahcom',
    true
  ),
  '{navigationItems}',
  COALESCE("shell_visibility"->'navigationItems', '{}'::jsonb) - ARRAY[
    '/rahcom', '/rahcom/map', '/rahcom/systems', '/rahcom/daily-traffic',
    '/rahcom/solar-daily', '/rahcom/tickets', '/rahcom/aggregate', '/rahcom/actions',
    '/settings/rahcom-data'
  ],
  true
)
WHERE "shell_visibility" IS NOT NULL;
