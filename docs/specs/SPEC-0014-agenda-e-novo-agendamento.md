---
id: SPEC-0014
title: Agenda do profissional — visualização diária/semanal e novo agendamento
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.2
owner: Joao Izidoro
satisfies: [RF-20, RF-22, RN-02, RN-10]
depends_on: [SPEC-0004, SPEC-0005, SPEC-0006, SPEC-0008]
phase: MVP
ticket: -
---

# SPEC-0014 — Agenda do profissional — visualização diária/semanal e novo agendamento

## 1. Purpose

The professional sees their appointments in a day or week agenda and books a new appointment by choosing a client, a
service, a date and a start time, without ever booking two appointments at the same time. This addresses RFC §2.2.5
(UC-23 "Criar agendamento manual", UC-26 "Visualizar agenda diária ou semanal"), the persona who today "controla agenda
e finanças em planilhas" (RFC §2.1) and the need "Profissional precisa controlar horários disponíveis" (RFC §2.8, KPI
"Agendamento em < 5 min e < 5 cliques"). It is the first slice of the agenda; the rest of the agenda is listed in §2 as
future specs.

## 2. Scope

**Why this slice first.** RF-22 (view) and RF-20 (create) are the smallest pair the owner can ship and use: a view
with no way to create shows nothing, and creating with no view cannot be checked. Conflict prevention (RN-10) ships
with them because the RFC treats overbooking as a critical flow (RFC §3.2 Fluxo 1; RNF-19 "TDD nos fluxos críticos
(… agenda/conflito de horário …)"; RFC §2.8 "testes de concorrência de conflito"; RFC §5 "Scheduling module"), and
adding it later would leave already-overlapping data behind. Availability (RF-18, RF-19) mainly decides what the
public link offers (RN-09) and is not needed for the professional to record a session, so it follows. This slice also
unblocks payments (RF-26 registers a payment "no agendamento"), the client history (RF-10), and the SPEC-0004 and
SPEC-0005 criteria that today need history seeded by hand. RFC §3.1 lists "Configuração de agenda" before
"Agendamento manual"; §9 Q2 asks the owner to confirm this order.

**In scope**
- The agenda screen `/agenda`: day view and week view, moving between days or weeks, back to today, and opening an
  appointment (RF-22).
- The new appointment screen `/agenda/new`: client, service, date and start time; the end time follows from the
  service's duration (RF-20, RN-10).
- Refusing an appointment that overlaps another appointment of the same tenant, also when two requests arrive at the
  same time (RN-10).
- Refusing an inactive client or service, and any client or service of another tenant (SPEC-0004 R6, SPEC-0005 R6,
  RN-02).
- The appointment screen `/agenda/<id>`: a read-only view of one appointment.
- Listing a tenant's appointments within a time range, and reading one appointment (API).
- History becomes real: a client or service with an appointment has linked history (SPEC-0004 R7, SPEC-0005 R7).
  This spec re-verifies, with appointments created through it, the criteria that SPEC-0004 §11 and SPEC-0005 §11
  left to the first scheduling spec, and SPEC-0001's criteria that SPEC-0004 §11 left to the first scheduling or
  payments spec (§2 Dependencies).
- The sidebar's "Agenda" group entry opens `/agenda` (§9 Q15).

**Out of scope**
- Editing an appointment's date, time, client or service, and cancelling it (RF-21, RN-12, RN-25's cancel
  confirmation, RFC §3.2 Fluxo 2): future spec. The appointment screen shows no "Editar" or delete control until then
  (§9 Q2).
- Weekly availability (RF-18), date-specific availability (RF-19) and their precedence (RN-09); whether a manual
  appointment outside availability is refused (RFC §3.3.3, §9 Q17): future spec.
- Manual time blocks (RF-25) and RN-10's "Não deve ser permitido criar agendamento em horário bloqueado": future
  spec. That spec extends the create rule of this one.
- The public booking link, pending requests and confirming or declining them (RF-23, RF-24, RN-11, UC-27 to UC-29,
  RFC §3.3.4), including the tenant context of the public link (SPEC-0010 §2): future spec.
- Payment registration, payment status per appointment and the financial summary (RF-26 to RF-29, RN-13 to RN-15,
  RFC §3.3.5): future spec.
- The client's appointment history on the client page (RF-10): future spec.
- Appointment notifications and reminders (RF-33 to RF-36, RN-17 to RN-19): post-MVP (RFC §2.7).
- Choosing a plan instead of a service (RF-20's plan clause, RF-14 to RF-17): post-MVP (RFC §2.7, owner decision).
- More than one professional per tenant and conflicts per professional (RF-05, RF-06): post-MVP (§9 Q6).
- A month view, recurring appointments, drag-and-drop, calendar integrations, an advanced scheduler: not required by
  RF-22; "Scheduler avançado … integrações de calendário" are post-MVP (RFC §2.7).
- Marking an appointment as done or as a no-show (the `completed` status in `schema.dbml` has no requirement).
- Notes and location on an appointment (§9 Q13).
- Audit events for creating appointments (RNF-11): the separate audit spec, as in SPEC-0004 §2.

**Dependencies and amendments**
- SPEC-0004, SPEC-0005 and SPEC-0006 are implemented. The client and service pickers reuse their lists, searches and
  status filters unchanged.
- SPEC-0010 is a Draft and is not a dependency of this spec. Appointments are tenant data, and they join SPEC-0010's
  lists under SPEC-0010 §2's rule for tenant data that does not exist yet: appointments in R1, and "appointment → its
  client" and "appointment → its service" in the R7 table. If SPEC-0010 is implemented first, this spec adds them
  when it is implemented; otherwise SPEC-0010's lists are amended before SPEC-0010 is implemented. SPEC-0010 R9's
  check fails until one of the two happens (§9 Q19).
- SPEC-0008 §2 leaves the navigation entries "as built". This spec turns the disabled entry of the "Agenda" group into
  a link and keeps its label, so AC-0008-40 keeps passing (§9 Q15).
- SPEC-0004 R7 and SPEC-0005 R7 already define history as linked appointments. With this spec, a client or service
  with an appointment has history (R13). SPEC-0004 §11 and SPEC-0005 §11 ("Deferred checks") verified only partly,
  with a stand-in for history because no appointment could exist, the criteria that need a linked appointment, and
  handed them to the first scheduling spec. This spec is that spec, and it re-verifies each of them with an
  appointment created through this spec; their expected behavior is unchanged:
  - client delete refused with `client.has-history` (AC-0004-15, re-verified as AC-0014-40); the client view page
    offering only "Inativar" (AC-0004-33, as AC-0014-123); the delete dialog when an appointment is linked while it
    is open (AC-0004-71, as AC-0014-124);
  - service delete refused with `service.has-history` (AC-0005-15, as AC-0014-41); the service view page offering
    only "Arquivar" (AC-0005-55, as AC-0014-125); `hasHistory` on a read (AC-0005-58, as AC-0014-126) and on list
    items (AC-0005-111, as AC-0014-130); the delete dialog when an appointment is linked while it is open, wide
    (AC-0005-84, as AC-0014-127) and narrow (AC-0005-101, as AC-0014-129); the narrow row's "Excluir" showing the
    history toast, active (AC-0005-99, as AC-0014-128) and archived (AC-0005-114, as AC-0014-131).
  - SPEC-0004 §11 also leaves SPEC-0001's AC-0001-34, -57 and -58 (a client template whose client has a linked
    appointment) with the first scheduling or payments spec; this spec re-verifies them the same way
    (AC-0014-132 to AC-0014-134).

## 3. Domain rules

- **R1. Tenant.** Every appointment belongs to one tenant, and its client and service belong to the same tenant
  (RN-02, RN-10). Appointments are tenant data under SPEC-0010 R1 and R7 (§2).
- **R2. What a new appointment needs.** An appointment created by the professional has a client, a service, a date and
  a start time (RF-20, RN-10). There is no plan in the MVP (RF-20; RFC §2.7).
- **R3. Active client.** The client must be an active client of the tenant. Inactive clients are not offered and are
  refused (SPEC-0004 R6).
- **R4. Active service.** The service must be an active service of the tenant. Archived (inactive) services are not
  offered and are refused (SPEC-0005 R6).
- **R5. End time.** The end time is the start time plus the service's duration at the moment the appointment is
  created, and it is stored with the appointment. A later change to the service's duration does not move existing
  appointments. The professional does not type an end time. `assumption` (§9 Q4)
- **R6. No overlap.** Two appointments of the same tenant never overlap. An appointment occupies the time from its
  start up to, but not including, its end, so one ending at 11:00 and another starting at 11:00 do not overlap
  (`assumption`, §9 Q5). The rule holds even when two requests arrive at the same time: at most one of them is stored
  (RN-10; RFC §5, "Scheduling module"). In the MVP a tenant has one professional, so "the same professional" of RN-10 is the tenant (RF-05;
  §9 Q6). In this slice every stored appointment counts; which statuses count once cancelling and pending requests
  exist is for those specs (§9 Q18).
- **R7. Status.** An appointment created by the professional is confirmed at once. Only public-link requests start
  as pending (RN-11). `assumption` (§9 Q3)
- **R8. Past start.** A start time in the past is accepted, so the professional can record a session that already
  happened and later register its payment. `assumption` (§9 Q7)
- **R9. Whole minutes.** A start time is a whole minute: seconds and fractions of a second are zero. `assumption`
  (§9 Q8)
- **R10. Instants and time zone.** The API receives and returns points in time, never a local date. A request states
  its offset; responses are UTC, as `api-convention.md` "IDs and dates" says. The agenda shows times, and reads the
  date and time typed in the form, in the time zone of the device the professional is using. `assumption`, blocking
  (§9 Q1)
- **R11. Day and week.** The day view shows one calendar day; the week view shows seven days, Sunday to Saturday
  (`assumption`, §9 Q9). An appointment appears on every day it overlaps; an appointment crossing midnight appears on
  both days, cut at midnight, and its label always gives its full start and end. Narrow screens (below 48rem,
  SPEC-0008 R6) open in the day view, wide screens in the week view (`assumption`, §9 Q9).
- **R12. Range list.** Listing returns the tenant's appointments that overlap a time range: those that start before
  the range ends and end after it starts. The range is at most 31 days (`assumption`, §9 Q10). The list is sorted by start time,
  then by `id`, and paginated as `api-convention.md` "Pagination" says. The agenda loads every page of the range before
  showing it.
- **R13. History.** A client or a service with at least one appointment has linked history: it can be inactivated
  but not deleted (SPEC-0004 R7, SPEC-0005 R7; RN-05, RN-06, RN-24).
- **R14. Inactivated later.** Inactivating a client, or archiving a service, does not change its existing
  appointments: they stay in the agenda and can be read, showing the client as "Inativo" or the service as "Arquivado"
  (SPEC-0004 R6, SPEC-0005 R6 and R16, RN-24).
- **R15. Privacy.** Client personal data (name, e-mail, phone) never appears in application logs, error responses or
  error-tracking events (SPEC-0004 R13). A conflict response does not reveal the other appointment.
- **R16. No availability or blocks yet.** No availability or time block exists in this slice, so any start time is
  accepted subject to R3 to R9. The availability and time-block specs extend this rule (§2, §9 Q17).

## 4. Behavior

### 4.1 Agenda (`/agenda`)
1. The professional opens "Agenda Rápida" in the sidebar (or the navigation sheet on narrow screens) and lands on
   `/agenda` (§9 Q15).
2. The agenda opens on today, in the day view on narrow screens and the week view on wide screens (R11). The view and
   the date are kept in the address (for example `?view=day&date=2026-12-01`), so reloading or going back shows the
   same view and day. A missing or unreadable view or date falls back to the default view or to today, without an
   error.
3. The header shows the title "Agenda", a "Dia" / "Semana" switch, "Hoje", previous and next buttons, the heading of
   the shown period and the "Novo agendamento" button.
   - Day heading: the full date, "terça-feira, 1 de dezembro de 2026". Previous and next are named "Dia anterior" and
     "Próximo dia".
   - Week heading: "29 de nov. a 5 de dez. de 2026". Previous and next are named "Semana anterior" and "Próxima
     semana". Today's column header is highlighted. The en-US forms and a week across two years: §8, "Period
     headings".
   - Switching between "Dia" and "Semana" keeps the date: the week view shows the week containing it; the day view
     shows that day.
   - "Hoje" shows today in the current view.
4. The body is a time grid of the whole day (00:00 to 24:00), one column per day. On opening, it is scrolled so that
   08:00 is at the top, or the hour of the earliest appointment of the shown period if that is earlier (§9 Q22).
5. Each appointment is a block placed at its start and sized to its duration, showing its time range ("10:00–11:00"),
   the service name and the client name. Times follow the interface language: "14:30" in pt-BR, "2:30 PM" in en-US
   (§9 Q21). Every block is a link, reachable by keyboard in start-time order, named "<start>–<end>, <service>,
   <client>". Selecting it opens `/agenda/<id>`.
6. Selecting an empty half-hour of the grid opens `/agenda/new` with that date and time filled in (§9 Q14). The
   half-hours start on the hour and at half past. A half-hour is empty only if no appointment overlaps any part of
   it: with an appointment from 10:15 to 10:45, neither the 10:00 nor the 10:30 half-hour is empty or selectable.
   `assumption` (§9 Q14)
7. While the period loads, the grid shows placeholder blocks. If the period has no appointment, the grid stays visible
   with "Nenhum agendamento neste dia." or "Nenhum agendamento nesta semana." and, inside that message, a "Novo
   agendamento" button of its own, besides the header's; it opens the form as the header's does (4.2 step 1). If
   loading fails, including a later page of the period, no block is shown, and the message "Não foi possível carregar
   a agenda." offers "Tentar novamente".

### 4.2 New appointment (`/agenda/new`)
1. "Novo agendamento" opens the form. The date is filled in with the agenda's day: the shown day in the day view; in
   the week view, today if it is in the shown week, otherwise the week's Sunday. Opened from an empty half-hour, the
   date and the time are filled in (4.1 step 6). Opened directly, the date is today. The time is otherwise empty.
2. **Cliente**: a picker listing the tenant's active clients by name, with the e-mail below each name; more load as the
   list scrolls. Typing 2 or more characters searches by name, e-mail or phone (SPEC-0004 R9); with 1 character it
   shows "Digite ao menos 2 caracteres para buscar." and does not search.
3. **Serviço**: a picker listing the tenant's active services by name, each with its duration (SPEC-0005 R12, "1h
   30min") and price ("R$ 150,00"). Typing 2 or more characters searches by name (SPEC-0005 R9).
4. **Data** and **Horário**: the date, and the start time in hours and minutes, read in the device's time zone (R10).
5. Once a service and a time are chosen, the form shows "Término: 11:00", or "Término: 00:30 (dia seguinte)" when the
   end falls on the next day (R5).
6. If the tenant has no active client, the client picker says "Nenhum cliente ativo. Cadastre um cliente para agendar."
   with a "Cadastrar cliente" link to `/clients`. If it has no active service, the service picker says "Nenhum serviço
   ativo. Cadastre um serviço para agendar." with a "Cadastrar serviço" link to `/services`.
7. **[Salvar]** checks that client, service, date and time are filled in. Each empty one shows its inline error and no
   request is sent. Otherwise the form sends the client, the service and the start, and the button is disabled with
   "Salvando…" until the answer.
8. On success, the professional returns to `/agenda` in the view they came from (day view when opened directly), on
   the appointment's date, with the toast "Agendamento criado"; the new block is in the grid.
9. On a conflict (409 `appointment.conflict`), "Este horário já está ocupado por outro agendamento." shows under
   Horário. Every field keeps its value.
10. If the chosen client became inactive or was deleted meanwhile (409 `client.inactive` or 404 `client.not-found`),
    the matching message shows under Cliente, the choice is cleared and the picker reloads. The same holds for the
    service (409 `service.inactive` or 404 `service.not-found`).
11. Any other failure shows the toast "Não foi possível criar o agendamento." and keeps every field.
12. **Cancelar** returns, without saving, to the agenda view and date the form was opened from (today's day view when
    opened directly).

There is no extra confirmation dialog before saving: [Salvar] sends the request at once. `assumption` (§9 Q12, which
names a conflict with RN-25 and RFC §4.2)

### 4.3 Appointment (`/agenda/<id>`)
1. The screen shows the service name as its title, the client name below it, the date ("terça-feira, 1 de dezembro de
   2026"), the time range ("10:00–11:00") and the duration ("1h"). The duration is the appointment's own length, from
   its start to its stored end (R5), not the service's current duration: after the service changes to 90 minutes,
   this appointment still shows "1h". The client name links to the client's page and the
   service name to the service's page. An inactive client carries the "Inativo" badge; an archived service carries the
   "Arquivado" badge (R14).
2. "Voltar para a agenda" opens `/agenda` in the day view on the appointment's date.
3. There is no "Editar", cancel or delete control in this slice (§2).
4. While loading, placeholders show. An unknown appointment, or one of another tenant, shows "Agendamento não
   encontrado." with "Voltar para a agenda". Any other failure shows "Não foi possível carregar o agendamento." with
   "Tentar novamente".

### 4.4 API behavior
1. **Create.** The professional sends a client, a service and a start. Anything else in the request, such as an end,
   a status or a source, is ignored, not refused (§7). The checks run in the order of §6; the first
   failure is the answer. On success the appointment is stored with its end (R5) and status (R7) and returned with
   201.
2. **List.** The professional asks for a time range. The answer is one page of appointments overlapping it (R12),
   with a cursor for the next page.
3. **Read.** The professional asks for one appointment by its id and gets it, or 404.

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| List appointments in a range | 401 | — (post-MVP) | 200, own tenant only | 404 `tenant.not-found` |
| Read an appointment | 401 | — | 200 | 404 `appointment.not-found` |
| Create an appointment | 401 | — | 201 | 404 `tenant.not-found` |
| Create with a client of another tenant | 401 | — | 404 `client.not-found` (`clientId`) | — |
| Create with a service of another tenant | 401 | — | 404 `service.not-found` (`serviceId`) | — |

Every action is tenant-scoped and follows `api-convention.md`, "Tenant context": no tenant context returns 400
`tenant.required`; no membership returns 404 `tenant.not-found`; a suspended tenant returns 403 `tenant.inactive`.
Another tenant's appointment, client or service answers exactly as an unknown one, and another tenant's appointments
never affect conflicts (R6). Hiding a control in the UI is not the check: the API enforces all of this (RN-02,
RNF-07).

## 6. Errors

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Client missing | 422 | `appointmentClient.required` | `clientId` |
| Client id not a well-formed id | 422 | `appointmentClient.invalid` | `clientId` |
| Service missing | 422 | `appointmentService.required` | `serviceId` |
| Service id not a well-formed id | 422 | `appointmentService.invalid` | `serviceId` |
| Start missing | 422 | `appointmentStart.required` | `startsAt` |
| Start not a valid date-time with offset, or not a whole minute (R9) | 422 | `appointmentStart.invalid` | `startsAt` |
| Client unknown or of another tenant | 404 | `client.not-found` (existing) | `clientId` |
| Client inactive | 409 | `client.inactive` | `clientId` |
| Service unknown or of another tenant | 404 | `service.not-found` (existing) | `serviceId` |
| Service inactive | 409 | `service.inactive` | `serviceId` |
| Overlaps another appointment of the tenant (R6) | 409 | `appointment.conflict` | `startsAt` |
| Appointment unknown, malformed id, or of another tenant | 404 | `appointment.not-found` | — |
| Range start missing | 422 | `appointmentFrom.required` | `from` |
| Range start not a valid date-time with offset | 422 | `appointmentFrom.invalid` | `from` |
| Range end missing | 422 | `appointmentTo.required` | `to` |
| Range end not a valid date-time with offset | 422 | `appointmentTo.invalid` | `to` |
| Range end not after its start, or range over 31 days | 422 | `appointmentRange.invalid` | `to` |
| `limit` outside 1–100 or not an integer | 422 | `limit.invalid` (existing) | `limit` |
| Cursor malformed, or issued for another range | 422 | `cursor.invalid` (existing) | `after` |

**Check order for create.** The first failure is the response:
1. Request shape, field by field: client, then service, then start (`appointmentClient.*`, `appointmentService.*`,
   `appointmentStart.*`).
2. The client: `client.not-found`, then `client.inactive`.
3. The service: `service.not-found`, then `service.inactive`.
4. `appointment.conflict`, last, because it needs the tenant's other appointments.

**List:** `from`, `to`, the range, `limit`, then `after`. **Read:** 404 only.

Every new key needs pt-BR and en-US copy (§8). The 409 and 404 bodies carry only `error` and `field` (R15).

## 7. Contract impact

New, non-breaking. Consumer: `apps/web`. Later consumers: the edit/cancel, public link and payments specs.

- **Appointment** (response, also the list item): `id` (UUID); `client` `{ id, name, status: active | inactive }`;
  `service` `{ id, name, durationMinutes, status: active | inactive }`; `startsAt`, `endsAt` (ISO-8601 UTC);
  `status` (`confirmed` is the only value this slice produces; later specs add values, so consumers must tolerate
  unknown ones); `createdAt`, `updatedAt` (ISO-8601 UTC). `client.name` and `service.name` are the current names.
  `service.durationMinutes` is the service's current duration, which follows later edits; the appointment's own
  length is `endsAt` − `startsAt` (R5), and that is the duration the screens show (4.3 step 1).
- **Create request**: `clientId` (UUID), `serviceId` (UUID), `startsAt` (ISO-8601 date-time with an offset or `Z`,
  whole minute). No end, status, plan or source: the server sets them (R5, R7). A body that also carries `endsAt`,
  `status`, `source` or any other key the request does not define is accepted, and those keys are ignored, not
  refused with 422. This follows the existing create requests: the client and service create bodies (SPEC-0004 §7,
  SPEC-0005 §7) drop keys they do not define, and refuse a key only where their spec names it (SPEC-0004's
  `consentAttested.not-allowed` on update). Response 201 with the Appointment.
- **List query**: `from`, `to` (ISO-8601 date-times with an offset or `Z`), `limit?`, `after?`. Response
  `{ appointments: Appointment[], nextCursor: string | null }`. No total. Sorted by `startsAt`, then `id` (R12).
- **Read**: by id; response 200 with the Appointment.
- Endpoint paths and verbs are set in `/plan`, under the tenant-scoped resource `appointments`.
- **Client** and **Service** responses: no shape change; `hasHistory` is now true for a client or service with an
  appointment (R13).
- The client and service pickers use the existing client and service lists with their status filter `active`
  (SPEC-0006, SPEC-0005 R11): no contract change.
- Data modelling notes for `/plan`, not decisions of this spec: `schema.dbml` `appointments.tenant_id` is `uuid`, but
  tenant IDs are strings (`api-convention.md`, "IDs and dates"; `clients.tenant_id` is `text`); `appointments.status`
  defaults to `pending`, while R7 makes professional-created appointments confirmed; RFC §5 describes the overlap
  guarantee per professional, and `appointments` has no professional column (§9 Q6).

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| `/agenda` | loading | Grid with placeholder blocks; "Carregando agenda…" announced | `agenda.loading` |
| `/agenda` | empty day | Grid visible; "Nenhum agendamento neste dia." with its own "Novo agendamento" button, besides the header's (4.1 step 7) | `agenda.empty.day`, `agenda.new` |
| `/agenda` | empty week | Grid visible; "Nenhum agendamento nesta semana." with its own "Novo agendamento" button, besides the header's (4.1 step 7) | `agenda.empty.week`, `agenda.new` |
| `/agenda` | error (any page of the period) | No block; "Não foi possível carregar a agenda." + "Tentar novamente" | `agenda.error`, `agenda.retry` |
| `/agenda` | success | Blocks with time range, service, client; header with switch, "Hoje", previous/next, heading | `agenda.title`, `agenda.view.day`, `agenda.view.week`, `agenda.nav.today`, `agenda.nav.previousDay`, `agenda.nav.nextDay`, `agenda.nav.previousWeek`, `agenda.nav.nextWeek`, `agenda.block.label` |
| `/agenda` | empty half-hour | Selectable; named "Novo agendamento às {time}" (§9 Q14) | `agenda.slot.new` |
| `/agenda/new` | initial | Cliente, Serviço, Data, Horário; date filled in (4.2 step 1); [Salvar] and Cancelar | `appointments.new.title`, `appointments.form.client`, `appointments.form.service`, `appointments.form.date`, `appointments.form.time`, `common.save`, `common.cancel` |
| `/agenda/new` | pickers loading | "Carregando clientes…" / "Carregando serviços…" inside the open picker | `appointments.form.clients.loading`, `appointments.form.services.loading` |
| `/agenda/new` | picker failed | "Não foi possível carregar os clientes." / "…os serviços." + "Tentar novamente" | `appointments.form.clients.error`, `appointments.form.services.error`, `agenda.retry` |
| `/agenda/new` | no active client / service | Message + link (4.2 step 6) | `appointments.form.clients.empty`, `appointments.form.clients.create`, `appointments.form.services.empty`, `appointments.form.services.create` |
| `/agenda/new` | search too short / no result | "Digite ao menos 2 caracteres para buscar." / "Nenhum cliente encontrado para “{q}”." / "Nenhum serviço encontrado para “{q}”." | `appointments.form.searchHint`, `appointments.form.clients.noResults`, `appointments.form.services.noResults` |
| `/agenda/new` | end time | "Término: {time}" / "Término: {time} (dia seguinte)" | `appointments.form.end`, `appointments.form.endNextDay` |
| `/agenda/new` | missing fields | Inline errors under each empty field; no request | `validation.appointmentClient.required`, `validation.appointmentService.required`, `validation.appointmentDate.required`, `validation.appointmentTime.required` |
| `/agenda/new` | saving | [Salvar] disabled, "Salvando…" | `appointments.form.saving` |
| `/agenda/new` | conflict | Inline under Horário; fields kept | `validation.appointment.conflict` |
| `/agenda/new` | client or service gone | Inline under the field; choice cleared; picker reloads | `validation.client.inactive`, `validation.client.not-found`, `validation.service.inactive`, `validation.service.not-found` |
| `/agenda/new` | other failure | Toast; fields kept | `appointments.create.error` |
| `/agenda/new` | success | Back to `/agenda` on the appointment's date; toast | `appointments.toast.created` |
| `/agenda/<id>` | loading | Placeholders | `appointments.view.loading` |
| `/agenda/<id>` | success | Service title, client, date, time range, duration (start to stored end, 4.3 step 1); badges for an inactive client or archived service | `appointments.view.client`, `appointments.view.service`, `appointments.view.date`, `appointments.view.time`, `clients.list.inactiveBadge`, `services.list.inactiveBadge` |
| `/agenda/<id>` | not found | "Agendamento não encontrado." + "Voltar para a agenda" | `validation.appointment.not-found`, `appointments.view.back` |
| `/agenda/<id>` | error | "Não foi possível carregar o agendamento." + "Tentar novamente" | `appointments.view.error`, `agenda.retry` |

There is no disabled state beyond [Salvar] while saving. Copy (pt-BR / en-US):
- `agenda.title`: "Agenda" / "Schedule"; `agenda.new`: "Novo agendamento" / "New appointment"
- `agenda.view.day`: "Dia" / "Day"; `agenda.view.week`: "Semana" / "Week"; `agenda.nav.today`: "Hoje" / "Today"
- `agenda.nav.previousDay`: "Dia anterior" / "Previous day"; `agenda.nav.nextDay`: "Próximo dia" / "Next day"
- `agenda.nav.previousWeek`: "Semana anterior" / "Previous week"; `agenda.nav.nextWeek`: "Próxima semana" / "Next
  week"
- `agenda.loading`: "Carregando agenda…" / "Loading schedule…"
- `agenda.empty.day`: "Nenhum agendamento neste dia." / "No appointments on this day."
- `agenda.empty.week`: "Nenhum agendamento nesta semana." / "No appointments this week."
- `agenda.error`: "Não foi possível carregar a agenda." / "Couldn't load the schedule."; `agenda.retry`: "Tentar
  novamente" / "Try again"
- `agenda.block.label`: "{start}–{end}, {service}, {client}" (both languages)
- `agenda.slot.new`: "Novo agendamento às {time}" / "New appointment at {time}"
- `appointments.new.title`: "Novo agendamento" / "New appointment"
- `appointments.form.client`: "Cliente" / "Client"; `.service`: "Serviço" / "Service"; `.date`: "Data" / "Date";
  `.time`: "Horário" / "Time"
- `appointments.form.end`: "Término: {time}" / "Ends at {time}"; `.endNextDay`: "Término: {time} (dia seguinte)" /
  "Ends at {time} (next day)"
- `appointments.form.saving`: "Salvando…" / "Saving…"
- [Salvar] and Cancelar use the existing shared keys `common.save`: "Salvar" / "Save" and `common.cancel`:
  "Cancelar" / "Cancel"
- `appointments.form.searchHint`: "Digite ao menos 2 caracteres para buscar." / "Type at least 2 characters to search."
- `appointments.form.clients.loading`: "Carregando clientes…" / "Loading clients…"; `.services.loading`: "Carregando
  serviços…" / "Loading services…"
- `appointments.form.clients.error`: "Não foi possível carregar os clientes." / "Couldn't load clients.";
  `.services.error`: "Não foi possível carregar os serviços." / "Couldn't load services."
- `appointments.form.clients.empty`: "Nenhum cliente ativo. Cadastre um cliente para agendar." / "No active clients.
  Add a client to book."; `.clients.create`: "Cadastrar cliente" / "Add client"
- `appointments.form.services.empty`: "Nenhum serviço ativo. Cadastre um serviço para agendar." / "No active services.
  Add a service to book."; `.services.create`: "Cadastrar serviço" / "Add service"
- `appointments.form.clients.noResults`: "Nenhum cliente encontrado para “{q}”." / "No clients found for “{q}”.";
  `.services.noResults`: "Nenhum serviço encontrado para “{q}”." / "No services found for “{q}”."
- `appointments.toast.created`: "Agendamento criado" / "Appointment created"
- `appointments.create.error`: "Não foi possível criar o agendamento." / "Couldn't create the appointment."
- `appointments.view.loading`: "Carregando agendamento…" / "Loading appointment…"; `.error`: "Não foi possível
  carregar o agendamento." / "Couldn't load the appointment."; `.back`: "Voltar para a agenda" / "Back to schedule"
- `appointments.view.client`: "Cliente" / "Client"; `.service`: "Serviço" / "Service"; `.date`: "Data" / "Date";
  `.time`: "Horário" / "Time"
- `validation.appointmentClient.required`: "Escolha um cliente." / "Choose a client."; `.invalid`: "Cliente inválido."
  / "Invalid client."
- `validation.appointmentService.required`: "Escolha um serviço." / "Choose a service."; `.invalid`: "Serviço
  inválido." / "Invalid service."
- `validation.appointmentStart.required`: "Informe a data e o horário." / "Enter the date and time."; `.invalid`:
  "Data ou horário inválido." / "Invalid date or time."
- `validation.appointmentDate.required`: "Informe a data." / "Enter the date."; `validation.appointmentTime.required`:
  "Informe o horário." / "Enter the time." (form only; the API answers `appointmentStart.*`)
- `validation.appointment.conflict`: "Este horário já está ocupado por outro agendamento." / "This time overlaps
  another appointment."
- `validation.appointment.not-found`: "Agendamento não encontrado." / "Appointment not found."
- `validation.client.inactive`: "Este cliente está inativo. Escolha outro." / "This client is inactive. Choose
  another."
- `validation.service.inactive`: "Este serviço está arquivado. Escolha outro." / "This service is archived. Choose
  another."
- `validation.client.not-found` and `validation.service.not-found` exist: "Cliente não encontrado." / "Client not
  found."; "Serviço não encontrado." / "Service not found."
- `validation.appointmentFrom.required` / `.invalid`, `validation.appointmentTo.required` / `.invalid`,
  `validation.appointmentRange.invalid`: "Período inválido." / "Invalid period." (not shown on a screen in normal use)

**Period headings** (4.1 step 3) are dates written in the interface language, not copy keys. The day heading is the
weekday and the full date. The week heading names the first and the last day of the week, each with its abbreviated
month, even when both fall in the same month; when both days are in the same year, the year is written once, at the
end; otherwise each day carries its own year.

| Heading | pt-BR | en-US |
| --- | --- | --- |
| Day | "terça-feira, 1 de dezembro de 2026" | "Tuesday, December 1, 2026" |
| Week, two months | "29 de nov. a 5 de dez. de 2026" | "Nov 29 – Dec 5, 2026" |
| Week, one month | "6 de dez. a 12 de dez. de 2026" | "Dec 6 – Dec 12, 2026" |
| Week across two years | "27 de dez. de 2026 a 2 de jan. de 2027" | "Dec 27, 2026 – Jan 2, 2027" |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | Which time zone defines "today", a day and a week, and how is the time typed in the form read? The RFC never names a time zone, `tenants` has no time zone, and Brazil has four. | In this slice, the device's time zone (R10): the API speaks only in points in time, and the web turns days and typed times into them. The alternative is a tenant time zone (a new setting, with a screen to set it), which weekly availability (RF-18) and the public link will need anyway; propose it in the availability spec, and switch the agenda to it then. | Yes, owner decision pending: R10, R11, 4.1 steps 2, 3 and 6, 4.2 steps 1, 4 and 5, the §10 preamble line "UI criteria assume a device in America/Sao_Paulo", AC-0014-90 to AC-0014-93 |
| 2 | Is this the right first slice: day/week view + create + conflict prevention + read-only appointment screen, with edit/cancel, availability (RF-18, RF-19), time blocks (RF-25), public link (RF-23, RF-24), payments (RF-26 to RF-29) and client history (RF-10) as separate future specs? RFC §3.1 lists "Configuração de agenda" before "Agendamento manual". Until edit/cancel ships, a wrong appointment cannot be fixed or removed in the UI, and the mockup's "Editar" and "Deletar Agenda" are not shown. | Yes. Next, in order: edit/cancel (so mistakes can be fixed), availability, time blocks, public link, payments, client history. No spec numbers are reserved. | Yes, owner decision pending: §2 |
| 3 | What status does an appointment created by the professional get? The RFC only says public-link requests start pending (RN-11); `schema.dbml` defaults to `pending`. | Confirmed (R7). | No (AC-0014-94, AC-0014-137) |
| 4 | RF-20 lists "cliente, serviço, data e horário", no end. Is the end always start + service duration, fixed at creation, with no way to type another end? RF-11 calls the duration "estimada". | Yes (R5). A different length per appointment can come with edit (RF-21). | No (end time taken from the service: AC-0014-17, AC-0014-18, AC-0014-37, AC-0014-50, AC-0014-71, AC-0014-72, AC-0014-75, AC-0014-80, AC-0014-87 to AC-0014-89, AC-0014-96, AC-0014-136, AC-0014-137) |
| 5 | Do back-to-back appointments conflict (one ends 11:00, the next starts 11:00)? | No: an appointment occupies [start, end) (R6). | No (AC-0014-95, AC-0014-96) |
| 6 | RN-10 and RFC §5 speak of "o mesmo profissional"; `appointments` has no professional column, and the MVP has one user per tenant (RF-05). | Conflicts are per tenant now (R6). Per professional when multi-user (RF-05) arrives, in its own spec. | No |
| 7 | May the professional create an appointment in the past? The RFC is silent. | Yes, to record a session that already happened and then its payment (R8). | No (AC-0014-97). Without the test clock of the §10 preamble, also every API criterion that creates an appointment at a fixed December 2026 start, which is in the past after 2026-12-01: AC-0014-01, AC-0014-02, AC-0014-16 to AC-0014-20, AC-0014-25 to AC-0014-29, AC-0014-34, AC-0014-36, AC-0014-37, AC-0014-43, AC-0014-44, AC-0014-87 to AC-0014-89, AC-0014-94 to AC-0014-96, AC-0014-137; and every UI criterion whose Given holds a December 2026 appointment |
| 8 | Must the start be a whole minute? Any minute, or a 5-minute step? | Any whole minute; seconds and fractions refused (R9). | No (AC-0014-98) |
| 9 | Which day does the week start on, and which view opens by default? | Sunday (pt-BR and en-US convention; `availability_rules.day_of_week` 0 = Sunday). Day view on narrow screens, week view on wide (R11). | No (AC-0014-47, AC-0014-53 to AC-0014-56, AC-0014-59, AC-0014-62, AC-0014-93, AC-0014-99) |
| 10 | Longest range a list may ask for? | 31 days: more than a week (room for a future month view), small enough for RNF-02 (R12). | No (AC-0014-100) |
| 11 | Status and key for an inactive client or service, and for a client or service of another tenant sent in the create body. | Inactive: 409 `client.inactive` / `service.inactive` with the field, as other state conflicts (`client.has-history`). Unknown or other tenant: 404 `client.not-found` / `service.not-found` with the field, so another tenant's id is indistinguishable from an unknown one. | No |
| 12 | **Conflict between the RFC and this spec.** RN-25 says "Operações que afetam agenda … devem passar por validação adicional antes de serem concluídas", and for a reversible operation that means "um diálogo de confirmação obrigatório". RFC §4.2 ("Cobertura de Telas do MVP") lists "erro/confirmação" as the states of "Agendamento manual". Creating an appointment affects the agenda, so both can be read as asking for a confirmation dialog before saving, while 4.2 step 7 sends the request when [Salvar] is pressed, with no dialog. On the other side: RN-25's examples of reversible operations are "cancelar agendamento" and "editar pagamento", not creating; "confirmação" in RFC §4.2 may mean the success confirmation (the toast of 4.2 step 8); and the KPI is "< 5 cliques". Does creating an appointment need a confirmation dialog? | No dialog: [Salvar] is the confirmation, and RFC §4.2's "confirmação" is the success toast. Cancel (future spec) gets the RN-25 dialog. | Yes, owner decision pending: 4.2 step 7, AC-0014-74, AC-0014-75, AC-0014-135 |
| 13 | The mockup (RFC §4.2, `telas-principais.png`, "agendas (add/edit)") shows a location ("Escritório, Rua Dharma, 108"); `schema.dbml` has `notes`. Neither is in RF-20. | Neither in this slice (RF-20; RNF-15 data minimization; notes may hold sensitive data). Ask again with edit. | No |
| 14 | To approach the KPI "< 5 cliques", may selecting an empty half-hour open the form with date and time filled in? | Yes (4.1 step 6). A half-hour is empty only if no appointment overlaps any part of it, so one partly covered (for example by an appointment from 10:15 to 10:45) is not selectable. | No (AC-0014-101, AC-0014-138) |
| 15 | The sidebar's "Agenda" group has one disabled entry, "Agenda Rápida". Rename it "Agenda"? SPEC-0008 AC-0008-40 expects "Agenda Rápida", and SPEC-0008 §2 leaves the entries as built. | Keep "Agenda Rápida" and make it open `/agenda`. Renaming needs a SPEC-0008 amendment. | No (AC-0014-102) |
| 16 | Agenda and new-appointment mockups are "Pendente (mockup dedicado)" (RFC §4.2, "Cobertura de Telas do MVP"); only the appointment detail exists, in the mobile overview. | Build from this spec with the existing design tokens and components. If the owner wants a design first, it must exist before `/plan`. | No |
| 17 | Once availability and time blocks exist: is a manual appointment outside availability refused (RFC §3.3.3 "impede horários … fora da janela configurada") or allowed (RN-09 only restricts the public link)? Blocked times are refused (RN-10). | Decide in the availability spec. This slice has neither (R16). | No |
| 18 | Which statuses block conflicts once cancelled appointments and pending public-link requests exist (RN-11, Fluxo 1)? | Decide in the edit/cancel and public link specs. Here every stored appointment counts (R6). | No |
| 19 | SPEC-0010 is a Draft. Who adds appointments to its R1 and R7? | SPEC-0010 §2's rule for tenant data that does not exist yet (§2 Dependencies): this spec adds them if SPEC-0010 is implemented first; otherwise SPEC-0010's lists are amended before SPEC-0010 is implemented. SPEC-0010 is not in `depends_on`. AC-0014-104, which applied in only one of the two orders, is withdrawn. | No |
| 20 | RNF-23 says at most 50 records per page; `api-convention.md` allows `limit` 1–100, default 50. | Follow `api-convention.md`, as the client and service lists do. Align RNF-23 editorially. | No |
| 21 | The mockup shows "10:12 PM" on a Portuguese screen. | Times follow the interface language: 24-hour in pt-BR, 12-hour in en-US (4.1 step 5). | No |
| 22 | Where does the 24-hour grid start scrolled? | 08:00, or the earliest appointment's hour if earlier (4.1 step 4). | No (AC-0014-103) |

## 10. Acceptance criteria

Unless stated: tenant "studio-ana" has the active client "Bia Lima" (e-mail "bia@example.com") and the active service
"Sessão individual" (60 minutes); "studio-bia" is another tenant with its own owner; offsets of -03:00 are
America/Sao_Paulo. "Creates an appointment at T" means a create request with that client, that service and startsAt
T. UI criteria assume a device in America/Sao_Paulo unless stated.

Test dates are fixed relative to a test clock that the tests set, never the real date: unless a criterion states
another "today", the clock reads 2026-11-27 12:00 in America/Sao_Paulo, so the December 2026 dates of the criteria
stay in the future whenever the tests run.

### Agreed criteria

These follow from the RFC, existing specs and `api-convention.md`. A few also use a detail proposed in §9 (the week
starting on Sunday, the end time taken from the service, the device time zone); §9's last column lists every
criterion that depends on a proposal.

```gherkin
AC-0014-01
Given tenant "studio-ana" with no appointments
When  its owner creates an appointment at "2026-12-01T10:00:00-03:00"
Then  the response is 201 with client.name "Bia Lima", service.name "Sessão individual" and startsAt "2026-12-01T13:00:00.000Z"
And   the tenant has exactly one appointment
```

```gherkin
AC-0014-02
Given the owner of "studio-ana" just created an appointment at "2026-12-01T10:00:00-03:00"
When  they list appointments from "2026-12-01T00:00:00-03:00" to "2026-12-02T00:00:00-03:00"
Then  the list holds that appointment
```

```gherkin
AC-0014-03
Given an owner of "studio-ana"
When  they create an appointment without clientId
Then  the response is 422 with { "error": "appointmentClient.required", "field": "clientId" }
```

```gherkin
AC-0014-04
Given an owner of "studio-ana"
When  they create an appointment with clientId "abc"
Then  the response is 422 with { "error": "appointmentClient.invalid", "field": "clientId" }
```

```gherkin
AC-0014-05
Given an owner of "studio-ana"
When  they create an appointment without serviceId
Then  the response is 422 with { "error": "appointmentService.required", "field": "serviceId" }
```

```gherkin
AC-0014-06
Given an owner of "studio-ana"
When  they create an appointment with serviceId "abc"
Then  the response is 422 with { "error": "appointmentService.invalid", "field": "serviceId" }
```

```gherkin
AC-0014-07
Given an owner of "studio-ana"
When  they create an appointment without startsAt
Then  the response is 422 with { "error": "appointmentStart.required", "field": "startsAt" }
```

```gherkin
AC-0014-08
Given an owner of "studio-ana"
When  they create an appointment at "2026-12-01T10:00:00" (no offset)
Then  the response is 422 with { "error": "appointmentStart.invalid", "field": "startsAt" }
```

```gherkin
AC-0014-09
Given an owner of "studio-ana"
When  they create an appointment at "2026-02-30T10:00:00-03:00"
Then  the response is 422 with { "error": "appointmentStart.invalid", "field": "startsAt" }
```

```gherkin
AC-0014-10
Given an owner of "studio-ana"
When  they create an appointment with neither clientId nor startsAt
Then  the response is 422 with { "error": "appointmentClient.required", "field": "clientId" }
```

```gherkin
AC-0014-11
Given an owner of "studio-ana"
When  they create an appointment with a well-formed clientId that matches no client
Then  the response is 404 with { "error": "client.not-found", "field": "clientId" }
And   the tenant has no appointment
```

```gherkin
AC-0014-12
Given tenant "studio-bia" has a client "Caio Reis"
When  the owner of "studio-ana" creates an appointment with the id of "Caio Reis"
Then  the response is 404 with { "error": "client.not-found", "field": "clientId" }
And   neither tenant has an appointment
```

```gherkin
AC-0014-13
Given tenant "studio-bia" has a service "Massagem"
When  the owner of "studio-ana" creates an appointment with client "Bia Lima" and the id of "Massagem"
Then  the response is 404 with { "error": "service.not-found", "field": "serviceId" }
And   neither tenant has an appointment
```

```gherkin
AC-0014-14
Given "studio-ana" has an inactive client "Davi Melo"
When  its owner creates an appointment with client "Davi Melo"
Then  the response is 409 with { "error": "client.inactive", "field": "clientId" }
```

```gherkin
AC-0014-15
Given "studio-ana" has an archived service "Avaliação antiga"
When  its owner creates an appointment with service "Avaliação antiga"
Then  the response is 409 with { "error": "service.inactive", "field": "serviceId" }
```

```gherkin
AC-0014-16
Given "studio-ana" has an appointment from "2026-12-01T10:00:00-03:00" to "2026-12-01T11:00:00-03:00"
When  its owner creates an appointment at "2026-12-01T10:30:00-03:00"
Then  the response is 409 with exactly { "error": "appointment.conflict", "field": "startsAt" }
And   the tenant still has exactly one appointment
```

```gherkin
AC-0014-17
Given "studio-ana" has an appointment from "2026-12-01T10:00:00-03:00" to "2026-12-01T11:00:00-03:00"
And   an active service "Sessão longa" of 180 minutes
When  its owner creates an appointment with service "Sessão longa" at "2026-12-01T09:00:00-03:00"
Then  the response is 409 with { "error": "appointment.conflict", "field": "startsAt" }
```

```gherkin
AC-0014-18
Given "studio-ana" has no appointment on 2026-12-01
When  its owner sends two create requests at the same moment, at "2026-12-01T10:00:00-03:00" and at "2026-12-01T10:30:00-03:00"
Then  exactly one response is 201
And   the other is 409 with { "error": "appointment.conflict", "field": "startsAt" }
And   the tenant has exactly one appointment on 2026-12-01
```

```gherkin
AC-0014-19
Given "studio-bia" has an appointment from "2026-12-01T10:00:00-03:00" to "2026-12-01T11:00:00-03:00"
When  the owner of "studio-ana" creates an appointment at "2026-12-01T10:00:00-03:00"
Then  the response is 201
```

```gherkin
AC-0014-20
Given "studio-ana" has an appointment from "2026-12-01T10:00:00-03:00" to "2026-12-01T11:00:00-03:00"
And   an inactive client "Davi Melo"
When  its owner creates an appointment with client "Davi Melo" at "2026-12-01T10:00:00-03:00"
Then  the response is 409 with { "error": "client.inactive", "field": "clientId" }
```

```gherkin
AC-0014-21
Given a request with no access token
When  it lists appointments of "studio-ana"
Then  the response is 401
```

```gherkin
AC-0014-22
Given an authenticated owner
When  they list appointments without a tenant context
Then  the response is 400 with { "error": "tenant.required" }
```

```gherkin
AC-0014-23
Given the owner of "studio-bia", who is not a member of "studio-ana"
When  they create an appointment in "studio-ana"
Then  the response is 404 with { "error": "tenant.not-found" }
And   "studio-ana" has no appointment
```

```gherkin
AC-0014-24
Given tenant "studio-ana" is suspended
When  its owner lists appointments
Then  the response is 403 with { "error": "tenant.inactive" }
```

```gherkin
AC-0014-25
Given "studio-ana" has appointments starting at 15:00, 09:00 and 11:00 on 2026-12-01 and one at 09:00 on 2026-12-02 (all -03:00)
When  its owner lists appointments from "2026-12-01T00:00:00-03:00" to "2026-12-02T00:00:00-03:00"
Then  the list holds exactly the three of 2026-12-01, in the order 09:00, 11:00, 15:00
```

```gherkin
AC-0014-26
Given "studio-ana" has an appointment from "2026-11-30T23:00:00-03:00" to "2026-12-01T00:00:00-03:00"
When  its owner lists appointments from "2026-12-01T00:00:00-03:00" to "2026-12-02T00:00:00-03:00"
Then  the list is empty
```

```gherkin
AC-0014-27
Given "studio-ana" has an appointment from "2026-12-02T00:00:00-03:00" to "2026-12-02T01:00:00-03:00"
When  its owner lists appointments from "2026-12-01T00:00:00-03:00" to "2026-12-02T00:00:00-03:00"
Then  the list is empty
```

```gherkin
AC-0014-28
Given "studio-ana" has an appointment from "2026-11-30T23:30:00-03:00" to "2026-12-01T00:30:00-03:00"
When  its owner lists appointments from "2026-12-01T00:00:00-03:00" to "2026-12-02T00:00:00-03:00"
Then  the list holds that appointment
```

```gherkin
AC-0014-29
Given "studio-ana" and "studio-bia" each have an appointment at "2026-12-01T10:00:00-03:00"
When  the owner of "studio-ana" lists appointments from "2026-12-01T00:00:00-03:00" to "2026-12-02T00:00:00-03:00"
Then  the list holds only the appointment of "studio-ana"
```

```gherkin
AC-0014-30
Given an owner of "studio-ana"
When  they list appointments with to "2026-12-02T00:00:00-03:00" and no from
Then  the response is 422 with { "error": "appointmentFrom.required", "field": "from" }
```

```gherkin
AC-0014-31
Given an owner of "studio-ana"
When  they list appointments with from "ontem" and a valid to
Then  the response is 422 with { "error": "appointmentFrom.invalid", "field": "from" }
```

```gherkin
AC-0014-32
Given an owner of "studio-ana"
When  they list appointments with from "2026-12-01T00:00:00-03:00" and no to
Then  the response is 422 with { "error": "appointmentTo.required", "field": "to" }
```

```gherkin
AC-0014-33
Given an owner of "studio-ana"
When  they list appointments from "2026-12-01T00:00:00-03:00" to "2026-12-01T00:00:00-03:00"
Then  the response is 422 with { "error": "appointmentRange.invalid", "field": "to" }
```

```gherkin
AC-0014-34
Given "studio-ana" has 60 appointments between "2026-12-01T00:00:00-03:00" and "2026-12-08T00:00:00-03:00"
When  its owner lists that range without limit, then asks for the page after the returned nextCursor
Then  the first page holds 50 appointments and a non-null nextCursor
And   the second page holds 10 appointments and nextCursor null
And   the 60 appointments appear once each, in start-time order
```

```gherkin
AC-0014-35
Given an owner of "studio-ana"
When  they list appointments for a valid range with limit 0
Then  the response is 422 with { "error": "limit.invalid", "field": "limit" }
```

```gherkin
AC-0014-36
Given a non-null nextCursor returned for the range from "2026-12-01T00:00:00-03:00" to "2026-12-08T00:00:00-03:00"
When  the owner lists the range from "2026-12-02T00:00:00-03:00" to "2026-12-09T00:00:00-03:00" with that cursor
Then  the response is 422 with { "error": "cursor.invalid", "field": "after" }
```

```gherkin
AC-0014-37
Given "studio-ana" has an appointment with "Bia Lima" and "Sessão individual" from "2026-12-01T10:00:00-03:00" to "2026-12-01T11:00:00-03:00"
When  its owner reads it by its id
Then  the response is 200 with client { name "Bia Lima", status "active" }, service { name "Sessão individual", durationMinutes 60, status "active" }, startsAt "2026-12-01T13:00:00.000Z" and endsAt "2026-12-01T14:00:00.000Z"
```

```gherkin
AC-0014-38
Given "studio-bia" has an appointment
When  the owner of "studio-ana" reads it by its id
Then  the response is 404 with { "error": "appointment.not-found" }
```

```gherkin
AC-0014-39
Given an owner of "studio-ana"
When  they read the appointment with id "abc"
Then  the response is 404 with { "error": "appointment.not-found" }
```

```gherkin
AC-0014-40
Given client "Bia Lima" has one appointment
When  the owner deletes "Bia Lima" with the correct typed name
Then  the response is 409 with { "error": "client.has-history" }
And   "Bia Lima" still exists
```

```gherkin
AC-0014-41
Given service "Sessão individual" has one appointment
When  the owner deletes "Sessão individual" with the correct typed name
Then  the response is 409 with { "error": "service.has-history" }
And   "Sessão individual" still exists
```

```gherkin
AC-0014-42
Given client "Bia Lima" has one appointment
When  the owner reads "Bia Lima"
Then  the response has hasHistory true
```

```gherkin
AC-0014-43
Given "Bia Lima" has an appointment at "2026-12-01T10:00:00-03:00"
When  the owner inactivates "Bia Lima" and then lists appointments from "2026-12-01T00:00:00-03:00" to "2026-12-02T00:00:00-03:00"
Then  the list holds that appointment with client.status "inactive"
```

```gherkin
AC-0014-44
Given "studio-ana" has an appointment from "2026-12-01T10:00:00-03:00" to "2026-12-01T11:00:00-03:00"
When  its owner creates an appointment at "2026-12-01T10:30:00-03:00" and the request is refused
Then  no application log line or error-tracking event written for that request contains "Bia Lima" or "bia@example.com"
```

```gherkin
AC-0014-45
Given the owner opens /agenda and the appointments have not arrived yet
When  the page renders
Then  the grid shows placeholder blocks
And   "Carregando agenda…" with copy key agenda.loading is announced
```

```gherkin
AC-0014-46
Given "studio-ana" has no appointment on 2026-12-01
When  the owner opens /agenda?view=day&date=2026-12-01
Then  the grid is shown with "Nenhum agendamento neste dia." with copy key agenda.empty.day
And   that empty-state message holds its own "Novo agendamento" button with copy key agenda.new
And   the page has two "Novo agendamento" buttons: the header's and the empty state's
```

```gherkin
AC-0014-47
Given "studio-ana" has no appointment from 2026-11-29 to 2026-12-05
When  the owner opens /agenda?view=week&date=2026-12-01
Then  the grid is shown with "Nenhum agendamento nesta semana." with copy key agenda.empty.week
```

```gherkin
AC-0014-48
Given listing appointments fails
When  the owner opens /agenda
Then  no block is shown
And   "Não foi possível carregar a agenda." with copy key agenda.error is shown with "Tentar novamente" (agenda.retry)
```

```gherkin
AC-0014-49
Given the agenda shows the error of AC-0014-48 and listing now succeeds
When  the owner presses "Tentar novamente"
Then  the agenda shows the period's appointments
```

```gherkin
AC-0014-50
Given an appointment with "Bia Lima" and "Sessão individual" from 10:00 to 11:00 on 2026-12-01
When  the owner opens /agenda?view=day&date=2026-12-01 in pt-BR
Then  a block reads "10:00–11:00", "Sessão individual" and "Bia Lima"
And   it is a link named "10:00–11:00, Sessão individual, Bia Lima"
```

```gherkin
AC-0014-51
Given the owner is on /agenda?view=day&date=2026-12-01
When  they press "Próximo dia"
Then  the heading reads "quarta-feira, 2 de dezembro de 2026"
And   the address holds view=day and date=2026-12-02
```

```gherkin
AC-0014-52
Given today is 2026-11-27 and the owner is on /agenda?view=day&date=2026-12-01
When  they press "Hoje"
Then  the day view shows 2026-11-27
```

```gherkin
AC-0014-53
Given the owner is on /agenda?view=week&date=2026-12-01
When  they press "Próxima semana"
Then  the heading reads "6 de dez. a 12 de dez. de 2026"
And   the address holds view=week and a date in that week
```

```gherkin
AC-0014-54
Given the owner is on /agenda?view=day&date=2026-12-01
When  they choose "Semana"
Then  the week view shows 2026-11-29 to 2026-12-05
```

```gherkin
AC-0014-55
Given the owner is on /agenda?view=week&date=2026-12-01
When  they reload the page
Then  the week view of 2026-11-29 to 2026-12-05 is shown again
```

```gherkin
AC-0014-56
Given today is 2026-11-27 on a narrow screen
When  the owner opens /agenda?view=month&date=2026-13-45
Then  the day view of 2026-11-27 is shown
And   no error message is shown
```

```gherkin
AC-0014-57
Given the agenda shows an appointment's block
When  the owner selects the block
Then  /agenda/<that appointment's id> opens
```

```gherkin
AC-0014-58
Given the period has 60 appointments and the second page of the list fails
When  the owner opens /agenda?view=week&date=2026-12-01
Then  no block is shown
And   the error state of agenda.error is shown
```

```gherkin
AC-0014-59
Given the week of 2026-11-29 has 60 appointments
When  the owner opens /agenda?view=week&date=2026-12-01 and every page succeeds
Then  60 blocks are shown
```

```gherkin
AC-0014-60
Given the day 2026-12-01 has appointments at 15:00 and 09:00
When  the owner moves the keyboard focus through the day view
Then  the 09:00 block receives focus before the 15:00 block
```

```gherkin
AC-0014-61
Given the owner is on /agenda?view=day&date=2026-12-01
When  they press "Novo agendamento"
Then  /agenda/new opens with Data 01/12/2026 and Horário empty
```

```gherkin
AC-0014-62
Given the owner is on /agenda?view=week&date=2026-12-10 and today is 2026-11-27
When  they press "Novo agendamento"
Then  /agenda/new opens with Data 06/12/2026, the Sunday of the shown week
```

```gherkin
AC-0014-63
Given "studio-ana" has active clients "Bia Lima" and "Ana Prado" and an inactive client "Davi Melo"
When  the owner opens the Cliente picker
Then  it lists "Ana Prado" then "Bia Lima", each with its e-mail, and not "Davi Melo"
```

```gherkin
AC-0014-64
Given "studio-ana" has active clients "Bia Lima" (e-mail "bia@example.com") and "Ana Prado" (e-mail "ana.prado@example.com")
And   the Cliente picker is open
When  the owner types "bi"
Then  it lists "Bia Lima" and not "Ana Prado"
```

```gherkin
AC-0014-65
Given the Cliente picker is open
When  the owner types "b"
Then  it shows "Digite ao menos 2 caracteres para buscar." with copy key appointments.form.searchHint
And   no search request is sent
```

```gherkin
AC-0014-66
Given "studio-ana" has the active service "Sessão individual" (90 minutes, R$ 150,00) and an archived service "Avaliação antiga"
When  the owner opens the Serviço picker
Then  it lists "Sessão individual" with "1h 30min" and "R$ 150,00", and not "Avaliação antiga"
```

```gherkin
AC-0014-67
Given "studio-ana" has no active client
When  the owner opens the Cliente picker
Then  it shows "Nenhum cliente ativo. Cadastre um cliente para agendar." with copy key appointments.form.clients.empty
And   a "Cadastrar cliente" link to /clients
```

```gherkin
AC-0014-68
Given "studio-ana" has no active service
When  the owner opens the Serviço picker
Then  it shows "Nenhum serviço ativo. Cadastre um serviço para agendar." with copy key appointments.form.services.empty
And   a "Cadastrar serviço" link to /services
```

```gherkin
AC-0014-69
Given loading the clients has not finished
When  the owner opens the Cliente picker
Then  it shows "Carregando clientes…" with copy key appointments.form.clients.loading
```

```gherkin
AC-0014-70
Given loading the clients fails
When  the owner opens the Cliente picker
Then  it shows "Não foi possível carregar os clientes." with copy key appointments.form.clients.error and "Tentar novamente"
```

```gherkin
AC-0014-71
Given the owner chose "Sessão individual" (60 minutes)
When  they type Horário 10:00
Then  the form shows "Término: 11:00" with copy key appointments.form.end
```

```gherkin
AC-0014-72
Given the owner chose "Sessão individual" (60 minutes)
When  they type Horário 23:30
Then  the form shows "Término: 00:30 (dia seguinte)" with copy key appointments.form.endNextDay
```

```gherkin
AC-0014-73
Given the new appointment form with Cliente, Serviço and Horário empty and Data filled in
When  the owner presses Salvar
Then  "Escolha um cliente." (validation.appointmentClient.required), "Escolha um serviço." (validation.appointmentService.required) and "Informe o horário." (validation.appointmentTime.required) show under their fields
And   no request is sent
```

```gherkin
AC-0014-74
Given a filled-in new appointment form
When  the owner presses Salvar and the answer has not arrived
Then  Salvar is disabled and reads "Salvando…" with copy key appointments.form.saving
```

```gherkin
AC-0014-75
Given the owner came from /agenda?view=week&date=2026-11-27 and filled in "Bia Lima", "Sessão individual", 01/12/2026 and 10:00
When  they press Salvar and the answer is 201
Then  /agenda opens in the week view on 2026-12-01 with the toast "Agendamento criado" (appointments.toast.created)
And   a block starting at 10:00 reads "Sessão individual" and "Bia Lima"
```

```gherkin
AC-0014-76
Given a filled-in new appointment form
When  the owner presses Salvar and the answer is 409 appointment.conflict
Then  "Este horário já está ocupado por outro agendamento." (validation.appointment.conflict) shows under Horário
And   Cliente, Serviço, Data and Horário keep their values
```

```gherkin
AC-0014-77
Given the owner chose "Bia Lima" and filled in the rest of the form
When  they press Salvar and the answer is 409 client.inactive
Then  "Este cliente está inativo. Escolha outro." (validation.client.inactive) shows under Cliente
And   Cliente is empty and its picker no longer lists "Bia Lima"
```

```gherkin
AC-0014-78
Given a filled-in new appointment form
When  the owner presses Salvar and the answer is 500
Then  the toast "Não foi possível criar o agendamento." (appointments.create.error) shows
And   every field keeps its value
```

```gherkin
AC-0014-79
Given a partly filled-in new appointment form opened from /agenda?view=day&date=2026-12-01
When  the owner presses Cancelar
Then  /agenda?view=day&date=2026-12-01 opens
And   no request to create an appointment was sent
```

```gherkin
AC-0014-80
Given an appointment with "Bia Lima" and "Sessão individual" from 10:00 to 11:00 on 2026-12-01
When  the owner opens its /agenda/<id>
Then  the title is "Sessão individual"
And   it shows "Bia Lima", "terça-feira, 1 de dezembro de 2026", "10:00–11:00" and the duration "1h", the time from its start to its stored end
```

```gherkin
AC-0014-81
Given the appointment has not loaded yet
When  the owner opens /agenda/<id>
Then  placeholders show and "Carregando agendamento…" with copy key appointments.view.loading is announced
```

```gherkin
AC-0014-82
Given an appointment of "studio-bia"
When  the owner of "studio-ana" opens /agenda/<its id>
Then  "Agendamento não encontrado." (validation.appointment.not-found) shows with "Voltar para a agenda" (appointments.view.back)
```

```gherkin
AC-0014-83
Given reading the appointment fails with 500
When  the owner opens /agenda/<id>
Then  "Não foi possível carregar o agendamento." (appointments.view.error) shows with "Tentar novamente"
```

```gherkin
AC-0014-84
Given an appointment of "studio-ana"
When  its owner opens /agenda/<id>
Then  the screen has no "Editar" control and no cancel or delete control
```

```gherkin
AC-0014-85
Given an appointment whose client "Davi Melo" was inactivated after it was created
When  the owner opens its /agenda/<id>
Then  "Davi Melo" carries the "Inativo" badge (clients.list.inactiveBadge)
```

```gherkin
AC-0014-86
Given the owner is on /agenda/<id> of an appointment on 2026-12-01
When  they press "Voltar para a agenda"
Then  /agenda?view=day&date=2026-12-01 opens
```

Permissions and tenant context, one action per criterion (from v0.2; AC-0014-21 keeps the list):

```gherkin
AC-0014-105
Given "studio-ana" has an appointment
And   a request with no access token
When  it reads that appointment by its id
Then  the response is 401
```

```gherkin
AC-0014-106
Given a request with no access token
When  it sends a create request for an appointment in "studio-ana"
Then  the response is 401
And   "studio-ana" has no appointment
```

```gherkin
AC-0014-107
Given tenant "studio-ana" is suspended
When  its owner sends a create request with client "Bia Lima", service "Sessão individual" and a valid startsAt
Then  the response is 403 with { "error": "tenant.inactive" }
And   "studio-ana" has no appointment
```

```gherkin
AC-0014-108
Given an authenticated owner
When  they send a create request with client "Bia Lima", service "Sessão individual" and a valid startsAt, without a tenant context
Then  the response is 400 with { "error": "tenant.required" }
And   "studio-ana" has no appointment
```

```gherkin
AC-0014-109
Given "studio-ana" has an appointment
When  its owner reads that appointment by its id without a tenant context
Then  the response is 400 with { "error": "tenant.required" }
```

```gherkin
AC-0014-110
Given the owner of "studio-bia", who is not a member of "studio-ana", and "studio-ana" has an appointment
When  they list appointments of "studio-ana" for a valid range that holds it
Then  the response is 404 with { "error": "tenant.not-found" }
```

New appointment screen, from v0.2:

```gherkin
AC-0014-111
Given the owner chose "Sessão individual" and filled in the rest of the form
When  they press Salvar and the answer is 409 service.inactive
Then  "Este serviço está arquivado. Escolha outro." (validation.service.inactive) shows under Serviço
And   Serviço is empty and its picker no longer lists "Sessão individual"
```

```gherkin
AC-0014-112
Given the owner chose "Bia Lima" and filled in the rest of the form, and "Bia Lima" is then deleted
When  they press Salvar and the answer is 404 client.not-found
Then  "Cliente não encontrado." (validation.client.not-found) shows under Cliente
And   Cliente is empty and its picker, reloaded, no longer lists "Bia Lima"
```

```gherkin
AC-0014-113
Given the owner chose "Sessão individual" and filled in the rest of the form, and "Sessão individual" is then deleted
When  they press Salvar and the answer is 404 service.not-found
Then  "Serviço não encontrado." (validation.service.not-found) shows under Serviço
And   Serviço is empty and its picker, reloaded, no longer lists "Sessão individual"
```

```gherkin
AC-0014-114
Given loading the services has not finished
When  the owner opens the Serviço picker
Then  it shows "Carregando serviços…" with copy key appointments.form.services.loading
```

```gherkin
AC-0014-115
Given loading the services fails
When  the owner opens the Serviço picker
Then  it shows "Não foi possível carregar os serviços." with copy key appointments.form.services.error and "Tentar novamente" (agenda.retry)
```

```gherkin
AC-0014-116
Given the Cliente picker shows the error of AC-0014-70 and loading the clients now succeeds
When  the owner presses "Tentar novamente" in the picker
Then  the picker lists "Bia Lima" with "bia@example.com"
And   the error message is gone
```

```gherkin
AC-0014-117
Given the Serviço picker shows the error of AC-0014-115 and loading the services now succeeds
When  the owner presses "Tentar novamente" in the picker
Then  the picker lists "Sessão individual"
And   the error message is gone
```

```gherkin
AC-0014-118
Given "studio-ana" has the active services "Sessão individual" and "Drenagem linfática"
And   the Serviço picker is open
When  the owner types "dren"
Then  it lists "Drenagem linfática" and not "Sessão individual"
```

```gherkin
AC-0014-119
Given the Cliente picker is open
When  the owner types "zz"
Then  it shows "Nenhum cliente encontrado para “zz”." with copy key appointments.form.clients.noResults
And   it lists no client
```

```gherkin
AC-0014-120
Given the Serviço picker is open
When  the owner types "zz"
Then  it shows "Nenhum serviço encontrado para “zz”." with copy key appointments.form.services.noResults
And   it lists no service
```

```gherkin
AC-0014-121
Given the new appointment form with "Bia Lima", "Sessão individual" and Horário 10:00 chosen and Data emptied
When  the owner presses Salvar
Then  "Informe a data." (validation.appointmentDate.required) shows under Data
And   no request is sent
```

```gherkin
AC-0014-122
Given an appointment whose service "Sessão individual" was archived after the appointment was created
When  the owner opens its /agenda/<id>
Then  "Sessão individual" carries the "Arquivado" badge (services.list.inactiveBadge)
```

Criteria that SPEC-0001, SPEC-0004 and SPEC-0005 left to this spec, re-verified with real appointments (§2
Dependencies; from v0.2). "Created through this spec" means a create request of §4.4 that answered 201. AC-0014-40
and AC-0014-41 already re-verify AC-0004-15 and AC-0005-15.

```gherkin
AC-0014-123
Given client "Bia Lima" whose only linked history is one appointment created through this spec
When  the owner opens the client's view page
Then  AC-0004-33 holds: no "Excluir" action is offered
And   "Inativar" is offered with the hint with copy key clients.delete.hasHistory
```

```gherkin
AC-0014-124
Given the owner on the view page of client "Bia Lima" while it had no appointment
And   an appointment with "Bia Lima" is then created through this spec
When  the owner confirms the delete dialog
Then  AC-0004-71 holds: the dialog closes and the page offers only "Inativar" with the hint with copy key clients.delete.hasHistory
```

```gherkin
AC-0014-125
Given service "Sessão individual" whose only linked history is one appointment created through this spec
When  the owner opens the service's view page
Then  AC-0005-55 holds: no "Excluir" action is offered
And   "Arquivar" is offered with the hint with copy key services.delete.hasHistory
```

```gherkin
AC-0014-126
Given service "Sessão individual" with one appointment created through this spec and an active service "Avaliação" with none
When  the owner reads each of them
Then  AC-0005-58 holds: "Sessão individual" has hasHistory true and "Avaliação" has hasHistory false
```

```gherkin
AC-0014-127
Given the owner on the view page of service "Sessão individual" while it had no appointment
And   an appointment with "Sessão individual" is then created through this spec
When  the owner confirms the delete dialog
Then  AC-0005-84 holds: the dialog closes and the page offers only "Arquivar" with the hint with copy key services.delete.hasHistory
```

```gherkin
AC-0014-128
Given an active service "Peeling" with one appointment created through this spec, on a narrow screen
When  the owner swipes its row open on /services and taps "Excluir"
Then  AC-0005-99 holds: no dialog opens and no request is sent
And   the row snaps closed and the toast with copy key services.delete.hasHistory offers "Arquivar"
```

```gherkin
AC-0014-129
Given the delete dialog for service "Facial" opened from its narrow row while "Facial" had no appointment
And   an appointment with "Facial" is then created through this spec
When  the owner types "Facial", confirms, and the response is 409 service.has-history
Then  AC-0005-101 holds: the dialog closes, the row snaps closed and the toast with copy key services.delete.hasHistory offers "Arquivar"
```

```gherkin
AC-0014-130
Given an active service "Peeling" with one appointment created through this spec and an active service "Facial" with none
When  the owner lists services
Then  AC-0005-111 holds: "Peeling" has hasHistory true and "Facial" has hasHistory false
```

```gherkin
AC-0014-131
Given a service "Laser antigo" with one appointment created through this spec and then archived, under the chip "Arquivados" on a narrow screen
When  the owner swipes its row open and taps "Excluir"
Then  AC-0005-114 holds: no dialog opens and no request is sent
And   the row snaps closed and the toast with copy key services.delete.hasHistory shows with no action
```

```gherkin
AC-0014-132
Given a client template "Ficha" with a client "Eva Nunes" who has one appointment created through this spec
When  its owner sends a delete request for "Ficha" with deleteRecords true and confirmName "Ficha"
Then  AC-0001-34 holds: the response is 409 with { "error": "form.records-have-history" }
And   nothing is deleted
```

```gherkin
AC-0014-133
Given a client template "Ficha" with a client "Eva Nunes" who has one appointment created through this spec
When  its owner chooses "Excluir" for "Ficha"
Then  AC-0001-57 holds: the dialog with copy key forms.delete.recordsHaveHistory offers only "Arquivar o modelo" and [Cancelar]
```

```gherkin
AC-0014-134
Given a client template with 3 clients, one of which has one appointment created through this spec
When  its owner reads the template and lists templates
Then  AC-0001-58 holds: both responses report recordCount 3 and recordsWithHistory 1 for it
```

### Provisional criteria

These depend on the proposed answers in §9 and change if the owner decides otherwise. Each names its question.

```gherkin
# §9 Q4
AC-0014-87
Given "Sessão individual" lasts 60 minutes
When  the owner of "studio-ana" creates an appointment at "2026-12-01T10:00:00-03:00"
Then  the response has endsAt "2026-12-01T14:00:00.000Z"
```

```gherkin
# §9 Q4
AC-0014-88
Given an appointment with "Sessão individual" (60 minutes) from "2026-12-01T10:00:00-03:00"
When  the owner changes the duration of "Sessão individual" to 90 minutes and reads the appointment
Then  its endsAt is still "2026-12-01T14:00:00.000Z"
```

```gherkin
# §9 Q4
AC-0014-89
Given "Sessão individual" lasts 60 minutes
When  the owner creates an appointment at "2026-12-01T23:30:00-03:00"
Then  the response is 201 with endsAt "2026-12-02T03:30:00.000Z"
```

```gherkin
# §9 Q1
AC-0014-90
Given the device is in America/Sao_Paulo and an appointment runs from "2026-12-01T02:30:00Z" to "2026-12-01T03:30:00Z"
When  the owner opens /agenda?view=day&date=2026-11-30
Then  a block reads "23:30–00:30"
```

```gherkin
# §9 Q1
AC-0014-91
Given the device is in America/Sao_Paulo and an appointment runs from "2026-12-01T02:30:00Z" to "2026-12-01T03:30:00Z"
When  the owner opens /agenda?view=day&date=2026-12-01
Then  the same appointment's block is shown from 00:00, reading "23:30–00:30"
```

```gherkin
# §9 Q1
AC-0014-92
Given the device is in America/Manaus (UTC-4)
When  the owner saves a new appointment with Data 01/12/2026 and Horário 10:00
Then  the create request carries a startsAt equal to "2026-12-01T14:00:00Z"
```

```gherkin
# §9 Q1
AC-0014-93
Given the device is in America/Sao_Paulo, the time is 2026-11-27 22:00 there, and the owner is on a narrow screen
When  they open /agenda
Then  the day view of 2026-11-27 is shown
```

```gherkin
# §9 Q3
AC-0014-94
Given an owner of "studio-ana"
When  they create an appointment at "2026-12-01T10:00:00-03:00"
Then  the response has status "confirmed"
```

```gherkin
# §9 Q5
AC-0014-95
Given "studio-ana" has an appointment from "2026-12-01T10:00:00-03:00" to "2026-12-01T11:00:00-03:00"
When  its owner creates an appointment at "2026-12-01T11:00:00-03:00"
Then  the response is 201
```

```gherkin
# §9 Q5
AC-0014-96
Given "studio-ana" has an appointment from "2026-12-01T10:00:00-03:00" to "2026-12-01T11:00:00-03:00"
When  its owner creates an appointment at "2026-12-01T09:00:00-03:00" with "Sessão individual" (60 minutes)
Then  the response is 201
```

```gherkin
# §9 Q7
AC-0014-97
Given today is 2026-11-27
When  the owner of "studio-ana" creates an appointment at "2026-11-20T10:00:00-03:00"
Then  the response is 201
```

```gherkin
# §9 Q8
AC-0014-98
Given an owner of "studio-ana"
When  they create an appointment at "2026-12-01T10:00:30-03:00"
Then  the response is 422 with { "error": "appointmentStart.invalid", "field": "startsAt" }
```

```gherkin
# §9 Q9
AC-0014-99
Given today is 2026-12-01, a Tuesday, on a wide screen
When  the owner opens /agenda
Then  the week view shows the columns Sunday 2026-11-29 to Saturday 2026-12-05
And   the column of 2026-12-01 is highlighted as today
```

```gherkin
# §9 Q10
AC-0014-100
Given an owner of "studio-ana"
When  they list appointments from "2026-12-01T00:00:00-03:00" to "2027-01-02T00:00:00-03:00"
Then  the response is 422 with { "error": "appointmentRange.invalid", "field": "to" }
```

```gherkin
# §9 Q14
AC-0014-101
Given the owner is on /agenda?view=day&date=2026-12-01
When  they select the empty half-hour starting at 14:30
Then  /agenda/new opens with Data 01/12/2026 and Horário 14:30
```

```gherkin
# §9 Q15
AC-0014-102
Given the owner is anywhere in "studio-ana"
When  they select "Agenda Rápida" in the navigation
Then  /agenda opens
And   the "Agenda Rápida" entry is marked as the current page
```

```gherkin
# §9 Q22
AC-0014-103
Given the day 2026-12-01 has appointments only at 06:30 and 14:00
When  the owner opens /agenda?view=day&date=2026-12-01
Then  the grid is scrolled so the 06:00 hour is at the top
```

```gherkin
# §9 Q12
AC-0014-135
Given a filled-in new appointment form
When  the owner presses Salvar
Then  the create request is sent
And   no dialog opens
```

```gherkin
# §9 Q4
AC-0014-136
Given an appointment with "Sessão individual" (60 minutes) from 10:00 to 11:00 on 2026-12-01
And   the owner then changed the duration of "Sessão individual" to 90 minutes
When  the owner opens its /agenda/<id>
Then  it shows "10:00–11:00" and the duration "1h"
```

```gherkin
# §9 Q3, Q4
AC-0014-137
Given "Sessão individual" lasts 60 minutes
When  the owner of "studio-ana" creates an appointment at "2026-12-01T10:00:00-03:00" with a body that also carries endsAt "2026-12-01T20:00:00-03:00", status "pending" and source "public_link"
Then  the response is 201 with endsAt "2026-12-01T14:00:00.000Z" and status "confirmed"
And   the stored appointment is recorded as created by the professional, not through the public link
```

```gherkin
# §9 Q14
AC-0014-138
Given the day 2026-12-01 has only an appointment with a 30-minute service from 10:15 to 10:45
When  the owner opens /agenda?view=day&date=2026-12-01
Then  neither the half-hour starting at 10:00 nor the one starting at 10:30 is offered as "Novo agendamento às …" (agenda.slot.new)
And   the half-hours starting at 09:30 and at 11:00 are offered
```

### Withdrawn criteria

Withdrawn IDs are never reused.

- AC-0014-104 (SPEC-0010 R9's check passes with appointments): withdrawn in v0.2. It held in only one
  implementation order, so it was not a fixed behavior. Appointments join SPEC-0010's R1 and R7 under SPEC-0010 §2's
  rule, as §2 Dependencies says (§9 Q19).

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```scope
```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-27 | Draft |
| 0.2 | 2026-11-27 | Spec review fixes, all required changes applied; `status` stays Draft. SPEC-0010 removed from `depends_on`; §2 states that appointments join SPEC-0010's R1 and R7 under SPEC-0010 §2's rule; AC-0014-104 withdrawn (§9 Q19). §2 commits to re-verifying with real appointments the criteria deferred to the first scheduling spec (AC-0004-15, -33, -71; AC-0005-15, -55, -58, -84, -99, -101, -111, -114) and SPEC-0001's AC-0001-34, -57, -58 (AC-0014-123 to -134). R6, R11, R12 marked `assumption`. 4.1 step 6 defines an empty half-hour (`assumption`, Q14); 4.1 step 7 and §8 give the empty state its own "Novo agendamento" button; 4.3 step 1, §7 and AC-0014-80: the duration shown is `endsAt` − `startsAt`; §7: extra create keys (`endsAt`, `status`, `source`) are ignored, as in the client and service create requests; §8: `common.save` / `common.cancel` for [Salvar] / Cancelar and the period-heading rule with en-US and cross-year forms. §9: Q1 and Q12 Blocks extended, Q12 names its conflict with RN-25 and RFC §4.2; Q3, Q4, Q7, Q9, Q14 Blocks completed; §10 preamble sets a test clock. AC-0014-21 split (AC-0014-105, -106); AC-0014-36, -46, -64 corrected; AC-0014-105 to -122 added (tenant context, suspended tenant, non-member, picker and Salvar UI states, empty Data, "Arquivado" badge); provisional AC-0014-135 (Q12), -136 (Q4), -137 (Q3, Q4), -138 (Q14). Pending on the owner: §9 Q1 (time zone) and Q2 (slice order), both blocking, and Q12 (RN-25 / RFC §4.2 conflict); no §9 question is decided |
