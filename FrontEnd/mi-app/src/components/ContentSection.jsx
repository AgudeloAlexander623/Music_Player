import './ContentSection.css';

export default function ContentSection({ title, items, badge, onFilter, filterValue, onPlay }) {
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
          </div>
        )}
      </div>

      <div className="playlist-grid">
        {items.map((item) => (
          <div key={item.id} className="card" onClick={() => onPlay?.(item)}>
            <div className="card-image">
              <img src={item.image || 'https://via.placeholder.com/180'} alt={item.name} />
              <div className="card-overlay">
                <button className="card-play-btn" onClick={(e) => { e.stopPropagation(); onPlay?.(item); }} aria-label={`Reproducir ${item.name}`}>▶</button>
              </div>
            </div>
            <div className="card-info">
              <h3 className="card-name">{item.name}</h3>
              {item.subtitle && <p className="card-subtitle">{item.subtitle}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
