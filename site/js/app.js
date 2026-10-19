/**
 * ICA Geoconsultores - Timesheet Corporativo
 * Lógica del Dashboard Kanban, Métricas Ejecutivas y Consola de Administración (RBAC)
 * Administradores Autorizados: Elias Alvarado, José Manuel Aedo, Sergio Iriarte
 */

document.addEventListener('DOMContentLoaded', () => {
  // Escapa texto libre destinado a innerHTML.
  //
  // Se usa para todo dato que provenga de una persona (detalle de tarea,
  // nombre de proyecto, actividad). Ver la nota de la Fase 0.5 del plan:
  // esto deja de ser cosmetico cuando el navegador custodie un token.
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 0. Estado de administracion
  //
  // La autenticacion de administrador por clave maestra y PIN quedo ELIMINADA.
  // Motivo: en un sitio estatico toda credencial se entrega al navegador, de
  // modo que el candado sobre las metricas por consultor era cosmetico. La
  // clave `ICA2026_ADMIN` y el mapa de PINs estuvieron publicados en el repo
  // desde el commit inicial. No se reemplazan por otra clave: la sustituta es
  // Entra ID con permisos de nivel de elemento en SharePoint (Fase 6 del plan),
  // que impide que el servidor entregue datos ajenos en lugar de solo ocultarlos.
  //
  // Hasta entonces la app NO expone metricas por persona.

  // Elementos DOM - Acceso Administrador & Métricas Restringidas
  const btnExportExcel = document.getElementById('btnExportExcel');



  // Métricas Clave Ejecutivas DOM
  const kpiTotalHours = document.getElementById('kpiTotalHours');
  const kpiBillableRate = document.getElementById('kpiBillableRate');
  const kpiBillableSubtext = document.getElementById('kpiBillableSubtext');
  const kpiTerrainGabinete = document.getElementById('kpiTerrainGabinete');
  const kpiTerrainSubtext = document.getElementById('kpiTerrainSubtext');
  const kpiLeadingProject = document.getElementById('kpiLeadingProject');
  const kpiComplianceRate = document.getElementById('kpiComplianceRate');
  const kpiUsersOnTrack = document.getElementById('kpiUsersOnTrack');
  const projectBarsContainer = document.getElementById('projectBarsContainer');

  // Columnas Kanban
  const colPending = document.getElementById('colPending');
  const colOnTrack = document.getElementById('colOnTrack');
  const colTerrain = document.getElementById('colTerrain');
  const colApproved = document.getElementById('colApproved');

  // Inicializar semilla y limpiar credenciales heredadas de este navegador
  initSeedData();
  purgeLegacyCredentials();
  renderDashboard();

  // Escuchar cuando se guarde un registro desde el formulario diario
  window.addEventListener('timesheet_record_saved', () => {
    renderDashboard();
  });

  // 1. Purga de credenciales heredadas
  //
  // Los navegadores que ya usaron la app tienen PINs y sesiones de admin en
  // localStorage. Se eliminan en cada carga: ya no significan nada y no deben
  // sobrevivir como residuo.
  function purgeLegacyCredentials() {
    ['ica_user_pins', 'ica_admin_session', 'ica_pa_endpoint',
     'ica_timesheet_v6_imported'].forEach(k => {
      try { localStorage.removeItem(k); } catch (e) { /* almacenamiento no disponible */ }
    });
  }

  // Modal Detalle de Tareas del Consultor (Vista de Solo Lectura para Usuarios)
  const modalUserDetailView = document.getElementById('modalUserDetailView');
  const btnCloseDetailModal = document.getElementById('btnCloseDetailModal');
  const btnCloseDetailFooter = document.getElementById('btnCloseDetailFooter');
  const detailModalUserName = document.getElementById('detailModalUserName');
  const detailModalUserEmail = document.getElementById('detailModalUserEmail');
  const detailModalTotalHH = document.getElementById('detailModalTotalHH');
  const detailModalTableBody = document.getElementById('detailModalTableBody');

  function openDetailModal(member, userRecords) {
    if (!modalUserDetailView) return;
    if (detailModalUserName) detailModalUserName.textContent = member.name;
    if (detailModalUserEmail) detailModalUserEmail.textContent = member.email;
    const totalH = userRecords.reduce((acc, r) => acc + (r.totalHH || 0), 0);
    if (detailModalTotalHH) detailModalTotalHH.textContent = totalH.toFixed(1) + ' HH';

    if (detailModalTableBody) {
      detailModalTableBody.innerHTML = '';
      if (userRecords.length === 0) {
        detailModalTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color: #94a3b8;">Sin actividades registradas en el período seleccionado.</td></tr>';
      } else {
        const sortedRecords = [...userRecords].sort((a, b) => a.fecha.localeCompare(b.fecha));
        sortedRecords.forEach(r => {
          (r.tareas || []).forEach(t => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            tr.innerHTML = `
              <td style="padding: 0.45rem 0.6rem; font-weight: 600; white-space: nowrap; color: #334155;">${r.fecha}</td>
              <td style="padding: 0.45rem 0.6rem;"><span class="project-chip" style="font-size: 0.72rem;">${esc(t.proyecto)}</span></td>
              <td style="padding: 0.45rem 0.6rem; text-align: center; font-weight: 700; color: var(--color-primary);">${t.horas.toFixed(1)}</td>
              <td style="padding: 0.45rem 0.6rem; color: #475569;"><strong>${esc(t.actividad)}</strong>: ${esc(t.detalle)}</td>
            `;
            detailModalTableBody.appendChild(tr);
          });
        });
      }
    }
    modalUserDetailView.classList.add('open');
  }

  if (btnCloseDetailModal) {
    btnCloseDetailModal.addEventListener('click', () => {
      if (modalUserDetailView) modalUserDetailView.classList.remove('open');
    });
  }
  if (btnCloseDetailFooter) {
    btnCloseDetailFooter.addEventListener('click', () => {
      if (modalUserDetailView) modalUserDetailView.classList.remove('open');
    });
  }

  // Cerrar modales al hacer clic fuera del recuadro (backdrop)
  [modalUserDetailView].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }
  });

  // Selector de Período en la Barra Superior
  const selectDashboardPeriod = document.getElementById('selectDashboardPeriod');
  if (selectDashboardPeriod) {
    selectDashboardPeriod.addEventListener('change', () => {
      renderDashboard();
    });
  }

  // 2. Renderizado del Dashboard, Métricas Ejecutivas y Tablero Kanban
  function renderDashboard() {
    const rawData = JSON.parse(localStorage.getItem('ica_timesheet_data') || '[]');
    const periodSelect = document.getElementById('selectDashboardPeriod');
    const selectedPeriod = periodSelect ? periodSelect.value : 'all';

    let filteredData = rawData;
    let targetWeekly = 62.0; // 2 semanas estándar (all)
    let periodSubtextStr = "Horas acumuladas del período (24 Ago - 07 Sep)";

    if (selectedPeriod === 'w1') {
      filteredData = rawData.filter(r => r.fecha >= '2026-08-24' && r.fecha <= '2026-08-29');
      targetWeekly = 31.0;
      periodSubtextStr = "Horas acumuladas Semana 1 (24 al 29 de Agosto)";
    } else if (selectedPeriod === 'w2') {
      filteredData = rawData.filter(r => r.fecha >= '2026-08-31' && r.fecha <= '2026-09-06');
      targetWeekly = 31.0;
      periodSubtextStr = "Horas acumuladas Semana 2 (31 Ago al 06 de Septiembre)";
    } else if (selectedPeriod === 'w3') {
      filteredData = rawData.filter(r => r.fecha >= '2026-09-07' && r.fecha <= '2026-09-11');
      targetWeekly = 31.0;
      periodSubtextStr = "Horas acumuladas Semana 3 (07 al 11 de Septiembre)";
    }

    const kpiHoursSub = document.querySelector('#kpiTotalHours + .kpi-subtext');
    if (kpiHoursSub) kpiHoursSub.textContent = periodSubtextStr;

    // Lista de Colaboradores Oficiales (7 integrantes del equipo)
    const teamMembers = [
      { name: 'Claudia León Rojas', email: 'cleon@icageo.cl', initials: 'CL' },
      { name: 'Cristóbal Bravo', email: 'cbravo@icageo.cl', initials: 'CB' },
      { name: 'Elias Alvarado', email: 'ealvarado@icageo.cl', initials: 'EA' },
      { name: 'Gonzalo Maragaño Carmona', email: 'gmaragano@icageo.cl', initials: 'GM' },
      { name: 'Gonzalo Suárez', email: 'gsuarez@icageo.cl', initials: 'GS' },
      { name: 'Javiera Rodríguez', email: 'jrodriguez@icageo.cl', initials: 'JR' },
      { name: 'Viviana Castillo', email: 'vcastillo@icageo.cl', initials: 'VC' }
    ];

    // Limpiar Columnas Kanban
    if (colPending) colPending.innerHTML = '';
    if (colOnTrack) colOnTrack.innerHTML = '';
    if (colTerrain) colTerrain.innerHTML = '';
    if (colApproved) colApproved.innerHTML = '';

    let totalTeamHours = 0;
    let billableHours = 0;
    let proposalHours = 0;
    let internalHours = 0;
    let terrainHours = 0;
    let gabineteHours = 0;
    let usersOnTrackCount = 0;
    const projectHoursMap = {};
    const teamStats = [];

    // Calcular distribución general de horas de los registros filtrados
    filteredData.forEach(rec => {
      totalTeamHours += (rec.totalHH || 0);
      const isRecordTerrain = (rec.tipoJornada === 'Terreno_Extendido' || rec.tipoJornada === 'Terreno');

      (rec.tareas || []).forEach(t => {
        const proj = t.proyecto || 'General';
        projectHoursMap[proj] = (projectHoursMap[proj] || 0) + t.horas;

        const pLower = proj.toLowerCase();
        const aLower = (t.actividad || '').toLowerCase();

        // 1. Facturabilidad
        if (pLower.includes('propuesta') || aLower.includes('propuesta')) {
          proposalHours += t.horas;
        } else if (pLower.includes('gestión interna') || pLower.includes('reunión interna') || 
                   pLower.includes('capacitación') || pLower.includes('licencia') || 
                   pLower.includes('vacaciones') || pLower.includes('ausencia') || 
                   pLower.includes('administrativo') || pLower.includes('epp') ||
                   pLower.includes('exámenes')) {
          internalHours += t.horas;
        } else {
          // Clientes: Minera Pimentón, Kinross, Las Luces, CCU, WSP, BSF, Tambo de Oro, BHP, AMSA, etc.
          billableHours += t.horas;
        }

        // 2. Terreno vs Gabinete
        if (isRecordTerrain || aLower.includes('terreno') || aLower.includes('piezometría') || 
            aLower.includes('aforo') || aLower.includes('monitoreo')) {
          terrainHours += t.horas;
        } else {
          gabineteHours += t.horas;
        }
      });
    });

    // Procesar cada miembro del equipo para Kanban y Ranking Confidencial
    teamMembers.forEach(member => {
      const userRecords = filteredData.filter(r => r.usuarioCorreo === member.email);
      let userTotalHH = 0;
      const userProjects = new Set();
      let latestTaskDesc = 'Sin actividad registrada en este período';
      let hasTerrain = false;

      userRecords.forEach(rec => {
        userTotalHH += (rec.totalHH || 0);
        if (rec.tipoJornada === 'Terreno_Extendido' || rec.tipoJornada === 'Terreno') hasTerrain = true;
        
        (rec.tareas || []).forEach(t => {
          userProjects.add(t.proyecto);
          latestTaskDesc = `${t.proyecto}: ${t.detalle || t.actividad}`;
        });
      });

      // Determinar columna Kanban
      let columnTarget = colPending;
      let statusBadge = '<span class="badge badge-warning">Pendiente</span>';

      if (userTotalHH >= targetWeekly && !hasTerrain) {
        columnTarget = colOnTrack;
        statusBadge = `<span class="badge badge-success">Al Día (${targetWeekly.toFixed(0)}h)</span>`;
        usersOnTrackCount++;
      } else if (hasTerrain || userTotalHH > targetWeekly + 4.0) {
        columnTarget = colTerrain;
        statusBadge = '<span class="badge badge-info">Terreno Extendido</span>';
        usersOnTrackCount++;
      } else if (userRecords.some(r => r.estadoRevision === 'Aprobado_RRHH')) {
        columnTarget = colApproved;
        statusBadge = '<span class="badge badge-purple">Aprobado RRHH</span>';
      }

      // Guardar estadísticas para ranking admin
      const projectsArray = Array.from(userProjects);
      teamStats.push({
        member,
        name: member.name,
        email: member.email,
        initials: member.initials,
        totalHH: userTotalHH,
        hasTerrain,
        statusBadge,
        projectsSummary: projectsArray.slice(0, 3).join(', ') || 'Sin proyectos',
        records: userRecords
      });

      // Crear Tarjeta Kanban
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.style.cursor = 'pointer';
      
      const projectChipsHtml = projectsArray.slice(0, 4).map(p => 
        `<span class="project-chip">${esc(p)}</span>`
      ).join('');

      card.innerHTML = `
        <div class="card-top">
          <div class="card-user-info">
            <div class="user-avatar">${member.initials}</div>
            <div class="user-names">
              <h4>${esc(member.name)}</h4>
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
        <div class="card-recent-task" title="${esc(latestTaskDesc)}">
          📝 ${esc(latestTaskDesc.length > 55 ? latestTaskDesc.substring(0, 52) + '...' : latestTaskDesc)}
        </div>
        <div class="card-actions-bar">
          <div>${statusBadge}</div>
          <button type="button" class="btn-card-edit" data-email="${member.email}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Ver Tareas
          </button>
        </div>
      `;

      // Evento de clic en tarjeta o botón
      const btnEdit = card.querySelector('.btn-card-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetailModal(member, userRecords);
        });
      }
      card.addEventListener('click', () => {
        openDetailModal(member, userRecords);
      });

      if (columnTarget) columnTarget.appendChild(card);
    });

    // Actualizar Contadores de Columna
    if (colPending) document.getElementById('countPending').textContent = colPending.children.length;
    if (colOnTrack) document.getElementById('countOnTrack').textContent = colOnTrack.children.length;
    if (colTerrain) document.getElementById('countTerrain').textContent = colTerrain.children.length;
    if (colApproved) document.getElementById('countApproved').textContent = colApproved.children.length;

    // Actualizar Métricas KPI Clave Ejecutivas
    if (kpiTotalHours) kpiTotalHours.textContent = totalTeamHours.toFixed(1) + ' HH';

    const billablePct = totalTeamHours > 0 ? Math.round((billableHours / totalTeamHours) * 100) : 0;
    if (kpiBillableRate) kpiBillableRate.textContent = `${billablePct}%`;
    if (kpiBillableSubtext) {
      kpiBillableSubtext.textContent = `${billableHours.toFixed(1)}h a cliente (${billablePct}%) · ${proposalHours.toFixed(1)}h propuestas · ${internalHours.toFixed(1)}h internas`;
    }

    const terrainPct = totalTeamHours > 0 ? Math.round((terrainHours / totalTeamHours) * 100) : 0;
    const gabinetePct = 100 - terrainPct;
    if (kpiTerrainGabinete) kpiTerrainGabinete.textContent = `${terrainPct}% / ${gabinetePct}%`;
    if (kpiTerrainSubtext) {
      kpiTerrainSubtext.textContent = `${terrainHours.toFixed(1)}h Terreno (${terrainPct}%) · ${gabineteHours.toFixed(1)}h Gabinete (${gabinetePct}%)`;
    }

    const compliancePct = Math.round((usersOnTrackCount / teamMembers.length) * 100);
    if (kpiComplianceRate) kpiComplianceRate.textContent = `${compliancePct}%`;
    if (kpiUsersOnTrack) kpiUsersOnTrack.textContent = `${usersOnTrackCount} de ${teamMembers.length} al día`;

    // Proyecto Líder
    let leaderProject = 'N/A';
    let maxProjectHH = 0;
    for (const [proj, hh] of Object.entries(projectHoursMap)) {
      if (hh > maxProjectHH) {
        maxProjectHH = hh;
        leaderProject = proj;
      }
    }
    if (kpiLeadingProject) kpiLeadingProject.textContent = leaderProject;
    const kpiLeadSub = document.querySelector('#kpiLeadingProject + .kpi-subtext');
    if (kpiLeadSub) {
      const leadPct = totalTeamHours > 0 ? Math.round((maxProjectHH / totalTeamHours) * 100) : 0;
      kpiLeadSub.textContent = `${maxProjectHH.toFixed(1)} HH (${leadPct}% del total)`;
    }

    // Renderizar Barras de Proyectos Globales
    renderProjectBreakdown(projectHoursMap, totalTeamHours);

    // El ranking individual por consultor se RETIRO del sitio publicado.
    //
    // No basta con ocultarlo en pantalla: mientras el dataset se sirva como
    // archivo estatico, cualquiera lo descarga por URL. La confidencialidad
    // real llega en la Fase 6 con permisos de nivel de elemento en SharePoint,
    // donde el servidor devuelve a cada consultor unicamente sus propias
    // filas. Hasta entonces el ranking vive en el Excel maestro local, que
    // ya tiene control de acceso efectivo.
    //
    // `teamStats` se sigue calculando porque alimenta el Kanban.

  }
  window.renderDashboard = renderDashboard;

  // 3. Renderizar Gráfico de Distribución de Proyectos
  function renderProjectBreakdown(projectHoursMap, totalHours) {
    if (!projectBarsContainer) return;
    projectBarsContainer.innerHTML = '';

    const sortedProjects = Object.entries(projectHoursMap).sort((a, b) => b[1] - a[1]);
    
    if (sortedProjects.length === 0) {
      projectBarsContainer.innerHTML = '<p style="color:#94a3b8; font-size:0.85rem;">No hay proyectos imputados en este período aún.</p>';
      return;
    }

    sortedProjects.forEach(([project, hh]) => {
      const pct = totalHours > 0 ? Math.round((hh / totalHours) * 100) : 0;
      const item = document.createElement('div');
      item.className = 'project-bar-item';
      item.innerHTML = `
        <div class="project-bar-info">
          <span>${esc(project)}</span>
          <span><strong>${hh.toFixed(1)} HH</strong> (${pct}%)</span>
        </div>
        <div class="project-bar-track">
          <div class="project-bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      projectBarsContainer.appendChild(item);
    });
  }

  // 4. Edicion administrativa de registros: DESHABILITADA
  //
  // La implementacion anterior aplicaba el cambio a TODOS los registros del
  // consultor (recorria rawData filtrando solo por usuarioCorreo), de modo que
  // un solo guardado colapsaba sus 10-14 jornadas a la misma cifra de horas y
  // el mismo proyecto, estampando una nota de auditoria que declaraba un cambio
  // puntual. Ademas grababa cadenas vacias cuando el proyecto original no era
  // una opcion del <select>, lo que era el caso habitual.
  //
  // Se reabre en la Fase 5 del plan: edicion por (persona, fecha), con
  // origen AJUSTE_SOCIO, valor anterior y justificacion obligatoria.

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

  // 6. Carga Inicial de Datos Reales Consolidados del Equipo (7 Integrantes)
  // Siembra de datos: hace MERGE, no sobrescribe.
  //
  // La version anterior hacia `localStorage.setItem('ica_timesheet_data', ...)`
  // con el dataset completo, protegida solo por la bandera de version
  // `ica_timesheet_v6_imported`. Como form.html no carga este archivo, nunca
  // llegaba a setear la bandera: un registro guardado desde el formulario se
  // destruia al abrir el dashboard. Perdida de datos silenciosa.
  //
  // Ahora la semilla solo aporta las jornadas que el usuario no tiene, se
  // identifica por hash del contenido en vez de por una version manual (asi
  // un dataset nuevo alcanza a los navegadores que ya sembraron), y en ningun
  // caso pisa lo que la persona escribio.
  function initSeedData() {
    const seed = window.ICA_TEAM_DATA || window.ICA_REAL_TEAM_DATA || [];
    if (!Array.isArray(seed) || seed.length === 0) return;

    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem('ica_timesheet_data') || '[]');
      if (!Array.isArray(existing)) existing = [];
    } catch (e) {
      console.warn('Registros locales ilegibles; se parte de cero.', e);
      existing = [];
    }

    // Clave de jornada: una persona, un dia.
    const claveJornada = r => (r.usuarioCorreo || '') + '|' + (r.fecha || '');
    const yaPresentes = new Set(existing.map(claveJornada));

    const nuevas = seed.filter(r => !yaPresentes.has(claveJornada(r)));
    if (nuevas.length === 0) return;

    localStorage.setItem('ica_timesheet_data', JSON.stringify(existing.concat(nuevas)));
    console.info('Semilla aplicada: ' + nuevas.length + ' jornadas anadidas, '
                 + existing.length + ' conservadas.');
  }
});
