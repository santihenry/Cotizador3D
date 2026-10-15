// ==================== VARIABLES GLOBALES ====================
let listaExtras;
let listaServicios;

// ==================== FORMATEO DE MONEDA ====================
function formatCur(val) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    }).format(val);
}

// ==================== TEMA CLARO / OSCURO ====================
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    let saved = null;
    try { saved = localStorage.getItem('ryhen3d-theme'); } catch (e) { /* localStorage no disponible */ }

    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (toggleBtn) toggleBtn.textContent = '☀️';
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const esClaro = document.documentElement.getAttribute('data-theme') === 'light';
            if (esClaro) {
                document.documentElement.removeAttribute('data-theme');
                toggleBtn.textContent = '🌙';
                try { localStorage.setItem('ryhen3d-theme', 'dark'); } catch (e) {}
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                toggleBtn.textContent = '☀️';
                try { localStorage.setItem('ryhen3d-theme', 'light'); } catch (e) {}
            }
        });
    }
}

// ==================== FILAS DINÁMICAS (EXTRAS / SERVICIOS) ====================
function crearFila(contenedor, placeholder) {
    const div = document.createElement('div');
    div.className = 'extra-row';
    div.innerHTML = `
        <input type="text" placeholder="${placeholder}" class="fila-nombre" style="flex: 2;">
        <input type="number" placeholder="$" min="0" class="fila-precio" style="flex: 1;">
        <button class="btn-remove" type="button" aria-label="Eliminar fila">✕</button>
    `;

    div.querySelectorAll('input').forEach(i => i.addEventListener('input', calcular));
    div.querySelector('.btn-remove').addEventListener('click', () => {
        div.remove();
        calcular();
    });

    contenedor.appendChild(div);
}

// Devuelve [{ nombre, precio }] de las filas con precio cargado
function leerFilas(contenedor) {
    if (!contenedor) return [];
    return [...contenedor.querySelectorAll('.extra-row')]
        .map(row => ({
            nombre: row.querySelector('.fila-nombre')?.value.trim() || '',
            precio: parseFloat(row.querySelector('.fila-precio')?.value) || 0
        }))
        .filter(f => f.precio > 0);
}

// ==================== CÁLCULO PRINCIPAL ====================
function calcular() {
    // Obtener valores
    const pFilamento     = parseFloat(document.getElementById('precioFilamento')?.value) || 0;
    const pKwh           = parseFloat(document.getElementById('precioKwh')?.value) || 0;
    const consW          = parseFloat(document.getElementById('consumoW')?.value) || 0;
    const vUtil          = parseFloat(document.getElementById('vidaUtil')?.value) || 1;
    const cRepuestos     = parseFloat(document.getElementById('costoRepuestos')?.value) || 0;
    const mErrorPerc     = parseFloat(document.getElementById('margenError')?.value) || 0;
    const hImp           = parseFloat(document.getElementById('horasImpresion')?.value) || 0;
    const gPieza         = parseFloat(document.getElementById('gramosPieza')?.value) || 0;

    const multImpresion  = parseFloat(document.getElementById('multiplicador')?.value) || 1;
    const multExtras     = parseFloat(document.getElementById('multiplicadorExtras')?.value) || 1.5;
    const mulMl          = parseFloat(document.getElementById('multiMl')?.value) || 1.25;

    const cantidad       = Math.max(1, parseInt(document.getElementById('cantidadPiezas')?.value) || 1);

    // Sumar extras y servicios
    const extras     = leerFilas(listaExtras);
    const servicios  = leerFilas(listaServicios);
    const sumaExtras     = extras.reduce((acc, f) => acc + f.precio, 0);
    const sumaServicios  = servicios.reduce((acc, f) => acc + f.precio, 0);

    // ==================== CÁLCULOS ====================
    const costoMaterial = (gPieza / 1000) * pFilamento;
    const costoLuz      = (consW / 1000) * hImp * pKwh;
    const costoDesgaste = (cRepuestos / vUtil) * hImp;

    const subtotalImpresion    = costoMaterial + costoLuz + costoDesgaste;
    const costoMargenSeguridad = subtotalImpresion * (mErrorPerc / 100);
    const costoProduccion      = subtotalImpresion + costoMargenSeguridad;

    // Ganancias
    const impresionConGanancia = costoProduccion * multImpresion;
    const extrasConGanancia    = sumaExtras * multExtras;

    // La mano de obra se cobra tal cual, sin multiplicador
    const totalVenta = impresionConGanancia + extrasConGanancia + sumaServicios;
    const precioML    = Math.round(totalVenta * mulMl);

    // ==================== ACTUALIZAR UI ====================
    document.getElementById('resMaterial').innerText   = formatCur(costoMaterial);
    document.getElementById('resLuz').innerText        = formatCur(costoLuz);
    document.getElementById('resDesgaste').innerText   = formatCur(costoDesgaste);
    document.getElementById('resMargen').innerText     = formatCur(costoMargenSeguridad);
    document.getElementById('resSubtotal').innerText   = formatCur(costoProduccion);
    document.getElementById('resExtras').innerText     = formatCur(sumaExtras);
    document.getElementById('resServicios').innerText  = formatCur(sumaServicios);
    document.getElementById('resCostoTotal').innerText = formatCur(costoProduccion + sumaExtras + sumaServicios);
    document.getElementById('totalCobrar').innerText   = formatCur(totalVenta);
    document.getElementById('totalML').innerText       = formatCur(precioML);

    // Barra fija de mobile
    const stickyTotal = document.getElementById('totalCobrarSticky');
    if (stickyTotal) stickyTotal.innerText = formatCur(totalVenta);

    return { cantidad, impresionConGanancia, multExtras, extras, servicios, totalVenta };
}

// ==================== GENERAR PDF ====================
function generarPDF() {
    const jsPDFLib = window.jspdf;
    if (!jsPDFLib || typeof jsPDFLib.jsPDF === 'undefined') {
        alert('Error: jsPDF no está cargado. Revisá tu conexión a internet.');
        return;
    }
    const { jsPDF } = jsPDFLib;

    const doc = new jsPDF();
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 15;
    const contentWidth = pageWidth - marginX * 2;

    const cliente      = document.getElementById('clienteNombre')?.value.trim();
    const piezaDesc    = document.getElementById('piezaDescripcion')?.value.trim();
    let   plazoEntrega = document.getElementById('plazoEntrega')?.value.trim();
    const tipoMaterial = document.getElementById('tipoMaterial')?.value || '';
    const numeroPresupuesto = 'P-' + Date.now().toString().slice(-8);
    const hoy          = new Date();
    const fecha        = hoy.toLocaleDateString('es-AR');
    const validoHasta  = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR');

    // Si el plazo es solo un número, se asume en días hábiles
    if (/^\d+$/.test(plazoEntrega || '')) plazoEntrega += ' días hábiles';

    const INSTAGRAM_USER = 'ryhen3d';
    const INSTAGRAM_URL  = 'https://www.instagram.com/ryhen3d/';

    const ACCENT     = [2, 132, 199];    // celeste marca (más oscuro que el de pantalla, para buen contraste con blanco)
    const ROW_ALT    = [241, 247, 252];  // fondo de filas alternadas
    const BORDER     = [221, 228, 236];  // líneas divisorias
    const TEXT_DARK  = [30, 41, 59];     // gris oscuro para el cuerpo del texto
    const TEXT_MUTED = [113, 128, 150];  // gris medio para etiquetas y footer

    // ---- Ítems del presupuesto (siempre a precio de venta, nunca costos) ----
    const r = calcular();
    const items = [];
    if (r.impresionConGanancia > 0) {
        const desc = (piezaDesc || 'Pieza impresa en 3D') + (tipoMaterial ? ` (${tipoMaterial})` : '');
        items.push({ desc, cant: r.cantidad, unit: r.impresionConGanancia / r.cantidad, importe: r.impresionConGanancia });
    }
    r.extras.forEach(e => {
        const precio = e.precio * r.multExtras;
        items.push({ desc: e.nombre || 'Insumo', cant: 1, unit: precio, importe: precio });
    });
    r.servicios.forEach(s => {
        items.push({ desc: s.nombre || 'Mano de obra', cant: 1, unit: s.precio, importe: s.precio });
    });

    // ---- Encabezado ----
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(20);
    doc.text('RYHEN 3D PRINTS', marginX, 17);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text('Impresión 3D a medida', marginX, 24);
    doc.setFontSize(9);
    doc.textWithLink(`Instagram: @${INSTAGRAM_USER}`, marginX, 31, { url: INSTAGRAM_URL });

    doc.setFont(undefined, 'bold');
    doc.setFontSize(16);
    doc.text('PRESUPUESTO', pageWidth - marginX, 17, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`N° ${numeroPresupuesto}`, pageWidth - marginX, 24, { align: 'right' });
    doc.text(`Fecha: ${fecha}`, pageWidth - marginX, 31, { align: 'right' });

    // ---- Datos del presupuesto (en columnas) ----
    let y = 52;
    const columnas = [];
    if (cliente)      columnas.push({ label: 'CLIENTE', valor: cliente });
    if (plazoEntrega) columnas.push({ label: 'PLAZO DE ENTREGA', valor: plazoEntrega });
    columnas.push({ label: 'VÁLIDO HASTA', valor: validoHasta });

    const anchoCol = contentWidth / 3;
    let altoDatos = 0;
    columnas.forEach((col, i) => {
        const x = marginX + i * anchoCol;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(col.label, x, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...TEXT_DARK);
        const lineas = doc.splitTextToSize(col.valor, anchoCol - 6);
        doc.text(lineas, x, y + 6);
        altoDatos = Math.max(altoDatos, 6 + lineas.length * 5);
    });
    y += altoDatos + 8;

    // ---- Tabla de ítems ----
    const colDesc = marginX + 4;
    const colCant = marginX + 112;                 // centrada
    const colUnit = marginX + 148;                 // alineada a la derecha
    const colImp  = marginX + contentWidth - 4;    // alineada a la derecha
    const anchoDesc = 92;

    const dibujarCabeceraTabla = () => {
        doc.setFillColor(...ACCENT);
        doc.rect(marginX, y, contentWidth, 9, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8.5);
        doc.text('DESCRIPCIÓN', colDesc, y + 6);
        doc.text('CANT.', colCant, y + 6, { align: 'center' });
        doc.text('P. UNITARIO', colUnit, y + 6, { align: 'right' });
        doc.text('IMPORTE', colImp, y + 6, { align: 'right' });
        y += 9;
    };
    dibujarCabeceraTabla();

    doc.setFontSize(10);
    items.forEach((item, i) => {
        const lineas = doc.splitTextToSize(item.desc, anchoDesc);
        const altoFila = Math.max(10, lineas.length * 5 + 5);
        if (y + altoFila > pageHeight - 60) { doc.addPage(); y = 20; dibujarCabeceraTabla(); }

        if (i % 2 === 1) {
            doc.setFillColor(...ROW_ALT);
            doc.rect(marginX, y, contentWidth, altoFila, 'F');
        }
        doc.setTextColor(...TEXT_DARK);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(lineas, colDesc, y + 6.5);
        doc.text(String(item.cant), colCant, y + 6.5, { align: 'center' });
        doc.text(formatCur(item.unit), colUnit, y + 6.5, { align: 'right' });
        doc.setFont(undefined, 'bold');
        doc.text(formatCur(item.importe), colImp, y + 6.5, { align: 'right' });
        y += altoFila;
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(marginX, y, marginX + contentWidth, y);
    });

    // ---- Total ----
    y += 6;
    const anchoTotal = 80;
    const xTotal = marginX + contentWidth - anchoTotal;
    doc.setFillColor(...ACCENT);
    doc.roundedRect(xTotal, y, anchoTotal, 16, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text('TOTAL', xTotal + 5, y + 10);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text(formatCur(r.totalVenta), xTotal + anchoTotal - 5, y + 10.5, { align: 'right' });
    y += 30;

    // ---- Condiciones ----
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('CONDICIONES', marginX, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    [
        `Presupuesto válido por 7 días desde la fecha de emisión (hasta el ${validoHasta}).`,
        'Precios expresados en pesos argentinos.',
        'Los precios pueden variar sin previo aviso una vez vencido el presupuesto.'
    ].forEach(linea => {
        doc.text(`•  ${linea}`, marginX, y);
        y += 4.5;
    });

    // ---- Footer (en todas las páginas) ----
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
        doc.setPage(p);
        const yFooter = pageHeight - 14;
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(marginX, yFooter - 5, pageWidth - marginX, yFooter - 5);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...TEXT_MUTED);
        doc.text('¡Gracias por tu consulta!', marginX, yFooter);
        const ig = `instagram.com/${INSTAGRAM_USER}`;
        doc.setTextColor(...ACCENT);
        doc.textWithLink(ig, pageWidth - marginX - doc.getTextWidth(ig), yFooter, { url: INSTAGRAM_URL });
    }

    doc.save(`Presupuesto-Ryhen3D-${numeroPresupuesto}.pdf`);
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    listaExtras    = document.getElementById('lista-extras');
    listaServicios = document.getElementById('lista-servicios');

    const btnAddExtra    = document.getElementById('btn-add-extra');
    const btnAddServicio = document.getElementById('btn-add-servicio');
    const btnPDF         = document.getElementById('btn-pdf');
    const btnPDFSticky   = document.getElementById('btn-pdf-sticky');

    if (btnAddExtra) btnAddExtra.addEventListener('click', () => crearFila(listaExtras, 'Item (ej: Iman)'));
    if (btnAddServicio) btnAddServicio.addEventListener('click', () => crearFila(listaServicios, 'Servicio (ej: Diseño, Pintado)'));
    if (btnPDF) btnPDF.addEventListener('click', generarPDF);
    if (btnPDFSticky) btnPDFSticky.addEventListener('click', generarPDF);

    initTheme();

    // Eventos en todos los inputs
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', calcular);
    });

    // Cálculo inicial
    calcular();
});