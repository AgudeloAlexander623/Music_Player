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

app = FastAPI(title="Reproductor Python Services", version="0.1.0-beta")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ──

class TrackInput(BaseModel):
    """What the user sends when asking for recommendations.

    All fields are optional; the more you provide, the better the matching.
    """
    name: Optional[str] = ""
    artist: Optional[str] = ""
    album: Optional[str] = ""
    genre: Optional[str] = None


class RecommendRequest(BaseModel):
    """Payload for the /recommend endpoint."""
    tracks: list[TrackInput] = []
    count: Optional[int] = 10


class RecommendResponse(BaseModel):
    """Standard response shape for recommendation endpoints."""
    recommendations: list[dict]
    metadata: dict


class HealthResponse(BaseModel):
    """Health-check response shape."""
    status: str
    catalog_size: int
    version: str


# ── Recommendation Engine ──

def normalize(text: str) -> str:
    """Lowercases text, strips punctuation, and collapses whitespace.

    This is the foundation of every comparison in the engine.  By reducing
    everything to a canonical form we avoid mismatches caused by casing,
    punctuation, or accidental whitespace differences.

    Args:
        text: Raw input string.

    Returns:
        Clean, lowercase string with only letters, digits, and spaces.
        Returns an empty string if the input is None or empty.
    """
    return re.sub(r"[^a-z0-9\s]", "", text.lower()).strip()


def tokenize(text: str) -> set:
    """Splits normalized text into a set of distinct words.

    Useful for partial matching — instead of requiring an exact title match
    we can check whether key words overlap.

    Args:
        text: Raw input string.

    Returns:
        Set of unique normalized words.
    """
    return set(normalize(text).split())


def get_genre_cluster(genre: Optional[str]) -> set:
    """Expands a genre name into its related cluster of genres.

    Genre clusters are defined in GENRE_CLUSTERS and let us recommend
    across genre boundaries (e.g. "rock" also matches "indie").

    Args:
        genre: A genre name, or None.

    Returns:
        A set of related genre names, or an empty set if genre is None.
        If the genre is unknown it is returned as a single-element set.
    """
    if not genre:
        return set()
    genre_key = genre.strip().lower()
    for key, cluster in GENRE_CLUSTERS.items():
        if genre_key == key or genre_key in cluster:
            return set(cluster)
    return {genre_key}


def score_track(input_track: TrackInput, catalog_track: dict, input_weight: float = 1.0) -> float:
    """Compares one input track against one catalog track and returns a relevance score.

    The scoring strategy works in layers:
      - Exact artist match is heavily rewarded (10 pts).
      - If the artist matches *and* some title words overlap, bonus points (3 pts).
      - Similar artists (via ARTIST_SIMILARITY) get a moderate boost (5 pts).
      - Exact or partial name matches add smaller amounts (2 pts + 1 pt per overlapping word).
      - Genre-cluster affinity adds 4 pts when the input genre (or inferred genre) overlaps.

    Args:
        input_track: The user's query for a single track.
        catalog_track: A track from the catalog to score against.
        input_weight: Multiplier for all score components (used when fusing
                      multiple input tracks into one score).

    Returns:
        A float score. 0 means no match found.
    """
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
    """Tries to guess a genre for an artist by looking up the catalog.

    Args:
        artist_name: Name of the artist to look up.

    Returns:
        The genre string if the artist is found in the catalog, else None.
    """
    if not artist_name:
        return None
    needle = normalize(artist_name)
    for track in CATALOG:
        if normalize(track["artist"]) == needle:
            return track["genre"]
    return None


def build_track_dict(track: dict, reason: str) -> dict:
    """Wraps a catalog track into the standard response format the frontend expects.

    Args:
        track: A catalog entry dict.
        reason: Short human-readable string explaining why this track was recommended.

    Returns:
        A dict matching the frontend's Track type.
    """
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


def get_recommendations(input_tracks: list[TrackInput], count: int = 10) -> tuple[list[dict], dict]:
    """Main recommendation logic: scores the catalog and returns the top matches.

    Two strategies:
      - **Popular**: when no input tracks are given, returns a random sample.
      - **Content-based**: scores every catalog track against every input track,
        aggregates scores, deduplicates, and returns the highest-ranked results.
        If there aren't enough scored results, the remaining slots are filled
        with popular tracks.

    Args:
        input_tracks: List of tracks the user wants to base recommendations on.
        count: How many recommendations to return (clamped between 1 and 50).

    Returns:
        A tuple of (recommendations list, metadata dict).  The metadata contains
        timing, strategy name, and catalog stats for observability.
    """
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
    input_catalog_ids = set()

    for ct in CATALOG:
        cat_key = ct["name"].strip().lower() + ct["artist"].strip().lower()
        if cat_key in input_ids:
            input_catalog_ids.add(ct["id"])
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
    seen_ids = set(input_catalog_ids)
    for score, ct, reason in scored:
        if ct["id"] not in seen_ids:
            recommendations.append(build_track_dict(ct, reason))
            seen_ids.add(ct["id"])
        if len(recommendations) >= count:
            break

    if len(recommendations) < count:
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
    """Returns a random subset of the catalog labelled as popular picks.

    Used as a fallback when the user provides no input tracks, and to
    fill remaining slots when content-based scoring doesn't yield enough
    results.

    Args:
        count: Number of tracks to return.

    Returns:
        A list of track dicts with reason "Popular track".
    """
    random.seed(hash(str(time.time())))
    shuffled = CATALOG.copy()
    random.shuffle(shuffled)
    return [build_track_dict(t, "Popular track") for t in shuffled[:count]]


# ── Genre catalog endpoint ──

def get_genres() -> list[dict]:
    """Computes a sorted list of unique genres with their track counts.

    Returns:
        List of dicts, each with "name" (str) and "count" (int),
        sorted from most to least frequent.
    """
    genre_counts = Counter(t["genre"] for t in CATALOG)
    return sorted(
        [{"name": g, "count": c} for g, c in genre_counts.items()],
        key=lambda x: -x["count"],
    )


# ── Routes ──

@app.get("/")
def root():
    """Health-check endpoint that also exposes basic service metadata."""
    return {
        "service": "Reproductor Python Services",
        "version": "0.1.0-beta",
        "status": "running",
        "catalog_size": len(CATALOG),
        "genres_available": len(get_genres()),
    }


@app.post("/recommend", response_model=RecommendResponse)
def recommend(data: RecommendRequest):
    """Returns track recommendations based on a list of input tracks.

    Accepts a JSON body with:
      - tracks: list of {name, artist, album, genre}
      - count: how many results to return (default 10, max 50)

    When tracks is empty it falls back to popular recommendations.
    """
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
    """Returns a random set of popular tracks, useful for cold-start."""
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
    """Returns every track in the catalog. Useful for debugging or client-side caching."""
    return {
        "total": len(CATALOG),
        "tracks": CATALOG,
    }


@app.get("/catalog/genres")
def catalog_genres():
    """Returns all unique genres present in the catalog, sorted by popularity."""
    return {
        "total": len(get_genres()),
        "genres": get_genres(),
    }


@app.get("/catalog/artist/{artist_name}")
def catalog_by_artist(artist_name: str):
    """Returns all catalog tracks by the given artist (case-insensitive).

    Raises 404 if the artist is not found.
    """
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
    """Returns all catalog tracks whose genre matches the given name (case-insensitive).

    Raises 404 if no tracks match. The error includes the list of available genres.
    """
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


@app.get("/catalog/search")
def search_catalog(query: str):
    """Full-text search over track names and artists.

    Matches if the query appears anywhere in the name or artist field
    (case-insensitive).

    Args:
        query: Search string.

    Returns:
        All matching tracks with a total count.
    """
    results = [
        t for t in CATALOG
        if query.lower() in t["name"].lower() or query.lower() in t["artist"].lower()
    ]
    return {
        "total": len(results),
        "tracks": results,
    }


@app.get("/catalog/{id}")
def get_catalog_by_id(id: str):
    """Returns a single catalog track by its unique ID.

    Raises 404 if the ID does not exist.
    """
    track = next((t for t in CATALOG if t["id"] == id), None)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track not found: {id}")
    return track


@app.get("/health")
def health():
    """Simple health-check endpoint for monitoring and orchestration."""
    return HealthResponse(
        status="ok",
        catalog_size=len(CATALOG),
        version="0.1.0-beta",
    )
