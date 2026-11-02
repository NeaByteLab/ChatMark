/**
 * Emphasis or strikethrough delimiter node.
 * @description Tracks delimiter token, flanking flags, and linked neighbors.
 */
export interface ChatmarkDelimiter {
  /** Delimiter character token */
  token: ChatmarkToken
  /** Associated inline segment slot */
  entry: ChatmarkSegment
  /** Number of repeated characters */
  length: number
  /** True when delimiter can open */
  opens: boolean
  /** True when delimiter can close */
  closes: boolean
  /** Previous delimiter in linked list */
  prior: ChatmarkDelimiter | undefined
  /** Next delimiter in linked list */
  after: ChatmarkDelimiter | undefined
}

/**
 * Root Chatmark document node.
 * @description Holds parsed top-level block elements in document order.
 */
export interface ChatmarkDocument {
  /** Root document node discriminator */
  type: 'document'
  /** Parsed top-level block nodes */
  children: ChatmarkBlock[]
}

/**
 * Single list item container.
 * @description Holds paragraph blocks belonging to one list item.
 */
export interface ChatmarkItem {
  /** Paragraph nodes inside list item */
  children: ChatmarkParagraph[]
}

/**
 * Parsed list marker metadata.
 * @description Stores list ordering flag, start index, and line text.
 */
export interface ChatmarkList {
  /** True when list is numbered */
  ordered: boolean
  /** Starting index for ordered lists */
  start: number
  /** Remaining line content after marker */
  content: string
}

/**
 * Block-level paragraph node.
 * @description Contains parsed inline elements for one text paragraph.
 */
export interface ChatmarkParagraph {
  /** Paragraph block node discriminator */
  type: 'paragraph'
  /** Parsed inline child nodes */
  children: ChatmarkInline[]
}

/**
 * Mutable inline segment wrapper.
 * @description Wraps an inline node during delimiter resolution pass.
 */
export interface ChatmarkSegment {
  /** Wrapped inline AST node */
  value: ChatmarkInline
}

/**
 * Matched substring slice result.
 * @description Stores extracted token value and next scan index.
 */
export interface ChatmarkSlice {
  /** Extracted substring token value */
  value: string
  /** Exclusive end index in source */
  limit: number
}

/**
 * Block-level AST node union.
 * @description Represents paragraph, blockquote, codeblock, or list block nodes.
 */
export type ChatmarkBlock =
  | ChatmarkParagraph
  | {
    /** Blockquote node discriminator */
    type: 'blockquote'
    /** Nested block nodes inside quote */
    children: ChatmarkBlock[]
  }
  | {
    /** Fenced codeblock node discriminator */
    type: 'codeblock'
    /** Optional code language identifier */
    lang: string
    /** Raw code block text content */
    code: string
  }
  | {
    /** List block node discriminator */
    type: 'list'
    /** True when list is numbered */
    ordered: boolean
    /** Starting number for ordered list */
    start: number
    /** List item nodes in sequence */
    items: ChatmarkItem[]
  }

/**
 * Inline-level AST node union.
 * @description Represents text, mention, formatting spans, code, autolink, or break.
 */
export type ChatmarkInline =
  | {
    /** Plain text node discriminator */
    type: 'text'
    /** Raw unescaped text value */
    value: string
  }
  | {
    /** User mention node discriminator */
    type: 'mention'
    /** Validated username without leading symbol */
    value: string
  }
  | {
    /** Bold span node discriminator */
    type: 'strong'
    /** Nested inline nodes inside bold */
    children: ChatmarkInline[]
  }
  | {
    /** Italic span node discriminator */
    type: 'emphasis'
    /** Nested inline nodes inside italic */
    children: ChatmarkInline[]
  }
  | {
    /** Strikethrough span node discriminator */
    type: 'strike'
    /** Nested inline nodes inside strikethrough */
    children: ChatmarkInline[]
  }
  | {
    /** Inline code node discriminator */
    type: 'code'
    /** Raw inline code string value */
    value: string
  }
  | {
    /** Autolink URL node discriminator */
    type: 'autolink'
    /** Percent-encoded destination URL string */
    href: string
    /** Visible link text before encoding */
    text: string
  }
  | {
    /** Hard line break node discriminator */
    type: 'break'
  }

/** Delimiter token for inline formatting */
export type ChatmarkToken = '*' | '_' | '~'
