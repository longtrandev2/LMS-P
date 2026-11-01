package vn.lmsp.service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.GradebookDtos.ComponentGrade;
import vn.lmsp.dto.GradebookDtos.GradeRow;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.model.LmsClass;

/** `GET /classes/{id}/gradebook/export` — CSV UTF-8 có BOM, dấu phẩy, số dùng dấu chấm (docs/api-spec.md §8). */
@Service
@RequiredArgsConstructor
public class GradeExportService {
    static final String HEADER = "Mã SV,Họ tên,Chuyên cần,Bài tập,Giữa kỳ,Cuối kỳ,Hệ 10,Hệ 4,Chữ,Điều kiện dự thi";
    private final GradebookAccess access;
    private final GradebookService gradebook;

    public record Export(String filename, byte[] content) { }

    @Transactional(readOnly = true)
    public Export export(Long classId, Long actorId, boolean admin) {
        LmsClass clazz = access.lecturerClass(classId, actorId, admin);
        String csv = toCsv(gradebook.rows(clazz));
        return new Export("bang-diem-" + clazz.getCode().replaceAll("[^A-Za-z0-9._-]", "_") + ".csv",
                csv.getBytes(StandardCharsets.UTF_8));
    }

    static String toCsv(List<GradeRow> rows) {
        StringBuilder csv = new StringBuilder("﻿").append(HEADER).append("\r\n");
        for (GradeRow row : rows) {
            csv.append(cell(row.student_code())).append(',').append(cell(row.full_name()));
            for (GradeComponent component : GradeComponent.values()) {
                ComponentGrade grade = row.components().get(component.value());
                csv.append(',').append(number(grade == null ? null : grade.score()));
            }
            csv.append(',').append(number(row.total10())).append(',').append(number(row.total4()))
                    .append(',').append(cell(row.letter())).append(',').append(row.eligible() ? "Đủ" : "Không đủ").append("\r\n");
        }
        return csv.toString();
    }

    private static String number(BigDecimal value) { return value == null ? "" : value.toPlainString(); }

    /** Bọc ngoặc kép khi cần; chặn công thức bảng tính (=, +, -, @) ở đầu ô văn bản. */
    private static String cell(String value) {
        if (value == null) return "";
        String text = !value.isEmpty() && "=+-@".indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
        boolean quote = text.contains(",") || text.contains("\"") || text.contains("\n") || text.contains("\r");
        return quote ? "\"" + text.replace("\"", "\"\"") + "\"" : text;
    }
}
