(() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    preset: $("preset"),
    text: $("text"),
    logo: $("logo"),
    removeLogo: $("remove-logo"),
    logoSize: $("logo-size"),
    logoSizeOut: $("logo-size-out"),
    logoName: $("logo-name"),
    dotTypes: document.querySelectorAll('input[name="dot-type"]'),
    fg: $("fg"),
    bg: $("bg"),
    gradient: $("gradient"),
    gradientOpts: $("gradient-opts"),
    fg2: $("fg2"),
    gradType: $("grad-type"),
    cornerSq: $("corner-sq"),
    cornerDot: $("corner-dot"),
    cornerColorOn: $("corner-color-on"),
    cornerColor: $("corner-color"),
    exportSize: $("export-size"),
    exportSizeOut: $("export-size-out"),
    warning: $("contrast-warning"),
    format: $("format"),
    download: $("download"),
    copy: $("copy"),
    reset: $("reset"),
    theme: $("theme"),
    status: $("status"),
    qr: $("qr"),
    placeholder: $("placeholder"),
    panels: document.querySelectorAll(".panel[data-preset]"),
  };

  const SIZE = 300;
  const SETTINGS_KEY = "qr-generator:settings";
  const LOGO_KEY = "qr-generator:logo";
  const THEME_KEY = "qr-generator:theme";
  let logoDataUrl = null;
  let logoName = "";

  // Inputs persisted by id. Checkboxes use `checked`, the rest use `value`.
  const PERSISTED = [
    "preset", "text", "logo-size", "fg", "bg", "gradient", "fg2", "grad-type",
    "corner-sq", "corner-dot", "corner-color-on", "corner-color", "export-size",
    "wifi-ssid", "wifi-pass", "wifi-enc", "wifi-hidden",
    "vc-name", "vc-org", "vc-phone", "vc-email", "vc-url",
    "mail-to", "mail-subject", "mail-body", "tel-number",
    "sms-number", "sms-body", "wa-number", "wa-text", "geo-lat", "geo-lon",
    "ev-title", "ev-start", "ev-end", "ev-loc", "format",
  ].map((id) => $(id));
  const isCheck = (i) => i.type === "checkbox";

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
      PERSISTED.forEach((i) => {
        if (isCheck(i)) { if (typeof s[i.id] === "boolean") i.checked = s[i.id]; }
        else if (typeof s[i.id] === "string") i.value = s[i.id];
      });
      if (typeof s.dotType === "string") setDotType(s.dotType);
    } catch { /* corrupt data: use defaults */ }
    logoDataUrl = store.get(LOGO_KEY);
  };

  const saveSettings = () => {
    const s = { dotType: getDotType() };
    PERSISTED.forEach((i) => { s[i.id] = isCheck(i) ? i.checked : i.value; });
    store.set(SETTINGS_KEY, JSON.stringify(s));
    if (logoDataUrl) store.set(LOGO_KEY, logoDataUrl);
    else store.del(LOGO_KEY);
  };

  // ---- Content builders (one per preset) ----
  const v = (id) => $(id).value.trim();
  const escWifi = (s) => s.replace(/([\\;,:"])/g, "\\$1");
  const escVcard = (s) => s.replace(/([\\;,])/g, "\\$1").replace(/\r?\n/g, "\\n");

  const builders = {
    text: () => el.text.value.trim(),
    wifi: () => {
      const ssid = v("wifi-ssid");
      if (!ssid) return "";
      const enc = $("wifi-enc").value;
      const pass = enc === "nopass" ? "" : escWifi($("wifi-pass").value);
      const hidden = $("wifi-hidden").checked ? "H:true;" : "";
      return `WIFI:T:${enc};S:${escWifi(ssid)};${enc === "nopass" ? "" : `P:${pass};`}${hidden};`;
    },
    vcard: () => {
      const name = v("vc-name");
      if (!name) return "";
      const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escVcard(name)}`];
      if (v("vc-org")) lines.push(`ORG:${escVcard(v("vc-org"))}`);
      if (v("vc-phone")) lines.push(`TEL:${v("vc-phone")}`);
      if (v("vc-email")) lines.push(`EMAIL:${v("vc-email")}`);
      if (v("vc-url")) lines.push(`URL:${v("vc-url")}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    },
    email: () => {
      const to = v("mail-to");
      if (!to) return "";
      const q = [];
      if (v("mail-subject")) q.push(`subject=${encodeURIComponent(v("mail-subject"))}`);
      if (v("mail-body")) q.push(`body=${encodeURIComponent(v("mail-body"))}`);
      return `mailto:${to}${q.length ? `?${q.join("&")}` : ""}`;
    },
    tel: () => {
      const n = v("tel-number").replace(/[^\d+]/g, "");
      return n ? `tel:${n}` : "";
    },
    sms: () => {
      const n = v("sms-number").replace(/[^\d+]/g, "");
      return n ? `SMSTO:${n}:${$("sms-body").value.trim()}` : "";
    },
    whatsapp: () => {
      const n = v("wa-number").replace(/\D/g, "");
      if (!n) return "";
      const t = $("wa-text").value.trim();
      return `https://wa.me/${n}${t ? `?text=${encodeURIComponent(t)}` : ""}`;
    },
    geo: () => {
      const lat = parseFloat(v("geo-lat").replace(",", "."));
      const lon = parseFloat(v("geo-lon").replace(",", "."));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "";
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return "";
      return `geo:${lat},${lon}`;
    },
    event: () => {
      const title = v("ev-title");
      const start = v("ev-start");
      if (!title || !start) return "";
      // datetime-local "2026-11-16T10:00" -> floating time "20261116T100000"
      const ics = (d) => d.replace(/[-:]/g, "").padEnd(15, "0");
      const end = v("ev-end");
      const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `SUMMARY:${escVcard(title)}`, `DTSTART:${ics(start)}`];
      if (end) lines.push(`DTEND:${ics(end)}`);
      if (v("ev-loc")) lines.push(`LOCATION:${escVcard(v("ev-loc"))}`);
      lines.push("END:VEVENT", "END:VCALENDAR");
      return lines.join("\n");
    },
  };
  const getData = () => (builders[el.preset.value] || builders.text)();

  // ---- QR options ----
  const buildOptions = (extra = {}) => {
    const grad = el.gradient.checked;
    return {
      data: getData() || " ",
      image: logoDataUrl || undefined,
      imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: el.logoSize.value / 100 },
      qrOptions: { errorCorrectionLevel: "H" },
      dotsOptions: {
        type: getDotType(),
        color: el.fg.value,
        gradient: grad
          ? {
              type: el.gradType.value,
              rotation: Math.PI / 4,
              colorStops: [
                { offset: 0, color: el.fg.value },
                { offset: 1, color: el.fg2.value },
              ],
            }
          : undefined,
      },
      cornersSquareOptions: {
        type: el.cornerSq.value || undefined,
        color: el.cornerColorOn.checked ? el.cornerColor.value : undefined,
      },
      cornersDotOptions: {
        type: el.cornerDot.value || undefined,
        color: el.cornerColorOn.checked ? el.cornerColor.value : undefined,
      },
      backgroundOptions: { color: el.bg.value },
      ...extra,
    };
  };

  const qr = new QRCodeStyling({ width: SIZE, height: SIZE, type: "canvas", ...buildOptions({ data: " " }) });
  qr.append(el.qr);

  // Contrast: relative luminance. QR must be darker than background.
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const lowContrast = () => {
    const colors = [el.fg.value];
    if (el.gradient.checked) colors.push(el.fg2.value);
    if (el.cornerColorOn.checked) colors.push(el.cornerColor.value);
    const lb = luminance(el.bg.value);
    // Worst case = lightest foreground color.
    const lf = Math.max(...colors.map(luminance));
    return lb <= lf || (lb + 0.05) / (lf + 0.05) < 3;
  };

  const render = () => {
    const hasData = getData().length > 0;

    el.panels.forEach((p) => { p.hidden = p.dataset.preset !== el.preset.value; });
    el.gradientOpts.hidden = !el.gradient.checked;
    el.cornerColor.disabled = !el.cornerColorOn.checked;

    el.qr.hidden = !hasData;
    el.placeholder.hidden = hasData;
    el.download.disabled = el.copy.disabled = !hasData;
    el.removeLogo.disabled = !logoDataUrl;
    el.logoName.textContent = logoName || (logoDataUrl ? "Logo guardado" : "Sin logo");
    el.logoSizeOut.textContent = `${el.logoSize.value}%`;
    el.exportSizeOut.textContent = el.exportSize.value;
    el.warning.hidden = !lowContrast();

    saveSettings();
    if (!hasData) return;
    qr.update(buildOptions());
  };

  let timer;
  const debounced = () => {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  };

  PERSISTED.forEach((i) => {
    if (i.id === "logo") return;
    const textual = ["text", "textarea"].includes(i.type) || i.tagName === "TEXTAREA";
    i.addEventListener(isCheck(i) || i.tagName === "SELECT" ? "change" : "input", textual ? debounced : render);
  });
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

  // Export from a throwaway instance at the chosen size; preview stays untouched.
  const exportQr = (extension) => {
    const size = Number(el.exportSize.value);
    return new QRCodeStyling({
      width: size,
      height: size,
      type: extension === "svg" ? "svg" : "canvas",
      ...buildOptions(),
    });
  };

  let statusTimer;
  const say = (msg) => {
    el.status.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { el.status.textContent = ""; }, 2500);
  };

  el.download.addEventListener("click", () => {
    const ext = el.format.value;
    exportQr(ext).download({ name: "qr", extension: ext });
  });

  el.copy.addEventListener("click", async () => {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      say("Tu navegador no permite copiar imágenes.");
      return;
    }
    try {
      // Promise form keeps the user-gesture valid in Safari.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": exportQr("png").getRawData("png") }),
      ]);
      say("Imagen copiada.");
    } catch {
      say("No se pudo copiar la imagen.");
    }
  });

  el.reset.addEventListener("click", () => {
    if (!confirm("¿Restablecer todos los ajustes?")) return;
    store.del(SETTINGS_KEY);
    store.del(LOGO_KEY);
    location.reload();
  });

  // Theme: auto (follow OS) -> light -> dark.
  const THEMES = ["auto", "light", "dark"];
  const LABELS = { auto: "Auto", light: "Claro", dark: "Oscuro" };
  const ICONS = {
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
  };
  const applyTheme = (t) => {
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    el.theme.innerHTML = `${ICONS[t]}<span>${LABELS[t]}</span>`;
    el.theme.setAttribute("aria-label", `Tema: ${LABELS[t]}. Pulsa para cambiar`);
  };
  let theme = THEMES.includes(store.get(THEME_KEY)) ? store.get(THEME_KEY) : "auto";
  applyTheme(theme);
  el.theme.addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    store.set(THEME_KEY, theme);
    applyTheme(theme);
  });

  loadSettings();
  render();
})();
