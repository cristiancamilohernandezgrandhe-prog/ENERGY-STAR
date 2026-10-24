# Energy Star

Aplicación web para consultar luminarias y gestionar reportes de alumbrado público de San Pelayo, Córdoba.

## Requisitos

- Node.js y npm
- MySQL con una base de datos llamada `energy_star`

## Preparar la base de datos

Ejecuta `backend/src/data/schema.sql` en MySQL. Luego copia `backend/src/.env.example` como `backend/src/.env` y completa los datos de conexión. El archivo `.env` contiene credenciales locales y no se publica.

## Instalar y ejecutar

Desde la carpeta `backend`, instala e inicia el servidor:

```powershell
npm install
npm start
```

En otra terminal, desde `frontend`:

```powershell
npm install
npm run dev
```

Abre la dirección local que muestre Vite. El frontend envía las solicitudes API al puerto 3001 del backend.

También puedes usar `frontend/Iniciar Energy Star.bat` en Windows para abrir ambos servicios.
