import {
  DebugSession,
  StoppedEvent,
  TerminatedEvent,
  InitializedEvent,
  OutputEvent,
} from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";

interface TonX86LaunchRequestArguments
  extends DebugProtocol.LaunchRequestArguments {
  program?: string;
  cpuSpeed?: number;
  stopOnEntry?: boolean;
  enableLogging?: boolean;
}
import * as fs from "fs";
import * as path from "path";
import { Simulator, Instruction } from "@tonx86/simcore";
import { parseAssembly } from "./parser";

// File-based logger for debugging - will be set after launch
let LOG_FILE = "";
function logToFile(message: string): void {
  if (!LOG_FILE) return;
  try {
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${message}\n`);
  } catch (e) {
    // Ignore file write errors
  }
}

interface SourceInfo {
  path: string;
  lines: string[];
}
export class TonX86DebugSession extends DebugSession {
  private sourceInfo: SourceInfo | undefined;
  private currentLine = 1;
  private programPath = "";
  private breakpoints: Set<number> = new Set(); // Set of line numbers with breakpoints
  private configurationDone = false; // Track if configuration is done
  private stopOnEntry: boolean = true; // Whether to stop at first instruction
  private simulator: Simulator; // CPU simulator instance
  private constants: Map<string, number> = new Map(); // EQU constants
  private cpuSpeed: number = 100; // CPU speed percentage (1-200)

  public constructor() {
    super();
    this.simulator = new Simulator(8, 8); // Create simulator with 8x8 LCD
    console.error("[TonX86] Debug adapter constructor called");
  }

  /**
   * Detect required LCD dimensions by scanning EQU constants and instructions.
   * Strategy:
   *   1. Check EQU constants for LCD_BASE (0xF000) and GRID_SIZE to determine dimensions
   *   2. Fall back to scanning instructions for hardcoded LCD addresses
   *   3. Default to 8x8 if no LCD access detected
   */
  private detectLCDDimensions(
    instructions: Instruction[],
    constants: Map<string, number>,
  ): [number, number] {
    // Strategy 1: Use EQU constants for reliable detection
    let hasLCDBase = false;
    let gridSize = 0;

    for (const [name, value] of constants) {
      const upperName = name.toUpperCase();
      // Detect LCD base address constant (e.g., LCD_BASE EQU 0xF000)
      if (value >= 0xf000 && value <= 0xffff) {
        hasLCDBase = true;
      }
      // Detect grid size constant (e.g., GRID_SIZE EQU 64)
      if (
        upperName.includes("GRID") ||
        upperName.includes("LCD_W") ||
        upperName.includes("LCD_H") ||
        upperName.includes("SCREEN") ||
        upperName.includes("DISPLAY_SIZE")
      ) {
        gridSize = Math.max(gridSize, value);
      }
    }

    if (hasLCDBase && gridSize > 0) {
      // Use the grid size from constants
      return [gridSize, gridSize];
    }

    // Strategy 2: Scan instructions for LCD I/O addresses
    let maxAddress = 0;
    let foundLCDAccess = false;

    for (const instr of instructions) {
      for (const operand of instr.operands) {
        if (typeof operand === "string") {
          const opUpper = operand.toUpperCase();

          // Check for direct memory access [0xFxxx]
          if (opUpper.startsWith("[") && opUpper.includes("0XF")) {
            const addressStr = opUpper.slice(1, -1).replace(/[[\]]/g, "");
            if (addressStr.startsWith("0XF")) {
              const address = parseInt(addressStr, 16);
              if (address >= 0xf000 && address <= 0xffff) {
                maxAddress = Math.max(maxAddress, address);
                foundLCDAccess = true;
              }
            }
          }

          // Check for LCD base as immediate operand (after EQU substitution: 61440 = 0xF000)
          const numMatch = operand.match(/\b(\d+)\b/);
          if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            if (num >= 0xf000 && num <= 0xffff) {
              foundLCDAccess = true;
            }
          }

          // Check for hex LCD references
          if (opUpper.includes("0XF")) {
            const match = opUpper.match(/0X(F[0-9A-F]{3})/);
            if (match) {
              const address = parseInt(match[0], 16);
              if (address >= 0xf000 && address <= 0xffff) {
                maxAddress = Math.max(maxAddress, address);
                foundLCDAccess = true;
              }
            }
          }
        }
      }
    }

    if (foundLCDAccess) {
      const offset = maxAddress - 0xf000;
      if (offset >= 4096) {
        return [64, 64];
      } else if (offset >= 256) {
        return [64, 64]; // Computed addressing likely needs larger display
      } else if (offset >= 64) {
        return [16, 16];
      }
      // Default to 16x16 when LCD is used
      return [16, 16];
    }

    // No LCD access detected, use 8x8
    return [8, 8];
  }

  /**
   * Get the next instruction line number
   */
  private getNextInstructionLine(): number {
    const instructions = this.simulator.getInstructions();
    const eip = this.simulator.getEIP();
    if (eip + 1 < instructions.length) {
      return instructions[eip + 1].line;
    }
    // If no more instructions, stay at current line
    return this.currentLine;
  }

  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
  ): void {
    console.error("[TonX86] Initialize request received");
    response.body = {
      supportsConfigurationDoneRequest: true,
      supportsSetVariable: true,
      supportsConditionalBreakpoints: false,
      supportsFunctionBreakpoints: false,
      supportsStepBack: false,
    };
    this.sendResponse(response);
  }

  protected launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: DebugProtocol.LaunchRequestArguments,
  ): void {
    console.error(
      "[TonX86] Launch request received with args:",
      JSON.stringify(args),
    );

    // Extract program path from args
    const launchArgs = args as TonX86LaunchRequestArguments;
    this.programPath = launchArgs.program || "";
    this.cpuSpeed = launchArgs.cpuSpeed || 100;
    this.stopOnEntry =
      launchArgs.stopOnEntry !== undefined ? launchArgs.stopOnEntry : true;
    const enableLogging = launchArgs.enableLogging || false;
    console.error("[TonX86] stopOnEntry value:", this.stopOnEntry);
    console.error(`[TonX86] CPU speed set to ${this.cpuSpeed}%`);
    console.error(`[TonX86] Logging enabled: ${enableLogging}`);

    console.error("[TonX86] Program path:", this.programPath);

    // Initialize log file in same directory as the program being debugged (if enabled)
    if (enableLogging && this.programPath) {
      const programDir = path.dirname(this.programPath);
      LOG_FILE = path.join(programDir, "tonx86-debug.log");
      try {
        fs.writeFileSync(LOG_FILE, `=== TonX86 Debug Session Started ===\n`);
        console.error(`[TonX86] Log file: ${LOG_FILE}`);
        logToFile(`Program: ${this.programPath}`);
      } catch (e) {
        console.error(`[TonX86] Failed to create log file: ${e}`);
      }
    } else {
      LOG_FILE = ""; // Disable logging
    }

    // Load source file
    if (this.programPath && fs.existsSync(this.programPath)) {
      try {
        const content = fs.readFileSync(this.programPath, "utf-8");
        const lines = content.split("\n");
        this.sourceInfo = {
          path: this.programPath,
          lines: lines,
        };
        console.error(
          "[TonX86] Loaded source file with",
          lines.length,
          "lines",
        );

        // Parse assembly instructions
        const parseResult = parseAssembly(lines);
        const instructions = parseResult.instructions;
        const labels = parseResult.labels;
        this.constants = parseResult.constants;
        console.error("[TonX86] Parsed", instructions.length, "instructions:");
        instructions.forEach((instr) => {
          console.error(
            `  Line ${instr.line}: ${instr.mnemonic} ${instr.operands.join(", ")}`,
          );
        });

        // Detect required LCD dimensions from code and EQU constants
        const [lcdWidth, lcdHeight] = this.detectLCDDimensions(
          instructions,
          this.constants,
        );
        this.simulator = new Simulator(lcdWidth, lcdHeight);
        console.error(`[TonX86] Detected LCD size: ${lcdWidth}x${lcdHeight}`);

        // Load instructions and labels into simulator
        this.simulator.loadInstructions(instructions, labels);

        // Show labels in Debug Console to help with CALL/JMP debugging
        const labelList = Array.from(labels.entries())
          .map(([name, index]) => `${name} -> ${index}`)
          .join(", ");
        this.sendEvent(
          new OutputEvent(
            `Labels: ${labelList.length > 0 ? labelList : "(none)"}\n`,
            "stdout",
          ),
        );

        // Start at first instruction
        if (instructions.length > 0) {
          this.currentLine = instructions[0].line;
          console.error(
            "[TonX86] Starting at line",
            this.currentLine,
            "instruction:",
            instructions[0].raw,
          );
        }
      } catch (err) {
        console.error("[TonX86] Error loading source file:", err);
      }
    } else {
      console.error("[TonX86] Program file not found:", this.programPath);
    }

    this.sendResponse(response);

    // Send initialized event - this tells VS Code that we're ready to receive breakpoint setup
    console.error("[TonX86] Sending InitializedEvent");
    this.sendEvent(new InitializedEvent());

    // Send session started message
    this.sendEvent(
      new OutputEvent(
        `\n=== TonX86 Debug Session Started ===\nProgram: ${path.basename(this.programPath)}\nInstructions: ${this.simulator.getInstructions().length}\n`,
        "console",
      ),
    );

    if (this.simulator.getInstructions().length === 0) {
      console.error(
        "[TonX86] No instructions to debug, program will terminate",
      );
      this.sendEvent(new TerminatedEvent());
      return;
    }

    // Stop at first instruction if stopOnEntry is true, otherwise auto-start
    if (this.stopOnEntry) {
      console.error(
        "[TonX86] Stopping at first instruction at line",
        this.currentLine,
      );
      setTimeout(() => {
        this.sendEvent(new StoppedEvent("entry", 1));
      }, 100);
    } else {
      console.error("[TonX86] Auto-starting execution (stopOnEntry=false)");
      // Wait for configuration done, then auto-start
      setTimeout(() => {
        if (this.configurationDone) {
          this.continueExecution();
        }
      }, 100);
    }
    console.error("[TonX86] launchRequest complete");
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute the program until a breakpoint or program end
   */
  private async continueExecution(): Promise<void> {
    const eip = this.simulator.getEIP();
    logToFile(
      `continueExecution called, EIP=${eip}, breakpoints=${Array.from(this.breakpoints)}`,
    );

    let firstIteration = true; // Skip breakpoint check on first instruction

    // Output to Debug Console
    this.sendEvent(
      new OutputEvent(`\n=== Continuing execution ===\n`, "console"),
    );

    // Yield interval: yield to event loop every N instructions
    // This allows incoming DAP messages (keyboard events, pause requests, etc.)
    // to be processed.
    //
    // Speed control strategy:
    // - Vary both yield interval AND sleep time based on speed
    // - Lower speeds: yield often with longer sleeps
    // - Higher speeds: yield much less often with minimal sleep

    let yieldInterval: number;
    let sleepMs: number;

    if (this.cpuSpeed <= 50) {
      yieldInterval = 100;
      sleepMs = 5; // Very slow
    } else if (this.cpuSpeed < 100) {
      yieldInterval = 100;
      sleepMs = 2; // Slow
    } else if (this.cpuSpeed === 100) {
      yieldInterval = 100;
      sleepMs = 1; // Normal baseline
    } else {
      // For speeds > 100%, scale up the yield interval significantly
      // At 200%, yield every 2000 instructions (20x less often) with minimal sleep
      yieldInterval = Math.floor(1000 * (this.cpuSpeed / 100));
      sleepMs = 0.1; // Minimal sleep to allow event loop processing
    }

    console.error(
      `[TonX86] Execution starting with cpuSpeed=${this.cpuSpeed}%, yieldInterval=${yieldInterval}, sleepMs=${sleepMs}`,
    );

    let sinceLastYield = 0;
    const instructions = this.simulator.getInstructions();

    while (this.simulator.getEIP() < instructions.length) {
      // Periodically yield to the event loop so incoming DAP messages
      // (keyboard events, pause, etc.) can be processed
      sinceLastYield++;
      if (sinceLastYield >= yieldInterval) {
        sinceLastYield = 0;
        await this.sleep(sleepMs);
      }

      const currentInstr = this.simulator.getCurrentInstruction();
      if (!currentInstr) break;

      // Check for breakpoint BEFORE executing the instruction
      // But skip the check on first iteration (we're continuing from that line)
      if (!firstIteration && this.breakpoints.has(currentInstr.line)) {
        this.currentLine = currentInstr.line;
        logToFile(`Hit breakpoint at line ${this.currentLine}`);
        this.sendEvent(
          new OutputEvent(
            `\n*** Breakpoint hit at line ${this.currentLine} ***\n`,
            "console",
          ),
        );
        // Send stopped event at breakpoint
        this.sendEvent(new StoppedEvent("breakpoint", 1));
        return;
      }
      firstIteration = false;

      try {
        // Use simulator.step() to execute instruction and handle control flow
        const executedLine = this.simulator.step();
        this.currentLine = executedLine;

        // Emit any console output from interrupt handlers
        this.emitConsoleOutput();

        // Check if program halted
        const state = this.simulator.getState();
        if (state.halted) {
          console.error(
            "[TonX86] Program halted at HLT instruction at line",
            executedLine,
          );
          this.sendEvent(
            new OutputEvent(
              `\n=== Program halted at line ${executedLine} ===\n`,
              "console",
            ),
          );

          // Terminate the debug session
          this.sendEvent(new TerminatedEvent());
          return;
        }
      } catch (err) {
        console.error(`[TonX86] ERROR:`, err);
        this.sendEvent(new OutputEvent(`ERROR: ${err}\n`, "stderr"));
        this.sendEvent(new TerminatedEvent());
        return;
      }
    }

    // If we reach here, no HLT was found - program ended
    console.error("[TonX86] Reached end of program");
    this.sendEvent(new TerminatedEvent());
  }

  protected sourceRequest(
    response: DebugProtocol.SourceResponse,
    args: DebugProtocol.SourceArguments,
  ): void {
    console.error(
      "[TonX86] Source request for sourceReference:",
      args.sourceReference,
    );

    if (this.sourceInfo) {
      response.body = {
        content: this.sourceInfo.lines.join("\n"),
        mimeType: "text/x-asm",
      };
    } else {
      response.body = {
        content: "; Source not available",
        mimeType: "text/x-asm",
      };
    }

    this.sendResponse(response);
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments,
  ): void {
    console.error("[TonX86] Set breakpoints request:", args);

    // Build set of valid instruction lines
    const validInstructionLines = new Set(
      this.simulator.getInstructions().map((instr) => instr.line),
    );
    console.error(
      "[TonX86] Valid instruction lines:",
      Array.from(validInstructionLines),
    );

    // Update breakpoint set - only allow breakpoints on instruction lines
    this.breakpoints.clear();
    const verifiedBreakpoints: Array<{
      verified: boolean;
      line: number;
      id: number;
    }> = [];

    if (args.breakpoints) {
      for (let idx = 0; idx < args.breakpoints.length; idx++) {
        const bp = args.breakpoints[idx];
        const isValid = validInstructionLines.has(bp.line);

        if (isValid) {
          this.breakpoints.add(bp.line);
          console.error("[TonX86] Added breakpoint at line", bp.line);
          verifiedBreakpoints.push({
            verified: true,
            line: bp.line,
            id: idx,
          });
        } else {
          console.error(
            "[TonX86] Rejected breakpoint at line",
            bp.line,
            "- not an instruction line",
          );
          verifiedBreakpoints.push({
            verified: false,
            line: bp.line,
            id: idx,
          });
        }
      }
    }

    response.body = {
      breakpoints: verifiedBreakpoints,
    };
    this.sendResponse(response);
  }

  protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
    console.error("[TonX86] Threads request");
    response.body = {
      threads: [{ id: 1, name: "Main Thread" }],
    };
    this.sendResponse(response);
  }

  protected stackTraceRequest(
    response: DebugProtocol.StackTraceResponse,
    args: DebugProtocol.StackTraceArguments,
  ): void {
    console.error("[TonX86] Stack trace request for thread:", args.threadId);
    response.body = {
      stackFrames: [
        {
          id: 0,
          name: "Main",
          source: this.sourceInfo ? { path: this.sourceInfo.path } : undefined,
          line: this.currentLine,
          column: 0,
        },
      ],
    };
    this.sendResponse(response);
  }

  protected scopesRequest(
    response: DebugProtocol.ScopesResponse,
    args: DebugProtocol.ScopesArguments,
  ): void {
    console.error("[TonX86] Scopes request for frame:", args.frameId);
    response.body = {
      scopes: [
        {
          name: "Registers",
          variablesReference: 1,
          expensive: false,
        },
      ],
    };
    this.sendResponse(response);
  }

  protected variablesRequest(
    response: DebugProtocol.VariablesResponse,
    args: DebugProtocol.VariablesArguments,
  ): void {
    console.error(
      "[TonX86] Variables request for ref:",
      args.variablesReference,
    );

    // Get actual register values from simulator
    const registers = this.simulator.getRegisters();

    response.body = {
      variables: [
        {
          name: "EAX",
          value: `0x${registers.EAX.toString(16).padStart(8, "0")}`,
          variablesReference: 0,
        },
        {
          name: "ECX",
          value: `0x${registers.ECX.toString(16).padStart(8, "0")}`,
          variablesReference: 0,
        },
        {
          name: "EDX",
          value: `0x${registers.EDX.toString(16).padStart(8, "0")}`,
          variablesReference: 0,
        },
        {
          name: "EBX",
          value: `0x${registers.EBX.toString(16).padStart(8, "0")}`,
          variablesReference: 0,
        },
        {
          name: "ESP",
          value: `0x${registers.ESP.toString(16).padStart(8, "0")}`,
          variablesReference: 0,
        },
        {
          name: "EBP",
          value: `0x${registers.EBP.toString(16).padStart(8, "0")}`,
          variablesReference: 0,
        },
        {
          name: "ESI",
          value: `0x${registers.ESI.toString(16).padStart(8, "0")}`,
          variablesReference: 0,
        },
        {
          name: "EDI",
          value: `0x${registers.EDI.toString(16).padStart(8, "0")}`,
          variablesReference: 0,
        },
      ],
    };
    this.sendResponse(response);
  }

  protected continueRequest(
    response: DebugProtocol.ContinueResponse,
    args: DebugProtocol.ContinueArguments,
  ): void {
    console.error("======================================");
    console.error("[TonX86] *** CONTINUE REQUEST (F5) ***");
    console.error("======================================");
    console.error("[TonX86] Continue request for thread:", args.threadId);
    console.error(
      "[TonX86] Current state: EIP=",
      this.simulator.getEIP(),
      "line=",
      this.currentLine,
    );
    this.sendResponse(response);
    this.continueExecution().catch((err) => {
      console.error("[TonX86] Error during continue execution:", err);
    });
  }

  protected nextRequest(
    response: DebugProtocol.NextResponse,
    args: DebugProtocol.NextArguments,
  ): void {
    console.error("======================================");
    console.error("[TonX86] *** NEXT REQUEST (F10 Step Over) ***");
    console.error("======================================");
    console.error(
      "[TonX86] Next request for thread:",
      args.threadId,
      "current EIP:",
      this.simulator.getEIP(),
    );

    this.sendResponse(response);

    // Execute current instruction using simulator.step(), then stop
    const currentInstr = this.simulator.getCurrentInstruction();
    if (!currentInstr) {
      console.error("[TonX86] No current instruction");
      setTimeout(() => {
        this.sendEvent(new TerminatedEvent());
      }, 50);
      return;
    }

    console.error(
      `[TonX86] Executing (next): ${currentInstr.mnemonic} ${currentInstr.operands.join(", ")}`,
    );

    // Send execution step to Debug Console
    const stepMsg = `[Line ${currentInstr.line}] ${currentInstr.mnemonic} ${currentInstr.operands.join(", ")}\n`;
    this.sendEvent(new OutputEvent(stepMsg, "console"));

    // Execute the instruction using simulator.step()
    try {
      const executedLine = this.simulator.step();
      this.currentLine = executedLine;

      // Emit any console output from interrupt handlers
      this.emitConsoleOutput();

      // Log LCD state after instruction
      try {
        const lcdData = this.simulator.getLCDDisplay();
        const pixelCount = lcdData.filter((p: number) => p !== 0).length;
        const pixelIndices = lcdData
          .map((v: number, i: number) => (v ? i : -1))
          .filter((i: number) => i !== -1);
        logToFile(
          JSON.stringify({
            action: "NEXT",
            eip: this.simulator.getEIP(),
            line: executedLine,
            instruction: `${currentInstr.mnemonic} ${currentInstr.operands.join(", ")}`,
            lcdPixels: pixelCount,
            lcdLit: Array.from(pixelIndices),
            lcdRaw: Array.from(lcdData),
          }),
        );
      } catch (e) {
        logToFile(`[NEXT] LCD logging error: ${e}`);
      }

      // Check if we hit HLT
      const state = this.simulator.getState();
      if (state.halted) {
        console.error(
          "[TonX86] Program halted at HLT instruction at line",
          executedLine,
        );
        setTimeout(() => {
          this.sendEvent(new TerminatedEvent());
        }, 50);
        return;
      }

      // Send stopped event
      setTimeout(() => {
        this.sendEvent(new StoppedEvent("step", 1));
      }, 50);
    } catch (err) {
      logToFile(
        JSON.stringify({
          action: "ERROR",
          eip: this.simulator.getEIP(),
          error: String(err),
        }),
      );
      console.error(`[TonX86] ERROR during instruction execution:`, err);
      this.sendEvent(new OutputEvent(`ERROR: ${err}\n`, "stderr"));
      this.sendEvent(new TerminatedEvent());
      return;
    }
  }

  protected stepInRequest(
    response: DebugProtocol.StepInResponse,
    args: DebugProtocol.StepInArguments,
  ): void {
    console.error(
      "[TonX86] Step in request for thread:",
      args.threadId,
      "current EIP:",
      this.simulator.getEIP(),
    );

    this.sendResponse(response);

    // Execute current instruction using simulator.step(), then stop
    const currentInstr = this.simulator.getCurrentInstruction();
    if (!currentInstr) {
      console.error("[TonX86] No current instruction");
      setTimeout(() => {
        this.sendEvent(new TerminatedEvent());
      }, 50);
      return;
    }

    console.error(
      `[TonX86] Executing (stepIn): ${currentInstr.mnemonic} ${currentInstr.operands.join(", ")}`,
    );

    try {
      // Use simulator.step() to execute instruction and handle control flow
      const executedLine = this.simulator.step();
      this.currentLine = executedLine;

      // Emit any console output from interrupt handlers
      this.emitConsoleOutput();

      // Check if program halted
      const state = this.simulator.getState();
      if (state.halted) {
        console.error(
          "[TonX86] Program halted at HLT instruction at line",
          executedLine,
        );
        setTimeout(() => {
          this.sendEvent(new TerminatedEvent());
        }, 50);
        return;
      }

      // Send stopped event
      setTimeout(() => {
        this.sendEvent(new StoppedEvent("step", 1));
      }, 50);
    } catch (err) {
      console.error("[TonX86] ERROR:", err);
      this.sendEvent(new OutputEvent(`ERROR: ${err}\n`, "stderr"));
      setTimeout(() => {
        this.sendEvent(new TerminatedEvent());
      }, 50);
    }
  }

  protected stepOutRequest(
    response: DebugProtocol.StepOutResponse,
    args: DebugProtocol.StepOutArguments,
  ): void {
    console.error("[TonX86] Step out request for thread:", args.threadId);

    // Step out: execute until we return from current function
    // For now, just step once like stepIn
    const currentInstr = this.simulator.getCurrentInstruction();
    if (currentInstr) {
      try {
        const executedLine = this.simulator.step();
        this.currentLine = executedLine;
        console.error("[TonX86] Stepped to line", this.currentLine);
      } catch (err) {
        console.error("[TonX86] ERROR:", err);
      }
    }

    this.sendResponse(response);

    // Send stopped event to notify debugger
    setTimeout(() => {
      this.sendEvent(new StoppedEvent("step", 1));
    }, 50);
  }

  protected pauseRequest(
    response: DebugProtocol.PauseResponse,
    args: DebugProtocol.PauseArguments,
  ): void {
    console.error("[TonX86] Pause request for thread:", args.threadId);
    this.sendResponse(response);
  }

  protected configurationDoneRequest(
    response: DebugProtocol.ConfigurationDoneResponse,
  ): void {
    console.error("[TonX86] Configuration done");
    this.configurationDone = true;
    this.sendResponse(response);

    // If stopOnEntry is false, auto-start execution now
    if (!this.stopOnEntry && this.simulator.getInstructions().length > 0) {
      console.error("[TonX86] Auto-starting execution after configuration");
      setTimeout(() => {
        this.continueExecution();
      }, 50);
    }
  }

  /**
   * Helper to emit console output from interrupt handlers
   */
  private emitConsoleOutput(): void {
    const output = this.simulator.getConsoleOutput();
    if (output.length > 0) {
      this.sendEvent(new OutputEvent(output, "stdout"));
      this.simulator.clearConsoleOutput();
    }
  }

  /**
   * Custom request handlers
   */
  protected customRequest(
    command: string,
    response: DebugProtocol.Response,
    args: Record<string, unknown>,
  ): void {
    if (command === "getLCDState") {
      const lcdData = this.simulator.getLCDDisplay();
      response.body = {
        pixels: Array.from(lcdData),
      };
      this.sendResponse(response);
    } else if (command === "getMemoryState") {
      // Get memory state for both memory banks
      // Default to showing first 16 bytes if not specified
      const DEFAULT_MEMORY_VIEW_SIZE = 16;
      const argsObj = args || {};
      const start = typeof argsObj.start === "number" ? argsObj.start : 0;
      const length =
        typeof argsObj.length === "number"
          ? argsObj.length
          : DEFAULT_MEMORY_VIEW_SIZE;
      const memoryA = this.simulator.getMemoryA(start, length);
      const memoryB = this.simulator.getMemoryB(start, length);
      response.body = {
        memoryA: Array.from(memoryA),
        memoryB: Array.from(memoryB),
      };
      this.sendResponse(response);
    } else if (command === "keyboardEvent") {
      // Forward keyboard event to simulator
      if (!this.simulator) {
        console.error(
          "[TonX86] Keyboard event received but simulator not initialized",
        );
        response.success = false;
        response.message = "Simulator not initialized";
        this.sendResponse(response);
        return;
      }
      const argsObj = args || {};
      const keyCode = typeof argsObj.keyCode === "number" ? argsObj.keyCode : 0;
      const pressed =
        typeof argsObj.pressed === "boolean" ? argsObj.pressed : false;
      this.simulator.pushKeyboardEvent(keyCode, pressed);
      console.error(
        `[TonX86] Keyboard event: keyCode=${keyCode}, pressed=${pressed}`,
      );
      this.sendResponse(response);
    } else {
      super.customRequest(command, response, args);
    }
  }
}

// Start the debug session
console.error("[TonX86] Debug adapter starting...");
DebugSession.run(TonX86DebugSession);
console.error("[TonX86] Debug adapter started");
