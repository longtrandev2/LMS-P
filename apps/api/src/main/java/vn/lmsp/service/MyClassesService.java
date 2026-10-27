package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AcademicsDtos.ClassCardStats;
import vn.lmsp.dto.AcademicsDtos.MyClassView;
import vn.lmsp.dto.AcademicsDtos.Page;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.mapper.AcademicsMapper;
import vn.lmsp.repository.ClassCardQueries;
import vn.lmsp.repository.ClassCardQueries.SessionStats;
import vn.lmsp.repository.EnrollmentRepository;

/** `GET /me/classes` — thẻ lớp của sinh viên kèm số liệu (class-schedule-grades-spec §6). */
@Service
@RequiredArgsConstructor
public class MyClassesService {
    private static final SessionStats NO_SESSIONS = new SessionStats(0, 0, null);
    private final EnrollmentRepository enrollments;
    private final ClassCardQueries cards;
    private final AcademicsMapper mapper;

    @Transactional(readOnly = true)
    public Page<MyClassView> myClasses(Long studentId, int page, int limit, String query, String sort) {
        String field = switch (sort == null ? "" : sort) {
            case "name" -> "lmsClass.name"; case "semester" -> "lmsClass.semester"; default -> "lmsClass.code";
        };
        String term = query == null || query.isBlank() ? null : query.trim();
        var result = enrollments.searchMyClasses(studentId, EnrollmentStatus.active, term,
                PageRequest.of(page - 1, limit, Sort.by(field).ascending()));
        List<Long> ids = result.getContent().stream().map(e -> e.getLmsClass().getId()).toList();
        LocalDateTime now = UtcTime.now();
        Map<Long, SessionStats> sessions = cards.sessionStats(ids, now);
        Map<Long, Long> attended = cards.attendedSessions(ids, studentId);
        Map<Long, Long> materials = cards.materials(ids);
        Map<Long, Long> open = cards.openAssignments(ids, now);
        List<MyClassView> items = result.getContent().stream().map(e -> {
            Long id = e.getLmsClass().getId();
            SessionStats s = sessions.getOrDefault(id, NO_SESSIONS);
            return mapper.toMyClassView(e, new ClassCardStats(s.total(), s.held(), attended.getOrDefault(id, 0L),
                    s.next(), materials.getOrDefault(id, 0L), open.getOrDefault(id, 0L)));
        }).toList();
        return new Page<>(items, result.getTotalElements(), page, limit);
    }
}
