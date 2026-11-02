import * as Assert from '@std/assert'
import Chatmark from '@app/index.ts'
import Render from '@app/render.ts'

Deno.test('render - escapes HTML special characters', () => {
  Assert.assertEquals(
    Render.escape('<script attr="x">&</script>'),
    '&lt;script attr=&quot;x&quot;&gt;&amp;&lt;/script&gt;'
  )
  Assert.assertEquals(
    Chatmark.html('`<tag attr="1">&` and ```a"b\n<x>&\n```'),
    '<p><code>&lt;tag attr=&quot;1&quot;&gt;&amp;</code> and ```a&quot;b\n&lt;x&gt;&amp;</p>\n<pre><code></code></pre>'
  )
})

Deno.test('render - formats ordered list with custom start', () => {
  Assert.assertEquals(
    Render.block({
      type: 'list',
      ordered: true,
      start: 2,
      items: [
        {
          children: [
            { type: 'paragraph', children: [{ type: 'text', value: 'head' }] }
          ]
        }
      ]
    }),
    '<ol start="2">\n<li>head</li>\n</ol>'
  )
})
