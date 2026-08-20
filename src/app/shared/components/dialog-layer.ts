/** Shared overlay helpers so stacked dialogs share one body lock and Escape handler. */

let lockCount = 0;
const escapeStack: Array<() => void> = [];

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const top = escapeStack[escapeStack.length - 1];
  if (!top) return;
  event.preventDefault();
  top();
}

export function registerDialogOverlay(onEscape: () => void): () => void {
  lockCount += 1;
  document.body.classList.add('dialog-open');
  escapeStack.push(onEscape);
  if (escapeStack.length === 1) {
    document.addEventListener('keydown', onDocumentKeydown);
  }

  return () => {
    const index = escapeStack.lastIndexOf(onEscape);
    if (index >= 0) escapeStack.splice(index, 1);
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.body.classList.remove('dialog-open');
    if (escapeStack.length === 0) {
      document.removeEventListener('keydown', onDocumentKeydown);
    }
  };
}
