import * as path from 'path';
import * as ts from 'typescript';
import * as vs from 'vscode';
import { exec } from 'child_process';

interface DefintionPick extends vs.QuickPickItem {
	reference: string;
	libFile: string;
}
interface RipGrepResult {
	name: string;
	info: string;
}
interface ExecOutput {
	stdout: string;
	stderr: string;
}

export class Explorer implements vs.Disposable {
	public async explore(editor: vs.TextEditor) {
		const searchForText = await vs.window.showInputBox();
		if (!searchForText) {
			return;
		}

		const typescriptConfig = this.getTypescriptConfig(editor);
		if (!typescriptConfig) {
			vs.window.showErrorMessage('Could not find TypeScript config file');
			return;
		}

		const typeRoots = typescriptConfig.options.typeRoots || [];
		const ripgrepPromises = typeRoots.map(filePath => {
			const cmd = `rg -i --vimgrep ${searchForText} ${filePath}`;
			return this.execp(cmd);
		});

		const searchResults = await Promise.all(ripgrepPromises);

		const entries = this.parseStdout(searchResults);
		const information = this.extractInformation(entries, searchForText);
		this.showQuickPicker(information, editor);
	}

	private getTypescriptConfig(
		editor: vs.TextEditor
	): ts.ParsedCommandLine | null {
		const fileDir = (
			path.dirname(editor.document.fileName).replace(/\\/g, '/')
		);
		const configPath = ts.findConfigFile(
			fileDir,
			ts.sys.fileExists
		);

		const configJson = ts.readConfigFile(
			configPath,
			ts.sys.readFile
		);

		if (configJson.error) {
			vs.window.showErrorMessage(
				configJson.error.messageText.toString()
			);

			return null;
		}

		const cwd = configPath.replace(/tsconfig.json/i, '');
		const config = ts.parseJsonConfigFileContent(
			configJson.config,
			{
				readDirectory: ts.sys.readDirectory,
				fileExists: ts.sys.fileExists,
				readFile: ts.sys.readFile,
				useCaseSensitiveFileNames: false
			},
			cwd
		);

		if (config.errors.length) {
			config.errors.map(err => err.messageText).forEach(error => {
				vs.window.showErrorMessage(error.toString());
			});
			return null;
		}

		return config;
	}

	private execp(cmd: string): Promise<ExecOutput> {
		return new Promise((resolve, _reject) => {
			exec(cmd, (_err, stdout, stderr) => {
				// Don't care about error since empty ripgrep throws error
				resolve({
					stdout,
					stderr
				});
			});
		});
	}

	private parseStdout(searchResults: ExecOutput[]) {
		const files: RipGrepResult[] = [];
		searchResults.forEach(output => {
			output.stdout
				.split('\n')
				.filter(Boolean)
				.forEach(msg => {
					const parts = msg.split(':');
					const file = path.resolve(parts.slice(0, 2).join(''));
					let name = path.basename(file.match(/index.d.ts/) ?
						file.replace('\\index.d.ts', '')
						:
						file);
					const info = parts.slice(4).join(' ').trim();
					// Assume we only want static methods for now
					if (!info.match(/static/)) {
						return;
					}
					files.push({
						name,
						info
					});
				});
		});

		return files;
	}

	private sortByLabel(a: DefintionPick, b: DefintionPick) {
		if (a.label < b.label) {
			return -1;
		}
		if (a.label > b.label) {
			return 1;
		}
		return 0;
	}

	private extractInformation(
		entries: RipGrepResult[],
		searchForText: string
	) {
		const duplicates = new Map<string, boolean>();
		const items = entries
			.map(info => {
				const match = info.info.match(/static (.*?)\(/);
				if (!match) {
					return null;
				}

				const label = match[1];
				const description = info.info.replace(/static (.*?)\(/, '(');
				const inputRegex = new RegExp(searchForText, 'i');
				if (duplicates.get(label) || !label.match(inputRegex)) {
					return null;
				}

				duplicates.set(label, true);
				const item: DefintionPick = {
					label: label,
					description: `<${info.name}> ${description}`,
					detail: '',
					libFile: info.name,
					reference: `/// <reference types="${info.name}" />`
				};

				return item;
			})
			.filter((item: DefintionPick | null): item is DefintionPick => (
				item !== null
			))
			.sort(this.sortByLabel);

		return items;
	}

	private showQuickPicker(items: DefintionPick[], editor: vs.TextEditor) {
		vs.window.showQuickPick(items).then((result) => {
			if (!result) {
				return;
			}

			const documentText = editor.document.getText();

			const notPresentInDocument = (
				documentText.indexOf(result.reference) === -1
			);

			if (notPresentInDocument) {
				editor.insertSnippet(
					new vs.SnippetString(result.reference + '\n'),
					new vs.Position(0, 0)
				);
			}

			const configuration = vs.workspace.getConfiguration('ue4explore');
			const shouldInsertVariable = configuration.get('insertVariable');
			if (shouldInsertVariable) {
				editor.insertSnippet(
					new vs.SnippetString(
						`const ${result.label} = ${result.libFile}.${result.label}`
					),
					editor.selection
				);
				vs.commands.executeCommand('editor.action.triggerSuggest');
			}
		});
	}

	public dispose() {
	}
}
