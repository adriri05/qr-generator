# qr-generator

Generador de QR con imagen/logo en el centro. Web estática, sin build ni backend. Todo corre en el navegador.

## Uso

Abrir `index.html` en el navegador (o `npx serve .`).

1. Elige tipo (texto/URL, WiFi, vCard, email, teléfono) y rellena los datos.
2. (Opcional) sube un logo y ajusta tamaño.
3. Elige colores, degradado y estilo de esquinas.
4. Elige tamaño y formato (PNG, JPEG, WEBP, SVG) y descarga o copia la imagen.

Corrección de errores seleccionable (L/M/Q/H, por defecto H). Con logo usa Q o H. Si un QR no escanea, baja el tamaño del logo.

## Stack

- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) 1.9.2 vía jsDelivr.
- [JSZip](https://stuk.github.io/jszip/) 3.10.1 vía jsDelivr (lotes).
- [jsQR](https://github.com/cozmo/jsQR) 1.4.0 vía jsDelivr (verificador de lectura).

## Roadmap

- [x] Forma de puntos (`dotsOptions.type`)
- [x] Estilo/color de esquinas (`cornersSquareOptions`, `cornersDotOptions`)
- [x] Gradientes
- [x] Presets: WiFi, vCard, email, teléfono
- [x] Tamaño de exportación configurable
- [x] Persistir ajustes en `localStorage` (texto, logo, tamaño, colores, forma)
- [x] Deploy GitHub Pages / Vercel
- [x] Copiar imagen al portapapeles
- [x] Presets: SMS, WhatsApp, ubicación, evento de calendario
- [x] Botón de restablecer ajustes
- [x] Tema claro/oscuro manual
- [x] Descarga en JPEG/WEBP
- [ ] Logo con fondo propio (círculo/cuadrado) y forma redonda
- [x] Margen (quiet zone) configurable
- [ ] Imagen de fondo o texto debajo del QR
- [x] Nivel de corrección de errores seleccionable (L/M/Q/H)
- [x] Aviso si el contenido es demasiado largo para escanear bien
- [x] Generación por lotes desde CSV (descarga en ZIP)
- [ ] PWA instalable y offline (alojar `qr-code-styling` en local)
- [x] Verificador de lectura del QR generado (`jsQR`)
- [x] Plantillas guardadas de estilos
- [ ] Tests e2e con Playwright
