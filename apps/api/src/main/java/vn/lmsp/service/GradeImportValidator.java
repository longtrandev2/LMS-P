package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.*;
import vn.lmsp.dto.GradebookDtos.ImportRow;
import vn.lmsp.dto.GradebookDtos.ImportRowResult;
import vn.lmsp.model.User;

/** Kiểm tra từng dòng nhập điểm (docs/api-spec.md §8): mã SV thuộc lớp, không trùng, điểm 0–10 (tối đa 2 chữ số lẻ). */
public final class GradeImportValidator {
    private GradeImportValidator() { }

    public static String normalize(String code) { return code == null ? "" : code.trim().toUpperCase(Locale.ROOT); }

    public static List<ImportRowResult> validate(List<ImportRow> rows, Map<String, User> roster) {
        Map<String, Integer> occurrences = new HashMap<>();
        for (ImportRow row : rows) if (row != null) occurrences.merge(normalize(row.student_code()), 1, Integer::sum);
        List<ImportRowResult> results = new ArrayList<>(rows.size());
        for (int index = 0; index < rows.size(); index++) {
            ImportRow row = rows.get(index);
            int number = row == null || row.row() == null ? index + 1 : row.row();
            if (row == null) {
                results.add(new ImportRowResult(number, null, null, null, null, false, "Dòng trống"));
                continue;
            }
            String code = normalize(row.student_code());
            User student = roster.get(code);
            String reason = reason(row, code, student, occurrences.getOrDefault(code, 0));
            String shownCode = row.student_code() == null ? null : row.student_code().trim();
            results.add(new ImportRowResult(number, shownCode, student == null ? null : student.getFullName(),
                    row.midterm(), row.finalExam(), reason == null, reason));
        }
        return results;
    }

    private static String reason(ImportRow row, String code, User student, int occurrences) {
        if (code.isEmpty()) return "Thiếu mã sinh viên";
        if (occurrences > 1) return "Mã sinh viên bị trùng trong tệp";
        if (student == null) return "Mã sinh viên không thuộc lớp";
        if (row.midterm() == null && row.finalExam() == null) return "Dòng không có điểm Giữa kỳ hoặc Cuối kỳ";
        String midterm = score(row.midterm(), "Giữa kỳ");
        return midterm != null ? midterm : score(row.finalExam(), "Cuối kỳ");
    }

    private static String score(BigDecimal value, String label) {
        if (value == null) return null;
        if (value.signum() < 0 || value.compareTo(BigDecimal.TEN) > 0) return "Điểm " + label + " phải từ 0 đến 10";
        if (value.stripTrailingZeros().scale() > 2) return "Điểm " + label + " tối đa 2 chữ số thập phân";
        return null;
    }
}
