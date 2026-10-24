
import { useState } from "react";
import "./Register.css";
import SecurityPinDialog from "./SecurityPinDialog";

function Register({ onBack }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "tecnico",
    password: "",
    confirmPassword: "",
    accepted: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinError, setPinError] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    // Validar el nombre.
    if (form.name.trim().length < 3) {
      setError("Escribe tu nombre completo.");
      return;
    }

    // Validar el correo.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(form.email.trim())) {
      setError("Escribe un correo electrónico válido.");
      return;
    }

    // Validar la contraseña.
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!form.accepted) {
      setError("Debes aceptar las condiciones de uso.");
      return;
    }

    setPinError("");
    setPinDialogOpen(true);
  };

  const submitRegistration = async (securityPin, confirmSecurityPin) => {
    setLoading(true);

    try {
      // Enviar los datos al servidor.
      const response = await fetch(
        "/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            role: form.role,
            password: form.password,
            confirmPassword: form.confirmPassword,
            securityPin,
            confirmSecurityPin,
          }),
        }
      );

      // Leer la respuesta del servidor.
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

      // Mostrar la pantalla de éxito.
      setPinDialogOpen(false);
      setSuccess(true);
    } catch (err) {
      console.error("Error de registro:", err);

      setPinError(
        err.message === "Failed to fetch"
          ? "No se pudo conectar con el servidor. Comprueba que esté iniciado."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  // Pantalla que aparece cuando el registro funciona.
  if (success) {
    return (
      <main className="register-screen">
        <section className="register-card register-message">
          <div className="register-icon">✓</div>

          <span className="register-eyebrow">ENERGY STAR</span>

          <h1>Solicitud enviada</h1>

          <p>
            Tu cuenta se registró correctamente y está pendiente
            de aprobación por un administrador autorizado.
          </p>

          <button
            className="register-primary"
            type="button"
            onClick={onBack}
          >
            Volver al acceso
          </button>
        </section>
      </main>
    );
  }

  // Formulario de registro.
  return (
    <main className="register-screen">
      <section className="register-card">
        <button
          className="register-back"
          type="button"
          onClick={onBack}
        >
          ← Volver
        </button>

        <div className="register-heading">
          <span className="register-eyebrow">
            ENERGY STAR · ACCESO RESTRINGIDO
          </span>

          <h1>Solicitar una cuenta</h1>

          <p>
            Completa tus datos para solicitar acceso al sistema
            de monitoreo de alumbrado público.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="register-name">
            Nombre completo
          </label>

          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Tu nombre completo"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="register-email">
            Correo electrónico
          </label>

          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="usuario@institucion.com"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="register-role">Tipo de solicitud</label>
          <select id="register-role" name="role" value={form.role} onChange={handleChange}>
            <option value="tecnico">Técnico</option>
            <option value="admin_sub">Subadministrador (requiere aprobación general)</option>
          </select>
          <div className="register-role-note">Toda cuenta queda pendiente de aprobación. El acceso administrativo solo lo puede conceder el administrador general.</div>

          <label htmlFor="register-password">
            Contraseña
          </label>

          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            required
          />

          <label htmlFor="register-confirm">
            Confirmar contraseña
          </label>

          <input
            id="register-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <label className="register-terms">
            <input
              name="accepted"
              type="checkbox"
              checked={form.accepted}
              onChange={handleChange}
            />

            <span>
              Acepto las condiciones de uso y las políticas
              de seguridad del sistema.
            </span>
          </label>

          {error && (
            <p className="register-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="register-primary"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Enviando solicitud..."
              : "Enviar solicitud →"}
          </button>

          <p className="register-notice">
            Las cuentas y los permisos deberán ser aprobados
            por un administrador autorizado.
          </p>
        </form>
      </section>
      {pinDialogOpen && <SecurityPinDialog title="Protege tu cuenta" description="Crea un PIN personal de seis dígitos. Se guardará cifrado y se pedirá al iniciar sesión y confirmar acciones sensibles." confirmationLabel="Confirma tu PIN" busy={loading} error={pinError} onCancel={() => setPinDialogOpen(false)} onConfirm={submitRegistration} />}
    </main>
  );
}

export default Register;
