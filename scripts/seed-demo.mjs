/**
 * Seed dữ liệu demo cho LMS-P — gọi REST API thật, không ghi thẳng DB.
 * Chạy khi stack đang lên:  node scripts/seed-demo.mjs
 * Mọi bản ghi find-or-create theo mã/tên nên chạy lại không nhân bản. Yêu cầu Node 20+.
 */
import {
  api, items, login, days, log, findOrCreate, ensureQuestion, verifyQuestion, ensureAssignment, waitSubmission,
  DEMO_PASSWORD, REVIEW_DEFAULTS,
} from "./seed-lib.mjs";
import { seedAssessment } from "./seed-assessment.mjs";
import { seedSchedule } from "./seed-schedule.mjs";

const PDF = `%PDF-1.4
1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj
2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>> endobj
3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]>> endobj
trailer <</Size 4/Root 1 0 R>>
%%EOF`;

const mcq = (content, difficulty, categoryId, options) => ({
  category_id: categoryId, type: "mcq", content, difficulty,
  options: options.map(([text, correct]) => ({ content: text, is_correct: correct })) });
const prog = (content, difficulty, categoryId, solution, tests) => ({
  category_id: categoryId, type: "programming", content, difficulty,
  programming: { allowed_languages: ["python"], time_limit_ms: 1000, memory_limit_mb: 256, checker_mode: "token",
    starter_codes: { python: "import sys\n\ndata = sys.stdin.read().split()\n# TODO\n" },
    solution_code: solution, solution_language: "python" },
  test_cases: tests.map(([input, expected_output, is_public]) => ({ input, expected_output, is_public })) });

async function main() {
  console.log("Đăng nhập…");
  const admin = await login("admin@lms.local");
  const lecturer = await login("lecturer@lms.local");
  const student = await login("student@lms.local");

  console.log("Học phần & lớp:");
  const course = await findOrCreate(async () => items(await api("/courses", { token: admin })), (c) => c.code === "NET101",
    () => api("/courses", { method: "POST", token: admin, body: { code: "NET101", name: "Lập trình mạng", description: "Học phần demo" } }),
    "Học phần NET101");
  const users = async (role) => items(await api(`/users?role=${role}&limit=100`, { token: admin }));
  const demoLecturer = (await users("lecturer")).find((u) => u.email === "lecturer@lms.local");
  const ensureStudent = (email, name, code) => findOrCreate(async () => (await users("student")).filter((u) => u.email === email),
    (u) => u.email === email,
    () => api("/users", { method: "POST", token: admin, body: { email, full_name: name, student_code: code, role_names: ["student"], password: DEMO_PASSWORD } }),
    `SV ${code}`);
  const sv1 = (await users("student")).find((u) => u.email === "student@lms.local");
  const sv2 = await ensureStudent("sv02@lms.local", "Nguyễn Văn B", "SV000002");
  const sv3 = await ensureStudent("sv03@lms.local", "Trần Thị C", "SV000003");
  const klass = await findOrCreate(async () => items(await api("/classes", { token: admin })), (c) => c.code === "NET101-L01",
    () => api("/classes", { method: "POST", token: admin, body: {
      course_id: course.id, code: "NET101-L01", name: "Lập trình mạng — Lớp 1", semester: "2026.2",
      lecturer_id: demoLecturer.id, max_students: 40, room: "A1.1", schedule: "T3 1-3, T5 1-3" } }),
    "Lớp NET101-L01");
  const enrolled = items(await api(`/classes/${klass.id}/students`, { token: lecturer })).map((s) => s.user_id ?? s.id);
  const missing = [sv1, sv2, sv3].filter((s) => s && !enrolled.includes(s.id)).map((s) => s.id);
  if (missing.length) log(`Ghi danh thêm ${(await api(`/classes/${klass.id}/enrollments`, { method: "POST", token: lecturer, body: { student_ids: missing } })).added} sinh viên`);
  else log("Ghi danh: đã đủ 3 sinh viên");

  console.log("Học liệu:");
  if (items(await api(`/classes/${klass.id}/materials`, { token: lecturer })).some((m) => m.title === "Slide tuần 1 — Tổng quan môn học")) log("Học liệu: đã có");
  else {
    const form = new FormData();
    form.append("title", "Slide tuần 1 — Tổng quan môn học");
    form.append("description", "Giới thiệu kiến trúc mạng, mô hình OSI");
    form.append("file", new Blob([PDF], { type: "application/pdf" }), "slide-tuan-1.pdf");
    await api(`/classes/${klass.id}/materials`, { method: "POST", token: lecturer, form });
    log("Học liệu: upload slide-tuan-1.pdf");
  }

  console.log("Ngân hàng câu hỏi:");
  const bank = await findOrCreate(async () => items(await api("/question-banks", { token: lecturer })), (b) => b.name === "Ngân hàng đề NET101",
    () => api("/question-banks", { method: "POST", token: lecturer, body: { course_id: course.id, name: "Ngân hàng đề NET101", description: "Đề demo", visibility: "shared" } }),
    "Ngân hàng đề NET101");
  const categories = items(await api(`/question-banks/${bank.id}/categories`, { token: lecturer }));
  const ensureCategory = async (name) => categories.find((c) => c.name === name)?.id
    ?? (await api(`/question-banks/${bank.id}/categories`, { method: "POST", token: lecturer, body: { name } })).id;
  const catOverview = await ensureCategory("Tổng quan");
  const catSocket = await ensureCategory("Socket");
  const q = (label, body) => ensureQuestion(lecturer, bank.id, label, body);
  const q1 = await q("MCQ tầng vận chuyển", mcq("Giao thức nào sau đây hoạt động ở tầng vận chuyển và hướng kết nối?", "medium", catOverview,
    [["UDP", false], ["TCP", true], ["ICMP", false], ["ARP", false]]));
  const q2 = await q("MCQ cổng HTTP", mcq("Cổng mặc định của giao thức HTTP là bao nhiêu?", "easy", catOverview,
    [["21", false], ["25", false], ["80", true], ["443", false]]));
  const q3 = await q("MCQ socket", mcq("Trong Python, lời gọi nào chuyển socket sang trạng thái nghe kết nối đến?", "hard", catSocket,
    [["socket.connect()", false], ["socket.bind()", false], ["socket.listen()", true], ["socket.accept()", false]]));
  const p1 = await q("Code: tổng hai số", prog("Nhập vào một dòng chứa hai số nguyên a và b cách nhau bởi khoảng trắng. In ra tổng a + b.",
    "easy", catSocket, "a, b = map(int, input().split())\nprint(a + b)\n", [["3 4", "7", true], ["10 -2", "8", true], ["999999 1", "1000000", false]]));
  const p2 = await q("Code: đảo chuỗi", prog("Nhập một dòng chữ không có khoảng trắng. In ra chuỗi bị đảo ngược.",
    "medium", catSocket, "s = input()\nprint(s[::-1])\n", [["hello", "olleh", true], ["lmsp", "psml", false]]));

  console.log("Bài tập:");
  const quiz = await ensureAssignment(lecturer, klass.id, { ...REVIEW_DEFAULTS, title: "Kiểm tra nhanh — Mạng cơ bản", description: "Quiz 3 câu",
    category: "quiz", due_at: days(3), max_attempts: 2, score_policy: "best",
    questions: [{ question_id: q1.id, points: 2, position: 1 }, { question_id: q2.id, points: 3, position: 2 }, { question_id: q3.id, points: 5, position: 3 }] },
    "Quiz 3 câu (đã xuất bản)");
  const codeTitle = "Bài tập lập trình số 1";
  if (!items(await api(`/classes/${klass.id}/assignments`, { token: lecturer })).some((a) => a.title === codeTitle)) {
    await verifyQuestion(lecturer, p1, "tổng hai số");
    await verifyQuestion(lecturer, p2, "đảo chuỗi");
  }
  const codeAsg = await ensureAssignment(lecturer, klass.id, { ...REVIEW_DEFAULTS, title: codeTitle, description: "2 bài code Python",
    category: "assignment", due_at: days(7), allow_late: true, late_due_at: days(9), late_penalty_percent: 20, max_attempts: 5, score_policy: "best",
    questions: [{ question_id: p1.id, points: 6, position: 1 }, { question_id: p2.id, points: 4, position: 2 }] }, "Bài code (đã xuất bản)");

  console.log("Lượt nộp mẫu của sinh viên demo:");
  if (items(await api(`/assignments/${quiz.id}/quiz-attempts`, { token: student })).length) log("Quiz: đã có lượt nộp");
  else {
    const d1 = await api(`/questions/${q1.id}`, { token: lecturer });
    const d2 = await api(`/questions/${q2.id}`, { token: lecturer });
    const attempt = await api(`/assignments/${quiz.id}/quiz-attempts`, { method: "POST", token: student, idempotencyKey: crypto.randomUUID(), body: { answers: [
      { question_id: q1.id, selected_option_ids: [d1.options.find((o) => o.is_correct).id] },
      { question_id: q2.id, selected_option_ids: [d2.options.find((o) => !o.is_correct).id] }] } });
    log(`Quiz: đúng câu 1, sai câu 2, bỏ trống câu 3 → ${attempt.score}/${attempt.max_score ?? 10} điểm`);
  }
  if (items(await api(`/me/submissions?assignment_id=${codeAsg.id}`, { token: student })).some((s) => s.question_id === p1.id)) log("Code: đã có bài nộp");
  else {
    const submit = (source) => api(`/assignments/${codeAsg.id}/questions/${p1.id}/submissions`,
      { method: "POST", token: student, idempotencyKey: crypto.randomUUID(), body: { language: "python", source_code: source } });
    const wrong = await submit("a, b = map(int, input().split())\nprint(0)\n");
    log(`Code lượt 1 (sai): ${(await waitSubmission(student, wrong.submission_id)).verdict}`);
    const right = await submit("a, b = map(int, input().split())\nprint(a + b)\n");
    const graded = await waitSubmission(student, right.submission_id);
    log(`Code lượt 2 (đúng): ${graded.verdict}, điểm ${graded.score}`);
  }

  await seedAssessment({ lecturer, student, klass, bank, catOverview, catSocket });
  await seedSchedule({ admin, lecturer, student, klass, course });

  console.log(`
Hoàn tất. Đăng nhập http://localhost:3000 (mật khẩu chung: ${DEMO_PASSWORD})
  admin@lms.local    — quản trị user/học phần/lớp, xem audit
  lecturer@lms.local — lớp NET101-L01, ngân hàng đề (9 loại câu), các bài đã xuất bản, kết quả
  student@lms.local  — đã có lượt nộp mẫu; sv02@lms.local / sv03@lms.local — tài khoản sạch để tự làm bài`);
}

main().catch((error) => { console.error(`LỖI: ${error.message}`); process.exit(1); });
