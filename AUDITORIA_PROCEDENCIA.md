# Auditoría de procedencia — Timesheet ICA Geoconsultores

**Fecha:** 9 de septiembre de 2026
**Alcance:** dataset de 60 jornadas / 130 tareas / 385.3 HH, período 24-ago-2026 a 07-sep-2026
**Método:** se recompiló cada planilla Excel de origen aplicando las mismas reglas de conteo que `scripts/legacy/import_team_timesheets.py.legacy` y se comparó con el dataset publicado.

---

## 1. Resultado

El total real medido es **322.5 HH**, no 385.3. **73.3 HH (19.0%) no son trazables a ninguna medición**, y **10.5 HH reales fueron descartadas** por el script de ingesta.

| Consultor | Dataset publicado | Medido en planilla | Δ | Naturaleza del Δ |
|---|---:|---:|---:|---|
| Elias Alvarado | 88.5 | **88.5** | 0 | Medido. Parser limpio. |
| Gonzalo Suárez | 69.5 | **69.5** | 0 | Medido. Parser limpio. |
| Gonzalo Maragaño | 63.0 | **35.5** | −27.5 | 31.0 asignadas por regla + 3.0 fantasma − 6.5 descartadas |
| Claudia León | 62.3 | **26.0** | −36.3 | Relleno de déficit |
| Javiera Rodríguez | 62.0 | **63.0** | +1.0 | +3.0 inventadas, −4.0 descartadas |
| Cristóbal Bravo | 40.0 | **40.0** bruto / 36.0 neto | 0 / −4.0 | Declaradas sin descontar colación |
| Viviana Castillo | 0.0 | sin planilla | — | Estado distinto de cero |
| **Total** | **385.3** | **322.5** | **−62.8** | |

Solo las cifras de **Elias Alvarado y Gonzalo Suárez** provienen íntegramente de una medición.

---

## 2. Mecanismos que introdujeron horas no trazables

### 2.1 Relleno de déficit — Claudia León, 36.3 HH

`import_team_timesheets.py:329-333` inyectaba las horas faltantes hasta cuadrar la meta diaria, imputadas a `Minera Pimentón` con el detalle fabricado `"Gabinete y análisis hidroquímico / isotópico"` concatenado a las notas reales. Disparó en **los 10 de 10 registros** de la consultora.

| Fecha | Excel | Dataset | Relleno |
|---|---:|---:|---:|
| 2026-08-24 | 3.0 | 7.0 | +4.0 |
| 2026-08-25 | 2.5 | 6.9 | +4.4 |
| 2026-08-26 | 2.5 | 7.0 | +4.5 |
| 2026-08-27 | 3.0 | 7.0 | +4.0 |
| 2026-08-28 | 2.5 | 3.4 | +0.9 |
| 2026-08-31 | 3.5 | 7.0 | +3.5 |
| 2026-09-01 | 2.5 | 7.0 | +4.5 |
| 2026-09-02 | 3.0 | 7.0 | +4.0 |
| 2026-09-03 | 2.0 | 7.0 | +5.0 |
| 2026-09-04 | 1.5 | 3.0 | +1.5 |
| **Total** | **26.0** | **62.3** | **+36.3** |

**58.3% de las horas atribuidas a Claudia León no provienen de su planilla.**

Las horas sintéticas están **fusionadas con las reales dentro de la misma tarea**: la fila `Minera Pimentón 5.5 HH` del 2026-08-24 es 1.5 real + 4.0 sintética. No existe "la fila sintética" que borrar; corregir exige recomputar desde el origen.

### 2.2 Horas asignadas por regla — Gonzalo Maragaño, 31.0 HH

Su hoja `Semana 24 a 28 ago` **no tiene columna de horas**: su estructura es `Fecha | Día | Actividad`, una fila por día. Las 31.0 HH de esa semana salen enteras de `import_team_timesheets.py:142-143`:

```python
hh = 3.0 if is_vi else 7.0
```

A diferencia del relleno de Claudia, esto **no deja huella detectable**: son 7.0/3.0 indistinguibles de datos reales. Solo se descubre recompilando el origen.

### 2.3 Horas fantasma — cabeceras de Excel contadas como trabajo, 3.0 HH

`import_team_timesheets.py:178` itera `rows2[3:]` (desde la fila 4), pero la hoja `Semana 31 ago a 04 sept` tiene la cabecera ahí. El literal `"FECHA"` y cinco objetos `datetime` se contaron como tareas de 0.5 HH cada uno. Quedó visible en el dataset publicado:

```
2026-08-31  Gonzalo Maragaño  1.0  "FECHA; 2026-08-31 00:00:00"
2026-09-01  Gonzalo Maragaño  3.0  "2026-09-01 00:00:00; Reunión semanal ICA; ..."
```

### 2.4 Transcripción manual incorrecta — Javiera Rodríguez

Sus 10 días estaban escritos a mano en `import_team_timesheets.py:362-406`; su Excel solo se usaba como bandera `os.path.exists()`. La planilla **sí es tabulable** (tokens `Am`/`Pm`/`Am y Pm` con cabecera de columnas por día), y la transcripción se equivoca en ambos sentidos:

- **2026-08-28:** el origen no tiene ningún marcador de ese día. Las 3.0 HH son inventadas.
- **2026-09-04:** el origen marca `Am` (BSF, edición de informe) y `Pm` (Pimentón, formato) = jornada completa; la transcripción pone 1.5 + 1.5 = 3.0 y **descarta 4.0 HH reales**.

---

## 3. Datos reales descartados

| Caso | HH | Motivo |
|---|---:|---|
| Maragaño, 2026-09-07 | 6.5 | El script solo lee las hojas de las semanas 1 y 2 (líneas 134, 166). La hoja `Semana 07 sept a 11 sept` tiene 13 bloques de 30 min reales que nunca entran. |
| Javiera, 2026-09-04 | 4.0 | Ver 2.4. |
| **Total** | **10.5** | |

---

## 4. Misatribución de cliente

`normalize_project()` (líneas 22-52) resuelve el proyecto por coincidencia de substrings, con un `else` que captura todo lo no reconocido. Consecuencias verificadas:

| Regla | Efecto |
|---|---|
| `"blanco" → "HMC - Tambo de Oro"` (línea 43) | `Proyecto Blanco MyMA` de Elias (2026-08-25, 2.0 HH) → HMC. **Son las únicas 2.0 HH de "HMC - Tambo de Oro" del dataset.** El proyecto real (`MYMA- Proyecto Blanco`) queda en cero y HMC carga horas ajenas. |
| `"renca" → "CCU Quilicura"` (línea 40) | `Reunión CCU Renca` de Elias → Quilicura. La hoja `Configuracion` del Excel maestro los define como OTs distintas: `CCU-2026-P14` vs `CCU-QLC-2026`. |
| `else` (líneas 51-52) | `Las Cenizas: Estaciones DGA` de Claudia (2026-09-01, 0.5 HH) → `Gestión Interna / ICA`. Minera Las Cenizas es un cliente: convierte facturable en interno. El bucket acumula 23 tareas / 40.0 HH. |
| `"uh" in t` (línea 31) | Sin efecto hoy, pero clasificaría como `Minera Pimentón` cualquier texto que contenga esa subcadena. |

**La atribución de proyecto del histórico no es de calidad facturable.** Recuperarla exige releer los 7 `.xlsx` con el catálogo real de OTs.

---

## 5. Campos que nunca se calcularon

- **`estadoRevision`** es la constante literal `"Al Día"` en las 6 ramas del script (líneas 119, 162, 217, 286, 353, 427, 510). Los 60 registros lo llevan.
- **`Estado_Aprobacion = "Aprobado"`** en las 130 filas del Excel maestro (línea 575). **Ningún socio aprobó nada**: lo estampó el script.
- **`Codigo_OT = "OT-ICA-2026"`** en las 130 filas, aunque existe un catálogo con 32 OTs reales.
- **`tipoJornada`** se deriva de `hh > 7.0 or "Terreno" in proj_str` (línea 115), no de la meta del día. Resultado: un viernes con 5.5 HH (183% de su meta de 3.0) queda `Normal`, y un miércoles con 6.5 HH (bajo meta) queda `Terreno_Extendido`. Los 3 registros de fin de semana quedan `Normal`.

---

## 6. La regla que el propio script declaraba

`import_team_timesheets.py:516-520`:

> `REGLA OBLIGATORIA DEL USUARIO: NO INVENTAR REGISTROS. Queda prohibido generar registros simulados o imputar tareas`

La regla se aplicó únicamente a excluir a Viviana Castillo del dataset. Coexistió en el mismo archivo con los mecanismos de las secciones 2.1 a 2.4.

---

## 7. Medidas tomadas (Fase 0)

1. **Snapshot con sha256** de las tres copias JSON y del Excel maestro en `_snapshot_integridad_2026-09-09/` (fuera de git).
2. **Histórico retirado del repositorio.** `js/team_data.js` quedó como semilla vacía y `data/timesheet_records.json` dejó de estar trackeado. Ambos se publicaban en GitHub Pages y eran descargables por URL sin autenticación.
3. **Scripts de ingesta congelados** en `scripts/legacy/*.legacy`.
4. **Aviso de integridad** en el dashboard: las cifras no deben usarse para facturación ni evaluación de desempeño.

## 8. Pendiente

El dataset se repone desde el pipeline reescrito, con procedencia obligatoria por tarea (`origen`, `reglaHoras`, `confianza`, archivo/hoja/celdas de origen) y sin relleno de déficit ni asignación por regla. Ver el plan de mejora, Fases 2 a 4.

Requiere decisión previa:

- **`Minera Pimentón`** (136.9 HH, 35.5% del total) no tiene OT en ninguno de los catálogos existentes.
- **Cristóbal Bravo** cuenta horas brutas (sin descontar la colación protegida) mientras el resto cuenta netas. Efecto: −4.0 HH.
- **Los 3 registros de fin de semana de Elias** (29-ago, 05-sep, 06-sep; 9.0 HH) son reales: ¿cuentan para facturabilidad o van a una banda de trabajo extraordinario?
- **Maragaño, semana 1**: confirmar que esos 5 días se trabajaron y solicitar las horas. La actividad consta; la cuantificación no existe.
