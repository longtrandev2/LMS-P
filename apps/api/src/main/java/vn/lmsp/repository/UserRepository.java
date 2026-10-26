package vn.lmsp.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import vn.lmsp.enums.UserStatus;
import vn.lmsp.model.User;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = "roles") Optional<User> findByEmailIgnoreCase(String email);
    @EntityGraph(attributePaths = "roles") Optional<User> findByStudentCodeIgnoreCase(String studentCode);
    boolean existsByStudentCode(String studentCode);
    @EntityGraph(attributePaths = "roles") Optional<User> findWithRolesById(Long id);
    @EntityGraph(attributePaths = "roles")
    @Query(value="select distinct u from User u left join u.roles r where (:status is null or u.status=:status) and (:role is null or r.name=:role) and (:q is null or lower(u.email) like lower(concat('%',:q,'%')) or lower(u.fullName) like lower(concat('%',:q,'%')) or lower(u.studentCode) like lower(concat('%',:q,'%')))",
           countQuery="select count(distinct u) from User u left join u.roles r where (:status is null or u.status=:status) and (:role is null or r.name=:role) and (:q is null or lower(u.email) like lower(concat('%',:q,'%')) or lower(u.fullName) like lower(concat('%',:q,'%')) or lower(u.studentCode) like lower(concat('%',:q,'%')))")
    Page<User> search(@Param("role") String role,@Param("status") UserStatus status,@Param("q") String query,Pageable pageable);
}
