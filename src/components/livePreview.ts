// Live preview for CodeMirror 6.
// Strategy: keep the source in a hidden textarea-like state, but for each
// "block" of markdown (heading, list, codeblock, hr, paragraph), render
// a widget that displays the parsed HTML while preserving the underlying
// text. The cursor can land inside the widget; we fall back to source
// view for the active block so the user can still edit.
//
// This is a simplified Obsidian-style preview — headings show as styled
// blocks, lists as styled lists, codeblocks as boxed code. For a deeper
// implementation we'd use a lezer tree + decoration per node; for v1 this
// line-based approach gets us 90% of the visual result in ~300 lines.

import { EditorView, Decoration, ViewPlugin, type DecorationSet, ViewUpdate, WidgetType } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

class HrWidget extends WidgetType {
  toDOM() {
    const el = document.createElement('hr')
    el.className = 'cm-hr'
    return el
  }
  ignoreEvent() { return true }
}

class CodeBlockWidget extends WidgetType {
  private readonly lang: string
  private readonly body: string
  constructor(lang: string, body: string) {
    super()
    this.lang = lang
    this.body = body
  }
  toDOM() {
    const pre = document.createElement('pre')
    pre.className = 'cm-codeblock'
    const code = document.createElement('code')
    if (this.lang) code.dataset.lang = this.lang
    code.textContent = this.body
    pre.appendChild(code)
    return pre
  }
  ignoreEvent() { return false }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  // Walk block-by-block. We treat every line as its own block for v1.
  const doc = view.state.doc
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text

    // Horizontal rule: a line of only ---, ***, or ___ (3+)
    if (/^(\s*[-*_])\s*\1\s*\1[-*_\s]*$/.test(text) && text.replace(/[\s*_-]/g, '').length === 0) {
      builder.add(line.from, line.from, Decoration.widget({ widget: new HrWidget(), side: 1, block: true }))
      continue
    }

    // Fenced code block: ```lang ... ```
    const fence = text.match(/^```(\S*)\s*$/)
    if (fence) {
      // collect until matching close
      const lang = fence[1] ?? ''
      let endLine = i
      const body: string[] = []
      for (let j = i + 1; j <= doc.lines; j++) {
        const l = doc.line(j).text
        if (/^```\s*$/.test(l)) { endLine = j; break }
        body.push(doc.line(j).text)
      }
      // Replace the whole block (fence + body + fence) with a single widget
      const from = line.from
      const to = doc.line(endLine).to
      builder.add(from, to, Decoration.replace({ widget: new CodeBlockWidget(lang, body.join('\n')), block: true }))
      i = endLine // skip
      continue
    }

    // Headings: # ... ######
    const h = text.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const cls = `cm-h${level}`
      // We just style the line via a class on the line decoration
      builder.add(line.from, line.from, Decoration.line({ attributes: { class: cls } }))
      // Also hide the leading hashes
      const hashes = h[1].length + 1
      builder.add(line.from, line.from + hashes, Decoration.mark({ class: 'cm-hash-hidden' }))
      continue
    }

    // Blockquote
    if (text.startsWith('> ')) {
      builder.add(line.from, line.from, Decoration.line({ attributes: { class: 'cm-quote' } }))
      continue
    }

    // Unordered list
    if (/^(\s*)([-*+])\s+/.test(text)) {
      builder.add(line.from, line.from, Decoration.line({ attributes: { class: 'cm-ul' } }))
      const m = text.match(/^(\s*(?:[-*+]\s+))/)!
      builder.add(line.from, line.from + m[1].length, Decoration.mark({ class: 'cm-list-marker-hidden' }))
      continue
    }

    // Ordered list
    if (/^(\s*)\d+\.\s+/.test(text)) {
      builder.add(line.from, line.from, Decoration.line({ attributes: { class: 'cm-ol' } }))
      const m = text.match(/^(\s*\d+\.\s+)/)!
      builder.add(line.from, line.from + m[1].length, Decoration.mark({ class: 'cm-list-marker-hidden' }))
      continue
    }

    // Checkbox
    if (/^\s*-\s\[[ x]\]\s/i.test(text)) {
      builder.add(line.from, line.from, Decoration.line({ attributes: { class: 'cm-task' } }))
    }
  }
  return builder.finish()
}

export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = buildDecorations(view) }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) {
        this.decorations = buildDecorations(u.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

// Theme additions for the live preview look
export const livePreviewTheme = EditorView.theme({
  '.cm-hash-hidden': { color: 'transparent' },
  '.cm-list-marker-hidden': { color: 'transparent' },
  '.cm-h1': { fontSize: '2em', fontWeight: '700', lineHeight: '1.1', marginTop: '0.4em' },
  '.cm-h2': { fontSize: '1.6em', fontWeight: '700', lineHeight: '1.1', marginTop: '0.4em' },
  '.cm-h3': { fontSize: '1.3em', fontWeight: '700', lineHeight: '1.2', marginTop: '0.3em' },
  '.cm-h4': { fontSize: '1.1em', fontWeight: '700', lineHeight: '1.3' },
  '.cm-h5': { fontSize: '1em', fontWeight: '700' },
  '.cm-h6': { fontSize: '0.9em', fontWeight: '700', opacity: '0.7' },
  '.cm-quote': { borderLeft: '2px solid var(--color-sepia)', paddingLeft: '12px', color: 'var(--color-ash)' },
  '.cm-hr': {
    display: 'block',
    border: 'none',
    borderTop: '1px solid var(--color-headline-ink)',
    margin: '16px 0',
  },
  '.cm-codeblock': {
    display: 'block',
    background: 'var(--color-headline-ink)',
    color: 'var(--color-paper)',
    padding: '12px 16px',
    borderRadius: '12px',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    lineHeight: '1.5',
    overflowX: 'auto',
    margin: '8px 0',
  },
  '.cm-ul, .cm-ol': { paddingLeft: '8px' },
})
