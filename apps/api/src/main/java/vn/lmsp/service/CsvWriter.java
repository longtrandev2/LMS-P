package vn.lmsp.service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

/** Dòng CSV UTF-8 có BOM cho các file xuất của admin (docs/admin-spec.md §2, §7): dấu phẩy, xuống dòng CRLF. */
public final class CsvWriter {
    public static final String BOM = "﻿";
    public static final String EOL = "\r\n";
    public static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private CsvWriter() { }

    /** Một dòng hoàn chỉnh (kèm CRLF); số giữ nguyên, null thành ô rỗng, văn bản được escape. */
    public static String row(Object... values) {
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < values.length; i++) {
            if (i > 0) line.append(',');
            line.append(value(values[i]));
        }
        return line.append(EOL).toString();
    }

    private static String value(Object value) {
        if (value == null) return "";
        if (value instanceof BigDecimal decimal) return decimal.toPlainString();
        if (value instanceof Number number) return number.toString();
        return cell(value.toString());
    }

    /** Bọc ngoặc kép khi cần; chặn công thức bảng tính (=, +, -, @) ở đầu ô văn bản. */
    public static String cell(String value) {
        if (value == null) return "";
        String text = !value.isEmpty() && "=+-@".indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
        boolean quote = text.contains(",") || text.contains("\"") || text.contains("\n") || text.contains("\r");
        return quote ? "\"" + text.replace("\"", "\"\"") + "\"" : text;
    }
}
