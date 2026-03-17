import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'one1pos-jwt-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    // Verify the user and branch still exist in the database
    const user = await this.prisma.user.findFirst({
      where: { id: payload.userId, branchId: payload.branchId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    return {
      userId: payload.userId,
      branchId: payload.branchId,
      role: payload.role,
      email: payload.email,
    };
  }
}
