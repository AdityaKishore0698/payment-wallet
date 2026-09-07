# Unified backend image for Render: FastAPI (Uvicorn) + Celery worker,
# started together by start.sh.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Render provides $PORT; default to 8000 for local `docker run`.
EXPOSE 8000

CMD ["./start.sh"]
