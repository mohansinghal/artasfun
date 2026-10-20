# ArtAsFun

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Optimize gallery images

Install the image optimization dependency and run the script from the project root:

```powershell
py -m pip install -r requirements-image-optimization.txt
py optimize_images.py
```

The script first resizes originals in `public/images` that exceed 2560 pixels on either side, replacing those files in place. It then creates gallery copies in the matching `public/images-small` subfolders, resized to fit within 800 × 800 pixels. It uses JPEG quality 88 for resized originals and 76 for gallery copies; PNG files retain their format. Up-to-date gallery copies are reused.

Use `py optimize_images.py --help` to see options for custom source/output folders, maximum dimensions, and JPEG quality settings.

## Deploy to GitHub Pages

Build and publish the site with:

```powershell
npm run deploy
```

The production build targets the `/artasfun/` repository path and includes a
404 fallback for client-side routes. Configure the repository's Pages source
to the `gh-pages` branch at the root.
