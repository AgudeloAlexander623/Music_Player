import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound">
      <h1 className="notfound-title">404</h1>
      <p className="notfound-text">La página que buscas no existe.</p>
      <Link to="/" className="notfound-link">Volver al inicio</Link>
    </div>
  );
}
