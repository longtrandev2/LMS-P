package vn.lmsp.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.SessionDelivery;
import vn.lmsp.enums.SessionMode;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.EnrollmentRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Buổi học + lịch (FR-CRS-05..07): CRUD buổi, lặp tuần, lịch cá nhân/giảng dạy. */
@Service
public class ClassSessionService {
    private final ClassRepository classes;
    private final ClassSessionRepository sessions;
    private final EnrollmentRepository enrollments;
    public ClassSessionService(ClassRepository classes, ClassSessionRepository sessions, EnrollmentRepository enrollments) {
        this.classes=classes; this.sessions=sessions; this.enrollments=enrollments;
    }
    /** Buổi học của lớp — chỉ thành viên (ghi danh active), giảng viên phụ trách/đồng phụ trách, admin. */
    @Transactional(readOnly=true) public List<SessionView> list(Long classId, Long userId, boolean privileged, LocalDate from, LocalDate to) {
        LmsClass item = clazz(classId);
        checkMember(item, userId, privileged);
        return sessions.byClassInRange(classId, bound(from, false), bound(to, true)).stream().map(ClassSessionService::view).toList();
    }
    /** Tạo buổi lẻ hoặc lặp tuần; trả về danh sách buổi đã tạo. */
    @Transactional public List<SessionView> create(Long classId, SessionInput input, Long actorId) {
        if (input.period_start() < 1 || input.period_end() < input.period_start() || input.period_end() > ClassPeriods.MAX_PERIOD)
            throw invalid("Tiết phải từ 1 đến 12 và period_start <= period_end");
        LmsClass item = clazz(classId);
        SessionMode mode = parse(input.mode(), SessionMode.class, "Chế độ buổi không hợp lệ");
        SessionDelivery delivery = parse(input.delivery(), SessionDelivery.class, "Hình thức buổi không hợp lệ");
        List<LocalDate> dates = input.weekday() != null ? weeklyDates(input) : List.of(requiredDate(input));
        List<ClassSession> created = new ArrayList<>();
        for (LocalDate date : dates)
            created.add(sessions.save(new ClassSession(item, date, input.period_start(), input.period_end(),
                    ClassPeriods.start(input.period_start()), ClassPeriods.end(input.period_end()),
                    input.room(), mode, delivery, input.title())));
        return created.stream().map(ClassSessionService::view).toList();
    }
    @Transactional public SessionView update(Long classId, Long sessionId, SessionPatch input) {
        ClassSession session = session(classId, sessionId);
        requireUpcoming(session, "sửa");
        int start = input.period_start() != null ? input.period_start() : session.getPeriodStart();
        int end = input.period_end() != null ? input.period_end() : session.getPeriodEnd();
        if (start < 1 || end < start || end > ClassPeriods.MAX_PERIOD) throw invalid("Tiết phải từ 1 đến 12 và period_start <= period_end");
        session.update(input.session_date(), start, end,
                start == session.getPeriodStart() && end == session.getPeriodEnd() ? null : ClassPeriods.start(start),
                start == session.getPeriodStart() && end == session.getPeriodEnd() ? null : ClassPeriods.end(end),
                input.room(), parse(input.mode(), SessionMode.class, "Chế độ buổi không hợp lệ"),
                parse(input.delivery(), SessionDelivery.class, "Hình thức buổi không hợp lệ"), input.title());
        return view(session);
    }
    @Transactional public void delete(Long classId, Long sessionId) {
        ClassSession session = session(classId, sessionId); requireUpcoming(session, "xóa"); sessions.delete(session);
    }
    /** Lịch của SV: gộp buổi học mọi lớp đang ghi danh active (FR-CRS-06). */
    @Transactional(readOnly=true) public List<SessionView> mySchedule(Long userId, LocalDate from, LocalDate to) {
        List<Long> classIds = enrollments.findAllByStudent_IdAndStatus(userId, EnrollmentStatus.active)
                .stream().map(e -> e.getLmsClass().getId()).toList();
        return schedule(classIds, from, to);
    }
    /** Lịch giảng dạy: lớp mà user là lecturer hoặc co_lecturer (FR-CRS-07). */
    @Transactional(readOnly=true) public List<SessionView> teachingSchedule(Long userId, LocalDate from, LocalDate to) {
        return schedule(classes.findTeachingClassIds(userId), from, to);
    }
    private List<SessionView> schedule(List<Long> classIds, LocalDate from, LocalDate to) {
        if (classIds.isEmpty()) return List.of();
        return sessions.byClassesInRange(classIds, bound(from, false), bound(to, true)).stream().map(ClassSessionService::view).toList();
    }
    private static void requireUpcoming(ClassSession session, String action) {
        if (session.getSessionDate().isBefore(LocalDate.now()))
            throw failure("VALIDATION_ERROR", "Buổi học đã diễn ra, không thể " + action, HttpStatus.CONFLICT);
    }
    private static LocalDate requiredDate(SessionInput input) {
        if (input.session_date() == null) throw invalid("Cần session_date (buổi lẻ) hoặc weekday + repeat_from + repeat_weeks (lặp tuần)");
        return input.session_date();
    }
    /** Từ repeat_from nhánh tới ngày đầu tiên trùng weekday (ISO: 1=Thứ 2..7=CN) rồi +7 ngày mỗi tuần. */
    private static List<LocalDate> weeklyDates(SessionInput input) {
        if (input.repeat_from() == null || input.repeat_weeks() == null || input.repeat_weeks() < 1)
            throw invalid("Lặp tuần cần repeat_from và repeat_weeks >= 1");
        LocalDate date = input.repeat_from();
        while (date.getDayOfWeek().getValue() != input.weekday()) date = date.plusDays(1);
        List<LocalDate> dates = new ArrayList<>();
        for (int week = 0; week < input.repeat_weeks(); week++) dates.add(date.plusWeeks(week));
        return dates;
    }
    private void checkMember(LmsClass item, Long userId, boolean privileged) {
        boolean teacher = item.getLecturerId().equals(userId) || userId.equals(item.getCoLecturerId());
        if (privileged || teacher || enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(item.getId(), userId, EnrollmentStatus.active)) return;
        throw failure("ENROLLMENT_REQUIRED", "Bạn chưa tham gia lớp học", HttpStatus.FORBIDDEN);
    }
    private static LocalDate bound(LocalDate value, boolean upper) { return value != null ? value : (upper ? LocalDate.of(2999, 12, 31) : LocalDate.of(1970, 1, 1)); }
    private static <E extends Enum<E>> E parse(String value, Class<E> type, String message) {
        if (value == null || value.isBlank()) return null;
        try { return Enum.valueOf(type, value); } catch (Exception error) { throw invalid(message); }
    }
    private static SessionView view(ClassSession s) {
        return new SessionView(s.getId(), s.getClassId(), s.getLmsClass().getCode(), s.getLmsClass().getName(),
                s.getSessionDate(), s.getPeriodStart(), s.getPeriodEnd(), s.getStartTime(), s.getEndTime(),
                s.getRoom(), s.getMode().name(), s.getDelivery().name(), s.getTitle());
    }
    private LmsClass clazz(Long id) { return classes.findById(id).orElseThrow(() -> notFound("Không tìm thấy lớp học")); }
    private ClassSession session(Long classId, Long sessionId) {
        ClassSession s = sessions.findById(sessionId).orElseThrow(() -> notFound("Không tìm thấy buổi học"));
        if (!s.getClassId().equals(classId)) throw notFound("Không tìm thấy buổi học");
        return s;
    }
    private static LmsException invalid(String message) { return failure("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST); }
    private static LmsException notFound(String message) { return failure("NOT_FOUND", message, HttpStatus.NOT_FOUND); }
    private static LmsException failure(String code, String message, HttpStatus status) { return new LmsException(code, message, status, null); }
}
