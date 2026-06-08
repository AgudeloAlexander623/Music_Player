"""In-memory music catalog and similarity data for the recommendation engine.

This module is the single source of truth for all tracks the system knows
about.  It also defines artist similarity mappings (who sounds like whom)
and genre clusters (which genres are related) so the recommendation engine
can make reasonable suggestions even when there's no direct match.

The catalog is deliberately small — ~60 tracks across 9 genres — enough to
demonstrate the recommendation logic without needing an external database.
"""

CATALOG = [
    # ── Rock ──
    {"id": "cat_001", "name": "Bohemian Rhapsody", "artist": "Queen", "album": "A Night at the Opera", "genre": "rock"},
    {"id": "cat_002", "name": "Under Pressure", "artist": "Queen", "album": "Hot Space", "genre": "rock"},
    {"id": "cat_003", "name": "Don't Stop Me Now", "artist": "Queen", "album": "Jazz", "genre": "rock"},
    {"id": "cat_004", "name": "Stairway to Heaven", "artist": "Led Zeppelin", "album": "Led Zeppelin IV", "genre": "rock"},
    {"id": "cat_005", "name": "Whole Lotta Love", "artist": "Led Zeppelin", "album": "Led Zeppelin II", "genre": "rock"},
    {"id": "cat_006", "name": "Hotel California", "artist": "Eagles", "album": "Hotel California", "genre": "rock"},
    {"id": "cat_007", "name": "Comfortably Numb", "artist": "Pink Floyd", "album": "The Wall", "genre": "rock"},
    {"id": "cat_008", "name": "Smells Like Teen Spirit", "artist": "Nirvana", "album": "Nevermind", "genre": "rock"},
    {"id": "cat_009", "name": "Welcome to the Jungle", "artist": "Guns N' Roses", "album": "Appetite for Destruction", "genre": "rock"},
    {"id": "cat_010", "name": "Back in Black", "artist": "AC/DC", "album": "Back in Black", "genre": "rock"},

    # ── Pop ──
    {"id": "cat_011", "name": "Thriller", "artist": "Michael Jackson", "album": "Thriller", "genre": "pop"},
    {"id": "cat_012", "name": "Billie Jean", "artist": "Michael Jackson", "album": "Thriller", "genre": "pop"},
    {"id": "cat_013", "name": "Beat It", "artist": "Michael Jackson", "album": "Thriller", "genre": "pop"},
    {"id": "cat_014", "name": "Shape of You", "artist": "Ed Sheeran", "album": "Divide", "genre": "pop"},
    {"id": "cat_015", "name": "Blinding Lights", "artist": "The Weeknd", "album": "After Hours", "genre": "pop"},
    {"id": "cat_016", "name": "Levitating", "artist": "Dua Lipa", "album": "Future Nostalgia", "genre": "pop"},
    {"id": "cat_017", "name": "bad guy", "artist": "Billie Eilish", "album": "When We All Fall Asleep...", "genre": "pop"},
    {"id": "cat_018", "name": "Rolling in the Deep", "artist": "Adele", "album": "21", "genre": "pop"},
    {"id": "cat_019", "name": "Happy", "artist": "Pharrell Williams", "album": "G I R L", "genre": "pop"},
    {"id": "cat_020", "name": "Shake It Off", "artist": "Taylor Swift", "album": "1989", "genre": "pop"},

    # ── Electrónica ──
    {"id": "cat_021", "name": "Around the World", "artist": "Daft Punk", "album": "Homework", "genre": "electronic"},
    {"id": "cat_022", "name": "One More Time", "artist": "Daft Punk", "album": "Discovery", "genre": "electronic"},
    {"id": "cat_023", "name": "Get Lucky", "artist": "Daft Punk", "album": "Random Access Memories", "genre": "electronic"},
    {"id": "cat_024", "name": "Strobe", "artist": "Deadmau5", "album": "For Lack of a Better Name", "genre": "electronic"},
    {"id": "cat_025", "name": "Levels", "artist": "Avicii", "album": "True", "genre": "electronic"},
    {"id": "cat_026", "name": "Scary Monsters and Nice Sprites", "artist": "Skrillex", "album": "Scary Monsters and Nice Sprites", "genre": "electronic"},
    {"id": "cat_027", "name": "Midnight City", "artist": "M83", "album": "Hurry Up, We're Dreaming", "genre": "electronic"},
    {"id": "cat_028", "name": "Feel Good Inc.", "artist": "Gorillaz", "album": "Demon Days", "genre": "electronic"},
    {"id": "cat_029", "name": "The Less I Know the Better", "artist": "Tame Impala", "album": "Currents", "genre": "electronic"},
    {"id": "cat_030", "name": "Let It Happen", "artist": "Tame Impala", "album": "Currents", "genre": "electronic"},

    # ── Reggaeton / Latin ──
    {"id": "cat_031", "name": "Dákiti", "artist": "Bad Bunny", "album": "El Último Tour Del Mundo", "genre": "reggaeton"},
    {"id": "cat_032", "name": "Tití Me Preguntó", "artist": "Bad Bunny", "album": "Un Verano Sin Ti", "genre": "reggaeton"},
    {"id": "cat_033", "name": "Safaera", "artist": "Bad Bunny", "album": "YHLQMDLG", "genre": "reggaeton"},
    {"id": "cat_034", "name": "Despacito", "artist": "Luis Fonsi", "album": "Vida", "genre": "reggaeton"},
    {"id": "cat_035", "name": "Mi Gente", "artist": "J Balvin", "album": "Vibras", "genre": "reggaeton"},
    {"id": "cat_036", "name": "Tusa", "artist": "Karol G", "album": "KG0516", "genre": "reggaeton"},
    {"id": "cat_037", "name": "Bichota", "artist": "Karol G", "album": "KG0516", "genre": "reggaeton"},
    {"id": "cat_038", "name": "PROVENZA", "artist": "Karol G", "album": "Mañana Será Bonito", "genre": "reggaeton"},
    {"id": "cat_039", "name": "La Tortura", "artist": "Shakira", "album": "Fijación Oral Vol. 1", "genre": "reggaeton"},
    {"id": "cat_040", "name": "DESPECHÁ", "artist": "Rosalía", "album": "MOTOMAMI", "genre": "reggaeton"},

    # ── R&B / Soul ──
    {"id": "cat_041", "name": "Blame It", "artist": "Jamie Foxx", "album": "Intuition", "genre": "rnb"},
    {"id": "cat_042", "name": "Adorn", "artist": "Miguel", "album": "Kaleidoscope Dream", "genre": "rnb"},
    {"id": "cat_043", "name": "P.Y.T.", "artist": "Michael Jackson", "album": "Thriller", "genre": "rnb"},
    {"id": "cat_044", "name": "24K Magic", "artist": "Bruno Mars", "album": "24K Magic", "genre": "rnb"},

    # ── Hip-Hop ──
    {"id": "cat_045", "name": "HUMBLE.", "artist": "Kendrick Lamar", "album": "DAMN.", "genre": "hiphop"},
    {"id": "cat_046", "name": "God's Plan", "artist": "Drake", "album": "Scorpion", "genre": "hiphop"},
    {"id": "cat_047", "name": "Sicko Mode", "artist": "Travis Scott", "album": "Astroworld", "genre": "hiphop"},
    {"id": "cat_048", "name": "Lose Yourself", "artist": "Eminem", "album": "8 Mile Soundtrack", "genre": "hiphop"},

    # ── Jazz ──
    {"id": "cat_049", "name": "Take Five", "artist": "Dave Brubeck", "album": "Time Out", "genre": "jazz"},
    {"id": "cat_050", "name": "So What", "artist": "Miles Davis", "album": "Kind of Blue", "genre": "jazz"},
    {"id": "cat_051", "name": "Feeling Good", "artist": "Nina Simone", "album": "I Put a Spell on You", "genre": "jazz"},
    {"id": "cat_052", "name": "Fly Me to the Moon", "artist": "Frank Sinatra", "album": "It Might as Well Be Swing", "genre": "jazz"},

    # ── Clásica ──
    {"id": "cat_053", "name": "Clair de Lune", "artist": "Claude Debussy", "album": "Suite Bergamasque", "genre": "classical"},
    {"id": "cat_054", "name": "The Four Seasons - Spring", "artist": "Antonio Vivaldi", "album": "The Four Seasons", "genre": "classical"},
    {"id": "cat_055", "name": "Symphony No. 5", "artist": "Ludwig van Beethoven", "album": "Symphony No. 5", "genre": "classical"},
    {"id": "cat_056", "name": "Nocturne Op. 9 No. 2", "artist": "Frédéric Chopin", "album": "Nocturnes", "genre": "classical"},

    # ── Indie ──
    {"id": "cat_057", "name": "Dog Days Are Over", "artist": "Florence + The Machine", "album": "Lungs", "genre": "indie"},
    {"id": "cat_058", "name": "Holocene", "artist": "Bon Iver", "album": "Bon Iver", "genre": "indie"},
    {"id": "cat_059", "name": "Electric Feel", "artist": "MGMT", "album": "Oracular Spectacular", "genre": "indie"},
    {"id": "cat_060", "name": "Tongue Tied", "artist": "Grouplove", "album": "Never Trust a Happy Song", "genre": "indie"},
]

ARTIST_SIMILARITY = {
    "queen": ["led zeppelin", "pink floyd", "eagles"],
    "led zeppelin": ["queen", "pink floyd", "acdc", "guns n roses"],
    "pink floyd": ["queen", "led zeppelin", "nirvana"],
    "nirvana": ["pearl jam", "soundgarden", "guns n roses"],
    "guns n roses": ["acdc", "nirvana", "led zeppelin"],
    "acdc": ["guns n roses", "led zeppelin", "queen"],
    "eagles": ["queen", "pink floyd", "led zeppelin"],
    "michael jackson": ["the weeknd", "bruno mars", "dua lipa"],
    "the weeknd": ["michael jackson", "dua lipa", "billie eilish"],
    "dua lipa": ["the weeknd", "billie eilish", "taylor swift"],
    "billie eilish": ["adele", "dua lipa", "the weeknd"],
    "adele": ["billie eilish", "taylor swift", "amy winehouse"],
    "taylor swift": ["ed sheeran", "adele", "pharrell williams"],
    "ed sheeran": ["taylor swift", "pharrell williams", "bruno mars"],
    "pharrell williams": ["ed sheeran", "bruno mars", "daft punk"],
    "bruno mars": ["michael jackson", "pharrell williams", "the weeknd"],
    "daft punk": ["deadmau5", "gorillaz", "tame impala"],
    "deadmau5": ["daft punk", "avicii", "skrillex"],
    "avicii": ["deadmau5", "skrillex", "daft punk"],
    "skrillex": ["deadmau5", "avicii", "gorillaz"],
    "gorillaz": ["daft punk", "tame impala", "mgmt"],
    "tame impala": ["daft punk", "gorillaz", "mgmt"],
    "mgmt": ["tame impala", "gorillaz", "grouplove"],
    "bad bunny": ["j balvin", "karol g", "rosalia", "luis fonsi"],
    "j balvin": ["bad bunny", "karol g", "luis fonsi"],
    "karol g": ["bad bunny", "j balvin", "shakira", "rosalia"],
    "shakira": ["karol g", "rosalia", "luis fonsi"],
    "rosalia": ["bad bunny", "karol g", "shakira"],
    "luis fonsi": ["bad bunny", "shakira", "j balvin"],
    "kendrick lamar": ["drake", "travis scott", "eminem"],
    "drake": ["kendrick lamar", "travis scott", "the weeknd"],
    "travis scott": ["kendrick lamar", "drake", "eminem"],
    "eminem": ["kendrick lamar", "drake", "travis scott"],
    "dave brubeck": ["miles davis", "nina simone", "frank sinatra"],
    "miles davis": ["dave brubeck", "nina simone", "john coltrane"],
    "nina simone": ["miles davis", "frank sinatra", "adele"],
    "frank sinatra": ["nina simone", "michael buble", "dean martin"],
    "claude debussy": ["vivaldi", "beethoven", "chopin"],
    "vivaldi": ["debussy", "beethoven", "chopin"],
    "beethoven": ["debussy", "vivaldi", "chopin"],
    "chopin": ["debussy", "vivaldi", "beethoven"],
    "florence + the machine": ["bon iver", "mgmt", "grouplove"],
    "bon iver": ["florence + the machine", "mgmt", "grouplove"],
    "grouplove": ["mgmt", "florence + the machine", "bon iver"],
    "m83": ["daft punk", "gorillaz", "tame impala"],
    "miguel": ["bruno mars", "the weeknd", "frank ocean"],
    "jamie foxx": ["bruno mars", "miguel", "usher"],
}

GENRE_CLUSTERS = {
    "rock": ["rock", "indie", "alternative"],
    "pop": ["pop", "rnb", "indie"],
    "electronic": ["electronic", "edm", "house", "techno"],
    "reggaeton": ["reggaeton", "latin", "trap", "dancehall"],
    "rnb": ["rnb", "pop", "soul", "hiphop"],
    "hiphop": ["hiphop", "rnb", "trap", "reggaeton"],
    "jazz": ["jazz", "soul", "classical", "blues"],
    "classical": ["classical", "jazz", "orchestral"],
    "indie": ["indie", "rock", "electronic", "alternative"],
}
