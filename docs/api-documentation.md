# GatorAid source-code documentation

This is the M4 documentation-generation extra-credit deliverable. JSDoc reads
`/** ... */` comments in the actual JavaScript/React source and generates an HTML
reference. It does not execute the application or require database credentials.

## Generate and open the HTML

```sh
npm ci
npm run docs:check
npm run docs:build
```

Open `docs/generated/api/index.html` in a browser. The module menu links to the
documented functions, parameters, return values and source listings. Keep the
whole `api` folder together: the HTML pages need its styles and scripts.

The inputs are explicitly listed in `jsdoc.json`. They include the P1 pages,
React components, API handlers and reusable helpers; generated Unity assets,
dependencies, secrets and database migrations are not inputs. Configuration
constants and private local helpers are outside the public function/class count.
The compiled Unity application's internal C# interfaces are not covered by the
JavaScript reference; the JavaScript viewer and model-download boundary are.

## Requirement coverage

`docs/p1-documentation.json` uses the team's updated **45-P1 requirement list**
from the M4 document's **all features** tab, confirmed in the review of PR #49.
It includes R8.1-R8.5 (Allison), R9.1-R9.5 (AI Schedule Scanner), and R5.3
(Personalized Recommendations). Of these, 42 have source mappings and three
authentication requirements remain explicitly uncounted. That is
**42 / 45 = 93.3%**, above the requested 85%.

The Allison inputs include its API route, question parsing/ranking helpers,
answer-card grid helper and chat component. The scanner inputs include its scan
and persistence API routes, upload/review component and Pacific-time schedule
conflict helper. R5.3 explicitly maps the For You API and student API helpers.

This is **documentation coverage**, not a functional test pass rate or statement
coverage. A source mapping identifies the implementation area; it does not prove
that every behavior in the requirement is finished. For example, provider email
verification, unverified-account restrictions and duplicate-account behavior need
separate evidence and are not credited here. The team should confirm that this
requirement baseline matches the final M4 report.

`npm run docs:check` checks that every mapped file exists, is a configured input,
and has generated documentation for each exported callable. It also verifies
documented parameter and return information. It prints the covered requirement
and public-interface counts and writes a requirement-to-file evidence table to
`docs/generated/p1-coverage.md`.

The helper modules extracted in PR #52 are included in this reference. Some
exports are standalone units awaiting UI integration, including home search,
event phase, assistant personalization and parts of the auth flow. Their
documentation does not establish that the corresponding feature is complete.
The three excluded authentication requirements remain uncounted.

## Maintain the comments

- Describe what the function does, including important errors or fallback behavior.
- Use `@param` for arguments and destructured properties, and `@returns` for results.
- Keep each comment immediately above its exported declaration.
- Update the comment when the function's contract changes.
- Add new P1 source files to the manifest and `jsdoc.json`, then regenerate.
- Run the documentation check and build before submitting the documentation PR.

Example from the event validation module:

```js
/**
 * Normalize event form fields and collect validation errors without writing to the database.
 * @param {Object} input - Untrusted input to validate.
 * @returns {Object} Field errors and normalized event data.
 */
export function validateEvent(input) {
  // Existing implementation.
}
```

## M4 report text

- **Tool:** JSDoc 4 generates HTML reference documentation directly from comments
  in GatorAid's JavaScript and React source files.
- **Comment format:** Public functions/classes describe their purpose, parameters
  and return values, including important error and fallback behavior.
- **Scope:** The requirement-to-source mapping covers 42 of the team's updated
  45 P1 requirements (93.3%), including R8, R9 and R5.3. This measures
  documentation scope, not test results.
- **Generation:** Run `npm run docs:check` and `npm run docs:build`; the entry page
  is `docs/generated/api/index.html`.
- **Evidence:** Include the source/configuration links, the generated
  `p1-coverage.md` table, and the complete HTML folder in the handoff to the team
  lead. Replace local paths with the final PR/commit links after review.

Generated output is ignored by git and is not automatically published on the
production website. After the PR is merged, regenerate from the exact submitted
revision and archive the complete HTML folder for the M4 submission. This setup
does not configure the separate GitHub Actions extra-credit task.

Reference: [JSDoc getting started](https://jsdoc.app/about-getting-started).
