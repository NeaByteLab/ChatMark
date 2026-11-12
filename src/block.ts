import type * as Types from '@app/types.ts'
import Inline from '@app/inline.ts'

/**
 * Block-level parser for ChatMark syntax.
 * @description Parses paragraphs, code fences, blockquotes, and lists.
 */
export default class Block {
  /**
   * Match fenced code block line.
   * @description Checks if line starts a backtick code fence.
   * @param input - Single line of text
   * @returns Regex match array or null
   */
  static fence(input: string): RegExpExecArray | null {
    const match = /^([ \t]*)(`{3,})[ \t]*(.*)$/.exec(input)
    return match === null || (match[3] ?? '').includes('`') ? null : match
  }

  /**
   * Match list item marker line.
   * @description Extracts bullet or ordered list marker and content.
   * @param input - Single line of text
   * @returns Parsed list item metadata or null
   */
  static list(input: string): Types.ChatmarkList | null {
    const bullet = /^[ \t]*-(?:[ \t]+(.*)|$)/.exec(input)
    if (bullet !== null) {
      return { ordered: false, start: 1, content: bullet[1] ?? '' }
    }
    const ordered = /^[ \t]*(\d{1,9})\.(?:[ \t]+(.*)|$)/.exec(input)
    return ordered !== null
      ? { ordered: true, start: Number.parseInt(ordered[1] ?? '1', 10), content: ordered[2] ?? '' }
      : null
  }

  /**
   * Parse source into block nodes.
   * @description Splits lines and builds block AST with recursion limit.
   * @param source - Raw markdown input string
   * @param depth - Current recursion depth
   * @returns Array of parsed block nodes
   */
  static parse(source: string, depth = 0): Types.ChatmarkBlock[] {
    if (depth > 64) {
      return []
    }
    const lines = source.replace(/\0/g, '\uFFFD').replace(/\r\n?/g, '\n').replace(/\n$/, '').split(
      '\n'
    )
    const blocks: Types.ChatmarkBlock[] = []
    let cursor = 0
    const measure = (input: string): number => {
      let columns = 0
      for (const character of input) {
        if (character === ' ') {
          columns++
        } else if (character === '\t') {
          columns += 2
        } else {
          break
        }
      }
      return columns
    }
    while (cursor < lines.length) {
      const current = lines[cursor] ?? ''
      if (current.trim().length === 0) {
        cursor++
        continue
      }
      const fence = Block.fence(current)
      if (fence !== null) {
        const content: string[] = []
        cursor++
        while (cursor < lines.length) {
          const entry = lines[cursor] ?? ''
          cursor++
          const closer = /^([ \t]*)(`{3,})[ \t]*$/.exec(entry)
          if (closer !== null && (closer[2] ?? '').length >= (fence[2] ?? '```').length) {
            break
          }
          let spaces = 0
          while (
            spaces < entry.length && spaces < (fence[1] ?? '').length &&
            (entry[spaces] === ' ' || entry[spaces] === '\t')
          ) {
            spaces++
          }
          content.push(entry.slice(spaces))
        }
        blocks.push({
          type: 'codeblock',
          lang: (fence[3] ?? '').split(/[ \t]/, 1)[0] ?? '',
          code: content.length > 0 ? `${content.join('\n')}\n` : ''
        })
        continue
      }
      if (/^[ \t]*>(?:[ \t].*|$)/.test(current)) {
        const quoted: string[] = []
        while (cursor < lines.length && /^[ \t]*>(?:[ \t].*|$)/.test(lines[cursor] ?? '')) {
          quoted.push((lines[cursor] ?? '').replace(/^[ \t]*>[ \t]?/, ''))
          cursor++
        }
        blocks.push({ type: 'blockquote', children: Block.parse(quoted.join('\n'), depth + 1) })
        continue
      }
      const first = Block.list(current)
      if (first !== null) {
        const items: Types.ChatmarkItem[] = []
        const level = measure(current)
        while (cursor < lines.length) {
          const currentLine = lines[cursor] ?? ''
          if (measure(currentLine) !== level) {
            break
          }
          const matched = Block.list(currentLine)
          if (matched === null || matched.ordered !== first.ordered) {
            break
          }
          const buffer = [matched.content]
          cursor++
          let minimum = Infinity
          const pending: Array<{ entry: string; columns: number; marker: boolean }> = []
          while (cursor < lines.length) {
            const entry = lines[cursor] ?? ''
            if (
              entry.trim().length === 0 || Block.fence(entry) !== null ||
              /^[ \t]*>(?:[ \t].*|$)/.test(entry)
            ) {
              break
            }
            const columns = measure(entry)
            if (columns < level + 2) {
              break
            }
            const marker = Block.list(entry) !== null
            if (marker && columns < minimum) {
              minimum = columns
            }
            pending.push({ entry, columns, marker })
            cursor++
          }
          for (const currentItem of pending) {
            const limit = currentItem.columns >= minimum ? minimum : level + 2
            let columns = 0
            let index = 0
            while (index < currentItem.entry.length && columns < limit) {
              columns += currentItem.entry[index] === '\t' ? 2 : 1
              index++
            }
            buffer.push(
              currentItem.marker || currentItem.columns >= minimum
                ? currentItem.entry.slice(index)
                : currentItem.entry.slice(index).replace(/^[ \t]+/, '')
            )
          }
          items.push({
            children: Block.parse(buffer.join('\n'), depth + 1).filter(
              (entry) => entry.type === 'paragraph' || entry.type === 'list'
            )
          })
        }
        blocks.push({ type: 'list', ordered: first.ordered, start: first.start, items })
        continue
      }
      const paragraph: string[] = []
      while (cursor < lines.length) {
        const entry = lines[cursor] ?? ''
        if (
          entry.trim().length === 0 || Block.fence(entry) !== null ||
          /^[ \t]*>(?:[ \t].*|$)/.test(entry) || Block.list(entry) !== null
        ) {
          break
        }
        paragraph.push(entry.replace(/^[ \t]+/, ''))
        cursor++
      }
      blocks.push({ type: 'paragraph', children: Inline.parse(paragraph.join('\n')) })
    }
    return blocks
  }
}
