import { useState } from "react";
import "./SecurityPinDialog.css";

export default function SecurityPinDialog({ title = "Verificación de seguridad", description = "Confirma tu PIN de seguridad de seis dígitos.", onConfirm, onCancel, busy = false, error = "", confirmationLabel = "Confirmar PIN" }) {
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(pin) || !/^\d{6}$/.test(confirmation)) return;
    if (pin !== confirmation) return;
    onConfirm(pin, confirmation);
  };
  return (
    <div className="security-pin-overlay" role="presentation">
      <form className="security-pin-dialog" role="dialog" aria-modal="true" aria-labelledby="security-pin-title" onSubmit={submit}>
        <span className="security-pin-icon" aria-hidden="true">✦</span>
        <span className="security-pin-eyebrow">ENERGY STAR · ACCESO SEGURO</span>
        <h2 id="security-pin-title">{title}</h2>
        <p>{description}</p>
        <label>PIN de seis dígitos<input autoFocus inputMode="numeric" type="password" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label>
        <label>{confirmationLabel}<input inputMode="numeric" type="password" pattern="[0-9]{6}" maxLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label>
        {pin && confirmation && pin !== confirmation && <span className="security-pin-error">Los PIN no coinciden.</span>}
        {error && <span className="security-pin-error" role="alert">{error}</span>}
        <div className="security-pin-actions"><button type="button" onClick={onCancel} disabled={busy}>Cancelar</button><button type="submit" disabled={busy || pin.length !== 6 || confirmation.length !== 6 || pin !== confirmation}>{busy ? "Verificando…" : "Confirmar"}</button></div>
      </form>
    </div>
  );
}
