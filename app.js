(function(){
  "use strict";

  // ---------- almacenamiento (simula la base de datos de cada microservicio) ----------
  // Usa localStorage del navegador para persistir los datos entre sesiones.
  async function cargar(clave, porDefecto){
    try{
      const v = localStorage.getItem('biblioteca_' + clave);
      return v ? JSON.parse(v) : porDefecto;
    }catch(e){ return porDefecto; }
  }
  async function guardar(clave, valor){
    try{ localStorage.setItem('biblioteca_' + clave, JSON.stringify(valor)); }
    catch(e){ console.error("Error guardando", clave, e); }
  }

  let usuarios = [];
  let libros = [];
  let prestamos = [];

  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-EC', {day:'2-digit', month:'short', year:'numeric'});
  };

  function correlativo(prefijo, lista){
    const n = (lista.length + 1).toString().padStart(3,'0');
    return prefijo + '-' + n;
  }

  // ---------- navegación entre microservicios ----------
  document.querySelectorAll('.drawer-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      document.querySelectorAll('.drawer-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-'+tab.dataset.panel).classList.add('active');
    });
  });

  function setMsg(id, texto, tipo){
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = 'msg ' + (tipo||'');
    if(texto){ setTimeout(()=>{ el.textContent=''; el.className='msg'; }, 3500); }
  }

  // ================= MICROSERVICIO USUARIOS =================
  function renderUsuarios(){
    const cont = document.getElementById('lista-usuarios');
    document.getElementById('total-usuarios').textContent = usuarios.length + (usuarios.length===1?' registro':' registros');
    document.getElementById('count-usuarios').textContent = usuarios.length;
    if(usuarios.length===0){
      cont.innerHTML = '<div class="vacio">Aún no hay usuarios registrados en el sistema.</div>';
      return;
    }
    cont.innerHTML = usuarios.slice().reverse().map(u => `
      <div class="registro">
        <div>
          <div class="codigo">${u.codigo} · registrado el ${fmtFecha(u.fecha)}</div>
          <div class="titulo">${escapeHtml(u.nombre)}</div>
          <div class="detalle">
            <span>📄 ${escapeHtml(u.documento)}</span>
            <span>✉ ${escapeHtml(u.correo)}</span>
            ${u.telefono ? '<span>☎ '+escapeHtml(u.telefono)+'</span>' : ''}
          </div>
        </div>
      </div>
    `).join('');
    llenarSelectUsuarios();
  }

  function llenarSelectUsuarios(){
    const sel = document.getElementById('p-usuario');
    sel.innerHTML = usuarios.length
      ? usuarios.map(u=>`<option value="${u.codigo}">${escapeHtml(u.nombre)} (${u.codigo})</option>`).join('')
      : '<option value="">No hay usuarios registrados</option>';
  }

  document.getElementById('form-usuarios').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const nombre = document.getElementById('u-nombre').value.trim();
    const documento = document.getElementById('u-documento').value.trim();
    const correo = document.getElementById('u-correo').value.trim();
    const telefono = document.getElementById('u-telefono').value.trim();
    if(!nombre || !documento || !correo){ setMsg('msg-usuarios','Complete los campos obligatorios.','err'); return; }
    if(usuarios.some(u=>u.documento===documento)){ setMsg('msg-usuarios','Ya existe un usuario con ese documento.','err'); return; }
    const nuevo = { codigo: correlativo('USR', usuarios), nombre, documento, correo, telefono, fecha: new Date().toISOString() };
    usuarios.push(nuevo);
    await guardar('usuarios', usuarios);
    renderUsuarios();
    e.target.reset();
    setMsg('msg-usuarios', 'Usuario registrado correctamente.', 'ok');
  });

  // ================= MICROSERVICIO LIBROS =================
  function renderLibros(){
    const cont = document.getElementById('lista-libros');
    document.getElementById('total-libros').textContent = libros.length + (libros.length===1?' registro':' registros');
    document.getElementById('count-libros').textContent = libros.length;
    if(libros.length===0){
      cont.innerHTML = '<div class="vacio">Aún no hay libros registrados en el catálogo.</div>';
      return;
    }
    cont.innerHTML = libros.slice().reverse().map(l=>`
      <div class="registro">
        <div>
          <div class="codigo">${l.codigo} · ISBN ${escapeHtml(l.isbn)}</div>
          <div class="titulo">${escapeHtml(l.titulo)}</div>
          <div class="detalle">
            <span>✍ ${escapeHtml(l.autor)}</span>
            <span>🏷 ${escapeHtml(l.categoria)}</span>
            <span>📦 ${l.disponibles} de ${l.cantidad} disponibles</span>
          </div>
        </div>
        <div class="sello ${l.disponibles>0?'disponible':'agotado'}">${l.disponibles>0?'Disponible':'Agotado'}</div>
      </div>
    `).join('');
    llenarSelectLibros();
  }

  function llenarSelectLibros(){
    const sel = document.getElementById('p-libro');
    const disp = libros.filter(l=>l.disponibles>0);
    sel.innerHTML = disp.length
      ? disp.map(l=>`<option value="${l.codigo}">${escapeHtml(l.titulo)} — ${escapeHtml(l.autor)} (${l.disponibles} disp.)</option>`).join('')
      : '<option value="">No hay libros disponibles</option>';
  }

  document.getElementById('form-libros').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const titulo = document.getElementById('l-titulo').value.trim();
    const autor = document.getElementById('l-autor').value.trim();
    const isbn = document.getElementById('l-isbn').value.trim();
    const categoria = document.getElementById('l-categoria').value.trim();
    const cantidad = parseInt(document.getElementById('l-cantidad').value, 10);
    if(!titulo || !autor || !isbn || !categoria || !cantidad || cantidad<1){
      setMsg('msg-libros','Complete todos los campos con valores válidos.','err'); return;
    }
    const nuevo = { codigo: correlativo('LIB', libros), titulo, autor, isbn, categoria, cantidad, disponibles: cantidad, fecha: new Date().toISOString() };
    libros.push(nuevo);
    await guardar('libros', libros);
    renderLibros();
    e.target.reset();
    document.getElementById('l-cantidad').value = 1;
    setMsg('msg-libros', 'Libro registrado correctamente.', 'ok');
  });

  // ================= MICROSERVICIO PRÉSTAMOS =================
  function renderPrestamos(){
    const cont = document.getElementById('lista-prestamos');
    document.getElementById('total-prestamos').textContent = prestamos.length + (prestamos.length===1?' registro':' registros');
    document.getElementById('count-prestamos').textContent = prestamos.length;
    if(prestamos.length===0){
      cont.innerHTML = '<div class="vacio">Aún no se han registrado préstamos.</div>';
      return;
    }
    cont.innerHTML = prestamos.slice().reverse().map(p=>`
      <div class="registro">
        <div>
          <div class="codigo">${p.codigo} · préstamo del ${fmtFecha(p.fechaPrestamo)}</div>
          <div class="titulo">${escapeHtml(p.libroTitulo)}</div>
          <div class="detalle">
            <span>👤 ${escapeHtml(p.usuarioNombre)}</span>
            <span>⏳ devolución estimada: ${fmtFecha(p.fechaEstimada)}</span>
            ${p.fechaReal ? '<span>✅ devuelto el '+fmtFecha(p.fechaReal)+'</span>' : ''}
          </div>
        </div>
        ${p.estado==='Activo'
          ? `<div class="accion-devolver">
               <div class="sello activo" style="margin-bottom:8px;">Activo</div><br>
               <button class="btn secundario" data-codigo="${p.codigo}">Marcar devuelto</button>
             </div>`
          : `<div class="sello devuelto">Devuelto</div>`
        }
      </div>
    `).join('');

    cont.querySelectorAll('button[data-codigo]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const cod = btn.dataset.codigo;
        const p = prestamos.find(x=>x.codigo===cod);
        if(!p) return;
        p.estado = 'Devuelto';
        p.fechaReal = new Date().toISOString();
        const libro = libros.find(l=>l.codigo===p.libroCodigo);
        if(libro){ libro.disponibles = Math.min(libro.cantidad, libro.disponibles+1); }
        await guardar('prestamos', prestamos);
        await guardar('libros', libros);
        renderPrestamos();
        renderLibros();
      });
    });
  }

  document.getElementById('form-prestamos').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const usuarioCodigo = document.getElementById('p-usuario').value;
    const libroCodigo = document.getElementById('p-libro').value;
    const dias = parseInt(document.getElementById('p-dias').value, 10);
    if(!usuarioCodigo || !libroCodigo || !dias || dias<1){
      setMsg('msg-prestamos','Seleccione usuario, libro y una duración válida.','err'); return;
    }
    const usuario = usuarios.find(u=>u.codigo===usuarioCodigo);
    const libro = libros.find(l=>l.codigo===libroCodigo);
    if(!usuario || !libro || libro.disponibles<1){
      setMsg('msg-prestamos','El libro seleccionado ya no está disponible.','err'); return;
    }
    const fechaPrestamo = new Date();
    const fechaEstimada = new Date(fechaPrestamo.getTime() + dias*24*60*60*1000);
    const nuevo = {
      codigo: correlativo('PRE', prestamos),
      usuarioCodigo, usuarioNombre: usuario.nombre,
      libroCodigo, libroTitulo: libro.titulo,
      fechaPrestamo: fechaPrestamo.toISOString(),
      fechaEstimada: fechaEstimada.toISOString(),
      fechaReal: null,
      estado: 'Activo'
    };
    libro.disponibles -= 1;
    prestamos.push(nuevo);
    await guardar('prestamos', prestamos);
    await guardar('libros', libros);
    renderPrestamos();
    renderLibros();
    setMsg('msg-prestamos', 'Préstamo registrado correctamente.', 'ok');
  });

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  // ---------- inicio ----------
  (async function init(){
    usuarios = await cargar('usuarios', []);
    libros = await cargar('libros', []);
    prestamos = await cargar('prestamos', []);
    renderUsuarios();
    renderLibros();
    renderPrestamos();
  })();

})();
