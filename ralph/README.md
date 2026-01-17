# Ralph - Autonomous AI Agent Loop

Ralph is an autonomous AI agent loop that runs Cursor repeatedly until all PRD items are complete.

## Quick Start

### 1. Sync Skills to Cursor Commands

First, sync the skills to Cursor user commands so you can use them in the IDE:

```bash
cd scripts/ralph
./sync-skills-to-commands.sh
```

This creates wrapper commands in `~/.cursor/commands/` that you can use with `/<skill-name>` in Cursor.

### 2. Create a PRD

Use the PRD skill to generate a requirements document:

```
/prd create a PRD for [your feature description]
```

This will ask clarifying questions and save the PRD to `tasks/prd-[feature-name].md`.

### 3. Convert PRD to Ralph Format

Use the Ralph skill to convert the markdown PRD to JSON:

```
/ralph convert tasks/prd-[feature-name].md to scripts/ralph/prd.json
```

This creates `scripts/ralph/prd.json` with user stories structured for autonomous execution.

### 4. Run Ralph

From the project root:

```bash
./scripts/ralph/ralph.sh [max_iterations]
```

Default is 10 iterations. Ralph will:
- Create/checkout the feature branch from PRD
- Pick the highest priority incomplete story
- Implement it
- Run quality checks
- Commit changes
- Update the PRD
- Repeat until all stories are complete

## Key Files

- `ralph.sh` - The main loop script
- `prompt.md` - Instructions for each agent iteration
- `prd.json` - Your task list (created from PRD, gitignored)
- `prd.json.example` - Example PRD format
- `progress.txt` - Learning log (gitignored)
- `skills/` - Structured instruction sets
- `archive/` - Previous runs (gitignored)

## Prerequisites

- Cursor CLI installed and authenticated (`agent` command)
- `jq` installed (`brew install jq` on macOS)
- Git repository initialized

## Available Skills

See `SKILLS.md` for a complete list. Key skills:
- `prd` - Generate Product Requirements Documents
- `ralph` - Convert PRDs to JSON format
- `build-feature` - Autonomous feature implementation
- `frontend-design` - Production-grade frontend guidelines

## Notes

- Each iteration is a fresh Cursor instance with clean context
- Memory persists via git history, `progress.txt`, and `prd.json`
- Stories should be small enough to complete in one context window
- Always update AGENTS.md with discovered patterns
