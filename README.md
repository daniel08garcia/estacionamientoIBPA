# Estacionamiento IBPA

Aplicación React + TypeScript + Vite para gestión de etiquetas QR de estacionamiento.

## Publicar en GitHub Pages

Este repositorio ya incluye un workflow en `.github/workflows/deploy-pages.yml` que despliega automáticamente al hacer push a `main` o `master`.

### 1) Habilitar GitHub Pages en el repositorio

En GitHub, abre **Settings → Pages** y en **Build and deployment** selecciona:

- **Source:** GitHub Actions

### 2) Ejecutar despliegue

- Haz push a `main` o `master`, o
- Ejecuta manualmente el workflow **Deploy to GitHub Pages** desde la pestaña **Actions**.

### 3) URL de publicación

La app quedará publicada en:

`https://<tu-usuario>.github.io/estacionamientoIBPA/`

## Desarrollo local

```bash
npm ci
npm run dev
```

## Build local

```bash
npm run build
npm run preview
```
