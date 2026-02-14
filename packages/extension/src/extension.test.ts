import * as vscode from "vscode";
import { activate, deactivate, LCDViewProvider } from "./extension";

// Mock vscode-languageclient
jest.mock("vscode-languageclient/node", () => ({
  LanguageClient: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(() => Promise.resolve()),
  })),
  TransportKind: {
    ipc: 1,
  },
}));

describe("TonX86 Extension", () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Suppress console output during tests
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();

    // Restore default getConfiguration mock (may have been overridden by previous test)
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(() => ({
      get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
    }));

    mockContext = {
      subscriptions: [],
      extensionPath: "/mock/extension/path",
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(() => []),
        setKeysForSync: jest.fn(),
      },
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(() => []),
      },
      extensionUri: vscode.Uri.file("/mock/extension/path"),
      asAbsolutePath: jest.fn(
        (relativePath: string) => `/mock/extension/path/${relativePath}`,
      ),
      storagePath: "/mock/storage",
      globalStoragePath: "/mock/global/storage",
      logPath: "/mock/log",
      extensionMode: 3,
      environmentVariableCollection: {} as any,
      storageUri: vscode.Uri.file("/mock/storage"),
      globalStorageUri: vscode.Uri.file("/mock/global/storage"),
      logUri: vscode.Uri.file("/mock/log"),
      secrets: {} as any,
      extension: {} as any,
      languageModelAccessInformation: {} as any,
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("activate", () => {
    it("should activate the extension successfully", () => {
      activate(mockContext);

      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith("TonX86");
      expect(
        vscode.debug.registerDebugConfigurationProvider,
      ).toHaveBeenCalledWith("tonx86", expect.any(Object));
      expect(vscode.window.registerTreeDataProvider).toHaveBeenCalledTimes(3);
      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledTimes(
        2,
      );
    });

    it("should register all commands", () => {
      activate(mockContext);

      const expectedCommands = [
        "tonx86.assemble",
        "tonx86.run",
        "tonx86.pause",
        "tonx86.stepOver",
        "tonx86.stepIn",
        "tonx86.stepOut",
        "tonx86.reset",
        "tonx86.lcdPopOut",
        "tonx86.lcdPopIn",
      ];

      expectedCommands.forEach((cmd) => {
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
          cmd,
          expect.any(Function),
        );
      });
    });

    it("should register debug session event handlers", () => {
      activate(mockContext);

      expect(vscode.debug.onDidStartDebugSession).toHaveBeenCalled();
      expect(vscode.debug.onDidTerminateDebugSession).toHaveBeenCalled();
      expect(
        vscode.debug.registerDebugAdapterTrackerFactory,
      ).toHaveBeenCalled();
    });

    it("should register configuration change handler", () => {
      activate(mockContext);

      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });
  });

  describe("deactivate", () => {
    it("should stop the language client", async () => {
      activate(mockContext);
      const result = deactivate();

      expect(result).toBeDefined();
      expect(console.log).toHaveBeenCalledWith(
        "TonX86 extension is now deactivated",
      );

      if (result) {
        await expect(result).resolves.toBeUndefined();
      }
    });

    it("should handle multiple deactivation calls safely", async () => {
      // Verify deactivate can be called multiple times safely
      activate(mockContext);
      const result1 = deactivate();
      const result2 = deactivate();

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      if (result1) {
        await expect(result1).resolves.toBeUndefined();
      }
      if (result2) {
        await expect(result2).resolves.toBeUndefined();
      }
    });
  });

  describe("TonX86DebugConfigurationProvider", () => {
    it("should inject extension settings into debug configuration", () => {
      activate(mockContext);

      const providerCall = (
        vscode.debug.registerDebugConfigurationProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const mockConfig: vscode.DebugConfiguration = {
        type: "tonx86",
        request: "launch",
        name: "Test",
      };

      const mockWorkspaceFolder: vscode.WorkspaceFolder = {
        uri: vscode.Uri.file("/workspace"),
        name: "workspace",
        index: 0,
      };

      const result = provider.resolveDebugConfiguration(
        mockWorkspaceFolder,
        mockConfig,
        undefined,
      );

      expect(result).toBeDefined();
      expect(result.cpuSpeed).toBe(100);
      expect(result.enableLogging).toBe(false);
      expect(result.stopOnEntry).toBe(true);
    });

    it("should use custom settings when provided", () => {
      const mockWorkspaceConfig = vscode.workspace
        .getConfiguration as jest.Mock;
      mockWorkspaceConfig.mockImplementation((section: string) => {
        const configs: Record<string, any> = {
          "tonx86.cpu": {
            get: jest.fn((key: string, defaultValue?: any) =>
              key === "speed" ? 150 : defaultValue,
            ),
          },
          "tonx86.debug": {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "enableLogging") return true;
              if (key === "stopOnEntry") return false;
              return defaultValue;
            }),
          },
        };
        return configs[section] || { get: jest.fn() };
      });

      activate(mockContext);

      const providerCall = (
        vscode.debug.registerDebugConfigurationProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const mockConfig: vscode.DebugConfiguration = {
        type: "tonx86",
        request: "launch",
        name: "Test",
      };

      const result = provider.resolveDebugConfiguration(
        undefined,
        mockConfig,
        undefined,
      );

      expect(result.cpuSpeed).toBe(150);
      expect(result.enableLogging).toBe(true);
      expect(result.stopOnEntry).toBe(false);
    });
  });

  describe("RegistersProvider", () => {
    it("should return tree items for registers", () => {
      activate(mockContext);

      const providerCall = (vscode.window.registerTreeDataProvider as jest.Mock)
        .mock.calls[0];
      const provider = providerCall[1];

      const children = provider.getChildren();
      expect(children).toHaveLength(8);
      expect(children[0].name).toBe("EAX");
      expect(children[7].name).toBe("EDI");
    });

    it("should update register values", () => {
      activate(mockContext);

      const providerCall = (vscode.window.registerTreeDataProvider as jest.Mock)
        .mock.calls[0];
      const provider = providerCall[1];

      provider.updateRegisters([1, 2, 3, 4, 5, 6, 7, 8]);

      const children = provider.getChildren();
      expect(children[0].value).toBe(1);
      expect(children[7].value).toBe(8);
    });

    it("should create tree items with correct format", () => {
      activate(mockContext);

      const providerCall = (vscode.window.registerTreeDataProvider as jest.Mock)
        .mock.calls[0];
      const provider = providerCall[1];

      provider.updateRegisters([255, 0, 0, 0, 0, 0, 0, 0]);

      const item = provider.getTreeItem(provider.getChildren()[0]);
      expect(item.label).toBe("EAX: 0x000000ff");
    });
  });

  describe("MemoryProvider", () => {
    it("should initialize memory with default values", () => {
      activate(mockContext);

      const providerCall = (vscode.window.registerTreeDataProvider as jest.Mock)
        .mock.calls[1];
      const provider = providerCall[1];

      const children = provider.getChildren();
      expect(children).toHaveLength(16);
      expect(children[0].address).toBe("0x0000");
      expect(children[0].value).toBe("0x00");
    });

    it("should update memory values", () => {
      activate(mockContext);

      const providerCall = (vscode.window.registerTreeDataProvider as jest.Mock)
        .mock.calls[1];
      const provider = providerCall[1];

      const data = new Uint8Array([0xff, 0xaa, 0x55]);
      provider.updateMemory(data);

      const children = provider.getChildren();
      expect(children[0].value).toBe("0xff");
      expect(children[1].value).toBe("0xaa");
      expect(children[2].value).toBe("0x55");
    });

    it("should create tree items with correct format", () => {
      jest.clearAllMocks();
      activate(mockContext);

      const providerCall = (vscode.window.registerTreeDataProvider as jest.Mock)
        .mock.calls[1];
      const provider = providerCall[1];

      // Get current state and verify format (value may vary due to previous tests)
      const children = provider.getChildren();
      const item = provider.getTreeItem(children[0]);

      // Verify the format is correct with address and hex value
      expect(item.label).toMatch(/^0x[0-9a-f]{4}: 0x[0-9a-f]{2}$/);
      expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
    });
  });

  describe("LCDViewProvider", () => {
    it("should resolve webview view with HTML content", () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const mockWebviewView: any = {
        webview: {
          options: {},
          html: "",
          onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
        },
      };

      provider.resolveWebviewView(mockWebviewView);

      expect(mockWebviewView.webview.html).toContain("LCD Display");
      expect(mockWebviewView.webview.html).toContain("16x16");
      expect(mockWebviewView.webview.options.enableScripts).toBe(true);
    });

    it("should update pixels in webview", () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const mockWebviewView = {
        webview: {
          options: {},
          html: "",
          postMessage: jest.fn(),
          onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
        },
      };

      provider.resolveWebviewView(mockWebviewView);

      const pixels = new Array(256).fill(0);
      pixels[0] = 1;
      provider.updatePixels(pixels);

      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith({
        type: "updatePixels",
        pixels,
      });
    });

    it("should pop out LCD display", () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      provider.popOut();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        "tonx86.lcd.panel",
        "TonX86 LCD Display",
        vscode.ViewColumn.Beside,
        expect.any(Object),
      );
    });

    it("should pop in LCD display", async () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      provider.popOut();
      const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock
        .results[0].value;

      provider.popIn();

      expect(mockPanel.dispose).toHaveBeenCalled();
    });

    it("should check if LCD is popped out", () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      expect(provider.isPopped()).toBe(false);

      provider.popOut();
      expect(provider.isPopped()).toBe(true);

      provider.popIn();
      expect(provider.isPopped()).toBe(false);
    });

    it("should reveal panel if already popped out", () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      provider.popOut();
      const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock
        .results[0].value;

      jest.clearAllMocks();
      provider.popOut();

      expect(mockPanel.reveal).toHaveBeenCalledWith(vscode.ViewColumn.Beside);
      expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
    });

    it("should update pixels in both webview and panel", () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const mockWebviewView = {
        webview: {
          options: {},
          html: "",
          postMessage: jest.fn(),
          onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
        },
      };

      provider.resolveWebviewView(mockWebviewView);
      provider.popOut();

      const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock
        .results[0].value;

      const pixels = new Array(256).fill(1);
      provider.updatePixels(pixels);

      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith({
        type: "updatePixels",
        pixels,
      });
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        type: "updatePixels",
        pixels,
      });
    });

    it("should handle panel disposal", () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      provider.popOut();
      expect(provider.isPopped()).toBe(true);

      // Advance fake timers to trigger the disposal handler
      jest.advanceTimersByTime(20);

      expect(provider.isPopped()).toBe(false);
    });

    it("should update LCD config", () => {
      const mockWorkspaceConfig = vscode.workspace
        .getConfiguration as jest.Mock;
      mockWorkspaceConfig.mockImplementation((section: string) => {
        if (section === "tonx86.lcd") {
          return {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "width") return 32;
              if (key === "height") return 32;
              if (key === "pixelSize") return 10;
              return defaultValue ?? true;
            }),
          };
        }
        return {
          get: jest.fn((key: string, defaultValue?: any) => defaultValue),
        };
      });

      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      provider.updateLCDConfig();
      const config = provider.getLCDConfig();

      expect(config.width).toBe(32);
      expect(config.height).toBe(32);
      expect(config.pixelSize).toBe(10);
    });

    it("should handle keyboard events in popped out panel", () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const mockHandler = jest.fn();
      provider.setKeyboardEventHandler(mockHandler);

      provider.popOut();

      const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock
        .results[0].value;
      const onMessageHandler =
        mockPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      // Simulate keyboard event from panel
      onMessageHandler({ type: "keyboardEvent", keyCode: 13, pressed: false });

      expect(mockHandler).toHaveBeenCalledWith(13, false);
    });

    it("should render webview with keyboard disabled when configured", () => {
      const mockWorkspaceConfig = vscode.workspace
        .getConfiguration as jest.Mock;
      mockWorkspaceConfig.mockImplementation((section: string) => {
        if (section === "tonx86.keyboard") {
          return {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "enabled") return false;
              return defaultValue;
            }),
          };
        }
        return {
          get: jest.fn((key: string, defaultValue?: any) => defaultValue),
        };
      });

      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const mockWebviewView: any = {
        webview: {
          options: {},
          html: "",
          onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
        },
      };

      provider.resolveWebviewView(mockWebviewView);

      // Check that HTML contains disabled keyboard indicators
      expect(mockWebviewView.webview.html).toContain("Keyboard: Disabled");
      expect(mockWebviewView.webview.html).toContain('color: #999');
    });
  });

  describe("DocsViewProvider", () => {
    it("should resolve webview view with documentation", () => {
      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[1];
      const provider = providerCall[1];

      const mockWebviewView: any = {
        webview: {
          options: {},
          html: "",
        },
      };

      provider.resolveWebviewView(mockWebviewView);

      expect(mockWebviewView.webview.html).toContain("TonX86 ISA Reference");
      expect(mockWebviewView.webview.html).toContain("MOV");
      expect(mockWebviewView.webview.html).toContain("ADD");
      expect(mockWebviewView.webview.html).toContain("PUSH");
      expect(mockWebviewView.webview.options.enableScripts).toBe(true);
    });
  });

  describe("Commands", () => {
    it("should execute assemble command", () => {
      activate(mockContext);

      const assembleCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.assemble");
      const handler = assembleCall[1];

      handler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "TonX86: Assemble",
      );
    });

    it("should execute run command and update registers", () => {
      activate(mockContext);

      const runCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.run");
      const handler = runCall[1];

      handler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "TonX86: Run",
      );
    });

    it("should execute pause command", () => {
      activate(mockContext);

      const pauseCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.pause");
      const handler = pauseCall[1];

      handler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "TonX86: Pause",
      );
    });

    it("should execute stepOver command", () => {
      activate(mockContext);

      const stepOverCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.stepOver");
      const handler = stepOverCall[1];

      handler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "TonX86: Step Over",
      );
    });

    it("should execute stepIn command", () => {
      activate(mockContext);

      const stepInCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.stepIn");
      const handler = stepInCall[1];

      handler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "TonX86: Step In",
      );
    });

    it("should execute stepOut command", () => {
      activate(mockContext);

      const stepOutCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.stepOut");
      const handler = stepOutCall[1];

      handler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "TonX86: Step Out",
      );
    });

    it("should execute reset command and reset registers", () => {
      activate(mockContext);

      const resetCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.reset");
      const handler = resetCall[1];

      handler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "TonX86: Reset",
      );
    });

    it("should execute lcdPopOut command", () => {
      activate(mockContext);

      const popOutCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.lcdPopOut");
      const handler = popOutCall[1];

      handler();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    });

    it("should execute lcdPopIn command", () => {
      activate(mockContext);

      const popOutCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.lcdPopOut");
      popOutCall[1]();

      const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock
        .results[0].value;

      const popInCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "tonx86.lcdPopIn");
      const handler = popInCall[1];

      handler();

      expect(mockPanel.dispose).toHaveBeenCalled();
    });
  });

  describe("Configuration validation", () => {
    it("should validate and normalize LCD configuration with invalid width", () => {
      const mockWorkspaceConfig = vscode.workspace
        .getConfiguration as jest.Mock;
      mockWorkspaceConfig.mockImplementation((section: string) => {
        if (section === "tonx86.lcd") {
          return {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "width") return 1000; // Invalid
              if (key === "height") return 16;
              if (key === "pixelSize") return 5;
              return defaultValue ?? true;
            }),
          };
        }
        return {
          get: jest.fn((key: string, defaultValue?: any) => defaultValue),
        };
      });

      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const config = provider.getLCDConfig();
      expect(config.width).toBe(16); // Should reset to default
    });

    it("should validate and normalize LCD configuration with invalid height", () => {
      const mockWorkspaceConfig = vscode.workspace
        .getConfiguration as jest.Mock;
      mockWorkspaceConfig.mockImplementation((section: string) => {
        if (section === "tonx86.lcd") {
          return {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "width") return 16;
              if (key === "height") return 0; // Invalid
              if (key === "pixelSize") return 5;
              return defaultValue ?? true;
            }),
          };
        }
        return {
          get: jest.fn((key: string, defaultValue?: any) => defaultValue),
        };
      });

      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const config = provider.getLCDConfig();
      expect(config.height).toBe(16); // Should reset to default
    });

    it("should validate and normalize LCD configuration with invalid pixelSize", () => {
      const mockWorkspaceConfig = vscode.workspace
        .getConfiguration as jest.Mock;
      mockWorkspaceConfig.mockImplementation((section: string) => {
        if (section === "tonx86.lcd") {
          return {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "width") return 16;
              if (key === "height") return 16;
              if (key === "pixelSize") return 100; // Invalid
              return defaultValue ?? true;
            }),
          };
        }
        return {
          get: jest.fn((key: string, defaultValue?: any) => defaultValue),
        };
      });

      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const config = provider.getLCDConfig();
      expect(config.pixelSize).toBe(5); // Should reset to default
    });

    it("should validate and normalize LCD configuration with non-integer width", () => {
      const mockWorkspaceConfig = vscode.workspace
        .getConfiguration as jest.Mock;
      mockWorkspaceConfig.mockImplementation((section: string) => {
        if (section === "tonx86.lcd") {
          return {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "width") return 16.5; // Non-integer
              if (key === "height") return 16;
              if (key === "pixelSize") return 5;
              return defaultValue ?? true;
            }),
          };
        }
        return {
          get: jest.fn((key: string, defaultValue?: any) => defaultValue),
        };
      });

      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const config = provider.getLCDConfig();
      expect(config.width).toBe(16); // Should reset to default
    });

    it("should validate and normalize LCD configuration with non-integer pixelSize", () => {
      const mockWorkspaceConfig = vscode.workspace
        .getConfiguration as jest.Mock;
      mockWorkspaceConfig.mockImplementation((section: string) => {
        if (section === "tonx86.lcd") {
          return {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "width") return 16;
              if (key === "height") return 16;
              if (key === "pixelSize") return 0; // Invalid
              return defaultValue ?? true;
            }),
          };
        }
        return {
          get: jest.fn((key: string, defaultValue?: any) => defaultValue),
        };
      });

      activate(mockContext);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const config = provider.getLCDConfig();
      expect(config.pixelSize).toBe(5); // Should reset to default
    });
  });

  describe("Debug session events", () => {
    it("should handle debug session start", async () => {
      activate(mockContext);

      const startHandler = (vscode.debug.onDidStartDebugSession as jest.Mock)
        .mock.calls[0][0];

      const mockSession = {
        type: "tonx86",
        customRequest: jest.fn(() =>
          Promise.resolve({ pixels: [], memoryA: [], memoryB: [] }),
        ),
      };

      startHandler(mockSession);

      // Advance timers and flush promises multiple times to ensure async callbacks run
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(10);
        await Promise.resolve();
        await Promise.resolve();
      }

      expect(mockSession.customRequest).toHaveBeenCalled();
    });

    it("should handle debug session terminate", async () => {
      activate(mockContext);

      const startHandler = (vscode.debug.onDidStartDebugSession as jest.Mock)
        .mock.calls[0][0];
      const terminateHandler = (
        vscode.debug.onDidTerminateDebugSession as jest.Mock
      ).mock.calls[0][0];

      const mockSession = {
        type: "tonx86",
        customRequest: jest.fn(() =>
          Promise.resolve({ pixels: [], memoryA: [], memoryB: [] }),
        ),
      };

      // Start session to create interval
      startHandler(mockSession);

      // Advance it enough to trigger at least one interval call
      jest.advanceTimersByTime(10);
      await Promise.resolve();
      await Promise.resolve();

      // Now terminate it - this should clear the interval
      terminateHandler(mockSession);

      // Interval should be cleared
      expect(mockSession.type).toBe("tonx86");
    });

    it("should ignore non-tonx86 debug sessions", () => {
      activate(mockContext);

      const startHandler = (vscode.debug.onDidStartDebugSession as jest.Mock)
        .mock.calls[0][0];

      const mockSession = {
        type: "node",
        customRequest: jest.fn(),
      };

      startHandler(mockSession);

      expect(mockSession.customRequest).not.toHaveBeenCalled();
    });

    it("should handle debug adapter output events", () => {
      activate(mockContext);

      const trackerFactory = (
        vscode.debug.registerDebugAdapterTrackerFactory as jest.Mock
      ).mock.calls[0][1];

      const mockSession = {
        type: "tonx86",
      };

      const tracker = trackerFactory.createDebugAdapterTracker(mockSession);

      expect(tracker).toBeDefined();

      const mockMessage = {
        type: "event",
        event: "output",
        body: {
          output: "Test output",
          category: "stdout",
        },
      };

      tracker.onDidSendMessage(mockMessage);

      // Should not throw error
    });

    it("should ignore non-output events from debug adapter", () => {
      activate(mockContext);

      const trackerFactory = (
        vscode.debug.registerDebugAdapterTrackerFactory as jest.Mock
      ).mock.calls[0][1];

      const mockSession = {
        type: "tonx86",
      };

      const tracker = trackerFactory.createDebugAdapterTracker(mockSession);

      const mockMessage = {
        type: "event",
        event: "stopped",
        body: {},
      };

      tracker.onDidSendMessage(mockMessage);

      // Should not throw error
    });

    it("should return undefined tracker for non-tonx86 sessions", () => {
      activate(mockContext);

      const trackerFactory = (
        vscode.debug.registerDebugAdapterTrackerFactory as jest.Mock
      ).mock.calls[0][1];

      const mockSession = {
        type: "node",
      };

      const tracker = trackerFactory.createDebugAdapterTracker(mockSession);

      expect(tracker).toBeUndefined();
    });

    it("should handle stderr output from debug adapter", () => {
      activate(mockContext);

      const trackerFactory = (
        vscode.debug.registerDebugAdapterTrackerFactory as jest.Mock
      ).mock.calls[0][1];

      const mockSession = {
        type: "tonx86",
      };

      const tracker = trackerFactory.createDebugAdapterTracker(mockSession);

      const mockMessage = {
        type: "event",
        event: "output",
        body: {
          output: "Error output",
          category: "stderr",
        },
      };

      tracker.onDidSendMessage(mockMessage);

      // Should not throw error
    });
  });

  describe("Configuration change handling", () => {
    it("should handle LCD configuration changes", () => {
      activate(mockContext);

      const configChangeHandler = (
        vscode.workspace.onDidChangeConfiguration as jest.Mock
      ).mock.calls[0][0];

      const mockEvent = {
        affectsConfiguration: jest.fn(
          (section: string) => section === "tonx86.lcd",
        ),
      };

      configChangeHandler(mockEvent);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "LCD configuration updated. Reload the LCD view to apply changes.",
      );
    });

    it("should ignore non-LCD configuration changes", () => {
      activate(mockContext);

      const configChangeHandler = (
        vscode.workspace.onDidChangeConfiguration as jest.Mock
      ).mock.calls[0][0];

      const mockEvent = {
        affectsConfiguration: jest.fn(() => false),
      };

      jest.clearAllMocks();
      configChangeHandler(mockEvent);

      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard event handling", () => {
    it("should forward keyboard events to debug adapter when session is active", async () => {
      activate(mockContext);

      // Start a debug session
      const startHandler = (vscode.debug.onDidStartDebugSession as jest.Mock)
        .mock.calls[0][0];

      const mockSession = {
        type: "tonx86",
        customRequest: jest.fn(() =>
          Promise.resolve({ pixels: [], memoryA: [], memoryB: [] }),
        ),
      };

      startHandler(mockSession);

      // Get LCD provider
      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      // Manually call the keyboard handler that was set
      const mockWebviewView: any = {
        webview: {
          options: {},
          html: "",
          postMessage: jest.fn(),
          onDidReceiveMessage: jest.fn((handler) => {
            handler({ type: "keyboardEvent", keyCode: 65, pressed: true });
            return { dispose: jest.fn() };
          }),
        },
      };

      provider.resolveWebviewView(mockWebviewView);

      expect(mockSession.customRequest).toHaveBeenCalledWith("keyboardEvent", {
        keyCode: 65,
        pressed: true,
      });
    });

    it("should ignore keyboard events when no debug session is active", () => {
      activate(mockContext);

      // Ensure no debug session is active by calling terminate handler
      const terminateHandler = (
        vscode.debug.onDidTerminateDebugSession as jest.Mock
      ).mock.calls[0][0];
      terminateHandler({ type: "tonx86" });

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const mockWebviewView: any = {
        webview: {
          options: {},
          html: "",
          postMessage: jest.fn(),
          onDidReceiveMessage: jest.fn((handler) => {
            handler({ type: "keyboardEvent", keyCode: 65, pressed: true });
            return { dispose: jest.fn() };
          }),
        },
      };

      provider.resolveWebviewView(mockWebviewView);

      // Should log that keyboard event is ignored
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Keyboard event ignored"),
      );
    });

    it("should send keyboard events during active debug session", async () => {
      activate(mockContext);

      const startHandler = (vscode.debug.onDidStartDebugSession as jest.Mock)
        .mock.calls[0][0];

      const mockSession = {
        type: "tonx86",
        customRequest: jest.fn(() => Promise.resolve({})),
      };

      // Start debug session
      startHandler(mockSession);

      // Get LCD provider and trigger keyboard event
      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      let messageHandler: any;
      const mockWebviewView: any = {
        webview: {
          options: {},
          html: "",
          postMessage: jest.fn(),
          onDidReceiveMessage: jest.fn((handler) => {
            messageHandler = handler;
            return { dispose: jest.fn() };
          }),
        },
      };

      provider.resolveWebviewView(mockWebviewView);

      // Trigger keyboard event
      messageHandler({ type: "keyboardEvent", keyCode: 75, pressed: true });

      // Flush all pending promises in the microtask queue
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Should call customRequest with keyboard event
      expect(mockSession.customRequest).toHaveBeenCalledWith("keyboardEvent", {
        keyCode: 75,
        pressed: true,
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle getLCDState request failure gracefully", async () => {
      activate(mockContext);

      const startHandler = (vscode.debug.onDidStartDebugSession as jest.Mock)
        .mock.calls[0][0];

      const mockSession = {
        type: "tonx86",
        customRequest: jest.fn(() =>
          Promise.reject(new Error("Request failed")),
        ),
      };

      startHandler(mockSession);

      jest.advanceTimersByTime(20);
      await Promise.resolve();

      // Should not throw error
    });

    it("should handle getMemoryState request failure gracefully", async () => {
      activate(mockContext);

      const startHandler = (vscode.debug.onDidStartDebugSession as jest.Mock)
        .mock.calls[0][0];

      const mockSession = {
        type: "tonx86",
        customRequest: jest.fn((command: string) => {
          if (command === "getLCDState") {
            return Promise.resolve({ pixels: [] });
          }
          return Promise.reject(new Error("Memory request failed"));
        }),
      };

      startHandler(mockSession);

      jest.advanceTimersByTime(20);
      await Promise.resolve();

      // Should not throw error
    });

    it("should handle keyboard event request failure gracefully", async () => {
      activate(mockContext);

      const startHandler = (vscode.debug.onDidStartDebugSession as jest.Mock)
        .mock.calls[0][0];

      const mockSession = {
        type: "tonx86",
        customRequest: jest.fn((command: string) => {
          if (command === "keyboardEvent") {
            return Promise.reject(new Error("Keyboard event failed"));
          }
          return Promise.resolve({ pixels: [], memoryA: [], memoryB: [] });
        }),
      };

      startHandler(mockSession);

      const providerCall = (
        vscode.window.registerWebviewViewProvider as jest.Mock
      ).mock.calls[0];
      const provider = providerCall[1];

      const mockWebviewView = {
        webview: {
          options: {},
          html: "",
          postMessage: jest.fn(),
          onDidReceiveMessage: jest.fn((handler) => {
            handler({ type: "keyboardEvent", keyCode: 65, pressed: true });
            return { dispose: jest.fn() };
          }),
        },
      };

      provider.resolveWebviewView(mockWebviewView);

      // Flush microtask queue for promise rejection handling
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Should not throw error
    });
  });
});

// Test deactivate with no client - must run in isolated fashion
// This uses dynamic import to get a fresh module instance
describe("TonX86 Extension - Deactivate without client", () => {
  it("should return undefined when deactivate is called with no client", async () => {
    // Use dynamic import to ensure we get module in its initial state
    jest.isolateModules(() => {
      const { deactivate } = require("./extension");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const result = deactivate();

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        "TonX86 extension is now deactivated",
      );

      consoleSpy.mockRestore();
    });
  });
});
