package vn.lmsp.worker;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class SnapshotParserTest {
    private final ObjectMapper json = new ObjectMapper();

    @Test void ordersPublicTestsFirstThenByPosition() throws Exception {
        var snapshot = json.readTree("""
                {"type":"programming","programming":{"allowed_languages":["python","cpp"],"time_limit_ms":1500,
                  "memory_limit_mb":128,"checker_mode":"line","checker_epsilon":null},
                 "test_cases":[{"input":"a","expected_output":"1","is_public":false,"position":1},
                               {"input":"b","expected_output":"2","is_public":true,"position":3},
                               {"input":"c","expected_output":"3","is_public":false,"position":2},
                               {"input":"d","expected_output":"4","is_public":true,"position":4}]}""");
        var request = SnapshotParser.parse(snapshot, "cpp", "int main(){}");
        assertEquals(java.util.List.of(3, 4, 1, 2), request.tests().stream().map(t -> t.position()).toList());
        assertEquals(OutputChecker.Mode.LINE, request.checker().mode());
        assertEquals(1500, request.timeLimitMs());
        assertEquals(128, request.memoryLimitMb());
        assertTrue(request.stopOnFailure());
        assertEquals(OutputText.EVENT_OUTPUT_BYTES, request.outputLimitBytes());
    }

    @Test void oldSnapshotDefaultsToTokenAndIndexPositions() throws Exception {
        var snapshot = json.readTree("""
                {"programming":{"allowed_languages":["java"],"time_limit_ms":30000,"memory_limit_mb":2048},
                 "test_cases":[{"input":"1","expected_output":"1"},{"input":"2","expected_output":"2"}]}""");
        var request = SnapshotParser.parse(snapshot, "java", "class Main{}");
        assertEquals(OutputChecker.Mode.TOKEN, request.checker().mode());
        assertEquals(java.util.List.of(1, 2), request.tests().stream().map(t -> t.position()).toList());
    }

    @Test void floatCheckerReadsEpsilon() throws Exception {
        var snapshot = json.readTree("""
                {"programming":{"allowed_languages":["c"],"time_limit_ms":1000,"memory_limit_mb":64,
                  "checker_mode":"float","checker_epsilon":1e-9},
                 "test_cases":[{"input":"","expected_output":"1","is_public":true,"position":1}]}""");
        var request = SnapshotParser.parse(snapshot, "c", "int main(){}");
        assertEquals(OutputChecker.Mode.FLOAT, request.checker().mode());
        assertEquals(1e-9, request.checker().epsilon());
    }

    @Test void rejectsLanguageOutsideSnapshotAndMissingFields() throws Exception {
        var snapshot = json.readTree("""
                {"programming":{"allowed_languages":["c"],"time_limit_ms":1000,"memory_limit_mb":64},
                 "test_cases":[{"input":"","expected_output":"1"}]}""");
        assertThrows(IllegalArgumentException.class, () -> SnapshotParser.parse(snapshot, "python", "print()"));
        var missing = json.readTree("""
                {"programming":{"allowed_languages":["c"]},"test_cases":[{"input":""}]}""");
        assertThrows(IllegalArgumentException.class, () -> SnapshotParser.parse(missing, "c", "x"));
        var noTests = json.readTree("{\"programming\":{\"allowed_languages\":[\"c\"]},\"test_cases\":[]}");
        assertThrows(IllegalArgumentException.class, () -> SnapshotParser.parse(noTests, "c", "x"));
        assertThrows(IllegalArgumentException.class, () -> SnapshotParser.parse(json.readTree("{}"), "c", "x"));
    }
}
