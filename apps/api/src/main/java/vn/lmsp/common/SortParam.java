package vn.lmsp.common;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import java.util.Map;

/** Quy ước sort chung api-spec §1: ?sort=field hoặc -field, whitelist theo từng resource. */
public final class SortParam {
    private SortParam() { }
    /** Parse tham số sort; tên trường không nằm trong whitelist → 400 VALIDATION_ERROR. */
    public static Sort parse(String sort, Map<String, String> whitelist, Sort fallback) {
        if (sort == null || sort.isBlank()) return fallback;
        boolean desc = sort.startsWith("-");
        String field = desc ? sort.substring(1) : sort;
        String property = whitelist.get(field);
        if (property == null)
            throw new LmsException("VALIDATION_ERROR", "Trường sắp xếp không hợp lệ: " + field, HttpStatus.BAD_REQUEST, null);
        return Sort.by(desc ? Sort.Order.desc(property) : Sort.Order.asc(property));
    }
    public static Sort asc(String... properties) { return Sort.by(Sort.Direction.ASC, properties); }
    public static Sort desc(String... properties) { return Sort.by(Sort.Direction.DESC, properties); }
}
