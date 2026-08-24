-- Passo único, a correr UMA VEZ numa base de dados que já tinha o esquema
-- construído pelo antigo `sequelize.sync({ alter: true })` (ou seja,
-- qualquer ambiente que já corria a app antes do sistema de migrações
-- existir — inclui a base de dados do Docker Compose deste projeto).
--
-- 1) Marca a migração de baseline (migrations/20260823000000-baseline-schema.js)
--    como já aplicada, para o `npm run migrate` não tentar recriar tabelas
--    que já existem.
-- 2) Limpa as constraints duplicadas em tenants.nuit que o `sync({ alter })`
--    foi deixando para trás de cada vez que reiniciava em desenvolvimento
--    (mantém só "tenants_nuit_key", que é a mesma que a migração cria).
--
-- Depois de correr isto, "npm run migrate" deve mostrar
-- "database schema was already up to date".

CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (name)
);

INSERT INTO "SequelizeMeta" (name)
VALUES ('20260823000000-baseline-schema.js')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'tenants'::regclass
      AND contype = 'u'
      AND conname <> 'tenants_nuit_key'
  LOOP
    EXECUTE format('ALTER TABLE tenants DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
