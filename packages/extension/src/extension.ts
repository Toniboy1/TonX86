import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('TonX86 extension is now active');

	const runCommand = vscode.commands.registerCommand('tonx86.run', () => {
		vscode.window.showInformationMessage('TonX86: Run');
	});

	const pauseCommand = vscode.commands.registerCommand('tonx86.pause', () => {
		vscode.window.showInformationMessage('TonX86: Pause');
	});

	context.subscriptions.push(runCommand, pauseCommand);
}

export function deactivate() {
	console.log('TonX86 extension is now deactive');
}
