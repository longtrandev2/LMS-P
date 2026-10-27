package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.SessionClock;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AdminDtos.*;
import vn.lmsp.repository.AdminStatsQueries;
import vn.lmsp.repository.AdminStatsQueries.DayCount;
import vn.lmsp.repository.AdminStatsQueries.DayValue;
import vn.lmsp.repository.AdminStatsQueries.VerdictCount;

class AdminStatsServiceTest {
    private final AdminStatsQueries queries = mock(AdminStatsQueries.class);
    private final AdminStatsService service = new AdminStatsService(queries);

    @Test void everyDayInRangeIsPresentWithZerosAndNullLatency() {
        LocalDate first = LocalDate.of(2026, 10, 21);
        var daily = AdminStatsService.assembleDaily(first, 7,
                List.of(new DayCount(LocalDate.of(2026, 10, 23), 4, 2)),
                List.of(new DayValue(LocalDate.of(2026, 10, 27), 3)),
                List.of(new DayValue(LocalDate.of(2026, 10, 23), 100), new DayValue(LocalDate.of(2026, 10, 23), 300),
                        new DayValue(LocalDate.of(2026, 10, 23), -5)));

        assertThat(daily).hasSize(7);
        assertThat(daily).extracting(DailyStat::date).containsExactly(first, first.plusDays(1), first.plusDays(2),
                first.plusDays(3), first.plusDays(4), first.plusDays(5), first.plusDays(6));
        assertThat(daily.get(0)).isEqualTo(new DailyStat(first, 0, 0, 0, null, null));
        assertThat(daily.get(2)).isEqualTo(new DailyStat(LocalDate.of(2026, 10, 23), 4, 2, 0, 133L, 300L));
        assertThat(daily.get(6).new_users()).isEqualTo(3);
    }

    @Test void p95UsesNearestRank() {
        assertThat(AdminStatsService.p95(List.of())).isNull();
        assertThat(AdminStatsService.p95(List.of(42L))).isEqualTo(42);
        List<Long> hundred = new java.util.ArrayList<>();
        for (long i = 100; i >= 1; i--) hundred.add(i);
        assertThat(AdminStatsService.p95(hundred)).isEqualTo(95);
        assertThat(AdminStatsService.p95(List.of(10L, 20L, 30L))).isEqualTo(30);
        assertThat(AdminStatsService.average(List.of(1L, 2L))).isEqualTo(2);
    }

    @Test void verdictsHaveEveryKeyAndCountFailedByStatus() {
        var verdicts = AdminStatsService.verdicts(List.of(new VerdictCount("completed", "AC", 5),
                new VerdictCount("completed", "WA", 2), new VerdictCount("failed", "SYSTEM_ERROR", 3),
                new VerdictCount("pending", null, 7), new VerdictCount("completed", "OK", 9)));

        assertThat(verdicts.keySet()).containsExactly("AC", "WA", "TLE", "MLE", "RE", "CE", "OLE", "SYSTEM_ERROR", "failed");
        assertThat(verdicts).containsEntry("AC", 5L).containsEntry("WA", 2L).containsEntry("TLE", 0L)
                .containsEntry("SYSTEM_ERROR", 3L).containsEntry("failed", 3L);
    }

    @Test void onlySevenOrThirtyDaysAreAccepted() {
        for (int days : new int[] {0, 1, 14, 31, -7}) {
            assertThatThrownBy(() -> service.stats(days)).isInstanceOfSatisfying(LmsException.class,
                    error -> assertThat(error.getStatus().value()).isEqualTo(400));
            assertThatThrownBy(() -> service.export(days)).isInstanceOf(LmsException.class);
        }
        verifyNoInteractions(queries);
    }

    @Test void statsUseVietnamDayBoundariesInUtc() {
        var totals = new Totals(new UserTotals(10, 2, 1, 1), 3, 4, 1);
        when(queries.totals(any(), any())).thenReturn(totals);
        when(queries.topClasses(any(), any(), eq(5))).thenReturn(List.of(new TopClass(1L, "LTM01", "Lập trình mạng", 9)));

        var view = service.stats(30);

        LocalDate today = SessionClock.toLocal(UtcTime.now()).toLocalDate();
        var from = ArgumentCaptor.forClass(LocalDateTime.class);
        var to = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(queries).submissionsByDay(from.capture(), to.capture());
        assertThat(from.getValue()).isEqualTo(today.minusDays(29).atStartOfDay().minusHours(7));
        assertThat(to.getValue()).isEqualTo(today.plusDays(1).atStartOfDay().minusHours(7));
        verify(queries).totals(today.atStartOfDay().minusHours(7), to.getValue());
        assertThat(view.days()).isEqualTo(30);
        assertThat(view.daily()).hasSize(30);
        assertThat(view.daily().get(29).date()).isEqualTo(today);
        assertThat(view.totals()).isSameAs(totals);
        assertThat(view.top_classes()).hasSize(1);
        assertThat(view.verdicts()).containsEntry("failed", 0L);
    }

    @Test void csvHasBomVietnameseHeaderAndOneRowPerDay() {
        String csv = AdminStatsService.toCsv(List.of(new DailyStat(LocalDate.of(2026, 10, 27), 4, 2, 1, 1500L, 2400L),
                new DailyStat(LocalDate.of(2026, 10, 28), 0, 0, 0, null, null)));
        assertThat(csv).startsWith("﻿Ngày,Bài nộp khách quan,Bài nộp code,Người dùng mới,");
        assertThat(csv.split("\r\n")).containsExactly(csv.split("\r\n")[0], "2026-10-27,4,2,1,1500,2400", "2026-10-28,0,0,0,,");

        var file = service.export(7);
        assertThat(file.filename()).isEqualTo("thong-ke-7-ngay.csv");
        assertThat(new String(file.content(), StandardCharsets.UTF_8).split("\r\n")).hasSize(8);
    }
}
