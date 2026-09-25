# Backlog answers

## 2026-09-24 — missing Figma mockups (design-analyst NEEDS)
Q: Most mockups (onboarding, services, clients create/edit/delete, agenda, manual booking) are missing. How should we handle them?
A (owner): Option 1. Add the new frames to the same Figma file (`rWWne0gLS6YsVEuz4c7Amg`) first. UI issues get Figma node refs once the frames exist. No separate design issues.
Impact: web work on these flows waits for the frames. contracts/db/api work is not blocked. Re-run design-analyst to update figma-map.md after the frames are added.

## 2026-09-24: draft review (owner)
- Q1 tenant switcher: out of scope; one tenant per user in MVP.
- Q2 encryption: ENCRYPT EVERY client field at rest (overrides recommendation). Not deferred.
- Q3 client history (ID-TMP-11): remove from this pass; re-add with Payments epic.
- Q4 RN-25 confirm dialog: one shared web issue blocking service/client delete issues.
- Q5 currency BRL fixed: accepted.
- Q6 split Agenda into "Agenda" (12-18) and "Public booking" (19-20).
- ID-TMP-02: drop or reduce to single-owner role (roles/RBAC RF-05/06 is post-MVP).
- Linear: team "João Pedro M Izidoro", project "Planici", epics as project milestones.

## 2026-09-24: encryption scope revised (owner: "encrypt only what you deem needed")
Supersedes Q2 "encrypt every field".
- App-level field encryption (AES-256-GCM, versioned ciphertext) ONLY for sensitive free text:
  client notes/observations and any field that can hold health data (RFC §6.2, LGPD Art. 11 sensitive data).
- Government id (CPF), if the MVP client model has one: encrypted + HMAC blind index for exact-match lookup/uniqueness.
- name, email, phone stay plaintext (searchable/sortable in SQL). Protected by storage encryption at rest (Neon), TLS, tenant RLS, and log masking.
- Encrypted fields are not searchable and not sortable.
