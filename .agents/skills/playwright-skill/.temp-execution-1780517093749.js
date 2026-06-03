// Test completo por roles: lider y servidor
// Recorre todos los módulos, prueba CRUD, formularios, botones y UX
const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const SKILL_DIR = '/home/juanda/Proyectofinal/.claude/skills/playwright-skill';
const SCREENSHOT_DIR = '/tmp/test-roles-screenshots';

const CREDENTIALS = {
  lider:    { email: 'lider@test.dev',    password: 'Test1234!' },
  servidor: { email: 'servidor@test.dev', password: 'Test1234!' },
};

// Almacena todos los hallazgos
const findings = [];
function log(role, module, level, msg) {
  const entry = { role, module, level, msg };
  findings.push(entry);
  const icon = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '✅';
  console.log(`${icon} [${role.toUpperCase()}][${module}] ${msg}`);
}

async function screenshot(page, role, name) {
  const dir = `${SCREENSHOT_DIR}/${role}`;
  fs.mkdirSync(dir, { recursive: true });
  const path = `${dir}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

// Espera a que el spinner/loading desaparezca
async function waitReady(page) {
  await page.waitForTimeout(800);
  // Espera que no haya spinners visibles
  try {
    await page.waitForFunction(() => {
      const spinners = document.querySelectorAll('[class*="animate-spin"], [class*="loading"]');
      return spinners.length === 0;
    }, { timeout: 5000 });
  } catch (_) {}
  await page.waitForTimeout(300);
}

// Login y retorna la iglesia ID del redirect
async function login(page, role) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔐 Iniciando sesión como: ${role}`);
  console.log(`${'='.repeat(60)}`);

  await page.goto(`${BASE_URL}/login`);
  await waitReady(page);
  await screenshot(page, role, '00-login-page');

  // Busca el campo email
  const emailSel = 'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="correo" i]';
  const passSel  = 'input[type="password"]';

  try {
    await page.waitForSelector(emailSel, { timeout: 8000 });
  } catch (e) {
    log(role, 'Login', 'ERROR', `No se encontró campo email: ${e.message}`);
    return null;
  }

  await page.fill(emailSel, CREDENTIALS[role].email);
  await page.fill(passSel, CREDENTIALS[role].password);
  await screenshot(page, role, '01-login-filled');

  // Botón submit
  const submitSel = 'button[type="submit"], button:has-text("Ingresar"), button:has-text("Iniciar"), button:has-text("Entrar")';
  await page.click(submitSel);

  // Espera redirect a /app/
  try {
    await page.waitForURL(/\/app\//, { timeout: 12000 });
  } catch (e) {
    log(role, 'Login', 'ERROR', `No redirigió a /app/ después de login: ${e.message}`);
    await screenshot(page, role, '01-login-failed');
    return null;
  }

  await waitReady(page);
  const url = page.url();
  const match = url.match(/\/app\/(\d+)/);
  const iglesiaId = match ? match[1] : null;

  log(role, 'Login', 'OK', `Login exitoso → ${url} (iglesia: ${iglesiaId})`);
  await screenshot(page, role, '02-post-login');
  return iglesiaId;
}

// Navega a una ruta y verifica que no hay error 404 ni crash
async function navigateTo(page, role, module, path) {
  console.log(`\n  📍 Navegando: ${module} → ${path}`);
  try {
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitReady(page);

    const url = page.url();
    // Si redirigió a login, sesión expiró
    if (url.includes('/login')) {
      log(role, module, 'ERROR', 'Sesión expirada o acceso denegado — redirigió a login');
      return false;
    }
    // Si redirigió a / o landing
    if (url === BASE_URL + '/' || url === BASE_URL) {
      log(role, module, 'WARN', 'Redirigió a landing (puede ser ruta no autorizada)');
      return false;
    }

    await screenshot(page, role, `mod-${module.replace(/\s/g, '_')}`);
    log(role, module, 'OK', 'Cargó correctamente');
    return true;
  } catch (e) {
    log(role, module, 'ERROR', `Error navegando: ${e.message}`);
    return false;
  }
}

// Busca y prueba el botón "Crear/Nuevo/Agregar" principal
async function testCreateButton(page, role, module) {
  const btnSels = [
    'button:has-text("Nuevo")',
    'button:has-text("Crear")',
    'button:has-text("Agregar")',
    'button:has-text("Añadir")',
    'button:has-text("+")',
    '[aria-label*="crear" i]',
    '[aria-label*="nuevo" i]',
  ];

  for (const sel of btnSels) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      const text = await btn.innerText().catch(() => '?');
      log(role, module, 'OK', `Botón crear encontrado: "${text.trim()}"`);

      // Click para abrir modal/drawer
      await btn.click();
      await page.waitForTimeout(800);

      // ¿Abrió modal/drawer/dialog?
      const opened = await page.locator('[role="dialog"], [role="alertdialog"], [data-radix-dialog-content], .drawer, [class*="drawer"], [class*="modal"]').isVisible().catch(() => false);
      if (opened) {
        log(role, module, 'OK', 'Modal/Drawer de creación se abrió correctamente');
        await screenshot(page, role, `mod-${module.replace(/\s/g, '_')}-modal-create`);

        // Prueba botón cancelar
        const cancelSel = 'button:has-text("Cancelar"), button:has-text("Cerrar"), button:has-text("Cancel"), [aria-label="Close"], [aria-label="Cerrar"]';
        const cancelBtn = page.locator(cancelSel).first();
        if (await cancelBtn.isVisible().catch(() => false)) {
          await cancelBtn.click();
          await page.waitForTimeout(500);
          log(role, module, 'OK', 'Botón cancelar funciona');
        } else {
          // Escape key
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          log(role, module, 'WARN', 'Sin botón cancelar visible — cerrado con Escape');
        }
      } else {
        log(role, module, 'WARN', 'El botón crear NO abrió modal/drawer detectable');
        await screenshot(page, role, `mod-${module.replace(/\s/g, '_')}-create-click`);
        // Intenta cerrar con Escape por si acaso
        await page.keyboard.press('Escape');
      }
      return;
    }
  }
  log(role, module, 'WARN', 'No se encontró botón de creación (puede ser intencional para este rol)');
}

// Prueba botones de acción en filas de tabla (edit/delete/ver)
async function testRowActions(page, role, module) {
  // Busca la primera fila con botones de acción
  const rowActionSels = [
    'table tbody tr:first-child button',
    '[role="row"]:nth-child(2) button',
    '.table-row button',
    'tr:has(td) button:first-child',
  ];

  // Intenta encontrar alguna fila con botones
  let found = false;
  for (const sel of rowActionSels) {
    const btns = page.locator(sel);
    const count = await btns.count().catch(() => 0);
    if (count > 0) {
      log(role, module, 'OK', `${count} botón(es) de acción en primera fila`);

      // Hover sobre el primer botón para ver tooltip
      const firstBtn = btns.first();
      await firstBtn.hover().catch(() => {});
      await page.waitForTimeout(400);

      // Analiza los botones sin hacer click destructivo
      for (let i = 0; i < Math.min(count, 4); i++) {
        const btn = btns.nth(i);
        const text = (await btn.innerText().catch(() => '')).trim();
        const ariaLabel = (await btn.getAttribute('aria-label').catch(() => '')).trim();
        const label = text || ariaLabel || `botón-${i+1}`;

        // Solo hacer click en botones seguros (editar/ver, no eliminar)
        const isSafe = /editar|edit|ver|detalle|detail|info|eye|pencil|lápiz/i.test(label);
        const isDelete = /eliminar|borrar|delete|remove|trash/i.test(label);

        if (isDelete) {
          log(role, module, 'OK', `Botón eliminar encontrado: "${label}" (no se ejecutó)`);
        } else if (isSafe) {
          log(role, module, 'OK', `Botón editar/ver encontrado: "${label}"`);
          await btn.click().catch(() => {});
          await page.waitForTimeout(600);

          const modal = await page.locator('[role="dialog"], [role="alertdialog"], [data-radix-dialog-content]').isVisible().catch(() => false);
          if (modal) {
            log(role, module, 'OK', `Modal de edición/detalle abrió`);
            await screenshot(page, role, `mod-${module.replace(/\s/g, '_')}-edit-modal`);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
          }
        } else {
          log(role, module, 'OK', `Botón encontrado: "${label}"`);
        }
      }
      found = true;
      break;
    }
  }

  if (!found) {
    // Puede ser que la lista esté vacía o use cards
    const cardBtns = page.locator('[class*="card"] button, [class*="Card"] button');
    const cardCount = await cardBtns.count().catch(() => 0);
    if (cardCount > 0) {
      log(role, module, 'OK', `${cardCount} botón(es) en cards`);
    } else {
      log(role, module, 'WARN', 'Sin botones de acción en filas/cards (lista vacía o vista diferente)');
    }
  }
}

// Prueba búsqueda/filtros si existen
async function testSearchFilter(page, role, module) {
  const searchSel = 'input[placeholder*="buscar" i], input[placeholder*="search" i], input[placeholder*="filtrar" i], input[type="search"]';
  const searchInput = page.locator(searchSel).first();

  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('test');
    await page.waitForTimeout(600);
    log(role, module, 'OK', 'Campo de búsqueda funcional');
    await searchInput.clear();
    await page.waitForTimeout(400);
  }

  // Filtros/selects
  const filterSel = 'select, [role="combobox"]:not([aria-expanded]), [class*="filter"]';
  const filters = page.locator(filterSel);
  const filterCount = await filters.count().catch(() => 0);
  if (filterCount > 0) {
    log(role, module, 'OK', `${filterCount} filtro(s) encontrado(s)`);
  }
}

// Verifica elementos visuales generales de la página
async function auditPage(page, role, module) {
  // 1. ¿Hay errores JS en consola?
  // (ya se capturan con page.on('console') abajo)

  // 2. ¿Hay textos de error visibles?
  const errorTexts = ['error', 'undefined', 'null', 'NaN', 'cannot read', 'is not a function'];
  const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
  for (const err of errorTexts) {
    if (bodyText.includes(err) && !bodyText.includes('sin error')) {
      // Solo alertar si parece un error real (contexto de componente)
      const lines = bodyText.split('\n').filter(l => l.includes(err)).slice(0, 2);
      if (lines.some(l => l.length < 200)) { // evita texto muy largo
        // Ignorar palabras comunes como "error" en labels de formulario
        if (!lines.every(l => /placeholder|label|tipo.*error|error.*tipo/i.test(l))) {
          log(role, module, 'WARN', `Texto sospechoso encontrado: "${lines[0].trim().substring(0,80)}"`);
        }
      }
    }
  }

  // 3. ¿Hay botones deshabilitados sospechosos?
  const disabledBtns = page.locator('button[disabled]');
  const disabledCount = await disabledBtns.count().catch(() => 0);
  if (disabledCount > 3) {
    log(role, module, 'WARN', `${disabledCount} botones deshabilitados — verificar si es correcto`);
  }

  // 4. Responsive check rápido (tablet)
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(400);
  const overflowEl = await page.evaluate(() => {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      if (el.scrollWidth > el.clientWidth + 20 && el.clientWidth > 0) {
        return el.tagName + '.' + el.className.substring(0, 40);
      }
    }
    return null;
  });
  if (overflowEl) {
    log(role, module, 'WARN', `Posible overflow en tablet (768px): ${overflowEl}`);
  }
  // Restaurar
  await page.setViewportSize({ width: 1280, height: 800 });
}

// === MÓDULOS LIDER ===
async function testLider(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });
  page.on('pageerror', err => jsErrors.push(err.message));

  const role = 'lider';
  const iglesiaId = await login(page, role);
  if (!iglesiaId) {
    log(role, 'Login', 'ERROR', 'No se pudo obtener iglesia ID — abortando tests de lider');
    await context.close();
    return;
  }

  const base = `${BASE_URL}/app/${iglesiaId}`;

  // ─── Dashboard ───────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Dashboard', base);
    if (ok) {
      await auditPage(page, role, 'Dashboard');
      // Verifica tarjetas de estadísticas
      const cards = page.locator('[class*="card"], [class*="Card"], [class*="stat"]');
      const cardCount = await cards.count().catch(() => 0);
      log(role, 'Dashboard', cardCount > 0 ? 'OK' : 'WARN',
        cardCount > 0 ? `${cardCount} tarjeta(s) de estadística encontrada(s)` : 'Sin tarjetas estadísticas visibles');
    }
  }

  // ─── Mi Ministerio ────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Mi Ministerio', `${base}/mi-ministerio`);
    if (ok) {
      await testCreateButton(page, role, 'Mi Ministerio');
      await testRowActions(page, role, 'Mi Ministerio');
      await testSearchFilter(page, role, 'Mi Ministerio');
      await auditPage(page, role, 'Mi Ministerio');
    }
  }

  // ─── Usuarios ────────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Usuarios', `${base}/usuarios`);
    if (ok) {
      await testCreateButton(page, role, 'Usuarios');
      await testRowActions(page, role, 'Usuarios');
      await testSearchFilter(page, role, 'Usuarios');
      await auditPage(page, role, 'Usuarios');
    }
  }

  // ─── Miembros ─────────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Miembros', `${base}/miembros`);
    if (ok) {
      await testCreateButton(page, role, 'Miembros');
      await testRowActions(page, role, 'Miembros');
      await testSearchFilter(page, role, 'Miembros');
      await auditPage(page, role, 'Miembros');
    }
  }

  // ─── Eventos ──────────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Eventos', `${base}/eventos`);
    if (ok) {
      await testCreateButton(page, role, 'Eventos');
      await testRowActions(page, role, 'Eventos');
      await testSearchFilter(page, role, 'Eventos');
      await auditPage(page, role, 'Eventos');

      // Probar cambio de vista (lista/calendario si existe)
      const viewToggle = page.locator('button:has-text("Lista"), button:has-text("Calendario"), button:has-text("Kanban"), [aria-label*="vista" i]').first();
      if (await viewToggle.isVisible().catch(() => false)) {
        await viewToggle.click();
        await page.waitForTimeout(600);
        log(role, 'Eventos', 'OK', 'Toggle de vista funcional');
        await screenshot(page, role, 'mod-Eventos-vista-alterna');
      }
    }
  }

  // ─── Tareas ───────────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Tareas', `${base}/tareas`);
    if (ok) {
      await testCreateButton(page, role, 'Tareas');
      await testRowActions(page, role, 'Tareas');
      await testSearchFilter(page, role, 'Tareas');
      await auditPage(page, role, 'Tareas');
    }
  }

  // ─── Estadísticas ─────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Estadísticas', `${base}/estadisticas`);
    if (ok) {
      await auditPage(page, role, 'Estadísticas');
      const charts = page.locator('svg[class*="recharts"], canvas, [class*="chart"], [class*="Chart"]');
      const chartCount = await charts.count().catch(() => 0);
      log(role, 'Estadísticas', chartCount > 0 ? 'OK' : 'WARN',
        chartCount > 0 ? `${chartCount} gráfico(s) renderizado(s)` : 'Sin gráficos visibles');
    }
  }

  // ─── Cumpleaños ───────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Cumpleaños', `${base}/cumpleanos`);
    if (ok) {
      await auditPage(page, role, 'Cumpleaños');
    }
  }

  // ─── Aula de Formación ────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Aula', `${base}/aula`);
    if (ok) {
      await testCreateButton(page, role, 'Aula');
      await auditPage(page, role, 'Aula');

      // Clic en primer curso si existe
      const cursoLink = page.locator('a[href*="curso"], [class*="curso"], [class*="card"]:has-text("curso")').first();
      if (await cursoLink.isVisible().catch(() => false)) {
        await cursoLink.click();
        await waitReady(page);
        log(role, 'Aula', 'OK', 'Navegación a detalle de curso funcional');
        await screenshot(page, role, 'mod-Aula-detalle-curso');
        // Volver
        await page.goBack();
        await waitReady(page);
      }
    }
  }

  // ─── Notificaciones ───────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Notificaciones', `${base}/notificaciones`);
    if (ok) {
      await auditPage(page, role, 'Notificaciones');
      // Marcar como leída
      const markReadBtn = page.locator('button:has-text("Marcar"), button:has-text("Leída"), button:has-text("Leer")').first();
      if (await markReadBtn.isVisible().catch(() => false)) {
        log(role, 'Notificaciones', 'OK', 'Botón marcar leída presente');
      }
    }
  }

  // ─── Mi Perfil ────────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Perfil', `${base}/perfil`);
    if (ok) {
      await auditPage(page, role, 'Perfil');
      // Formulario de edición
      const editBtn = page.locator('button:has-text("Editar"), button:has-text("Guardar"), button:has-text("Actualizar")').first();
      if (await editBtn.isVisible().catch(() => false)) {
        const editText = await editBtn.innerText().catch(() => '');
        log(role, 'Perfil', 'OK', `Botón "${editText.trim()}" presente`);
      }
      // Campos del formulario
      const inputs = page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])');
      const inputCount = await inputs.count().catch(() => 0);
      log(role, 'Perfil', inputCount > 0 ? 'OK' : 'WARN',
        inputCount > 0 ? `${inputCount} campo(s) editables` : 'Sin campos editables visibles');
    }
  }

  // Captura JS errors
  if (jsErrors.length > 0) {
    log(role, 'Global', 'WARN', `${jsErrors.length} error(es) JS en consola:`);
    jsErrors.slice(0, 5).forEach(e => log(role, 'Global', 'WARN', `  JS: ${e.substring(0, 120)}`));
  }

  await screenshot(page, role, 'zzz-final-state');
  await context.close();
}

// === MÓDULOS SERVIDOR ===
async function testServidor(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });
  page.on('pageerror', err => jsErrors.push(err.message));

  const role = 'servidor';
  const iglesiaId = await login(page, role);
  if (!iglesiaId) {
    log(role, 'Login', 'ERROR', 'No se pudo obtener iglesia ID — abortando tests de servidor');
    await context.close();
    return;
  }

  const base = `${BASE_URL}/app/${iglesiaId}`;

  // ─── Dashboard ───────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Dashboard', base);
    if (ok) {
      await auditPage(page, role, 'Dashboard');
      const cards = page.locator('[class*="card"], [class*="Card"], [class*="stat"]');
      const cardCount = await cards.count().catch(() => 0);
      log(role, 'Dashboard', cardCount > 0 ? 'OK' : 'WARN',
        cardCount > 0 ? `${cardCount} tarjeta(s) visibles` : 'Sin tarjetas estadísticas');
    }
  }

  // ─── Mi Ministerio (solo lectura para servidor) ───────────
  {
    const ok = await navigateTo(page, role, 'Mi Ministerio', `${base}/mi-ministerio`);
    if (ok) {
      // Servidor NO debe tener botones de crear/editar
      const createBtnSels = [
        'button:has-text("Nuevo")', 'button:has-text("Crear")',
        'button:has-text("Agregar")', 'button:has-text("Añadir")',
      ];
      let createFound = false;
      for (const sel of createBtnSels) {
        if (await page.locator(sel).isVisible().catch(() => false)) {
          const text = await page.locator(sel).first().innerText().catch(() => sel);
          log(role, 'Mi Ministerio', 'WARN',
            `⚠️ INCONSISTENCIA: servidor tiene botón crear: "${text.trim()}" — debería ser solo lectura`);
          createFound = true;
        }
      }
      if (!createFound) {
        log(role, 'Mi Ministerio', 'OK', 'Sin botones CRUD — acceso solo lectura correcto');
      }
      await auditPage(page, role, 'Mi Ministerio');
    }
  }

  // ─── Rutas NO autorizadas (acceso denegado esperado) ─────
  console.log('\n  🔒 Probando rutas que servidor NO debería ver...');
  const forbiddenRoutes = [
    { name: 'Usuarios', path: `${base}/usuarios` },
    { name: 'Miembros', path: `${base}/miembros` },
    { name: 'Estadísticas', path: `${base}/estadisticas` },
  ];
  for (const route of forbiddenRoutes) {
    await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
    await waitReady(page);
    const url = page.url();
    const redirected = !url.includes(route.path.replace(BASE_URL, ''));
    if (redirected) {
      log(role, `Permisos`, 'OK', `Ruta "${route.name}" redirige correctamente (acceso bloqueado)`);
    } else {
      // Cargó la ruta — verificar si muestra contenido o pantalla de acceso denegado
      const hasContent = await page.locator('table, [class*="card"], h1, h2').isVisible().catch(() => false);
      const hasDenied = await page.locator('text=acceso, text=permitido, text=autorizado, text=403, text=denegado').isVisible().catch(() => false);
      if (hasDenied) {
        log(role, `Permisos`, 'OK', `Ruta "${route.name}" muestra mensaje de acceso denegado`);
      } else if (hasContent) {
        log(role, `Permisos`, 'WARN',
          `⚠️ INCONSISTENCIA: servidor puede acceder a "${route.name}" — revisar guards de ruta`);
        await screenshot(page, role, `permisos-${route.name.replace(/\s/g, '_')}-acceso`);
      }
    }
  }
  // Volver a base
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
  await waitReady(page);

  // ─── Eventos ──────────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Eventos', `${base}/eventos`);
    if (ok) {
      // Servidor puede ver pero no crear?
      await testSearchFilter(page, role, 'Eventos');

      const createBtnSels = ['button:has-text("Nuevo")', 'button:has-text("Crear evento")', 'button:has-text("Agregar")'];
      let createFound = false;
      for (const sel of createBtnSels) {
        if (await page.locator(sel).isVisible().catch(() => false)) {
          createFound = true;
          log(role, 'Eventos', 'WARN',
            `VERIFICAR: servidor tiene botón crear eventos — ¿es intencional?`);
        }
      }
      if (!createFound) log(role, 'Eventos', 'OK', 'Sin botón crear eventos para servidor (solo vista)');

      await auditPage(page, role, 'Eventos');
    }
  }

  // ─── Tareas (Mis Tareas) ───────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Mis Tareas', `${base}/tareas`);
    if (ok) {
      await auditPage(page, role, 'Mis Tareas');

      // Verificar si la vista de tareas está filtrada al usuario
      const tareasItems = page.locator('[class*="tarea"], tr[data-id], [class*="task"]');
      const count = await tareasItems.count().catch(() => 0);
      log(role, 'Mis Tareas', 'OK', `${count} tarea(s) visible(s)`);

      // Puede marcar como completada?
      const completarBtn = page.locator('button:has-text("Completar"), button:has-text("Marcar"), input[type="checkbox"]').first();
      if (await completarBtn.isVisible().catch(() => false)) {
        log(role, 'Mis Tareas', 'OK', 'Puede marcar tareas como completadas');
      }

      // Servidor NO debe crear tareas
      const createBtn = page.locator('button:has-text("Nueva Tarea"), button:has-text("Crear Tarea")').first();
      if (await createBtn.isVisible().catch(() => false)) {
        log(role, 'Mis Tareas', 'WARN', 'VERIFICAR: servidor tiene botón crear tarea — ¿intencional?');
      }
    }
  }

  // ─── Aula de Formación ────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Aula', `${base}/aula`);
    if (ok) {
      await auditPage(page, role, 'Aula');

      // Servidor no debe crear cursos
      const createBtn = page.locator('button:has-text("Nuevo Curso"), button:has-text("Crear Curso"), button:has-text("Agregar Curso")').first();
      if (await createBtn.isVisible().catch(() => false)) {
        log(role, 'Aula', 'WARN', 'INCONSISTENCIA: servidor puede crear cursos — revisar permisos');
      } else {
        log(role, 'Aula', 'OK', 'Sin botón crear cursos — correcto para servidor');
      }

      // Puede ver/acceder a cursos asignados?
      const cursoCard = page.locator('[class*="card"], [class*="curso"], a[href*="curso"]').first();
      if (await cursoCard.isVisible().catch(() => false)) {
        log(role, 'Aula', 'OK', 'Cursos visibles para servidor');
        // Intenta entrar al curso
        await cursoCard.click().catch(() => {});
        await waitReady(page);
        const urlActual = page.url();
        if (urlActual.includes('curso')) {
          log(role, 'Aula', 'OK', 'Acceso a detalle de curso funcional');
          await screenshot(page, role, 'mod-Aula-curso-detalle');
          await page.goBack();
          await waitReady(page);
        }
      } else {
        log(role, 'Aula', 'WARN', 'Sin cursos visibles — puede que no tenga cursos asignados');
      }
    }
  }

  // ─── Notificaciones ───────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Notificaciones', `${base}/notificaciones`);
    if (ok) await auditPage(page, role, 'Notificaciones');
  }

  // ─── Mi Perfil ────────────────────────────────────────────
  {
    const ok = await navigateTo(page, role, 'Perfil', `${base}/perfil`);
    if (ok) {
      await auditPage(page, role, 'Perfil');
      const inputs = page.locator('input:not([type="hidden"])');
      const inputCount = await inputs.count().catch(() => 0);
      log(role, 'Perfil', inputCount > 0 ? 'OK' : 'WARN',
        inputCount > 0 ? `${inputCount} campo(s) editables` : 'Sin campos editables');
    }
  }

  // ─── Sidebar: verifica que NO aparecen rutas de lider ────
  console.log('\n  🔒 Verificando sidebar de servidor...');
  await page.goto(base, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await waitReady(page);
  const sidebarText = (await page.locator('nav').innerText().catch(() => '')).toLowerCase();
  const forbiddenNavItems = ['usuarios', 'miembros', 'estadísticas'];
  for (const item of forbiddenNavItems) {
    if (sidebarText.includes(item)) {
      log(role, 'Sidebar', 'WARN', `INCONSISTENCIA: sidebar de servidor muestra "${item}" — no debería`);
    } else {
      log(role, 'Sidebar', 'OK', `"${item}" correctamente oculto en sidebar`);
    }
  }
  const expectedItems = ['mi ministerio', 'eventos', 'tareas', 'aula', 'notificaciones', 'perfil'];
  for (const item of expectedItems) {
    if (sidebarText.includes(item)) {
      log(role, 'Sidebar', 'OK', `"${item}" presente en sidebar`);
    } else {
      log(role, 'Sidebar', 'WARN', `"${item}" no encontrado en sidebar — puede ser un problema de visibilidad`);
    }
  }

  if (jsErrors.length > 0) {
    log(role, 'Global', 'WARN', `${jsErrors.length} error(es) JS en consola:`);
    jsErrors.slice(0, 5).forEach(e => log(role, 'Global', 'WARN', `  JS: ${e.substring(0, 120)}`));
  }

  await screenshot(page, role, 'zzz-final-state');
  await context.close();
}

// === MAIN ===
(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  console.log(`\n🚀 Iniciando tests IGLESIABD — ${new Date().toLocaleString()}`);
  console.log(`📁 Screenshots en: ${SCREENSHOT_DIR}`);

  const browser = await chromium.launch({ headless: true, slowMo: 0 });

  try {
    await testLider(browser);
    await testServidor(browser);
  } finally {
    await browser.close();
  }

  // ─── Reporte Final ─────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('📊 REPORTE FINAL DE HALLAZGOS');
  console.log('='.repeat(70));

  const byRole = {};
  for (const f of findings) {
    if (!byRole[f.role]) byRole[f.role] = { OK: [], WARN: [], ERROR: [] };
    byRole[f.role][f.level].push(f);
  }

  for (const [role, data] of Object.entries(byRole)) {
    console.log(`\n📋 ROL: ${role.toUpperCase()}`);
    console.log(`  ✅ OK:     ${data.OK.length}`);
    console.log(`  ⚠️  WARN:  ${data.WARN.length}`);
    console.log(`  ❌ ERROR:  ${data.ERROR.length}`);

    if (data.WARN.length > 0) {
      console.log('\n  ⚠️  Advertencias:');
      data.WARN.forEach(f => console.log(`     [${f.module}] ${f.msg}`));
    }
    if (data.ERROR.length > 0) {
      console.log('\n  ❌ Errores:');
      data.ERROR.forEach(f => console.log(`     [${f.module}] ${f.msg}`));
    }
  }

  // Guardar reporte JSON
  const reportPath = '/tmp/test-roles-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), findings }, null, 2));
  console.log(`\n💾 Reporte completo guardado en: ${reportPath}`);
  console.log(`📸 Screenshots en: ${SCREENSHOT_DIR}/`);
  console.log('\n✨ Tests completados.\n');
})();
