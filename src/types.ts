/**
 * Emphasis delimiter node.
 * @description Tracks delimiter token, flanking flags, and linked neighbors.
 */
export interface ChatmarkDelimiter {
  /** Delimiter character token */
  token: ChatmarkToken
  /** Associated inline text node */
  entry: ChatmarkInline
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

/** Root Chatmark document node. */
export interface ChatmarkDocument {
  /** Root document node discriminator */
  type: 'document'
  /** Parsed top-level block nodes */
  children: ChatmarkBlock[]
}

/** Single list item container. */
export interface ChatmarkItem {
  /** Paragraph nodes inside list item */
  children: ChatmarkParagraph[]
}

/** Parsed list marker metadata. */
export interface ChatmarkList {
  /** True when list is numbered */
  ordered: boolean
  /** Starting index for ordered lists */
  start: number
  /** Remaining line content after marker */
  content: string
}

/** Block-level paragraph node. */
export interface ChatmarkParagraph {
  /** Paragraph block node discriminator */
  type: 'paragraph'
  /** Parsed inline child nodes */
  children: ChatmarkInline[]
}

/** Matched substring slice result. */
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
  | { type: 'blockquote'; children: ChatmarkBlock[] }
  | { type: 'codeblock'; lang: string; code: string }
  | { type: 'list'; ordered: boolean; start: number; items: ChatmarkItem[] }

/**
 * Inline-level AST node union.
 * @description Represents text, mention, formatting spans, code, autolink, or break.
 */
export type ChatmarkInline =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string }
  | { type: 'strong'; children: ChatmarkInline[] }
  | { type: 'emphasis'; children: ChatmarkInline[] }
  | { type: 'strike'; children: ChatmarkInline[] }
  | { type: 'code'; value: string }
  | { type: 'autolink'; href: string; text: string }
  | { type: 'break' }

/** Delimiter token for inline formatting */
export type ChatmarkToken = '*' | '_' | '~'
