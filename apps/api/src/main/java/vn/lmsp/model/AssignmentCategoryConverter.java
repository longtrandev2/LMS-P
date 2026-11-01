package vn.lmsp.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import vn.lmsp.enums.AssignmentCategory;

@Converter
public class AssignmentCategoryConverter implements AttributeConverter<AssignmentCategory, String> {
    @Override
    public String convertToDatabaseColumn(AssignmentCategory category) {
        return category == null ? null : category.value();
    }

    @Override
    public AssignmentCategory convertToEntityAttribute(String value) {
        return value == null ? null : AssignmentCategory.fromValue(value);
    }
}
