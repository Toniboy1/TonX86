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
 * Audio Configuration interface
 */
interface AudioConfig {
  enabled: boolean;
  volume: number; // 0-100 percentage
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
 * Validate and normalize audio configuration
 */
function getAudioConfig(): AudioConfig {
  const config = vscode.workspace.getConfiguration("tonx86.audio");
  const enabled = config.get<boolean>("enabled", true);
  let volume = config.get<number>("volume", 50);

  // Clamp volume to 0-100 range
  volume = Math.max(0, Math.min(100, volume));

  return { enabled, volume };
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
 * CPU State Item for display
 */
interface CPUStateItem {
  name: string;
  value: string | number;
  description?: string;
}

/**
 * Tree Data Provider for CPU State (Flags, IP, SP, etc.)
 */
class CPUStateProvider implements vscode.TreeDataProvider<CPUStateItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<CPUStateItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private cpuState: CPUStateItem[] = [
    { name: "IP", value: "0x00000000", description: "Instruction Pointer" },
    { name: "SP", value: "0xFFFF", description: "Stack Pointer" },
    { name: "Stack Usage", value: "0 bytes", description: "Stack memory used" },
    { name: "Call Depth", value: "0", description: "Call stack depth" },
    { name: "Status", value: "Running", description: "Execution status" },
    { name: "Keyboard", value: "No input", description: "Keyboard status" },
    { name: "Audio", value: "Disabled", description: "Audio device status" },
    { name: "CF", value: "0", description: "Carry Flag" },
    { name: "ZF", value: "0", description: "Zero Flag" },
    { name: "SF", value: "0", description: "Sign Flag" },
    { name: "OF", value: "0", description: "Overflow Flag" },
    { name: "PF", value: "0", description: "Parity Flag" },
    { name: "AF", value: "0", description: "Auxiliary Flag" },
  ];

  getTreeItem(element: CPUStateItem): vscode.TreeItem {
    const label = `${element.name}: ${element.value}`;
    const item = new vscode.TreeItem(label);
    item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    item.tooltip = element.description || element.name;
    item.description = element.description;
    return item;
  }

  getChildren(): CPUStateItem[] {
    return this.cpuState;
  }

  updateCPUState(data: {
    ip?: number;
    sp?: number;
    flags?: { CF: number; ZF: number; SF: number; OF: number; PF: number; AF: number };
    callStackDepth?: number;
    halted?: boolean;
    keyboardStatus?: number;
    audioControl?: number;
  }): void {
    if (data.ip !== undefined) {
      this.cpuState[0].value = `0x${data.ip.toString(16).padStart(8, "0")}`;
    }
    if (data.sp !== undefined) {
      const sp = data.sp;
      this.cpuState[1].value = `0x${sp.toString(16).padStart(4, "0")}`;
      // Calculate stack usage (stack grows downward from 0xFFFF)
      const stackUsed = 0xffff - sp;
      const stackPercent = ((stackUsed / 0xffff) * 100).toFixed(1);
      this.cpuState[2].value = `${stackUsed} bytes (${stackPercent}%)`;
    }
    if (data.callStackDepth !== undefined) {
      this.cpuState[3].value = data.callStackDepth.toString();
    }
    if (data.halted !== undefined) {
      this.cpuState[4].value = data.halted ? "Halted" : "Running";
    }
    if (data.keyboardStatus !== undefined) {
      // Keyboard status: 0 = no key, 1 = key available
      this.cpuState[5].value = data.keyboardStatus === 1 ? "Key available" : "No input";
    }
    if (data.audioControl !== undefined) {
      // Audio control register: bit 0 = enable
      const enabled = (data.audioControl & 0x01) !== 0;
      this.cpuState[6].value = enabled ? "Enabled" : "Disabled";
    }
    if (data.flags) {
      this.cpuState[7].value = data.flags.CF.toString();
      this.cpuState[8].value = data.flags.ZF.toString();
      this.cpuState[9].value = data.flags.SF.toString();
      this.cpuState[10].value = data.flags.OF.toString();
      this.cpuState[11].value = data.flags.PF.toString();
      this.cpuState[12].value = data.flags.AF.toString();
    }
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
 */
class LCDViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "tonx86.lcd";
  public static readonly panelViewType = "tonx86.lcd.panel";
  private lcdConfig: LCDConfig;
  private keyboardConfig: KeyboardConfig;
  private audioConfig: AudioConfig;
  private lcdPanel: vscode.WebviewPanel | undefined;
  private webviewView: vscode.WebviewView | undefined;
  private onKeyboardEvent: ((keyCode: number, pressed: boolean) => void) | undefined;

  constructor() {
    this.lcdConfig = getLCDConfig();
    this.keyboardConfig = getKeyboardConfig();
    this.audioConfig = getAudioConfig();
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
    this.audioConfig = getAudioConfig();

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

  /**
   * Play audio tone in the webview (browser context with AudioContext)
   */
  playAudio(
    frequency: number,
    duration: number,
    waveform: "square" | "sine",
    volume: number,
  ): void {
    if (!this.audioConfig.enabled) {
      console.log("[TonX86] Audio disabled in settings, skipping playback");
      return;
    }

    // Apply master volume multiplier (convert percentage to 0-1 range)
    const masterVolume = this.audioConfig.volume / 100.0;
    const adjustedVolume = volume * masterVolume;

    console.log(
      `[TonX86] Sending audio to webview: ${frequency}Hz, ${duration}ms, ${waveform}, vol:${volume} -> ${adjustedVolume} (master: ${masterVolume})`,
    );

    const message = { type: "playAudio", frequency, duration, waveform, volume: adjustedVolume };

    // Send to main view
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message);
      console.log("[TonX86] Audio message sent to main webview");
    } else {
      console.warn("[TonX86] Main webview not available");
    }

    // Send to popped out panel
    if (this.lcdPanel) {
      this.lcdPanel.webview.postMessage(message);
      console.log("[TonX86] Audio message sent to popped panel");
    }
  }

  // eslint-disable-next-line max-lines-per-function
  private getHtmlForWebview(): string {
    const { width, height, pixelSize } = this.lcdConfig;
    const { enabled: keyboardEnabled } = this.keyboardConfig;
    const { enabled: audioEnabled, volume: masterVolume } = this.audioConfig;

    return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
				<title>TonX86 LCD Display</title>
				<style>
					* {
						margin: 0;
						padding: 0;
						box-sizing: border-box;
					}
					
					body {
						font-family: var(--vscode-font-family);
						font-size: var(--vscode-font-size);
						color: var(--vscode-foreground);
						background: var(--vscode-editor-background);
						padding: 12px;
						user-select: none;
					}
					
					.container {
						display: flex;
						flex-direction: column;
						gap: 12px;
					}
					
					.header {
						display: flex;
						align-items: center;
						gap: 8px;
						padding-bottom: 8px;
						border-bottom: 1px solid var(--vscode-widget-border);
					}
					
					.title {
						font-size: 11px;
						font-weight: 600;
						color: var(--vscode-titleBar-activeForeground);
						letter-spacing: 0.5px;
						text-transform: uppercase;
					}
					
					.badge {
						display: inline-block;
						padding: 2px 6px;
						font-size: 10px;
						font-weight: 500;
						border-radius: 2px;
						background: var(--vscode-badge-background);
						color: var(--vscode-badge-foreground);
					}
					
					#lcd-container {
						display: flex;
						justify-content: center;
						padding: 16px;
						background: var(--vscode-editor-background);
						border: 1px solid var(--vscode-panel-border);
						border-radius: 4px;
					}
					
					#lcd {
						display: grid;
						grid-template-columns: repeat(${width}, ${pixelSize}px);
						grid-template-rows: repeat(${height}, ${pixelSize}px);
						gap: 1px;
						padding: 8px;
						background: var(--vscode-input-background);
						border: 2px solid var(--vscode-input-border);
						border-radius: 2px;
						outline: none;
						transition: border-color 0.15s ease;
					}
					
					#lcd:focus {
						border-color: var(--vscode-focusBorder);
						box-shadow: 0 0 0 1px var(--vscode-focusBorder);
					}
					
					.pixel {
						width: ${pixelSize}px;
						height: ${pixelSize}px;
						background: var(--vscode-editor-inactiveSelectionBackground);
						transition: background-color 0.1s ease;
					}
					
					.pixel.on {
						background: var(--vscode-editor-foreground);
					}
					
					.info-panel {
						display: flex;
						flex-direction: column;
						gap: 6px;
						padding: 8px 12px;
						background: var(--vscode-sideBar-background);
						border: 1px solid var(--vscode-panel-border);
						border-radius: 4px;
						font-size: 11px;
					}
					
					.info-row {
						display: flex;
						align-items: center;
						gap: 8px;
					}
					
					.info-label {
						color: var(--vscode-descriptionForeground);
						font-weight: 500;
						min-width: 70px;
					}
					
					.info-value {
						color: var(--vscode-foreground);
						font-family: var(--vscode-editor-font-family);
					}
					
					.status-indicator {
						display: inline-block;
						width: 6px;
						height: 6px;
						border-radius: 50%;
						margin-right: 4px;
					}
					
					.status-enabled {
						background: var(--vscode-testing-iconPassed);
					}
					
					.status-disabled {
						background: var(--vscode-testing-iconFailed);
					}
					
					.hint {
						font-size: 10px;
						color: var(--vscode-descriptionForeground);
						font-style: italic;
						padding: 6px 12px;
						background: var(--vscode-textCodeBlock-background);
						border-left: 2px solid var(--vscode-focusBorder);
						border-radius: 2px;
					}
					
					#debug {
						font-size: 9px;
						color: var(--vscode-descriptionForeground);
						font-family: var(--vscode-editor-font-family);
						padding: 4px 8px;
						background: var(--vscode-textCodeBlock-background);
						border-radius: 2px;
						margin-top: 8px;
						display: ${keyboardEnabled ? "block" : "none"};
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<span class="title">LCD Display</span>
						<span class="badge">${width}×${height}</span>
					</div>
					
					<div id="lcd-container">
						<div id="lcd" tabindex="0"></div>
					</div>
					
					<div class="info-panel">
						<div class="info-row">
							<span class="info-label">Resolution:</span>
							<span class="info-value">${width}×${height} pixels</span>
						</div>
						<div class="info-row">
							<span class="info-label">Pixel Size:</span>
							<span class="info-value">${pixelSize}px</span>
						</div>
						<div class="info-row">
							<span class="info-label">Memory:</span>
							<span class="info-value">0xF000 - 0x${(0xf000 + width * height - 1).toString(16).toUpperCase()}</span>
						</div>
					</div>
					
					<div class="info-panel">
						<div class="info-row">
							<span class="info-label">
								<span class="status-indicator ${keyboardEnabled ? "status-enabled" : "status-disabled"}"></span>
								Keyboard:
							</span>
							<span class="info-value">${keyboardEnabled ? "Enabled" : "Disabled"}</span>
						</div>
						${keyboardEnabled ? '<div class="hint">💡 Click LCD display and type to send keyboard input to your program</div>' : ""}
						<div class="info-row">
							<span class="info-label">
								<span class="status-indicator ${audioEnabled ? "status-enabled" : "status-disabled"}"></span>
								Audio:
							</span>
							<span class="info-value" id="audio-status">${audioEnabled ? `Enabled (Volume: ${masterVolume}%)` : "Disabled"}</span>
						</div>
					</div>
					
					<div id="debug">Last key: none</div>
				</div>
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
					
					// Create pixel grid
					for (let y = 0; y < height; y++) {
						for (let x = 0; x < width; x++) {
							const pixel = document.createElement('div');
							pixel.className = 'pixel';
							pixel.id = \`pixel-\${x}-\${y}\`;
							const address = 0xF000 + (y * width + x);
							pixel.title = \`0x\${address.toString(16).toUpperCase()} (x:\${x}, y:\${y})\`;
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
								return;
							}
							
							let keyCode = 0;
							
							// Check for special keys first
							if (specialKeys[e.key]) {
								keyCode = specialKeys[e.key];
							} else if (e.key.length === 1) {
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
					
					// Audio context for sound playback (Web Audio API)
					let audioContext = null;
					let audioUnlocked = false;
					let nextSoundTime = 0; // Track when last sound finishes for sequential playback
					
					// Function to unlock audio (requires user interaction)
					const unlockAudio = async () => {
						if (audioUnlocked || !${audioEnabled}) return;
						
						try {
							if (!audioContext) {
								console.log('[TonX86 Webview] Creating AudioContext');
								audioContext = new (window.AudioContext || window.webkitAudioContext)();
							}
							
							if (audioContext.state === 'suspended') {
								console.log('[TonX86 Webview] Resuming AudioContext');
								await audioContext.resume();
							}
							
							audioUnlocked = true;
							console.log('[TonX86 Webview] Audio unlocked! State:', audioContext.state);
							
							// Update UI
							const statusEl = document.getElementById('audio-status');
							if (statusEl) {
								statusEl.textContent = 'Audio: Enabled (Master Volume: ${masterVolume}%) - Ready';
								statusEl.style.color = '#007acc';
							}
						} catch (error) {
							console.error('[TonX86 Webview] Failed to unlock audio:', error);
						}
					};
					
					// Unlock audio on any user interaction
					lcd.addEventListener('click', unlockAudio, { once: true });
					document.addEventListener('click', unlockAudio, { once: true });
					document.addEventListener('keydown', unlockAudio, { once: true });
					
					// Listen for pixel updates and audio events from extension
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
						} else if (message.type === 'playAudio') {
							// Play audio using Web Audio API
							console.log('[TonX86 Webview] Audio event received:', message);
							
							// Attempt to unlock audio if not already unlocked
							if (!audioUnlocked) {
								unlockAudio();
							}
							
							try {
								// Check if audio is enabled
								if (!${audioEnabled}) {
									console.log('[TonX86 Webview] Audio is disabled in settings');
									return;
								}
								
								// Ensure AudioContext exists
								if (!audioContext) {
									console.log('[TonX86 Webview] Initializing AudioContext');
									audioContext = new (window.AudioContext || window.webkitAudioContext)();
								}
								
								console.log('[TonX86 Webview] AudioContext state:', audioContext.state);
								
								// Try to resume if suspended
								if (audioContext.state === 'suspended') {
									console.log('[TonX86 Webview] AudioContext suspended - resuming');
									audioContext.resume().then(() => {
										console.log('[TonX86 Webview] AudioContext resumed');
									});
								}
								
								const oscillator = audioContext.createOscillator();
								const gainNode = audioContext.createGain();
								
								// Set waveform
								oscillator.type = message.waveform;
								oscillator.frequency.value = message.frequency;
								
								// Set volume (0.0 to 1.0)
								gainNode.gain.value = Math.max(0, Math.min(1, message.volume));
								
								// Connect nodes
								oscillator.connect(gainNode);
								gainNode.connect(audioContext.destination);
								
								// Schedule playback sequentially (queue sounds with small gaps)
								const now = audioContext.currentTime;
								const startTime = Math.max(now, nextSoundTime);
								const duration = message.duration / 1000.0;
								const gap = 0.05; // 50ms gap between sounds
								
								oscillator.start(startTime);
								oscillator.stop(startTime + duration);
								
								// Update next available time slot
								nextSoundTime = startTime + duration + gap;
								
								console.log('[TonX86 Webview] Scheduled tone:', message.frequency + 'Hz', message.duration + 'ms at', startTime.toFixed(3) + 's', 'vol:' + message.volume);
							} catch (error) {
								console.error('[TonX86 Webview] Audio playback error:', error);
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

  updateAudioConfig(): void {
    this.audioConfig = getAudioConfig();
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
    this.audioConfig = getAudioConfig();

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
const cpuStateProvider = new CPUStateProvider();
// Memory views show first 16 bytes of each bank
const MEMORY_VIEW_SIZE = 16;
const memoryProviderA = new MemoryProvider(0x0000, MEMORY_VIEW_SIZE);
const memoryProviderB = new MemoryProvider(0x0000, MEMORY_VIEW_SIZE);
let lcdProvider: LCDViewProvider;
let currentDebugSession: vscode.DebugSession | undefined;
let client: LanguageClient;
let outputChannel: vscode.OutputChannel;

// eslint-disable-next-line max-lines-per-function
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
  vscode.window.registerTreeDataProvider("tonx86.cpuState", cpuStateProvider);
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
        // Poll LCD, memory, and CPU state every 10ms while debugging (100 FPS) to capture fast programs
        viewUpdateInterval = setInterval(async () => {
          await updateLCDDisplay(session);
          await updateMemoryViews(session);
          await updateCPUState(session);
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

  // Helper function to fetch and update CPU state (flags, IP, SP)
  async function updateCPUState(session: vscode.DebugSession) {
    try {
      const cpuData = await fetchCPUStateFromDebugSession(session);
      if (cpuData) {
        cpuStateProvider.updateCPUState(cpuData);
      }
    } catch (_error) {
      // Silently fail - session might not be ready yet
    }
  }

  // Helper to extract CPU state from debug session
  async function fetchCPUStateFromDebugSession(session: vscode.DebugSession) {
    const threads = await session.customRequest("threads");
    if (!threads?.threads?.length) {
      return null;
    }

    const stackFrameResponse = await session.customRequest("stackTrace", {
      threadId: threads.threads[0].id,
      startFrame: 0,
      levels: 1,
    });

    const frame = stackFrameResponse?.stackFrames?.[0];
    if (!frame) {
      return null;
    }

    const scopesResponse = await session.customRequest("scopes", { frameId: frame.id });
    if (!scopesResponse?.scopes) {
      return null;
    }

    // Fetch system state (call stack depth, keyboard, audio, halted status)
    let systemState: {
      callStackDepth?: number;
      halted?: boolean;
      keyboardStatus?: number;
      audioControl?: number;
    } = {};
    try {
      const sysStateResponse = await session.customRequest("getSystemState");
      if (sysStateResponse) {
        systemState = {
          callStackDepth: sysStateResponse.callStackDepth,
          halted: sysStateResponse.halted,
          keyboardStatus: sysStateResponse.keyboardStatus,
          audioControl: sysStateResponse.audioControl,
        };
      }
    } catch (_error) {
      // Silently continue if system state is not available
    }

    for (const scope of scopesResponse.scopes) {
      const varsResponse = await session.customRequest("variables", {
        variablesReference: scope.variablesReference,
      });

      if (!varsResponse?.variables) {
        continue;
      }

      const cpuData = await extractCPUDataFromVariables(session, varsResponse.variables);
      if (cpuData.ip !== undefined || cpuData.sp !== undefined || cpuData.flags) {
        // Merge system state into CPU data
        return { ...cpuData, ...systemState };
      }
    }

    return null;
  }

  // Helper to parse CPU data from variable list
  async function extractCPUDataFromVariables(
    session: vscode.DebugSession,
    variables: Array<{ name: string; value: string; variablesReference?: number }>,
  ) {
    const cpuData: {
      sp?: number;
      ip?: number;
      flags?: { CF: number; ZF: number; SF: number; OF: number; PF: number; AF: number };
      callStackDepth?: number;
      halted?: boolean;
      keyboardStatus?: number;
      audioControl?: number;
    } = {};

    for (const variable of variables) {
      if (variable.name === "ESP") {
        cpuData.sp = parseInt(variable.value, 16) || 0;
      } else if (variable.name === "EIP" || variable.name === "IP") {
        cpuData.ip = parseInt(variable.value, 16) || 0;
      } else if (variable.name === "Flags" && variable.variablesReference) {
        cpuData.flags = await parseFlagsFromVariable(session, variable.variablesReference);
      }
    }

    return cpuData;
  }

  // Helper to parse flag values
  async function parseFlagsFromVariable(session: vscode.DebugSession, reference: number) {
    const flagsScope = await session.customRequest("variables", {
      variablesReference: reference,
    });

    if (!flagsScope?.variables) {
      return undefined;
    }

    const flags = { CF: 0, ZF: 0, SF: 0, OF: 0, PF: 0, AF: 0 };
    for (const flag of flagsScope.variables) {
      const value = parseInt(flag.value) || 0;
      if (flag.name === "CF") flags.CF = value;
      if (flag.name === "ZF") flags.ZF = value;
      if (flag.name === "SF") flags.SF = value;
      if (flag.name === "OF") flags.OF = value;
      if (flag.name === "PF") flags.PF = value;
      if (flag.name === "AF") flags.AF = value;
    }

    return flags;
  }

  // Mirror Debug Console output to Output panel and handle audio events
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
            } else if (
              message.type === "event" &&
              message.event === "output" &&
              message.body?.category === "tonx86-audio"
            ) {
              // Handle audio event - send to LCD webview (browser context)
              try {
                const audioEvent = JSON.parse(message.body.output);
                if (audioEvent.type === "audioEvent") {
                  lcdProvider.playAudio(
                    audioEvent.frequency,
                    audioEvent.duration,
                    audioEvent.waveform,
                    audioEvent.volume,
                  );
                }
              } catch (error) {
                console.error("[TonX86] Failed to parse audio event:", error);
              }
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
      if (event.affectsConfiguration("tonx86.audio")) {
        console.log("Audio configuration changed");
        lcdProvider.updateAudioConfig();
        // Update is immediate, no reload needed
        const audioConfig = getAudioConfig();
        vscode.window.showInformationMessage(
          `Audio configuration updated. Master volume: ${audioConfig.volume}%`,
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
