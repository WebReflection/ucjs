# ucjs

A minimalist ESM to CJS transformer.

```sh
# npx ucjs --help
usage:
  ucjs source.js dest.js
  ucjs --no-interop source_dir dest_dir
options:
  --no-interop  # avoid import/export related bloat
  --no-default  # alias for --no-interop
```
