import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { join, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const invitePattern = /^[a-f0-9]{32}$/;
const filePattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.(png|jpe?g|webp)$/;
const maxPhotoBytes = 20 * 1024 * 1024;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
};
const publicFiles = {
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
};
const demoFiles = new Set(["demo.svg", "winter.svg"]);
const mediaTypes = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
const escape = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const photoValid = (photo) => photo && (demoFiles.has(photo.file) || filePattern.test(photo.file)) && typeof photo.alt === "string";

function productLink(text) {
  try {
    const url = new URL(text);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

function photoHtml(photo, base, download = true) {
  const src = `${base}/media/${photo.file}`;
  return `<figure><img src="${src}" alt="${escape(photo.alt)}" loading="lazy">${download ? `<figcaption><a class="button" href="${src}?download=1" download>사진 다운로드</a></figcaption>` : ""}</figure>`;
}

function render(config, base) {
  const products = config.products;
  const tabs = products.map((p, i) => `<button type="button" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${escape(p.name)}</button>`).join("");
  const panels = products.map((p, i) => {
    const url = productLink(p.url);
    const cards = p.cards.map((c) => `<article class="card"><h3>${escape(c.title)}</h3>
      <p class="copy-text">${escape(c.text)}</p>
      ${c.text ? '<button class="button" type="button" data-copy>안내 문구 복사</button><textarea aria-label="직접 복사할 안내 문구" readonly hidden></textarea>' : ""}
      ${c.photos.map((photo) => photoHtml(photo, base)).join("")}</article>`).join("");
    return `<section role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}" tabindex="0"${i ? " hidden" : ""}>
      <div class="product-head"><h2>${escape(p.name)}</h2>${url ? `<a class="button" href="${escape(url)}" target="_blank" rel="noopener noreferrer">상품 보기 ↗</a>` : ""}</div>
      ${cards || "<p>등록된 안내가 없어요.</p>"}</section>`;
  }).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow"><title>${escape(config.title)}</title><link rel="stylesheet" href="/styles.css">
  <script defer src="/app.js"></script></head><body><main>
  <header class="hero"><div class="badge">상품 · 참여 안내</div><h1>${escape(config.title)}</h1><p>${escape(config.intro)}</p>
  ${config.banner ? photoHtml(config.banner, base, false) : ""}</header>
  <nav class="tabs" role="tablist" aria-label="상품 선택">${tabs}</nav>${panels}
  <p id="status" role="status" aria-live="polite"></p></main></body></html>`;
}

async function loadConfig(directory) {
  const config = JSON.parse((await readFile(join(directory, "site.local.json"), "utf8")).replace(/^\uFEFF/, ""));
  if (!invitePattern.test(config.invite) || typeof config.title !== "string" || typeof config.intro !== "string" ||
    !Number.isFinite(Date.parse(config.expiresAt)) || !Array.isArray(config.products) || !config.products.length ||
    (config.banner && !photoValid(config.banner)) ||
    !config.products.every((p) => typeof p?.name === "string" && Array.isArray(p.cards) && p.cards.every(
      (c) => typeof c?.title === "string" && typeof c.text === "string" && Array.isArray(c.photos) && c.photos.every(photoValid),
    ))) throw new Error("Invalid configuration");
  return config;
}

function send(req, res, status, type, body, extra = {}) {
  res.writeHead(status, { ...headers, "Content-Type": type, ...extra });
  res.end(req.method === "HEAD" ? undefined : body);
}

export function createGuideServer(directory = root) {
  return createServer(async (req, res) => {
    const notFound = () => send(req, res, 404, "text/plain; charset=utf-8", "이 안내 링크를 확인해 주세요.");
    try {
      if (!["GET", "HEAD"].includes(req.method))
        return send(req, res, 405, "text/plain; charset=utf-8", "읽기 전용 안내예요.", { Allow: "GET, HEAD" });
      const url = new URL(req.url, "http://localhost");
      if (Object.hasOwn(publicFiles, url.pathname)) {
        const [file, type] = publicFiles[url.pathname];
        return send(req, res, 200, type, await readFile(join(root, "public", file)));
      }
      const match = /^\/p\/([a-f0-9]{32})(?:\/media\/([a-zA-Z0-9._-]+))?$/.exec(url.pathname);
      if (!match) return notFound();
      const [, invite, file] = match;
      const config = await loadConfig(directory);
      if (!timingSafeEqual(Buffer.from(invite), Buffer.from(config.invite)) || Date.now() >= Date.parse(config.expiresAt))
        return notFound();
      if (!file) return send(req, res, 200, "text/html; charset=utf-8", render(config, `/p/${invite}`));
      const photos = [config.banner, ...config.products.flatMap((p) => p.cards.flatMap((c) => c.photos))];
      if (!photos.some((photo) => photo?.file === file)) return notFound();
      const download = url.searchParams.get("download") === "1" ? { "Content-Disposition": `attachment; filename="${file}"` } : {};
      if (demoFiles.has(file))
        return send(req, res, 200, "image/svg+xml", await readFile(join(root, "public", file)), download);
      const folder = await realpath(join(directory, "private-media"));
      const path = await realpath(join(folder, file));
      const info = await stat(path);
      if (!path.startsWith(folder + sep) || !info.isFile() || info.size > maxPhotoBytes) return notFound();
      return send(req, res, 200, mediaTypes[file.split(".").at(-1)], await readFile(path), download);
    } catch {
      return notFound();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = await loadConfig(root);
    const port = Number(process.env.PORT || 3210);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid port");
    createGuideServer().on("error", () => {
      console.error("서버를 시작하지 못했어요. 포트가 사용 중인지 확인하세요.");
      process.exitCode = 1;
    }).listen(port, "127.0.0.1", () => {
      console.log(`내 PC에서 보기  http://127.0.0.1:${port}/p/${config.invite}`);
      console.log("공유할 때 주소에 이 /p/ 경로를 붙이세요. 링크는 공개 저장소에 넣지 마세요.");
    });
  } catch {
    console.error("설정을 읽지 못했어요. npm run setup을 실행하거나 site.local.json 형식을 확인하세요.");
    process.exitCode = 1;
  }
}
