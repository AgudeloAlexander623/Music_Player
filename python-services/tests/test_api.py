"""Tests for the FastAPI HTTP endpoints using the TestClient."""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestRoot:
    def test_returns_service_info(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "catalog_size" in data
        assert data["catalog_size"] > 0

    def test_version_is_present(self):
        response = client.get("/")
        assert "version" in response.json()


class TestHealth:
    def test_health_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["catalog_size"] > 0

    def test_health_version_matches(self):
        response = client.get("/health")
        assert "version" in response.json()


class TestCatalog:
    def test_returns_all_tracks(self):
        response = client.get("/catalog")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] > 0
        assert len(data["tracks"]) == data["total"]

    def test_tracks_have_expected_structure(self):
        response = client.get("/catalog")
        track = response.json()["tracks"][0]
        assert all(k in track for k in ("id", "name", "artist", "album", "genre"))


class TestCatalogGenres:
    def test_returns_genres(self):
        response = client.get("/catalog/genres")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] > 0
        assert len(data["genres"]) == data["total"]

    def test_genres_have_name_and_count(self):
        response = client.get("/catalog/genres")
        genre = response.json()["genres"][0]
        assert "name" in genre
        assert "count" in genre


class TestCatalogSearch:
    def test_search_by_name(self):
        response = client.get("/catalog/search", params={"query": "Bohemian"})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] > 0
        assert any("Bohemian" in t["name"] for t in data["tracks"])

    def test_search_by_artist(self):
        response = client.get("/catalog/search", params={"query": "Queen"})
        assert response.status_code == 200
        data = response.json()
        assert all("Queen" in t["artist"] for t in data["tracks"])

    def test_search_case_insensitive(self):
        response = client.get("/catalog/search", params={"query": "queen"})
        assert response.status_code == 200
        assert response.json()["total"] > 0

    def test_search_no_results(self):
        response = client.get("/catalog/search", params={"query": "xyznonexistent"})
        assert response.status_code == 200
        assert response.json()["total"] == 0


class TestCatalogById:
    def test_found(self):
        response = client.get("/catalog/cat_001")
        assert response.status_code == 200
        assert response.json()["id"] == "cat_001"
        assert response.json()["name"] == "Bohemian Rhapsody"

    def test_not_found(self):
        response = client.get("/catalog/nonexistent")
        assert response.status_code == 404

    def test_all_ids_are_valid(self):
        """Verify that a handful of known IDs all resolve correctly."""
        for tid in ("cat_001", "cat_030", "cat_060"):
            response = client.get(f"/catalog/{tid}")
            assert response.status_code == 200
            assert response.json()["id"] == tid


class TestCatalogByArtist:
    def test_found(self):
        response = client.get("/catalog/artist/Queen")
        assert response.status_code == 200
        assert response.json()["artist"] == "Queen"
        assert response.json()["total"] > 0

    def test_case_insensitive(self):
        response = client.get("/catalog/artist/queen")
        assert response.status_code == 200
        assert response.json()["artist"] == "Queen"

    def test_not_found(self):
        response = client.get("/catalog/artist/NonExistentArtist")
        assert response.status_code == 404


class TestCatalogByGenre:
    def test_found(self):
        response = client.get("/catalog/genre/rock")
        assert response.status_code == 200
        assert response.json()["genre"] == "rock"
        assert response.json()["total"] > 0

    def test_not_found(self):
        response = client.get("/catalog/genre/nonexistent")
        assert response.status_code == 404


class TestRecommend:
    def test_with_tracks(self):
        response = client.post("/recommend", json={
            "tracks": [{"artist": "Queen", "name": "Bohemian Rhapsody"}],
            "count": 5,
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["recommendations"]) > 0
        assert data["metadata"]["strategy"] == "content-based"

    def test_empty_tracks_falls_back_to_popular(self):
        response = client.post("/recommend", json={"tracks": [], "count": 4})
        assert response.status_code == 200
        data = response.json()
        assert len(data["recommendations"]) == 4
        assert data["metadata"]["strategy"] == "popular"

    def test_count_is_clamped_to_max_50(self):
        response = client.post("/recommend", json={"tracks": [], "count": 999})
        assert response.status_code == 200
        assert len(response.json()["recommendations"]) <= 50

    def test_recommendations_are_valid_tracks(self):
        response = client.post("/recommend", json={
            "tracks": [{"artist": "Queen"}],
            "count": 3,
        })
        for track in response.json()["recommendations"]:
            assert "id" in track
            assert "name" in track
            assert "reason" in track


class TestPopular:
    def test_returns_requested_count(self):
        response = client.get("/recommend/popular?count=5")
        assert response.status_code == 200
        assert len(response.json()["recommendations"]) == 5

    def test_defaults_to_10(self):
        response = client.get("/recommend/popular")
        assert response.status_code == 200
        assert len(response.json()["recommendations"]) == 10

    def test_returns_recommend_response_shape(self):
        response = client.get("/recommend/popular?count=3")
        data = response.json()
        assert "recommendations" in data
        assert "metadata" in data
        assert data["metadata"]["strategy"] == "popular"
