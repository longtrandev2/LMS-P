/**
 * Đưa môi trường demo về trạng thái sạch: xóa volume DB/broker của stack local, dựng lại, chờ API rồi seed.
 * XÓA TOÀN BỘ DỮ LIỆU LOCAL — chỉ dùng cho máy dev/demo. Chạy: node scripts/reset-demo.mjs --yes
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const health = process.env.LMS_HEALTH_URL ?? "http://localhost:8000/health";
const run = (cmd) => execSync(cmd, { cwd: path.join(root, "infra"), stdio: "inherit" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!process.argv.includes("--yes")) {
  console.error("Lệnh này xóa toàn bộ dữ liệu Docker local (DB, broker, học liệu trong volume).");
  console.error("Chạy lại với --yes để xác nhận: node scripts/reset-demo.mjs --yes");
  process.exit(1);
}

console.log("1/3 Xóa stack và volume…");
run("docker compose down -v");
console.log("2/3 Dựng lại stack…");
run("docker compose up -d --build");
for (let i = 0; ; i++) {
  try { if ((await fetch(health)).ok) break; } catch { /* API chưa lên */ }
  if (i > 100) throw new Error(`API không lên sau 5 phút — xem: docker compose logs api`);
  await sleep(3000);
}
console.log("3/3 Seed dữ liệu demo…");
execSync("node scripts/seed-demo.mjs", { cwd: root, stdio: "inherit" });
