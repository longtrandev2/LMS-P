package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.lmsp.repository.AuditExportQueries;
import vn.lmsp.repository.AuditExportQueries.Filter;
import vn.lmsp.repository.AuditExportQueries.Row;

class AuditExportServiceTest {
    private final AuditExportQueries queries = mock(AuditExportQueries.class);
    private final AuditExportService service = new AuditExportService(queries);
    private final Filter filter = new Filter(null, "queue.purge", null, null, null);

    @Test void writesBomHeaderAndRowsInVietnamTimeWithEscapedJson() throws Exception {
        when(queries.batch(eq(filter), isNull(), eq(1000))).thenReturn(List.of(
                new Row(2L, LocalDateTime.of(2026, 10, 27, 17, 30), 1L, "Nguyễn, Văn A", "queue.purge", "queue", 0L,
                        "10.0.0.1", null, "{\"queue\":\"q.grading.dead\",\"purged\":4}"),
                new Row(1L, LocalDateTime.of(2026, 10, 27, 1, 0), null, null, "submission.graded", "submission", 9L,
                        null, null, null)));
        var out = new ByteArrayOutputStream();

        assertThat(service.write(filter, out)).isEqualTo(2);

        String csv = out.toString(StandardCharsets.UTF_8);
        assertThat(csv).startsWith("﻿Thời điểm (giờ VN),Người thực hiện,Hành động,Đối tượng,Mã đối tượng,IP,"
                + "Giá trị trước,Giá trị sau\r\n");
        assertThat(csv.split("\r\n")).containsExactly(csv.split("\r\n")[0],
                "2026-10-28 00:30:00,\"Nguyễn, Văn A\",queue.purge,queue,0,10.0.0.1,,"
                        + "\"{\"\"queue\"\":\"\"q.grading.dead\"\",\"\"purged\"\":4}\"",
                "2026-10-27 08:00:00,Hệ thống,submission.graded,submission,9,,,");
    }

    @Test void readsInBatchesWithKeysetCursorAndStopsAtFiftyThousand() throws Exception {
        when(queries.batch(eq(filter), any(), anyInt())).thenAnswer(call -> rows(call.getArgument(2)));
        var out = new ByteArrayOutputStream();

        assertThat(service.write(filter, out)).isEqualTo(AuditExportService.MAX_ROWS);

        verify(queries, times(50)).batch(eq(filter), any(), eq(1000));
        verify(queries).batch(eq(filter), isNull(), eq(1000));
        verify(queries, times(49)).batch(eq(filter), argThat(row -> row != null && row.id() == 1L), eq(1000));
    }

    @Test void shortBatchEndsTheExport() throws Exception {
        when(queries.batch(eq(filter), any(), anyInt())).thenReturn(rows(10));
        assertThat(service.write(filter, new ByteArrayOutputStream())).isEqualTo(10);
        verify(queries, times(1)).batch(any(), any(), anyInt());
    }

    @Test void csvCellsNeutralizeFormulas() {
        assertThat(CsvWriter.cell("=SUM(A1)")).isEqualTo("'=SUM(A1)");
        assertThat(CsvWriter.cell("a\"b")).isEqualTo("\"a\"\"b\"");
        assertThat(CsvWriter.row(-1, null, "x")).isEqualTo("-1,,x\r\n");
    }

    private static List<Row> rows(int count) {
        List<Row> rows = new ArrayList<>();
        for (int i = count; i >= 1; i--)
            rows.add(new Row((long) i, LocalDateTime.of(2026, 10, 27, 0, 0), 1L, "Admin", "a", "b", 1L, null, null, null));
        return rows;
    }
}
