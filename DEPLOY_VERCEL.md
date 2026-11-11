# 🚀 Guía de Despliegue en Vercel — LogicLab

Este proyecto está 100% configurado y listo para ser desplegado en **Vercel** en menos de 2 minutos.

---

## 🛠️ Configuración Incluida

- **`vercel.json`**: Configura el framework (`vite`), la carpeta de salida (`dist`), el comando de build (`npm run build`) y las reglas de reescritura SPA (`rewrites: [ { "source": "/(.*)", "destination": "/index.html" } ]`) para que las rutas internas y recargas funcionen sin error 404.
- **Optimización de caché**: Cabeceras `Cache-Control` inmutables de 1 año para los assets empaquetados (`/assets/*`) y revalidación inmediata para el `index.html`.
- **Compatibilidad ESM**: `vite.config.ts` ajustado para Vite 8 sin advertencias.
- **`.gitignore`**: Ignora `.vercel`, `dist` y variables de entorno privadas.

---

## Opción 1: Despliegue con GitHub y Vercel Dashboard (Recomendado)

1. **Sube tu código a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: LogicLab configurado para Vercel"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/logiclab.git
   git push -u origin main
   ```

2. **Entra a Vercel**:
   - Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
   - Pulsa **"Add New..."** → **"Project"**.
   - Selecciona el repositorio `logiclab`.

3. **Verifica la configuración del proyecto en Vercel**:
   - **Framework Preset**: `Vite` (se detectará automáticamente gracias a `vercel.json`).
   - **Root Directory**: `./` (raíz).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Variables de entorno (Opcional)**:
   - Si utilizas funcionalidades que requieran la API de Gemini (como el asistente de IA en servidor), agrega en la sección **Environment Variables**:
     - `GEMINI_API_KEY`: Tu clave de Google Gemini API.
   - *(El simulador lógico, tablas de verdad, mapas de Karnaugh, Quine-McCluskey, subcircuitos y prácticas funcionan 100% en el cliente sin requerir variables obligatorias).*

5. Haz clic en **"Deploy"**. En ~30 segundos tendrás tu enlace público de producción (ej. `https://logiclab-digital-simulator.vercel.app`).

---

## Opción 2: Despliegue directo desde la Terminal con Vercel CLI

Si tienes instalado Node.js en tu equipo:

1. **Instala la CLI de Vercel**:
   ```bash
   npm i -g vercel
   ```

2. **Inicia sesión y despliega**:
   ```bash
   vercel
   ```
   Sigue las instrucciones interactivas:
   - *Set up and deploy?* `Y`
   - *Which scope?* Tu cuenta de Vercel
   - *Link to existing project?* `N`
   - *Project name?* `logiclab`
   - *In which directory is your code located?* `./`

3. **Para desplegar a producción definitiva**:
   ```bash
   vercel --prod
   ```

---

## 🔍 Comprobaciones previas al despliegue

Puedes verificar que la compilación y los tests pasen localmente ejecutando:
```bash
# Comprobar tipos TypeScript
npm run lint

# Ejecutar suite de pruebas unitarias
npm run test

# Probar la compilación para producción
npm run build

# Probar la vista previa local de la compilación de producción
npm run preview
```
