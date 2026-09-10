# lafwords-e2e-base

![E2E](https://github.com/vishin-andrey/lafwords-e2e-base/actions/workflows/e2e.yml/badge.svg)

A Playwright + TypeScript end-to-end testing base: Page Object Model, fixtures, and a CI
pipeline that publishes a full HTML report on every run.

It is deliberately **target-agnostic**, demonstrated here against
[saucedemo.com](https://www.saucedemo.com/), a public sandbox published by Sauce Labs for
exactly this purpose. Swapping the target means replacing the page objects and test data, not
the structure around them.

This solution illustrates the core principles behind the E2E test suite for
[LAFwords](https://lafwords.com) - a language-learning product I launched in 2026. Unlike this
demo, the LAFwords E2E approach centers on a local Firebase emulator stack (to ensure
determinism) and a staging environment - never production, where processes like payments and
content generation entail real-world side effects.

---

## Quick start

```bash
npm ci                      # install dependencies
npx playwright install      # download browser binaries (not in node_modules)
npm test                    # run the suite
npm run report              # open the HTML report
```

| Script | What it does |
|---|---|
| `npm test` | run every test, all configured browsers |
| `npm run typecheck` | `tsc --noEmit`  type-checks specs, pages and fixtures |
| `npm run report` | open the last HTML report |

Run a subset:

```bash
npx playwright test --project=chromium    # one browser
npx playwright test --ui                  # interactive UI mode — best way to explore
npx playwright test --debug               # step through with the inspector
```

---

## What's covered

| Suite | Test | Verifies |
|---|---|---|
| Login | signs a valid user in to the inventory page | valid credentials reach the inventory page |
| Login | rejects an empty password | the correct validation message is shown |
| Login | rejects an empty username | the correct validation message is shown |
| Cart | reflects items added and removed | items added, cart badge count, cart contents, removal |

Four tests is a starting point, not a claim of coverage. The point of this repository is the
**structure** the tests sit in - see [Testing strategy](#testing-strategy) and
[Roadmap](#roadmap).

---

## Project structure

```
pages/           Page objects - locators and actions, one per meaningful screen
  base.page.ts     shared header/cart elements
  login.page.ts
  inventory.page.ts
  cart.page.ts
fixtures/        Custom Playwright fixtures that inject page objects into tests
tests/
  auth.setup.ts    signs in once and saves the session (drives the `setup` project)
  login.spec.ts
  cart.spec.ts
.github/workflows/e2e.yml   CI pipeline
```

A test never constructs a page object itself. Fixtures do it:

```ts
test('signs a valid user in to the inventory page', async ({ loginPage, inventoryPage }) => {
  await loginPage.login(username, password);
  await inventoryPage.assertIsOpened();
});
```

The test declares what it needs; Playwright builds it, per test, with the right `page`
already wired in.

---

## Testing strategy

### Where this suite sits

End-to-end tests are the most expensive and least stable layer of a test suite, so this one is
deliberately narrow. It covers **critical user journeys that cross real boundaries** — browser,
session, navigation, state that survives a page transition. Anything verifiable more cheaply
belongs elsewhere:

| Question | Layer |
|---|---|
| Does this function return the right value? | unit |
| Does this component render the right markup? | component |
| Does this endpoint honour its contract? | API / integration |
| **Can a user log in, add items, and see the correct cart?** | **E2E (here)** |

The practical test: if a failure here could have been caught by a cheaper test, the coverage is
in the wrong place. A suite that tries to E2E everything becomes slow and flaky, and a flaky
suite gets ignored - which is worse than no suite at all.

### Target under test

saucedemo was chosen over a toy app because it offers a real multi-page authenticated flow
**and** ships deliberately broken user personas (`problem_user`, `performance_glitch_user`),
which make it possible to demonstrate defect detection rather than only happy paths.

**On the credentials in this repository:** saucedemo's usernames and password are printed on
its own login page - they are public fixtures, not secrets. Real credentials belong in CI
secrets and never in source control. This repository has none to protect, and stores none.

### Locator strategy

Brittle selectors are the single largest cause of flaky E2E suites, so locators follow a strict
order of preference:

1. **Role and accessible name** - `getByRole('textbox', { name: 'Username' })`. Closest to how
   a user perceives the page, and it fails loudly when accessibility regresses.
2. **The application's own test hooks** - saucedemo exposes `data-test` attributes. Where an app
   publishes a testing contract, using it is correct: it is explicitly stable, unlike markup or
   copy.
3. **Text content** - readable, but couples tests to copy and breaks under localization.
4. **CSS / XPath structure** - last resort; breaks on any refactor.

Where an element is only identifiable in context, locators are **composed** rather than made
more specific:

```ts
this.page
  .locator('[data-test="inventory-item"]')
  .filter({ hasText: itemName })
  .getByRole('button', { name: 'Add to cart' });
```

That reads the way a person would describe the target - *the "Add to cart" button in the row for
this item* - and survives reordering, restyling, and added columns.

### Determinism

**No fixed waits.** `waitForTimeout` does not appear in this repository. Playwright's locators
wait for actionability, and web-first assertions retry until they pass or time out. Both adapt
to a slow machine; a hard-coded sleep either wastes time or races.

```ts
expect(await page.locator('h1').isVisible()).toBe(true);  // snapshot — races the app
await expect(page.getByRole('heading')).toBeVisible();     // retries — deterministic
```

`expect.soft()` is used where several independent facts are checked in one test - form
validation, for example - so one failure still reports the others instead of hiding them behind
the first.

### Test data and isolation

Tests are independent and parallel-safe (`fullyParallel: true`): each owns its state and none
depends on another having run first. Where the target's fixed catalogue makes shared data
unavoidable, tests act on distinct items rather than sharing one.

### Authentication

Logging in through the UI in every test is slow, and it couples unrelated tests to the login
flow: a broken login turns one clear failure into several confusing ones. So authentication
happens **once**, in a setup project (`tests/auth.setup.ts`) that signs in and saves the browser
session to `playwright/.auth/`. Every browser project declares `dependencies: ['setup']` and
starts already authenticated.

Login tests are the exception. They explicitly start from a clean session
(`test.use({ storageState: { cookies: [], origins: [] } })`), because a browser that is already
signed in cannot prove that signing in works.

The saved session is both a credential and a generated artifact, so it is gitignored and
rebuilt on every run — including in CI, where the runner starts empty and staleness is
impossible.

**The trade-off:** the setup project is a shared dependency. When it fails, dependent tests are
reported as skipped with a stated reason rather than failing with invented symptoms — one clear
root cause instead of several misleading ones. Decoupling further would mean authenticating
through the API rather than the UI, trading realism for isolation.

### Cross-browser policy

Chromium, Firefox and WebKit all run locally. **CI runs Chromium only**, deliberately: the
overwhelming majority of regressions are application bugs that reproduce everywhere, and paying
triple the CI minutes on every commit to catch a rare engine-specific issue is a poor trade.
Firefox and WebKit are the right candidates for a scheduled nightly job as the suite grows.

### Diagnosing failures

A failing test is only useful if the cause can be found quickly.

- `trace: 'on-first-retry'` — a full timeline with DOM snapshots, network activity and console
  output for any test that needed a retry. Effectively free, because it costs nothing on runs
  that pass.
- The HTML report is uploaded as a CI artifact **on every run, including failures** — the run
  where it is needed most.

To inspect a failure from CI: download the `playwright-report` artifact, then

```bash
npx playwright show-report path/to/unzipped-report
```

### Flake policy

Retries are enabled on CI (`retries: 2`) as a **diagnostic, not a fix**. A test that passes only
on retry is recording a real problem — a race in the test or in the application — and gets an
issue rather than a shrug. Retries keep the pipeline usable while that is investigated; they are
not permission to stop investigating.

`forbidOnly` is enabled on CI, so a stray `test.only` fails the build instead of silently
reducing the suite to one test.

---

## Continuous integration

[`.github/workflows/e2e.yml`](.github/workflows/e2e.yml) runs on every push to `main`, every
pull request, and on demand.

1. install dependencies with `npm ci` — fails if the lockfile and `package.json` disagree
2. **type-check first** — seconds, before spending minutes on browsers
3. install the Chromium binary with its OS dependencies
4. run the suite
5. upload the HTML report **with `if: always()`**, so it exists precisely when a run fails

Playwright detects CI automatically and applies the stricter settings above (`forbidOnly`,
retries).

---

## Roadmap

Known gaps, in the order I would close them:

- **Test tagging** — `@smoke` / `@regression`, so pull requests run the critical path and the
  full suite runs on a schedule.
- **`test.step()`** — group actions so the report reads as a narrative rather than a list of
  clicks.
- **Defect detection with broken personas** — exercise `problem_user` and
  `performance_glitch_user`, documenting real findings with `test.fail()` so known defects are
  recorded without turning CI red.
- **Framework / target split** — move target-agnostic code into a `framework/` layer so the
  reusable half is explicit. `BasePage` currently holds saucedemo-specific cart locators, which
  is the seam to fix first.
- **Browser caching in CI** — cache `~/.cache/ms-playwright` keyed by Playwright version.
- **API-level tests** using Playwright's `request` fixture, for setup and teardown that should
  not go through the UI.

---

## License

MIT — see [LICENSE.md](LICENSE.md).
