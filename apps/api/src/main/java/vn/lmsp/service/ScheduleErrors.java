package vn.lmsp.service;

import org.springframework.http.HttpStatus;
import vn.lmsp.common.LmsException;

/** Lỗi dùng chung cho lịch học/điểm danh/đơn xin nghỉ (envelope api-spec §1). */
final class ScheduleErrors {
    private ScheduleErrors() { }

    static LmsException invalid(String message) { return invalid(message, null); }
    static LmsException invalid(String message, Object details) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, details);
    }
    static LmsException conflict(String message) { return new LmsException("CONFLICT", message, HttpStatus.CONFLICT, null); }
    static LmsException notFound(String message) { return new LmsException("NOT_FOUND", message, HttpStatus.NOT_FOUND, null); }
    static LmsException forbidden(String message) { return new LmsException("FORBIDDEN", message, HttpStatus.FORBIDDEN, null); }

    /** Chuỗi rỗng/khoảng trắng → null, ngược lại cắt khoảng trắng hai đầu. */
    static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
