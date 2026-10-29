import type { RefreshFamilyState } from "./tokens";

// Ports (interfaces) the mobile auth service depends on. The route layer provides
// Prisma- and provider-backed implementations; tests provide in-memory fakes. This
// keeps the auth logic pure and runnable without a database or network.

export type Provider = "apple" | "google" | "email";

export interface VerifiedIdentity {
  provider: Provider;
  subject: string;
  email: string | null;
  emailIsPrivateRelay: boolean;
  /** The provider vouches the address belongs to this person (Google/Apple email_verified, or our OTP). */
  emailVerified?: boolean;
}

/** Verifies a provider credential (Apple/Google identity JWT, or a pre-verified email). */
export interface CredentialVerifier {
  verify(provider: Provider, credential: string): Promise<VerifiedIdentity>;
}

/** Resolves a verified identity to an account: by (provider, subject), else by its verified email. */
export interface IdentityResolver {
  resolve(identity: VerifiedIdentity): Promise<{ accountId: string; isNew: boolean }>;
}

export interface StoredSession {
  sessionId: string;
  accountId: string;
  deviceId: string;
  family: RefreshFamilyState;
}

/** Persists refresh-token families (sessions). */
export interface SessionStore {
  create(session: StoredSession): Promise<void>;
  get(sessionId: string): Promise<StoredSession | undefined>;
  save(session: StoredSession): Promise<void>;
}

export interface AuthDeps {
  verifier: CredentialVerifier;
  resolver: IdentityResolver;
  sessions: SessionStore;
  accessSecret: string;
  newId: () => string;
  newSecret: () => string;
}
