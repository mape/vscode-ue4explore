import * as vs from 'vscode';

import { Explorer } from './explorer';

let explorer: Explorer;

function lazyInitializeDocumenter() {
	if (!explorer) {
		explorer = new Explorer();
	}
}

function languageIsSupported(document: vs.TextDocument) {
	return (
		document.languageId === 'typescript' ||
		document.languageId === 'typescriptreact'
	);
}

function verifyLanguageSupport(
	document: vs.TextDocument,
	commandName: string
) {
	if (!languageIsSupported(document)) {
		vs.window.showWarningMessage(`"${commandName}" only supports TypeScript files.`);
		return false;
	}

	return true;
}

function runCommand(
	commandName: string,
	document: vs.TextDocument,
	implFunc: () => void
) {
	if (!verifyLanguageSupport(document, commandName)) {
		return;
	}

	try {
		lazyInitializeDocumenter();
		implFunc();
	} catch (e) {
		console.error(e);
	}
}

export function activate(context: vs.ExtensionContext): void {
	context.subscriptions.push(
		vs.commands.registerCommand('ue4explore.exploreDeclarations', () => {
			const activeTextEditor = vs.window.activeTextEditor;
			if (!activeTextEditor) {
				return;
			}

			const document = activeTextEditor.document;
			const commandName = 'Explore';
			runCommand(
				commandName,
				document,
				() => {
					explorer.explore(activeTextEditor);
				}
			);
		})
	);
}
