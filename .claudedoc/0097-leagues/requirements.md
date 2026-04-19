# Leagues — Frontend Requirements

**Date:** 2026-04-17
**Status:** Draft, aligned to backend v4 (`playground-backend/.claudedoc/0102-leagues/requirements.md`).
**Prior version:** `requirements-v3-archive.md` is retained for history.
**Scope:** What users see, what they can do, and the UX rules that bind the feature. Schema, APIs, and implementation live in `design.md`.

---

## 1. What we're building

Playground is adding two new top-level containers for recurring play:

- **Leagues** — organized competition. A parent Organization owns one or more Leagues; each League runs Seasons; each Season has Teams and a schedule; standings are tracked; captains report scores and opposing captains confirm. Public by default.
- **Groups** — casual recurring play. A small circle of friends who meet regularly. No seasons, no standings, no permanent teams. Members RSVP per occurrence or set a "I'm in every week" standing RSVP. Always invite-only in v1.

Each aggregate has its own chat, its own roster, and its own calendar feed that members can subscribe to from Google Calendar, Outlook, or Apple Calendar.

### 1.1 Personas

**Rick, 47 — commissioner.** Runs a 4-year-old neighborhood wiffleball league: 6 teams, ~55 players, two 10-week seasons a year, informal playoffs. Co-admin is Dana. Currently juggles Facebook, a group text, and a Google Sheet. Needs: a public home for the league, a roster he trusts, a schedule players actually see, a standings view that answers "are we in the playoffs?", and a score-entry flow that doesn't turn into a fight.

**Maya, 31 — casual organizer.** Runs a Friday-night paddle-sport group. 6–10 people, occasionally Sundays. Doesn't think of herself as a commissioner. Needs: a way to know who's in this week, one-tap "I'm in every Friday," a two-tap log-the-score after the game, and a year-end look-back of "who played how much."

### 1.2 v1 positioning

> A commissioner can stop using Facebook for their league, and a casual group can stop using a group-chat spreadsheet.

Everything v1 ships is subordinate to that goal. Features that don't reduce weekly admin workload for Rick or Maya are deferred (§7).

### 1.3 League vs Group at a glance

| Aspect                   | League (organized)                      | Group (casual)                                |
|--------------------------|------------------------------------------|------------------------------------------------|
| UI label                 | "League"                                 | "Group" — never "casual league"                |
| Parent Organization      | Required                                 | None                                           |
| Seasons                  | Admin-created; have start/end dates      | None — games auto-group by calendar year       |
| Schedule view            | Yes                                      | No — games are logged as they happen           |
| Standings                | W / L / Draw / Win% per team             | None                                           |
| Teams                    | Season-scoped; can copy from prior season| No persistent team templates                   |
| Recurring game nights    | No                                       | Yes — weekly or biweekly                       |
| RSVP on occurrences      | No                                       | Yes, with waitlist and guest +1                |
| Standing RSVPs           | No                                       | Yes — "I'm in every week"                      |
| Captains                 | One per team; display-only + score confirm| None                                          |
| Forfeits                 | Yes — admin picks the winning team       | Not modeled                                    |
| Score confirmation       | Reporter + opposing captain              | None — score entered and final                 |
| Chat                     | One League-wide room                     | One Group-wide room                            |
| Calendar feed            | Yes — per-user token                     | Yes — per-user token                           |
| Discoverability          | Public by default; listed under its Org  | Invite-only; never listed publicly             |

The "at a glance" row drives navigation and empty-state copy as much as it drives data shape.

---

## 2. Core concepts users see

This section describes what users see, not what the backend stores.

### 2.1 Organization

A long-lived container for Leagues. Shown on a public page with name, logo, description, admin list, and the Leagues under it. Always has at least one admin. Non-admin participation is exclusively through League membership — there is no "Org member" concept.

Organizations cannot be archived or deleted in v1 — they persist as long as their Leagues do. To stop using an Org, admins archive the Leagues underneath it. This gap is intentional for v1; a dedicated Org archive flow is a fast follow-up.

### 2.2 League

A sport-locked, organized container under an Organization. Visible fields: name, sport (set at creation, never changes), optional sub-sport, description, logo, visibility (public or invite-only), timezone (required — defaults to the creator's browser zone), admin list, member count, current Season.

Archived Leagues are read-only. Chat stays readable but rejects new messages. Admins can still retag historical games — that's the only post-archive write.

### 2.3 Group

A standalone casual aggregate — no parent Org. Visible fields: name, optional default sport, description, logo, timezone, admin list, member count.

Groups have a visibility setting, but v1 locks it to "Invite-only" — the setting is stored and reserved for future public-Group support but is not user-editable and never surfaces as a control. Archiving a Group ends every active game series at the same time; future RSVPs become read-only but visible.

### 2.4 Season (Leagues only)

Admin-created windows of play. Visible fields: name ("Spring 2026"), optional start/end dates, status (Active or Completed).

Seasons start Active — there is no Draft state. The system auto-flips them to Completed at end-of-day on the end date (in the League timezone); admins can also flip manually. Multiple overlapping seasons are permitted; it's rare but not blocked.

A Season with games attached can't be deleted. The remediation is to mark it Complete (which locks the schedule and finalizes standings) or to delete its games first. Seasons have no "Archived" state in v1 — Complete is the terminal read-only state.

### 2.5 Teams (Leagues only)

Teams live inside a Season, not inside a League. "Red" in Spring 2026 and "Red" in Fall 2026 are separate rosters — this is intentional so rosters can shift year-over-year without rewriting history.

Visible fields: name (need not be unique within a Season), optional color, captain, roster.

At the start of a new Season, the admin can **Copy teams from previous Season**: pick the source, preview teams and captains, confirm. Captains carry over by default.

> Captain is a display label plus one specific capability: they (or an admin) confirm or dispute the opposing team's reported game score. Captain is not a role or a permission tier beyond that.

### 2.6 Roster entries

A roster entry is someone — real user or placeholder — on a League or Group roster.

- **Real user** — a Playground account. In a League, accepting an invite auto-creates the roster entry. In a Group, there is no separate roster row — membership is enough.
- **Placeholder** — a name-only entry for someone who hasn't signed up. Created by an admin. Placeholders cannot sign in, cannot be promoted to admin, and never appear on public pages. They are permanent: v1 does not merge, link, or claim placeholders into real accounts. A newly signed-up user is a fresh account regardless of any placeholder that may exist in their name elsewhere.

Placeholders are scoped to the League or Group — they persist across Seasons automatically. A placeholder on Spring 2026's Red team stays available when Rick copies teams into Fall 2026.

Groups support placeholders too, but they play a smaller role there. Most casual-play non-members go through the free-text guest field on an RSVP instead. Placeholders in Groups are for repeat non-member attendees an admin wants to track by name over time (Maya's neighbor who always joins but won't sign up).

Creating a placeholder shows a privacy warning — the admin is putting a real person's name into the system without that person's consent. Copy owned by content design.

### 2.7 Recurring game nights (Groups only)

A recurring game night — "Fridays 7pm at Lincoln Park" — expands into upcoming occurrences. Tapping an occurrence **Log this game** materializes it into a real game.

Visible fields: optional name (default: "Fri 19:00"), recurrence (weekly or biweekly), day(s) of week, start time, duration, optional location, optional participant cap, skip dates.

Recurrence constraints (v1):
- Weekly or biweekly only — not monthly, not custom intervals.
- One or more days of the week per series; "Tuesdays and Thursdays" is two series, not one.
- Optional end: a date (≤ 5 years out) or a count (≤ 260 occurrences).

Daylight-saving rule: occurrences anchor to wall-clock time in the Group's timezone. A 7pm Friday series stays 7pm through a DST change.

### 2.8 RSVP and standing RSVP (Groups only)

Members RSVP per occurrence: Yes, No, Maybe, or Waitlist. A Yes on a capped occurrence that's already full lands on the waitlist automatically; the UI must show both the user's intent (Yes) and what happened (Waitlist).

When someone with Yes drops, the oldest waitlisted person auto-promotes to Yes and gets a notification.

A member can bring a **+1** by entering a guest's name on their Yes RSVP. Guests auto-attach to the game at materialization.

A skipped occurrence silently voids its RSVPs — no error surface, no user-visible failure.

**Standing RSVP.** One toggle per series: "I'm in every week" saves a default of Yes forward. The system fills future RSVPs from standing RSVPs, and any explicit per-occurrence override wins and stays put. A regular who wants to skip one Friday taps the override; their standing RSVP is unaffected for subsequent weeks.

v1 standing RSVPs take effect immediately — there is no "starting next month" future-start picker. Deferred-start is a v1.1 candidate if anyone asks.

### 2.9 Invitations

Three send paths with one acceptance flow:

- **Direct add** — admin picks a Playground user by name.
- **Email invite** — admin pastes addresses; the system emails each recipient a join link.
- **Shareable link** — admin creates a link with optional expiry and use cap; copies it; pastes wherever. Shareable links always grant Member role — to bring on a co-admin, use direct-add and then promote.

Rules a user will notice:
- Only one pending invite per (aggregate, recipient). A resend auto-revokes the prior one; the UI says so.
- A direct invite and an email invite to the same person collapse on accept — whichever is accepted kills the other.
- Joining via a link the user already redeemed is a no-op, not an error.
- Accepting a League invite puts the user on the League roster in the same moment. Accepting a Group invite just makes them a member; Groups handle one-off participants as free-text guests instead.
- The acceptance flow is atomic with chat membership — a new member sees the chat the moment they land.

**Join-via-invite preview** (anyone with a valid token, signed in or not): aggregate name, sport, admin list (narrowed for invite-only Groups), member count, "Invited by {name}" if known, expiry and remaining uses. The preview has two CTAs: **Accept** (becomes a member) and **Decline** (closes the invite and fires a decline-notification to the inviter for direct-add invites). A signed-out viewer sees the preview and is prompted to sign up before accepting; Decline works without signing in.

Member-count rule: public Leagues show the exact count. Invite-only Groups show a count rounded **down** to the nearest 5, with a minimum of 5. A Group with 8 members displays "5+ members," not "10 members."

### 2.10 Game result reporting (Leagues only)

When a League game ends, the captain records the score through the existing team-metadata form (this is the same form the app already uses for entering sport-specific game data). The new piece is a lightweight two-step workflow on top:

1. The captain enters the final score via the existing team-metadata form. Then taps **Report result**. The opposing captain is notified.
2. The opposing captain opens the game. If the score looks right, they tap **Confirm** — the result is final and standings update. If not, they tap **Dispute** — the report is deleted and the reporting captain starts over.

**Load-bearing constraint:** the score must be entered via the team-metadata form **before** Report result is tapped. If it isn't, the backend rejects the report with a "score not entered" error. The Report result surface must either gate on this (grey out until the score is entered) or embed the score form inline. See §6 UX1.

Rules:
- The captain who reported can't also confirm their own report. Admins can override (which is recorded for audit).
- Disputes are terminal — once disputed, the reporter re-enters the correct score and re-reports. Disputes are rate-limited so two captains can't ping-pong forever.
- A League Admin can step in at any point to confirm or dispute on a captain's behalf.
- Once confirmed, the result is final. Admins can delete a confirmed result only as a corrective action — copy nudges admins to "agree with both captains first, then re-enter."

**Forfeits bypass the confirmation step entirely.** An admin taps **Forfeit game** and picks the winning team. The game finalizes immediately — standings render a "W (forfeit)" for the winner and "L (forfeit)" for the loser. No score is recorded, no confirmation round.

v1 does not model double forfeits as a distinct outcome. For a both-teams-no-show situation, the admin cancels the game instead of forfeiting it. Double forfeit as a first-class outcome is a fast follow-up if commissioners ask for it.

### 2.11 Group game scoring

Group games use the existing score flow with no confirmation round. Maya enters the final score and the game is done. There is no Report / Confirm / Dispute cycle on a Group game — the UI must not surface those buttons.

### 2.12 Chat

Every League and every Group has one built-in chat room, members-only, auto-provisioned when the aggregate is created. Accepting an invite joins the chat; being removed from the aggregate removes the chat membership.

Chat roles: aggregate admins are chat admins; aggregate members are chat members. Moderation (delete a message, promote/demote, remove a member) reuses the chat UI that already exists — this feature does not ship a separate moderation surface.

Archived aggregates keep chat readable but block new messages. The compose bar must clearly explain why it's disabled.

### 2.13 Calendar sync

Any member of a League or Group can subscribe to its games in Google Calendar, Outlook, or Apple Calendar. The subscribe flow:

1. From the League/Group page, tap **Subscribe to calendar** — the modal shows a prefilled URL and a **Copy** button.
2. Paste the URL into the calendar client's "Add by URL" flow.

**The model is one token per user, one URL per aggregate.** A user in 3 Leagues and 2 Groups has one token but five distinct subscription URLs; they add each URL separately to their calendar client. This is a deliberate v1 simplicity choice — per-device or per-aggregate tokens are deferred.

Rotating the token happens under **Settings → Calendar sync**. Rotation invalidates the token for every URL the user previously added — all five subscriptions in the example above stop receiving events at once. The confirmation copy must state this in plain words ("All your calendar subscriptions will stop updating until you re-add each URL") — not "your token will be invalidated."

### 2.14 Notifications (17 types)

All delivered in-app; one is also emailed. Full copy catalog lives in §9.

| # | What happened                              | Who hears about it                          |
|---|---------------------------------------------|----------------------------------------------|
| 1 | You were invited                            | invitee (in-app + email)                     |
| 2 | Your invitation was accepted                | inviter                                      |
| 3 | Your direct invitation was declined         | inviter                                      |
| 4 | Your invite link was used                   | link creator                                 |
| 5 | You were added                              | new member                                   |
| 6 | You were removed                            | removed member                               |
| 7 | A season you're in changed status           | League members                               |
| 8 | A game you're in was scheduled              | participants                                 |
| 9 | A game you're in was rescheduled            | participants                                 |
|10 | A game you're in was cancelled              | participants                                 |
|11 | A game you're in was forfeited              | participants + team captains (deduped)       |
|12 | A recurring occurrence is coming up         | Group members                                |
|13 | Game starting in 2 hours                    | Yes-RSVPs + non-responders (Groups)          |
|14 | You were promoted off the waitlist          | promoted member                              |
|15 | Someone reported an issue with a game       | owning-aggregate admins + scorekeeper        |
|16 | Your game's result was reported             | opposing team's captain                      |
|17 | A game's result was confirmed               | game participants + League admins            |

v1 fans these out per-event. No daily digest.

---

## 3. Permissions

### 3.1 Roles in plain English

- **Viewer** — not signed in, or not a member. Can browse public Leagues and Organizations. Cannot see invite-only Groups. Cannot participate.
- **Member** — belongs to a League or Group. Plays in games, uses chat, RSVPs on Group occurrences, reports scores on games they captained, confirms the opposing captain's reports, subscribes to the calendar feed.
- **League / Group Admin** — runs the aggregate day-to-day. Creates/edits/archives it, manages members and invites, creates seasons (League), schedules games, creates recurring game nights (Group), creates placeholder members, forfeits games, confirms or deletes results on behalf of captains, moderates chat.
- **Organization Admin** — runs the Org. Creates Leagues under it, manages Org admins, and automatically has League Admin powers on every League under the Org without a separate promotion.

**Captain** is not a role in this sense. A captain is a labeled user on a team with exactly one system-enforced capability: confirm or dispute the opposing team's score report. Captains do not have admin powers over their team.

### 3.2 What each role can do

The table covers actions where the answer varies by role.

| Action                                            | Org Admin    | League/Group Admin | Member                     | Viewer |
|---------------------------------------------------|--------------|--------------------|----------------------------|--------|
| Create an Organization                            | any signed-in user | —            | —                          | —      |
| Edit Organization                                 | yes          | —                  | no                         | no     |
| Add / remove Org admins (≥1 always)               | yes          | —                  | no                         | no     |
| Create a League under an Org                      | yes          | —                  | no                         | —      |
| Create a standalone Group                         | any signed-in user | —            | —                          | —      |
| Edit / archive League or Group                    | yes (its orgs) | yes              | no                         | no     |
| Add / remove League/Group admins                  | yes          | yes                | no                         | no     |
| Send invites or create invite links               | yes          | yes                | no                         | no     |
| Create / delete a placeholder member              | yes          | yes                | no                         | no     |
| Accept any invite                                 | —            | —                  | becomes a member           | —      |
| Decline an invite                                 | —            | —                  | anyone with the token      | anyone with the token |
| Bring a guest (+1 via RSVP)                       | —            | yes                | yes                        | no     |
| Leave (last admin must promote first)             | yes (self)   | yes (self)         | yes (self)                 | —      |
| Remove a member                                   | yes          | yes                | no                         | no     |
| Create / edit / archive a Team                    | yes          | yes                | no                         | no     |
| Copy teams from a previous Season                 | yes          | yes                | no                         | no     |
| Create / edit / end a recurring game night        | —            | yes                | no                         | no     |
| Log a game from an occurrence                     | —            | yes                | any member                 | no     |
| Create / reschedule / cancel a scheduled game     | yes          | yes                | no                         | no     |
| Forfeit a game                                    | yes          | yes                | no                         | no     |
| RSVP on a Group occurrence                        | yes          | yes                | yes                        | no     |
| Enter / edit the final score on a game            | yes          | yes                | game participant           | no     |
| Report a League game result                       | yes          | yes                | game participant           | no     |
| Confirm / dispute a League game result            | yes          | yes                | opposing team's captain    | no     |
| Send / delete a chat message                      | yes          | yes                | yes (own messages only)    | no     |
| Moderate chat (remove member, promote/demote)     | yes          | yes                | no                         | no     |
| Subscribe to calendar / rotate token              | any user     |                    |                            | no     |
| Report an issue on a game                         | yes          | yes                | yes (if affected)          | no     |

Notes:
- "Affected" for game-issue reporting means a listed participant on the game or a member of a League the game belongs to.
- A user removed from a League or Group cannot act on it further, but their historical content stays intact.
- Placeholders are labels, not actors — they never appear in the permissions table.

---

## 4. Primary user stories

Each story names the happy path. Design agent chooses the exact interactions.

### 4.1 Rick spins up his League (setup)

Rick creates the Organization ("Dugout Bar & Grill Wiffleball"), then creates a League inside it ("Spring 2026 Wiffleball"), then creates the first Season. Timezone is pre-filled from his browser. Chat is ready the moment the League exists.

### 4.2 Rick invites 55 players (bulk onboarding)

Rick pastes 55 email addresses into the email-invite field. The system sends templated emails. As players accept, they appear on the roster and in the chat without further admin action. For three friends who won't sign up, Rick creates placeholder members. The members screen shows per-invite status (Sent / Accepted / Expired / Revoked) so he knows who to nudge.

### 4.3 Rick builds teams and schedules a Saturday (weekly op)

Inside Spring 2026, Rick creates six teams — name, color, captain, roster from League members and placeholders. Then he creates the Saturday schedule: a multi-date form where he can enter "Red vs Blue 10am, Green vs Gold 11:30, Yellow vs Black 1pm" and repeat it weekly for 10 weeks in one sitting.

### 4.4 A captain reports a score, the other confirms (game op)

Red beats Blue 12–7. Red's captain opens the game, enters the final score through the existing team-metadata form, and taps **Report result**. Blue's captain gets a notification, opens the game, sees the score, and taps **Confirm**. Standings update immediately.

If Blue's captain disputes instead (with an optional note like "it was actually 11–7"), the report is cleared. Red's captain re-enters the correct score and re-reports.

### 4.5 Rick forfeits a no-show game

Red doesn't show up. Rick taps **Forfeit game**, picks Blue as the winner, confirms. The game is final. Standings reflect the forfeit. No confirmation round.

### 4.6 Maya creates a Group and a Friday series

Maya creates the Group — name, sport, timezone — pastes in six email addresses, and creates her first recurring game night: Fridays 7pm, 2 hours, Lincoln Park, cap 8.

### 4.7 Maya's regulars set a standing RSVP

Two of her regulars tap "I'm in every Friday" once on the series page. Their Yes auto-fills future occurrences. One regular needs to skip this Friday — she taps No on that one occurrence and the override sticks; her standing Yes is unaffected for next week.

### 4.8 Maya logs Friday's game

Friday afternoon: Maya sees the occurrence card with the RSVP list (4 Yes, 1 Maybe, 1 Waitlist, 2 no-response). Pre-game reminders go out 2h before. After the game, Maya taps **Log this game's result**. The system materializes the occurrence into a real game with all Yes-RSVPs and their guests pre-filled. Maya picks sides and enters the score. Game is done.

### 4.9 A member subscribes to the calendar

From the League page, a player taps **Subscribe to calendar**, copies the URL, pastes it into Google Calendar's "Add by URL." Games appear in their calendar. Later, the same URL works on their phone's calendar app. If they ever need to rotate the token, Settings → Calendar sync tells them every device will stop until they re-add it.

### 4.10 Rick archives the season's League

End of Spring season. Rick archives the League. The confirmation copy explains what that means: history stays, schedule and standings freeze, chat goes read-only, admins can still retag historical games if needed. Rick can create a new League under the same Org for Fall.

---

## 5. Page inventory

What screens need to exist. Routes, layouts, and componentization are the design agent's call.

### Organization

- Public Org page — header, admin list, nested list of Leagues, role-appropriate CTAs.
- Create / edit Organization form.
- Org admins management — promote, demote, remove (always ≥1).

### League

- League page — public for public Leagues, members-only otherwise. Tabs: Seasons, Members, Current Season Teams, Chat, Schedule, Standings. Admin surfaces: Settings, Invite tracking.
- Create / edit League form — required timezone picker.
- Members management — real + placeholder members, per-invite status, search and filter once roster exceeds one screen.
- Invite tracking — pending links (expiry + remaining uses), sent email invites with per-recipient status, resend / revoke / convert-to-placeholder actions.
- Archive confirmation (destructive; typed confirm of the League name).

### Season

- Season page — three tabs: History (past games), Schedule (future games), Standings. Admin surfaces appear on Schedule and Standings.
- Create / edit Season form.
- Copy teams from previous Season — pick source, preview (teams and captains), confirm.

### Group

- Group page — members-only. Primary surfaces: Next games, Members, Chat, Game Series. Primary CTA: Log a game.
  - Teams does **not** appear as a primary nav item — Groups have no persistent team templates. This is a deliberate subtractive decision so the casual flow isn't cluttered by a feature Maya doesn't want.
- Create / edit Group form — required timezone.
- Members management — no captain field.
- Invite tracking — same shape as League's.

### Game series (Groups only)

- Series list — inside the Group page. Active series first; archived collapsed below.
- Create / edit series form — with the recurrence constraints from §2.7.
- Upcoming occurrences — per-occurrence: date/time, RSVP counts, Log this game, Skip this date.
- Standing RSVP toggle — prominent, on the series page.

### Teams (Leagues only)

- Teams list — inside the Season page.
- Create / edit team form — name, color, captain picker (from this team's roster), player picker (from the League roster).

### Existing pages that gain affordances

- **Create-game flow** — optional picker for "is this game in a League or a Group?" If League, also surface the active Season. Picker lists only aggregates the user can post games into.
- **Game page** — new:
  - League/Season or Group breadcrumb.
  - Report result / Confirm / Dispute buttons (League games, role-gated).
  - Forfeit game (admin only).
  - Report an Issue (affected users).
  - For games materialized from a recurring occurrence: breadcrumb back to the series.
- **Discover page** — Organizations surface as a top-level tab or primary section. Public Leagues appear nested under their Org. Invite-only Groups never appear.
- **User profile** — optional list of the Leagues and Groups the user belongs to.
- **User settings** — Calendar sync section: token preview, rotate action with device-wide-breakage warning.

### Chat

- Uses the existing chat panel. One room per aggregate. Archived-aggregate state shows a disabled compose bar with explanatory copy.

### Join-via-invite

- Token-gated preview page — works for signed-in and signed-out viewers. Two CTAs: Accept (routes signed-out viewers through signup/signin and returns them to accept) and Decline (closes the invite immediately; the inviter is notified for direct-add invites).

---

## 6. UX risks and open questions

The risks below are mine to flag, not Product's to resolve — they're the UX gotchas most likely to bite this feature if design doesn't address them head-on.

**UX1 — Score reporting feels like two steps.** The captain enters the final score in the existing sport-specific form, then separately taps **Report result**. If these surface as two disconnected buttons, users will hit **Report result** and wonder what it did (they already saved the score, right?), or save the score and never report. The fix: the Report Result CTA must be a single wizard that shows the score form inline, with one submit labeled "Report and notify opposing captain." Treat this as load-bearing — if it ships as two steps, expect weekly confusion from captains.

**UX2 — Five distinct outcome states that can look identical if we're careless.** A League game at any moment is in one of these visual states:

1. **Score not entered yet** — no team-metadata score, no report.
2. **Score entered, not yet reported** — team metadata populated, but neither captain tapped Report.
3. **Reported, awaiting confirmation** — GameResult exists; opposing captain sees Confirm / Dispute.
4. **Confirmed as a win** — standings reflect a winner.
5. **Confirmed as a draw** (sports that allow draws only) — standings reflect a draw for both teams.

Plus forfeit: **Forfeit (W/L)** — single winner, skips confirmation entirely.

Each must render distinctly in copy and visually. The worst failure mode: a tied soccer game (draw-capable sport) renders as "no winner yet," making it indistinguishable from a basketball game where the score was never entered. The UI needs the sport's draw-allowance signal (per-sport metadata) and the game's owning-aggregate signal to pick the right copy.

**UX3 — Group games must not show Report/Confirm buttons.** The score flow on Group games is just "enter score, done." Don't render those buttons based on "is this game finalized?" — that predicate is shared with League games. Branch on the **per-viewer capability** the backend exposes on each game (whether the viewer can report the result for this specific game). That signal returns null for Group games by design, so the branch is trivial if you use it. Falling back to an aggregate-id null-check is the brittle path.

**UX4 — Calendar token rotation is scarier than it sounds.** The model is one token per user, but one subscription URL per aggregate — so rotating breaks **every** URL the user added across **every** calendar client. A user in 5 Leagues/Groups loses 5 subscriptions in one tap. The confirmation copy has to say so in plain words, and should enumerate the affected subscriptions where possible. Otherwise users rotate casually and then report "all my calendars stopped working."

**UX5 — Dispute is all-or-nothing.** A dispute wipes the entire report; the reporter re-enters and re-reports from scratch. Real arguments tend to be over one inning, not every inning. v1 has no partial dispute. The rate limit prevents ping-pong abuse. Acceptable for v1; revisit if it generates support volume.

**UX6 — Pre-game reminders at fixed 2h.** Notification #13 fires 2h before every game for every Yes-RSVP and every non-responder. For a weekly Friday Group that's ~52 pings a year per person per series. No opt-out in v1. Worth at least flagging to dogfooders and adding a per-series or per-user mute as fast follow-up.

**UX7 — Removed member sees calendar silently empty.** A user removed from a Group will see their calendar feed keep working but stop populating that Group's games. They'll notice eventually. The in-app removal notification is the real signal — but the silent calendar experience will generate confused "my calendar broke" tickets.

**UX8 — Demoting an Org Admin cascades silently.** Org Admins implicitly hold League Admin powers on every League under the Org. Demoting them from Org Admin strips those implicit powers with no warning. If Rick demotes Dana from Org Admin, Dana loses League Admin on every League Rick runs — and may not notice until she tries to edit a Schedule and sees a permission error. The demote flow must show a confirmation listing the Leagues Dana will lose access to, plus a notification to the demoted user.

**UX9 — Captain swap between Report and Confirm.** A captain gets removed from a team (or swapped) between reporting a result and the opposing captain confirming it. The former captain no longer has the capability to confirm/dispute. The UI must surface "You are no longer the captain of {team}" when they return to the game page, and route the Confirm/Dispute actions to whoever is now captain (or admin). Not a common case — but happens at season-edge trades or roster shuffles.

**UX10 — The Report-result wizard hides a two-mutation flow.** UX1's fix (wrap Enter Score + Report Result into a single CTA) doesn't eliminate the two underlying backend calls. Partial failures — score saved, report failed; or vice versa — must be handled gracefully by the wizard. If the score succeeds and the report fails, the wizard must retry the report (not the score) and not tell the user to re-enter scores. Error copy must distinguish these cases so captains don't resubmit data that's already saved.

**Open questions** (design agent or content design resolves):

1. **Season-picker behavior on create-game** — auto-select the active Season if unambiguous, or always prompt?
2. **"Next games" horizon on a Group page** — how many upcoming occurrences to show?
3. **Organizations on Discover** — top-level tab or filter? Casual-persona review strongly prefers top-level. Design confirms.
4. **Notification channel matrix** — which notifications go to push, email, in-app badge, silent? Load-bearing for the reschedule/cancel flow especially; shipping with silent-only would reproduce the Facebook problem this feature is meant to solve.
5. **Search and filter on members** — once a League has 40+ members, scrolling stops working. Real members and placeholders should sort intermixed with a clear visual distinction.
6. **Invite preview privacy for invite-only Groups** — show the full admin list, or only the inviting admin's name? A hostile forwarder exposes every admin to unwanted contact. Design agent picks.
7. **Placeholder privacy warning copy** — firm enough that admins think twice before creating placeholders for people who would object. Content design owns wording.
8. **Guest vs placeholder at play time** — adding Jamie, a one-off, must not force Maya through the placeholder dialog (which carries a privacy warning). Picker UX needs to make this distinction legible without a decision tree.
9. **Multi-date schedule form shape** — Rick's primary use is "10 Saturdays × 3 games in one sitting." A single-date form is a regression from a spreadsheet. Design agent specs the multi-date form.
10. **Home-screen quick-log for casual Groups** — Maya's actual pocket experience on Friday at 7pm is not "navigate into the Group page." Design agent picks the entry surface.
11. **Standings on a brand-new Season** — empty table, "no games played" copy, or all teams at 0-0?
12. **Co-admin concurrency** — a minimum "last edited by Dana 2 min ago" affordance on games, teams, and scheduled games would keep Rick and Dana from ping-ponging edits. Full audit history is out of scope, but a single field would help.

---

## 7. Out of scope (v1)

Named explicitly so we don't scaffold surfaces for features that won't ship.

**Stats & analytics**
- Elo or any rating system.
- Sport-specific aggregate stats at the season or league level (batting average, points per game, etc.).
- Player-level standings. Per-member attendance totals.
- Season Recap / champion labels / frozen snapshots.
- Cross-season player stats / career records.
- Standings tie-breakers beyond alphabetical.

**Scheduling & tournaments**
- Recurring schedules for League games (Leagues schedule each week by hand).
- Auto-matchup generation (round-robin, Swiss, seeding).
- Bracket views. Tournament entities.
- Bulk reschedule actions ("shift all games by a week").
- Refresh-roster-from-template as a batch action.
- Multi-day recurring series ("Tuesdays and Thursdays" = two series).
- Monthly or custom-interval recurrence.
- One-off reschedule on a series occurrence beyond skip + re-create.
- Admin-attached free-text note on reschedule / cancel / forfeit notifications.

**Container & permissions**
- Divisions.
- Multi-sport Leagues.
- Org-scoped team templates.
- Team logos, jersey numbers, positions.
- Open-join for any aggregate (always explicit: admin-add, link, email, or placeholder).
- Hard delete for any long-lived container. All soft-archive.
- Public Groups (always invite-only in v1).
- Cross-League or cross-Group player sharing.
- Captain as a permission tier beyond "confirm opposing team's score."
- Automatic last-admin transfer (last admin must manually promote another first).
- Roster caps (no min, no max, no warnings).
- Unavailability declarations.
- Co-admin audit trail / "last edited by" (though see UX open question 12).
- Tag proposals (admins can't propose tags on others' games in v1).
- Game correction entity — replaced by the notification-only "Report an Issue."

**Placeholder identity**
- Any linkage between a placeholder and a real user — not at signup, not admin-initiated, not user-initiated.
- Automatic detection of "this signing-up user is our placeholder."
- Historical stats transfer from a placeholder to a newly signing-up user.

**Chat & messaging**
- Per-game chat.
- Per-occurrence chat auto-creation.
- Mute a member (the workflow is remove-and-re-add).
- DMs initiated from a League/Group page.
- Digest notifications (daily or weekly).
- Per-team channels.

**Auth & identity**
- Social-provider login.
- Magic-link / passwordless login.
- Account deletion UX (handled at platform scope; Leagues only enforces graceful tombstoning).
- "Players with your name" pre-signup lookup.

**Calendar**
- Writeback — calendar-client edits don't sync back.
- CalDAV.
- Per-device calendar tokens (one per user).
- Attendee-RSVP sync between Playground and the calendar client.

---

## 8. Copy discipline

- **"League" vs "Group" is absolute.** Every user-facing string — page titles, navigation, CTAs, empty states, errors, notifications, emails — renders by aggregate type. The UI never says "casual league" or "group season."
- **"Season" vs "Year" is absolute.** Groups never show the word "Season." A Group's year view is a calendar-year bucket over past games, labeled by year.
- **Role labels** (Admin, Member, Captain) need translation keys. Captain appears as a badge but never in role-picker forms — captain is set per-team.
- **Status labels** need keys, and must not be mixed across entities. Seasons are Active or Completed (no Archived). Leagues and Groups are Active or Archived (no Completed). Invites are Sent, Accepted, Expired, or Revoked. RSVPs are Yes, No, Maybe, or Waitlist.
- **Recurrence summaries** need composable keys to survive plural/grammar rules: "Every Friday at 7:00 PM starting March 15" in English may be two or three separate phrases in another locale.
- **Placeholder-related copy** — badge text ("Placeholder" or "No account"), and the privacy-warning prose at creation time.
- **Calendar sync copy** — "Subscribe to calendar," "Copy calendar link," "Rotate token," rotation-warning prose.
- **Score-result copy** — "Report result," "Waiting for {captain name} to confirm," "Confirmed by {name}," "Disputed by {name} — please re-enter," "Self-confirm blocked — wait for the other captain," "Admin override — {name} confirmed."
- **Email invite template** — subject and body with League/Group name and inviter name interpolation. Deliverability is backend's; copy is frontend's.

---

## 9. Error handling and empty states

Inline errors the UI must render in plain English:

- **Sport mismatch** — "This League is for basketball. This game is wiffleball."
- **Sport immutability** — "Sport can't be changed after the League is created."
- **Timezone missing** — "Please choose a timezone."
- **Invite link expired / revoked / full** — "This invite has expired." / "...has been revoked." / "...has reached its use limit."
- **Last admin leaving** — "You're the last admin. Promote another member first."
- **Promoting a placeholder** — "Placeholder members can't be promoted — they don't have an account."
- **Player not on the roster** — "Add this person to the League first, or create a placeholder."
- **Cross-League player on a team** — "This player belongs to a different League."
- **Deleting a Season with games** — "This Season has games and can't be deleted. Mark it Complete instead, or delete its games first."
- **No score entered on Report** — "Please enter the final score before reporting."
- **Self-confirm blocked** — "The opposing captain needs to confirm. You can't confirm your own report."
- **Dispute rate-limited** — "You recently disputed this result. Try again later."
- **Confirm before report** — "The result hasn't been reported yet."
- **Re-report a confirmed result** — "This result is already confirmed. Ask an admin to correct it."
- **Writing to an archived aggregate** — "This {League/Group} is archived and can't be edited."
- **RSVP on a capped occurrence** — "You're on the waitlist — we'll promote you if a spot opens."
- **Recurrence constraint violations** — "Only weekly or biweekly recurrence is supported." / "Series can't extend past 5 years." / "Series can't exceed 260 occurrences."
- **Race on Log this game** — the second attempt silently resolves to the same game as the first.
- **Forfeit on a Group game** — the action shouldn't be offered. Defensive copy if it leaks through: "Forfeits apply to League games only."
- **Stale write (concurrent edit)** — "This was updated by someone else. Refresh to see the latest, then try again." Applies to League, Group, Season, Team, recurring-game-night edits where two admins may be editing at once.
- **Report-an-issue rate limited** — "You recently reported an issue on this game. Please wait before reporting again."
- **Removing a placeholder with game history** — "This placeholder has played in games. You can remove them from the current roster — their past games stay as-is."
- **Joining an archived aggregate** — "This {League/Group} is archived and isn't accepting new members."
- **Organization archive attempt** — "Organizations can't be archived in v1. To retire an Org, archive its Leagues instead."

Empty states worth designing for explicitly:

- Standings on a brand-new Season. See UX open question 11.
- Schedule tab when no games are scheduled yet.
- Members list before the first invite goes out.
- Group home before the first recurring game night is set up.
- Calendar sync when no Leagues or Groups are joined yet.
