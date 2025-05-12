export type LineItemsFilter = {
    report_id?: number;
    report_ids?: number[];
    entity_cui?: string;
    funding_source_id?: number;
    functional_code?: string;
    economic_code?: string;
    account_category?: string;
    min_amount?: number;
    max_amount?: number;
    program_code?: string;
    reporting_year?: number;
    county_code?: string;
    uat_id?: number;
    year?: number;
    years?: number[];
    start_year?: number;
    end_year?: number;
    search?: string;
  };
  