const vscode = require('vscode');

// Regex to find Things URLs in text
const URL_REGEX_GLOBAL = /things:\/\/[^\s\)\]]+/g;
const URL_REGEX_SINGLE = /things:\/\/[^\s\)\]]+/;

function findUrlInText(text) {
  const match = text.match(URL_REGEX_SINGLE);
  return match ? match[0] : null;
}

function findUrlAtCursor(doc, position) {
  const lineText = doc.lineAt(position.line).text;
  let match;

  while ((match = URL_REGEX_GLOBAL.exec(lineText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (position.character >= start && position.character <= end) {
      return match[0];
    }
  }

  return null;
}

function activate(context) {
  // Command: open Things URL (can be called from keybinding OR command URI)
  const openCmd = vscode.commands.registerCommand('things.openUrl', (urlFromArgs) => {
    let url = urlFromArgs;

    const editor = vscode.window.activeTextEditor;
    if (!url && editor) {
      const doc = editor.document;
      const sel = editor.selection;

      // 1) Try selected text
      const selectedText = doc.getText(sel);
      url = findUrlInText(selectedText);

      // 2) If nothing selected or no URL in selection, try cursor position
      if (!url) {
        url = findUrlAtCursor(doc, sel.active);
      }
    }

    if (!url || typeof url !== 'string') {
      vscode.window.showErrorMessage('No things:// URL found (selection, cursor, or command args).');
      return;
    }

    vscode.env.openExternal(vscode.Uri.parse(url)).then(
      ok => {
        if (!ok) {
          vscode.window.showErrorMessage('Failed to open Things URL.');
        }
      },
      err => vscode.window.showErrorMessage(`Error opening Things URL: ${err}`)
    );
  });

  context.subscriptions.push(openCmd);

  // DocumentLinkProvider: turn `things://...` into command:things.openUrl?["url"]
  const selector = { language: 'markdown', scheme: 'file' };

  const linkProvider = vscode.languages.registerDocumentLinkProvider(selector, {
    provideDocumentLinks(doc) {
      const links = [];

      for (let line = 0; line < doc.lineCount; line++) {
        const lineText = doc.lineAt(line).text;
        let match;
        while ((match = URL_REGEX_GLOBAL.exec(lineText)) !== null) {
          const url = match[0];
          const startIdx = match.index;
          const endIdx = startIdx + url.length;

          const startPos = new vscode.Position(line, startIdx);
          const endPos = new vscode.Position(line, endIdx);
          const range = new vscode.Range(startPos, endPos);

          // VS Code expects JSON.stringify([...]) in the query for command URIs
          const args = encodeURIComponent(JSON.stringify([url]));
          const target = vscode.Uri.parse(`command:things.openUrl?${args}`);

          links.push(new vscode.DocumentLink(range, target));
        }
      }

      return links;
    }
  });

  context.subscriptions.push(linkProvider);
}

function deactivate() {}

module.exports = { activate, deactivate };