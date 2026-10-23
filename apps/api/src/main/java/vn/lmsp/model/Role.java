package vn.lmsp.model;

import jakarta.persistence.*;

@Entity
@Table(name = "roles")
public class Role {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Short id;
    @Column(nullable = false, unique = true, length = 30)
    private String name;
    @Column(length = 255)
    private String description;
    protected Role() { }
    public String getName() { return name; }
}
