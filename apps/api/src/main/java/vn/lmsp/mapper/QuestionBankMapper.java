package vn.lmsp.mapper;

import org.springframework.stereotype.Component;
import vn.lmsp.dto.QuestionDtos.CategoryView;
import vn.lmsp.dto.QuestionDtos.QuestionBankView;
import vn.lmsp.model.QuestionBank;
import vn.lmsp.model.QuestionCategory;

@Component
public class QuestionBankMapper {
    public QuestionBankView toView(QuestionBank bank, boolean canEdit, boolean canManage, long questionCount) {
        return new QuestionBankView(bank.getId(), bank.getCourseId(), bank.getCourseName(),
                bank.getOwnerId(), bank.getName(), bank.getDescription(), bank.getVisibility(), canEdit, canManage,
                bank.getCreatedAt(), questionCount);
    }

    public CategoryView toCategoryView(QuestionCategory category) {
        return new CategoryView(category.getId(), category.getBankId(), category.getName());
    }
}
