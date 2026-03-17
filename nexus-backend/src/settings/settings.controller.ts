import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Roles } from '../auth/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@Req() req: any) {
    return this.settingsService.getSettings(req.user.branchId);
  }

  @Patch()
  @Roles('OWNER')
  updateSettings(
    @Req() req: any,
    @Body()
    body: {
      taxRate?: number;
      currency?: string;
      language?: string;
      storeName?: string;
    },
  ) {
    return this.settingsService.updateSettings(req.user.branchId, body);
  }
}
