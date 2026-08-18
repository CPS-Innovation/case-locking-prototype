Problem statement
Current context
As a lawyer reads, watches or listens to case materials, they're already doing the intellectual work: deciding if something's relevant to a charge, spotting what needs redacting, noticing what's missing. But the system doesn't capture that legal reasoning and decision making when it happens. It only captures the output of separate tasks done later e.g. action plans, disclosure, IDPC assembly, so the lawyer ends up making the same judgement more than once - once when they first view the material, and again when they reach that later step. This duplicates effort and risks the second decision not quite matching the first.
Users affected and why
Reviewing lawyers currently assemble cases and carry out quality/redaction checks manually. This is often experienced as moving and processing materials rather than building towards a coherent case. There's a risk that automation gets designed around processing materials faster, rather than around supporting the legal legal reasoning and decision making those materials exist to serve, leaving all ‘court users’ with a pile of materials rather than a case built around the elements of the offence.
Impact to CPS
It's unclear which automation capabilities are desirable and trusted by users, and proportionate in terms of cost, effort and complexity. Without testing, there's a risk of investing in a future service model that automates admin without delivering the trust, adoption or legal-legal reasoning and decision making support it needs to - meaning the CPS 2030 benefits (freed-up lawyer time, faster turnaround, more consistent quality) aren't realised. 
Opportunity
CPS 2030 strategic goals 
If automated IDPC assembly and sharing can reduce manual effort while maintaining legal assurance, it could support wider CPS priorities around reducing delay, improving casework quality and freeing skilled lawyers to focus on legal decision-making rather than administrative assembly tasks
User 
Reviewing lawyers currently carry out case assembly and quality/redaction checks manually. If parts of this can be automated without eroding trust or removing necessary judgement calls, it could reduce the admin burden on lawyers while preserving, or improving, the quality and consistency of what gets shared.

At the moment, case materials exist as a pile of documents with little structure. 

There’s nothing to connect a document to what it actually proves. 

Lawyers' analysis — which material proves which part of the offence, what the key issues are, whether a charge is correct — is done and written in external tools, not the system.

As a result:

- Lawyers copy content out of CMS into personal tools to read and annotate it, then upload those notes back as more documents in the pile
- Some lawyers want to write private notes as they do their review that do not appear in any official documentation — there is currently no way to do this within the system, pushing them further into external tools
- Review summaries and case notes are buried and hard to find; they may be low quality, out of date, or never read by the next person on the case
- Charges and other structured data are kept separate from the written review, requiring charge information to be re-entered in multiple places and manual steps to keep everything in sync — which is easy to forget and long-winded
- When evidence changes — for example when a witness withdraws — there is no way to see the knock-on effect without re-reading the whole case from scratch
- The same analysis is repeated each time a new review is done — initial review, IDPC, PTPH form, opening during trial — because nothing from the previous stage carries forward in a usable form
- Lawyers spend time on admin tasks such as writing statements confirming they have complied with charging rules, rather than reviewing cases
- When a charge needs correcting, the lawyer has to stop what they are reading and update it as a separate action, rather than doing it in the flow of the review

This is longwinded, error prone, wasteful and has a significant operational cost.

## Hypothesis
*
If lawyers can read, highlight, and annotate case materials within the system — and those annotations connect directly to structured data like charges and evidence — then:

- Analysis is captured once and reused across the case journey, rather than repeated from scratch
- The lawyer or advocate can understand the case quickly from structured annotations, rather than hunting for a buried summary document or re-reading everything
- Lawyers can write private notes, keeping working thoughts in the system without them appearing in official documentation
- When evidence changes, the impact is immediately visible — showing which charges are affected without re-reading the case
- Structured data stays in sync with the written review, removing the need to update things separately
- Lawyers no longer need to leave the system to do their actual work
- We can share the case with the defence lawyer and the defendant

# Epic: Helping reviewing lawyers review a case and share it with the relevant parties as early as possible

## Problems

1. At the moment, multiple users and multiple separate tasks have to be performed between a case and it's material coming in and the case being shared to advocates, defence, defendant, court etc. For example, a case work assistant opens a case, tidies it (housekeeping), may raise a task for a reviewing lawyer, reviewing lawyer eventually opens that task, then reviews the case, then raises another task for others users to prepare a bundle, warn a witness, and whatever else may be needed before it gets shared. This is long-winded and unnecessary adminstration. [Solution: Lawyer opens case, reviews it, the act of reviewing will send off the right notifcations/bundles/whatever those things are to the right people.]

[The act of sharing materials to common platform is long winded and error prone - manually adding materials, organising materials and collating the materials into a PDF.....tbc]

2. Reviews are either not done or done badly, and information, evidence or elements are not captured. As a result, the advocate can't do their job properly. It also means advocates have to start early on the day of the hearing to get a grip on the case, effectively doing a review from scratch. That means they're doing multiple jobs at once, one of which should already have been done. [Shiv to expand on this another time]

3. Defendants don't receive the case ahead of first hearing, which doesn't comply with the rules. [Shiv to explain why] and it's unnecessary. It's also crucial because if the prosecution case is clear to the defence, they won't fight it, and the defendant will plead guilty more quickly - meaning fewer hearings, shorter hearings, and fewer adjournments. [Solution: build a service that gives the defendant access to their own case and updates them whenever CPS updates the case.]