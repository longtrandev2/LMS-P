package vn.lmsp.worker;

import java.util.List;

public record GradingProblem(String jobId, long submissionId, String language, String sourceCode,
        int timeLimitMs, int memoryLimitMb, List<TestCase> tests) {
    public record TestCase(String input, String expectedOutput) { }
}
