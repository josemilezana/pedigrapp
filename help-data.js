window.PEDIGRAPP_HELP_DATA = {
  helpVersion: "1.0.2",
  updatedAt: "20/10/2026",
  title: "Ayuda y nomenclatura de PedigrAPP",
  intro: "Guía de uso y referencia de los símbolos, relaciones y convenciones implementadas en PedigrAPP. La aplicación se apoya en la nomenclatura estandarizada de pedigree de la National Society of Genetic Counselors (NSGC), con las revisiones y correcciones indicadas en la bibliografía.",
  notes: [
    "Cuando una recomendación de 2025 corrige o matiza la publicación de 2022, PedigrAPP aplica el criterio corregido de 2025.",
    "Algunas decisiones de representación y de layout son convenciones de la aplicación para mantener el árbol legible; se identifican expresamente como «Convención PedigrAPP»."
  ],
  quickStart: [
    {title:"Añadir individuos",text:"Los atajos de creación aparecen en una tarjeta sin título sobre el visor, incluido Padre + madre + feto (P, sexo desconocido): puede utilizarse como trío de estudio prenatal sin asignar por defecto una indicación clínica ni un resultado fetal. A su derecha se sitúa una segunda tarjeta con las acciones principales de la aplicación: nueva familia, reset, deshacer/rehacer, guardar, importar/exportar, PDF y ayuda. Más abajo, «Añadir individuo», «Relaciones avanzadas» y «Listados» comparten una misma fila en escritorio; el formulario de individuo distribuye sus campos principales en dos filas para mejorar la lectura."},
    {title:"Abrir el menú de un individuo",text:"Pulse sobre el símbolo del individuo. La tarjeta contextual permite editar datos básicos y aplicar atajos como fallecido, probando, consultante o afectación simple."},
    {title:"Información clínica y genética",text:"Desde la tarjeta contextual pulse «Introducir información clínica y genética». Allí se registran estados por condición, resultados moleculares, variantes, cigosis y comentarios."},
    {title:"Progenitores intencionales",text:"En un embarazo o descendiente, abre Opciones avanzadas y selecciona los progenitores intencionales. PedigrAPP escribirá sus números genealógicos bajo el símbolo y actualizará el texto si cambia la numeración; no dibuja línea genética desde ellos. Es una anotación propia para aclarar la filiación intencional, distinta de las líneas de donación D y gestación G de Bennett 2025."},
    {title:"Situación reproductiva de una pareja",text:"Pulsa directamente la línea de unión; debajo de Relación finalizada y Relación consanguínea aparece Situación reproductiva. Elige No descendencia por elección/motivo desconocido o Infertilidad, atribúyelo a la pareja o a uno de sus integrantes, indica un motivo si procede y pulsa Guardar situación reproductiva. El marcador de una o dos barras se representa automáticamente. Esta información es la misma que en Relaciones avanzadas."},
    {title:"Crear relaciones",text:"Use los atajos del tooltip para relaciones habituales, entre ellos Añadir feto como descendencia (sexo desconocido). Si un individuo tiene varias parejas, el atajo Feto no pide elegir una: registra como progenitor solo al individuo seleccionado, y permite indicar otro progenitor posteriormente mediante «Relaciones avanzadas». Para adopción, filiaciones específicas, gemelos y situaciones menos frecuentes también puede usar «Relaciones avanzadas»."},
    {title:"Moverse por el árbol",text:"El visor permite zoom, desplazamiento, ajuste al ancho, encuadre completo y búsqueda de individuos. Al cargar un caso, el pedigree se ajusta automáticamente al ancho. Para ajustar una posición, mantén pulsado el ratón sobre un individuo y arrástralo horizontalmente: las conexiones se actualizan y los vecinos de su fila dejan espacio sin intercambiar su orden. El clic breve sigue abriendo la ficha. Los ajustes se guardan con la familia y se pueden deshacer; el botón ↺ restablece posiciones y ordenación gráfica. El botón ⇄ activa el modo «Reordenar horizontalmente»: arrastra cualquier individuo a otra posición dentro de su misma generación, aunque atraviese fratrías o donantes. Las parejas y gemelos se trasladan como unidades, sin cambiar filiaciones ni orden de nacimiento registrado; vuelve a pulsarlo para recuperar el arrastre normal. El QC puede avisar si se modifica el orden de nacimiento representado."},
    {title:"Control de calidad en directo (QC)",text:"El piloto luminoso único de QC cambia automáticamente de color al editar: rojo para errores, ámbar para avisos, azul para información, verde sin incidencias y gris para pedigree vacío o pendiente de comprobar. Una pequeña marca violeta indica incidencias gráficas. Pulse el piloto o el resumen de QC para consultar los detalles; el panel permanece cerrado por defecto. El QC no modifica el árbol ni equivale a revisión clínica."},
    {title:"Guardar y exportar",text:"Puede guardar casos, importar/exportar JSON y PED, exportar SVG/PNG y generar un PDF clínico desde el navegador."}
  ],
  symbolGroups: [
    {
      id:"individuals",
      title:"Símbolos de individuos",
      items:[
        {visual:"male",title:"Hombre / niño",standard:"NSGC/Bennett",text:"Cuadrado. En la revisión de 2022/2025 la forma representa la identidad de género. El sexo asignado al nacimiento se registra por separado."},
        {visual:"female",title:"Mujer / niña",standard:"NSGC/Bennett",text:"Círculo. El sexo asignado al nacimiento se documenta de forma independiente cuando es relevante."},
        {visual:"diamond",title:"Género diverso / no especificado",standard:"NSGC/Bennett 2022/2025",text:"Rombo. Se utiliza cuando el género no se conoce, no es relevante o no se representa como hombre/mujer. PedigrAPP permite además registrar AMAB, AFAB o UAAB."},
        {visual:"affected",title:"Afectado",standard:"NSGC/Bennett",text:"El relleno identifica afectación clínica. Cuando existen condiciones definidas, el estado se representa por condición y se explica en la leyenda."},
        {visual:"deceased",title:"Fallecido",standard:"NSGC/Bennett",text:"Una línea diagonal atraviesa el símbolo. Se evita la cruz para no confundirla con otras anotaciones."},
        {visual:"consultand",title:"Consultante",standard:"NSGC/Bennett",text:"Flecha hacia el individuo que solicita o recibe el asesoramiento o estudio genético. PedigrAPP permite más de un consultante."},
        {visual:"proband",title:"Probando",standard:"NSGC/Bennett",text:"Flecha acompañada de «P». PedigrAPP mantiene un único probando activo en el pedigree."},
        {visual:"family_unknown",title:"Historia familiar no disponible/desconocida",standard:"NSGC/Bennett",text:"Signo «?» asociado al individuo. Indica que no se dispone de información suficiente sobre su historia familiar."},
        {visual:"multiple3",title:"Varios individuos, número conocido",standard:"NSGC/Bennett",text:"El número se escribe dentro del símbolo. Los individuos afectados que deban distinguirse no deben agruparse."},
        {visual:"multiplen",title:"Varios individuos, número desconocido",standard:"NSGC/Bennett",text:"Se utiliza «n» dentro del símbolo cuando el número no se conoce o no se especifica."}
      ]
    },
    {
      id:"pregnancy",
      title:"Gestación y pérdidas gestacionales",
      items:[
        {visual:"fetus",title:"Feto / embarazo",standard:"PedigrAPP + Bennett",text:"PedigrAPP usa un símbolo específico con «P» y permite indicar sexo fetal y edad gestacional."},
        {visual:"stillbirth",title:"Mortinato (SB)",standard:"NSGC/Bennett",text:"Símbolo de individuo fallecido asociado a una gestación; puede anotarse la edad gestacional."},
        {visual:"sab",title:"Aborto espontáneo (SAB)",standard:"NSGC/Bennett",text:"Triángulo para una gestación no llevada a término, con etiqueta SAB."},
        {visual:"top",title:"Interrupción del embarazo (TOP)",standard:"NSGC/Bennett",text:"Triángulo para interrupción del embarazo, con etiqueta TOP."},
        {visual:"ect",title:"Embarazo ectópico (ECT)",standard:"Bennett 2008 + corrección 2025",text:"Triángulo con la marca correspondiente a ECT. La corrección de 2025 restituye la barra oblicua omitida por error en la figura de 2022."}
      ]
    },
    {
      id:"conditions",
      title:"Condiciones, afectación y portadores",
      items:[
        {visual:"two_conditions",title:"Una o dos condiciones",standard:"PedigrAPP / basado en Bennett",text:"Con una o dos condiciones PedigrAPP utiliza divisiones simples del símbolo. Cada condición se identifica en la leyenda por su color/patrón."},
        {visual:"multi_conditions",title:"Tres o más condiciones",standard:"PedigrAPP / Bennett permite partición",text:"Con tres o más condiciones PedigrAPP reserva sectores radiales en orden estable, desde las 12 en sentido horario. Un sector puede quedar vacío si la persona no presenta esa condición."},
        {visual:"carrier",title:"Portador",standard:"Bennett 2022",text:"PedigrAPP representa el estado de portador mediante patrón/textura por condición y no mediante el antiguo punto central, desaconsejado como marca universal de portador en la revisión de 2022."},
        {visual:"documented",title:"Evaluación documentada",standard:"Convención PedigrAPP",text:"La aplicación puede marcar que el estado respecto a una condición dispone de evaluación documentada. Es una anotación clínica de la aplicación."}
      ]
    },
    {
      id:"reproduction",
      title:"Reproducción asistida y gestación",
      items:[
        {visual:"donor",title:"Donante de gametos (D)",standard:"Bennett / corrección 2025",text:"La letra «D» identifica a una persona donante de gametos cuando corresponde. PedigrAPP diferencia donación de esperma y de óvulos según la relación con el resultado."},
        {visual:"gestational",title:"Gestante / gestational carrier (G)",standard:"Corrección 2025",text:"La letra «G» identifica a quien lleva una gestación procedente de un embrión preimplantacional sin aportar material genético al embrión."},
        {visual:"surrogate",title:"Surrogate: donante de óvulos y gestante",standard:"Corrección 2025",text:"En sentido estricto aporta el óvulo y lleva la gestación. PedigrAPP la representa como donante «D» con la gestación resultante directamente conectada; no utiliza una «S» específica."}
      ]
    }
  ],
  relationships:[
    {visual:"union",title:"Pareja / relación",standard:"NSGC/Bennett",text:"Línea horizontal entre dos individuos cuando pertenecen a la misma generación."},
    {visual:"ended_union",title:"Relación finalizada",standard:"NSGC/Bennett",text:"La interrupción «//» indica que la relación ya no existe. PedigrAPP no distingue gráficamente separación y divorcio."},
    {visual:"consanguinity",title:"Consanguinidad",standard:"NSGC/Bennett",text:"Doble línea entre los miembros de la pareja. Si el grado no resulta obvio, puede indicarse textualmente."},
    {visual:"parentage",title:"Filiación biológica",standard:"NSGC/Bennett",text:"Línea de descendencia continua desde la pareja o progenitor hacia la fratría o el individuo."},
    {visual:"sibship",title:"Fratría",standard:"NSGC/Bennett",text:"Los hermanos comparten una línea horizontal. La aplicación intenta mantener el orden de nacimiento de izquierda a derecha."},
    {visual:"twins",title:"Gemelos",standard:"NSGC/Bennett",text:"Las líneas parten de un punto común. La línea horizontal entre ambos indica monocigosis; sin ella se representan como dicigóticos o zigosidad no especificada según el caso."},
    {visual:"triplets",title:"Trillizos / múltiples",standard:"NSGC/Bennett",text:"Tres o más ramas parten de un mismo punto. PedigrAPP contempla representación tricigótica y zigosidad cuando se conoce."},
    {visual:"adoption_in",title:"Adoptado/a en la familia",standard:"NSGC/Bennett",text:"El individuo aparece entre corchetes. La filiación adoptiva se dibuja discontinua; la biológica, si se representa, permanece continua."},
    {visual:"adoption_out",title:"Dado/a en adopción",standard:"NSGC/Bennett",text:"El individuo aparece entre corchetes y conserva la filiación biológica continua con su familia de origen."},
    {visual:"intergenerational",title:"Pareja entre generaciones diferentes",standard:"Convención PedigrAPP",text:"PedigrAPP conserva ambas generaciones y une a la pareja mediante una diagonal directa, evitando desplazar el resto del árbol."},
    {visual:"multiple_unions",title:"Múltiples uniones",standard:"Convención de layout PedigrAPP",text:"Las parejas múltiples se tratan como bloques para reducir cruces, procurando conservar fratrías y familias de origen como bloques coherentes."},
    {visual:"no_children",title:"Sin descendencia",standard:"NSGC/Bennett",text:"Marca bajo el individuo o la unión cuando no hay descendencia por elección o por motivo desconocido. Puede añadirse el motivo."},
    {visual:"infertility",title:"Infertilidad",standard:"NSGC/Bennett",text:"Marca de no descendencia acompañada de una segunda barra; PedigrAPP permite registrar la razón cuando se conoce."}
  ],
  layoutRules:[
    "Las generaciones se numeran con números romanos (I, II, III…). Los individuos se numeran dentro de cada generación cuando está activa la opción de numeración.",
    "Si se añaden progenitores a un individuo que ya está en la Generación I, PedigrAPP inserta una nueva Generación I para esos progenitores y desplaza una generación hacia abajo todo el pedigree existente, conservando la estructura relativa del árbol.",
    "Los hermanos se intentan ordenar de izquierda a derecha por orden de nacimiento/gestación.",
    "Cuando es posible y no crea cruces adicionales, se favorece la disposición hombre a la izquierda y mujer a la derecha en una pareja.",
    "Las uniones múltiples se organizan procurando conservar como bloques las fratrías y las familias de origen.",
    "Los cruces inevitables pueden representarse con un pequeño puente visual para indicar que las líneas se cruzan sin relación.",
    "Los ajustes manuales de generación o posición deben utilizarse como excepción cuando el layout automático no puede expresar adecuadamente un pedigree complejo."
  ],
  tooltip:[
    "Pulse una persona para abrir su tarjeta contextual. El tooltip no se abre por simple paso del ratón.",
    "Los campos rápidos permiten modificar nombre/alias, información breve y datos auxiliares según el tipo de registro.",
    "Los iconos inferiores permiten editar, cambiar género/sexo, marcar fallecido, probando, consultante y afectación simple, además de otras acciones contextuales.",
    "El botón destacado «Introducir información clínica y genética» selecciona al individuo y lleva a la sección clínica.",
    "La sección «Información clínica y genética» está disponible para individuos, fetos, mortinatos, SAB, TOP, ECT, donantes y gestantes. Se abre como un panel lateral superpuesto desde la derecha, manteniendo visible el pedigree y sin desplazar la página. La cabecera muestra permanentemente el registro seleccionado y permite avanzar al registro anterior o siguiente siguiendo el orden visual del árbol (generación y posición izquierda→derecha). El tooltip del pedigree se organiza como una ficha operativa: identidad y edición rápida, estado, acceso clínico, atajos para añadir familiares, resumen clínico, opciones avanzadas y, al final, Editar/Eliminar. Cuando la zona superior de acciones deja de estar visible al hacer scroll, aparece una barra compacta fija con Deshacer, Rehacer, Guardar y un acceso para volver al árbol. En la zona de gestión, Añadir individuo, Relaciones avanzadas y Listados se comportan como un acordeón: abrir una cierra las otras. Atajos de teclado: Ctrl/Cmd+S guarda; Ctrl/Cmd+Z deshace; Ctrl/Cmd+Y o Ctrl/Cmd+Shift+Z rehace; F enfoca el buscador; +/− cambia el zoom; Esc cierra primero el panel clínico o el tooltip y, después, el modo foco. Las confirmaciones de acciones correctas se muestran como avisos temporales en la esquina inferior derecha, mientras que los errores permanecen visibles en la zona de mensajes. El botón de revisión alterna el estado general del caso: permite marcar el pedigree como revisado o cancelar posteriormente esa revisión. El estado queda guardado con el pedigree y, al volver a abrir un caso revisado, PedigrAPP muestra un aviso y un indicador persistente junto al ID de familia. El desplegable de casos guardados muestra además, para cada caso, si está Revisado o No revisado, y ofrece filtros rápidos «Todos», «Revisados» y «No revisados». Los registros de varios individuos permiten comentario clínico, pero no un estado único por condición al representar un grupo.",
    "El menú «⋯» contiene opciones menos frecuentes, como posición manual y relaciones con personas ya existentes."
  ],
  bibliography:[
    {
      key:"Bennett1995",
      citation:"Bennett RL, Steinhaus KA, Uhrich SB, O'Sullivan CK, Resta RG, Lochner-Doyle D, Markel DS, Vincent V, Hamanishi J; Pedigree Standardization Task Force of the National Society of Genetic Counselors. Recommendations for Standardized Human Pedigree Nomenclature. American Journal of Human Genetics. 1995;56(3):745-752.",
      role:"Documento fundacional de la nomenclatura estandarizada."
    },
    {
      key:"Bennett2008",
      citation:"Bennett RL, French KS, Resta RG, Doyle DL. Standardized Human Pedigree Nomenclature: Update and Assessment of the Recommendations of the National Society of Genetic Counselors. Journal of Genetic Counseling. 2008;17:424-433. doi:10.1007/s10897-008-9169-9.",
      doi:"https://doi.org/10.1007/s10897-008-9169-9",
      role:"Actualización y evaluación de las recomendaciones de 1995."
    },
    {
      key:"Bennett2022",
      citation:"Bennett RL, French KS, Resta RG, Austin J. Practice resource-focused revision: Standardized pedigree nomenclature update centered on sex and gender inclusivity: A practice resource of the National Society of Genetic Counselors. Journal of Genetic Counseling. 2022;31(6):1238-1248. doi:10.1002/jgc4.1621.",
      doi:"https://doi.org/10.1002/jgc4.1621",
      role:"Revisión focal sobre sexo, género, inclusividad y representación del estado de portador."
    },
    {
      key:"French2025",
      citation:"French KS, Bennett R, Resta R. Correction to: Practice resource-focused revision: Standardized pedigree nomenclature update centered on sex and gender inclusivity: A practice resource of the National Society of Genetic Counselors. Journal of Genetic Counseling. 2025;34:e2020. doi:10.1002/jgc4.2020.",
      doi:"https://doi.org/10.1002/jgc4.2020",
      role:"Corrección de conceptos y figuras de 2022, especialmente gestational carrier/surrogate y embarazo ectópico."
    }
  ],
  registeredAuthors:[
    "José Miguel Lezana Rosales",
    "Carmen Palma Milla",
    "Rubén Pérez de la Fuente"
  ],
  projectTeam:[
    "José Miguel Lezana Rosales",
    "Carmen Palma Milla",
    "Rubén Pérez de la Fuente",
    "Juan Francisco Quesada Espinosa",
    "María Teresa Sánchez Calvín",
    "Sonia Mayo de Andrés",
    "Ana Arteche López",
    "Víctor Benito García",
    "Roberto Vercher Carrascosa (Residente)",
    "Raquel Castro del Álamo",
    "Miguel Ángel Martín Casanueva"
  ],
  exploitationRightsHolder:"Fundación Investigación Biomédica Hospital 12 de Octubre",
  registry:"Safe Creative 2610197365707 (20/10/2026 08:01 UTC)",
  changelog:[
    {version:"1.0.2",text:"Actualización exclusivamente documental y de metadatos de publicación: DOI Zenodo y metadatos de citación. No cambia el funcionamiento, el QC, el layout, las exportaciones ni el esquema JSON 4.16."},
    {version:"1.0.1",text:"Actualización exclusivamente legal, documental y de metadatos: EUPL-1.2, autoría registrada, equipo clínico/científico y registro Safe Creative. No cambia el funcionamiento, el QC, el layout, las exportaciones ni el esquema JSON 4.16."},
    {version:"1.0.0",text:"Primera versión pública independiente de identidad institucional: cabecera de aplicación simplificada, PDF sin membretes ni logos corporativos y documentación preparada para distribución pública. Sin cambios en el formato JSON, el layout ni las reglas clínicas."},
    {version:"0.8.75",text:"En la ficha de una persona, «Añadir familiar» incluye los accesos directos de situación reproductiva individual: una barra para No descendencia por elección/motivo desconocido y dos para Infertilidad. Se aplican a la persona seleccionada (no a su pareja), muestran estado activo y permiten desmarcarlo. El motivo continúa editándose en Opciones avanzadas. Se excluyen donantes, gestantes, fetos, mortinatos, SAB/TOP/ECT y grupos de múltiples individuos; no se permite No descendencia si ya hay descendientes registrados. Sin cambios en JSON 4.16."},
    {version:"0.8.74",text:"Al pulsar una línea de pareja, el menú permite configurar también No descendencia por elección/motivo desconocido o Infertilidad. Se pueden indicar atribución y motivo opcional, usando exactamente los mismos datos y validaciones que Relaciones avanzadas. Deshacer/Rehacer y guardado habituales."},
    {version:"0.8.73",text:"El modo ⇄ permite reordenar libremente a cualquier individuo dentro de su generación, incluso entre fratrías y donantes. Parejas/gemelos se desplazan como bloques, sin alterar datos de nacimiento ni relaciones; orden persistente, Deshacer/Rehacer y ↺."},
    {version:"0.8.72",text:"Modo ⇄ original para reordenar hermanos dentro de su fratría (ampliado en 0.8.73)."},
    {version:"0.8.71",text:"Se elimina el desplegable para elegir pareja al añadir un feto desde un individuo con varias uniones. El atajo Feto permanece disponible, inicialmente vinculado solo a la persona seleccionada; cualquier segunda filiación se define después si corresponde. Sin cambios en la plantilla prenatal ni en el esquema de datos."},
    {version:"0.8.70",text:"Nueva plantilla rápida Padre, madre y feto (P de sexo desconocido), junto a las plantillas de hijos e hijas. Es también un caso prenatal básico; no se añade otro botón con la misma estructura ni se presupone indicación clínica, afectación o edad gestacional. La ficha permite añadir un feto de la pareja como descendencia; con varias uniones aparece un selector explícito de pareja, evitando atribuir el embarazo al progenitor equivocado. No cambia el esquema JSON ni los símbolos Bennett."},
    {version:"0.8.69",text:"Nuevos atajos en «Añadir familiar» desde la ficha: feto P de sexo desconocido por defecto, donante de esperma D y donante de óvulos D, vinculados directamente al resultado elegido. El feto y el mortinato incorporan cambio rápido de sexo (desconocido/masculino/femenino). En el formulario nuevo, la donante de óvulos comienza con género mujer y sexo asignado al nacimiento femenino, ambos editables. No se añade pareja ficticia con los donantes."},
    {version:"0.8.68",text:"Representación reproductiva: donantes de esperma, óvulos y gestantes externas se insertan junto a la pareja receptora cuando esta puede determinarse, abriendo espacio entre hermanos en vez de relegarlos al extremo de la fratría. Doble donación + G se trata como bloque contiguo y el embarazo sigue bajo quien lo gesta. Si no hay progenitores receptores identificables se conserva la distribución anterior. Sin nuevos vínculos biológicos ni cambios en el JSON."},
    {version:"0.8.67",text:"Arrastre horizontal de individuos con ratón: conserva el clic de la ficha, recalcula conexiones y separaciones de la fila durante el gesto, persiste los desplazamientos en JSON 4.14 y admite Deshacer/Rehacer. El botón ↺ restablece solo los ajustes horizontales. La generación y el orden genealógico no se cambian mediante el arrastre."},
    {version:"0.8.66",text:"Filiación intencional independiente: en Opciones avanzadas del descendiente o embarazo pueden seleccionarse hasta dos progenitores intencionales, sin añadir líneas de filiación genética. Una anotación automática usa sus números genealógicos vigentes en SVG, PNG y PDF. La selección no se infiere de las parejas ni de los donantes. Nuevo campo opcional intended_parent_uids (JSON 4.13). Convención de documentación PedigrAPP, no símbolo estandarizado Bennett."},
    {version:"0.8.65",text:"T25: en uniones múltiples, el eje de descendencia de la pareja enrutada se elige según la posición de sus propios hijos y dentro de un corredor libre. Evita que la tercera unión comparta el eje con la segunda y confunda las fratrías. Sin cambios en la estructura familiar, numeración, QC o exportaciones. Dos ejemplos T25a/T25b disponibles para pruebas."},
    {version:"0.8.64",text:"Las incidencias del QC identifican a cada registro por número genealógico (I-1, II-3…) y nombre, en lugar de UID internos, incluso si la numeración del dibujo está oculta. El botón de revisión es ámbar cuando no está revisado y verde cuando sí lo está. Se evita el recorte superior de los iconos al pasar el ratón, conservando la animación."},
    {version:"0.8.63",text:"Piloto de QC de una única luz que cambia entre gris, rojo, ámbar, azul y verde según el resultado automático en directo. La columna de ID de familia gana anchura y las insignias de guardado/revisión/QC se distribuyen en líneas sin solaparse; indicación y comentarios empiezan más a la derecha. El panel de incidencias continúa cerrado por defecto."},
    {version:"0.8.62",text:"QC en directo, recalculado automáticamente al editar personas, relaciones, condiciones y datos de familia; semáforo de cuatro luces (rojo errores, ámbar avisos, azul información, verde sin incidencias) y señal púrpura para incidencias gráficas. El panel de detalles solo se abre cuando se pulsa el semáforo o su resumen. La revisión profesional sigue independiente."},
    {version:"0.8.61",text:"QC ampliado por seis ámbitos: estructura, familia, Bennett/NSGC, clínica/genética, documentación y representación gráfica (incluye geometría SVG). Indicador compacto del QC. Se conserva la huella de contenido de las nuevas revisiones para detectar cambios posteriores, sin confundirlo con una firma electrónica o la validación clínica."},
    {version:"0.8.60",text:"Botón Validar pedigree: QC independiente de la revisión profesional, con errores, advertencias e informaciones vinculadas a individuos y referencias Bennett/NSGC; la validación no modifica ni guarda los datos."},
    {version:"0.8.59",text:"Marcar o cancelar la revisión guarda automáticamente el caso; las altas rápidas desplazan la página al pedigree y lo centran; Casos guardados incorpora filtros rápidos Todos/Revisados/No revisados."},
    {version:"0.8.58",text:"El mismo botón permite marcar o cancelar la revisión general; el selector de casos muestra Revisado/No revisado y los atajos de creación se compactan para mantenerse en una única línea."},
    {version:"0.8.57",text:"Las tres tarjetas de gestión parten plegadas, se corrige la alineación checkbox/símbolo, las altas rápidas centran el árbol, la revisión pasa a ser general y persistente, y los iconos de acciones se mantienen en una sola línea."},
    {version:"0.8.56",text:"Las confirmaciones normales pasan a mostrarse como toasts y se añade un modo de revisión clínica secuencial con progreso y marcas temporales de registros revisados."},
    {version:"0.8.55",text:"Añadir individuo, Relaciones avanzadas y Listados funcionan como un acordeón; se incorporan Ctrl/Cmd+S, F, +/− y Esc como atajos globales, manteniendo Ctrl/Cmd+Z/Y para deshacer/rehacer."},
    {version:"0.8.54",text:"Al desplazarse por la página aparece una barra compacta con Deshacer, Rehacer, Guardar y Volver al árbol; desaparece al regresar a la zona de acciones principal."},
    {version:"0.8.53",text:"El tooltip se reorganiza como ficha operativa con bloques separados de Estado, Información clínica, Añadir familiar, Resumen clínico, Más opciones y Editar/Eliminar."},
    {version:"0.8.52",text:"El panel clínico muestra de forma permanente el registro seleccionado e incorpora navegación Anterior/Siguiente según el orden visual del pedigree."},
    {version:"0.8.51",text:"Información clínica y genética pasa a un panel lateral superpuesto desde la derecha; el pedigree permanece visible y la página no cambia de posición al abrirlo o cerrarlo."},
    {version:"0.8.50",text:"Información clínica y genética disponible para todos los registros del pedigree; SAB, TOP y ECT incorporan además estados por condición y representación clínica."},
    {version:"0.8.49",text:"Las acciones principales salen de la cabecera y pasan a una tarjeta situada a la derecha de los atajos rápidos; la tarjeta de altas rápidas elimina su título visible."},
    {version:"0.8.48",text:"Al añadir progenitores a un individuo de Generación I se inserta una nueva Generación I y todo el pedigree previo baja una generación de forma global."},
    {version:"0.8.47",text:"Se centran los estados rápidos de Añadir individuo y se añaden atajos para Hombre/Mujer consultante y para pareja con un hijo o una hija."},
    {version:"0.8.46",text:"El formulario de Añadir individuo vuelve a distribuir sus campos principales en dos filas y el botón de añadir queda centrado."},
    {version:"0.8.45",text:"Añadir individuo, Relaciones avanzadas y Listados se sitúan al mismo nivel en escritorio; los desplegables se redistribuyen para su nuevo ancho."},
    {version:"0.8.44",text:"Usabilidad: aplicación al 90% de ancho, Condiciones bajo los datos de familia, atajos centrados en tarjeta propia sobre el visor y formulario de individuo en una sola línea."},
    {version:"0.8.43",text:"Interfaz a ancho completo: desaparece la barra lateral permanente; el formulario de alta pasa debajo de la leyenda y encima de Condiciones del pedigree."},
    {version:"0.8.41",text:"Atajo de Consultante en el tooltip (flecha + C)."},
    {version:"0.8.40",text:"Tooltip abierto por clic y acceso explícito a Información clínica y genética."},
    {version:"0.8.35",text:"Parejas intergeneracionales mediante diagonal directa."},
    {version:"0.8.24",text:"Menú de relación con estado finalizado y consanguinidad combinables."},
    {version:"0.8.17",text:"Representación de surrogate y gestational carrier ajustada a la corrección de 2025."},
    {version:"0.8.10",text:"Semántica de adopción: adoptado en la familia / dado en adopción."}
  ]
};