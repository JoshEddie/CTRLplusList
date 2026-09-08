# User-facing copy lives in one catalogue behind one accessor

Every string a person reads is declared once in `lib/i18n/en.ts` and read
through `getMessage`. The catalogue holds ICU MessageFormat, so a string that
shows a count carries its own plural rules instead of leaving each caller to
pick a branch.

## Considered Options

`next-intl` is the obvious pick for an App Router project. Its hook needs a
provider and a client component, while much of this app's copy is produced by
server actions and the DAL. `intl-messageformat` is the formatting core
underneath those wrappers, has no React dependency, and so serves both sides
through one function.

## Consequences

The file is named `en.ts`, but the app is not translatable — `getMessage`
formats against a hardcoded `'en'` and there is no locale to negotiate. What
this buys now is one home for copy; a second language is a further decision,
not a drop-in.
