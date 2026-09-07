# Guía de Conexión Power Automate (Vía B.1)
## Web en GitHub Pages → SharePoint Online → Carpeta Local `SEID\ICAGEO CHILE - Pegas\Timesheet`

Esta guía te muestra cómo activar el conector en **Microsoft Power Automate** en solo 5 minutos para que cada vez que un colega envíe sus horas desde la web en línea ([`timesheet-ica`](https://ealvaradopincheira-collab.github.io/timesheet-ica/)), se agregue automáticamente a la tabla oficial **`TablaTimesheetICA`** de tu archivo [`Timesheet_Maestro_ICA_Estandarizado.xlsx`](file:///C:/Users/ealva/SEID/ICAGEO%20CHILE%20-%20Pegas/Timesheet/Timesheet_Maestro_ICA_Estandarizado.xlsx) y se descargue a tu computador.

---

## Paso 1: Crear el Flujo en Power Automate

1. Ingresa a **[make.powerautomate.com](https://make.powerautomate.com)** con tu cuenta `@icageo.cl`.
2. En el menú izquierdo, haz clic en **Crear (Create)** > **Flujo de nube instantáneo (Instant cloud flow)**.
3. Asígnale el nombre: **`Timesheet_ICA_Sincronizador_Web`**.
4. En la lista de desencadenadores, busca y selecciona:
   **`Cuando se recibe una solicitud HTTP` (When an HTTP request is received)**.
5. Haz clic en **Crear**.

---

## Paso 2: Configurar el Desencadenador HTTP

1. En el campo **Quién puede desencadenar el flujo**, selecciona: **Cualquiera (Anyone)**.
2. En el cuadro **Esquema JSON del cuerpo de la solicitud (Request Body JSON Schema)**, copia y pega el siguiente esquema:

```json
{
  "type": "object",
  "properties": {
    "Fecha_Labor": { "type": "string" },
    "Fecha_Semana": { "type": "string" },
    "Dia_Semana": { "type": "string" },
    "Consultor": { "type": "string" },
    "Correo_Corporativo": { "type": "string" },
    "Tipo_Jornada": { "type": "string" },
    "Total_HH": { "type": "number" },
    "tareas": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "ID_Registro": { "type": "string" },
          "Proyecto": { "type": "string" },
          "Codigo_OT": { "type": "string" },
          "Horas_HH": { "type": "number" },
          "Actividad_Descripcion": { "type": "string" },
          "Estado_Aprobacion": { "type": "string" },
          "Origen_Registro": { "type": "string" }
        },
        "required": ["ID_Registro", "Proyecto", "Horas_HH"]
      }
    }
  },
  "required": ["Fecha_Labor", "Consultor", "Correo_Corporativo", "tareas"]
}
```

---

## Paso 3: Agregar la Acción para Insertar en Excel

1. Haz clic en **+ Nuevo paso (+ New step)**.
2. Agrega la acción de control: **`Aplicar a cada uno` (Apply to each)**.
3. En el campo *Seleccionar una salida de los pasos anteriores*, elige el parámetro dinámico: **`tareas`**.
4. **Dentro del bucle `Aplicar a cada uno`**, haz clic en **Agregar una acción**:
   - Busca: **Excel Online (empresa) / Excel Online (Business)**.
   - Selecciona la acción: **`Agregar una fila a una tabla` (Add a row into a table)**.
5. Configura los parámetros del archivo:
   - **Ubicación (Location)**: Tu sitio de SharePoint (ej. *ICAGEO CHILE - Pegas* o *Sitio de Gestión*).
   - **Biblioteca de documentos (Document Library)**: *Documentos* (Documents).
   - **Archivo (File)**: Busca la carpeta `/Timesheet/` y selecciona **`Timesheet_Maestro_ICA_Estandarizado.xlsx`**.
   - **Tabla (Table)**: Selecciona de la lista desplegable: **`TablaTimesheetICA`**.
6. Se desplegarán automáticamente las columnas de la tabla. Asocia cada campo con el contenido dinámico:
   - **ID_Registro**: `items('Aplicar_a_cada_uno')?['ID_Registro']`
   - **Fecha_Semana**: `triggerBody()?['Fecha_Semana']`
   - **Fecha_Labor**: `triggerBody()?['Fecha_Labor']`
   - **Consultor**: `triggerBody()?['Consultor']`
   - **Correo_Corporativo**: `triggerBody()?['Correo_Corporativo']`
   - **Proyecto**: `items('Aplicar_a_cada_uno')?['Proyecto']`
   - **Codigo_OT**: `items('Aplicar_a_cada_uno')?['Codigo_OT']`
   - **Actividad_Descripcion**: `items('Aplicar_a_cada_uno')?['Actividad_Descripcion']`
   - **Dia_Semana**: `triggerBody()?['Dia_Semana']`
   - **Horas_HH**: `items('Aplicar_a_cada_uno')?['Horas_HH']`
   - **Estado_Aprobacion**: `items('Aplicar_a_cada_uno')?['Estado_Aprobacion']`
   - **Origen_Registro**: `items('Aplicar_a_cada_uno')?['Origen_Registro']`

---

## Paso 4: Responder con 200 OK

1. Fuera del bucle `Aplicar a cada uno`, agrega un último paso:
   - Busca: **`Respuesta` (Response)**.
   - Código de estado: **`200`**.
   - Encabezados (Headers):
     - `Access-Control-Allow-Origin`: `*`
     - `Content-Type`: `application/json`
   - Cuerpo (Body):
     ```json
     { "status": "success", "message": "Jornada registrada y sincronizada en SharePoint" }
     ```

---

## Paso 5: Copiar la URL y Pegarla en la Web

1. Haz clic en **Guardar** en la esquina superior derecha.
2. Abre el primer paso (*Cuando se recibe una solicitud HTTP*).
3. Verás que se ha generado la **URL de HTTP POST** (ej. `https://prod-XX.westus.logic.azure.com:443/workflows/...`).
4. Cópiala.
5. Abre la web: **[https://ealvaradopincheira-collab.github.io/timesheet-ica/](https://ealvaradopincheira-collab.github.io/timesheet-ica/)**
6. Haz clic en **Acceso RRHH** (clave: `ICA2026_ADMIN`) > Botón **⚙️ Configuración M365**.
7. Pega tu URL de Power Automate y guarda.

¡Listo! A partir de ese momento, cada envío desde el celular o computador de tus colegas viajará por Power Automate, escribirá en `TablaTimesheetICA` y tu OneDrive lo bajará a tu computador en segundos.
