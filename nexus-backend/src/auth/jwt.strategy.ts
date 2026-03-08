import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'one1pos-jwt-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    // Attach to request.user
    return {
      userId: payload.userId,
      branchId: payload.branchId,
      role: payload.role,
      email: payload.email,
    };
  }
}
