package vn.lmsp.worker;

import java.nio.charset.StandardCharsets;

/**
 * Báo cáo của `lmsp-run` (grader/lmsp-run.sh) cho một test: dòng cuối stderr có dạng
 * `LMSP <exit> <ms> <số lần oom_kill tăng> <memory_error 0|1>`.
 */
public record RunReport(int exitCode, int elapsedMs, boolean oomKilled, boolean memoryError) {
    static final String MARKER = "LMSP ";

    public static RunReport parse(byte[] stderr) {
        String text = new String(stderr, StandardCharsets.UTF_8);
        int end = text.length();
        while (end > 0 && (text.charAt(end - 1) == '\n' || text.charAt(end - 1) == '\r')) end--;
        int start = text.lastIndexOf('\n', end - 1) + 1;
        String line = text.substring(start, end);
        if (!line.startsWith(MARKER)) throw new SandboxException("Sandbox runner report is missing");
        String[] parts = line.substring(MARKER.length()).trim().split(" +");
        if (parts.length != 4) throw new SandboxException("Sandbox runner report is malformed");
        try {
            return new RunReport(Integer.parseInt(parts[0]), (int) Math.max(0, Long.parseLong(parts[1])),
                    Long.parseLong(parts[2]) > 0, "1".equals(parts[3]));
        } catch (NumberFormatException error) {
            throw new SandboxException("Sandbox runner report is malformed", error);
        }
    }
}
