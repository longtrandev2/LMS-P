# LMS API — FastAPI + uvicorn
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv/app

# dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# application code (scripts/seed.py is mounted via compose volume, not baked in)
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini .

# non-root runtime user
RUN useradd --create-home --shell /usr/sbin/nologin apiuser \
    && chown -R apiuser:apiuser /srv/app
USER apiuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
