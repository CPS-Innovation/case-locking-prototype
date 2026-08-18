# Move case-review draft state from session into the database

## Context

Today a case review's draft state is split: summary, strength assessment and document annotations live in the DB (CaseReview and friends), but the charging decisions, information request answer and first hearing details live only in the Express session (`chargingDecision`, `reviewInformationRequest`, `reviewFirstHearing`). That split forced the `hydrateSeededReviewSession` hack for seeded demo reviews, and it means a returning user loses half their in-progress review. The fix: hold everything on the draft (`in_progress`) CaseReview in the DB, flip to `submitted` on submit, and delete the hydration helper. A user who signs in later resumes exactly where they left off.

Prototype constraints: no migrations — schema changes take effect when the user runs `npm run generate-data` (never run this yourself; Prisma blocks it). Prisma Json type is unavailable on SQLite, so use real columns/models.

## 1. Schema (`prisma/schema.prisma`)

CaseReview (~L425): remove `decision String?`; add:

- Information request draft: `wantsInformationRequest String?`, `informationRequestComplete Boolean?`, `informationRequestDescription String?`, `informationRequestSentDate DateTime?`
- First hearing draft: `firstHearingDay String?`, `firstHearingMonth String?`, `firstHearingYear String?`, `firstHearingTime String?`, `firstHearingVenue String?`, `firstHearingConfirmed Boolean?`
- Relations: `chargeDecisions CaseReviewChargeDecision[]`, `informationRequestItems CaseReviewInformationRequestItem[]`

New model CaseReviewChargeDecision: `id`, `caseReviewId` (relation, onDelete: Cascade), `chargeId` (relation, onDelete: Cascade), `decision String`, `@@unique([caseReviewId, chargeId])`. Back-relations on Charge and CaseReview. Cascade from Charge means deleting an offence auto-prunes its decision.

New model CaseReviewInformationRequestItem: `id`, `caseReviewId` (relation, onDelete: Cascade), `category String?`, `description String @default("")`, `dueDay String?`, `dueMonth String?`, `dueYear String?` (mirror the three date inputs — no parsing until promotion), `defendants Defendant[]` (implicit m-n; add back-relation on Defendant near its existing informationRequestItems relation), `createdAt @default(now())` for stable ordering.

## 2. Helpers (`app/helpers/caseReview.js`)

- Delete `hydrateSeededReviewSession` and its export; update the comment above `findOrCreateReview` (drafts now live on the review row).
- Add `findOrCreateReviewWithDrafts(prisma, caseId, userId)` — calls `findOrCreateReview` then refetches with `include: { chargeDecisions: true, informationRequestItems: { include: { defendants: true }, orderBy: { createdAt: 'asc' } } }`.
- Add shaping helpers so templates keep their current shapes:
  - `buildDecisionsMap(review)` → `{ [chargeId]: decision }` from `review.chargeDecisions`
  - `shapeDraftInformationRequest(review, caseDefendants)` → `null` when `wantsInformationRequest == null` (null is load-bearing: templates use existence for Not started vs In progress), else `{ wantsInformationRequest, complete, description, sentDate, items: [{ id, category, description, dueDate: {day, month, year}, defendants, formattedDueDate, defendantNames }] }` reusing `formatSessionDate`/`formatDefendantNames` from `app/helpers/informationRequest.js`
  - `shapeDraftFirstHearing(review)` → `null` if all first-hearing columns null, else `{ hearingDate: {day, month, year}, time, venue, confirmed }` with nulls → `''` so date-input bindings keep working
- Replace `syncChargingDecisionAfterOffenceChange(prisma, req, caseId, defendantId)` with `resetReviewCompletionAfterOffenceChange(prisma, caseId, userId)`: drop the session-pruning half (cascade handles it), keep the completeness-flag resets. Update the three call sites in `app/routes/case--review--document.js` (~L359, L470, L536).
- Leave `createInformationRequestFromSession` in `app/helpers/informationRequest.js` untouched (the standalone flow `case--information-requests.js:205` depends on it) — the submit handler reshapes the draft rows into the shape it already expects.

## 3. Routes

`app/routes/case--review--charging-decision.js`
- Referrer: store under a new session key `caseReviewReferrer` (ephemeral navigation state stays in session; also removes the shape collision with `case--defendants.js`, which keeps sole ownership of the old `chargingDecision` key — do not touch that flow).
- All `decisions` reads (entry redirect L20, check L34, selectedDecision L90) come from `findOrCreateReviewWithDrafts` + `buildDecisionsMap`.
- POST `/:chargeId`: `prisma.caseReviewChargeDecision.upsert({ where: { caseReviewId_chargeId: {...} }, update: { decision }, create: {...} })`.
- Remove `hydrateSeededReviewSession` import/call.

`app/routes/case--review--information-request.js` — every handler loads the review.
- POST `/` (L38): `caseReview.update({ wantsInformationRequest })`; GET `/` passes `informationRequest: { wantsInformationRequest: review.wantsInformationRequest }`.
- POST `/notes` "add" branch (L78): update review `wantsInformationRequest: 'yes'` in DB before redirecting.
- GET/POST `/description`: pass/update `informationRequestDescription`; keep writing `informationRequestSentDate: new Date()` here for check-page display, but at submit promote with a fresh `new Date()` (the request is only actually "sent" on submit).
- POST `/item` (L122): `caseReviewInformationRequestItem.create` with `dueDay/dueMonth/dueYear` from `req.body.reviewInformationRequestItem.dueDate` and `defendants: { connect: cleanDefendantIds(...).map(id => ({ id: parseInt(id) })) }`. GET `/item` counts DB items for the ordinal.
- Switch edit/delete from array index to item id: routes `/items/:itemId/edit` and `/items/:itemId/delete`, loading/updating/deleting by id scoped to the review (edit uses `defendants: { set: [...] }`). Update hrefs in `information-request/items.html`, `information-request/check.html` and `review/check.html` from `loop.index0` to `item.id`.
- GET `/items` and GET `/check`: shape via `shapeDraftInformationRequest`; check redirect guard becomes `review.wantsInformationRequest == null`; guard `formattedSentDate` against null.
- POST `/check`: update `informationRequestComplete`.

`app/routes/case--review--first-hearing.js`
- Delete `buildEmptyFirstHearing`, the session init and `res.locals.data` mirroring. Every GET loads the review and passes `reviewFirstHearing: shapeDraftFirstHearing(review) || { hearingDate: {day:'',month:'',year:''}, time:'', venue:'' }`.
- POSTs update columns: date → `firstHearingDay/Month/Year`, time → `firstHearingTime`, venue → `firstHearingVenue`, check → `firstHearingConfirmed`.

`app/routes/case--review.js`
- Remove `hydrateSeededReviewSession` import and both calls.
- Task list and check GETs: `findOrCreateReviewWithDrafts`; decisions from `buildDecisionsMap`; pass `informationRequest` and `reviewFirstHearing` shaped locals.
- Submit POST:
  - Load review with drafts once at the top (replaces both the session reads and the late `findFirst` at L221).
  - Apply decisions from `buildDecisionsMap(review)` to Charge.status / Defendant.status (logic unchanged).
  - First hearing block reads `review.firstHearing*` columns.
  - Information request: `if (review.informationRequestComplete && review.wantsInformationRequest === 'yes')` reshape draft rows to the session shape and call `createInformationRequestFromSession` with a fresh sentDate.
  - Flip status to `submitted` and clear the drafts in the same pass: null out all new columns, `deleteMany` chargeDecisions and items. Required because `findOrCreateReview` falls back to the latest review of any status — without clearing, stale drafts resurface after submit.
  - ActivityLog meta: `{ decisions: buildDecisionsMap(review), caseReviewId: review.id }` (no template renders the old spread specially).
  - Referrer: read/delete `req.session.data.caseReviewReferrer`.

## 4. Views

- `cases/review/index.html`: L74–88 conditions switch from `data.reviewInformationRequest`/`data.reviewFirstHearing` to the `informationRequest`/`reviewFirstHearing` locals; same for href conditions at L103, L126, L130.
- `cases/review/check.html`: L167, L181, L189, L325 → `informationRequest`; L298 → `reviewFirstHearing`; Change/delete item links → item id. The existing "No" default when nothing answered still falls out of the null shaper — behaviour unchanged.
- `cases/review/information-request/index.html` L27, `description.html` L26 → read from the passed `informationRequest` local; `items.html` and `information-request/check.html` links → item id (`item-edit.html` posts to its own URL, no action change).
- `cases/review/first-hearing/index.html` L35–47, `time.html` L30, `venue.html` L27, `check.html` L26–71 → `reviewFirstHearing` local.
- After this, `grep -rn "data.reviewInformationRequest\|data.reviewFirstHearing" app/views` should return nothing, and `data.chargingDecision` should only appear in `case--defendants` views (if at all).

## 5. Seeds

- `prisma/seed-helpers/simon-in-progress-review.js`: replace `decision: 'Charge'` with nested `chargeDecisions: { create: { chargeId: defendant.charges[0].id, decision: 'Charge' } }` plus `wantsInformationRequest: 'no'`, `informationRequestComplete: true`. No first-hearing draft. Rewrite the stale comment block referencing session hydration.
- `prisma/seed-helpers/case-review-annotations.js` (~L107): create these background reviews with `status: 'submitted'` — they belong to already-charged cases, i.e. finished reviews. Leaving them `in_progress` would make them look resumable with empty drafts. Annotations stay visible because `findOrCreateReview` falls back to the latest review of any status.

## 6. What gets deleted

- `hydrateSeededReviewSession` (helper, export, 3 call sites in 2 route files)
- `CaseReview.decision` column
- All review-flow session reads/writes/deletes of `chargingDecision`, `reviewInformationRequest`, `reviewFirstHearing` (the three `delete`s in submit become the DB draft-clear)
- The session-pruning half of `syncChargingDecisionAfterOffenceChange`

## 7. Verification (user runs `npm run generate-data` first, then `npm run dev`)

1. Seeded resume, fresh session: private window, sign in as Simon, case 52SW200001 → review. Charging decision Completed (check page shows Charge), information request Completed (check shows No), summary and strength assessment Completed. This is the acceptance test for deleting the hydrator.
2. Charging-decision resume: on a pre-charge multi-charge case, decide one charge, restart the server (kills session), reopen → task In progress, entry lands on first undecided charge, decided charge shows its saved radio.
3. Information request cycle: Yes → description → add two items → edit item 2 (defendants and due date repopulate) → delete item 1 → check → complete. Restart server; still Completed and intact. Change links hit the right item after the deletion (the by-id switch).
4. Notes-exist-answered-no: add an information-request annotation on a document, answer No → notes page; "add" flips the DB answer to yes and lands on description; the other option deletes the notes and check shows No.
5. First hearing: on a case with no eligible defendants, enter date/time/venue, confirm, restart server → Completed and repopulated.
6. Offence churn: complete charging decision, then add/change/remove an offence via document review → task drops back from Completed; the deleted charge's decision row is gone (cascade).
7. Submit a full review: charge statuses applied, defendant status updated, hearing/information request created, activity log written, referrer honoured. Reopen `/review` → all tasks reset (drafts cleared).
8. Regressions: standalone information-requests flow still creates immediately; `case--defendants` make-charging-decision flow untouched.
