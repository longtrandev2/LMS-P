package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.GradebookDtos.*;

class GradeExportServiceTest {
    private static ComponentGrade grade(String score) {
        BigDecimal value = score == null ? null : new BigDecimal(score);
        return new ComponentGrade(value, value, null, value == null ? GradeStatus.MISSING : GradeStatus.FINAL);
    }

    @Test void writesBomHeaderDotDecimalsAndEscapesText() {
        Map<String, ComponentGrade> full = new LinkedHashMap<>();
        full.put("attendance", grade("9.50")); full.put("assignment", grade("8.00"));
        full.put("midterm", grade("7.25")); full.put("final", grade("6.00"));
        Map<String, ComponentGrade> partial = new LinkedHashMap<>(full);
        partial.put("midterm", grade(null));
        var attendance = new AttendanceView(10, 10, 0, 0, 0, 0, 2);
        List<GradeRow> rows = List.of(
                new GradeRow(42L, "SV42", "Nguyễn Văn \"A\", K20", full, attendance, true, new BigDecimal("7.0"),
                        new BigDecimal("3.0"), "B", true, GradeStatus.FINAL),
                new GradeRow(43L, "SV43", "=HYPERLINK()", partial, attendance, false, null, null, null, null, GradeStatus.PROVISIONAL));

        String csv = GradeExportService.toCsv(rows);

        assertThat(csv).startsWith("﻿" + GradeExportService.HEADER + "\r\n");
        String[] lines = csv.substring(1).split("\r\n");
        assertThat(lines[1]).isEqualTo("SV42,\"Nguyễn Văn \"\"A\"\", K20\",9.50,8.00,7.25,6.00,7.0,3.0,B,Đủ");
        assertThat(lines[2]).isEqualTo("SV43,'=HYPERLINK(),9.50,8.00,,6.00,,,,Không đủ");
    }
}
