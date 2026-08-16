-- ============================================================
-- MVP Club — FULL WIPE. Deletes every row in every table,
-- including all user accounts. You will need to register again.
-- Take a backup first: /usr/local/bin/mvpclub-backup.sh
-- ============================================================
DO $WIPE$
DECLARE t TEXT; tables TEXT;
BEGIN
  SELECT string_agg(format('%I', tablename), ', ')
    INTO tables
    FROM pg_tables
   WHERE schemaname = 'public';
  IF tables IS NULL THEN RAISE NOTICE 'no tables found'; RETURN; END IF;
  EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY CASCADE';
  RAISE NOTICE 'wiped: %', tables;
END
$WIPE$;
SELECT 'users' t, count(*) FROM users UNION ALL SELECT 'ideas', count(*) FROM ideas;
