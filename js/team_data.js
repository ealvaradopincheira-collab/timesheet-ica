/**
 * ICA Geoconsultores — Semilla de datos del Timesheet
 *
 * ESTE ARCHIVO ES UNA PROYECCION, NO UNA FUENTE DE VERDAD.
 *
 * Los datos reales del equipo (nombres, correos y horas por persona) ya NO
 * viven en el repositorio: es publico y GitHub Pages sirve `path: '.'`, de
 * modo que cualquier dataset aqui queda descargable por URL directa sin
 * autenticacion. La fuente de verdad pasa a ser SharePoint (ver el plan de
 * mejora, Fase 6); hasta entonces el historico vive solo en el Excel maestro
 * local y en el snapshot de integridad.
 *
 * El dataset anterior (60 jornadas / 130 tareas / 385.3 HH) quedo retirado
 * porque la auditoria de procedencia determino que 73.3 HH (19%) no eran
 * trazables a ninguna medicion. Ver AUDITORIA_PROCEDENCIA.md.
 *
 * Este archivo lo regenera `scripts/build_team_data.py` a partir del dataset
 * canonico validado. No editarlo a mano.
 */

window.ICA_TEAM_DATA_META = {
  schemaVersion: '2.0',
  estado: 'VACIO_PENDIENTE_SANEAMIENTO',
  canonicoSha256: null,
  generadoTs: null,
  runId: null,
  registros: 0,
  tareas: 0,
  hhMedidas: 0.0,
  hhNoVerificadas: 0.0,
  hhSinDeclarar: null,
  configSha256: null,
  nota: 'Semilla vacia. El historico se recarga desde el pipeline saneado (Fase 4 del plan).'
};

window.ICA_TEAM_DATA = [];

// Compatibilidad con el nombre anterior mientras app.js migra a ICA_TEAM_DATA.
window.ICA_REAL_TEAM_DATA = window.ICA_TEAM_DATA;
