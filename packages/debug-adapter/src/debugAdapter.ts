import { DebugSession } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";

export class TonX86DebugSession extends DebugSession {
  public constructor() {
    super();
  }

  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
  ): void {
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
    console.log("Launch request:", args);
    this.sendResponse(response);
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments,
  ): void {
    console.log("Set breakpoints:", args);
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
      stackFrames: [{
        id: 0,
        name: "Main",
        source: { path: "" },
        line: 1,
        column: 0,
      }],
    };
    this.sendResponse(response);
  }

  protected scopesRequest(
    response: DebugProtocol.ScopesResponse,
    args: DebugProtocol.ScopesArguments,
  ): void {
    console.log("Scopes request for frame:", args.frameId);
    response.body = {
      scopes: [{
        name: "Registers",
        variablesReference: 1,
        expensive: false,
      }],
    };
    this.sendResponse(response);
  }

  protected variablesRequest(
    response: DebugProtocol.VariablesResponse,
    args: DebugProtocol.VariablesArguments,
  ): void {
    console.log("Variables request for ref:", args.variablesReference);
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
    console.log("Continue request for thread:", args.threadId);
    this.sendResponse(response);
  }

  protected nextRequest(
    response: DebugProtocol.NextResponse,
    args: DebugProtocol.NextArguments,
  ): void {
    console.log("Next request for thread:", args.threadId);
    this.sendResponse(response);
  }

  protected stepInRequest(
    response: DebugProtocol.StepInResponse,
    args: DebugProtocol.StepInArguments,
  ): void {
    console.log("Step in request for thread:", args.threadId);
    this.sendResponse(response);
  }

  protected stepOutRequest(
    response: DebugProtocol.StepOutResponse,
    args: DebugProtocol.StepOutArguments,
  ): void {
    console.log("Step out request for thread:", args.threadId);
    this.sendResponse(response);
  }

  protected pauseRequest(
    response: DebugProtocol.PauseResponse,
    args: DebugProtocol.PauseArguments,
  ): void {
    console.log("Pause request for thread:", args.threadId);
    this.sendResponse(response);
  }

  protected configurationDoneRequest(
    response: DebugProtocol.ConfigurationDoneResponse,
  ): void {
    console.log("Configuration done");
    this.sendResponse(response);
  }
}

// Start the debug session
DebugSession.run(TonX86DebugSession);
