package vn.lmsp.worker;

import java.util.List;

/** Tên file, lệnh biên dịch/chạy, hệ số thời gian theo ngôn ngữ — docs/assessment-spec.md §4. */
public enum LanguageProfile {
    PYTHON("python", "Main.py", 2),
    C("c", "Main.c", 1),
    CPP("cpp", "Main.cpp", 1),
    JAVA("java", "Main.java", 2);

    /** Phần bộ nhớ container cấp thêm cho JVM ngoài heap (metaspace, code cache, stack 64 MiB). */
    static final int JVM_OVERHEAD_MB = 192;

    private final String code;
    private final String sourceFile;
    private final int timeFactor;

    LanguageProfile(String code, String sourceFile, int timeFactor) {
        this.code = code;
        this.sourceFile = sourceFile;
        this.timeFactor = timeFactor;
    }

    public static LanguageProfile of(String code) {
        for (var profile : values()) if (profile.code.equals(code)) return profile;
        throw new IllegalArgumentException("Unsupported language");
    }

    public static boolean supports(String code) {
        for (var profile : values()) if (profile.code.equals(code)) return true;
        return false;
    }

    public String code() { return code; }
    public String sourceFile() { return sourceFile; }
    public boolean compiled() { return this != PYTHON; }

    /** Giới hạn thực = `time_limit_ms` × hệ số. */
    public int realTimeLimitMs(int timeLimitMs) { return timeLimitMs * timeFactor; }

    public int containerMemoryMb(int memoryLimitMb) {
        return this == JAVA ? memoryLimitMb + JVM_OVERHEAD_MB : memoryLimitMb;
    }

    public List<String> compileCommand() {
        return switch (this) {
            case C -> List.of("gcc", "-std=c17", "-O2", "-pipe", "-o", "/work/program", "/work/Main.c", "-lm");
            case CPP -> List.of("g++", "-std=c++20", "-O2", "-pipe", "-o", "/work/program", "/work/Main.cpp");
            case JAVA -> List.of("javac", "-J-XX:+UseSerialGC", "-J-XX:TieredStopAtLevel=1", "-J-XX:-UsePerfData",
                    "-encoding", "UTF-8", "-d", "/work", "/work/Main.java");
            case PYTHON -> List.of();
        };
    }

    public List<String> runCommand(int memoryLimitMb) {
        return switch (this) {
            case PYTHON -> List.of("python3", "-B", "/work/Main.py");
            case C, CPP -> List.of("/work/program");
            case JAVA -> List.of("java", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-Xss64m",
                    "-Xmx" + memoryLimitMb + "m", "-XX:-UsePerfData", "-XX:+DisplayVMOutputToStderr",
                    "-cp", "/work", "Main");
        };
    }
}
