# herdr-config

My Herdr setup: an iTerm-style window for jumping between git worktrees and the agents running in them.

This repo is `~/.config/herdr-app` itself, with everything Herdr writes or ships ignored.

## What's here

- `layouts/worktrees.json`: the layout. A bar of open spaces on top (like iTerm tabs), flat edge-to-edge panes, a Home page, and the sidebar hidden (⌘B).
- `mods/worktree-bar`: the top bar. Lists spaces with their agent status, a Home button, Files/Changes, and a count of agents that need you.
- `mods/home`: the Home page. Type a prompt and it makes the next free worktree folder (`~/nine`, `~/twelve`, ...) off `origin/main` with a branch named by Claude Haiku, then opens Claude there with the prompt.
- `mods/quiet-toast`: Herdr's toast without the "agent needs you" popups.
- `themes/iterm-light.json`, `themes/iterm-dark.json`: my iTerm Default profile colors.
- `keys.json`, `settings.json`: shortcuts and font (Monaco, like iTerm).

## Keys (worktrees layout)

| Key | Does |
|---|---|
| ⌘1–⌘8 | Go to the Nth space |
| ⌘9 | Go to the last space |
| ⌘T | New space |
| ⌘W | Close the split, else the tab, else the space |
| ⌘⇧[ / ⌘⇧] | Previous / next space |
| ⌘J | Next agent that needs you |
| ⌘` or ⌘⇧H | Home page |
| ⌘↵ (on Home) | Start the worktree |
| Ctrl+1–9 | Inner tabs of a space |

## Install

```sh
cd ~/.config/herdr-app
git init && git remote add origin https://github.com/im-cynthialim/herdr-config.git
git fetch && git checkout -f -t origin/main
```

Then pick the `worktrees` layout (⌃⇧L).
