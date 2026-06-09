/**
 * SERVICIO DE INTERNET ARCHIVE
 *
 * Busca música en el catálogo de Internet Archive usando su Advanced
 * Search API. No requiere API key ni autenticación.
 *
 * ESTRATEGIA:
 *   1. Busca ítems musicales con subject:music y el término del usuario
 *   2. Para cada ítem, obtiene sus metadatos y extrae los archivos de
 *      audio (MP3, OGG)
 *   3. Retorna cada archivo de audio como un track individual
 *
 * LÍMITES:
 *   - 1 petición de búsqueda + hasta N de metadatos (una por resultado)
 *   - Timeout: 8s por petición
 *   - Máximo 20 resultados por búsqueda
 *   - Máximo 3 archivos de audio por ítem
 */

import axios from "axios";
import logger from "../utils/logger.js";

const SEARCH_URL = "https://archive.org/advancedsearch.php";
const METADATA_URL = "https://archive.org/metadata";
const IMAGE_URL = "https://archive.org/services/img";

const SEARCH_TIMEOUT = 8000;
const METADATA_TIMEOUT = 8000;
const MAX_RESULTS = 20;
const MAX_FILES_PER_ITEM = 3;

const AUDIO_FORMATS = new Set(["MP3", "OGG", "VBR MP3"]);

class InternetArchiveError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "InternetArchiveError";
    this.statusCode = statusCode;
  }
}

function buildTrackFromFile(item, fileName, fileMeta) {
  const fileHash = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  const itemHash = item.identifier.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const trackId = `ia_${itemHash}_${fileHash}`;

  const artist = Array.isArray(item.creator)
    ? item.creator.join(", ")
    : item.creator || "Unknown";

  const trackTitle = fileName
    .replace(/\.(mp3|ogg|wav|flac)$/i, "")
    .replace(/^Disc\s+\d+\/\s*\d+\s*-\s*/, "")
    .replace(/[/_]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Unknown Track";

  return {
    id: trackId,
    name: trackTitle,
    artist,
    album: item.title || "",
    albumImage: `${IMAGE_URL}/${item.identifier}`,
    previewUrl: `https://archive.org/download/${item.identifier}/${encodeURIComponent(fileName)}`,
    source: "internetarchive",
    duration: fileMeta?.length ? Math.round(parseFloat(fileMeta.length)) : null,
    license: null,
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

export async function searchInternetArchive(query, limit = 10, page = 1) {
  const searchLimit = Math.min(limit, MAX_RESULTS);

  try {
    logger.info(`[Internet Archive] Buscando: "${query}" (page ${page}, limit ${searchLimit})`);

    const searchRes = await axios.get(SEARCH_URL, {
      params: {
        q: `(${query}) AND subject:music`,
        fl: ["identifier", "title", "creator", "description", "downloads"],
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

    logger.info(`[Internet Archive] ${items.length} ítems encontrados, obteniendo metadatos...`);

    const metadataList = await Promise.allSettled(
      items.map((item) => fetchItemMetadata(item.identifier))
    );

    const tracks = [];

    for (let i = 0; i < items.length && tracks.length < searchLimit; i++) {
      const item = items[i];
      const metaResult = metadataList[i];

      if (metaResult.status !== "fulfilled" || !metaResult.value?.files) continue;

      const audioFiles = metaResult.value.files.filter(isAudioFile).slice(0, MAX_FILES_PER_ITEM);

      for (const fileMeta of audioFiles) {
        if (tracks.length >= searchLimit) break;
        tracks.push(buildTrackFromFile(item, fileMeta.name, fileMeta));
      }
    }

    logger.info(`[Internet Archive] ${tracks.length} tracks generados`);
    return tracks;
  } catch (error) {
    if (error instanceof InternetArchiveError) throw error;
    logger.error("[Internet Archive] Error", { error: error.message });
    throw new InternetArchiveError(
      `Internet Archive search failed: ${error.message}`,
      500
    );
  }
}
