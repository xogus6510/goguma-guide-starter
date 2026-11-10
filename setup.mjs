import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const config = new URL("./site.local.json", import.meta.url);
const rotate = process.argv.includes("--rotate");
const file = new URL(rotate ? "./site.local.json.next" : "./site.local.json", import.meta.url);

try {
  const text = await readFile(rotate ? config : new URL("./site.example.json", import.meta.url), "utf8");
  const data = JSON.parse(text.replace(/^\uFEFF/, ""));
  data.invite = randomBytes(16).toString("hex");
  data.expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();
  await mkdir(new URL("./private-media/", import.meta.url), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  if (rotate) await rename(file, config);
  console.log(rotate ? "새 안내 링크를 만들었어요. npm start를 다시 실행해 주소를 확인하세요." : "설정을 만들었어요. npm start로 시작하세요.");
} catch (error) {
  console.error(error.code === "EEXIST" ? "기존 설정을 찾았어요. 안내 링크 변경은 npm run rotate를 사용하세요." : "설정을 저장하지 못했어요. README와 파일 권한을 확인하세요.");
  process.exitCode = 1;
}
