
import { useState } from "react";
import "./Login.css";
import EnergyStarLogo from "./EnergyStarLogo";
import SecurityPinDialog from "./SecurityPinDialog";

function Login({ onBack, onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinError, setPinError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setPinError("");
    setPinDialogOpen(true);
  };

  const submitWithSecurityPin = async (securityPin, confirmSecurityPin) => {
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, securityPin, confirmSecurityPin }),
      });

      const responseText = await response.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "No se pudo conectar con el servidor de Energy Star. Comprueba que el backend esté iniciado."
        );
      }

      if (!data.user) {
        throw new Error("El servidor respondió sin los datos del usuario.");
      }

      setPinDialogOpen(false);
      onLogin(data.user);
    } catch (err) {
      setPinError(
        err.message === "Failed to fetch"
          ? "No se pudo conectar con el servidor. Comprueba que esté encendido."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <div className="login-orb login-orb-one" aria-hidden="true" />
      <div className="login-orb login-orb-two" aria-hidden="true" />
      <div className="login-orb login-orb-three" aria-hidden="true" />

      <section className="login-layout">
        <aside className="login-brand-panel">
          <div className="login-brand-topbar">
            <button
              className="login-back-button"
              type="button"
              onClick={onBack}
              aria-label="Volver a la bienvenida"
            >
              <span aria-hidden="true">←</span> Volver
            </button>
          </div>

          <div className="login-brand-mark">
            <EnergyStarLogo className="login-logo" />
          </div>

          <div className="login-brand">
            <div className="login-brand-divider" />

            <p>
              SISTEMA INTELIGENTE
              <br />
              DE ALUMBRADO PÚBLICO
            </p>
          </div>

          <div className="login-brand-description">
            <span className="login-status-dot" />
            <span>PLATAFORMA DE MONITOREO</span>

            <h2>
              Iluminamos
              <br />
              <span>el camino.</span>
            </h2>

            <p>
              Tecnología para supervisar y gestionar el alumbrado
              público de San Pelayo, Córdoba, de forma inteligente.
            </p>
          </div>

          <div className="login-brand-footer">
            <span>ENERGY STAR</span>
            <span aria-hidden="true">•</span>
            <span>SAN PELAYO, CÓRDOBA</span>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-form-content">
            <div className="login-private-label">
              <svg
                className="login-small-icon login-lock-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 10V7a5 5 0 0 1 10 0v3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <rect
                  x="4"
                  y="10"
                  width="16"
                  height="11"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <circle cx="12" cy="15" r="1.3" fill="currentColor" />
              </svg>
              ACCESO SEGURO
            </div>

            <header className="login-heading">
              <span className="login-eyebrow">BIENVENIDO DE NUEVO</span>
              <h1>
                Inicia <span>sesión.</span>
              </h1>
              <p>
                Ingresa tus credenciales para acceder a la plataforma
                de gestión del alumbrado público.
              </p>
            </header>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="login-email">Correo electrónico</label>

                <div className="login-input-wrapper">
                  <svg
                    className="login-input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="m4 7 8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Contraseña</label>

                <div className="login-input-wrapper">
                  <svg
                    className="login-input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M8 10V7a4 4 0 0 1 8 0v3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="15" r="1.3" fill="currentColor" />
                  </svg>

                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />

                  <button
                    className="login-show-password"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <svg className="login-eye-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 3 21 21M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.7 9.5 6-.3.6-1.4 2.2-3.1 3.6M6.2 6.2C4.2 7.5 2.9 9.6 2.5 11c.7 1.3 4.3 6 9.5 6 1 0 2-.2 2.9-.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg className="login-eye-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="login-form-options">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span className="login-custom-checkbox" />
                  <span>Recordarme</span>
                </label>

                <button
                  className="login-forgot-button"
                  type="button"
                  onClick={() =>
                    alert(
                      "La recuperación de contraseña se implementará más adelante."
                    )
                  }
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {error && (
                <p className="login-error" role="alert">
                  {error}
                </p>
              )}

              <button
                className="login-submit-button"
                type="submit"
                disabled={loading}
              >
                <span>{loading ? "Verificando..." : "Iniciar sesión"}</span>
                <span className="login-submit-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            </form>

            <div className="login-security-note">
              <svg
                className="login-small-icon login-security-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 3 5 6v5c0 4.5 2.9 7.8 7 10 4.1-2.2 7-5.5 7-10V6l-7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <p>
                Acceso exclusivo para personal autorizado.
                <br />
                Protege tus credenciales y no las compartas.
              </p>
            </div>
          </div>

          <footer className="login-form-footer">
            <span>© 2026 ENERGY STAR</span>
            <span className="login-footer-separator" aria-hidden="true">
              •
            </span>
            <span>Sistema de alumbrado público</span>
          </footer>
        </section>
      </section>
      {pinDialogOpen && <SecurityPinDialog title="Confirma tu inicio de sesión" description="Introduce el PIN de seis dígitos que configuraste al registrar tu cuenta." confirmationLabel="Confirma el PIN" busy={loading} error={pinError} onCancel={() => setPinDialogOpen(false)} onConfirm={submitWithSecurityPin} />}
    </main>
  );
}

export default Login;









