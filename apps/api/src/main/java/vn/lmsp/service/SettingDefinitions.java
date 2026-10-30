package vn.lmsp.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.IntNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;
import java.util.function.UnaryOperator;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.GradebookDtos.GradePolicyInput;

/**
 * Khóa, mặc định, mô tả và kiểm tra của cấu hình hệ thống — docs/admin-spec.md §1.
 * Mỗi khóa có hàm chuẩn hóa: trả giá trị chuẩn hoặc ném {@link IllegalArgumentException} kèm thông điệp tiếng Việt.
 */
public final class SettingDefinitions {
    public static final String ALLOWED_LANGUAGES = "allowed_languages", DEFAULT_TIME = "default_time_limit_ms",
            DEFAULT_MEMORY = "default_memory_limit_mb", MAX_TIME = "max_time_limit_ms", MAX_MEMORY = "max_memory_limit_mb",
            PRACTICE_RUNS = "practice_runs_per_minute", MAX_UPLOAD = "max_upload_mb", LEAVE_EVIDENCE = "leave_evidence_max_mb",
            GRADE_POLICY = "default_grade_policy", MAINTENANCE = "maintenance",
            INACTIVITY_TIMEOUT = "inactivity_timeout_minutes";
    /** Biên tuyệt đối khi soạn câu (kể cả khi admin nâng trần); worker nhận tới 30000 ms / 2048 MB. */
    public static final int TIME_FLOOR = 100, TIME_CEILING = 20_000, MEMORY_FLOOR = 32, MEMORY_CEILING = 2048;
    public static final int MAINTENANCE_MESSAGE_MAX = 500;
    public static final String DEFAULT_MAINTENANCE_MESSAGE = "Hệ thống đang bảo trì, vui lòng thử lại sau";

    public record Definition(String key, JsonNode defaultValue, String description, UnaryOperator<JsonNode> normalize) { }

    private final ObjectMapper json;
    private final Map<String, Definition> definitions = new LinkedHashMap<>();

    public SettingDefinitions(ObjectMapper json, int uploadCapMb) {
        this.json = json;
        int cap = Math.max(1, uploadCapMb);
        add(ALLOWED_LANGUAGES, json.valueToTree(ProgrammingContentValidator.LANGUAGES),
                "Ngôn ngữ được chọn khi soạn câu lập trình (python, c, cpp, java)", this::languages);
        add(DEFAULT_TIME, IntNode.valueOf(1000), "Giới hạn thời gian điền sẵn khi tạo câu lập trình (ms)",
                node -> integer(node, TIME_FLOOR, TIME_CEILING, " ms"));
        add(DEFAULT_MEMORY, IntNode.valueOf(256), "Giới hạn bộ nhớ điền sẵn khi tạo câu lập trình (MB)",
                node -> integer(node, MEMORY_FLOOR, MEMORY_CEILING, " MB"));
        add(MAX_TIME, IntNode.valueOf(10_000), "Trần giới hạn thời gian khi soạn câu lập trình (ms)",
                node -> integer(node, 1000, TIME_CEILING, " ms"));
        add(MAX_MEMORY, IntNode.valueOf(1024), "Trần giới hạn bộ nhớ khi soạn câu lập trình (MB)",
                node -> integer(node, 64, MEMORY_CEILING, " MB"));
        add(PRACTICE_RUNS, IntNode.valueOf(6), "Số lần chạy thử tối đa mỗi phút của một sinh viên (cả trong phiên thi)",
                node -> integer(node, 1, 60, " lần"));
        add(MAX_UPLOAD, IntNode.valueOf(Math.min(20, cap)), "Dung lượng tối đa của tệp học liệu (MB), không vượt trần server "
                + cap + " MB", node -> integer(node, 1, cap, " MB"));
        int leaveCap = Math.min(20, cap);
        add(LEAVE_EVIDENCE, IntNode.valueOf(Math.min(5, leaveCap)), "Dung lượng tối đa của minh chứng đơn xin nghỉ (MB)",
                node -> integer(node, 1, leaveCap, " MB"));
        add(GRADE_POLICY, json.valueToTree(GradePolicyCodec.DEFAULT),
                "Chính sách điểm cho lớp chưa tự cấu hình (trọng số, số buổi nghỉ tối đa, điểm trừ chuyên cần)", this::gradePolicy);
        add(MAINTENANCE, maintenanceNode(false, null),
                "Chế độ bảo trì: chặn thao tác bắt đầu việc mới của người không phải admin", this::maintenance);
        add(INACTIVITY_TIMEOUT, IntNode.valueOf(30),
                "Thời gian treo máy tối đa trước khi tự động đăng xuất (phút), 0 để tắt",
                node -> integer(node, 0, 1440, " phút"));
    }

    public Collection<Definition> all() { return definitions.values(); }
    public Definition get(String key) { return definitions.get(key); }

    /** Ràng buộc chéo (mặc định ≤ trần) trên giá trị đã gộp; lỗi gắn vào khóa vừa gửi (ưu tiên khóa mặc định). */
    public Map<String, String> crossCheck(Map<String, JsonNode> merged, Set<String> provided, Set<String> invalid) {
        Map<String, String> errors = new LinkedHashMap<>();
        pair(merged, provided, invalid, DEFAULT_TIME, MAX_TIME, "Thời gian mặc định không được vượt quá thời gian tối đa (%d ms)", errors);
        pair(merged, provided, invalid, DEFAULT_MEMORY, MAX_MEMORY, "Bộ nhớ mặc định không được vượt quá bộ nhớ tối đa (%d MB)", errors);
        return errors;
    }

    static ObjectNode maintenanceNode(boolean enabled, String message) {
        ObjectNode node = JsonNodeFactory.instance.objectNode();
        node.put("enabled", enabled);
        node.put("message", message);
        return node;
    }

    private void pair(Map<String, JsonNode> merged, Set<String> provided, Set<String> invalid, String defaultKey,
                      String maxKey, String message, Map<String, String> errors) {
        if (invalid.contains(defaultKey) || invalid.contains(maxKey)) return;
        int value = merged.get(defaultKey).intValue(), max = merged.get(maxKey).intValue();
        if (value <= max) return;
        String key = provided.contains(defaultKey) || !provided.contains(maxKey) ? defaultKey : maxKey;
        errors.put(key, String.format(message, max));
    }

    private void add(String key, JsonNode defaultValue, String description, UnaryOperator<JsonNode> normalize) {
        definitions.put(key, new Definition(key, defaultValue, description, normalize));
    }

    private JsonNode languages(JsonNode node) {
        if (node == null || !node.isArray() || node.isEmpty())
            throw invalid("Cần chọn ít nhất một ngôn ngữ (python, c, cpp, java)");
        Set<String> chosen = new HashSet<>();
        for (JsonNode item : node) {
            if (!item.isTextual() || !ProgrammingContentValidator.LANGUAGES.contains(item.textValue()))
                throw invalid("Ngôn ngữ không hợp lệ: " + (item.isTextual() ? item.textValue() : item.toString()));
            chosen.add(item.textValue());
        }
        ArrayNode result = json.createArrayNode();
        ProgrammingContentValidator.LANGUAGES.stream().filter(chosen::contains).forEach(result::add);
        return result;
    }

    private static JsonNode integer(JsonNode node, int min, int max, String unit) {
        if (node == null || !node.isIntegralNumber() || !node.canConvertToInt() || node.intValue() < min || node.intValue() > max)
            throw invalid("Phải là số nguyên từ " + min + " đến " + max + unit);
        return IntNode.valueOf(node.intValue());
    }

    private JsonNode gradePolicy(JsonNode node) {
        if (node == null || !node.isObject() || !node.path("weights").isObject() || !node.path("attendance").isObject())
            throw invalid("Chính sách điểm cần có weights và attendance");
        GradePolicyInput input;
        try { input = json.treeToValue(node, GradePolicyInput.class); }
        catch (JsonProcessingException | IllegalArgumentException error) { throw invalid("Chính sách điểm không đúng định dạng"); }
        try { return json.valueToTree(GradePolicyService.validate(input)); }
        catch (LmsException error) { throw invalid(error.getMessage()); }
    }

    private JsonNode maintenance(JsonNode node) {
        if (node == null || !node.isObject() || !node.path("enabled").isBoolean())
            throw invalid("Chế độ bảo trì cần dạng {enabled: true/false, message}");
        JsonNode message = node.path("message");
        if (!message.isMissingNode() && !message.isNull() && !message.isTextual())
            throw invalid("Thông điệp bảo trì phải là chuỗi");
        String text = message.isTextual() && !message.textValue().isBlank() ? message.textValue().strip() : null;
        if (text != null && text.length() > MAINTENANCE_MESSAGE_MAX)
            throw invalid("Thông điệp bảo trì tối đa " + MAINTENANCE_MESSAGE_MAX + " ký tự");
        return maintenanceNode(node.path("enabled").booleanValue(), text);
    }

    private static IllegalArgumentException invalid(String message) { return new IllegalArgumentException(message); }
}
