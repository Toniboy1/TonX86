import { DebugSession, StoppedEvent } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";

export class TonX86DebugSession extends DebugSession {
  public constructor() {
    super();
    console.error("[TonX86] Debug adapter constructor called");
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
    console.error("[TonX86] Launch request received with args:", args);
    this.sendResponse(response);
    
    // Send stopped event after a brief delay to ensure client is ready
    setTimeout(() => {
      console.error("[TonX86] Sending stopped event");
      this.sendEvent(new StoppedEvent("entry", 1));
    }, 100);
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments,
  ): void {
    console.error("[TonX86] Set breakpoints request:", args);
    response.body = {
      breakpoints: (args.breakpoints || []).map((bp, idx) => ({
        verified: true,
        line: bp.line,
        id: idx,
      })),
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
    console.log("Stack trace request for thread:", args.threadId);
    response.body = {
      stackFrames: [
        {
          id: 0,
          name: "Main",
          source: { path: "" },
          line: 1,
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
    response.body = {
      variables: [
        { name: "EAX", value: "0x00000000", variablesReference: 0 },
        { name: "ECX", value: "0x00000000", variablesReference: 0 },
        { name: "EDX", value: "0x00000000", variablesReference: 0 },
        { name: "EBX", value: "0x00000000", variablesReference: 0 },
        { name: "ESP", value: "0x00000000", variablesReference: 0 },
        { name: "EBP", value: "0x00000000", variablesReference: 0 },
        { name: "ESI", value: "0x00000000", variablesReference: 0 },
        { name: "EDI", value: "0x00000000", variablesReference: 0 },
      ],
    };
    this.sendResponse(response);
  }

  protected continueRequest(
    response: DebugProtocol.ContinueResponse,
    args: DebugProtocol.ContinueArguments,
  ): void {
    console.error("[TonX86] Continue request for thread:", args.threadId);
    this.sendResponse(response);
  }

  protected nextRequest(
    response: DebugProtocol.NextResponse,
    args: DebugProtocol.NextArguments,
  ): void {
    console.error("[TonX86] Next request for thread:", args.threadId);
    this.sendResponse(response);
  }

  protected stepInRequest(
    response: DebugProtocol.StepInResponse,
    args: DebugProtocol.StepInArguments,
  ): void {
    console.error("[TonX86] Step in request for thread:", args.threadId);
    this.sendResponse(response);
  }

  protected stepOutRequest(
    response: DebugProtocol.StepOutResponse,
    args: DebugProtocol.StepOutArguments,
  ): void {
    console.error("[TonX86] Step out request for thread:", args.threadId);
    this.sendResponse(response);
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
    this.sendResponse(response);
  }
}

// Start the debug session
console.error("[TonX86] Debug adapter starting...");
DebugSession.run(TonX86DebugSession);
console.error("[TonX86] Debug adapter started");
