/** Seed kỳ thi, quiz có giờ, đề nhiều mã / đề riêng và phiên làm bài mẫu (docs/exam-spec.md). */
import { api, items, days, log, ensureQuestion, ensureAssignment, verifyQuestion, waitSubmission, REVIEW_DEFAULTS } from "./seed-lib.mjs";

const NL = String.fromCharCode(10);
const hours = (n) => new Date(Date.now() + n * 3_600_000).toISOString().slice(0, 19);
const choice = (options) => options.map(([content, is_correct]) => ({ content, is_correct }));
const EXAM_MCQ = [
  ["easy", "Lệnh nào dùng để kiểm tra kết nối tới một máy bằng gói ICMP Echo?", ["ping", true], ["tracert", false], ["netstat", false], ["nslookup", false]],
  ["easy", "Địa chỉ 127.0.0.1 là địa chỉ gì?", ["Loopback", true], ["Broadcast", false], ["Gateway mặc định", false], ["Multicast", false]],
  ["easy", "Cổng mặc định của HTTPS là?", ["443", true], ["80", false], ["8443", false], ["22", false]],
  ["easy", "DNS dùng để làm gì?", ["Phân giải tên miền thành địa chỉ IP", true], ["Cấp phát địa chỉ IP động", false], ["Mã hóa kết nối", false], ["Định tuyến gói tin", false]],
  ["easy", "Thiết bị nào hoạt động chủ yếu ở tầng 3 (mạng)?", ["Router", true], ["Hub", false], ["Repeater", false], ["Switch tầng 2", false]],
  ["easy", "Giao thức nào cấp phát địa chỉ IP tự động cho máy trạm?", ["DHCP", true], ["ARP", false], ["SNMP", false], ["FTP", false]],
  ["easy", "Mặt nạ mạng /24 tương ứng với?", ["255.255.255.0", true], ["255.255.0.0", false], ["255.255.255.128", false], ["255.0.0.0", false]],
  ["easy", "Giao thức nào ánh xạ địa chỉ IP sang địa chỉ MAC?", ["ARP", true], ["RARP ngược", false], ["ICMP", false], ["IGMP", false]],
  ["medium", "Hàm `accept()` phía server TCP trả về gì?", ["Một socket mới cho kết nối vừa nhận", true], ["Socket đang lắng nghe", false], ["Số byte nhận được", false], ["Địa chỉ server", false]],
  ["medium", "Khi gọi `recv()` trên socket TCP và nhận về 0 byte, điều đó có nghĩa là?", ["Phía bên kia đã đóng kết nối", true], ["Bộ đệm đầy", false], ["Hết thời gian chờ", false], ["Gói tin bị mất", false]],
  ["medium", "Cờ nào trong TCP header dùng để kết thúc kết nối một cách bình thường?", ["FIN", true], ["RST", false], ["PSH", false], ["URG", false]],
  ["medium", "Socket UDP khác TCP ở điểm nào?", ["Không cần thiết lập kết nối trước khi gửi", true], ["Đảm bảo thứ tự gói tin", false], ["Có cơ chế truyền lại", false], ["Chỉ dùng được trong mạng LAN", false]],
  ["hard", "Trạng thái TIME_WAIT tồn tại để làm gì?", ["Đảm bảo gói ACK cuối được nhận và loại bỏ gói trễ của kết nối cũ", true], ["Chờ client gửi dữ liệu mới", false], ["Giữ cổng cho server khởi động lại", false], ["Đợi DNS phân giải xong", false]],
  ["hard", "Tùy chọn socket nào cho phép server bind lại cổng đang ở TIME_WAIT?", ["SO_REUSEADDR", true], ["SO_KEEPALIVE", false], ["TCP_NODELAY", false], ["SO_LINGER", false]],
];
const EXAM_TF = [
  ["HTTP/1.1 mặc định giữ kết nối (keep-alive) giữa các request.", true],
  ["Một socket TCP đang lắng nghe có thể nhận dữ liệu trực tiếp từ client mà không cần accept().", false],
  ["Địa chỉ IPv6 dài 128 bit.", true],
  ["UDP có cơ chế kiểm soát tắc nghẽn giống TCP.", false],
];

async function ensureCategory(token, bankId, name) {
  const found = items(await api(`/question-banks/${bankId}/categories`, { token })).find((c) => c.name === name);
  return found ?? api(`/question-banks/${bankId}/categories`, { method: "POST", token, body: { name } });
}

/** Câu trả lời đúng (hoặc cố ý sai khi `wrong`) cho một câu khách quan, dựa vào bản giảng viên. */
function correctAnswer(detail, wrong) {
  const options = detail.options ?? [];
  if (detail.type === "mcq" || detail.type === "true_false") {
    const pick = options.find((o) => wrong ? !o.is_correct : o.is_correct);
    return { selected_option_ids: pick ? [pick.id] : [] };
  }
  return null;
}

const examProgram = (categoryId, content, solution, tests) => ({ category_id: categoryId, type: "programming", difficulty: "easy", content,
  programming: { allowed_languages: ["python", "cpp", "java"], time_limit_ms: 1000, memory_limit_mb: 256, checker_mode: "token",
    solution_code: solution, solution_language: "python" },
  test_cases: tests.map(([input, expected_output, is_public]) => ({ input, expected_output, is_public })) });

export async function seedExams({ lecturer, sv02, sv03, klass, bank }) {
  console.log("Câu hỏi ôn thi (kho để bốc đề):");
  const cat = await ensureCategory(lecturer, bank.id, "Ôn thi — Mạng máy tính");
  for (const [difficulty, content, ...options] of EXAM_MCQ)
    await ensureQuestion(lecturer, bank.id, `Ôn thi MCQ (${difficulty})`, { category_id: cat.id, type: "mcq", difficulty, content, options: choice(options) });
  for (const [content, truth] of EXAM_TF)
    await ensureQuestion(lecturer, bank.id, "Ôn thi Đúng/Sai", { category_id: cat.id, type: "true_false", difficulty: "easy", content,
      options: choice([["Đúng", truth], ["Sai", !truth]]) });

  const line = (...parts) => parts.join(NL) + NL;
  const programming = {
    sumTwo: await ensureQuestion(lecturer, bank.id, "Thi: tổng hai số", examProgram(cat.id,
      ["Đọc hai số nguyên `a`, `b` trên một dòng. In ra `a + b`.", "", "## Ràng buộc", "|a|, |b| ≤ 10^9"].join(NL),
      line("a, b = map(int, input().split())", "print(a + b)"),
      [[line("3 4"), "7", true], [line("-5 2"), "-3", false], [line("1000000000 1000000000"), "2000000000", false]])),
    reverse: await ensureQuestion(lecturer, bank.id, "Thi: đảo chuỗi", examProgram(cat.id,
      "Đọc một chuỗi không chứa khoảng trắng, in ra chuỗi đảo ngược.",
      line("print(input()[::-1])"), [[line("hello"), "olleh", true], [line("lmsp"), "psml", false]])),
  };

  console.log("Kỳ thi và quiz có giờ:");
  const existing = items(await api(`/classes/${klass.id}/assignments`, { token: lecturer }));
  if (!existing.some((a) => a.title === "Kiểm tra giữa kỳ")) {
    await verifyQuestion(lecturer, programming.sumTwo, "thi: tổng hai số");
    await verifyQuestion(lecturer, programming.reverse, "thi: đảo chuỗi");
  }
  const rule = (section_index, type, difficulty, count, points) =>
    ({ section_index, bank_id: bank.id, category_id: cat.id, type, difficulty, count, points });
  const exam = { ...REVIEW_DEFAULTS, review_mode: "after_close", shuffle_questions: true, shuffle_options: true,
    rules_text: "- Không dùng tài liệu, không trao đổi.\n- Rời khỏi trang làm bài sẽ được ghi lại.\n- Hết giờ hệ thống tự thu bài.", max_attempts: 1, score_policy: "last" };
  const midterm = await ensureAssignment(lecturer, klass.id, { ...exam, title: "Kiểm tra giữa kỳ", category: "midterm",
    description: "45 phút · 2 mã đề · trắc nghiệm bốc ngẫu nhiên + 1 bài lập trình.", available_from: hours(-1), due_at: days(7),
    time_limit_minutes: 45, paper_mode: "variants", variant_count: 2,
    sections: [{ title: "Phần I — Trắc nghiệm" }, { title: "Phần II — Lập trình" }],
    draw_rules: [rule(0, "mcq", "easy", 4, 1), rule(0, "mcq", "medium", 2, 1), rule(0, "true_false", null, 2, 0.5)],
    questions: [{ question_id: programming.sumTwo.id, points: 3, position: 1, section_index: 1 }] }, "Giữa kỳ (2 mã đề)");
  await ensureAssignment(lecturer, klass.id, { ...exam, title: "Thi cuối kỳ", category: "final",
    description: "60 phút · mỗi sinh viên một đề riêng.", available_from: days(14), due_at: days(14.2),
    time_limit_minutes: 60, paper_mode: "per_student",
    sections: [{ title: "Phần I — Trắc nghiệm" }, { title: "Phần II — Lập trình" }],
    draw_rules: [rule(0, "mcq", null, 6, 1)],
    questions: [{ question_id: programming.reverse.id, points: 4, position: 1, section_index: 1 }] }, "Cuối kỳ (đề riêng, sắp mở)");
  const timedQuiz = await ensureAssignment(lecturer, klass.id, { ...REVIEW_DEFAULTS, title: "Quiz 15 phút — Giao thức",
    category: "quiz", description: "5 câu bốc ngẫu nhiên, 15 phút, 2 lượt.", due_at: days(5), max_attempts: 2, score_policy: "best",
    time_limit_minutes: 15, paper_mode: "same", shuffle_options: true,
    draw_rules: [rule(null, "mcq", null, 5, 2)], questions: [] }, "Quiz có giờ");

  const drafts = items(await api(`/classes/${klass.id}/assignments`, { token: lecturer }));
  if (drafts.some((a) => a.title === "Đề thi thử — ma trận (nháp)")) log("Đề nháp ma trận: đã có");
  else {
    await api(`/classes/${klass.id}/assignments`, { method: "POST", token: lecturer, body: { ...exam, title: "Đề thi thử — ma trận (nháp)",
      category: "midterm", description: "Nháp: ma trận độ khó × danh mục, 3 mã đề.", due_at: days(20), time_limit_minutes: 30,
      paper_mode: "variants", variant_count: 3, sections: [{ title: "Trắc nghiệm" }],
      draw_rules: [rule(0, "mcq", "easy", 3, 1), rule(0, "mcq", "medium", 1, 2), rule(0, "mcq", "hard", 1, 3)], questions: [] } });
    log("Đề nháp ma trận: tạo mới (chưa xuất bản)");
  }

  console.log("Phiên làm bài mẫu:");
  await seedMidtermSessions({ lecturer, sv02, sv03, midterm });
  log(`Quiz có giờ (id ${timedQuiz.id}) và giữa kỳ để trống cho student@lms.local tự làm`);
}

async function answersFor(lecturer, view, { wrongEvery = 0, limit = Infinity } = {}) {
  const answers = [];
  let index = 0;
  for (const section of view.sections) for (const question of section.questions) {
    if (answers.length >= limit) return answers;
    index += 1;
    if (question.type === "programming") {
      answers.push({ question_id: question.question_id, code: { language: "python", source_code: "a, b = map(int, input().split())\nprint(a + b)\n" } });
      continue;
    }
    const detail = await api(`/questions/${question.question_id}`, { token: lecturer });
    const answer = correctAnswer(detail, wrongEvery > 0 && index % wrongEvery === 0);
    if (answer) answers.push({ question_id: question.question_id, answer: { question_id: question.question_id, ...answer } });
  }
  return answers;
}

async function seedMidtermSessions({ lecturer, sv02, sv03, midterm }) {
  const existing = items(await api(`/me/attempt-sessions?assignment_id=${midterm.id}`, { token: sv02 }));
  if (existing.length) { log("Giữa kỳ: đã có phiên của sv02"); return; }
  const accept = { accept_rules: true };
  const done = await api(`/assignments/${midterm.id}/sessions`, { method: "POST", token: sv02, body: accept });
  const finished = await api(`/attempt-sessions/${done.session.id}/finish`, { method: "POST", token: sv02,
    body: { answers: await answersFor(lecturer, done, { wrongEvery: 3 }) } });
  log(`sv02: nộp giữa kỳ (mã đề ${finished.paper_code}), phần trắc nghiệm ${finished.attempt?.score ?? "?"} điểm, code đang chấm`);
  const codeSubmission = items(await api(`/assignments/${midterm.id}/submissions`, { token: lecturer }))
    .find((s) => s.student_id === finished.attempt?.student_id || s.type === "code");
  if (codeSubmission) await waitSubmission(lecturer, codeSubmission.id).catch(() => null);

  const live = await api(`/assignments/${midterm.id}/sessions`, { method: "POST", token: sv03, body: accept });
  await api(`/attempt-sessions/${live.session.id}/answers`, { method: "PUT", token: sv03,
    body: { answers: await answersFor(lecturer, live, { limit: 3 }) } });
  for (const type of ["focus_lost", "focus_back", "focus_lost", "focus_back"])
    await api(`/attempt-sessions/${live.session.id}/events`, { method: "POST", token: sv03, body: { type } });
  log(`sv03: đang làm giữa kỳ (mã đề ${live.session.paper_code}), đã lưu 3 câu, rời trang 2 lần — tự nộp sau 45 phút`);
}
