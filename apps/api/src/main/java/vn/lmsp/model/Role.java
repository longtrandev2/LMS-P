package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;

@Entity
@Table(name = "roles")
@Getter
public class Role {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Short id;
    @Column(nullable = false, unique = true, length = 30)
    private String name;
    @Column(length = 255)
    private String description;
    protected Role() { }
}
