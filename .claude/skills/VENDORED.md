# Vendored skills

Eleven skills in this directory come from outside this repository, from two different sources.
The other five (`spec-workflow`, `cqrs-command`, `api-contract`, `drizzle-migration`,
`figma-to-component`) belong to Planici.

Do not edit any vendored file in place; a local change turns every update into a merge.
Planici-specific overrides go in a skill of our own.

## 1. Design-engineering and animation skills — Emil Kowalski

| | |
| --- | --- |
| Source | https://github.com/emilkowalski/skills |
| Commit | `c8a79627b59d72d764d6ab6f2c87c09a48169833` (2026-11-04) |
| Licence | MIT, Copyright (c) 2026 Emil Kowalski — reproduced below |
| Author | Emil Kowalski — https://emilkowal.ski, https://animations.dev |

Copied from upstream: `emil-design-eng`, `animate`, `animation-vocabulary`,
`find-animation-opportunities`, `improve-animations`, `review-animations`.

Upstream lays each skill out as `skills/<name>/`. Emil Kowalski wrote these skills himself and
released them under MIT; they encode his design-engineering and animation philosophy, and the
exact durations, easing curves and craft bar they cite come from his writing and his
animations.dev course — notably
["You Don't Need Animations"](https://emilkowal.ski/ui/you-dont-need-animations), which is the
premise of `find-animation-opportunities`.

Every one of these skills opens by naming him out loud ("my knowledge comes from Emil Kowalski's
animation philosophy"). Keep that line intact on update: it is the attribution, and the MIT notice
requires the copyright notice to travel with the copies.

What each one is for: `emil-design-eng` covers UI polish, component design and the invisible
details. The animation skills split the work into build (`animate` for web, `animate-expo` for
React Native), discovery (`find-animation-opportunities`), codebase audit (`improve-animations`),
diff review (`review-animations`), and naming (`animation-vocabulary`, a reverse-lookup glossary
that turns "the bouncy thing when a popover opens" into "pop in").

Upstream ships ten more that are not vendored here: `animation-performance`, `apple-design`,
`ask-sonner`, `break-ui`, `choreograph`, `mobile-native`, `pick-ui-library`, `prototype`,
`remove-animations`, `write-swift`.

Nothing here implies Emil Kowalski's involvement in or endorsement of Planici.

All seven directories were verified byte-identical to upstream at the commit above
(`diff -r` against a clean clone, 2026-11-06). Re-run that diff after any update.

Planici has no React Native target, so `animate-expo` is vendored but out of scope; nothing in
this repository should invoke it. It is a candidate to drop on the next pass.

### Updating

Clone the source, copy each `skills/<name>/` directory over the copy here, and change the commit
hash above in the same commit.

## 2. Engineering-practice skills — Jesse Vincent's superpowers

| | |
| --- | --- |
| Source | https://github.com/obra/superpowers |
| Commit | `22f0b463e7a5e579904dd6211a520321035526f7` (2026-11-03) |
| Licence | MIT, Copyright (c) 2025 Jesse Vincent — reproduced below |

Copied unchanged: `verification-before-completion`, `systematic-debugging`,
`test-driven-development`, `receiving-code-review`.

They mention `superpowers:<skill>` names; here the same skills are invoked without the prefix.

The rest of that collection (brainstorming, writing-plans, executing-plans,
subagent-driven-development, using-git-worktrees, finishing-a-development-branch) is deliberately
left out: it runs its own plan/branch/commit flow, which competes with `/plan`, `/implement` and
the owner-only commit rule.

### Updating

Same procedure as above, against the superpowers commit hash.

## Licences

### Emil Kowalski skills

```
MIT License

Copyright (c) 2026 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### superpowers skills

```
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
