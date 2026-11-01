package vn.lmsp.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.ScheduleDtos.GenerateInput;
import vn.lmsp.dto.ScheduleDtos.GenerateResult;
import vn.lmsp.dto.ScheduleDtos.WeeklyPattern;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.UserRepository;

/** Sinh hàng loạt buổi học theo khoảng ngày + mẫu tuần — class-schedule-grades-spec §2.2. */
@Service
@RequiredArgsConstructor
public class SessionGenerateService {
    static final int MAX_WEEKS = 26;
    private final ClassSessionRepository sessions;
    private final UserRepository users;
    private final ClassAccess access;
    private final SessionNumbering numbering;
    private final AuditService audit;

    @Transactional
    public GenerateResult generate(Long classId, GenerateInput input, Long actor, boolean admin) {
        LmsClass clazz = access.manageLocked(classId, actor, admin);
        validate(input);
        boolean replace = Boolean.TRUE.equals(input.replace_unmarked());
        int removed = 0;
        if (replace) {
            List<Long> ids = sessions.findReplaceableIds(classId);
            if (!ids.isEmpty()) removed = sessions.deleteByIds(ids);
        }
        List<ClassSession> kept = sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(classId);
        List<ClassSession> planned = plan(clazz, input, kept, users.getReferenceById(actor));
        SessionNumbering.requireCapacity(kept.size() + planned.size());
        if (!planned.isEmpty()) {
            sessions.saveAll(planned);
            sessions.flush();
        }
        if (removed > 0 || !planned.isEmpty()) numbering.renumber(classId);
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("from", input.from().toString()); value.put("to", input.to().toString());
        value.put("patterns", input.patterns().size()); value.put("replace_unmarked", replace);
        value.put("created", planned.size()); value.put("removed", removed);
        audit.record(actor, "session.generate", "class", classId, null, value);
        return new GenerateResult(planned.size(), removed);
    }

    /** Một buổi cho mỗi ngày khớp mẫu; bỏ qua ngày đã có buổi trùng tiết (chế độ thêm vào). */
    private List<ClassSession> plan(LmsClass clazz, GenerateInput input, List<ClassSession> kept, User creator) {
        List<ClassSession> planned = new ArrayList<>();
        int number = SessionNumbering.nextTemporaryNumber(kept);
        for (LocalDate day = input.from(); !day.isAfter(input.to()); day = day.plusDays(1)) {
            for (WeeklyPattern p : input.patterns()) {
                if (p.weekday() != day.getDayOfWeek().getValue()) continue;
                LocalDate date = day;
                boolean taken = kept.stream().anyMatch(s -> s.overlaps(date, p.start_period(), p.end_period()));
                if (taken) continue;
                planned.add(new ClassSession(clazz, number++, day, p.start_period(), p.end_period(),
                        ScheduleErrors.blankToNull(p.room()), p.mode(), null, null, creator));
                if (kept.size() + planned.size() > SessionNumbering.MAX_SESSIONS) return planned;
            }
        }
        return planned;
    }

    static void validate(GenerateInput input) {
        if (input.from().isAfter(input.to())) throw ScheduleErrors.invalid("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        if (input.to().isAfter(input.from().plusWeeks(MAX_WEEKS)))
            throw ScheduleErrors.invalid("Khoảng ngày tối đa " + MAX_WEEKS + " tuần");
        List<WeeklyPattern> patterns = input.patterns();
        for (int i = 0; i < patterns.size(); i++) {
            WeeklyPattern p = patterns.get(i);
            SessionNumbering.validatePeriods(p.start_period(), p.end_period());
            for (int j = 0; j < i; j++) {
                WeeklyPattern q = patterns.get(j);
                if (q.weekday().equals(p.weekday()) && p.start_period() <= q.end_period() && q.start_period() <= p.end_period())
                    throw ScheduleErrors.invalid("Các mẫu tuần cùng thứ không được trùng tiết");
            }
        }
    }
}
