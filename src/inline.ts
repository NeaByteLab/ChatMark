import type * as Types from '@app/types.ts'

/**
 * Inline-level Chatmark token parser.
 * @description Parses mentions, URLs, code spans, escapes, and emphasis tokens.
 */
export default class Inline {
  /**
   * Merge adjacent text segment nodes.
   * @description Filters empty text slots and concatenates adjacent text nodes.
   * @param slots - Segment slots to assemble
   * @returns Compact array of inline nodes
   */
  static assemble(slots: Types.ChatmarkSegment[]): Types.ChatmarkInline[] {
    const nodes: Types.ChatmarkInline[] = []
    for (const entry of slots) {
      if (entry.value.type !== 'text' || entry.value.value.length > 0) {
        const previous = nodes[nodes.length - 1]
        if (entry.value.type === 'text' && previous?.type === 'text') {
          previous.value = `${previous.value}${entry.value.value}`
        } else {
          nodes.push(entry.value)
        }
      }
    }
    return nodes
  }

  /**
   * Parse inline text into AST.
   * @description Scans inline tokens and resolves matching emphasis delimiter pairs.
   * @param source - Raw paragraph or item text
   * @returns Array of parsed inline nodes
   */
  static parse(source: string): Types.ChatmarkInline[] {
    const input = source.replace(/\n[ \t]*/g, '\n').replace(/(?<![ \t])[ \t]+$/, '')
    const slots: Types.ChatmarkSegment[] = []
    const active: Types.ChatmarkDelimiter[] = []
    let first: Types.ChatmarkDelimiter | undefined
    let marker: Types.ChatmarkDelimiter | undefined
    let index = 0
    const append = (value: Types.ChatmarkInline): Types.ChatmarkSegment => {
      const entry: Types.ChatmarkSegment = { value }
      slots.push(entry)
      return entry
    }
    const opened = (token: Types.ChatmarkToken, length = 1): boolean =>
      active.some((entry) => entry.token === token && entry.length === length)
    while (index < input.length) {
      const token = input[index] ?? ''
      if (token === '\n') {
        const prior = slots[slots.length - 1]?.value
        const broken = prior?.type === 'text' && prior.value.endsWith('  ')
        if (prior?.type === 'text' && broken) {
          prior.value = prior.value.replace(/(?<! ) +$/, '')
        }
        append(broken ? { type: 'break' } : { type: 'text', value: '\n' })
        index++
        continue
      }
      if (token === '\\') {
        const following = input[index + 1] ?? ''
        const valid = following === '\n' ||
          (following.length > 0 && /[!-/:-@[-`{-~]/.test(following))
        append(
          following === '\n' ? { type: 'break' } : { type: 'text', value: valid ? following : '\\' }
        )
        index += valid ? 2 : 1
        continue
      }
      if (token === '`') {
        const count = Inline.series(input, index, '`').length
        let matched: Types.ChatmarkSlice | undefined
        for (
          let cursor = index + count;
          cursor < input.length && input[cursor] !== '\n';
          cursor++
        ) {
          if (input[cursor] === '`') {
            const length = Inline.series(input, cursor, '`').length
            if (length === count) {
              matched = {
                value: input.slice(index + count, cursor).replace(/^ (?! +$)(.*) $/, '$1'),
                limit: cursor + length
              }
              break
            }
            cursor += length - 1
          }
        }
        append(
          matched !== undefined
            ? { type: 'code', value: matched.value }
            : { type: 'text', value: '`'.repeat(count) }
        )
        index = matched !== undefined ? matched.limit : index + count
        continue
      }
      if (token === '@' || token === 'h' || token === 'H') {
        let match: Types.ChatmarkSlice | undefined
        if (index === 0 || /[\s([<{'"*_~,:;!?/]/.test(input[index - 1] ?? '')) {
          if (token === '@') {
            const slice = input.slice(index, index + 40)
            let handle = /^@([a-z0-9._]+)/.exec(slice)?.[1] ?? ''
            const count = (target: string, symbol: string): number =>
              target.split(symbol).length - 1
            if (handle.endsWith('.')) {
              handle = handle.slice(0, -1)
            }
            if (/(?<!_)_$/.test(handle) && opened('_')) {
              handle = handle.slice(0, -1)
              if (handle.endsWith('.')) {
                handle = handle.slice(0, -1)
              }
            }
            const trailing = slice[1 + handle.length] ?? ''
            const following = slice[2 + handle.length] ?? ''
            if (
              handle.length >= 3 &&
              handle.length <= 35 &&
              !handle.startsWith('.') &&
              !handle.endsWith('.') &&
              count(handle, '.') <= 1 &&
              count(handle, '_') <= 1 &&
              !/[a-zA-Z0-9@]/.test(trailing) &&
              !(
                trailing === '.' &&
                (/[a-zA-Z0-9@.]/.test(following) ||
                  (following === '_' && !opened('_')))
              ) &&
              !(
                trailing === '_' &&
                (/[a-zA-Z0-9@_]/.test(following) ||
                  (following === '.' && !opened('_')))
              )
            ) {
              match = { value: handle, limit: index + 1 + handle.length }
            }
          } else {
            let target =
              /^https?:\/\/[^\s<>"{}|\\^`\p{Cc}]+/iu.exec(input.slice(index, index + 2080))?.[0] ??
                ''
            while (target.length > 0) {
              const stripped: string = target.replace(/&[a-zA-Z][a-zA-Z0-9]*;$|[?!.,:;']$/, '')
              if (stripped !== target) {
                target = stripped
              } else if (
                (target.endsWith(')') && target.split(')').length > target.split('(').length) ||
                (target.endsWith(']') && target.split(']').length > target.split('[').length) ||
                (/(?<!\*)\*$/.test(target) && opened('*')) ||
                (/(?<!_)_$/.test(target) && opened('_')) ||
                (/(?<!~)~~$/.test(target) && opened('~', 2)) ||
                (/(?<!~)~$/.test(target) && opened('~'))
              ) {
                target = target.slice(
                  0,
                  /(?<!~)~~$/.test(target) && opened('~', 2) ? -2 : -1
                )
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
                const halves = parsed[1].split('::')
                const groups = halves.flatMap((section) =>
                  section.length > 0 ? section.split(':') : []
                )
                if (
                  !parsed[1].includes(':::') &&
                  !/^:(?!:)|(?<!:):$/.test(parsed[1]) &&
                  halves.length <= 2 &&
                  groups.every((group) => /^[0-9a-fA-F]{1,4}$/.test(group)) &&
                  (halves.length === 2 ? groups.length < 8 : groups.length === 8)
                ) {
                  match = { value: target, limit: index + target.length }
                }
              } else {
                const domain = parsed[2] ?? ''
                if (
                  domain.length > 0 &&
                  domain.length <= 253 &&
                  domain
                    .split('.')
                    .every(
                      (label) =>
                        label.length > 0 &&
                        label.length <= 63 &&
                        !label.startsWith('-') &&
                        !label.endsWith('-')
                    )
                ) {
                  match = { value: target, limit: index + target.length }
                }
              }
            }
          }
        }
        if (match !== undefined) {
          append(
            token === '@' ? { type: 'mention', value: match.value } : {
              type: 'autolink',
              href: match.value.toWellFormed().replace(
                /(?!%[0-9A-Fa-f]{2})[^0-9A-Za-z;,/?:@&=+$\-_.!~*'()#[\]]/gu,
                encodeURIComponent
              ),
              text: match.value
            }
          )
          index = match.limit
          continue
        }
      }
      if (token === '*' || token === '_' || token === '~') {
        const series = Inline.series(input, index, token)
        if ((token !== '~' && series.length > 1) || (token === '~' && series.length > 2)) {
          append({ type: 'text', value: series })
          index += series.length
          continue
        }
        const before = input[index - 1] ?? ' '
        const after = input[index + series.length] ?? ' '
        const symbol = /[!-/:-@[-`{-~\p{P}\p{S}]/u.test(before)
        const punctuated = /[!-/:-@[-`{-~\p{P}\p{S}]/u.test(after)
        const opens = /\s/.test(after) === false &&
          (punctuated === false || /\s/.test(before) || symbol)
        const closes = /\s/.test(before) === false &&
          (symbol === false || /\s/.test(after) || punctuated)
        const delimiter: Types.ChatmarkDelimiter = {
          token,
          entry: append({ type: 'text', value: series }),
          length: series.length,
          opens: token === '_' ? opens && (closes === false || symbol) : opens,
          closes: token === '_' ? closes && (opens === false || punctuated) : closes,
          prior: marker,
          after: undefined
        }
        let matched = false
        if (delimiter.closes) {
          for (let cursor = active.length - 1; cursor >= 0; cursor--) {
            if (
              active[cursor]?.token === delimiter.token &&
              active[cursor]?.length === delimiter.length
            ) {
              active.length = cursor
              matched = true
              break
            }
          }
        }
        if (!matched && delimiter.opens) {
          active.push(delimiter)
        }
        if (marker !== undefined) {
          marker.after = delimiter
        } else {
          first = delimiter
        }
        marker = delimiter
        index += series.length
        continue
      }
      let cursor = index + 1
      while (cursor < input.length && '\\`*_~@hH\n'.includes(input[cursor] ?? '') === false) {
        cursor++
      }
      append({ type: 'text', value: input.slice(index, cursor) })
      index = cursor
    }
    const bottoms = new Map<string, Types.ChatmarkDelimiter | undefined>()
    for (let closer = first; closer !== undefined; closer = closer.after) {
      if (closer.closes === false || closer.length === 0) {
        continue
      }
      const bottom = bottoms.get(`${closer.token}${closer.length}`)
      let opener = closer.prior
      while (
        opener !== undefined &&
        opener !== bottom &&
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
      const start = slots.indexOf(opener.entry)
      const finish = slots.indexOf(closer.entry, start + 1)
      for (const element of [opener.entry.value, closer.entry.value]) {
        if (element.type === 'text') {
          element.value = ''
        }
      }
      opener.length = 0
      closer.length = 0
      slots.splice(start + 1, finish - start - 1, {
        value: {
          type: closer.token === '*' ? 'strong' : closer.token === '_' ? 'emphasis' : 'strike',
          children: Inline.assemble(slots.slice(start + 1, finish))
        }
      })
      if (opener.prior !== undefined) {
        opener.prior.after = closer.after
      } else {
        first = closer.after
      }
      if (closer.after !== undefined) {
        closer.after.prior = opener.prior
      }
    }
    return Inline.assemble(slots)
  }

  /**
   * Read a contiguous identical character run.
   * @description Slices repeated occurrences of a character from position.
   * @param input - Full inline source string
   * @param position - Starting scan index in input
   * @param character - Target character to match repeatedly
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
