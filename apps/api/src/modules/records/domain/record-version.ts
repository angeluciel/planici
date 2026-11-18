import type { Field } from '@planici/schemas';

/** A field as the version read lists it, with the current metadata. */
export type RecordVersionField = Omit<Field, 'valueCount'>;

/** One published version of a template: its number and fields in display order. */
export type RecordVersion = {
  number: number;
  fields: RecordVersionField[];
};
