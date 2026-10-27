package vn.lmsp.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import vn.lmsp.enums.GradeComponent;

@Converter
public class GradeComponentConverter implements AttributeConverter<GradeComponent, String> {
    @Override public String convertToDatabaseColumn(GradeComponent value) { return value == null ? null : value.value(); }
    @Override public GradeComponent convertToEntityAttribute(String value) { return value == null ? null : GradeComponent.fromValue(value); }
}
