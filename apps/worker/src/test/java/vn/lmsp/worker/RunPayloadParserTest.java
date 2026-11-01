package vn.lmsp.worker;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class RunPayloadParserTest {
    private final ObjectMapper json = new ObjectMapper();

    private JsonNode node(String text) throws Exception { return json.readTree(text); }

    @Test void parsesContractExample() throws Exception {
        var request = RunPayloadParser.parse(node("""
                {"language":"cpp","source_code":"int main(){}","time_limit_ms":1000,"memory_limit_mb":256,
                 "checker_mode":"token","checker_epsilon":null,"output_limit_bytes":4096,"stop_on_failure":false,
                 "tests":[{"position":1,"input":"1 2","expected_output":"3"},
                          {"position":2,"input":"5 5","expected_output":null}]}"""));
        assertEquals("cpp", request.language());
        assertEquals(1000, request.timeLimitMs());
        assertEquals(256, request.memoryLimitMb());
        assertEquals(4096, request.outputLimitBytes());
        assertFalse(request.stopOnFailure());
        assertEquals(OutputChecker.Mode.TOKEN, request.checker().mode());
        assertEquals(2, request.tests().size());
        assertEquals("3", request.tests().get(0).expectedOutput());
        assertNull(request.tests().get(1).expectedOutput());
        assertEquals(2, request.tests().get(1).position());
    }

    @Test void checkerDefaultsAndFloatEpsilon() throws Exception {
        var request = RunPayloadParser.parse(node("""
                {"language":"python","source_code":"print(1)","time_limit_ms":2000,"memory_limit_mb":64,
                 "output_limit_bytes":65536,"stop_on_failure":true,"tests":[{"position":1,"input":""}]}"""));
        assertEquals(OutputChecker.Mode.TOKEN, request.checker().mode());
        assertTrue(request.stopOnFailure());
        assertNull(request.tests().get(0).expectedOutput());

        var floats = RunPayloadParser.parse(node("""
                {"language":"java","source_code":"class Main{}","time_limit_ms":1000,"memory_limit_mb":256,
                 "checker_mode":"float","checker_epsilon":0.001,"output_limit_bytes":4096,"stop_on_failure":false,
                 "tests":[{"position":1,"input":"","expected_output":"1"}]}"""));
        assertEquals(OutputChecker.Mode.FLOAT, floats.checker().mode());
        assertEquals(0.001, floats.checker().epsilon());
    }

    @Test void rejectsBrokenPayloads() {
        String base = """
                {"language":"%s","source_code":"x","time_limit_ms":%s,"memory_limit_mb":256,"checker_mode":%s,
                 "output_limit_bytes":%s,"stop_on_failure":false,"tests":%s}""";
        String tests = "[{\"position\":1,\"input\":\"\",\"expected_output\":\"1\"}]";
        assertThrows(IllegalArgumentException.class,
                () -> RunPayloadParser.parse(node(base.formatted("go", 1000, "null", 4096, tests))));
        assertThrows(IllegalArgumentException.class,
                () -> RunPayloadParser.parse(node(base.formatted("c", 50, "null", 4096, tests))));
        assertThrows(IllegalArgumentException.class,
                () -> RunPayloadParser.parse(node(base.formatted("c", 1000, "\"exact\"", 4096, tests))));
        assertThrows(IllegalArgumentException.class,
                () -> RunPayloadParser.parse(node(base.formatted("c", 1000, "null", 70000, tests))));
        assertThrows(IllegalArgumentException.class,
                () -> RunPayloadParser.parse(node(base.formatted("c", 1000, "null", 4096, "[]"))));
        assertThrows(IllegalArgumentException.class, () -> RunPayloadParser.parse(node(base.formatted("c", 1000,
                "null", 4096, "[{\"position\":1,\"input\":\"\"},{\"position\":1,\"input\":\"\"}]"))));
        assertThrows(IllegalArgumentException.class, () -> RunPayloadParser.parse(node(base.formatted("c", 1000,
                "null", 4096, "[{\"position\":1,\"input\":\"\",\"expected_output\":3}]"))));
        assertThrows(IllegalArgumentException.class, () -> RunPayloadParser.parse(node("[]")));
        assertThrows(IllegalArgumentException.class, () -> RunPayloadParser.parse(node("""
                {"language":"c","source_code":"x","time_limit_ms":1000,"memory_limit_mb":256,
                 "output_limit_bytes":4096,"tests":[{"position":1,"input":""}]}""")));
    }
}
