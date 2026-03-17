import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('by-email/:email')
  @Roles('OWNER')
  async getByEmail(@Param('email') email: string, @Req() req: any) {
    return this.usersService.findByEmail(email, req.user.branchId);
  }

  @Get()
  @Roles('OWNER')
  async findAll(@Req() req: any) {
    return this.usersService.findAllByBranch(req.user.branchId);
  }

  @Get('me')
  async getMe(@Req() req: any) {
    return this.usersService.getMyProfile(req.user.userId, req.user.branchId);
  }

  @Post()
  @Roles('OWNER')
  async createStaff(
    @Req() req: any,
    @Body() dto: { firstName: string; lastName: string; email: string; password: string; role: string },
  ) {
    return this.usersService.createStaff(dto, req.user.branchId, req.user.userId);
  }

  @Patch('me/profile')
  async updateMyProfile(@Req() req: any, @Body() dto: { firstName: string; lastName: string }) {
    return this.usersService.updateMyProfile(req.user.userId, req.user.branchId, dto);
  }

  @Patch('me/password')
  async updateMyPassword(@Req() req: any, @Body() dto: { newPassword: string }) {
    return this.usersService.changeMyPassword(req.user.userId, req.user.branchId, dto.newPassword);
  }

  @Patch(':id')
  @Roles('OWNER')
  async updateStaff(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateStaff(id, dto, req.user.branchId);
  }

  @Patch(':id/deactivate')
  @Roles('OWNER')
  async deactivateStaff(@Req() req: any, @Param('id') id: string) {
    return this.usersService.deactivateStaff(id, req.user.branchId);
  }

  @Patch(':id/reset-password')
  @Roles('OWNER')
  async resetStaffPassword(@Req() req: any, @Param('id') id: string, @Body() dto: { newPassword: string }) {
    return this.usersService.resetStaffPassword(id, req.user.branchId, dto.newPassword);
  }

  @Delete(':id')
  @Roles('OWNER')
  async removeStaff(@Req() req: any, @Param('id') id: string) {
    return this.usersService.removeStaff(id, req.user.branchId);
  }
}
