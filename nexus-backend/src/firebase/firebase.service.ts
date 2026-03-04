import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;

  onModuleInit() {
    if (!admin.apps.length) {
      // Initialize with projectId only (no service account needed for token verification)
      // For production, set GOOGLE_APPLICATION_CREDENTIALS env var to a service account JSON path
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      
      if (serviceAccountPath) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(serviceAccountPath);
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || 'one1pos',
        });
        this.logger.log('Firebase Admin initialized with service account');
      } else {
        // Initialize without service account - relies on FIREBASE_PROJECT_ID
        this.app = admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'one1pos',
        });
        this.logger.log('Firebase Admin initialized (projectId only)');
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
}
