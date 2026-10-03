-- UNDEPLOYED emergency pause. Does not change records or reopen legacy writes.
-- Run only with explicit production authorization. Reads remain available.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.motionc_commit_state(bigint,jsonb) FROM authenticated;
GRANT motionc_sync_writer TO postgres;
SET LOCAL ROLE motionc_sync_writer;
REVOKE EXECUTE ON FUNCTION motionc_sync_private.commit_state(bigint,jsonb) FROM authenticated;
RESET ROLE;
REVOKE motionc_sync_writer FROM postgres;
NOTIFY pgrst, 'reload schema';
COMMIT;
-- Resume only after validating the corrected client and obtaining authorization:
-- BEGIN;
-- GRANT motionc_sync_writer TO postgres;
-- SET LOCAL ROLE motionc_sync_writer;
-- GRANT EXECUTE ON FUNCTION motionc_sync_private.commit_state(bigint,jsonb) TO authenticated;
-- RESET ROLE;
-- REVOKE motionc_sync_writer FROM postgres;
-- GRANT EXECUTE ON FUNCTION public.motionc_commit_state(bigint,jsonb) TO authenticated;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
