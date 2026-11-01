package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.Role;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Short> {
    Optional<Role> findByName(String name);
}
