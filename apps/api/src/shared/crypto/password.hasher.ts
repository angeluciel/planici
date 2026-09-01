import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { authConfig } from '@/config/namespaces/auth.config.js';
import { hash, compare } from 'bcryptjs';

@Injectable()
export class PasswordHasher {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  hash(plain: string): Promise<string> {
    return hash(plain, this.config.bcrypCost);
  }

  verify(plain: string, passwordHash: string): Promise<boolean> {
    return compare(plain, passwordHash);
  }

  /**
   * Burns roughly the same time as a real verification. Called when the e-mail
   * does not exist, so response timing cannot be used to enumerate accounts.
   */
  async fakeVerify(): Promise<void> {
    await compare(
      'timing-equaliser',
      '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Y8dEuqe1cS.MO6cJHFVeYq6iMOoJ8pC',
    );
  }
}
