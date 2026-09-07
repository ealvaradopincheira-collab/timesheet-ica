# Especificación Técnica Microsoft 365: Timesheet ICA Geoconsultores

Este documento detalla la estructura formal para crear la lista de **SharePoint** en el tenant de ICA y los flujos de **Power Automate** necesarios para conectar el Formulario y el Dashboard.

---

## 1. Estructura de la Lista de SharePoint: `Timesheet_ICA_2026`

Ubicación recomendada: Sitio de SharePoint de ICA Geoconsultores (ej. `https://icageoconsultores.sharepoint.com/sites/GestionOperativa/Lists/Timesheet_ICA_2026`).

| Columna | Nombre Interno | Tipo SharePoint | Opciones / Configuración | Obligatorio |
|:---|:---|:---|:---|:---:|
| **Título / ID** | `Title` | Una línea de texto | Formato: `TS-[YYYYMMDD]-[Usuario]-[ID]` | Sí |
| **Fecha** | `Fecha` | Fecha y hora (Solo fecha) | Formato estándar ISO | Sí |
| **Día Semana** | `DiaSemana` | Elección | `Lunes`, `Martes`, `Miércoles`, `Jueves`, `Viernes`, `Sábado`, `Domingo` | Sí |
| **Semana ISO** | `SemanaISO` | Número | Número entero (1 a 53) | Sí |
| **Correo Colaborador** | `UsuarioCorreo` | Una línea de texto | Formato: `nombre@icageoconsultores.cl` | Sí |
| **Nombre Colaborador** | `UsuarioNombre` | Una línea de texto | Claudia León, Cristóbal Bravo, Gonzalo Maragaño, Gonzalo Suárez, Javiera Rodríguez | Sí |
| **Tipo de Jornada** | `TipoJornada` | Elección | `Oficina_Efectiva`, `Terreno_Extendido`, `Feriado_Legal`, `Vacaciones`, `Licencia_Medica` | Sí |
| **Categoría** | `Categoria` | Elección | `Proyectos`, `Propuestas`, `Gestión Interna`, `Ausencia Justificada` | Sí |
| **Proyecto / Cliente** | `Proyecto` | Elección | `Kinross`, `HMC`, `BHP`, `B-Ambiental`, `MyMA`, `INOGEN`, `Propuestas Generales`, `Gestión Interna`, `Otros`, `N/A (Ausencia)` | Sí |
| **Horas Efectivas** | `HorasEfectivas` | Número (1 decimal) | Rango: `0.5` a `16.0` | Sí |
| **Tipo de Tarea** | `TipoActividad` | Elección | `Modelación`, `Isótopos / Hidroquímica`, `Redacción EETT / Informe`, `SIG / Cartografía`, `Terreno`, `Reunión Técnica`, `Administrativo` | Sí |
| **Detalle de Actividad** | `DetalleActividad` | Múltiples líneas (Texto sin formato) | Descripción del entregable | No |
| **Estado Revisión** | `EstadoRevision` | Elección | `Pendiente`, `Al Día`, `En Terreno`, `Aprobado_RRHH`, `Modificado_Admin` | Sí (Def: `Al Día`) |
| **Modificado por Admin** | `ModificadoPorAdmin` | Sí/No (Booleano) | Default: `No` | Sí |
| **Fecha Última Modificación**| `FechaModificacionAdmin`| Fecha y hora | Fecha cuando Elias Alvarado realizó una edición | No |
| **Nota de Auditoría** | `NotaAuditoria` | Múltiples líneas | Justificación del cambio realizado por el Admin | No |

---

## 2. Flujos de Power Automate Requeridos

### Flujo 1: `Timesheet_InsertDailyBatch` (Inserción del día)
- **Desencadenador**: Solicitud HTTP (`When an HTTP request is received`).
  - Método: `POST`
  - Payload JSON: Objeto con fecha, correo del colaborador y arreglo de tareas del día:
    ```json
    {
      "fecha": "2026-09-07",
      "usuario_correo": "cbravo@icageoconsultores.cl",
      "usuario_nombre": "Cristóbal Bravo",
      "tipo_jornada": "Oficina_Efectiva",
      "total_hh": 7.0,
      "tareas": [
        {
          "categoria": "Proyectos",
          "proyecto": "Kinross",
          "horas": 4.0,
          "actividad": "Redacción EETT / Informe",
          "detalle": "Capítulo 3 Metodología"
        },
        {
          "categoria": "Proyectos",
          "proyecto": "HMC",
          "horas": 3.0,
          "actividad": "Modelación",
          "detalle": "Calibración estado estacionario"
        }
      ]
    }
    ```
- **Acciones**:
  1. Recorrer el arreglo `tareas` con un bucle `Apply to each`.
  2. Ejecutar la acción **SharePoint - Create item** en la lista `Timesheet_ICA_2026`.
  3. Responder con código HTTP `200 OK`.

---

### Flujo 2: `Timesheet_AdminUpdateRecord` (Edición de RRHH)
- **Desencadenador**: Solicitud HTTP (`When an HTTP request is received`).
  - Método: `POST`
  - Encabezado: `x-admin-key: [CLAVE_UNICA]`
  - Payload JSON:
    ```json
    {
      "id_registro": 142,
      "nuevas_horas": 4.5,
      "nuevo_proyecto": "Kinross",
      "nueva_actividad": "Modelación",
      "justificacion": "Corrección de horas de reunión técnica solicitada por colaborador",
      "admin_responsable": "Elias Alvarado"
    }
    ```
- **Acciones**:
  1. Validar la clave de API / Admin.
  2. Ejecutar la acción **SharePoint - Update item** actualizando las columnas correspondientes y marcando `ModificadoPorAdmin = Yes`.
  3. **Enviar Correo de Auditoría a Elias Alvarado** (Acción `Send an email (V2)` de Office 365 Outlook):
     - Para: `ealvarado@icageoconsultores.cl`
     - Asunto: `[Timesheet ICA - Auditoría] Registro #142 Modificado por Administración`
     - Cuerpo con detalle del cambio antes y después.
  4. Responder con código HTTP `200 OK`.
