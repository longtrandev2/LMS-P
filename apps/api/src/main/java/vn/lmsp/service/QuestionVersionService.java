package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.QuestionDtos.ProgrammingView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.ScoringMode;
import vn.lmsp.model.Question;
import vn.lmsp.model.QuestionVersion;
import vn.lmsp.model.User;
import vn.lmsp.repository.QuestionVersionRepository;

/** Phiên bản câu hỏi append-only — assessment-spec.md §2. */
@Service
@RequiredArgsConstructor
public class QuestionVersionService {
    private final QuestionVersionRepository versions;
    private final QuestionReadService reader;
    private final ObjectMapper json;

    /** Lưu một version mới, trừ khi snapshot giống hệt bản mới nhất. Trả về version mới nhất sau khi lưu. */
    @Transactional
    public QuestionVersion saveVersion(Question question, User actor) {
        JsonNode snapshot = json.valueToTree(reader.snapshot(question));
        var latest = versions.findTopByQuestion_IdOrderByVersionNoDesc(question.getId());
        if (latest.isPresent() && canonical(latest.get().getSnapshot()).equals(canonical(snapshot))) return latest.get();
        int next = latest.map(QuestionVersion::getVersionNo).orElse(0) + 1;
        return versions.save(new QuestionVersion(question, next, snapshot, actor));
    }

    /** Đọc snapshot; snapshot cũ thiếu trường mới nhận giá trị mặc định (scoring_mode, checker_mode). */
    public QuestionSnapshot read(QuestionVersion version) {
        try {
            QuestionSnapshot raw = json.treeToValue(version.getSnapshot(), QuestionSnapshot.class);
            return withDefaults(raw);
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Question snapshot is invalid", error);
        }
    }

    static QuestionSnapshot withDefaults(QuestionSnapshot raw) {
        ProgrammingView program = raw.programming();
        if (program != null && program.checker_mode() == null)
            program = new ProgrammingView(program.starter_code(), program.starter_codes(), program.solution_code(),
                    program.solution_language(), program.allowed_languages(), program.time_limit_ms(),
                    program.memory_limit_mb(), "token", program.checker_epsilon());
        ScoringMode mode = raw.scoring_mode() == null ? ScoringMode.all_or_nothing : raw.scoring_mode();
        if (program == raw.programming() && mode == raw.scoring_mode()) return raw;
        return new QuestionSnapshot(raw.type(), raw.content(), raw.topic(), raw.difficulty(), raw.explanation(), mode,
                raw.options(), raw.answer_spec(), program, raw.test_cases());
    }

    /** Dạng so sánh: số so theo giá trị (1 = 1.00), bỏ trường null, không phụ thuộc thứ tự khóa (MySQL JSON đổi thứ tự). */
    static JsonNode canonical(JsonNode node) {
        if (node == null) return NullNode.getInstance();
        if (node.isNumber()) return DecimalNode.valueOf(node.decimalValue().stripTrailingZeros());
        if (node.isArray()) {
            ArrayNode out = JsonNodeFactory.instance.arrayNode();
            node.forEach(child -> out.add(canonical(child)));
            return out;
        }
        if (node.isObject()) {
            ObjectNode out = JsonNodeFactory.instance.objectNode();
            node.fields().forEachRemaining(field -> {
                if (!field.getValue().isNull()) out.set(field.getKey(), canonical(field.getValue()));
            });
            return out;
        }
        return node;
    }
}
