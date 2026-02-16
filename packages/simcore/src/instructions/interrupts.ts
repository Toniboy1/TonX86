import type { ExecutionContext } from "../types";

export function executeInt(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const intNum = ctx.parseOperand(operands[0]);

  if (intNum.type === "immediate") {
    switch (intNum.value) {
      case 0x10: {
        // Video services - write character to console
        const ah = (ctx.cpu.registers[0] >> 8) & 0xff;
        const al = ctx.cpu.registers[0] & 0xff;

        if (ah === 0x0e) {
          ctx.appendConsoleOutput(String.fromCharCode(al));
        }
        break;
      }

      case 0x20: {
        // Program terminate
        ctx.cpu.halted = true;
        ctx.cpu.running = false;
        break;
      }

      case 0x21: {
        // DOS-style services
        const ah = (ctx.cpu.registers[0] >> 8) & 0xff;

        switch (ah) {
          case 0x02: {
            const dl = ctx.cpu.registers[2] & 0xff;
            ctx.appendConsoleOutput(String.fromCharCode(dl));
            break;
          }
          case 0x09: {
            // Write $-terminated string to stdout
            // DS:EDX points to string ending with '$' (0x24)
            const address = ctx.cpu.registers[2]; // EDX
            let result = "";
            let offset = 0;
            const maxLength = 4096; // Safety limit to prevent infinite loops

            while (offset < maxLength) {
              const byte = ctx.readMemory32(address + offset) & 0xff;
              if (byte === 0x24) {
                // '$' terminator found
                break;
              }
              result += String.fromCharCode(byte);
              offset++;
            }

            ctx.appendConsoleOutput(result);
            break;
          }
        }
        break;
      }
    }
  }
}

export function executeInt3(ctx: ExecutionContext): void {
  // INT3 triggers a breakpoint - halt the processor
  ctx.cpu.halted = true;
  ctx.cpu.running = false;
}

export function executeIret(_ctx: ExecutionContext): void {
  // IRET is handled in two parts:
  // 1. step() pops the return address (IP) from stack
  // 2. This function is called BEFORE step() pops IP
  //
  // Note: This function is intentionally empty because the actual
  // popping and flag restoration happens in step() after control flow handling
  // to ensure proper order: pop IP, then pop FLAGS
}
