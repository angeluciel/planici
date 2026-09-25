---
owner: design-analyst
sources:
  - apps/web/src/styles/**
  - apps/web/src/components/**
verified_at: 375b5d9
---
# Design system — context card

Figma: https://www.figma.com/design/rWWne0gLS6YsVEuz4c7Amg/Planici

## Token layers (apps/web/src/styles/tokens/)
primitives.css -> semantic/{background,text,border,icon}.css -> components/text.css; typography.css, elevation.css.
Components consume **semantic** tokens only.

## TODO (design-analyst)
On first refresh: table of Figma variable name -> CSS token; table of Figma component -> src/components file.
