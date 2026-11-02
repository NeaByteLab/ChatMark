# Contributing to ChatMark

Thanks for stopping by. This document explains what kinds of contributions are welcome, where to file them, and the ground rules that keep this repository maintainable.

## Types of Contributions

### Documentation Improvements

Typo fixes, clearer phrasing, and better examples in [`README.md`](./README.md) are all appreciated. Keep changes focused and preserve the existing tone.

### Bug Reports

Spotted a parsing or rendering issue, a mismatch between documented and actual behavior, or a broken example? [Open an issue](https://github.com/NeaByteLab/ChatMark/issues) with a minimal reproduction input and the expected output.

### Proposals, Questions, and Feedback

Want to suggest a syntax rule, an API change, or discuss a design trade-off? [Start a discussion](https://github.com/NeaByteLab/ChatMark/discussions) rather than opening an issue. Issues are reserved for concrete defects, while discussions are for ideas and open-ended exchange.

Ground your proposal in an actual problem you hit while parsing or rendering chat markup. Every new syntax rule or option adds complexity that every consumer has to understand, so the bar for additions is intentionally high. When in doubt, leave it out.

> **Not sure where to post?** Default to Discussions. If it turns out to be a defect we can act on, we will convert it to an issue.

### Parser and Renderer (`src/`)

The implementation under `src/` is intentionally small and opinionated. It aims to stay a pure string-to-AST and AST-to-HTML library with zero runtime dependencies and no I/O. Refactors that keep behavior identical while improving readability, performance, or type safety are welcome. Syntax or feature additions should be discussed first.

### What We Are Not Accepting Yet

To keep scope manageable, the following are out of bounds for now:

- **Filesystem, network, or DOM dependencies** - The parser and renderer stay lightweight and environment-agnostic.
- **Full CommonMark or GFM extensions** - ChatMark focuses strictly on chat markup primitives.
- **Sweeping architectural rewrites** - Small, focused changes only.

If you are unsure whether something fits, open a Discussion before writing the code.

## Development Setup

The source and tests run under Deno.

```bash
# Format, lint, and type-check the source
deno task check

# Run the test suite
deno task test
```

The npm distribution is built with [unbuild](https://github.com/unjs/unbuild):

```bash
npm install
npm run build
```

## Submitting Changes

1. Fork the repository.
2. Create a branch off `main` for your work.
3. Make the change and verify it locally with `deno task check` and `deno task test`.
4. Open a pull request against `main`, describing what changed and why.

Keep each pull request focused on one logical change. Link any related issues or discussions.

## AI-Assisted Contributions

Using an AI assistant (Claude, GPT, Copilot, agent frameworks, and so on) to help with a contribution is fine and often useful. Please disclose it in the pull request or issue description, along with a brief note on how the tool was used (for example, "AI drafted the initial inline delimiter test cases, and I reviewed and refined the assertions").

An example disclosure line is enough:

> Parts of this PR were drafted with the help of Claude Code, then reviewed and edited manually.

Trivial fixes (typos, whitespace, dead links) do not need a disclosure.

Undisclosed AI-generated code makes review harder and wastes reviewer attention. Contributions that appear to skip disclosure may be closed without merge.

### What Helps a Review Go Smoothly

- **Clear disclosure** if AI assistance was involved.
- **Your own understanding** of every changed line - you should be able to answer questions about it.
- **A short rationale** explaining why the change is needed.
- **Tests or examples** demonstrating the new behavior or the regression the change fixes.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
