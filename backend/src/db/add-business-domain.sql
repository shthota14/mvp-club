-- MVP Club — Add business_domain to ideas
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/add-business-domain.sql

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS business_domain TEXT
  CHECK (business_domain IN (
    'fintech','healthtech','edtech','cleantech','proptech',
    'devtools','marketplace','b2b-saas','consumer','legaltech',
    'foodtech','hr-tech','logistics','media','agritech'
  ));

CREATE INDEX IF NOT EXISTS idx_ideas_domain ON ideas(business_domain);

SELECT 'Migration complete: business_domain added' AS status;
