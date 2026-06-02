import logging
import time
import random
import re
from collections import Counter
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from catalog import CATALOG, ARTIST_SIMILARITY, GENRE_CLUSTERS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("reproductor-python")

app = FastAPI(title="Reproductor Python Services", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ──

class TrackInput(BaseModel):
    name: Optional[str] = ""
    artist: Optional[str] = ""
    album: Optional[str] = ""
    genre: Optional[str] = None

class RecommendRequest(BaseModel):
    tracks: list[TrackInput] = []
    count: Optional[int] = 10

class RecommendResponse(BaseModel):
    recommendations: list[dict]
    metadata: dict

class HealthResponse(BaseModel):
    status: str
    catalog_size: int
    version: str

# ── Recommendation Engine ──

def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9\s]", "", text.lower()).strip()

def tokenize(text: str) -> set:
    return set(normalize(text).split())

def get_genre_cluster(genre: Optional[str]) -> set:
    if not genre:
        return set()
    genre_key = genre.strip().lower()
    for key, cluster in GENRE_CLUSTERS.items():
        if genre_key == key or genre_key in cluster:
            return set(cluster)
    return {genre_key}

def score_track(input_track: TrackInput, catalog_track: dict, input_weight: float = 1.0) -> float:
    score = 0.0
    input_artist = normalize(input_track.artist or "")
    input_name = normalize(input_track.name or "")
    cat_artist = normalize(catalog_track["artist"])
    cat_name = normalize(catalog_track["name"])

    if not input_artist and not input_name:
        return 0.0

    if input_artist and input_artist == cat_artist:
        score += 10.0 * input_weight
        input_name_tokens = tokenize(input_track.name or "")
        cat_name_tokens = tokenize(catalog_track["name"])
        if input_name_tokens & cat_name_tokens:
            score += 3.0 * input_weight
    elif input_artist:
        similar_artists = ARTIST_SIMILARITY.get(input_artist, [])
        if cat_artist in similar_artists:
            score += 5.0 * input_weight

    if input_name and input_name == cat_name:
        score += 2.0 * input_weight
    elif input_name:
        input_tokens = tokenize(input_track.name or "")
        cat_tokens = tokenize(catalog_track["name"])
        if input_tokens & cat_tokens:
            overlap = len(input_tokens & cat_tokens)
            score += (1.0 * overlap) * input_weight

    if input_track.genre or input_track.artist:
        input_genre = input_track.genre or _infer_genre(input_track.artist)
        input_cluster = get_genre_cluster(input_genre)
        cat_cluster = get_genre_cluster(catalog_track["genre"])
        if input_cluster & cat_cluster:
            score += 4.0 * input_weight

    return score

def _infer_genre(artist_name: Optional[str]) -> Optional[str]:
    if not artist_name:
        return None
    needle = normalize(artist_name)
    for track in CATALOG:
        if normalize(track["artist"]) == needle:
            return track["genre"]
    return None

def build_track_dict(track: dict, reason: str) -> dict:
    return {
        "id": track["id"],
        "name": track["name"],
        "artist": track["artist"],
        "album": track["album"],
        "albumImage": f"https://via.placeholder.com/300x300/1e1e2e/ffffff?text={track['artist'][0]}{track['name'][0]}",
        "previewUrl": None,
        "duration": None,
        "source": "recommendation",
        "reason": reason,
    }

def get_recommendations(input_tracks: list[TrackInput], count: int = 10) -> list[dict]:
    start = time.perf_counter()

    if count < 1:
        count = 10
    if count > 50:
        count = 50

    if not input_tracks:
        result = _popular_recommendations(count)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        return result, {
            "strategy": "popular",
            "input_tracks_count": 0,
            "catalog_size": len(CATALOG),
            "processing_time_ms": elapsed_ms,
        }

    scored: list[tuple[float, dict, str]] = []
    input_ids = {t.name.strip().lower() + t.artist.strip().lower() for t in input_tracks if t.name and t.artist}

    for ct in CATALOG:
        cat_key = ct["name"].strip().lower() + ct["artist"].strip().lower()
        if cat_key in input_ids:
            continue

        total_score = 0.0
        reasons = []

        for inp in input_tracks:
            s = score_track(inp, ct)
            if s > 0:
                total_score += s
                if s >= 8 and inp.artist and normalize(inp.artist) == normalize(ct["artist"]):
                    reasons.append(f"Same artist as {inp.artist}")
                elif s >= 4:
                    reasons.append(f"Similar to {inp.name or inp.artist}")
                elif s >= 2:
                    reasons.append(f"You might like this")

        if total_score > 0:
            reason = reasons[0] if reasons else "Recommended for you"
            scored.append((total_score, ct, reason))

    scored.sort(key=lambda x: -x[0])

    recommendations = []
    seen_ids = set()
    for score, ct, reason in scored:
        if ct["id"] not in seen_ids:
            recommendations.append(build_track_dict(ct, reason))
            seen_ids.add(ct["id"])
        if len(recommendations) >= count:
            break

    if len(recommendations) < count:
        needed = count - len(recommendations)
        for ct in CATALOG:
            if ct["id"] not in seen_ids:
                recommendations.append(build_track_dict(ct, "Popular track"))
                seen_ids.add(ct["id"])
            if len(recommendations) >= count:
                break

    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
    metadata = {
        "strategy": "content-based" if input_tracks else "popular",
        "input_tracks_count": len(input_tracks),
        "catalog_size": len(CATALOG),
        "candidates_evaluated": len(scored),
        "processing_time_ms": elapsed_ms,
    }

    return recommendations, metadata

def _popular_recommendations(count: int) -> list[dict]:
    random.seed(hash(str(time.time())))
    shuffled = CATALOG.copy()
    random.shuffle(shuffled)
    return [build_track_dict(t, "Popular track") for t in shuffled[:count]]

# ── Genre catalog endpoint ──

def get_genres() -> list[dict]:
    genre_counts = Counter(t["genre"] for t in CATALOG)
    return sorted(
        [{"name": g, "count": c} for g, c in genre_counts.items()],
        key=lambda x: -x["count"],
    )

# ── Routes ──

@app.get("/")
def root():
    return {
        "service": "Reproductor Python Services",
        "version": "2.0.0",
        "status": "running",
        "catalog_size": len(CATALOG),
        "genres_available": len(get_genres()),
    }

@app.post("/recommend", response_model=RecommendResponse)
def recommend(data: RecommendRequest):
    try:
        recommendations, metadata = get_recommendations(data.tracks, data.count)
        log.info(
            "recommend strategy=%s input=%d output=%d time=%.1fms",
            metadata["strategy"],
            metadata["input_tracks_count"],
            len(recommendations),
            metadata["processing_time_ms"],
        )
        return RecommendResponse(recommendations=recommendations, metadata=metadata)
    except Exception as e:
        log.error("recommend failed: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommend/popular")
def popular(count: int = 10):
    try:
        actual_count = max(1, min(count, 50))
        recommendations = _popular_recommendations(actual_count)
        return RecommendResponse(
            recommendations=recommendations,
            metadata={
                "strategy": "popular",
                "input_tracks_count": 0,
                "catalog_size": len(CATALOG),
                "processing_time_ms": 0,
            },
        )
    except Exception as e:
        log.error("popular failed: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/catalog")
def get_catalog():
    return {
        "total": len(CATALOG),
        "tracks": CATALOG,
    }

@app.get("/catalog/genres")
def catalog_genres():
    return {
        "total": len(get_genres()),
        "genres": get_genres(),
    }

@app.get("/catalog/artist/{artist_name}")
def catalog_by_artist(artist_name: str):
    needle = normalize(artist_name)
    matches = [t for t in CATALOG if normalize(t["artist"]) == needle]
    if not matches:
        raise HTTPException(status_code=404, detail=f"No tracks found for artist: {artist_name}")
    return {
        "artist": matches[0]["artist"],
        "total": len(matches),
        "tracks": matches,
    }

@app.get("/catalog/genre/{genre_name}")
def catalog_by_genre(genre_name: str):
    needle = genre_name.strip().lower()
    matches = [t for t in CATALOG if t["genre"] == needle]
    if not matches:
        raise HTTPException(
            status_code=404,
            detail=f"No tracks found for genre: {genre_name}. Available: {[g['name'] for g in get_genres()]}",
        )
    return {
        "genre": needle,
        "total": len(matches),
        "tracks": matches,
    }

@app.get("/health")
def health():
    return HealthResponse(
        status="ok",
        catalog_size=len(CATALOG),
        version="2.0.0",
    )
