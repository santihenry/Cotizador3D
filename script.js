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

// ==================== CREAR FILA DE EXTRAS ====================
function crearFilaExtra() {
    const div = document.createElement('div');
    div.className = 'extra-row';
    div.innerHTML = `
        <input type="text" placeholder="Item (ej: Iman)" class="extra-nombre" style="flex: 2;">
        <input type="number" placeholder="$" class="extra-precio" style="flex: 1;">
        <button class="btn-remove" type="button">✕</button>
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
    const multExtras     = parseFloat(document.getElementById('multiplicadorExtras')?.value) || 1.8;
    const mulMl = parseFloat(document.getElementById('multiMl')?.value) || 1.25;

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
    //const precioML   = Math.round(totalVenta * 1.25);
    const precioML   = Math.round(totalVenta * mulMl);

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
}

// ==================== GENERAR PDF ====================
function generarPDF() {
    const { jsPDF } = window.jspdf;
    if (typeof jsPDF === "undefined") {
        alert("Error: jsPDF no está cargado.");
        return;
    }

    const doc = new jsPDF();
    const total = document.getElementById('totalCobrar').innerText;

    doc.setFontSize(20);
    doc.text("PRESUPUESTO DE IMPRESIÓN 3D", 20, 20);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 30);
    doc.line(20, 35, 190, 35);

    doc.setFontSize(12);
    doc.text(`• Tiempo de impresión: ${document.getElementById('horasImpresion')?.value || 0} horas`, 20, 50);
    doc.text(`• Peso de filamento: ${document.getElementById('gramosPieza')?.value || 0} gramos`, 20, 58);

    let y = 75;
    const extras = document.querySelectorAll('.extra-row');
    if (extras.length > 0) {
        doc.text("INSUMOS ADICIONALES:", 20, y);
        y += 10;
        extras.forEach(row => {
            const nombre = row.querySelector('.extra-nombre').value || "Insumo";
            const precio = row.querySelector('.extra-precio').value || "0";
            doc.text(`• ${nombre}: $${precio}`, 25, y);
            y += 8;
        });
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(20, y + 5, 170, 25, 'F');
    doc.setFontSize(16);
    doc.text(`TOTAL: ${total}`, 105, y + 22, { align: "center" });

    doc.save("Presupuesto-Ryhen3D.pdf");
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    listaExtras = document.getElementById('lista-extras');
    
    const btnAddExtra = document.getElementById('btn-add-extra');
    const btnPDF = document.getElementById('btn-pdf');

    if (btnAddExtra) btnAddExtra.addEventListener('click', crearFilaExtra);
    if (btnPDF) btnPDF.addEventListener('click', generarPDF);

    // Eventos en todos los inputs
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', calcular);
    });

    // Cálculo inicial
    calcular();
});