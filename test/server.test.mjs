import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createGuideServer } from "../server.mjs";

test("안내, 옵션 탭, 원본 다운로드와 링크별 접근 범위", async () => {
  const folder = await mkdtemp(join(tmpdir(), "guide-test-"));
  const media = join(folder, "private-media");
  await mkdir(media);
  const bytes = Buffer.from("89504e470d0a1a0a", "hex");
  await writeFile(join(media, "test.png"), bytes);
  await writeFile(join(media, "unlisted.png"), bytes);
  const config = JSON.parse(await readFile(new URL("../site.example.json", import.meta.url), "utf8"));
  config.invite = "a".repeat(32);
  config.expiresAt = new Date(Date.now() + 60_000).toISOString();
  config.products[0].cards[0].photos.push({ file: "test.png", alt: "안내 사진" });
  config.products[0].cards[0].text = "<script>example</script>\n줄바꿈";
  config.products[1].url = "javascript:alert(1)";
  const file = join(folder, "site.local.json");
  const save = () => writeFile(file, JSON.stringify(config));
  await save();
  const server = createGuideServer(folder);
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const base = `/p/${config.invite}`;
    const request = (path, options) => fetch(url + path, options);
    const page = await request(base);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("cache-control"), /no-store/);
    assert.match(page.headers.get("x-robots-tag"), /noindex/);
    assert.match(page.headers.get("content-security-policy"), /default-src 'none'/);
    const html = await page.text();
    assert.equal((html.match(/role="tab"/g) || []).length, 2);
    assert.match(html, /&lt;script&gt;example&lt;\/script&gt;/);
    assert.doesNotMatch(html, /javascript:alert/);
    assert.match(html, /test\.png\?download=1/);
    assert.equal((await request("/app.js")).status, 200);
    assert.equal((await request(base, { method: "POST" })).status, 405);
    const download = await request(base + "/media/test.png?download=1");
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-disposition"), 'attachment; filename="test.png"');
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
    for (const path of ["/", "/site.local.json", "/site.example.json", "/private-media/test.png",
      "/p/" + "b".repeat(32), base + "/media/unlisted.png", base + "/media/%2e%2e/test.png"]) {
      assert.equal((await request(path)).status, 404, path);
    }
    config.invite = "c".repeat(32);
    await save();
    assert.equal((await request(base + "/media/test.png")).status, 404);
    const next = `/p/${config.invite}`;
    assert.equal((await request(next)).status, 200);
    config.expiresAt = new Date(Date.now() - 1000).toISOString();
    await save();
    assert.equal((await request(next)).status, 404);
    assert.equal((await request(next + "/media/test.png")).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await Promise.all([unlink(file), unlink(join(media, "test.png")), unlink(join(media, "unlisted.png"))]);
    await rmdir(media);
    await rmdir(folder);
  }
});
