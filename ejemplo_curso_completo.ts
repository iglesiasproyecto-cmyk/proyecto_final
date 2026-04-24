// 📚 EJEMPLO COMPLETO: Creación de Curso "Liderazgo Cristiano Básico"
// Por un Admin de Iglesia

// =====================================================
// PASO 1: CREAR EL CURSO
// =====================================================

const cursoEjemplo = {
  nombre: "Liderazgo Cristiano Básico",
  descripcion: "Curso fundamental para desarrollar habilidades de liderazgo en el contexto cristiano",
  duracionHoras: 24,
  idMinisterio: 1, // Ministerio de Jóvenes (ejemplo)
  idUsuarioCreador: 2 // Admin de iglesia
};

// Función para crear curso
async function crearCursoEjemplo() {
  const { data, error } = await supabase
    .from('curso')
    .insert(cursoEjemplo)
    .select()
    .single();

  if (error) throw error;
  console.log('✅ Curso creado:', data);
  return data;
}

// =====================================================
// PASO 2: CREAR MÓDULOS
// =====================================================

const modulosEjemplo = [
  {
    titulo: "Fundamentos del Liderazgo Cristiano",
    descripcion: "Introducción a los principios bíblicos del liderazgo",
    orden: 1,
    contenidoMd: `# Fundamentos del Liderazgo Cristiano

## Introducción
El liderazgo cristiano se basa en servir, no en dominar...

## Principios Bíblicos
1. **Servir como Cristo** (Marcos 10:45)
2. **Humildad y amor** (Filipenses 2:3-4)
3. **Integridad y fidelidad** (Proverbios 11:3)
4. **Visión y propósito** (Habacuc 2:2-3)

## Actividad Práctica
Reflexiona sobre un líder bíblico que admiras y explica por qué.`,
    estado: 'publicado'
  },
  {
    titulo: "Comunicación Efectiva",
    descripcion: "Desarrollar habilidades de comunicación en el ministerio",
    orden: 2,
    contenidoMd: `# Comunicación Efectiva en el Liderazgo

## Importancia de la Comunicación
"La comunicación es el puente entre la confusión y la claridad"...

## Tipos de Comunicación
- **Verbal**: Palabras claras y concisas
- **No verbal**: Lenguaje corporal, tono de voz
- **Escucha activa**: Prestar atención genuina

## Técnicas Prácticas
1. **Preguntas abiertas** para fomentar diálogo
2. **Escucha empática** para entender perspectivas
3. **Feedback constructivo** para crecimiento mutuo`,
    estado: 'publicado'
  },
  {
    titulo: "Gestión de Conflictos",
    descripcion: "Resolver conflictos de manera bíblica y constructiva",
    orden: 3,
    contenidoMd: `# Gestión de Conflictos en la Iglesia

## Perspectiva Bíblica
"Si es posible, en cuanto dependa de vosotros, estad en paz con todos" (Romanos 12:18)

## Pasos para Resolver Conflictos
1. **Orar** por sabiduría y paz
2. **Escuchar** todas las perspectivas
3. **Buscar** soluciones bíblicas
4. **Perdonar** y reconciliar

## Prevención de Conflictos
- Comunicación clara desde el inicio
- Expectativas realistas
- Respeto mutuo y amor fraternal`,
    estado: 'publicado'
  }
];

// Función para crear módulos
async function crearModulosEjemplo(idCurso: number) {
  for (const modulo of modulosEjemplo) {
    const { data, error } = await supabase
      .from('modulo')
      .insert({
        ...modulo,
        idCurso
      })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Módulo creado:', data.titulo);
  }
}

// =====================================================
// PASO 3: CREAR EVALUACIONES
// =====================================================

const evaluacionesEjemplo = [
  {
    titulo: "Evaluación Fundamentos del Liderazgo",
    descripcion: "Evalúa la comprensión de los principios básicos del liderazgo cristiano",
    puntajeMinimo: 70,
    maxIntentos: 2,
    activo: true
  },
  {
    titulo: "Evaluación Comunicación Efectiva",
    descripcion: "Verifica las habilidades de comunicación aprendidas",
    puntajeMinimo: 75,
    maxIntentos: 2,
    activo: true
  },
  {
    titulo: "Evaluación Final - Liderazgo Cristiano",
    descripcion: "Evaluación comprehensiva de todo el curso",
    puntajeMinimo: 80,
    maxIntentos: 1,
    activo: true
  }
];

// Función para crear evaluaciones
async function crearEvaluacionesEjemplo(idCurso: number) {
  // Obtener módulos del curso
  const { data: modulos } = await supabase
    .from('modulo')
    .select('id_modulo, titulo, orden')
    .eq('id_curso', idCurso)
    .order('orden');

  if (!modulos || modulos.length === 0) return;

  // Crear evaluación para cada módulo
  for (let i = 0; i < Math.min(evaluacionesEjemplo.length, modulos.length); i++) {
    const evaluacion = evaluacionesEjemplo[i];
    const modulo = modulos[i];

    const { data: evalCreada, error: errorEval } = await supabase
      .from('evaluacion')
      .insert({
        ...evaluacion,
        id_modulo: modulo.id_modulo,
        id_usuario: 2 // Admin creador
      })
      .select()
      .single();

    if (errorEval) throw errorEval;
    console.log('✅ Evaluación creada:', evaluacion.titulo);

    // Crear preguntas para cada evaluación
    await crearPreguntasParaEvaluacion(evalCreada.id_evaluacion, modulo.titulo);
  }
}

// =====================================================
// PASO 4: CREAR PREGUNTAS Y OPCIONES
// =====================================================

async function crearPreguntasParaEvaluacion(idEvaluacion: number, moduloTitulo: string) {
  const preguntasPorModulo: Record<string, any[]> = {
    "Fundamentos del Liderazgo Cristiano": [
      {
        titulo: "¿Cuál es el principio fundamental del liderazgo cristiano según Marcos 10:45?",
        tipo: "multiple_choice",
        orden: 1,
        opciones: [
          { texto: "Servir a los demás", esCorrecta: true, puntos: 10, orden: 1 },
          { texto: "Mandar sobre otros", esCorrecta: false, puntos: 0, orden: 2 },
          { texto: "Buscar poder personal", esCorrecta: false, puntos: 0, orden: 3 },
          { texto: "Ignorar a los seguidores", esCorrecta: false, puntos: 0, orden: 4 }
        ]
      },
      {
        titulo: "¿Qué actitud debe caracterizar a un líder cristiano según Filipenses 2:3-4?",
        tipo: "multiple_choice",
        orden: 2,
        opciones: [
          { texto: "Humildad y consideración", esCorrecta: true, puntos: 10, orden: 1 },
          { texto: "Orgullo y egoísmo", esCorrecta: false, puntos: 0, orden: 2 },
          { texto: "Indiferencia", esCorrecta: false, puntos: 0, orden: 3 }
        ]
      },
      {
        titulo: "El liderazgo cristiano se basa principalmente en:",
        tipo: "multiple_choice",
        orden: 3,
        opciones: [
          { texto: "Servir y amar a los demás", esCorrecta: true, puntos: 10, orden: 1 },
          { texto: "Buscar reconocimiento", esCorrecta: false, puntos: 0, orden: 2 },
          { texto: "Ejercer autoridad", esCorrecta: false, puntos: 0, orden: 3 },
          { texto: "Competir con otros", esCorrecta: false, puntos: 0, orden: 4 }
        ]
      }
    ],
    "Comunicación Efectiva": [
      {
        titulo: "¿Cuál es un elemento clave de la escucha activa?",
        tipo: "multiple_choice",
        orden: 1,
        opciones: [
          { texto: "Prestar atención genuina", esCorrecta: true, puntos: 10, orden: 1 },
          { texto: "Pensar en la respuesta", esCorrecta: false, puntos: 0, orden: 2 },
          { texto: "Interrumpir frecuentemente", esCorrecta: false, puntos: 0, orden: 3 },
          { texto: "Mirar el teléfono", esCorrecta: false, puntos: 0, orden: 4 }
        ]
      },
      {
        titulo: "¿Qué tipo de preguntas fomentan el diálogo?",
        tipo: "multiple_choice",
        orden: 2,
        opciones: [
          { texto: "Preguntas abiertas", esCorrecta: true, puntos: 10, orden: 1 },
          { texto: "Preguntas cerradas", esCorrecta: false, puntos: 0, orden: 2 },
          { texto: "Preguntas retóricas", esCorrecta: false, puntos: 0, orden: 3 }
        ]
      }
    ],
    "Gestión de Conflictos": [
      {
        titulo: "¿Cuál es el primer paso bíblico para resolver conflictos?",
        tipo: "multiple_choice",
        orden: 1,
        opciones: [
          { texto: "Orar por sabiduría", esCorrecta: true, puntos: 10, orden: 1 },
          { texto: "Buscar venganza", esCorrecta: false, puntos: 0, orden: 2 },
          { texto: "Ignorar el problema", esCorrecta: false, puntos: 0, orden: 3 },
          { texto: "Hablar mal del otro", esCorrecta: false, puntos: 0, orden: 4 }
        ]
      },
      {
        titulo: "¿Qué actitud debemos tener según Romanos 12:18?",
        tipo: "multiple_choice",
        orden: 2,
        opciones: [
          { texto: "Estar en paz con todos", esCorrecta: true, puntos: 10, orden: 1 },
          { texto: "Buscar confrontación", esCorrecta: false, puntos: 0, orden: 2 },
          { texto: "Evitar a los demás", esCorrecta: false, puntos: 0, orden: 3 }
        ]
      }
    ]
  };

  const preguntas = preguntasPorModulo[moduloTitulo] || [];

  for (const preguntaData of preguntas) {
    // Crear pregunta
    const { data: pregunta, error: errorPregunta } = await supabase
      .from('pregunta')
      .insert({
        id_evaluacion: idEvaluacion,
        titulo: preguntaData.titulo,
        tipo: preguntaData.tipo,
        orden: preguntaData.orden,
        activo: true
      })
      .select()
      .single();

    if (errorPregunta) throw errorPregunta;

    // Crear opciones
    for (const opcion of preguntaData.opciones) {
      const { error: errorOpcion } = await supabase
        .from('opcion_respuesta')
        .insert({
          id_pregunta: pregunta.id_pregunta,
          texto_opcion: opcion.texto,
          es_correcta: opcion.esCorrecta,
          puntos: opcion.puntos,
          orden: opcion.orden
        });

      if (errorOpcion) throw errorOpcion;
    }

    console.log('✅ Pregunta creada:', preguntaData.titulo);
  }
}

// =====================================================
// EJECUCIÓN DEL EJEMPLO COMPLETO
// =====================================================

async function crearCursoCompletoEjemplo() {
  try {
    console.log('🚀 Iniciando creación del curso completo...');

    // Paso 1: Crear curso
    const curso = await crearCursoEjemplo();
    console.log('📚 Curso creado con ID:', curso.id_curso);

    // Paso 2: Crear módulos
    await crearModulosEjemplo(curso.id_curso);
    console.log('📖 Módulos creados');

    // Paso 3: Crear evaluaciones con preguntas
    await crearEvaluacionesEjemplo(curso.id_curso);
    console.log('📝 Evaluaciones con preguntas creadas');

    console.log('🎉 ¡Curso completo creado exitosamente!');
    console.log('Los estudiantes ahora pueden inscribirse y tomar las evaluaciones.');

  } catch (error) {
    console.error('❌ Error creando el curso:', error);
  }
}

// Ejecutar el ejemplo
// crearCursoCompletoEjemplo();