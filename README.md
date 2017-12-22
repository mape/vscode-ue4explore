# VSCode - UE4 Explore
"UE4 Explore" is a Visual Studio Code extension that makes it easier to find where classes, methods and properties are defined throughout the UE4 api.

It does this by searching though generated UE4 TypeScript declaration files, in the tsconfig.json assigned type roots.

Press `Ctrl+Shift+I` to search.

[![License](https://img.shields.io/github/license/mape/vscode-ue4explore.svg)](https://github.com/mape/vscode-ue4explore/blob/master/LICENSE) [![License](https://vsmarketplacebadge.apphb.com/version/mape.vscode-ue4explore.svg)](https://marketplace.visualstudio.com/items?itemName=mape.vscode-ue4explore)

## Requirements
You need to have [ripgrep](https://github.com/BurntSushi/ripgrep) in your system path.

## Keybindings

The following commands are bound by default when the extension is installed.

| Command                      | Keybinding         |
| ---------------------------- | ------------------ |
| ue4explore.exploreDeclarations | `Ctrl+Shift+I`    |
