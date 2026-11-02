import type * as Types from '@app/types.ts'
import Block from '@app/block.ts'
import Render from '@app/render.ts'

/**
 * Public Chatmark parser and renderer.
 * @description Parses lightweight chat markup into AST or HTML string.
 */
export default class Chatmark {
  /**
   * Render Chatmark source to HTML.
   * @description Parses markup into blocks and renders HTML string.
   * @param source - Raw Chatmark input string
   * @returns Rendered HTML string output
   */
  static html(source: string): string {
    return Chatmark.parse(source)
      .children.map((element) => Render.block(element))
      .join('\n')
  }

  /**
   * Parse Chatmark source into AST.
   * @description Converts raw markup text into a document AST object.
   * @param source - Raw Chatmark input string
   * @returns Parsed Chatmark document tree
   */
  static parse(source: string): Types.ChatmarkDocument {
    return {
      type: 'document',
      children: Block.parse(source)
    }
  }
}

/** Re-export all Chatmark AST types */
export type * from '@app/types.ts'
