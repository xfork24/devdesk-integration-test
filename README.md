# devdesk-integration-test
Dedicated disposable integration acceptance repository for DevDesk

## Greeting

`src/workflow-57dd1515-greeting.mjs` exports `greeting(name)` with no dependencies.
It trims surrounding whitespace using `String.prototype.trim()` and returns
`Hello, <trimmed name>!`, preserving internal whitespace and character case.
Blank strings and all non-string inputs throw `TypeError` without coercion.

Run the Task suite with:

```sh
node --test tests/workflow-57dd1515/behavior.test.mjs
```

The coordinator recorded assertion Red before implementation on revision
`71c4bce302d7e4a9a8d5e50a3b4c48457812f7fb`: one test failed with
`ERR_ASSERTION` (exit code 1), following the caught missing-module import.
Red operation: `281e609b-fab0-4cf7-a089-cc454ced0ece`.
Green verification and independent review remain coordinator steps.

## Workflow 62a1efde greeting

Import the dependency-free ESM module from the repository root:

```js
import { greeting } from './src/workflow-62a1efde-greeting.mjs';

greeting('  Ada  '); // 'Hello, Ada!'
greeting('  Ada  Lovelace  '); // 'Hello, Ada  Lovelace!'
```

`greeting(name)` is synchronous. It accepts primitive strings, removes leading
and trailing whitespace with `trim()`, and preserves internal whitespace and
characters (AC-GREET). Empty strings, whitespace-only strings, and every
non-string input, including omitted arguments and boxed strings, synchronously
throw `TypeError` without coercion (AC-INVALID). Error messages are not part of
the contract. After catching an error, call again with a valid nonblank string;
no reset is needed. The module has no shared mutable state or external access.

Run the independent Task suite with Node.js supporting ESM and `node:test`:

```sh
node --test tests/workflow-62a1efde/behavior.test.mjs
```

The coordinator supplied assertion Red for revision
`77914e1b3f92587e7e1eaf638c2ca5abab8ca16e`: 1 failed, 0 passed, 0 skipped,
exit code 1, with `ERR_ASSERTION` from the caught import failure before
implementation. Red operation: `50f96545-b290-46ef-91be-9906e4a623f2`.
The frozen recipe uses image
`sha256:5f8731ec42de5c5d542d5398147c3348c200ad7a66c6cfc99a5f52e0b9776ffc`
and a 60-second timeout. The independent tests remain unchanged. Green,
verify, Git sealing, and independent review are subsequent coordinator steps;
no passing result is claimed here.
