import { DebugSession } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';

export class TonX86DebugSession extends DebugSession {
	public constructor() {
		super();
	}

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		response.body = {
			supportsConfigurationDoneRequest: true,
			supportsSetBreakpoint: true,
			supportsStepInRequest: true,
			supportsStepOverRequest: true,
			supportsStepOutRequest: true,
			supportsSingleThreadExecutionRequests: true,
		};
		this.sendResponse(response);
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments, request?: DebugProtocol.Request): void {
		this.sendResponse(response);
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		response.body = { breakpoints: [] };
		this.sendResponse(response);
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = {
			threads: [
				{ id: 1, name: 'Main Thread' }
			]
		};
		this.sendResponse(response);
	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		response.body = { stackFrames: [] };
		this.sendResponse(response);
	}
}
