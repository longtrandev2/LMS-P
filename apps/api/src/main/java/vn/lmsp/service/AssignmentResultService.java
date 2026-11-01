package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.ReviewDtos.*;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.ScorePolicy;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

/**
 * `GET /assignments/{id}/results` — bảng kết quả theo sinh viên (docs/api-spec.md §6). `final_score` theo `score_policy`:
 * quiz và bài giao theo phiên theo lượt; bài khác best/last từng câu rồi cộng. Submission `failed`/đang chấm không tính
 * điểm nhưng vẫn đếm. Bài giao theo phiên (docs/exam-spec.md §6): `max_score` = điểm một đề, `questions` chỉ gồm câu cố
 * định có ở mọi đề.
 */
@Service
@RequiredArgsConstructor
public class AssignmentResultService {
    private final AssignmentAccess access;
    private final AssignmentQuestionRepository links;
    private final AssignmentAttemptRepository attempts;
    private final SubmissionRepository submissions;
    private final EnrollmentRepository enrollments;
    private final PaperProvider papers;

    @Transactional(readOnly = true)
    public ResultsTable results(Long assignmentId, Long actorId, boolean admin) {
        Assignment assignment = access.lecturerAssignment(assignmentId, actorId, admin, false);
        boolean sessionBased = assignment.isSessionBased();
        List<AssignmentQuestion> questions = links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignmentId);
        BigDecimal maxScore = sessionBased ? papers.maxScore(assignment)
                : questions.stream().map(AssignmentQuestion::getPoints).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sessionBased) questions = questions.stream().filter(link -> link.isFixed() && link.getVariantNo() == null).toList();
        Map<Long, List<Submission>> byStudent = submissions.findAllByAssignment_IdOrderBySubmittedAtDesc(assignmentId).stream()
                .collect(Collectors.groupingBy(Submission::getStudentId));
        boolean quiz = sessionBased || assignment.getCategory() == AssignmentCategory.QUIZ;
        Map<Long, List<AssignmentAttempt>> attemptsByStudent = !quiz ? Map.of()
                : attempts.findAllByAssignment_IdOrderByAttemptNoAsc(assignmentId).stream()
                .collect(Collectors.groupingBy(AssignmentAttempt::getStudentId));
        Map<Long, User> students = new LinkedHashMap<>();
        enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(assignment.getClassId(), EnrollmentStatus.active)
                .forEach(enrollment -> students.put(enrollment.getStudent().getId(), enrollment.getStudent()));
        byStudent.values().forEach(rows -> students.putIfAbsent(rows.getFirst().getStudentId(), rows.getFirst().getStudent()));
        attemptsByStudent.values().forEach(rows -> students.putIfAbsent(rows.getFirst().getStudentId(), rows.getFirst().getStudent()));
        List<AssignmentQuestion> shown = questions;
        List<StudentResult> items = students.values().stream().map(student -> {
            List<Submission> rows = byStudent.getOrDefault(student.getId(), List.of());
            return quiz ? quizRow(assignment, student, shown, maxScore, rows, attemptsByStudent.getOrDefault(student.getId(), List.of()))
                    : questionRow(assignment, student, shown, maxScore, rows);
        }).toList();
        return new ResultsTable(items);
    }

    private StudentResult quizRow(Assignment assignment, User student, List<AssignmentQuestion> questions, BigDecimal maxScore,
                                  List<Submission> rows, List<AssignmentAttempt> tries) {
        AssignmentAttempt chosen = tries.isEmpty() ? null : assignment.getScorePolicy() == ScorePolicy.last ? tries.getLast()
                : tries.stream().max(Comparator.comparing(AssignmentAttempt::getScore)
                        .thenComparing(AssignmentAttempt::getAttemptNo, Comparator.reverseOrder())).orElseThrow();
        AssignmentAttempt latest = tries.isEmpty() ? null : tries.getLast();
        var attemptViews = tries.stream().map(item -> new AttemptResult(item.getId(), item.getAttemptNo(), item.getScore(),
                item.isLate(), item.getSubmittedAt())).toList();
        var questionViews = questions.stream().map(question -> {
            Submission picked = find(rows, chosen, question), last = find(rows, latest, question);
            return new QuestionResult(question.getQuestionId(), picked == null ? null : picked.getScore(), tries.size(),
                    last == null ? null : last.getStatus(), last == null ? null : last.getVerdict());
        }).toList();
        boolean pending = chosen != null && rows.stream().anyMatch(row -> chosen.getId().equals(row.getAssignmentAttemptId())
                && !row.isTerminal());
        return new StudentResult(student.getId(), student.getFullName(), student.getStudentCode(),
                chosen == null ? null : chosen.getScore(), maxScore, tries.size(), attemptViews, questionViews, pending);
    }

    private StudentResult questionRow(Assignment assignment, User student, List<AssignmentQuestion> questions,
                                      BigDecimal maxScore, List<Submission> rows) {
        BigDecimal total = null;
        List<QuestionResult> views = new ArrayList<>();
        for (AssignmentQuestion question : questions) {
            List<Submission> own = rows.stream().filter(row -> row.getQuestionId().equals(question.getQuestionId()))
                    .sorted(Comparator.comparingInt(Submission::getAttemptNo)).toList();
            List<Submission> scored = own.stream().filter(row -> row.getScore() != null && row.isTerminal()).toList();
            BigDecimal finalScore = scored.isEmpty() ? null : assignment.getScorePolicy() == ScorePolicy.last
                    ? scored.getLast().getScore() : scored.stream().map(Submission::getScore).max(Comparator.naturalOrder()).orElseThrow();
            if (finalScore != null) total = total == null ? finalScore : total.add(finalScore);
            Submission last = own.isEmpty() ? null : own.getLast();
            views.add(new QuestionResult(question.getQuestionId(), finalScore, own.size(),
                    last == null ? null : last.getStatus(), last == null ? null : last.getVerdict()));
        }
        return new StudentResult(student.getId(), student.getFullName(), student.getStudentCode(), total, maxScore,
                rows.size(), null, views, rows.stream().anyMatch(row -> !row.isTerminal()));
    }

    private Submission find(List<Submission> rows, AssignmentAttempt attempt, AssignmentQuestion question) {
        if (attempt == null) return null;
        return rows.stream().filter(row -> attempt.getId().equals(row.getAssignmentAttemptId())
                && row.getQuestionId().equals(question.getQuestionId())).findFirst().orElse(null);
    }
}
