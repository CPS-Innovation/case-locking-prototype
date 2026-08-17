# Case locking prototype

A prototype exploring ways to reduce the risk of users making conflicting changes when multiple people work on the same case.

## About this prototype

This prototype investigates how users could be informed when another person is working on, or has made changes to, the same case.

At this stage, the service cannot forcibly lock a case or prevent multiple users from editing it at the same time. The prototype therefore explores ways of reducing the likelihood and impact of conflicting changes through the user interface.

The work focuses on how and when users should be warned without unnecessarily preventing them from completing their work.

## Problem

More than one user may need to access the same case.

If two users make changes at the same time, one user may be working with information that has subsequently been changed by somebody else. This creates a risk that they:

- make decisions using out-of-date information
- overwrite or conflict with another user's changes
- continue a task without realising the case has changed
- need to repeat work after discovering a conflict

A technical mechanism that exclusively locks a case is not currently available. The prototype explores how the service could manage this risk without relying on a hard lock.

## What we are exploring

The prototype explores different ways of communicating that a case has changed or that another user is working on it.

Current approaches include:

### Interruption cards

Interruption cards are being explored for situations where the change is significant enough that the user should acknowledge it before continuing.

The intention is to interrupt the journey at an appropriate point, explain what has happened and allow the user to make an informed decision about continuing.

### Notification banners

Notification banners are being explored as a less disruptive way of informing users about changes while they continue working.

This includes variations that remain visible while the user works and allow additional information to be shown or hidden when required.

## Design considerations

The prototype is intended to help explore questions including:

- when a user needs to be interrupted rather than simply informed
- what information the user needs about another person's changes
- whether warnings should persist while the user continues working
- when an acknowledged warning should be shown again
- how users can understand whether the information currently on screen may be out of date
- how to avoid repeatedly warning users about changes they have already acknowledged
- how different levels of risk should affect the prominence of the warning

## Scope

This is a prototype for exploring user journeys and interaction design.

It does not currently provide a production case-locking or concurrency mechanism and should not be treated as demonstrating how conflicts would be detected or prevented technically.

Where the prototype needs to represent another user changing a case, this behaviour may be simulated for the purposes of testing the interaction.

## Running the prototype

This is a [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/) service, using Node.js and [Prisma](https://www.prisma.io/) for its data.

1. Install Node.js. This repository pins a version via `.nvmrc` (currently Node 22) - if you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` to pick it up automatically.
2. Install dependencies:

   ```
   npm install
   ```

3. Generate and seed the local database:

   ```
   npm run generate-data
   ```

   This runs `prisma db push --force-reset` followed by `prisma db seed`, so it drops and recreates the local SQLite schema before reseeding it with fresh sample data. It is only needed once, when setting up the prototype for the first time - running it again will reset and overwrite any local data (including anything created while using the prototype).

4. Start the prototype in development mode:

   ```
   npm run dev
   ```

   The prototype kit will print the local URL to use, typically [http://localhost:3000](http://localhost:3000).

## Prototype structure

The parts of the codebase most relevant to the case-locking exploration are:

- **Review journey** - `app/routes/case--review*.js` and `app/views/cases/review*` implement the case review task list (with `-variant-2` versions of both used to compare an alternative layout). Which variant a user sees is controlled by `req.session.data.reviewVariant2`, toggled from `app/routes/settings--review-variant.js`.
- **Review interruption** - `app/middleware/reviewInterruptionGuard.js` acts as an entry gate in front of the review routes (registered in `app/routes.js`), rendering the interruption card (`app/views/_includes/case/interruption-card.njk`, via `app/views/cases/interruption/index.html`) instead of the review page when a case has not yet been acknowledged for the current visit. `app/routes/case--interruption.js` handles the "Continue" action that acknowledges the interruption and returns the user to the review page they originally requested.
- **Interruption/acknowledgement state** - acknowledgement and the pending destination for an interruption are held per case ID in session data as `reviewInterruptionAcknowledged` and `reviewInterruptionPending` (see comments in `app/data/session-data-defaults.js`). Acknowledgement is cleared again once the user leaves the review journey for an ordinary case page, so returning to review later shows the interruption again.
- **Pinned notification banner variation** - `app/views/_components/notification-banner-pinned/` (macro and template) and `app/assets/javascripts/components/notification-banner-pinned.js` implement a persistent notification banner that can be expanded and collapsed to show or hide further detail. It is imported globally in `app/views/_layouts/main.html` so it is available to any page, but is not currently wired into a specific route - it exists as a reusable component for exploring this pattern.

## Status

This prototype is under active development. Designs, journeys and implementation may change as different approaches are explored and evaluated.
