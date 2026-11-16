(() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    text: $("text"),
    logo: $("logo"),
    removeLogo: $("remove-logo"),
    logoSize: $("logo-size"),
    logoSizeOut: $("logo-size-out"),
    logoName: $("logo-name"),
    dotTypes: document.querySelectorAll('input[name="dot-type"]'),
    fg: $("fg"),
    bg: $("bg"),
    warning: $("contrast-warning"),
    dlPng: $("dl-png"),
    dlSvg: $("dl-svg"),
    qr: $("qr"),
    placeholder: $("placeholder"),
  };

  const SIZE = 300;
  const SETTINGS_KEY = "qr-generator:settings";
  const LOGO_KEY = "qr-generator:logo";
  let logoDataUrl = null;
  let logoName = "";

  // localStorage can throw (private mode, blocked, quota): always guard.
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  const getDotType = () => [...el.dotTypes].find((r) => r.checked)?.value || "square";
  const setDotType = (v) => el.dotTypes.forEach((r) => { r.checked = r.value === v; });

  const loadSettings = () => {
    try {
      const s = JSON.parse(store.get(SETTINGS_KEY) || "{}");
      if (typeof s.text === "string") el.text.value = s.text;
      if (typeof s.logoSize === "string") el.logoSize.value = s.logoSize;
      if (typeof s.fg === "string") el.fg.value = s.fg;
      if (typeof s.bg === "string") el.bg.value = s.bg;
      if (typeof s.dotType === "string") setDotType(s.dotType);
    } catch { /* corrupt data: use defaults */ }
    logoDataUrl = store.get(LOGO_KEY);
  };

  const saveSettings = () => {
    store.set(SETTINGS_KEY, JSON.stringify({
      text: el.text.value,
      logoSize: el.logoSize.value,
      fg: el.fg.value,
      bg: el.bg.value,
      dotType: getDotType(),
    }));
    if (logoDataUrl) store.set(LOGO_KEY, logoDataUrl);
    else store.del(LOGO_KEY);
  };

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
    el.logoName.textContent = logoName || (logoDataUrl ? "Logo guardado" : "Sin logo");
    el.logoSizeOut.textContent = `${el.logoSize.value}%`;
    el.warning.hidden = !lowContrast();

    saveSettings();
    if (!hasText) return;
    qr.update({
      data: text,
      image: logoDataUrl || undefined,
      imageOptions: { imageSize: el.logoSize.value / 100 },
      dotsOptions: { color: el.fg.value, type: getDotType() },
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
  el.dotTypes.forEach((r) => r.addEventListener("change", render));

  el.logo.addEventListener("change", () => {
    const file = el.logo.files[0];
    if (!file) return;
    logoName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      logoDataUrl = reader.result;
      render();
    };
    reader.readAsDataURL(file);
  });

  el.removeLogo.addEventListener("click", () => {
    logoDataUrl = null;
    logoName = "";
    el.logo.value = "";
    render();
  });

  el.dlPng.addEventListener("click", () => qr.download({ name: "qr", extension: "png" }));
  el.dlSvg.addEventListener("click", () => qr.download({ name: "qr", extension: "svg" }));

  loadSettings();
  render();
})();
