package vn.lmsp.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MultipartException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(LmsException.class)
    public ResponseEntity<ApiErrorBody> handle(LmsException error) {
        var body = new ApiErrorBody(new ApiErrorBody.ErrorDetail(
                error.getCode(), error.getMessage(), error.getDetails()));
        return ResponseEntity.status(error.getStatus()).body(body);
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorBody> validation(MethodArgumentNotValidException error) {
        var details = error.getBindingResult().getFieldErrors().stream()
                .collect(java.util.stream.Collectors.toMap(field -> field.getField(), field -> field.getDefaultMessage(), (first, ignored) -> first));
        return ResponseEntity.badRequest().body(new ApiErrorBody(new ApiErrorBody.ErrorDetail("VALIDATION_ERROR", "Dữ liệu không hợp lệ", details)));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorBody> badRequest(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(new ApiErrorBody(new ApiErrorBody.ErrorDetail("VALIDATION_ERROR", error.getMessage(), null)));
    }
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorBody> forbidden(AccessDeniedException error) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiErrorBody(new ApiErrorBody.ErrorDetail("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này", null)));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorBody> conflict(DataIntegrityViolationException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorBody(new ApiErrorBody.ErrorDetail("CONFLICT", "Dữ liệu đang được sử dụng hoặc bị trùng", null)));
    }
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorBody> invalidParameter(MethodArgumentTypeMismatchException error) {
        return ResponseEntity.badRequest().body(new ApiErrorBody(new ApiErrorBody.ErrorDetail("VALIDATION_ERROR", "Tham số không hợp lệ: " + error.getName(), null)));
    }
    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ApiErrorBody> uploadRejected(MultipartException error) {
        return ResponseEntity.badRequest().body(new ApiErrorBody(new ApiErrorBody.ErrorDetail("VALIDATION_ERROR", "Tệp tải lên vượt quá giới hạn cho phép", null)));
    }
}
