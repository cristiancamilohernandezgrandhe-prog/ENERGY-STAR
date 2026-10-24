
import { useEffect, useState } from "react";
import "./App.css";
import Login from "./Login";
import Register from "./Register";
import LoadingScreen from "./LoadingScreen";
import EnergyStarLogo from "./EnergyStarLogo";
import MapDashboard from "./MapDashboardReal";

function App() {
  const [screen, setScreen] = useState("welcome");
  const [transitioning, setTransitioning] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (screen !== "loading") return undefined;

    const timer = window.setTimeout(() => setScreen("home"), 5000);
    return () => window.clearTimeout(timer);
  }, [screen]);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setScreen("loading");
  };

  const handleLogout = () => {
    if (user?.adminInboxToken) {
      fetch("/api/admin/session", { method: "DELETE", headers: { Authorization: `Bearer ${user.adminInboxToken}` } }).catch(() => {});
    }
    setUser(null);
    setScreen("welcome");
  };

  const navigateTo = (nextScreen) => {
    if (transitioning || nextScreen === screen) return;

    setTransitioning(true);

    window.setTimeout(() => {
      setScreen(nextScreen);
      setTransitioning(false);
    }, 180);
  };

  return (
    <div className="app-shell">
      <div
        className={`app-screen ${
          transitioning ? "app-screen-exiting" : "app-screen-entering"
        }`}
        key={screen}
      >
        {screen === "welcome" && (
          <main className="welcome-screen">
            <div className="ambient ambient-one" />
            <div className="ambient ambient-two" />

            <section className="welcome-card">
              <div className="brand-panel">
                <div className="brand-topline">
                  <span className="status-dot" />
                  SISTEMA DE ENERGÍA INTELIGENTE
                </div>

                <div className="brand-identity">
                  <div className="energy-logo"><EnergyStarLogo /></div>
                </div>

                <div className="brand-footer">
                  <span className="footer-line" />
                  SAN PELAYO · CÓRDOBA · COLOMBIA
                </div>
              </div>

              <div className="access-panel">
                <div className="access-content">
                  <span className="eyebrow">
                    <span className="status-dot" />
                    CONTROL · EFICIENCIA · INNOVACIÓN
                  </span>

                  <h1>
                    La energía
                    <br />
                    <span>cobra vida.</span>
                  </h1>

                  <p className="intro">
                    Tecnología para iluminar mejor, gestionar con inteligencia
                    y conectar cada punto de luz de San Pelayo.
                  </p>

                  <div className="access-divider" />

                  <p className="access-description">
                    Plataforma de monitoreo y gestión del alumbrado público.
                    Más control, mayor eficiencia y una comunidad mejor
                    iluminada.
                  </p>

                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => navigateTo("login")}
                  >
                    <span>ACCEDER AL SISTEMA</span>
                    <span aria-hidden="true">↗</span>
                  </button>

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => navigateTo("register")}
                  >
                    <span>CREAR UNA CUENTA</span>
                    <span aria-hidden="true">＋</span>
                  </button>

                  <div className="security-note">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 3 20 6V11C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 11V6L12 3Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M9 12 11 14 15 10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    Sistema diseñado para una gestión responsable y segura.
                  </div>

                  <div className="panel-copyright">
                    © {new Date().getFullYear()} ENERGY STAR · TODOS LOS
                    DERECHOS RESERVADOS
                  </div>
                </div>
              </div>
            </section>
          </main>
        )}

        {screen === "login" && (
          <Login onBack={() => navigateTo("welcome")} onLogin={handleLogin} />
        )}

        {screen === "loading" && <LoadingScreen />}

        {screen === "home" && <MapDashboard user={user} onLogout={handleLogout} onProfileUpdated={setUser} />}
        {screen === "register" && (
          <Register onBack={() => navigateTo("welcome")} />
        )}
      </div>
    </div>
  );
}

export default App;




