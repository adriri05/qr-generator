(() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    text: $("text"),
    logo: $("logo"),
    removeLogo: $("remove-logo"),
    logoSize: $("logo-size"),
    logoSizeOut: $("logo-size-out"),
    fg: $("fg"),
    bg: $("bg"),
    warning: $("contrast-warning"),
    dlPng: $("dl-png"),
    dlSvg: $("dl-svg"),
    qr: $("qr"),
    placeholder: $("placeholder"),
  };

  const SIZE = 300;
  let logoDataUrl = null;

  const qr = new QRCodeStyling({
    width: SIZE,
    height: SIZE,
    type: "canvas",
    data: " ",
    qrOptions: { errorCorrectionLevel: "H" },
    imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: 0.3 },
    dotsOptions: { color: "#000000" },
    backgroundOptions: { color: "#ffffff" },
  });
  qr.append(el.qr);

  // Contrast: relative luminance. QR must be darker than background.
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const lowContrast = () => {
    const lf = luminance(el.fg.value);
    const lb = luminance(el.bg.value);
    return lb <= lf || (lb + 0.05) / (lf + 0.05) < 3;
  };

  const render = () => {
    const text = el.text.value.trim();
    const hasText = text.length > 0;

    el.qr.hidden = !hasText;
    el.placeholder.hidden = hasText;
    el.dlPng.disabled = el.dlSvg.disabled = !hasText;
    el.removeLogo.disabled = !logoDataUrl;
    el.logoSizeOut.textContent = `${el.logoSize.value}%`;
    el.warning.hidden = !lowContrast();

    if (!hasText) return;
    qr.update({
      data: text,
      image: logoDataUrl || undefined,
      imageOptions: { imageSize: el.logoSize.value / 100 },
      dotsOptions: { color: el.fg.value },
      backgroundOptions: { color: el.bg.value },
    });
  };

  let timer;
  const debounced = () => {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  };

  el.text.addEventListener("input", debounced);
  [el.logoSize, el.fg, el.bg].forEach((i) => i.addEventListener("input", render));

  el.logo.addEventListener("change", () => {
    const file = el.logo.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      logoDataUrl = reader.result;
      render();
    };
    reader.readAsDataURL(file);
  });

  el.removeLogo.addEventListener("click", () => {
    logoDataUrl = null;
    el.logo.value = "";
    render();
  });

  el.dlPng.addEventListener("click", () => qr.download({ name: "qr", extension: "png" }));
  el.dlSvg.addEventListener("click", () => qr.download({ name: "qr", extension: "svg" }));

  render();
})();
