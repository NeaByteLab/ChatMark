import * as Assert from '@std/assert'
import Chatmark from '@app/index.ts'

Deno.test('brutal - complex nested syntax and indentation', () => {
  const input = [
    '- *bold*',
    '  - _italic_',
    '    - ~strike~',
    '      - `code`',
    '        - **nested**',
    '  1. 1st',
    '     2. 2nd',
    '        3. 3rd',
    '  > quoted',
    '  > > _nested quote_',
    '  > - list in quote',
    '    - nested list in quote'
  ].join('\n')
  const html = Chatmark.html(input)
  Assert.assertStringIncludes(html, '<strong>bold</strong>')
  Assert.assertStringIncludes(html, '<em>italic</em>')
  Assert.assertStringIncludes(html, '<del>strike</del>')
  Assert.assertStringIncludes(html, '<code>code</code>')
  Assert.assertStringIncludes(html, '<strong>nested</strong>')
  Assert.assertStringIncludes(
    html,
    '<li>1st\n<ol start="2">\n<li>2nd\n<ol start="3">\n<li>3rd</li>'
  )
  Assert.assertStringIncludes(
    html,
    '<blockquote>\n<p>quoted</p>\n<blockquote>\n<p><em>nested quote</em></p>\n</blockquote>'
  )
  Assert.assertStringIncludes(html, '<ul>\n<li>list in quote</li>\n</ul>')
})

Deno.test('brutal - mixed syntax conflict', () => {
  const input =
    '_*~@alice.bob~*_ and *__@bob__* and (**_~~https://example.com:8080/a(b)[c]_d*e~f~~_**)'
  const html = Chatmark.html(input)
  Assert.assertStringIncludes(
    html,
    '<em><strong><del><span class="chatmark-mention" data-mention="alice.bob">@alice.bob</span></del></strong></em>'
  )
  Assert.assertStringIncludes(
    html,
    '<strong><em><span class="chatmark-mention" data-mention="bob">@bob</span></em></strong>'
  )
  Assert.assertStringIncludes(
    html,
    '(<strong><em><del><a href="https://example.com:8080/a(b)[c]_d*e~f">https://example.com:8080/a(b)[c]_d*e~f</a></del></em></strong>)'
  )
})

Deno.test('brutal - multi-style indentation and mixed tabs/spaces', () => {
  Assert.assertEquals(
    Chatmark.html('  - a\n    - b\n      - c\n  - d'),
    '<ul>\n<li>a\n<ul>\n<li>b\n<ul>\n<li>c</li>\n</ul></li>\n</ul></li>\n<li>d</li>\n</ul>'
  )
  Assert.assertEquals(
    Chatmark.html('10. first\n    - sub 1\n        1. sub sub 1\n    - sub 2\n11. second'),
    '<ol start="10">\n<li>first\n<ul>\n<li>sub 1\n<ol>\n<li>sub sub 1</li>\n</ol></li>\n<li>sub 2</li>\n</ul></li>\n<li>second</li>\n</ol>'
  )
  Assert.assertEquals(
    Chatmark.html('- a\n\t- b\n\t\t- c\n  \t- d'),
    '<ul>\n<li>a\n<ul>\n<li>b\n<ul>\n<li>c</li>\n<li>d</li>\n</ul></li>\n</ul></li>\n</ul>'
  )
  Assert.assertEquals(
    Chatmark.html('    - a\n        - b\n            - c\n    - d'),
    '<ul>\n<li>a\n<ul>\n<li>b\n<ul>\n<li>c</li>\n</ul></li>\n</ul></li>\n<li>d</li>\n</ul>'
  )
  Assert.assertEquals(
    Chatmark.html('\t- a\n\t\t- b\n\t\t\t- c\n\t- d'),
    '<ul>\n<li>a\n<ul>\n<li>b\n<ul>\n<li>c</li>\n</ul></li>\n</ul></li>\n<li>d</li>\n</ul>'
  )
  Assert.assertEquals(
    Chatmark.html('    > quoted\n    > > nested\n    ```ts\n    const x = 1\n    ```'),
    '<blockquote>\n<p>quoted</p>\n<blockquote>\n<p>nested</p>\n</blockquote>\n</blockquote>\n<pre><code class="chatmark-codeblock-ts">const x = 1\n</code></pre>'
  )
  Assert.assertEquals(
    Chatmark.html('_@alice__ and __@alice___ and __@alice_bob__'),
    '<p><em><span class="chatmark-mention" data-mention="alice_">@alice_</span></em> and ' +
      '<em><span class="chatmark-mention" data-mention="alice_">@alice_</span></em> and ' +
      '<em><span class="chatmark-mention" data-mention="alice_bob">@alice_bob</span></em></p>'
  )
  Assert.assertEquals(
    Chatmark.html('(*_~https://[2001:db8:85a3::8a2e:370:7334]:65535/path(1)[2]?a=1&b=2#sec~_*)'),
    '<p>(<strong><em><del><a href="https://[2001:db8:85a3::8a2e:370:7334]:65535/path(1)[2]?a=1&amp;b=2#sec">' +
      'https://[2001:db8:85a3::8a2e:370:7334]:65535/path(1)[2]?a=1&amp;b=2#sec</a></del></em></strong>)</p>'
  )
  Assert.assertEquals(
    Chatmark.html(
      Array.from({ length: 100 }, (_, index) => '  '.repeat(index) + '- item').join('\n')
    ).startsWith('<ul>\n<li>item\n<ul>'),
    true
  )
})

Deno.test('brutal - performance and deep nesting edge cases', () => {
  Assert.assertEquals(Chatmark.html('*a '.repeat(5000) + 'x' + ' a*'.repeat(5000)).length, 105008)
  Assert.assertEquals(
    Chatmark.html(
      Array.from({ length: 100 }, () => 'https://example.com/' + '.'.repeat(2000)).join(' ')
    ).includes('<a href="https://example.com/">'),
    true
  )
  Assert.assertEquals(Chatmark.html('> '.repeat(100) + 'deep').startsWith('<blockquote>'), true)
})
