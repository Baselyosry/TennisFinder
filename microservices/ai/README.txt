# Fair Price Model API

## Run with Docker
```bash
docker build -t fair-price-api .
docker run -p 8000:8000 fair-price-api
.
.
.
Endpoints:

-GET /health

-POST /predict
-POST /label
Example request:

    