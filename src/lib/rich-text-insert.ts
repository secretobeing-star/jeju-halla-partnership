export function insertHtmlAtCursor(editor: HTMLElement, html: string) {
  editor.focus();

  const selection = window.getSelection();
  if (!selection) {
    editor.insertAdjacentHTML("beforeend", html);
    return;
  }

  if (selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const fragment = template.content;

  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  if (lastNode) {
    range.setStartAfter(lastNode);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}
