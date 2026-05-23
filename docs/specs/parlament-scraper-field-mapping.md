# Parlament — scraper field mapping (local reference)

Date: 2026-05-22
Status: Draft until scrapper docs are available locally

Expected scrapper docs (not present in this worktree):

- `../hack-for-facts-eb-scrapper/experimental/docs/political/parliament.md`
- `../hack-for-facts-eb-scrapper/new_latest/src/sources/parliament/`

Set `VITE_SCRAPPER_REPO_ROOT` if the scrapper checkout is not a sibling of this repo.

## Catalog join keys → client schemas

| Join key | Schema | Mock file |
|----------|--------|-----------|
| `memberId` | `ParliamentMemberSchema` | `mocks/members.json` |
| `groupId` | `ParliamentGroupSchema` | `mocks/groups.json` |
| `voteId` | `ParliamentVoteSummarySchema` / `ParliamentVoteDetailSchema` | `mocks/vote-summaries.json`, `mocks/vote-details.json` |
| `billId` | `ParliamentBillSummarySchema` / `ParliamentBillDetailSchema` | `mocks/bills.json`, `mocks/bill-details.json` |

## Expected scrapper fields (to validate when docs available)

### Member
- `memberId`, `firstName`, `lastName`, `chamber`, `groupId`, `judetSlug`, `mandateStart`, `contact`

### Group
- `groupId`, `name`, `chamber`, `memberCount`

### Vote
- `voteId`, `chamber`, `title`, `heldAt`, `voteType`, `outcome`, `tally`, `memberVotes[]`, `relatedBillId?`

### Bill
- `billId`, `number`, `title`, `longTitle`, `billType`, `originatingChamber`, `currentLocation`, `currentStageLabel`, `lastUpdatedAt`, `legislatureId`
- `initiator` (`type`, `departmentName?`, `memberId?`)
- `documents[]` (`documentId`, `label`, `url`, `publishedAt`, `versionLabel?`)
- `passage` (`camera[]`, `senat[]`, `final[]` with `stageId`, `label`, `status`, `completedAt?`)
- `relatedVotes[]` (`voteId`, `chamber`, `title`, `heldAt`)

When scrapper docs are synced, update Zod schemas and mocks to match — UI adapters should remain unchanged.
