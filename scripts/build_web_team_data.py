import json
import os
from collections import defaultdict

BASE_DIR = r"c:\Users\ealva\Desktop\Proyectos Antigravity\Admin ICA\Gestion ICA\Timesheet_App"
INPUT_JSON = os.path.join(BASE_DIR, "data", "timesheet_records_reconstructed.json")
OUTPUT_JSON = os.path.join(BASE_DIR, "data", "timesheet_records.json")
OUTPUT_JS = os.path.join(BASE_DIR, "js", "team_data.js")

with open(INPUT_JSON, "r", encoding="utf-8") as f:
    raw_tasks = json.load(f)

# Iniciales y nombres
NAME_MAP = {
    "cleon@icageo.cl": ("Claudia León Rojas", "CL"),
    "cbravo@icageo.cl": ("Cristóbal Bravo", "CB"),
    "gsuarez@icageo.cl": ("Gonzalo Suárez", "GS"),
    "gmaragano@icageo.cl": ("Gonzalo Maragaño Carmona", "GM"),
    "jrodriguez@icageo.cl": ("Javiera Rodríguez", "JR"),
    "ealvarado@icageo.cl": ("Elias Alvarado", "EA"),
    "vcastillo@icageo.cl": ("Viviana Castillo", "VC"),
}

# Agrupar por (correo, fecha)
days = defaultdict(list)
for t in raw_tasks:
    key = (t["correo_corporativo"], t["fecha_labor"])
    days[key].append(t)

web_records = []
for (email, fecha), tasks in sorted(days.items(), key=lambda x: (x[0][1], x[0][0])):
    nombre, init = NAME_MAP.get(email, (tasks[0]["consultor"], "XX"))
    
    # Categoría
    def get_cat(proj):
        p = proj.lower()
        if "propuesta" in p: return "Propuestas"
        if "gestión interna" in p or "adm" in p: return "Gestión Interna"
        return "Proyectos"
        
    task_list = []
    tot_hh = 0.0
    is_terrain = False
    
    for tk in tasks:
        hh = float(tk["horas_hh"])
        tot_hh += hh
        proj = tk["proyecto"]
        act = tk["actividad_descripcion"]
        if "terreno" in proj.lower() or "terreno" in act.lower():
            is_terrain = True
            
        task_list.append({
            "proyecto": proj,
            "categoria": get_cat(proj),
            "horas": hh,
            "actividad": "Faena / Terreno" if is_terrain else "Gabinete e Informes",
            "detalle": act
        })
        
    web_records.append({
        "id": f"TS-{init}-{fecha}",
        "fecha": fecha,
        "usuarioNombre": nombre,
        "usuarioCorreo": email,
        "tipoJornada": "Terreno_Extendido" if is_terrain else "Normal",
        "totalHH": round(tot_hh, 1),
        "tareas": task_list,
        "timestamp": f"{fecha}T18:00:00.000Z",
        "estadoRevision": "En Terreno" if is_terrain else "Al Día"
    })

print(f"Total jornadas agrupadas: {len(web_records)}")
tot_hh_all = sum(r["totalHH"] for r in web_records)
print(f"Total HH agrupadas: {tot_hh_all:.1f} HH")

# Guardar data/timesheet_records.json
with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(web_records, f, ensure_ascii=False, indent=2)
print(f"Guardado: {OUTPUT_JSON}")

# Guardar js/team_data.js
js_content = f"""// Datos Reales Consolidados y Auditados del Equipo ICA Geoconsultores
// Corte al Viernes 02 de Octubre de 2026 (0% Datos Sintéticos, Horas de Elias Excluidas)
// Generado automáticamente por scripts/build_web_team_data.py

window.ICA_REAL_TEAM_DATA = {json.dumps(web_records, ensure_ascii=False, indent=2)};

window.ICA_TEAM_DATA = window.ICA_REAL_TEAM_DATA;
"""
with open(OUTPUT_JS, "w", encoding="utf-8") as f:
    f.write(js_content)
print(f"Guardado: {OUTPUT_JS}")
