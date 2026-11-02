import type * as Types from '@app/types.ts'
import Inline from '@app/inline.ts'

/**
 * Block-level Chatmark structure parser.
 * @description Parses code blocks, blockquotes, flat lists, and paragraphs.
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
   * Match unordered or ordered marker.
   * @description Extracts list ordering flag, start number, and item text.
   * @param input - Single source line to inspect
   * @returns Parsed list metadata or null
   */
  static list(input: string): Types.ChatmarkList | null {
    const bullet = /^-(?:[ \t]+(.*)|$)/.exec(input)
    if (bullet !== null) {
      return { ordered: false, start: 1, content: bullet[1] ?? '' }
    }
    const ordered = /^(\d{1,9})\.(?:[ \t]+(.*)|$)/.exec(input)
    if (ordered !== null) {
      return {
        ordered: true,
        start: Number.parseInt(ordered[1] ?? '1', 10),
        content: ordered[2] ?? ''
      }
    }
    return null
  }

  /**
   * Parse source lines into blocks.
   * @description Splits normalized input lines into block-level AST nodes.
   * @param source - Raw document or blockquote text
   * @param depth - Current blockquote recursion depth
   * @returns Array of parsed block nodes
   */
  static parse(source: string, depth = 0): Types.ChatmarkBlock[] {
    if (depth > 64) {
      return []
    }
    const lines = source
      .replace(/\0/g, '\uFFFD')
      .replace(/\r\n?/g, '\n')
      .replace(/\n$/, '')
      .split('\n')
    const blocks: Types.ChatmarkBlock[] = []
    let index = 0
    while (index < lines.length) {
      const current = lines[index] ?? ''
      if (current.trim().length === 0) {
        index++
        continue
      }
      const fence = Block.fence(current)
      if (fence !== null) {
        const content: string[] = []
        index++
        while (index < lines.length) {
          const entry = lines[index] ?? ''
          index++
          const closer = /^( {0,3})(`{3,})[ \t]*$/.exec(entry)
          if (closer !== null && (closer[2] ?? '').length >= (fence[2] ?? '```').length) {
            break
          }
          let count = 0
          while (count < entry.length && count < (fence[1] ?? '').length && entry[count] === ' ') {
            count++
          }
          content.push(entry.slice(count))
        }
        blocks.push({
          type: 'codeblock',
          lang: (fence[3] ?? '').split(/[ \t]/, 1)[0] ?? '',
          code: content.length > 0 ? `${content.join('\n')}\n` : ''
        })
        continue
      }
      if (Block.quote(current)) {
        const quoted: string[] = []
        while (index < lines.length) {
          const entry = lines[index] ?? ''
          if (Block.quote(entry)) {
            quoted.push(entry.replace(/^ {0,3}>[ \t]?/, ''))
            index++
            continue
          }
          break
        }
        blocks.push({
          type: 'blockquote',
          children: Block.parse(quoted.join('\n'), depth + 1)
        })
        continue
      }
      const first = Block.list(current)
      if (first !== null) {
        const items: Types.ChatmarkItem[] = []
        while (index < lines.length) {
          const matched = Block.list(lines[index] ?? '')
          if (matched === null || matched.ordered !== first.ordered) {
            break
          }
          const buffer = [matched.content]
          index++
          while (index < lines.length) {
            const following = lines[index] ?? ''
            if (
              following.trim().length === 0 ||
              Block.fence(following) !== null ||
              Block.quote(following) ||
              Block.list(following) !== null
            ) {
              break
            }
            if (/^ {2,}|\t/.test(following)) {
              buffer.push(
                /^[ \t]+(?:-[ \t]|\d{1,9}\.[ \t])/.test(following)
                  ? following.trimStart()
                  : following.replace(/^ {1,4}|\t/, '')
              )
              index++
              continue
            }
            break
          }
          items.push({
            children: [{ type: 'paragraph', children: Inline.parse(buffer.join('\n')) }]
          })
        }
        blocks.push({
          type: 'list',
          ordered: first.ordered,
          start: first.start,
          items
        })
        continue
      }
      const paragraph: string[] = []
      while (index < lines.length) {
        const entry = lines[index] ?? ''
        if (
          entry.trim().length === 0 ||
          Block.fence(entry) !== null ||
          Block.quote(entry) ||
          Block.list(entry) !== null
        ) {
          break
        }
        paragraph.push(entry.replace(/^ +/, ''))
        index++
      }
      blocks.push({
        type: 'paragraph',
        children: Inline.parse(paragraph.join('\n'))
      })
    }
    return blocks
  }

  /**
   * Check if line starts a blockquote.
   * @description Tests whether the line begins with a quote marker.
   * @param input - Single source line to test
   * @returns True when line starts a blockquote
   */
  static quote(input: string): boolean {
    return /^ {0,3}>(?:[ \t].*|$)/.test(input)
  }
}
