# Terms & Conditions v3.0 Rollout Strategy

**Status:** Draft
**Author:** Claudiu Constantin Bogdan
**Created:** 2026-04-01
**Target Effective Date:** 2026-05-01

## Overview

This document describes the rollout strategy for Terms of Use v3.0 and Privacy Policy v3.0 for Transparenta.eu. The update is driven by new platform features that introduce additional data processing activities requiring updated legal disclosures and, in some cases, fresh user consent.

## New Features Requiring T&C Updates

| Feature | Data Processing Impact | Consent Type |
|---|---|---|
| Community Forum (Discourse) | SSO data flow (user ID, email, display name), forum posts, activity logs, IP for moderation | Covered by updated T&C acceptance (contract performance) |
| Expanded Notifications | Platform updates, AI research alerts, data series alerts, campaign notifications | Separate opt-in per notification type (GDPR Art. 6(1)(a)) |
| Email to Institutions | Correspondence records (recipient, date, subject, content), sender identification | Per-action consent (user confirms each email) |
| AI Research Agents | Proactive monitoring of followed entities, research results delivery | Explicit opt-in required (GDPR Art. 6(1)(a)) |
| Forum Email Notifications | Discourse-managed digests, reply notifications, mention alerts | Managed through Discourse settings |

## Legal Framework

- **GDPR** (Regulation 2016/679): directly applicable in Romania
- **Romanian Law 190/2018**: GDPR supplementary provisions
- **ePrivacy Directive** (2002/58/EC) as transposed by Romanian Law 506/2004
- **Supervisory Authority**: ANSPDCP (Autoritatea Nationala de Supraveghere a Prelucrarii Datelor cu Caracter Personal)

### Key Principles

1. **Existing consent is scoped.** Users who consented to monthly entity updates under v2.0 have NOT consented to platform updates, AI alerts, or forum data processing.
2. **New processing purposes need new consent or a valid legal basis.** Each new notification category requires its own opt-in.
3. **T&C update notification email is permitted.** Current v2.0 Terms (line 98) and Privacy Policy (line 147) both reserve the right to notify users of material changes via email.
4. **No bundled consent (Recital 43 GDPR).** Continued platform access cannot be conditioned on accepting all new notification types.
5. **Consent records required (Art. 7(1) GDPR).** Must keep auditable records of what was consented to, when, and which version.

## Current State Assessment

- **User base:** 100-1,000 registered users
- **Consent records:** Registration date + checkbox only. No T&C version tracking.
- **Data controller:** Claudiu Constantin Bogdan (persoana fizica) for platform; Funky Citizens for campaign-specific data
- **Forum:** Discourse with DiscourseConnect SSO, EU-hosted
- **Email to institutions:** Platform sends from @transparenta.eu address

## Timeline

| Date | Action | Owner |
|---|---|---|
| 2026-04-01 | Begin technical preparation. Draft v3.0 documents. | Dev |
| 2026-04-01 to 04-07 | Deploy T&C version tracking backend. Backfill existing users to v2.0. | Dev |
| 2026-04-07 | v3.0 documents finalized. Submit for legal review. | Dev + Legal |
| 2026-04-07 to 04-14 | Legal review period. | Legal |
| 2026-04-14 | Legal review complete. Apply any corrections. | Dev + Legal |
| 2026-04-15 | Publish v3.0 documents with May 1, 2026 effective date. | Dev |
| 2026-04-15 | Send one-time email notification to all registered users. | Dev |
| 2026-04-15 to 05-01 | Grace period. Users can review new terms. No new features requiring new consent are enabled. | - |
| 2026-05-01 | Effective date. Activate blocking acceptance modal. | Dev |
| 2026-05-01 | Deploy new notification preference toggles (all default to OFF). | Dev |
| 2026-05-01 | Gate forum access behind v3.0 acceptance. | Dev |
| 2026-05-01+ | Monitor acceptance rates. Users opt in to new notification types at their own pace. | Dev |
| 2026-07-01 | Review: assess acceptance rates, address non-accepting users. | Dev |

## Technical Requirements

### 1. Backend: T&C Version Tracking

**Priority: Critical. Must be deployed before v3.0 publication.**

Add the following fields to user profile/backend:

```
termsAcceptedVersion: string    // e.g., "2.0", "3.0"
termsAcceptedAt: ISO timestamp  // when they accepted
privacyAcceptedVersion: string
privacyAcceptedAt: ISO timestamp
acceptanceIp: string            // IP at time of acceptance
acceptanceUserAgent: string     // user agent at time of acceptance
```

**Backfill strategy for existing users:**
- Set `termsAcceptedVersion` = `"2.0"` for all existing users
- Set `termsAcceptedAt` = user's `registrationDate`
- Set `privacyAcceptedVersion` = `"2.0"` with same date
- This is defensible: users checked the T&C checkbox at registration when v2.0 was live

**Audit log:**
- Each acceptance event should be logged to an immutable audit table:
  - `userId`, `documentType` (terms/privacy), `version`, `timestamp`, `ip`, `userAgent`
- This satisfies GDPR Art. 7(1) requirement to demonstrate consent

### 2. Frontend: Blocking Acceptance Modal

**Priority: Critical. Deploy on the effective date (May 1, 2026).**

Behavior:
- On every authenticated page load, check if `termsAcceptedVersion` < current required version
- If outdated, show a full-screen blocking modal (cannot be dismissed without action)
- Modal content:
  - Title: "We've updated our Terms of Use and Privacy Policy"
  - Brief summary of key changes (bullet points)
  - Links to full Terms of Use v3.0, Privacy Policy v3.0, and changelog sections
  - Checkbox: "I have read and accept the updated Terms of Use and Privacy Policy"
  - Button: "Continue" (disabled until checkbox is checked)
- On acceptance:
  - Update `termsAcceptedVersion` and `privacyAcceptedVersion` to `"3.0"`
  - Record timestamp, IP, and user agent in audit log
  - Dismiss modal and allow normal navigation

**Important:** The modal does NOT opt users into any new notification types. It only acknowledges the updated legal framework. New notification types must be opted into separately.

### 3. Frontend: Notification Preferences Overhaul

**Priority: High. Deploy on the effective date.**

Expand the notification preferences UI to include all new categories:

**Category: Budget Reports** (existing, unchanged)
- Monthly entity report
- Quarterly entity report
- Annual entity report

**Category: Campaign** (existing, unchanged)
- Campaign updates (global)
- Public debate updates (per entity)

**Category: Platform** (new, requires fresh opt-in)
- Platform updates and changelog

**Category: AI Research** (new, requires fresh opt-in)
- AI agent research alerts (proactive)

**Category: Data Alerts** (existing)
- Analytics series alerts
- Static dataset alerts

**Category: Forum** (informational)
- Note: "Forum notifications are managed through your forum profile settings"
- Link to Discourse notification preferences

All new notification types default to OFF. No pre-checked toggles.

### 4. Forum Access Gating

**Priority: High. Deploy on the effective date.**

- Do NOT auto-connect existing users to the forum via SSO until they accept v3.0
- Forum access should be gated: if `termsAcceptedVersion` < `"3.0"`, SSO request should redirect to the acceptance modal
- After accepting v3.0, SSO proceeds normally

### 5. Email Notification

**Priority: Medium. Send on publication date (April 15, 2026).**

Single email to all registered users. Content requirements:

**Subject:** Actualizare Termeni si Conditii - Transparenta.eu

**Body structure:**
1. Opening: "We've updated our Terms of Use and Privacy Policy. The updated documents take effect on May 1, 2026."
2. Summary of key changes (bullet points):
   - Community forum integration and rules
   - Expanded notification types (platform updates, AI research alerts)
   - Email correspondence tools for contacting public institutions
   - Updated data processing and retention disclosures
3. Links: "View the updated [Terms of Use] and [Privacy Policy]"
4. Action required: "You will be asked to review and accept the updated terms on your next login after May 1, 2026."
5. Contact: "Questions? Contact us at contact@transparenta.eu"
6. Unsubscribe link (even though this is a service communication, include as good practice)

**Constraints:**
- Purely informational. No marketing content.
- No opt-in requests for new notification types.
- No promotional language.
- Must include unsubscribe link (ePrivacy compliance).
- Send only once. No follow-up reminders.

## Edge Cases

### Users who never log in again

- Their data continues to be processed under v2.0 consent scope only
- Cannot process their data for new purposes (forum, AI research, etc.)
- After 12-18 months of dormancy, consider sending a re-engagement email (permitted under v2.0 terms for account-related communications)
- Retain minimal data per existing v2.0 retention schedules
- Do NOT unilaterally delete accounts because they did not accept v3.0

### Users who see the modal but don't accept

- Modal remains blocking on every login until accepted
- Their existing notification subscriptions continue unchanged
- They cannot access new features (forum, AI research, correspondence tools)
- They can still use all v2.0 features (budget explorer, existing notifications)
- Do NOT cancel or modify their existing subscriptions

### Campaign participants

- Campaign-specific T&C (Funky Citizens) has not changed
- Campaign participants still need to accept updated general platform T&C (v3.0) via the modal
- They do NOT need to re-accept campaign T&C
- Campaign notification subscriptions continue unaffected

### Discourse anonymous posts after account deletion

- If a user deletes their account, anonymous posts remain on the forum without any identity link
- Non-anonymous posts are deleted within 90 days per the retention policy
- This should be disclosed in the Terms (already included in v3.0)

### Email delivery failures

- Track bounce rates for the notification email
- For hard bounces, mark the email as undeliverable but do not delete accounts
- These users will see the modal on their next login regardless

## Legal Review Checklist

Before publishing v3.0, have a Romanian data protection lawyer verify:

- [ ] Forum section adequately discloses Discourse SSO data flow
- [ ] Correspondence section correctly describes platform's role as facilitator
- [ ] AI features section properly requires explicit opt-in for proactive processing
- [ ] All new notification types have appropriate legal bases identified
- [ ] Data retention periods are reasonable and compliant
- [ ] Dual controller/processor structure (with Funky Citizens) is correctly disclosed
- [ ] ANSPDCP contact information is current
- [ ] The notification email text is compliant with ePrivacy requirements
- [ ] Art. 28 data processing agreement with Funky Citizens covers new activities
- [ ] Discourse sub-processor is covered under existing or new DPA
- [ ] Terms acceptance record-keeping satisfies Art. 7(1) GDPR

## Post-Launch Monitoring

### Acceptance Rate Tracking

Track and report weekly:
- Total users who have accepted v3.0
- Total users who have seen the modal but not accepted
- Total users who have not logged in since effective date
- New notification opt-in rates per category

### Target Metrics

| Metric | Target | Timeframe |
|---|---|---|
| v3.0 acceptance rate (of active users) | >80% | 30 days after effective date |
| v3.0 acceptance rate (of active users) | >95% | 90 days after effective date |
| Email notification delivery rate | >95% | Within 48 hours of send |
| Email bounce rate | <5% | Within 48 hours of send |

### Escalation Thresholds

- If acceptance rate < 50% after 30 days: investigate UX issues with the modal
- If significant number of users report confusion: add FAQ or clarification to the modal
- If ANSPDCP inquiries received: engage legal counsel immediately

## Document Version History

| Version | Date | Changes |
|---|---|---|
| Draft | 2026-04-01 | Initial rollout strategy |

## Appendix: GDPR Article References

| Article | Relevance |
|---|---|
| Art. 4(11) | Definition of consent: freely given, specific, informed, unambiguous |
| Art. 6(1)(a) | Consent as legal basis for processing |
| Art. 6(1)(b) | Contract performance as legal basis |
| Art. 6(1)(f) | Legitimate interests as legal basis |
| Art. 7(1) | Controller must demonstrate that consent was given |
| Art. 7(3) | Right to withdraw consent at any time |
| Art. 13 | Information to be provided when collecting personal data |
| Art. 28 | Data processor requirements and DPA |
| Recital 32 | Consent must be given by clear affirmative action |
| Recital 43 | Consent is not freely given if bundled with unrelated processing |
