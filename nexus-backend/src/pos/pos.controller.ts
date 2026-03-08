import { Controller, Post, Req } from '@nestjs/common';
import { PosService } from './pos.service';

@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  /**
   * POST /api/pos/open-drawer
   *
   * Returns the ESC/POS bytes (base64) that should be forwarded to a receipt
   * printer via QZ Tray to open the cash drawer.  Branch isolation is
   * guaranteed by the global JwtAuthGuard — the user.branchId is verified on
   * every request; this endpoint only proceeds for authenticated users.
   */
  @Post('open-drawer')
  openDrawer(@Req() req: any) {
    // req.user is injected by JwtAuthGuard (branchId, role, etc.)
    // No sensitive data is needed from the user to generate the command,
    // but having the guard here ensures only authenticated branch staff can
    // trigger this.
    return this.posService.getDrawerOpenCommand();
  }
}
