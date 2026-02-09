import * as vscode from 'vscode';

export function activate(): void {
	console.log('TonX86 extension is now active');

	vscode.commands.registerCommand('tonx86.run', () => {
		vscode.window.showInformationMessage('TonX86: Run');
	});

	vscode.commands.registerCommand('tonx86.pause', () => {
		vscode.window.showInformationMessage('TonX86: Pause');
	});
}

export function deactivate(): void {
	console.log('TonX86 extension is now deactive');
}
