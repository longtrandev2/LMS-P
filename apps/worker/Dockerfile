# Grading worker — Python 3.12 slim, non-root
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY worker/ worker/

# Non-root runtime user
RUN useradd --create-home --uid 10001 worker
USER worker

# Healthcheck: is PID 1 (this worker) still alive / signalable
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import os; os.kill(1, 0)" || exit 1

CMD ["python", "-m", "worker.main"]
