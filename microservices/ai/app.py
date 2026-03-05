import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL_PATH = "marketplace_fair_price_model_tuned.pkl"
FEATURES = ["category", "condition", "brand", "model", "flaw", "age_months", "original_price"]

app = FastAPI(title="Fair Price (Sold Price) API", version="1.0.0")

class PredictRequest(BaseModel):
    category: str
    condition: str
    brand: str
    model: str
    flaw: str
    age_months: float
    original_price: float
     
THRESHOLD = 0.10  # 10%    
class LabelRequest(BaseModel):
    predicted_sold_price: float
    user_price: float

class PredictResponse(BaseModel):
    predicted_sold_price: float
 

class HealthResponse(BaseModel):
    status: str

pipeline = joblib.load(MODEL_PATH)

@app.get("/", response_model=dict)
def root():
    return {"message": "API is running. Go to /docs"}

@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok"}

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        X = pd.DataFrame([req.model_dump()])[FEATURES]
        pred = pipeline.predict(X)
        return {"predicted_sold_price": int(pred[0])}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    


@app.post("/label")
def label(req: LabelRequest):
    try:
        fair = float(req.predicted_sold_price)
        user = float(req.user_price)

        if fair <= 0:
            raise HTTPException(status_code=400, detail="predicted_sold_price must be > 0")

        diff = user - fair
        pct = diff / fair
        minPrice:int = fair - 200
        maxPrice:int = fair + 200 
        recommendedRang = f"{minPrice} - {maxPrice}"
        if pct > THRESHOLD:
            status = "overpriced"
        elif pct < -THRESHOLD:
            status = "underpriced"
        else:
            status = "fair"

        return {
            "label": status,
            "Recommended Price Range": recommendedRang 
            
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))