package vn.lmsp.worker;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Comparator;

/**
 * Dựng {@link ExecutionRequest} cho bài nộp chính thức từ snapshot đã ghim (docs/assessment-spec.md §2, §4–5).
 * Snapshot cũ thiếu `checker_mode` chấm bằng `token`; test công khai chạy trước, rồi theo `position`.
 */
public final class SnapshotParser {
    private SnapshotParser() { }

    public static ExecutionRequest parse(JsonNode snapshot, String language, String sourceCode) {
        JsonNode programming = snapshot.path("programming");
        if (!programming.isObject()) throw new IllegalArgumentException("Snapshot has no programming section");
        if (!allows(programming.path("allowed_languages"), language))
            throw new IllegalArgumentException("Language does not match pinned question");
        int time = programming.path("time_limit_ms").asInt(5000);
        int memory = programming.path("memory_limit_mb").asInt(256);
        var checker = OutputChecker.of(text(programming, "checker_mode"), number(programming, "checker_epsilon"));

        JsonNode nodes = snapshot.path("test_cases");
        if (!nodes.isArray()) throw new IllegalArgumentException("Invalid test set");
        var tests = new ArrayList<Indexed>();
        int index = 0;
        for (JsonNode node : nodes) {
            index++;
            int position = node.path("position").isIntegralNumber() ? node.get("position").asInt() : index;
            var input = new ExecutionRequest.TestInput(position, requiredText(node, "input"),
                    requiredText(node, "expected_output"));
            tests.add(new Indexed(node.path("is_public").asBoolean(false), index, input));
        }
        tests.sort(Comparator.comparing((Indexed t) -> !t.isPublic())
                .thenComparingInt(t -> t.input().position()).thenComparingInt(Indexed::index));
        return new ExecutionRequest(language, sourceCode, time, memory, checker, OutputText.EVENT_OUTPUT_BYTES,
                true, tests.stream().map(Indexed::input).toList());
    }

    private record Indexed(boolean isPublic, int index, ExecutionRequest.TestInput input) { }

    private static String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) throw new IllegalArgumentException("Missing test " + field);
        return value.asText();
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private static Double number(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && value.isNumber() ? value.asDouble() : null;
    }

    private static boolean allows(JsonNode languages, String language) {
        if (!languages.isArray()) return false;
        for (JsonNode item : languages) if (language.equals(item.asText())) return true;
        return false;
    }
}
