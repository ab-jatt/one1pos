import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';

export interface JwtPayload {
  userId: string;
  branchId: string;
  role: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async login(email: string, password: string) {
    // Local database login (all users: owners, managers, cashiers)
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, isActive: true },
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

  async loginWithFirebase(idToken: string) {
    let decoded;
    try {
      decoded = await this.firebaseService.verifyToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }

    const email = decoded.email?.toLowerCase().trim();
    if (!email) {
      throw new UnauthorizedException('Firebase token does not contain an email');
    }

    // Admin SDK getUser() requires service-account credentials.
    // In projectId-only mode we skip this remote disabled check and rely on
    // local DB isActive enforcement (already applied below and in JWT strategy).
    try {
      const firebaseUser = await this.firebaseService.getUser(decoded.uid);
      if (firebaseUser.disabled) {
        throw new UnauthorizedException('This account has been disabled');
      }
    } catch (error: any) {
      const code = String(error?.code || '');
      const message = String(error?.message || '').toLowerCase();
      const missingAdminCreds =
        code === 'auth/invalid-credential' ||
        code === 'auth/insufficient-permission' ||
        message.includes('credential') ||
        message.includes('permission');

      if (!missingAdminCreds) {
        throw error;
      }

      this.logger.warn(
        '[Firebase Login] Skipping Firebase disabled-user check (Admin credentials not configured).',
      );
    }

    let user = await this.prisma.user.findFirst({
      where: {
        firebaseUid: decoded.uid,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        avatar: true,
      },
    });

    // Backward-compatible linking path for legacy rows created before firebaseUid support.
    if (!user) {
      const legacy = await this.prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchId: true,
          avatar: true,
        },
      });

      if (legacy) {
        user = await this.prisma.user.update({
          where: { id: legacy.id },
          data: { firebaseUid: decoded.uid },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            branchId: true,
            avatar: true,
          },
        });
      }
    }

    if (!user || !user.branchId) {
      throw new UnauthorizedException('No store user mapping found for this Firebase account');
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
    // 1. Verify the Firebase ID token via the shared FirebaseService
    let decoded;
    try {
      decoded = await this.firebaseService.verifyToken(idToken);
    } catch (e) {
      this.logger.error('[Google Login] Firebase token verification failed', e);
      throw new UnauthorizedException('Invalid or expired Google token.');
    }

    const email = decoded.email;
    const uid = decoded.uid;
    this.logger.log(`[Google Login] Firebase token verified — uid=${uid}, email=${email}`);

    if (!email) {
      throw new UnauthorizedException('Google account has no email address.');
    }
    const displayName: string = (decoded.name as string | undefined) ?? email.split('@')[0];

    // 2. Look up the user by email in the local database (case-insensitive)
    const normalizedEmail = email.toLowerCase().trim();
    this.logger.log(`[Google Login] Looking up DB user for email: "${normalizedEmail}"`);

    let user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, email: true, name: true, role: true, branchId: true, avatar: true },
    });

    // 3. Auto-provision: if no user found, create a NEW branch + OWNER
    if (!user) {
      this.logger.warn(`[Google Login] No user found for "${normalizedEmail}". Creating new store...`);

      // Create a brand-new branch (store) for this owner — true multi-tenant isolation
      const storeName = `${displayName}'s Store`;
      const branch = await this.prisma.branch.create({
        data: {
          name: storeName,
          address: '',
          phone: '',
          currency: 'USD',
          taxRate: 0,
        },
        select: { id: true, name: true },
      });

      // Create the owner user (no password — Google-only auth)
      const placeholder = await bcrypt.hash(uid + Date.now(), 10);
      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          password: placeholder,
          name: displayName,
          firstName: displayName.split(' ')[0] || displayName,
          lastName: displayName.split(' ').slice(1).join(' ') || '',
          firebaseUid: uid,
          role: 'OWNER',
          permissions: ['all'],
          branchId: branch.id,
          isActive: true,
        },
        select: { id: true, email: true, name: true, role: true, branchId: true, avatar: true },
      });

      // Seed default settings for the new store
      await this.prisma.setting.createMany({
        data: [
          { key: 'currency', value: 'USD', branchId: branch.id },
          { key: 'tax_rate', value: '0', branchId: branch.id },
          { key: 'app_name', value: storeName, branchId: branch.id },
        ],
        skipDuplicates: true,
      });

      this.logger.log(
        `[Google Login] Auto-provisioned OWNER "${normalizedEmail}" (id=${user.id}) with NEW branch "${branch.name}" (${branch.id})`,
      );
    } else {
      this.logger.log(`[Google Login] User found — id=${user.id}, role=${user.role}, branchId=${user.branchId}`);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid: uid },
      }).catch(() => undefined);
    }

    if (!user.branchId) {
      throw new UnauthorizedException('No store found for this account. Please contact support.');
    }

    // 4. Issue JWT
    const payload: JwtPayload = {
      userId: user.id,
      branchId: user.branchId,
      role: user.role,
      email: normalizedEmail,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: normalizedEmail,
        name: displayName || user.name,
        role: user.role,
        branchId: user.branchId,
        avatar: user.avatar ?? undefined,
      },
    };
  }
}
