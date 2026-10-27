package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.SystemSetting;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> { }
