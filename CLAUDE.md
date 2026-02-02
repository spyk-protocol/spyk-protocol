# SPYK Protocol - Project Rules

## Project Context
- Privacy SDK for AI agents on Solana
- Hackathon project with 7 sponsor integrations
- Main code in `spyk-sdk/`

## Key Files
- `spyk-sdk/src/` - Main SDK source
- `presentation/index.html` - Reveal.js hackathon presentation
- `DEMO_SCRIPT.md` - Video recording script
- `VIDEO_RECORDING_GUIDE.md` - Step-by-step demo commands
- `PRESENTATION.md` - Slide content reference

## Demo Commands
```bash
# All commands run from spyk-demo/
cd spyk-demo

# Check balance
npx tsx src/cli.ts balance

# x402 Payment (REAL devnet TX)
npx tsx src/cli.ts pay https://httpbin.org/post --devnet

# ZK Compliance Proof (REAL Noir)
npx tsx src/cli.ts compliance prove <address>

# Shield tokens
npx tsx src/cli.ts deposit 0.5 --token SOL
```

## Learned Rules

### Browser Automation
- Canva and similar sites block automated browsers (Cloudflare Turnstile)
- Chrome DevTools MCP and agent-browser CLI both get blocked
- For presentations: use reveal.js HTML or manual template editing

### Presentation
- Logo files at `assets/logo/` (logo.png, logo-white.png)
- Use logo-white.png for dark backgrounds
- Presentation uses reveal.js with dark theme

### Beads Loop Agent
- ALWAYS verify filter matches tasks before announcing coordinator start
- If filter returns no matches, ask user immediately - don't announce "Starting" then fail
- Check `bd ready | grep -i "<filter>"` FIRST, then announce or ask for clarification

### Completed Task Prefixes
- `tk-dps` - Round 1 complete, Round 2 in progress (12-14)

### Demo Commands - CRITICAL
- **USE** CLI commands from `spyk-demo/`:
  - `npx tsx src/cli.ts pay <url> --devnet`
  - `npx tsx src/cli.ts compliance prove <address>`
  - `npx tsx src/cli.ts balance`
  - `npx tsx src/cli.ts deposit <amount>`
- MockPrivacyCash balance MUST persist and accumulate across operations
- Remove ALL MOCK labels from demo output

### Worker Task Validation
- Workers MUST verify their work actually fulfills the plan requirements
- If plan says "stop using X" - verify X is NOT used
- If plan says "balance should persist" - verify balance actually persists
- Don't just make code changes - test the actual user-facing behavior
