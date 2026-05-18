import axios from "axios";

class PythonServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "PythonServiceError";
    this.statusCode = statusCode;
  }
}

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function getRecommendations(userId, limit = 10) {
  try {
    const res = await axios.post(
      `${PYTHON_SERVICE_URL}/recommend`,
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

export async function checkPythonServiceHealth() {
  try {
    const res = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 3000 });
    return res.data.status === "ok";
  } catch {
    return false;
  }
}
