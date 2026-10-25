package vn.lmsp.dto;

import jakarta.validation.constraints.NotBlank;

/** `account` = email hoặc mã sinh viên (FR-AUTH-01). */
public record LoginRequest(@NotBlank String account, @NotBlank String password) { }
