package vn.lmsp.common;

public record ApiErrorBody(ErrorDetail error) {
    public record ErrorDetail(String code, String message, Object details) {}
}
