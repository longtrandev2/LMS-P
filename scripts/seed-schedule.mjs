/** Seed lịch học, điểm danh, đơn xin nghỉ, điểm GK/CK (docs/class-schedule-grades-spec.md). */
import { api, items, log } from "./seed-lib.mjs";

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86_400_000);
/** Thứ 2 của tuần cách đây `weeksAgo` tuần (theo giờ máy, đủ cho dữ liệu demo). */
function mondayWeeksAgo(weeksAgo) {
  const now = new Date();
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  return addDays(monday, -7 * weeksAgo);
}
// Trạng thái điểm danh theo sinh viên cho các buổi đã qua (vòng lặp qua danh sách)
const PATTERNS = {
  SV000001: ["present", "present", "late", "present", "present", "present"],
  SV000002: ["present", "absent", "present", "excused", "present", "absent"],
  SV000003: ["present", "present", "present", "present", "absent", "present"],
};

export async function seedSchedule({ admin, lecturer, student, klass, course }) {
  console.log("Lịch học & điểm danh:");
  if (course?.credits !== 3) await api(`/courses/${course.id}`, { method: "PATCH", token: admin, body: { credits: 3 } }).catch(() => null);
  let sessions = await api(`/classes/${klass.id}/sessions`, { token: lecturer });
  if (items(sessions).length) log(`Buổi học: đã có ${items(sessions).length} buổi`);
  else {
    const from = mondayWeeksAgo(4);
    const result = await api(`/classes/${klass.id}/sessions/generate`, { method: "POST", token: lecturer, body: {
      from: iso(from), to: iso(addDays(from, 7 * 15 - 1)), replace_unmarked: false,
      patterns: [{ weekday: 2, start_period: 1, end_period: 3, room: "A1.1", mode: "in_person" },
                 { weekday: 4, start_period: 10, end_period: 11, room: "Online", mode: "online" }] } });
    log(`Buổi học: tạo ${result.created} buổi (15 tuần, Thứ 3 tiết 1–3 tại A1.1 và Thứ 5 tiết 10–11 online)`);
    sessions = await api(`/classes/${klass.id}/sessions`, { token: lecturer });
  }
  const list = items(sessions);
  const past = list.filter((s) => !s.is_cancelled && new Date(`${s.ends_at}Z`) < new Date());
  const untaken = past.filter((s) => !s.attendance_taken_at);
  for (const session of untaken) {
    const sheet = await api(`/sessions/${session.id}/attendance`, { token: lecturer });
    const records = sheet.items.map((row) => {
      const pattern = PATTERNS[row.student_code] ?? ["present"];
      return { student_id: row.student_id, status: pattern[(session.session_no - 1) % pattern.length] };
    });
    await api(`/sessions/${session.id}/attendance`, { method: "PUT", token: lecturer, body: { records } });
  }
  log(`Điểm danh: ${untaken.length ? `điểm danh ${untaken.length} buổi đã qua` : `đã có (${past.length} buổi đã qua)`}`);

  const upcoming = list.find((s) => !s.is_cancelled && new Date(`${s.starts_at}Z`) > new Date());
  const mine = items(await api(`/classes/${klass.id}/leave-requests`, { token: student }));
  if (mine.length || !upcoming) log("Đơn xin nghỉ: đã có hoặc không còn buổi sắp tới");
  else {
    const form = new FormData();
    form.append("reason", "Em bị sốt, xin phép nghỉ buổi học này. Em gửi kèm giấy khám bệnh.");
    form.append("evidence", new Blob(["%PDF-1.4\n% giay kham benh demo\n"], { type: "application/pdf" }), "giay-kham-benh.pdf");
    const request = await api(`/sessions/${upcoming.id}/leave-requests`, { method: "POST", token: student, form });
    log(`Đơn xin nghỉ: sinh viên demo gửi đơn cho buổi ${upcoming.session_no} (đang chờ duyệt, id ${request.id})`);
  }

  console.log("Sổ điểm:");
  // Đóng quiz đầu tiên để thành phần Bài tập có điểm (điều chỉnh lịch bài đã xuất bản, có lý do — FR-ASG-07)
  const quiz = items(await api(`/classes/${klass.id}/assignments`, { token: lecturer })).find((a) => a.title === "Kiểm tra nhanh — Mạng cơ bản");
  if (quiz && new Date(`${quiz.due_at}Z`) > new Date()) {
    await api(`/assignments/${quiz.id}/published-settings`, { method: "PATCH", token: lecturer, body: {
      title: quiz.title, description: quiz.description, available_from: quiz.available_from,
      due_at: new Date(Date.now() - 3_600_000).toISOString().slice(0, 19), allow_late: false, late_due_at: null,
      late_penalty_percent: 0, reason: "Demo: đóng quiz tuần 1 để tính điểm thành phần Bài tập" } });
    log("Đã đóng quiz \"Kiểm tra nhanh\" để tính điểm Bài tập");
  }
  await api(`/classes/${klass.id}/grade-policy`, { method: "PUT", token: lecturer, body: {
    weights: { attendance: 10, assignment: 20, midterm: 20, final: 50 },
    attendance: { max_absences: 6, absent_penalty: 2, late_penalty: 0.5, excused_penalty: 0 } } });
  log("Chính sách: CC 10% · BT 20% · GK 20% · CK 50%; nghỉ tối đa 6 buổi, vắng không phép −2, muộn −0,5");
  const rows = [{ row: 1, student_code: "SV000001", midterm: 8.5, final: 9 },
                { row: 2, student_code: "SV000002", midterm: 6, final: 7.5 },
                { row: 3, student_code: "SV000003", midterm: 7.25, final: null }];
  const result = await api(`/classes/${klass.id}/grades/import`, { method: "POST", token: lecturer, body: { rows } });
  log(`Nhập CSV điểm GK/CK: ${result.imported} dòng (SV000003 chưa có điểm cuối kỳ → tạm tính)`);
  const mineGrades = await api(`/me/classes/${klass.id}/grades`, { token: student });
  log(`Điểm sinh viên demo: hệ 10 = ${mineGrades.total10 ?? "chưa đủ"} · chữ ${mineGrades.letter ?? "—"} · ${mineGrades.status}`);
}
