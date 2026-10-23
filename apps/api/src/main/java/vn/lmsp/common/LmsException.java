package vn.lmsp.common;

import org.springframework.http.HttpStatus;

public class LmsException extends RuntimeException {
    private final String code;
    private final HttpStatus status;
    private final Object details;

    public LmsException(String code, String message, HttpStatus status, Object details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
    }

    public String getCode() { return code; }
    public HttpStatus getStatus() { return status; }
    public Object getDetails() { return details; }
}
