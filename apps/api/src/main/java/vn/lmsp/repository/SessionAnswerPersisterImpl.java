package vn.lmsp.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import vn.lmsp.model.SessionAnswer;

/** Fragment của {@link SessionAnswerRepository}. */
public class SessionAnswerPersisterImpl implements SessionAnswerPersister {
    @PersistenceContext private EntityManager em;

    @Override
    public void persist(SessionAnswer answer) { em.persist(answer); }
}
