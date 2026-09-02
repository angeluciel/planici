import { AccountInactiveError, NoPasswordSetError } from "./errors/auth.errors.js";

export type UserStatus = "active" | "suspended" | "deleted"

export type UserProps = {
  id: string;
  email: string;
  slug: string;
  name: string;
  surname: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  passwordChangedAt: Date | null;
  lastLoginAt: Date | null;
}

/**
 * The account aggregate.
 */

export class User {
  private constructor(private readonly props: UserProps) {}

  static fromProps(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get slug(): string {
    return this.props.slug;
  }

  get name(): string {
    return this.props.name;
  }

  get surname(): string {
    return this.props.surname;
  }

  get displayName(): string {
    return (
      this.props.displayName ??
        `${this.props.name} ${this.props.surname}`.trim()
    );
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get emailVerified(): boolean {
    return this.props.emailVerifiedAt !== null;
  }

  get isActive(): boolean {
    return this.props.status === 'active';
  }

  /**
   * only an active account can login
   */
  assertCanAuthenticate(): void {
    if (!this.isActive) throw new AccountInactiveError();
  }

  /** A google-only account has no hash to compare against */
  assertHasPassword(): asserts this is User & { passwordHash: string } {
    if (!this.props.passwordHash) throw new NoPasswordSetError();
  }

  toPublic() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      surname: this.surname,
      slug: this.slug,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
      emailVerified: this.emailVerified,
    };
  }
}