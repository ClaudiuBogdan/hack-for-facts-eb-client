import { describe, expect, it } from "vitest";

import {
  campaignAdminBlockedAlertClassName,
  campaignAdminStatusClassNames,
  getCampaignAdminInstitutionResponseStatusClassName,
  getCampaignAdminInstitutionThreadStateClassName,
  getCampaignAdminRiskFlagClassName,
  getCampaignAdminRiskFlagSeverity,
  getCampaignAdminRiskFlagsAlertClassName,
  getCampaignAdminRiskFlagsSeverity,
} from "./campaign-admin-status-classes";

describe("campaign admin risk flags", () => {
  it("give each flag one meaning: a stop is blocked, a caution an operator can confirm past is partial", () => {
    expect(getCampaignAdminRiskFlagSeverity("institution_thread_failed")).toBe("blocked");
    expect(getCampaignAdminRiskFlagSeverity("invalid_institution_email")).toBe("blocked");
    expect(getCampaignAdminRiskFlagSeverity("institution_email_mismatch")).toBe("partial");
    expect(getCampaignAdminRiskFlagSeverity("missing_official_email")).toBe("partial");
    expect(getCampaignAdminRiskFlagClassName("institution_thread_failed")).toBe(campaignAdminStatusClassNames.blocked);
    expect(getCampaignAdminRiskFlagClassName("institution_email_mismatch")).toBe(campaignAdminStatusClassNames.partial);
  });

  it("give the alert around them the most severe meaning present", () => {
    expect(getCampaignAdminRiskFlagsSeverity(["institution_email_mismatch"])).toBe("partial");
    expect(getCampaignAdminRiskFlagsSeverity(["institution_email_mismatch", "institution_thread_failed"])).toBe("blocked");
    expect(getCampaignAdminRiskFlagsAlertClassName(["institution_thread_failed"])).toBe(campaignAdminBlockedAlertClassName);
    expect(getCampaignAdminRiskFlagsAlertClassName(["missing_official_email"])).toContain("text-status-partial-fg");
    expect(getCampaignAdminRiskFlagsAlertClassName(["missing_official_email"])).toContain("[&>svg]:text-status-partial-fg");
  });
});

describe("campaign admin institution threads", () => {
  it("map each state and response once, for the table and the detail alike", () => {
    expect(getCampaignAdminInstitutionThreadStateClassName("started")).toBe(campaignAdminStatusClassNames.info);
    expect(getCampaignAdminInstitutionThreadStateClassName("pending")).toBe(campaignAdminStatusClassNames.partial);
    expect(getCampaignAdminInstitutionThreadStateClassName("resolved")).toBe(campaignAdminStatusClassNames.live);
    expect(getCampaignAdminInstitutionResponseStatusClassName("registration_number_received")).toBe(campaignAdminStatusClassNames.info);
    expect(getCampaignAdminInstitutionResponseStatusClassName("request_confirmed")).toBe(campaignAdminStatusClassNames.live);
    expect(getCampaignAdminInstitutionResponseStatusClassName("request_denied")).toBe(campaignAdminStatusClassNames.blocked);
    expect(getCampaignAdminInstitutionResponseStatusClassName(null)).toBe(campaignAdminStatusClassNames.neutral);
  });
});
