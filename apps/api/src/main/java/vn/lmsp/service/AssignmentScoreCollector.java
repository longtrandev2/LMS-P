package vn.lmsp.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.ReviewDtos.StudentResult;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.AssignmentRepository;

/**
 * Gom điểm bài tập của cả lớp theo thành phần sổ điểm (class-schedule-grades-spec.md §5.2). Điểm từng bài lấy từ
 * {@link AssignmentResultService} (đã áp `score_policy`), quy về thang 10; không nộp = 0. Số truy vấn tỉ lệ với số bài
 * đã đóng, không phụ thuộc số sinh viên. Gọi khi caller đã kiểm tra quyền trên lớp.
 */
@Component
@RequiredArgsConstructor
public class AssignmentScoreCollector {
    private static final BigDecimal TEN = BigDecimal.TEN;
    private final AssignmentRepository assignments;
    private final AssignmentResultService results;

    /** Điểm theo một thành phần: `closed` bài đã đóng được tính, `open` bài đã xuất bản chưa đóng. */
    public record CategoryScores(int closed, int open, Map<Long, BigDecimal> sums, Set<Long> pending) {
        public static final CategoryScores EMPTY = new CategoryScores(0, 0, Map.of(), Set.of());

        /** Trung bình thang 10 (2 chữ số); null khi chưa có bài đóng. */
        public BigDecimal average(Long studentId) {
            if (closed == 0) return null;
            return sums.getOrDefault(studentId, BigDecimal.ZERO).divide(BigDecimal.valueOf(closed), 2, RoundingMode.HALF_UP);
        }

        /** Còn bài chưa đóng hoặc sinh viên còn bài code đang chấm. */
        public boolean provisional(Long studentId) { return open > 0 || pending.contains(studentId); }
    }

    public Map<GradeComponent, CategoryScores> collect(LmsClass clazz, LocalDateTime now) {
        Map<GradeComponent, Builder> builders = new EnumMap<>(GradeComponent.class);
        for (Assignment assignment : assignments.findAllByLmsClass_IdAndPublishedTrueOrderByDueAtAscIdAsc(clazz.getId())) {
            GradeComponent component = componentOf(assignment.getCategory());
            Builder builder = builders.computeIfAbsent(component, ignored -> new Builder());
            if (!now.isAfter(assignment.getClosesAt())) { builder.open++; continue; }
            List<StudentResult> rows = results.results(assignment.getId(), clazz.getLecturerId(), true).items();
            if (rows.isEmpty() || rows.getFirst().max_score() == null || rows.getFirst().max_score().signum() <= 0) continue;
            builder.closed++;
            for (StudentResult row : rows) {
                BigDecimal score = row.final_score() == null ? BigDecimal.ZERO
                        : row.final_score().multiply(TEN).divide(row.max_score(), 4, RoundingMode.HALF_UP);
                builder.sums.merge(row.student_id(), score, BigDecimal::add);
                if (row.grading_pending() || row.questions() != null && row.questions().stream().anyMatch(q -> q.last_status() == SubmissionStatus.pending
                        || q.last_status() == SubmissionStatus.grading)) builder.pending.add(row.student_id());
            }
        }
        Map<GradeComponent, CategoryScores> scores = new EnumMap<>(GradeComponent.class);
        builders.forEach((component, b) -> scores.put(component, new CategoryScores(b.closed, b.open, b.sums, b.pending)));
        return scores;
    }

    static GradeComponent componentOf(AssignmentCategory category) {
        return switch (category) {
            case QUIZ, ASSIGNMENT -> GradeComponent.ASSIGNMENT;
            case MIDTERM -> GradeComponent.MIDTERM;
            case FINAL -> GradeComponent.FINAL;
        };
    }

    private static final class Builder {
        int closed, open;
        final Map<Long, BigDecimal> sums = new HashMap<>();
        final Set<Long> pending = new HashSet<>();
    }
}
