import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor that extracts branchId from the authenticated user's JWT
 * and attaches it to request.branchId for convenient access in controllers/services.
 *
 * Also validates that the user has a branchId — rejects unauthenticated or
 * branch-less requests with 403.
 *
 * Usage: Apply globally in AppModule or per-controller with @UseInterceptors().
 */
@Injectable()
export class BranchIsolationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Public routes won't have a user — skip gracefully
    if (!request.user) {
      return next.handle();
    }

    const { branchId } = request.user;
    if (!branchId) {
      throw new ForbiddenException(
        'User is not associated with any branch. Access denied.',
      );
    }

    // Attach branchId for easy access downstream
    request.branchId = branchId;

    return next.handle();
  }
}
