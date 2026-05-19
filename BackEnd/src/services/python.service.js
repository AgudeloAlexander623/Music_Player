import axios from "axios";

/**
 * Error personalizado para fallos del servicio Python.
 * Permite diferenciar errores del microservicio de errores generales.
 */
class PythonServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "PythonServiceError";
    this.statusCode = statusCode;
  }
}

/**
 * Obtiene la URL base del servicio Python.
 * Se evalúa en cada llamada, no al cargar el módulo,
 * para asegurar que dotenv ya configuró las variables.
 *
 * @returns {string} URL del servicio Python
 */
function getPythonServiceUrl() {
  return process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
}

/**
 * Obtiene recomendaciones musicales para un usuario.
 *
 * @param {number} userId - ID del usuario
 * @param {number} limit - Cantidad máxima de recomendaciones
 * @returns {Promise<Array>} Lista de canciones recomendadas
 * @throws {PythonServiceError} Si el servicio no responde o falla
 */
export async function getRecommendations(userId, limit = 10) {
  try {
    const res = await axios.post(
      `${getPythonServiceUrl()}/recommend`,
      { user_id: userId, limit },
      { timeout: 10000 }
    );
    return res.data.recommendations || [];
  } catch (error) {
    if (error instanceof PythonServiceError) throw error;
    if (error.code === "ECONNREFUSED") {
      throw new PythonServiceError(
        "Python recommendation service is not running. Start it with: cd python-services && uvicorn main:app --reload",
        503
      );
    }
    throw new PythonServiceError(
      `Failed to get recommendations: ${error.message}`,
      500
    );
  }
}

/**
 * Verifica si el servicio Python está operativo.
 *
 * @returns {Promise<boolean>} true si el servicio responde correctamente
 */
export async function checkPythonServiceHealth() {
  try {
    const res = await axios.get(`${getPythonServiceUrl()}/health`, { timeout: 3000 });
    return res.data.status === "ok";
  } catch {
    return false;
  }
}
