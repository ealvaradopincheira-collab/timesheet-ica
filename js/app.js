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
        const btnAdminPins = document.getElementById('btnAdminManagePinsCatalog');
        if (btnAdminPins) btnAdminPins.style.display = 'none';
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
        const btnAdminPins = document.getElementById('btnAdminManagePinsCatalog');
        if (btnAdminPins) btnAdminPins.style.display = 'inline-block';
        modalAdminAuth.classList.remove('open');
        if (adminNotificationBanner) {
          adminNotificationBanner.style.display = 'flex';
          adminNotificationBanner.innerHTML = `
            <span>🛡️ <strong>Modo Administrador Activo:</strong> Puedes editar registros, gestionar PINs de usuarios y administrar propuestas. Alertas dirigidas a <strong>${ADMIN_EMAIL}</strong>.</span>
          `;
        }
        showToast('¡Bienvenido, Elias Alvarado! Modo edición y gestión activado.', 'success');
        renderDashboard();
      } else {
        alert('Clave incorrecta. Por favor contacta al Administrador.');
      }
    });
  }

  // 1.1 Configuración de Conexión M365 / Power Automate
  const btnM365Config = document.getElementById('btnM365Config');
  const modalM365Settings = document.getElementById('modalM365Settings');
  const btnCloseM365Modal = document.getElementById('btnCloseM365Modal');
  const inputPAEndpoint = document.getElementById('inputPAEndpoint');
  const btnSaveM365Endpoint = document.getElementById('btnSaveM365Endpoint');
  const btnTestM365Connection = document.getElementById('btnTestM365Connection');
  const m365ConnectionStatus = document.getElementById('m365ConnectionStatus');

  function updateM365StatusBadge() {
    const ep = localStorage.getItem('ica_pa_endpoint');
    if (m365ConnectionStatus) {
      if (ep && ep.startsWith('http')) {
        m365ConnectionStatus.style.color = '#10b981';
        m365ConnectionStatus.innerHTML = `✓ Conectado a Power Automate (${ep.slice(0, 40)}...)`;
      } else {
        m365ConnectionStatus.style.color = '#f59e0b';
        m365ConnectionStatus.innerHTML = `● Sin endpoint configurado (Guardando en caché local)`;
      }
    }
  }

  if (btnM365Config) {
    btnM365Config.addEventListener('click', () => {
      if (modalM365Settings) {
        modalM365Settings.classList.add('open');
        if (inputPAEndpoint) inputPAEndpoint.value = localStorage.getItem('ica_pa_endpoint') || '';
        updateM365StatusBadge();
      }
    });
  }

  if (btnCloseM365Modal) {
    btnCloseM365Modal.addEventListener('click', () => {
      modalM365Settings.classList.remove('open');
    });
  }

  if (btnSaveM365Endpoint) {
    btnSaveM365Endpoint.addEventListener('click', () => {
      const url = inputPAEndpoint.value.trim();
      if (url && !url.startsWith('http')) {
        alert('Por favor introduce una URL válida que empiece por https://');
        return;
      }
      localStorage.setItem('ica_pa_endpoint', url);
      updateM365StatusBadge();
      modalM365Settings.classList.remove('open');
      showToast('Configuración de Power Automate guardada con éxito.', 'success');
    });
  }

  if (btnTestM365Connection) {
    btnTestM365Connection.addEventListener('click', () => {
      const url = inputPAEndpoint.value.trim();
      if (!url) {
        alert('Introduce una URL antes de probar la conexión.');
        return;
      }
      showToast('Probando comunicación con webhook...', 'info');
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, admin: 'Elias Alvarado' }),
        mode: 'no-cors'
      }).then(() => {
        showToast('✓ Solicitud de prueba enviada a Power Automate.', 'success');
      }).catch(err => {
        alert('Error al contactar el endpoint: ' + err.message);
      });
    });
  }

  // 1.2 Gestión de PINs y Propuestas (Admin: Elias Alvarado)
  const btnAdminManagePinsCatalog = document.getElementById('btnAdminManagePinsCatalog');
  const modalAdminCatalogAndPins = document.getElementById('modalAdminCatalogAndPins');
  const btnCloseAdminPinsModal = document.getElementById('btnCloseAdminPinsModal');
  const btnCloseAdminPinsFooter = document.getElementById('btnCloseAdminPinsFooter');
  const tablePinsAdminBody = document.getElementById('tablePinsAdminBody');
  const listAdminProposalsContainer = document.getElementById('listAdminProposalsContainer');

  function renderAdminPinsAndProposals() {
    const userPins = JSON.parse(localStorage.getItem('ica_user_pins') || '{}');
    const teamMembersList = [
      { name: 'Claudia León Rojas', email: 'cleon@icageo.cl' },
      { name: 'Cristóbal Bravo', email: 'cbravo@icageo.cl' },
      { name: 'Elias Alvarado', email: 'ealvarado@icageo.cl' },
      { name: 'Gonzalo Maragaño Carmona', email: 'gmaragano@icageo.cl' },
      { name: 'Gonzalo Suárez', email: 'gsuarez@icageo.cl' },
      { name: 'Javiera Rodríguez', email: 'jrodriguez@icageo.cl' },
      { name: 'Viviana Castillo', email: 'vcastillo@icageo.cl' }
    ];

    if (tablePinsAdminBody) {
      tablePinsAdminBody.innerHTML = '';
      teamMembersList.forEach(m => {
        const pin = userPins[m.email] || '1234';
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f1f5f9';
        tr.innerHTML = `
          <td style="padding: 0.5rem 0.75rem; font-weight: 600;">${m.name}</td>
          <td style="padding: 0.5rem 0.75rem; color: #64748b;">${m.email}</td>
          <td style="padding: 0.5rem 0.75rem;"><span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${pin}</span></td>
          <td style="padding: 0.5rem 0.75rem; text-align: right;">
            <button type="button" class="btn btn-outline btn-reset-pin" data-email="${m.email}" style="padding: 2px 8px; font-size: 0.75rem;">Resetear a 1234</button>
          </td>
        `;
        tablePinsAdminBody.appendChild(tr);
      });

      // Eventos resetear PIN
      document.querySelectorAll('.btn-reset-pin').forEach(btn => {
        btn.addEventListener('click', () => {
          const email = btn.getAttribute('data-email');
          userPins[email] = '1234';
          localStorage.setItem('ica_user_pins', JSON.stringify(userPins));
          renderAdminPinsAndProposals();
          showToast(`✓ PIN de ${email} reseteado a 1234 exitosamente.`, 'success');
        });
      });
    }

    if (listAdminProposalsContainer) {
      const customProposals = JSON.parse(localStorage.getItem('ica_custom_proposals') || '[]');
      listAdminProposalsContainer.innerHTML = '';

      if (customProposals.length === 0) {
        listAdminProposalsContainer.innerHTML = '<p style="color: #94a3b8; font-size: 0.8rem; padding: 0.5rem;">No hay propuestas adicionales creadas por el equipo aún.</p>';
      } else {
        customProposals.forEach((p, idx) => {
          const div = document.createElement('div');
          div.style.cssText = 'padding: 0.6rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;';
          div.innerHTML = `
            <div>
              <div style="font-weight: 700; font-size: 0.85rem; color: #1e293b;">${p.nombre} <span style="font-weight: normal; color: #64748b;">(${p.cliente})</span></div>
              <div style="font-size: 0.75rem; color: #64748b;">Creado por: <strong>${p.creadoPor}</strong> | Estado: <span class="badge badge-warning" style="font-size: 0.68rem;">${p.estado || 'Pendiente'}</span></div>
            </div>
            <div style="display: flex; gap: 0.4rem;">
              <button type="button" class="btn btn-outline btn-approve-proposal" data-idx="${idx}" style="padding: 2px 8px; font-size: 0.75rem; color: #059669; border-color: #a7f3d0;">Aprobar / Asignar OT</button>
              <button type="button" class="btn btn-outline btn-delete-proposal" data-idx="${idx}" style="padding: 2px 8px; font-size: 0.75rem; color: #dc2626; border-color: #fca5a5;">Eliminar</button>
            </div>
          `;
          listAdminProposalsContainer.appendChild(div);
        });

        // Eventos de propuestas
        document.querySelectorAll('.btn-approve-proposal').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            const ot = prompt('Ingresa el código / OT oficial para esta propuesta:', 'PROP-2026-' + (idx + 1));
            if (ot) {
              customProposals[idx].estado = `Aprobado (OT: ${ot})`;
              localStorage.setItem('ica_custom_proposals', JSON.stringify(customProposals));
              renderAdminPinsAndProposals();
              showToast(`✓ Propuesta aprobada con OT: ${ot}. Alerta enviada a ${ADMIN_EMAIL}.`, 'success');
            }
          });
        });

        document.querySelectorAll('.btn-delete-proposal').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            if (confirm(`¿Eliminar la propuesta "${customProposals[idx].nombre}"?`)) {
              customProposals.splice(idx, 1);
              localStorage.setItem('ica_custom_proposals', JSON.stringify(customProposals));
              renderAdminPinsAndProposals();
              showToast('Propuesta eliminada.', 'info');
            }
          });
        });
      }
    }
  }

  if (btnAdminManagePinsCatalog) {
    btnAdminManagePinsCatalog.addEventListener('click', () => {
      if (modalAdminCatalogAndPins) {
        modalAdminCatalogAndPins.classList.add('open');
        renderAdminPinsAndProposals();
      }
    });
  }

  if (btnCloseAdminPinsModal) {
    btnCloseAdminPinsModal.addEventListener('click', () => {
      modalAdminCatalogAndPins.classList.remove('open');
    });
  }
  if (btnCloseAdminPinsFooter) {
    btnCloseAdminPinsFooter.addEventListener('click', () => {
      modalAdminCatalogAndPins.classList.remove('open');
    });
  }

  // Modal Detalle de Tareas del Consultor
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
              <td style="padding: 0.45rem 0.6rem;"><span class="project-chip" style="font-size: 0.72rem;">${t.proyecto}</span></td>
              <td style="padding: 0.45rem 0.6rem; text-align: center; font-weight: 700; color: var(--color-primary);">${t.horas.toFixed(1)}</td>
              <td style="padding: 0.45rem 0.6rem; color: #475569;"><strong>${t.actividad}</strong>: ${t.detalle || ''}</td>
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
  [modalAdminAuth, modalEditRecord, modalM365Settings, modalAdminCatalogAndPins, modalUserDetailView].forEach(modal => {
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

  // 2. Renderizado del Dashboard y Tablero Kanban
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

    // Lista de Colaboradores Oficiales (7 integrantes)
    const teamMembers = [
      { name: 'Claudia León Rojas', email: 'cleon@icageo.cl', initials: 'CL' },
      { name: 'Cristóbal Bravo', email: 'cbravo@icageo.cl', initials: 'CB' },
      { name: 'Elias Alvarado', email: 'ealvarado@icageo.cl', initials: 'EA' },
      { name: 'Gonzalo Maragaño Carmona', email: 'gmaragano@icageo.cl', initials: 'GM' },
      { name: 'Gonzalo Suárez', email: 'gsuarez@icageo.cl', initials: 'GS' },
      { name: 'Javiera Rodríguez', email: 'jrodriguez@icageo.cl', initials: 'JR' },
      { name: 'Viviana Castillo', email: 'vcastillo@icageo.cl', initials: 'VC' }
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
      // Filtrar registros del colaborador en el período
      const userRecords = filteredData.filter(r => r.usuarioCorreo === member.email);
      let userTotalHH = 0;
      const userProjects = new Set();
      let latestTaskDesc = 'Sin actividad registrada en este período';
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

      // Crear Tarjeta Kanban
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.style.cursor = 'pointer';
      
      const projectChipsHtml = Array.from(userProjects).slice(0, 4).map(p => 
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
            ${isAdminAuthenticated ? 'Editar Horas' : 'Ver Tareas'}
          </button>
        </div>
      `;

      // Evento de clic en tarjeta o botón
      const btnEdit = card.querySelector('.btn-card-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isAdminAuthenticated) {
            openEditModal(member, userRecords);
          } else {
            openDetailModal(member, userRecords);
          }
        });
      }
      card.addEventListener('click', () => {
        if (isAdminAuthenticated) {
          openEditModal(member, userRecords);
        } else {
          openDetailModal(member, userRecords);
        }
      });

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
  window.renderDashboard = renderDashboard;

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

  // 6. Carga Inicial de Datos Reales Consolidados del Equipo (7 Integrantes)
  function initSeedData() {
    const isV6 = localStorage.getItem('ica_timesheet_v6_imported');
    if (!isV6 && window.ICA_REAL_TEAM_DATA && window.ICA_REAL_TEAM_DATA.length > 0) {
      localStorage.setItem('ica_timesheet_data', JSON.stringify(window.ICA_REAL_TEAM_DATA));
      localStorage.setItem('ica_timesheet_v6_imported', 'true');
    }
  }
});
