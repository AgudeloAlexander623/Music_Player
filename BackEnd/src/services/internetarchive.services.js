import axios from "axios";
import logger from "../utils/logger.js";

const SEARCH_URL = "https://archive.org/advancedsearch.php";
const METADATA_URL = "https://archive.org/metadata";
const IMAGE_URL = "https://archive.org/services/img";
const HEALTH_URL = "https://archive.org";

const SEARCH_TIMEOUT = 10000;
const METADATA_TIMEOUT = 8000;
const HEALTH_TIMEOUT = 5000;
const MAX_RESULTS = 30;
const MAX_FILES_PER_ITEM = 5;

const AUDIO_FORMATS = new Set(["MP3", "OGG", "VBR MP3"]);

class InternetArchiveError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "InternetArchiveError";
    this.statusCode = statusCode;
  }
}

function escapeQuery(query) {
  return query
    .replace(/[!"()*:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTitleFromFilename(filename) {
  let name = filename.replace(/\.(mp3|ogg|wav|flac|m4a)$/i, "");

  name = name
    .replace(/^Disc\s*\d+\s*[-–—]\s*\d+\s*[-–—]\s*/, "")
    .replace(/^Disc\s*\d+\s*[-–—]\s*/, "")
    .replace(/^Track\s*\d+\s*[-–—]\s*/, "")
    .replace(/^\d+[-–—]\s*/, "")
    .replace(/[/_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!name || name.length < 2) return "Unknown Track";
  return name;
}

function extractArtist(item) {
  if (item.creator) {
    const creators = Array.isArray(item.creator) ? item.creator : [item.creator];
    const filtered = creators.filter(
      (c) => !/(^www\.|archive\.org|spotify|itunes)/i.test(c)
    );
    return filtered.length > 0 ? filtered.join(", ") : "Unknown Artist";
  }
  return "Unknown Artist";
}

function buildTrackFromFile(item, fileName, fileMeta) {
  const fileHash = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  const itemHash = item.identifier.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const trackId = `ia_${itemHash}_${fileHash}`;

  const license = Array.isArray(item.licenseurl)
    ? item.licenseurl[0]
    : item.licenseurl || null;

  return {
    id: trackId,
    name: parseTitleFromFilename(fileName),
    artist: extractArtist(item),
    album: item.title?.trim() || "Unknown Album",
    albumImage: `${IMAGE_URL}/${item.identifier}`,
    previewUrl: `https://archive.org/download/${item.identifier}/${encodeURIComponent(fileName)}`,
    source: "internetarchive",
    duration: fileMeta?.length ? Math.round(parseFloat(fileMeta.length)) : null,
    license,
  };
}

async function fetchItemMetadata(identifier) {
  try {
    const res = await axios.get(`${METADATA_URL}/${encodeURIComponent(identifier)}`, {
      timeout: METADATA_TIMEOUT,
    });
    return res.data;
  } catch {
    return null;
  }
}

function isAudioFile(file) {
  if (!file?.name) return false;
  if (file.source === "original") return false;

  if (AUDIO_FORMATS.has(file.format)) return true;

  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "mp3" || ext === "ogg";
}

async function checkConnectivity() {
  try {
    await axios.get(HEALTH_URL, { timeout: HEALTH_TIMEOUT });
    return true;
  } catch {
    return false;
  }
}

export async function searchInternetArchive(query, limit = 10, page = 1) {
  const searchLimit = Math.min(limit, MAX_RESULTS);
  const safeQuery = escapeQuery(query);

  if (!safeQuery || safeQuery.length < 2) {
    logger.warn("[Internet Archive] Query vacía después de sanitizar");
    return [];
  }

  try {
    logger.info(
      `[Internet Archive] Buscando: "${safeQuery}" (page ${page}, limit ${searchLimit})`
    );

    const searchRes = await axios.get(SEARCH_URL, {
      params: {
        q: `(${safeQuery}) AND subject:music`,
        fl: ["identifier", "title", "creator", "description", "downloads", "licenseurl"],
        sort: ["downloads desc"],
        rows: searchLimit,
        page,
        output: "json",
      },
      timeout: SEARCH_TIMEOUT,
    });

    const items = searchRes.data?.response?.docs ?? [];

    if (!items.length) {
      logger.info("[Internet Archive] Sin resultados");
      return [];
    }

    logger.info(
      `[Internet Archive] ${items.length} items encontrados, obteniendo metadatos...`
    );

    const metadataList = await Promise.allSettled(
      items.map((item) => fetchItemMetadata(item.identifier))
    );

    const tracks = [];

    for (let i = 0; i < items.length && tracks.length < searchLimit; i++) {
      const item = items[i];
      const metaResult = metadataList[i];

      if (metaResult.status !== "fulfilled" || !metaResult.value?.files) continue;

      const audioFiles = metaResult.value.files
        .filter(isAudioFile)
        .slice(0, MAX_FILES_PER_ITEM);

      for (const fileMeta of audioFiles) {
        if (tracks.length >= searchLimit) break;
        tracks.push(buildTrackFromFile(item, fileMeta.name, fileMeta));
      }
    }

    logger.info(`[Internet Archive] ${tracks.length} tracks generados`);
    return tracks;
  } catch (error) {
    if (error instanceof InternetArchiveError) throw error;
    logger.error("[Internet Archive] Error en busqueda", {
      error: error.message,
    });
    throw new InternetArchiveError(
      `Internet Archive search failed: ${error.message}`,
      500
    );
  }
}

export { checkConnectivity as isInternetArchiveReachable };
