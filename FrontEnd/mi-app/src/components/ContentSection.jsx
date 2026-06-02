import './ContentSection.css';

export default function ContentSection({ title, items, badge, onFilter, filterValue, hasNavigation = true, onPlay }) {
  const scrollLeft = (e) => {
    const container = e.currentTarget.nextElementSibling;
    container.scrollBy({ left: -400, behavior: 'smooth' });
  };

  const scrollRight = (e) => {
    const container = e.currentTarget.nextElementSibling;
    container.scrollBy({ left: 400, behavior: 'smooth' });
  };

  return (
    <div className="content-section">
      <div className="section-header">
        <div className="section-title-container">
          <h2 className="section-title">{title}</h2>
          {badge && <span className="section-badge">{badge}</span>}
        </div>
        
        {onFilter && (
          <div className="filter-controls">
            <input
              type="text"
              placeholder={`Filter ${title.toLowerCase()}...`}
              className="filter-input"
              value={filterValue}
              onChange={(e) => onFilter(e.target.value)}
            />
            <button className="filter-btn" aria-label="Filtrar">🔽</button>
          </div>
        )}

        {hasNavigation && (
          <div className="nav-buttons">
            <button className="nav-btn" onClick={scrollLeft} aria-label="Desplazar izquierda">‹</button>
            <button className="nav-btn" onClick={scrollRight} aria-label="Desplazar derecha">›</button>
          </div>
        )}
      </div>

      <div className="items-container">
        {items.map((item) => (
          <div key={item.id} className="item-card">
            <div className="item-image">
              <img src={item.image || 'https://via.placeholder.com/180'} alt={item.name} />
              <div className="item-overlay">
                <button className="play-btn" onClick={() => onPlay?.(item)} aria-label={`Reproducir ${item.name}`}>▶</button>
              </div>
            </div>
            <div className="item-info">
              <h3 className="item-name">{item.name}</h3>
              {item.subtitle && <p className="item-subtitle">{item.subtitle}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
