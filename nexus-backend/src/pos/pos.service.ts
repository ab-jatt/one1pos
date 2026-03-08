import { Injectable } from '@nestjs/common';

// ESC/POS cash drawer open command: ESC p m t1 t2
// 0x1B 0x70 0x00 0x19 0xFA  — pin 2, pulse on time 25ms, pulse off time 250ms
const DRAWER_OPEN_BYTES = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

@Injectable()
export class PosService {
  /**
   * Returns the ESC/POS cash drawer open command as a base64-encoded string.
   * The frontend (via QZ Tray) must decode and send these raw bytes to the
   * connected receipt printer, which will then trigger the drawer.
   */
  getDrawerOpenCommand(): { command: string; encoding: string } {
    return {
      command: DRAWER_OPEN_BYTES.toString('base64'),
      encoding: 'base64',
    };
  }
}
