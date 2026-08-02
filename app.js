// ============================================================
// Front - Restaurante La Esquina (Clase 03)
// Hoy el front habla los 4 verbos HTTP:
//   GET  para leer, POST para crear,
//   PUT  para modificar, DELETE para eliminar.
// ============================================================
const API_URL = "http://localhost:3000/api";

// Los estados posibles, en orden de avance
const ESTADOS = ["Pendiente", "En preparación", "Entregado"];

// Elementos del DOM
const formulario = document.querySelector("#formPedido");
const inputMesa = document.querySelector("#mesa");
const selectPlato = document.querySelector("#plato");
const inputCantidad = document.querySelector("#cantidad");
const listado = document.querySelector("#listadoPedidos");
const mensaje = document.querySelector("#mensaje");
const btnTodos = document.querySelector("#btnTodos");
const btnActivos = document.querySelector("#btnActivos");

let pedidosActuales = [];

// Formateador de precios en pesos argentinos
const formatoPrecio = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
});

// ------------------------------------------------------------
// Cargar el combo del menú (GET /api/platos)
// ------------------------------------------------------------
async function cargarPlatos() {
    try {
        const respuesta = await fetch(`${API_URL}/platos`);

        if (!respuesta.ok) {
            throw new Error("Error al obtener el menú");
        }

        const platos = await respuesta.json();

        selectPlato.innerHTML = '<option value="">Seleccione un plato</option>';

        platos.forEach(plato => {
            selectPlato.innerHTML += `
                <option value="${plato.idPlato}">
                    ${plato.nombre} — ${formatoPrecio.format(plato.precio)}
                </option>
            `;
        });

    } catch (error) {
        selectPlato.innerHTML = '<option value="">No se pudo cargar</option>';
        mostrarMensaje("No se pudo conectar con la API.", "error");
        console.error(error);
    }
}

// ------------------------------------------------------------
// Cargar y mostrar pedidos (GET /api/pedidos)
// ------------------------------------------------------------
async function cargarPedidos() {
    try {
        const respuesta = await fetch(`${API_URL}/pedidos`);

        if (!respuesta.ok) {
            throw new Error("Error al obtener pedidos");
        }

        pedidosActuales = await respuesta.json();
        mostrarPedidos();

    } catch (error) {
        mostrarMensaje("No se pudo conectar con la API.", "error");
        console.error(error);
    }
}

function claseDeEstado(estado) {
    if (estado === "Pendiente") return "pendiente";
    if (estado === "En preparación") return "preparacion";
    return "entregado";
}

function mostrarPedidos() {
    const soloActivos = btnActivos.classList.contains("activo");

    const pedidos = soloActivos
        ? pedidosActuales.filter(pedido => pedido.estado !== "Entregado")
        : pedidosActuales;

    listado.innerHTML = "";

    if (pedidos.length === 0) {
        listado.innerHTML = '<p class="sin-resultados">No hay pedidos para mostrar</p>';
        return;
    }

    pedidos.forEach(pedido => {
        const esEntregado = pedido.estado === "Entregado";
        const esPendiente = pedido.estado === "Pendiente";

        // Un pedido entregado ya no ofrece acciones (regla del negocio)
        const acciones = esEntregado ? "" : `
            <div class="acciones">
                <input type="number" min="1" step="1" value="${pedido.cantidad}"
                       id="cant-${pedido.idPedido}" aria-label="Cantidad">
                <button class="guardar" data-id="${pedido.idPedido}" data-accion="guardar">
                    Guardar
                </button>
                <button class="avanzar" data-id="${pedido.idPedido}" data-accion="avanzar">
                    Avanzar ▶
                </button>
                ${esPendiente ? `
                <button class="cancelar" data-id="${pedido.idPedido}" data-accion="cancelar">
                    Cancelar ✕
                </button>` : ""}
            </div>
        `;

        listado.innerHTML += `
            <div class="tarjeta">
                <h3>Mesa ${pedido.mesa} — ${pedido.plato}</h3>
                <p><strong>Cantidad:</strong> ${pedido.cantidad}
                   · <strong>Importe:</strong> ${formatoPrecio.format(pedido.importe)}</p>
                <span class="chip ${claseDeEstado(pedido.estado)}">${pedido.estado}</span>
                ${acciones}
            </div>
        `;
    });
}

// ------------------------------------------------------------
// POST: nuevo pedido
// ------------------------------------------------------------
async function crearPedido(evento) {
    evento.preventDefault();

    const nuevoPedido = {
        mesa: Number(inputMesa.value),
        idPlato: Number(selectPlato.value),
        cantidad: Number(inputCantidad.value)
    };

    if (!nuevoPedido.mesa || !nuevoPedido.idPlato || !nuevoPedido.cantidad) {
        mostrarMensaje("Debe completar todos los datos.", "error");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoPedido)
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.mensaje);
        }

        mostrarMensaje("Pedido enviado a cocina.", "ok");
        formulario.reset();
        inputCantidad.value = 1;
        cargarPedidos();

    } catch (error) {
        mostrarMensaje(`Error: ${error.message}`, "error");
        console.error(error);
    }
}

// ------------------------------------------------------------
// PUT: modificar cantidad y/o avanzar el estado
// El id del pedido viaja EN LA URL: /api/pedidos/4
// ------------------------------------------------------------
async function actualizarPedido(idPedido, cantidad, estado) {
    try {
        const respuesta = await fetch(`${API_URL}/pedidos/${idPedido}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cantidad, estado })
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.mensaje);
        }

        mostrarMensaje(data.mensaje, "ok");
        cargarPedidos();

    } catch (error) {
        mostrarMensaje(`Error: ${error.message}`, "error");
        console.error(error);
    }
}

// ------------------------------------------------------------
// DELETE: cancelar un pedido pendiente
// ------------------------------------------------------------
async function cancelarPedido(idPedido) {
    // Confirmación simple antes de una acción destructiva
    const seguro = confirm("¿Cancelar este pedido? Esta acción no se puede deshacer.");
    if (!seguro) return;

    try {
        const respuesta = await fetch(`${API_URL}/pedidos/${idPedido}`, {
            method: "DELETE"
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.mensaje);
        }

        mostrarMensaje(data.mensaje, "ok");
        cargarPedidos();

    } catch (error) {
        mostrarMensaje(`Error: ${error.message}`, "error");
        console.error(error);
    }
}

// ------------------------------------------------------------
// Delegación de eventos para los botones de las tarjetas
// ------------------------------------------------------------
listado.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-id]");
    if (!boton) return;

    const idPedido = Number(boton.dataset.id);
    const pedido = pedidosActuales.find(item => item.idPedido === idPedido);
    if (!pedido) return;

    const cantidad = Number(document.querySelector(`#cant-${idPedido}`).value);

    if (boton.dataset.accion === "guardar") {
        // Cambia la cantidad, mantiene el estado
        actualizarPedido(idPedido, cantidad, pedido.estado);
    }

    if (boton.dataset.accion === "avanzar") {
        // Pasa al estado siguiente: Pendiente -> En preparación -> Entregado
        const indice = ESTADOS.indexOf(pedido.estado);
        const estadoSiguiente = ESTADOS[indice + 1];
        if (estadoSiguiente) {
            actualizarPedido(idPedido, cantidad, estadoSiguiente);
        }
    }

    if (boton.dataset.accion === "cancelar") {
        cancelarPedido(idPedido);
    }
});

// ------------------------------------------------------------
// Filtros Todos / En curso
// ------------------------------------------------------------
btnTodos.addEventListener("click", () => {
    btnTodos.classList.add("activo");
    btnActivos.classList.remove("activo");
    mostrarPedidos();
});

btnActivos.addEventListener("click", () => {
    btnActivos.classList.add("activo");
    btnTodos.classList.remove("activo");
    mostrarPedidos();
});

// ------------------------------------------------------------
// Utilidad para mensajes
// ------------------------------------------------------------
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
}

// Eventos e inicialización
formulario.addEventListener("submit", crearPedido);
cargarPlatos();
cargarPedidos();
