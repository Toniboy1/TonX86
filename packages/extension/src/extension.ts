import * as vscode from "vscode";
import * as path from "path";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

/**
 * LCD Configuration interface
 */
interface LCDConfig {
  enabled: boolean;
  width: number;
  height: number;
  pixelSize: number;
}

/**
 * Keyboard Configuration interface
 */
interface KeyboardConfig {
  enabled: boolean;
}

/**
 * Debug Configuration Provider
 * Injects extension settings into debug configuration
 */
class TonX86DebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  /**
   * Resolve a debug configuration before it is used to start a debug session
   * This allows us to inject extension settings into the debug configuration
   */
  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    _?: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    // Get extension settings (always read fresh)
    const cpuSpeedSetting = vscode.workspace
      .getConfiguration("tonx86.cpu")
      .get<number>("speed", 100);
    const enableLoggingSetting = vscode.workspace
      .getConfiguration("tonx86.debug")
      .get<boolean>("enableLogging", false);
    const stopOnEntrySetting = vscode.workspace
      .getConfiguration("tonx86.debug")
      .get<boolean>("stopOnEntry", true);

    // Log to Output channel for visibility
    console.log(`[TonX86 Config] Reading settings:`);
    console.log(`[TonX86 Config] - CPU Speed: ${cpuSpeedSetting}%`);
    console.log(`[TonX86 Config] - Enable Logging: ${enableLoggingSetting}`);
    console.log(`[TonX86 Config] - Stop On Entry: ${stopOnEntrySetting}`);

    // Always use extension settings
    config.cpuSpeed = cpuSpeedSetting;
    config.enableLogging = enableLoggingSetting;
    config.stopOnEntry = stopOnEntrySetting;

    console.log(
      `[TonX86 Config] Final config being sent to debug adapter:`,
      JSON.stringify({
        cpuSpeed: config.cpuSpeed,
        enableLogging: config.enableLogging,
        stopOnEntry: config.stopOnEntry,
      }),
    );

    return config;
  }
}

/**
 * Validate and normalize keyboard configuration
 */
function getKeyboardConfig(): KeyboardConfig {
  const config = vscode.workspace.getConfiguration("tonx86.keyboard");
  const enabled = config.get<boolean>("enabled", true);
  return { enabled };
}

/**
 * Validate and normalize LCD configuration
 */
function getLCDConfig(): LCDConfig {
  const config = vscode.workspace.getConfiguration("tonx86.lcd");

  const enabled = config.get<boolean>("enabled", true);
  let width = config.get<number>("width", 16);
  let height = config.get<number>("height", 16);
  let pixelSize = config.get<number>("pixelSize", 5);

  // Validate width
  if (width < 2 || width > 256 || !Number.isInteger(width)) {
    width = 16;
    console.warn("Invalid LCD width, resetting to default (16)");
  }

  // Validate height
  if (height < 2 || height > 256 || !Number.isInteger(height)) {
    height = 16;
    console.warn("Invalid LCD height, resetting to default (16)");
  }

  // Validate pixel size
  if (!Number.isInteger(pixelSize) || pixelSize < 1 || pixelSize > 50) {
    pixelSize = 5;
    console.warn("Invalid LCD pixel size, resetting to default (5)");
  }

  return { enabled, width, height, pixelSize };
}

/**
 * Register data for tree view
 */
interface RegisterItem {
  name: string;
  value: number;
}

/**
 * Tree Data Provider for Registers
 */
class RegistersProvider implements vscode.TreeDataProvider<RegisterItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RegisterItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private registers: RegisterItem[] = [
    { name: "EAX", value: 0 },
    { name: "ECX", value: 0 },
    { name: "EDX", value: 0 },
    { name: "EBX", value: 0 },
    { name: "ESP", value: 0 },
    { name: "EBP", value: 0 },
    { name: "ESI", value: 0 },
    { name: "EDI", value: 0 },
  ];

  getTreeItem(element: RegisterItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `${element.name}: 0x${element.value.toString(16).padStart(8, "0")}`,
    );
    item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    return item;
  }

  getChildren(): RegisterItem[] {
    return this.registers;
  }

  updateRegisters(values: number[]): void {
    this.registers.forEach((reg, index) => {
      if (index < values.length) {
        reg.value = values[index];
      }
    });
    this._onDidChangeTreeData.fire(undefined);
  }
}

/**
 * Memory range for display
 */
interface MemoryRange {
  address: string;
  value: string;
}

/**
 * Tree Data Provider for Memory
 */
class MemoryProvider implements vscode.TreeDataProvider<MemoryRange> {
  private _onDidChangeTreeData = new vscode.EventEmitter<MemoryRange | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private memory: MemoryRange[] = [];

  constructor(
    private startAddr: number,
    private length: number,
  ) {
    this.initializeMemory();
  }

  private initializeMemory(): void {
    this.memory = [];
    for (let i = 0; i < this.length; i++) {
      this.memory.push({
        address: `0x${(this.startAddr + i).toString(16).padStart(4, "0")}`,
        value: "0x00",
      });
    }
  }

  getTreeItem(element: MemoryRange): vscode.TreeItem {
    const item = new vscode.TreeItem(`${element.address}: ${element.value}`);
    item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    return item;
  }

  getChildren(): MemoryRange[] {
    return this.memory;
  }

  updateMemory(data: Uint8Array): void {
    data.forEach((value, index) => {
      if (index < this.memory.length) {
        this.memory[index].value = `0x${value.toString(16).padStart(2, "0")}`;
      }
    });
    this._onDidChangeTreeData.fire(undefined);
  }
}

/**
 * Webview Provider for LCD Display
 */
/**
 * LCD View Provider class
 * Exported for testing purposes
 */
export class LCDViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "tonx86.lcd";
  public static readonly panelViewType = "tonx86.lcd.panel";
  private lcdConfig: LCDConfig;
  private keyboardConfig: KeyboardConfig;
  private lcdPanel: vscode.WebviewPanel | undefined;
  private webviewView: vscode.WebviewView | undefined;
  private onKeyboardEvent: ((keyCode: number, pressed: boolean) => void) | undefined;

  constructor() {
    this.lcdConfig = getLCDConfig();
    this.keyboardConfig = getKeyboardConfig();
  }

  /**
   * Set keyboard event handler
   */
  setKeyboardEventHandler(handler: (keyCode: number, pressed: boolean) => void): void {
    this.onKeyboardEvent = handler;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    // Keep webview alive when hidden to maintain keyboard state
    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === "keyboardEvent" && this.keyboardConfig.enabled) {
        if (this.onKeyboardEvent) {
          this.onKeyboardEvent(message.keyCode, message.pressed);
        }
      }
    });

    // Refresh config to ensure latest settings
    this.updateLCDConfig();
    this.keyboardConfig = getKeyboardConfig();

    webviewView.webview.html = this.getHtmlForWebview();
  }

  /**
   * Update LCD pixels in the webview
   */
  updatePixels(pixels: number[]): void {
    const message = { type: "updatePixels", pixels };

    // Update main view
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message);
    }

    // Update popped out panel
    if (this.lcdPanel) {
      this.lcdPanel.webview.postMessage(message);
    }
  }

  private getHtmlForWebview(): string {
    const { width, height, pixelSize } = this.lcdConfig;
    const { enabled: keyboardEnabled } = this.keyboardConfig;

    return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
				<title>TonX86 LCD Display</title>
				<style>
					body { font-family: monospace; padding: 10px; }
					#lcd { 
						display: grid; 
						grid-template-columns: repeat(${width}, ${pixelSize}px);
						grid-template-rows: repeat(${height}, ${pixelSize}px);
						gap: 1px;
						border: 2px solid #333; 
						padding: 10px; 
						background: #f0f0f0;
						width: fit-content;
						outline: none;
					}
					#lcd:focus {
						border-color: #007acc;
						box-shadow: 0 0 5px rgba(0, 122, 204, 0.5);
					}
					.pixel { width: ${pixelSize}px; height: ${pixelSize}px; background: #ddd; cursor: pointer; }
					.pixel.on { background: #333; }
					.info { font-size: 0.9em; color: #666; margin-top: 10px; }
					.keyboard-status { font-size: 0.8em; color: ${keyboardEnabled ? "#007acc" : "#999"}; margin-top: 5px; }
				</style>
			</head>
			<body>
				<h3>LCD Display (${width}x${height})</h3>
				<div id="lcd" tabindex="0"></div>
				<div class="info">Pixel Size: ${pixelSize}px</div>
				<div class="keyboard-status">Keyboard: ${keyboardEnabled ? "Enabled (click LCD to focus)" : "Disabled"}</div>
				<div id="debug" style="font-size: 0.7em; color: #999; margin-top: 5px; font-family: monospace;">Last key: none</div>
				<script>
					const vscode = acquireVsCodeApi();
					const lcd = document.getElementById('lcd');
					const width = ${width}, height = ${height};
					const pixels = [];
					const keyboardEnabled = ${keyboardEnabled};
					
					// Map special keys to key codes
					const specialKeys = {
						'ArrowUp': 128,
						'ArrowDown': 129,
						'ArrowLeft': 130,
						'ArrowRight': 131
					};
					
					// Create pixel grid (no <br> tags needed with CSS Grid)
					for (let y = 0; y < height; y++) {
						for (let x = 0; x < width; x++) {
							const pixel = document.createElement('div');
							pixel.className = 'pixel';
							pixel.id = \`pixel-\${x}-\${y}\`;
							const address = 0xF000 + (y * width + x);
							pixel.title = \`Address: 0x\${address.toString(16).toUpperCase()} (x:\${x}, y:\${y})\`;
							lcd.appendChild(pixel);
							pixels.push(pixel);
						}
					}
					
					// Keyboard event handling
					if (keyboardEnabled) {
						// Focus LCD on click
						lcd.addEventListener('click', () => {
							lcd.focus();
						});
						
						// Auto-focus on load
						setTimeout(() => lcd.focus(), 100);
						
						// Helper function to send keyboard event
						const sendKeyEvent = (e, pressed) => {
							// Don't capture debugger function keys
							if (e.key.startsWith('F') && e.key.length <= 3) {
								// Allow F1-F12 for debugging
								return;
							}
							
							let keyCode = 0;
							
							// Check for special keys first
							if (specialKeys[e.key]) {
								keyCode = specialKeys[e.key];
							} else if (e.key.length === 1) {
								// Single character (letter, number, symbol)
								keyCode = e.key.charCodeAt(0);
							} else if (e.key === 'Enter') {
								keyCode = 13;
							} else if (e.key === 'Escape') {
								keyCode = 27;
							} else if (e.key === 'Tab') {
								keyCode = 9;
							} else if (e.key === 'Backspace') {
								keyCode = 8;
							} else if (e.key === ' ' || e.key === 'Space') {
								keyCode = 32;
							}
							
							if (keyCode > 0) {
								// Prevent default only for keys we handle
								e.preventDefault();
								e.stopPropagation();
								
								// Update debug info
								const debugEl = document.getElementById('debug');
								if (debugEl) {
									debugEl.textContent = \`Last key: \${e.key} (code:\${keyCode}) \${pressed ? 'DOWN' : 'UP'}\`;
								}
								
								vscode.postMessage({
									type: 'keyboardEvent',
									keyCode: keyCode,
									pressed: pressed
								});
							}
						};
						
						// Capture at both LCD and document level
						lcd.addEventListener('keydown', (e) => sendKeyEvent(e, true), true);
						lcd.addEventListener('keyup', (e) => sendKeyEvent(e, false), true);
						document.addEventListener('keydown', (e) => sendKeyEvent(e, true), true);
						document.addEventListener('keyup', (e) => sendKeyEvent(e, false), true);
					}
					
					// Listen for pixel updates from extension
					window.addEventListener('message', event => {
						const message = event.data;
						if (message.type === 'updatePixels') {
							const pixelData = message.pixels;
							for (let i = 0; i < pixelData.length && i < pixels.length; i++) {
								if (pixelData[i]) {
									pixels[i].classList.add('on');
								} else {
									pixels[i].classList.remove('on');
								}
							}
						}
					});
				</script>
			</body>
			</html>
		`;
  }

  updateLCDConfig(): void {
    this.lcdConfig = getLCDConfig();
  }

  getLCDConfig(): LCDConfig {
    return this.lcdConfig;
  }

  popOut(): void {
    if (this.lcdPanel) {
      this.lcdPanel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    // Refresh config before creating pop-out to ensure latest settings
    this.updateLCDConfig();
    this.keyboardConfig = getKeyboardConfig();

    this.lcdPanel = vscode.window.createWebviewPanel(
      LCDViewProvider.panelViewType,
      "TonX86 LCD Display",
      vscode.ViewColumn.Beside,
      { enableScripts: true, localResourceRoots: [] },
    );

    this.lcdPanel.webview.html = this.getHtmlForWebview();

    // Handle messages from popped-out panel
    this.lcdPanel.webview.onDidReceiveMessage((message) => {
      if (message.type === "keyboardEvent" && this.keyboardConfig.enabled) {
        if (this.onKeyboardEvent) {
          this.onKeyboardEvent(message.keyCode, message.pressed);
        }
      }
    });

    // Handle panel disposal
    this.lcdPanel.onDidDispose(() => {
      this.lcdPanel = undefined;
    });
  }

  popIn(): void {
    if (this.lcdPanel) {
      this.lcdPanel.dispose();
      this.lcdPanel = undefined;
    }
  }

  isPopped(): boolean {
    return this.lcdPanel !== undefined;
  }
}

/**
 * Webview Provider for ISA Documentation
 */
class DocsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "tonx86.docs";

  constructor() {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = this.getHtmlForWebview();
  }

  private getHtmlForWebview(): string {
    return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
				<title>TonX86 ISA Docs</title>
				<style>
					body { font-family: sans-serif; padding: 10px; }
					h3 { margin-top: 0; }
					.instruction { margin: 10px 0; padding: 8px; background: #f5f5f5; border-left: 3px solid #007acc; }
					.mnemonic { font-weight: bold; color: #007acc; }
					.description { font-size: 0.9em; color: #666; }
				</style>
			</head>
			<body>
				<h3>TonX86 ISA Reference</h3>
				<div id="docs">
					<h4 style="margin-top: 15px; color: #007acc;">Data Movement</h4>
					<div class="instruction">
						<span class="mnemonic">MOV</span>
						<div class="description">Move data between registers or memory (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">XCHG</span>
						<div class="description">Exchange values between two registers (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">LEA</span>
						<div class="description">Load effective address (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">MOVZX</span>
						<div class="description">Move with zero extension (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">MOVSX</span>
						<div class="description">Move with sign extension (1 cycle)</div>
					</div>
					
					<h4 style="margin-top: 15px; color: #007acc;">Arithmetic</h4>
					<div class="instruction">
						<span class="mnemonic">ADD</span>
						<div class="description">Add two values (1 cycle, affects Z,C,O,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">SUB</span>
						<div class="description">Subtract source from destination (1 cycle, affects Z,C,O,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">CMP</span>
						<div class="description">Compare values (SUB without storing, 1 cycle, affects Z,C,O,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">INC</span>
						<div class="description">Increment by 1 (1 cycle, affects Z,O,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">DEC</span>
						<div class="description">Decrement by 1 (1 cycle, affects Z,O,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">NEG</span>
						<div class="description">Two's complement negation (1 cycle, affects Z,C,O,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">MUL</span>
						<div class="description">Unsigned multiply (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">IMUL</span>
						<div class="description">Signed multiply (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">DIV</span>
						<div class="description">Unsigned divide (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">IDIV</span>
						<div class="description">Signed divide (1 cycle, affects Z,S)</div>
					</div>
					
					<h4 style="margin-top: 15px; color: #007acc;">Logical</h4>
					<div class="instruction">
						<span class="mnemonic">AND</span>
						<div class="description">Bitwise AND (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">OR</span>
						<div class="description">Bitwise OR (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">XOR</span>
						<div class="description">Bitwise XOR (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">NOT</span>
						<div class="description">Bitwise NOT (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">TEST</span>
						<div class="description">Logical AND (flags only, 1 cycle, affects Z,S)</div>
					</div>
					
					<h4 style="margin-top: 15px; color: #007acc;">Shifts & Rotates</h4>
					<div class="instruction">
						<span class="mnemonic">SHL</span>
						<div class="description">Shift left (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">SHR</span>
						<div class="description">Shift right logical (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">SAR</span>
						<div class="description">Shift arithmetic right (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">ROL</span>
						<div class="description">Rotate left (1 cycle, affects Z,S)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">ROR</span>
						<div class="description">Rotate right (1 cycle, affects Z,S)</div>
					</div>
					
					<h4 style="margin-top: 15px; color: #007acc;">Control Flow</h4>
					<div class="instruction">
						<span class="mnemonic">JMP</span>
						<div class="description">Unconditional jump (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">JE/JZ</span>
						<div class="description">Jump if equal/zero (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">JNE/JNZ</span>
						<div class="description">Jump if not equal/not zero (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">HLT</span>
						<div class="description">Halt execution (1 cycle)</div>
					</div>
					
					<h4 style="margin-top: 15px; color: #007acc;">Stack Operations</h4>
					<div class="instruction">
						<span class="mnemonic">PUSH</span>
						<div class="description">Push register onto stack (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">POP</span>
						<div class="description">Pop from stack into register (1 cycle)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">CALL</span>
						<div class="description">Call subroutine (2 cycles)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">RET</span>
						<div class="description">Return from subroutine (2 cycles)</div>
					</div>
					
					<h4 style="margin-top: 15px; color: #007acc;">Interrupts</h4>
					<div class="instruction">
						<span class="mnemonic">INT</span>
						<div class="description">Software interrupt (2 cycles)</div>
					</div>
					<div class="instruction">
						<span class="mnemonic">IRET</span>
						<div class="description">Return from interrupt (2 cycles)</div>
					</div>
				</div>
			</body>
			</html>
		`;
  }
}

// Global state
const registersProvider = new RegistersProvider();
// Memory views show first 16 bytes of each bank
const MEMORY_VIEW_SIZE = 16;
const memoryProviderA = new MemoryProvider(0x0000, MEMORY_VIEW_SIZE);
const memoryProviderB = new MemoryProvider(0x0000, MEMORY_VIEW_SIZE);
let lcdProvider: LCDViewProvider;
let currentDebugSession: vscode.DebugSession | undefined;
let client: LanguageClient;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  console.log("TonX86 extension is now active");

  // Initialize Language Server
  const serverModule = context.asAbsolutePath(path.join("dist", "languageServer.js"));

  // Server options
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "tonx86" }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.asm"),
    },
  };

  // Create the language client
  client = new LanguageClient(
    "tonx86LanguageServer",
    "TonX86 Language Server",
    serverOptions,
    clientOptions,
  );

  // Start the client (and the server)
  client.start();
  console.log("TonX86 Language Server started");

  // Output channel for debug output
  outputChannel = vscode.window.createOutputChannel("TonX86");
  context.subscriptions.push(outputChannel);

  // Register debug configuration provider
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      "tonx86",
      new TonX86DebugConfigurationProvider(),
    ),
  );

  // Register tree data providers
  vscode.window.registerTreeDataProvider("tonx86.registers", registersProvider);
  vscode.window.registerTreeDataProvider("tonx86.memoryA", memoryProviderA);
  vscode.window.registerTreeDataProvider("tonx86.memoryB", memoryProviderB);

  // Register webview providers
  lcdProvider = new LCDViewProvider();

  // Set keyboard event handler to forward to debug adapter
  lcdProvider.setKeyboardEventHandler((keyCode: number, pressed: boolean) => {
    if (!currentDebugSession) {
      console.log("Keyboard event ignored - no active debug session. Start debugging (F5) first.");
      return;
    }
    currentDebugSession
      .customRequest("keyboardEvent", {
        keyCode,
        pressed,
      })
      .then(undefined, (err: unknown) => {
        console.error(`Failed to send keyboard event (keyCode=${keyCode}):`, err);
      });
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(LCDViewProvider.viewType, lcdProvider),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DocsViewProvider.viewType, new DocsViewProvider()),
  );

  // Listen for debug events to update LCD display and memory views
  let viewUpdateInterval: NodeJS.Timeout | undefined;

  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession((session) => {
      if (session.type === "tonx86") {
        console.log("TonX86 debug session started, polling view states");
        currentDebugSession = session; // Store current session for keyboard events
        outputChannel.appendLine("=== Program Output ===");
        outputChannel.show(true);
        // Poll LCD and memory state every 10ms while debugging (100 FPS) to capture fast programs
        viewUpdateInterval = setInterval(async () => {
          await updateLCDDisplay(session);
          await updateMemoryViews(session);
        }, 10);
      }
    }),
  );

  context.subscriptions.push(
    vscode.debug.onDidTerminateDebugSession((session) => {
      if (session.type === "tonx86") {
        console.log("TonX86 debug session terminated, stopping view polling");
        currentDebugSession = undefined; // Clear session reference
        outputChannel.appendLine("=== End of Program Output ===");
        if (viewUpdateInterval) {
          clearInterval(viewUpdateInterval);
          viewUpdateInterval = undefined;
        }
      }
    }),
  );

  // Helper function to fetch and update LCD display
  async function updateLCDDisplay(session: vscode.DebugSession) {
    try {
      const response = await session.customRequest("getLCDState");
      if (response && response.pixels) {
        lcdProvider.updatePixels(response.pixels);
      }
    } catch (_error) {
      // Silently fail - session might not be ready yet
    }
  }

  // Helper function to fetch and update memory views
  async function updateMemoryViews(session: vscode.DebugSession) {
    try {
      const response = await session.customRequest("getMemoryState", {
        start: 0,
        length: MEMORY_VIEW_SIZE,
      });
      if (response && response.memoryA && response.memoryB) {
        memoryProviderA.updateMemory(new Uint8Array(response.memoryA));
        memoryProviderB.updateMemory(new Uint8Array(response.memoryB));
      }
    } catch (_error) {
      // Silently fail - session might not be ready yet
    }
  }

  // Mirror Debug Console output to Output panel
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterTrackerFactory("tonx86", {
      createDebugAdapterTracker(session: vscode.DebugSession) {
        if (session.type !== "tonx86") {
          return undefined;
        }
        return {
          onDidSendMessage(message) {
            if (
              message.type === "event" &&
              message.event === "output" &&
              message.body?.output &&
              (message.body.category === "stdout" || message.body.category === "stderr")
            ) {
              outputChannel.append(message.body.output);
            }
          },
        };
      },
    }),
  );

  // Monitor configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
      if (event.affectsConfiguration("tonx86.lcd")) {
        console.log("LCD configuration changed");
        lcdProvider.updateLCDConfig();
        // Reload the webview
        vscode.window.showInformationMessage(
          "LCD configuration updated. Reload the LCD view to apply changes.",
        );
      }
    }),
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("tonx86.assemble", () => {
      vscode.window.showInformationMessage("TonX86: Assemble");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tonx86.run", () => {
      vscode.window.showInformationMessage("TonX86: Run");
      // Update views (non-blocking)
      registersProvider.updateRegisters([10, 20, 30, 40, 50, 60, 70, 80]);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tonx86.pause", () => {
      vscode.window.showInformationMessage("TonX86: Pause");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tonx86.stepOver", () => {
      vscode.window.showInformationMessage("TonX86: Step Over");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tonx86.stepIn", () => {
      vscode.window.showInformationMessage("TonX86: Step In");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tonx86.stepOut", () => {
      vscode.window.showInformationMessage("TonX86: Step Out");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tonx86.reset", () => {
      vscode.window.showInformationMessage("TonX86: Reset");
      registersProvider.updateRegisters([0, 0, 0, 0, 0, 0, 0, 0]);
    }),
  );

  // LCD pop out/pop in commands
  context.subscriptions.push(
    vscode.commands.registerCommand("tonx86.lcdPopOut", () => {
      console.log("LCD: Pop out");
      lcdProvider.popOut();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tonx86.lcdPopIn", () => {
      console.log("LCD: Pop in");
      lcdProvider.popIn();
    }),
  );
}

export function deactivate(): Thenable<void> | undefined {
  console.log("TonX86 extension is now deactivated");
  if (!client) {
    return undefined;
  }
  return client.stop();
}
