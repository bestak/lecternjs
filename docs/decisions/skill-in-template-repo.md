# The Claude skill ships inside the template repo

The repo is its own plugin marketplace (`.claude-plugin/`). The `lectern` plugin has one skill, `/lectern:new`. It copies the template from the installed plugin and fills `index.html`.

Why: one public repo holds the template and the skill. They cannot drift apart. The skill names `motion-design:motion-design` only as a soft reference, so it works without it.

Scope: new decks only. Edit an existing deck with plain Claude Code.
