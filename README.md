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
