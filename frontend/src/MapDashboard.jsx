import { useMemo, useState } from "react";
import "./MapDashboard.css";

const points = [
  { id: 1, x: 338, y: 265, state: "online", label: "Luminaria 01" },
  { id: 2, x: 560, y: 188, state: "online", label: "Luminaria 02" },
  { id: 3, x: 775, y: 315, state: "warning", label: "Luminaria 03" },
  { id: 4, x: 500, y: 443, state: "online", label: "Luminaria 04" },
  { id: 5, x: 880, y: 530, state: "offline", label: "Luminaria 05" },
  { id: 6, x: 260, y: 590, state: "online", label: "Luminaria 06" },
  { id: 7, x: 680, y: 660, state: "online", label: "Luminaria 07" },
];

const navigation = [
  { id: "inicio", label: "Inicio", icon: "home" },
  { id: "luminarias", label: "Luminarias", icon: "bulb" },
  { id: "mapa", label: "Mapa", icon: "map" },
  { id: "alertas", label: "Alertas", icon: "bell" },
  { id: "ajustes", label: "Ajustes", icon: "settings" },
];

function Icon({ name, size = 20 }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /><path d="M2 10 12 2l10 8" /></>,
    bulb: <><path d="M9 18h6M10 22h4" /><path d="M8 14a7 7 0 1 1 8 0c-.8.6-1 1.3-1 2H9c0-.7-.2-1.4-1-2Z" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-.9l-1.6.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.6.7a8 8 0 0 1 1.7-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.9Z" transform="translate(-2 -2)" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    locate: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function MapArtwork({ zoom, searchTerm, alertsOnly }) {
  const visiblePoints = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return points.filter((point) => {
      const matchesSearch = !normalizedSearch || point.label.toLowerCase().includes(normalizedSearch);
      const matchesAlerts = !alertsOnly || point.state !== "online";
      return matchesSearch && matchesAlerts;
    });
  }, [searchTerm, alertsOnly]);

  return (
    <div className="map-artwork" aria-label="Mapa esquemático de San Pelayo">
      <svg
        className="map-drawing"
        viewBox="0 0 1200 820"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Calles, manzanas y puntos de alumbrado"
        style={{ transform: `scale(${zoom})` }}
      >
        <defs>
          <pattern id="map-grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M42 0H0V42" fill="none" stroke="#dce4d8" strokeWidth="1" />
          </pattern>
          <filter id="pin-shadow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#142117" floodOpacity=".2" />
          </filter>
        </defs>
        <rect width="1200" height="820" fill="#e9eee6" />
        <rect width="1200" height="820" fill="url(#map-grid)" />

        <path d="M-100 130 1300 720" stroke="#d5ddd1" strokeWidth="106" />
        <path d="M-100 130 1300 720" stroke="#fbfcfa" strokeWidth="88" />
        <path d="M215 -90 700 910" stroke="#d5ddd1" strokeWidth="82" />
        <path d="M215 -90 700 910" stroke="#fbfcfa" strokeWidth="66" />
        <path d="M770 -100 430 910" stroke="#d5ddd1" strokeWidth="92" />
        <path d="M770 -100 430 910" stroke="#fbfcfa" strokeWidth="76" />
        <path d="M-80 465 1260 220" stroke="#d5ddd1" strokeWidth="76" />
        <path d="M-80 465 1260 220" stroke="#fbfcfa" strokeWidth="60" />
        <path d="M-80 680 1250 420" stroke="#d5ddd1" strokeWidth="70" />
        <path d="M-80 680 1250 420" stroke="#fbfcfa" strokeWidth="54" />

        <g fill="#d5e4ce" stroke="#c4d3bc" strokeWidth="2">
          <path d="M52 46 190 74 238 164 159 251 33 197Z" />
          <path d="M285 60 437 101 484 206 343 249 269 160Z" />
          <path d="M530 45 714 71 675 197 518 176Z" />
          <path d="M826 40 1010 90 956 210 780 174Z" />
          <path d="M1045 125 1195 169 1140 285 1000 250Z" />
          <path d="M48 300 170 275 249 375 205 454 57 480Z" />
          <path d="M300 273 449 238 503 354 410 425 280 390Z" />
          <path d="M570 225 702 208 757 315 693 405 545 373Z" />
          <path d="M835 236 979 253 1028 369 878 412 792 332Z" />
          <path d="M1058 318 1184 342 1150 448 1036 470Z" />
          <path d="M72 555 213 526 263 630 206 744 57 705Z" />
          <path d="M313 487 457 461 513 555 452 679 302 641Z" />
          <path d="M557 464 704 426 768 535 693 666 548 623Z" />
          <path d="M828 465 975 425 1023 542 960 660 807 610Z" />
          <path d="M1070 520 1190 498 1170 664 1045 680Z" />
        </g>

        <g fill="#c7dfbb" opacity=".9">
          <path d="M870 82h76v62h-76z" />
          <path d="M75 593h82v70H75z" />
          <path d="M603 482h75v52h-75z" />
        </g>

        <g className="map-labels" fill="#667260" fontFamily="DM Sans, sans-serif" fontSize="15" fontWeight="600">
          <text x="104" y="125" transform="rotate(23 104 125)">BARRIO CENTRO</text>
          <text x="823" y="300" transform="rotate(-8 823 300)">CALLE 10</text>
          <text x="180" y="575" transform="rotate(-11 180 575)">CARRERA 7</text>
          <text x="917" y="600" transform="rotate(-11 917 600)">SAN PELAYO</text>
          <text x="468" y="120" transform="rotate(23 468 120)">CALLE 8</text>
        </g>

        <g filter="url(#pin-shadow)">
          {visiblePoints.map((point) => (
            <g key={point.id} transform={`translate(${point.x} ${point.y})`} className={`map-pin map-pin-${point.state}`}>
              <circle r="21" fill="currentColor" opacity=".16" />
              <circle r="11" fill="currentColor" stroke="#fff" strokeWidth="4" />
              <circle r="3" fill="#fff" />
            </g>
          ))}
        </g>

        <g className="map-selected-road">
          <path d="M320 366 862 137" stroke="#f3ca58" strokeWidth="10" strokeLinecap="round" opacity=".9" />
          <path d="M320 366 862 137" stroke="#fff6d5" strokeWidth="2" strokeDasharray="8 10" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function MapDashboard({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState("mapa");
  const [searchTerm, setSearchTerm] = useState("");
  const [zoom, setZoom] = useState(1);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "E";

  return (
    <main className="map-dashboard">
      <MapArtwork zoom={zoom} searchTerm={searchTerm} alertsOnly={alertsOnly} />
      <header className="map-topbar">
        <div className="map-brand-lockup">
          <span className="map-brand-mark" aria-hidden="true">ES</span>
          <div><strong>ENERGY STAR</strong><small>ALUMBRADO INTELIGENTE</small></div>
        </div>

        <label className="map-search">
          <Icon name="search" size={19} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar luminaria o dirección"
            aria-label="Buscar luminaria o dirección"
          />
          <kbd>⌘ K</kbd>
        </label>

        <div className="map-top-actions">
          <span className="map-live-status"><i /> En línea</span>
          <button
            className="map-user-button"
            type="button"
            aria-label="Abrir menú de usuario"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((open) => !open)}
          >
            {userInitial}
          </button>
          {userMenuOpen && (
            <div className="map-user-menu">
              <span>{user?.name || "Usuario"}</span>
              <button type="button" onClick={onLogout}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </header>

      <section className="map-tools" aria-label="Controles del mapa">
        <button type="button" aria-label="Acercar mapa" onClick={() => setZoom((value) => Math.min(value + 0.12, 1.45))}>
          <Icon name="plus" />
        </button>
        <button type="button" aria-label="Alejar mapa" onClick={() => setZoom((value) => Math.max(value - 0.12, 1))}>
          <Icon name="minus" />
        </button>
        <span />
        <button type="button" aria-label="Centrar mapa" onClick={() => setZoom(1)}>
          <Icon name="locate" />
        </button>
        <button
          type="button"
          className={layersOpen ? "is-active" : ""}
          aria-label="Capas del mapa"
          aria-pressed={layersOpen}
          onClick={() => setLayersOpen((open) => !open)}
        >
          <Icon name="layers" />
        </button>
      </section>

      {layersOpen && (
        <aside className="map-layer-card">
          <strong>Capas del mapa</strong>
          <label><input type="checkbox" defaultChecked /> Luminarias</label>
          <label><input type="checkbox" defaultChecked /> Calles</label>
          <label><input type="checkbox" /> Barrios</label>
        </aside>
      )}

      <aside className="map-status-card">
        <div className="map-status-heading">
          <span className="map-status-icon"><Icon name="locate" size={17} /></span>
          <div><strong>San Pelayo</strong><small>Córdoba, Colombia</small></div>
          <span className="map-connection-dot" />
        </div>
        <div className="map-status-divider" />
        <div className="map-summary-row">
          <span><i className="summary-dot summary-online" />Activas</span><strong>128</strong>
        </div>
        <div className="map-summary-row">
          <span><i className="summary-dot summary-warning" />Revisar</span><strong>04</strong>
        </div>
        <button type="button" className="map-alert-filter" aria-pressed={alertsOnly} onClick={() => setAlertsOnly((active) => !active)}>
          {alertsOnly ? "Mostrar todas" : "Ver alertas"}<Icon name="chevron" size={15} />
        </button>
      </aside>

      <div className="map-scale-note"><span /> Mapa esquemático · San Pelayo</div>

      <nav className="map-bottom-nav" aria-label="Navegación principal">
        {navigation.map((item) => (
          <button
            type="button"
            key={item.id}
            className={activeNav === item.id ? "is-active" : ""}
            aria-current={activeNav === item.id ? "page" : undefined}
            onClick={() => setActiveNav(item.id)}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

export default MapDashboard;
