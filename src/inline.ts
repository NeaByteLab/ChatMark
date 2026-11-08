import type * as Types from '@app/types.ts'

/**
 * Inline-level token parser.
 * @description Parses mentions, URLs, code spans, escapes, and emphasis tokens.
 */
export default class Inline {
  /**
   * Merge adjacent text segment nodes.
   * @description Filters empty text nodes and concatenates adjacent text.
   * @param segments - Inline nodes to assemble
   * @returns Compact array of inline nodes
   */
  static assemble(segments: Types.ChatmarkInline[]): Types.ChatmarkInline[] {
    const nodes: Types.ChatmarkInline[] = []
    for (const segment of segments) {
      if (segment.type !== 'text' || segment.value.length > 0) {
        const previous = nodes[nodes.length - 1]
        if (segment.type === 'text' && previous?.type === 'text') {
          previous.value += segment.value
        } else {
          nodes.push(segment)
        }
      }
    }
    return nodes
  }

  /**
   * Parse inline tokens from markdown.
   * @description Extracts and resolves all inline formatting tokens.
   * @param markdown - Inline markdown source string
   * @returns Array of parsed inline nodes
   */
  static parse(markdown: string): Types.ChatmarkInline[] {
    const source = markdown.replace(/\n[ \t]*/g, '\n').replace(/(?<![ \t])[ \t]+$/, '')
    const segments: Types.ChatmarkInline[] = []
    const delimiters: Types.ChatmarkDelimiter[] = []
    let origin: Types.ChatmarkDelimiter | undefined
    let latest: Types.ChatmarkDelimiter | undefined
    let cursor = 0
    let scanned = -1
    const backticks = new Map<number, number[]>()
    const append = (value: Types.ChatmarkInline): Types.ChatmarkInline => {
      segments.push(value)
      return value
    }
    const check = (token: Types.ChatmarkToken, length = 1): boolean =>
      delimiters.some((delimiter) => delimiter.token === token && delimiter.length === length)
    while (cursor < source.length) {
      const symbol = source[cursor] ?? ''
      if (symbol === '\n') {
        const prior = segments[segments.length - 1]
        const broken = prior?.type === 'text' && prior.value.endsWith('  ')
        if (prior?.type === 'text' && broken) {
          prior.value = prior.value.replace(/(?<! ) +$/, '')
        }
        append(broken ? { type: 'break' } : { type: 'text', value: '\n' })
        cursor++
        continue
      }
      if (symbol === '\\') {
        const following = source[cursor + 1] ?? ''
        const escaped = following === '\n' ||
          (following.length > 0 && /[!-/:-@[-`{-~]/.test(following))
        append(
          following === '\n'
            ? { type: 'break' }
            : { type: 'text', value: escaped ? following : '\\' }
        )
        cursor += escaped ? 2 : 1
        continue
      }
      if (symbol === '`') {
        const length = Inline.series(source, cursor, '`').length
        if (cursor > scanned) {
          backticks.clear()
          let pointer = cursor + length
          while (pointer < source.length && source[pointer] !== '\n') {
            if (source[pointer] === '`') {
              const run = Inline.series(source, pointer, '`').length
              const list = backticks.get(run)
              if (list !== undefined) {
                list.push(pointer)
              } else {
                backticks.set(run, [pointer])
              }
              pointer += run
              continue
            }
            pointer++
          }
          scanned = pointer
        }
        const candidates = backticks.get(length)
        const closing = candidates?.find((position) => position >= cursor + length)
        if (closing !== undefined) {
          append({
            type: 'code',
            value: source.slice(cursor + length, closing).replace(/^ (?! +$)(.*) $/, '$1')
          })
          cursor = closing + length
        } else {
          append({ type: 'text', value: '`'.repeat(length) })
          cursor += length
        }
        continue
      }
      if (symbol === '@' || symbol === 'h' || symbol === 'H') {
        let match: Types.ChatmarkSlice | undefined
        if (cursor === 0 || /[\s([<{'"*_~,:;!?/]/.test(source[cursor - 1] ?? '')) {
          if (symbol === '@') {
            const buffer = source.slice(cursor, cursor + 40)
            let handle = /^@([a-z0-9._]+)/.exec(buffer)?.[1] ?? ''
            const count = (target: string, character: string): number =>
              target.split(character).length - 1
            if (handle.endsWith('.')) {
              handle = handle.slice(0, -1)
            }
            let shift = 1
            if (/(?<!_)__$/.test(handle) && check('_', 2)) {
              handle = handle.slice(0, -2)
              shift = 2
            } else if (/(?<!_)_$/.test(handle) && check('_', 1)) {
              handle = handle.slice(0, -1)
            }
            if (handle.endsWith('.')) {
              handle = handle.slice(0, -1)
            }
            const opened = check('_', 1) || check('_', 2)
            const trailing = buffer[1 + handle.length] ?? ''
            const following = buffer[1 + handle.length + (trailing === '_' ? shift : 1)] ?? ''
            if (
              handle.length >= 3 && handle.length <= 35 && !handle.startsWith('.') &&
              !handle.endsWith('.') && count(handle, '.') <= 1 && count(handle, '_') <= 1 &&
              !/[a-zA-Z0-9@]/.test(trailing) &&
              !(trailing === '.' &&
                (/[a-zA-Z0-9@.]/.test(following) || (following === '_' && !opened))) &&
              !(trailing === '_' &&
                (/[a-zA-Z0-9@_]/.test(following) || (following === '.' && !opened)))
            ) {
              match = { value: handle, limit: cursor + 1 + handle.length }
            }
          } else {
            let target =
              /^https?:\/\/[^\s<>"{}|\\^`\p{Cc}]+/iu.exec(source.slice(cursor, cursor + 2080))
                ?.[0] ?? ''
            if (target.length > 0) {
              let round = 0, square = 0
              for (const character of target) {
                if (character === '(') {
                  round++
                } else if (character === ')') {
                  round--
                } else if (character === '[') {
                  square++
                } else if (character === ']') {
                  square--
                }
              }
              while (target.length > 0) {
                const stripped = target.replace(/&[a-zA-Z][a-zA-Z0-9]*;$|[?!.,:;']$/, '')
                if (stripped !== target) {
                  target = stripped
                } else if (target.endsWith(')') && round < 0) {
                  target = target.slice(0, -1)
                  round++
                } else if (target.endsWith(']') && square < 0) {
                  target = target.slice(0, -1)
                  square++
                } else if (/(?<!\*)\*\*$/.test(target) && check('*', 2)) {
                  target = target.slice(0, -2)
                } else if (/(?<!\*)\*$/.test(target) && check('*')) {
                  target = target.slice(0, -1)
                } else if (/(?<!_)__$/.test(target) && check('_', 2)) {
                  target = target.slice(0, -2)
                } else if (/(?<!_)_$/.test(target) && check('_')) {
                  target = target.slice(0, -1)
                } else if (/(?<!~)~~$/.test(target) && check('~', 2)) {
                  target = target.slice(0, -2)
                } else if (/(?<!~)~$/.test(target) && check('~')) {
                  target = target.slice(0, -1)
                } else {
                  break
                }
              }
              const parsed = target.length <= 2048
                ? /^https?:\/\/(?:\[([0-9a-fA-F:]+)\]|([a-zA-Z0-9-\u00a0-\uffff.]+))(?::(\d{1,5}))?(?:[/?#][^\s]*)?$/i
                  .exec(target)
                : null
              const portnum = parsed?.[3] !== undefined ? Number.parseInt(parsed[3], 10) : 80
              if (parsed !== null && portnum >= 1 && portnum <= 65535) {
                if (parsed[1] !== undefined) {
                  const parts = parsed[1].split('::')
                  const groups = parts.flatMap((
                    section
                  ) => (section.length > 0 ? section.split(':') : []))
                  if (
                    !parsed[1].includes(':::') && !/^:(?!:)|(?<!:):$/.test(parsed[1]) &&
                    parts.length <= 2 && groups.every((group) =>
                      /^[0-9a-fA-F]{1,4}$/.test(group)
                    ) && (parts.length === 2 ? groups.length < 8 : groups.length === 8)
                  ) {
                    match = { value: target, limit: cursor + target.length }
                  }
                } else {
                  const domain = parsed[2] ?? ''
                  if (
                    domain.length > 0 && domain.length <= 253 &&
                    domain.split('.').every((label) =>
                      label.length > 0 && label.length <= 63 && !label.startsWith('-') &&
                      !label.endsWith('-')
                    )
                  ) {
                    match = { value: target, limit: cursor + target.length }
                  }
                }
              }
            }
          }
        }
        if (match !== undefined) {
          append(
            symbol === '@' ? { type: 'mention', value: match.value } : {
              type: 'autolink',
              href: match.value.toWellFormed().replace(
                /(?!%[0-9A-Fa-f]{2})[^0-9A-Za-z;,/?:@&=+$\-_.!~*'()#[\]]/gu,
                encodeURIComponent
              ),
              text: match.value
            }
          )
          cursor = match.limit
          continue
        }
      }
      if (symbol === '*' || symbol === '_' || symbol === '~') {
        const series = Inline.series(source, cursor, symbol)
        const before = source[cursor - 1] ?? ' '
        const after = source[cursor + series.length] ?? ' '
        const leading = /[!-/:-@[-`{-~\p{P}\p{S}]/u.test(before)
        const trailing = /[!-/:-@[-`{-~\p{P}\p{S}]/u.test(after)
        const opens = /\s/.test(after) === false &&
          (trailing === false || /\s/.test(before) || leading)
        const closes = /\s/.test(before) === false &&
          (leading === false || /\s/.test(after) || trailing)
        if (series.length > 2 || (!opens && !closes)) {
          append({ type: 'text', value: series })
          cursor += series.length
          continue
        }
        const delimiter: Types.ChatmarkDelimiter = {
          token: symbol as Types.ChatmarkToken,
          entry: append({ type: 'text', value: series }),
          length: series.length,
          opens: symbol === '_' ? opens && (!closes || leading) : opens,
          closes: symbol === '_' ? closes && (!opens || trailing) : closes,
          prior: latest,
          after: undefined
        }
        let matched = false
        if (delimiter.closes) {
          for (let pointer = delimiters.length - 1; pointer >= 0; pointer--) {
            if (
              delimiters[pointer]?.token === delimiter.token &&
              delimiters[pointer]?.length === delimiter.length
            ) {
              delimiters.length = pointer
              matched = true
              break
            }
          }
        }
        if (!matched && delimiter.opens) {
          delimiters.push(delimiter)
        }
        if (latest) {
          latest.after = delimiter
        } else {
          origin = delimiter
        }
        latest = delimiter
        cursor += series.length
        continue
      }
      let advance = cursor + 1
      while (advance < source.length && '\\`*_~@hH\n'.includes(source[advance] ?? '') === false) {
        advance++
      }
      append({ type: 'text', value: source.slice(cursor, advance) })
      cursor = advance
    }
    const bottoms = new Map<string, Types.ChatmarkDelimiter | undefined>()
    for (let closer = origin; closer !== undefined; closer = closer.after) {
      if (closer.closes === false || closer.length === 0) {
        continue
      }
      const bottom = bottoms.get(`${closer.token}${closer.length}`)
      let opener = closer.prior
      while (
        opener !== undefined && opener !== bottom &&
        !(opener.opens && opener.length === closer.length && opener.token === closer.token)
      ) {
        opener = opener.prior
      }
      if (opener === undefined || opener === bottom) {
        if (closer.opens === false) {
          bottoms.set(`${closer.token}${closer.length}`, closer.prior)
        }
        continue
      }
      const start = segments.indexOf(opener.entry)
      const finish = segments.indexOf(closer.entry, start + 1)
      for (const element of [opener.entry, closer.entry]) {
        if (element.type === 'text') {
          element.value = ''
        }
      }
      opener.length = 0
      closer.length = 0
      segments.splice(start + 1, finish - start - 1, {
        type: closer.token === '*' ? 'strong' : closer.token === '_' ? 'emphasis' : 'strike',
        children: Inline.assemble(segments.slice(start + 1, finish))
      })
      if (opener.prior !== undefined) {
        opener.prior.after = closer.after
      } else {
        origin = closer.after
      }
      if (closer.after !== undefined) {
        closer.after.prior = opener.prior
      }
    }
    return Inline.assemble(segments)
  }

  /**
   * Count contiguous matching characters.
   * @description Returns substring of repeated characters at position.
   * @param input - Source string to scan
   * @param position - Starting index position
   * @param character - Character to count
   * @returns Substring of contiguous matching characters
   */
  static series(input: string, position: number, character: string): string {
    let cursor = position
    while (cursor < input.length && input[cursor] === character) {
      cursor++
    }
    return input.slice(position, cursor)
  }
}
