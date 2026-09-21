export const GOOGLE_VERIFIER = Symbol('GOOGLE_VERIFIER');

export type GoogleAccount = {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
};

export interface GoogleVerifier {
  /** validates an id token from Google Id erices */
  verify(idToken: string): Promise<GoogleAccount>;
}
