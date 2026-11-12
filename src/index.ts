import type * as Types from '@app/types.ts'
import Block from '@app/block.ts'
import Render from '@app/render.ts'

/**
 * Main parser and renderer class.
 * @description Parses ChatMark strings into AST or HTML output.
 */
export default class Chatmark {
  /**
   * Convert markdown string to HTML.
   * @description Parses input blocks and renders HTML string.
   * @param markdown - Input markdown text
   * @returns Rendered HTML string
   */
  static html(markdown: string): string {
    return Chatmark.parse(markdown).children.map((block) => Render.block(block)).join('\n')
  }

  /**
   * Parse markdown string to AST.
   * @description Parses input blocks into a root document node.
   * @param markdown - Input markdown text
   * @returns Parsed document AST node
   */
  static parse(markdown: string): Types.ChatmarkDocument {
    return { type: 'document', children: Block.parse(markdown) }
  }
}

/** Re-export all public type definitions */
export type * from '@app/types.ts'
