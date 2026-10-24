import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import municipalityUrl from "./data/san-pelayo-municipality.json?url";
import EnergyStarLogo from "./EnergyStarLogo";
import SecurityPinDialog from "./SecurityPinDialog";
import "leaflet/dist/leaflet.css";
import "./MapDashboardReal.css";

const townCenter = [8.957222, -75.838333];

const tileLayers = {
  standard: {
    name: "Estándar",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, © OpenStreetMap contributors, and the GIS User Community",
  },
  terrain: {
    name: "Relieve",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Sources: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, © OpenStreetMap contributors, and the GIS User Community",
  },
  satellite: {
    name: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community",
  },
};

const navigation = [
  { id: "inicio", label: "Inicio", icon: "home" },
  { id: "luminarias", label: "Luminarias", icon: "bulb" },
  { id: "mapa", label: "Mapa", icon: "map" },
  { id: "alertas", label: "Alertas", icon: "bell" },
  { id: "reportar", label: "Hacer reporte", icon: "report" },
];

const mapPointLimits = [10, 20, 30, 50, 100, 2000];
const accountStateLabels = {
  active: "Activa",
  suspended: "Suspendida",
  banned: "Bloqueada permanentemente",
};

function isAdministratorRoleFrontend(role) {
  return ["admin", "administrador", "administrator", "admin_general", "admin_principal", "admin_sub", "admin_auxiliar"].includes(String(role || "").trim().toLocaleLowerCase("es"));
}
function isPrincipalAdminFrontend(role) { return ["admin_general", "admin_principal"].includes(String(role || "").trim().toLocaleLowerCase("es")); }
function isSubAdminRequest(role) { return ["admin", "administrador", "administrator", "admin_sub", "admin_auxiliar", "admin_general", "admin_principal"].includes(String(role || "").trim().toLocaleLowerCase("es")); }

const statusLabels = {
  active: "Activa",
  review: "Revisar",
  critical: "Crítico",
};

const reportCategories = [
  "Luminaria apagada",
  "Luz intermitente",
  "Poste dañado",
  "Cable expuesto",
  "Otro problema de alumbrado",
];

function Icon({ name, size = 19 }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /><path d="M2 10 12 2l10 8" /></>,
    bulb: <><path d="M9 18h6M10 22h4" /><path d="M8 14a7 7 0 1 1 8 0c-.8.6-1 1.3-1 2H9c0-.7-.2-1.4-1-2Z" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-.9l-1.6.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.6.7a8 8 0 0 1 1.7-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.9Z" transform="translate(-2 -2)" /></>,
    filter: <><path d="M4 5h16l-6.2 7v5l-3.6 2v-7z" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    userX: <><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a6 6 0 0 1 6-6h2m8-3 4 4m0-4-4 4" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    locate: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    report: <><path d="M12 9v4m0 4h.01" /><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    check: <path d="m5 12 4 4L19 6" />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function makeMarkerIcon(className, label) {
  return L.divIcon({
    className: "energy-marker-shell",
    html: `<span class="energy-marker ${className}" title="${label}"><i></i></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function MapBridge({ onMapReady }) {
  const map = useMap();
  useEffect(() => onMapReady(map), [map, onMapReady]);
  return null;
}

function MapFocus({ luminaire }) {
  const map = useMap();
  const id = luminaire?.id;
  const lat = luminaire?.lat;
  const lng = luminaire?.lng;
  useEffect(() => {
    if (id) map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.65 });
  }, [map, id, lat, lng]);
  return null;
}

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem("energy-star-preferences") || "{}");
    return {
      theme: saved.theme === "dark" ? "dark" : "light",
      defaultLayer: tileLayers[saved.defaultLayer] ? saved.defaultLayer : "standard",
      showLights: saved.showLights !== false,
      showReports: saved.showReports !== false,
      showBoundary: saved.showBoundary !== false,
      mapPointLimit: mapPointLimits.includes(Number(saved.mapPointLimit)) ? Number(saved.mapPointLimit) : 100,
      mapPointStatuses: {
        active: saved.mapPointStatuses?.active !== false,
        review: saved.mapPointStatuses?.review !== false,
        critical: saved.mapPointStatuses?.critical !== false,
      },
      autoRefreshReports: saved.autoRefreshReports !== false,
      reportRefreshSeconds: [15, 30, 60].includes(Number(saved.reportRefreshSeconds)) ? Number(saved.reportRefreshSeconds) : 30,
      compactLuminaires: saved.compactLuminaires === true,
    };
  } catch {
    return { theme: "light", defaultLayer: "standard", showLights: true, showReports: true, showBoundary: true, mapPointLimit: 100, mapPointStatuses: { active: true, review: true, critical: true }, autoRefreshReports: true, reportRefreshSeconds: 30, compactLuminaires: false };
  }
}

function formatDate(value) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatCoordinate(value) {
  return Number(value).toFixed(5);
}

function ReportCard({ report }) {
  return (
    <article className={`report-card report-${report.severity}`}>
      <div className="report-card-topline">
        <span className={`state-badge state-${report.severity}`}>{statusLabels[report.severity] || "Revisar"}</span>
        <time>{formatDate(report.createdAt)}</time>
      </div>
      <h3>{report.category}</h3>
      <p>{report.description}</p>
      <div className="report-card-meta">
        {report.luminaireId && <span><Icon name="bulb" size={14} /> Luminaria <strong>{report.luminaireId}</strong>{report.luminaireSector ? ` · ${report.luminaireSector}` : ""}</span>}
        <span><Icon name="locate" size={14} /> {formatCoordinate(report.latitude)}, {formatCoordinate(report.longitude)} · San Pelayo</span>
        <span>Reportó <strong>{report.reporterName || "Usuario"}</strong></span>
      </div>
    </article>
  );
}

function MapDashboard({ user, onLogout, onProfileUpdated }) {
  const [section, setSection] = useState("inicio");
  const [municipality, setMunicipality] = useState(null);
  const [boundaryError, setBoundaryError] = useState("");
  const [search, setSearch] = useState("");
  const [layer, setLayer] = useState(() => loadPreferences().defaultLayer);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [luminaires, setLuminaires] = useState([]);
  const [luminairesLoading, setLuminairesLoading] = useState(true);
  const [luminairesError, setLuminairesError] = useState("");
  const [luminairesSearch, setLuminairesSearch] = useState("");
  const [luminairesPage, setLuminairesPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [reportsError, setReportsError] = useState("");
  const [reportsLoading, setReportsLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapFiltersOpen, setMapFiltersOpen] = useState(false);
  const [mapPointLimitDraft, setMapPointLimitDraft] = useState(preferences.mapPointLimit);
  const [mapPointStatusesDraft, setMapPointStatusesDraft] = useState(preferences.mapPointStatuses);
  const [performanceWarningOpen, setPerformanceWarningOpen] = useState(false);
  const [pendingMapFilterSettings, setPendingMapFilterSettings] = useState(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [focusLuminaireId, setFocusLuminaireId] = useState("");
  const [selectedLuminaireId, setSelectedLuminaireId] = useState("");
  const [reportLuminaireSearch, setReportLuminaireSearch] = useState("");
  const [reportCategory, setReportCategory] = useState(reportCategories[0]);
  const [reportSeverity, setReportSeverity] = useState("review");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profilePassword, setProfilePassword] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || "");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePinDialogOpen, setProfilePinDialogOpen] = useState(false);
  const [profilePinError, setProfilePinError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordPinDialogOpen, setPasswordPinDialogOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [inboxRequests, setInboxRequests] = useState([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [adminBusyUserId, setAdminBusyUserId] = useState(null);
  const [adminDuration, setAdminDuration] = useState("7d");
  const [adminReason, setAdminReason] = useState("");
  const [adminPendingAction, setAdminPendingAction] = useState(null);
  const [adminPinError, setAdminPinError] = useState("");
  const [requestToast, setRequestToast] = useState(0);
  const pendingCountRef = useRef(null);
  const [map, setMap] = useState(null);
  const sessionEnded = useRef(false);
  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "E";
  const userName = user?.name || "Usuario";
  const isAdmin = isAdministratorRoleFrontend(user?.role);
  const isPrincipalAdmin = isPrincipalAdminFrontend(user?.role);

  const mapGeography = useMemo(() => {
    if (!municipality) return null;
    const bounds = L.geoJSON(municipality).getBounds();
    const allowedBounds = bounds.pad(0.005);
    return {
      allowedBounds,
      boundaryRing: municipality.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]),
    };
  }, [municipality]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(municipalityUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el límite municipal.");
        return response.json();
      })
      .then((data) => {
        if (!data.features?.[0]) throw new Error("El archivo del límite municipal no contiene geometría.");
        setMunicipality(data.features[0]);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setBoundaryError(error.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!preferences.autoRefreshReports) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/reports");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudieron actualizar las alertas.");
        setReports(data.reports || []);
        setReportsError("");
      } catch (error) {
        setReportsError(error.message || "No se pudieron actualizar las alertas.");
      }
    }, preferences.reportRefreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [preferences.autoRefreshReports, preferences.reportRefreshSeconds]);

  useEffect(() => {
    let checking = false;
    const timer = window.setInterval(async () => {
      if (checking || sessionEnded.current) return;
      checking = true;
      try {
        const response = await fetch("/api/session/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id }),
        });
        const data = await response.json();
        if (response.ok && !data.allowed && !sessionEnded.current) {
          sessionEnded.current = true;
          window.alert(data.reason === "banned" ? "Esta cuenta fue bloqueada." : data.reason === "revoked" ? "Tu cuenta fue revocada por un administrador." : "Tu cuenta fue deshabilitada. Vuelve a iniciar sesión cuando tengas acceso.");
          onLogout();
        }
      } catch {
        // A temporary network interruption must not end an otherwise valid session.
      } finally {
        checking = false;
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [user?.id, onLogout]);

  useEffect(() => {
    if (!isAdmin || !user?.adminInboxToken) return undefined;
    let active = true;
    const refreshRequests = async () => {
      try {
        const response = await fetch("/api/admin/requests", {
          headers: { Authorization: `Bearer ${user.adminInboxToken}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudieron actualizar las solicitudes.");
        if (!active) return;
        const nextRequests = data.requests || [];
        const nextPendingCount = nextRequests.length;
        if (pendingCountRef.current === null && nextPendingCount > 0) setRequestToast(nextPendingCount);
        else if (pendingCountRef.current !== null && nextPendingCount > pendingCountRef.current) setRequestToast(nextPendingCount - pendingCountRef.current);
        pendingCountRef.current = nextPendingCount;
        setInboxRequests(nextRequests);
      } catch (error) {
        if (active && error.message.includes("expiró")) setInboxRequests([]);
      }
    };
    refreshRequests();
    const timer = window.setInterval(refreshRequests, 20000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isAdmin, user?.id, user?.adminInboxToken]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/luminaires", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudo cargar el catálogo de luminarias.");
        const records = (data.luminaires || []).map((luminaire) => ({
          ...luminaire,
          lat: Number(luminaire.lat),
          lng: Number(luminaire.lng),
          powerW: luminaire.powerW == null ? null : Number(luminaire.powerW),
          isSynthetic: Boolean(Number(luminaire.isSynthetic)),
          isWithinMunicipality: Boolean(Number(luminaire.isWithinMunicipality)),
        }));
        setLuminaires(records);
        setLuminairesError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLuminairesError(error.message || "No se pudo conectar con el servidor.");
      })
      .finally(() => setLuminairesLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem("energy-star-preferences", JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/reports", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudieron cargar las alertas.");
        setReports(data.reports || []);
        setReportsError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setReportsError(error.message || "No se pudieron cargar las alertas.");
      })
      .finally(() => setReportsLoading(false));
    return () => controller.abort();
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase("es");
  const normalizedLuminairesSearch = luminairesSearch.trim().toLocaleLowerCase("es");
  const visibleLuminaires = useMemo(() => luminaires.filter((light) =>
    !normalizedLuminairesSearch || `${light.id} ${light.sector} ${light.type} ${light.status}`.toLocaleLowerCase("es").includes(normalizedLuminairesSearch)
  ), [luminaires, normalizedLuminairesSearch]);
  const mapLuminairesMatching = useMemo(() => luminaires.filter((light) => light.isWithinMunicipality && preferences.mapPointStatuses[light.status] && (
    !normalizedSearch || `${light.id} ${light.sector} ${statusLabels[light.status]}`.toLocaleLowerCase("es").includes(normalizedSearch)
  )), [luminaires, normalizedSearch, preferences.mapPointStatuses]);
  const mapLuminaires = useMemo(() => {
    const count = Math.min(preferences.mapPointLimit, mapLuminairesMatching.length);
    if (count === mapLuminairesMatching.length) return mapLuminairesMatching;
    const interval = mapLuminairesMatching.length / count;
    return Array.from({ length: count }, (_, index) => mapLuminairesMatching[Math.floor(index * interval)]);
  }, [mapLuminairesMatching, preferences.mapPointLimit]);
  const reportLuminaireMatches = useMemo(() => {
    const query = reportLuminaireSearch.trim().toLocaleLowerCase("es");
    if (query.length < 2) return [];
    return luminaires.filter((light) => light.isWithinMunicipality &&
      `${light.id} ${light.sector} ${light.type}`.toLocaleLowerCase("es").includes(query)
    ).slice(0, 8);
  }, [luminaires, reportLuminaireSearch]);
  const selectedLuminaire = luminaires.find((light) => light.id === selectedLuminaireId);
  const focusedLuminaire = luminaires.find((light) => light.id === focusLuminaireId);
  const inventoryLuminaires = luminaires.filter((light) => light.isWithinMunicipality);
  const luminairesPageSize = preferences.compactLuminaires ? 50 : 25;
  const luminairesPageCount = Math.max(1, Math.ceil(visibleLuminaires.length / luminairesPageSize));
  const pageLuminaires = visibleLuminaires.slice((luminairesPage - 1) * luminairesPageSize, luminairesPage * luminairesPageSize);
  const normalizedAdminSearch = adminSearch.trim().toLocaleLowerCase("es");
  const visibleAdminUsers = adminUsers.filter((adminUser) =>
    !normalizedAdminSearch || `${adminUser.name} ${adminUser.email} ${adminUser.role} ${accountStateLabels[adminUser.accountState]}`.toLocaleLowerCase("es").includes(normalizedAdminSearch)
  );
  const pendingAdminUsers = inboxRequests;
  const visibleReports = useMemo(() => reports.filter((report) =>
    !normalizedSearch || `${report.category} ${report.description} ${report.reporterName}`.toLocaleLowerCase("es").includes(normalizedSearch)
  ), [normalizedSearch, reports]);

  const submitReport = async (event) => {
    event.preventDefault();
    setReportError("");
    if (!selectedLuminaire) {
      setReportError("Selecciona una luminaria registrada para asociarla al reporte.");
      return;
    }
    if (!user?.id) {
      setReportError("No se encontró la sesión del usuario. Vuelve a iniciar sesión.");
      return;
    }

    setReportSubmitting(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          luminaireId: selectedLuminaire.id,
          category: reportCategory,
          description: reportDescription,
          severity: reportSeverity,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo enviar el reporte.");
      setReports((current) => [data.report, ...current]);
      setReportDescription("");
      setSelectedLuminaireId("");
      setReportLuminaireSearch("");
      setSection("alertas");
    } catch (error) {
      setReportError(error.message || "No se pudo conectar con el servidor.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const setPreference = (name, value) => setPreferences((current) => ({ ...current, [name]: value }));
  const resetMap = () => map?.setView(townCenter, 13, { animate: true });

  const openMapFilters = () => {
    setMapPointLimitDraft(preferences.mapPointLimit);
    setMapPointStatusesDraft(preferences.mapPointStatuses);
    setMapFiltersOpen(true);
    setSettingsOpen(false);
    setUserMenuOpen(false);
  };

  const applyMapFilters = () => {
    const nextSettings = { limit: Number(mapPointLimitDraft), statuses: mapPointStatusesDraft };
    const allStatesEnabled = Object.values(nextSettings.statuses).every(Boolean);
    if (nextSettings.limit === 2000 && allStatesEnabled) {
      setPendingMapFilterSettings(nextSettings);
      setPerformanceWarningOpen(true);
      return;
    }
    setPreferences((current) => ({ ...current, mapPointLimit: nextSettings.limit, mapPointStatuses: nextSettings.statuses }));
    setMapFiltersOpen(false);
  };

  const confirmFullMap = () => {
    if (pendingMapFilterSettings) {
      setPreferences((current) => ({
        ...current,
        mapPointLimit: pendingMapFilterSettings.limit,
        mapPointStatuses: pendingMapFilterSettings.statuses,
      }));
    }
    setPerformanceWarningOpen(false);
    setPendingMapFilterSettings(null);
    setMapFiltersOpen(false);
  };

  const requestAdminUsers = async (password = adminPassword, quiet = false) => {
    if (!quiet) {
      setAdminLoading(true);
      setAdminError("");
      setAdminNotice("");
    }
    try {
      const response = await fetch("/api/admin/users/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: user.id, adminPassword: password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudieron cargar los usuarios.");
      const nextUsers = data.users || [];
      setAdminUsers(nextUsers);
      setInboxRequests(nextUsers.filter((item) => item.approvalStatus === "pending" && (isPrincipalAdminFrontend(user?.role) || !isSubAdminRequest(item.requestedRole))));
      setAdminVerified(true);
      setAdminError("");
      return true;
    } catch (error) {
      if (!quiet) setAdminError(error.message || "No se pudo conectar con el servidor.");
      if (quiet) {
        setAdminVerified(false);
        setAdminUsers([]);
        setAdminPassword("");
        setAdminError("La sesión de administración expiró. Confirma de nuevo tu contraseña.");
      }
      return false;
    } finally {
      if (!quiet) setAdminLoading(false);
    }
  };

  const submitAdminAccess = async (event) => {
    event.preventDefault();
    await requestAdminUsers(adminPassword);
  };

  const performAdminAction = async (target, action) => {
    const actionText = action === "approve" ? "aprobar la solicitud" : action === "reject" ? "rechazar la solicitud" : action === "promote_subadmin" ? "asignar el rol de subadministrador" : action === "demote_subadmin" ? "retirar el rol de subadministrador" : action === "revoke" ? "eliminar definitivamente esta cuenta" : action === "ban" ? "bloquear esta cuenta y reservar su correo permanentemente" : action === "restore" ? "reactivar esta cuenta" : "suspender esta cuenta";
    if (!window.confirm(`¿Confirmas que deseas ${actionText} de ${target.name}?`)) return;
    setAdminPinError("");
    setAdminPendingAction({ target, action });
  };

  const confirmAdminAction = async (securityPin) => {
    const pending = adminPendingAction;
    if (!pending) return;
    const { target, action } = pending;
    setAdminBusyUserId(target.id);
    setAdminError("");
    setAdminNotice("");
    try {
      const response = await fetch(`/api/admin/users/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: user.id,
          adminPassword,
          securityPin,
          action,
          duration: action === "suspend" ? adminDuration : undefined,
          reason: adminReason,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo actualizar esta cuenta.");
      setAdminNotice(data.message);
      setAdminPendingAction(null);
      await requestAdminUsers(adminPassword, true);
    } catch (error) {
      setAdminPinError(error.message || "No se pudo conectar con el servidor.");
    } finally {
      setAdminBusyUserId(null);
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfileError("");
    if (!file.type.startsWith("image/")) {
      setProfileError("Selecciona un archivo de imagen.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setProfilePhoto(canvas.toDataURL("image/jpeg", 0.78));
      setProfileMessage("Foto lista para guardar.");
    } catch {
      setProfileError("No se pudo leer la imagen. Prueba con otra foto.");
    }
    event.target.value = "";
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfilePinError("");
    setProfilePinDialogOpen(true);
  };

  const saveProfileWithPin = async (securityPin) => {
    setProfileError("");
    setProfileMessage("");
    setProfileSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: profilePassword,
          securityPin,
          name: profileName,
          email: profileEmail,
          profilePhoto: profilePhoto || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo guardar el perfil.");
      onProfileUpdated?.({ ...data.user, adminInboxToken: user?.adminInboxToken });
      setProfileName(data.user.name);
      setProfileEmail(data.user.email);
      setProfilePhoto(data.user.profilePhoto || "");
      setProfilePassword("");
      setProfileMessage("Tu perfil se actualizó correctamente.");
      setProfilePinDialogOpen(false);
    } catch (error) {
      setProfilePinError(error.message || "No se pudo conectar con el servidor.");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (newPassword.length < 8) { setPasswordError("La nueva contraseña debe tener al menos ocho caracteres."); return; }
    if (newPassword !== confirmNewPassword) { setPasswordError("La confirmación no coincide con la nueva contraseña."); return; }
    setPasswordPinDialogOpen(true);
  };

  const changePasswordWithPin = async (securityPin) => {
    setPasswordSaving(true);
    setPasswordError("");
    try {
      const response = await fetch("/api/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, currentPassword: profilePassword, newPassword, confirmPassword: confirmNewPassword, securityPin }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo cambiar la contraseña.");
      setPasswordMessage(data.message);
      setProfilePassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordPinDialogOpen(false);
    } catch (error) {
      setPasswordError(error.message || "No se pudo conectar con el servidor.");
    } finally { setPasswordSaving(false); }
  };

  const renderLuminaires = () => (
    <div className="workspace-panel-content">
      <div className="panel-heading">
        <span className="panel-eyebrow">INVENTARIO DE ALUMBRADO</span>
        <h1>Luminarias</h1>
        <p>{inventoryLuminaires.length.toLocaleString("es-CO")} luminarias dentro del límite municipal, identificadas por un código único.</p>
      </div>
      <div className="demo-notice"><span /> Este catálogo procede de datos marcados como sintéticos en el Excel. Úsalo como referencia de prueba hasta confirmar las ubicaciones reales.</div>
      {luminairesError && <div className="inline-error" role="alert">{luminairesError}</div>}
      <label className="luminaires-search"><Icon name="search" size={17} /><input value={luminairesSearch} onChange={(event) => { setLuminairesSearch(event.target.value); setLuminairesPage(1); }} placeholder="Buscar por ID, sector o tipo" aria-label="Buscar luminarias" /></label>
      {luminairesLoading ? <div className="empty-state">Cargando catálogo…</div> : (
      <>
      <div className="light-list">
        {pageLuminaires.map((light) => (
          <article className="light-row" key={light.id}>
            <span className={`light-symbol light-${light.status}`}><Icon name="bulb" size={17} /></span>
            <div className="light-info"><strong>{light.id}</strong><span>{light.sector} · {light.type}{light.powerW ? ` · ${light.powerW} W` : ""}</span></div>
            <span className={`state-badge ${light.isWithinMunicipality ? `state-${light.status}` : "state-outside"}`}>{light.isWithinMunicipality ? statusLabels[light.status] : "Revisar ubicación"}</span>
            <button type="button" className="luminaire-map-button" disabled={!light.isWithinMunicipality} title={light.isWithinMunicipality ? "Ubicar en el mapa" : "La ubicación está fuera del límite municipal"} onClick={() => { if (!light.isWithinMunicipality) return; setFocusLuminaireId(light.id); setSection("mapa"); }}><Icon name="map" size={15} /><span>Ver mapa</span></button>
          </article>
        ))}
        {!pageLuminaires.length && <p className="empty-state">No hay luminarias que coincidan con la búsqueda.</p>}
      </div>
      {visibleLuminaires.length > luminairesPageSize && <div className="luminaires-pagination"><span>{(luminairesPage - 1) * luminairesPageSize + 1}–{Math.min(luminairesPage * luminairesPageSize, visibleLuminaires.length)} de {visibleLuminaires.length}</span><button type="button" disabled={luminairesPage <= 1} onClick={() => setLuminairesPage((page) => page - 1)}>Anterior</button><button type="button" disabled={luminairesPage >= luminairesPageCount} onClick={() => setLuminairesPage((page) => page + 1)}>Siguiente</button></div>}
      <div className="panel-footnote">Cada ID aparece una sola vez en el catálogo. Las coordenadas compartidas se conservan, y las 64 ubicaciones que caen fuera del contorno oficial se muestran para revisión, pero no se pueden usar en reportes.</div>
      </>
      )}
    </div>
  );

  const renderAlerts = () => (
    <div className="workspace-panel-content">
      <div className="panel-heading">
        <span className="panel-eyebrow">SEGUIMIENTO CIUDADANO</span>
        <h1>Alertas y reportes</h1>
        <p>Incidencias registradas en San Pelayo, con ubicación, hora y autor.</p>
      </div>
      {reportsError && <div className="inline-error" role="alert">{reportsError}</div>}
      {reportsLoading ? <div className="empty-state">Cargando reportes…</div> : (
        <div className="report-list">
          {visibleReports.map((report) => <ReportCard key={report.id} report={report} />)}
          {!visibleReports.length && <div className="empty-state"><span className="empty-icon"><Icon name="bell" size={20} /></span><strong>Aún no hay alertas</strong><span>Los reportes enviados desde la aplicación aparecerán aquí.</span></div>}
        </div>
      )}
      <button className="panel-primary-action" type="button" onClick={() => setSection("reportar")}>
        <Icon name="report" size={17} /> Crear un reporte
      </button>
    </div>
  );

  const renderReportForm = () => (
    <div className="workspace-panel-content">
      <div className="panel-heading">
        <span className="panel-eyebrow">REPORTE CIUDADANO</span>
        <h1>Cuéntanos qué sucede</h1>
        <p>Asocia el reporte a una luminaria registrada. Su ID y coordenadas se toman del catálogo único.</p>
      </div>
      <div className="demo-notice"><span /> Los registros cargados están marcados como sintéticos; confirma los datos antes de usarlos como inventario real.</div>
      <form className="report-form" onSubmit={submitReport}>
        <label>Buscar luminaria por ID, sector o tipo
          <input className="profile-text-input" value={reportLuminaireSearch} onChange={(event) => setReportLuminaireSearch(event.target.value)} placeholder="Ej. LUM-SP-URB-0001-1" autoComplete="off" />
        </label>
        {luminairesLoading ? <div className="empty-state">Cargando catálogo…</div> : luminairesError ? <p className="inline-error" role="alert">{luminairesError}</p> : (
          <div className="report-luminaire-results" role="listbox" aria-label="Resultados de luminarias">
            {reportLuminaireMatches.map((light) => (
              <button key={light.id} type="button" role="option" aria-selected={selectedLuminaireId === light.id} onClick={() => { setSelectedLuminaireId(light.id); setReportLuminaireSearch(""); }}>
                <span><strong>{light.id}</strong><small>{light.sector} · {light.type}</small></span><Icon name="chevron" size={16} />
              </button>
            ))}
            {reportLuminaireSearch.trim().length >= 2 && reportLuminaireMatches.length === 0 && <p className="empty-state">No hay luminarias dentro del municipio con ese dato.</p>}
            {reportLuminaireSearch.trim().length < 2 && !selectedLuminaire && <p className="search-hint">Escribe al menos dos caracteres para buscar en el catálogo.</p>}
          </div>
        )}
        {selectedLuminaire && <div className="selected-luminaire-card">
          <div className="location-choice-icon"><Icon name="check" size={17} /></div>
          <div><strong>{selectedLuminaire.id}</strong><span>{selectedLuminaire.sector} · {selectedLuminaire.type} · {statusLabels[selectedLuminaire.status]}</span><small>{formatCoordinate(selectedLuminaire.lat)}, {formatCoordinate(selectedLuminaire.lng)} · San Pelayo</small></div>
          <button type="button" onClick={() => setSelectedLuminaireId("")}>Quitar</button>
        </div>}
        <label>Tipo de novedad
          <select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)}>
            {reportCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label>Estado reportado
          <select value={reportSeverity} onChange={(event) => setReportSeverity(event.target.value)}>
            <option value="review">Requiere revisión</option>
            <option value="critical">Crítico · riesgo o daño grave</option>
          </select>
        </label>
        <label>Descripción
          <textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} minLength={5} maxLength={2000} rows={3} placeholder="Describe la novedad y cualquier detalle útil…" required />
        </label>
        {reportError && <p className="inline-error" role="alert">{reportError}</p>}
        <div className="reporting-user"><span className="avatar-mini">{userInitial}</span><span>Reporte de <strong>{userName}</strong></span></div>
        <button className="panel-primary-action" type="submit" disabled={reportSubmitting || !selectedLuminaire}>
          {reportSubmitting ? "Enviando…" : "Enviar reporte"}<Icon name="chevron" size={17} />
        </button>
      </form>
    </div>
  );

  const renderSettings = () => (
    <div className="workspace-panel-content">
      <div className="panel-heading">
        <span className="panel-eyebrow">PREFERENCIAS DE LA APLICACIÓN</span>
        <h1>Ajustes</h1>
        <p>Personaliza la apariencia y las capas del mapa en este dispositivo.</p>
      </div>
      <section className="settings-group">
        <h2>Apariencia</h2>
        <div className="theme-choice" role="group" aria-label="Tema de la aplicación">
          <button type="button" className={preferences.theme === "light" ? "selected" : ""} aria-pressed={preferences.theme === "light"} onClick={() => setPreference("theme", "light")}><Icon name="sun" size={18} /> Claro</button>
          <button type="button" className={preferences.theme === "dark" ? "selected" : ""} aria-pressed={preferences.theme === "dark"} onClick={() => setPreference("theme", "dark")}><Icon name="moon" size={18} /> Oscuro</button>
        </div>
      </section>
      <section className="settings-group">
        <h2>Mapa</h2>
        <label className="settings-select">Vista inicial
          <select value={preferences.defaultLayer} onChange={(event) => { setPreference("defaultLayer", event.target.value); setLayer(event.target.value); }}>
            {Object.entries(tileLayers).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
          </select>
        </label>
        <label className="settings-toggle"><span><strong>Mostrar luminarias del catálogo</strong><small>Se limita la cantidad para mantener fluido el mapa.</small></span><input type="checkbox" checked={preferences.showLights} onChange={(event) => setPreference("showLights", event.target.checked)} /></label>
        <label className="settings-toggle"><span><strong>Mostrar reportes en el mapa</strong><small>Ubicaciones enviadas por los usuarios.</small></span><input type="checkbox" checked={preferences.showReports} onChange={(event) => setPreference("showReports", event.target.checked)} /></label>
        <label className="settings-toggle"><span><strong>Mostrar límite municipal</strong><small>Contorno de San Pelayo según DANE.</small></span><input type="checkbox" checked={preferences.showBoundary} onChange={(event) => setPreference("showBoundary", event.target.checked)} /></label>
      </section>
      <section className="settings-group">
        <h2>Actualización de alertas</h2>
        <label className="settings-toggle"><span><strong>Actualizar automáticamente</strong><small>Comprueba si hay reportes nuevos mientras usas la aplicación.</small></span><input type="checkbox" checked={preferences.autoRefreshReports} onChange={(event) => setPreference("autoRefreshReports", event.target.checked)} /></label>
        <label className="settings-select">Frecuencia de actualización
          <select value={preferences.reportRefreshSeconds} disabled={!preferences.autoRefreshReports} onChange={(event) => setPreference("reportRefreshSeconds", Number(event.target.value))}>
            <option value={15}>Cada 15 segundos</option><option value={30}>Cada 30 segundos</option><option value={60}>Cada minuto</option>
          </select>
        </label>
      </section>
      <section className="settings-group">
        <h2>Presentación</h2>
        <label className="settings-toggle"><span><strong>Lista compacta de luminarias</strong><small>Muestra más registros en cada página.</small></span><input type="checkbox" checked={preferences.compactLuminaires} onChange={(event) => { setPreference("compactLuminaires", event.target.checked); setLuminairesPage(1); }} /></label>
      </section>
    </div>
  );

  const renderMapFilters = () => (
    <div className="workspace-panel-content map-filter-content">
      <div className="panel-heading">
        <span className="panel-eyebrow">RENDIMIENTO DEL MAPA</span>
        <h1>Visibilidad de puntos</h1>
        <p>Limita cuántas luminarias aparecen y elige qué estados mostrar.</p>
      </div>
      <label className="settings-select">Máximo de luminarias visibles
        <select value={mapPointLimitDraft} onChange={(event) => setMapPointLimitDraft(Number(event.target.value))}>
          {mapPointLimits.map((limit) => <option key={limit} value={limit}>{limit === 2000 ? "Todas (hasta 2.000)" : `${limit} puntos`}</option>)}
        </select>
      </label>
      <section className="map-status-filters">
        <h2>Estados del alumbrado</h2>
        {[["active", "Activas", "active-dot"], ["review", "Necesitan revisión", "review-dot"], ["critical", "Críticas", "critical-dot"]].map(([key, label, color]) => (
          <label className="map-status-option" key={key}><span><i className={color} />{label}</span><input type="checkbox" checked={mapPointStatusesDraft[key]} onChange={(event) => setMapPointStatusesDraft((current) => ({ ...current, [key]: event.target.checked }))} /></label>
        ))}
      </section>
      <p className="map-filter-count">Con estos estados hay {mapLuminairesMatching.length.toLocaleString("es-CO")} luminarias dentro del contorno municipal. Se mostrarán hasta {Math.min(mapPointLimitDraft, mapLuminairesMatching.length).toLocaleString("es-CO")}.</p>
      <button className="panel-primary-action" type="button" onClick={applyMapFilters}>Aplicar filtros</button>
    </div>
  );

  const renderAdminUsers = () => (
    <div className="workspace-panel-content admin-users-content">
      <div className="panel-heading">
        <span className="panel-eyebrow">CONTROL DE ACCESO</span>
        <h1>Usuarios</h1>
        <p>Administra accesos, suspensiones y bloqueos de cuentas registradas.</p>
      </div>
      {!isAdmin ? <div className="inline-error" role="alert">Esta sección está disponible únicamente para administradores.</div> : !adminVerified ? (
        <form className="admin-access-form" onSubmit={submitAdminAccess}>
          <span className="admin-shield"><Icon name="shield" size={22} /></span>
          <strong>Confirma tu contraseña de administrador</strong>
          <p>La contraseña se verifica en el servidor antes de mostrar o cambiar cuentas.</p>
          <input className="profile-text-input" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="current-password" required placeholder="Contraseña actual" />
          {adminError && <p className="inline-error" role="alert">{adminError}</p>}
          <button className="panel-primary-action" type="submit" disabled={adminLoading}>{adminLoading ? "Verificando…" : "Abrir administración"}</button>
        </form>
      ) : (
        <>
          <section className="admin-request-inbox" aria-label="Solicitudes pendientes">
            <div><span className="panel-eyebrow">BANDEJA DE ENTRADA</span><strong>Solicitudes nuevas <i>{pendingAdminUsers.length}</i></strong><small>Esta lista se actualiza automáticamente cada 20 segundos.</small></div>
            {!pendingAdminUsers.length ? <p>No tienes solicitudes pendientes.</p> : pendingAdminUsers.map((request) => {
              const asksForSubAdmin = isSubAdminRequest(request.requestedRole);
              return <article className="admin-request-card" key={`request-${request.id}`}><div><strong>{request.name}</strong><span>{request.email}</span><small>Solicita: {asksForSubAdmin ? "Subadministrador" : "Técnico"}</small></div><div className="admin-user-actions">{(!asksForSubAdmin || isPrincipalAdmin) && <button className="admin-action-button" type="button" disabled={String(adminBusyUserId) === String(request.id)} onClick={() => performAdminAction(request, "approve")}>Aprobar</button>}<button className="admin-action-button admin-revoke-button" type="button" disabled={String(adminBusyUserId) === String(request.id)} onClick={() => performAdminAction(request, "reject")}>Rechazar</button></div></article>;
            })}
          </section>
          <div className="admin-toolbar">
            <label className="luminaires-search"><Icon name="search" size={17} /><input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Buscar por nombre o correo" /></label>
            <label>Duración de suspensión<select value={adminDuration} onChange={(event) => setAdminDuration(event.target.value)}><option value="1d">1 día</option><option value="7d">7 días</option><option value="30d">30 días</option><option value="90d">90 días</option><option value="permanent">Permanente hasta reactivar</option></select></label>
            <label>Motivo (opcional)<input value={adminReason} onChange={(event) => setAdminReason(event.target.value)} maxLength={255} placeholder="Motivo de la acción" /></label>
            <button className="admin-refresh-button" type="button" onClick={() => requestAdminUsers(adminPassword)} disabled={adminLoading}>Actualizar lista</button>
          </div>
          {adminError && <p className="inline-error" role="alert">{adminError}</p>}
          {adminNotice && <p className="profile-success" role="status">{adminNotice}</p>}
          <div className="admin-user-list">
            {visibleAdminUsers.map((adminUser) => {
              const protectedAdmin = isAdministratorRoleFrontend(adminUser.role);
              const principalTarget = isPrincipalAdminFrontend(adminUser.role);
              const isSelf = String(adminUser.id) === String(user.id);
              const busy = String(adminBusyUserId) === String(adminUser.id);
              return (
                <article className="admin-user-card" key={adminUser.id}>
                  <div className="admin-user-identity">
                    <span className="admin-user-avatar">{adminUser.profilePhoto ? <img src={adminUser.profilePhoto} alt="" /> : adminUser.name?.trim()?.charAt(0)?.toUpperCase()}</span>
                    <div><strong>{adminUser.name}</strong><span>{adminUser.email}</span><small>{principalTarget ? "Administrador general" : protectedAdmin ? "Subadministrador" : adminUser.role} · {adminUser.approvalStatus === "approved" ? "Aprobado" : adminUser.approvalStatus === "rejected" ? "Rechazado" : "Pendiente de aprobación"}</small></div>
                  </div>
                  <div className={`account-state state-${adminUser.accountState}`}><i />{accountStateLabels[adminUser.accountState] || "Activa"}{adminUser.accountState === "suspended" && adminUser.suspendedUntil ? ` · hasta ${formatDate(adminUser.suspendedUntil)}` : ""}</div>
                  {adminUser.reason && <p className="admin-user-reason">Motivo: {adminUser.reason}</p>}
                  <div className="admin-user-actions">
                    {principalTarget || isSelf ? <span className="admin-protected-note">{isSelf ? "Tu cuenta administradora" : "Administrador general protegido"}</span> : protectedAdmin ? <>{isPrincipalAdmin && <><button type="button" className="admin-action-button" disabled={busy} onClick={() => performAdminAction(adminUser, "demote_subadmin")}>Quitar subadmin</button>{adminUser.accountState === "active" ? <button type="button" className="admin-action-button" disabled={busy} onClick={() => performAdminAction(adminUser, "suspend")}>Suspender</button> : <button type="button" className="admin-action-button" disabled={busy} onClick={() => performAdminAction(adminUser, "restore")}>Reactivar</button>}<button type="button" className="admin-action-button admin-ban-button" disabled={busy} onClick={() => performAdminAction(adminUser, "ban")}>Bloquear correo</button><button type="button" className="admin-action-button admin-revoke-button" disabled={busy} onClick={() => performAdminAction(adminUser, "revoke")}>Revocar</button></>}</> : <>
                      {isPrincipalAdmin && adminUser.approvalStatus === "approved" && <button type="button" className="admin-action-button" disabled={busy} onClick={() => performAdminAction(adminUser, "promote_subadmin")}>Hacer subadmin</button>}
                      {adminUser.accountState === "active" ? <button type="button" className="admin-action-button" disabled={busy} onClick={() => performAdminAction(adminUser, "suspend")}>{busy ? "Guardando…" : "Suspender"}</button> : adminUser.accountState === "suspended" && <button type="button" className="admin-action-button" disabled={busy} onClick={() => performAdminAction(adminUser, "restore")}>Reactivar</button>}
                      {adminUser.accountState !== "banned" && <button type="button" className="admin-action-button admin-ban-button" disabled={busy} onClick={() => performAdminAction(adminUser, "ban")}>Bloquear correo</button>}
                      <button type="button" className="admin-action-button admin-revoke-button" disabled={busy} onClick={() => performAdminAction(adminUser, "revoke")}>Revocar y eliminar</button>
                    </>}
                  </div>
                </article>
              );
            })}
            {!visibleAdminUsers.length && <div className="empty-state">No se encontraron usuarios.</div>}
          </div>
        </>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="workspace-panel-content">
      <div className="panel-heading">
        <span className="panel-eyebrow">TU CUENTA</span>
        <h1>Perfil</h1>
        <p>Actualiza cómo aparece tu información en Energy Star.</p>
      </div>
      <form className="report-form profile-form" onSubmit={saveProfile}>
        <div className="profile-photo-editor">
          <span className="profile-photo-preview">
            {profilePhoto ? <img src={profilePhoto} alt="Foto de perfil" /> : userInitial}
          </span>
          <div><strong>Foto de perfil</strong><small>Se ajusta automáticamente para guardarse con poco peso.</small>
            <label className="photo-upload-button">Elegir foto<input type="file" accept="image/*" onChange={handlePhotoChange} /></label>
            {profilePhoto && <button className="photo-remove-button" type="button" onClick={() => setProfilePhoto("")}>Quitar foto</button>}
          </div>
        </div>
        <label>Nombre completo<input className="profile-text-input" value={profileName} onChange={(event) => setProfileName(event.target.value)} minLength={3} maxLength={120} required /></label>
        <label>Correo electrónico<input className="profile-text-input" type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} required /></label>
        <label>Contraseña actual<input className="profile-text-input" type="password" value={profilePassword} onChange={(event) => setProfilePassword(event.target.value)} autoComplete="current-password" required /><small>La solicitamos para confirmar que eres quien administra esta cuenta.</small></label>
        {profileError && <p className="inline-error" role="alert">{profileError}</p>}
        {profileMessage && <p className="profile-success" role="status">{profileMessage}</p>}
        <button className="panel-primary-action" type="submit" disabled={profileSaving}>{profileSaving ? "Guardando…" : "Guardar cambios"}</button>
      </form>
      <form className="report-form profile-form password-change-form" onSubmit={changePassword}>
        <div className="panel-subheading"><h2>Cambiar contraseña</h2></div>
        <label>Contraseña actual<input className="profile-text-input" type="password" value={profilePassword} onChange={(event) => setProfilePassword(event.target.value)} autoComplete="current-password" required /></label>
        <label>Nueva contraseña<input className="profile-text-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
        <label>Confirmar nueva contraseña<input className="profile-text-input" type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
        {passwordError && <p className="inline-error" role="alert">{passwordError}</p>}{passwordMessage && <p className="profile-success" role="status">{passwordMessage}</p>}
        <button className="panel-primary-action" type="submit" disabled={passwordSaving}>{passwordSaving ? "Actualizando…" : "Cambiar contraseña"}</button>
      </form>
    </div>
  );

  const renderHome = () => {
    const activeCount = inventoryLuminaires.filter((light) => light.status === "active").length;
    const reviewCount = inventoryLuminaires.filter((light) => light.status === "review").length;
    const criticalCount = inventoryLuminaires.filter((light) => light.status === "critical").length;
    return (
      <div className="workspace-panel-content">
        <div className="panel-heading">
          <span className="panel-eyebrow">ENERGY STAR · SAN PELAYO</span>
          <h1>Hola, {userName.split(" ")[0]}</h1>
          <p>Panel de seguimiento del alumbrado público municipal.</p>
        </div>
        <div className="demo-notice"><span /> Los datos del catálogo están marcados como sintéticos y requieren confirmación en campo.</div>
        <div className="overview-grid">
          <div className="overview-stat"><span className="stat-bullet active-dot" /><strong>{activeCount}</strong><small>Activas</small></div>
          <div className="overview-stat"><span className="stat-bullet review-dot" /><strong>{reviewCount}</strong><small>Revisar</small></div>
          <div className="overview-stat"><span className="stat-bullet critical-dot" /><strong>{criticalCount}</strong><small>Críticas</small></div>
        </div>
        <div className="panel-subheading"><h2>Reportes recientes</h2><button type="button" onClick={() => setSection("alertas")}>Ver todos <Icon name="chevron" size={14} /></button></div>
        {reportsLoading ? <div className="empty-state compact-empty">Cargando…</div> : reports.slice(0, 2).map((report) => <ReportCard key={report.id} report={report} />)}
        {!reportsLoading && reports.length === 0 && <div className="empty-state compact-empty">No hay reportes recientes.</div>}
        <button className="panel-primary-action" type="button" onClick={() => setSection("reportar")}><Icon name="report" size={17} /> Hacer un reporte</button>
      </div>
    );
  };

  const panelContent = {
    inicio: renderHome,
    luminarias: renderLuminaires,
    alertas: renderAlerts,
    reportar: renderReportForm,
    perfil: renderProfile,
    usuarios: renderAdminUsers,
  };

  const filteredReports = useMemo(() => visibleReports, [visibleReports]);
  const visibleNavigation = isAdmin ? [...navigation, { id: "usuarios", label: "Usuarios", icon: "users" }] : navigation;
  const pageIsMap = section === "mapa";
  const activePanel = panelContent[section];

  if (!municipality || !mapGeography) {
    return (
      <main className="real-map-dashboard map-boundary-loading" data-theme={preferences.theme}>
        <div>{boundaryError || "Cargando el límite municipal oficial de San Pelayo…"}</div>
      </main>
    );
  }

  return (
    <main className="real-map-dashboard" data-theme={preferences.theme}>
      {pageIsMap && <div className="real-map-canvas" aria-label="Mapa interactivo del municipio de San Pelayo">
        <MapContainer
          center={townCenter}
          zoom={13}
          minZoom={10}
          maxZoom={18}
          maxBounds={mapGeography.allowedBounds}
          maxBoundsViscosity={1}
          scrollWheelZoom
          zoomControl={false}
          attributionControl
          className="san-pelayo-map"
        >
          <MapBridge onMapReady={setMap} />
          <MapFocus luminaire={focusedLuminaire} />
          <TileLayer key={layer} url={tileLayers[layer].url} attribution={tileLayers[layer].attribution} maxZoom={18} />
          {preferences.showBoundary && (
            <GeoJSON data={municipality} style={{ color: preferences.theme === "dark" ? "#a2ff74" : "#25863b", weight: 2, opacity: 0.92, fillOpacity: 0, interactive: false }} />
          )}
          {preferences.showLights && mapLuminaires.map((light) => (
            <Marker key={light.id} position={[light.lat, light.lng]} icon={makeMarkerIcon(`marker-${light.status} ${focusLuminaireId === light.id ? "marker-focused" : ""}`, light.id)} zIndexOffset={focusLuminaireId === light.id ? 1000 : 0}>
              <Popup><strong>{light.id}</strong><br />{statusLabels[light.status]} · {light.sector}<br />{light.type}{light.powerW ? ` · ${light.powerW} W` : ""}<br /><small>{light.isSynthetic ? "Registro sintético" : "Registro de inventario"}</small></Popup>
            </Marker>
          ))}
          {preferences.showLights && focusedLuminaire?.isWithinMunicipality && !mapLuminaires.some((light) => light.id === focusedLuminaire.id) && (
            <Marker position={[focusedLuminaire.lat, focusedLuminaire.lng]} icon={makeMarkerIcon(`marker-${focusedLuminaire.status} marker-focused`, focusedLuminaire.id)} zIndexOffset={1000}>
              <Popup><strong>{focusedLuminaire.id}</strong><br />{statusLabels[focusedLuminaire.status]} · {focusedLuminaire.sector}<br />Punto seleccionado desde el inventario.</Popup>
            </Marker>
          )}
          {preferences.showReports && filteredReports.map((report) => (
            <Marker key={`report-${report.id}`} position={[Number(report.latitude), Number(report.longitude)]} icon={makeMarkerIcon(`marker-report-${report.severity}`, report.category)}>
              <Popup><strong>{report.category}</strong><br />{statusLabels[report.severity]}<br />Reportó {report.reporterName}<br />{formatDate(report.createdAt)}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>}

      <header className="real-map-topbar">
        <div className="real-map-brand">
          <span className="brand-logo-tile"><EnergyStarLogo className="map-app-logo" /></span>
          <span><strong>ENERGY STAR</strong><small>ALUMBRADO PÚBLICO · SAN PELAYO</small></span>
        </div>
        <div className="map-header-center">
          {pageIsMap && <div className="basemap-switch" role="group" aria-label="Tipo de mapa">
            {Object.entries(tileLayers).map(([key, value]) => (
              <button key={key} type="button" className={layer === key ? "selected" : ""} aria-pressed={layer === key} onClick={() => setLayer(key)}>{value.name}</button>
            ))}
          </div>}
          {pageIsMap && <label className="real-map-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar luminaria o reporte" aria-label="Buscar luminaria o reporte" /></label>}
        </div>
        <div className="real-map-user-area">
          {pageIsMap && <span className="municipality-chip"><i /> San Pelayo</span>}
          <button className="header-settings-button header-filter-button" type="button" aria-label="Configurar puntos visibles" title="Visibilidad del mapa" aria-expanded={mapFiltersOpen} onClick={mapFiltersOpen ? () => setMapFiltersOpen(false) : openMapFilters}><Icon name="filter" size={19} /></button>
          <button className="header-settings-button" type="button" aria-label="Abrir ajustes" aria-expanded={settingsOpen} onClick={() => { setSettingsOpen((value) => !value); setMapFiltersOpen(false); setUserMenuOpen(false); }}><Icon name="settings" size={19} /></button>
          <button className="real-map-avatar" type="button" aria-label="Menú de usuario" aria-expanded={userMenuOpen} onClick={() => { setUserMenuOpen((value) => !value); setSettingsOpen(false); setMapFiltersOpen(false); }}>{profilePhoto ? <img src={profilePhoto} alt="" /> : userInitial}</button>
          {userMenuOpen && <div className="real-user-menu"><strong>{userName}</strong><span>{user?.email}</span><button type="button" onClick={() => { setSection("perfil"); setUserMenuOpen(false); setProfileMessage(""); setProfileError(""); }}>Perfil</button><button type="button" onClick={onLogout}>Cerrar sesión</button></div>}
        </div>
      </header>

      {pageIsMap && <aside className="real-map-tools" aria-label="Controles del mapa">
        <button type="button" aria-label="Acercar" title="Acercar" onClick={() => map?.zoomIn()}><Icon name="plus" /></button>
        <button type="button" aria-label="Alejar" title="Alejar" onClick={() => map?.zoomOut()}><Icon name="minus" /></button>
        <span />
        <button type="button" aria-label="Volver a la cabecera de San Pelayo" title="Volver a San Pelayo" onClick={resetMap}><Icon name="locate" /></button>
        <button type="button" aria-label="Mostrar capas" title="Capas" className={layersOpen ? "selected" : ""} onClick={() => setLayersOpen((value) => !value)}><Icon name="layers" /></button>
      </aside>}

      {pageIsMap && layersOpen && <aside className="map-layer-panel">
        <strong>Elementos visibles</strong>
        <label><input type="checkbox" checked={preferences.showLights} onChange={(event) => setPreference("showLights", event.target.checked)} /> Luminarias del catálogo</label>
        <label><input type="checkbox" checked={preferences.showReports} onChange={(event) => setPreference("showReports", event.target.checked)} /> Reportes ciudadanos</label>
        <label><input type="checkbox" checked={preferences.showBoundary} onChange={(event) => setPreference("showBoundary", event.target.checked)} /> Límite municipal</label>
      </aside>}

      {activePanel && !pageIsMap && (
        <section className={`real-app-page ${section === "luminarias" && preferences.compactLuminaires ? "dense-list" : ""}`} key={section} aria-label={visibleNavigation.find((item) => item.id === section)?.label || "Usuarios"}>
          {activePanel()}
        </section>
      )}

      {settingsOpen && <>
        <button className="settings-scrim" type="button" aria-label="Cerrar ajustes" onClick={() => setSettingsOpen(false)} />
        <aside className="settings-drawer" aria-label="Ajustes de la aplicación">
          <div className="settings-drawer-heading"><span><small>PREFERENCIAS</small><strong>Ajustes</strong></span><button type="button" aria-label="Cerrar ajustes" onClick={() => setSettingsOpen(false)}><Icon name="close" size={18} /></button></div>
          {renderSettings()}
        </aside>
      </>}

      {mapFiltersOpen && <>
        <button className="settings-scrim" type="button" aria-label="Cerrar visibilidad del mapa" onClick={() => setMapFiltersOpen(false)} />
        <aside className="settings-drawer" aria-label="Configuración de visibilidad del mapa">
          <div className="settings-drawer-heading"><span><small>RENDIMIENTO</small><strong>Visibilidad</strong></span><button type="button" aria-label="Cerrar" onClick={() => setMapFiltersOpen(false)}><Icon name="close" size={18} /></button></div>
          {renderMapFilters()}
        </aside>
      </>}

      {performanceWarningOpen && <div className="performance-warning-backdrop" role="presentation">
        <section className="performance-warning" role="alertdialog" aria-modal="true" aria-labelledby="performance-warning-title" aria-describedby="performance-warning-copy">
          <span className="performance-warning-icon"><Icon name="filter" size={23} /></span>
          <h2 id="performance-warning-title">Mostrar todos los puntos</h2>
          <p id="performance-warning-copy">Cargar hasta 2.000 luminarias con todos los estados activos puede reducir notablemente la velocidad y estabilidad del mapa, especialmente en equipos con poca memoria.</p>
          <div className="performance-warning-actions"><button type="button" onClick={() => { setPerformanceWarningOpen(false); setPendingMapFilterSettings(null); }}>Volver</button><button type="button" onClick={confirmFullMap}>Continuar</button></div>
        </section>
      </div>}

      {requestToast > 0 && <div className="admin-request-toast" role="status"><span className="admin-request-toast-icon"><Icon name="users" size={19} /></span><div><strong>{requestToast} solicitud{requestToast === 1 ? " nueva" : "es nuevas"}</strong><small>Ya puedes revisar la bandeja de Usuarios.</small></div><button type="button" onClick={() => { setSection("usuarios"); setRequestToast(0); }}>Ver</button><button type="button" onClick={() => setRequestToast(0)} aria-label="Cerrar aviso"><Icon name="close" size={15} /></button></div>}
      {adminPendingAction && <SecurityPinDialog title="Confirma esta acción" description={`Verifica con tu PIN para ${adminPendingAction.action === "approve" ? "aprobar esta solicitud" : adminPendingAction.action === "reject" ? "rechazar esta solicitud" : "confirmar el cambio de cuenta"}.`} confirmationLabel="Confirma tu PIN" error={adminPinError} busy={adminBusyUserId !== null} onCancel={() => { setAdminPendingAction(null); setAdminPinError(""); }} onConfirm={confirmAdminAction} />}
      {profilePinDialogOpen && <SecurityPinDialog title="Confirma los cambios" description="Introduce tu PIN para guardar los cambios de tu perfil." confirmationLabel="Confirma tu PIN" error={profilePinError} busy={profileSaving} onCancel={() => setProfilePinDialogOpen(false)} onConfirm={saveProfileWithPin} />}
      {passwordPinDialogOpen && <SecurityPinDialog title="Confirma tu nueva contraseña" description="El PIN confirma que autorizas este cambio de contraseña." confirmationLabel="Confirma tu PIN" error={passwordError} busy={passwordSaving} onCancel={() => setPasswordPinDialogOpen(false)} onConfirm={changePasswordWithPin} />}

      {pageIsMap && <details className="map-source-label">
        <summary>Fuentes cartográficas · DANE · Esri</summary>
        <div className="map-source-details">
          <span>Límite municipal: DANE, Marco Geoestadístico Nacional 2024.</span>
          <span>{tileLayers[layer].attribution}</span>
        </div>
      </details>}

      <nav className="real-map-bottom-nav" aria-label="Navegación principal">
        {visibleNavigation.map((item) => (
          <button key={item.id} type="button" className={section === item.id ? "selected" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => { setSection(item.id); setUserMenuOpen(false); }}>
            <Icon name={item.icon} size={19} /><span>{item.label}</span>
            {item.id === "alertas" && reports.length > 0 && <i className="nav-count">{reports.length > 9 ? "9+" : reports.length}</i>}
            {item.id === "usuarios" && pendingAdminUsers.length > 0 && <i className="nav-count">{pendingAdminUsers.length > 9 ? "9+" : pendingAdminUsers.length}</i>}
          </button>
        ))}
      </nav>
    </main>
  );
}

export default MapDashboard;
