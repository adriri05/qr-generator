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
    margin: $("margin"),
    marginOut: $("margin-out"),
    exportSize: $("export-size"),
    exportSizeOut: $("export-size-out"),
    ecc: $("ecc"),
    eccWarning: $("ecc-warning"),
    lengthWarning: $("length-warning"),
    verify: $("verify"),
    batchFile: $("batch-file"),
    batchText: $("batch-text"),
    batchInfo: $("batch-info"),
    batchRun: $("batch-run"),
    batchStatus: $("batch-status"),
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
  // Max bytes in QR version 40 (byte mode) per error correction level.
  const MAX_BYTES = { L: 2953, M: 2331, Q: 1663, H: 1273 };
  const encoder = new TextEncoder();
  const PLACEHOLDER_DEFAULT = $("placeholder").textContent;
  const SETTINGS_KEY = "qr-generator:settings";
  const LOGO_KEY = "qr-generator:logo";
  const THEME_KEY = "qr-generator:theme";
  let logoDataUrl = null;
  let logoName = "";

  // Inputs persisted by id. Checkboxes use `checked`, the rest use `value`.
  const PERSISTED = [
    "preset", "text", "logo-size", "ecc", "fg", "bg", "gradient", "fg2", "grad-type",
    "corner-sq", "corner-dot", "corner-color-on", "corner-color", "export-size", "margin",
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
  const buildOptions = (extra = {}, size = SIZE) => {
    const grad = el.gradient.checked;
    return {
      margin: Math.round((size * el.margin.value) / 100),
      data: getData() || " ",
      image: logoDataUrl || undefined,
      imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: el.logoSize.value / 100 },
      qrOptions: { errorCorrectionLevel: el.ecc.value },
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

  // Returns {bytes, max, tooLong, dense} for the current content.
  const lengthInfo = (data) => {
    const bytes = encoder.encode(data).length;
    const max = MAX_BYTES[el.ecc.value];
    const softLimit = logoDataUrl ? 200 : 300;
    return { bytes, max, tooLong: bytes > max, dense: bytes > softLimit };
  };

  const render = () => {
    const data = getData();
    const info = lengthInfo(data);
    const hasData = data.length > 0 && !info.tooLong;

    el.panels.forEach((p) => { p.hidden = p.dataset.preset !== el.preset.value; });
    el.gradientOpts.hidden = !el.gradient.checked;
    el.cornerColor.disabled = !el.cornerColorOn.checked;

    el.qr.hidden = !hasData;
    el.placeholder.hidden = hasData;
    el.placeholder.textContent = info.tooLong ? "Contenido demasiado largo para generar el QR" : PLACEHOLDER_DEFAULT;
    el.download.disabled = el.copy.disabled = !hasData;
    el.removeLogo.disabled = !logoDataUrl;
    el.logoName.textContent = logoName || (logoDataUrl ? "Logo guardado" : "Sin logo");
    el.logoSizeOut.textContent = `${el.logoSize.value}%`;
    el.exportSizeOut.textContent = el.exportSize.value;
    el.marginOut.textContent = el.margin.value;
    el.warning.hidden = !lowContrast();
    el.eccWarning.hidden = !(logoDataUrl && "LM".includes(el.ecc.value));

    el.lengthWarning.hidden = !(info.tooLong || info.dense);
    el.lengthWarning.classList.toggle("error", info.tooLong);
    el.lengthWarning.textContent = info.tooLong
      ? `Contenido demasiado largo (${info.bytes} bytes, máximo ${info.max} con nivel ${el.ecc.value}). Acórtalo o baja el nivel de corrección.`
      : `Contenido largo (${info.bytes} bytes): el QR será muy denso y puede costar escanearlo. Acórtalo o exporta a mayor tamaño.`;

    saveSettings();
    if (!hasData) { verifyId++; el.verify.hidden = true; return; }
    qr.update(buildOptions());
    verify(data);
  };

  // Read verifier: decode the rendered QR with jsQR and compare to the source data.
  let verifyId = 0;
  const showVerify = (cls, msg) => {
    el.verify.hidden = false;
    el.verify.className = `verify ${cls}`.trim();
    el.verify.textContent = msg;
  };
  const verify = async (expected) => {
    const id = ++verifyId;
    if (typeof jsQR !== "function") { showVerify("", "Verificador no disponible"); return; }
    showVerify("", "Verificando lectura…");
    try {
      const blob = await qr.getRawData("png");
      if (id !== verifyId) return;
      const bmp = await createImageBitmap(blob);
      const cv = document.createElement("canvas");
      cv.width = bmp.width;
      cv.height = bmp.height;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bmp, 0, 0);
      const img = ctx.getImageData(0, 0, cv.width, cv.height);
      const res = jsQR(img.data, img.width, img.height);
      if (id !== verifyId) return;
      if (!res) showVerify("fail", "✗ No se pudo leer: simplifica el estilo, sube el contraste o el nivel de corrección");
      else if (res.data !== expected) showVerify("warn", "⚠ Se lee, pero el contenido decodificado difiere");
      else showVerify("ok", "✓ Se lee correctamente");
    } catch {
      if (id === verifyId) showVerify("", "No se pudo verificar");
    }
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
      ...buildOptions({}, size),
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

  // ---- Batch: CSV -> ZIP ----
  const MAX_BATCH = 500;

  // Minimal CSV parser: quotes, escaped quotes (""), "," or ";" delimiter.
  const parseCsv = (text) => {
    text = text.replace(/^﻿/, "");
    const first = text.split(/\r?\n/, 1)[0] || "";
    const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
    const rows = [];
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"' && cell === "") q = true;
      else if (ch === delim) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = "";
        rows.push(row); row = [];
      } else cell += ch;
    }
    row.push(cell);
    rows.push(row);
    return { rows, delim };
  };

  // -> [{name, data}] skipping empty rows and an optional header row.
  const parseBatch = () => {
    const { rows: raw, delim } = parseCsv(el.batchText.value);
    let rows = raw.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
    const isHeader = rows.length &&
      /^(nombre|name|contenido|content|url|texto|text)$/i.test(rows[0][0]) &&
      (rows[0].length === 1 || /^(contenido|content|url|texto|text)$/i.test(rows[0][1] || ""));
    if (isHeader) rows = rows.slice(1);
    return rows
      .map((r) => (r.length >= 2
        ? { name: r[0], data: r.slice(1).join(delim) }
        : { name: "", data: r[0] }))
      .filter((r) => r.data);
  };

  const safeName = (s, fallback) =>
    s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+/, "").trim().slice(0, 80) || fallback;

  const updateBatchInfo = () => {
    const n = parseBatch().length;
    el.batchInfo.textContent = n > MAX_BATCH ? `${n} filas (máximo ${MAX_BATCH})` : `${n} ${n === 1 ? "fila" : "filas"}`;
    el.batchRun.disabled = n === 0 || n > MAX_BATCH;
  };

  el.batchText.addEventListener("input", updateBatchInfo);
  el.batchFile.addEventListener("change", async () => {
    const file = el.batchFile.files[0];
    if (!file) return;
    el.batchText.value = await file.text();
    el.batchFile.value = "";
    updateBatchInfo();
  });

  el.batchRun.addEventListener("click", async () => {
    if (typeof JSZip !== "function") { el.batchStatus.textContent = "JSZip no disponible (¿sin conexión?)."; return; }
    const items = parseBatch();
    const ext = el.format.value;
    const size = Number(el.exportSize.value);
    const pad = String(items.length).length;
    const zip = new JSZip();
    const used = new Set();
    const skipped = [];
    el.batchRun.disabled = true;
    try {
      for (let i = 0; i < items.length; i++) {
        el.batchStatus.textContent = `Generando ${i + 1}/${items.length}…`;
        const { name, data } = items[i];
        if (lengthInfo(data).tooLong) { skipped.push(i + 1); continue; }
        const out = new QRCodeStyling({
          width: size,
          height: size,
          type: ext === "svg" ? "svg" : "canvas",
          ...buildOptions({ data }, size),
        });
        const blob = await out.getRawData(ext);
        const base = safeName(name, `qr-${String(i + 1).padStart(pad, "0")}`);
        let unique = base, n = 2;
        while (used.has(unique.toLowerCase())) unique = `${base}-${n++}`;
        used.add(unique.toLowerCase());
        zip.file(`${unique}.${ext === "jpeg" ? "jpg" : ext}`, blob);
      }
      const done = items.length - skipped.length;
      if (done === 0) { el.batchStatus.textContent = "Ninguna fila se pudo generar (contenido demasiado largo)."; return; }
      el.batchStatus.textContent = "Comprimiendo…";
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = "qr-lote.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      el.batchStatus.textContent = `Listo: ${done} QR en el ZIP.` + (skipped.length ? ` Omitidas por largas: filas ${skipped.join(", ")}.` : "");
    } catch {
      el.batchStatus.textContent = "Error al generar el lote.";
    } finally {
      updateBatchInfo();
    }
  });

  loadSettings();
  render();
  updateBatchInfo();
})();
