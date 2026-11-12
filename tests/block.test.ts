import * as Assert from '@std/assert'
import Block from '@app/block.ts'
import Chatmark from '@app/index.ts'

Deno.test('block - handles empty and unclosed fenced blocks', () => {
  Assert.assertEquals(Chatmark.html('```\n```'), '<pre><code></code></pre>')
  Assert.assertEquals(
    Chatmark.html('```py\nprint(1)'),
    '<pre><code class="chatmark-codeblock-py">print(1)\n</code></pre>'
  )
  Assert.assertEquals(
    Chatmark.html('```ts`invalid\ntext\n```'),
    '<p>```ts`invalid\ntext</p>\n<pre><code></code></pre>'
  )
})

Deno.test('block - interrupts paragraphs and list items', () => {
  Assert.assertEquals(
    Chatmark.html('para\n> quote\n- list\n```\ncode\n```'),
    '<p>para</p>\n<blockquote>\n<p>quote</p>\n</blockquote>\n<ul>\n<li>list</li>\n</ul>\n<pre><code>code\n</code></pre>'
  )
  Assert.assertEquals(
    Chatmark.html('- item\n> quote\n- item 2\n```\ncode\n```'),
    '<ul>\n<li>item</li>\n</ul>\n<blockquote>\n<p>quote</p>\n</blockquote>\n<ul>\n<li>item 2</li>\n</ul>\n<pre><code>code\n</code></pre>'
  )
})

Deno.test('block - nests indented lists inside items', () => {
  Assert.assertEquals(
    Chatmark.html('1. xxx\n  - xxx\n  - xxx\n2. yyy'),
    '<ol>\n<li>xxx\n<ul>\n<li>xxx</li>\n<li>xxx</li>\n</ul></li>\n<li>yyy</li>\n</ol>'
  )
  Assert.assertEquals(
    Chatmark.html('- a\n  - b\n    - c\n- d'),
    '<ul>\n<li>a\n<ul>\n<li>b\n<ul>\n<li>c</li>\n</ul></li>\n</ul></li>\n<li>d</li>\n</ul>'
  )
  Assert.assertEquals(
    Chatmark.html('1. one\n   1. sub one\n   2. sub two\n2. two'),
    '<ol>\n<li>one\n<ol>\n<li>sub one</li>\n<li>sub two</li>\n</ol></li>\n<li>two</li>\n</ol>'
  )
  Assert.assertEquals(
    Chatmark.html('- bullet\n1. ordered\n  - nested'),
    '<ul>\n<li>bullet</li>\n</ul>\n<ol>\n<li>ordered\n<ul>\n<li>nested</li>\n</ul></li>\n</ol>'
  )
})

Deno.test('block - parses blockquotes and nested blockquotes', () => {
  Assert.assertEquals(Chatmark.html('>'), '<blockquote>\n</blockquote>')
  Assert.assertEquals(
    Chatmark.html('> outer\n> > inner'),
    '<blockquote>\n<p>outer</p>\n<blockquote>\n<p>inner</p>\n</blockquote>\n</blockquote>'
  )
  Assert.assertEquals(Block.parse('>'.repeat(70) + ' deep').length, 1)
})

Deno.test('block - parses empty and whitespace input', () => {
  Assert.assertEquals(Block.parse(''), [])
  Assert.assertEquals(Block.parse('   \n  \t \n'), [])
})

Deno.test('block - parses fenced code blocks with language', () => {
  Assert.assertEquals(
    Chatmark.html('```ts extra\nconst value = 1\n```'),
    '<pre><code class="chatmark-codeblock-ts">const value = 1\n</code></pre>'
  )
  Assert.assertEquals(
    Chatmark.html('   ````js\n   const value = 1\n     nested\n ```\n   ````'),
    '<pre><code class="chatmark-codeblock-js">const value = 1\n  nested\n```\n</code></pre>'
  )
})

Deno.test('block - parses single and multiple paragraphs', () => {
  Assert.assertEquals(
    Chatmark.html('first line\n  indented line\n\nsecond paragraph'),
    '<p>first line\nindented line</p>\n<p>second paragraph</p>'
  )
})

Deno.test('block - parses unordered and ordered lists', () => {
  Assert.assertEquals(
    Chatmark.html('- first\n  continued\n  - sub bullet\n\ttab line\n- second\n-'),
    '<ul>\n<li>first\ncontinued\n<ul>\n<li>sub bullet</li>\n</ul>\n<p>tab line</p></li>\n<li>second</li>\n<li></li>\n</ul>'
  )
  Assert.assertEquals(
    Chatmark.html('1. third\n   continued\n   1. sub ordered\n1. fourth\n1.'),
    '<ol>\n<li>third\ncontinued\n<ol>\n<li>sub ordered</li>\n</ol></li>\n<li>fourth</li>\n<li></li>\n</ol>'
  )
})

Deno.test('block - replaces null bytes and normalizes endings', () => {
  Assert.assertEquals(Chatmark.html('a\0b\r\nc\rd\n'), '<p>a\uFFFDb\nc\nd</p>')
})

Deno.test('block - separates lists when switching markers', () => {
  Assert.assertEquals(
    Chatmark.html('- bullet\n1. ordered'),
    '<ul>\n<li>bullet</li>\n</ul>\n<ol>\n<li>ordered</li>\n</ol>'
  )
})
