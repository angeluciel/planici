import type { FormChangeKind } from '@planici/schemas';

// Schema changes of SPEC-0001 section 3.3: they decide whether a save publishes
// a version and feed the change preview (section 7). Labels, help text, the
// protected flag, option labels and the template's own metadata are not here.

export type DiffCurrentField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: { id: string }[] | null;
};

export type DiffNextField = {
  /** Absent for a new field. */
  id?: string;
  label: string;
  type: string;
  required?: boolean;
  options?: { id?: string }[] | null;
};

export type SchemaDiff = {
  schemaChanged: boolean;
  added: { label: string; type: string; required: boolean }[];
  removed: { id: string; label: string }[];
  changed: { id: string; label: string; changes: FormChangeKind[] }[];
};

/**
 * `current` is the latest version as stored, `next` the field list of the save.
 * A field without id, or one whose type differs from the stored one (a type
 * change is a new field, SPEC-0002 R12), is added; a current field the list does
 * not keep is removed.
 */
export function diffSchema(
  current: readonly DiffCurrentField[],
  next: readonly DiffNextField[],
): SchemaDiff {
  const currentById = new Map(current.map((field) => [field.id, field]));
  const keptIds = new Set<string>();
  const added: SchemaDiff['added'] = [];
  const keptOrder: { field: DiffCurrentField; next: DiffNextField }[] = [];

  for (const field of next) {
    const stored = field.id ? currentById.get(field.id) : undefined;
    if (!stored || stored.type !== field.type) {
      added.push({
        label: field.label,
        type: field.type,
        required: field.required ?? false,
      });
      continue;
    }
    keptIds.add(stored.id);
    keptOrder.push({ field: stored, next: field });
  }

  const removed = current
    .filter((field) => !keptIds.has(field.id))
    .map(({ id, label }) => ({ id, label }));

  const moved = movedFields(current, keptOrder);
  const changed: SchemaDiff['changed'] = [];

  for (const { field, next: incoming } of keptOrder) {
    const changes: FormChangeKind[] = [];

    if ((incoming.required ?? field.required) !== field.required)
      changes.push('required');
    if (optionsChanged(field, incoming)) changes.push('options');
    if (moved.has(field.id)) changes.push('position');

    if (changes.length > 0)
      changed.push({ id: field.id, label: incoming.label, changes });
  }

  return {
    schemaChanged: added.length > 0 || removed.length > 0 || changed.length > 0,
    added,
    removed,
    changed,
  };
}

function optionsChanged(
  stored: DiffCurrentField,
  incoming: DiffNextField,
): boolean {
  if (!stored.options || !incoming.options) return false;

  // an option without id is new
  if (incoming.options.some((option) => !option.id)) return true;

  const before = new Set(stored.options.map((option) => option.id));
  const after = new Set(incoming.options.map((option) => option.id));

  return before.size !== after.size || [...before].some((id) => !after.has(id));
}

/**
 * Kept fields whose place relative to the other kept fields changed: those
 * outside the longest run that keeps its relative order. Inserting or removing
 * a field therefore moves nothing.
 */
function movedFields(
  current: readonly DiffCurrentField[],
  kept: readonly { field: DiffCurrentField }[],
): Set<string> {
  const indexOf = new Map(current.map((field, index) => [field.id, index]));
  const sequence = kept.map(({ field }) => indexOf.get(field.id) ?? 0);

  // longest increasing subsequence, O(n^2): a version has at most 100 fields
  const length = sequence.map(() => 1);
  const previous = sequence.map(() => -1);
  let best = -1;

  for (let i = 0; i < sequence.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (sequence[j]! < sequence[i]! && length[j]! + 1 > length[i]!) {
        length[i] = length[j]! + 1;
        previous[i] = j;
      }
    }
    if (best === -1 || length[i]! > length[best]!) best = i;
  }

  const stays = new Set<number>();
  for (let i = best; i !== -1 && i >= 0; i = previous[i]!) stays.add(i);

  return new Set(
    kept.filter((_, index) => !stays.has(index)).map(({ field }) => field.id),
  );
}
