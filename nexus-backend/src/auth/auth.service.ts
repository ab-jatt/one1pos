import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  userId: string;
  branchId: string;
  role: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabase: SupabaseClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (url && anonKey) {
      this.supabase = createClient(url, anonKey);
      this.logger.log('Supabase client initialized');
    } else {
      this.logger.warn('Supabase URL/Key not set — owner login disabled');
    }

    // Initialize Firebase Admin SDK (singleton — safe to call in multiple service instances)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson && admin.apps.length === 0) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        });
        this.logger.log('Firebase Admin SDK initialized');
      } catch (e) {
        this.logger.warn('Failed to initialize Firebase Admin SDK — check FIREBASE_SERVICE_ACCOUNT_JSON');
      }
    }
  }

  async login(email: string, password: string) {
    // ── Step 1: Try Supabase login (store owners) ──
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          // Supabase login succeeded — this is an OWNER
          const branch = await this.prisma.branch.findFirst({
            where: { ownerId: data.user.id },
          });

          if (!branch) {
            throw new UnauthorizedException(
              'No store found for this account. Please contact support.',
            );
          }

          const payload: JwtPayload = {
            userId: data.user.id,
            branchId: branch.id,
            role: 'OWNER',
            email: data.user.email!,
          };

          return {
            access_token: this.jwtService.sign(payload),
            user: {
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.name || email.split('@')[0],
              role: 'OWNER',
              branchId: branch.id,
            },
          };
        }
      } catch (err) {
        // If not UnauthorizedException from our logic, just log and try local
        if (err instanceof UnauthorizedException) throw err;
        this.logger.debug(`Supabase login failed for ${email}, trying local`);
      }
    }

    // ── Step 2: Try local database login (cashiers/managers) ──
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        branchId: true,
        avatar: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      userId: user.id,
      branchId: user.branchId,
      role: user.role,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
        avatar: user.avatar,
      },
    };
  }

  async validateToken(payload: JwtPayload) {
    return payload;
  }

  async loginWithGoogle(idToken: string) {
    // 1. Verify the Firebase ID token server-side
    if (admin.apps.length === 0) {
      throw new UnauthorizedException('Google authentication is not configured on this server.');
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired Google token.');
    }

    const email = decoded.email;
    if (!email) {
      throw new UnauthorizedException('Google account has no email address.');
    }
    const displayName: string = (decoded.name as string | undefined) ?? email.split('@')[0];

    // 2. Look up owner by email via Supabase Admin REST API
    //    (SDK does not expose getUserByEmail — use the REST endpoint directly)
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new UnauthorizedException('Server configuration error: owner lookup unavailable.');
    }

    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      },
    );

    if (!res.ok) {
      this.logger.error(`Supabase admin user lookup failed: ${res.status}`);
      throw new UnauthorizedException('Login with a valid owner email address.');
    }

    const body: { users?: { id: string; email: string }[] } = await res.json();
    const supabaseUser = (body.users ?? []).find((u) => u.email === email);

    if (!supabaseUser) {
      throw new UnauthorizedException('Login with a valid owner email address.');
    }

    // 3. Confirm they have a branch in our database
    const branch = await this.prisma.branch.findFirst({
      where: { ownerId: supabaseUser.id },
    });
    if (!branch) {
      throw new UnauthorizedException('Login with a valid owner email address.');
    }

    // 4. Issue JWT
    const payload: JwtPayload = {
      userId: supabaseUser.id,
      branchId: branch.id,
      role: 'OWNER',
      email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: supabaseUser.id,
        email,
        name: displayName,
        role: 'OWNER',
        branchId: branch.id,
        avatar: undefined,
      },
    };
  }
}
