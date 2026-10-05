import { sql, type Kysely } from 'kysely';

/**
 * transparenta_prod — additive: approved-budget observations from reviewed
 * raw interpretations (source_budget_law.approved_interpretations), one row
 * per printed numeric value slot whose form unit is proven.
 *
 * Kept apart from budget.approved_budget_facts and budget.execution_vs_budget
 * (that legacy view sums by label across hierarchy levels and credit types);
 * no view reads this table. Rows are observations, never aggregates: totals,
 * subtotals and details coexist, and a credit-type row carries its
 * descriptor context as attributes. `measure = 'forecast'` values are
 * estimates, never approved appropriations or actuals. Codes are source
 * values, never keys or CUIs. Append-only (delete mode append_only).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table budget.approved_budget_lines (
      interpretation_id text not null,
      record_index integer not null check (record_index >= 0),
      field text not null
        check (field in ('PROGRAM_2025', 'ESTIMARI2026', 'ESTIMARI2027', 'ESTIMARI2028')),
      budget_year integer not null,
      publication text not null,
      fund text not null,
      form text not null,
      annex text not null,
      authority_code text not null,
      authority_name text not null,
      report_title text not null,
      capitol text not null,
      subcapitol text not null,
      paragraf text not null,
      grupa text,
      titlu text,
      articol text not null,
      alineat text not null,
      label text not null,
      row_role text not null check (row_role in ('descriptor', 'credit')),
      credit_type text check (credit_type in ('commitment_credits', 'budget_credits')),
      context_record_index integer,
      context_label text,
      measure text not null check (measure in ('approved', 'forecast')),
      measure_year integer not null,
      token text not null,
      amount numeric not null,
      unit text not null check (unit = 'thousand_lei'),
      source_file_id text not null,
      content_sha256 text not null,
      object_key text not null,
      object_version_id text not null,
      run_id bigint references etl.load_runs(run_id),
      loaded_at timestamptz not null default now(),
      primary key (interpretation_id, record_index, field),
      check ((row_role = 'credit') = (credit_type is not null)),
      check ((row_role = 'credit') = (context_record_index is not null and context_label is not null)),
      check ((grupa is null) <> (titlu is null)),
      check ((measure = 'approved') = (measure_year = budget_year))
    );
    create index approved_budget_lines_scope_idx
      on budget.approved_budget_lines (budget_year, fund, form, authority_code);
    comment on table budget.approved_budget_lines is
      'Approved-budget law observations (exact printed values, thousand lei) with source locator; totals and details coexist, never sum across rows; forecasts are not approvals or actuals.';

    insert into etl.sync_policy (source_id, lane, load_run_target_table, sync_mode,
      cadence, stale_after, schedule_ref, delete_mode, parity_mode, parity_scope, contract_ref, details)
    values ('mfp_budget_law', 'approved_budget_2025', 'budget.approved_budget_lines', 'one_shot',
      'manual', null, 'manual', 'append_only', 'canonical', 'load_only',
      'src/sources/budget-official/prod/approved-budget-publish.ts',
      '{"watermark_field":"none","scope":"five pinned 2025 law forms","publication":"law_2025_as_sent_to_monitorul_oficial"}'::jsonb);
  `.execute(db);
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Approved-budget lines are append-only; no automatic down.')
  );
}
