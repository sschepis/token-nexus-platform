import { authenticator } from 'otplib';
import { createLogger } from '@utils/logger';
import { MFAError } from '@utils/error';
import { User } from 'parse/node';
import QRCode from 'qrcode';

const logger = createLogger('MFAService');

export interface MFAConfig {
  issuer: string;
  period: number;
  digits: number;
  algorithm: 'sha1' | 'sha256' | 'sha512';
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  recoveryKeys: string[];
}

export class MFAService {
  private config: MFAConfig;

  constructor(config: Partial<MFAConfig> = {}) {
    this.config = {
      issuer: 'GemCMS',
      period: 30,
      digits: 6,
      algorithm: 'sha256',
      ...config,
    };

    // Configure authenticator
    authenticator.options = {
      window: 1,
      ...this.config,
    };
  }

  /**
   * Generate MFA setup for a user
   */
  async generateSetup(user: User): Promise<MFASetupResponse> {
    try {
      // Generate secret
      const secret = authenticator.generateSecret();

      // Generate QR code
      const otpauth = authenticator.keyuri(
        user.getEmail() || user.get('username'),
        this.config.issuer,
        secret
      );
      const qrCode = await QRCode.toDataURL(otpauth);

      // Generate recovery keys
      const recoveryKeys = Array.from({ length: 8 }, () =>
        this.generateRecoveryKey()
      );

      // Hash recovery keys before storing
      const hashedRecoveryKeys = recoveryKeys.map((key) =>
        this.hashRecoveryKey(key)
      );

      // Store MFA data in user object
      await user.save({
        mfaEnabled: false,
        mfaSecret: this.encryptSecret(secret),
        mfaRecoveryKeys: hashedRecoveryKeys,
        mfaLastUsed: null,
      }, { useMasterKey: true });

      return {
        secret,
        qrCode,
        recoveryKeys,
      };
    } catch (error) {
      logger.error('Failed to generate MFA setup', { error, userId: user.id });
      throw new MFAError('Failed to generate MFA setup');
    }
  }

  /**
   * Verify and enable MFA for a user
   */
  async verifyAndEnable(user: User, token: string): Promise<void> {
    try {
      const secret = this.decryptSecret(user.get('mfaSecret'));
      const isValid = authenticator.verify({ token, secret });

      if (!isValid) {
        throw new MFAError('Invalid verification code');
      }

      await user.save({
        mfaEnabled: true,
        mfaLastUsed: new Date(),
      }, { useMasterKey: true });

      logger.info('MFA enabled for user', { userId: user.id });
    } catch (error) {
      logger.error('Failed to verify and enable MFA', { error, userId: user.id });
      throw error instanceof MFAError ? error : new MFAError('Failed to enable MFA');
    }
  }

  /**
   * Verify MFA token
   */
  async verify(user: User, token: string): Promise<boolean> {
    try {
      if (!user.get('mfaEnabled')) {
        return true;
      }

      const secret = this.decryptSecret(user.get('mfaSecret'));
      const isValid = authenticator.verify({ token, secret });

      if (isValid) {
        await user.save({
          mfaLastUsed: new Date(),
        }, { useMasterKey: true });
      }

      return isValid;
    } catch (error) {
      logger.error('Failed to verify MFA token', { error, userId: user.id });
      throw new MFAError('Failed to verify MFA token');
    }
  }

  /**
   * Verify recovery key and disable MFA
   */
  async verifyRecoveryAndDisable(user: User, recoveryKey: string): Promise<void> {
    try {
      const hashedKey = this.hashRecoveryKey(recoveryKey);
      const storedKeys = user.get('mfaRecoveryKeys') || [];

      if (!storedKeys.includes(hashedKey)) {
        throw new MFAError('Invalid recovery key');
      }

      // Remove used recovery key
      const updatedKeys = storedKeys.filter((key: string) => key !== hashedKey);

      await user.save({
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryKeys: updatedKeys,
        mfaLastUsed: null,
      }, { useMasterKey: true });

      logger.info('MFA disabled using recovery key', { userId: user.id });
    } catch (error) {
      logger.error('Failed to verify recovery key', { error, userId: user.id });
      throw error instanceof MFAError ? error : new MFAError('Failed to verify recovery key');
    }
  }

  /**
   * Disable MFA for a user
   */
  async disable(user: User): Promise<void> {
    try {
      await user.save({
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryKeys: null,
        mfaLastUsed: null,
      }, { useMasterKey: true });

      logger.info('MFA disabled for user', { userId: user.id });
    } catch (error) {
      logger.error('Failed to disable MFA', { error, userId: user.id });
      throw new MFAError('Failed to disable MFA');
    }
  }

  private generateRecoveryKey(): string {
    return Array.from(
      { length: 4 },
      () => Math.random().toString(36).substring(2, 7)
    ).join('-');
  }

  private hashRecoveryKey(key: string): string {
    // In a real implementation, use a proper crypto library and salt
    return require('crypto')
      .createHash('sha256')
      .update(key)
      .digest('hex');
  }

  private encryptSecret(secret: string): string {
    // In a real implementation, use proper encryption with a secure key
    return secret;
  }

  private decryptSecret(encryptedSecret: string): string {
    // In a real implementation, use proper decryption with a secure key
    return encryptedSecret;
  }
}

export const mfaService = new MFAService();
