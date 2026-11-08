import * as Assert from '@std/assert'
import Chatmark from '@app/index.ts'
import Inline from '@app/inline.ts'

Deno.test('inline - parses bold, italic, and strikethrough spans', () => {
  Assert.assertEquals(
    Chatmark.html('*bold* **bold** _italic_ __italic__ ~strike~ ~~double~~'),
    '<p><strong>bold</strong> <strong>bold</strong> <em>italic</em> <em>italic</em> <del>strike</del> <del>double</del></p>'
  )
  Assert.assertEquals(
    Chatmark.html(
      '*bold\nline 2* **bold\nline 2** _italic\nline 2_ __italic\nline 2__ ~strike\nline 2~ ~~double\nline 2~~'
    ),
    '<p><strong>bold\nline 2</strong> <strong>bold\nline 2</strong> <em>italic\nline 2</em> <em>italic\nline 2</em> <del>strike\nline 2</del> <del>double\nline 2</del></p>'
  )
  Assert.assertEquals(
    Chatmark.html('***not bold*** ___not italic___ ~~~not strike~~~'),
    '<p>***not bold*** ___not italic___ ~~~not strike~~~</p>'
  )
})

Deno.test('inline - parses line breaks and backslash escapes', () => {
  Assert.assertEquals(
    Chatmark.html('line 1  \nline 2\\\nline 3'),
    '<p>line 1<br />\nline 2<br />\nline 3</p>'
  )
  Assert.assertEquals(
    Chatmark.html('\\*literal\\* \\_literal\\_ \\~literal\\~ \\a'),
    '<p>*literal* _literal_ ~literal~ \\a</p>'
  )
})

Deno.test('inline - parses single line code spans', () => {
  Assert.assertEquals(
    Chatmark.html('`code` `` `code` `` ` a `'),
    '<p><code>code</code> <code>`code`</code> <code>a</code></p>'
  )
  Assert.assertEquals(
    Chatmark.html('`line 1\nline 2` ``unclosed'),
    '<p>`line 1\nline 2` ``unclosed</p>'
  )
})

Deno.test('inline - resolves combined syntax without conflicts', () => {
  Assert.assertEquals(
    Chatmark.html('*_~@alice_1.bob~_* and *_~~https://example.com/path?x=1&y=2~~_*'),
    '<p><strong><em><del><span class="chatmark-mention" data-mention="alice_1.bob">@alice_1.bob</span></del></em></strong> and ' +
      '<strong><em><del><a href="https://example.com/path?x=1&amp;y=2">https://example.com/path?x=1&amp;y=2</a></del></em></strong></p>'
  )
  Assert.assertEquals(
    Chatmark.html(
      '_hello @alice_bob._ and _@alice_bob_. and _check [https://example.com/a[1]]_ and *`raw @alice https://example.com`*'
    ),
    '<p><em>hello <span class="chatmark-mention" data-mention="alice_bob">@alice_bob</span>.</em> and ' +
      '<em><span class="chatmark-mention" data-mention="alice_bob">@alice_bob</span></em>. and ' +
      '<em>check [<a href="https://example.com/a[1]">https://example.com/a[1]</a>]</em> and ' +
      '<strong><code>raw @alice https://example.com</code></strong></p>'
  )
  Assert.assertEquals(
    Chatmark.html(
      "'*https://example.com*' and '_https://example.com_' and '~https://example.com~'"
    ),
    '<p>\'<strong><a href="https://example.com">https://example.com</a></strong>\' and ' +
      '\'<em><a href="https://example.com">https://example.com</a></em>\' and ' +
      '\'<del><a href="https://example.com">https://example.com</a></del>\'</p>'
  )
  Assert.assertEquals(
    Chatmark.html(
      '_first_ @alice_ and *first* https://example.com/foo*bar* and ~first~ https://example.com/~user~ and ~https://example.com/a~~'
    ),
    '<p><em>first</em> <span class="chatmark-mention" data-mention="alice_">@alice_</span> and ' +
      '<strong>first</strong> <a href="https://example.com/foo*bar*">https://example.com/foo*bar*</a> and ' +
      '<del>first</del> <a href="https://example.com/~user~">https://example.com/~user~</a> and ' +
      '~<a href="https://example.com/a~~">https://example.com/a~~</a></p>'
  )
  Assert.assertEquals(
    Chatmark.html(
      '**__~~@alice_1.bob~~__** and __@alice_bob__ and __@alice_bob.__ and **https://example.com** and __https://example.com__'
    ),
    '<p><strong><em><del><span class="chatmark-mention" data-mention="alice_1.bob">@alice_1.bob</span></del></em></strong> and ' +
      '<em><span class="chatmark-mention" data-mention="alice_bob">@alice_bob</span></em> and ' +
      '<em><span class="chatmark-mention" data-mention="alice_bob">@alice_bob</span>.</em> and ' +
      '<strong><a href="https://example.com">https://example.com</a></strong> and ' +
      '<em><a href="https://example.com">https://example.com</a></em></p>'
  )
  Assert.assertEquals(
    Chatmark.html(Array.from({ length: 500 }, (_, index) => '`'.repeat(index + 1) + 'a').join('')),
    `<p>${Array.from({ length: 500 }, (_, index) => '`'.repeat(index + 1) + 'a').join('')}</p>`
  )
  Assert.assertEquals(
    Chatmark.html('*a _b* @alice_ and *a _b* https://example.com/foo_bar_'),
    '<p><strong>a _b</strong> <span class="chatmark-mention" data-mention="alice_">@alice_</span> and ' +
      '<strong>a _b</strong> <a href="https://example.com/foo_bar_">https://example.com/foo_bar_</a></p>'
  )
  Assert.assertEquals(
    Chatmark.html('\\@alice and \\\\@alice and \\_@alice and \\*https://example.com'),
    '<p>@alice and \\@alice and _<span class="chatmark-mention" data-mention="alice">@alice</span> and *<a href="https://example.com">https://example.com</a></p>'
  )
  Assert.assertEquals(
    Chatmark.html('*_a_* b_ and _*a*b_ c*'),
    '<p><strong><em>a</em></strong> b_ and <em><strong>a</strong>b</em> c*</p>'
  )
  Assert.assertEquals(
    Chatmark.html('https://example.com/\uD800test and https://example.com/' + '.'.repeat(60) + 'X'),
    `<p><a href="https://example.com/%EF%BF%BDtest">https://example.com/\uD800test</a> and <a href="https://example.com/${
      '.'.repeat(60)
    }X">https://example.com/${'.'.repeat(60)}X</a></p>`
  )
  Assert.assertEquals(
    Chatmark.html('*a '.repeat(2500) + 'x' + ' a*'.repeat(2500)).startsWith('<p><strong>a '),
    true
  )
})

Deno.test('inline - validates mention rules and length bounds', () => {
  Assert.assertEquals(
    Chatmark.html('@abc @user_1 @user.name @user_1.name @' + 'a'.repeat(35)),
    '<p><span class="chatmark-mention" data-mention="abc">@abc</span> ' +
      '<span class="chatmark-mention" data-mention="user_1">@user_1</span> ' +
      '<span class="chatmark-mention" data-mention="user.name">@user.name</span> ' +
      '<span class="chatmark-mention" data-mention="user_1.name">@user_1.name</span> ' +
      `<span class="chatmark-mention" data-mention="${'a'.repeat(35)}">@${
        'a'.repeat(35)
      }</span></p>`
  )
  Assert.assertEquals(
    Chatmark.html(
      '@ab @' + 'a'.repeat(36) + ' @.abc @a..b @a.b.c @a__b @a_b_c @UpperCase email@abc.com \\@abc'
    ),
    `<p>@ab @${'a'.repeat(36)} @.abc @a..b @a.b.c @a__b @a_b_c @UpperCase email@abc.com @abc</p>`
  )
  Assert.assertEquals(
    Chatmark.html('Hello @alice. Check @bob_1, @charlie_!'),
    '<p>Hello <span class="chatmark-mention" data-mention="alice">@alice</span>. ' +
      'Check <span class="chatmark-mention" data-mention="bob_1">@bob_1</span>, ' +
      '<span class="chatmark-mention" data-mention="charlie_">@charlie_</span>!</p>'
  )
})

Deno.test('inline - validates URLs and strips trailing punctuation', () => {
  Assert.assertEquals(
    Chatmark.html(
      "https://example.com:8080/path(1)?a=1&b=2#top (https://example.com/a(b)) [https://example.com] 'https://example.com'"
    ),
    '<p><a href="https://example.com:8080/path(1)?a=1&amp;b=2#top">https://example.com:8080/path(1)?a=1&amp;b=2#top</a> ' +
      '(<a href="https://example.com/a(b)">https://example.com/a(b)</a>) ' +
      '[<a href="https://example.com">https://example.com</a>] ' +
      '\'<a href="https://example.com">https://example.com</a>\'</p>'
  )
  Assert.assertEquals(
    Chatmark.html('https://[2001:db8::1]:443/ok http://[::1]/ https://example.com&quot;;'),
    '<p><a href="https://[2001:db8::1]:443/ok">https://[2001:db8::1]:443/ok</a> ' +
      '<a href="http://[::1]/">http://[::1]/</a> ' +
      '<a href="https://example.com">https://example.com</a>&amp;quot;;</p>'
  )
  Assert.assertEquals(
    Inline.parse(
      'https://example.com:0 https://example.com:65536 https://-bad.com https://[2001::db8::1]/ \\https://example.com'
    ).every(
      (element) => element.type === 'text'
    ),
    true
  )
})
