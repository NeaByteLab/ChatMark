import type * as Types from '@app/types.ts'

/**
 * HTML renderer for AST nodes.
 * @description Converts parsed block and inline nodes to HTML.
 */
export default class Render {
  /**
   * Render block node to HTML.
   * @description Formats paragraph, blockquote, codeblock, or list element.
   * @param element - Block AST node
   * @returns Rendered HTML string
   */
  static block(element: Types.ChatmarkBlock): string {
    if (element.type === 'paragraph') {
      return `<p>${Render.inlines(element.children)}</p>`
    }
    if (element.type === 'blockquote') {
      const inner = element.children.map((child) => Render.block(child)).join('\n')
      return `<blockquote>\n${inner.length > 0 ? `${inner}\n` : ''}</blockquote>`
    }
    if (element.type === 'codeblock') {
      return `<pre><code${
        element.lang.length > 0 ? ` class="chatmark-codeblock-${Render.escape(element.lang)}"` : ''
      }>${Render.escape(element.code)}</code></pre>`
    }
    const tagname = element.ordered ? 'ol' : 'ul'
    return `<${tagname}${
      element.ordered && element.start !== 1 ? ` start="${element.start}"` : ''
    }>\n${
      element.items
        .map((entry) => {
          const first = entry.children[0]
          const leading = first === undefined
            ? ''
            : first.type === 'paragraph'
            ? Render.inlines(first.children)
            : Render.block(first)
          const trailing = entry.children.slice(1).map((child) => Render.block(child)).join('\n')
          return `<li>${trailing.length > 0 ? `${leading}\n${trailing}` : leading}</li>`
        })
        .join('\n')
    }\n</${tagname}>`
  }

  /**
   * Escape HTML special characters.
   * @description Replaces ampersands, angle brackets, and quotes with entities.
   * @param input - Raw string to escape
   * @returns Escaped HTML string
   */
  static escape(input: string): string {
    return input.replace(
      /[&<>"]/g,
      (token) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[token] ?? token
    )
  }

  /**
   * Render inline nodes to HTML.
   * @description Traverses inline node stack to build HTML markup.
   * @param nodes - Array of inline AST nodes
   * @returns Rendered inline HTML string
   */
  static inlines(nodes: Types.ChatmarkInline[]): string {
    const stack: Array<Types.ChatmarkInline | string> = [...nodes].reverse()
    const result: string[] = []
    while (stack.length > 0) {
      const element = stack.pop()!
      if (typeof element === 'string') {
        result.push(element)
        continue
      }
      if (element.type === 'text') {
        result.push(Render.escape(element.value))
      } else if (element.type === 'mention') {
        const escaped = Render.escape(element.value)
        result.push(`<span class="chatmark-mention" data-mention="${escaped}">@${escaped}</span>`)
      } else if (
        element.type === 'strong' || element.type === 'emphasis' || element.type === 'strike'
      ) {
        const tagname = element.type === 'strong'
          ? 'strong'
          : element.type === 'emphasis'
          ? 'em'
          : 'del'
        result.push(`<${tagname}>`)
        stack.push(`</${tagname}>`)
        for (const child of [...element.children].reverse()) {
          stack.push(child)
        }
      } else if (element.type === 'code') {
        result.push(`<code>${Render.escape(element.value)}</code>`)
      } else if (element.type === 'autolink') {
        result.push(`<a href="${Render.escape(element.href)}">${Render.escape(element.text)}</a>`)
      } else if (element.type === 'break') {
        result.push('<br />\n')
      }
    }
    return result.join('')
  }
}
