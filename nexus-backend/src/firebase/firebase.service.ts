import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;

  onModuleInit() {
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'one1pos';
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      // Azure stores \n as literal backslash-n in env vars — replace with real newlines
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (clientEmail && privateKey) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
        this.logger.log('Firebase Admin initialized with service account credentials');
      } else {
        // Fallback: projectId-only (token verification only, no Admin API calls)
        this.app = admin.initializeApp({ projectId });
        this.logger.warn(
          'Firebase Admin initialized without credentials — set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY for full Admin SDK support',
        );
      }
    } else {
      this.app = admin.apps[0]!;
    }
  }

  getAuth(): admin.auth.Auth {
    return this.app.auth();
  }

  async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decoded = await this.getAuth().verifyIdToken(idToken);
      return decoded;
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      throw error;
    }
  }

  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    return this.getAuth().getUser(uid);
  }

  async createUser(data: {
    email: string;
    password: string;
    displayName?: string;
    disabled?: boolean;
  }): Promise<admin.auth.UserRecord> {
    return this.getAuth().createUser(data);
  }

  async updateUser(uid: string, data: admin.auth.UpdateRequest): Promise<admin.auth.UserRecord> {
    return this.getAuth().updateUser(uid, data);
  }

  async deleteUser(uid: string): Promise<void> {
    await this.getAuth().deleteUser(uid);
  }

  /**
   * Creates a Firebase Auth user via the Identity Toolkit REST API using
   * the project's web API key. This requires no service account credentials,
   * making it usable even when FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
   * are not configured.
   */
  async createUserWithApiKey(
    email: string,
    password: string,
  ): Promise<{ uid: string }> {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      throw Object.assign(new Error('FIREBASE_API_KEY is not set'), {
        code: 'auth/internal-error',
      });
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      },
    );

    const data: any = await res.json();

    if (!res.ok) {
      const msg: string = data?.error?.message ?? 'USER_CREATION_FAILED';
      let code = 'auth/unknown';
      if (msg.includes('EMAIL_EXISTS')) code = 'auth/email-already-exists';
      else if (msg.includes('INVALID_EMAIL')) code = 'auth/invalid-email';
      else if (msg.includes('WEAK_PASSWORD') || msg.includes('PASSWORD')) code = 'auth/invalid-password';
      throw Object.assign(new Error(msg), { code });
    }

    return { uid: data.localId as string };
  }
}
