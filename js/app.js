/**
 * ICA Geoconsultores - Timesheet Corporativo
 * Lógica del Dashboard Kanban, Métricas y Consola Admin de Elias Alvarado
 */

document.addEventListener('DOMContentLoaded', () => {
  // Clave de Administrador Única
  const ADMIN_PASSKEY = 'ICA2026_ADMIN';
  const ADMIN_EMAIL = 'ealvarado@icageo.cl';
  let isAdminAuthenticated = false;

  // Elementos DOM
  const btnAdminAuth = document.getElementById('btnAdminAuth');
  const modalAdminAuth = document.getElementById('modalAdminAuth');
  const inputAdminPass = document.getElementById('inputAdminPass');
  const btnSubmitAdminAuth = document.getElementById('btnSubmitAdminAuth');
  const btnCloseAdminModal = document.getElementById('btnCloseAdminModal');
  const adminNotificationBanner = document.getElementById('adminNotificationBanner');
  const btnExportExcel = document.getElementById('btnExportExcel');

  // Modal de Edición de Registros
  const modalEditRecord = document.getElementById('modalEditRecord');
  const btnCloseEditModal = document.getElementById('btnCloseEditModal');
  const formEditRecord = document.getElementById('formEditRecord');
  const editRecordUser = document.getElementById('editRecordUser');
  const editRecordProject = document.getElementById('editRecordProject');
  const editRecordHours = document.getElementById('editRecordHours');
  const editRecordActivity = document.getElementById('editRecordActivity');
  const editRecordAuditNote = document.getElementById('editRecordAuditNote');
  let currentEditingItem = null;

  // Métricas DOM
  const kpiTotalHours = document.getElementById('kpiTotalHours');
  const kpiComplianceRate = document.getElementById('kpiComplianceRate');
  const kpiLeadingProject = document.getElementById('kpiLeadingProject');
  const kpiUsersOnTrack = document.getElementById('kpiUsersOnTrack');
  const projectBarsContainer = document.getElementById('projectBarsContainer');

  // Columnas Kanban
  const colPending = document.getElementById('colPending');
  const colOnTrack = document.getElementById('colOnTrack');
  const colTerrain = document.getElementById('colTerrain');
  const colApproved = document.getElementById('colApproved');

  // Inicializar Datos Semilla si no existen
  initSeedData();

  // Renderizar Todo
  renderDashboard();

  // Escuchar cuando se guarde un registro desde el formulario
  window.addEventListener('timesheet_record_saved', () => {
    renderDashboard();
  });

  // 1. Manejo de Autenticación Admin
  if (btnAdminAuth) {
    btnAdminAuth.addEventListener('click', () => {
      if (isAdminAuthenticated) {
        // Cerrar sesión admin
        isAdminAuthenticated = false;
        document.body.classList.remove('admin-authenticated');
        btnAdminAuth.classList.remove('authenticated');
        btnAdminAuth.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Acceso RRHH
        `;
        if (adminNotificationBanner) adminNotificationBanner.style.display = 'none';
        showToast('Modo Administración desactivado.', 'info');
        renderDashboard();
      } else {
        // Abrir modal de clave
        modalAdminAuth.classList.add('open');
        inputAdminPass.value = '';
        inputAdminPass.focus();
      }
    });
  }

  if (btnCloseAdminModal) {
    btnCloseAdminModal.addEventListener('click', () => {
      modalAdminAuth.classList.remove('open');
    });
  }

  if (btnSubmitAdminAuth) {
    btnSubmitAdminAuth.addEventListener('click', () => {
      const pass = inputAdminPass.value.trim();
      if (pass === ADMIN_PASSKEY) {
        isAdminAuthenticated = true;
        document.body.classList.add('admin-authenticated');
        btnAdminAuth.classList.add('authenticated');
        btnAdminAuth.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
          Admin: Elias Alvarado
        `;
        modalAdminAuth.classList.remove('open');
        if (adminNotificationBanner) {
          adminNotificationBanner.style.display = 'flex';
          adminNotificationBanner.innerHTML = `
            <span>🛡️ <strong>Modo Administrador Activo:</strong> Puedes editar registros. Las alertas y registros de auditoría se emitirán exclusivamente a <strong>${ADMIN_EMAIL}</strong>.</span>
          `;
        }
        showToast('¡Bienvenido, Elias Alvarado! Modo edición activado.', 'success');
        renderDashboard();
      } else {
        alert('Clave incorrecta. Por favor contacta al Administrador.');
      }
    });
  }

  // 2. Renderizado del Dashboard y Tablero Kanban
  function renderDashboard() {
    const rawData = JSON.parse(localStorage.getItem('ica_timesheet_data') || '[]');
    
    // Lista de Colaboradores Oficiales
    const teamMembers = [
      { name: 'Claudia León Rojas', email: 'cleon@icageo.cl', initials: 'CL' },
      { name: 'Cristóbal Bravo', email: 'cbravo@icageo.cl', initials: 'CB' },
      { name: 'Gonzalo Maragaño Carmona', email: 'gmaragano@icageo.cl', initials: 'GM' },
      { name: 'Gonzalo Suárez', email: 'gsuarez@icageo.cl', initials: 'GS' },
      { name: 'Javiera Rodríguez', email: 'jrodriguez@icageo.cl', initials: 'JR' }
    ];

    // Limpiar Columnas
    colPending.innerHTML = '';
    colOnTrack.innerHTML = '';
    colTerrain.innerHTML = '';
    colApproved.innerHTML = '';

    let totalTeamHours = 0;
    let usersOnTrackCount = 0;
    const projectHoursMap = {};

    teamMembers.forEach(member => {
      // Filtrar registros del colaborador
      const userRecords = rawData.filter(r => r.usuarioCorreo === member.email);
      let userTotalHH = 0;
      const userProjects = new Set();
      let latestTaskDesc = 'Sin actividad registrada hoy';
      let hasTerrain = false;

      userRecords.forEach(rec => {
        userTotalHH += rec.totalHH;
        if (rec.tipoJornada === 'Terreno_Extendido') hasTerrain = true;
        
        rec.tareas.forEach(t => {
          userProjects.add(t.proyecto);
          projectHoursMap[t.proyecto] = (projectHoursMap[t.proyecto] || 0) + t.horas;
          latestTaskDesc = `${t.proyecto}: ${t.detalle || t.actividad}`;
        });
      });

      totalTeamHours += userTotalHH;
      const targetWeekly = 31.0; // 7h L-J (28h) + 3h V = 31.0h efectivas
      
      // Determinar columna Kanban
      let columnTarget = colPending;
      let statusBadge = '<span class="badge badge-warning">Pendiente</span>';

      if (userTotalHH >= targetWeekly && !hasTerrain) {
        columnTarget = colOnTrack;
        statusBadge = '<span class="badge badge-success">Al Día (31h)</span>';
        usersOnTrackCount++;
      } else if (hasTerrain || userTotalHH > 35) {
        columnTarget = colTerrain;
        statusBadge = '<span class="badge badge-info">Terreno Extendido</span>';
        usersOnTrackCount++;
      } else if (userRecords.some(r => r.estadoRevision === 'Aprobado_RRHH')) {
        columnTarget = colApproved;
        statusBadge = '<span class="badge badge-purple">Aprobado RRHH</span>';
      }

      // Crear Tarjeta Kanban
      const card = document.createElement('div');
      card.className = 'kanban-card';
      
      const projectChipsHtml = Array.from(userProjects).slice(0, 3).map(p => 
        `<span class="project-chip">${p}</span>`
      ).join('');

      card.innerHTML = `
        <div class="card-top">
          <div class="card-user-info">
            <div class="user-avatar">${member.initials}</div>
            <div class="user-names">
              <h4>${member.name}</h4>
              <span>${member.email}</span>
            </div>
          </div>
          <div class="card-hours-badge">
            ${userTotalHH.toFixed(1)} <small>HH</small>
          </div>
        </div>
        <div class="card-projects-chips">
          ${projectChipsHtml || '<span style="font-size:0.72rem; color:#94a3b8;">Sin proyectos</span>'}
        </div>
        <div class="card-recent-task" title="${latestTaskDesc}">
          📝 ${latestTaskDesc.length > 55 ? latestTaskDesc.substring(0, 52) + '...' : latestTaskDesc}
        </div>
        <div class="card-actions-bar">
          <div>${statusBadge}</div>
          <button type="button" class="btn-card-edit" data-email="${member.email}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Editar Registro
          </button>
        </div>
      `;

      // Evento de Edición Admin
      const btnEdit = card.querySelector('.btn-card-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => {
          openEditModal(member, userRecords);
        });
      }

      columnTarget.appendChild(card);
    });

    // Actualizar Contadores de Columna
    document.getElementById('countPending').textContent = colPending.children.length;
    document.getElementById('countOnTrack').textContent = colOnTrack.children.length;
    document.getElementById('countTerrain').textContent = colTerrain.children.length;
    document.getElementById('countApproved').textContent = colApproved.children.length;

    // Actualizar Métricas KPI
    kpiTotalHours.textContent = totalTeamHours.toFixed(1) + ' HH';
    const compliancePct = Math.round((usersOnTrackCount / teamMembers.length) * 100);
    kpiComplianceRate.textContent = `${compliancePct}%`;
    kpiUsersOnTrack.textContent = `${usersOnTrackCount} de ${teamMembers.length}`;

    // Proyecto Líder
    let leaderProject = 'N/A';
    let maxProjectHH = 0;
    for (const [proj, hh] of Object.entries(projectHoursMap)) {
      if (hh > maxProjectHH) {
        maxProjectHH = hh;
        leaderProject = proj;
      }
    }
    kpiLeadingProject.textContent = leaderProject;

    // Renderizar Barras de Proyectos
    renderProjectBreakdown(projectHoursMap, totalTeamHours);
  }

  // 3. Renderizar Gráfico de Proyectos
  function renderProjectBreakdown(projectHoursMap, totalHours) {
    if (!projectBarsContainer) return;
    projectBarsContainer.innerHTML = '';

    const sortedProjects = Object.entries(projectHoursMap).sort((a, b) => b[1] - a[1]);
    
    if (sortedProjects.length === 0) {
      projectBarsContainer.innerHTML = '<p style="color:#94a3b8; font-size:0.85rem;">No hay proyectos imputados aún.</p>';
      return;
    }

    sortedProjects.forEach(([project, hh]) => {
      const pct = totalHours > 0 ? Math.round((hh / totalHours) * 100) : 0;
      const item = document.createElement('div');
      item.className = 'project-bar-item';
      item.innerHTML = `
        <div class="project-bar-info">
          <span>${project}</span>
          <span><strong>${hh.toFixed(1)} HH</strong> (${pct}%)</span>
        </div>
        <div class="project-bar-track">
          <div class="project-bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      projectBarsContainer.appendChild(item);
    });
  }

  // 4. Modal de Edición de Registros para Elias Alvarado
  function openEditModal(member, userRecords) {
    if (!isAdminAuthenticated) return;
    currentEditingItem = { member, records: userRecords };
    
    modalEditRecord.classList.add('open');
    editRecordUser.value = `${member.name} (${member.email})`;

    // Tomar primer registro o crear uno
    const latest = userRecords[0] || { totalHH: 7.0, tareas: [{ proyecto: 'Kinross', actividad: 'Modelación', horas: 7.0 }] };
    const firstTask = latest.tareas[0] || { proyecto: 'Kinross', actividad: 'Modelación', horas: 7.0 };

    editRecordProject.value = firstTask.proyecto || 'Kinross';
    editRecordHours.value = latest.totalHH || 7.0;
    editRecordActivity.value = firstTask.actividad || 'Modelación / Análisis Numérico';
    editRecordAuditNote.value = '';
  }

  if (btnCloseEditModal) {
    btnCloseEditModal.addEventListener('click', () => {
      modalEditRecord.classList.remove('open');
    });
  }

  if (formEditRecord) {
    formEditRecord.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentEditingItem) return;

      const newHours = parseFloat(editRecordHours.value) || 0;
      const newProj = editRecordProject.value;
      const newAct = editRecordActivity.value;
      const note = editRecordAuditNote.value.trim() || 'Ajuste administrativo regular de horas';

      // Actualizar en localStorage
      const rawData = JSON.parse(localStorage.getItem('ica_timesheet_data') || '[]');
      const targetUser = currentEditingItem.member.email;

      // Modificar registros del usuario
      rawData.forEach(rec => {
        if (rec.usuarioCorreo === targetUser) {
          rec.totalHH = newHours;
          rec.estadoRevision = 'Modificado_Admin';
          rec.auditModificadoPor = 'Elias Alvarado (Admin)';
          rec.auditFecha = new Date().toISOString();
          rec.auditNota = note;
          if (rec.tareas.length > 0) {
            rec.tareas[0].proyecto = newProj;
            rec.tareas[0].horas = newHours;
            rec.tareas[0].actividad = newAct;
          }
        }
      });

      localStorage.setItem('ica_timesheet_data', JSON.stringify(rawData));
      modalEditRecord.classList.remove('open');

      // Notificación Exclusiva a Elias Alvarado
      const logMessage = `[Auditoría Admin]: Modificado registro de ${currentEditingItem.member.name} a ${newHours} HH (${newProj}). Alerta de trazabilidad emitida a ${ADMIN_EMAIL}.`;
      console.log(logMessage);
      showToast(logMessage, 'success');

      renderDashboard();
    });
  }

  // 5. Exportar a Excel (.csv normalizado)
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
      const rawData = JSON.parse(localStorage.getItem('ica_timesheet_data') || '[]');
      if (rawData.length === 0) {
        alert('No hay datos disponibles para exportar.');
        return;
      }

      let csvContent = 'ID,Fecha,Colaborador,Correo,Tipo_Jornada,Total_HH,Proyecto,Horas_Tarea,Actividad,Detalle,Estado_Revision,Modificado_Por,Nota_Auditoria\n';

      rawData.forEach(rec => {
        rec.tareas.forEach(t => {
          const row = [
            `"${rec.id}"`,
            `"${rec.fecha}"`,
            `"${rec.usuarioNombre}"`,
            `"${rec.usuarioCorreo}"`,
            `"${rec.tipoJornada}"`,
            rec.totalHH,
            `"${t.proyecto}"`,
            t.horas,
            `"${t.actividad}"`,
            `"${(t.detalle || '').replace(/"/g, '""')}"`,
            `"${rec.estadoRevision || 'Al Día'}"`,
            `"${rec.auditModificadoPor || 'N/A'}"`,
            `"${rec.auditNota || ''}"`
          ].join(',');
          csvContent += row + '\n';
        });
      });

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Timesheet_Consolidado_ICA_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Consolidado descargado exitosamente en formato Excel / CSV.', 'success');
    });
  }

  // 6. Datos Semilla Iniciales Basados en el Equipo Real
  function initSeedData() {
    if (!localStorage.getItem('ica_timesheet_data')) {
      const seed = [
        {
          id: 'TS-20260901-01',
          fecha: '2026-09-04',
          usuarioCorreo: 'cbravo@icageo.cl',
          usuarioNombre: 'Cristóbal Bravo',
          tipoJornada: 'Oficina_Efectiva',
          totalHH: 31.0,
          tareas: [
            { categoria: 'Proyectos', proyecto: 'Kinross', horas: 24.0, actividad: 'Redacción EETT / Informe', detalle: 'Metodología y resultados de modelo hidrogeológico' },
            { categoria: 'Proyectos', proyecto: 'HMC - Tambo de Oro', horas: 7.0, actividad: 'Modelación / Análisis Numérico', detalle: 'Perfiles en Leapfrog' }
          ],
          estadoRevision: 'Al Día'
        },
        {
          id: 'TS-20260901-02',
          fecha: '2026-09-04',
          usuarioCorreo: 'cleon@icageo.cl',
          usuarioNombre: 'Claudia León Rojas',
          tipoJornada: 'Oficina_Efectiva',
          totalHH: 28.0,
          tareas: [
            { categoria: 'Proyectos', proyecto: 'B-Ambiental', horas: 16.0, actividad: 'Hidroquímica / Isótopos', detalle: 'Pimentón: Isótopos molécula de agua' },
            { categoria: 'Proyectos', proyecto: 'INOGEN', horas: 12.0, actividad: 'Redacción EETT / Informe', detalle: 'Revisión técnica de figuras' }
          ],
          estadoRevision: 'Al Día'
        },
        {
          id: 'TS-20260901-03',
          fecha: '2026-09-04',
          usuarioCorreo: 'gmaragano@icageo.cl',
          usuarioNombre: 'Gonzalo Maragaño Carmona',
          tipoJornada: 'Oficina_Efectiva',
          totalHH: 31.0,
          tareas: [
            { categoria: 'Proyectos', proyecto: 'Kinross', horas: 20.0, actividad: 'Modelación / Análisis Numérico', detalle: 'Modelo LNF parámetros hidráulicos' },
            { categoria: 'Proyectos', proyecto: 'MyMA', horas: 11.0, actividad: 'SIG / Cartografía', detalle: 'DIA glaciares y permafrost' }
          ],
          estadoRevision: 'Al Día'
        },
        {
          id: 'TS-20260901-04',
          fecha: '2026-09-04',
          usuarioCorreo: 'gsuarez@icageo.cl',
          usuarioNombre: 'Gonzalo Suárez',
          tipoJornada: 'Parcial',
          totalHH: 21.0,
          tareas: [
            { categoria: 'Proyectos', proyecto: 'BHP Experto', horas: 14.0, actividad: 'Redacción EETT / Informe', detalle: 'Revisión antecedentes' },
            { categoria: 'Gestión Interna', proyecto: 'Gestión Interna / Reunión', horas: 7.0, actividad: 'Reunión Interna / Planificación', detalle: 'Exámenes ASCH y coordinación' }
          ],
          estadoRevision: 'Pendiente'
        },
        {
          id: 'TS-20260901-05',
          fecha: '2026-09-04',
          usuarioCorreo: 'jrodriguez@icageo.cl',
          usuarioNombre: 'Javiera Rodríguez',
          tipoJornada: 'Terreno_Extendido',
          totalHH: 38.0,
          tareas: [
            { categoria: 'Proyectos', proyecto: 'B-Ambiental', horas: 26.0, actividad: 'Terreno / Piezometría', detalle: 'Campaña piezométrica en terreno' },
            { categoria: 'Proyectos', proyecto: 'Otros', horas: 12.0, actividad: 'Reunión Técnica con Cliente', detalle: 'Inducciones CCU Quilicura' }
          ],
          estadoRevision: 'En Terreno'
        }
      ];
      localStorage.setItem('ica_timesheet_data', JSON.stringify(seed));
    }
  }
});
