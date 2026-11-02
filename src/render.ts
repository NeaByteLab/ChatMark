import type * as Types from '@app/types.ts'

/**
 * HTML renderer for Chatmark AST.
 * @description Serializes block and inline AST nodes into safe HTML.
 */
export default class Render {
  /**
   * Render single block AST node.
   * @description Converts a block node into its corresponding HTML element.
   * @param element - Block AST node to render
   * @returns Serialized HTML string for block
   */
  static block(element: Types.ChatmarkBlock): string {
    switch (element.type) {
      case 'paragraph':
        return `<p>${Render.inlines(element.children)}</p>`
      case 'blockquote': {
        const inner = element.children.map((child) => Render.block(child)).join('\n')
        return `<blockquote>\n${inner.length > 0 ? `${inner}\n` : ''}</blockquote>`
      }
      case 'codeblock':
        return `<pre><code${
          element.lang.length > 0
            ? ` class="chatmark-codeblock-${Render.escape(element.lang)}"`
            : ''
        }>${Render.escape(element.code)}</code></pre>`
      case 'list': {
        const tagname = element.ordered ? 'ol' : 'ul'
        return `<${tagname}${
          element.ordered && element.start !== 1 ? ` start="${element.start}"` : ''
        }>\n${
          element.items
            .map(
              (entry) =>
                `<li>${
                  entry.children.map((child) => Render.inlines(child.children)).join('\n')
                }</li>`
            )
            .join('\n')
        }\n</${tagname}>`
      }
    }
  }

  /**
   * Escape special HTML characters safely.
   * @description Replaces ampersands, angle brackets, and double quotes with entities.
   * @param input - Raw string to escape
   * @returns HTML-escaped string output
   */
  static escape(input: string): string {
    return input.replace(
      /[&<>"]/g,
      (token) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[token] ?? token
    )
  }

  /**
   * Render inline AST node array.
   * @description Iteratively serializes nested inline nodes into an HTML string.
   * @param nodes - Inline AST nodes to render
   * @returns Concatenated HTML string output
   */
  static inlines(nodes: Types.ChatmarkInline[]): string {
    const stack: Array<Types.ChatmarkInline | string> = [...nodes].reverse()
    const output: string[] = []
    while (stack.length > 0) {
      const element = stack.pop()!
      if (typeof element === 'string') {
        output.push(element)
        continue
      }
      switch (element.type) {
        case 'text':
          output.push(Render.escape(element.value))
          break
        case 'mention': {
          const escaped = Render.escape(element.value)
          output.push(`<span class="chatmark-mention" data-mention="${escaped}">@${escaped}</span>`)
          break
        }
        case 'strong':
          output.push('<strong>')
          stack.push('</strong>', ...[...element.children].reverse())
          break
        case 'emphasis':
          output.push('<em>')
          stack.push('</em>', ...[...element.children].reverse())
          break
        case 'strike':
          output.push('<del>')
          stack.push('</del>', ...[...element.children].reverse())
          break
        case 'code':
          output.push(`<code>${Render.escape(element.value)}</code>`)
          break
        case 'autolink':
          output.push(`<a href="${Render.escape(element.href)}">${Render.escape(element.text)}</a>`)
          break
        case 'break':
          output.push('<br />\n')
          break
      }
    }
    return output.join('')
  }
}
