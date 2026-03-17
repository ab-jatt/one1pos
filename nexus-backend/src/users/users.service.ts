import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async findByEmail(email: string, branchId?: string) {
    const where: any = { email, deletedAt: null };
    if (branchId) where.branchId = branchId;
    const user = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatar: true,
        branchId: true,
        isActive: true,
      },
    });
    return user ?? null;
  }

  async findAllByBranch(branchId: string) {
    return this.prisma.user.findMany({
      where: { branchId, deletedAt: null },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        firebaseUid: true,
        role: true,
        avatar: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(
    dto: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role: string;
    },
    branchId: string,
    createdById: string,
  ) {
    const validRoles = ['MANAGER', 'CASHIER', 'STAFF'];
    if (!validRoles.includes(dto.role)) {
      throw new BadRequestException('Staff role must be MANAGER, CASHIER, or STAFF');
    }

    const email = dto.email.toLowerCase().trim();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    if (!emailRegex.test(email)) {
      throw new BadRequestException('Please enter a valid email address (example: cashier@storea.com)');
    }

    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    let firebaseUserId: string | null = null;
    try {
      // Use the Identity Toolkit REST API — requires only FIREBASE_API_KEY (no service account needed)
      const firebaseUser = await this.firebaseService.createUserWithApiKey(email, dto.password);
      firebaseUserId = firebaseUser.uid;
    } catch (error: any) {
      const code = error?.code || '';
      const message = String(error?.message || '');
      if (code === 'auth/email-already-exists' || code === 'auth/email-already-in-use') {
        throw new BadRequestException('User with this email already exists. Please choose another email.');
      }
      if (code === 'auth/invalid-email') {
        throw new BadRequestException('Firebase rejected the email format. Use a valid email like cashier@storea.com.');
      }
      if (code === 'auth/invalid-password') {
        throw new BadRequestException('Password must be at least 6 characters and not too common.');
      }
      if (!process.env.FIREBASE_API_KEY || code === 'auth/internal-error') {
        throw new BadRequestException(
          'FIREBASE_API_KEY is not set on the backend. Please add it to the Container App environment variables.',
        );
      }
      throw new BadRequestException(`Failed to create Firebase account${code ? ` (${code})` : ''}: ${message}`);
    }

    const placeholderPasswordHash = await bcrypt.hash(`firebase:${firebaseUserId}:${Date.now()}`, 10);

    try {
      return await this.prisma.user.create({
        data: {
          firstName,
          lastName,
          name: fullName,
          email,
          password: placeholderPasswordHash,
          firebaseUid: firebaseUserId,
          role: dto.role as any,
          permissions: [],
          branchId,
          isActive: true,
          createdById,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          firebaseUid: true,
          role: true,
          avatar: true,
          branchId: true,
          isActive: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (firebaseUserId) {
        await this.firebaseService.deleteUser(firebaseUserId).catch(() => undefined);
      }
      throw error;
    }
  }

  async updateStaff(
    id: string,
    dto: { firstName?: string; lastName?: string; role?: string },
    branchId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, branchId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found in your branch');
    }

    if (!user.isActive) {
      throw new BadRequestException('Cannot update an inactive user');
    }

    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (data.firstName || data.lastName) {
      const firstName = data.firstName ?? user.firstName ?? user.name.split(' ')[0] ?? '';
      const lastName = data.lastName ?? user.lastName ?? user.name.split(' ').slice(1).join(' ');
      data.name = `${firstName} ${lastName}`.trim();
    }

    if (dto.role) {
      if (!['MANAGER', 'CASHIER', 'STAFF'].includes(dto.role)) {
        throw new BadRequestException('Invalid role update');
      }
      data.role = dto.role;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        firebaseUid: true,
        role: true,
        avatar: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async deactivateStaff(id: string, branchId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, branchId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found in your branch');
    }
    if (user.role === 'OWNER') {
      throw new BadRequestException('Cannot deactivate the owner account');
    }

    if (user.firebaseUid) {
      // Best-effort: disable the Firebase account if Admin SDK credentials are present.
      // If they're not, the DB isActive=false flag and JWT strategy block access regardless.
      await this.firebaseService.updateUser(user.firebaseUid, { disabled: true }).catch(() => undefined);
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  async resetStaffPassword(id: string, branchId: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, branchId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found in your branch');
    }
    if (!user.firebaseUid) {
      throw new BadRequestException('User is not linked to Firebase authentication');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    await this.firebaseService.updateUser(user.firebaseUid, {
      password: newPassword,
      disabled: false,
    });

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    return { success: true };
  }

  async getMyProfile(userId: string, branchId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        branchId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        branchId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMyProfile(
    userId: string,
    branchId: string,
    dto: { firstName: string; lastName: string },
  ) {
    const current = await this.prisma.user.findFirst({
      where: {
        id: userId,
        branchId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!current) {
      throw new NotFoundException('User not found');
    }

    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    const name = `${firstName} ${lastName}`.trim();
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, name },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        branchId: true,
      },
    });

    if (current.firebaseUid) {
      await this.firebaseService.updateUser(current.firebaseUid, { displayName: name }).catch(() => undefined);
    }

    return updated;
  }

  async changeMyPassword(userId: string, branchId: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        branchId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.firebaseUid) {
      throw new BadRequestException('User is not linked to Firebase authentication');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    await this.firebaseService.updateUser(user.firebaseUid, { password: newPassword });
    return { success: true };
  }

  async removeStaff(id: string, branchId: string) {
    return this.deactivateStaff(id, branchId);
  }
}
