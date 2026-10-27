package vn.lmsp.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.SessionClock;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AdminDtos.DailyStat;
import vn.lmsp.dto.AdminDtos.StatsView;
import vn.lmsp.repository.AdminStatsQueries;
import vn.lmsp.repository.AdminStatsQueries.DayCount;
import vn.lmsp.repository.AdminStatsQueries.DayValue;
import vn.lmsp.repository.AdminStatsQueries.VerdictCount;

/** Thống kê tổng quan cho admin — docs/admin-spec.md §2. Ngày tính theo giờ Việt Nam, đủ mọi ngày trong kỳ. */
@Service
@RequiredArgsConstructor
public class AdminStatsService {
    static final List<String> VERDICTS = List.of("AC", "WA", "TLE", "MLE", "RE", "CE", "OLE", "SYSTEM_ERROR");
    static final String CSV_HEADER = "Ngày,Bài nộp khách quan,Bài nộp code,Người dùng mới,"
            + "Độ trễ chấm trung bình (ms),Độ trễ chấm p95 (ms)";
    private final AdminStatsQueries queries;

    public record Export(String filename, byte[] content) { }
    private record Range(LocalDate first, int days, LocalDateTime from, LocalDateTime to) { }

    @Transactional(readOnly = true)
    public StatsView stats(int days) {
        LocalDateTime now = UtcTime.now();
        Range range = range(days, now);
        LocalDate today = range.first().plusDays(days - 1L);
        return new StatsView(now, days, queries.totals(utcStart(today), range.to()), daily(range),
                verdicts(queries.codeVerdicts(range.from(), range.to())), queries.topClasses(range.from(), range.to(), 5));
    }

    @Transactional(readOnly = true)
    public Export export(int days) {
        List<DailyStat> rows = daily(range(days, UtcTime.now()));
        return new Export("thong-ke-" + days + "-ngay.csv", toCsv(rows).getBytes(StandardCharsets.UTF_8));
    }

    static String toCsv(List<DailyStat> rows) {
        StringBuilder csv = new StringBuilder(CsvWriter.BOM).append(CSV_HEADER).append(CsvWriter.EOL);
        rows.forEach(row -> csv.append(CsvWriter.row(row.date().toString(), row.submissions_objective(),
                row.submissions_code(), row.new_users(), row.grading_avg_ms(), row.grading_p95_ms())));
        return csv.toString();
    }

    private Range range(int days, LocalDateTime nowUtc) {
        if (days != 7 && days != 30)
            throw new LmsException("VALIDATION_ERROR", "Số ngày thống kê chỉ nhận 7 hoặc 30", HttpStatus.BAD_REQUEST, null);
        LocalDate today = SessionClock.toLocal(nowUtc).toLocalDate();
        LocalDate first = today.minusDays(days - 1L);
        return new Range(first, days, utcStart(first), utcStart(today.plusDays(1)));
    }

    /** Mốc UTC của 00:00 giờ VN ngày `date`. */
    static LocalDateTime utcStart(LocalDate date) {
        return date.atStartOfDay(SessionClock.ZONE).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }

    private List<DailyStat> daily(Range range) {
        return assembleDaily(range.first(), range.days(), queries.submissionsByDay(range.from(), range.to()),
                queries.newUsersByDay(range.from(), range.to()), queries.gradingLatencies(range.from(), range.to()));
    }

    /** Ghép số liệu theo ngày; ngày không có dữ liệu ra 0 (độ trễ null). */
    static List<DailyStat> assembleDaily(LocalDate first, int days, List<DayCount> submissions, List<DayValue> newUsers,
                                         List<DayValue> latencies) {
        Map<LocalDate, DayCount> byDay = new HashMap<>();
        submissions.forEach(row -> byDay.put(row.date(), row));
        Map<LocalDate, Long> users = new HashMap<>();
        newUsers.forEach(row -> users.merge(row.date(), row.value(), Long::sum));
        Map<LocalDate, List<Long>> samples = new HashMap<>();
        latencies.forEach(row -> samples.computeIfAbsent(row.date(), ignored -> new ArrayList<>()).add(Math.max(0, row.value())));
        List<DailyStat> result = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            LocalDate date = first.plusDays(i);
            DayCount count = byDay.get(date);
            List<Long> values = samples.getOrDefault(date, List.of());
            result.add(new DailyStat(date, count == null ? 0 : count.objective(), count == null ? 0 : count.code(),
                    users.getOrDefault(date, 0L), average(values), p95(values)));
        }
        return result;
    }

    static Long average(List<Long> values) {
        if (values.isEmpty()) return null;
        return Math.round(values.stream().mapToLong(Long::longValue).average().orElse(0));
    }

    /** p95 theo nearest-rank: phần tử thứ ⌈0,95·n⌉ của dãy đã sắp xếp. */
    static Long p95(List<Long> values) {
        if (values.isEmpty()) return null;
        long[] sorted = values.stream().mapToLong(Long::longValue).sorted().toArray();
        int rank = (int) Math.ceil(0.95 * sorted.length);
        return sorted[Math.max(0, rank - 1)];
    }

    /** Verdict cuối của bài code (mọi khóa luôn có mặt) + `failed` = số bài `status = failed`. */
    static Map<String, Long> verdicts(List<VerdictCount> rows) {
        Map<String, Long> result = new LinkedHashMap<>();
        VERDICTS.forEach(key -> result.put(key, 0L));
        result.put("failed", 0L);
        for (VerdictCount row : rows) {
            if (row.verdict() != null && result.containsKey(row.verdict()) && !"failed".equals(row.verdict()))
                result.merge(row.verdict(), row.count(), Long::sum);
            if ("failed".equals(row.status())) result.merge("failed", row.count(), Long::sum);
        }
        return result;
    }
}
