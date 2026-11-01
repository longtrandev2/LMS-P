package vn.lmsp.worker;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashSet;

/** Dựng {@link ExecutionRequest} từ `run_jobs.payload` — docs/message-contracts.md §4, assessment-spec.md §7. */
public final class RunPayloadParser {
    private RunPayloadParser() { }

    public static ExecutionRequest parse(JsonNode payload) {
        if (payload == null || !payload.isObject()) throw new IllegalArgumentException("Run payload is not an object");
        String language = requiredText(payload, "language");
        String source = requiredText(payload, "source_code");
        int time = requiredInt(payload, "time_limit_ms");
        int memory = requiredInt(payload, "memory_limit_mb");
        int outputLimit = requiredInt(payload, "output_limit_bytes");
        JsonNode stop = payload.get("stop_on_failure");
        if (stop == null || !stop.isBoolean()) throw new IllegalArgumentException("Missing stop_on_failure");
        var checker = OutputChecker.of(optionalText(payload, "checker_mode"), optionalNumber(payload, "checker_epsilon"));

        JsonNode nodes = payload.get("tests");
        if (nodes == null || !nodes.isArray()) throw new IllegalArgumentException("Missing tests");
        var tests = new ArrayList<ExecutionRequest.TestInput>();
        var positions = new HashSet<Integer>();
        for (JsonNode node : nodes) {
            int position = requiredInt(node, "position");
            if (position < 0 || !positions.add(position)) throw new IllegalArgumentException("Invalid test position");
            JsonNode expected = node.get("expected_output");
            if (expected != null && !expected.isNull() && !expected.isTextual())
                throw new IllegalArgumentException("Invalid expected_output");
            tests.add(new ExecutionRequest.TestInput(position, requiredText(node, "input"),
                    expected == null || expected.isNull() ? null : expected.asText()));
        }
        return new ExecutionRequest(language, source, time, memory, checker, outputLimit, stop.asBoolean(), tests);
    }

    private static String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) throw new IllegalArgumentException("Missing " + field);
        return value.asText();
    }

    private static int requiredInt(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt())
            throw new IllegalArgumentException("Missing " + field);
        return value.asInt();
    }

    private static String optionalText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        if (!value.isTextual()) throw new IllegalArgumentException("Invalid " + field);
        return value.asText();
    }

    private static Double optionalNumber(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        if (!value.isNumber()) throw new IllegalArgumentException("Invalid " + field);
        return value.asDouble();
    }
}
