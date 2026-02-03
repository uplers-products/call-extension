import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BtnBold,
  BtnBulletList,
  BtnClearFormatting,
  BtnItalic,
  BtnLink,
  BtnNumberedList,
  BtnStrikeThrough,
  BtnUnderline,
  type ContentEditableEvent,
  Editor,
  EditorProvider,
  Toolbar,
} from 'react-simple-wysiwyg';

export type DynamicFieldOption = {
  format: string;
  description?: string;
  placeholder?: string;
};

// --- Highlight helpers ------------------------------------------------------
export function rawToDisplay(html = ''): string {
  // Step 1: protect every <a>…</a> block
  const anchorPlaceholders: string[] = [];
  let anchorIndex = 0;

  let protectedHtml = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (match) => {
    const placeholder = `__ANCHOR_PLACEHOLDER_${anchorIndex}__`;
    anchorPlaceholders[anchorIndex] = match;
    anchorIndex += 1;
    return placeholder;
  });

  // Step 2: highlight remaining {{ ... }} tags
  protectedHtml = protectedHtml.replace(
    /(\{\{[^}]*\}\})/g,
    '<span class="dynamic-field" style="color:#007bff;font-weight:500">$1</span>'
  );

  // Step 3: restore the anchors
  anchorPlaceholders.forEach((original, idx) => {
    protectedHtml = protectedHtml.replace(`__ANCHOR_PLACEHOLDER_${idx}__`, original);
  });

  return protectedHtml;
}

function displayToRaw(html = ''): string {
  return html.replace(/<span[^>]*\bdynamic-field\b[^>]*>([\s\S]*?)<\/span>/g, '$1');
}
// ----------------------------------------------------------------------------

type Props = {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  hasError?: boolean;
  isWhatsapp?: boolean;
  scrollingContainer?: string;
  dynamicFields?: DynamicFieldOption[];
  showDynamicDropdowns?: boolean;
  templateAppliedAt?: number | Date | null;
};

export default function RichEmailEditor({
  className,
  isWhatsapp = false,
  value,
  onChange,
  placeholder,
  readOnly = false,
  hasError,
  scrollingContainer,
  dynamicFields = [],
  showDynamicDropdowns = false,
  templateAppliedAt,
}: Props) {
  // This state holds the "display" version of HTML with highlighting
  const [editorHtml, setEditorHtml] = useState<string>(rawToDisplay(value || ''));

  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Separate talent and HR fields (keeps parity with your existing templates)
  const { talentFields, hrFields } = useMemo(() => {
    const _talentFields = dynamicFields
      .filter((field) => field.format && field.format.startsWith('{{TALENT_') && field.format !== '{{ENCRYPTED_ID}}')
      .map((field) => ({ value: field.format, label: field.format, format: field.format }));

    const _hrFields = dynamicFields
      .filter((field) => field.format && field.format.startsWith('{{HR_'))
      .map((field) => ({ value: field.format, label: field.format, format: field.format }));

    return { talentFields: _talentFields, hrFields: _hrFields };
  }, [dynamicFields]);

  // Sync editorHtml when a template is programmatically applied
  useEffect(() => {
    if (templateAppliedAt) {
      setEditorHtml(rawToDisplay(value || ''));
    }
  }, [templateAppliedAt, value]);

  // Save the current selection/cursor position in the editor
  useEffect(() => {
    const saveSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      if (!editorRootRef.current) return;

      if (sel.anchorNode && editorRootRef.current.contains(sel.anchorNode)) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    };

    document.addEventListener('selectionchange', saveSelection);
    return () => document.removeEventListener('selectionchange', saveSelection);
  }, []);

  const insertTagAtCursor = (format: string) => {
    const sel = window.getSelection();
    if (savedRangeRef.current && sel && (!sel.anchorNode || !editorRootRef.current?.contains(sel.anchorNode))) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    const insertAtCursorOrEnd = (content: string) => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount && editorRootRef.current) {
        const range = selection.getRangeAt(0);
        const isWithinEditor = editorRootRef.current.contains(range.commonAncestorContainer);

        if (isWithinEditor) {
          range.deleteContents();

          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = rawToDisplay(format);

          const frag = document.createDocumentFragment();
          let node: ChildNode | null;
          let lastNode: ChildNode | null = null;
          while ((node = tempDiv.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);

          if (lastNode) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }

          return content;
        }
      }

      return `${content}${rawToDisplay(format)}`;
    };

    setEditorHtml((prev) => {
      const updated = insertAtCursorOrEnd(prev);
      onChange(displayToRaw(updated));
      return updated;
    });
  };

  // Convert caret ↔ character offset
  const getCaretOffset = (rootEl: HTMLDivElement | null): number | null => {
    if (!rootEl) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0).cloneRange();
    range.setStart(rootEl, 0);
    return range.toString().length;
  };

  const setCaretOffset = (rootEl: HTMLDivElement | null, offset: number | null) => {
    if (!rootEl) return;
    if (offset == null) return;

    const nodeIterator = document.createNodeIterator(rootEl, NodeFilter.SHOW_TEXT);
    let currentNode: Text | null;
    let chars = 0;

    while ((currentNode = nodeIterator.nextNode() as Text | null)) {
      const nextChars = chars + (currentNode.textContent?.length ?? 0);
      if (offset <= nextChars) {
        const range = document.createRange();
        range.setStart(currentNode, offset - chars);
        range.collapse(true);
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
        break;
      }
      chars = nextChars;
    }
  };

  const handleEditorChange = (e: ContentEditableEvent) => {
    const newHtml = e.target.value;
    const rawHtml = displayToRaw(newHtml);

    const inputType = (e.nativeEvent as InputEvent | undefined)?.inputType;
    const isEnterKey = inputType === 'insertParagraph';

    const caretOffset = getCaretOffset(editorRootRef.current);

    const highlighted = rawToDisplay(rawHtml);
    setEditorHtml(highlighted);
    onChange(rawHtml);

    Promise.resolve().then(() => {
      if (isEnterKey) return;
      setCaretOffset(editorRootRef.current, caretOffset);
    });
  };

  if (readOnly) {
    return (
      <div
        className={className ?? ''}
        dangerouslySetInnerHTML={{ __html: rawToDisplay(value) }}
        style={{
          border: '0.0625rem solid #cecccc',
          padding: '0.5rem',
          borderRadius: '0.25rem',
          background: '#ffffff',
        }}
      />
    );
  }

  return (
    <div
      className="rich-editor-container"
      data-scrolling-container={scrollingContainer}
      aria-invalid={hasError ? 'true' : 'false'}
      data-placeholder={placeholder}
    >
      <EditorProvider>
        <Editor
          ref={editorRootRef}
          value={editorHtml}
          onChange={handleEditorChange}
          containerProps={{ style: { resize: 'vertical' } }}
          className={className ?? ''}
        >
          <Toolbar>
            <BtnBold />
            <BtnItalic />
            {!isWhatsapp && <BtnUnderline />}
            <BtnStrikeThrough />
            {!isWhatsapp && <BtnNumberedList />}
            {!isWhatsapp && <BtnBulletList />}
            <BtnLink />
            <BtnClearFormatting />

            {showDynamicDropdowns && (
              <>
                {talentFields.length > 0 && <CustomTagButton label="{TALENT}" options={talentFields} onSelect={insertTagAtCursor} />}
                {hrFields.length > 0 && <CustomTagButton label="{HR}" options={hrFields} onSelect={insertTagAtCursor} />}
              </>
            )}
          </Toolbar>
        </Editor>
      </EditorProvider>
    </div>
  );
}

type TagOption = { value: string; label: string; format: string };
type CustomTagButtonProps = {
  label: string;
  options: TagOption[];
  onSelect: (format: string) => void;
};

function CustomTagButton({ label, options, onSelect }: CustomTagButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPosition({ top: rect.bottom + 5, left: rect.left });
  };

  const handleButtonClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) updatePosition();
    setIsOpen((v) => !v);
  };

  const handleOutsideClick = (e: MouseEvent) => {
    const btn = buttonRef.current;
    const dd = dropdownRef.current;
    const target = e.target as Node | null;
    if (!target) return;

    if (btn && btn.contains(target)) return;
    if (dd && dd.contains(target)) return;
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        style={{
          backgroundColor: isOpen ? '#edf3ff' : 'transparent',
          border: 'none',
          padding: '0.8125rem 0.625rem',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          color: '#495057',
          cursor: 'pointer',
        }}
        title={`Insert dynamic ${label.replace(/[{}]/g, '').toLowerCase()} fields`}
      >
        {label}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            backgroundColor: '#ffffff',
            border: '0.0625rem solid #cecccc',
            borderRadius: '0.25rem',
            boxShadow: '0 0.125rem 0.625rem rgba(0,0,0,0.1)',
            zIndex: 1,
            maxHeight: '18.75rem',
            overflowY: 'auto',
            minWidth: '12.5rem',
          }}
        >
          {options.map((option, index) => (
            <div
              key={`${option.format}-${index}`}
              onClick={() => {
                onSelect(option.format);
                setIsOpen(false);
              }}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                borderBottom: index < options.length - 1 ? '0.0625rem solid #eeeeee' : 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#ffffff';
              }}
            >
              {option.format}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

