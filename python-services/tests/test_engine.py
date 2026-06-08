"""Tests for the recommendation engine functions (pure logic, no HTTP)."""

import pytest
from main import (
    normalize,
    tokenize,
    get_genre_cluster,
    score_track,
    _infer_genre,
    build_track_dict,
    get_recommendations,
    _popular_recommendations,
    get_genres,
    TrackInput,
)


# ── normalize ──

class TestNormalize:
    def test_lowercases_and_strips(self):
        assert normalize("  Hello World!  ") == "hello world"

    def test_removes_punctuation(self):
        assert normalize("Bohemian Rhapsody!!!") == "bohemian rhapsody"

    def test_keeps_numbers(self):
        assert normalize("Song 123") == "song 123"

    def test_handles_empty_string(self):
        assert normalize("") == ""

    def test_handles_unicode_accents(self):
        result = normalize("Dákiti")
        # Verify accented characters are removed (non-ASCII stripped)
        assert result.isascii()


# ── tokenize ──

class TestTokenize:
    def test_splits_into_words(self):
        assert tokenize("Bohemian Rhapsody") == {"bohemian", "rhapsody"}

    def test_deduplicates(self):
        assert tokenize("la la la") == {"la"}

    def test_handles_multiple_spaces(self):
        assert tokenize("  hello   world  ") == {"hello", "world"}

    def test_empty_string(self):
        assert tokenize("") == set()


# ── get_genre_cluster ──

class TestGenreCluster:
    def test_returns_empty_for_none(self):
        assert get_genre_cluster(None) == set()

    def test_returns_empty_for_empty_string(self):
        assert get_genre_cluster("") == set()

    def test_expands_known_genre(self):
        cluster = get_genre_cluster("rock")
        assert "rock" in cluster
        assert "indie" in cluster
        assert "alternative" in cluster

    def test_captures_variant(self):
        cluster = get_genre_cluster("indie")
        assert "rock" in cluster

    def test_falls_back_to_singleton(self):
        assert get_genre_cluster("unknown") == {"unknown"}


# ── _infer_genre ──

class TestInferGenre:
    def test_infers_from_exact_artist(self):
        assert _infer_genre("Queen") == "rock"

    def test_returns_none_for_unknown_artist(self):
        assert _infer_genre("NonExistent") is None

    def test_returns_none_for_none(self):
        assert _infer_genre(None) is None

    def test_case_insensitive(self):
        assert _infer_genre("queen") == "rock"


# ── build_track_dict ──

class TestBuildTrackDict:
    def test_includes_all_keys(self):
        track = {"id": "x", "name": "n", "artist": "a", "album": "b", "genre": "g"}
        result = build_track_dict(track, "test reason")
        assert result["id"] == "x"
        assert result["name"] == "n"
        assert result["artist"] == "a"
        assert result["album"] == "b"
        assert result["reason"] == "test reason"
        assert result["source"] == "recommendation"
        assert result["albumImage"] is not None

    def test_album_image_is_formatted(self):
        track = {"id": "x", "name": "Bohemian", "artist": "Queen", "album": "b", "genre": "g"}
        result = build_track_dict(track, "")
        # Uses first character of artist and name as placeholder text
        assert "text=QB" in result["albumImage"]


# ── score_track ──

class TestScoreTrack:
    def setup_method(self):
        self.catalog_track = {
            "id": "1", "name": "Bohemian Rhapsody",
            "artist": "Queen", "album": "A Night at the Opera", "genre": "rock",
        }

    def test_zero_when_no_input(self):
        inp = TrackInput(artist="", name="")
        assert score_track(inp, self.catalog_track) == 0.0

    def test_high_score_for_exact_artist_and_name(self):
        inp = TrackInput(artist="Queen", name="Bohemian Rhapsody")
        assert score_track(inp, self.catalog_track) >= 10.0

    def test_score_for_artist_only(self):
        inp = TrackInput(artist="Queen")
        assert score_track(inp, self.catalog_track) >= 5.0

    def score_for_similar_artist(self):
        inp = TrackInput(artist="Led Zeppelin")
        track = {"id": "2", "name": "Under Pressure", "artist": "Queen", "album": "", "genre": "rock"}
        assert score_track(inp, track) >= 5.0

    def test_partial_name_match_adds_points(self):
        inp = TrackInput(artist="Queen", name="Rhapsody")
        assert score_track(inp, self.catalog_track) >= 10.0

    def test_genre_cluster_boost(self):
        inp = TrackInput(artist="Queen", genre="indie")
        assert score_track(inp, self.catalog_track) >= 4.0

    def test_input_weight_scales_score(self):
        inp = TrackInput(artist="Queen", name="Bohemian Rhapsody")
        base = score_track(inp, self.catalog_track, input_weight=1.0)
        scaled = score_track(inp, self.catalog_track, input_weight=2.0)
        assert scaled == pytest.approx(base * 2.0)


# ── get_recommendations ──

class TestRecommendations:
    def test_returns_popular_when_no_input(self):
        recs, meta = get_recommendations([], count=3)
        assert meta["strategy"] == "popular"
        assert len(recs) == 3

    def test_content_based_strategy(self):
        inp = TrackInput(artist="Queen", name="Bohemian Rhapsody")
        recs, meta = get_recommendations([inp], count=5)
        assert meta["strategy"] == "content-based"
        assert len(recs) <= 5

    def test_excludes_input_tracks(self):
        inp = TrackInput(artist="Queen", name="Bohemian Rhapsody")
        recs, _ = get_recommendations([inp], count=50)
        for r in recs:
            assert not (r["name"] == "Bohemian Rhapsody" and r["artist"] == "Queen")

    def test_clamps_count_to_max_50(self):
        recs, meta = get_recommendations([], count=100)
        assert len(recs) <= 50

    def test_clamps_count_to_min_1(self):
        recs, meta = get_recommendations([], count=0)
        assert len(recs) == 10  # falls back to default

    def test_fills_remaining_slots_with_popular(self):
        """When there aren't enough scored candidates, fill with popular tracks."""
        inp = TrackInput(artist="Queen", name="Bohemian Rhapsody")
        recs, _ = get_recommendations([inp], count=50)
        assert len(recs) == 50

    def test_metadata_contains_strategy_and_timing(self):
        recs, meta = get_recommendations([TrackInput(artist="Queen")])
        assert "strategy" in meta
        assert "processing_time_ms" in meta
        assert "catalog_size" in meta
        assert "candidates_evaluated" in meta
        assert meta["catalog_size"] == len(get_genres()) * 0 + 60  # we know there are 60 tracks

    def test_all_recommendations_have_reason(self):
        inp = TrackInput(artist="Queen")
        recs, _ = get_recommendations([inp], count=10)
        assert all(r["reason"] for r in recs)


# ── _popular_recommendations ──

class TestPopularRecommendations:
    def test_returns_exact_count(self):
        recs = _popular_recommendations(4)
        assert len(recs) == 4

    def test_returns_correct_structure(self):
        recs = _popular_recommendations(1)
        item = recs[0]
        assert "id" in item
        assert "name" in item
        assert "reason" in item
        assert item["reason"] == "Popular track"

    def test_returns_different_results_on_consecutive_calls(self):
        """Two consecutive calls should return shuffled results (random)."""
        first = _popular_recommendations(60)
        second = _popular_recommendations(60)
        ids_first = [t["id"] for t in first]
        ids_second = [t["id"] for t in second]
        assert ids_first != ids_second


# ── get_genres ──

class TestGetGenres:
    def test_returns_all_genres(self):
        genres = get_genres()
        assert len(genres) > 0
        assert all("name" in g and "count" in g for g in genres)

    def test_sorted_by_count_descending(self):
        genres = get_genres()
        for i in range(len(genres) - 1):
            assert genres[i]["count"] >= genres[i + 1]["count"]

    def test_rock_is_most_frequent(self):
        genres = get_genres()
        assert genres[0]["name"] == "rock"
