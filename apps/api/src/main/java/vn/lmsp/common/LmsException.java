package vn.lmsp.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
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

}
