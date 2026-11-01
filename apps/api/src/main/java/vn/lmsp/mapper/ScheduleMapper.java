package vn.lmsp.mapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.ScheduleDtos.*;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LeaveRequest;
import vn.lmsp.model.Material;
import vn.lmsp.model.User;

@Component
public class ScheduleMapper {
    public SessionView toSessionView(ClassSession s, String lecturerName, List<Material> materials,
                                     AttendanceStatus myStatus, LeaveRequestView myLeave) {
        List<SessionMaterial> items = materials.stream()
                .map(m -> new SessionMaterial(m.getId(), m.getTitle(), m.getType())).toList();
        return new SessionView(s.getId(), s.getClassId(), s.getSessionNo(), s.getSessionDate(), s.getStartPeriod(),
                s.getEndPeriod(), s.getStartsAt(), s.getEndsAt(), s.getRoom(), s.getMode(), s.getTitle(), s.getNote(),
                s.isCancelled(), s.getAttendanceTakenAt(), lecturerName, items, myStatus, myLeave);
    }

    public LeaveRequestView toLeaveView(LeaveRequest l) {
        ClassSession s = l.getSession(); User student = l.getStudent(); User reviewer = l.getReviewer();
        return new LeaveRequestView(l.getId(), l.getClassId(), s.getId(), s.getSessionDate(), s.getStartPeriod(),
                s.getEndPeriod(), student.getId(), student.getStudentCode(), student.getFullName(), l.getReason(),
                l.getEvidenceName(), l.getEvidenceSize(), l.getStatus(), l.getReviewNote(),
                reviewer == null ? null : reviewer.getFullName(), l.getReviewedAt(), l.getCreatedAt());
    }

    public Map<String, Object> toSessionAudit(ClassSession s) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("class_id", s.getClassId());
        value.put("session_no", s.getSessionNo());
        value.put("date", s.getSessionDate().toString());
        value.put("start_period", s.getStartPeriod());
        value.put("end_period", s.getEndPeriod());
        value.put("room", s.getRoom());
        value.put("mode", s.getMode().name());
        value.put("title", s.getTitle());
        value.put("is_cancelled", s.isCancelled());
        return value;
    }
}
