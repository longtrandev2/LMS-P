package vn.lmsp.worker;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class VerdictClassifierTest {
    private static RunReport report(int exit, int ms, boolean oom, boolean memoryError) {
        return new RunReport(exit, ms, oom, memoryError);
    }

    @Test void normalExitGoesToChecker() {
        assertNull(VerdictClassifier.classify(report(0, 50, false, false), 1000));
    }

    @Test void killedAtLimitIsTle() {
        assertEquals(GradingVerdict.TLE, VerdictClassifier.classify(report(137, 1003, false, false), 1000));
        assertEquals(GradingVerdict.TLE, VerdictClassifier.classify(report(124, 995, false, false), 1000));
    }

    @Test void killedEarlyWithoutOomIsRuntimeError() {
        assertEquals(GradingVerdict.RE, VerdictClassifier.classify(report(137, 40, false, false), 1000));
    }

    @Test void oomKillIsMleEvenIfSlow() {
        assertEquals(GradingVerdict.MLE, VerdictClassifier.classify(report(137, 30, true, false), 1000));
        assertEquals(GradingVerdict.MLE, VerdictClassifier.classify(report(137, 2000, true, false), 1000));
    }

    @Test void outOfMemoryErrorInStderrIsMle() {
        assertEquals(GradingVerdict.MLE, VerdictClassifier.classify(report(1, 100, false, true), 1000));
        assertNull(VerdictClassifier.classify(report(0, 100, false, true), 1000));
    }

    @Test void nonZeroExitIsRe() {
        assertEquals(GradingVerdict.RE, VerdictClassifier.classify(report(1, 10, false, false), 1000));
        assertEquals(GradingVerdict.RE, VerdictClassifier.classify(report(139, 10, false, false), 1000));
    }

    @Test void checkerVerdicts() {
        var checker = OutputChecker.of("token", null);
        assertEquals(GradingVerdict.AC, VerdictClassifier.check(checker, "3\n", "3"));
        assertEquals(GradingVerdict.WA, VerdictClassifier.check(checker, "4", "3"));
        assertEquals(GradingVerdict.OK, VerdictClassifier.check(checker, "anything", null));
    }

    @Test void parsesRunnerReportFromLastLine() {
        byte[] stderr = "Traceback...\nLMSP 9 9 9 9 fake\nMemoryError\n\nLMSP 1 250 0 1\n".getBytes(StandardCharsets.UTF_8);
        assertEquals(new RunReport(1, 250, false, true), RunReport.parse(stderr));
        assertEquals(new RunReport(137, 1001, true, false),
                RunReport.parse("LMSP 137 1001 2 0".getBytes(StandardCharsets.UTF_8)));
    }

    @Test void missingOrBrokenReportIsSandboxError() {
        assertThrows(SandboxException.class, () -> RunReport.parse(new byte[0]));
        assertThrows(SandboxException.class, () -> RunReport.parse("LMSP 1 x 0 0\n".getBytes(StandardCharsets.UTF_8)));
        assertThrows(SandboxException.class, () -> RunReport.parse("LMSP 1 2 0 0\nextra".getBytes(StandardCharsets.UTF_8)));
    }
}
