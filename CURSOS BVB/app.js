// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
const state = {
    data: [],            // Todos los registros del CSV
    filteredData: [],    // Registros después de aplicar filtros
    coursesList: [],     // Nombres de las columnas de cursos
    selectedRows: new Set() // IDs o Índices de las filas seleccionadas
};

// ==========================================
// 1. SEGURIDAD CLIENT-SIDE (DISUASORIA)
// Nota: Esto previene accesos accidentales, pero 
// el código fuente es visible en el navegador.
// ==========================================
document.getElementById('login-btn').addEventListener('click', () => {
    const pass = document.getElementById('password-input').value;
    if (pass === "BOMBEROSBRANDSEN1996") {
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        initApp(); // Cargar datos solo tras acceso exitoso
    } else {
        document.getElementById('login-error').innerText = "Contraseña incorrecta. Intente nuevamente.";
    }
});

// ==========================================
// 2. INICIALIZACIÓN Y LECTURA DE CSV
// ==========================================
function initApp() {
    // Usamos PapaParse para procesar el CSV local (debe estar en el repo)
    Papa.parse("datos_bomberos.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            state.data = results.data;
            state.filteredData = [...state.data];
            
            // Detectar columnas de cursos (excluyendo datos personales)
            const excludeKeys = ['Apellido y Nombre', 'Jerarquía', 'Destacamento'];
            if(state.data.length > 0) {
                state.coursesList = Object.keys(state.data[0]).filter(k => !excludeKeys.includes(k));
                populateCourseDropdown();
            }
            
            updateDashboard();
            renderTable();
        },
        error: function(err) {
            console.error("Error al cargar el CSV. Asegúrese de que el archivo 'datos_bomberos.csv' exista en la raíz.", err);
            alert("No se pudo cargar la base de datos de bomberos.");
        }
    });
    
    setupEventListeners();
}

// ==========================================
// 3. ACTUALIZACIÓN DEL DASHBOARD
// ==========================================
function updateDashboard() {
    let maxCursos = 0;
    let bomberoTop = "N/A";
    let aspirantesCount = 0;
    let totalCursosGlobal = 0;

    state.data.forEach(row => {
        // Contar aspirantes
        if (row['Jerarquía'] && row['Jerarquía'].trim().toLowerCase() === 'aspirante') {
            aspirantesCount++;
        }

        // Contar cursos válidos por bombero
        let countCursosPersonal = 0;
        state.coursesList.forEach(curso => {
            const val = row[curso];
            // Si el valor existe y no indica ausencia
            if (val && val.trim() !== '' && val.trim().toLowerCase() !== 'no') {
                countCursosPersonal++;
                totalCursosGlobal++;
            }
        });

        if (countCursosPersonal > maxCursos) {
            maxCursos = countCursosPersonal;
            bomberoTop = row['Apellido y Nombre'];
        }
    });

    document.getElementById('metric-top-bombero').innerText = bomberoTop;
    document.getElementById('metric-total-cursos').innerText = totalCursosGlobal;
    document.getElementById('metric-aspirantes').innerText = aspirantesCount;
}

function populateCourseDropdown() {
    const select = document.getElementById('filter-course');
    state.coursesList.forEach(curso => {
        const option = document.createElement('option');
        option.value = curso;
        option.textContent = curso;
        select.appendChild(option);
    });
}

// ==========================================
// 4. MOTOR DE FILTROS CRUZADOS
// ==========================================
function applyFilters() {
    const searchName = document.getElementById('search-name').value.toLowerCase();
    const course = document.getElementById('filter-course').value;
    const condition = document.getElementById('filter-eligibility').value;
    const rank = document.getElementById('filter-rank').value.toLowerCase();
    const station = document.getElementById('filter-station').value;

    state.filteredData = state.data.filter(row => {
        // Filtro: Nombre
        const nameMatch = row['Apellido y Nombre'] ? row['Apellido y Nombre'].toLowerCase().includes(searchName) : false;
        
        // Filtro: Jerarquía
        const rankMatch = rank === "" || (row['Jerarquía'] && row['Jerarquía'].toLowerCase() === rank);
        
        // Filtro: Destacamento
        const stationMatch = station === "" || row['Destacamento'] === station;

        // Filtro: Condición de Curso (Lógica de Elegibilidad)
        let courseMatch = true;
        if (course !== "") {
            const hasCourseInfo = row[course] && row[course].trim() !== '' && row[course].trim().toLowerCase() !== 'no';
            if (condition === 'has') courseMatch = hasCourseInfo;
            if (condition === 'nothas') courseMatch = !hasCourseInfo;
            // Si condition === 'all', ignora el cruce y courseMatch sigue true
        }

        return nameMatch && rankMatch && stationMatch && courseMatch;
    });

    // Reiniciar selecciones al filtrar
    state.selectedRows.clear(); 
    updateDownloadButtonState();
    renderTable();
}

function setupEventListeners() {
    // Escuchadores de Filtros
    document.getElementById('search-name').addEventListener('input', applyFilters);
    document.getElementById('filter-course').addEventListener('change', applyFilters);
    document.getElementById('filter-eligibility').addEventListener('change', applyFilters);
    document.getElementById('filter-rank').addEventListener('change', applyFilters);
    document.getElementById('filter-station').addEventListener('change', applyFilters);

    // Selección masiva
    document.getElementById('select-all').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach((cb) => {
            cb.checked = e.target.checked;
            handleRowSelection(cb.dataset.index, e.target.checked);
        });
    });

    // Descarga de ZIP
    document.getElementById('download-zip-btn').addEventListener('click', downloadSelectedCertificates);
    
    // Cerrar Perfil
    document.getElementById('close-profile').addEventListener('click', () => {
        document.getElementById('profile-modal').classList.add('hidden');
    });
}

// ==========================================
// 5. RENDERIZADO DE TABLA Y PERFILES
// ==========================================
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    state.filteredData.forEach((row, index) => {
        // Encontrar el índice original en state.data para referenciarlo correctamente al promover
        const originalIndex = state.data.indexOf(row);
        
        const tr = document.createElement('tr');
        
        const isChecked = state.selectedRows.has(originalIndex.toString()) ? 'checked' : '';

        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-index="${originalIndex}" ${isChecked}></td>
            <td style="font-weight: bold;">${row['Apellido y Nombre']}</td>
            <td>${row['Jerarquía']}</td>
            <td>${row['Destacamento'] === 'B' ? 'Brandsen' : (row['Destacamento'] === 'J' ? 'Jeppener' : row['Destacamento'])}</td>
            <td>
                <button class="btn-small view-profile" data-index="${originalIndex}">Ver Perfil</button>
                ${row['Jerarquía'].toLowerCase() === 'aspirante' ? `<button class="btn-small promote-btn" data-index="${originalIndex}" style="background-color: #f57c00;">Promover</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Eventos dinámicos en las filas
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => handleRowSelection(e.target.dataset.index, e.target.checked));
    });

    document.querySelectorAll('.view-profile').forEach(btn => {
        btn.addEventListener('click', (e) => openProfile(e.target.dataset.index));
    });

    document.querySelectorAll('.promote-btn').forEach(btn => {
        btn.addEventListener('click', (e) => promoteAspirante(e.target.dataset.index));
    });
}

function handleRowSelection(index, isSelected) {
    if (isSelected) {
        state.selectedRows.add(index.toString());
    } else {
        state.selectedRows.delete(index.toString());
    }
    updateDownloadButtonState();
}

function updateDownloadButtonState() {
    const btn = document.getElementById('download-zip-btn');
    const selectedCourse = document.getElementById('filter-course').value;
    
    // Solo permitimos descarga masiva si hay filas seleccionadas Y un curso específico filtrado
    if (state.selectedRows.size > 0 && selectedCourse !== "") {
        btn.disabled = false;
        btn.innerText = `Descargar PDFs (${state.selectedRows.size})`;
    } else {
        btn.disabled = true;
        btn.innerText = selectedCourse === "" ? "Filtre un curso para descargar" : "Descargar Certificados ZIP";
    }
}

// Acción: Promover a Bombero en el DOM
function promoteAspirante(index) {
    if(confirm(`¿Confirmar promoción de ${state.data[index]['Apellido y Nombre']} a Bombero?`)) {
        state.data[index]['Jerarquía'] = 'Bombero';
        updateDashboard();
        applyFilters(); // Re-aplica filtros y re-renderiza
    }
}

// Modal de Perfil Individual
function openProfile(index) {
    const person = state.data[index];
    document.getElementById('profile-name').innerText = person['Apellido y Nombre'];
    document.getElementById('profile-rank').innerText = person['Jerarquía'];
    document.getElementById('profile-station').innerText = person['Destacamento'] === 'B' ? 'Brandsen' : 'Jeppener';
    
    const ul = document.getElementById('profile-courses-list');
    ul.innerHTML = '';
    
    state.coursesList.forEach(course => {
        const status = person[course];
        if (status && status.trim() !== '' && status.trim().toLowerCase() !== 'no') {
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>${course}</strong></span> <span>${status}</span>`;
            ul.appendChild(li);
        }
    });

    if(ul.innerHTML === '') {
        ul.innerHTML = '<li>Sin cursos registrados.</li>';
    }

    document.getElementById('profile-modal').classList.remove('hidden');
}

// ==========================================
// 6. GENERADOR DE ARCHIVOS ZIP MASIVOS
// ==========================================
// Helper para extraer el año del valor de la celda (ej: "2024", "2024-05-10", "Enviado 2024")
function extractYear(cellValue) {
    const match = String(cellValue).match(/\b(20\d{2})\b/);
    return match ? match[1] : 'Sin_Anio';
}

async function downloadSelectedCertificates() {
    const selectedCourse = document.getElementById('filter-course').value;
    if (!selectedCourse) return;

    const zip = new JSZip();
    const folder = zip.folder(selectedCourse.replace(/\//g, "-")); // Evitar problemas de ruta
    let fileAdded = false;

    // Cambiar estado del botón
    const btn = document.getElementById('download-zip-btn');
    const originalText = btn.innerText;
    btn.innerText = "Empaquetando...";
    btn.disabled = true;

    for (let index of state.selectedRows) {
        const person = state.data[index];
        const rawName = person['Apellido y Nombre'];
        const courseStatus = person[selectedCourse];
        
        // Si no tiene el curso aprobado/registrado, saltamos
        if (!courseStatus || courseStatus.trim().toLowerCase() === 'no') continue;

        const year = extractYear(courseStatus);
        
        // CONSTRUCTOR DE URL SEGÚN ESTRUCTURA REQUERIDA
        // ./[Nombre_Bombero]/[Año_del_Curso]/[Nombre_del_Curso]/certificado.pdf
        const url = `./${encodeURIComponent(rawName)}/${encodeURIComponent(year)}/${encodeURIComponent(selectedCourse)}/certificado.pdf`;

        try {
            // Intentamos hacer fetch del archivo local en GitHub Pages
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                // Nombre del archivo dentro del ZIP: Apellido_Nombre_Curso.pdf
                const fileName = `${rawName.replace(/\s+/g, '_')}_${selectedCourse.replace(/\s+/g, '_')}.pdf`;
                folder.file(fileName, blob);
                fileAdded = true;
            } else {
                console.warn(`Archivo no encontrado: ${url}`);
            }
        } catch (error) {
            console.error(`Error de red buscando el certificado de ${rawName}:`, error);
        }
    }

    if (fileAdded) {
        try {
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `Certificados_${selectedCourse.replace(/\s+/g, '_')}.zip`);
        } catch (err) {
            alert("Error al generar el archivo ZIP.");
            console.error(err);
        }
    } else {
        alert(`No se encontraron archivos PDF para los bomberos seleccionados en el curso: ${selectedCourse}.\nVerifique que las carpetas existan con el nombre exacto en GitHub Pages.`);
    }

    // Restaurar botón
    btn.innerText = originalText;
    btn.disabled = false;
}
