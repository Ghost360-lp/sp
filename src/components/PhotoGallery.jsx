import { useState, useMemo, useRef, useEffect } from "react";
import "./photo-gallery.css";

const ALL_PHOTOS = [
    { id: "", caption: "", date: "", group: "", aspect: ""},
];

const ALL_GROUPS = ["All", ...Array.from(new Set(ALL_PHOTOS.map((p) => p.group)))];

function Lightbox({ photo, allFlat, onClose, onNav }) {
  const idx   = allFlat.findIndex((p) => p.id === photo.id);
  const hasPrev = idx > 0;
  const hasNext = idx < allFlat.length - 1;

  return (
    <div className="pg-lightbox">
      <div className="pg-lightbox__topbar">
        <button className="pg-lightbox__close" onClick={onClose} title="Close (Esc)">✕</button>
        <div className="pg-lightbox__info">
          <div className="pg-lightbox__caption">{photo.caption}</div>
          <div className="pg-lightbox__date">{photo.date}</div>
        </div>
        <div className="pg-lightbox__nav">
          <button
            className="pg-lightbox__arrow"
            onClick={() => onNav(allFlat[idx - 1])}
            disabled={!hasPrev}
            title="Previous"
          >‹</button>
          <button
            className="pg-lightbox__arrow"
            onClick={() => onNav(allFlat[idx + 1])}
            disabled={!hasNext}
            title="Next"
          >›</button>
        </div>
      </div>
      <div className="pg-lightbox__stage">
        <iframe
          className="pg-lightbox__iframe"
          src={`https://drive.google.com/file/d/${photo.id}/preview`}
          title={photo.caption}
          allow="autoplay"
        />
      </div>
    </div>
  );
}

/* ── PhotoTile with lazy loading ── */
function PhotoTile({ photo, onClick, toggleFav, favs }) {
  const [src, setSrc] = useState(null);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSrc(`https://drive.google.com/file/d/${photo.id}/preview`);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [photo.id]);

  return (
    <div
      ref={ref}
      className="pg-tile"
      onClick={onClick}
    >
      {src && (
        <iframe
          className={`pg-tile__iframe pg-tile__iframe--${photo.aspect}`}
          src={src}
          title={photo.caption}
          allow="autoplay"
        />
      )}

      {/* Click interceptor */}
      <div className="pg-tile__hit" />

      {/* Hover overlay */}
      <div className="pg-tile__overlay">
        <div className="pg-tile__caption">{photo.caption}</div>
        <div className="pg-tile__date">{photo.date}</div>
      </div>

      {/* Fav button */}
      <button
        className={`pg-tile__fav${favs.has(photo.id) ? " pg-tile__fav--active" : ""}`}
        onClick={(e) => toggleFav(e, photo.id)}
        title={favs.has(photo.id) ? "Unfavourite" : "Favourite"}
      >
        {favs.has(photo.id) ? "❤️" : "🤍"}
      </button>
    </div>
  );
}

/* ── Main component ── */
export default function PhotoGallery({ onBack }) {
  const [activeFilter] = useState("All");
  const [search,       setSearch]       = useState("");
  const [favs,         setFavs]         = useState(new Set());
  const [lightbox,     setLightbox]     = useState(null);

  // Filter + search
  const filtered = useMemo(() => {
    return ALL_PHOTOS.filter((p) => {
      const matchGroup = activeFilter === "All" || p.group === activeFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.caption.toLowerCase().includes(q) ||
        p.date.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [activeFilter, search]);

  // Group the filtered list
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((p) => {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group).push(p);
    });
    return Array.from(map.entries()); // [[groupName, [photos]], ...]
  }, [filtered]);

  const toggleFav = (e, id) => {
    e.stopPropagation();
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Keyboard nav
  const handleKeyDown = (e) => {
    if (!lightbox) return;
    const idx = filtered.findIndex((p) => p.id === lightbox.id);
    if (e.key === "ArrowRight" && idx < filtered.length - 1) setLightbox(filtered[idx + 1]);
    if (e.key === "ArrowLeft"  && idx > 0)                   setLightbox(filtered[idx - 1]);
    if (e.key === "Escape")                                   setLightbox(null);
  };

  return (
    <div className="pg-page" onKeyDown={handleKeyDown} tabIndex={-1}>

      {/* ── NAV ── */}
      <nav className="pg-nav">
        <button className="pg-nav__back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Close
        </button>

        <span className="pg-nav__title">All Memories</span>

        <div className="pg-nav__search-wrap">
          <svg className="pg-nav__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="pg-nav__search"
            placeholder="Search memories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </nav>


      {/* ── CONTENT ── */}
      <div className="pg-content">
        {grouped.length === 0 ? (
          <div className="pg-empty">No memories found…</div>
        ) : (
          grouped.map(([groupName, photos]) => (
            <div key={groupName} className="pg-group">
              {/* Group header */}
              <div className="pg-group__header">
                <span className="pg-group__day">{groupName}</span>
                <span className="pg-group__month-year">
                  {photos[0].date.split(" ").slice(1).join(" ")}
                </span>
                <span className="pg-group__count">{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Masonry grid */}
              <div className="pg-grid">
                {photos.map((photo) => (
                  <PhotoTile key={photo.id} photo={photo} onClick={() => setLightbox(photo)} toggleFav={toggleFav} favs={favs} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <Lightbox
          photo={lightbox}
          allFlat={filtered}
          onClose={() => setLightbox(null)}
          onNav={setLightbox}
        />
      )}
    </div>
  );
}