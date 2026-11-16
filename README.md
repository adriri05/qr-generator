# qr-generator

Generador de QR con imagen/logo en el centro. Web estática, sin build ni backend. Todo corre en el navegador.

## Uso

Abrir `index.html` en el navegador (o `npx serve .`).

1. Elige tipo (texto/URL, WiFi, vCard, email, teléfono) y rellena los datos.
2. (Opcional) sube un logo y ajusta tamaño.
3. Elige colores, degradado y estilo de esquinas.
4. Elige tamaño de exportación y descarga PNG o SVG.

Corrección de errores nivel H fijo para que el logo no rompa la lectura. Si un QR no escanea, baja el tamaño del logo.

## Stack

- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) 1.9.2 vía jsDelivr.

## Roadmap

- [x] Forma de puntos (`dotsOptions.type`)
- [x] Estilo/color de esquinas (`cornersSquareOptions`, `cornersDotOptions`)
- [x] Gradientes
- [x] Presets: WiFi, vCard, email, teléfono
- [x] Tamaño de exportación configurable
- [x] Persistir ajustes en `localStorage` (texto, logo, tamaño, colores, forma)
- [x] Deploy GitHub Pages / Vercel
