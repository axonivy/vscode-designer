import { GLSPActionDispatcher } from '@eclipse-glsp/client';

const SelectAllProcessElementsAction = { kind: 'allSelected', select: true };

export const setupSelectAllShortcutHandler = (actionDispatcher: GLSPActionDispatcher) => {
  document.addEventListener(
    'keydown',
    event => {
      if (!(event.ctrlKey || event.metaKey) || event.code !== 'KeyA' || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void actionDispatcher.dispatch(SelectAllProcessElementsAction);
    },
    true
  );
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    target.closest('.monaco-editor') !== null
  );
};
