import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist"),
  out = path.resolve(root, "../便携版");
await fs.mkdir(out, { recursive: true });
let html = await fs.readFile(path.join(dist, "index.html"), "utf8");
const cssMatch = html.match(
  /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/,
);
if (!cssMatch) throw Error("未找到构建样式");
const cssPath = path.join(dist, cssMatch[1]);
let css = await fs.readFile(cssPath, "utf8");
const urlMatches = [...css.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)];
for (const match of urlMatches) {
  if (match[2].startsWith("data:") || match[2].startsWith("#")) continue;
  const asset = await fs.readFile(
    path.resolve(path.dirname(cssPath), match[2]),
  );
  const ext = path.extname(match[2]);
  const mime =
    ext === ".woff2"
      ? "font/woff2"
      : ext === ".svg"
        ? "image/svg+xml"
        : "application/octet-stream";
  css = css.replace(
    match[0],
    `url("data:${mime};base64,${asset.toString("base64")}")`,
  );
}
html = html.replace(
  cssMatch[0],
  () => `<style>${css.replaceAll("</style", "<\\/style")}</style>`,
);
const jsMatch = html.match(
  /<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/,
);
if (!jsMatch) throw Error("未找到构建脚本");
const js = await fs.readFile(path.join(dist, jsMatch[1]), "utf8");
html = html.replace(
  jsMatch[0],
  () => `<script type="module">${js.replaceAll("</script", "<\\/script")}</script>`,
);
const icon = await fs.readFile(path.join(dist, "favicon.svg"));
html = html.replace(
  "./favicon.svg",
  `data:image/svg+xml;base64,${icon.toString("base64")}`,
);
await fs.writeFile(path.join(out, "人生小岛.html"), html);
for (let n = 1; n <= 5; n++)
  await fs.copyFile(
    path.join(dist, `卡牌${n}.png`),
    path.join(out, `卡牌${n}.png`),
  );
await fs.writeFile(
  path.join(out, "使用说明.txt"),
  "人生小岛 · 本地便携版\n\n1. 用 Chrome、Edge 或 Safari 打开“人生小岛.html”。无需联网或安装。\n2. 添加玩家，开轮随机排序；轮到谁就用数字键盘录入本轮新增积分，余分自动累计。\n3. 直接点击地图中间的骰子（每轮开始前可选6／12／24面），每3分一次；当前玩家用完次数后点“下一位”，余下1–2分留到下一轮。\n4. 位置跨轮保留；“重来当前轮”恢复轮初状态并重新排序。有歧义的卡片由主持人裁定，规则见“玩法说明”。\n5. 进度只保存在当前浏览器。结束活动、移动文件或换电脑前，请从“存档”导出 JSON。\n6. 换电脑后通过“存档 → 从文件恢复进度”载入。\n\n请保留旁边的5张卡牌图片，查看原卡图时会用到。浏览器若禁止本地文件存储，会显示备份提醒，请及时导出。\n本版本未部署到公网。\n",
);
console.log(`便携版已生成：${out}`);
