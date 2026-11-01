package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.clazz;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.GradebookDtos.*;
import vn.lmsp.model.LmsClass;

class GradePolicyServiceTest {
    private final ObjectMapper json = new ObjectMapper();
    private final GradebookAccess access = mock(GradebookAccess.class);
    private final AuditService audit = mock(AuditService.class);
    private final GradePolicyService service = new GradePolicyService(access, audit, json, vn.lmsp.support.TestSettings.defaults());

    private static GradePolicyInput input(String a, String b, String c, String d, Integer max, String penalty) {
        return new GradePolicyInput(new WeightsInput(new BigDecimal(a), new BigDecimal(b), new BigDecimal(c), new BigDecimal(d)),
                new AttendancePolicyInput(max, new BigDecimal(penalty), new BigDecimal("0.5"), BigDecimal.ZERO));
    }

    @Test void readFallsBackToDefaultsForNullOrMissingKeys() throws Exception {
        assertThat(GradePolicyCodec.read(null)).isEqualTo(GradePolicyCodec.DEFAULT);
        GradePolicy partial = GradePolicyCodec.read(json.readTree("{\"weights\":{\"attendance\":20,\"final\":40},\"attendance\":{\"max_absences\":4}}"));
        assertThat(partial.weights()).isEqualTo(new Weights(20, 20, 20, 40));
        assertThat(partial.attendance().max_absences()).isEqualTo(4);
        assertThat(partial.attendance().absent_penalty()).isEqualByComparingTo("2");
        assertThat(partial.attendance().late_penalty()).isEqualByComparingTo("0.5");
    }

    @Test void validatesWeightsSumIntegerAndPenaltyStep() {
        assertThat(GradePolicyService.validate(input("10", "30", "20", "40", null, "1.25")).weights())
                .isEqualTo(new Weights(10, 30, 20, 40));
        assertThatThrownBy(() -> GradePolicyService.validate(input("10", "20", "20", "40", null, "2")))
                .isInstanceOf(LmsException.class).hasMessageContaining("Tổng trọng số phải đúng 100%")
                .extracting("code").isEqualTo("VALIDATION_ERROR");
        assertThatThrownBy(() -> GradePolicyService.validate(input("10.5", "20", "20", "49.5", null, "2")))
                .hasMessageContaining("số nguyên");
        assertThatThrownBy(() -> GradePolicyService.validate(input("10", "20", "20", "50", null, "0.3")))
                .hasMessageContaining("bước 0,25");
        assertThatThrownBy(() -> GradePolicyService.validate(input("10", "20", "20", "50", 201, "2")))
                .hasMessageContaining("0 đến 200");
        assertThatThrownBy(() -> GradePolicyService.validate(input("-10", "40", "20", "50", null, "2")))
                .hasMessageContaining("số nguyên từ 0 đến 100");
    }

    @Test void updateStoresJsonInDatabaseShapeAndAudits() {
        LmsClass item = clazz(null);
        when(access.lecturerClass(3L, 7L, false)).thenReturn(item);

        GradePolicy saved = service.update(3L, input("10", "30", "20", "40", 5, "1.50"), 7L, false);

        assertThat(saved.attendance().absent_penalty()).isEqualByComparingTo("1.5");
        var node = item.getGradePolicy();
        assertThat(node.path("weights").path("final").intValue()).isEqualTo(40);
        assertThat(node.path("weights").path("assignment").intValue()).isEqualTo(30);
        assertThat(node.path("attendance").path("max_absences").intValue()).isEqualTo(5);
        assertThat(node.path("attendance").path("absent_penalty").decimalValue()).isEqualByComparingTo("1.5");
        assertThat(GradePolicyCodec.read(node)).isEqualTo(saved);
        verify(audit).record(eq(7L), eq("grade.policy"), eq("class"), eq(3L), anyMap(), anyMap());
    }

    @Test void getRequiresMembership() {
        when(access.memberClass(3L, 99L, false, true)).thenThrow(new LmsException("ENROLLMENT_REQUIRED", "Bạn chưa tham gia lớp học",
                org.springframework.http.HttpStatus.FORBIDDEN, null));
        assertThatThrownBy(() -> service.get(3L, 99L, false, true)).extracting("code").isEqualTo("ENROLLMENT_REQUIRED");
        when(access.memberClass(3L, 42L, false, true)).thenReturn(clazz(null));
        assertThat(service.get(3L, 42L, false, true)).isEqualTo(GradePolicyCodec.DEFAULT);
    }
}
