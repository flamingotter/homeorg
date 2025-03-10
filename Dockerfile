#Dockerfile
FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip show sqlalchemy
COPY app ./app
COPY static /app/static

RUN ls -la /app

RUN python -c "import sys; print(sys.path)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]