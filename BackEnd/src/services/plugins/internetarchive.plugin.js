/**
 * PLUGIN DE INTERNET ARCHIVE
 *
 * Busca música en Internet Archive (archive.org), un repositorio digital
 * gratuito con millones de archivos de audio de dominio público y
 * licencias Creative Commons.
 *
 * No requiere API key ni configuración adicional — la API pública de
 * Internet Archive no necesita autenticación para búsqueda y descarga
 * de metadatos.
 *
 * CARACTERÍSTICAS:
 *   - Sin API key (funciona out of the box)
 *   - Catálogo masivo de música libre y dominio público
 *   - Los tracks se obtienen del metadata de cada ítem
 *   - Los previewUrl son archivos de audio completos (no previews)
 *   - Disponibilidad verificada mediante health check al inicio
 */

import { searchInternetArchive, isInternetArchiveReachable } from "../internetarchive.services.js";

let _available = true;

isInternetArchiveReachable().then((reachable) => {
  _available = reachable;
});

export default {
  name: "internetarchive",
  description:
    "Internet Archive — Música de dominio público y Creative Commons (sin API key).",
  requiredEnv: [],
  isAvailable() {
    return _available;
  },
  search(query, { limit = 10, page = 1 } = {}) {
    return searchInternetArchive(query, limit, page);
  },
};
