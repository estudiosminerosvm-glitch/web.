# ⬡ MINERALBOARD — Sistema Completo

## Cómo fluyen los datos (IMPORTANTE)

```
 OPCIÓN A (Manual)          OPCIÓN B (Python)         OPCIÓN C (Apps Script)
 ─────────────────          ─────────────────         ──────────────────────
 Tú abres                   scraper_minerales.py      google_apps_script.js
 Investing.com              corre en tu PC             corre DENTRO de
 y copias precios           cada 30-60 segundos        Google Sheets
 a Google Sheets            descarga de:               cada 1 hora
                            • Investing.com            descarga de:
                            • FRED                     • FRED
                            • Metals.dev API           • GOOGLEFINANCE
                            • MetalpriceAPI
                                    │                          │
                                    ▼                          ▼
                          ┌─────────────────────────────────────┐
                          │         GOOGLE SHEETS               │
                          │    (Hoja "Datos" con precios)       │
                          │                                     │
                          │  Publicada como CSV en:             │
                          │  https://docs.google.com/.../csv    │
                          └──────────────┬──────────────────────┘
                                         │
                                    cada 30 seg
                                         │
                                         ▼
                          ┌─────────────────────────────────────┐
                          │      DASHBOARD (index.html)         │
                          │   En GitHub Pages — público         │
                          │                                     │
                          │   Lee el CSV de Google Sheets       │
                          │   Muestra gráficos de velas/línea   │
                          │   Simula micro-variaciones cada 1s  │
                          │   Indicador: 🟢 Sheets / 🟡 Simulado│
                          └─────────────────────────────────────┘
                                         │
                                         ▼
                              Cualquier persona con
                              el link puede ver los
                              precios en su navegador
```

## Archivos

| Archivo | Qué es | Dónde va |
|---------|--------|----------|
| `index.html` | Dashboard visual | GitHub Pages (raíz del repo) |
| `scraper_minerales.py` | Motor Python que descarga precios | Tu PC (corre en background) |
| `google_apps_script.js` | Auto-actualización dentro de Sheets | Google Sheets → Apps Script |
| `MineralBoard_InvestingCom.xlsx` | Excel base con 10 minerales | Importar a Google Sheets |

## Pasos para configurar

### 1. Google Sheets
- Crea hoja nueva en sheets.google.com
- Importa `MineralBoard_InvestingCom.xlsx` (o crea hoja "Datos" con encabezados)
- **Archivo → Compartir → Publicar en la web → CSV → Publicar**
- Copia la URL generada

### 2. Apps Script (Opción C — sin PC)
- En Google Sheets: **Extensiones → Apps Script**
- Pega el código de `google_apps_script.js`
- Ejecuta `configurarTodo()` una vez
- Los precios se actualizan solos cada hora

### 3. Dashboard en GitHub Pages
- Crea repositorio en GitHub
- Sube `index.html`
- Edita la línea `const SHEET_URL = '...'` con tu URL CSV
- Settings → Pages → Source: main → Save
- Tu dashboard: `https://tu-usuario.github.io/tu-repo/`

### 4. Python Scraper (Opción B — más frecuente)
```bash
pip install requests beautifulsoup4 gspread google-auth
python scraper_minerales.py --intervalo 60
```

## Indicadores del dashboard

- 🟢 **GOOGLE SHEETS** = Leyendo datos reales de tu hoja
- 🟡 **SIMULADO** = No pudo conectar a Sheets, usando datos base de Investing.com

## Los 10 minerales (sin duplicados)

| # | Mineral | Bolsa | Unidad original | Factor → USD/kg |
|---|---------|-------|-----------------|-----------------|
| 1 | Oro | COMEX | USD/troy oz | ×32.1507 |
| 2 | Plata | COMEX | USD/troy oz | ×32.1507 |
| 3 | Platino | NYMEX | USD/troy oz | ×32.1507 |
| 4 | Paladio | NYMEX | USD/troy oz | ×32.1507 |
| 5 | Cobre | COMEX | USD/lb | ×2.20462 |
| 6 | Aluminio | LME | USD/mt | ÷1000 |
| 7 | Níquel | LME | USD/mt | ÷1000 |
| 8 | Zinc | LME | USD/mt | ÷1000 |
| 9 | Estaño | LME | USD/mt | ÷1000 |
| 10 | Plomo | LME | USD/mt | ÷1000 |
