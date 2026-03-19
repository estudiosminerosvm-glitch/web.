/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MINERALBOARD — Google Apps Script v2 (CORREGIDO)           ║
 * ║  Actualización AUTOMÁTICA de precios cada hora              ║
 * ║                                                              ║
 * ║  CORRECCIÓN: Oro y Plata ahora usan GOOGLEFINANCE           ║
 * ║  porque las series FRED fueron discontinuadas (HTTP 404)    ║
 * ║                                                              ║
 * ║  PASOS:                                                      ║
 * ║  1. Abre tu Google Sheet                                     ║
 * ║  2. Extensiones → Apps Script                                ║
 * ║  3. Borra todo y pega este código                            ║
 * ║  4. Guarda (Ctrl+S)                                          ║
 * ║  5. Ejecuta: configurarTodo() (UNA VEZ)                     ║
 * ║  6. Autoriza los permisos                                    ║
 * ║  7. ¡Listo! Se actualiza solo cada hora                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const HOJA = 'Datos';
const TROY_OZ_KG = 32.1507;
const LB_KG = 2.20462;

// ================================================================
// MINERALES QUE SÍ FUNCIONAN EN FRED (verificado marzo 2026)
// ================================================================
const FRED_OK = {
  'Cobre':    {col:4,  serie:'PCOPPUSDM',  factor:0.001},     // USD/mt → USD/kg  ✅
  'Aluminio': {col:5,  serie:'PALUMUSDM',  factor:0.001},     // USD/mt → USD/kg  ✅
  'Niquel':   {col:6,  serie:'PNICKUSDM',  factor:0.001},     // USD/mt → USD/kg  ✅
  'Zinc':     {col:7,  serie:'PZINCUSDM',  factor:0.001},     // USD/mt → USD/kg  ✅
  'Estaño':   {col:8,  serie:'PTINUSDM',   factor:0.001},     // USD/mt → USD/kg  ✅
  'Plomo':    {col:9,  serie:'PLEADUSDM',  factor:0.001},     // USD/mt → USD/kg  (intentar)
};

// ================================================================
// MINERALES VÍA GOOGLEFINANCE (Oro, Plata, Platino, Paladio)
// Las series FRED GOLDAMGBD228NLBM y SLVPRUSD fueron DISCONTINUADAS
// ================================================================
const GOOGLE_FINANCE = {
  'Oro':     {col:2,  gf:'CURRENCY:XAUUSD', factor:TROY_OZ_KG},   // USD/oz → USD/kg
  'Plata':   {col:3,  gf:'CURRENCY:XAGUSD', factor:TROY_OZ_KG},   // USD/oz → USD/kg
  'Platino': {col:10, gf:'CURRENCY:XPTUSD', factor:TROY_OZ_KG},   // USD/oz → USD/kg
  'Paladio': {col:11, gf:'CURRENCY:XPDUSD', factor:TROY_OZ_KG},   // USD/oz → USD/kg
};


// ================================================================
// FUNCIÓN PRINCIPAL
// ================================================================
function actualizarPrecios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA);
  if (!hoja) { Logger.log('❌ Hoja "' + HOJA + '" no encontrada'); return; }
  
  const datos = hoja.getDataRange().getValues();
  const anio = new Date().getFullYear();
  
  // Buscar o crear fila del año actual
  let fila = -1;
  for (let i = 1; i < datos.length; i++) {
    try {
      if (parseInt(datos[i][0]) === anio) { fila = i + 1; break; }
    } catch(e) {}
  }
  if (fila === -1) {
    fila = datos.length + 1;
    hoja.getRange(fila, 1).setValue(anio);
  }
  
  Logger.log('🔄 Actualizando fila ' + fila + ' (año ' + anio + ')');
  let ok = 0, err = 0;
  
  // === FRED (Cobre, Aluminio, Níquel, Zinc, Estaño, Plomo) ===
  for (const [nombre, cfg] of Object.entries(FRED_OK)) {
    try {
      const precio = obtenerFRED(cfg.serie, cfg.factor);
      if (precio > 0) {
        hoja.getRange(fila, cfg.col).setValue(Math.round(precio * 1000000) / 1000000);
        Logger.log('  ✅ ' + nombre + ' = ' + precio.toFixed(4) + ' USD/kg (FRED: ' + cfg.serie + ')');
        ok++;
      }
    } catch (e) {
      Logger.log('  ❌ ' + nombre + ' (FRED ' + cfg.serie + '): ' + e.message);
      err++;
    }
    Utilities.sleep(1000); // Pausa entre requests
  }
  
  // === GOOGLEFINANCE (Oro, Plata, Platino, Paladio) ===
  Logger.log('');
  Logger.log('  Obteniendo preciosos vía GOOGLEFINANCE...');
  
  // Crear/obtener hoja auxiliar oculta
  let aux = ss.getSheetByName('_aux_gf');
  if (!aux) {
    aux = ss.insertSheet('_aux_gf');
    aux.hideSheet();
  }
  
  let fila_aux = 1;
  for (const [nombre, cfg] of Object.entries(GOOGLE_FINANCE)) {
    try {
      // Escribir fórmula GOOGLEFINANCE en celda auxiliar
      const celda = aux.getRange(fila_aux, 1);
      celda.setFormula('=IFERROR(GOOGLEFINANCE("' + cfg.gf + '")*' + cfg.factor + ',0)');
      fila_aux++;
    } catch(e) {
      Logger.log('  ❌ ' + nombre + ' (GF): ' + e.message);
      err++;
    }
  }
  
  // Forzar recálculo y esperar
  SpreadsheetApp.flush();
  Utilities.sleep(5000); // Esperar que GOOGLEFINANCE responda
  
  // Leer valores calculados
  fila_aux = 1;
  for (const [nombre, cfg] of Object.entries(GOOGLE_FINANCE)) {
    try {
      const val = aux.getRange(fila_aux, 1).getValue();
      fila_aux++;
      
      if (val && typeof val === 'number' && val > 0) {
        hoja.getRange(fila, cfg.col).setValue(Math.round(val * 1000000) / 1000000);
        Logger.log('  ✅ ' + nombre + ' = ' + val.toFixed(4) + ' USD/kg (GOOGLEFINANCE)');
        ok++;
      } else {
        Logger.log('  ⚠️ ' + nombre + ': GOOGLEFINANCE retornó ' + val + ' — puede no estar disponible');
      }
    } catch(e) {
      Logger.log('  ❌ ' + nombre + ' (GF read): ' + e.message);
      err++;
    }
  }
  
  // Timestamp en columna L (12)
  hoja.getRange(fila, 12).setValue(new Date().toLocaleString('es-VE'));
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════');
  Logger.log('📊 Resultado: ' + ok + ' actualizados, ' + err + ' errores');
  Logger.log('   FRED: Cobre, Aluminio, Níquel, Zinc, Estaño, Plomo');
  Logger.log('   GOOGLEFINANCE: Oro, Plata, Platino, Paladio');
  Logger.log('   Hora: ' + new Date().toLocaleString('es-VE'));
  Logger.log('═══════════════════════════════════════');
}


// ================================================================
// OBTENER PRECIO DE FRED
// ================================================================
function obtenerFRED(serieId, factor) {
  const url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + serieId;
  
  const resp = UrlFetchApp.fetch(url, { 
    muteHttpExceptions: true,
    followRedirects: true 
  });
  
  const code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error('HTTP ' + code);
  }
  
  const csv = resp.getContentText();
  const lineas = csv.trim().split('\n');
  
  // Buscar último valor válido (de atrás hacia adelante)
  for (let i = lineas.length - 1; i >= 1; i--) {
    const partes = lineas[i].split(',');
    if (partes.length >= 2) {
      const val = parseFloat(partes[1]);
      if (!isNaN(val) && val > 0) {
        return val * factor;  // Convertir a USD/kg
      }
    }
  }
  
  throw new Error('Sin datos válidos en serie ' + serieId);
}


// ================================================================
// CONFIGURAR TODO (ejecutar UNA VEZ)
// ================================================================
function configurarTodo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Crear hoja "Datos" si no existe
  let hoja = ss.getSheetByName(HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA);
    const headers = ['Año','Oro','Plata','Cobre','Aluminio','Niquel','Zinc',
                     'Estaño','Plomo','Platino','Paladio','Última Actualización'];
    hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
    hoja.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1F2937')
      .setFontColor('#FFFFFF')
      .setHorizontalAlignment('center');
    
    // Anchos de columna
    hoja.setColumnWidth(1, 60);
    for (let i = 2; i <= 11; i++) hoja.setColumnWidth(i, 110);
    hoja.setColumnWidth(12, 160);
    
    Logger.log('✅ Hoja "Datos" creada');
  }
  
  // Limpiar triggers anteriores
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  
  // Crear trigger cada hora
  ScriptApp.newTrigger('actualizarPrecios')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log('✅ Trigger: cada 1 hora');
  
  // Ejecutar primera actualización
  actualizarPrecios();
  
  Logger.log('');
  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║  ✅ ¡CONFIGURACIÓN COMPLETA!              ║');
  Logger.log('║                                          ║');
  Logger.log('║  Precios se actualizan solos cada hora:  ║');
  Logger.log('║                                          ║');
  Logger.log('║  FRED:           Cobre, Aluminio,        ║');
  Logger.log('║                  Níquel, Zinc, Estaño,   ║');
  Logger.log('║                  Plomo                    ║');
  Logger.log('║                                          ║');
  Logger.log('║  GOOGLEFINANCE:  Oro, Plata,             ║');
  Logger.log('║                  Platino, Paladio         ║');
  Logger.log('║                                          ║');
  Logger.log('║  SIGUIENTE PASO:                          ║');
  Logger.log('║  Archivo → Compartir → Publicar en web   ║');
  Logger.log('║  → CSV → Publicar → Copiar URL           ║');
  Logger.log('╚══════════════════════════════════════════╝');
}


// ================================================================
// MENÚ EN GOOGLE SHEETS
// ================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⬡ MineralBoard')
    .addItem('🔄 Actualizar precios ahora', 'actualizarPrecios')
    .addItem('⚙️ Configurar todo (primera vez)', 'configurarTodo')
    .addToUi();
}
