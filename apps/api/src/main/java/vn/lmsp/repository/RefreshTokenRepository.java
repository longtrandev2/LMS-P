package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.RefreshToken;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    List<RefreshToken> findAllByUser_IdAndRevokedAtIsNull(Long userId);

    // ---- Phiên đăng nhập — docs/admin-spec.md §6 ----
    @Query("select t from RefreshToken t where t.user.id=:userId and t.revokedAt is null and t.expiresAt>:now"
            + " order by t.createdAt desc, t.id desc")
    List<RefreshToken> findLive(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** Thời điểm đăng nhập của từng phiên = token đầu tiên của family. */
    interface FamilyStart { String getFamily(); LocalDateTime getStartedAt(); }
    @Query("select t.sessionFamily as family, min(t.createdAt) as startedAt from RefreshToken t"
            + " where t.user.id=:userId and t.sessionFamily in :families group by t.sessionFamily")
    List<FamilyStart> findFamilyStarts(@Param("userId") Long userId, @Param("families") Collection<String> families);

    boolean existsByUser_IdAndSessionFamily(Long userId, String sessionFamily);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update RefreshToken t set t.revokedAt=:now where t.user.id=:userId and t.sessionFamily=:family and t.revokedAt is null")
    int revokeFamily(@Param("userId") Long userId, @Param("family") String family, @Param("now") LocalDateTime now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update RefreshToken t set t.revokedAt=:now where t.user.id=:userId and t.revokedAt is null")
    int revokeAll(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
