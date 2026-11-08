import type * as Types from '@app/types.ts'
import Inline from '@app/inline.ts'

/**
 * Block-level structure parser.
 * @description Parses code blocks, blockquotes, lists, and paragraphs.
 */
export default class Block {
  /**
   * Match opening code fence line.
   * @description Validates backtick fence length and language info string.
   * @param input - Single source line to inspect
   * @returns Regex match array or null
   */
  static fence(input: string): RegExpExecArray | null {
    const match = /^( {0,3})(`{3,})[ \t]*(.*)$/.exec(input)
    return match === null || (match[3] ?? '').includes('`') ? null : match
  }

  /**
   * Match unordered or ordered list marker.
   * @description Extracts list metadata from bullet or numbered prefix.
   * @param input - Single source line to inspect
   * @returns List metadata or null when not a list
   */
  static list(input: string): Types.ChatmarkList | null {
    const bullet = /^-(?:[ \t]+(.*)|$)/.exec(input)
    if (bullet !== null) {
      return { ordered: false, start: 1, content: bullet[1] ?? '' }
    }
    const ordered = /^(\d{1,9})\.(?:[ \t]+(.*)|$)/.exec(input)
    return ordered !== null
      ? { ordered: true, start: Number.parseInt(ordered[1] ?? '1', 10), content: ordered[2] ?? '' }
      : null
  }

  /**
   * Parse source into block-level nodes.
   * @description Tokenizes markdown source into block AST elements.
   * @param source - Raw markdown source string
   * @param depth - Recursion depth limit for nested parsing
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
    const stops = (entry: string): boolean =>
      entry.trim().length === 0 || Block.fence(entry) !== null ||
      /^ {0,3}>(?:[ \t].*|$)/.test(entry) || Block.list(entry) !== null
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
          const closer = /^( {0,3})(`{3,})[ \t]*$/.exec(entry)
          if (closer !== null && (closer[2] ?? '').length >= (fence[2] ?? '```').length) {
            break
          }
          let spaces = 0
          while (
            spaces < entry.length && spaces < (fence[1] ?? '').length && entry[spaces] === ' '
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
      if (/^ {0,3}>(?:[ \t].*|$)/.test(current)) {
        const quoted: string[] = []
        while (cursor < lines.length && /^ {0,3}>(?:[ \t].*|$)/.test(lines[cursor] ?? '')) {
          quoted.push((lines[cursor] ?? '').replace(/^ {0,3}>[ \t]?/, ''))
          cursor++
        }
        blocks.push({ type: 'blockquote', children: Block.parse(quoted.join('\n'), depth + 1) })
        continue
      }
      const first = Block.list(current)
      if (first !== null) {
        const items: Types.ChatmarkItem[] = []
        while (cursor < lines.length) {
          const matched = Block.list(lines[cursor] ?? '')
          if (matched === null || matched.ordered !== first.ordered) {
            break
          }
          const buffer = [matched.content]
          cursor++
          while (cursor < lines.length) {
            const entry = lines[cursor] ?? ''
            if (stops(entry) || !/^ {2,}|\t/.test(entry)) {
              break
            }
            buffer.push(
              /^[ \t]+(?:-[ \t]|\d{1,9}\.[ \t])/.test(entry)
                ? entry.trimStart()
                : entry.replace(/^ {1,4}|\t/, '')
            )
            cursor++
          }
          items.push({
            children: [{ type: 'paragraph', children: Inline.parse(buffer.join('\n')) }]
          })
        }
        blocks.push({ type: 'list', ordered: first.ordered, start: first.start, items })
        continue
      }
      const paragraph: string[] = []
      while (cursor < lines.length && !stops(lines[cursor] ?? '')) {
        paragraph.push((lines[cursor] ?? '').replace(/^ +/, ''))
        cursor++
      }
      blocks.push({ type: 'paragraph', children: Inline.parse(paragraph.join('\n')) })
    }
    return blocks
  }
}
