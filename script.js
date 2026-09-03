// ==================== VARIABLES GLOBALES ====================
let listaExtras;

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

// ==================== CREAR FILA DE EXTRAS ====================
function crearFilaExtra() {
    const div = document.createElement('div');
    div.className = 'extra-row';
    div.innerHTML = `
        <input type="text" placeholder="Item (ej: Iman)" class="extra-nombre" style="flex: 2;">
        <input type="number" placeholder="$" min="0" class="extra-precio" style="flex: 1;">
        <button class="btn-remove" type="button" aria-label="Eliminar insumo">✕</button>
    `;

    div.querySelectorAll('input').forEach(i => i.addEventListener('input', calcular));
    div.querySelector('.btn-remove').addEventListener('click', () => {
        div.remove();
        calcular();
    });

    listaExtras.appendChild(div);
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

    // Sumar extras
    let sumaExtras = 0;
    document.querySelectorAll('.extra-precio').forEach(input => {
        sumaExtras += parseFloat(input.value) || 0;
    });

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

    const totalVenta = impresionConGanancia + extrasConGanancia;
    const precioML    = Math.round(totalVenta * mulMl);

    // ==================== ACTUALIZAR UI ====================
    document.getElementById('resMaterial').innerText   = formatCur(costoMaterial);
    document.getElementById('resLuz').innerText        = formatCur(costoLuz);
    document.getElementById('resDesgaste').innerText   = formatCur(costoDesgaste);
    document.getElementById('resMargen').innerText     = formatCur(costoMargenSeguridad);
    document.getElementById('resSubtotal').innerText   = formatCur(subtotalImpresion);
    document.getElementById('resExtras').innerText     = formatCur(sumaExtras);
    document.getElementById('resCostoTotal').innerText = formatCur(costoProduccion);
    document.getElementById('totalCobrar').innerText   = formatCur(totalVenta);
    document.getElementById('totalML').innerText       = formatCur(precioML);

    // Barra fija de mobile
    const stickyTotal = document.getElementById('totalCobrarSticky');
    if (stickyTotal) stickyTotal.innerText = formatCur(totalVenta);
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
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 15;
    const contentWidth = pageWidth - marginX * 2;

    const cliente     = document.getElementById('clienteNombre')?.value.trim();
    const piezaDesc   = document.getElementById('piezaDescripcion')?.value.trim();
    const plazoEntrega = document.getElementById('plazoEntrega')?.value.trim();
    const gramos      = document.getElementById('gramosPieza')?.value || 0;
    const tipoMaterial = document.getElementById('tipoMaterial')?.value || '';
    const numeroPresupuesto = 'P-' + Date.now().toString().slice(-8);
    const fecha       = new Date().toLocaleDateString('es-AR');

    const ACCENT      = [2, 132, 199];   // celeste marca (más oscuro que el de pantalla, para buen contraste con blanco)
    const ACCENT_SOFT = [224, 242, 254]; // celeste bien claro para fondos
    const TEXT_DARK   = [30, 41, 59];    // gris oscuro para el cuerpo del texto
    const TEXT_MUTED  = [113, 128, 150]; // gris medio para el footer

    // ---- Encabezado ----
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('RYHEN 3D PRINTS', marginX, 15);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Presupuesto de Impresión 3D', marginX, 23);

    doc.setFontSize(9);
    doc.text(`N°: ${numeroPresupuesto}`, pageWidth - marginX, 13, { align: 'right' });
    doc.text(`Fecha: ${fecha}`, pageWidth - marginX, 19, { align: 'right' });

    let y = 45;
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.setFontSize(11);

    // ---- Datos de cliente / pieza ----
    if (cliente) {
        doc.setFont(undefined, 'bold');
        doc.text('Cliente:', marginX, y);
        doc.setFont(undefined, 'normal');
        doc.text(cliente, marginX + 24, y);
        y += 7;
    }
    if (piezaDesc) {
        doc.setFont(undefined, 'bold');
        doc.text('Pieza:', marginX, y);
        doc.setFont(undefined, 'normal');
        const piezaLines = doc.splitTextToSize(piezaDesc, contentWidth - 24);
        doc.text(piezaLines, marginX + 24, y);
        y += 7 * piezaLines.length;
    }
    doc.setFont(undefined, 'bold');
    doc.text('Peso:', marginX, y);
    doc.setFont(undefined, 'normal');
    doc.text(`${gramos} g${tipoMaterial ? ' de ' + tipoMaterial : ''}`, marginX + 24, y);
    y += 7;

    if (plazoEntrega) {
        doc.setFont(undefined, 'bold');
        doc.text('Plazo de entrega:', marginX, y);
        doc.setFont(undefined, 'normal');
        const plazoLines = doc.splitTextToSize(plazoEntrega, contentWidth - 46);
        doc.text(plazoLines, marginX + 46, y);
        y += 7 * plazoLines.length;
    }
    y += 3;

    // ---- Costo de material ----
    doc.setFont(undefined, 'bold');
    doc.text('Costo de material', marginX + 3, y);
    doc.setFont(undefined, 'normal');
    doc.text(document.getElementById('resMaterial')?.innerText || '$0', pageWidth - marginX - 3, y, { align: 'right' });
    y += 9;

    // ---- Insumos extra (itemizados) ----
    const extras = document.querySelectorAll('.extra-row');
    if (extras.length > 0) {
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('INSUMOS EXTRA', marginX, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        extras.forEach(row => {
            if (y > 270) { doc.addPage(); y = 20; }
            const nombre = row.querySelector('.extra-nombre')?.value.trim() || 'Insumo';
            const precio = parseFloat(row.querySelector('.extra-precio')?.value) || 0;
            doc.text(`• ${nombre}`, marginX + 3, y);
            doc.text(formatCur(precio), pageWidth - marginX - 3, y, { align: 'right' });
            y += 6;
        });
        y += 3;
        doc.setFont(undefined, 'bold');
        doc.text('Total insumos', marginX + 3, y);
        doc.text(document.getElementById('resExtras')?.innerText || '$0', pageWidth - marginX - 3, y, { align: 'right' });
        y += 9;
    }
    y += 6;

    // ---- Total final ----
    if (y > 245) { doc.addPage(); y = 20; }

    doc.setFillColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2]);
    doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.roundedRect(marginX, y, contentWidth, 22, 3, 3, 'FD');
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('TOTAL A COBRAR', marginX + 6, y + 8);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(document.getElementById('totalCobrar')?.innerText || '$0', pageWidth - marginX - 6, y + 15.5, { align: 'right' });
    y += 32;

    // ---- Footer ----
    if (y > 285) { doc.addPage(); y = 20; }
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text('Presupuesto válido por 7 días desde la fecha de emisión. Los precios pueden variar sin previo aviso.', marginX, y);

    doc.save(`Presupuesto-Ryhen3D-${numeroPresupuesto}.pdf`);
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    listaExtras = document.getElementById('lista-extras');

    const btnAddExtra  = document.getElementById('btn-add-extra');
    const btnPDF       = document.getElementById('btn-pdf');
    const btnPDFSticky = document.getElementById('btn-pdf-sticky');

    if (btnAddExtra) btnAddExtra.addEventListener('click', crearFilaExtra);
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