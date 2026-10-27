package vn.lmsp.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.MonitorRow;
import vn.lmsp.dto.AttemptSessionDtos.MonitorStatus;
import vn.lmsp.dto.AttemptSessionDtos.MonitorSummary;
import vn.lmsp.dto.AttemptSessionDtos.MonitorTable;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

/**
 * `GET /assignments/{id}/sessions` — màn giám sát (docs/exam-spec.md §7). Mỗi sinh viên ghi danh active (và sinh viên đã
 * có phiên dù không còn ghi danh) một dòng theo phiên mới nhất. Số truy vấn cố định, không tăng theo số sinh viên.
 */
@Service
@RequiredArgsConstructor
public class SessionMonitorService {
    /** `last_seen_at` cũ hơn ngưỡng này thì coi là mất kết nối — exam-spec.md §5.5. */
    static final int ONLINE_SECONDS = 45;
    private static final List<SubmissionStatus> GRADING = List.of(SubmissionStatus.pending, SubmissionStatus.grading);

    private final AssignmentAccess access;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AttemptSessionRepository sessions;
    private final SessionAnswerRepository answers;
    private final AssessmentPaperRepository papers;
    private final AssignmentAttemptRepository attempts;
    private final SubmissionRepository submissions;
    private final PaperProvider paperProvider;

    /** Dữ liệu gộp của cả bảng, nạp một lần. */
    private record Context(LocalDateTime now, Map<Long, Long> answered, Map<Long, AssessmentPaper> papers,
                           Map<Long, BigDecimal> scores, Set<Long> grading, BigDecimal fallbackMax) { }

    @Transactional(readOnly = true)
    public MonitorTable monitor(Long assignmentId, Long actorId, boolean admin) {
        Assignment assignment = access.lecturerAssignment(assignmentId, actorId, admin, false);
        if (!assignment.isSessionBased())
            throw new LmsException("CONFLICT", "Bài không làm theo phiên", HttpStatus.CONFLICT, null);
        LocalDateTime now = UtcTime.now();
        Map<Long, AttemptSession> latest = new HashMap<>();
        sessions.findAllByAssignment_IdOrderByStudent_IdAscAttemptNoDesc(assignmentId)
                .forEach(session -> latest.putIfAbsent(session.getStudentId(), session));
        Set<Long> studentIds = new LinkedHashSet<>();
        enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(assignment.getClassId(), EnrollmentStatus.active)
                .forEach(enrollment -> studentIds.add(enrollment.getStudent().getId()));
        studentIds.addAll(new TreeSet<>(latest.keySet()));
        Map<Long, User> students = users.findAllById(studentIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        Context context = context(assignment, latest.values(), now, latest.size() < studentIds.size());
        List<MonitorRow> rows = studentIds.stream().filter(students::containsKey)
                .map(id -> row(students.get(id), latest.get(id), context)).toList();
        return new MonitorTable(now, summary(rows), rows);
    }

    private Context context(Assignment assignment, Collection<AttemptSession> latest, LocalDateTime now, boolean anyMissing) {
        Map<Long, Long> answered = new HashMap<>();
        Map<Long, AssessmentPaper> paperById = new HashMap<>();
        if (!latest.isEmpty()) {
            for (Object[] row : answers.countAnsweredBySession(latest.stream().map(AttemptSession::getId).toList()))
                answered.put((Long) row[0], ((Number) row[1]).longValue());
            papers.findAllById(latest.stream().map(AttemptSession::getPaperId).collect(Collectors.toSet()))
                    .forEach(paper -> paperById.put(paper.getId(), paper));
        }
        Map<Long, BigDecimal> scores = new HashMap<>();
        attempts.findAllByAssignment_IdOrderByAttemptNoAsc(assignment.getId())
                .forEach(attempt -> scores.put(attempt.getId(), attempt.getScore()));
        Set<Long> grading = new HashSet<>(submissions.findAttemptIdsWithStatus(assignment.getId(), GRADING));
        boolean needsFallback = anyMissing || latest.stream().anyMatch(session -> !paperById.containsKey(session.getPaperId()));
        return new Context(now, answered, paperById, scores, grading,
                needsFallback ? paperProvider.maxScore(assignment) : null);
    }

    private MonitorRow row(User student, AttemptSession session, Context context) {
        if (session == null) return new MonitorRow(student.getId(), student.getFullName(), student.getStudentCode(), null,
                MonitorStatus.not_started, null, null, null, null, null, 0, 0, 0, null, false, null, null,
                context.fallbackMax(), false);
        boolean inProgress = session.isInProgress();
        boolean online = inProgress && !session.getLastSeenAt().isBefore(context.now().minusSeconds(ONLINE_SECONDS));
        AssessmentPaper paper = context.papers().get(session.getPaperId());
        Long attemptId = session.getAssignmentAttemptId();
        return new MonitorRow(student.getId(), student.getFullName(), student.getStudentCode(), session.getId(),
                inProgress ? MonitorStatus.in_progress : MonitorStatus.submitted, session.getAttemptNo(),
                paper == null ? null : paper.getCode(), session.getStartedAt(), session.getEndsAt(),
                inProgress ? session.remainingSeconds(context.now()) : null,
                context.answered().getOrDefault(session.getId(), 0L).intValue(), session.getQuestionOrder().size(),
                session.getFocusLostCount(), session.getLastSeenAt(), online, session.getSubmitReason(),
                attemptId == null ? null : context.scores().get(attemptId),
                paper == null ? context.fallbackMax() : paper.getTotalPoints(),
                attemptId != null && context.grading().contains(attemptId));
    }

    private MonitorSummary summary(List<MonitorRow> rows) {
        int notStarted = 0, inProgress = 0, submitted = 0, offline = 0;
        for (MonitorRow row : rows) {
            switch (row.status()) {
                case not_started -> notStarted++;
                case in_progress -> { inProgress++; if (!row.online()) offline++; }
                case submitted -> submitted++;
            }
        }
        return new MonitorSummary(rows.size(), notStarted, inProgress, submitted, offline);
    }
}
