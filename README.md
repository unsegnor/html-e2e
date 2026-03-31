
# Html-e2e
Library to run e2e tests against html writing them interface-agnostic. For example instead of calling the "click()" method on a "save" button we can call "do('save')" and it will look for buttons or links that can be clicked and contain the text "save".

## Getting started
Check the integration tests for examples of usage

## Design principle: semantic HTML enforcement

html-e2e does not adapt to whatever HTML a developer writes. Instead, it enforces semantically correct HTML by only recognising standard elements. If the HTML is not semantic, the test fails — which is the intended behaviour.

Examples:
- `getAll('tasks')` only works if there is a `<ul>` or `<ol>` labeled by a visible heading (`<h1>`–`<h6>`). A list of `<div>` or `<span>` items is not recognised and the call throws an error.
- `get('name')` only works with `<input>` or `<textarea>` elements associated to a `<label>`. A `<div>` displaying a value is not recognised.

This is intentional: tests passing means the HTML is accessible, standards-compliant, and usable by screen readers and other agents — not just by this library.

## Run all tests

    npm test
