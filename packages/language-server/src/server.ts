import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	InitializeResult,
	ServerCapabilities,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection();
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params) => {
	const capabilities: ServerCapabilities = {
		textDocumentSync: 1, // Full
		completionProvider: {
			resolveProvider: false
		},
		hoverProvider: true,
		definitionProvider: true
	};

	const result: InitializeResult = { capabilities };
	return result;
});

connection.onDidChangeTextDocument((change) => {
	const textDocument = change.document;
	const diagnostics: Diagnostic[] = [];

	// Placeholder for semantic analysis
	const lines = textDocument.getText().split(/\r?\n/);
	lines.forEach((line, index) => {
		if (line.length > 80) {
			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				range: {
					start: { line: index, character: 80 },
					end: { line: index, character: line.length }
				},
				message: 'Line is too long'
			});
		}
	});

	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
});

documents.listen(connection);
connection.listen();
