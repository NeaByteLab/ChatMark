import * as Assert from '@std/assert'
import Block from '@app/block.ts'
import Chatmark from '@app/index.ts'
import Inline from '@app/inline.ts'
import Render from '@app/render.ts'

Deno.test('chatmark - exposes public html and parse methods', () => {
  const source = [
    '> *Welcome* _to_ ~old~ ~~legacy~~ @chat_user.1!',
    '> Visit https://example.com:8080/docs?page=1&sort=asc or run `deno task test`',
    '',
    '- *Item 1* with @alice_smith and https://example.com/path',
    '  continuation with _italic_ and `inline code`',
    '- ~Item 2~ done',
    '',
    '1. First ordered item',
    '2. Second ordered item',
    '',
    '```ts',
    'const message = "hello <world>"',
    '```'
  ].join('\n')
  const parsed = Chatmark.parse(source)
  Assert.assertEquals(parsed.type, 'document')
  Assert.assertEquals(parsed.children, Block.parse(source))
  Assert.assertEquals(
    Chatmark.html(source),
    parsed.children.map((element) => Render.block(element)).join('\n')
  )
  Assert.assertEquals(typeof Inline.parse, 'function')
})
