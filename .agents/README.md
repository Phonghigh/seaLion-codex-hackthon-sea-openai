# Repository skills

Project-local skills are checked into `skills/`, including their supporting references,
scripts, and Codex invocation policies.

- [Matt Pocock's skills](https://github.com/mattpocock/skills): all 27 published
  engineering and productivity skills from the upstream plugin manifest. The misc,
  in-progress, and deprecated collections are excluded.
- [Impeccable](https://github.com/pbakaus/impeccable): the upstream Codex build of the
  `impeccable` skill, including its design commands and supporting files.

Exact upstream revisions and source paths are recorded in `skills-sources.json`.
Upstream license and notice files are preserved under `licenses/`.

## Use

The installed skills are available to Codex on the next turn. For example:

- `$ask-matt` to choose an engineering workflow.
- `$setup-matt-pocock-skills` to configure the issue tracker and documentation
  conventions before using the engineering workflows.
- `$impeccable init` to configure product context before design work.
- `$impeccable critique` or `$impeccable polish` to review or refine an interface.

This installation vendors the skills only. Impeccable's optional design hooks are
not installed. Its runtime scripts may download the engine on first use.

## Update

Update deliberately from the upstream repositories: replace each skill's complete
directory from its recorded source path, preserve its supporting files, refresh
the license files, and update the pinned revision in `skills-sources.json`.
For Matt Pocock's published collection, also compare the upstream plugin manifest
to account for added or removed skills.
