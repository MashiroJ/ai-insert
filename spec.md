# ui-inspect Phase 1 Rectification SPEC

## Problem Statement

ui-inspect is being repositioned from a VisBug-like browser CSS editor into a frontend visual task collector for AI coding agents. The current implementation has started that migration, but it is not complete enough to ship or call done.

The visible menu now points users toward:

- Create AI Task
- Batch Task
- Source Clues
- Troubleshooting
- History

However, the runtime and panel experience still contain old CSS Debug behavior, old wording, and unfinished task-list semantics. This creates four product and technical problems.

1. The user mental model is still split.
   The menu says "Create AI Task", while panels still say "local adjustment", "batch adjustment", and "continue debugging". This keeps the old CSS-editor mindset alive.

2. The browser runtime can fail at interaction time.
   CSS Debug source modules were deleted, but the generated browser runtime still references old CSS Debug functions and constants. TypeScript does not catch these because they live inside generated client-source strings.

3. CSS Debug is hidden rather than removed.
   The menu entry is gone, but old selection modes, overlay listeners, page click interceptors, styles, and Diana tips still exist.

4. The SPEC is only partially implemented.
   Troubleshooting has improved, but task history is still a chat-session list, source clues were not meaningfully enhanced for complex projects, and all panels still need a clearer task-oriented redesign.

## Proposed Solution

Rebuild Diana around one product role:

> Diana is a frontend visual task collector for AI coding agents. It helps users select page targets, describe intent, collect source/runtime clues, and send a clear implementation task to the agent.

The product should not directly edit CSS in the browser. It should collect enough structured context for the coding agent to modify real source code.

### Product Information Architecture

Diana should expose these first-level actions:

1. Create AI Task
2. Batch Task
3. Source Clues
4. Troubleshooting
5. Task Records

Remove the old CSS Debug path from all user-facing UI and runtime paths.

### Required Functional Changes

#### 1. Fully remove CSS Debug runtime residue

Remove or isolate all deprecated CSS Debug state, branches, functions, styles, and event listeners.

Must clean up:

- `CSS_DEBUG_*` constants.
- `cssDebugSession`, `cssDebugPendingPick`, `cssDebugElementIds`, `cssDebugNextElementId`.
- CSS Debug references in `isOwnNode()`.
- CSS Debug cleanup calls in `closeDebugPanel()`.
- `mode === 'css-debug'` branches in `beginSelectionMode()`.
- `selectionMode === 'css-debug'` branches in session click handling.
- `installCssDebugRuntimeStyle()`.
- `updateCssDebugOverlay()` resize/scroll listeners.
- `handleCssDebugPageClick()` document click listener.
- Diana idle tips that mention CSS debugging, dragging elements, or editing CSS properties.
- `#ui-inspect-css-*` styles in browser UI style source.
- `cssDebugIcon()` if unused.

Acceptance checks:

- `rg "CSS_DEBUG|CssDebug|cssDebug|ui-inspect-css|selectionMode === 'css-debug'|openCssDebugPanel|handleCssDebugPageClick|installCssDebugRuntimeStyle" packages/browser-ui/src packages/server/src packages/cli/src packages/protocol/src`
  should not find active runtime code.
- It is acceptable to keep compatibility tests that assert `css-debug` is invalid input.
- Opening Diana, selecting an element, and closing the panel must not produce browser console errors.

#### 2. Rename and align all task wording

The UI should consistently describe user work as AI tasks.

Required labels:

- `single` mode title: `Create AI Task`
- `batch` mode title: `Batch Task`
- `troubleshoot` mode title: `Troubleshooting`
- history entry: `Task Records`

Remove old labels from active UI:

- `Local adjustment`
- `Batch adjustment`
- `CSS Debug`
- `Continue debugging`

Chinese UI equivalents are acceptable, but they must preserve the same task-oriented meaning:

- `创建 AI 任务`
- `批量任务`
- `源码线索`
- `问题排查`
- `任务记录`

#### 3. Redesign panels around task collection

Every Diana panel should help non-frontend users understand what was selected and what will be sent.

Common panel structure:

- Header: Diana + task type + close button.
- Target summary: human-readable target name first, technical DOM details second.
- Source clues: source file and line if available.
- Actions: open source, copy source, reselect, remove target.
- Instruction input: plain user language, not frontend jargon.
- Submit button: primary action should create/send an AI task.

Target summaries should prefer readable clues over raw DOM tags:

- button text
- input placeholder
- aria label
- role
- visible text
- component name
- nearby source file name

Raw `div`, `span`, `p`, and long selectors should be fallback information, not the primary label.

#### 4. Convert history into task records

History must behave like a task list, not a chat-session list.

Each record should show:

- task type
- status
- target summary
- target count for batch tasks
- user request summary
- updated time
- actions: open, delete, optionally copy context

Avoid making these the primary information:

- raw session id
- message count
- "select a session to continue debugging"

#### 5. Preserve and improve troubleshooting

Troubleshooting should remain, but must be verified in the browser.

Required behavior:

- User can select a suspicious component.
- Console/runtime events are shown if captured.
- Errors are selected by default.
- Warnings can be selected manually.
- Empty state is explicit when no logs exist.
- If logs are selected, privacy confirmation is required before sending.
- Payload includes selection, targets, source clues, diagnostics, runtime events, and user description.
- The tool must not automatically send cookies, localStorage, request bodies, or screenshots.

#### 6. Strengthen source clues for complex projects

Source clues are a core feature and must not regress while CSS Debug is removed.

Minimum required data:

- Vue component name when available.
- source file.
- line and column when available.
- selector.
- readable target title.
- target text, aria label, role, input placeholder, or other user-facing identifiers.

Complex-project improvements:

- If the direct element has no source, walk up to the nearest parent component/source clue.
- For generic tags like `span`, `p`, and `div`, derive a readable title from text, aria, role, placeholder, component, or file context.
- Batch tasks must preserve source clues per target.
- Agent-facing context should not rely only on long CSS selectors.

## Technical Constraints

1. Do not revive the VisBug/CSS editor path.
   No CSS property drawer, browser-side style patching, drag-to-generate-CSS, resize diff, or transform diff.

2. Generated browser runtime must be tested.
   Because much of the browser code is embedded as generated strings, add tests that inspect `clientSource()` output and/or run browser smoke tests.

3. Protocol compatibility is allowed, but product behavior must be clean.
   Historical protocol types may stay if needed for old sessions, but new runtime/UI must not expose CSS Debug.

4. Panels must work on complex real apps.
   Test with nested components, forms, tables, modals, drawers, repeated list items, fixed/sticky elements, long text, and elements whose source clue is only available on an ancestor.

5. Dist files must stay in sync if this repository expects generated dist artifacts to be committed.

## Non-goals

This phase does not implement:

- VisBug parity.
- Browser DevTools replacement.
- CSS visual editor.
- Dragging page elements to generate source changes.
- Automatic screenshot diff.
- Automatic cookie/localStorage/network-body collection.
- Full IDE plugin work.
- Large backend persistence redesign.
- Full protocol rewrite.

## Success Criteria

### Code Health

- `pnpm test` passes.
- `pnpm typecheck` passes.
- Browser smoke/e2e passes.
- Real browser console has no `ReferenceError` during Diana menu, select, send, history, troubleshooting, and close flows.
- Active runtime code no longer contains old CSS Debug symbols.
- Dist artifacts are updated when required.

### Product Behavior

- Users immediately understand the main action is creating an AI coding task.
- Main actions are clear: Create AI Task, Batch Task, Source Clues, Troubleshooting, Task Records.
- A non-frontend user can understand selected targets without knowing `span`, `p`, or `div`.
- Batch tasks can collect multiple targets and per-target notes.
- Troubleshooting sends only user-confirmed runtime clues.
- Source clues remain strong enough for complex component projects.
- Task records are scan-friendly task entries, not raw chat-session rows.
- All panels use consistent task-oriented wording and visual hierarchy.

## Known Current Failures

These are known blockers from review.

1. `packages/browser-ui/src/client-source.ts`
   - `isOwnNode()` references undefined CSS Debug constants.
   - `closeDebugPanel()` calls deleted CSS Debug functions.
   - `beginSelectionMode()` still supports `css-debug`.
   - runtime startup still calls CSS Debug style/overlay functions.
   - document click interceptor still calls CSS Debug page-click handling.

2. `packages/browser-ui/src/client-modules/session-source.ts`
   - click handling still contains `selectionMode === 'css-debug'`.
   - history panel still presents sessions instead of task records.

3. `packages/browser-ui/src/client-modules/diana-source.ts`
   - idle tips still mention CSS Debug dragging and property editing.

4. `packages/browser-ui/src/client-modules/task-panel-source.ts`
   - mode titles still use old local/batch adjustment wording.
   - batch sidebar still says batch adjustment instead of batch task.

5. `packages/browser-ui/src/client-modules/style-source.ts`
   - old `#ui-inspect-css-*` styles are still present.

6. `packages/server/src/style-source*`
   - server-side style/source clue modules were deleted. Confirm this does not regress source clue quality for complex projects, or replace it with the new source-clue mechanism.

## Suggested Verification Matrix

Run these before calling the phase complete.

1. Static checks
   - `pnpm typecheck`
   - `pnpm test`
   - CSS Debug residue `rg` command from the acceptance section.

2. Browser smoke
   - Start a Vite demo app.
   - Open Diana.
   - Create AI Task: select a button/input, type request, send, close.
   - Batch Task: select two related elements, add per-target note, send.
   - Source Clues: select an element, open/copy source.
   - Troubleshooting: trigger `console.error`, select component, confirm selected log, send.
   - Task Records: open list, inspect record, delete one record.
   - Verify browser console has no runtime errors.

3. Complex app check
   - Test nested Vue components.
   - Test generic `div/span/p` targets.
   - Test component library controls.
   - Test modal/drawer/table/form layouts.
   - Test long text and small viewport.

