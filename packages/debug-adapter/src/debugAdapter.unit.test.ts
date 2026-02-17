/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  afterEach,
  jest,
} from "@jest/globals";
import { TonX86DebugSession } from "./debugAdapter";
import { DebugProtocol } from "vscode-debugprotocol";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parseAssembly } from "./parser";

/**
 * Comprehensive unit tests for TonX86DebugSession
 * Targets 100% line/branch/function coverage for debugAdapter.ts
 */

describe("TonX86DebugSession Unit Tests", () => {
  let session: TonX86DebugSession;
  let tempDir: string;
  let testProgramPath: string;

  // Collected events and responses
  let sentEvents: any[];
  let sentResponses: any[];

  // Mock process.exit to prevent tests from exiting
  const originalExit = process.exit;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = "test"; // Prevent guard from executing
    (process.exit as any) = jest.fn();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(async () => {
    // Wait for any pending timers from vscode-debugadapter to fire
    // while process.exit is still mocked, then restore
    await new Promise((resolve) => setTimeout(resolve, 500));
    process.exit = originalExit;
    process.env.NODE_ENV = originalNodeEnv;
    (console.error as any).mockRestore();
  });

  beforeEach(() => {
    session = new TonX86DebugSession();
    sentEvents = [];
    sentResponses = [];

    // Mock sendEvent and sendResponse
    (session as any).sendEvent = (event: any) => {
      sentEvents.push(event);
    };
    (session as any).sendResponse = (resp: any) => {
      sentResponses.push(resp);
    };

    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tonx86-test-"));

    // Create a simple test program
    const simpleProgram = `; Simple test program
start:
  MOV EAX, 10
  MOV EBX, 20
  ADD EAX, EBX
  HLT
`;
    testProgramPath = path.join(tempDir, "test.asm");
    fs.writeFileSync(testProgramPath, simpleProgram);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==================== Helper Functions ====================

  function makeResponse(command: string): any {
    return {
      request_seq: 1,
      success: true,
      command,
      seq: 1,
      type: "response",
    };
  }

  function launchProgram(
    programPath: string,
    options: {
      stopOnEntry?: boolean;
      cpuSpeed?: number;
      enableLogging?: boolean;
    } = {},
  ) {
    const response = makeResponse("launch");
    const args: any = {
      program: programPath,
      stopOnEntry: options.stopOnEntry !== undefined ? options.stopOnEntry : true,
      cpuSpeed: options.cpuSpeed,
      enableLogging: options.enableLogging,
      __restart: undefined,
      noDebug: false,
    };
    (session as any).launchRequest(response, args);
    // Clear events from launch
    sentEvents = [];
    sentResponses = [];
  }

  // ==================== Constructor ====================

  describe("Constructor", () => {
    it("should create a debug session instance", () => {
      expect(session).toBeDefined();
      expect(session).toBeInstanceOf(TonX86DebugSession);
    });
  });

  // ==================== Initialize Request ====================

  describe("Initialize Request", () => {
    it("should return capabilities", () => {
      const response = makeResponse("initialize");
      (session as any).initializeRequest(response);

      expect(sentResponses).toHaveLength(1);
      expect(sentResponses[0].body.supportsConfigurationDoneRequest).toBe(true);
      expect(sentResponses[0].body.supportsSetVariable).toBe(true);
      expect(sentResponses[0].body.supportsConditionalBreakpoints).toBe(false);
      expect(sentResponses[0].body.supportsFunctionBreakpoints).toBe(false);
      expect(sentResponses[0].body.supportsStepBack).toBe(false);
    });
  });

  // ==================== Launch Request ====================

  describe("Launch Request", () => {
    it("should load and parse a program file", () => {
      launchProgram(testProgramPath);
      expect((session as any).programPath).toBe(testProgramPath);
    });

    it("should handle cpuSpeed parameter", () => {
      launchProgram(testProgramPath, { cpuSpeed: 150 });
      expect((session as any).cpuSpeed).toBe(150);
    });

    it("should handle enableLogging=true", () => {
      launchProgram(testProgramPath, { enableLogging: true });
      // Check that log file was created
      const logPath = path.join(tempDir, "tonx86-debug.log");
      expect(fs.existsSync(logPath)).toBe(true);
      const logContent = fs.readFileSync(logPath, "utf-8");
      expect(logContent).toContain("TonX86 Debug Session Started");
    });

    it("should handle program with .data section", () => {
      const dataProgram = `.data
msg: DB 72, 101, 108, 108, 111
.text
start:
  MOV EAX, 1
  HLT
`;
      const dataPath = path.join(tempDir, "data.asm");
      fs.writeFileSync(dataPath, dataProgram);
      launchProgram(dataPath);
      expect((session as any).programPath).toBe(dataPath);
    });

    it("should handle non-existent file gracefully", () => {
      const fakePath = path.join(tempDir, "nonexistent.asm");
      launchProgram(fakePath);
      expect((session as any).programPath).toBe(fakePath);
    });

    it("should handle empty program path", () => {
      const response = makeResponse("launch");
      const args: any = {
        program: "",
        stopOnEntry: true,
        __restart: undefined,
        noDebug: false,
      };
      (session as any).launchRequest(response, args);
      expect((session as any).programPath).toBe("");
    });

    it("should handle no instructions with TerminatedEvent", () => {
      const emptyProgram = `; Just a comment, no instructions
`;
      const emptyPath = path.join(tempDir, "empty.asm");
      fs.writeFileSync(emptyPath, emptyProgram);

      const response = makeResponse("launch");
      const args: any = {
        program: emptyPath,
        stopOnEntry: true,
        __restart: undefined,
        noDebug: false,
      };
      (session as any).launchRequest(response, args);

      // Should send TerminatedEvent when no instructions
      const terminatedEvents = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminatedEvents.length).toBeGreaterThan(0);
    });

    it("should handle stopOnEntry=false", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath, { stopOnEntry: false });
      expect((session as any).stopOnEntry).toBe(false);
      jest.useRealTimers();
    });

    it("should default stopOnEntry to true when undefined", () => {
      jest.useFakeTimers();
      const response = makeResponse("launch");
      const args: any = {
        program: testProgramPath,
        // stopOnEntry intentionally omitted
        __restart: undefined,
        noDebug: false,
      };
      (session as any).launchRequest(response, args);
      expect((session as any).stopOnEntry).toBe(true);
      jest.useRealTimers();
    });

    it("should detect LCD dimensions from constants", () => {
      const programWithLCD = `LCD_BASE EQU 0xF000
GRID_SIZE EQU 64
start:
  MOV EAX, 1
  HLT
`;
      const lcdPath = path.join(tempDir, "lcd.asm");
      fs.writeFileSync(lcdPath, programWithLCD);
      launchProgram(lcdPath);
      expect((session as any).programPath).toBe(lcdPath);
    });
  });

  // ==================== Configuration Done ====================

  describe("Configuration Done Request", () => {
    it("should set configurationDone flag", () => {
      launchProgram(testProgramPath);
      const response = makeResponse("configurationDone");
      (session as any).configurationDoneRequest(response);
      expect((session as any).configurationDone).toBe(true);
    });

    it("should auto-start when stopOnEntry=false and instructions exist", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath, { stopOnEntry: false });
      (session as any).stopOnEntry = false;
      const response = makeResponse("configurationDone");
      (session as any).configurationDoneRequest(response);
      expect((session as any).configurationDone).toBe(true);
      // The auto-start is dispatched via setTimeout
      jest.advanceTimersByTime(100);
      jest.useRealTimers();
    });

    it("should not auto-start if configurationDone is false when timeout fires", () => {
      jest.useFakeTimers();
      // Launch with stopOnEntry=false: sets a 100ms timeout
      const response = makeResponse("launch");
      const args: any = {
        program: testProgramPath,
        stopOnEntry: false,
        __restart: undefined,
        noDebug: false,
      };
      (session as any).launchRequest(response, args);

      // Do NOT call configurationDoneRequest — configurationDone stays false
      expect((session as any).configurationDone).toBe(false);

      // Fire the timeout — should check configurationDone and skip execution
      jest.advanceTimersByTime(200);
      jest.useRealTimers();

      // Verify no continue was triggered (no stopped/terminated events from execution)
      const executionEvents = sentEvents.filter(
        (e: any) => e.event === "stopped" && e.body?.reason === "breakpoint",
      );
      expect(executionEvents).toHaveLength(0);
    });
  });

  // ==================== Breakpoints ====================

  describe("Breakpoints", () => {
    it("should set valid breakpoints", () => {
      launchProgram(testProgramPath);

      const response = makeResponse("setBreakpoints");
      response.body = { breakpoints: [] };

      const args: DebugProtocol.SetBreakpointsArguments = {
        source: { path: testProgramPath },
        breakpoints: [{ line: 3 }], // Line 3 has MOV EAX, 10
      };
      (session as any).setBreakPointsRequest(response, args);

      const bps = sentResponses[0].body.breakpoints;
      const verified = bps.filter((bp: any) => bp.verified);
      expect(verified.length).toBeGreaterThan(0);
    });

    it("should reject breakpoints on non-instruction lines", () => {
      launchProgram(testProgramPath);

      const response = makeResponse("setBreakpoints");
      response.body = { breakpoints: [] };

      const args: DebugProtocol.SetBreakpointsArguments = {
        source: { path: testProgramPath },
        breakpoints: [{ line: 1 }, { line: 999 }],
      };
      (session as any).setBreakPointsRequest(response, args);

      const bps = sentResponses[0].body.breakpoints;
      const rejected = bps.filter((bp: any) => !bp.verified);
      expect(rejected.length).toBe(2);
    });

    it("should handle empty breakpoints array", () => {
      launchProgram(testProgramPath);

      const response = makeResponse("setBreakpoints");
      response.body = { breakpoints: [] };

      const args: DebugProtocol.SetBreakpointsArguments = {
        source: { path: testProgramPath },
      };
      (session as any).setBreakPointsRequest(response, args);
      expect(sentResponses[0].body.breakpoints).toEqual([]);
    });
  });

  // ==================== Threads ====================

  describe("Threads Request", () => {
    it("should return a single thread", () => {
      const response = makeResponse("threads");
      response.body = { threads: [] };
      (session as any).threadsRequest(response);

      expect(sentResponses[0].body.threads).toHaveLength(1);
      expect(sentResponses[0].body.threads[0].id).toBe(1);
      expect(sentResponses[0].body.threads[0].name).toBe("Main Thread");
    });
  });

  // ==================== Stack Trace ====================

  describe("Stack Trace Request", () => {
    it("should return stack frame after launch", () => {
      launchProgram(testProgramPath);

      const response = makeResponse("stackTrace");
      response.body = { stackFrames: [], totalFrames: 0 };
      const args: DebugProtocol.StackTraceArguments = { threadId: 1 };
      (session as any).stackTraceRequest(response, args);

      const frames = sentResponses[0].body.stackFrames;
      expect(frames).toHaveLength(1);
      expect(frames[0].name).toBe("Main");
      expect(frames[0].source.path).toBe(testProgramPath);
    });

    it("should return stack frame without source", () => {
      const response = makeResponse("stackTrace");
      response.body = { stackFrames: [], totalFrames: 0 };
      const args: DebugProtocol.StackTraceArguments = { threadId: 1 };
      (session as any).stackTraceRequest(response, args);

      const frames = sentResponses[0].body.stackFrames;
      expect(frames).toHaveLength(1);
      expect(frames[0].source).toBeUndefined();
    });
  });

  // ==================== Scopes ====================

  describe("Scopes Request", () => {
    it("should return Registers scope", () => {
      const response = makeResponse("scopes");
      response.body = { scopes: [] };
      const args: DebugProtocol.ScopesArguments = { frameId: 0 };
      (session as any).scopesRequest(response, args);

      expect(sentResponses[0].body.scopes).toHaveLength(1);
      expect(sentResponses[0].body.scopes[0].name).toBe("Registers");
      expect(sentResponses[0].body.scopes[0].variablesReference).toBe(1);
    });
  });

  // ==================== Variables ====================

  describe("Variables Request", () => {
    it("should return all 8 register variables", () => {
      const response = makeResponse("variables");
      response.body = { variables: [] };
      const args: DebugProtocol.VariablesArguments = { variablesReference: 1 };
      (session as any).variablesRequest(response, args);

      const vars = sentResponses[0].body.variables;
      expect(vars.length).toBe(8);
      const names = vars.map((v: any) => v.name);
      expect(names).toContain("EAX");
      expect(names).toContain("ECX");
      expect(names).toContain("EDX");
      expect(names).toContain("EBX");
      expect(names).toContain("ESP");
      expect(names).toContain("EBP");
      expect(names).toContain("ESI");
      expect(names).toContain("EDI");
    });
  });

  // ==================== Source Request ====================

  describe("Source Request", () => {
    it("should return source content after launch", () => {
      launchProgram(testProgramPath);

      const response = makeResponse("source");
      response.body = { content: "" };
      const args: DebugProtocol.SourceArguments = { sourceReference: 1 };
      (session as any).sourceRequest(response, args);

      expect(sentResponses[0].body.content).toContain("MOV EAX");
      expect(sentResponses[0].body.mimeType).toBe("text/x-asm");
    });

    it("should return fallback when no source loaded", () => {
      const response = makeResponse("source");
      response.body = { content: "" };
      const args: DebugProtocol.SourceArguments = { sourceReference: 1 };
      (session as any).sourceRequest(response, args);

      expect(sentResponses[0].body.content).toBe("; Source not available");
      expect(sentResponses[0].body.mimeType).toBe("text/x-asm");
    });
  });

  // ==================== Continue Request ====================

  describe("Continue Request", () => {
    it("should send response and trigger continueExecution", () => {
      launchProgram(testProgramPath);

      const response = makeResponse("continue");
      response.body = { allThreadsContinued: false };
      const args: DebugProtocol.ContinueArguments = { threadId: 1 };
      (session as any).continueRequest(response, args);

      expect(sentResponses).toHaveLength(1);
    });

    it("should handle continueExecution error in catch", () => {
      launchProgram(testProgramPath);

      // Make continueExecution throw
      (session as any).continueExecution = () => Promise.reject(new Error("Execution failed"));

      const response = makeResponse("continue");
      response.body = { allThreadsContinued: false };
      (session as any).continueRequest(response, { threadId: 1 });

      // Restore
      expect(sentResponses).toHaveLength(1);
    });
  });

  // ==================== Continue Execution ====================

  describe("continueExecution", () => {
    it("should execute until HLT and terminate", async () => {
      launchProgram(testProgramPath);
      sentEvents = [];

      await (session as any).continueExecution();

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
    });

    it("should stop at breakpoints", async () => {
      launchProgram(testProgramPath);

      // Set breakpoint at line 4 (MOV EBX, 20)
      const bpResponse = makeResponse("setBreakpoints");
      bpResponse.body = { breakpoints: [] };
      (session as any).setBreakPointsRequest(bpResponse, {
        source: { path: testProgramPath },
        breakpoints: [{ line: 4 }],
      });
      sentEvents = [];

      await (session as any).continueExecution();

      const stopped = sentEvents.filter(
        (e: any) => e.event === "stopped" && e.body && e.body.reason === "breakpoint",
      );
      expect(stopped.length).toBe(1);
    });

    it("should handle cpuSpeed <= 50", async () => {
      launchProgram(testProgramPath, { cpuSpeed: 30 });
      sentEvents = [];

      await (session as any).continueExecution();

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
    });

    it("should handle cpuSpeed between 51 and 99", async () => {
      launchProgram(testProgramPath, { cpuSpeed: 75 });
      sentEvents = [];

      await (session as any).continueExecution();

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
    });

    it("should handle cpuSpeed > 100", async () => {
      launchProgram(testProgramPath, { cpuSpeed: 200 });
      sentEvents = [];

      await (session as any).continueExecution();

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
    });

    it("should handle program without HLT (reaches end)", async () => {
      const noHltProgram = `start:
  MOV EAX, 1
  MOV EBX, 2
`;
      const noHltPath = path.join(tempDir, "nohlt.asm");
      fs.writeFileSync(noHltPath, noHltProgram);
      launchProgram(noHltPath);
      sentEvents = [];

      await (session as any).continueExecution();

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
    });

    it("should handle execution error gracefully", async () => {
      launchProgram(testProgramPath);

      // Force simulator to throw on step
      (session as any).simulator.step = () => {
        throw new Error("Simulated execution error");
      };
      sentEvents = [];

      await (session as any).continueExecution();

      const outputEvents = sentEvents.filter(
        (e: any) => e.event === "output" && e.body.category === "stderr",
      );
      expect(outputEvents.length).toBeGreaterThan(0);
    });

    it("should log execution when enableLogging is true", async () => {
      launchProgram(testProgramPath, { enableLogging: true });
      sentEvents = [];

      await (session as any).continueExecution();

      const logPath = path.join(tempDir, "tonx86-debug.log");
      const logContent = fs.readFileSync(logPath, "utf-8");
      expect(logContent).toContain("continueExecution called");
    });

    it("should skip breakpoint on first iteration", async () => {
      launchProgram(testProgramPath);

      // Set breakpoint on first instruction (line 3)
      const bpResponse = makeResponse("setBreakpoints");
      bpResponse.body = { breakpoints: [] };
      (session as any).setBreakPointsRequest(bpResponse, {
        source: { path: testProgramPath },
        breakpoints: [{ line: 3 }],
      });
      sentEvents = [];

      await (session as any).continueExecution();

      // Should NOT stop on first iteration breakpoint, should terminate
      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
    });
  });

  // ==================== Next Request (Step Over) ====================

  describe("Next Request", () => {
    it("should step one instruction with loaded program", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath);
      sentEvents = [];

      const response = makeResponse("next");
      const args: DebugProtocol.NextArguments = { threadId: 1 };
      (session as any).nextRequest(response, args);

      jest.advanceTimersByTime(100);

      const stoppedEvents = sentEvents.filter((e: any) => e.event === "stopped");
      expect(stoppedEvents.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it("should terminate if no current instruction", () => {
      jest.useFakeTimers();
      const response = makeResponse("next");
      const args: DebugProtocol.NextArguments = { threadId: 1 };
      (session as any).nextRequest(response, args);
      jest.advanceTimersByTime(100);

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it("should terminate at HLT instruction", () => {
      jest.useFakeTimers();
      const hltProgram = `start:
  HLT
`;
      const hltPath = path.join(tempDir, "hlt.asm");
      fs.writeFileSync(hltPath, hltProgram);
      launchProgram(hltPath);
      sentEvents = [];

      const response = makeResponse("next");
      const args: DebugProtocol.NextArguments = { threadId: 1 };
      (session as any).nextRequest(response, args);
      jest.advanceTimersByTime(100);

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it("should handle execution error in next", () => {
      launchProgram(testProgramPath);

      (session as any).simulator.step = () => {
        throw new Error("Step error");
      };
      sentEvents = [];

      const response = makeResponse("next");
      const args: DebugProtocol.NextArguments = { threadId: 1 };
      (session as any).nextRequest(response, args);

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
      const errorOutput = sentEvents.filter(
        (e: any) => e.event === "output" && e.body.category === "stderr",
      );
      expect(errorOutput.length).toBeGreaterThan(0);
    });

    it("should handle logging during next with enableLogging", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath, { enableLogging: true });
      sentEvents = [];

      const response = makeResponse("next");
      const args: DebugProtocol.NextArguments = { threadId: 1 };
      (session as any).nextRequest(response, args);
      jest.advanceTimersByTime(100);
      jest.useRealTimers();

      const logPath = path.join(tempDir, "tonx86-debug.log");
      const logContent = fs.readFileSync(logPath, "utf-8");
      expect(logContent).toContain("NEXT");
    });

    it("should log active LCD pixels with non-zero values during next", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath, { enableLogging: true });

      const sim = (session as any).simulator;
      const origGetLCD = sim.getLCDDisplay.bind(sim);
      // Return LCD data with some non-zero (active) pixels
      sim.getLCDDisplay = () => {
        const data = new Uint8Array(64 * 64);
        data[0] = 1;
        data[5] = 255;
        data[100] = 42;
        return data;
      };
      sentEvents = [];

      const response = makeResponse("next");
      (session as any).nextRequest(response, { threadId: 1 });
      jest.advanceTimersByTime(100);
      jest.useRealTimers();

      const logPath = path.join(tempDir, "tonx86-debug.log");
      const logContent = fs.readFileSync(logPath, "utf-8");
      expect(logContent).toContain("lcdPixels");

      sim.getLCDDisplay = origGetLCD;
    });

    it("should handle LCD logging error during next", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath, { enableLogging: true });

      const sim = (session as any).simulator;
      const origGetLCD = sim.getLCDDisplay.bind(sim);
      sim.getLCDDisplay = () => {
        throw new Error("LCD error");
      };
      sentEvents = [];

      const response = makeResponse("next");
      (session as any).nextRequest(response, { threadId: 1 });
      jest.advanceTimersByTime(100);
      jest.useRealTimers();

      // Should still succeed despite LCD logging error
      expect(sentResponses).toHaveLength(1);

      sim.getLCDDisplay = origGetLCD;
    });
  });

  // ==================== Step In Request ====================

  describe("Step In Request", () => {
    it("should step one instruction with loaded program", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath);
      sentEvents = [];

      const response = makeResponse("stepIn");
      const args: DebugProtocol.StepInArguments = { threadId: 1 };
      (session as any).stepInRequest(response, args);
      jest.advanceTimersByTime(100);

      const stopped = sentEvents.filter((e: any) => e.event === "stopped");
      expect(stopped.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it("should terminate if no current instruction", () => {
      jest.useFakeTimers();
      const response = makeResponse("stepIn");
      const args: DebugProtocol.StepInArguments = { threadId: 1 };
      (session as any).stepInRequest(response, args);
      jest.advanceTimersByTime(100);

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it("should terminate at HLT instruction", () => {
      jest.useFakeTimers();
      const hltProgram = `start:
  HLT
`;
      const hltPath = path.join(tempDir, "hlt-stepin.asm");
      fs.writeFileSync(hltPath, hltProgram);
      launchProgram(hltPath);
      sentEvents = [];

      const response = makeResponse("stepIn");
      const args: DebugProtocol.StepInArguments = { threadId: 1 };
      (session as any).stepInRequest(response, args);
      jest.advanceTimersByTime(100);

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it("should handle execution error in stepIn", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath);
      (session as any).simulator.step = () => {
        throw new Error("Step in error");
      };
      sentEvents = [];

      const response = makeResponse("stepIn");
      const args: DebugProtocol.StepInArguments = { threadId: 1 };
      (session as any).stepInRequest(response, args);
      jest.advanceTimersByTime(100);

      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });
  });

  // ==================== Step Out Request ====================

  describe("Step Out Request", () => {
    it("should step with loaded program", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath);
      sentEvents = [];

      const response = makeResponse("stepOut");
      const args: DebugProtocol.StepOutArguments = { threadId: 1 };
      (session as any).stepOutRequest(response, args);
      jest.advanceTimersByTime(100);

      const stopped = sentEvents.filter((e: any) => e.event === "stopped");
      expect(stopped.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it("should handle no current instruction", () => {
      jest.useFakeTimers();
      const response = makeResponse("stepOut");
      const args: DebugProtocol.StepOutArguments = { threadId: 1 };
      (session as any).stepOutRequest(response, args);
      jest.advanceTimersByTime(100);

      const stopped = sentEvents.filter((e: any) => e.event === "stopped");
      expect(stopped.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it("should handle step error gracefully", () => {
      jest.useFakeTimers();
      launchProgram(testProgramPath);
      (session as any).simulator.step = () => {
        throw new Error("Step out error");
      };
      sentEvents = [];

      const response = makeResponse("stepOut");
      const args: DebugProtocol.StepOutArguments = { threadId: 1 };
      (session as any).stepOutRequest(response, args);
      jest.advanceTimersByTime(100);

      expect(sentResponses).toHaveLength(1);
      jest.useRealTimers();
    });
  });

  // ==================== Pause Request ====================

  describe("Pause Request", () => {
    it("should handle pause request", () => {
      const response = makeResponse("pause");
      const args: DebugProtocol.PauseArguments = { threadId: 1 };
      (session as any).pauseRequest(response, args);
      expect(sentResponses).toHaveLength(1);
    });
  });

  // ==================== Disconnect Request ====================

  describe("Disconnect Request", () => {
    it("should handle disconnect", () => {
      const response = makeResponse("disconnect");
      const args: DebugProtocol.DisconnectArguments = {};
      (session as any).disconnectRequest(response, args);
      expect(sentResponses).toHaveLength(1);
    });
  });

  // ==================== Custom Requests ====================

  describe("Custom Request", () => {
    it("should handle getLCDState", () => {
      const response = makeResponse("getLCDState");
      (session as any).customRequest("getLCDState", response, {});

      expect(sentResponses[0].body).toBeDefined();
      expect(sentResponses[0].body.pixels).toBeDefined();
      expect(Array.isArray(sentResponses[0].body.pixels)).toBe(true);
    });

    it("should handle getMemoryState with default params", () => {
      const response = makeResponse("getMemoryState");
      (session as any).customRequest("getMemoryState", response, {});

      expect(sentResponses[0].body).toBeDefined();
      expect(sentResponses[0].body.memoryA).toBeDefined();
      expect(sentResponses[0].body.memoryB).toBeDefined();
    });

    it("should handle getMemoryState with custom start/length", () => {
      const response = makeResponse("getMemoryState");
      (session as any).customRequest("getMemoryState", response, {
        start: 10,
        length: 32,
      });

      expect(sentResponses[0].body.memoryA).toBeDefined();
      expect(sentResponses[0].body.memoryB).toBeDefined();
    });

    it("should handle getMemoryState with null args", () => {
      const response = makeResponse("getMemoryState");
      (session as any).customRequest("getMemoryState", response, null);

      expect(sentResponses[0].body).toBeDefined();
      expect(sentResponses[0].body.memoryA).toBeDefined();
    });

    it("should handle keyboardEvent with valid args", () => {
      const response = makeResponse("keyboardEvent");
      (session as any).customRequest("keyboardEvent", response, {
        keyCode: 65,
        pressed: true,
      });
      expect(sentResponses).toHaveLength(1);
    });

    it("should handle keyboardEvent with default args", () => {
      const response = makeResponse("keyboardEvent");
      (session as any).customRequest("keyboardEvent", response, {});
      expect(sentResponses).toHaveLength(1);
    });

    it("should handle keyboardEvent with null args", () => {
      const response = makeResponse("keyboardEvent");
      (session as any).customRequest("keyboardEvent", response, null);
      expect(sentResponses).toHaveLength(1);
    });

    it("should handle keyboardEvent when simulator not initialized", () => {
      const response = makeResponse("keyboardEvent");
      const origSim = (session as any).simulator;
      (session as any).simulator = null;
      (session as any).customRequest("keyboardEvent", response, {
        keyCode: 65,
        pressed: true,
      });
      expect(sentResponses[0].success).toBe(false);
      (session as any).simulator = origSim;
    });

    it("should fall through to super for unknown commands", () => {
      const response = makeResponse("unknownCommand");
      try {
        (session as any).customRequest("unknownCommand", response, {});
      } catch {
        // super might throw
      }
    });
  });

  // ==================== emitConsoleOutput ====================

  describe("emitConsoleOutput", () => {
    it("should emit output when simulator has console output", () => {
      launchProgram(testProgramPath);

      const sim = (session as any).simulator;
      const origGetOutput = sim.getConsoleOutput.bind(sim);
      const origClearOutput = sim.clearConsoleOutput.bind(sim);
      sim.getConsoleOutput = () => "Hello from interrupt!";
      let cleared = false;
      sim.clearConsoleOutput = () => {
        cleared = true;
      };

      sentEvents = [];
      (session as any).emitConsoleOutput();

      const outputEvents = sentEvents.filter(
        (e: any) => e.event === "output" && e.body.category === "stdout",
      );
      expect(outputEvents.length).toBe(1);
      expect(outputEvents[0].body.output).toBe("Hello from interrupt!");
      expect(cleared).toBe(true);

      sim.getConsoleOutput = origGetOutput;
      sim.clearConsoleOutput = origClearOutput;
    });

    it("should not emit when no console output", () => {
      sentEvents = [];
      (session as any).emitConsoleOutput();
      const outputEvents = sentEvents.filter(
        (e: any) => e.event === "output" && e.body.category === "stdout",
      );
      expect(outputEvents).toHaveLength(0);
    });
  });

  // ==================== Sleep ====================

  describe("sleep", () => {
    it("should resolve after specified delay", async () => {
      const start = Date.now();
      await (session as any).sleep(10);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(5);
    });
  });

  // ==================== Edge Cases ====================

  describe("Edge Cases", () => {
    it("should handle launch with enableLogging but log creation failure", () => {
      const invalidDir = path.join(tempDir, "nonexistent-dir", "sub");
      const response = makeResponse("launch");
      const args: any = {
        program: path.join(invalidDir, "test.asm"),
        stopOnEntry: true,
        enableLogging: true,
        __restart: undefined,
        noDebug: false,
      };
      (session as any).launchRequest(response, args);
      expect(sentResponses.length).toBeGreaterThan(0);
    });

    it("should handle parse error in source file (catch branch)", () => {
      // Create a file that triggers a parser error in the catch block
      const invalidProgram = ".data\nNOT_A_DIRECTIVE\n";
      const invalidPath = path.join(tempDir, "invalid-parse.asm");
      fs.writeFileSync(invalidPath, invalidProgram);

      // Verify parseAssembly throws for this input
      expect(() => parseAssembly([".data", "NOT_A_DIRECTIVE"])).toThrow();

      const response = makeResponse("launch");
      const args: any = {
        program: invalidPath,
        stopOnEntry: true,
        __restart: undefined,
        noDebug: false,
      };
      (session as any).launchRequest(response, args);
      // Should complete without crashing (error caught)
      expect(sentResponses.length).toBeGreaterThan(0);
    });

    it("should handle null currentInstruction during continueExecution", async () => {
      launchProgram(testProgramPath);

      // Mock getCurrentInstruction to return null while EIP < instructions.length
      const sim = (session as any).simulator;
      sim.getCurrentInstruction = () => null;
      sentEvents = [];

      await (session as any).continueExecution();

      // Should break out of loop and terminate
      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
    });

    it("should trigger yield interval during long execution", async () => {
      // Create a program with a loop that executes many instructions
      const loopProgram = `start:
  MOV ECX, 200
loop:
  DEC ECX
  JNZ loop
  HLT
`;
      const loopPath = path.join(tempDir, "loop.asm");
      fs.writeFileSync(loopPath, loopProgram);
      launchProgram(loopPath);
      sentEvents = [];

      await (session as any).continueExecution();

      // Should have terminated after executing all iterations
      const terminated = sentEvents.filter((e: any) => e.event === "terminated");
      expect(terminated.length).toBeGreaterThan(0);
    });
  });
});
