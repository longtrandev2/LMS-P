package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AdminDtos.LoginSessionView;
import vn.lmsp.model.RefreshToken;
import vn.lmsp.repository.RefreshTokenRepository;
import vn.lmsp.repository.UserRepository;

/**
 * Phiên đăng nhập = chuỗi refresh token xoay vòng cùng `session_family` — docs/admin-spec.md §6. Mốc thời gian token theo
 * đồng hồ của AuthService ({@code LocalDateTime.now()}) để so hạn nhất quán với lúc refresh.
 */
@Service
@RequiredArgsConstructor
public class LoginSessionService {
    private final UserRepository users;
    private final RefreshTokenRepository tokens;
    private final AuditService audit;
    private final RealtimePublisher realtime;

    /** Phiên còn hiệu lực (chưa thu hồi, chưa hết hạn), dùng gần nhất trước. */
    @Transactional(readOnly = true)
    public List<LoginSessionView> list(Long userId) {
        requireUser(userId);
        Map<String, List<RefreshToken>> families = new LinkedHashMap<>();
        for (RefreshToken token : tokens.findLive(userId, LocalDateTime.now()))
            families.computeIfAbsent(token.getSessionFamily(), key -> new ArrayList<>()).add(token);
        if (families.isEmpty()) return List.of();
        Map<String, LocalDateTime> starts = new HashMap<>();
        tokens.findFamilyStarts(userId, families.keySet()).forEach(row -> starts.put(row.getFamily(), row.getStartedAt()));
        List<LoginSessionView> result = new ArrayList<>();
        families.forEach((family, live) -> result.add(view(family, live, starts.get(family))));
        result.sort(Comparator.comparing(LoginSessionView::last_used_at, Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }

    @Transactional
    public void revoke(Long userId, String family, Long actorId) {
        requireUser(userId);
        if (family == null || !tokens.existsByUser_IdAndSessionFamily(userId, family))
            throw notFound("Không tìm thấy phiên đăng nhập");
        int count = tokens.revokeFamily(userId, family, LocalDateTime.now());
        realtime.toUser(userId, "auth.kick", Map.of("reason", "Phiên đăng nhập của bạn đã bị thu hồi bởi quản trị viên."));
        audit.record(actorId, "user.sessions_revoke", "user", userId, null, Map.of("family", family, "count", count));
    }

    @Transactional
    public void revokeAll(Long userId, Long actorId) {
        requireUser(userId);
        int count = tokens.revokeAll(userId, LocalDateTime.now());
        realtime.toUser(userId, "auth.kick", Map.of("reason", "Tất cả các phiên đăng nhập của bạn đã bị thu hồi bởi quản trị viên."));
        audit.record(actorId, "user.sessions_revoke", "user", userId, null, Map.of("family", "all", "count", count));
    }

    /** `live` theo created_at giảm dần: token mới nhất quyết định IP, User-Agent và hạn của phiên. */
    private static LoginSessionView view(String family, List<RefreshToken> live, LocalDateTime startedAt) {
        RefreshToken latest = live.get(0);
        LocalDateTime lastUsed = live.stream().map(t -> t.getLastUsedAt() == null ? t.getCreatedAt() : t.getLastUsedAt())
                .max(Comparator.naturalOrder()).orElse(latest.getCreatedAt());
        return new LoginSessionView(family, latest.getIp(), latest.getUserAgent(),
                startedAt == null ? latest.getCreatedAt() : startedAt, lastUsed, latest.getExpiresAt());
    }

    private void requireUser(Long userId) {
        if (!users.existsById(userId)) throw notFound("Không tìm thấy người dùng");
    }

    private static LmsException notFound(String message) {
        return new LmsException("NOT_FOUND", message, HttpStatus.NOT_FOUND, null);
    }
}
