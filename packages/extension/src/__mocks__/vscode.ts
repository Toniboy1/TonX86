// Mock vscode module
export const EventEmitter = jest.fn().mockImplementation(() => ({
  event: jest.fn(),
  fire: jest.fn(),
}));

export const TreeItem = jest.fn().mockImplementation((label: string) => ({
  label,
  collapsibleState: 0,
}));

export const Uri = {
  file: jest.fn((path: string) => ({ fsPath: path })),
};

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
  Beside: -2,
};

const mockWorkspaceConfiguration = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    // LCD config defaults
    if (key === "enabled") return defaultValue ?? true;
    if (key === "width") return defaultValue ?? 16;
    if (key === "height") return defaultValue ?? 16;
    if (key === "pixelSize") return defaultValue ?? 5;
    return defaultValue;
  }),
};

export const workspace = {
  getConfiguration: jest.fn((_section: string) => mockWorkspaceConfiguration),
  createFileSystemWatcher: jest.fn(() => ({
    onDidChange: jest.fn(),
    onDidCreate: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn(),
  })),
  onDidChangeConfiguration: jest.fn((_handler) => ({
    dispose: jest.fn(),
  })),
};

export const window = {
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    append: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  })),
  registerTreeDataProvider: jest.fn(() => ({ dispose: jest.fn() })),
  registerWebviewViewProvider: jest.fn(() => ({ dispose: jest.fn() })),
  showInformationMessage: jest.fn(),
  createWebviewPanel: jest.fn((_viewType, _title, _showOptions, _options) => ({
    webview: {
      html: "",
      postMessage: jest.fn(),
      onDidReceiveMessage: jest.fn((_handler) => ({ dispose: jest.fn() })),
    },
    reveal: jest.fn(),
    dispose: jest.fn(),
    onDidDispose: jest.fn((handler) => {
      // Simulate disposal after a short delay for testing
      setTimeout(() => handler(), 10);
      return { dispose: jest.fn() };
    }),
  })),
};

export const commands = {
  registerCommand: jest.fn((_command, _handler) => ({ dispose: jest.fn() })),
};

export const debug = {
  onDidStartDebugSession: jest.fn((_handler) => ({ dispose: jest.fn() })),
  onDidTerminateDebugSession: jest.fn((_handler) => ({ dispose: jest.fn() })),
  registerDebugConfigurationProvider: jest.fn(() => ({ dispose: jest.fn() })),
  registerDebugAdapterTrackerFactory: jest.fn(() => ({ dispose: jest.fn() })),
};

export const CancellationToken = {};
