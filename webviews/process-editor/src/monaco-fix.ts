import { MonacoUtil } from '@axonivy/process-editor-inscription-view';

/**
 * Sets up a paste shortcut handler for Monaco editors.
 */
export const setupPasteShortcutHandler = () => {
  // Intercept keyboard paste shortcut before Monaco handles it
  document.addEventListener(
    'keydown',
    async (event: KeyboardEvent) => {
      // Check for Cmd+V (Mac) or Ctrl+V (Windows/Linux)
      const isPasteShortcut = (event.metaKey || event.ctrlKey) && event.key === 'v';
      if (!isPasteShortcut) {
        return;
      }

      // Check if we're in a Monaco editor
      const target = event.target as HTMLElement;
      if (!isMonacoEditor(target)) {
        return;
      }

      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          // Create a synthetic paste event with the clipboard text
          const clipboardData = new DataTransfer();
          clipboardData.setData('text/plain', text);

          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: clipboardData
          });

          event.preventDefault();
          event.stopPropagation();

          target.dispatchEvent(pasteEvent);
        }
      } catch (error) {
        console.error('Clipboard paste failed, falling back to native paste:', error);
      }
    },
    true
  );
};

/**
 * Sets up a cut shortcut handler for Monaco editors.
 * Since copy works but cut doesn't properly write to clipboard,
 * capture and write the copy first, then cut only if the editor is unchanged.
 */
export const setupCutShortcutHandler = async () => {
  if (window.location.protocol !== 'vscode-webview:') {
    // Cut handling is only needed in VS Code webview, where Monaco doesn't properly write to clipboard on cut.
    // In a regular browser environment, the native cut event works fine, so we can skip this workaround.
    return;
  }
  const monaco = await MonacoUtil.monaco();
  document.addEventListener(
    'keydown',
    async (event: KeyboardEvent) => {
      // Check for Cmd+X (Mac) or Ctrl+X (Windows/Linux)
      const isCutShortcut = (event.metaKey || event.ctrlKey) && event.key === 'x';
      if (!isCutShortcut) {
        return;
      }

      // Check if we're in a Monaco editor
      const target = event.target as HTMLElement;
      if (!isMonacoEditor(target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const editor = monaco.editor.getEditors().find(editor => editor.getDomNode()?.contains(target));
      const model = editor?.getModel();
      if (!editor || !model || !editor.hasTextFocus()) {
        console.error('Clipboard cut failed: no focused Monaco editor with a model was found.');
        return;
      }

      const version = model.getVersionId();
      let changed = false;
      const cancelCut = () => {
        changed = true;
      };
      const listeners = [
        editor.onDidChangeCursorSelection(cancelCut),
        editor.onDidChangeModelContent(cancelCut),
        editor.onDidChangeModel(cancelCut),
        editor.onDidBlurEditorText(cancelCut),
        editor.onDidDispose(cancelCut)
      ];
      try {
        const clipboardData = new DataTransfer();
        const copyEvent = new ClipboardEvent('copy', {
          bubbles: true,
          cancelable: true,
          clipboardData
        });
        target.dispatchEvent(copyEvent);

        const copiedText = clipboardData.getData('text/plain');
        if (!copiedText) {
          console.error('Clipboard cut failed: no text was captured; the selection was not deleted.');
          return;
        }
        await navigator.clipboard.writeText(copiedText);

        if (changed || !target.isConnected || !editor.hasTextFocus() || editor.getModel() !== model || model.getVersionId() !== version) {
          console.warn('Clipboard cut cancelled: the editor changed; captured text remains on the clipboard.');
          return;
        }

        // A synthetic cut event schedules deletion later, reopening the selection race.
        // Monaco's cut handler deletes synchronously and preserves line cuts, multi-cursor cuts and undo.
        editor.trigger('keyboard', 'cut', undefined);
      } catch (error) {
        console.error('Clipboard cut failed:', error);
      } finally {
        listeners.forEach(listener => listener.dispose());
      }
    },
    true
  );
};

/**
 * Sets up a save shortcut handler for Monaco editors.
 * Monaco captures Cmd+S/Ctrl+S, so we need to intercept it and forward to VS Code.
 */
export const setupSaveShortcutHandler = (sendSaveNotification: () => void) => {
  document.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key === 's';
      if (!isSaveShortcut) {
        return;
      }

      // Check if we're in a Monaco editor
      const target = event.target as HTMLElement;
      if (!isMonacoEditor(target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      sendSaveNotification();
    },
    true
  );
};

const isMonacoEditor = (element: HTMLElement) =>
  element.closest('.monaco-editor') !== null ||
  element.classList.contains('inputarea') ||
  element.classList.contains('monaco-mouse-cursor-text');
