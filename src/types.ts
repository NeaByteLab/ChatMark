/** Delimiter data for span parsing. */
export interface ChatmarkDelimiter {
  /** Token type identifier */
  token: ChatmarkToken
  /** Index in segments */
  entry: number
  /** Token length */
  length: number
  /** True when opening */
  opens: boolean
  /** True when closing */
  closes: boolean
  /** Previous delimiter link */
  prior: ChatmarkDelimiter | undefined
  /** Next delimiter link */
  after: ChatmarkDelimiter | undefined
}

/** Root document structure. */
export interface ChatmarkDocument {
  /** Block type identifier */
  type: 'document'
  /** Child blocks */
  children: ChatmarkBlock[]
}

/** List item structure. */
export interface ChatmarkItem {
  /** List item children */
  children: Array<ChatmarkParagraph | ChatmarkListBlock>
}

/** List block configuration. */
export interface ChatmarkList {
  /** True if ordered */
  ordered: boolean
  /** Start index */
  start: number
  /** Content text */
  content: string
}

/** Block list structure. */
export interface ChatmarkListBlock {
  /** Block type identifier */
  type: 'list'
  /** True if ordered */
  ordered: boolean
  /** Start index */
  start: number
  /** List items */
  items: ChatmarkItem[]
}

/** Paragraph block structure. */
export interface ChatmarkParagraph {
  /** Block type identifier */
  type: 'paragraph'
  /** Paragraph children */
  children: ChatmarkInline[]
}

/** Parser slice helper. */
export interface ChatmarkSlice {
  /** Sliced value */
  value: string
  /** Limit index */
  limit: number
}

/** Union of block types. */
export type ChatmarkBlock =
  | ChatmarkParagraph
  | {
    /** Block type identifier */
    type: 'blockquote'
    /** Quoted child blocks */
    children: ChatmarkBlock[]
  }
  | {
    /** Block type identifier */
    type: 'codeblock'
    /** Language identifier */
    lang: string
    /** Code content */
    code: string
  }
  | ChatmarkListBlock

/** Union of inline types. */
export type ChatmarkInline =
  | {
    /** Inline type identifier */
    type: 'text'
    /** Text content */
    value: string
  }
  | {
    /** Inline type identifier */
    type: 'mention'
    /** Mentioned handle */
    value: string
  }
  | {
    /** Inline type identifier */
    type: 'strong'
    /** Strong child nodes */
    children: ChatmarkInline[]
  }
  | {
    /** Inline type identifier */
    type: 'emphasis'
    /** Emphasis child nodes */
    children: ChatmarkInline[]
  }
  | {
    /** Inline type identifier */
    type: 'strike'
    /** Strikethrough child nodes */
    children: ChatmarkInline[]
  }
  | {
    /** Inline type identifier */
    type: 'code'
    /** Code span content */
    value: string
  }
  | {
    /** Inline type identifier */
    type: 'autolink'
    /** Link target URL */
    href: string
    /** Link display text */
    text: string
  }
  | {
    /** Inline type identifier */
    type: 'break'
  }

/** Token type characters. */
export type ChatmarkToken = '*' | '_' | '~'
