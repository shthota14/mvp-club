ALTER TABLE validation_contacts
  ADD COLUMN IF NOT EXISTS icp_fit TEXT CHECK (icp_fit IN ('yes','unsure'));
