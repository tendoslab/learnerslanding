// Notes are kept as a small subset of HTML (bold, italic, underline, strikethrough
// and lists). Anything else is stripped, both when saving and before showing it,
// so a pasted web page or a tampered backup can't inject markup or scripts.

const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P']);
const DROP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'HEAD', 'TITLE', 'META', 'LINK']);

export const cleanNotes = (html: string) => {
  // DOMParser documents are inert: nothing in them runs or loads.
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE || DROP.has((child as Element).tagName)) {
        child.remove();
        continue;
      }
      const el = child as Element;
      walk(el);
      if (KEEP.has(el.tagName)) [...el.attributes].forEach((a) => el.removeAttribute(a.name));
      else el.replaceWith(...el.childNodes);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
};

/** Notes saved before formatting existed are plain text. */
export const plainToNotes = (text: string) =>
  text
    .split('\n')
    .map((line) => `<div>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '<br>'}</div>`)
    .join('');
