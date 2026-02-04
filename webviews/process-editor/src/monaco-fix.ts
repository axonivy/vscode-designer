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
 * we first trigger a copy event (same way as paste), then delete the selection.
 */
export const setupCutShortcutHandler = () => {
  if (window.location.protocol !== 'vscode-webview:') {
    // Cut handling is only needed in VS Code webview, where Monaco doesn't properly write to clipboard on cut.
    // In a regular browser environment, the native cut event works fine, so we can skip this workaround.
    return;
  }
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

      // Create a synthetic copy event (same pattern as paste event)
      const clipboardData = new DataTransfer();
      const copyEvent = new ClipboardEvent('copy', {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardData
      });

      // Dispatch the copy event - Monaco will populate clipboardData with the selection
      target.dispatchEvent(copyEvent);

      // Get the copied text from the event's clipboardData and write to system clipboard
      const copiedText = clipboardData.getData('text/plain');
      if (copiedText) {
        try {
          await navigator.clipboard.writeText(copiedText);
        } catch (error) {
          console.error('Failed to write to clipboard:', error);
        }
      }

      // Now delete the selection by dispatching a cut event
      // (Monaco will handle the deletion part)
      const cutEvent = new ClipboardEvent('cut', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });
      target.dispatchEvent(cutEvent);
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
