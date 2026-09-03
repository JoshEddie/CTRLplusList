import IntlMessageFormat from 'intl-messageformat';
import { en } from './en';

type MessageKey = keyof typeof en;

// The argument names a message declares, read off its literal type: the text
// after each `{`, up to the first `,` or `}`.
type Token<S extends string> = S extends `${infer Head}}${string}`
  ? Head extends `${infer Name},${string}`
    ? Name
    : Head
  : never;

type Named<S extends string> = S extends ''
  ? never
  : S extends `${string} ${string}`
    ? never
    : S;

// A plural option body (`one {1 person}`) is not an argument. It is the only `{`
// preceded by a category keyword, which is what skips it.
type OptionKeyword =
  | 'zero'
  | 'one'
  | 'two'
  | 'few'
  | 'many'
  | 'other'
  | `=${number}`;

type ArgNames<S extends string> = S extends `${infer Before}{${infer Rest}`
  ?
      | (Before extends `${string}${OptionKeyword} `
          ? never
          : Named<Token<Rest>>)
      | ArgNames<Rest>
  : never;

type MessageArgs<K extends MessageKey> = [ArgNames<(typeof en)[K]>] extends [
  never,
]
  ? []
  : [params: Record<ArgNames<(typeof en)[K]>, string | number>];

export function getMessage<K extends MessageKey>(
  key: K,
  ...params: MessageArgs<K>
): string {
  return new IntlMessageFormat(en[key], 'en').format(
    params[0] as Record<string, string | number>
  ) as string;
}
