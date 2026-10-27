package vn.lmsp.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.ScheduleDtos.LeaveRequestView;
import vn.lmsp.dto.ScheduleDtos.SessionView;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.Material;
import vn.lmsp.repository.AttendanceRecordRepository;
import vn.lmsp.repository.LeaveRequestRepository;
import vn.lmsp.repository.MaterialRepository;

/** Dựng `Session` view (api-spec §11) cho nhiều buổi bằng truy vấn gộp theo danh sách buổi. */
@Component
@RequiredArgsConstructor
public class SessionViewAssembler {
    private final MaterialRepository materials;
    private final AttendanceRecordRepository records;
    private final LeaveRequestRepository leaveRequests;
    private final ScheduleMapper mapper;

    /** studentId null = người gọi là giảng viên/admin (không kèm `my_*`). */
    public List<SessionView> views(LmsClass clazz, List<ClassSession> sessions, Long studentId) {
        if (sessions.isEmpty()) return List.of();
        List<Long> ids = sessions.stream().map(ClassSession::getId).toList();
        String lecturerName = clazz.getLecturer().getFullName();
        Map<Long, List<Material>> attached = new HashMap<>();
        materials.findBySessionIdInOrderByCreatedAtAscIdAsc(ids)
                .forEach(m -> attached.computeIfAbsent(m.getSessionId(), k -> new ArrayList<>()).add(m));
        Map<Long, AttendanceStatus> mine = new HashMap<>();
        Map<Long, LeaveRequestView> leaves = new HashMap<>();
        if (studentId != null) {
            records.findBySession_IdInAndStudentId(ids, studentId).forEach(r -> mine.put(r.getSession().getId(), r.getStatus()));
            leaveRequests.findActiveBySessions(ids, studentId)
                    .forEach(l -> leaves.putIfAbsent(l.getSessionId(), mapper.toLeaveView(l)));
        }
        return sessions.stream().map(s -> mapper.toSessionView(s, lecturerName, attached.getOrDefault(s.getId(), List.of()),
                mine.get(s.getId()), leaves.get(s.getId()))).toList();
    }

    public SessionView view(LmsClass clazz, ClassSession session, Long studentId) {
        return views(clazz, List.of(session), studentId).get(0);
    }
}
