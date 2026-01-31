# Beads Worker

Execute the task shown in `bd show` output above.

## Rules
- `bd update {ID} --status=in_progress` first
- Do the work described
- NO commits, NO sync (coordinator does that)
- `bd close {ID} --reason="what you did"` when done

## If Blocked
- Permissions denied → report back, don't close
- Dependencies missing → report back, don't close
- Task unclear → report back, don't close
