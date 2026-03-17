import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator that extracts branchId from the authenticated user.
 *
 * Usage:
 *   @Get()
 *   findAll(@BranchId() branchId: string) { ... }
 */
export const BranchId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.branchId;
  },
);
