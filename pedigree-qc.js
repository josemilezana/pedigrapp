/*
 * PedigrAPP 0.8.61 - QC v2 del pedigree.
 * Comprobaciones puras, sin modificar familia, layout, guardado ni revisión clínica.
 * Fuentes: Bennett et al. 1995, 2008, 2022 y corrección de 2025.
 * Las reglas de integridad de software se identifican como tales.
 */
(function(root, factory) {
  const qc = factory();
  if (typeof module === 'object' && module.exports) module.exports = qc;
  if (root) root.PedigrAPPQC = qc;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const CATEGORIES = {
    structure:'Integridad estructural', family:'Coherencia familiar',
    bennett:'Nomenclatura Bennett', clinical:'Coherencia clínica/genética',
    documentation:'Documentación', layout:'Representación gráfica'
  };
  function categoryForCode(code) {
    if (/^(LAYOUT_|SIBLING_BIRTH_ORDER)/.test(code)) return 'layout';
    if (/^(DOC_|INDEX_|INDICATION_|GEST_AGE|CONSANGUINITY_DEGREE|CONDITION_INHERITANCE|DECEASED_AGE|AFFECTED_AGE|DONOR_FAMILY_HISTORY)/.test(code)) return 'documentation';
    if (/^(CLIN_|COND_|PROBAND_|MULTIPLE_AFFECTED)/.test(code)) return 'clinical';
    if (/^(ART_|G_TARGET_|SURROGATE_|MULTIPLE_CARRIERS|TWIN_|ADOPTION_|NO_CHILDREN_|INFERTILITY_|SIBLING_PARENTAGE|BIO_PARENTS|MULTI_BIO_LINK)/.test(code)) return 'family';
    if (/^(MULTIPLE_COUNT|GESTATION_|PREGNANCY_)/.test(code)) return 'bennett';
    return 'structure';
  }
  const SRC = {
    integrity: 'Integridad de datos · PedigrAPP',
    relations: 'Bennett et al., 2022, figura 3; corrección de 2025, figura 3',
    conditions: 'Bennett et al., 2022, figura 2; corrección de 2025, figura 2',
    pregnancy: 'Corrección de 2025, figura 4',
    art: 'Corrección de 2025, figura 5',
    clinical: 'Corrección de 2025, figuras 1 y 2'
  };
  // Internationalization is presentation-only; Node QC tests retain Spanish results.
  const qci = (key, params, spanish) => {
    const api = typeof globalThis !== 'undefined' ? globalThis.PedigrAPPi18n : null;
    return api && api.ready() && api.current() === 'en' ? api.t(key, params) : spanish;
  };
  const levels = {error: 0, warning: 1, info: 2};
  const str = x => x == null ? '' : String(x).trim();
  const unique = values => [...new Set(values)];
  const array = x => Array.isArray(x) ? x : [];
  // Compatible con la clave singular anterior y con la plural de donantes
  // de gametos; una donante que además gesta sigue vinculada a 1 embarazo.
  const donationIds = p => unique(array(p.donation_targets).map(str)
    .concat(str(p.donation_target)).filter(Boolean));
  const type = p => (p && p.record_type) || 'person';
  const key = ids => unique(ids).sort().join('\u0001');

  function analyze(data, options = {}) {
    const issues = [];
    const people = array(data && data.people);
    const relationships = array(data && data.relationships);
    const conditions = array(data && data.conditions);
    const pMap = new Map();
    const seen = new Set();
    const add = (severity, code, title, detail, source, uids = []) => {
      issues.push({severity, category:categoryForCode(code), code, title:qci("qc.issue."+code+".title",null,title), detail, source, uids: unique(uids.filter(Boolean))});
    };
    const label = uid => {
      // La interfaz pasa etiquetas I-1 - Nombre calculadas a partir del layout.
      // Sin layout (pruebas o datos inválidos), se usa la referencia interna.
      const display = options.displayLabels instanceof Map
        ? str(options.displayLabels.get(uid)) : "";
      if (display) return display;
      const p = pMap.get(uid);
      return p && str(p.label) ? `${str(p.label)} (${uid})` : uid;
    };
    const validIds = ids => array(ids).map(str).filter(Boolean);

    // Texto contextual del QC: no interpolar términos de parentesco
    // españoles dentro de los mensajes ingleses. Solo cambia la presentación.
    const contextLabel = kind => qci('qc.context.' + kind, null, {
      union:'Unión', parentage:'Filiación', parents:'Progenitores',
      descendants:'Descendientes', multiple:'Gestación múltiple', sibship:'Fratría'
    }[kind]);
    const unspecifiedType = () => qci('qc.value.unspecifiedType',null,'(sin tipo)');
    const unspecifiedId = () => qci('qc.value.unspecifiedId',null,'(sin ID)');
    const joinLabels = uids => uids.map(label).join(qci('qc.list.and',null,' y '));
    const multipleTypeLabel = z => qci('qc.multiple.'+z,null,z);

    if (!people.length) {
      add('info', 'EMPTY', 'Pedigree vacío', qci("qc.issue.EMPTY.detail", null, 'Añade individuos antes de efectuar un control de calidad.'), SRC.integrity);
      return {issues, counts: {error: 0, warning: 0, info: 1}, status: 'empty'};
    }

    for (const p of people) {
      const uid = str(p && p.uid);
      if (!uid) {
        add('error', 'UID_EMPTY', 'Registro sin identificador', qci("qc.issue.UID_EMPTY.detail", null, 'Cada registro necesita un UID interno no vacío.'), SRC.integrity);
        continue;
      }
      if (seen.has(uid)) add('error', 'UID_DUP', 'Identificador duplicado', qci("qc.issue.UID_DUP.detail", {p0:(uid)}, `El UID ${uid} corresponde a más de un registro.`), SRC.integrity, [uid]);
      seen.add(uid);
      pMap.set(uid, p);
    }

    const seenRelations = new Set();
    const biological = new Map();
    const biologicalParentageGroups = new Map();
    const bioGraph = new Map();
    const siblingGroups = [];
    const twinGroups = [];
    const adoptedChildren = new Set();
    const childrenOf = new Map();
    const unionRelations = [];
    const reproductiveTargets = new Map();

    const knownMembers = (uids, desc) => {
      for (const uid of uids) if (!pMap.has(uid)) {
        add('error', 'MISSING_REF', 'Referencia inexistente', qci("qc.issue.MISSING_REF.detail", {p0:(desc), p1:(uid)}, `${desc}: el registro ${uid} no existe en el pedigree.`), SRC.integrity, [uid]);
      }
    };
    const checkRepeated = (uids, desc) => {
      if (uids.length !== unique(uids).length) {
        add('error', 'REPEATED_MEMBER', 'Miembro repetido en una relación', qci("qc.issue.REPEATED_MEMBER.detail", {p0:(desc)}, `${desc}: un mismo UID figura más de una vez.`), SRC.integrity, uids);
      }
    };

    for (const r of relationships) {
      const t = str(r && r.type);
      if (t === 'union') {
        unionRelations.push(r);
        const ids = validIds(r.people);
        knownMembers(ids, contextLabel('union'));
        checkRepeated(ids, contextLabel('union'));
        if (ids.length !== 2 || unique(ids).length !== 2) {
          add('error', 'UNION_MEMBERS', 'Unión incompleta o consigo mismo', qci("qc.issue.UNION_MEMBERS.detail", null, 'Una línea de pareja debe unir exactamente a dos individuos distintos.'), SRC.integrity, ids);
          continue;
        }
        const signature = 'union:' + key(ids);
        if (seenRelations.has(signature)) {
          add('warning', 'DUP_UNION', 'Unión duplicada', qci("qc.issue.DUP_UNION.detail", {p0:(label(ids[0])), p1:(label(ids[1]))}, `Hay más de una unión entre ${label(ids[0])} y ${label(ids[1])}. Revisa si procede diferenciar la relación.`), SRC.integrity, ids);
        }
        seenRelations.add(signature);
        if (r.consanguineous && !str(r.consanguinity_degree)) {
          add('info', 'CONSANGUINITY_DEGREE', 'Consanguinidad: comprobar grado', qci("qc.issue.CONSANGUINITY_DEGREE.detail", {p0:(label(ids[0])), p1:(label(ids[1]))}, `Entre ${label(ids[0])} y ${label(ids[1])}, anota el grado de parentesco cuando no sea evidente en el árbol.`), SRC.relations, ids);
        }
      } else if (t === 'parentage') {
        const parents = validIds(r.parents);
        const children = validIds(r.children);
        knownMembers(parents.concat(children), contextLabel('parentage'));
        checkRepeated(parents, contextLabel('parents'));
        checkRepeated(children, contextLabel('descendants'));
        if (!parents.length || !children.length) {
          add('warning', 'EMPTY_PARENTAGE', 'Filiación incompleta', qci("qc.issue.EMPTY_PARENTAGE.detail", null, 'Una relación de filiación necesita al menos un progenitor y un descendiente.'), SRC.integrity, parents.concat(children));
        }
        const descent = r.descent_type === 'adoptive' ? 'adoptive' : 'biological';
        if (descent === 'adoptive') for (const child of children) adoptedChildren.add(child);
        for (const parent of parents) {
          if (!childrenOf.has(parent)) childrenOf.set(parent, new Set());
          for (const child of children) childrenOf.get(parent).add(child);
        }
        const signature = 'parentage:' + descent + ':' + key(parents) + ':' + key(children);
        if (seenRelations.has(signature)) add('warning', 'DUP_PARENTAGE', 'Filiación duplicada', qci("qc.issue.DUP_PARENTAGE.detail", null, 'Esta relación de filiación está registrada más de una vez.'), SRC.integrity, parents.concat(children));
        seenRelations.add(signature);
        for (const child of children) {
          if (parents.includes(child)) add('error', 'SELF_PARENT', 'Filiación consigo mismo', qci("qc.issue.SELF_PARENT.detail", {p0:(label(child))}, `${label(child)} figura como su propio progenitor.`), SRC.integrity, [child]);
          if (descent === 'biological') {
            if (!biological.has(child)) biological.set(child, new Set());
            for (const parent of parents) biological.get(child).add(parent);
            if (!biologicalParentageGroups.has(child)) biologicalParentageGroups.set(child, new Set());
            biologicalParentageGroups.get(child).add(key(parents));
            for (const parent of parents) {
              if (!bioGraph.has(parent)) bioGraph.set(parent, new Set());
              bioGraph.get(parent).add(child);
            }
          }
        }
      } else if (t === 'sibling' || t === 'twin') {
        const ids = validIds(r.members);
        knownMembers(ids, t === 'twin' ? contextLabel('multiple') : contextLabel('sibship'));
        checkRepeated(ids, t === 'twin' ? contextLabel('multiple') : contextLabel('sibship'));
        if (ids.length < 2) add('warning', 'SMALL_GROUP', 'Relación con menos de dos miembros', qci("qc.issue.SMALL_GROUP.detail", null, 'Una fratría o gestación múltiple necesita al menos dos individuos.'), SRC.integrity, ids);
        if (t === 'sibling') siblingGroups.push(ids);
        if (t === 'twin') {
          twinGroups.push(ids);
          const z = r.zygosity || 'unknown';
          const expected = z === 'trizygotic' ? 3 : 2;
          if (ids.length !== expected || unique(ids).length !== expected) {
            add('error', 'TWIN_CARDINALITY', 'Número incorrecto en gestación múltiple', qci("qc.issue.TWIN_CARDINALITY.detail", {p0:(multipleTypeLabel(z)), p1:(expected)}, `El tipo ${z} requiere ${expected} miembros distintos en el modelo actual.`), SRC.integrity, ids);
          }
        }
        const signature = t + ':' + key(ids);
        if (seenRelations.has(signature)) add('warning', 'DUP_GROUP', 'Relación repetida', qci("qc.issue.DUP_GROUP.detail", null, 'Esta fratría o gestación múltiple aparece duplicada.'), SRC.integrity, ids);
        seenRelations.add(signature);
      } else {
        add('warning', 'UNKNOWN_RELATION', 'Tipo de relación desconocido', qci("qc.issue.UNKNOWN_RELATION.detail", {p0:(t || unspecifiedType())}, `Revisa la relación «${t || '(sin tipo)'}».`), SRC.integrity);
      }
    }

    // DFS del grafo dirigido SOLO de filiación biológica: una adopción
    // puede introducir relaciones sociales complejas y no debe confundirse.
    const colors = new Map();
    const active = [];
    const cycles = new Set();
    function visit(uid) {
      colors.set(uid, 1);
      active.push(uid);
      for (const child of bioGraph.get(uid) || []) {
        if (!pMap.has(child) || !pMap.has(uid)) continue;
        if (!colors.has(child)) visit(child);
        else if (colors.get(child) === 1) {
          const i = active.indexOf(child);
          const cycle = active.slice(i).concat(child);
          const sign = key(cycle);
          if (!cycles.has(sign)) {
            cycles.add(sign);
            add('error', 'BIO_CYCLE', 'Ciclo en la ascendencia biológica', qci("qc.issue.BIO_CYCLE.detail", {p0:(cycle.map(label).join(' → '))}, `Se ha detectado un circuito de filiación: ${cycle.map(label).join(' → ')}.`), SRC.integrity, cycle);
          }
        }
      }
      active.pop();
      colors.set(uid, 2);
    }
    for (const uid of pMap.keys()) if (!colors.has(uid)) visit(uid);

    for (const [child, parents] of biological) {
      if (parents.size > 2) {
        add('warning', 'BIO_PARENTS', 'Más de dos progenitores en filiaciones biológicas', qci("qc.issue.BIO_PARENTS.detail", {p0:(label(child)), p1:(parents.size)}, `${label(child)} tiene ${parents.size} progenitores registrados como biológicos. Revisa si hay filiaciones sociales o donación de gametos que deban representarse de otra forma.`), SRC.relations, [child, ...parents]);
      }
      if ((biologicalParentageGroups.get(child) || new Set()).size > 1) {
        add('warning', 'MULTI_BIO_LINK', 'Filiaciones biológicas separadas', qci("qc.issue.MULTI_BIO_LINK.detail", {p0:(label(child))}, `${label(child)} aparece en varias relaciones de filiación biológica con conjuntos diferentes de progenitores. Revisa la representación en el contexto de reproducción asistida.`), SRC.integrity, [child, ...parents]);
      }
    }

    // Entre gemelos con filiación conocida, distintas parejas de progenitores
    // merecen revisión, pero no se consideran automáticamente imposibles.
    for (const ids of twinGroups) {
      const known = ids.filter(uid => biological.has(uid));
      if (known.length > 1 && unique(known.map(uid => key([...biological.get(uid)]))).length > 1) {
        add('warning', 'TWIN_PARENTS', 'Filiación desigual entre miembros de gestación múltiple', qci("qc.issue.TWIN_PARENTS.detail", null, 'Los miembros de esta gestación múltiple tienen filiaciones biológicas diferentes o incompletas. Confirma que es deliberado.'), SRC.relations, ids);
      }
    }

    // Fratrías son relaciones familiares; no suponer que todos sus miembros
    // comparten dos progenitores (adopciones, medio hermanos, etc.).
    for (const ids of siblingGroups) {
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const a = biological.get(ids[i]), b = biological.get(ids[j]);
        if (a && b && a.size && b.size && ![...a].some(parent => b.has(parent))) {
          add('warning', 'SIBLING_PARENTAGE', 'Hermanos sin ascendencia biológica compartida',
            qci("qc.issue.SIBLING_PARENTAGE.detail", {p0:(label(ids[i])), p1:(label(ids[j]))}, `${label(ids[i])} y ${label(ids[j])} están vinculados como hermanos, pero no comparten los progenitores biológicos registrados. Puede ser correcto si se trata de hermanastros o adopción.`), SRC.relations, [ids[i],ids[j]]);
        }
      }
    }
    for (const r of unionRelations) {
      const ids = validIds(r.people);
      if (ids.length !== 2) continue;
      const sharedChildren = array(relationships).filter(link => link.type === 'parentage' &&
        ids.every(uid => array(link.parents).includes(uid))).flatMap(link => array(link.children));
      if (str(r.reproductive_status) === 'no_children' && sharedChildren.length) {
        add('warning', 'NO_CHILDREN_UNION', 'Pareja sin descendencia con hijos registrados',
          qci("qc.issue.NO_CHILDREN_UNION.detail", {p0:(ids.map(label).join('–'))}, `La pareja ${ids.map(label).join('–')} consta como «sin descendencia» y tiene descendencia vinculada.`), SRC.relations, ids.concat(sharedChildren));
      }
      if (r.reproductive_attribution && r.reproductive_attribution !== 'union' && !ids.includes(r.reproductive_attribution)) {
        add('error', 'UNION_REPRO_ATTRIBUTION', 'Atribución reproductiva incorrecta',
          qci("qc.issue.UNION_REPRO_ATTRIBUTION.detail", null, 'La situación reproductiva de la unión se atribuye a alguien ajeno a la pareja.'), SRC.integrity, ids.concat(r.reproductive_attribution));
      }
    }

    for (const p of people) {
      const uid = str(p && p.uid);
      const rt = type(p);
      const donorTargets = (rt === 'sperm_donor' || rt === 'ovum_donor')
        ? donationIds(p) : [];
      const target = rt === 'gestational_carrier'
        ? str(p.gestation_target)
        : (rt === 'ovum_donor' && p.surrogate === true)
          ? (donorTargets[0] || '') : '';
      const targetIds = rt === 'gestational_carrier'
        ? (target ? [target] : []) : donorTargets;
      if (rt === 'sperm_donor' || rt === 'ovum_donor' || rt === 'gestational_carrier') {
        if (!targetIds.length) add('error', 'ART_TARGET_EMPTY', 'Donante o gestante sin resultado vinculado', qci("qc.issue.ART_TARGET_EMPTY.detail", {p0:(label(uid))}, `${label(uid)} necesita un registro de descendencia o embarazo al que vincularse.`), SRC.art, [uid]);
        for (const dest of targetIds) {
          if (!pMap.has(dest)) add('error', 'ART_TARGET_MISSING', 'Resultado reproductivo inexistente', qci("qc.issue.ART_TARGET_MISSING.detail", {p0:(label(uid)), p1:(dest)}, `${label(uid)} apunta a ${dest}, que no existe.`), SRC.integrity, [uid, dest]);
          if (dest === uid) add('error', 'ART_SELF_TARGET', 'Autorreferencia reproductiva', qci("qc.issue.ART_SELF_TARGET.detail", {p0:(label(uid))}, `${label(uid)} no puede señalarse como resultado de su propia donación o gestación.`), SRC.integrity, [uid]);
        }
        if (rt === 'gestational_carrier' && target && pMap.has(target) && !['fetus','stillbirth','sab','top','ect'].includes(type(pMap.get(target)))) {
          add('error', 'G_TARGET_TYPE', 'Gestante G vinculada a un registro incorrecto', qci("qc.issue.G_TARGET_TYPE.detail", {p0:(label(target))}, `Una gestante G debe vincularse al embarazo o pérdida gestacional que lleva. Comprueba ${label(target)}.`), SRC.art, [uid, target]);
        }
        if (rt === 'ovum_donor' && p.surrogate === true && target && pMap.has(target) && !['fetus','stillbirth','sab','top','ect'].includes(type(pMap.get(target)))) {
          add('warning', 'SURROGATE_TARGET', 'Surrogate vinculada a un resultado no gestacional', qci("qc.issue.SURROGATE_TARGET.detail", null, 'La donante de óvulos que además gesta debería vincularse a la gestación representada, con la convención D de 2025.'), SRC.art, [uid, target]);
        }
      }
      if (rt === 'gestational_carrier' && p.surrogate === true) {
        add('warning', 'ART_G_SURROGATE', 'Gestante G y surrogate no equivalentes',
          qci("qc.issue.ART_G_SURROGATE.detail", {p0:(label(uid))}, `${label(uid)} figura como gestante G y como surrogate/donante. La convención de 2025 distingue la gestante sin aporte de óvulo (G) de quien aporta óvulo y gesta (D).`), SRC.art, [uid]);
      }
      if (rt === 'ovum_donor' && p.surrogate === true && !target) {
        add('warning', 'ART_SURROGATE_NO_PREGNANCY', 'Surrogate sin embarazo vinculado',
          qci("qc.issue.ART_SURROGATE_NO_PREGNANCY.detail", {p0:(label(uid))}, `${label(uid)} consta como donante y gestante, pero carece de embarazo vinculado.`), SRC.art, [uid]);
      }
      if (['ovum_donor','sperm_donor','gestational_carrier'].includes(rt) &&
          !str(p.notes) && !str(p.brief_info) && !p.family_history_unknown) {
        add('info', 'DONOR_FAMILY_HISTORY', 'Historia familiar reproductiva no documentada',
          qci("qc.issue.DONOR_FAMILY_HISTORY.detail", {p0:(label(uid))}, `${label(uid)}: conviene registrar los antecedentes familiares disponibles de donantes y gestantes; la ausencia de anotación no significa que no se hayan investigado.`), SRC.art, [uid]);
      }
      if (rt === 'person') {
        const descendants = [...(childrenOf.get(uid) || [])];
        if (p.reproductive_status === 'no_children' && descendants.length) {
          add('warning', 'NO_CHILDREN_PERSON', 'Sin descendencia y con filiación registrada',
            qci("qc.issue.NO_CHILDREN_PERSON.detail", {p0:(label(uid)), p1:(descendants.length)}, `${label(uid)} consta sin descendencia, pero aparece como progenitor/a de ${descendants.length} registro(s).`), SRC.relations, [uid,...descendants]);
        }
        if (p.reproductive_status === 'infertility' && descendants.length) {
          add('info', 'INFERTILITY_DESCENDANTS', 'Infertilidad con descendencia registrada',
            qci("qc.issue.INFERTILITY_DESCENDANTS.detail", {p0:(label(uid))}, `${label(uid)} figura con infertilidad y descendencia; puede ser correcto por reproducción asistida, historia previa o adopción. Comprueba la anotación.`), SRC.relations, [uid,...descendants]);
        }
        if (p.adoption_status === 'out' && !(biological.get(uid) || new Set()).size) {
          add('info', 'ADOPTION_ORIGIN_UNKNOWN', 'Adopción sin ascendencia biológica registrada',
            qci("qc.issue.ADOPTION_ORIGIN_UNKNOWN.detail", {p0:(label(uid))}, `${label(uid)} consta como dado/a en adopción. Si se conoce la filiación biológica, puede incorporarse.`), SRC.relations, [uid]);
        }
        if (p.deceased && (p.age === null || p.age === undefined || str(p.age) === '')) {
          add('info', 'DECEASED_AGE', 'Edad de persona fallecida no indicada',
            qci("qc.issue.DECEASED_AGE.detail", {p0:(label(uid))}, `En ${label(uid)}, registra la edad o el año de fallecimiento cuando se conozca.`), SRC.clinical, [uid]);
        }
      }
      if (p.affected && (p.age === null || p.age === undefined || str(p.age) === '') && rt === 'person') {
        add('info', 'AFFECTED_AGE', 'Edad de afectado no indicada',
          qci("qc.issue.AFFECTED_AGE.detail", {p0:(label(uid))}, `En ${label(uid)}, anota la edad o edad de inicio si está disponible y resulta relevante.`), SRC.clinical, [uid]);
      }
      if (rt === 'multiple') {
        const n = str(p.multiple_count);
        if (n !== 'n' && (!/^\d+$/.test(n) || Number(n) < 2)) add('error', 'MULTIPLE_COUNT', 'Número de individuos agrupados no válido', qci("qc.issue.MULTIPLE_COUNT.detail", {p0:(label(uid))}, `${label(uid)} requiere un número ≥ 2 o «n».`), SRC.conditions, [uid]);
        if (p.affected === true || array(p.condition_states).some(s => s.status === 'affected')) add('error', 'MULTIPLE_AFFECTED', 'Afectados agrupados en un símbolo múltiple', qci("qc.issue.MULTIPLE_AFFECTED.detail", null, 'Representa los individuos afectados por separado para conservar la información clínica.'), SRC.conditions, [uid]);
      }
      if (['fetus', 'stillbirth', 'sab', 'top', 'ect'].includes(rt) && (p.gestational_age_weeks === null || p.gestational_age_weeks === undefined || str(p.gestational_age_weeks) === '')) {
        add('warning', 'GEST_AGE', 'Edad gestacional no indicada', qci("qc.issue.GEST_AGE.detail", {p0:(label(uid))}, `En ${label(uid)}, consigna la edad gestacional si se conoce.`), SRC.pregnancy, [uid]);
      }
      if (p.proband === true) {
        const affected = p.affected === true || array(p.condition_states).some(s => s.status === 'affected');
        if (!affected) add('warning', 'PROBAND_STATUS', 'Probando sin afectación documentada', qci("qc.issue.PROBAND_STATUS.detail", {p0:(label(uid))}, `${label(uid)} está marcado como probando, pero no consta como afectado. Comprueba si corresponde «consultante» o si falta registrar la afectación.`), SRC.clinical, [uid]);
      }
    }

    const carrierByPregnancy = new Map();
    for (const p of people) {
      const target = type(p) === 'gestational_carrier' ? str(p.gestation_target)
        : (type(p) === 'ovum_donor' && p.surrogate === true) ? (donationIds(p)[0] || '') : '';
      if (!target) continue;
      if (!carrierByPregnancy.has(target)) carrierByPregnancy.set(target, []);
      carrierByPregnancy.get(target).push(str(p.uid));
    }
    for (const [target, carriers] of carrierByPregnancy) if (carriers.length > 1) {
      add('error', 'MULTIPLE_CARRIERS', 'Más de una gestante para el mismo embarazo', qci("qc.issue.MULTIPLE_CARRIERS.detail", {p0:(label(target)), p1:(carriers.length)}, `El embarazo ${label(target)} está vinculado a ${carriers.length} gestantes/surrogates.`), SRC.art, [target, ...carriers]);
    }

    // Convención documental de PedigrAPP: el vínculo intencional no
    // constituye, por sí mismo, una filiación biológica. En doble
    // donación con G externa, una línea biológica desde la pareja
    // intencional podría transmitir información genética equivocada.
    for (const child of people) {
      const ids = unique(array(child.intended_parent_uids).map(str).filter(Boolean));
      if (!ids.length) continue;
      for (const uid of ids) {
        if (!pMap.has(uid)) {
          add('error','ART_INTENDED_REF','Progenitor intencional inexistente',
            qci("qc.issue.ART_INTENDED_REF.detail", {p0:(label(child.uid))}, `${label(child.uid)} identifica como progenitor intencional a un registro que ya no existe.`),SRC.integrity,[child.uid,uid]);
        }
      }
      const donors = people.filter(p => {
        const rt=type(p);
        return (rt === 'sperm_donor' || rt === 'ovum_donor') &&
          donationIds(p).includes(str(child.uid));
      });
      const hasSperm = donors.some(p=>type(p)==='sperm_donor');
      const hasOvum = donors.some(p=>type(p)==='ovum_donor');
      const hasG = people.some(p=>type(p)==='gestational_carrier' && str(p.gestation_target)===str(child.uid));
      if (!(hasSperm && hasOvum && hasG)) continue;
      const conflicting = ids.filter(uid => (biological.get(str(child.uid)) || new Set()).has(uid));
      if (conflicting.length) {
        add('warning','ART_INTENDED_BIOLOGICAL_LINE',
          'Filiación intencional dibujada como biológica',
          qci("qc.issue.ART_INTENDED_BIOLOGICAL_LINE.detail", {p0:(label(child.uid)), p1:(joinLabels(conflicting))}, `${label(child.uid)} tiene doble donación y gestante G externa, pero se ha conservado una filiación biológica desde ${conflicting.map(label).join(' y ')}. Revisa si corresponde eliminar esa línea y mantener solo la anotación de progenitores intencionales.`),
          SRC.art,[str(child.uid),...conflicting]);
      }
    }

    for (const child of adoptedChildren) {
      const person = pMap.get(child);
      if (person && person.adoption_status === 'out') {
        add('info', 'ADOPTION_IN_OUT', 'Doble anotación de adopción',
          qci("qc.issue.ADOPTION_IN_OUT.detail", {p0:(label(child))}, `${label(child)} figura con filiación adoptiva y con el indicador «dado en adopción». Puede ser correcto; comprueba la intención gráfica.`), SRC.relations, [child]);
      }
    }

    const cMap = new Map();
    for (const c of conditions) {
      const id = str(c && c.id);
      if (!id) add('error', 'COND_ID', 'Condición sin identificador', qci("qc.issue.COND_ID.detail", null, 'Una condición necesita un ID interno.'), SRC.integrity);
      if (id && cMap.has(id)) add('error', 'COND_DUP_ID', 'ID de condición duplicado', qci("qc.issue.COND_DUP_ID.detail", {p0:(id)}, `El ID de condición «${id}» está repetido.`), SRC.integrity);
      if (id) cMap.set(id, c);
      if (!str(c && c.name)) add('error', 'COND_NAME', 'Condición clínica sin nombre', qci("qc.issue.COND_NAME.detail", {p0:(id || '?')}, `La condición «${id || '?'}» necesita un nombre para interpretar su relleno en la leyenda.`), SRC.conditions);
      if (str(c && c.name) && (!str(c.inheritance) || str(c.inheritance) === 'unknown')) {
        add('info', 'CONDITION_INHERITANCE', 'Patrón de herencia no especificado',
          qci("qc.issue.CONDITION_INHERITANCE.detail", {p0:(str(c.name))}, `La condición «${str(c.name)}» no tiene un patrón de herencia establecido. No siempre se conoce.`), SRC.conditions);
      }
    }
    for (const p of people) {
      const used = new Set();
      for (const s of array(p.condition_states)) {
        const id = str(s && s.condition_id);
        if (!cMap.has(id)) add('error', 'COND_ORPHAN', 'Estado clínico sin condición definida', qci("qc.issue.COND_ORPHAN.detail", {p0:(label(p.uid)), p1:(id || unspecifiedId())}, `${label(p.uid)} tiene un estado referido a «${id || '(sin ID)'}», que no existe entre las condiciones.`), SRC.integrity, [str(p.uid)]);
        if (used.has(id)) add('error', 'COND_STATE_DUP', 'Condición repetida en un individuo', qci("qc.issue.COND_STATE_DUP.detail", {p0:(label(p.uid)), p1:(id)}, `${label(p.uid)} tiene varias asignaciones para la condición «${id}».`), SRC.integrity, [str(p.uid)]);
        used.add(id);
        if (!id || !cMap.has(id)) continue;
        const molecular = str(s.molecular_result);
        const variant = str(s.variant);
        const zygosity = str(s.zygosity);
        const status = str(s.status);
        if (variant && (!molecular || molecular === 'not_tested')) {
          add('warning', 'CLIN_VARIANT_NO_TEST', 'Variante sin resultado molecular',
            qci("qc.issue.CLIN_VARIANT_NO_TEST.detail", {p0:(label(p.uid)), p1:(cMap.get(id).name)}, `${label(p.uid)} tiene una variante consignada para «${cMap.get(id).name}», pero el estudio aparece como no realizado o no indicado.`), SRC.clinical, [str(p.uid)]);
        }
        if (zygosity && !variant && !str(s.genotype)) {
          add('warning', 'CLIN_ZYGOSITY_NO_VARIANT', 'Cigosis sin variante ni genotipo',
            qci("qc.issue.CLIN_ZYGOSITY_NO_VARIANT.detail", {p0:(label(p.uid)), p1:(cMap.get(id).name)}, `${label(p.uid)} tiene cigosis para «${cMap.get(id).name}» sin variante/genotipo asociado.`), SRC.clinical, [str(p.uid)]);
        }
        if (molecular === 'positive' && !variant && !str(s.genotype)) {
          add('info', 'CLIN_POSITIVE_NO_VARIANT', 'Resultado positivo sin descripción molecular',
            qci("qc.issue.CLIN_POSITIVE_NO_VARIANT.detail", {p0:(label(p.uid)), p1:(cMap.get(id).name)}, `${label(p.uid)} tiene resultado positivo para «${cMap.get(id).name}» sin variante/genotipo consignado.`), SRC.clinical, [str(p.uid)]);
        }
        if (s.documented_evaluation === true &&
            (!molecular || molecular === 'not_tested') && !variant && !str(s.genotype) &&
            !str(p.notes) && !str(p.brief_info) && !str(p.clinical && p.clinical.evaluation_summary)) {
          add('info', 'CLIN_DOCUMENTED_EMPTY', 'Evaluación documentada sin detalles',
            qci("qc.issue.CLIN_DOCUMENTED_EMPTY.detail", {p0:(label(p.uid)), p1:(cMap.get(id).name)}, `${label(p.uid)} tiene asterisco de evaluación documentada para «${cMap.get(id).name}», sin datos adicionales.`), SRC.clinical, [str(p.uid)]);
        }
        if (status === 'carrier' && ['autosomal_dominant','x_linked_dominant'].includes(cMap.get(id).inheritance)) {
          add('info', 'CLIN_CARRIER_DOMINANT', 'Portador de enfermedad dominante',
            qci("qc.issue.CLIN_CARRIER_DOMINANT.detail", {p0:(label(p.uid)), p1:(cMap.get(id).name)}, `${label(p.uid)} figura como portador en «${cMap.get(id).name}»; revisa si resulta más apropiado asintomático/presintomático.`), SRC.clinical, [str(p.uid)]);
        }
      }
      if (conditions.length && p.affected === true &&
          !array(p.condition_states).some(s => s.status === 'affected') &&
          array(p.condition_states).length > 0) {
        add('warning', 'CLIN_AFFECTED_MISMATCH', 'Afectación general y condiciones discrepantes',
          qci("qc.issue.CLIN_AFFECTED_MISMATCH.detail", {p0:(label(p.uid))}, `${label(p.uid)} figura afectado, pero ninguna de las condiciones asignadas consta como afectada.`), SRC.clinical, [str(p.uid)]);
      }
    }
    // Reglas geométricas básicas. La ausencia de cruces NO se certifica:
    // el motor puede introducir puentes visuales intencionados.
    const positions = options && options.positions instanceof Map
      ? options.positions : null;
    if (positions) {
      const positioned = people.filter(p => {
        const pos = positions.get(str(p.uid));
        return pos && Number.isFinite(pos.x) && Number.isFinite(pos.y);
      });
      for (let i = 0; i < positioned.length; i++) {
        const a = positioned[i];
        const ap = positions.get(str(a.uid));
        for (let j = i + 1; j < positioned.length; j++) {
          const b = positioned[j];
          const bp = positions.get(str(b.uid));
          if (Math.abs(ap.x - bp.x) < 25 && Math.abs(ap.y - bp.y) < 25) {
            add('warning', 'LAYOUT_OVERLAP', 'Posible superposición de símbolos', qci("qc.issue.LAYOUT_OVERLAP.detail", {p0:(label(a.uid)), p1:(label(b.uid))}, `${label(a.uid)} y ${label(b.uid)} ocupan posiciones muy próximas en el diagrama. Comprueba su legibilidad.`), SRC.integrity, [str(a.uid), str(b.uid)]);
          }
        }
      }
      for (const r of relationships) {
        if (r.type !== 'parentage') continue;
        for (const parent of validIds(r.parents)) for (const child of validIds(r.children)) {
          const a = positions.get(parent), b = positions.get(child);
          if (a && b && Number.isFinite(a.y) && Number.isFinite(b.y) && b.y <= a.y + 15) {
            add('warning', 'LAYOUT_GENERATION', 'Descendiente no situado debajo del progenitor', qci("qc.issue.LAYOUT_GENERATION.detail", {p0:(label(child)), p1:(label(parent))}, `${label(child)} figura a la misma altura o por encima de ${label(parent)}. Revisa generaciones y niveles manuales.`), SRC.integrity, [parent, child]);
          }
        }
      }
      for (const group of siblingGroups) {
        const members = group.map(id => ({
          id, pos:positions.get(id),
          birth:Number(pMap.get(id) && pMap.get(id).birth_order)
        })).filter(x => x.pos && Number.isFinite(x.pos.x) && Number.isInteger(x.birth) && x.birth > 0);
        const seenPairs = new Set();
        for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
          const a = members[i], b = members[j];
          if (a.birth === b.birth || !Number.isFinite(a.pos.y) || !Number.isFinite(b.pos.y) || Math.abs(a.pos.y - b.pos.y) > 40) continue;
          const elder = a.birth < b.birth ? a : b;
          const younger = a.birth < b.birth ? b : a;
          const k = key([elder.id,younger.id]);
          if (elder.pos.x > younger.pos.x + 1 && !seenPairs.has(k)) {
            seenPairs.add(k);
            add('warning', 'SIBLING_BIRTH_ORDER', 'Orden de nacimiento invertido', qci("qc.issue.SIBLING_BIRTH_ORDER.detail", {p0:(label(elder.id)), p1:(label(younger.id))}, `${label(elder.id)} aparece a la derecha de ${label(younger.id)}, pese al orden de nacimiento registrado.`), SRC.relations, [elder.id, younger.id]);
          }
        }
      }
    }

    // Estas comprobaciones utilizan geometría SVG real si el navegador
    // la suministra; no intentan diagnosticar todas las intersecciones.
    const boxes = options && options.svgGeometry;
    if (boxes && Array.isArray(boxes.textIssues)) {
      for (const problem of boxes.textIssues.slice(0, 40)) {
        const uids = array(problem.uids).map(str).filter(Boolean);
        add('warning', 'LAYOUT_TEXT_COLLISION', 'Texto en conflicto con otro símbolo',
          str(problem.detail) || 'Una etiqueta puede invadir un símbolo ajeno. Comprueba la representación.', SRC.integrity, uids);
      }
    }
    if (boxes && boxes.boundsIssue) {
      add('warning', 'LAYOUT_BOUNDS', 'Contenido fuera de los límites del SVG',
        qci("qc.issue.LAYOUT_BOUNDS.detail", null, 'Parte del contenido parece quedar fuera del viewBox. Comprueba el árbol visualmente.'), SRC.integrity);
    }

    if (!people.some(p => p.proband || p.consultand)) {
      add('info', 'INDEX_MISSING', 'Sin probando ni consultante señalado', qci("qc.issue.INDEX_MISSING.detail", null, 'Identifica al probando o consultante cuando corresponda. No siempre es necesario en esquemas ilustrativos.'), SRC.clinical);
    }
    if (!str(data && data.indication)) {
      add('info', 'INDICATION_MISSING', 'Indicación clínica no indicada', qci("qc.issue.INDICATION_MISSING.detail", null, 'En un pedigree clínico documenta el motivo de estudio, si procede.'), SRC.clinical);
    }

    issues.sort((a,b) => levels[a.severity] - levels[b.severity]);
    const counts = {error: 0, warning: 0, info: 0};
    for (const issue of issues) counts[issue.severity]++;
    return {
      issues, counts,
      status: counts.error ? 'errors' : counts.warning ? 'warnings' : 'checked'
    };
  }
  return {analyze, CATEGORIES, VERSION: '2.0'};
});
