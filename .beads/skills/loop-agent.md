# Beads Loop Agent (Parallel Coordinator)

Spawns workers in parallel waves. Workers load their own context from `.beads/skills/worker.md`.

## Spawn Pattern (Minimal Context)

```
Task(
  subagent_type: "general-purpose",
  prompt: "cat .beads/skills/worker.md && bd show {TASK_ID}",
  run_in_background: true,
  model: {worker_model}
)
```

Workers are self-sufficient:
1. Read skill from `.beads/skills/worker.md`
2. Read task details from `bd show {TASK_ID}`
3. Execute, close, report

## Wave Loop

```
WHILE bd ready has tasks:
  1. Get ready task IDs (filter if specified)
  2. Spawn workers in parallel (background)
  3. Poll `bd list --id=X,Y,Z` until all closed
  4. Sync: `bd sync --flush-only`
  5. Next wave
```

## Coordinator Stays Minimal

- Only tracks: wave_number, task_ids, completed_count
- Does NOT include full task descriptions
- Does NOT include worker skill text
- Polls beads for status, not worker output

## Session End

```bash
bd sync --flush-only
git status
# Group and commit changes
bd stats
```
