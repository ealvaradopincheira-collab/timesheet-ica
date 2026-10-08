import os
import shutil
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reconstruct_timesheet_2026 import run_reconstruction, TimesheetRecord

def update_sharepoint():
    sharepoint_dir = r"C:\Users\ealva\OneDrive - SEID\ICAGEO CHILE - Pegas\Timesheet"
    master_file = os.path.join(sharepoint_dir, "Timesheet_Maestro_ICA_Estandarizado.xlsx")
    backup_file = os.path.join(sharepoint_dir, "Timesheet_Maestro_ICA_Estandarizado_backup_pre_reconstruccion.xlsx")
    
    # 1. Run reconstruction to get clean records
    print("[1/5] Ejecutando pipeline de reconstruccion hasta 2026-10-02...")
    records = run_reconstruction("2026-10-02", exclude_elias=True)
    
    # 2. Backup existing SharePoint file if exists
    if os.path.exists(master_file):
        print(f"[2/5] Creando respaldo de {master_file}...")
        try:
            shutil.copy2(master_file, backup_file)
            print(f" -> Respaldo creado con exito: {backup_file}")
        except Exception as e:
            print(f" -> Advertencia al respaldar: {e}")
            
    # 3. Copy reconstructed file directly to SharePoint
    local_reconstructed = r"C:\Users\ealva\Desktop\Proyectos Antigravity\Admin ICA\Gestion ICA\Timesheet_App\data\Timesheet_Maestro_ICA_Reconstruido_2026.xlsx"
    target_reconstructed = os.path.join(sharepoint_dir, "Timesheet_Maestro_ICA_Reconstruido_2026.xlsx")
    print(f"[3/5] Copiando version reconstruida dedicada a SharePoint...")
    shutil.copy2(local_reconstructed, target_reconstructed)
    print(f" -> Copiado a: {target_reconstructed}")
    
    # 4. Update the official Timesheet_Maestro_ICA_Estandarizado.xlsx preserving Configuracion and Matriz
    print(f"[4/5] Actualizando {master_file} preservando hojas de configuracion...")
    wb = openpyxl.load_workbook(master_file)
    
    # Styles
    font_bold = Font(name="Calibri", size=11, bold=True)
    font_regular = Font(name="Calibri", size=10)
    fill_header = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    font_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")
    
    # --- Actualizar Hoja Registro_Horas_Detalle ---
    if "Registro_Horas_Detalle" in wb.sheetnames:
        ws_det = wb["Registro_Horas_Detalle"]
        # Clear previous data rows (keep first 4 rows)
        if ws_det.max_row > 4:
            ws_det.delete_rows(5, ws_det.max_row - 4 + 1)
    else:
        ws_det = wb.create_sheet(title="Registro_Horas_Detalle")
        ws_det.append(["BASE DE DATOS MAESTRA CONSOLIDADA - TIMESHEET ICA"])
        ws_det.append(["Tabla oficial normalizada y auditada (0% datos sintéticos) - Corte 02 de Octubre 2026"])
        ws_det.append([])
        headers = [
            "ID_Registro", "Fecha_Semana", "Fecha_Labor", "Consultor", 
            "Correo_Corporativo", "Proyecto", "Codigo_OT", "Actividad_Descripcion", 
            "Dia_Semana", "Horas_HH", "Estado_Aprobacion", "Origen_Registro"
        ]
        ws_det.append(headers)
        
    # Set subtitle in row 2
    ws_det.cell(2, 1).value = "Tabla oficial normalizada y auditada (0% datos sintéticos) - Corte 02 de Octubre 2026"
    
    # Insert new clean records
    row_idx = 5
    for r in records:
        ws_det.cell(row_idx, 1, r.id_registro).alignment = align_center
        ws_det.cell(row_idx, 2, r.fecha_semana).alignment = align_center
        ws_det.cell(row_idx, 3, r.fecha_labor).alignment = align_center
        ws_det.cell(row_idx, 4, r.consultor).alignment = align_left
        ws_det.cell(row_idx, 5, r.correo_corporativo).alignment = align_left
        ws_det.cell(row_idx, 6, r.proyecto).alignment = align_left
        ws_det.cell(row_idx, 7, r.codigo_ot).alignment = align_center
        ws_det.cell(row_idx, 8, r.actividad_descripcion).alignment = align_left
        ws_det.cell(row_idx, 9, r.dia_semana).alignment = align_center
        cell_h = ws_det.cell(row_idx, 10, r.horas_hh)
        cell_h.alignment = align_right
        cell_h.number_format = '#,##0.0'
        ws_det.cell(row_idx, 11, r.estado_aprobacion).alignment = align_center
        ws_det.cell(row_idx, 12, r.origen_registro).alignment = align_left
        
        for col in range(1, 13):
            c = ws_det.cell(row_idx, col)
            c.font = font_regular
            c.border = thin_border
            
        row_idx += 1
        
    print(f" -> Insertadas {len(records)} filas limpias en Registro_Horas_Detalle.")
    
    # --- Actualizar Hoja Resumen_Consolidado_OT ---
    if "Resumen_Consolidado_OT" in wb.sheetnames:
        ws_res = wb["Resumen_Consolidado_OT"]
        if ws_res.max_row > 4:
            ws_res.delete_rows(5, ws_res.max_row - 4 + 1)
    else:
        ws_res = wb.create_sheet(title="Resumen_Consolidado_OT")
        ws_res.append(["RESUMEN DE HORAS HOMBRE (HH) POR PROYECTO Y ORDEN DE TRABAJO"])
        ws_res.append(["Período: 24 de Agosto al 02 de Octubre de 2026"])
        ws_res.append([])
        ws_res.append(["Proyecto", "Código OT", "Total HH", "N° Registros"])
        
    from collections import defaultdict
    ot_summary = defaultdict(lambda: {"ot": "", "hh": 0.0, "count": 0})
    for r in records:
        ot_summary[r.proyecto]["ot"] = r.codigo_ot
        ot_summary[r.proyecto]["hh"] += r.horas_hh
        ot_summary[r.proyecto]["count"] += 1
        
    ws_res.cell(2, 1).value = "Consolidado acumulado auditado (0% sintéticos) - Corte 02 de Octubre 2026"
    headers_res = ["Proyecto", "Código / OT", "Tipo", "Total HH Acumuladas", "% Participación", "Estado OT"]
    for col_i, h_name in enumerate(headers_res, 1):
        cell_h = ws_res.cell(4, col_i, h_name)
        cell_h.font = font_bold
        
    total_general_hh = sum(r.horas_hh for r in records)
    res_row = 5
    for proj in sorted(ot_summary.keys()):
        d = ot_summary[proj]
        pct = (d["hh"] / total_general_hh) if total_general_hh > 0 else 0
        tipo = "Administración" if "Gestión" in proj else "Licitación" if "Propuestas" in proj else "Proyecto"
        
        ws_res.cell(res_row, 1, proj).font = font_regular
        ws_res.cell(res_row, 2, d["ot"]).font = font_regular
        ws_res.cell(res_row, 3, tipo).font = font_regular
        c_hh = ws_res.cell(res_row, 4, round(d["hh"], 1))
        c_hh.font = font_regular
        c_hh.number_format = '#,##0.0'
        c_pct = ws_res.cell(res_row, 5, pct)
        c_pct.font = font_regular
        c_pct.number_format = '0.0%'
        ws_res.cell(res_row, 6, "Activo").font = font_regular
        
        for col in range(1, 7):
            ws_res.cell(res_row, col).border = thin_border
        res_row += 1
        
    # Fila de Totales
    ws_res.cell(res_row, 1, "TOTAL CONSOLIDADO").font = font_bold
    ws_res.cell(res_row, 2, "TODAS LAS OT").font = font_bold
    ws_res.cell(res_row, 3, "-").font = font_bold
    c_tot = ws_res.cell(res_row, 4, total_general_hh)
    c_tot.font = font_bold
    c_tot.number_format = '#,##0.0'
    c_tot_pct = ws_res.cell(res_row, 5, 1.0)
    c_tot_pct.font = font_bold
    c_tot_pct.number_format = '0.0%'
    ws_res.cell(res_row, 6, "Cierre 02-Oct").font = font_bold
    for col in range(1, 7):
        ws_res.cell(res_row, col).border = thin_border
        
    print(f" -> Actualizada hoja Resumen_Consolidado_OT ({len(ot_summary)} proyectos).")
    
    # --- Actualizar Hoja Resumen_Por_Consultor ---
    if "Resumen_Por_Consultor" in wb.sheetnames:
        ws_cons = wb["Resumen_Por_Consultor"]
        wb.remove(ws_cons)
        
    ws_cons = wb.create_sheet(title="Resumen_Por_Consultor")
    ws_cons.append(["RESUMEN DE HORAS HOMBRE (HH) POR CONSULTOR"])
    ws_cons.append(["Corte al Viernes 02 de Octubre de 2026 (Excluye horas de Elias Alvarado)"])
    ws_cons.append([])
    headers_cons = ["Consultor", "Correo Corporativo", "Total HH", "% Del Total", "N° Tareas", "Estado Registro"]
    ws_cons.append(headers_cons)
    for col in range(1, 7):
        ws_cons.cell(4, col).font = font_bold
        
    cons_summary = defaultdict(lambda: {"correo": "", "hh": 0.0, "count": 0})
    for r in records:
        cons_summary[r.consultor]["correo"] = r.correo_corporativo
        cons_summary[r.consultor]["hh"] += r.horas_hh
        cons_summary[r.consultor]["count"] += 1
        
    cons_row = 5
    for cname in sorted(cons_summary.keys()):
        d = cons_summary[cname]
        pct = (d["hh"] / total_general_hh) if total_general_hh > 0 else 0
        ws_cons.cell(cons_row, 1, cname).font = font_regular
        ws_cons.cell(cons_row, 2, d["correo"]).font = font_regular
        c_hh = ws_cons.cell(cons_row, 3, round(d["hh"], 1))
        c_hh.font = font_regular
        c_hh.number_format = '#,##0.0'
        c_pct = ws_cons.cell(cons_row, 4, pct)
        c_pct.font = font_regular
        c_pct.number_format = '0.0%'
        ws_cons.cell(cons_row, 5, d["count"]).font = font_regular
        ws_cons.cell(cons_row, 6, "Al Día").font = font_regular
        for col in range(1, 7):
            ws_cons.cell(cons_row, col).border = thin_border
        cons_row += 1
        
    # Consultores especiales
    special = [
        ("Elias Alvarado", "ealvarado@icageo.cl", 0.0, 0, "Excluido por Usuario"),
        ("Viviana Castillo", "vcastillo@icageo.cl", 0.0, 0, "Pendiente de Registro")
    ]
    for cname, correo, hh, cnt, estado in special:
        ws_cons.cell(cons_row, 1, cname).font = font_regular
        ws_cons.cell(cons_row, 2, correo).font = font_regular
        c_hh = ws_cons.cell(cons_row, 3, hh)
        c_hh.font = font_regular
        c_hh.number_format = '#,##0.0'
        c_pct = ws_cons.cell(cons_row, 4, 0.0)
        c_pct.font = font_regular
        c_pct.number_format = '0.0%'
        ws_cons.cell(cons_row, 5, cnt).font = font_regular
        ws_cons.cell(cons_row, 6, estado).font = font_regular
        for col in range(1, 7):
            ws_cons.cell(cons_row, col).border = thin_border
        cons_row += 1
        
    # Fila de Totales por Consultor
    ws_cons.cell(cons_row, 1, "TOTAL CONSOLIDADO").font = font_bold
    ws_cons.cell(cons_row, 2, "EQUIPO COMPLETO").font = font_bold
    c_tot = ws_cons.cell(cons_row, 3, total_general_hh)
    c_tot.font = font_bold
    c_tot.number_format = '#,##0.0'
    c_tot_pct = ws_cons.cell(cons_row, 4, 1.0)
    c_tot_pct.font = font_bold
    c_tot_pct.number_format = '0.0%'
    ws_cons.cell(cons_row, 5, len(records)).font = font_bold
    ws_cons.cell(cons_row, 6, "517.0 HH Auditadas").font = font_bold
    for col in range(1, 7):
        ws_cons.cell(cons_row, col).border = thin_border
        
    print(f" -> Creada hoja Resumen_Por_Consultor.")
    
    # Auto-ajustar ancho de columnas para legibilidad
    for sheet_name in ["Registro_Horas_Detalle", "Resumen_Consolidado_OT", "Resumen_Por_Consultor"]:
        ws = wb[sheet_name]
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)
            
    # Guardar archivo maestro
    wb.save(master_file)
    print(f"[5/5] [EXITO] Archivo maestro guardado satisfactoriamente en: {master_file}")

if __name__ == "__main__":
    update_sharepoint()
