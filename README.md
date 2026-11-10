# devdesk-integration-test
Dedicated disposable integration acceptance repository for DevDesk

## Workflow v5-99f2a5ce greeting

```js
import { greeting } from './src/workflow-v5-99f2a5ce/greeting.mjs';

greeting('  Ada  '); // 'Hello, Ada!'
greeting(' Ada  Lovelace '); // 'Hello, Ada  Lovelace!'
```

The synchronous named export accepts primitive strings, applies JavaScript
`trim()` to surrounding whitespace, and preserves internal characters,
whitespace, case, and Unicode content (AC-GREET). Empty or whitespace-only
strings and all non-string inputs, including omitted arguments and boxed
strings, synchronously throw `TypeError` without coercion (AC-INVALID).
For example, catch the error from `greeting(null)`, then call again with a
valid string; no reset is needed. Error messages are not contractual.
The module has no dependencies, I/O, or shared mutable state.

From the repository root:

```sh
node --test tests/workflow-v5-99f2a5ce-task/behavior.test.mjs
# Once the independent Feature suite is supplied:
node --test tests/workflow-v5-99f2a5ce-task/behavior.test.mjs tests/workflow-v5-99f2a5ce-feature/behavior.test.mjs
```

The frozen recipe uses a 60-second timeout and image
`sha256:5f8731ec42de5c5d542d5398147c3348c200ad7a66c6cfc99a5f52e0b9776ffc`.
Local validation does not certify execution in that image. Independent Feature
verification, final candidate verification, and review are separate steps.

## Workflow v4-8852bd89 greeting

```js
import { greeting } from './src/workflow-v4-8852bd89/greeting.mjs';

greeting('  Ada  '); // 'Hello, Ada!'
greeting('  Ada  Lovelace  '); // 'Hello, Ada  Lovelace!'
```

The synchronous named export accepts primitive strings, applies `trim()` to
boundary whitespace, and preserves internal text, case, and Unicode content
(AC-GREET). Empty or whitespace-only strings and all non-string inputs,
including omitted arguments and boxed strings, synchronously throw `TypeError`
without coercion (AC-INVALID). For example, `greeting(null)` throws; catch the
error and call again with a valid name. Error message text is not contractual.
There are no dependencies, I/O, or shared mutable state.

Run from the repository root with Node.js supporting ESM and `node:test`:

```sh
# Task
node --test tests/workflow-v4-8852bd89-task/behavior.test.mjs
# Task and Feature, once the independent Feature suite is supplied
node --test tests/workflow-v4-8852bd89-task/behavior.test.mjs tests/workflow-v4-8852bd89-feature/behavior.test.mjs
```

The frozen test environment uses image
`sha256:5f8731ec42de5c5d542d5398147c3348c200ad7a66c6cfc99a5f52e0b9776ffc`
and a 60-second timeout. Local checks do not certify execution in that image.

## Workflow v4-a8003835 greeting

```js
import { greeting } from './src/workflow-v4-a8003835/greeting.mjs';

greeting('  Ada  '); // 'Hello, Ada!'
greeting(' Ada  Lovelace '); // 'Hello, Ada  Lovelace!'
```

The synchronous named export accepts primitive strings and uses `trim()` to
remove surrounding whitespace, preserving internal text and case (AC-GREET).
Empty or whitespace-only strings and all non-string values, including omitted
arguments and boxed strings, synchronously throw `TypeError` without coercion
(AC-INVALID). For example, `greeting(null)` throws; after catching the error,
call again with a valid name. Error message text is not part of the contract.
The module has no dependencies, I/O, or shared mutable state.

Run with Node.js supporting ESM and `node:test`, from the repository root:

```sh
# Task
node --test tests/workflow-v4-a8003835-task/behavior.test.mjs
# Task and independent Feature verification
node --test tests/workflow-v4-a8003835-task/behavior.test.mjs tests/workflow-v4-a8003835-feature/behavior.test.mjs
```

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

## Workflow cdf39268 greeting

Import the dependency-free ESM module:

```js
import { greeting } from './src/workflow-cdf39268-greeting.mjs';

greeting('  Alice  '); // 'Hello, Alice!'
greeting('  Ada  Lovelace  '); // 'Hello, Ada  Lovelace!'
```

The synchronous named export accepts primitive strings, removes boundary
whitespace using `trim()`, and preserves internal characters and whitespace
(AC-GREET). Empty or whitespace-only strings and all non-string values,
including omitted arguments and boxed strings, synchronously throw `TypeError`
without invoking conversion hooks (AC-INVALID). Error messages are not part of
the contract. After catching an error, pass a valid name to call again; no reset
is needed. The module has no dependencies or shared mutable state.

From the repository root, use Node.js supporting ESM and `node:test`:

```sh
# Task suite
node --test tests/workflow-cdf39268/behavior.test.mjs
# Feature suite (once supplied by the independent test author)
node --test tests/workflow-cdf39268-feature/behavior.test.mjs
```

Both frozen recipes specify a 60-second timeout and image
`sha256:09fbe4ee95753eef3cb79788e14713ab64e7711ff9dd8f6f3dfa748cb6176125`.
The Feature suite is not present at implementation time; the tests directory
remains unchanged and read-only for the implementation author.

Implementation evidence uses requirement
`5def743f-663c-4e58-b97b-588621266552` v1, design
`667db527-cea4-4e9a-a3dd-18a3326b0677` v1, and Task test definition
`b3ad2dc6-c233-4fe9-ba72-a5a646491a7c` v1, under Task TDD delivery spec
`builtin-spec-stage-implementation-v1` v1. The supplied baseline is
`ad2c18d8ed8325f66998cae1db0cc8d9765468b4`; Git verification and candidate
sealing belong to the coordinator and were not performed by the implementer.

Before adding the module, in `/work` with Node.js v24.13.0,
`timeout 60s node --test tests/workflow-cdf39268/behavior.test.mjs` exited 1:
one test failed with `ERR_ASSERTION`, caused by the caught
`ERR_MODULE_NOT_FOUND` for this target. Behavior cases had not run. The test
file SHA-256 was
`d42095018fbe2e474de86a8ff59e5b638249642ed0199d7718d8b5da95f10154`.
This local reproduction does not independently verify the frozen image.
The coordinator also supplied isolated Red operation
`3cc4bfdf-51e5-4f24-93fd-3d07dd0db155` for the baseline and frozen image.
Green, regression verification, candidate SHA binding, and independent review
remain coordinator steps; no passing behavior result is claimed here.

No migration is required. To withdraw this change, the coordinator can remove
the new module and this README section, preserving existing modules and tests.
