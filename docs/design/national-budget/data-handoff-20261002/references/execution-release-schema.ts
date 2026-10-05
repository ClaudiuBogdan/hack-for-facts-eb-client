import { sql, type Kysely } from 'kysely';

/** MFin monthly release custody. Named lifecycle for all six tables: append-only.
 * Raw IDs are cross-database lineage references, never pretend foreign keys.
 * Admission truth is independently checked by the domain loader; these guards
 * enforce membership, traceability and publication transactions, not source truth.
 * Requires the existing etl.load_runs ledger. No existing serving table changes.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create schema if not exists budget;
    create function budget.execution_digest(value jsonb) returns text
      language sql immutable strict parallel safe as $$
      select encode(sha256(convert_to(value::text,'UTF8')),'hex') $$;
    comment on function budget.execution_digest(jsonb) is
      'mfin-pg-jsonb-v1 digest of PostgreSQL jsonb text in UTF8. This is distinct from raw canonical-string digests. Ordered arrays must be sorted by declared member keys.';

    create table budget.execution_releases (
      release_id uuid primary key,
      period_start date not null,
      period_end date not null,
      policy_version text not null check(length(policy_version)>0),
      input_manifest jsonb not null check(jsonb_typeof(input_manifest)='array' and jsonb_array_length(input_manifest)=3),
      input_set_sha256 text generated always as (budget.execution_digest(input_manifest)) stored,
      created_at timestamptz not null default clock_timestamp(),
      unique(release_id,period_end),
      check(period_start=make_date(extract(year from period_end)::integer,1,1)),
      check(period_end=(date_trunc('month',period_end)+interval '1 month - 1 day')::date)
    );
    create table budget.execution_release_inputs (
      release_id uuid not null references budget.execution_releases,
      input_id text not null check(input_id in ('bgc','sinteza','nota')),
      source_url text not null check(source_url ~ '^https?://'),
      raw_authority text not null check(length(raw_authority)>0),
      raw_origin jsonb not null check(jsonb_typeof(raw_origin)='object'),
      storage jsonb not null check(jsonb_typeof(storage)='object'),
      original_sha256 text not null check(original_sha256 ~ '^[a-f0-9]{64}$'),
      original_bytes bigint not null check(original_bytes>0),
      lexical_parse_id bigint not null check(lexical_parse_id>0),
      lexical_output_sha256 text not null check(lexical_output_sha256 ~ '^[a-f0-9]{64}$'),
      semantic_parse_id bigint not null check(semantic_parse_id>0),
      semantic_output_sha256 text not null check(semantic_output_sha256 ~ '^[a-f0-9]{64}$'),
      inventory_version text not null check(length(inventory_version)>0),
      expected_inventory jsonb not null check(jsonb_typeof(expected_inventory)='array'),
      expected_inventory_sha256 text generated always as (budget.execution_digest(expected_inventory)) stored,
      observations jsonb not null check(jsonb_typeof(observations)='array'),
      observations_sha256 text generated always as (budget.execution_digest(observations)) stored,
      primary key(release_id,input_id)
    );
    comment on column budget.execution_release_inputs.expected_inventory is
      'Independent enumeration of pinned lexical physical cells/pages plus explicitly required absent slots. Sorted [{key,locator}] array. Loader and post-load raw audit must establish independence; SQL only proves equality with the disposition membership.';
    comment on column budget.execution_release_inputs.observations is
      'Complete sorted disposition entries: key, locator, sourceState, sourceToken, disposition, ruleVersion and evidence; fact entries include a typed fact object; native_page entries include a pageDigest. Never discard helpers, blanks, unresolved financial observations or hidden cells.';

    create table budget.execution_release_facts (
      release_id uuid not null,
      input_id text not null check(input_id in ('bgc','sinteza')),
      observation_key text not null,
      semantic_key jsonb not null check(jsonb_typeof(semantic_key)='object'),
      source_token text not null check(source_token ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]+)?$'),
      normalized_value numeric not null check(normalized_value::text not in ('NaN','Infinity','-Infinity')),
      normalized_unit text not null check(normalized_unit in ('RON','fraction')),
      primary key(release_id,input_id,observation_key),
      foreign key(release_id,input_id) references budget.execution_release_inputs,
      unique(release_id,input_id,semantic_key)
    );
    comment on column budget.execution_release_facts.semantic_key is
      'Exhaustive value-free dimensions: section,lineItem,component,periodRole,measure,coverageKind,fiscalStart,fiscalEnd,comparisonStart,comparisonEnd,reportStart,reportEnd,referenceYear,executionStatus,finality. Explicit JSON null compares equal under jsonb uniqueness; neither value nor physical position is a semantic key.';
    create table budget.execution_release_sections (
      release_id uuid not null,
      input_id text not null default 'nota' check(input_id='nota'),
      observation_key text not null,
      page_number integer not null check(page_number>0),
      page jsonb not null check(jsonb_typeof(page)='object'),
      primary key(release_id,input_id,observation_key),
      unique(release_id,page_number),
      foreign key(release_id,input_id) references budget.execution_release_inputs
    );
    comment on table budget.execution_release_sections is
      'Append-only complete native PDF page observations, preserving flat flows/blocks/lines/words, geometry and original-page references. The name does not imply fabricated headings. Input points to original imagery and raw decoder artifacts.';

    create table budget.execution_release_seals (
      release_id uuid primary key references budget.execution_releases,
      manifest jsonb not null check(jsonb_typeof(manifest)='object'),
      seal_sha256 text generated always as (budget.execution_digest(manifest)) stored,
      sealed_at timestamptz not null default clock_timestamp(),
      unique(release_id,seal_sha256)
    );
    create table budget.execution_release_selections (
      selection_id uuid primary key,
      period_end date not null,
      release_id uuid not null,
      seal_sha256 text not null,
      previous_selection_id uuid,
      load_run_id bigint not null unique references etl.load_runs(run_id),
      reason text not null check(length(btrim(reason))>0),
      gate_artifact jsonb not null check(jsonb_typeof(gate_artifact)='object'),
      gate_sha256 text generated always as (budget.execution_digest(gate_artifact)) stored,
      selected_at timestamptz not null default clock_timestamp(),
      unique(period_end,selection_id),
      unique nulls not distinct(period_end,previous_selection_id),
      foreign key(period_end,previous_selection_id) references budget.execution_release_selections(period_end,selection_id),
      foreign key(release_id,period_end) references budget.execution_releases(release_id,period_end),
      foreign key(release_id,seal_sha256) references budget.execution_release_seals(release_id,seal_sha256),
      check(previous_selection_id is distinct from selection_id)
    );
    comment on table budget.execution_release_selections is
      'Append-only expected-prior monthly publication chain. Immutable gate artifact plus the succeeded load receipt proves commit even after supersession. Selection clock time/UUID ordering has no authority. Rollback appends a new event pointing to an old sealed release.';

    create function budget.execution_require_read_committed() returns void language plpgsql volatile as $$
    begin
      if current_setting('transaction_isolation')<>'read committed' then
        raise exception 'MFin release writes require READ COMMITTED'; end if;
    end $$;
    create function budget.execution_reject_mutation() returns trigger language plpgsql as $$
    begin raise exception 'MFin release evidence is append-only'; end $$;
    create function budget.execution_open_release() returns trigger language plpgsql volatile as $$
    begin
      perform budget.execution_require_read_committed();
      -- Separate volatile SQL statements: the post-wait read needs a fresh RC snapshot.
      perform pg_advisory_xact_lock(hashtextextended('mfin-execution-release:' || new.release_id::text,0));
      if exists(select from budget.execution_release_seals where release_id=new.release_id) then
        raise exception 'MFin release membership is sealed'; end if;
      return new;
    end $$;

    create function budget.execution_check_input() returns trigger language plpgsql as $$
    declare entry jsonb; observed_inventory jsonb; keys_count bigint;
    begin
      if not (jsonb_typeof(new.storage->'authority')='string' and length(new.storage->>'authority')>0
        and jsonb_typeof(new.storage->'bucket')='string' and length(new.storage->>'bucket')>0
        and jsonb_typeof(new.storage->'key')='string' and length(new.storage->>'key')>0
        and jsonb_typeof(new.storage->'versionId')='string' and length(new.storage->>'versionId')>0
        and new.raw_origin->>'kind' in ('http_response','artifact_import')
        and jsonb_typeof(new.raw_origin->'id')='string' and length(new.raw_origin->>'id')>0) is true then
        raise exception 'MFin input requires exact raw and object-storage provenance'; end if;
      for entry in select value from jsonb_array_elements(new.observations) loop
        if not (jsonb_typeof(entry)='object' and jsonb_typeof(entry->'key')='string' and length(entry->>'key')>0
          and jsonb_typeof(entry->'locator')='object'
          and entry->'locator'->>'kind' in ('cell','absent_cell','pdf_page')
          and entry->>'sourceState' in ('number','text','boolean','error','blank','missing_formula_cache','unsupported','absent','page')
          and jsonb_typeof(entry->'sourceToken') in ('string','null')
          and entry->>'disposition' in ('fact','blank','nonfinancial','unresolved','blocked','native_page')
          and jsonb_typeof(entry->'ruleVersion')='string' and length(entry->>'ruleVersion')>0
          and jsonb_typeof(entry->'evidence')='object') is true then
          raise exception 'MFin observation requires complete locator state disposition and rule evidence'; end if;
        if new.input_id='nota' then
          if not (entry->>'disposition'='native_page' and entry->'locator'->>'kind'='pdf_page'
            and jsonb_typeof(entry->'locator'->'page')='number' and entry->'locator'->>'page' ~ '^[1-9][0-9]*$'
            and entry->>'pageDigest' ~ '^[a-f0-9]{64}$') is true then
            raise exception 'Nota release input requires complete native-page dispositions'; end if;
        elsif not (entry->>'disposition'<>'native_page' and entry->'locator'->>'kind' in ('cell','absent_cell')
          and jsonb_typeof(entry->'locator'->'sheet')='string' and length(entry->'locator'->>'sheet')>0
          and entry->'locator'->>'cell' ~ '^[A-Z]+[1-9][0-9]*$'
          and (entry->'locator'->>'kind'='absent_cell')=(entry->>'sourceState'='absent')
          and (entry->>'sourceState'<>'absent' or entry->'sourceToken'='null'::jsonb)) is true then
          raise exception 'Workbook observation requires physical or explicitly absent cell locator';
        end if;
      end loop;
      select count(distinct e->>'key'),coalesce(jsonb_agg(jsonb_build_object('key',e->'key','locator',e->'locator') order by e->>'key'),'[]')
        into keys_count,observed_inventory from jsonb_array_elements(new.observations) e;
      if keys_count<>jsonb_array_length(new.observations) or keys_count=0 then
        raise exception 'MFin observation keys must be unique and nonempty'; end if;
      if observed_inventory<>new.expected_inventory then
        raise exception 'MFin dispositions do not cover the exact independent raw inventory'; end if;
      if exists(select from jsonb_array_elements(new.observations) e
        group by case when new.input_id='nota' then jsonb_build_array(e->'locator'->'page')
          else jsonb_build_array(e->'locator'->'sheet',e->'locator'->'cell') end having count(*)>1) then
        raise exception 'MFin physical/absent observation locators must be unique'; end if;
      return new;
    end $$;

    create function budget.execution_check_fact() returns trigger language plpgsql as $$
    declare entry jsonb; key_fields text[]; d text; root budget.execution_releases%rowtype;
      fields text[]:=array['section','lineItem','component','periodRole','measure','coverageKind',
      'fiscalStart','fiscalEnd','comparisonStart','comparisonEnd','reportStart','reportEnd','referenceYear','executionStatus','finality'];
    begin
      select e into entry from budget.execution_release_inputs i cross join lateral jsonb_array_elements(i.observations) e
        where i.release_id=new.release_id and i.input_id=new.input_id and e->>'key'=new.observation_key;
      if not (entry->>'disposition'='fact' and entry->>'sourceState'='number'
        and entry->'locator'->>'kind'='cell' and entry->>'sourceToken'=new.source_token
        and entry->'fact'->'semanticKey'=new.semantic_key
        and jsonb_typeof(entry->'fact'->'normalizedValue')='string'
        and (entry->'fact'->>'normalizedValue')::numeric=new.normalized_value
        and entry->'fact'->>'normalizedUnit'=new.normalized_unit) is true then
        raise exception 'MFin fact does not match its admitted input observation'; end if;
      select array_agg(k order by k) into key_fields from jsonb_object_keys(new.semantic_key) k;
      if key_fields<>(select array_agg(k order by k) from unnest(fields) k) then
        raise exception 'MFin semantic key must contain only the complete value-free dimensions'; end if;
      if not (new.semantic_key->>'periodRole' in ('current','comparison','difference')
        and new.semantic_key->>'measure' in ('amount','gdp_share','published_total_share','amount_difference','relative_change','gdp_denominator')
        and new.semantic_key->>'coverageKind' in ('report_period','component_interval','not_applicable')
        and (new.semantic_key->>'executionStatus' in ('actual','estimate') or new.semantic_key->'executionStatus'='null'::jsonb)
        and (new.semantic_key->>'finality' in ('final','operative','unknown') or new.semantic_key->'finality'='null'::jsonb)
        and (new.semantic_key->>'section' in ('revenue','expenditure','balance') or new.semantic_key->'section'='null'::jsonb)
        and jsonb_typeof(new.semantic_key->'referenceYear')='number' and new.semantic_key->>'referenceYear' ~ '^[1-9][0-9]{0,3}$'
        and jsonb_typeof(new.semantic_key->'lineItem')='string' and length(new.semantic_key->>'lineItem')>0
        and jsonb_typeof(new.semantic_key->'component')='string' and length(new.semantic_key->>'component')>0
        and (new.normalized_unit='RON')=(new.semantic_key->>'measure' in ('amount','amount_difference','gdp_denominator'))) is true then
        raise exception 'MFin fact has invalid typed dimensions or unit'; end if;
      foreach d in array array['fiscalStart','fiscalEnd','comparisonStart','comparisonEnd','reportStart','reportEnd'] loop
        if not (new.semantic_key->d='null'::jsonb or (jsonb_typeof(new.semantic_key->d)='string'
          and new.semantic_key->>d ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          and (new.semantic_key->>d)::date::text=new.semantic_key->>d)) is true then
          raise exception 'MFin semantic periods require canonical dates or explicit null'; end if;
      end loop;
      select * into strict root from budget.execution_releases where release_id=new.release_id;
      if not (new.semantic_key->>'reportStart'=root.period_start::text and new.semantic_key->>'reportEnd'=root.period_end::text
        and ((new.semantic_key->>'periodRole'='difference')=(new.semantic_key->>'measure' in ('amount_difference','relative_change')))
        and ((new.semantic_key->>'periodRole'='difference')=(new.semantic_key->'comparisonStart'<>'null'::jsonb))
        and ((new.semantic_key->'comparisonStart'='null'::jsonb)=(new.semantic_key->'comparisonEnd'='null'::jsonb))
        and (new.semantic_key->'comparisonStart'='null'::jsonb or (new.semantic_key->>'comparisonStart')::date<=(new.semantic_key->>'comparisonEnd')::date)
        and (case when new.semantic_key->>'measure'='gdp_denominator' then
          new.semantic_key->>'coverageKind'='not_applicable' and new.semantic_key->'fiscalStart'='null'::jsonb
          and new.semantic_key->'fiscalEnd'='null'::jsonb
        else new.semantic_key->>'coverageKind' in ('report_period','component_interval')
          and (new.semantic_key->>'fiscalStart')::date<=(new.semantic_key->>'fiscalEnd')::date
          and new.semantic_key->>'executionStatus' in ('actual','estimate')
          and new.semantic_key->>'finality' in ('final','operative','unknown') end)) is true then
        raise exception 'MFin fact coverage or reporting period is incomplete or contradictory'; end if;
      return new;
    end $$;

    create function budget.execution_check_section() returns trigger language plpgsql as $$
    declare entry jsonb; original text;
    begin
      select e,i.original_sha256 into entry,original from budget.execution_release_inputs i
        cross join lateral jsonb_array_elements(i.observations) e
        where i.release_id=new.release_id and i.input_id=new.input_id and e->>'key'=new.observation_key;
      if not (entry->>'disposition'='native_page' and (entry->'locator'->>'page')::integer=new.page_number
        and entry->>'pageDigest'=budget.execution_digest(new.page)
        and (new.page->>'page')::integer=new.page_number
        and new.page->'originalPage'->>'sha256'=original
        and (new.page->'originalPage'->>'page')::integer=new.page_number
        and jsonb_typeof(new.page->'flows')='array'
        and jsonb_typeof(new.page->'geometry')='object'
        and new.page->'coverage'->>'imageTranscription'='not_performed'
        and new.page->'coverage'->>'allVisualTextComplete'='unknown') is true then
        raise exception 'MFin Nota page differs from its complete input observation'; end if;
      return new;
    end $$;

    create view budget.execution_release_observations as
      select i.release_id,i.input_id,e.value->>'key' as observation_key,e.value as observation
      from budget.execution_release_inputs i cross join lateral jsonb_array_elements(i.observations) e(value);

    -- Set digests include complete stored records except release identity. The
    -- seal carries counts/digests, not a second copy of all facts and PDF pages.
    create function budget.execution_release_manifest(id uuid) returns jsonb language sql stable as $$
      select jsonb_build_object('digestVersion','mfin-pg-jsonb-v1',
        'inputs',(select jsonb_build_object('count',count(*),'sha256',budget.execution_digest(coalesce(jsonb_agg(to_jsonb(i)-'release_id' order by input_id),'[]'))) from budget.execution_release_inputs i where release_id=id),
        'facts',(select jsonb_build_object('count',count(*),'sha256',budget.execution_digest(coalesce(jsonb_agg(to_jsonb(f)-'release_id' order by input_id,observation_key),'[]'))) from budget.execution_release_facts f where release_id=id),
        'sections',(select jsonb_build_object('count',count(*),'sha256',budget.execution_digest(coalesce(jsonb_agg(to_jsonb(s)-'release_id' order by page_number),'[]'))) from budget.execution_release_sections s where release_id=id),
        'observations',(select jsonb_build_object('count',count(*),'sha256',budget.execution_digest(coalesce(jsonb_agg(to_jsonb(o)-'release_id' order by input_id,observation_key),'[]'))) from budget.execution_release_observations o where release_id=id),
        'dispositions',coalesce((select jsonb_agg(jsonb_build_object('disposition',d,'state',s,'count',n) order by d,s) from
          (select observation->>'disposition' d,observation->>'sourceState' s,count(*) n from budget.execution_release_observations where release_id=id group by 1,2) counts),'[]')) $$;

    create function budget.execution_check_seal() returns trigger language plpgsql volatile as $$
    declare expected_inputs jsonb; actual_inputs jsonb; family_count integer; pages integer;
    begin
      -- execution_open_release runs first and holds the same release lock.
      select input_manifest into expected_inputs from budget.execution_releases where release_id=new.release_id;
      select count(*),jsonb_agg(jsonb_build_object('inputId',input_id,'originalSha256',original_sha256,
        'originalBytes',original_bytes,'sourceUrl',source_url,'rawAuthority',raw_authority,'rawOrigin',raw_origin,'storage',storage,
        'lexicalParseId',lexical_parse_id::text,'lexicalOutputSha256',lexical_output_sha256,
        'semanticParseId',semantic_parse_id::text,'semanticOutputSha256',semantic_output_sha256,
        'inventorySha256',expected_inventory_sha256,'observationsSha256',observations_sha256) order by input_id)
        into family_count,actual_inputs from budget.execution_release_inputs where release_id=new.release_id;
      if family_count<>3 or actual_inputs is distinct from expected_inputs then
        raise exception 'MFin seal requires the complete exact family input manifest'; end if;
      if (select count(distinct input_id) from budget.execution_release_facts where release_id=new.release_id)<>2 then
        raise exception 'MFin seal requires nonempty BGC and Sinteza financial sets'; end if;
      if exists(select from budget.execution_release_observations where release_id=new.release_id
        and observation->>'disposition'='blocked') then raise exception 'MFin release contains blocking observations'; end if;
      if exists(
        (select input_id,observation_key from budget.execution_release_observations where release_id=new.release_id and observation->>'disposition'='fact'
         except select input_id,observation_key from budget.execution_release_facts where release_id=new.release_id)
        union all
        (select input_id,observation_key from budget.execution_release_facts where release_id=new.release_id
         except select input_id,observation_key from budget.execution_release_observations where release_id=new.release_id and observation->>'disposition'='fact')
      ) then raise exception 'MFin fact set differs from admitted observation membership'; end if;
      if exists(
        (select observation_key from budget.execution_release_observations where release_id=new.release_id and input_id='nota'
         except select observation_key from budget.execution_release_sections where release_id=new.release_id)
        union all
        (select observation_key from budget.execution_release_sections where release_id=new.release_id
         except select observation_key from budget.execution_release_observations where release_id=new.release_id and input_id='nota')
      ) then raise exception 'MFin Nota text set differs from page membership'; end if;
      select count(*) into pages from budget.execution_release_sections where release_id=new.release_id;
      if pages=0 or (select max(page_number) from budget.execution_release_sections where release_id=new.release_id)<>pages then
        raise exception 'MFin Nota pages must be complete and contiguous'; end if;
      if new.manifest is distinct from budget.execution_release_manifest(new.release_id) then
        raise exception 'MFin seal differs from complete stored membership'; end if;
      return new;
    end $$;

    create function budget.execution_check_selection() returns trigger language plpgsql volatile as $$
    declare previous uuid; receipt etl.load_runs%rowtype; release budget.execution_releases%rowtype; gate jsonb;
    begin
      perform budget.execution_require_read_committed();
      perform pg_advisory_xact_lock(hashtextextended('mfin-execution-month:' || new.period_end::text,0));
      select s.selection_id into previous from budget.execution_release_selections s where s.period_end=new.period_end
        and not exists(select from budget.execution_release_selections child where child.previous_selection_id=s.selection_id);
      if previous is distinct from new.previous_selection_id then raise exception 'MFin previous selection changed'; end if;
      select * into strict receipt from etl.load_runs where run_id=new.load_run_id for update;
      if receipt.status<>'running' or receipt.finished_at is not null
        or receipt.source_id<>'budget_official' or receipt.target_table<>'budget.execution_releases' then
        raise exception 'MFin selection requires its own running domain load receipt'; end if;
      select * into strict release from budget.execution_releases where release_id=new.release_id;
      gate:=new.gate_artifact;
      if not (gate->>'status'='valid' and gate->>'runId'=new.load_run_id::text
        and gate->>'sourceId'=receipt.source_id and gate->>'targetTable'=receipt.target_table
        and gate->>'releaseId'=new.release_id::text and gate->>'periodEnd'=new.period_end::text
        and gate->>'sealSha256'=new.seal_sha256 and gate->>'inputSetSha256'=release.input_set_sha256
        and gate->>'policyVersion'=release.policy_version and jsonb_typeof(gate->'checks')='array'
        and jsonb_array_length(gate->'checks')>0) is true then
        raise exception 'MFin selection gate artifact does not bind its exact receipt release seal and policy'; end if;
      if exists(select from jsonb_array_elements(gate->'checks') c where not
        (c->>'status' in ('valid','warning') and c->>'tier' in ('structural','quality')
        and (c->>'tier'<>'structural' or c->>'status'='valid')) is true) then
        raise exception 'MFin gate contains a failed skipped or malformed check'; end if;
      if exists(select from jsonb_array_elements(gate->'checks') c group by c->>'check' having count(*)>1)
        or exists(select from unnest(array['mfin-source-custody','mfin-input-periods','mfin-observation-inventory',
          'mfin-financial-classification','mfin-source-agreement','mfin-accounting','mfin-raw-prod-parity','mfin-nota-coverage']) required(name)
          where not exists(select from jsonb_array_elements(gate->'checks') c where c->>'check'=required.name
            and c->>'tier'='structural' and c->>'status'='valid' and jsonb_typeof(c->'details')='object')) then
        raise exception 'MFin gate lacks the unique required admission checks'; end if;
      return new;
    end $$;
    create function budget.execution_check_committed_receipt() returns trigger language plpgsql as $$
    begin
      if not exists(select from etl.load_runs where run_id=new.load_run_id and status='succeeded'
        and source_id='budget_official' and target_table='budget.execution_releases' and finished_at is not null) then
        raise exception 'MFin selection and successful load receipt must commit together'; end if;
      return null;
    end $$;
    create function budget.execution_preserve_receipt() returns trigger language plpgsql volatile as $$
    begin
      if not exists(select from budget.execution_release_selections where load_run_id=old.run_id) then return new; end if;
      if row(new.run_id,new.source_id,new.target_table,new.status,new.finished_at,new.rows_loaded)
        is not distinct from row(old.run_id,old.source_id,old.target_table,old.status,old.finished_at,old.rows_loaded) then
        return new;
      end if;
      if old.status='running' and old.finished_at is null and new.status='succeeded' and new.finished_at is not null
        and new.run_id=old.run_id and new.source_id=old.source_id and new.target_table=old.target_table then
        return new;
      end if;
      raise exception 'Published MFin load receipt identity and outcome are immutable';
    end $$;
    create trigger mfin_execution_receipt before update on etl.load_runs
      for each row execute function budget.execution_preserve_receipt();

    do $$ declare relation text; begin
      foreach relation in array array['execution_releases','execution_release_inputs','execution_release_facts',
        'execution_release_sections','execution_release_seals','execution_release_selections'] loop
        execute format('create trigger immutable_rows before update or delete on budget.%I for each row execute function budget.execution_reject_mutation()',relation);
        execute format('create trigger immutable_truncate before truncate on budget.%I for each statement execute function budget.execution_reject_mutation()',relation);
        if relation<>'execution_release_selections' then
          execute format('create trigger a_open_release before insert on budget.%I for each row execute function budget.execution_open_release()',relation);
        end if;
      end loop;
    end $$;
    create trigger b_input before insert on budget.execution_release_inputs for each row execute function budget.execution_check_input();
    create trigger b_fact before insert on budget.execution_release_facts for each row execute function budget.execution_check_fact();
    create trigger b_section before insert on budget.execution_release_sections for each row execute function budget.execution_check_section();
    create trigger b_seal before insert on budget.execution_release_seals for each row execute function budget.execution_check_seal();
    create trigger b_selection before insert on budget.execution_release_selections for each row execute function budget.execution_check_selection();
    create constraint trigger committed_receipt after insert on budget.execution_release_selections
      deferrable initially deferred for each row execute function budget.execution_check_committed_receipt();

    create view budget.execution_current_releases as
      select s.* from budget.execution_release_selections s
      where not exists(select from budget.execution_release_selections child where child.previous_selection_id=s.selection_id);
    create view budget.execution_current_facts as
      select f.*,s.selection_id from budget.execution_release_facts f
      join budget.execution_current_releases s using(release_id);
    comment on view budget.execution_current_releases is
      'Terminal node per month in the validated expected-prior chain. Source capture recency and event clock time never select a release.';
  `.execute(db);
}

export function down(_db: Kysely<unknown>): Promise<void> {
  return Promise.reject(
    new Error(
      'MFin release history is append-only; automatic down is disabled.'
    )
  );
}
