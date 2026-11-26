---
id: SPEC-0008
title: Cabeçalho do app, troca de organização, menu da conta e menu em folha no celular
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 1.2
owner: Joao Izidoro
satisfies: [RF-04a, RN-01, RN-02, RNF-08, RNF-16, RNF-18]
depends_on: [SPEC-0002, SPEC-0005, SPEC-0006]
phase: MVP
ticket: -
---

# SPEC-0008 — Cabeçalho do app, troca de organização, menu da conta e menu em folha no celular

## 1. Purpose

Every page inside an organization (`/orgs/{id}/…`) shares one app header and one main navigation. As built, the
header holds a "Trocar organização" link, two buttons that do nothing (search and add), and, on narrow screens, a
button that opens the navigation as a panel sliding from the left. Nothing in the app lets the professional see
which organization is open, switch organizations without leaving the page, change the theme or sign out.

The owner redesigned the header (mockups of 2026-11-25, `docs/img/SPEC-0008/header-desktop.png` and
`docs/img/SPEC-0008/header-mobile.png`). This spec covers it: the header names the open organization and lets the
professional switch to another one (RF-04a: "quando possuir mais de um, pode selecionar entre eles"; RFC §2.7 as amended, §9 Q1); an
account menu gives the e-mail, the profile, the theme and sign-out (RN-01, RNF-08); and on narrow screens the
navigation opens as a sheet rising from the bottom of the screen (RNF-16). Every control must be usable by keyboard
and screen reader (RNF-18). This spec changes no API, contract or stored data.

## 2. Scope

**In scope**
- The app header on every page inside an organization, on wide screens (48rem and wider, RNF-16 `md`) and on
  narrow screens (narrower than 48rem).
- The organization switcher: the open organization's initial and name, which lead to the organization list, and a
  separate button that opens a menu to switch organization or create one.
- The account menu: the user's e-mail, "Perfil", the "Tema" choice (Sistema, Escuro, Claro) and "Sair".
- The main navigation on narrow screens, as a bottom sheet in place of today's left-side panel.
- Removing from the header the search button, the add button and the "Trocar organização" link.
- Removing from the navigation (sidebar and sheet) the profile block at its top (initials "LB", "user name",
  "ver perfil").

**Out of scope**
- The wide-screen sidebar's look, items, groups, widths and its "Barra lateral" behavior choice (hover, expanded,
  collapsed). They stay as built. Only the profile block leaves it.
- The navigation items themselves: their labels, icons, order, the disabled "em breve" entries and translating
  their labels (§9 Q9).
- The profile page `/@me` and editing name, photo or contact data: the RF-04 spec.
- A profile photo in the account button: the RF-04 spec (§9 Q5).
- Global search and quick add: their own specs when the owner asks for them. The search icon of `/services`
  (SPEC-0005 §4) is part of that page, not of the header, and stays.
- The notification bell: post-MVP (SPEC-0005 §9 Q20).
- Pages outside an organization: the organization list `/orgs`, `/create-tenant`, `/@me` and the sign-in pages.
  Their layout is unchanged.
- Animation of the sheet and the menus (§9 Q7).
- Storing the theme in the user's account: the spec that first uses the user's `preferences` (§9 Q2).
- Any API endpoint, contract or stored data.

**Dependencies**
- SPEC-0002 (Implemented): the bottom sheet it introduced for narrow screens. This spec uses the same sheet for the
  navigation.
- SPEC-0005 (Implemented): its §2 put "any change to the shared header" out of its scope (§9 Q20 there). This spec
  is that change. It amends no text of SPEC-0005.
- SPEC-0006 (Implemented): the client list, where switching organization lands (§9 Q4).
- Built without a spec and used as is: the organization list page `/orgs`, the organization selection the server
  checks (membership and status), the sign-out endpoint, the "current user" endpoint, and the cookie consent banner
  with its "preferências" category.

## 3. Domain rules

- **R1.** The header names the organization that is open, as the server confirmed it when the page opened. It
  never names an organization the user does not belong to. (RF-04a: "todos os dados operacionais ficam vinculados
  ao tenant ativo"; RN-02)
- **R2.** The organization menu lists only the organizations the signed-in user belongs to, as the server returns
  them. Deleted organizations are not listed (api-convention, Lists). Only active ones can be opened; suspended ones
  are listed and cannot be chosen. (RF-04a; RN-02; statuses as built on `/orgs`)
- **R3.** Opening another organization goes through the server's selection, which checks membership and status.
  Hiding or disabling an entry in the menu is not the check. (RN-02; RNF-07)
- **R4.** "Sair" ends the session on the server, which invalidates the refresh token, and clears the session and
  the active organization in the browser. Afterwards every page inside an organization asks to sign in. (RN-01;
  RNF-08: "refresh tokens rotativos e invalidados no logout"; RFC §6: "invalidação de sessões ou tokens em caso de
  logout")
- **R5.** The theme is one of Sistema, Escuro or Claro. Sistema follows the device's setting. The choice applies to
  the whole app at once. It is remembered across visits only when the user allowed "preferências" cookies;
  otherwise it lasts until the page reloads. (owner decision, 2026-11-25, §9 Q2; RFC §6: "preferências de
  interface". No RF names a theme choice. The user's `preferences` column stays unused here)
- **R6.** Narrow and wide screens split at 48rem (RNF-16 `md`). Below it, the header has a menu button and the
  navigation opens as a bottom sheet; from it up, the navigation is the sidebar and there is no menu button.
  (RNF-16; owner decision, 2026-11-25)
- **R7.** Every header control, menu entry and sheet control is reachable and usable by keyboard, has an accessible
  name and a visible focus outline. Menus and the sheet return focus to the button that opened them when they
  close without navigating. (RNF-18: "navegação por teclado, foco visível, … botões com nome acessível")
- **R8.** The organization menu and the account menu open as menus anchored to their button on every width, not as
  sheets. (owner decision, 2026-11-25)

## 4. Behavior

### 4.1 Header

1. On a wide screen the header shows, left to right: the Planici logo, a "/" divider, the organization switcher;
   and, at the right end, the account button. There is no menu button. The logo is an image named "Planici", not a
   link (§9 Q3).
2. On a narrow screen the header shows the organization switcher at the left; and, at the right, one group with
   the menu button and the account button. There is no logo and no divider.
3. The organization switcher is one bordered control with two parts:
   - the organization's initial (its name's first character, upper-cased, in a small square) and its name, which
     together are one link to the organization list `/orgs`, named "{name}, ver todas as organizações" (§9 Q8);
   - a button with an up-and-down chevron icon, named "Trocar organização", which opens the organization menu
     (§4.2).
4. A name too long for the space shows on one line, cut with "…". The header never wraps or scrolls sideways. The
   link's accessible name holds the full name.
5. The account button shows a person icon, is named "Menu da conta" and opens the account menu (§4.3).
6. The search button, the add button and the "Trocar organização" link are gone.
7. The header stays across pages of the same organization; it does not reload or flash when the professional moves
   between them.

### 4.2 Organization menu

1. The chevron button opens a menu under the switcher, titled "Organizações". Each time it opens, it loads the
   user's organizations again and lists them in the order the server returns them (the order of `/orgs`) (§9 Q13).
2. While the list loads, the menu shows "Carregando suas organizações...". If it fails, the menu shows the error's
   message and a "Tentar novamente" entry that loads it again.
3. Each organization shows its initial and name. The open one is marked as selected. A suspended one shows
   "Suspensa" and cannot be chosen; arrow keys still reach it and it is announced as disabled (§9 Q12).
4. Below the list, after a divider, "Criar organização" leads to `/create-tenant`.
5. Choosing the open organization closes the menu and changes nothing.
6. Choosing another active organization closes the menu and asks the server to select it. While it waits, the
   chevron button is disabled and announced as busy, and no second choice can start. When the server accepts, the
   browser goes to that organization's client list (`/orgs/{id}/clients`, §9 Q4), and the header names it.
7. When the server refuses (the organization was suspended or removed, or the user lost access), or fails, or
   cannot be reached, a toast shows the error's message (§6), the professional stays on the page they were on, and
   the chevron button works again.
8. When the session has expired and cannot be renewed, loading the list or choosing an organization leads to the
   sign-in page, which returns to the current page after signing in.
9. Escape closes the menu, and focus returns to the chevron button.

### 4.3 Account menu

1. The account button opens a menu under it, aligned to its right edge, holding top to bottom:
   - the user's e-mail, in bold. It is text, not an entry that can be chosen;
   - a divider, then "Perfil", with a person icon, which leads to `/@me`;
   - a divider, then the group "Tema" with three choices: "Sistema", "Escuro", "Claro". The current one is marked;
   - a divider, then "Sair".
2. While the e-mail loads, its line shows "Carregando". When the session has expired and cannot be renewed, the
   browser goes to the sign-in page, which returns to the current page after signing in. On any other failure the
   e-mail line is left out and the other entries still work.
3. Choosing a theme applies it to the whole app at once and marks it. The menu stays open. With no stored choice,
   "Sistema" is marked.
4. Choosing "Sair" shows "Saindo…" on that entry, disables it, and asks the server to end the session.
   - When the server answers, with success or with an error, the browser goes to the sign-in page. The session and
     the active organization are cleared in the browser either way (R4).
   - When the server cannot be reached, a toast shows "Não foi possível conectar ao servidor. Confira sua conexão e
     tente novamente.", the menu entry returns to "Sair", and the professional stays signed in on the same page.
5. Signing in again lands on the organization list `/orgs`, as any sign-in does today.
6. Escape closes the menu, and focus returns to the account button.

### 4.4 Navigation on narrow screens

1. The menu button, named "Abrir menu", opens the navigation as a sheet attached to the bottom edge of the screen,
   over a dimmed page. The sheet is titled "Menu" and holds:
   - the sidebar's navigation entries, with their labels always shown, grouped as in the sidebar: groups are
     separated by dividers and named for assistive technology only, with no visible heading (as the sidebar is
     built, §9 Q9);
   - then "Configurações" (disabled, as today);
   - then a "Fechar" button.
2. The entry of the current page is marked as current.
3. The sheet does not hold the "Barra lateral" behavior choice; it applies only to wide screens.
4. When the sheet opens, focus moves into it. Keyboard focus stays inside it while it is open, and the page behind
   it does not scroll.
5. The sheet is at most 85% of the screen's height; longer content scrolls inside it.
6. The sheet closes when the professional chooses a navigation entry (and the page changes), presses "Fechar",
   presses Escape, taps the dimmed page or swipes the sheet down. Except after choosing a navigation entry, focus
   then returns to the menu button.
7. When the screen widens to 48rem or more while the sheet is open, the sheet closes and the sidebar shows.

### 4.5 Navigation on wide screens

1. The sidebar is as built, except that its profile block is gone: it starts with the first navigation group.

## 5. Permissions and tenant isolation

No server check changes. The header, menus and sheet only call endpoints that exist and enforce membership, status
and session on the server (R3). In the MVP every organization has one user, its owner, and a user may own several organizations (RFC §2.7 as
amended, §9 Q1).

| Action | Unauthenticated | Member | Owner | Other organization |
| --- | --- | --- | --- | --- |
| Open a page inside an organization | redirected to sign-in | — (post-MVP) | 200 | not-found page, no header naming it (R1, AC-0008-19) |
| List organizations (organization menu) | 401 → sign-in page (AC-0008-48) | — | 200, own organizations only | never listed (AC-0008-18) |
| Select an organization (organization menu) | 401 → sign-in page (AC-0008-16) | — | 200 | 404 `tenant.not-found` → toast, stays (AC-0008-47) |
| Read own e-mail (account menu) | 401 → sign-in page (AC-0008-46) | — | 200, own e-mail only | — (user data, not organization data) |
| Sign out | — | — | 204 (AC-0008-28, AC-0008-51) | — |

## 6. Errors

No new errors. These existing ones now show in the header's menus:

| Situation | Status | Error key | Where it shows |
| --- | --- | --- | --- |
| Chosen organization is suspended | 403 | `tenant.inactive` | toast (§4.2 step 7) |
| Chosen organization no longer exists, or the user is not (or no longer) a member | 404 | `tenant.not-found` | toast |
| User's role does not allow it | 403 | `tenant.forbidden` | toast. Not returned by the selection today (MVP has owners only); listed for post-MVP roles |
| Session expired, or its token invalid or expired, and it cannot be renewed (list, selection, e-mail) | 401 | `session.expired`, `token.invalid`, `token.expired` | sign-in page, returning to the current page (§4.2 step 8, §4.3 step 2) |
| Unexpected failure | 500 | `unexpected` | list: inside the organization menu, with "Tentar novamente"; selection: toast; e-mail: line left out |
| Server cannot be reached | — | `network.unavailable` | list: inside the organization menu, with "Tentar novamente"; selection and sign-out: toast; e-mail: line left out |

A sign-out request that reaches the server ends on the sign-in page whatever it answers (§4.3 step 4). Copy is the
existing pt-BR and en-US copy of these keys (for example `tenant.inactive`: "Esta organização está suspensa e não
pode ser aberta no momento."). Statuses follow the endpoints as built.

## 7. Contract impact

None. No request, response or error shape changes; the header reads the user's e-mail from the existing
"current user" response and the organizations from the existing list response.

New pt-BR / en-US copy (proposed keys; `/plan` may rename them). en-US says "workspace", as the existing
`tenants.list.*` copy does; pt-BR says "organização":

| Key | pt-BR | en-US |
| --- | --- | --- |
| `shell.org.allOrganizations` | {name}, ver todas as organizações | {name}, see all workspaces |
| `shell.org.menuTitle` | Organizações | Workspaces |
| `shell.nav.open` | Abrir menu | Open menu |
| `shell.nav.title` | Menu | Menu |
| `shell.account.open` | Menu da conta | Account menu |
| `shell.account.profile` | Perfil | Profile |
| `shell.account.theme` | Tema | Theme |
| `shell.account.themes.system` | Sistema | System |
| `shell.account.themes.dark` | Escuro | Dark |
| `shell.account.themes.light` | Claro | Light |

Reused copy: `tenants.list.switch` ("Trocar organização" / "Switch workspace", the chevron button's name),
`tenants.list.loading`, `tenants.list.retry`, `tenants.list.create`, `tenants.list.statuses.suspended`,
`common.loading`, `common.close`, `dashboard.sign-out` ("Sair" / "Sign out"), `dashboard.signing-out` ("Saindo…" /
"Signing out…"), and the error keys of §6. The logo keeps its existing name "Planici".

The mockups' English labels ("profile", "Theme", "System", "Sign out") are placeholders; the copy above replaces
them.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Header, wide | ready | Logo (image, not a link), "/", switcher (initial, name, chevron), account button | `shell.org.allOrganizations`, `tenants.list.switch`, `shell.account.open` |
| Header, narrow | ready | Switcher; group with menu button and account button | as above, `shell.nav.open` |
| Header | organization loading | Not shown: the page shows nothing until the organization is confirmed (as built) | — |
| Header | long organization name | One line, cut with "…"; full name in the link's accessible name | `shell.org.allOrganizations` |
| Organization menu | loading | "Carregando suas organizações..." | `tenants.list.loading` |
| Organization menu | error | Error message and "Tentar novamente" | §6 keys, `tenants.list.retry` |
| Organization menu | success | Title, organizations (open one selected; suspended ones disabled with "Suspensa"), divider, "Criar organização" | `shell.org.menuTitle`, `tenants.list.statuses.suspended`, `tenants.list.create` |
| Organization menu | only one organization | That organization, selected; divider; "Criar organização" | as above |
| Switcher | switching | Chevron button disabled, announced busy | — |
| Switcher | switch refused or failed | Toast with the error's message; button enabled | §6 keys |
| Account menu | e-mail loading | "Carregando" in the e-mail line | `common.loading` |
| Account menu | e-mail failed (not 401) | E-mail line left out | — |
| Account menu | success | E-mail (bold), "Perfil", "Tema" with three choices (current marked), "Sair" | `shell.account.*`, `dashboard.sign-out` |
| Account menu | signing out | "Saindo…", disabled | `dashboard.signing-out` |
| Account menu | sign-out unreachable | Toast; "Sair" enabled again | `network.unavailable` |
| Navigation sheet | open | Title "Menu", entries with labels grouped by dividers, current entry marked, "Configurações" disabled, "Fechar" | `shell.nav.title`, `common.close` |
| Navigation sheet | content taller than the sheet | Scrolls inside the sheet | — |
| Sidebar, wide | ready | As built, without the profile block | — |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~The RFC disagrees with itself on organizations per user: RFC §2.7 said "tenant único por usuário" and "Criação de um espaço de trabalho por profissional", and prevails over other sections; RF-04a and RFC §4.1 allow several organizations per user, and the app as built supports several.~~ | **Decided (owner, 2026-11-25):** Amend the two §2.7 rows (Autenticação, Tenant) in RFC.md and RFC-segmented to allow one or more organizations per user, with switching between them; one user per organization stays MVP. Done with this version of the spec. Rejected: keep §2.7 and reduce the organization menu to the open organization plus "Criar organização". | — |
| 2 | ~~Where is the theme choice stored? No RF names a theme choice; RFC §6 lists "preferências de interface" as stored user data, and `users.preferences jsonb` exists in the schema with no spec using it.~~ | **Decided (owner, 2026-11-25):** The theme choice is an owner decision (R5). It stays in the browser only, remembered across visits only with "preferências" cookie consent (as built). Storing it in `users.preferences` belongs to the spec that first uses that column (for example the RF-04 profile spec). Rejected: store it in the account now (adds API and contract work). | — |
| 3 | Is the logo a link? The mockup does not say. | No: an image named "Planici". A link can come when the app has a dashboard. | No |
| 4 | Where does switching organization land? | The new organization's client list, as the organization list `/orgs` does today. Rejected: the same section in the new organization (for example `/services`), since sections may differ per organization later (RF-43). | No |
| 5 | The account button shows a person icon on a pink background in both mockups. Is the pink its resting look or its "menu open" look? Should a profile photo replace the icon when there is one? | Pink (the brand's subtle background) is its resting look on every width. Icon only; the photo comes with the RF-04 profile spec. | No |
| 6 | Does the theme menu say that the choice will not be remembered when "preferências" cookies were refused? | No. The cookie preferences already explain it; a hint can come with a settings page. | No |
| 7 | The owner asked for the navigation to "come up" from the bottom. Does it slide up, and do the menus animate? The sheet as built has no animation. | The sheet is attached to the bottom edge and has no animation in this spec. Motion comes with the app-wide motion work, and must respect reduced motion. | No |
| 8 | The org switcher's link names the organization but leads to the organization list. Is that clear enough for screen-reader users? | Its accessible name says both: "{name}, ver todas as organizações". The chevron button is "Trocar organização". | No |
| 9 | The sidebar's entries, group names and several accessible names are fixed Portuguese text, not translated copy, and the group names are not visible headings. The sheet shows them the same way. | Out of scope: the sheet groups entries as the sidebar does. The new controls of this spec use translated copy. Translating the navigation and showing group headings is a follow-up. | No |
| 10 | Does sign-out ask for confirmation? RN-25 ("validação de operações críticas") covers agenda, payments, permissions, deletion and settings, not sign-out. | No confirmation. | No |
| 11 | Where do the mockups live? They show the header on both widths and the account menu on a wide screen; there is no mockup of the organization menu or the navigation sheet. | Copied from the owner's message into `docs/img/SPEC-0008/`. The owner judges the organization menu and the sheet in manual checks M-7 and M-8. A Figma link replaces the mockups when there is one. | No |
| 12 | Do arrow keys skip a suspended organization in the organization menu? | No: they reach it and it is announced as disabled (WAI-ARIA menu pattern), so screen-reader users learn it exists and why it cannot be opened. | No |
| 13 | Is the organization list loaded once per page or each time the menu opens? | Each time it opens, so a status changed elsewhere (for example a suspension) shows without reloading the page. | No |

## 10. Acceptance criteria

UI criteria. "Wide screen" is a viewport 1280px wide; "narrow screen" is 375px wide. Unless a criterion says
otherwise: the user "ana@example.com" is signed in, owns the active organizations "Studio Ana" (open) and "Clínica
Bia" and the suspended organization "Espaço Caio", and is on the client list of "Studio Ana". The user
"bia@example.com" owns the organization "Ateliê Duda". "Named" means the control's accessible name; "in order"
means document order. Position on screen, truncation marks, font weight, colours, focus outlines and the sheet's
placement are checked by the manual checks after the criteria, not by automated tests.

```gherkin
AC-0008-01
Given a wide screen
When  the page loads
Then  the header holds, in order: an image named "Planici" that is not a link, a link named "Studio Ana, ver
      todas as organizações" showing "S" and "Studio Ana", a button named "Trocar organização" and a button named
      "Menu da conta"
And   the header has no button named "Abrir menu", no search button, no add button and no other link to "/orgs"
```

```gherkin
AC-0008-02
Given a narrow screen
When  the page loads
Then  the header holds, in order: the link named "Studio Ana, ver todas as organizações", the button named
      "Trocar organização", and one group holding a button named "Abrir menu" and a button named "Menu da conta"
And   the header has no image named "Planici", no search button and no add button
```

```gherkin
AC-0008-03
Given the open organization is named with 80 characters
When  the page loads
Then  the organization link is named with the full 80-character name followed by ", ver todas as organizações"
```

```gherkin
AC-0008-04
Given the open organization is named "ótica Lima"
When  the page loads
Then  the switcher's initial shows "Ó"
```

```gherkin
AC-0008-05
When  the user activates the link named "Studio Ana, ver todas as organizações"
Then  the browser is on "/orgs", which shows "Suas organizações"
```

```gherkin
AC-0008-06
When  the user activates the button named "Trocar organização"
Then  a menu titled "Organizações" opens, listing "Studio Ana", "Clínica Bia" and "Espaço Caio" in the order of
      "/orgs", followed by "Criar organização"
And   "Studio Ana" is marked as selected
And   the button reports itself as expanded
```

```gherkin
AC-0008-07
Given the organization list has not answered yet
When  the user opens the organization menu
Then  the menu shows "Carregando suas organizações..."
```

```gherkin
AC-0008-08
Given the organization list fails with "unexpected"
When  the user opens the organization menu
Then  the menu shows "Não foi possível concluir agora. Tente novamente em instantes." and an entry "Tentar novamente"
```

```gherkin
AC-0008-09
Given the organization list failed once and now succeeds
When  the user chooses "Tentar novamente" in the organization menu
Then  the menu lists "Studio Ana", "Clínica Bia" and "Espaço Caio"
```

```gherkin
AC-0008-10
When  the user opens the organization menu
Then  "Espaço Caio" shows "Suspensa" and is disabled
And   choosing it sends no selection request and leaves the browser on the client list of "Studio Ana"
```

```gherkin
AC-0008-11
When  the user chooses "Clínica Bia" in the organization menu
Then  the browser goes to the client list of "Clínica Bia"
And   the header shows "C" and "Clínica Bia"
```

```gherkin
AC-0008-12
When  the user chooses "Studio Ana" in the organization menu
Then  the menu closes
And   no selection request is sent and the browser stays on the client list of "Studio Ana"
```

```gherkin
AC-0008-13
Given the selection of "Clínica Bia" has not answered yet
When  the user chooses "Clínica Bia" in the organization menu
Then  the button named "Trocar organização" is disabled and reports itself busy
And   while that selection is pending, no second selection request is sent
```

```gherkin
AC-0008-14
Given "Clínica Bia" was suspended after the menu loaded, so its selection fails with "tenant.inactive"
When  the user chooses "Clínica Bia" in the organization menu
Then  a toast shows "Esta organização está suspensa e não pode ser aberta no momento."
And   the browser stays on the client list of "Studio Ana" and the header shows "Studio Ana"
And   the button named "Trocar organização" is enabled
```

```gherkin
AC-0008-15
Given the server cannot be reached
When  the user chooses "Clínica Bia" in the organization menu
Then  a toast shows "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente."
And   the browser stays on the client list of "Studio Ana"
```

```gherkin
AC-0008-16
Given the session has expired and cannot be renewed
When  the user chooses "Clínica Bia" in the organization menu
Then  the browser goes to the sign-in page with the client list of "Studio Ana" as the page to return to
```

```gherkin
AC-0008-17
When  the user chooses "Criar organização" in the organization menu
Then  the browser is on "/create-tenant"
```

```gherkin
AC-0008-18
Given "bia@example.com" owns "Ateliê Duda" and "ana@example.com" is not a member of it
When  "ana@example.com" opens the organization menu
Then  "Ateliê Duda" is not listed
```

```gherkin
AC-0008-19
Given "ana@example.com" is not a member of "Ateliê Duda"
When  "ana@example.com" opens the client list of "Ateliê Duda" by its address
Then  the not-found page shows
And   no header showing "Ateliê Duda" is rendered
```

```gherkin
AC-0008-20
When  the user activates the button named "Menu da conta"
Then  a menu opens holding, in order: "ana@example.com", "Perfil", the group "Tema" with "Sistema", "Escuro" and
      "Claro", and "Sair", with separators between them
And   "ana@example.com" is not a menu entry that can be chosen
```

```gherkin
AC-0008-21
Given the current user's data has not answered yet
When  the user opens the account menu
Then  the e-mail line shows "Carregando"
```

```gherkin
AC-0008-22
Given the current user's data fails with "unexpected" or the server cannot be reached
When  the user opens the account menu
Then  no e-mail line is shown
And   "Perfil", the three theme choices and "Sair" are shown and can be chosen
```

```gherkin
AC-0008-23
When  the user chooses "Perfil" in the account menu
Then  the browser is on "/@me"
```

```gherkin
AC-0008-24
Given no theme choice is stored and the device is set to dark
When  the user opens the account menu
Then  "Sistema" is marked
And   the app shows the dark theme
```

```gherkin
AC-0008-25
Given the app shows the light theme
When  the user chooses "Escuro" in the account menu
Then  the app shows the dark theme without reloading
And   "Escuro" is marked and the account menu is still open
```

```gherkin
AC-0008-26
Given the user allowed "preferências" cookies
And   chose "Escuro" in the account menu
When  the page reloads
Then  the app shows the dark theme and "Escuro" is marked
```

```gherkin
AC-0008-27
Given the user refused "preferências" cookies and the device is set to light
And   chose "Escuro" in the account menu
When  the page reloads
Then  the app shows the light theme and "Sistema" is marked
```

```gherkin
AC-0008-28
When  the user chooses "Sair" in the account menu
Then  the browser goes to the sign-in page
And   opening the client list of "Studio Ana" by its address afterwards leads to the sign-in page
```

```gherkin
AC-0008-29
Given the sign-out request answers 500
When  the user chooses "Sair" in the account menu
Then  the browser goes to the sign-in page
And   opening the client list of "Studio Ana" by its address afterwards leads to the sign-in page
```

```gherkin
AC-0008-30
Given the sign-out request has not answered yet
When  the user chooses "Sair" in the account menu
Then  the entry shows "Saindo…" and is disabled
And   choosing it again sends no second sign-out request
```

```gherkin
AC-0008-31
Given the server cannot be reached
When  the user chooses "Sair" in the account menu
Then  a toast shows "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente."
And   the browser stays on the client list of "Studio Ana"
And   the entry shows "Sair" and is enabled
```

```gherkin
AC-0008-32
Given a narrow screen
When  the user activates the button named "Abrir menu"
Then  a dialog named "Menu" opens
And   it holds the entries of the groups named "Agenda", "Trabalho" and "Contas", each entry with its label,
      then "Configurações" disabled, then a "Fechar" button
And   the button named "Abrir menu" reports itself as expanded
```

```gherkin
AC-0008-33
Given a narrow screen
When  the user opens the navigation sheet
Then  "Clientes" is marked as the current page
And   no "Barra lateral" control and no profile block (initials, user name, "ver perfil") are in the sheet
```

```gherkin
AC-0008-34
Given a narrow screen and the navigation sheet is open
When  the user chooses "Serviços"
Then  the browser is on the service list of "Studio Ana"
And   the navigation sheet is closed
```

```gherkin
AC-0008-35
Given a narrow screen and the navigation sheet is open
When  the user activates "Fechar"
Then  the navigation sheet is closed
And   focus is on the button named "Abrir menu"
```

```gherkin
AC-0008-36
Given a narrow screen and the navigation sheet is open
When  the user presses Escape
Then  the navigation sheet is closed
And   focus is on the button named "Abrir menu"
```

```gherkin
AC-0008-37
Given a narrow screen and the navigation sheet is open
When  the user taps outside the sheet
Then  the navigation sheet is closed
And   focus is on the button named "Abrir menu"
```

```gherkin
AC-0008-38
Given a narrow screen and the navigation sheet is open
When  the user presses Tab repeatedly
Then  focus moves only among the sheet's controls
```

```gherkin
AC-0008-39
Given a narrow screen and the navigation sheet is open
When  the viewport widens to 1024px
Then  the navigation sheet is closed
And   the sidebar is shown
```

```gherkin
AC-0008-40
Given a wide screen
When  the page loads
Then  the sidebar's first item is the first navigation entry, "Agenda Rápida"
And   the sidebar shows no initials, no "user name" and no "ver perfil"
```

```gherkin
AC-0008-41
Given a narrow screen
When  the user opens the account menu
Then  it opens as a menu, not as a dialog or sheet
```

```gherkin
AC-0008-42
Given the account menu is open
When  the user presses Escape
Then  the account menu is closed
And   focus is on the button named "Menu da conta"
```

```gherkin
AC-0008-43
Given the organization menu is open with focus on "Studio Ana"
When  the user presses the Down arrow key
Then  focus moves to "Clínica Bia"
```

```gherkin
AC-0008-44
Given a wide screen and focus at the start of the page
When  the user presses Tab repeatedly
Then  focus reaches, in order, the organization link, the button named "Trocar organização" and the button named
      "Menu da conta"
```

```gherkin
AC-0008-45
Given an en-US locale
When  the user opens the account menu
Then  it shows "Profile", the group "Theme" with "System", "Dark" and "Light", and "Sign out"
```

```gherkin
AC-0008-46
Given the session has expired and cannot be renewed
When  the user opens the account menu
Then  the browser goes to the sign-in page with the client list of "Studio Ana" as the page to return to
```

```gherkin
AC-0008-47
Given "Clínica Bia" was removed after the menu loaded, so its selection fails with "tenant.not-found"
When  the user chooses "Clínica Bia" in the organization menu
Then  a toast shows "Esta organização não está mais disponível para sua conta. Atualize a lista e escolha outra."
And   the browser stays on the client list of "Studio Ana" and the header shows "Studio Ana"
```

```gherkin
AC-0008-48
Given the session has expired and cannot be renewed
When  the user opens the organization menu
Then  the browser goes to the sign-in page with the client list of "Studio Ana" as the page to return to
```

```gherkin
AC-0008-49
Given the organization menu is open
When  the user presses Escape
Then  the organization menu is closed
And   focus is on the button named "Trocar organização"
```

```gherkin
AC-0008-50
Given "ana@example.com" belongs only to "Studio Ana"
When  the user opens the organization menu
Then  the menu lists only "Studio Ana", marked as selected, followed by "Criar organização"
```

```gherkin
AC-0008-51
When  the user chooses "Sair" in the account menu
Then  renewing the session afterwards with the refresh token it held is refused with 401
```

```gherkin
AC-0008-52
Given the organization menu is open with focus on "Clínica Bia"
When  the user presses the Down arrow key
Then  focus moves to "Espaço Caio", which is announced as disabled
```

```gherkin
AC-0008-53
Given a narrow screen
When  the user opens the organization menu
Then  it opens as a menu, not as a dialog or sheet
```

```gherkin
AC-0008-54
Given the user opened and closed the organization menu
And   "Espaço Caio" was reactivated since
When  the user opens the organization menu again
Then  "Espaço Caio" can be chosen
```

Note: the API already invalidates the refresh token on sign-out, and its sign-out end-to-end test covers that.
For AC-0008-51 the web side must send that token when signing out.

**Manual checks on a running system** (owner, before `status: Implemented`; automated tests cannot check them):

| Check | What to look at |
| --- | --- |
| M-1 | At 1280px the header matches `docs/img/SPEC-0008/header-desktop.png`: logo at the left, "/", switcher, account button at the right end. At 375px it matches `header-mobile.png`: switcher at the left, the group with the menu and account buttons at the right. |
| M-2 | The account menu matches the menu in `header-desktop.png`: e-mail in bold, dividers, "Tema" label, the current theme marked. |
| M-3 | Swiping the navigation sheet down on a touch device closes it (§4.4 step 6). |
| M-4 | The page behind the open sheet does not scroll (§4.4 step 4). |
| M-5 | Both themes keep text and icons of the header, menus and sheet at WCAG AA contrast. |
| M-6 | Focus outlines are visible on every header control, menu entry and sheet control in both themes. |
| M-7 | The navigation sheet is attached to the bottom edge, over a dimmed page, at most 85% of the screen's height, and scrolls inside when its content is taller (phone in landscape). The owner judges its look (no mockup). |
| M-8 | At 375px both menus open anchored under their button and stay inside the screen. The owner judges the organization menu's look (no mockup). |
| M-9 | On a 320px-wide screen the header neither wraps nor scrolls sideways, and an 80-character organization name is cut with "…". |
| M-10 | Moving between pages of the same organization, the header does not reload or flash (§4.1 step 7). |

## 11. Implementation plan

_Written by `/plan`, 2026-11-25; revised after the plan review, 2026-11-26. Draft until the owner approves it._

Web only. No contract, persistence or API change (§7). Bracketed and grouped route segments (`[lang]`,
`(private)`, `[tenant]`) are written as `*` in the scope block, because the lock matches bash globs and `[...]`
would be read as a character class.

### Scope

```scope
apps/web/src/app/*/orgs/_components/header.tsx
apps/web/src/app/*/orgs/_components/org-switcher.tsx
apps/web/src/app/*/orgs/_components/account-menu.tsx
apps/web/src/app/*/orgs/_components/shell.tsx
apps/web/src/app/*/orgs/_components/sidebar/sidebar.tsx
apps/web/src/app/*/orgs/_components/sidebar/content.tsx
apps/web/src/app/*/orgs/*/tenant-gate.tsx
apps/web/src/hooks/use-media-query.ts
apps/web/src/lib/api/me.ts
apps/web/src/lib/api/signed-out.ts
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
apps/web/tests/shell-harness.tsx
apps/web/tests/shell-header.test.tsx
apps/web/tests/org-menu.test.tsx
apps/web/tests/account-menu.test.tsx
apps/web/tests/nav-sheet.test.tsx
apps/web/tests/tenant-gate.test.tsx
apps/web/tests/auth-session-route.test.ts
apps/web/tests/proxy.test.ts
```

The spec file itself is always writable under the lock, so it is not listed.

Not in scope and not changed: `components/ui/sheet.tsx`, `components/ui/menu.tsx`, `components/ui/dropdown.tsx`,
`lib/api/tenants.ts`, `lib/api/login.ts`, `app/api/**`, `proxy.ts`, `tenant-picker.tsx`,
`sidebar/sidebar-mode-dialog.tsx`, `sidebar/use-sidebar-mode.ts`, `components/consent/**`. They are used as
built. If one of them turns out to need a change, `/implement` stops and asks.

### Contracts

None. No schema or error code changes. The e-mail comes from the existing `GET /api/auth/me`
(`MeResponseSchema`), the organizations from `GET /api/tenants` (`listTenants`), the switch from
`PUT /api/tenants/active` (`selectTenant`), and sign-out from `DELETE /api/auth/session` (`logout`).

New i18n keys, namespace `shell`, in `packages/i18n/messages/pt-BR.json` and `en-US.json`, exactly as §7:
`shell.org.allOrganizations`, `shell.org.menuTitle`, `shell.nav.open`, `shell.nav.title`, `shell.account.open`,
`shell.account.profile`, `shell.account.theme`, `shell.account.themes.{system,dark,light}`. Reused:
`tenants.list.{switch,loading,retry,create,statuses.suspended}`, `common.{loading,close}`,
`dashboard.{sign-out,signing-out}`, and the `validation.*` messages of the §6 error keys through `useFieldError`.

### Persistence

None. Rollback loses nothing. The theme stays in the browser's `theme` storage key, governed by the existing
consent sync (R5).

### API

None. Existing server behavior the ACs rely on, already covered by API end-to-end tests (not changed):
- `apps/api/test/e2e/auth.e2e-spec.ts` `drops the session on logout`: after `POST /v1/auth/logout`, refreshing
  with the same refresh token answers 401 (AC-0008-51, RNF-08).
- `apps/api/test/e2e/tenants.e2e-spec.ts`:
  - `lists only the caller’s workspaces` and `excludes deleted tenants and inactive memberships, but shows
    suspended tenants`: the list (AC-0008-18, R2).
  - `hides another user’s workspace (RN-02)`: `GET` / `PATCH /v1/tenants/:id` answer not found for another user's
    organization. `PUT /api/tenants/active` calls that `GET`, so this covers the selection's isolation
    (AC-0008-19, AC-0008-47).
  - `refuses a suspended workspace`: the selection's `tenant.inactive` (AC-0008-14).

### Web (`apps/web/src/app/[lang]/(private)/orgs/`)

1. **Breakpoint** (`src/hooks/use-media-query.ts`): add `NAV_WIDE_QUERY = "(min-width: 48rem)"` and
   `useWideNav()` = `useMediaQuery(NAV_WIDE_QUERY, true)`. `48rem` is exactly Tailwind v4's `md`, which the wide
   sidebar's `hidden md:block` uses, so the header, the sheet and the sidebar switch together at any default font
   size (RNF-16 `md`). A `px` query would leave a band with neither menu button nor sidebar for users with an
   enlarged default font. The existing `useWideScreen` (1024px, SPEC-0002) is unchanged.
2. **Signed-out errors** (new `src/lib/api/signed-out.ts`): `isSignedOut(error)` is true for `session.expired`,
   `token.invalid`, `token.expired` (the set `tenant-gate.tsx` and `tenant-picker.tsx` already use). Only the new
   code uses it; the two existing copies are left as they are (no refactor in this spec).
3. **Current user** (new `src/lib/api/me.ts`): `getMe(): Promise<{ ok: true; user: MeResponse } | ApiFailure>`,
   `GET /me` on the existing `sessionClient` (base `/api/auth`, so a 401 renews the session once before failing),
   parsed with `MeResponseSchema`, failures through `apiFailure`.
4. **Active organization** (`[tenant]/tenant-gate.tsx`): the `ready` state keeps the `Tenant` that `selectTenant`
   returned, and the gate renders its children inside a new `ActiveTenantContext`. Exported hook
   `useActiveTenant(): Tenant` (throws outside the gate). Loading, missing and error states are unchanged, so the
   header is never rendered before the server confirmed the organization, nor for another user's one (R1,
   AC-0008-19).
5. **Header** (`_components/header.tsx`, rewritten): a `<header>` (banner) with:
   - wide (`useWideNav()` true): `Logo` (existing `components/logo.tsx`, an image named "Planici", not a link), a
     `/` divider with `aria-hidden`, `OrgSwitcher`, and at the right end `AccountMenu`;
   - narrow: `OrgSwitcher`, then one `role="group"` container (unnamed, mockup's bordered pair) holding the menu
     button and `AccountMenu`. The menu button: `ref={navButtonRef}`, `aria-label={t("shell.nav.open")}`,
     `aria-expanded`, `aria-haspopup="dialog"`, `onClick` → `onOpenNav`. No `aria-controls`: the sheet's popup is
     unmounted while closed, so the reference would dangle.
   - Props: `navOpen`, `onOpenNav`, `navButtonRef`. The search button, add button and "Trocar organização" link
     are deleted.
   - The header is never server-rendered (the gate renders after a client request), so choosing the variant from
     `matchMedia` causes no hydration mismatch or flash (P-4).
6. **Organization switcher** (new `_components/org-switcher.tsx`), one bordered, raised control:
   - `Link` (`@/i18n/navigation`) to `/orgs`, `aria-label={t("shell.org.allOrganizations", { name })}`, holding the
     initial square (`aria-hidden`) and the name (`truncate`, `min-w-0`, `title={name}`). Initial: first code point
     of the trimmed name, `toLocaleUpperCase(locale)` (AC-0008-04).
   - Base UI `Menu.Root` (controlled `open`) / `Menu.Trigger` (chevrons-up-down icon,
     `aria-label={t("tenants.list.switch")}`). The popup (role `menu`) is anchored `bottom`/`start` on every width
     (R8) and, as Base UI does, is named by its trigger, "Trocar organização".
   - **Title.** Base UI's `Menu.GroupLabel` only renders inside a `Menu.Group`, is `aria-hidden` itself, and names
     its group. So the popup's content is one `Menu.Group` whose visible `Menu.GroupLabel` is "Organizações"
     (`shell.org.menuTitle`), wrapping every state (loading, error, list). The group is named "Organizações".
   - The popup's content component mounts on each open and requests `listTenants()` (P-1). States: loading
     (`tenants.list.loading`, a non-item status line), error (the error's message and a "Tentar novamente"
     `Menu.Item` with `closeOnClick={false}` that requests again), success.
   - Success: inside the group, `Menu.RadioGroup value={activeTenant.id}`, one `Menu.RadioItem` per organization
     (initial, name, and `tenants.list.statuses.suspended` when suspended), `disabled` unless
     `status === "active"`, `closeOnClick` (so choosing the open one also closes the menu, P-5). After the group,
     `Menu.Separator` and `Menu.LinkItem render={<Link href="/create-tenant" />}` "Criar organização".
   - **Pending switch (P-8).** While switching, the trigger is not natively `disabled`: a disabled button would
     drop focus to `body` when the menu closes onto it, and keep it there after a refusal (R7). It gets
     `aria-disabled="true"` and `aria-busy="true"`, and `onOpenChange` ignores any request to open while
     switching. The menu closes on the choice and Base UI returns focus to the trigger, which stays focusable.
   - Choosing another active organization: if a switch is pending, ignore; else set `switching`, call
     `selectTenant(id)`. On `ok`: `router.push(\`/orgs/${id}/clients\`)` then `router.refresh()` (as
     `tenant-picker.tsx`). On `isSignedOut(error)`: `router.replace({ pathname: "/login", query: { next: pathname } })`.
     Otherwise: `toast.show(message(error), "danger")` and clear `switching`. Choosing the open one sends
     nothing.
   - Error text: `message(error) = fieldError(error) ?? fieldError("unexpected") ?? ""`, because `fieldError`
     returns `string | undefined` and `toast.show` needs a string. The account menu uses the same fallback.
   - A signed-out failure of `listTenants()` also goes to the sign-in page (AC-0008-48).
7. **Account menu** (new `_components/account-menu.tsx`): Base UI `Menu`, trigger `aria-label={t("shell.account.open")}`,
   person icon, resting background `bg-background-brand-subtlest` (hover/pressed tokens), popup anchored
   `bottom`/`end` on every width (R8).
   - E-mail: requested with `getMe()` the first time the menu opens and kept in the component's state while it
     stays mounted; a failure is requested again on the next open (P-2). Rendered as the bold `Menu.GroupLabel` of
     the first `Menu.Group`, which holds "Perfil". Because the label is `aria-hidden` and names its group, the
     e-mail reaches assistive technology as the name of that group. Loading → label `common.loading`.
     `isSignedOut` → sign-in page with `next`. Any other failure → the group has no label (AC-0008-22).
   - "Perfil": `Menu.LinkItem render={<Link href="/@me" />}`, person icon.
   - "Tema": `Menu.Group` labelled `shell.account.theme`, `Menu.RadioGroup value={theme ?? "system"}`
     `onValueChange={setTheme}` from `next-themes`' `useTheme()`; three `Menu.RadioItem` (default
     `closeOnClick={false}`, so the menu stays open, AC-0008-25). Persistence is the existing
     `ThemeProvider` + `ThemeConsentSync` (R5); nothing new is stored.
   - "Sair": `Menu.Item closeOnClick={false}`, `disabled` and label `dashboard.signing-out` while signing out.
     `await logout()`: resolved (any status) → `router.replace("/login")` then `router.refresh()` (P-3); rejected
     (network) → `toast.show(message("network.unavailable"), "danger")`, back to "Sair".
   - `Menu.Separator` between the groups, as the mockup.
8. **Shell** (`_components/shell.tsx`): owns `navButtonRef = useRef<HTMLButtonElement>(null)` and passes it to
   the header (the menu button) and to the sidebar (the sheet's focus return). Passes `navOpen` / `onOpenNav` to
   the header; keeps `isSidebarOpen`, the close-on-route-change effect and the providers. No other change.
9. **Navigation sheet** (`_components/sidebar/sidebar.tsx`): the `<dialog id="mobile-sidebar">` and its manual
   `showModal` / overflow effects are replaced by the existing `Sheet` (`components/ui/sheet.tsx`, SPEC-0002):
   `open={isSidebarOpen && !wide}`, `title={t("shell.nav.title")}`, `closeLabel={t("common.close")}`,
   `finalFocus={navButtonRef}`, children `<SidebarContent expanded onNavigate={onClose} />`.
   - **Focus return (P-9).** Nothing opens the sheet through a Base UI trigger, so without `finalFocus` Base UI
     returns focus to whatever had it when the sheet mounted. That is `body` wherever a click does not focus the
     button (Safari on macOS and iOS, jsdom). `finalFocus={navButtonRef}` fixes that, as `field-list.tsx` does.
     Base UI still skips focus return after an outside tap in browsers without `focus({ preventScroll })` support
     (Chrome Android, Samsung Internet). So the Sheet's `onClose` (Escape, outside press, swipe-down, "Fechar") is
     `closeAndRefocus`: it calls `onClose` and then, on the next animation frame,
     `navButtonRef.current?.focus({ preventScroll: true })`. Choosing a navigation entry closes through
     `onNavigate` and the shell's route-change effect, which do not refocus (§4.4 step 6).
   - Base UI traps focus while the sheet is open and marks the rest of the page `aria-hidden` or inert. The
     `matchMedia` effect that closes on wide becomes `useEffect(() => { if (wide) onClose(); }, [wide, onClose])`
     with `wide = useWideNav()` (AC-0008-39). The wide sidebar (`aside`) and `SidebarModeDialog` are unchanged.
10. **Sidebar content** (`_components/sidebar/content.tsx`): the profile block (`LB`, "user name", "ver perfil")
    is deleted. Groups, items, `aria-current`, the disabled entries and "Configurações" are unchanged (§9 Q9).

### Tests

New `tests/shell-harness.tsx` builds on `forms-harness.tsx` (axios adapter `on` / `callsTo`, `stubFetch`,
`i18nNavigationMock`, `nextNavigationMock`, `router`, `navigatedTo`): it renders `AppShell` (or one header part)
inside `NextIntlClientProvider` (pt-BR or en-US), `ThemeProvider` (`attribute="data-theme"`,
`storageKey="theme"`, `enableSystem`), `ConsentProvider initial={…}` + `ThemeConsentSync`, and the
`ActiveTenantContext` / `TenantGate`. Its own `matchMedia` stub:
- answers `min-width` queries in `px` and in `rem` (1rem = 16px) for a settable width (375 / 1280 / 1024);
- answers `(prefers-color-scheme: dark)` for a settable device theme;
- fires `change` listeners when the width changes (AC-0008-39).

It also exports `networkDown`, a route handler that throws `new AxiosError("Network Error", "ERR_NETWORK")` with no
response. Through the axios adapter, `apiFailure` then returns `network.unavailable`; through `stubFetch`, `fetch`
rejects (AC-0008-15, -22, -31). A plain `Error` would give `unexpected`. Fixtures: "Studio Ana" (open), "Clínica
Bia", "Espaço Caio" (suspended), user `ana@example.com`.

How the keyboard criteria are tested, since jsdom does not move focus on Tab and user-event is not installed:
- AC-0008-44 checks the header's tabbable controls in document order, as `form-fields.test.tsx` does.
- AC-0008-38 checks that, while the sheet is open, the header and main content are `aria-hidden` or inert, and that
  focusing the sheet's trailing `data-base-ui-focus-guard` moves focus to the sheet's first control.
- AC-0008-37 presses the sheet's viewport outside its popup (the `clickOutside` pattern of `form-fields.test.tsx`),
  which Base UI treats as a virtual click. The phone case is a manual check (Deferred checks).

| AC | File | Test name |
| --- | --- | --- |
| AC-0008-01 | `tests/shell-header.test.tsx` | `AC-0008-01 wide: logo image (not a link), organization link, Trocar organização, Menu da conta, in order; no menu, search, add or other /orgs link` |
| AC-0008-02 | `tests/shell-header.test.tsx` | `AC-0008-02 narrow: organization link, Trocar organização, then a group with Abrir menu and Menu da conta; no logo, search or add` |
| AC-0008-03 | `tests/shell-header.test.tsx` | `AC-0008-03 an 80-character name names the link in full, followed by ", ver todas as organizações"` |
| AC-0008-04 | `tests/shell-header.test.tsx` | `AC-0008-04 "ótica Lima" shows the initial "Ó"` |
| AC-0008-05 | `tests/shell-header.test.tsx` | `AC-0008-05 the organization link goes to /orgs` |
| AC-0008-06 | `tests/org-menu.test.tsx` | `AC-0008-06 Trocar organização opens a menu holding a group named "Organizações" with the three organizations in order, then Criar organização; Studio Ana checked; trigger expanded` |
| AC-0008-07 | `tests/org-menu.test.tsx` | `AC-0008-07 while the list is pending the menu shows "Carregando suas organizações..."` |
| AC-0008-08 | `tests/org-menu.test.tsx` | `AC-0008-08 an unexpected list failure shows its message and Tentar novamente` |
| AC-0008-09 | `tests/org-menu.test.tsx` | `AC-0008-09 Tentar novamente requests the list again and shows it` |
| AC-0008-10 | `tests/org-menu.test.tsx` | `AC-0008-10 Espaço Caio shows "Suspensa", is disabled, and choosing it sends no selection` |
| AC-0008-11 | `tests/org-menu.test.tsx` | `AC-0008-11 choosing Clínica Bia selects it and navigates to its client list`; and in `tests/tenant-gate.test.tsx`: `AC-0008-11 the header names the organization the gate selected after the id changes` |
| AC-0008-12 | `tests/org-menu.test.tsx` | `AC-0008-12 choosing the open organization closes the menu and sends no selection` |
| AC-0008-13 | `tests/org-menu.test.tsx` | `AC-0008-13 while a selection is pending the trigger is aria-disabled and aria-busy, activating it opens nothing, and no second selection is sent` |
| AC-0008-14 | `tests/org-menu.test.tsx`; API (existing) | `AC-0008-14 tenant.inactive shows its toast, stays on Studio Ana, re-enables the trigger and keeps focus on it`; server side: `tenants.e2e-spec.ts` `refuses a suspended workspace` |
| AC-0008-15 | `tests/org-menu.test.tsx` | `AC-0008-15 an unreachable server on selection shows the network toast and stays` |
| AC-0008-16 | `tests/org-menu.test.tsx` | `AC-0008-16 an expired session on selection goes to sign-in with the current page as next` |
| AC-0008-17 | `tests/org-menu.test.tsx` | `AC-0008-17 Criar organização goes to /create-tenant` |
| AC-0008-18 | `tests/org-menu.test.tsx`; API (existing) | `AC-0008-18 the menu lists exactly the organizations the server returns`; server side: `tenants.e2e-spec.ts` `lists only the caller’s workspaces`, `excludes deleted tenants and inactive memberships, but shows suspended tenants` |
| AC-0008-19 | `tests/tenant-gate.test.tsx`; API (existing) | `AC-0008-19 another user's organization is a 404 and no header is rendered`; server side: `tenants.e2e-spec.ts` `hides another user’s workspace (RN-02)` |
| AC-0008-20 | `tests/account-menu.test.tsx` | `AC-0008-20 Menu da conta opens with a group named "ana@example.com" holding Perfil, then Tema (Sistema, Escuro, Claro) and Sair, in order, with separators; the e-mail is not a menu item` |
| AC-0008-21 | `tests/account-menu.test.tsx` | `AC-0008-21 while the user is pending the e-mail line shows "Carregando"` |
| AC-0008-22 | `tests/account-menu.test.tsx` | `AC-0008-22 an unexpected or unreachable user request leaves the e-mail line out and the entries work` |
| AC-0008-23 | `tests/account-menu.test.tsx` | `AC-0008-23 Perfil goes to /@me` |
| AC-0008-24 | `tests/account-menu.test.tsx` | `AC-0008-24 with nothing stored and a dark device, Sistema is checked and data-theme is dark` |
| AC-0008-25 | `tests/account-menu.test.tsx` | `AC-0008-25 choosing Escuro sets data-theme dark, checks Escuro and keeps the menu open` |
| AC-0008-26 | `tests/account-menu.test.tsx` | `AC-0008-26 with preferences consent, Escuro survives a remount` |
| AC-0008-27 | `tests/account-menu.test.tsx` | `AC-0008-27 without preferences consent, a remount falls back to Sistema and the light device theme` |
| AC-0008-28 | `tests/account-menu.test.tsx`, `tests/auth-session-route.test.ts`, `tests/proxy.test.ts` | `AC-0008-28 Sair signs out and goes to /login`; route: `AC-0008-28 DELETE /api/auth/session answers 204 and clears the token, refreshToken, rememberMe and tenantId cookies`; proxy: `AC-0008-28 a request for an organization page without session cookies redirects to /login with next` |
| AC-0008-29 | `tests/account-menu.test.tsx`, `tests/auth-session-route.test.ts` | `AC-0008-29 a 500 on sign-out still goes to /login`; route: `AC-0008-29 an upstream logout failure still clears every session cookie` |
| AC-0008-30 | `tests/account-menu.test.tsx` | `AC-0008-30 while sign-out is pending the entry reads "Saindo…", is disabled and sends no second request` |
| AC-0008-31 | `tests/account-menu.test.tsx` | `AC-0008-31 an unreachable server on sign-out shows the network toast and restores Sair` |
| AC-0008-32 | `tests/nav-sheet.test.tsx` | `AC-0008-32 narrow: Abrir menu opens the "Menu" dialog with the Agenda, Trabalho and Contas groups, Configurações disabled and Fechar; trigger expanded` |
| AC-0008-33 | `tests/nav-sheet.test.tsx` | `AC-0008-33 the sheet marks Clientes as current and has no Barra lateral control and no profile block` |
| AC-0008-34 | `tests/nav-sheet.test.tsx` | `AC-0008-34 choosing Serviços navigates and closes the sheet` |
| AC-0008-35 | `tests/nav-sheet.test.tsx` | `AC-0008-35 Fechar closes the sheet and focuses Abrir menu` |
| AC-0008-36 | `tests/nav-sheet.test.tsx` | `AC-0008-36 Escape closes the sheet and focuses Abrir menu` |
| AC-0008-37 | `tests/nav-sheet.test.tsx` | `AC-0008-37 a press outside the sheet closes it and focuses Abrir menu` |
| AC-0008-38 | `tests/nav-sheet.test.tsx` | `AC-0008-38 while the sheet is open the page behind is aria-hidden or inert, and the trailing focus guard sends focus to the sheet's first control` |
| AC-0008-39 | `tests/nav-sheet.test.tsx` | `AC-0008-39 widening to 1024px closes the sheet and the sidebar is no longer aria-hidden or inert` |
| AC-0008-40 | `tests/nav-sheet.test.tsx` | `AC-0008-40 wide: the sidebar starts with Agenda Rápida and has no profile block` |
| AC-0008-41 | `tests/account-menu.test.tsx` | `AC-0008-41 narrow: the account menu is a menu, not a dialog` |
| AC-0008-42 | `tests/account-menu.test.tsx` | `AC-0008-42 Escape closes the account menu and focuses Menu da conta` |
| AC-0008-43 | `tests/org-menu.test.tsx` | `AC-0008-43 Down moves focus from Studio Ana to Clínica Bia` |
| AC-0008-44 | `tests/shell-header.test.tsx` | `AC-0008-44 wide: the header's tabbable controls are, in document order, the organization link, Trocar organização and Menu da conta` |
| AC-0008-45 | `tests/account-menu.test.tsx` | `AC-0008-45 en-US shows Profile, Theme, System, Dark, Light and Sign out` |
| AC-0008-46 | `tests/account-menu.test.tsx` | `AC-0008-46 an expired session on the user request goes to sign-in with the current page as next` |
| AC-0008-47 | `tests/org-menu.test.tsx`; API (existing) | `AC-0008-47 tenant.not-found shows its toast and stays on Studio Ana`; server side: `tenants.e2e-spec.ts` `hides another user’s workspace (RN-02)` |
| AC-0008-48 | `tests/org-menu.test.tsx` | `AC-0008-48 an expired session on the list goes to sign-in with the current page as next` |
| AC-0008-49 | `tests/org-menu.test.tsx` | `AC-0008-49 Escape closes the organization menu and focuses Trocar organização` |
| AC-0008-50 | `tests/org-menu.test.tsx` | `AC-0008-50 a single organization lists only Studio Ana, checked, then Criar organização` |
| AC-0008-51 | `tests/auth-session-route.test.ts`; API (existing) | `AC-0008-51 DELETE /api/auth/session sends the refreshToken cookie to the upstream logout`; server side: `auth.e2e-spec.ts` `drops the session on logout` |
| AC-0008-52 | `tests/org-menu.test.tsx` | `AC-0008-52 Down from Clínica Bia reaches Espaço Caio, which is aria-disabled` |
| AC-0008-53 | `tests/org-menu.test.tsx` | `AC-0008-53 narrow: the organization menu is a menu, not a dialog` |
| AC-0008-54 | `tests/org-menu.test.tsx` | `AC-0008-54 reopening the menu requests the list again and shows a reactivated organization enabled` |

The route and proxy tests run in the node environment (`// @vitest-environment node`). The route test mocks only
`api` of `src/app/api/_lib/http.ts` and sets `WEB_APP_URL` with `vi.stubEnv` (no `.env` file is read or written);
the request carries the matching `origin` header. Both describe behavior as built, so they pass from the start;
they pin it for AC-0008-28, -29 and -51.

Existing tests: `tests/tenant-gate.test.tsx` keeps its cases and gains the AC-0008-11 and AC-0008-19 cases. No
other existing test renders the shell, header or sidebar.

### Deferred checks

No criterion waits for another spec. Manual checks M-1 to M-10 (§10) are done by the owner on a running system,
at 375px, 1024px and 1280px, in both themes, before `/done` sets `Implemented`. One more check comes from this plan:

| What | Where | Who |
| --- | --- | --- |
| P-9: after tapping outside the open navigation sheet on a phone, focus is on "Abrir menu" (AC-0008-37 on a real device; jsdom only proves the virtual-click path) | Chrome on Android, with TalkBack or a keyboard; Safari on iOS with VoiceOver | Owner, in the same session as M-3 |

### Sequence

0. **Precondition (owner).** Commit the spec work before `/implement` starts the lock: this spec,
   `docs/img/SPEC-0008/`, `docs/RFC.md` and `docs/RFC-segmented/02-engenharia-de-requisitos.md`. If they are still
   uncommitted when the lock starts, `task-lock.sh check` at `/done` reports the RFC files and the mockups as
   changed outside the scope.
1. **Groundwork, no behavior change.** i18n keys (both locales), `NAV_WIDE_QUERY` / `useWideNav`,
   `lib/api/me.ts`, `lib/api/signed-out.ts`. `pnpm --filter @planici/i18n build`, `pnpm --filter web typecheck`.
2. **Failing tests for the header.** `shell-harness.tsx`, `shell-header`, `org-menu`, `account-menu`, the new
   `tenant-gate` cases, plus the route and proxy tests (which pass already). `pnpm --filter web test` shows the new
   header tests failing for the expected reasons (old header, no menus).
3. **Header.** `ActiveTenantContext` in `tenant-gate.tsx`, `header.tsx`, `org-switcher.tsx`, `account-menu.tsx`,
   `shell.tsx` wiring (including `navButtonRef`). Every test written so far passes.
4. **Navigation sheet.** First `nav-sheet.test.tsx`, failing for the expected reasons (dialog drawer, profile
   block). Then `sidebar.tsx` on `Sheet`, `useWideNav` and `closeAndRefocus`, and the profile block out of
   `content.tsx`. The sheet tests pass.
5. **Checks.** `pnpm --filter web lint`, `pnpm --filter web typecheck`, `pnpm --filter web test`,
   `pnpm --filter @planici/i18n build`, and `pnpm --filter @planici/emails typecheck` (`packages/transactional`
   also uses `@planici/i18n`).

Commits, each green on its own: `feat(web): app header with organization switcher and account menu [SPEC-0008]`
(steps 1–3, without `nav-sheet.test.tsx`), `feat(web): navigation as a bottom sheet on narrow screens
[SPEC-0008]` (step 4, with `nav-sheet.test.tsx`), and the spec's changelog commit at `/done`.

### Decisions this plan makes (owner to confirm with the plan)

| # | Decision | Why |
| --- | --- | --- |
| P-1 | The organization list is requested each time the menu opens, with no cache, showing "Carregando…" each time. | §4.2 step 1 and Q13; same pattern as `tenant-picker.tsx`. The list is small. |
| P-2 | The e-mail is requested the first time the account menu opens and kept while the menu stays mounted; a failure is retried on the next open. The account menu sits in a different place in each header layout, so crossing the breakpoint remounts it and requests the e-mail again. | No request on every page load for a line most visits never open. The extra request after a resize is harmless. |
| P-3 | Sign-out ends with `router.replace("/login")` and `router.refresh()`, not a full page load. | The organization layout (with the shell's query cache and toasts) unmounts on leaving it, and the proxy sends any later private request to sign-in once the cookies are cleared. |
| P-4 | Wide and narrow header variants and the sheet's existence come from `matchMedia("(min-width: 48rem)")`, not only CSS classes. | Tests can only see what is in the DOM (AC-0008-01, -02, -39). `48rem` equals the `md` breakpoint the sidebar's CSS uses, at any default font size. The header renders only after the client-side organization check, so there is no server render to mismatch. |
| P-5 | Organizations are radio items that close the menu on click, so choosing the open one closes it without a request. | §4.2 step 5; Base UI radio items stay open by default. |
| P-6 | The gate shares the confirmed organization through a context; the header reads it. After a switch, the new page's gate selects again, which is the second selection request AC-0008-13 allows. | One source for "the organization that is open" (R1). |
| P-7 | The account button's resting background is `background-brand-subtlest` (with its hovered and pressed tokens). | §9 Q5; the closest brand token to the mockup's pink. |
| P-8 | While a switch is pending, the organization trigger is `aria-disabled` and `aria-busy` and refuses to open, instead of natively `disabled`. | A natively disabled trigger loses focus to `body` when the menu closes onto it, and focus stays lost after a refusal (R7). |
| P-9 | The sheet returns focus to "Abrir menu" through `finalFocus`, and also refocuses it explicitly after any close except a navigation. | Without a Base UI trigger, focus would return to `body` in Safari and jsdom, and Base UI skips focus return after an outside tap on Chrome Android and Samsung Internet (§4.4 step 6, AC-0008-35 to -37). |

### Risks

- **next-themes in jsdom.** It reads `matchMedia("(prefers-color-scheme: dark)")` and `localStorage`. The harness
  stub must answer it; if next-themes still misbehaves in jsdom, AC-0008-24 to -27 move to manual checks. Found in
  step 2.
- **Base UI menu details.** Disabled items reachable by arrow keys (AC-0008-52) relies on Base UI 1.8's menu
  passing no disabled indices to its list navigation; radio items closing on click relies on `closeOnClick`.
  Both are checked by step 2's tests before any production code.
- **Proxy test imports next-intl middleware.** If it cannot load under vitest, the proxy half of AC-0008-28
  becomes a manual check (open a private page after signing out). Found in step 2.
- **Focus after an outside tap on phones.** The explicit refocus of P-9 cannot be proven in jsdom, where an outside
  press is a virtual click. The plan's manual check covers it. If a real device still loses focus, the cheapest fix
  is to refocus from the Sheet's close transition end instead of the next animation frame.
- **Gate context.** Every organization page renders through `TenantGate`. Its existing tests stay; the context
  change is additive.
- **i18n build.** The web app reads `@planici/i18n` from `dist`; the keys show in the running app only after
  `pnpm --filter @planici/i18n build` (tests read the source through the vitest alias).
- **Sheet and the navigation's hardcoded labels.** The sheet shows the sidebar's fixed Portuguese labels in every
  locale (§9 Q9); AC-0008-45 only covers the account menu.

### New dependencies

None. `@base-ui/react` (menu, drawer), `next-themes`, `sonner` and `lucide-react` are already used.

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-25 | Draft from the owner's mockups and decisions of 2026-11-25: split organization switcher (name to `/orgs`, chevron to a menu), search and add buttons removed, sidebar profile block removed, menus anchored on every width, navigation as a bottom sheet on narrow screens. |
| 0.2 | 2026-11-25 | Spec review fixes. Q1 cites RFC §2.7 and its precedence rule; Q2 adds the `users.preferences` schema conflict; both still await the owner. E-mail failure split: 401 goes to sign-in (AC-0008-46), other failures leave the line out (AC-0008-22). Sign-in lands on `/orgs`. Logo is not a link (Q3). en-US copy says "workspace". §6 adds token errors and `unexpected`, marks `tenant.forbidden` as not returned today; deleted organizations are not listed. Layout clauses moved from AC-0008-01, 02, 03, 20, 32, 41 and 44 to manual checks M-1 to M-10. New AC-0008-46 to AC-0008-54 (e-mail 401, `tenant.not-found`, list 401, Escape on the organization menu, single organization, refresh token invalidated, disabled entry reached by arrows, organization menu on narrow screens, list reloaded on open). `depends_on` lists SPEC-0002, SPEC-0005, SPEC-0006. Q12 and Q13 added. |
| 0.3 | 2026-11-25 | Owner decisions: Q1, RFC §2.7 amended (Autenticação and Tenant rows) to allow one or more organizations per user with switching, in RFC.md and RFC-segmented; Q2, theme stays in the browser behind cookie consent, R5 is an owner decision. No open question blocks approval. |
| 1.0 | 2026-11-25 | Approved by Joao Izidoro, 2026-11-25, after the spec review (2026-11-25) and the owner decisions on Q1 and Q2 of 0.3, with all 54 criteria and manual checks M-1 to M-10 agreed. `plan_status` stays Draft until `/plan`. |
| 1.1 | 2026-11-25 | Implementation plan written by `/plan` (§11): web only, 21 scope paths, every criterion mapped to a test, decisions P-1 to P-7. `plan_status` stays Draft until the owner approves it. |
| 1.2 | 2026-11-26 | Plan review fixes (§11). Breakpoint is `(min-width: 48rem)`, matching the sidebar's `md` (P-4). The sheet returns focus through `finalFocus` and an explicit refocus after every close except a navigation (P-9), with a manual phone check. The pending-switch trigger is `aria-disabled` instead of `disabled` (P-8). "Organizações" and the e-mail are group names, as Base UI's group labels give. The harness gets a `networkDown` reply and a rem-aware `matchMedia`; the Tab criteria name their DOM checks; AC-0008-39 checks the sidebar is no longer hidden. API test citations corrected for AC-0008-14, -18, -19 and -47. The sheet tests move to step 4 so each commit is green; step 0 has the owner commit the spec work first; step 5 adds the `@planici/emails` typecheck. `Menu.LinkItem` for links, no `aria-controls`, a string fallback for error toasts, P-2 reworded. Scope drops the spec path (20 paths). `plan_status` stays Draft. |
