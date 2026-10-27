package vn.lmsp.service;

import java.security.SecureRandom;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDrawDtos.*;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.Question;
import vn.lmsp.repository.QuestionRepository;

/** Bốc câu hỏi ngẫu nhiên vào bản nháp đề — assessment-spec.md §6.2, api-spec.md §5. */
@Service
@RequiredArgsConstructor
public class QuestionDrawService {
    private final QuestionRepository questions;
    private final QuestionBankService banks;
    private final QuestionReadService reader;
    private final Random random = new SecureRandom();

    @Transactional(readOnly = true)
    public DrawResult draw(DrawRequest request, Long actor, boolean admin) {
        Set<Long> taken = new HashSet<>(request.exclude_question_ids() == null ? List.of() : request.exclude_question_ids());
        List<Long> picked = new ArrayList<>();
        List<DrawShortage> shortages = new ArrayList<>();
        Set<QuestionType> excluded = request.exclude_types() == null || request.exclude_types().isEmpty()
                ? EnumSet.noneOf(QuestionType.class) : EnumSet.copyOf(request.exclude_types());
        for (int index = 0; index < request.rules().size(); index++) {
            DrawRule rule = request.rules().get(index);
            banks.requireBank(rule.bank_id(), actor, admin);
            if (rule.category_id() != null && !banks.requireCategory(rule.category_id(), actor, admin).getBankId().equals(rule.bank_id()))
                throw new LmsException("VALIDATION_ERROR", "Danh mục không thuộc ngân hàng đã chọn", HttpStatus.BAD_REQUEST, null);
            List<Long> candidates = rule.type() != null && excluded.contains(rule.type()) ? new ArrayList<>()
                    : new ArrayList<>(questions.findDrawCandidates(rule.bank_id(), rule.category_id(), rule.type(),
                            rule.difficulty(), excluded));
            candidates.removeIf(taken::contains);
            Collections.shuffle(candidates, random);
            List<Long> chosen = candidates.subList(0, Math.min(rule.count(), candidates.size()));
            if (chosen.size() < rule.count()) shortages.add(new DrawShortage(index, rule.count(), candidates.size()));
            taken.addAll(chosen);
            picked.addAll(chosen);
        }
        Map<Long, Question> loaded = questions.findAllById(picked).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
        return new DrawResult(picked.stream().map(loaded::get).filter(Objects::nonNull).map(reader::summary).toList(), shortages);
    }
}
