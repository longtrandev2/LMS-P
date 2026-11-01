package vn.lmsp.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import vn.lmsp.enums.UserStatus;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 255)
    private String email;
    @Column(name = "password_hash", nullable = false, length = 255)
    @Setter
    private String passwordHash;
    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;
    @Column(name = "student_code", unique = true, length = 20)
    @Setter
    private String studentCode;
    @Column(length = 20)
    private String phone;
    @Column(name = "avatar_path", length = 255)
    @Setter
    private String avatarPath;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    @Setter
    private UserStatus status = UserStatus.active;
    @Column(name = "last_login_at")
    @Setter
    private LocalDateTime lastLoginAt;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    protected User() { }
    public User(String email, String passwordHash, String fullName, String studentCode, Role role) {
        this.email = email; this.passwordHash = passwordHash; this.fullName = fullName;
        this.studentCode = studentCode; this.roles.add(role);
    }
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
    public void updateProfile(String fullName, String studentCode) { if(fullName!=null) this.fullName=fullName; if(studentCode!=null) this.studentCode=studentCode; }
    public void updatePersonalProfile(String fullName, String phone) {
        if (fullName != null) this.fullName = fullName;
        if (phone != null) this.phone = phone.isBlank() ? null : phone.trim();
    }
    public void setRoles(Set<Role> values) { roles.clear(); roles.addAll(values); }
}
