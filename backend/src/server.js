
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const db = require("./db");
const seedLuminaires = require("./data/luminaires-seed.json");
const app = express();
const adminInboxSessions = new Map();

const isAdministratorRole = (role) => ["admin", "administrador", "administrator", "admin_general", "admin_principal", "admin_sub", "admin_auxiliar"]
  .includes(String(role || "").trim().toLocaleLowerCase("es"));
const isPrincipalAdministrator = (role) => ["admin_general", "admin_principal"]
  .includes(String(role || "").trim().toLocaleLowerCase("es"));
const isAdministratorRequestRole = (role) => ["admin", "administrador", "administrator", "admin_sub", "admin_auxiliar", "admin_general", "admin_principal"].includes(String(role || "").trim().toLocaleLowerCase("es"));
const validSecurityPin = (pin) => typeof pin === "string" && /^\d{6}$/.test(pin);

const allowedFrontendOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      // Vite changes to the next port when its default port is already occupied.
      const isLocalViteOrigin =
        /^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/.test(origin || "");

      if (!origin || allowedFrontendOrigins.has(origin) || isLocalViteOrigin) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS."));
    },
  })
);

app.use(express.json());

// Comprobar servidor y base de datos
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      ok: true,
      message: "Servidor y base de datos conectados",
    });
  } catch (error) {
    console.error("Error de conexión:", error.message);

    res.status(500).json({
      ok: false,
      message: "No se pudo conectar con la base de datos",
    });
  }
});

// Registrar usuario
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, role, password, confirmPassword, securityPin, confirmSecurityPin } = req.body;

    if (!name || !email || !password || !confirmPassword || !securityPin || !confirmSecurityPin) {
      return res.status(400).json({
        message: "Completa todos los campos obligatorios.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    // Public registration must never grant administrator privileges.
    const cleanRole = "tecnico";

    if (cleanName.length < 3) {
      return res.status(400).json({
        message: "El nombre debe tener al menos 3 caracteres.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Introduce un correo electrónico válido.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 8 caracteres.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Las contraseñas no coinciden.",
      });
    }

    if (!validSecurityPin(securityPin) || securityPin !== confirmSecurityPin) {
      return res.status(400).json({ message: "El PIN debe tener seis dígitos y coincidir en ambos campos." });
    }

    await ensureUserAccountTables();
    await ensureSecurityTables();
    const [blockedEmails] = await db.query(
      "SELECT email FROM banned_emails WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (blockedEmails.length > 0) {
      return res.status(403).json({
        message: "Este correo no puede registrarse en Energy Star.",
      });
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Este correo electrónico ya está registrado.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [insertResult] = await db.query(
      `INSERT INTO users (name, email, role, password, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [cleanName, cleanEmail, cleanRole, hashedPassword]
    );
    const hashedPin = await bcrypt.hash(securityPin, 12);
    await db.query("INSERT INTO user_security_pins (user_id, pin_hash) VALUES (?, ?)", [insertResult.insertId, hashedPin]);
    const requestedRole = ["admin_sub", "admin_auxiliar"].includes(String(role || "").trim().toLowerCase()) ? "admin_sub" : "tecnico";
    await db.query("INSERT INTO user_role_requests (user_id, requested_role) VALUES (?, ?)", [insertResult.insertId, requestedRole]);

    return res.status(201).json({
      ok: true,
      message: "Registro completado. Tu cuenta está pendiente de aprobación.",
    });
  } catch (error) {
    console.error("Error en el registro:", error.message);

    return res.status(500).json({
      message: "No se pudo completar el registro.",
    });
  }
});

let userAccountTablesReady;

async function ensureUserAccountTables() {
  if (!userAccountTablesReady) {
    userAccountTablesReady = Promise.all([
      db.query(`
        CREATE TABLE IF NOT EXISTS user_account_controls (
          user_id BIGINT NOT NULL PRIMARY KEY,
          state ENUM('active', 'suspended', 'banned') NOT NULL DEFAULT 'active',
          suspended_until DATETIME NULL,
          reason VARCHAR(255) NULL,
          updated_by BIGINT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX user_account_controls_state_idx (state)
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS banned_emails (
          email VARCHAR(255) NOT NULL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          banned_by BIGINT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `),
    ]).catch((error) => {
      userAccountTablesReady = null;
      throw error;
    });
  }
  await userAccountTablesReady;
}

let securityTablesReady;
async function ensureSecurityTables() {
  if (!securityTablesReady) {
    securityTablesReady = Promise.all([
      db.query(`CREATE TABLE IF NOT EXISTS user_security_pins (
        user_id BIGINT NOT NULL PRIMARY KEY,
        pin_hash VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`),
      db.query(`CREATE TABLE IF NOT EXISTS user_role_requests (
        user_id BIGINT NOT NULL PRIMARY KEY,
        requested_role VARCHAR(32) NOT NULL DEFAULT 'tecnico',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      db.query(`CREATE TABLE IF NOT EXISTS user_pin_attempts (
        user_id BIGINT NOT NULL PRIMARY KEY,
        failed_attempts INT NOT NULL DEFAULT 0,
        locked_until DATETIME NULL
      )`),
    ]).catch((error) => { securityTablesReady = null; throw error; });
  }
  await securityTablesReady;
}

async function verifySecurityPin(userId, pin) {
  if (!validSecurityPin(pin)) {
    const error = new Error("Introduce tu PIN de seguridad de seis dígitos."); error.status = 400; throw error;
  }
  await ensureSecurityTables();
  const [rows] = await db.query(`SELECT pins.pin_hash AS pinHash, attempts.failed_attempts AS failedAttempts, attempts.locked_until AS lockedUntil
    FROM user_security_pins AS pins LEFT JOIN user_pin_attempts AS attempts ON attempts.user_id = pins.user_id
    WHERE pins.user_id = ? LIMIT 1`, [userId]);
  if (rows[0]?.lockedUntil && new Date(rows[0].lockedUntil).getTime() > Date.now()) {
    const error = new Error("Se hicieron varios intentos. Espera 15 minutos antes de volver a intentar."); error.status = 429; throw error;
  }
  if (!rows.length || !(await bcrypt.compare(pin, rows[0].pinHash))) {
    await db.query(`INSERT INTO user_pin_attempts (user_id, failed_attempts, locked_until)
      VALUES (?, 1, NULL)
      ON DUPLICATE KEY UPDATE failed_attempts = failed_attempts + 1,
        locked_until = IF(failed_attempts + 1 >= 5, DATE_ADD(NOW(), INTERVAL 15 MINUTE), locked_until)`, [userId]);
    const error = new Error("El PIN de seguridad no es correcto."); error.status = 401; throw error;
  }
  await db.query("INSERT INTO user_pin_attempts (user_id, failed_attempts, locked_until) VALUES (?, 0, NULL) ON DUPLICATE KEY UPDATE failed_attempts = 0, locked_until = NULL", [userId]);
}

async function verifyAdministrator(adminId, adminPassword, securityPin, { requirePin = true } = {}) {
  await ensureUserAccountTables();
  const [admins] = await db.query(
    `SELECT users.id, users.role, users.password, users.status,
            controls.state AS accountState, controls.suspended_until AS suspendedUntil
     FROM users
     LEFT JOIN user_account_controls AS controls ON controls.user_id = users.id
     WHERE users.id = ? LIMIT 1`,
    [adminId]
  );
  if (!admins.length || !isAdministratorRole(admins[0].role) || admins[0].status !== "approved") {
    const error = new Error("No tienes permisos de administrador.");
    error.status = 403;
    throw error;
  }
  if (admins[0].accountState === "banned" || (admins[0].accountState === "suspended" && (!admins[0].suspendedUntil || new Date(admins[0].suspendedUntil).getTime() > Date.now()))) {
    const error = new Error("La cuenta administradora está deshabilitada.");
    error.status = 403;
    throw error;
  }
  if (admins[0].accountState === "suspended") {
    await db.query("UPDATE user_account_controls SET state = 'active', suspended_until = NULL WHERE user_id = ?", [adminId]);
  }
  const passwordMatches = await bcrypt.compare(String(adminPassword || ""), admins[0].password);
  if (!passwordMatches) {
    const error = new Error("La contraseña de administrador no es correcta.");
    error.status = 401;
    throw error;
  }
  if (requirePin) await verifySecurityPin(adminId, securityPin);
  return admins[0];
}

let userProfilesTableReady;

async function ensureUserProfilesTable() {
  if (!userProfilesTableReady) {
    userProfilesTableReady = db.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id BIGINT NOT NULL PRIMARY KEY,
        profile_photo MEDIUMTEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP
      )
    `).catch((error) => {
      userProfilesTableReady = null;
      throw error;
    });
  }

  await userProfilesTableReady;
}

// Iniciar sesión
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, securityPin, confirmSecurityPin } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Introduce tu correo y contraseña.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    await ensureUserProfilesTable();
    await ensureUserAccountTables();

    const [users] = await db.query(
      `SELECT users.id, users.name, users.email, users.role,
              users.password, users.status,
              profile.profile_photo AS profilePhoto,
              controls.state AS accountState,
              controls.suspended_until AS suspendedUntil
       FROM users
       LEFT JOIN user_profiles AS profile ON profile.user_id = users.id
       LEFT JOIN user_account_controls AS controls ON controls.user_id = users.id
       WHERE users.email = ?`,
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Correo o contraseña incorrectos.",
      });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Correo o contraseña incorrectos.",
      });
    }

    await ensureSecurityTables();
    const [pinRows] = await db.query("SELECT pin_hash AS pinHash FROM user_security_pins WHERE user_id = ? LIMIT 1", [user.id]);
    if (!pinRows.length) {
      if (!validSecurityPin(securityPin) || securityPin !== confirmSecurityPin) {
        return res.status(428).json({ message: "Crea y confirma tu PIN de seguridad de seis dígitos.", requiresPinSetup: true });
      }
      const pinHash = await bcrypt.hash(securityPin, 12);
      await db.query("INSERT IGNORE INTO user_security_pins (user_id, pin_hash) VALUES (?, ?)", [user.id, pinHash]);
      const [savedPin] = await db.query("SELECT pin_hash AS pinHash FROM user_security_pins WHERE user_id = ? LIMIT 1", [user.id]);
      if (!savedPin.length || !(await bcrypt.compare(securityPin, savedPin[0].pinHash))) {
        return res.status(401).json({ message: "El PIN de seguridad no es correcto." });
      }
    } else {
      await verifySecurityPin(user.id, securityPin);
    }

    if (user.status !== "approved") {
      return res.status(403).json({
        message: "Tu cuenta está pendiente de aprobación.",
      });
    }

    if (user.accountState === "banned") {
      return res.status(403).json({ message: "Esta cuenta está bloqueada y no puede iniciar sesión." });
    }
    if (user.accountState === "suspended") {
      if (!user.suspendedUntil || new Date(user.suspendedUntil).getTime() > Date.now()) {
        const detail = user.suspendedUntil
          ? ` hasta ${new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(user.suspendedUntil))}`
          : " hasta que un administrador la reactive";
        return res.status(403).json({ message: `Tu cuenta está suspendida${detail}.` });
      }
      await db.query("UPDATE user_account_controls SET state = 'active', suspended_until = NULL WHERE user_id = ?", [user.id]);
    }

    const adminInboxToken = isAdministratorRole(user.role) ? crypto.randomBytes(32).toString("hex") : null;
    if (adminInboxToken) adminInboxSessions.set(adminInboxToken, { userId: user.id, expiresAt: Date.now() + 12 * 60 * 60 * 1000 });

    return res.json({
      ok: true,
      message: "Inicio de sesión exitoso.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        adminInboxToken,
      },
    });
  } catch (error) {
    console.error("Error en el inicio de sesión:", error.message);

    return res.status(error.status || 500).json({ message: error.status ? error.message : "No se pudo iniciar sesión." });
  }
});

app.post("/api/session/status", async (req, res) => {
  try {
    await ensureUserAccountTables();
    const [users] = await db.query(
      `SELECT users.status, controls.state AS accountState,
              controls.suspended_until AS suspendedUntil
       FROM users LEFT JOIN user_account_controls AS controls ON controls.user_id = users.id
       WHERE users.id = ? LIMIT 1`,
      [req.body.userId]
    );
    if (!users.length) return res.json({ ok: true, allowed: false, reason: "revoked" });
    const account = users[0];
    if (account.status !== "approved") return res.json({ ok: true, allowed: false, reason: "approval" });
    if (account.accountState === "banned") return res.json({ ok: true, allowed: false, reason: "banned" });
    if (account.accountState === "suspended") {
      if (!account.suspendedUntil || new Date(account.suspendedUntil).getTime() > Date.now()) {
        return res.json({ ok: true, allowed: false, reason: "suspended" });
      }
      await db.query("UPDATE user_account_controls SET state = 'active', suspended_until = NULL WHERE user_id = ?", [req.body.userId]);
    }
    return res.json({ ok: true, allowed: true });
  } catch (error) {
    console.error("Error al comprobar la sesión:", error.message);
    return res.status(500).json({ message: "No se pudo comprobar el estado de la cuenta." });
  }
});

app.post("/api/admin/users/list", async (req, res) => {
  try {
    await ensureSecurityTables();
    await ensureUserProfilesTable();
    await verifyAdministrator(req.body.adminId, req.body.adminPassword, undefined, { requirePin: false });
    const [users] = await db.query(`
      SELECT users.id, users.name, users.email, users.role,
             users.status AS approvalStatus,
             COALESCE(requests.requested_role, users.role) AS requestedRole,
             profiles.profile_photo AS profilePhoto,
             CASE
               WHEN controls.state = 'banned' THEN 'banned'
               WHEN controls.state = 'suspended' AND (controls.suspended_until IS NULL OR controls.suspended_until > NOW()) THEN 'suspended'
               ELSE 'active'
             END AS accountState,
             controls.suspended_until AS suspendedUntil,
             controls.reason
      FROM users
      LEFT JOIN user_account_controls AS controls ON controls.user_id = users.id
      LEFT JOIN user_profiles AS profiles ON profiles.user_id = users.id
      LEFT JOIN user_role_requests AS requests ON requests.user_id = users.id
      ORDER BY users.name ASC, users.id ASC
    `);
    return res.json({ ok: true, users });
  } catch (error) {
    console.error("Error al consultar usuarios administrables:", error.message);
    return res.status(error.status || 500).json({ message: error.status ? error.message : "No se pudieron cargar los usuarios." });
  }
});

app.get("/api/admin/requests", async (req, res) => {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const session = adminInboxSessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      adminInboxSessions.delete(token);
      return res.status(401).json({ message: "La sesión de administración expiró. Inicia sesión de nuevo." });
    }
    await ensureUserAccountTables();
    await ensureSecurityTables();
    const [admins] = await db.query(`SELECT users.role, users.status,
      controls.state AS accountState, controls.suspended_until AS suspendedUntil
      FROM users LEFT JOIN user_account_controls AS controls ON controls.user_id = users.id
      WHERE users.id = ? LIMIT 1`, [session.userId]);
    if (!admins.length || !isAdministratorRole(admins[0].role) || admins[0].status !== "approved" || admins[0].accountState === "banned" || (admins[0].accountState === "suspended" && (!admins[0].suspendedUntil || new Date(admins[0].suspendedUntil).getTime() > Date.now()))) {
      adminInboxSessions.delete(token);
      return res.status(403).json({ message: "No tienes acceso a estas solicitudes." });
    }
    const [requests] = await db.query(`SELECT users.id, users.name, users.email, users.role,
      users.status AS approvalStatus, COALESCE(role_requests.requested_role, users.role) AS requestedRole
      FROM users LEFT JOIN user_role_requests AS role_requests ON role_requests.user_id = users.id
      WHERE users.status = 'pending'
        AND (? = 1 OR LOWER(COALESCE(role_requests.requested_role, users.role)) NOT IN ('admin', 'administrador', 'administrator', 'admin_sub', 'admin_auxiliar', 'admin_general', 'admin_principal'))
      ORDER BY users.name ASC, users.id ASC`, [isPrincipalAdministrator(admins[0].role) ? 1 : 0]);
    return res.json({ ok: true, requests });
  } catch (error) {
    console.error("Error al cargar solicitudes nuevas:", error.message);
    return res.status(500).json({ message: "No se pudieron cargar las solicitudes." });
  }
});

app.delete("/api/admin/session", (req, res) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  adminInboxSessions.delete(token);
  return res.json({ ok: true });
});

app.patch("/api/admin/users/:userId", async (req, res) => {
  const targetId = Number(req.params.userId);
  const { adminId, adminPassword, securityPin, action, duration, reason } = req.body;
  let connection;
  try {
    const administrator = await verifyAdministrator(adminId, adminPassword, securityPin);
    if (!Number.isInteger(targetId) || targetId < 1) {
      return res.status(400).json({ message: "El usuario seleccionado no es válido." });
    }
    if (targetId === Number(adminId)) {
      return res.status(400).json({ message: "No puedes deshabilitar o eliminar tu propia cuenta administradora." });
    }
    if (!["suspend", "ban", "restore", "revoke", "approve", "reject", "promote_subadmin", "demote_subadmin"].includes(action)) {
      return res.status(400).json({ message: "La acción de administración no es válida." });
    }
    if (action === "suspend" && !["1d", "7d", "30d", "90d", "permanent"].includes(duration)) {
      return res.status(400).json({ message: "Elige una duración de suspensión válida." });
    }

    if (action === "revoke") await ensureUserProfilesTable();
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [targets] = await connection.query(
      `SELECT users.id, users.email, users.role,
              controls.state AS accountState
       FROM users LEFT JOIN user_account_controls AS controls ON controls.user_id = users.id
       WHERE users.id = ? LIMIT 1 FOR UPDATE`,
      [targetId]
    );
    if (!targets.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Ese usuario ya no existe." });
    }
    if (["approve", "reject", "promote_subadmin", "demote_subadmin"].includes(action)) {
      const [targetUsers] = await connection.query("SELECT status, role FROM users WHERE id = ? LIMIT 1 FOR UPDATE", [targetId]);
      if (action === "approve" || action === "reject") {
        if (targetUsers[0].status !== "pending") { await connection.rollback(); return res.status(409).json({ message: "Esta solicitud ya fue atendida." }); }
        const [requests] = await connection.query("SELECT requested_role AS requestedRole FROM user_role_requests WHERE user_id = ? LIMIT 1", [targetId]);
        const requestedRole = requests[0]?.requestedRole || "tecnico";
        if (action === "approve" && isAdministratorRequestRole(requestedRole) && !isPrincipalAdministrator(administrator.role)) {
          await connection.rollback(); return res.status(403).json({ message: "Solo el administrador general puede aprobar nuevos subadministradores." });
        }
        await connection.query("UPDATE users SET status = ?, role = ? WHERE id = ?", [action === "approve" ? "approved" : "rejected", action === "approve" && isAdministratorRequestRole(requestedRole) ? "admin_sub" : targetUsers[0].role, targetId]);
      } else {
        if (!isPrincipalAdministrator(administrator.role)) { await connection.rollback(); return res.status(403).json({ message: "Solo el administrador general puede cambiar permisos de administración." }); }
        if (isPrincipalAdministrator(targetUsers[0].role) || targetId === Number(adminId)) { await connection.rollback(); return res.status(403).json({ message: "No puedes cambiar el rol del administrador general ni el tuyo." }); }
        const nextRole = action === "promote_subadmin" ? "admin_sub" : "tecnico";
        await connection.query("UPDATE users SET role = ?, status = 'approved' WHERE id = ?", [nextRole, targetId]);
        await connection.query("INSERT INTO user_role_requests (user_id, requested_role) VALUES (?, ?) ON DUPLICATE KEY UPDATE requested_role = VALUES(requested_role)", [targetId, nextRole]);
      }
      await connection.commit();
      return res.json({ ok: true, message: action === "approve" ? "Solicitud aprobada." : action === "reject" ? "Solicitud rechazada." : action === "promote_subadmin" ? "Usuario asignado como subadministrador." : "Permisos de subadministrador retirados." });
    }
    if (isAdministratorRole(targets[0].role) && (!isPrincipalAdministrator(administrator.role) || isPrincipalAdministrator(targets[0].role))) {
      await connection.rollback();
      return res.status(403).json({ message: "Solo el administrador general puede administrar subadministradores." });
    }
    if (targets[0].accountState === "banned" && action !== "ban" && action !== "revoke") {
      await connection.rollback();
      return res.status(400).json({ message: "La cuenta está bloqueada permanentemente. Solo se puede conservar el bloqueo o revocar la cuenta." });
    }

    const cleanReason = typeof reason === "string" ? reason.trim().slice(0, 255) : "";
    if (action === "revoke") {
      await connection.query("DELETE FROM user_profiles WHERE user_id = ?", [targetId]);
      await connection.query("DELETE FROM user_account_controls WHERE user_id = ?", [targetId]);
      await connection.query("DELETE FROM user_security_pins WHERE user_id = ?", [targetId]);
      await connection.query("DELETE FROM user_role_requests WHERE user_id = ?", [targetId]);
      await connection.query("DELETE FROM users WHERE id = ?", [targetId]);
    } else if (action === "ban") {
      await connection.query(
        `INSERT INTO banned_emails (email, user_id, banned_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), banned_by = VALUES(banned_by)`,
        [targets[0].email.toLowerCase(), targetId, adminId]
      );
      await connection.query(
        `INSERT INTO user_account_controls (user_id, state, suspended_until, reason, updated_by)
         VALUES (?, 'banned', NULL, ?, ?)
         ON DUPLICATE KEY UPDATE state = 'banned', suspended_until = NULL, reason = VALUES(reason), updated_by = VALUES(updated_by)`,
        [targetId, cleanReason || "Bloqueo permanente por administrador", adminId]
      );
    } else if (action === "suspend") {
      const days = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 }[duration];
      const suspendedUntil = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
      await connection.query(
        `INSERT INTO user_account_controls (user_id, state, suspended_until, reason, updated_by)
         VALUES (?, 'suspended', ?, ?, ?)
         ON DUPLICATE KEY UPDATE state = 'suspended', suspended_until = VALUES(suspended_until), reason = VALUES(reason), updated_by = VALUES(updated_by)`,
        [targetId, suspendedUntil, cleanReason || null, adminId]
      );
    } else {
      if (targets[0].accountState === "banned") {
        await connection.rollback();
        return res.status(400).json({ message: "El bloqueo de correo es permanente y no puede levantarse desde esta pantalla." });
      }
      await connection.query(
        `INSERT INTO user_account_controls (user_id, state, suspended_until, reason, updated_by)
         VALUES (?, 'active', NULL, NULL, ?)
         ON DUPLICATE KEY UPDATE state = 'active', suspended_until = NULL, reason = NULL, updated_by = VALUES(updated_by)`,
        [targetId, adminId]
      );
    }

    await connection.commit();
    const actionMessages = {
      revoke: "Cuenta revocada y eliminada.",
      ban: "Cuenta bloqueada y correo reservado.",
      suspend: duration === "permanent" ? "Cuenta deshabilitada hasta que un administrador la reactive." : "Cuenta suspendida temporalmente.",
      restore: "Cuenta reactivada.",
    };
    return res.json({ ok: true, message: actionMessages[action] });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Error al administrar cuenta:", error.message);
    return res.status(error.status || 500).json({ message: error.status ? error.message : "No se pudo actualizar la cuenta." });
  } finally {
    connection?.release();
  }
});

app.put("/api/profile", async (req, res) => {
  const { userId, currentPassword, securityPin, name, email, profilePhoto } = req.body;
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPhoto = typeof profilePhoto === "string" && profilePhoto.length > 0
    ? profilePhoto
    : null;

  if (!userId || typeof currentPassword !== "string" || !currentPassword) {
    return res.status(400).json({
      message: "Confirma tu contraseña actual para guardar los cambios.",
    });
  }

  if (cleanName.length < 3 || cleanName.length > 120) {
    return res.status(400).json({
      message: "El nombre debe tener entre 3 y 120 caracteres.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ message: "Escribe un correo electrónico válido." });
  }

  if (
    cleanPhoto &&
    (cleanPhoto.length > 1_200_000 ||
      !/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/]+=*$/i.test(cleanPhoto))
  ) {
    return res.status(400).json({
      message: "La foto debe ser una imagen JPG, PNG o WebP de tamaño reducido.",
    });
  }

  let connection;
  try {
    await ensureUserProfilesTable();
    await ensureUserAccountTables();
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query(
      `SELECT users.id, users.role, users.password, users.status,
              controls.state AS accountState, controls.suspended_until AS suspendedUntil
       FROM users LEFT JOIN user_account_controls AS controls ON controls.user_id = users.id
       WHERE users.id = ? LIMIT 1 FOR UPDATE`,
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "No se encontró esta cuenta." });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, users[0].password);
    if (!passwordMatches) {
      await connection.rollback();
      return res.status(401).json({ message: "La contraseña actual no es correcta." });
    }
    try {
      await verifySecurityPin(userId, securityPin);
    } catch (error) {
      await connection.rollback();
      return res.status(error.status || 401).json({ message: error.message });
    }

    if (users[0].status !== "approved" || users[0].accountState === "banned" || (users[0].accountState === "suspended" && (!users[0].suspendedUntil || new Date(users[0].suspendedUntil).getTime() > Date.now()))) {
      await connection.rollback();
      return res.status(403).json({ message: "Esta cuenta está deshabilitada y no puede editar su perfil." });
    }

    const [emailOwners] = await connection.query(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [cleanEmail, userId]
    );

    if (emailOwners.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "Ese correo ya está asociado a otra cuenta." });
    }

    await connection.query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [cleanName, cleanEmail, userId]
    );
    await connection.query(
      `INSERT INTO user_profiles (user_id, profile_photo)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE profile_photo = VALUES(profile_photo)`,
      [userId, cleanPhoto]
    );

    await connection.commit();

    return res.json({
      ok: true,
      message: "Perfil actualizado.",
      user: {
        id: users[0].id,
        name: cleanName,
        email: cleanEmail,
        role: users[0].role,
        profilePhoto: cleanPhoto,
      },
    });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Error al actualizar el perfil:", error.message);
    return res.status(500).json({ message: "No se pudo actualizar el perfil." });
  } finally {
    connection?.release();
  }
});

app.put("/api/password", async (req, res) => {
  const { userId, currentPassword, newPassword, confirmPassword, securityPin } = req.body;
  if (!userId || !currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ message: "Completa todos los campos de contraseña." });
  if (String(newPassword).length < 8) return res.status(400).json({ message: "La nueva contraseña debe tener al menos 8 caracteres." });
  if (newPassword !== confirmPassword) return res.status(400).json({ message: "La confirmación no coincide con la nueva contraseña." });
  try {
    const [users] = await db.query("SELECT password, status FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!users.length || users[0].status !== "approved") return res.status(404).json({ message: "No se encontró una cuenta activa." });
    if (!(await bcrypt.compare(currentPassword, users[0].password))) return res.status(401).json({ message: "La contraseña actual no es correcta." });
    await verifySecurityPin(userId, securityPin);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [passwordHash, userId]);
    return res.json({ ok: true, message: "La contraseña se actualizó correctamente." });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.status ? error.message : "No se pudo cambiar la contraseña." });
  }
});

let reportsTableReady;

async function ensureReportsTable() {
  if (!reportsTableReady) {
    reportsTableReady = db.query(`
      CREATE TABLE IF NOT EXISTS incident_reports (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        luminaire_id VARCHAR(64) NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        severity ENUM('review', 'critical') NOT NULL DEFAULT 'review',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX incident_reports_created_at_idx (created_at),
        INDEX incident_reports_user_id_idx (user_id),
        INDEX incident_reports_luminaire_id_idx (luminaire_id)
      )
    `).then(async () => {
      const [columns] = await db.query("SHOW COLUMNS FROM incident_reports LIKE 'luminaire_id'");
      if (columns.length === 0) {
        await db.query("ALTER TABLE incident_reports ADD COLUMN luminaire_id VARCHAR(64) NULL");
        await db.query("CREATE INDEX incident_reports_luminaire_id_idx ON incident_reports (luminaire_id)");
      }
    }).catch((error) => {
      reportsTableReady = null;
      throw error;
    });
  }

  await reportsTableReady;
}

let luminairesTableReady;

async function ensureLuminairesTable() {
  if (!luminairesTableReady) {
    luminairesTableReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS public_luminaires (
          luminaire_id VARCHAR(64) NOT NULL PRIMARY KEY,
          latitude DECIMAL(10, 7) NOT NULL,
          longitude DECIMAL(10, 7) NOT NULL,
          status ENUM('active', 'review', 'critical') NOT NULL DEFAULT 'review',
          sector VARCHAR(160) NOT NULL,
          luminaire_type VARCHAR(120) NOT NULL,
          power_w SMALLINT UNSIGNED NULL,
          observations TEXT NULL,
          is_synthetic TINYINT(1) NOT NULL DEFAULT 1,
          is_within_municipality TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const batchSize = 250;
      for (let start = 0; start < seedLuminaires.length; start += batchSize) {
        const batch = seedLuminaires.slice(start, start + batchSize).map((luminaire) => [
          luminaire.id,
          luminaire.latitude,
          luminaire.longitude,
          luminaire.status,
          luminaire.sector,
          luminaire.luminaireType,
          luminaire.powerW,
          luminaire.observations,
          luminaire.isSynthetic ? 1 : 0,
          luminaire.isWithinMunicipality ? 1 : 0,
        ]);
        await db.query(
          `INSERT IGNORE INTO public_luminaires
            (luminaire_id, latitude, longitude, status, sector, luminaire_type, power_w,
             observations, is_synthetic, is_within_municipality)
           VALUES ?`,
          [batch]
        );
      }
    })().catch((error) => {
      luminairesTableReady = null;
      throw error;
    });
  }

  await luminairesTableReady;
}

const sanPelayoBounds = {
  south: 8.9042864,
  north: 9.0731037,
  west: -76.1109512,
  east: -75.6990770,
};

app.get("/api/luminaires", async (_req, res) => {
  try {
    await ensureLuminairesTable();
    const [luminaires] = await db.query(`
      SELECT
        luminaire_id AS id,
        latitude AS lat,
        longitude AS lng,
        status,
        sector,
        luminaire_type AS type,
        power_w AS powerW,
        observations,
        is_synthetic AS isSynthetic,
        is_within_municipality AS isWithinMunicipality
      FROM public_luminaires
      ORDER BY luminaire_id ASC
    `);
    return res.json({ ok: true, luminaires });
  } catch (error) {
    console.error("Error al consultar las luminarias:", error.message);
    return res.status(500).json({ message: "No se pudo cargar el catálogo de luminarias." });
  }
});

app.get("/api/reports", async (_req, res) => {
  try {
    await ensureLuminairesTable();
    await ensureReportsTable();

    const [reports] = await db.query(`
      SELECT
        report.id,
        report.user_id AS userId,
        report.luminaire_id AS luminaireId,
        luminaire.sector AS luminaireSector,
        COALESCE(users.name, 'Usuario') AS reporterName,
        report.category,
        report.description,
        report.latitude,
        report.longitude,
        report.severity,
        report.created_at AS createdAt
      FROM incident_reports AS report
      LEFT JOIN users ON users.id = report.user_id
      LEFT JOIN public_luminaires AS luminaire ON luminaire.luminaire_id = report.luminaire_id
      ORDER BY report.created_at DESC, report.id DESC
      LIMIT 100
    `);

    return res.json({ ok: true, reports });
  } catch (error) {
    console.error("Error al consultar los reportes:", error.message);
    return res.status(500).json({
      message: "No se pudieron cargar los reportes.",
    });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const { userId, luminaireId, category, description, severity } = req.body;
    const cleanCategory = typeof category === "string" ? category.trim() : "";
    const cleanDescription = typeof description === "string" ? description.trim() : "";
    const reportSeverity = severity === "critical" ? "critical" : "review";

    if (!userId || !cleanCategory || cleanDescription.length < 5) {
      return res.status(400).json({
        message: "Completa el tipo de novedad y una descripción de al menos cinco caracteres.",
      });
    }

    if (!luminaireId || typeof luminaireId !== "string") {
      return res.status(400).json({ message: "Selecciona una luminaria del catálogo para asociarla al reporte." });
    }

    await ensureLuminairesTable();
    const [luminaires] = await db.query(
      `SELECT latitude, longitude, is_within_municipality
       FROM public_luminaires WHERE luminaire_id = ? LIMIT 1`,
      [luminaireId]
    );
    if (luminaires.length === 0) {
      return res.status(404).json({ message: "No se encontró la luminaria seleccionada." });
    }
    if (!luminaires[0].is_within_municipality) {
      return res.status(400).json({ message: "La ubicación de esta luminaria requiere corrección antes de reportar." });
    }
    const reportLatitude = Number(luminaires[0].latitude);
    const reportLongitude = Number(luminaires[0].longitude);

    if (reportLatitude < sanPelayoBounds.south || reportLatitude > sanPelayoBounds.north || reportLongitude < sanPelayoBounds.west || reportLongitude > sanPelayoBounds.east) {
      return res.status(400).json({ message: "La luminaria está fuera de los límites del municipio." });
    }

    await ensureUserAccountTables();
    const [users] = await db.query(
      `SELECT users.id, users.status,
              controls.state AS accountState,
              controls.suspended_until AS suspendedUntil
       FROM users LEFT JOIN user_account_controls AS controls ON controls.user_id = users.id
       WHERE users.id = ? LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "No se encontró el usuario que crea el reporte.",
      });
    }

    const reporter = users[0];
    if (reporter.status !== "approved" || reporter.accountState === "banned" || (reporter.accountState === "suspended" && (!reporter.suspendedUntil || new Date(reporter.suspendedUntil).getTime() > Date.now()))) {
      return res.status(403).json({ message: "Esta cuenta está deshabilitada y no puede enviar reportes." });
    }

    await ensureReportsTable();

    const [result] = await db.query(
      `INSERT INTO incident_reports
        (user_id, luminaire_id, category, description, latitude, longitude, severity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        luminaireId,
        cleanCategory.slice(0, 100),
        cleanDescription.slice(0, 2000),
        reportLatitude,
        reportLongitude,
        reportSeverity,
      ]
    );

    const [createdReports] = await db.query(`
      SELECT
        report.id,
        report.user_id AS userId,
        report.luminaire_id AS luminaireId,
        luminaire.sector AS luminaireSector,
        COALESCE(users.name, 'Usuario') AS reporterName,
        report.category,
        report.description,
        report.latitude,
        report.longitude,
        report.severity,
        report.created_at AS createdAt
      FROM incident_reports AS report
      LEFT JOIN users ON users.id = report.user_id
      LEFT JOIN public_luminaires AS luminaire ON luminaire.luminaire_id = report.luminaire_id
      WHERE report.id = ?
      LIMIT 1
    `, [result.insertId]);

    return res.status(201).json({
      ok: true,
      report: createdReports[0],
    });
  } catch (error) {
    console.error("Error al guardar el reporte:", error.message);
    return res.status(500).json({
      message: "No se pudo guardar el reporte.",
    });
  }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Servidor Energy Star: http://localhost:${PORT}`);
});
