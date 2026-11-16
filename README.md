# qr-generator

A static QR code generator with a center logo, custom styling and batch export. No build step, no backend: everything runs in your browser and nothing is uploaded anywhere.

The interface is available in **English** and **Spanish** (switch with the language button in the header).

## Features

- **Content types:** plain text / URL, WiFi, vCard contact, email, phone, SMS, WhatsApp, geo location and calendar event.
- **Center logo** with adjustable size.
- **Composition:** optional background image and a caption below the QR. The QR always sits on a solid panel in the background color so it stays scannable.
- **Style:** six dot shapes, foreground/background colors, linear or radial gradient, corner frame/center styles and an optional corner color.
- **Quality:** selectable error correction level (L/M/Q/H) and configurable margin (quiet zone).
- **Templates:** save, apply and delete named styles.
- **Export:** PNG, JPEG, WEBP or SVG at 300–2000 px, or copy the image to the clipboard.
- **Batch mode:** generate one QR per CSV row and download them as a ZIP.
- **Safety nets:** warnings for low contrast, logos with a weak error correction level and content that is too long, plus a read check that only appears when the QR cannot be decoded.
- **Settings persistence** in `localStorage`, light/dark/auto theme and a pinned preview while you scroll the controls.

## Usage

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

1. Pick a content type and fill in the data.
2. (Optional) add a logo, a background image or a caption.
3. Choose colors, dot shape, gradient and corner style.
4. Pick the error correction level and margin.
5. Choose the export size and format, then download or copy the image.

If a QR does not scan, lower the logo size, raise the contrast, simplify the style or raise the error correction level.

### Content types

| Type | Generated content |
| --- | --- |
| Text / URL | The text as is |
| WiFi | `WIFI:T:<WPA\|WEP\|nopass>;S:<ssid>;P:<password>;H:true;;` (special characters escaped) |
| vCard | vCard 3.0 with name, company, phone, email and website |
| Email | `mailto:<to>?subject=...&body=...` |
| Phone | `tel:<number>` |
| SMS | `SMSTO:<number>:<message>` |
| WhatsApp | `https://wa.me/<number>?text=...` |
| Location | `geo:<lat>,<lon>` (latitude ±90, longitude ±180) |
| Event | iCalendar `VEVENT` with title, start, end and place (floating local time) |

### Error correction and capacity

| Level | Recovers | Max content (bytes) |
| --- | --- | --- |
| L | 7% | 2953 |
| M | 15% | 2331 |
| Q | 25% | 1663 |
| H | 30% | 1273 |

Content is measured in UTF-8 bytes. Above 300 bytes (200 with a logo) the QR gets dense and a warning is shown. Beyond the maximum for the selected level the QR is not generated. With a logo, use level Q or H (H is the default).

### Composition

- **Background image:** covers a square canvas; the QR sits centered on a rounded panel (72% of the width) in the QR background color. The image is downscaled to 1600 px and stored as JPEG.
- **Caption:** up to 60 characters, drawn below the QR in the QR color and shrunk to fit.
- With only a caption (no background image), the output is the QR plus a caption strip, so the image is not square.

### Templates

A template stores the dot shape, colors, gradient, corners, error correction level, margin, logo size and, optionally, the logo. It does not store the content, content type, composition, export size or format. Templates live in `localStorage` and are not cleared by **Reset**.

### Batch mode

Paste CSV text or load a `.csv` / `.txt` file. One QR is generated per row using the current style, size and format, and the result is downloaded as `qr-batch.zip`.

- **One column:** the content. Files are named `qr-001`, `qr-002`, ...
- **Two or more columns:** `name,content`. Extra columns are joined back into the content, so commas inside content are fine.
- Quoted fields (`"..."` with `""` as an escaped quote), `,` or `;` as delimiter, a BOM and an optional header row (`name,content`, `url`, ...) are supported.
- File names are sanitized and duplicates get `-2`, `-3`, ...
- Rows that exceed the QR capacity are skipped and listed when the run finishes.
- Maximum 500 rows per run. Batch mode treats each row as literal text; it does not apply the WiFi, vCard, etc. presets.

```csv
name,content
website,https://example.com
docs,https://example.com/docs
"with, comma","https://example.com/a,b"
```

### Read check

After every change the rendered QR (including the composition) is decoded with jsQR and compared with the source content. A message appears only when it cannot be read or the decoded content differs. A pass is not a guarantee for every phone, and a fail on a heavily styled QR can be a false negative.

## Privacy

Everything runs locally. The only network requests are the three libraries loaded from jsDelivr. The following keys are stored in the browser's `localStorage`:

| Key | Content |
| --- | --- |
| `qr-generator:settings` | Current form values (including the content you typed) |
| `qr-generator:logo` | Center logo (data URL) |
| `qr-generator:background` | Background image (data URL) |
| `qr-generator:templates` | Saved style templates |
| `qr-generator:theme` | `auto`, `light` or `dark` |
| `qr-generator:lang` | `en` or `es` |

**Reset** clears the settings, logo and background image (not templates, theme or language).

## Project structure

```
.
├── index.html          # Markup; text lives in data-i18n attributes
├── css/style.css       # Styles, light/dark themes, responsive layout
├── assets/             # App icon (icon.jpg) and the favicon sizes derived from it
├── js/
│   ├── i18n.js         # English/Spanish dictionaries and helpers
│   └── app.js          # All application logic
└── .github/workflows/
    └── static.yml      # GitHub Pages deployment
```

`js/app.js` is organized in sections: content builders, QR options, composition and export (`renderFinal`), read verifier, theme, templates, batch and language.

## Stack

- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) 1.9.2 — QR rendering and styling
- [jsQR](https://github.com/cozmo/jsQR) 1.4.0 — read check
- [JSZip](https://stuk.github.io/jszip/) 3.10.1 — batch ZIP

All are loaded from jsDelivr. Vanilla JavaScript, no framework and no bundler.

## Internationalization

The language is chosen in this order: saved choice, browser language (`es*` → Spanish) and English by default.

- Static text: add `data-i18n="key"` (text), `data-i18n-html` (trusted HTML), `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria` or `data-i18n-alt` to the element.
- Dynamic text: call `I18N.t("key", { param: value })`.
- Add a language: add a dictionary to `DICT` in [js/i18n.js](js/i18n.js), add its code to `LANGS` and update the language toggle in `js/app.js`. Missing keys fall back to English.

## Deployment

Pushing to `main` deploys the repository root to GitHub Pages through [static.yml](.github/workflows/static.yml). Enable **Settings → Pages → Source: GitHub Actions** once. Any static host works as well.

Asset URLs carry a `?v=` query string (`style.css?v=16`, `app.js?v=16`). Bump it when you change those files to bypass caches.

## Browser support

Any modern browser with ES2020, `canvas`, `createImageBitmap` and CSS `color-mix()`/`:has()` (Chrome, Edge, Firefox and Safari from 2023). Copying images to the clipboard needs the async Clipboard API with `ClipboardItem` and a secure context (HTTPS or `localhost`).
