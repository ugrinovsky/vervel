# CRM MVP

## What CRM Means In Vervel

Vervel CRM is the trainer's client-control layer. It should answer three simple questions:

- Who is a potential client?
- Who needs a plan or follow-up now?
- What is the next action for each client?

Training plans, chats, analytics, and the calendar are the coaching workspace. CRM sits above them and turns those tools into a daily action list for sales and retention.

## Time To Value

The first useful path for a trainer is:

1. Add a client or lead.
2. Assign the first workout.
3. See who needs attention on the home screen.

Any first-run flow should optimize for this path before showing advanced analytics, groups, AI, or detailed workout editing.

## Data Model

`trainer_athletes.status` remains a technical access status:

- `pending`: invite or unfinished connection.
- `active`: trainer can access the athlete.
- `inactive`: connection was removed.

CRM status is separate. It describes the business relationship with the client and should not drive authorization.

Athlete CRM statuses:

- `active`: the trainer is currently working with the athlete.
- `sleeping`: the athlete has gone quiet or has no recent activity.
- `paused`: the client is temporarily paused.
- `churned`: the client is no longer training.

Lead CRM statuses:

- `new`: added but not contacted yet.
- `contacted`: trainer has reached out.
- `trial`: client is testing the service or came to a trial session.
- `converted`: lead became an athlete/client in the app.
- `lost`: lead is not moving forward.

## Leads

Leads are stored separately from athletes because a potential client may not have an app account yet. A lead needs only enough data to keep the trainer moving:

- name
- phone
- optional email
- source
- note
- next follow-up date
- CRM status

When the client registers or is added as an athlete, the lead can be marked as converted and linked to the athlete.

## Home Screen Aha Moment

The home screen should not only say what is scheduled today. It should show what protects the trainer's revenue:

- athletes without a plan this week
- athletes who have not trained recently
- clients or leads with a follow-up due
- unread client messages

The trainer should be able to open one of these items and immediately take the next action.

## Out Of Scope For This MVP

The app currently has no subscription or membership mechanics. This MVP does not add:

- trainer-client billing
- membership packages
- subscription expiry
- payment reminders
- recurring payments

Existing `payments` are treated as user wallet top-ups and are not part of CRM retention logic.
