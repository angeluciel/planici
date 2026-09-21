export class CheckAvailabilityQuery {
  constructor(
    readonly field: 'email' | 'slug',
    readonly value: string,
  ) {}
}
