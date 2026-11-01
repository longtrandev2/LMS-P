/**
 * Smoke test end-to-end trên stack đang chạy, sau `seed-demo.mjs`. Chỉ đọc, trừ bật/tắt bảo trì (được trả lại).
 * Chạy: node scripts/smoke-e2e.mjs — thoát mã 1 nếu có bước sai.
 */
import { api, items, login } from "./seed-lib.mjs";

let failed = 0;
async function step(name, fn) {
  try { const note = await fn(); console.log(`  ✓ ${name}${note ? ` — ${note}` : ""}`); }
  catch (error) { failed++; console.log(`  ✗ ${name}: ${error.message.slice(0, 200)}`); }
}
const expect = (ok, message) => { if (!ok) throw new Error(message); };
const rejects = async (promise, code) => {
  try { await promise; } catch (error) { expect(error.message.includes(code), `mong đợi ${code}, nhận: ${error.message.slice(0, 120)}`); return code; }
  throw new Error(`mong đợi lỗi ${code}`);
};

const [adm, lec, stu] = await Promise.all(["admin", "lecturer", "student"].map((u) => login(`${u}@lms.local`)));
const klass = items(await api("/classes", { token: lec })).find((c) => c.code === "NET101-L01");
const list = items(await api(`/classes/${klass.id}/assignments`, { token: lec }));
const byTitle = (title) => list.find((a) => a.title === title);
const midterm = byTitle("Kiểm tra giữa kỳ"), final = byTitle("Thi cuối kỳ"), draft = byTitle("Đề thi thử — ma trận (nháp)");

console.log("Kỳ thi (M7)");
await step("giữa kỳ giao theo phiên, 2 mã đề cùng tổng điểm", async () => {
  const papers = await api(`/assignments/${midterm.id}/papers`, { token: lec });
  expect(papers.papers.length === 2 && new Set(papers.papers.map((p) => p.total_points)).size === 1, JSON.stringify(papers.variant_totals));
  return papers.papers.map((p) => `${p.code}: ${p.question_count} câu`).join(", ");
});
await step("xem trước đề nháp không thiếu kho", async () => {
  const preview = await api(`/assignments/${draft.id}/papers`, { token: lec });
  expect(preview.rules.every((r) => r.pool_size >= r.requested), JSON.stringify(preview.rules));
});
await step("sinh viên không thấy đề trước khi vào phiên", async () => {
  const detail = await api(`/assignments/${midterm.id}`, { token: stu });
  expect(detail.questions.length === 0 && detail.assignment.delivery === "session", "lộ câu hỏi");
});
await step("cuối kỳ chưa mở", () => rejects(api(`/assignments/${final.id}/sessions`, { method: "POST", token: stu, body: { accept_rules: true } }), "EXAM_NOT_OPEN"));
await step("giám sát trả đủ sinh viên", async () => {
  const monitor = await api(`/assignments/${midterm.id}/sessions`, { token: lec });
  expect(monitor.summary.total === monitor.items.length && monitor.items.length > 0, "thiếu dòng");
  return `${monitor.summary.submitted} đã nộp, ${monitor.summary.in_progress} đang làm`;
});

console.log("Quản trị (M10)");
await step("thống kê 7 ngày đủ ngày", async () => expect((await api("/admin/stats?days=7", { token: adm })).daily.length === 7, "thiếu ngày"));
await step("hàng đợi chấm có worker", async () => {
  const queue = (await api("/health/queue")).queues.find((q) => q.name === "q.grading");
  expect(queue && queue.consumers > 0, "không có worker");
  return `${queue.messages} tin chờ`;
});
await step("cấu hình sai bị từ chối", () => rejects(api("/admin/settings", { method: "PUT", token: adm, body: { values: { max_time_limit_ms: 1 } } }), "VALIDATION_ERROR"));
await step("bảo trì chặn bắt đầu việc mới rồi mở lại", async () => {
  await api("/admin/settings", { method: "PUT", token: adm, body: { values: { maintenance: { enabled: true, message: "Smoke test" } }, reason: "smoke" } });
  const quiz = byTitle("Quiz tổng hợp — 8 dạng câu");
  try { await rejects(api(`/assignments/${quiz.id}/quiz-attempts`, { method: "POST", token: stu, idempotencyKey: crypto.randomUUID(), body: { answers: [] } }), "MAINTENANCE"); }
  finally { await api("/admin/settings", { method: "PUT", token: adm, body: { values: { maintenance: { enabled: false, message: null } }, reason: "smoke" } }); }
});
await step("sinh viên không vào được trang quản trị", () => rejects(api("/admin/stats?days=7", { token: stu }), "403"));

console.log(failed ? `\n${failed} bước lỗi` : "\nTất cả bước đều đạt");
process.exit(failed ? 1 : 0);
