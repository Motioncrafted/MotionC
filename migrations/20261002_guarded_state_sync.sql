-- UNDEPLOYED. Run only after explicit rollout approval. No existing account rows are rewritten.
BEGIN;
CREATE SCHEMA IF NOT EXISTS motionc_sync_private;
REVOKE ALL ON SCHEMA motionc_sync_private FROM PUBLIC;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='motionc_sync_writer') THEN
    CREATE ROLE motionc_sync_writer NOLOGIN NOINHERIT NOBYPASSRLS;
  END IF;
  IF pg_has_role('authenticated','motionc_sync_writer','MEMBER') OR pg_has_role('anon','motionc_sync_writer','MEMBER') THEN
    RAISE EXCEPTION 'Client roles must not inherit the sync writer role';
  END IF;
END $$;
-- Managed Supabase postgres cannot ALTER SUPERUSER/REPLICATION/BYPASSRLS attributes.
-- CREATE ROLE defaults are restricted; fail closed if an existing role is unsafe.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='motionc_sync_writer'
    AND (rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Sync writer role must have restricted attributes';
  END IF;
END $$;
GRANT USAGE ON SCHEMA public, motionc_sync_private TO motionc_sync_writer;
-- Required only while assigning the helper's restricted owner on managed Postgres.
GRANT motionc_sync_writer TO postgres;
GRANT CREATE ON SCHEMA motionc_sync_private TO motionc_sync_writer;
-- Managed auth schema grants cannot be delegated by postgres. This helper only
-- reads the verified request identity; it accepts no input and accesses no rows.
CREATE FUNCTION motionc_sync_private.current_user_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT auth.uid(); $$;
REVOKE ALL ON FUNCTION motionc_sync_private.current_user_id() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION motionc_sync_private.current_user_id() TO motionc_sync_writer;
GRANT SELECT, INSERT, UPDATE ON public.motionc_user_state TO motionc_sync_writer;
ALTER TABLE public.motionc_user_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY motionc_sync_writer_owns_state ON public.motionc_user_state
  FOR ALL TO motionc_sync_writer USING (motionc_sync_private.current_user_id()=user_id) WITH CHECK (motionc_sync_private.current_user_id()=user_id);

CREATE FUNCTION motionc_sync_private.commit_state(expected_revision bigint, next_state jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE member uuid := motionc_sync_private.current_user_id(); row_state public.motionc_user_state%ROWTYPE;
BEGIN
  IF member IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF expected_revision IS NULL OR next_state IS NULL OR
     jsonb_typeof(next_state) IS DISTINCT FROM 'object' OR
     next_state->>'schemaVersion' IS DISTINCT FROM '1' OR
     jsonb_typeof(next_state->'storage') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid state envelope' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(next_state->'storage') kv
    WHERE jsonb_typeof(kv.value) <> 'string' OR kv.key NOT LIKE 'motionc-%'
      OR kv.key LIKE 'motionc-auth-%' OR kv.key LIKE 'motionc-analytics-%'
      OR kv.key='motionc-visitor-commons-wall-v1') THEN
    RAISE EXCEPTION 'Invalid synchronized key' USING ERRCODE='22023';
  END IF;
  IF expected_revision = -1 THEN
    INSERT INTO public.motionc_user_state(user_id,state,revision,updated_at)
      VALUES(member,next_state,1,clock_timestamp()) ON CONFLICT(user_id) DO NOTHING
      RETURNING * INTO row_state;
    IF FOUND THEN RETURN jsonb_build_object('ok',true,'state',row_state.state,'revision',row_state.revision::text,'updated_at',row_state.updated_at); END IF;
  END IF;
  -- The row lock serializes comparison AND increment. A competing stale writer sees the new revision.
  SELECT * INTO row_state FROM public.motionc_user_state WHERE user_id=member FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','revision_mismatch'); END IF;
  -- Idempotent retry after a response is lost: never increment or replay an already stored snapshot.
  IF row_state.state=next_state THEN
    RETURN jsonb_build_object('ok',true,'state',row_state.state,'revision',row_state.revision::text,'updated_at',row_state.updated_at);
  END IF;
  IF row_state.revision <> expected_revision THEN RETURN jsonb_build_object('ok',false,'reason','revision_mismatch'); END IF;
  UPDATE public.motionc_user_state SET state=next_state,revision=revision+1,updated_at=clock_timestamp()
    WHERE user_id=member RETURNING * INTO row_state;
  RETURN jsonb_build_object('ok',true,'state',row_state.state,'revision',row_state.revision::text,'updated_at',row_state.updated_at);
END $$;
ALTER FUNCTION motionc_sync_private.commit_state(bigint,jsonb) OWNER TO motionc_sync_writer;
REVOKE CREATE ON SCHEMA motionc_sync_private FROM motionc_sync_writer;
SET LOCAL ROLE motionc_sync_writer;
REVOKE ALL ON FUNCTION motionc_sync_private.commit_state(bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION motionc_sync_private.commit_state(bigint,jsonb) TO authenticated;
RESET ROLE;
REVOKE motionc_sync_writer FROM postgres;
GRANT USAGE ON SCHEMA motionc_sync_private TO authenticated;

-- Exposed invoker wrapper; the privileged implementation remains in a non-exposed schema.
CREATE FUNCTION public.motionc_commit_state(expected_revision bigint,next_state jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT motionc_sync_private.commit_state(expected_revision,next_state);
$$;
REVOKE ALL ON FUNCTION public.motionc_commit_state(bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.motionc_commit_state(bigint,jsonb) TO authenticated;
-- Ownership policies alone do not stop old authenticated clients. Remove their direct write route.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.motionc_user_state FROM PUBLIC,anon,authenticated;
-- A table-level REVOKE alone does not remove old column-level grants.
DO $$ DECLARE column_name text; BEGIN
  FOR column_name IN SELECT a.attname FROM pg_attribute a
    WHERE a.attrelid='public.motionc_user_state'::regclass AND a.attnum>0 AND NOT a.attisdropped LOOP
    EXECUTE format('REVOKE INSERT (%1$I), UPDATE (%1$I), REFERENCES (%1$I) ON public.motionc_user_state FROM PUBLIC, anon, authenticated',column_name);
  END LOOP;
END $$;
GRANT SELECT ON public.motionc_user_state TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
