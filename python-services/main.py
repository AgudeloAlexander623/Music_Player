from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Reproductor Python Services", version="1.0.0")


class RecommendRequest(BaseModel):
    user_id: int
    limit: Optional[int] = 10


class RecommendResponse(BaseModel):
    user_id: int
    recommendations: list[dict]


@app.get("/")
def root():
    return {"message": "Reproductor Python Services running", "version": "1.0.0"}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(data: RecommendRequest):
    """
    Endpoint de recomendaciones basado en el historial del usuario.
    Por ahora retorna datos de ejemplo. Integrar con ML en el futuro.
    """
    recommendations = [
        {
            "title": "Recommended Song A",
            "artist": "Artist A",
            "reason": "Based on your listening history",
        },
        {
            "title": "Recommended Song B",
            "artist": "Artist B",
            "reason": "Similar to your favorites",
        },
        {
            "title": "Recommended Song C",
            "artist": "Artist C",
            "reason": "Trending in your preferred genre",
        },
    ]

    return RecommendResponse(
        user_id=data.user_id,
        recommendations=recommendations[: data.limit],
    )


@app.get("/health")
def health():
    return {"status": "ok"}
