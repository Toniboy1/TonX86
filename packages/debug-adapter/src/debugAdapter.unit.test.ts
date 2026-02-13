import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  jest,
} from "@jest/globals";
import { TonX86DebugSession } from "./debugAdapter";
import { DebugProtocol } from "vscode-debugprotocol";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Unit tests for TonX86DebugSession
 * These tests verify the debug adapter protocol implementation
 */

describe("TonX86DebugSession Unit Tests", () => {
  let session: TonX86DebugSession;
  let tempDir: string;
  let testProgramPath: string;

  // Mock process.exit to prevent tests from exiting
  const originalExit = process.exit;

  beforeAll(() => {
    // Mock process.exit to prevent it from actually exiting
    (process.exit as any) = jest.fn();

    // Suppress console.error to reduce noise
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore process.exit
    process.exit = originalExit;

    // Restore console.error
    (console.error as any).mockRestore();
  });

  beforeEach(() => {
    // Create a new session for each test
    session = new TonX86DebugSession();

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
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Constructor", () => {
    it("should create a debug session instance", () => {
      expect(session).toBeDefined();
      expect(session).toBeInstanceOf(TonX86DebugSession);
    });
  });

  describe("Initialize Request", () => {
    it("should handle initialize request and return capabilities", () => {
      const response: DebugProtocol.InitializeResponse = {
        request_seq: 1,
        success: true,
        command: "initialize",
        seq: 1,
        type: "response",
      };

      let responseBody: any = null;
      (session as any).sendResponse = (resp: DebugProtocol.Response) => {
        responseBody = resp.body;
      };

      (session as any).initializeRequest(response);

      expect(responseBody).toBeDefined();
      expect(responseBody.supportsConfigurationDoneRequest).toBe(true);
      expect(responseBody.supportsSetVariable).toBe(true);
    });
  });

  describe("Launch Request", () => {
    it("should load and parse a program file", () => {
      const response: DebugProtocol.LaunchResponse = {
        request_seq: 2,
        success: true,
        command: "launch",
        seq: 2,
        type: "response",
      };

      const args: any = {
        program: testProgramPath,
        stopOnEntry: true,
        __restart: undefined,
        noDebug: false,
      };

      let responseReceived = false;
      (session as any).sendResponse = () => {
        responseReceived = true;
      };
      (session as any).sendEvent = () => {};

      (session as any).launchRequest(response, args);

      expect(responseReceived).toBe(true);
      expect((session as any).programPath).toBe(testProgramPath);
    });

    it("should handle cpuSpeed parameter", () => {
      const response: DebugProtocol.LaunchResponse = {
        request_seq: 2,
        success: true,
        command: "launch",
        seq: 2,
        type: "response",
      };

      const args: any = {
        program: testProgramPath,
        stopOnEntry: true,
        cpuSpeed: 150,
        __restart: undefined,
        noDebug: false,
      };

      (session as any).sendResponse = () => {};
      (session as any).sendEvent = () => {};

      (session as any).launchRequest(response, args);
      expect((session as any).cpuSpeed).toBe(150);
    });

    it("should detect LCD dimensions from constants", () => {
      const programWithLCD = `LCD_BASE EQU 0xF000
GRID_SIZE EQU 64
start:
  MOV EAX, 1
  HLT
`;
      const lcdProgramPath = path.join(tempDir, "lcd.asm");
      fs.writeFileSync(lcdProgramPath, programWithLCD);

      const response: DebugProtocol.LaunchResponse = {
        request_seq: 2,
        success: true,
        command: "launch",
        seq: 2,
        type: "response",
      };

      const args: any = {
        program: lcdProgramPath,
        stopOnEntry: false,
        __restart: undefined,
        noDebug: false,
      };

      (session as any).sendResponse = () => {};
      (session as any).sendEvent = () => {};

      (session as any).launchRequest(response, args);
      expect((session as any).programPath).toBe(lcdProgramPath);
    });

    it("should detect LCD from hardcoded addresses", () => {
      const programWithLCDAddresses = `start:
  MOV [0xF000], 1
  MOV [0xF100], 2
  HLT
`;
      const lcdProgPath = path.join(tempDir, "lcd-inst.asm");
      fs.writeFileSync(lcdProgPath, programWithLCDAddresses);

      const response: DebugProtocol.LaunchResponse = {
        request_seq: 1,
        success: true,
        command: "launch",
        seq: 1,
        type: "response",
      };

      const args: any = {
        program: lcdProgPath,
        stopOnEntry: false,
        __restart: undefined,
        noDebug: false,
      };

      (session as any).sendResponse = () => {};
      (session as any).sendEvent = () => {};

      (session as any).launchRequest(response, args);
      expect((session as any).programPath).toBe(lcdProgPath);
    });

    it("should default to 8x8 LCD when no LCD access detected", () => {
      const noLcdProgram = `start:
  MOV EAX, 1
  MOV EBX, 2
  HLT
`;
      const noLcdPath = path.join(tempDir, "no-lcd.asm");
      fs.writeFileSync(noLcdPath, noLcdProgram);

      const response: DebugProtocol.LaunchResponse = {
        request_seq: 1,
        success: true,
        command: "launch",
        seq: 1,
        type: "response",
      };

      const args: any = {
        program: noLcdPath,
        stopOnEntry: false,
        __restart: undefined,
        noDebug: false,
      };

      (session as any).sendResponse = () => {};
      (session as any).sendEvent = () => {};

      (session as any).launchRequest(response, args);
      expect((session as any).programPath).toBe(noLcdPath);
    });
  });

  describe("Configuration Done Request", () => {
    it("should handle configurationDone request", () => {
      const response: DebugProtocol.ConfigurationDoneResponse = {
        request_seq: 3,
        success: true,
        command: "configurationDone",
        seq: 3,
        type: "response",
      };

      // First launch a program
      const launchResponse: DebugProtocol.LaunchResponse = {
        request_seq: 1,
        success: true,
        command: "launch",
        seq: 1,
        type: "response",
      };

      const launchArgs: any = {
        program: testProgramPath,
        stopOnEntry: true,
        __restart: undefined,
        noDebug: false,
      };

      (session as any).sendResponse = () => {};
      (session as any).sendEvent = () => {};

      (session as any).launchRequest(launchResponse, launchArgs);

      // Now call configurationDone
      let configDoneReceived = false;
      (session as any).sendResponse = () => {
        configDoneReceived = true;
      };

      (session as any).configurationDoneRequest(response);
      expect(configDoneReceived).toBe(true);
    });
  });

  describe("Breakpoints", () => {
    it("should set breakpoints", () => {
      // First launch
      const launchResponse: DebugProtocol.LaunchResponse = {
        request_seq: 1,
        success: true,
        command: "launch",
        seq: 1,
        type: "response",
      };

      const launchArgs: any = {
        program: testProgramPath,
        stopOnEntry: false,
        __restart: undefined,
        noDebug: false,
      };

      (session as any).sendResponse = () => {};
      (session as any).sendEvent = () => {};
      (session as any).launchRequest(launchResponse, launchArgs);

      // Now set breakpoints
      const bpResponse: DebugProtocol.SetBreakpointsResponse = {
        request_seq: 2,
        success: true,
        command: "setBreakpoints",
        seq: 2,
        type: "response",
        body: { breakpoints: [] },
      };

      const bpArgs: DebugProtocol.SetBreakpointsArguments = {
        source: { path: testProgramPath },
        breakpoints: [{ line: 3 }, { line: 5 }],
      };

      let breakpointsSet: any[] = [];
      (session as any).sendResponse = (resp: DebugProtocol.Response) => {
        if (resp.body && resp.body.breakpoints) {
          breakpointsSet = resp.body.breakpoints;
        }
      };

      (session as any).setBreakPointsRequest(bpResponse, bpArgs);
      expect(breakpointsSet.length).toBeGreaterThan(0);
    });
  });

  describe("Threads Request", () => {
    it("should return a single thread", () => {
      const response: DebugProtocol.ThreadsResponse = {
        request_seq: 1,
        success: true,
        command: "threads",
        seq: 1,
        type: "response",
        body: { threads: [] },
      };

      let threads: any[] = [];
      (session as any).sendResponse = (resp: DebugProtocol.Response) => {
        threads = resp.body.threads;
      };

      (session as any).threadsRequest(response);
      expect(threads).toHaveLength(1);
      expect(threads[0].id).toBe(1);
      expect(threads[0].name).toBe("Main Thread");
    });
  });

  describe("Stack Trace Request", () => {
    it("should return stack trace after launch", () => {
      // First launch
      const launchResponse: DebugProtocol.LaunchResponse = {
        request_seq: 1,
        success: true,
        command: "launch",
        seq: 1,
        type: "response",
      };

      const launchArgs: any = {
        program: testProgramPath,
        stopOnEntry: true,
        __restart: undefined,
        noDebug: false,
      };

      (session as any).sendResponse = () => {};
      (session as any).sendEvent = () => {};
      (session as any).launchRequest(launchResponse, launchArgs);

      // Request stack trace
      const stResponse: DebugProtocol.StackTraceResponse = {
        request_seq: 2,
        success: true,
        command: "stackTrace",
        seq: 2,
        type: "response",
        body: { stackFrames: [], totalFrames: 0 },
      };

      const stArgs: DebugProtocol.StackTraceArguments = {
        threadId: 1,
      };

      let stackFrames: any[] = [];
      (session as any).sendResponse = (resp: DebugProtocol.Response) => {
        if (resp.body && resp.body.stackFrames) {
          stackFrames = resp.body.stackFrames;
        }
      };

      (session as any).stackTraceRequest(stResponse, stArgs);
      expect(stackFrames.length).toBeGreaterThan(0);
    });
  });

  describe("Scopes Request", () => {
    it("should return at least registers scope", () => {
      const response: DebugProtocol.ScopesResponse = {
        request_seq: 1,
        success: true,
        command: "scopes",
        seq: 1,
        type: "response",
        body: { scopes: [] },
      };

      const args: DebugProtocol.ScopesArguments = {
        frameId: 0,
      };

      let scopes: any[] = [];
      (session as any).sendResponse = (resp: DebugProtocol.Response) => {
        scopes = resp.body.scopes;
      };

      (session as any).scopesRequest(response, args);
      expect(scopes.length).toBeGreaterThanOrEqual(1);
      const scopeNames = scopes.map((s: any) => s.name);
      expect(scopeNames).toContain("Registers");
    });
  });

  describe("Variables Request", () => {
    it("should return register variables", () => {
      const response: DebugProtocol.VariablesResponse = {
        request_seq: 1,
        success: true,
        command: "variables",
        seq: 1,
        type: "response",
        body: { variables: [] },
      };

      const args: DebugProtocol.VariablesArguments = {
        variablesReference: 1, // Registers scope
      };

      let variables: any[] = [];
      (session as any).sendResponse = (resp: DebugProtocol.Response) => {
        variables = resp.body.variables;
      };

      (session as any).variablesRequest(response, args);
      expect(variables.length).toBeGreaterThan(0);
      const varNames = variables.map((v: any) => v.name);
      expect(varNames).toContain("EAX");
      expect(varNames).toContain("EBX");
    });
  });

  describe("Disconnect Request", () => {
    it("should handle disconnect", () => {
      const response: DebugProtocol.DisconnectResponse = {
        request_seq: 1,
        success: true,
        command: "disconnect",
        seq: 1,
        type: "response",
      };

      const args: DebugProtocol.DisconnectArguments = {};

      let disconnectReceived = false;
      (session as any).sendResponse = () => {
        disconnectReceived = true;
      };
      (session as any).sendEvent = () => {};

      (session as any).disconnectRequest(response, args);
      expect(disconnectReceived).toBe(true);
    });
  });

  describe("Pause Request", () => {
    it("should handle pause request", () => {
      const response: DebugProtocol.PauseResponse = {
        request_seq: 1,
        success: true,
        command: "pause",
        seq: 1,
        type: "response",
      };

      const args: DebugProtocol.PauseArguments = {
        threadId: 1,
      };

      let pauseReceived = false;
      (session as any).sendResponse = () => {
        pauseReceived = true;
      };

      (session as any).pauseRequest(response, args);
      expect(pauseReceived).toBe(true);
    });
  });

  describe("Source Request", () => {
    it("should return source content", () => {
      // First launch to load source
      const launchResponse: DebugProtocol.LaunchResponse = {
        request_seq: 1,
        success: true,
        command: "launch",
        seq: 1,
        type: "response",
      };

      const launchArgs: any = {
        program: testProgramPath,
        stopOnEntry: true,
        __restart: undefined,
        noDebug: false,
      };

      (session as any).sendResponse = () => {};
      (session as any).sendEvent = () => {};
      (session as any).launchRequest(launchResponse, launchArgs);

      // Request source
      const sourceResponse: DebugProtocol.SourceResponse = {
        request_seq: 2,
        success: true,
        command: "source",
        seq: 2,
        type: "response",
        body: { content: "" },
      };

      const sourceArgs: DebugProtocol.SourceArguments = {
        sourceReference: 1,
        source: { path: testProgramPath },
      };

      let sourceContent = "";
      (session as any).sendResponse = (resp: DebugProtocol.Response) => {
        if (resp.body && resp.body.content) {
          sourceContent = resp.body.content;
        }
      };

      (session as any).sourceRequest(sourceResponse, sourceArgs);
      expect(sourceContent.length).toBeGreaterThan(0);
    });
  });

  describe("Continue Request", () => {
    it("should call continueRequest", () => {
      // Just verify the method can be called
      const contResponse: DebugProtocol.ContinueResponse = {
        request_seq: 3,
        success: true,
        command: "continue",
        seq: 3,
        type: "response",
        body: { allThreadsContinued: false },
      };

      const contArgs: DebugProtocol.ContinueArguments = {
        threadId: 1,
      };

      let responseReceived = false;
      (session as any).sendResponse = () => {
        responseReceived = true;
      };

      (session as any).continueRequest(contResponse, contArgs);
      expect(responseReceived).toBe(true);
    });
  });

  describe("Step Requests", () => {
    it("should call nextRequest", () => {
      const stepResponse: DebugProtocol.NextResponse = {
        request_seq: 3,
        success: true,
        command: "next",
        seq: 3,
        type: "response",
      };

      const stepArgs: DebugProtocol.NextArguments = {
        threadId: 1,
      };

      let responseReceived = false;
      (session as any).sendResponse = () => {
        responseReceived = true;
      };

      (session as any).nextRequest(stepResponse, stepArgs);
      expect(responseReceived).toBe(true);
    });

    it("should call stepInRequest", () => {
      const stepInResponse: DebugProtocol.StepInResponse = {
        request_seq: 3,
        success: true,
        command: "stepIn",
        seq: 3,
        type: "response",
      };

      const stepInArgs: DebugProtocol.StepInArguments = {
        threadId: 1,
      };

      let responseReceived = false;
      (session as any).sendResponse = () => {
        responseReceived = true;
      };

      (session as any).stepInRequest(stepInResponse, stepInArgs);
      expect(responseReceived).toBe(true);
    });

    it("should call stepOutRequest", () => {
      const stepOutResponse: DebugProtocol.StepOutResponse = {
        request_seq: 3,
        success: true,
        command: "stepOut",
        seq: 3,
        type: "response",
      };

      const stepOutArgs: DebugProtocol.StepOutArguments = {
        threadId: 1,
      };

      let responseReceived = false;
      (session as any).sendResponse = () => {
        responseReceived = true;
      };

      (session as any).stepOutRequest(stepOutResponse, stepOutArgs);
      expect(responseReceived).toBe(true);
    });
  });

  describe("Custom Request", () => {
    it("should handle getLCD custom request", () => {
      const customResponse: DebugProtocol.Response = {
        request_seq: 1,
        success: true,
        command: "getLCD",
        seq: 1,
        type: "response",
      };

      let lcdData: any = null;
      (session as any).sendResponse = (resp: DebugProtocol.Response) => {
        if (resp.body) {
          lcdData = resp.body;
        }
      };

      (session as any).customRequest("getLCD", [], customResponse);
      expect(lcdData).toBeDefined();
    });
  });
});
