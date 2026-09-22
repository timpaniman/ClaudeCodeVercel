# Kevin Community Alumni Portal — Design Brief v2 (English UI)

> Use this brief in Claude Design to explore visual improvements. The portal is already built and running; this is a **redesign of specific parts**, not a new product. English is now the default language (Korean is available through a language switch), so all screens below are shown with their English labels.

## 1. Product in one paragraph
A private, mobile-first web portal for alumni and current students of the Kevin Community course (KAIST AI Graduate School). About 500 people, mostly **CEOs and executives aged 40–60**, mostly on phones. They sign in with an emailed code (no password), browse **course resources** (PDFs, code, videos, links), read **announcements**, look up **fellow alumni** by cohort, and manage their **profile** and email notification settings. Administrators (the professor and staff) upload resources, post announcements, manage the roster and approve sign-ups.

## 2. What must stay the same (constraints)
- **Mobile first.** Design at 375 px wide first; desktop uses a 240 px left sidebar; mobile uses a 5-tab bottom bar.
- **Readable for 40–60 year-olds:** body text 16 px or larger, touch targets at least 44 px, high contrast, no tiny gray-on-gray text, pinch-zoom must stay enabled.
- **Dark theme only** (current), calm and professional. Polite, understated tone.
- **Fast and simple:** every screen should have one obvious primary action.
- **Long English labels:** navigation and buttons now use English text such as "Announcements", "Pending approval", "Publish + notify". Layouts must not break at 320–375 px.
- **Content is bilingual:** resource titles, announcements and names are entered by administrators in Korean or English; the UI must handle both (no fixed-width assumptions, wrap long titles).
- Must keep working as an installable PWA (home-screen icon, standalone display).

## 3. Current design system (starting point)
| Token | Value |
|-------|-------|
| Brand color | Green — solid buttons/logo `#16a34a` (Tailwind green-600), hover `#22c55e` (green-500); focus rings, accents and active-tab underlines also use `#22c55e` |
| Background | near-black `#030712` (Tailwind gray-950); cards `white/5` with `white/10` borders |
| Text | white for headings, `gray-200/300` body, `gray-400/500` secondary |
| Radius | 12 px inputs/buttons, 16 px cards, full-round chips |
| Type | Inter (Latin) with system Korean fallback (Malgun Gothic / Apple SD Gothic) |
| Icons | Lucide, 16–22 px |
| Status colors | emerald = success/published, amber = warning/draft, red = error |
| Cohort badges | a small rounded chip; color varies by cohort number |

## 4. Screens (English labels as they appear today)
**Member area** — bottom tabs: Home · Library · Announcements · Members · Me
1. **Sign in** — logo, email field, consent checkbox, "Send verification code"; then a 6-digit code screen ("Enter your verification code", "Resend code (59s)"). Language switcher (English / 한국어) below.
2. **Pending approval** — shown to people not on the roster: request form (name, cohort, company) and status message.
3. **Home** — greeting ("Welcome, {name}") with cohort badge, resource search, latest announcements (max 3, unread dot, pinned pin), "New resources — Last 7 days" list, shortcut to the admin area for administrators.
4. **Library** — search, cohort chips (All / Common / Cohort 1…17, locked chips for cohorts the student can't access), category tabs (Lecture, Code, Video, Reference, Assignment), week and sort dropdowns, resource list (file-type icon, title, cohort badge, category, week, date, download count), "Show more".
5. **Resource detail** — title, meta line, tags, description, in-page viewer (PDF/image/video embed/code), Download or Open link button.
6. **Announcements** — list (pinned first, unread dot, date, excerpt) and detail (Markdown body).
7. **Members** — cohort grid (badge + member count), cohort member list, name/company/title search, member cards with links.
8. **Me** — profile form (name, company, title, about, GitHub, LinkedIn, website), email notification switches, language switcher, "Add to home screen" hint, account info, sign out.
9. **Unsubscribe** — confirmation page opened from email links.

**Admin area** — top tab bar: Dashboard · Roster · Resources · Announcements · Pending approval
10. **Dashboard** — 4 KPI cards, weekly activity line chart, mobile-vs-desktop donut, activity by cohort bars, top-10 resources, email notification status and recent sends.
11. **Roster** — CSV drop zone with preview table (New / Existing / Duplicate / Error rows), confirm bar, registered roster table with search.
12. **Resources** — list with filters (All / Published / Unpublished), bulk publish, per-row actions; upload/edit form (title, category, cohort, week, file drop zone or external link, tags, description, publishing options).
13. **Announcements** — list with publish/pin/edit/delete; editor with Markdown preview and publishing options.
14. **Pending approval** — cards with cohort picker, Approve/Reject, bulk approve.

## 5. Design change requests (fill in before starting)
> The professor wants to change **some** of the design. Replace this section with the specific changes wanted, for example:
- [ ] Overall look: (e.g., lighter theme option? more distinctive brand color? more spacious layout?)
- [ ] Screens to redesign first: (e.g., Home, Library, Sign in)
- [ ] Navigation: (e.g., different bottom bar labels/icons; shorter label than "Announcements")
- [ ] Anything that should feel different: (e.g., friendlier, more premium, more "app-like")
- [ ] Anything to keep exactly as is:

## 6. Deliverables wanted from Claude Design
1. Mobile (375 px) and desktop (≥1024 px) mockups for the screens chosen above, in **English**, with realistic sample content (mix of Korean and English titles).
2. A short list of design tokens that changed (colors, radius, type scale, spacing) so they can be applied through the existing Tailwind config.
3. States for each redesigned screen: empty, loading, error, and long-text.
4. Handoff notes: component list and any interaction details (the implementation is Next.js + Tailwind; icons from Lucide).

## 7. How the result will be implemented
The team implements approved designs directly in the existing code (Next.js 14, Tailwind). All visible text lives in `src/messages/en/*.json` and `src/messages/ko/*.json`, so copy changes are easy; layout and style changes are made in the components under `src/features/**` and `src/components/**`.
