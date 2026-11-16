# qr-generator

Generador de QR con imagen/logo en el centro. Web estática, sin build ni backend. Todo corre en el navegador.

## Uso

Abrir `index.html` en el navegador (o `npx serve .`).

1. Escribe texto o URL.
2. (Opcional) sube un logo y ajusta tamaño.
3. Elige colores.
4. Descarga PNG o SVG.

Corrección de errores nivel H fijo para que el logo no rompa la lectura. Si un QR no escanea, baja el tamaño del logo.

## Stack

- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) 1.9.2 vía jsDelivr.

## Roadmap

- [ ] Forma de puntos (`dotsOptions.type`)
- [ ] Estilo/color de esquinas (`cornersSquareOptions`, `cornersDotOptions`)
- [ ] Gradientes
- [ ] Presets: WiFi, vCard, email, teléfono
- [ ] Tamaño de exportación configurable
- [ ] Persistir ajustes en `localStorage`
- [ ] Deploy GitHub Pages / Vercel
