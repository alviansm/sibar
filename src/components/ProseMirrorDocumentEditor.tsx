'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer, Node as PMNode, MarkType, NodeType } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes, wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, setBlockType } from 'prosemirror-commands';
import { MathRenderer } from '@/components/MathRenderer';
import { DriveAttachmentUploader } from '@/components/DriveAttachmentUploader';
import {
  FileText,
  Undo2,
  Redo2,
  Printer,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Outdent,
  Indent,
  RemoveFormatting,
  Pi,
  Sigma,
  LineChart,
  GitGraph,
  Maximize2,
  Minimize2,
  Eye,
  Edit3,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Save,
  CheckCircle2,
  Cloud,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  X,
  ExternalLink,
  Info,
  Highlighter,
  Plus,
  Bookmark,
} from 'lucide-react';

// ==========================================
// 1. ProseMirror Custom Schema Definition
// ==========================================

const customParagraphSpec = {
  ...basicSchema.spec.nodes.get('paragraph'),
  attrs: { align: { default: 'left' } },
  parseDOM: [
    {
      tag: 'p',
      getAttrs: (dom: HTMLElement) => ({
        align: dom.style.textAlign || 'left',
      }),
    },
  ],
  toDOM: (node: PMNode) => {
    const align = node.attrs.align;
    return ['p', align && align !== 'left' ? { style: `text-align: ${align};` } : {}, 0];
  },
};

const customHeadingSpec = {
  ...basicSchema.spec.nodes.get('heading'),
  attrs: { level: { default: 1 }, align: { default: 'left' } },
  parseDOM: [
    { tag: 'h1', getAttrs: (dom: HTMLElement) => ({ level: 1, align: dom.style.textAlign || 'left' }) },
    { tag: 'h2', getAttrs: (dom: HTMLElement) => ({ level: 2, align: dom.style.textAlign || 'left' }) },
    { tag: 'h3', getAttrs: (dom: HTMLElement) => ({ level: 3, align: dom.style.textAlign || 'left' }) },
  ],
  toDOM: (node: PMNode) => {
    const { level, align } = node.attrs;
    return [
      `h${level}`,
      align && align !== 'left' ? { style: `text-align: ${align};` } : {},
      0,
    ];
  },
};

let nodesMap = basicSchema.spec.nodes
  .update('paragraph', customParagraphSpec)
  .update('heading', customHeadingSpec);

const nodesWithLists = addListNodes(nodesMap, 'paragraph block*', 'block');

const customMarks = basicSchema.spec.marks
  .addToEnd('underline', {
    parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
    toDOM() {
      return ['u', 0];
    },
  })
  .addToEnd('strikethrough', {
    parseDOM: [{ tag: 's' }, { tag: 'del' }, { tag: 'strike' }, { style: 'text-decoration=line-through' }],
    toDOM() {
      return ['s', 0];
    },
  })
  .addToEnd('textColor', {
    attrs: { color: { default: '#202124' } },
    parseDOM: [
      {
        style: 'color',
        getAttrs: (value: any) => ({ color: value }),
      },
    ],
    toDOM(mark: any) {
      return ['span', { style: `color: ${mark.attrs.color};` }, 0];
    },
  })
  .addToEnd('highlightColor', {
    attrs: { color: { default: '#fef08a' } },
    parseDOM: [
      {
        style: 'background-color',
        getAttrs: (value: any) => ({ color: value }),
      },
    ],
    toDOM(mark: any) {
      return ['span', { style: `background-color: ${mark.attrs.color};` }, 0];
    },
  });

export const docsSchema = new Schema({
  nodes: nodesWithLists,
  marks: customMarks,
});

// Helper to convert plain text or Markdown to HTML
function textOrMarkdownToHtml(text: string): string {
  if (!text) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;
      if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
      if (trimmed.startsWith('> ')) return `<blockquote>${trimmed.slice(2)}</blockquote>`;
      const withBr = trimmed.replace(/\n/g, '<br>');
      return `<p>${withBr}</p>`;
    })
    .join('');
}

// Convert HTML to ProseMirror Doc
function parseHtmlToDoc(html: string, schema: Schema): PMNode {
  if (typeof document === 'undefined') {
    return schema.node('doc', null, [schema.node('paragraph')]);
  }
  const fullHtml = textOrMarkdownToHtml(html);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = fullHtml;
  return DOMParser.fromSchema(schema).parse(tempDiv);
}

// Convert ProseMirror Doc to HTML string
function serializeDocToHtml(doc: PMNode, schema: Schema): string {
  if (typeof document === 'undefined') return '';
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(fragment);
  return tempDiv.innerHTML;
}

// Mark active check
function isMarkActive(state: EditorState, type: MarkType): boolean {
  const { from, $from, to, empty } = state.selection;
  if (empty) {
    return !!type.isInSet(state.storedMarks || $from.marks());
  }
  return state.doc.rangeHasMark(from, to, type);
}

// Block node active check
function isBlockActive(state: EditorState, type: NodeType, attrs: Record<string, any> = {}): boolean {
  const { $from, to, node } = state.selection as any;
  if (node) {
    return node.hasMarkup(type, attrs);
  }
  return to <= $from.end() && $from.parent.hasMarkup(type, attrs);
}

export interface ProseMirrorDocumentEditorRef {
  getHtml: () => string;
  insertSnippet: (snippet: string) => void;
  focus: () => void;
}

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

interface ProseMirrorDocumentEditorProps {
  initialContent: string;
  onChange?: (html: string) => void;
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  onSave?: () => void;
  onSaveAndReturn?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  lastSavedTime?: Date | null;
  returnUrl?: string;
  outlineId?: string;
  projectSlug?: string;
  entityType?: 'concept' | 'problem';
  entityId?: string;
  metaControls?: React.ReactNode;
}

export const ProseMirrorDocumentEditor = forwardRef<
  ProseMirrorDocumentEditorRef,
  ProseMirrorDocumentEditorProps
>(
  (
    {
      initialContent,
      onChange,
      title = 'Untitled Document',
      onTitleChange,
      onSave,
      onSaveAndReturn,
      isSaving = false,
      hasUnsavedChanges = false,
      lastSavedTime,
      returnUrl,
      outlineId,
      projectSlug,
      entityType = 'concept',
      entityId,
      metaControls,
    },
    ref
  ) => {
    const editorHostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // Document state
    const [currentHtml, setCurrentHtml] = useState<string>(initialContent || '');
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [isFullWidth, setIsFullWidth] = useState<boolean>(false);
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [fontFamily, setFontFamily] = useState<string>('Arial, sans-serif');
    const [fontSize, setFontSize] = useState<number>(11);

    // Active toolbar states
    const [activeMarks, setActiveMarks] = useState({
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      code: false,
    });
    const [activeBlock, setActiveBlock] = useState<string>('paragraph');
    const [activeAlign, setActiveAlign] = useState<string>('left');
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Dropdown and modal states
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showOutlineSidebar, setShowOutlineSidebar] = useState<boolean>(true);
    const [outlineHeadings, setOutlineHeadings] = useState<HeadingItem[]>([]);
    const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState<boolean>(false);
    const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
    const [linkHref, setLinkHref] = useState<string>('');
    const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
    const [showWordCountModal, setShowWordCountModal] = useState<boolean>(false);

    // Update active toolbar markers from ProseMirror state
    const syncToolbarState = useCallback((state: EditorState) => {
      setActiveMarks({
        bold: isMarkActive(state, docsSchema.marks.strong),
        italic: isMarkActive(state, docsSchema.marks.em),
        underline: isMarkActive(state, docsSchema.marks.underline),
        strike: isMarkActive(state, docsSchema.marks.strikethrough),
        code: isMarkActive(state, docsSchema.marks.code),
      });

      // Detect current block type
      if (isBlockActive(state, docsSchema.nodes.heading, { level: 1 })) {
        setActiveBlock('h1');
      } else if (isBlockActive(state, docsSchema.nodes.heading, { level: 2 })) {
        setActiveBlock('h2');
      } else if (isBlockActive(state, docsSchema.nodes.heading, { level: 3 })) {
        setActiveBlock('h3');
      } else {
        setActiveBlock('paragraph');
      }

      // Detect alignment
      const { $from } = state.selection;
      const parent = $from.parent;
      setActiveAlign(parent.attrs?.align || 'left');

      // Undo/Redo availability
      setCanUndo(undo(state));
      setCanRedo(redo(state));

      // Extract headings for the document outline sidebar
      const headings: HeadingItem[] = [];
      state.doc.descendants((node, pos) => {
        if (node.type === docsSchema.nodes.heading) {
          const text = node.textContent.trim();
          if (text) {
            headings.push({
              id: `heading-${pos}`,
              level: node.attrs.level || 1,
              text,
              pos,
            });
          }
        }
      });
      setOutlineHeadings(headings);
    }, []);

    // Initialize ProseMirror view
    useEffect(() => {
      if (!editorHostRef.current) return;
      editorHostRef.current.innerHTML = '';

      const initialDoc = parseHtmlToDoc(initialContent, docsSchema);

      const customKeybindings = {
        'Mod-z': undo,
        'Mod-y': redo,
        'Mod-Shift-z': redo,
        'Mod-b': toggleMark(docsSchema.marks.strong),
        'Mod-i': toggleMark(docsSchema.marks.em),
        'Mod-u': toggleMark(docsSchema.marks.underline),
        Enter: splitListItem(docsSchema.nodes.list_item),
        Tab: sinkListItem(docsSchema.nodes.list_item),
        'Shift-Tab': liftListItem(docsSchema.nodes.list_item),
        'Mod-s': () => {
          if (onSave) onSave();
          return true;
        },
      };

      const state = EditorState.create({
        doc: initialDoc,
        schema: docsSchema,
        plugins: [
          history(),
          keymap(customKeybindings),
          keymap(baseKeymap),
        ],
      });

      const view = new EditorView(editorHostRef.current, {
        state,
        dispatchTransaction(tr: Transaction) {
          const newState = view.state.apply(tr);
          view.updateState(newState);

          if (tr.docChanged) {
            const html = serializeDocToHtml(newState.doc, docsSchema);
            setCurrentHtml(html);
            if (onChange) onChange(html);
          }

          syncToolbarState(newState);
        },
      });

      viewRef.current = view;
      syncToolbarState(state);

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, []);

    // Handle snippet insertion at cursor
    const handleInsertSnippet = useCallback(
      (snippet: string) => {
        const view = viewRef.current;
        if (!view) {
          setCurrentHtml((prev) => prev + snippet);
          if (onChange) onChange(currentHtml + snippet);
          return;
        }

        const { state, dispatch } = view;
        const { from, to } = state.selection;
        const tr = state.tr.insertText(snippet, from, to);
        dispatch(tr);
        view.focus();
      },
      [currentHtml, onChange]
    );

    useImperativeHandle(ref, () => ({
      getHtml: () => {
        if (viewRef.current) {
          return serializeDocToHtml(viewRef.current.state.doc, docsSchema);
        }
        return currentHtml;
      },
      insertSnippet: handleInsertSnippet,
      focus: () => {
        if (viewRef.current) {
          viewRef.current.focus();
        }
      },
    }));

    // Command Helpers
    const runCommand = (cmd: (state: EditorState, dispatch: (tr: Transaction) => void) => boolean) => {
      if (!viewRef.current) return;
      cmd(viewRef.current.state, viewRef.current.dispatch);
      viewRef.current.focus();
    };

    const handleSetBlock = (typeStr: string) => {
      if (!viewRef.current) return;
      if (typeStr === 'paragraph') {
        runCommand(setBlockType(docsSchema.nodes.paragraph));
      } else if (typeStr === 'h1') {
        runCommand(setBlockType(docsSchema.nodes.heading, { level: 1 }));
      } else if (typeStr === 'h2') {
        runCommand(setBlockType(docsSchema.nodes.heading, { level: 2 }));
      } else if (typeStr === 'h3') {
        runCommand(setBlockType(docsSchema.nodes.heading, { level: 3 }));
      }
    };

    const handleSetAlign = (align: string) => {
      if (!viewRef.current) return;
      const { state, dispatch } = viewRef.current;
      const { from, to } = state.selection;
      const tr = state.tr;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type === docsSchema.nodes.paragraph || node.type === docsSchema.nodes.heading) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, align });
        }
      });
      if (tr.docChanged) dispatch(tr);
      viewRef.current.focus();
    };

    const handleApplyColor = (color: string) => {
      if (!viewRef.current) return;
      runCommand(toggleMark(docsSchema.marks.textColor, { color }));
      setShowColorPicker(false);
    };

    const handleApplyHighlight = (color: string) => {
      if (!viewRef.current) return;
      runCommand(toggleMark(docsSchema.marks.highlightColor, { color }));
      setShowHighlightPicker(false);
    };

    const handleApplyLink = () => {
      if (!viewRef.current) return;
      if (linkHref.trim()) {
        runCommand(toggleMark(docsSchema.marks.link, { href: linkHref.trim() }));
      } else {
        runCommand(toggleMark(docsSchema.marks.link));
      }
      setLinkHref('');
      setShowLinkModal(false);
    };

    const handleClearFormatting = () => {
      if (!viewRef.current) return;
      const { state, dispatch } = viewRef.current;
      const { from, to } = state.selection;
      const tr = state.tr;
      Object.values(docsSchema.marks).forEach((markType) => {
        tr.removeMark(from, to, markType);
      });
      dispatch(tr);
      viewRef.current.focus();
    };

    const handleOutlineJump = (pos: number) => {
      if (!viewRef.current) return;
      const dom = viewRef.current.nodeDOM(pos) as HTMLElement;
      if (dom && typeof dom.scrollIntoView === 'function') {
        dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const handlePrint = () => {
      window.print();
    };

    const handleDownloadHtml = () => {
      const blob = new Blob([currentHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    };

    // Word and character count computation
    const wordCount = currentHtml.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    const charCount = currentHtml.replace(/<[^>]*>/g, '').length;

    return (
      <div className="min-h-screen bg-[#F0F4F9] text-[#202124] flex flex-col select-none font-sans">
        {/* ============================================================== */}
        {/* 1. Google Docs Top Application Shell Header                    */}
        {/* ============================================================== */}
        <header className="bg-white border-b border-[#E0E3E7] sticky top-0 z-40 px-3 sm:px-6 py-2 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Blue Docs Icon, Document Title, Star, Cloud Status, Menubar */}
            <div className="flex items-start gap-3 min-w-0">
              {/* Google Docs Blue Document Icon */}
              <div
                className="w-10 h-10 rounded-xl bg-[#1A73E8] flex items-center justify-center text-white shadow-sm flex-shrink-0 mt-0.5"
                title="Sibar Google Docs / Word Document"
              >
                <FileText className="w-6 h-6" />
              </div>

              <div className="min-w-0 flex flex-col">
                {/* Title and Cloud Save Indicators */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange && onTitleChange(e.target.value)}
                    placeholder="Untitled Document"
                    className="text-lg font-semibold text-[#202124] bg-transparent hover:bg-[#F1F3F4] focus:bg-white border border-transparent hover:border-[#DADCE0] focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] rounded px-1.5 py-0.5 transition-all outline-none max-w-[320px] sm:max-w-md truncate"
                    title="Rename Document"
                  />

                  {/* Star icon */}
                  <button
                    type="button"
                    className="p-1 rounded-full text-slate-400 hover:text-amber-500 hover:bg-[#F1F3F4] transition-colors"
                    title="Star this document"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>

                  {/* Cloud Save Status Indicator */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-1">
                    {isSaving ? (
                      <span className="flex items-center gap-1 text-[#1A73E8] font-medium">
                        <Cloud className="w-4 h-4 animate-pulse" />
                        <span className="hidden sm:inline">Saving to cloud...</span>
                      </span>
                    ) : hasUnsavedChanges ? (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <AlertCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Unsaved changes</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="hidden sm:inline">All changes saved to cloud</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Google Docs Menubar (File, Edit, View, Insert, Format, Tools, Help) */}
                <div className="flex items-center gap-0.5 text-xs text-slate-700 font-medium mt-0.5 relative">
                  {/* File Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                      className={`px-2 py-0.5 rounded hover:bg-[#F1F3F4] transition-colors ${
                        activeMenu === 'file' ? 'bg-[#E8F0FE] text-[#1A73E8]' : ''
                      }`}
                    >
                      File
                    </button>
                    {activeMenu === 'file' && (
                      <div
                        className="absolute left-0 top-full mt-1 bg-white border border-[#DADCE0] shadow-xl rounded-lg py-1.5 w-56 z-50 text-xs text-slate-700 font-normal"
                        onMouseLeave={() => setActiveMenu(null)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (onSave) onSave();
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Save className="w-3.5 h-3.5 text-slate-500" /> Save
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
                        </button>
                        {onSaveAndReturn && (
                          <button
                            type="button"
                            onClick={() => {
                              onSaveAndReturn();
                              setActiveMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2 font-semibold text-[#1A73E8]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Save &amp; Return
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            handleDownloadHtml();
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Download as HTML
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handlePrint();
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Ctrl+P</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edit Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                      className={`px-2 py-0.5 rounded hover:bg-[#F1F3F4] transition-colors ${
                        activeMenu === 'edit' ? 'bg-[#E8F0FE] text-[#1A73E8]' : ''
                      }`}
                    >
                      Edit
                    </button>
                    {activeMenu === 'edit' && (
                      <div
                        className="absolute left-0 top-full mt-1 bg-white border border-[#DADCE0] shadow-xl rounded-lg py-1.5 w-52 z-50 text-xs text-slate-700 font-normal"
                        onMouseLeave={() => setActiveMenu(null)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            runCommand(undo);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Undo2 className="w-3.5 h-3.5 text-slate-500" /> Undo
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Ctrl+Z</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            runCommand(redo);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Redo2 className="w-3.5 h-3.5 text-slate-500" /> Redo
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Ctrl+Y</span>
                        </button>
                        <div className="h-px bg-slate-200 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            handleClearFormatting();
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2"
                        >
                          <RemoveFormatting className="w-3.5 h-3.5 text-slate-500" /> Clear formatting
                        </button>
                      </div>
                    )}
                  </div>

                  {/* View Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
                      className={`px-2 py-0.5 rounded hover:bg-[#F1F3F4] transition-colors ${
                        activeMenu === 'view' ? 'bg-[#E8F0FE] text-[#1A73E8]' : ''
                      }`}
                    >
                      View
                    </button>
                    {activeMenu === 'view' && (
                      <div
                        className="absolute left-0 top-full mt-1 bg-white border border-[#DADCE0] shadow-xl rounded-lg py-1.5 w-60 z-50 text-xs text-slate-700 font-normal"
                        onMouseLeave={() => setActiveMenu(null)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowOutlineSidebar(!showOutlineSidebar);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span>Show Document Outline</span>
                          <span className="text-slate-400">{showOutlineSidebar ? '✓' : ''}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsFullWidth(!isFullWidth);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span>Full Width Canvas</span>
                          <span className="text-slate-400">{isFullWidth ? '✓' : ''}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode(viewMode === 'edit' ? 'preview' : 'edit');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span>Live Math Preview</span>
                          <span className="text-slate-400">{viewMode === 'preview' ? '✓' : ''}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Insert Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === 'insert' ? null : 'insert')}
                      className={`px-2 py-0.5 rounded hover:bg-[#F1F3F4] transition-colors ${
                        activeMenu === 'insert' ? 'bg-[#E8F0FE] text-[#1A73E8]' : ''
                      }`}
                    >
                      Insert
                    </button>
                    {activeMenu === 'insert' && (
                      <div
                        className="absolute left-0 top-full mt-1 bg-white border border-[#DADCE0] shadow-xl rounded-lg py-1.5 w-64 z-50 text-xs text-slate-700 font-normal"
                        onMouseLeave={() => setActiveMenu(null)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            handleInsertSnippet(' $f(x) = x^2$ ');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2"
                        >
                          <Pi className="w-3.5 h-3.5 text-indigo-600" /> Inline LaTeX Formula ($...$)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleInsertSnippet('\n$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$\n');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2"
                        >
                          <Sigma className="w-3.5 h-3.5 text-indigo-600" /> Centered Block Equation ($$...$$)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleInsertSnippet('\n```plot\nfn: sin(x)\nrange: [-6.28, 6.28]\n```\n');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2"
                        >
                          <LineChart className="w-3.5 h-3.5 text-sky-600" /> 2D Function Plot
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleInsertSnippet('\n```mermaid\ngraph LR\n  A[Theorem] --> B[Proof]\n  B --> C[Application]\n```\n');
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2"
                        >
                          <GitGraph className="w-3.5 h-3.5 text-purple-600" /> Flowchart / Diagram
                        </button>
                        <div className="h-px bg-slate-200 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setShowLinkModal(true);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2"
                        >
                          <Link2 className="w-3.5 h-3.5 text-slate-500" /> Link
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Format Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === 'format' ? null : 'format')}
                      className={`px-2 py-0.5 rounded hover:bg-[#F1F3F4] transition-colors ${
                        activeMenu === 'format' ? 'bg-[#E8F0FE] text-[#1A73E8]' : ''
                      }`}
                    >
                      Format
                    </button>
                    {activeMenu === 'format' && (
                      <div
                        className="absolute left-0 top-full mt-1 bg-white border border-[#DADCE0] shadow-xl rounded-lg py-1.5 w-56 z-50 text-xs text-slate-700 font-normal"
                        onMouseLeave={() => setActiveMenu(null)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            runCommand(toggleMark(docsSchema.marks.strong));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2 font-bold">
                            <Bold className="w-3.5 h-3.5" /> Bold
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Ctrl+B</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            runCommand(toggleMark(docsSchema.marks.em));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2 italic">
                            <Italic className="w-3.5 h-3.5" /> Italic
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Ctrl+I</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            runCommand(toggleMark(docsSchema.marks.underline));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2 underline">
                            <Underline className="w-3.5 h-3.5" /> Underline
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Ctrl+U</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            runCommand(toggleMark(docsSchema.marks.strikethrough));
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2 line-through"
                        >
                          <Strikethrough className="w-3.5 h-3.5" /> Strikethrough
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tools Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === 'tools' ? null : 'tools')}
                      className={`px-2 py-0.5 rounded hover:bg-[#F1F3F4] transition-colors ${
                        activeMenu === 'tools' ? 'bg-[#E8F0FE] text-[#1A73E8]' : ''
                      }`}
                    >
                      Tools
                    </button>
                    {activeMenu === 'tools' && (
                      <div
                        className="absolute left-0 top-full mt-1 bg-white border border-[#DADCE0] shadow-xl rounded-lg py-1.5 w-52 z-50 text-xs text-slate-700 font-normal"
                        onMouseLeave={() => setActiveMenu(null)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowWordCountModal(true);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2"
                        >
                          <Info className="w-3.5 h-3.5 text-slate-500" /> Word count
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Help Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
                      className={`px-2 py-0.5 rounded hover:bg-[#F1F3F4] transition-colors ${
                        activeMenu === 'help' ? 'bg-[#E8F0FE] text-[#1A73E8]' : ''
                      }`}
                    >
                      Help
                    </button>
                    {activeMenu === 'help' && (
                      <div
                        className="absolute left-0 top-full mt-1 bg-white border border-[#DADCE0] shadow-xl rounded-lg py-1.5 w-56 z-50 text-xs text-slate-700 font-normal"
                        onMouseLeave={() => setActiveMenu(null)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowShortcutsModal(true);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F1F3F4] flex items-center gap-2"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-slate-500" /> Keyboard shortcuts
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Save & Return (Google Docs Share Pill style), Save, Exit */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Save Button */}
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Save (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Save</span>
              </button>

              {/* Primary Google Docs Pill Button: Save & Return */}
              {onSaveAndReturn && (
                <button
                  type="button"
                  onClick={onSaveAndReturn}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  title="Save and Return to Subchapter"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save &amp; Return</span>
                </button>
              )}

              {/* Exit Button */}
              {returnUrl && (
                <a
                  href={returnUrl}
                  className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="Exit to Subchapter"
                >
                  <ArrowLeft className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </header>

        {/* ============================================================== */}
        {/* Optional Problem Metadata Controls (Tabs, Difficulty, Keys)    */}
        {/* ============================================================== */}
        {metaControls && (
          <div className="bg-white border-b border-[#E0E3E7] px-4 sm:px-8 py-2 z-30 shadow-sm">
            <div className="max-w-7xl mx-auto">{metaControls}</div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. Google Docs Ribbon Action Toolbar                           */}
        {/* ============================================================== */}
        <div className="bg-[#EDF2FA] border-b border-[#D3E3FD] px-2 sm:px-6 py-1.5 sticky top-[57px] z-30 flex items-center justify-between flex-wrap gap-1.5 text-xs text-slate-700">
          <div className="flex items-center flex-wrap gap-1">
            {/* Undo & Redo */}
            <button
              type="button"
              onClick={() => runCommand(undo)}
              disabled={!canUndo}
              className="p-1.5 rounded hover:bg-[#DFE3E7] disabled:opacity-40 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand(redo)}
              disabled={!canRedo}
              className="p-1.5 rounded hover:bg-[#DFE3E7] disabled:opacity-40 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded hover:bg-[#DFE3E7] transition-colors hidden sm:block"
              title="Print (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-[#C4C7C5] mx-1 hidden sm:block" />

            {/* Zoom Selector */}
            <select
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="px-2 py-1 bg-transparent hover:bg-[#DFE3E7] rounded text-xs font-medium cursor-pointer outline-none hidden md:block"
              title="Zoom Level"
            >
              <option value={75}>75%</option>
              <option value={90}>90%</option>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
            </select>

            <div className="w-px h-5 bg-[#C4C7C5] mx-1 hidden md:block" />

            {/* Text Style Dropdown (Normal text, Title, Heading 1, 2, 3) */}
            <select
              value={activeBlock}
              onChange={(e) => handleSetBlock(e.target.value)}
              className="px-2 py-1 bg-white border border-[#C4C7C5] hover:border-slate-400 rounded text-xs font-semibold cursor-pointer outline-none text-[#202124]"
              title="Text Styles"
            >
              <option value="paragraph">Normal text</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>

            {/* Font Family Selector */}
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="px-2 py-1 bg-transparent hover:bg-[#DFE3E7] rounded text-xs cursor-pointer outline-none max-w-[110px] truncate hidden sm:block"
              title="Font Family"
            >
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Georgia', serif">Georgia</option>
              <option value="'Courier New', monospace">Courier New</option>
            </select>

            <div className="w-px h-5 bg-[#C4C7C5] mx-1 hidden sm:block" />

            {/* Font Size Controls */}
            <div className="flex items-center gap-1 hidden sm:flex">
              <button
                type="button"
                onClick={() => setFontSize(Math.max(8, fontSize - 1))}
                className="px-1.5 py-0.5 rounded hover:bg-[#DFE3E7] font-mono text-xs font-bold"
                title="Decrease font size"
              >
                -
              </button>
              <span className="w-6 text-center font-mono text-xs font-semibold">{fontSize}</span>
              <button
                type="button"
                onClick={() => setFontSize(Math.min(36, fontSize + 1))}
                className="px-1.5 py-0.5 rounded hover:bg-[#DFE3E7] font-mono text-xs font-bold"
                title="Increase font size"
              >
                +
              </button>
            </div>

            <div className="w-px h-5 bg-[#C4C7C5] mx-1" />

            {/* Bold, Italic, Underline, Strikethrough */}
            <button
              type="button"
              onClick={() => runCommand(toggleMark(docsSchema.marks.strong))}
              className={`p-1.5 rounded transition-colors ${
                activeMarks.bold ? 'bg-[#D3E3FD] text-[#0B57D0]' : 'hover:bg-[#DFE3E7]'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand(toggleMark(docsSchema.marks.em))}
              className={`p-1.5 rounded transition-colors ${
                activeMarks.italic ? 'bg-[#D3E3FD] text-[#0B57D0]' : 'hover:bg-[#DFE3E7]'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand(toggleMark(docsSchema.marks.underline))}
              className={`p-1.5 rounded transition-colors ${
                activeMarks.underline ? 'bg-[#D3E3FD] text-[#0B57D0]' : 'hover:bg-[#DFE3E7]'
              }`}
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand(toggleMark(docsSchema.marks.strikethrough))}
              className={`p-1.5 rounded transition-colors ${
                activeMarks.strike ? 'bg-[#D3E3FD] text-[#0B57D0]' : 'hover:bg-[#DFE3E7]'
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            {/* Text Color Picker Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1.5 rounded hover:bg-[#DFE3E7] flex items-center gap-0.5"
                title="Text Color"
              >
                <span className="font-bold border-b-2 border-red-500 leading-none">A</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>
              {showColorPicker && (
                <div
                  className="absolute left-0 top-full mt-1 bg-white border border-[#DADCE0] shadow-xl rounded-lg p-2.5 z-50 grid grid-cols-5 gap-1.5 w-40"
                  onMouseLeave={() => setShowColorPicker(false)}
                >
                  {[
                    '#202124',
                    '#5F6368',
                    '#1A73E8',
                    '#D93025',
                    '#188038',
                    '#F2994A',
                    '#9333EA',
                    '#0D9488',
                    '#E11D48',
                    '#0284C7',
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleApplyColor(c)}
                      className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Highlight Color Picker Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                className="p-1.5 rounded hover:bg-[#DFE3E7] flex items-center gap-0.5"
                title="Highlight Color"
              >
                <Highlighter className="w-4 h-4 text-amber-600" />
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>
              {showHighlightPicker && (
                <div
                  className="absolute left-0 top-full mt-1 bg-white border border-[#DADCE0] shadow-xl rounded-lg p-2.5 z-50 grid grid-cols-5 gap-1.5 w-40"
                  onMouseLeave={() => setShowHighlightPicker(false)}
                >
                  {['#fef08a', '#bbf7d0', '#fed7aa', '#fbcfe8', '#bae6fd'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleApplyHighlight(c)}
                      className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-[#C4C7C5] mx-1" />

            {/* Insert Link */}
            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="p-1.5 rounded hover:bg-[#DFE3E7] transition-colors"
              title="Insert Link"
            >
              <Link2 className="w-4 h-4" />
            </button>

            {/* Text Alignment */}
            <button
              type="button"
              onClick={() => handleSetAlign('left')}
              className={`p-1.5 rounded transition-colors ${
                activeAlign === 'left' ? 'bg-[#D3E3FD] text-[#0B57D0]' : 'hover:bg-[#DFE3E7]'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign('center')}
              className={`p-1.5 rounded transition-colors ${
                activeAlign === 'center' ? 'bg-[#D3E3FD] text-[#0B57D0]' : 'hover:bg-[#DFE3E7]'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign('right')}
              className={`p-1.5 rounded transition-colors ${
                activeAlign === 'right' ? 'bg-[#D3E3FD] text-[#0B57D0]' : 'hover:bg-[#DFE3E7]'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSetAlign('justify')}
              className={`p-1.5 rounded transition-colors hidden sm:block ${
                activeAlign === 'justify' ? 'bg-[#D3E3FD] text-[#0B57D0]' : 'hover:bg-[#DFE3E7]'
              }`}
              title="Justify"
            >
              <AlignJustify className="w-4 h-4" />
            </button>

            {/* Lists */}
            <button
              type="button"
              onClick={() => runCommand(wrapInList(docsSchema.nodes.bullet_list))}
              className="p-1.5 rounded hover:bg-[#DFE3E7] transition-colors"
              title="Bulleted List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand(wrapInList(docsSchema.nodes.ordered_list))}
              className="p-1.5 rounded hover:bg-[#DFE3E7] transition-colors"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {/* Indent Controls */}
            <button
              type="button"
              onClick={() => runCommand(liftListItem(docsSchema.nodes.list_item))}
              className="p-1.5 rounded hover:bg-[#DFE3E7] transition-colors hidden sm:block"
              title="Decrease Indent"
            >
              <Outdent className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand(sinkListItem(docsSchema.nodes.list_item))}
              className="p-1.5 rounded hover:bg-[#DFE3E7] transition-colors hidden sm:block"
              title="Increase Indent"
            >
              <Indent className="w-4 h-4" />
            </button>

            {/* Clear Formatting */}
            <button
              type="button"
              onClick={handleClearFormatting}
              className="p-1.5 rounded hover:bg-[#DFE3E7] transition-colors"
              title="Clear Formatting"
            >
              <RemoveFormatting className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-[#C4C7C5] mx-1 hidden md:block" />

            {/* STEM Insertion Chips */}
            <div className="flex items-center gap-1 bg-white border border-[#D3E3FD] rounded-full px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => handleInsertSnippet(' $f(x) = x^2$ ')}
                className="px-2 py-0.5 rounded-full hover:bg-indigo-50 text-indigo-700 font-mono font-bold text-xs flex items-center gap-1 transition-colors"
                title="Insert Inline LaTeX Formula ($...$)"
              >
                <Pi className="w-3.5 h-3.5 text-indigo-600" />
                <span>$Math$</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertSnippet('\n$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$\n')}
                className="px-2 py-0.5 rounded-full hover:bg-indigo-50 text-indigo-700 font-mono font-bold text-xs flex items-center gap-1 transition-colors"
                title="Insert Block LaTeX Equation ($$...$$)"
              >
                <Sigma className="w-3.5 h-3.5 text-indigo-600" />
                <span>$$Block$$</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertSnippet('\n```plot\nfn: sin(x)\nrange: [-6.28, 6.28]\n```\n')}
                className="px-2 py-0.5 rounded-full hover:bg-sky-50 text-sky-700 font-semibold text-xs flex items-center gap-1 transition-colors hidden lg:flex"
                title="Insert 2D Plot"
              >
                <LineChart className="w-3.5 h-3.5 text-sky-600" />
                <span>Plot</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertSnippet('\n```mermaid\ngraph LR\n  A[Theorem] --> B[Proof]\n  B --> C[Application]\n```\n')}
                className="px-2 py-0.5 rounded-full hover:bg-purple-50 text-purple-700 font-semibold text-xs flex items-center gap-1 transition-colors hidden lg:flex"
                title="Insert Diagram"
              >
                <GitGraph className="w-3.5 h-3.5 text-purple-600" />
                <span>Diagram</span>
              </button>

              {outlineId && projectSlug && (
                <div className="hidden xl:block">
                  <DriveAttachmentUploader
                    entityType={entityType}
                    entityId={entityId || outlineId}
                    projectSlug={projectSlug}
                    buttonLabel="Drive"
                    onUploadSuccess={(att) => {
                      if (att.mime_type.startsWith('image/')) {
                        handleInsertSnippet(`\n<img src="${att.web_view_link}" alt="${att.file_name}" />\n`);
                      } else {
                        handleInsertSnippet(`\n<a href="${att.web_view_link}" target="_blank">📄 ${att.file_name}</a>\n`);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right end of ribbon: View Mode Switcher (Editing vs Preview) & Full Width Toggle */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* View Mode Toggle: Docs Style Mode Selector */}
            <div className="flex items-center bg-white border border-[#C4C7C5] rounded-full p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-medium transition-all ${
                  viewMode === 'edit'
                    ? 'bg-[#C2E7FF] text-[#001D35] font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Document Editing Mode"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editing</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewRef.current) {
                    setCurrentHtml(serializeDocToHtml(viewRef.current.state.doc, docsSchema));
                  }
                  setViewMode('preview');
                }}
                className={`px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-medium transition-all ${
                  viewMode === 'preview'
                    ? 'bg-[#C2E7FF] text-[#001D35] font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Live Math &amp; Diagram Preview"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            {/* Expand Full Width Sheet */}
            <button
              type="button"
              onClick={() => setIsFullWidth(!isFullWidth)}
              className="p-1.5 rounded-full hover:bg-[#DFE3E7] text-slate-600 transition-colors hidden sm:block"
              title={isFullWidth ? 'Standard 8.5" Paper Width' : 'Expand Full Width'}
            >
              {isFullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. Main Workspace Area: Sidebar, Ruler, & Paper Sheet           */}
        {/* ============================================================== */}
        <div className="flex-1 flex overflow-x-auto relative">
          {/* Collapsible Left Document Outline Sidebar ("Tab dokumen") */}
          {showOutlineSidebar ? (
            <aside className="w-64 bg-white border-r border-[#E0E3E7] flex flex-col flex-shrink-0 select-none shadow-sm z-20">
              <div className="p-3 border-b border-[#E0E3E7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tab dokumen
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOutlineSidebar(false)}
                  className="p-1 rounded hover:bg-[#F1F3F4] text-slate-500 hover:text-slate-800"
                  title="Collapse outline"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Document Headings List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <div className="px-2 py-1.5 rounded-lg bg-[#E8F0FE] text-[#1A73E8] font-semibold text-xs flex items-center justify-between mb-3">
                  <span>Tab 1</span>
                  <span className="text-[10px] bg-white text-[#1A73E8] px-1.5 py-0.5 rounded font-mono">
                    {outlineHeadings.length}
                  </span>
                </div>

                {outlineHeadings.length > 0 ? (
                  outlineHeadings.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => handleOutlineJump(h.pos)}
                      className={`w-full text-left rounded px-2 py-1.5 text-xs text-slate-700 hover:bg-[#F1F3F4] hover:text-[#1A73E8] transition-colors truncate block ${
                        h.level === 1 ? 'font-bold' : h.level === 2 ? 'font-medium pl-4' : 'pl-6 opacity-80'
                      }`}
                      title={h.text}
                    >
                      {h.text}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic px-2 py-4 text-center">
                    Headings added to the document will show up here.
                  </p>
                )}
              </div>
            </aside>
          ) : (
            /* Collapsed Sidebar Expand Button */
            <button
              type="button"
              onClick={() => setShowOutlineSidebar(true)}
              className="absolute left-0 top-4 z-20 p-2 bg-white border border-[#E0E3E7] rounded-r-xl shadow-md text-slate-600 hover:text-[#1A73E8] hover:bg-[#F1F3F4] transition-all"
              title="Show Document Outline"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Center Desk Workspace with Ruler & Paper */}
          <div className="flex-1 flex flex-col items-center py-6 px-4 overflow-y-auto">
            {/* The Google Docs Horizontal Ruler Bar */}
            <div
              className={`w-full transition-all duration-200 ${
                isFullWidth ? 'max-w-5xl' : 'max-w-[816px]'
              } mb-3`}
            >
              <div className="h-5 bg-[#EDF2FA] border border-[#C4C7C5] rounded-t flex items-end justify-between px-6 text-[9px] font-mono text-slate-500 select-none relative overflow-hidden">
                {/* Left Margin Indicator */}
                <div
                  className="absolute left-[36px] top-0 text-[#1A73E8] font-bold text-[10px]"
                  title="Left Margin"
                >
                  ▼
                </div>
                {/* Ruler Markings 1 to 20 */}
                {Array.from({ length: 21 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full">
                    {i > 0 && <span>{i}</span>}
                    <div className={`w-px bg-[#A0A4A8] ${i % 2 === 0 ? 'h-2' : 'h-1'}`} />
                  </div>
                ))}
                {/* Right Margin Indicator */}
                <div
                  className="absolute right-[36px] top-0 text-[#1A73E8] font-bold text-[10px]"
                  title="Right Margin"
                >
                  ▼
                </div>
              </div>
            </div>

            {/* The Authentic White Paper Sheet */}
            <div
              className={`w-full transition-all duration-200 ${
                isFullWidth ? 'max-w-5xl' : 'max-w-[816px]'
              } bg-white border border-[#DADCE0] rounded shadow-[0_1px_3px_1px_rgba(60,64,67,0.15),0_4px_8px_3px_rgba(60,64,67,0.1)] min-h-[1056px] p-8 sm:p-16 sm:px-24 relative flex flex-col`}
              style={{
                fontFamily: fontFamily,
                fontSize: `${fontSize}pt`,
                transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                transformOrigin: 'top center',
              }}
            >
              {viewMode === 'edit' ? (
                /* ProseMirror Host Container */
                <div className="prosemirror-paper-wrapper flex-1">
                  <div ref={editorHostRef} className="prosemirror-canvas" />
                </div>
              ) : (
                /* Live Math & Diagram Render View */
                <div className="preview-paper-wrapper flex-1 space-y-4">
                  <div className="pb-3 border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Rendered Document View (KaTeX &amp; Interactive Graphics)</span>
                    <button
                      type="button"
                      onClick={() => setViewMode('edit')}
                      className="text-xs font-semibold text-[#1A73E8] hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Back to Editing</span>
                    </button>
                  </div>
                  <div className="py-2">
                    {currentHtml.trim() ? (
                      <MathRenderer content={currentHtml} />
                    ) : (
                      <p className="text-slate-400 italic text-sm py-12 text-center">
                        Document is currently empty.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Modals: Insert Link, Word Count, Shortcuts                    */}
        {/* ============================================================== */}

        {/* Insert Link Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#1A73E8]" />
                  <span>Insert Link</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Destination URL
                </label>
                <input
                  type="url"
                  value={linkHref}
                  onChange={(e) => setLinkHref(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyLink}
                  className="px-4 py-2 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold"
                >
                  Apply Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Word Count Modal */}
        {showWordCountModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-base text-slate-800">Word Count</h4>
                <button
                  type="button"
                  onClick={() => setShowWordCountModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Words</span>
                  <span className="font-bold">{wordCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Characters</span>
                  <span className="font-bold">{charCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Headings</span>
                  <span className="font-bold">{outlineHeadings.length}</span>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowWordCountModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-[#1A73E8] text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Modal */}
        {showShortcutsModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-base text-slate-800">Keyboard Shortcuts</h4>
                <button
                  type="button"
                  onClick={() => setShowShortcutsModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex justify-between py-1">
                  <span>Save</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Ctrl + S</kbd>
                </div>
                <div className="flex justify-between py-1">
                  <span>Undo</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Ctrl + Z</kbd>
                </div>
                <div className="flex justify-between py-1">
                  <span>Redo</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Ctrl + Y</kbd>
                </div>
                <div className="flex justify-between py-1">
                  <span>Bold</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Ctrl + B</kbd>
                </div>
                <div className="flex justify-between py-1">
                  <span>Italic</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Ctrl + I</kbd>
                </div>
                <div className="flex justify-between py-1">
                  <span>Underline</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Ctrl + U</kbd>
                </div>
                <div className="flex justify-between py-1">
                  <span>Print Document</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Ctrl + P</kbd>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowShortcutsModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-[#1A73E8] text-white text-xs font-semibold"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scoped CSS styling for ProseMirror Paper Canvas */}
        <style jsx global>{`
          .prosemirror-canvas {
            outline: none;
            min-height: 900px;
            cursor: text;
          }

          .ProseMirror {
            outline: none;
            color: #202124;
            line-height: 1.7;
          }

          .ProseMirror p {
            margin-bottom: 0.85rem;
          }

          .ProseMirror h1 {
            font-size: 2.15rem;
            font-weight: 700;
            color: #1a1a1a;
            letter-spacing: -0.02em;
            margin-top: 1.75rem;
            margin-bottom: 0.75rem;
            line-height: 1.25;
          }

          .ProseMirror h2 {
            font-size: 1.6rem;
            font-weight: 700;
            color: #1a1a1a;
            letter-spacing: -0.015em;
            margin-top: 1.5rem;
            margin-bottom: 0.6rem;
            line-height: 1.3;
          }

          .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #2b2b2b;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
            line-height: 1.35;
          }

          .ProseMirror blockquote {
            border-left: 4px solid #1A73E8;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #4a5568;
            font-style: italic;
          }

          .ProseMirror ul {
            list-style-type: disc;
            padding-left: 2rem;
            margin: 0.75rem 0;
          }

          .ProseMirror ol {
            list-style-type: decimal;
            padding-left: 2rem;
            margin: 0.75rem 0;
          }

          .ProseMirror li {
            margin-bottom: 0.25rem;
          }

          .ProseMirror pre {
            background-color: #f1f3f4;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            margin: 1rem 0;
          }

          .ProseMirror code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background-color: #f1f3f4;
            color: #1A73E8;
            padding: 0.15rem 0.35rem;
            border-radius: 0.25rem;
            font-size: 0.85em;
          }

          .ProseMirror a {
            color: #1A73E8;
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          .ProseMirror hr {
            border: none;
            border-top: 1px solid #DADCE0;
            margin: 1.5rem 0;
          }

          .ProseMirror img {
            max-width: 100%;
            border-radius: 0.5rem;
            margin: 1rem auto;
            display: block;
          }

          /* Google Docs Authentic Selection Color */
          .ProseMirror ::selection {
            background-color: #C2E7FF;
          }
        `}</style>
      </div>
    );
  }
);

ProseMirrorDocumentEditor.displayName = 'ProseMirrorDocumentEditor';
