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
    };
    this.sendResponse(response);
  }

  protected launchRequest(response: DebugProtocol.LaunchResponse): void {
    this.sendResponse(response);
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
  ): void {
    response.body = { breakpoints: [] };
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
  ): void {
    response.body = { stackFrames: [] };
    this.sendResponse(response);
  }
}
