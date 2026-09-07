/**
 * ICA Geoconsultores - Timesheet Corporativo
 * Lógica del Formulario con Interfaz Tipo Calendar
 */

document.addEventListener('DOMContentLoaded', () => {
  const userSelect = document.getElementById('userSelect');
  const userEmailInput = document.getElementById('userEmail');
  const dateInput = document.getElementById('dateInput');
  const targetHoursDisplay = document.getElementById('targetHoursDisplay');
  const terrainCheckbox = document.getElementById('terrainCheckbox');
  const tasksContainer = document.getElementById('tasksContainer');
  const btnAddTask = document.getElementById('btnAddTask');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressText = document.getElementById('progressText');
  const validationSummary = document.getElementById('validationSummary');
  const formDaily = document.getElementById('formDailyTimesheet');
  
  // Mapeo de Correos Institucionales Oficiales (@icageo.cl)
  const userDirectory = {
    'cbravo@icageo.cl': 'Cristóbal Bravo',
    'cleon@icageo.cl': 'Claudia León Rojas',
    'gmaragano@icageo.cl': 'Gonzalo Maragaño Carmona',
    'gsuarez@icageo.cl': 'Gonzalo Suárez',
    'jrodriguez@icageo.cl': 'Javiera Rodríguez'
  };

  // Catálogo Oficial de Proyectos con Códigos/OT de ICA
  const projectCatalog = {
    'Proyectos': [
      'Kinross',
      'HMC - Tambo de Oro',
      'HMC - Sagasca',
      'BHP Experto',
      'BHP PAT',
      'BHP-Cerro Colorado',
      'B-Ambiental',
      'MyMA',
      'INOGEN',
      'AMSA - Pelambre',
      'Collahuasi',
      'Teck-Exploración',
      'Otros'
    ],
    'Propuestas': ['Propuestas Generales (Evaluación / Licitación)'],
    'Gestión Interna': ['Reunión Semanal / Coordinación', 'Capacitación / Soporte Interno', 'Administrativo']
  };

  // Sistema de PIN de 4 Dígitos por Usuario
  function getUserPins() {
    const defaultPins = {
      'cbravo@icageo.cl': '1234',
      'cleon@icageo.cl': '1234',
      'gmaragano@icageo.cl': '1234',
      'gsuarez@icageo.cl': '1234',
      'jrodriguez@icageo.cl': '1234'
    };
    const stored = localStorage.getItem('ica_user_pins');
    if (!stored) {
      localStorage.setItem('ica_user_pins', JSON.stringify(defaultPins));
      return defaultPins;
    }
    return JSON.parse(stored);
  }

  let authenticatedUserEmail = null;

  // Cargar Propuestas Personalizadas creadas por colaboradores
  function loadCustomProposals() {
    const custom = JSON.parse(localStorage.getItem('ica_custom_proposals') || '[]');
    custom.forEach(p => {
      const label = `[Propuesta] ${p.nombre} (${p.cliente})`;
      if (!projectCatalog['Propuestas'].includes(label)) {
        projectCatalog['Propuestas'].push(label);
      }
    });
  }
  loadCustomProposals();

  // 1. Inicialización de Fecha Actual
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  if (dateInput) {
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // 2. Sincronizar Usuario, Correo Institucional y Bloqueo por PIN
  const pinStatusText = document.getElementById('pinStatusText');
  const btnOpenPinModal = document.getElementById('btnOpenPinModal');
  const btnChangePinModal = document.getElementById('btnChangePinModal');
  const modalUserPinAuth = document.getElementById('modalUserPinAuth');
  const inputUserPin = document.getElementById('inputUserPin');
  const btnSubmitUserPin = document.getElementById('btnSubmitUserPin');
  const btnClosePinModal = document.getElementById('btnClosePinModal');
  const pinModalUserName = document.getElementById('pinModalUserName');

  // Modal Cambiar PIN
  const modalChangeUserPin = document.getElementById('modalChangeUserPin');
  const btnCloseChangePinModal = document.getElementById('btnCloseChangePinModal');
  const formChangeUserPin = document.getElementById('formChangeUserPin');
  const inputCurrentPin = document.getElementById('inputCurrentPin');
  const inputNewPin = document.getElementById('inputNewPin');
  const inputConfirmPin = document.getElementById('inputConfirmPin');

  // Modal Nueva Propuesta
  const btnOpenNewProposal = document.getElementById('btnOpenNewProposal');
  const modalNewProposal = document.getElementById('modalNewProposal');
  const btnCloseNewProposalModal = document.getElementById('btnCloseNewProposalModal');
  const formCreateProposal = document.getElementById('formCreateProposal');
  const inputProposalName = document.getElementById('inputProposalName');
  const inputProposalClient = document.getElementById('inputProposalClient');
  const inputProposalNotes = document.getElementById('inputProposalNotes');

  function checkUserPinState() {
    const currentEmail = userSelect ? userSelect.value : '';
    const currentName = userDirectory[currentEmail] || 'Colaborador';

    if (authenticatedUserEmail === currentEmail) {
      // Usuario autenticado
      if (formDaily) formDaily.classList.remove('form-content-locked');
      if (pinStatusText) {
        pinStatusText.className = 'pin-status-text unlocked';
        pinStatusText.innerHTML = `✓ <strong>Sesión Activa:</strong> ${currentName} (PIN Validado)`;
      }
      if (btnOpenPinModal) btnOpenPinModal.style.display = 'none';
      if (btnChangePinModal) btnChangePinModal.style.display = 'inline-block';
    } else {
      // Bloqueado
      if (formDaily) formDaily.classList.add('form-content-locked');
      if (pinStatusText) {
        pinStatusText.className = 'pin-status-text locked';
        pinStatusText.innerHTML = `🔒 <strong>Sesión Bloqueada:</strong> Ingresa el PIN de 4 números de ${currentName}`;
      }
      if (btnOpenPinModal) {
        btnOpenPinModal.style.display = 'inline-block';
        btnOpenPinModal.innerHTML = `🔑 Desbloquear (${currentName.split(' ')[0]})`;
      }
      if (btnChangePinModal) btnChangePinModal.style.display = 'none';
    }
  }

  if (userSelect && userEmailInput) {
    userSelect.addEventListener('change', () => {
      userEmailInput.value = userSelect.value;
      authenticatedUserEmail = null; // Requiere re-validar PIN al cambiar de usuario
      checkUserPinState();
      recalculateDayProgress();
    });
  }

  // Eventos de Autenticación PIN
  if (btnOpenPinModal) {
    btnOpenPinModal.addEventListener('click', () => {
      const currentEmail = userSelect ? userSelect.value : '';
      const currentName = userDirectory[currentEmail] || 'Colaborador';
      if (pinModalUserName) pinModalUserName.textContent = currentName;
      if (inputUserPin) inputUserPin.value = '';
      if (modalUserPinAuth) modalUserPinAuth.classList.add('open');
      setTimeout(() => { if (inputUserPin) inputUserPin.focus(); }, 150);
    });
  }

  if (btnClosePinModal) {
    btnClosePinModal.addEventListener('click', () => {
      if (modalUserPinAuth) modalUserPinAuth.classList.remove('open');
    });
  }

  if (btnSubmitUserPin) {
    btnSubmitUserPin.addEventListener('click', () => {
      const currentEmail = userSelect ? userSelect.value : '';
      const enteredPin = inputUserPin ? inputUserPin.value.trim() : '';
      const userPins = getUserPins();
      const expectedPin = userPins[currentEmail] || '1234';

      if (enteredPin === expectedPin) {
        authenticatedUserEmail = currentEmail;
        checkUserPinState();
        if (modalUserPinAuth) modalUserPinAuth.classList.remove('open');
        showToast(`✓ Identidad validada exitosamente como ${userDirectory[currentEmail]}.`, 'success');
      } else {
        alert(`PIN incorrecto para ${userDirectory[currentEmail]}.\n(PIN inicial de fábrica: 1234)`);
        if (inputUserPin) {
          inputUserPin.value = '';
          inputUserPin.focus();
        }
      }
    });
  }

  if (inputUserPin) {
    inputUserPin.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnSubmitUserPin.click();
      }
    });
  }

  // Cambiar PIN Personal
  if (btnChangePinModal) {
    btnChangePinModal.addEventListener('click', () => {
      if (modalChangeUserPin) modalChangeUserPin.classList.add('open');
      if (inputCurrentPin) inputCurrentPin.value = '';
      if (inputNewPin) inputNewPin.value = '';
      if (inputConfirmPin) inputConfirmPin.value = '';
    });
  }

  if (btnCloseChangePinModal) {
    btnCloseChangePinModal.addEventListener('click', () => {
      if (modalChangeUserPin) modalChangeUserPin.classList.remove('open');
    });
  }

  if (formChangeUserPin) {
    formChangeUserPin.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentEmail = userSelect ? userSelect.value : '';
      const userPins = getUserPins();
      const expectedPin = userPins[currentEmail] || '1234';

      if (inputCurrentPin.value !== expectedPin) {
        alert('El PIN actual ingresado no es correcto.');
        return;
      }
      if (inputNewPin.value.length !== 4 || !/^\d{4}$/.test(inputNewPin.value)) {
        alert('El nuevo PIN debe consistir de exactamente 4 números (ej: 5821).');
        return;
      }
      if (inputNewPin.value !== inputConfirmPin.value) {
        alert('La confirmación del nuevo PIN no coincide.');
        return;
      }

      userPins[currentEmail] = inputNewPin.value;
      localStorage.setItem('ica_user_pins', JSON.stringify(userPins));
      if (modalChangeUserPin) modalChangeUserPin.classList.remove('open');
      showToast('✓ Tu PIN personal de 4 dígitos ha sido actualizado.', 'success');
    });
  }

  // Creación Colaborativa de Propuestas
  if (btnOpenNewProposal) {
    btnOpenNewProposal.addEventListener('click', () => {
      if (modalNewProposal) modalNewProposal.classList.add('open');
      if (inputProposalName) inputProposalName.value = '';
      if (inputProposalClient) inputProposalClient.value = '';
      if (inputProposalNotes) inputProposalNotes.value = '';
    });
  }

  if (btnCloseNewProposalModal) {
    btnCloseNewProposalModal.addEventListener('click', () => {
      if (modalNewProposal) modalNewProposal.classList.remove('open');
    });
  }

  // Cerrar modales del formulario al hacer clic fuera del recuadro
  [modalUserPinAuth, modalChangeUserPin, modalNewProposal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }
  });

  if (formCreateProposal) {
    formCreateProposal.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = inputProposalName.value.trim();
      const client = inputProposalClient.value.trim();
      const notes = inputProposalNotes.value.trim();
      const creator = userDirectory[userSelect.value] || 'Colaborador';

      if (!name || !client) return;

      const newProposalObj = {
        id: 'PROP-' + Date.now(),
        nombre: name,
        cliente: client,
        notas: notes,
        creadoPor: creator,
        fecha: new Date().toISOString(),
        estado: 'Pendiente Revisión Admin'
      };

      const custom = JSON.parse(localStorage.getItem('ica_custom_proposals') || '[]');
      custom.push(newProposalObj);
      localStorage.setItem('ica_custom_proposals', JSON.stringify(custom));

      const label = `[Propuesta] ${name} (${client})`;
      if (!projectCatalog['Propuestas'].includes(label)) {
        projectCatalog['Propuestas'].push(label);
      }

      // Crear fila automáticamente con la nueva propuesta
      createTaskRow('Propuestas', label, 3.5, 'Redacción EETT / Informe', notes || 'Elaboración de propuesta');
      
      if (modalNewProposal) modalNewProposal.classList.remove('open');
      showToast(`✓ Propuesta "${name}" registrada y asignada a tu jornada.`, 'success');
    });
  }

  // Inicializar estado del PIN
  checkUserPinState();

  // 3. Determinar Meta Diaria según Día de la Semana
  function getDailyTargetHours(dateString) {
    if (!dateString) return 7.0;
    const [year, month, day] = dateString.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 5 = Viernes, 6 = Sábado
    
    if (dayOfWeek === 5) {
      return 3.0; // Viernes: 09:30 a 12:30
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 0.0; // Fin de semana
    }
    return 7.0; // Lunes a Jueves: 09:30 a 17:30 menos 1h colación
  }

  function updateTargetBanner() {
    const target = getDailyTargetHours(dateInput.value);
    const isFriday = target === 3.0;
    const isWeekend = target === 0.0;
    
    if (targetHoursDisplay) {
      if (isWeekend) {
        targetHoursDisplay.innerHTML = `Día no laboral (<strong>Fin de Semana</strong>)`;
      } else if (isFriday) {
        targetHoursDisplay.innerHTML = `Meta del día: <strong>3.0 HH</strong> (Viernes sin colación: 09:30 - 12:30)`;
      } else {
        targetHoursDisplay.innerHTML = `Meta del día: <strong>7.0 HH</strong> (09:30 a 17:30 con 1h de colación)`;
      }
    }
    recalculateDayProgress();
  }

  if (dateInput) {
    dateInput.addEventListener('change', updateTargetBanner);
  }

  // 4. Agregar Fila de Tarea al Timeline
  function createTaskRow(defaultCat = 'Proyectos', defaultProj = 'Kinross', defaultHours = 3.5, defaultAct = 'Redacción EETT / Informe', defaultDesc = '') {
    const taskId = 'task_' + Math.random().toString(36).substr(2, 9);
    const row = document.createElement('div');
    row.className = 'task-card-item';
    row.id = taskId;

    // Generar opciones de categoría
    const catOptions = Object.keys(projectCatalog).map(cat => 
      `<option value="${cat}" ${cat === defaultCat ? 'selected' : ''}>${cat}</option>`
    ).join('');

    // Generar opciones de proyectos para la categoría seleccionada
    const currentProjects = projectCatalog[defaultCat] || [];
    const projOptions = currentProjects.map(proj => 
      `<option value="${proj}" ${proj === defaultProj ? 'selected' : ''}>${proj}</option>`
    ).join('');

    // Generar opciones de actividades
    const actOptions = activityTypes.map(act => 
      `<option value="${act}" ${act === defaultAct ? 'selected' : ''}>${act}</option>`
    ).join('');

    row.innerHTML = `
      <div class="task-row-grid">
        <div class="input-group">
          <label>Categoría</label>
          <select class="input-control select-category">
            ${catOptions}
          </select>
        </div>
        <div class="input-group">
          <label>Proyecto / Cliente</label>
          <select class="input-control select-project">
            ${projOptions}
          </select>
        </div>
        <div class="input-group">
          <label>Horas (HH)</label>
          <input type="number" class="input-control input-hours" min="0.5" max="16" step="0.5" value="${defaultHours}">
        </div>
        <div class="input-group">
          <label>Actividad / Detalle</label>
          <div style="display: flex; gap: 0.5rem;">
            <select class="input-control select-activity" style="max-width: 220px;">
              ${actOptions}
            </select>
            <input type="text" class="input-control input-desc" placeholder="Detalle del avance..." value="${defaultDesc}" style="flex: 1;">
          </div>
        </div>
        <button type="button" class="btn-remove-task" title="Eliminar Tarea">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    `;

    // Eventos dinámicos en la fila
    const catSelect = row.querySelector('.select-category');
    const projSelect = row.querySelector('.select-project');
    const hoursInput = row.querySelector('.input-hours');
    const removeBtn = row.querySelector('.btn-remove-task');

    catSelect.addEventListener('change', () => {
      const selectedCat = catSelect.value;
      const projs = projectCatalog[selectedCat] || [];
      projSelect.innerHTML = projs.map(p => `<option value="${p}">${p}</option>`).join('');
    });

    hoursInput.addEventListener('input', recalculateDayProgress);
    removeBtn.addEventListener('click', () => {
      row.remove();
      recalculateDayProgress();
    });

    tasksContainer.appendChild(row);
    recalculateDayProgress();
  }

  if (btnAddTask) {
    btnAddTask.addEventListener('click', () => {
      createTaskRow('Proyectos', 'Kinross', 3.5, 'Modelación / Análisis Numérico');
    });
  }

  // 5. Botones de Ausencia Rápida
  const absenceButtons = document.querySelectorAll('.btn-absence');
  absenceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const target = getDailyTargetHours(dateInput.value) || 7.0;
      
      // Limpiar tareas y setear ausencia
      tasksContainer.innerHTML = '';
      createTaskRow('Gestión Interna', `Ausencia: ${type}`, target, 'Administrativo', `Registro justificado: ${type}`);
      showToast(`Se ha configurado la jornada completa como: ${type}`, 'info');
    });
  });

  // 6. Recalcular Progreso del Día
  function recalculateDayProgress() {
    const target = getDailyTargetHours(dateInput.value);
    const hourInputs = document.querySelectorAll('.input-hours');
    let totalAssigned = 0;

    hourInputs.forEach(input => {
      const val = parseFloat(input.value) || 0;
      totalAssigned += val;
    });

    const isTerrain = terrainCheckbox && terrainCheckbox.checked;
    const pct = target > 0 ? Math.min((totalAssigned / target) * 100, 100) : 100;
    
    if (progressBarFill) {
      progressBarFill.style.width = `${pct}%`;
      progressBarFill.className = 'progress-bar-fill';
      
      if (isTerrain && totalAssigned > target) {
        progressBarFill.classList.add('extended');
      } else if (totalAssigned === target) {
        progressBarFill.classList.add('complete');
      }
    }

    if (progressText) {
      progressText.textContent = `${totalAssigned.toFixed(1)} / ${target.toFixed(1)} HH`;
    }

    // Validación y mensaje en vivo
    if (validationSummary) {
      validationSummary.className = 'validation-summary';
      if (totalAssigned === target) {
        validationSummary.classList.add('ok');
        validationSummary.innerHTML = `✓ Jornada cuadrada exactamente (${totalAssigned.toFixed(1)} HH)`;
      } else if (totalAssigned < target) {
        validationSummary.classList.add('pending');
        const diff = (target - totalAssigned).toFixed(1);
        validationSummary.innerHTML = `⚠️ Faltan ${diff} HH para completar la meta de hoy (${target.toFixed(1)} HH)`;
      } else {
        if (isTerrain) {
          validationSummary.classList.add('extended');
          validationSummary.innerHTML = `✓ Jornada de Terreno Extendida (+${(totalAssigned - target).toFixed(1)} HH extra)`;
        } else {
          validationSummary.classList.add('pending');
          validationSummary.innerHTML = `⚠️ Sobrepasas la jornada normal por ${(totalAssigned - target).toFixed(1)} HH (Activa la casilla de Terreno si corresponde)`;
        }
      }
    }
  }

  if (terrainCheckbox) {
    terrainCheckbox.addEventListener('change', recalculateDayProgress);
  }

  // 7. Envío Único del Formulario
  if (formDaily) {
    formDaily.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const userEmail = userEmailInput.value;
      const userName = userDirectory[userEmail] || userSelect.options[userSelect.selectedIndex].text;
      const dateVal = dateInput.value;
      const target = getDailyTargetHours(dateVal);
      const isTerrain = terrainCheckbox && terrainCheckbox.checked;

      const taskItems = [];
      let sumHours = 0;

      document.querySelectorAll('.task-card-item').forEach(item => {
        const cat = item.querySelector('.select-category').value;
        const proj = item.querySelector('.select-project').value;
        const hh = parseFloat(item.querySelector('.input-hours').value) || 0;
        const act = item.querySelector('.select-activity').value;
        const desc = item.querySelector('.input-desc').value;

        if (hh > 0) {
          sumHours += hh;
          taskItems.push({
            categoria: cat,
            proyecto: proj,
            horas: hh,
            actividad: act,
            detalle: desc
          });
        }
      });

      if (taskItems.length === 0) {
        alert('Por favor agrega al menos una tarea al día.');
        return;
      }

      if (!isTerrain && sumHours !== target && target > 0) {
        const conf = confirm(`Las horas ingresadas (${sumHours.toFixed(1)} HH) no coinciden exactamente con la meta del día (${target.toFixed(1)} HH).\n\n¿Deseas enviar el registro de todas formas?`);
        if (!conf) return;
      }

      // Formatear payload oficial para SharePoint / Power Automate (TablaTimesheetICA)
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dateParts = dateVal.split('-').map(Number);
      const dayIndex = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).getDay();
      const diaSemana = dayNames[dayIndex] || 'Lunes';

      const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 3).toUpperCase();
      const timeStamp = Date.now().toString().slice(-4);

      // Tareas formateadas exactamente para TablaTimesheetICA
      const paTasks = taskItems.map((t, idx) => ({
        ID_Registro: `TS-${dateVal.replace(/-/g, '')}-${userInitials}-${idx + 1}`,
        Proyecto: t.proyecto,
        Codigo_OT: 'OT-AUTO',
        Horas_HH: t.horas,
        Actividad_Descripcion: t.detalle ? `${t.actividad}: ${t.detalle}` : t.actividad,
        Estado_Aprobacion: isTerrain ? 'En Terreno' : (sumHours >= target ? 'Al Día' : 'Pendiente'),
        Origen_Registro: 'Web App Calendar (GitHub Pages)'
      }));

      const paPayload = {
        Fecha_Labor: dateVal,
        Fecha_Semana: dateVal,
        Dia_Semana: diaSemana,
        Consultor: userName,
        Correo_Corporativo: userEmail,
        Tipo_Jornada: isTerrain ? 'Terreno_Extendido' : (sumHours === target ? 'Oficina_Efectiva' : 'Parcial'),
        Total_HH: sumHours,
        tareas: paTasks
      };

      // Guardar en Almacenamiento Local (para visualización inmediata en el Dashboard)
      const localPayload = {
        id: `TS-${dateVal.replace(/-/g, '')}-${userInitials}`,
        fecha: dateVal,
        usuarioCorreo: userEmail,
        usuarioNombre: userName,
        tipoJornada: paPayload.Tipo_Jornada,
        totalHH: sumHours,
        tareas: taskItems,
        estadoRevision: isTerrain ? 'En Terreno' : (sumHours >= target ? 'Al Día' : 'Pendiente'),
        fechaEnvio: new Date().toISOString()
      };

      saveDailyRecord(localPayload);

      // Envío a Power Automate si está configurado el Endpoint
      const paEndpoint = localStorage.getItem('ica_pa_endpoint');
      if (paEndpoint && paEndpoint.startsWith('http')) {
        showToast('Enviando y sincronizando con SharePoint de ICA...', 'info');
        fetch(paEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paPayload),
          mode: 'no-cors'
        }).then(() => {
          showToast(`✓ ¡Jornada de ${userName} sincronizada exitosamente en SharePoint!`, 'success');
        }).catch(err => {
          console.warn('Error al contactar Power Automate:', err);
          showToast(`Guardado localmente. Revisa la conexión de Power Automate.`, 'warning');
        });
      } else {
        showToast(`✓ Jornada de ${userName} (${sumHours} HH) guardada. (Configura el Endpoint en Acceso RRHH para envío automático a SharePoint).`, 'success');
      }

      // Notificar al Dashboard si está abierto
      window.dispatchEvent(new CustomEvent('timesheet_record_saved', { detail: localPayload }));
    });
  }

  function saveDailyRecord(record) {
    const existing = JSON.parse(localStorage.getItem('ica_timesheet_data') || '[]');
    // Reemplazar o insertar registro para la misma persona y fecha
    const filtered = existing.filter(r => !(r.usuarioCorreo === record.usuarioCorreo && r.fecha === record.fecha));
    filtered.push(record);
    localStorage.setItem('ica_timesheet_data', JSON.stringify(filtered));
  }

  // Inicializar con dos bloques estándar (3.5h y 3.5h) para un día normal
  updateTargetBanner();
  if (tasksContainer && tasksContainer.children.length === 0) {
    createTaskRow('Proyectos', 'Kinross', 3.5, 'Redacción EETT / Informe', 'Metodología y resultados de modelo');
    createTaskRow('Proyectos', 'HMC - Tambo de Oro', 3.5, 'Modelación / Análisis Numérico', 'Revisión balance hídrico');
  }
});

// Utilidad de Notificación Toast Global
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="font-weight: 600; font-size: 0.85rem;">${message}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
