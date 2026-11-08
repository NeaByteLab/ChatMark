import type * as Types from '@app/types.ts'
import Block from '@app/block.ts'
import Render from '@app/render.ts'

/**
 * Chatmark parser and renderer.
 * @description Provides HTML output and document parsing.
 */
export default class Chatmark {
  /**
   * Convert markdown to HTML string.
   * @description Parses markdown and renders all blocks to HTML.
   * @param markdown - Raw markdown input string
   * @returns HTML string of rendered blocks
   */
  static html(markdown: string): string {
    return Chatmark.parse(markdown).children.map((block) => Render.block(block)).join('\n')
  }

  /**
   * Parse markdown into document tree.
   * @description Converts markdown string to structured document.
   * @param markdown - Raw markdown input string
   * @returns Parsed chatmark document tree
   */
  static parse(markdown: string): Types.ChatmarkDocument {
    return { type: 'document', children: Block.parse(markdown) }
  }
}

/** Re-export all Chatmark AST types */
export type * from '@app/types.ts'
