# ivy-logo-font

This `ivy-logo.woff` file contains a single glyph, depicting the `ivy-logo-black-background.svg`.
The `ivy-logo.css` file is only here as a reference to the fontCharacter which is needed to reference the glyph in the `package.json`.
The logo is referenced in `package.json` in

```json
"contributes": {
    "icons": ...
}
```

## Where is it used

- Status bar custom logo

## How to replace the icon

This version is hardcoded, so changing the svg will require you to regenerate the font from the svg file and update the package.json
A more robust implementation via a custom font and a dynamic update of the package.json is currently not implemented.
