package vn.lmsp.support;

import static vn.lmsp.support.DomainFixtures.*;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.PageImpl;
import vn.lmsp.enums.EnrollmentVia;
import vn.lmsp.enums.LeaveRequestStatus;
import vn.lmsp.enums.SessionMode;
import vn.lmsp.model.*;

/** Dữ liệu mẫu cho lịch học/điểm danh/đơn xin nghỉ. Lớp mẫu id 3, giảng viên id 7. */
public final class ScheduleFixtures {
    private ScheduleFixtures() { }

    public static ClassSession session(LmsClass clazz, long id, int no, LocalDate date, int start, int end) {
        return identified(new ClassSession(clazz, no, date, start, end, "A101", SessionMode.in_person, null, null,
                clazz.getLecturer()), id);
    }

    public static Enrollment enrollment(LmsClass clazz, User student) {
        return new Enrollment(clazz, student, EnrollmentVia.lecturer);
    }

    public static PageImpl<Enrollment> roster(LmsClass clazz, User... students) {
        return new PageImpl<>(List.of(students).stream().map(s -> enrollment(clazz, s)).toList());
    }

    public static LeaveRequest leave(ClassSession session, User student, long id, LeaveRequestStatus status) {
        LeaveRequest item = identified(new LeaveRequest(session, student, "Ốm", "leave-requests/3/x.pdf", "giay-kham.pdf",
                1200, "application/pdf"), id);
        if (status == LeaveRequestStatus.cancelled) item.cancel();
        else if (status != LeaveRequestStatus.pending) item.review(status, null, clazzLecturer(session), null);
        return item;
    }

    private static User clazzLecturer(ClassSession session) { return session.getLmsClass().getLecturer(); }
}
