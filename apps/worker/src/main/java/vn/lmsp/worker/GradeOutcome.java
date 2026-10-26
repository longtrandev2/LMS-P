package vn.lmsp.worker;

public record GradeOutcome(GradingVerdict verdict, boolean compileError, String compileOutput,
        String errorMessage, int durationMs) { }
