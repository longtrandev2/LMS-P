package vn.lmsp.dto;

public record TokenPair(String access_token, String refresh_token, UserSummary user) { }
