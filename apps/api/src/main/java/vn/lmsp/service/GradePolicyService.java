package vn.lmsp.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.GradebookDtos.*;
import vn.lmsp.model.LmsClass;

/** `GET/PUT /classes/{id}/grade-policy` — docs/api-spec.md §8, class-schedule-grades-spec.md §5.1, §5.3. */
@Service
@RequiredArgsConstructor
public class GradePolicyService {
    private static final BigDecimal FOUR = BigDecimal.valueOf(4);
    private final GradebookAccess access;
    private final AuditService audit;
    private final ObjectMapper json;
    private final SettingsProvider settings;

    @Transactional(readOnly = true)
    public GradePolicy get(Long classId, Long actorId, boolean admin, boolean student) {
        return GradePolicyCodec.read(access.memberClass(classId, actorId, admin, student).getGradePolicy(),
                settings.defaultGradePolicy());
    }

    @Transactional
    public GradePolicy update(Long classId, GradePolicyInput input, Long actorId, boolean admin) {
        LmsClass item = access.lecturerClass(classId, actorId, admin);
        GradePolicy policy = validate(input);
        GradePolicy old = GradePolicyCodec.read(item.getGradePolicy(), settings.defaultGradePolicy());
        item.setGradePolicy(json.valueToTree(policy));
        audit.record(actorId, "grade.policy", "class", classId, asMap(old), asMap(policy));
        return policy;
    }

    /** Trọng số nguyên 0–100 tổng đúng 100; penalty 0–10 bước 0,25; max_absences null hoặc 0–200. */
    static GradePolicy validate(GradePolicyInput input) {
        Map<String, String> errors = new LinkedHashMap<>();
        WeightsInput w = input.weights();
        int attendance = weight(w.attendance(), "weights.attendance", errors), assignment = weight(w.assignment(), "weights.assignment", errors);
        int midterm = weight(w.midterm(), "weights.midterm", errors), finalExam = weight(w.finalExam(), "weights.final", errors);
        if (errors.isEmpty() && attendance + assignment + midterm + finalExam != 100)
            errors.put("weights", "Tổng trọng số phải đúng 100%");
        AttendancePolicyInput a = input.attendance();
        Integer maxAbsences = a.max_absences();
        if (maxAbsences != null && (maxAbsences < 0 || maxAbsences > 200))
            errors.put("attendance.max_absences", "Số buổi nghỉ cho phép từ 0 đến 200");
        BigDecimal absent = penalty(a.absent_penalty(), "attendance.absent_penalty", errors);
        BigDecimal late = penalty(a.late_penalty(), "attendance.late_penalty", errors);
        BigDecimal excused = penalty(a.excused_penalty(), "attendance.excused_penalty", errors);
        if (!errors.isEmpty()) throw new LmsException("VALIDATION_ERROR", errors.values().iterator().next(), HttpStatus.BAD_REQUEST, errors);
        return new GradePolicy(new Weights(attendance, assignment, midterm, finalExam),
                new AttendancePolicy(maxAbsences, absent, late, excused));
    }

    private static int weight(BigDecimal value, String field, Map<String, String> errors) {
        if (value == null || value.signum() < 0 || value.compareTo(BigDecimal.valueOf(100)) > 0
                || value.stripTrailingZeros().scale() > 0) {
            errors.put(field, "Trọng số phải là số nguyên từ 0 đến 100");
            return 0;
        }
        return value.intValueExact();
    }

    private static BigDecimal penalty(BigDecimal value, String field, Map<String, String> errors) {
        if (value == null || value.signum() < 0 || value.compareTo(BigDecimal.TEN) > 0
                || value.multiply(FOUR).stripTrailingZeros().scale() > 0) {
            errors.put(field, "Điểm trừ phải từ 0 đến 10, bước 0,25");
            return BigDecimal.ZERO;
        }
        return GradePolicyCodec.plain(value);
    }

    private Map<String, Object> asMap(GradePolicy policy) {
        return json.convertValue(policy, new TypeReference<Map<String, Object>>() { });
    }
}
