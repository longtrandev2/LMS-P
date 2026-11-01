package vn.lmsp.dto;

import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonProperty;

public record RefreshRequest(@JsonProperty("refresh_token") @NotBlank String refreshToken) { }

