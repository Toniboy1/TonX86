import {
  DebugSession,
  StoppedEvent,
  TerminatedEvent,
  InitializedEvent,
} from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";
import * as fs from "fs";
import * as path from "path";
import { Simulator } from "@tonx86/simcore";

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

interface Instruction {
  line: number;
  mnemonic: string;
  operands: string[];
  raw: string;
}

interface ParseResult {
  instructions: Instruction[];
  labels: Map<string, number>; // label name -> instruction index
}

/**
 * Parse assembly file into instructions and labels
 */
function parseAssembly(lines: string[]): ParseResult {
  const instructions: Instruction[] = [];
  const labels = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(";")) {
      continue;
    }

    // Handle labels (lines ending with :)
    if (trimmed.endsWith(":")) {
      const labelName = trimmed.slice(0, -1).trim(); // Remove the colon
      // Label points to the next instruction index
      labels.set(labelName, instructions.length);
      continue;
    }

    // Parse instruction: MNEMONIC operand1, operand2, ...
    const parts = trimmed.split(/\s+/);
    if (parts.length === 0) continue;

    const mnemonic = parts[0].toUpperCase();
    const operandString = parts.slice(1).join(" ");
    // Strip comments before parsing operands (comments start with ;)
    const operandStringWithoutComment = operandString.split(";")[0];
    const operands = operandStringWithoutComment
      .split(",")
      .map((op) => op.trim())
      .filter((op) => op.length > 0);

    instructions.push({
      line: i + 1, // 1-indexed
      mnemonic,
      operands,
      raw: trimmed,
    });
  }

  return { instructions, labels };
}
export class TonX86DebugSession extends DebugSession {
  private sourceInfo: SourceInfo | undefined;
  private currentLine = 1;
  private programPath = "";
  private instructions: Instruction[] = [];
  private labels: Map<string, number> = new Map(); // label name -> instruction index
  private instructionPointer: number = 0; // Index into instructions array
  private breakpoints: Set<number> = new Set(); // Set of line numbers with breakpoints
  private configurationDone = false; // Track if configuration is done
  private shouldAutoStart = false; // Track if we should auto-start after config
  private isFirstContinue = true; // Track if this is the first continue call
  private simulator: Simulator; // CPU simulator instance

  public constructor() {
    super();
    this.simulator = new Simulator(8, 8); // Create simulator with 8x8 LCD
    console.error("[TonX86] Debug adapter constructor called");
  }

  /**
   * Get the next instruction line number
   */
  private getNextInstructionLine(): number {
    if (this.instructionPointer + 1 < this.instructions.length) {
      return this.instructions[this.instructionPointer + 1].line;
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
    const launchArgs = args as any;
    this.programPath = launchArgs.program || "";
    console.error("[TonX86] stopOnEntry value:", launchArgs.stopOnEntry);

    console.error("[TonX86] Program path:", this.programPath);

    // Initialize log file in same directory as the program being debugged
    if (this.programPath) {
      const programDir = path.dirname(this.programPath);
      LOG_FILE = path.join(programDir, "tonx86-debug.log");
      try {
        fs.writeFileSync(LOG_FILE, `=== TonX86 Debug Session Started ===\n`);
        console.error(`[TonX86] Log file: ${LOG_FILE}`);
        logToFile(`Program: ${this.programPath}`);
      } catch (e) {
        console.error(`[TonX86] Failed to create log file: ${e}`);
      }
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
        this.instructions = parseResult.instructions;
        this.labels = parseResult.labels;
        console.error(
          "[TonX86] Parsed",
          this.instructions.length,
          "instructions:",
        );
        this.instructions.forEach((instr) => {
          console.error(
            `  Line ${instr.line}: ${instr.mnemonic} ${instr.operands.join(", ")}`,
          );
        });

        // Start at first instruction
        if (this.instructions.length > 0) {
          this.currentLine = this.instructions[0].line;
          this.instructionPointer = 0;
          console.error(
            "[TonX86] Starting at line",
            this.currentLine,
            "instruction:",
            this.instructions[0].raw,
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

    // Always stop at the first instruction so user can inspect initial state
    if (this.instructions.length > 0) {
      console.error(
        "[TonX86] Stopping at first instruction at line",
        this.currentLine,
      );
      setTimeout(() => {
        this.sendEvent(new StoppedEvent("entry", 1));
      }, 100);
    } else {
      console.error(
        "[TonX86] No instructions to debug, program will terminate",
      );
      this.sendEvent(new TerminatedEvent());
    }
    console.error("[TonX86] launchRequest complete");
  }

  /**
   * Execute the program until a breakpoint or program end
   */
  private continueExecution(): void {
    console.error("[TonX86] continueExecution called");
    console.error("[TonX86]   instructionPointer=", this.instructionPointer);
    console.error("[TonX86]   total instructions=", this.instructions.length);
    console.error("[TonX86]   breakpoints set=", Array.from(this.breakpoints));
    console.error("[TonX86]   isFirstContinue=", this.isFirstContinue);

    // Only advance past current instruction if NOT the first continue
    if (!this.isFirstContinue) {
      console.error(
        "[TonX86] Not first continue, advancing instruction pointer",
      );
      this.instructionPointer++;
    } else {
      console.error(
        "[TonX86] First continue, starting from current instruction",
      );
      this.isFirstContinue = false;
    }

    // Run to end of program, stepping through each instruction until HLT or breakpoint
    while (this.instructionPointer < this.instructions.length) {
      const currentInstr = this.instructions[this.instructionPointer];

      // Check if we hit a breakpoint BEFORE executing
      if (this.breakpoints.has(currentInstr.line)) {
        console.error("[TonX86] Hit breakpoint at line", currentInstr.line);
        this.currentLine = currentInstr.line;

        // Send stopped event at breakpoint
        this.sendEvent(new StoppedEvent("breakpoint", 1));
        return;
      }

      // Execute the instruction through simulator
      console.error(
        `[TonX86] Executing: ${currentInstr.mnemonic} ${currentInstr.operands.join(", ")}`,
      );
      try {
        this.simulator.executeInstruction(
          currentInstr.mnemonic,
          currentInstr.operands,
        );

        // Log execution to file
        const lcdData = this.simulator.getLCDDisplay();
        const pixelCount = lcdData.filter((p) => p !== 0).length;
        const pixelIndices = lcdData
          .map((v, i) => (v ? i : -1))
          .filter((i) => i !== -1);
        logToFile(
          JSON.stringify({
            action: "CONTINUE",
            ip: this.instructionPointer,
            line: currentInstr.line,
            instruction: `${currentInstr.mnemonic} ${currentInstr.operands.join(", ")}`,
            lcdPixels: pixelCount,
            lcdLit: Array.from(pixelIndices),
            lcdRaw: Array.from(lcdData), // Show actual pixel values
          }),
        );
      } catch (err) {
        logToFile(
          JSON.stringify({
            action: "ERROR",
            ip: this.instructionPointer,
            line: currentInstr.line,
            error: String(err),
          }),
        );
        console.error(
          `[TonX86] ERROR during instruction execution at IP=${this.instructionPointer}, line=${currentInstr.line}:`,
          err,
        );
        this.sendEvent(new TerminatedEvent());
        return;
      }

      this.currentLine = currentInstr.line;

      // Check if we hit HLT
      if (currentInstr.mnemonic === "HLT") {
        console.error(
          "[TonX86] Program halted at HLT instruction at line",
          currentInstr.line,
        );

        // Terminate the debug session
        this.sendEvent(new TerminatedEvent());
        return;
      }

      // Handle jump instructions
      if (["JMP", "JE", "JZ", "JNE", "JNZ"].includes(currentInstr.mnemonic)) {
        const targetLabel = currentInstr.operands[0];
        const targetIndex = this.labels.get(targetLabel);

        if (targetIndex !== undefined) {
          // For conditional jumps, check the Zero flag
          const shouldJump =
            currentInstr.mnemonic === "JMP" ||
            (["JE", "JZ"].includes(currentInstr.mnemonic) &&
              this.isZeroFlagSet()) ||
            (["JNE", "JNZ"].includes(currentInstr.mnemonic) &&
              !this.isZeroFlagSet());

          if (shouldJump) {
            console.error(
              `[TonX86] Jumping to label "${targetLabel}" at instruction index ${targetIndex}`,
            );
            this.instructionPointer = targetIndex;
          } else {
            console.error(
              `[TonX86] Conditional jump not taken (label: ${targetLabel})`,
            );
            this.instructionPointer++;
          }
        } else {
          console.error(
            `[TonX86] Jump target "${targetLabel}" not found in labels`,
          );
          this.instructionPointer++;
        }
      } else {
        this.instructionPointer++;
      }
    }

    // If we reach here, no HLT was found - program ended
    console.error("[TonX86] Reached end of program");
    this.sendEvent(new TerminatedEvent());
  }

  /**
   * Check if the Zero flag is set in the CPU
   */
  private isZeroFlagSet(): boolean {
    const state = this.simulator.getState();
    // Zero flag is bit 6
    return (state.flags & (1 << 6)) !== 0;
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
      this.instructions.map((instr) => instr.line),
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
    console.error("[TonX86] Continue request for thread:", args.threadId);
    console.error(
      "[TonX86] Current state: instructionPointer=",
      this.instructionPointer,
      "line=",
      this.currentLine,
    );
    this.sendResponse(response);
    this.continueExecution();
  }

  protected nextRequest(
    response: DebugProtocol.NextResponse,
    args: DebugProtocol.NextArguments,
  ): void {
    console.error(
      "[TonX86] Next request for thread:",
      args.threadId,
      "current instruction pointer:",
      this.instructionPointer,
    );

    this.sendResponse(response);

    // Execute current instruction, then stop
    if (this.instructionPointer < this.instructions.length) {
      const currentInstr = this.instructions[this.instructionPointer];

      console.error(
        `[TonX86] Executing (next): ${currentInstr.mnemonic} ${currentInstr.operands.join(", ")}`,
      );

      // Execute the instruction
      try {
        this.simulator.executeInstruction(
          currentInstr.mnemonic,
          currentInstr.operands,
        );
      } catch (err) {
        logToFile(
          JSON.stringify({
            action: "ERROR",
            ip: this.instructionPointer,
            line: currentInstr.line,
            error: String(err),
          }),
        );
        console.error(`[TonX86] ERROR during instruction execution:`, err);
        this.sendEvent(new TerminatedEvent());
        return;
      }

      // Log LCD state after instruction
      try {
        const lcdData = this.simulator.getLCDDisplay();
        const pixelCount = lcdData.filter((p) => p !== 0).length;
        const pixelIndices = lcdData
          .map((v, i) => (v ? i : -1))
          .filter((i) => i !== -1);
        logToFile(
          JSON.stringify({
            action: "NEXT",
            ip: this.instructionPointer - 1,
            line: currentInstr.line,
            instruction: `${currentInstr.mnemonic} ${currentInstr.operands.join(", ")}`,
            lcdPixels: pixelCount,
            lcdLit: Array.from(pixelIndices),
            lcdRaw: Array.from(lcdData), // Show actual pixel values
          }),
        );
      } catch (e) {
        logToFile(`[NEXT] LCD logging error: ${e}`);
      }

      this.currentLine = currentInstr.line;

      // Check if we hit HLT
      if (currentInstr.mnemonic === "HLT") {
        console.error(
          "[TonX86] Program halted at HLT instruction at line",
          currentInstr.line,
        );
        setTimeout(() => {
          this.sendEvent(new TerminatedEvent());
        }, 50);
        return;
      }

      // Handle jump instructions
      if (["JMP", "JE", "JZ", "JNE", "JNZ"].includes(currentInstr.mnemonic)) {
        const targetLabel = currentInstr.operands[0];
        const targetIndex = this.labels.get(targetLabel);

        if (targetIndex !== undefined) {
          const shouldJump =
            currentInstr.mnemonic === "JMP" ||
            (["JE", "JZ"].includes(currentInstr.mnemonic) &&
              this.isZeroFlagSet()) ||
            (["JNE", "JNZ"].includes(currentInstr.mnemonic) &&
              !this.isZeroFlagSet());

          if (shouldJump) {
            console.error(
              `[TonX86] Jump taken to label "${targetLabel}" at instruction index ${targetIndex}`,
            );
            this.instructionPointer = targetIndex;
          } else {
            console.error(
              `[TonX86] Conditional jump not taken (label: ${targetLabel})`,
            );
            this.instructionPointer++;
          }
        } else {
          console.error(
            `[TonX86] Jump target "${targetLabel}" not found in labels`,
          );
          this.instructionPointer++;
        }
      } else {
        // Move to next instruction for non-jump instructions
        this.instructionPointer++;
      }

      // Send stopped event
      setTimeout(() => {
        this.sendEvent(new StoppedEvent("step", 1));
      }, 50);
    } else {
      console.error("[TonX86] Reached end of program");
      setTimeout(() => {
        this.sendEvent(new TerminatedEvent());
      }, 50);
    }
  }

  protected stepInRequest(
    response: DebugProtocol.StepInResponse,
    args: DebugProtocol.StepInArguments,
  ): void {
    console.error(
      "[TonX86] Step in request for thread:",
      args.threadId,
      "current instruction pointer:",
      this.instructionPointer,
    );

    this.sendResponse(response);

    // Execute current instruction, then stop (same as next for our flat program)
    if (this.instructionPointer < this.instructions.length) {
      const currentInstr = this.instructions[this.instructionPointer];

      console.error(
        `[TonX86] Executing (stepIn): ${currentInstr.mnemonic} ${currentInstr.operands.join(", ")}`,
      );

      // Execute the instruction
      this.simulator.executeInstruction(
        currentInstr.mnemonic,
        currentInstr.operands,
      );

      this.currentLine = currentInstr.line;

      // Check if we hit HLT
      if (currentInstr.mnemonic === "HLT") {
        console.error(
          "[TonX86] Program halted at HLT instruction at line",
          currentInstr.line,
        );
        setTimeout(() => {
          this.sendEvent(new TerminatedEvent());
        }, 50);
        return;
      }

      // Handle jump instructions
      if (["JMP", "JE", "JZ", "JNE", "JNZ"].includes(currentInstr.mnemonic)) {
        const targetLabel = currentInstr.operands[0];
        const targetIndex = this.labels.get(targetLabel);

        if (targetIndex !== undefined) {
          const shouldJump =
            currentInstr.mnemonic === "JMP" ||
            (["JE", "JZ"].includes(currentInstr.mnemonic) &&
              this.isZeroFlagSet()) ||
            (["JNE", "JNZ"].includes(currentInstr.mnemonic) &&
              !this.isZeroFlagSet());

          if (shouldJump) {
            console.error(
              `[TonX86] Jump taken to label "${targetLabel}" at instruction index ${targetIndex}`,
            );
            this.instructionPointer = targetIndex;
          } else {
            console.error(
              `[TonX86] Conditional jump not taken (label: ${targetLabel})`,
            );
            this.instructionPointer++;
          }
        } else {
          console.error(
            `[TonX86] Jump target "${targetLabel}" not found in labels`,
          );
          this.instructionPointer++;
        }
      } else {
        // Move to next instruction for non-jump instructions
        this.instructionPointer++;
      }

      // Send stopped event
      setTimeout(() => {
        this.sendEvent(new StoppedEvent("step", 1));
      }, 50);
    } else {
      console.error("[TonX86] Reached end of program");
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

    // In assembly, step out would exit the current function
    // For now, just continue to next instruction like step in
    if (this.instructionPointer + 1 < this.instructions.length) {
      this.instructionPointer++;
      this.currentLine = this.instructions[this.instructionPointer].line;
      const instr = this.instructions[this.instructionPointer];
      console.error(
        "[TonX86] Stepped to line",
        this.currentLine,
        "instruction:",
        instr.raw,
      );
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
  }

  /**
   * Custom request to get LCD display state
   */
  protected customRequest(
    command: string,
    response: DebugProtocol.Response,
    args: any,
  ): void {
    if (command === "getLCDState") {
      const lcdData = this.simulator.getLCDDisplay();
      response.body = {
        pixels: Array.from(lcdData),
      };
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
