import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Bold, Italic, List, ListOrdered, RemoveFormatting, Strikethrough, Underline } from 'lucide-react';
import { useWorkspace } from '../store';
import { cleanNotes } from '../notes';

const COMMANDS = [
  { cmd: 'bold', label: 'Bold (Ctrl+B)', icon: <Bold size={15} /> },
  { cmd: 'italic', label: 'Italic (Ctrl+I)', icon: <Italic size={15} /> },
  { cmd: 'underline', label: 'Underline (Ctrl+U)', icon: <Underline size={15} /> },
  { cmd: 'strikeThrough', label: 'Strikethrough', icon: <Strikethrough size={15} /> },
  { cmd: 'insertUnorderedList', label: 'Dot points (type "- ")', icon: <List size={15} /> },
  { cmd: 'insertOrderedList', label: 'Numbered list (type "1. ")', icon: <ListOrdered size={15} /> },
];

export default function Notes() {
  const notes = useWorkspace((s) => s.notes);
  const setNotes = useWorkspace((s) => s.setNotes);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [empty, setEmpty] = useState(true);

  const isEmpty = (el: HTMLElement) => !el.textContent?.trim() && !el.querySelector('li');

  // Show the saved notes, unless you're typing in this editor (then it's the source).
  useEffect(() => {
    const el = ref.current!;
    if (document.activeElement !== el) el.innerHTML = cleanNotes(notes);
    setEmpty(isEmpty(el));
  }, [notes]);

  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'div');
    const onSelection = () => {
      const sel = document.getSelection();
      if (!sel?.anchorNode || !ref.current?.contains(sel.anchorNode)) return;
      setActive(Object.fromEntries(COMMANDS.map(({ cmd }) => [cmd, document.queryCommandState(cmd)])));
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, []);

  const save = () => {
    const el = ref.current!;
    setEmpty(isEmpty(el));
    setNotes(isEmpty(el) ? '' : cleanNotes(el.innerHTML));
  };

  const run = (cmd: string) => {
    ref.current!.focus();
    document.execCommand(cmd);
    save();
    setActive((a) => ({ ...a, [cmd]: document.queryCommandState(cmd) }));
  };

  // Markdown-style shortcuts: "- " or "* " starts dot points, "1. " a numbered list.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== ' ') return;
    const sel = document.getSelection();
    if (!sel?.isCollapsed || !sel.anchorNode) return;
    const start = sel.anchorNode.nodeType === Node.ELEMENT_NODE ? (sel.anchorNode as Element) : sel.anchorNode.parentElement;
    if (start?.closest('li')) return;
    const block = start?.closest('div, p') ?? ref.current!;
    const range = document.createRange();
    range.setStart(block, 0);
    range.setEnd(sel.anchorNode, sel.anchorOffset);
    const typed = range.toString();
    const list = typed === '-' || typed === '*' ? 'insertUnorderedList' : typed === '1.' ? 'insertOrderedList' : null;
    if (!list) return;
    e.preventDefault();
    for (let i = 0; i < typed.length; i++) document.execCommand('delete');
    run(list);
  };

  return (
    <div className="flex h-full min-h-[50vh] flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 focus-within:ring-2 focus-within:ring-plum/60">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-white/10 p-1">
        {COMMANDS.map(({ cmd, label, icon }, i) => (
          <ToolButton key={cmd} label={label} active={active[cmd]} onClick={() => run(cmd)} divider={i === 4}>
            {icon}
          </ToolButton>
        ))}
        <ToolButton label="Clear formatting" onClick={() => run('removeFormat')} divider>
          <RemoveFormatting size={15} />
        </ToolButton>
      </div>
      <div className="relative flex-1 overflow-y-auto">
        {empty && (
          <p className="pointer-events-none absolute inset-x-3 top-3 text-sm text-white/40">
            Park distracting thoughts here so you can deal with them later. Saved automatically.
          </p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Notes"
          onInput={save}
          onBlur={save}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            const html = e.clipboardData.getData('text/html');
            if (!html) return;
            e.preventDefault();
            document.execCommand('insertHTML', false, cleanNotes(html));
            save();
          }}
          className="min-h-full p-3 text-sm leading-relaxed text-white focus:outline-none [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
    </div>
  );
}

function ToolButton({ label, active, onClick, divider, children }: { label: string; active?: boolean; onClick: () => void; divider?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // Keep the text selection in the editor when clicking a button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded-md p-1.5 transition ${divider ? 'ml-1.5' : ''} ${active ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
    >
      {children}
    </button>
  );
}
