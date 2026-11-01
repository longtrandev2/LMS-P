package vn.lmsp.service;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.lmsp.common.SessionClock;
import vn.lmsp.repository.AuditExportQueries;
import vn.lmsp.repository.AuditExportQueries.Filter;
import vn.lmsp.repository.AuditExportQueries.Row;

/** `GET /admin/audit-logs/export` — CSV UTF-8 có BOM, tối đa 50 000 dòng mới nhất, ghi theo lô (docs/admin-spec.md §7). */
@Service
@RequiredArgsConstructor
public class AuditExportService {
    public static final int MAX_ROWS = 50_000;
    static final int BATCH = 1_000;
    static final String HEADER = "Thời điểm (giờ VN),Người thực hiện,Hành động,Đối tượng,Mã đối tượng,IP,"
            + "Giá trị trước,Giá trị sau";
    static final String SYSTEM_ACTOR = "Hệ thống";
    private final AuditExportQueries queries;

    public static final String FILENAME = "nhat-ky-kiem-toan.csv";

    /** Trả số dòng dữ liệu đã ghi. Không đóng `out`. */
    public int write(Filter filter, OutputStream out) throws IOException {
        Writer writer = new BufferedWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8));
        writer.write(CsvWriter.BOM + HEADER + CsvWriter.EOL);
        int written = 0;
        Row last = null;
        while (written < MAX_ROWS) {
            int size = Math.min(BATCH, MAX_ROWS - written);
            List<Row> rows = queries.batch(filter, last, size);
            for (Row row : rows) writer.write(line(row));
            written += rows.size();
            writer.flush();
            if (rows.size() < size) break;
            last = rows.get(rows.size() - 1);
        }
        writer.flush();
        return written;
    }

    static String line(Row row) {
        String at = row.createdAt() == null ? null : SessionClock.toLocal(row.createdAt()).format(CsvWriter.DATE_TIME);
        String actor = row.actorId() == null ? SYSTEM_ACTOR
                : row.actorName() == null ? "#" + row.actorId() : row.actorName();
        return CsvWriter.row(at, actor, row.action(), row.entityType(), row.entityId(), row.ip(), row.oldValue(),
                row.newValue());
    }
}
