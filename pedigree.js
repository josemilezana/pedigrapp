(() => {
"use strict";

const APP_VERSION = "1.1";
// Changes to language do not modify the family model or history.
function refreshLocalizedPresentation() {
  // Called once dictionaries are loaded, and whenever the language changes.
  // Do not reset form fields or mutate the family/undo history.
  if(typeof refreshRecordFormTexts==='function')refreshRecordFormTexts();
  if(typeof updateUnsavedIndicator==='function')updateUnsavedIndicator();
  if(typeof updateUndoButton==='function')updateUndoButton();
  if(typeof updateFamilyReviewIndicator==='function')updateFamilyReviewIndicator();
  if(typeof updateSiblingReorderButton==='function')updateSiblingReorderButton();
  if(typeof updateManualLayoutResetButton==='function')updateManualLayoutResetButton();
  if(typeof refreshPedigreeFocusModeLanguage==='function')refreshPedigreeFocusModeLanguage();
  // Update the clinical header in place: NEVER rebuild clinical forms with unsaved edits.
  if(typeof selectedPerson==='function' && typeof clinicalSelectedIndicatorText==='function'){
    const title=document.getElementById('notesPersonTitle');
    const selected=selectedPerson();
    if(title)title.textContent=selected ? clinicalSelectedIndicatorText(selected) : t("app.notesPersonTitle.text");
  }
  if(typeof refreshConditionColorOptionLabels==='function')refreshConditionColorOptionLabels();
  const viewerSearch=document.getElementById('pedigreePersonSearch');
  if(viewerSearch)viewerSearch.title=viewerSearch.classList.contains('is-not-found')
    ? t('validation.person.noneFound') : t('layout.search.title');
  // The saved-case picker and lists are UI derived from the family model.
  // Refresh them without modifying free text, selections, or undo history.
  if(typeof updateSavedCaseReviewFilterButtons==='function')updateSavedCaseReviewFilterButtons();
  if(typeof setSelectedSavedCase==='function' && typeof selectedSavedCaseId!=='undefined' && selectedSavedCaseId){
    setSelectedSavedCase(selectedSavedCaseId,{updateSearch:false});
  } else if(typeof selectedSavedCaseId!=='undefined' && !selectedSavedCaseId){
    const hint=document.getElementById('savedCaseSelection');
    if(hint)hint.textContent=t('savedCases.selectHint');
  }
  const savedResults=document.getElementById('savedCaseResults');
  if(savedResults && typeof renderSavedCaseResults==='function'){
    const wasHidden=savedResults.classList.contains('hidden');
    renderSavedCaseResults();
    if(wasHidden)savedResults.classList.add('hidden');
  }
  if(typeof renderRelations==='function')renderRelations();
  if(typeof renderPeopleTable==='function')renderPeopleTable();
  const emptyStatus=document.getElementById('status');
  if(emptyStatus && !family.people.length)emptyStatus.textContent=t('layout.empty');

  // Translate only automatic chronology SVG labels in place: no relayout,
  // no geometry changes, no free-text edits and no history changes.
  if(currentSvg && typeof personByUid==='function'){
    currentSvg.querySelectorAll('.person[data-uid]').forEach(node=>{
      const p=personByUid(node.getAttribute('data-uid'));
      const label=node.querySelector('.person-chronology-label');
      if(label && p)label.textContent=personalChronologyLabel(p);
    });
  }
  if(typeof renderClinicalLegend==='function')renderClinicalLegend();
  if(typeof recalculateLivePedigreeQc==='function')recalculateLivePedigreeQc();
  if(typeof buildConditionHoverCard==='function' && typeof conditionHoverActiveUid!=='undefined' && conditionHoverActiveUid){
    const record=typeof personByUid==='function'?personByUid(conditionHoverActiveUid):null;
    if(record && typeof conditionHoverCard==='function' && !conditionHoverCard().hidden){
      // Keep the ⋯ panel, the target selection, and the selected twin type
      // when rebuilding only its translated controls. No model edits.
      const card=conditionHoverCard();
      const moreExpanded=card.querySelector('.condition-hover-more-button')?.getAttribute('aria-expanded')==='true';
      const marked=[...card.querySelectorAll('.condition-hover-relation-list input:checked')].map(el=>el.value);
      const twinType=card.querySelector('.condition-hover-twin-type')?.value;
      // Preserve unsaved quick-edit values (including age/year mode) while
      // rebuilding only translated text. Nothing is written to the family.
      const quickValues={
        label:card.querySelector('.condition-hover-quick-label')?.value,
        brief:card.querySelector('.condition-hover-quick-brief')?.value,
        mode:card.querySelector('.condition-hover-chronology-mode')?.value,
        aux:card.querySelector('.condition-hover-quick-age, .condition-hover-quick-meta')?.value
      };
      buildConditionHoverCard(record);
      const quickLabel=card.querySelector('.condition-hover-quick-label');
      const quickBrief=card.querySelector('.condition-hover-quick-brief');
      const quickMode=card.querySelector('.condition-hover-chronology-mode');
      const quickAux=card.querySelector('.condition-hover-quick-age, .condition-hover-quick-meta');
      if(quickLabel && quickValues.label!==undefined)quickLabel.value=quickValues.label;
      if(quickBrief && quickValues.brief!==undefined)quickBrief.value=quickValues.brief;
      if(quickMode && quickValues.mode){
        quickMode.value=quickValues.mode;
        quickMode.dispatchEvent(new Event('change'));
      }
      if(quickAux && quickValues.aux!==undefined)quickAux.value=quickValues.aux;
      if(twinType){
        const twin=card.querySelector('.condition-hover-twin-type');
        if(twin)twin.value=twinType;
      }
      card.querySelectorAll('.condition-hover-relation-list input').forEach(input=>{
        input.checked=marked.includes(input.value);
      });
      if(moreExpanded){
        const content=card.querySelector('.condition-hover-more-content');
        const button=card.querySelector('.condition-hover-more-button');
        if(content && button){
          content.hidden=false;
          button.setAttribute('aria-expanded','true');
          button.title=t('tooltip.more.hide');
        }
      }
    }
  }
  if(typeof window.PedigrAPPi18n?.apply==='function')window.PedigrAPPi18n.apply();
}
document.addEventListener('pedigrapp:languagechange',refreshLocalizedPresentation);
window.addEventListener('pedigrapp:i18nready',refreshLocalizedPresentation);

const C = {
  symbolSize: 38,
  generationGap: 200,
  siblingGap: 160,
  coupleGap: 105,
  twinGap: 120,
  marginX: 105,
  marginTop: 80,
  labelGap: 18
};

const svgNS = "http://www.w3.org/2000/svg";
const $ = id => document.getElementById(id);

let family = emptyFamily();
let currentSvg = null;
let currentLayout = null;
let currentNumbers = new Map();
let selectedPersonUid = null;
let editingUnionReproductiveIndex = null;

const undoHistory = [];
const redoHistory = [];
const MAX_UNDO_STEPS = 100;

let savedCaseItems = [];
let selectedSavedCaseId = "";
let savedCaseReviewFilter = "all";

const LOCAL_STORAGE_PREFIX = "pedigrees.family."; // Compatible with earlier online releases.

/*
 * 0.8.59 — referencia del último estado realmente guardado/cargado.
 * Comparar el contenido completo permite que Deshacer vuelva a ocultar
 * automáticamente el aviso si se regresa exactamente al estado guardado.
 */
let savedFamilySignature = JSON.stringify(family);

function emptyFamily() {
  return {
    schema_version: "4.19",
    family_id: "FAM001",
    indication: "",
    pedigree_comments: "",
    show_pedigree_numbers: true,
    review_status: {
      reviewed: false,
      reviewed_at: "",
      reviewed_signature: ""
    },
    layout_overrides: {
      branch_order: {},
      generation_floor: {},
      manual_x: {},
      sibling_visual_order: {},
      generation_visual_order: {}
    },
    conditions: [],
    people: [],
    relationships: []
  };
}

function cloneFamilyState(data) {
  return JSON.parse(JSON.stringify(data));
}

function currentFamilySignature() {
  return JSON.stringify(family);
}

function hasUnsavedFamilyChanges() {
  return (
    savedFamilySignature === null ||
    currentFamilySignature() !== savedFamilySignature
  );
}

function updateUnsavedIndicator() {
  const indicator = $("unsavedIndicator");

  const dirty =
    hasUnsavedFamilyChanges();

  if (indicator) {
    indicator.hidden = !dirty;
  }

  const saveButton =
    $("saveFamilyBtn");

  if (saveButton) {
    saveButton.title = dirty
      ? t("toolbar.save.dirtyTitle")
      : t("toolbar.save.cleanTitle");

    saveButton.setAttribute(
      "aria-label",
      dirty
        ? t("toolbar.save.dirtyAria")
        : t("toolbar.save.cleanAria")
    );
  }

  const stickySaveButton =
    $("stickySaveBtn");

  if (stickySaveButton) {
    stickySaveButton.classList.toggle(
      "is-dirty",
      dirty
    );

    stickySaveButton.title = dirty
      ? t("toolbar.save.dirtyTitle")
      : t("toolbar.save.cleanTitle");

    stickySaveButton.setAttribute(
      "aria-label",
      dirty
        ? t("toolbar.save.dirtyAria")
        : t("toolbar.save.cleanAria")
    );
  }
}

function markCurrentFamilyAsSaved() {
  savedFamilySignature = currentFamilySignature();
  updateUnsavedIndicator();
}

function markCurrentFamilyAsUnsaved() {
  savedFamilySignature = null;
  updateUnsavedIndicator();
}

function updateUndoButton() {
  const undoDisabled =
    undoHistory.length === 0;

  const redoDisabled =
    redoHistory.length === 0;

  const undoTitle =
    undoHistory.length
      ? t("history.undoAvailable",{count:undoHistory.length})
      : t("toolbar.history.noUndo");

  const redoTitle =
    redoHistory.length
      ? t("history.redoAvailable",{count:redoHistory.length})
      : t("toolbar.history.noRedo");

  const undoButton =
    $("undoBtn");

  const redoButton =
    $("redoBtn");

  if (undoButton) {
    undoButton.disabled =
      undoDisabled;

    undoButton.title =
      undoTitle;
  }

  if (redoButton) {
    redoButton.disabled =
      redoDisabled;

    redoButton.title =
      redoTitle;
  }

  const stickyUndo =
    $("stickyUndoBtn");

  const stickyRedo =
    $("stickyRedoBtn");

  if (stickyUndo) {
    stickyUndo.disabled =
      undoDisabled;

    stickyUndo.title =
      undoTitle;

    stickyUndo.setAttribute(
      "aria-label",
      undoTitle
    );
  }

  if (stickyRedo) {
    stickyRedo.disabled =
      redoDisabled;

    stickyRedo.title =
      redoTitle;

    stickyRedo.setAttribute(
      "aria-label",
      redoTitle
    );
  }
}

function trimHistory(history) {
  while (
    history.length >
    MAX_UNDO_STEPS
  ) {
    history.shift();
  }
}

function clearRedoHistory() {
  if (!redoHistory.length) return;

  redoHistory.length = 0;
  updateUndoButton();
}

function pushUndoState() {
  syncHeaderToFamily();

  undoHistory.push(
    cloneFamilyState(family)
  );

  trimHistory(undoHistory);

  /*
   * Si el usuario deshace y después realiza una modificación nueva,
   * se crea una rama nueva de edición y ya no corresponde "rehacer"
   * los estados anteriores.
   */
  redoHistory.length = 0;

  updateUndoButton();
}

function clearUndoHistory() {
  undoHistory.length = 0;
  redoHistory.length = 0;
  updateUndoButton();
}

function restoreHistoryState(state) {
  family =
    cloneFamilyState(state);

  if (
    selectedPersonUid &&
    !personByUid(selectedPersonUid)
  ) {
    selectedPersonUid = null;
  }

  syncFamilyToHeader();
  resetPersonForm();
  renderPedigree();
  updateUndoButton();
}

function undoLastChange() {
  if (!undoHistory.length) return;

  syncHeaderToFamily();

  redoHistory.push(
    cloneFamilyState(family)
  );

  trimHistory(redoHistory);

  const previous =
    undoHistory.pop();

  restoreHistoryState(
    previous
  );

  message(
    redoHistory.length
      ? `Cambio deshecho. Puedes rehacer ${redoHistory.length} paso(s).`
      : "Cambio deshecho.",
    "success"
  );
}

function redoLastChange() {
  if (!redoHistory.length) return;

  syncHeaderToFamily();

  undoHistory.push(
    cloneFamilyState(family)
  );

  trimHistory(undoHistory);

  const next =
    redoHistory.pop();

  restoreHistoryState(
    next
  );

  message(
    redoHistory.length
      ? t("history.redoRemaining",{count:redoHistory.length})
      : "Cambio rehecho.",
    "success"
  );
}

let toastSequence = 0;

function showToast(
  text,
  type="info",
  duration=2800
) {
  const container =
    $("toastContainer");

  if (
    !container ||
    !String(text || "").trim()
  ) {
    return null;
  }

  const toast =
    document.createElement(
      "div"
    );

  toast.className =
    `app-toast ${
      type === "success"
        ? "success"
        : "info"
    }`;

  toast.dataset.toastId =
    String(++toastSequence);

  const icon =
    document.createElement(
      "span"
    );

  icon.className =
    "app-toast-icon";

  icon.setAttribute(
    "aria-hidden",
    "true"
  );

  icon.textContent =
    type === "success"
      ? "✓"
      : "i";

  const label =
    document.createElement(
      "span"
    );

  label.className =
    "app-toast-text";

  label.textContent =
    String(text);

  toast.append(
    icon,
    label
  );

  container.appendChild(
    toast
  );

  requestAnimationFrame(
    () => {
      toast.classList.add(
        "is-visible"
      );
    }
  );

  const removeToast = () => {
    if (!toast.isConnected) {
      return;
    }

    toast.classList.remove(
      "is-visible"
    );

    toast.classList.add(
      "is-leaving"
    );

    window.setTimeout(
      () => toast.remove(),
      180
    );
  };

  const timer =
    window.setTimeout(
      removeToast,
      Math.max(
        1200,
        Number(duration) || 2800
      )
    );

  toast.addEventListener(
    "click",
    () => {
      window.clearTimeout(
        timer
      );

      removeToast();
    }
  );

  return toast;
}

function message(text = "", type = "") {
  text = window.PedigrAPPi18n?.uiText(text) ?? text;
  const inline =
    $("appMessage");

  if (!String(text || "").trim()) {
    if (inline) {
      inline.textContent = "";
      inline.className =
        "app-message";
    }
    return;
  }

  /*
   * 0.8.59 — confirmaciones e información normal ya no desplazan
   * la interfaz: aparecen como toast. Los errores siguen siendo
   * persistentes en la zona de mensajes para no perder avisos importantes.
   */
  if (type === "error") {
    if (inline) {
      inline.textContent =
        text;

      inline.className =
        "app-message error";
    }

    return;
  }

  if (inline) {
    inline.textContent = "";
    inline.className =
      "app-message";
  }

  showToast(
    text,
    type === "success"
      ? "success"
      : "info"
  );
}

function nextUid() {
  let n = 1;
  const used = new Set(family.people.map(p => p.uid));
  while (used.has("P" + n)) n++;
  return "P" + n;
}

/*
 * 0.7.25 — altas rápidas de registros frecuentes.
 *
 * Un clic crea inmediatamente el individuo o la pareja completa.
 * Pareja = dos personas + una unión, todo en un único paso de Deshacer.
 */
function centerPedigreeAfterQuickAdd() {
  requestAnimationFrame(
    () => {
      requestAnimationFrame(
        () => {
          const pedigreeCard =
            document.querySelector(
              ".pedigree-card"
            );

          if (pedigreeCard) {
            pedigreeCard.scrollIntoView({
              behavior:"smooth",
              block:"center",
              inline:"nearest"
            });
          }

          centerPedigreeViewport();

          /*
           * El scroll de página es animado. Recentramos una vez más
           * al terminar de arrancar la transición para que el árbol
           * quede centrado también dentro de su propio visor.
           */
          window.setTimeout(
            () => {
              centerPedigreeViewport();
            },
            260
          );
        }
      );
    }
  );
}

function quickDefaultRecord(
  type,
  options={}
) {
  const defaults = {
    uid:null,
    gender:"unspecified",
    sexAtBirth:"",
    multipleCount:null,
    deceased:false,
    proband:false,
    consultand:false
  };

  const config = {
    ...defaults,
    ...options
  };

  if (type === "multiple") {
    config.multipleCount =
      config.multipleCount ?? "n";
  }

  if (type === "gestational_carrier") {
    config.gender = "woman";
    config.sexAtBirth = "";
  }

  if (type === "sperm_donor") {
    config.gender = "man";
    config.sexAtBirth = "male";
  }

  if (type === "ovum_donor") {
    config.gender = "woman";
    config.sexAtBirth = "female";
  }

  const p = {
    uid:config.uid || nextUid(),
    record_type:type,
    label:"",
    brief_info:"",
    gender:config.gender,
    sex_at_birth:config.sexAtBirth,
    multiple_count:config.multipleCount,
    donation_targets:[],
    donation_target:null,
    gestation_target:null,
    intended_parent_uids:[],
    surrogate:false,
    affected:false,
    consultand:!!config.consultand,
    proband:!!config.proband,
    deceased:!!config.deceased,
    family_history_unknown:false,
    adoption_status:"none",
    reproductive_status:"none",
    reproductive_reason:"",
    birth_order:null,
    generation_override:null,
    age:null,
    birth_year:null,
    gestational_age_weeks:null,
    notes:"",
    condition_states:[],
    clinical:defaultClinicalData({
      affected:false
    })
  };

  p.clinical.phenotype_status =
    "unaffected";

  return p;
}

function quickDefaultPerson(
  gender,
  sexAtBirth,
  uid=null
) {
  return quickDefaultRecord(
    "person",
    {
      uid,
      gender,
      sexAtBirth
    }
  );
}

function quickUidAllocator() {
  const used =
    new Set(
      family.people.map(p => p.uid)
    );

  let n = 1;

  return () => {
    while (used.has("P" + n)) {
      n++;
    }

    const uid = "P" + n;
    used.add(uid);
    n++;

    return uid;
  };
}

function quickDefaultUnion(
  uidA,
  uidB
) {
  return {
    type:"union",
    people:[uidA,uidB],
    intergenerational:false,
    consanguineous:false,
    consanguinity_degree:"",
    relationship_status:"current",
    reproductive_status:"none",
    reproductive_attribution:"union",
    reproductive_reason:""
  };
}

function quickAddRecord(
  type,
  options={},
  successMessage=t("message.record.added")
) {
  pushUndoState();

  if (options.proband) {
    family.people.forEach(p => {
      p.proband = false;
    });
  }

  family.people.push(
    quickDefaultRecord(
      type,
      options
    )
  );

  resetPersonForm();
  renderPedigree();
  centerPedigreeAfterQuickAdd();

  message(
    successMessage,
    "success"
  );
}

function quickAddSinglePerson(
  gender
) {
  const config = {
    man:{
      sexAtBirth:"male",
      message:t("message.person.maleAdded")
    },
    woman:{
      sexAtBirth:"female",
      message:t("message.person.femaleAdded")
    },
    gender_diverse:{
      sexAtBirth:"unassigned",
      message:t("message.person.diverseAdded")
    },
    unspecified:{
      sexAtBirth:"unassigned",
      message:"Individuo añadido."
    }
  }[gender] || {
    sexAtBirth:"unassigned",
    message:"Individuo añadido."
  };

  quickAddRecord(
    "person",
    {
      gender,
      sexAtBirth:config.sexAtBirth
    },
    config.message
  );
}

function quickAddMaleFemaleCouple() {
  pushUndoState();

  const man =
    quickDefaultPerson(
      "man",
      "male"
    );

  family.people.push(man);

  const woman =
    quickDefaultPerson(
      "woman",
      "female"
    );

  family.people.push(woman);

  family.relationships.push(
    quickDefaultUnion(
      man.uid,
      woman.uid
    )
  );

  resetPersonForm();
  renderPedigree();
  centerPedigreeAfterQuickAdd();

  message(
    t("message.union.maleFemaleAdded"),
    "success"
  );
}


function quickBiologicalParentage(
  parents,
  children
) {
  return {
    type:"parentage",
    parents:[...parents],
    children:[...children],
    descent_type:"biological"
  };
}

function quickAddCoupleWithChildren(
  childGender,
  childCount=1
) {
  pushUndoState();

  const nextBatchUid =
    quickUidAllocator();

  const father =
    quickDefaultPerson(
      "man",
      "male",
      nextBatchUid()
    );

  const mother =
    quickDefaultPerson(
      "woman",
      "female",
      nextBatchUid()
    );

  const fetalPreset = childGender === "fetus";
  const childSex =
    fetalPreset
      ? ""
      : (childGender === "woman" ? "female" : "male");

  const count =
    Math.max(
      1,
      Number(childCount) || 1
    );

  const children =
    Array.from(
      {length:count},
      (_,index) => {
        const child = fetalPreset
          ? quickDefaultRecord("fetus", {
              uid: nextBatchUid(),
              gender: "unspecified",
              sexAtBirth: ""
            })
          : quickDefaultPerson(
              childGender,
              childSex,
              nextBatchUid()
            );

        child.birth_order =
          index + 1;

        return child;
      }
    );

  family.people.push(
    father,
    mother,
    ...children
  );

  family.relationships.push(
    quickDefaultUnion(
      father.uid,
      mother.uid
    ),
    quickBiologicalParentage(
      [father.uid,mother.uid],
      children.map(
        child => child.uid
      )
    )
  );

  resetPersonForm();
  renderPedigree();
  centerPedigreeAfterQuickAdd();

  const noun =
    fetalPreset
      ? t(count===1?"offspring.fetus.singular":"offspring.fetus.plural")
      : childGender === "woman"
        ? t(count===1?"offspring.daughter.singular":"offspring.daughter.plural")
        : t(count===1?"offspring.son.singular":"offspring.son.plural");

  message(
    t("message.coupleWithChildren",{count,noun}),
    "success"
  );
}

function quickAddCoupleWithThreeChildren(
  childGender
) {
  quickAddCoupleWithChildren(
    childGender,
    3
  );
}

function quickAddThreeGenerationFamily(
  childGender
) {
  pushUndoState();

  const nextBatchUid =
    quickUidAllocator();

  const paternalGrandfather =
    quickDefaultPerson(
      "man",
      "male",
      nextBatchUid()
    );

  const paternalGrandmother =
    quickDefaultPerson(
      "woman",
      "female",
      nextBatchUid()
    );

  const father =
    quickDefaultPerson(
      "man",
      "male",
      nextBatchUid()
    );

  const maternalGrandfather =
    quickDefaultPerson(
      "man",
      "male",
      nextBatchUid()
    );

  const maternalGrandmother =
    quickDefaultPerson(
      "woman",
      "female",
      nextBatchUid()
    );

  const mother =
    quickDefaultPerson(
      "woman",
      "female",
      nextBatchUid()
    );

  const childSex =
    childGender === "woman"
      ? "female"
      : "male";

  const children =
    [1,2,3].map(order => {
      const child =
        quickDefaultPerson(
          childGender,
          childSex,
          nextBatchUid()
        );

      child.birth_order = order;
      return child;
    });

  family.people.push(
    paternalGrandfather,
    paternalGrandmother,
    father,
    maternalGrandfather,
    maternalGrandmother,
    mother,
    ...children
  );

  family.relationships.push(
    quickDefaultUnion(
      paternalGrandfather.uid,
      paternalGrandmother.uid
    ),
    quickBiologicalParentage(
      [
        paternalGrandfather.uid,
        paternalGrandmother.uid
      ],
      [father.uid]
    ),
    quickDefaultUnion(
      maternalGrandfather.uid,
      maternalGrandmother.uid
    ),
    quickBiologicalParentage(
      [
        maternalGrandfather.uid,
        maternalGrandmother.uid
      ],
      [mother.uid]
    ),
    quickDefaultUnion(
      father.uid,
      mother.uid
    ),
    quickBiologicalParentage(
      [father.uid,mother.uid],
      children.map(child => child.uid)
    )
  );

  resetPersonForm();
  renderPedigree();
  centerPedigreeAfterQuickAdd();

  message(
    childGender === "woman"
      ? t("message.template.threeDaughters")
      : t("message.template.threeSons"),
    "success"
  );
}




function svgEl(name, attrs = {}, text = null) {
  const e = document.createElementNS(svgNS, name);
  Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
  if (text !== null) e.textContent = text;
  return e;
}

function roman(n) {
  const map = [
    [1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],
    [100,"C"],[90,"XC"],[50,"L"],[40,"XL"],
    [10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]
  ];
  let out = "";
  map.forEach(([v,s]) => {
    while (n >= v) { out += s; n -= v; }
  });
  return out;
}

function personByUid(uid) {
  return family.people.find(p => p.uid === uid);
}

/*
 * 0.8.66 — filiación intencional: información distinta de la filiación
 * genética, gestacional y adoptiva. No dibuja línea de descendencia.
 * Nunca se infiere de la relación de pareja ni del tipo de donante.
 */
const INTENDED_PARENT_TARGET_TYPES = new Set([
  "person", "fetus", "stillbirth", "sab", "top", "ect"
]);

function supportsIntendedParentage(p) {
  return !!p && INTENDED_PARENT_TARGET_TYPES.has(recordType(p));
}

function intendedParentUids(p) {
  if (!supportsIntendedParentage(p)) return [];
  return [...new Set(
    (Array.isArray(p.intended_parent_uids) ? p.intended_parent_uids : [])
      .map(uid => String(uid || "").trim())
      .filter(Boolean)
  )];
}

function intendedParentAnnotation(p,numbers=currentNumbers) {
  const uids = intendedParentUids(p);
  if (!uids.length) return null;
  const codes = uids.map(uid => numbers.get(uid) || uid);
  return {
    title: uids.length === 1
      ? t("record.multiple.intendedParentSingular")
      : t("record.multiple.intendedParentPlural"),
    ids: codes.length === 2
      ? `${codes[0]}${t("label.conjunction.and")}${codes[1]}`
      : codes.join(", ")
  };
}

function recordType(p) {
  return p && p.record_type ? p.record_type : "person";
}


function isMultipleIndividualsRecord(p) {
  return recordType(p) === "multiple";
}


const CONDITION_CAPABLE_RECORD_TYPES =
  new Set([
    "person",
    "gestational_carrier",
    "sperm_donor",
    "ovum_donor",
    "stillbirth",
    "fetus",
    "sab",
    "top",
    "ect"
  ]);

function supportsPedigreeConditions(p) {
  return !!p &&
    CONDITION_CAPABLE_RECORD_TYPES.has(
      recordType(p)
    );
}

/*
 * 0.8.59 — la sección "Información clínica y genética" está disponible
 * para cualquier registro representado en el pedigree.
 *
 * Los registros que representan a un único individuo/gestación pueden
 * además usar estados por condición. "Varios individuos" conserva acceso
 * a comentario clínico, pero no a un estado único por condición porque
 * sería ambiguo para un grupo.
 */
function supportsClinicalInformation(p) {
  return !!p;
}

const LABEL_BRIEF_RECORD_TYPES =
  new Set([
    "person",
    "multiple",
    "fetus",
    "stillbirth",
    "sab",
    "top",
    "ect",
    "sperm_donor",
    "ovum_donor",
    "gestational_carrier"
  ]);

function supportsRecordLabel(p) {
  return !!p &&
    LABEL_BRIEF_RECORD_TYPES.has(
      recordType(p)
    );
}

function supportsRecordBriefInfo(p) {
  return supportsRecordLabel(p);
}

// v1.0.6: a relationship is distinct from a reproductive contribution.
// D and G may form a couple; this NEVER creates biological parentage.
const PARTNER_RECORD_TYPES = new Set([
  "person", "sperm_donor", "ovum_donor", "gestational_carrier"
]);
function canFormPartnership(p) {
  return !!p && PARTNER_RECORD_TYPES.has(recordType(p));
}

function normalizedBirthYear(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1000 && n <= new Date().getFullYear()
    ? n : null;
}

function personalChronologyLabel(p) {
  if (!supportsQuickAge(p)) return "";
  if (p.birth_year !== null && p.birth_year !== undefined && p.birth_year !== "") {
    return t("individual.birthYearShort", {year:p.birth_year});
  }
  if (p.age !== null && p.age !== undefined && p.age !== "") {
    return t("individual.ageShort", {age:p.age});
  }
  return "";
}

function supportsQuickAge(p) {
  if (!p) return false;

  return [
    "person",
    "sperm_donor",
    "ovum_donor",
    "gestational_carrier"
  ].includes(recordType(p));
}

function supportsQuickGestationalAge(p) {
  if (!p) return false;

  return [
    "fetus",
    "stillbirth",
    "sab",
    "top",
    "ect"
  ].includes(recordType(p));
}

function supportsQuickMultipleCount(p) {
  return !!p &&
    recordType(p) === "multiple";
}

function normalizedMultipleCount(p) {
  const raw =
    p && p.multiple_count !== null &&
    p.multiple_count !== undefined
      ? String(p.multiple_count).trim()
      : "";

  if (raw.toLowerCase() === "n") {
    return "n";
  }

  const n = Number(raw);
  return Number.isInteger(n) && n >= 2 ? n : null;
}


function isDonorRecord(p) {
  return !!p &&
    ["sperm_donor","ovum_donor"].includes(
      recordType(p)
    );
}

function isSurrogateOvumDonor(p) {
  return !!p &&
    recordType(p) === "ovum_donor" &&
    p.surrogate === true;
}


function isGestationalCarrierRecord(p) {
  return !!p &&
    recordType(p) === "gestational_carrier";
}

function gestationTargetUid(p) {
  if (!isGestationalCarrierRecord(p)) return null;

  const uid = String(
    p.gestation_target || ""
  ).trim();

  return uid || null;
}

function pregnancyCarrierTargetUid(p) {
  if (isGestationalCarrierRecord(p)) {
    return gestationTargetUid(p);
  }

  if (isSurrogateOvumDonor(p)) {
    return donationTargetUid(p);
  }

  return null;
}

function isPregnancyCarrierRecord(p) {
  return isGestationalCarrierRecord(p) ||
    isSurrogateOvumDonor(p);
}

function pregnancyCarrierRecordsForTarget(uid) {
  return family.people.filter(p =>
    isPregnancyCarrierRecord(p) &&
    pregnancyCarrierTargetUid(p) === uid
  );
}

function hasPregnancyCarrierForTarget(uid) {
  return pregnancyCarrierRecordsForTarget(uid).length > 0;
}

function hasSurrogateForTarget(uid) {
  return family.people.some(p =>
    isSurrogateOvumDonor(p) &&
    donationTargetUid(p) === uid
  );
}

function gestationalCarrierRecordsForTarget(uid) {
  return family.people.filter(p =>
    isGestationalCarrierRecord(p) &&
    gestationTargetUid(p) === uid
  );
}

function hasGestationalCarrierForTarget(uid) {
  return gestationalCarrierRecordsForTarget(uid).length > 0;
}

function gestationalCarrierLabel(p) {
  const description = t("person.type.gestationalCarrier");
  if (!p) return description;
  return p.label
    ? `${description} · ${p.label}`
    : description;
}

function donorRecordLabel(p) {
  if (!p) return t("record.type.donor");

  if (isSurrogateOvumDonor(p)) {
    return t("record.type.surrogateOvumDonor");
  }

  return recordType(p) === "ovum_donor"
    ? t("record.type.ovumDonor")
    : t("record.type.spermDonor");
}

function donationTargetUids(p) {
  if (!isDonorRecord(p)) return [];

  const values = [];

  if (Array.isArray(p.donation_targets)) {
    p.donation_targets
      .forEach(uid => {
        const value =
          String(uid || "").trim();

        if (value) {
          values.push(value);
        }
      });
  }

  /*
   * Compatibilidad hacia atrás:
   * hasta schema 3.9 todo donante tenía donation_target singular.
   * Los dos tipos de donantes admiten ahora el array. El campo
   * singular antiguo sigue siendo legible sin duplicar el resultado.
   */
  const legacy =
    String(
      p.donation_target || ""
    ).trim();

  if (legacy) {
    values.push(legacy);
  }

  const unique =
    [...new Set(values)];

  // Si además gesta, la donante de óvulos solo puede estar
  // vinculada a ese embarazo; no asumir otras gestaciones.
  return isSurrogateOvumDonor(p) ? unique.slice(0,1) : unique;
}

function donationTargetUid(p) {
  return donationTargetUids(p)[0] || null;
}

function donorRecordsForTarget(uid,donorType=null) {
  return family.people.filter(p =>
    isDonorRecord(p) &&
    donationTargetUids(p).includes(uid) &&
    (
      !donorType ||
      recordType(p) === donorType
    )
  );
}

// Reutilizar D conserva exactamente las filiaciones y las fratrías actuales.
// El registro del donante es el único origen de verdad de esta asociación.
function assignExistingDonorTargets(donorUid,targetUids) {
  const donor = personByUid(donorUid);
  if (!isDonorRecord(donor)) {
    throw new Error(t("validation.sharedDonor.donorRequired"));
  }
  if (isSurrogateOvumDonor(donor)) {
    throw new Error(t("validation.sharedDonor.surrogateSingle"));
  }
  const targets = [...new Set((targetUids || []).map(String).filter(Boolean))];
  if (!targets.length) {
    throw new Error(t("validation.sharedDonor.targetRequired"));
  }
  for (const uid of targets) {
    const outcome = personByUid(uid);
    if (uid === donorUid || !outcome ||
        !["person","fetus","stillbirth","sab","top","ect"].includes(recordType(outcome))) {
      throw new Error(t("validation.donation.outcomeType"));
    }
    if (donorRecordsForTarget(uid,recordType(donor))
        .some(other => other.uid !== donorUid)) {
      throw new Error(t("validation.sharedDonor.sameTypeExists",{person:displayName(uid)}));
    }
  }
  donor.donation_targets = targets;
  donor.donation_target = null;
}

function hasDonorForTarget(uid) {
  return donorRecordsForTarget(uid).length > 0;
}

function hasSpermDonorForTarget(uid) {
  return donorRecordsForTarget(
    uid,
    "sperm_donor"
  ).length > 0;
}

function hasOvumDonorForTarget(uid) {
  return donorRecordsForTarget(
    uid,
    "ovum_donor"
  ).length > 0;
}

function multipleIndividualsLabel(p) {
  const n = normalizedMultipleCount(p);
  if (!n) return "Varios individuos";

  if (p.gender === "man") return t("record.multiple.maleCount",{count:n});
  if (p.gender === "woman") return t("record.multiple.femaleCount",{count:n});

  return t("record.multiple.unknownCount",{count:n});
}

function reproductiveEventLabel(p) {
  if (recordType(p) === "fetus") return t("record.type.fetus");
  if (recordType(p) === "stillbirth") return "SB";
  if (recordType(p) === "sab") return "SAB";
  if (recordType(p) === "top") return "TOP";
  if (recordType(p) === "ect") return "ECT";
  return "";
}


function parentagesOf(uid) {
  return family.relationships.filter(r =>
    r.type === "parentage" && (r.children || []).includes(uid)
  );
}

function parentageOf(uid, descentType = null) {
  const rels = parentagesOf(uid);

  if (descentType) {
    return rels.find(r => (r.descent_type || "biological") === descentType) || null;
  }

  return (
    rels.find(r => (r.descent_type || "biological") === "biological") ||
    rels[0] ||
    null
  );
}

function adoptiveParentageOf(uid) {
  return parentageOf(uid, "adoptive");
}

function isAdoptedInPerson(p) {
  return !!(p && recordType(p) === "person" && adoptiveParentageOf(p.uid));
}

function isAdoptedOutPerson(p) {
  return !!(
    p &&
    recordType(p) === "person" &&
    p.adoption_status === "out"
  );
}

function adoptionStatusForPerson(p) {
  if (!p || recordType(p) !== "person") return "none";
  if (isAdoptedInPerson(p)) return "in";
  if (isAdoptedOutPerson(p)) return "out";
  return "none";
}

function isAdoptedPerson(p) {
  return adoptionStatusForPerson(p) !== "none";
}

function markAdoptedOut(uid) {
  const p = personByUid(uid);
  if (!p || recordType(p) !== "person") {
    throw new Error(t("message.adoption.singleIndividual"));
  }
  p.adoption_status = "out";
}

function displayName(uid) {
  const p = personByUid(uid);
  const num = currentNumbers.get(uid) || uid;
  if (!p) return num;

  if (isMultipleIndividualsRecord(p)) {
    const label = p.label
      ? ` · ${p.label}`
      : "";

    return `${num} · ${multipleIndividualsLabel(p)}${label}`;
  }

  if (isDonorRecord(p)) {
    const label = p.label
      ? ` · ${p.label}`
      : "";

    return `${num} · ${donorRecordLabel(p)}${label}`;
  }

  if (isGestationalCarrierRecord(p)) {
    const label = p.label
      ? ` · ${p.label}`
      : "";

    return `${num} · ${t("person.type.gestationalCarrier")}${label}`;
  }

  if (recordType(p) !== "person") {
    const event = reproductiveEventLabel(p);
    const label = p.label
      ? ` · ${p.label}`
      : "";
    const ga = p.gestational_age_weeks
      ? t("record.gestationalAgeShort",{weeks:p.gestational_age_weeks})
      : "";
    return `${num} · ${event}${label}${ga}`;
  }

  return p.label ? `${num} · ${p.label}` : num;
}

function pedigreeNumbersVisible() {
  return family.show_pedigree_numbers !== false;
}

function unnumberedDisplayName(uid) {
  const p = personByUid(uid);

  if (!p) return "";

  if (isMultipleIndividualsRecord(p)) {
    return p.label
      ? `${multipleIndividualsLabel(p)} · ${p.label}`
      : multipleIndividualsLabel(p);
  }

  if (isDonorRecord(p)) {
    return p.label
      ? `${donorRecordLabel(p)} · ${p.label}`
      : donorRecordLabel(p);
  }

  if (isGestationalCarrierRecord(p)) {
    return p.label
      ? `${t("person.type.gestationalCarrier")} · ${p.label}`
      : t("person.type.gestationalCarrier");
  }

  if (recordType(p) !== "person") {
    const event =
      reproductiveEventLabel(p) ||
      t("label.record.gestationalEvent");

    const label = p.label
      ? ` · ${p.label}`
      : "";

    const ga = p.gestational_age_weeks
      ? t("record.gestationalAgeShort",{weeks:p.gestational_age_weeks})
      : "";

    return `${event}${label}${ga}`;
  }

  if (p.label) {
    return p.label;
  }

  if (p.gender === "man") {
    return "Hombre / niño";
  }

  if (p.gender === "woman") {
    return "Mujer / niña";
  }

  if (p.gender === "gender_diverse") {
    return "Género diverso";
  }

  return "Individuo";
}

function pedigreeDisplayName(uid) {
  return pedigreeNumbersVisible()
    ? displayName(uid)
    : unnumberedDisplayName(uid);
}

function defaultClinicalData(p = null) {
  const affected = !!(p && p.affected);
  return {
    phenotype_status: affected ? "affected" : "unaffected",
    conditions: [],
    genetic_study_status: "not_performed",
    evaluation_type: "",
    gene: "",
    variant: "",
    zygosity: "",
    carrier_status: "none",
    documented_evaluation: false,
    evaluation_summary: ""
  };
}

function normalizeClinicalData(p) {
  const base = defaultClinicalData(p);
  const current = p && p.clinical && typeof p.clinical === "object" ? p.clinical : {};
  const conditions = Array.isArray(current.conditions) ? current.conditions.filter(x => typeof x === "string" && x.trim() !== "") : [];
  return { ...base, ...current, conditions };
}

function isClinicallyAffected(p) {
  if ((family.conditions || []).length && Array.isArray(p.condition_states)) {
    return isPersonAffectedByAnyCondition(p);
  }
  if (p && p.clinical && p.clinical.phenotype_status) return p.clinical.phenotype_status === "affected";
  return !!(p && p.affected);
}

const INHERITANCE_LABELS = new Proxy({
  autosomal_dominant: "Autosómica dominante",
  autosomal_recessive: "Autosómica recesiva",
  x_linked_dominant: "Ligada al X dominante",
  x_linked_recessive: "Ligada al X recesiva",
  mitochondrial: "Mitocondrial",
  unknown: "Desconocida / no establecida"
}, {get(target,key){
  if(!Object.prototype.hasOwnProperty.call(target,key))return undefined;
  return t("condition.inheritance."+key);
}});

const CONDITION_STATUS_LABELS = new Proxy({
  unaffected: "No afectado / sin evidencia",
  affected: "Afectado",
  carrier: "Portador no afectado",
  presymptomatic: "Asintomático / presintomático",
  unknown: "Desconocido"
}, {get(target, key){
  if(!Object.prototype.hasOwnProperty.call(target,key))return undefined;
  return t("condition.status."+(key===''?'unspecified':String(key)));
}});

const MOLECULAR_RESULT_LABELS = new Proxy({
  not_tested: "No estudiado",
  studied: "Sí estudiado",
  positive: "Positivo",
  negative: "Negativo",
  inconclusive: "No concluyente"
}, {get(target, key){
  if(!Object.prototype.hasOwnProperty.call(target,key))return undefined;
  return t("condition.molecular."+(key===''?'unspecified':String(key)));
}});

const ZYGOSITY_LABELS = new Proxy({
  "": "No indicada",
  heterozygous: "Heterocigoto",
  homozygous: "Homocigoto",
  hemizygous: "Hemicigoto",
  compound_heterozygous: "Heterocigoto compuesto",
  heteroplasmy: "Heteroplasmia",
  homoplasmy: "Homoplasmia",
  other: "Otra / no especificada"
}, {get(target, key){
  if(!Object.prototype.hasOwnProperty.call(target,key))return undefined;
  return t("condition.zygosity."+(key===''?'unspecified':String(key)));
}});

const LEGACY_CONDITION_PATTERNS = [
  "solid",
  "diagonal",
  "crosshatch",
  "dots",
  "horizontal",
  "vertical"
];

const CONDITION_COLORS = [
  {value:"#111111", label:"Negro", i18nKey:"condition.color.black"},
  {value:"#C62828", label:"Rojo", i18nKey:"condition.color.red"},
  {value:"#1565C0", label:"Azul", i18nKey:"condition.color.blue"},
  {value:"#2E7D32", label:"Verde", i18nKey:"condition.color.green"},
  {value:"#EF6C00", label:"Naranja", i18nKey:"condition.color.orange"},
  {value:"#6A1B9A", label:"Morado", i18nKey:"condition.color.purple"}
];

const CARRIER_TEXTURES = [
  {value:"crosshatch", label:"Rayado cruzado", i18nKey:"condition.texture.crosshatch"},
  {value:"diagonal", label:"Rayado diagonal", i18nKey:"condition.texture.diagonal"},
  {value:"horizontal", label:"Rayado horizontal", i18nKey:"condition.texture.horizontal"},
  {value:"vertical", label:"Rayado vertical", i18nKey:"condition.texture.vertical"},
  {value:"dots", label:"Punteado", i18nKey:"condition.texture.dots"}
];

function normalizeCarrierPattern(value) {
  const raw =
    String(value || "")
      .trim();

  return CARRIER_TEXTURES
    .some(item =>
      item.value === raw
    )
      ? raw
      : "crosshatch";
}

const LEGACY_PATTERN_COLOR_MAP = {
  solid:"#111111",
  diagonal:"#1565C0",
  crosshatch:"#C62828",
  dots:"#2E7D32",
  horizontal:"#EF6C00",
  vertical:"#6A1B9A"
};

function normalizeConditionColor(
  value,
  index=0,
  legacyPattern=""
) {
  const raw =
    String(value || "")
      .trim()
      .toUpperCase();

  const exact =
    CONDITION_COLORS.find(item =>
      item.value.toUpperCase() === raw
    );

  if (exact) {
    return exact.value;
  }

  if (
    legacyPattern &&
    LEGACY_PATTERN_COLOR_MAP[
      legacyPattern
    ]
  ) {
    return LEGACY_PATTERN_COLOR_MAP[
      legacyPattern
    ];
  }

  return CONDITION_COLORS[
    index % CONDITION_COLORS.length
  ].value;
}

function conditionColor(condition) {
  if (!condition) {
    return CONDITION_COLORS[0].value;
  }

  const index =
    Math.max(
      0,
      (family.conditions || [])
        .findIndex(c =>
          c.id === condition.id
        )
    );

  return normalizeConditionColor(
    condition.color,
    index,
    condition.affected_pattern || ""
  );
}

function defaultCarrierPattern() {
  return "crosshatch";
}

function conditionById(id) {
  return (family.conditions || []).find(c => c.id === id) || null;
}

function nextConditionId() {
  let n=1; const used=new Set((family.conditions||[]).map(c=>c.id));
  while (used.has("COND"+n)) n++;
  return "COND"+n;
}

function normalizeCondition(c,index) {
  const legacyPattern =
    c.affected_pattern ||
    c.pattern ||
    LEGACY_CONDITION_PATTERNS[
      index % LEGACY_CONDITION_PATTERNS.length
    ];

  return {
    id:c.id || ("COND"+(index+1)),
    name:c.name || "",
    gene:c.gene || "",
    inheritance:c.inheritance || "unknown",
    color:normalizeConditionColor(
      c.color,
      index,
      legacyPattern
    ),
    // Afectado siempre sólido; el portador conserva color y permite textura.
    affected_pattern:"solid",
    carrier_pattern:normalizeCarrierPattern(
      c.carrier_pattern
    )
  };
}

function normalizeConditionStates(p) {
  const source = Array.isArray(p.condition_states) ? p.condition_states : [];

  // Migración desde el modelo anterior:
  // documented_evaluation vivía en clinical y afectaba al individuo entero.
  // Si un estado antiguo no trae el nuevo campo explícito, conservamos
  // el valor general anterior para no perder el asterisco al importar.
  const legacyDocumented =
    !!(
      p &&
      p.clinical &&
      p.clinical.documented_evaluation
    );

  return source
    .filter(s => s && typeof s.condition_id === "string")
    .map(s => ({
      condition_id: s.condition_id,
      status: s.status || "unaffected",
      molecular_result: s.molecular_result || "not_tested",
      variant: s.variant || "",
      zygosity: s.zygosity || "",
      genotype: s.genotype || "",
      documented_evaluation:
        Object.prototype.hasOwnProperty.call(
          s,
          "documented_evaluation"
        )
          ? !!s.documented_evaluation
          : legacyDocumented
    }));
}

function conditionStateForPerson(p, conditionId) {
  const found = (p.condition_states || [])
    .find(s => s.condition_id === conditionId);

  if (found) {
    return {
      ...found,
      documented_evaluation:
        !!found.documented_evaluation
    };
  }

  return {
    condition_id: conditionId,
    status: "unaffected",
    molecular_result: "not_tested",
    variant: "",
    zygosity: "",
    genotype: "",
    documented_evaluation:
      !!(
        p &&
        p.clinical &&
        p.clinical.documented_evaluation
      )
  };
}

function hasDocumentedEvaluationForAnyCondition(p) {
  return !!(
    p &&
    (p.condition_states || [])
      .some(state => !!state.documented_evaluation)
  );
}

function isPersonAffectedByAnyCondition(p) {
  return (p.condition_states||[]).some(s=>s.status==="affected");
}

function isPersonPresymptomaticForAnyCondition(p) {
  return (p.condition_states||[]).some(s=>s.status==="presymptomatic");
}

function isPersonUnknownForAnyCondition(p) {
  return (p.condition_states||[]).some(s=>s.status==="unknown");
}

function unknownConditionsForPerson(p) {
  return (family.conditions||[]).filter(c=>conditionStateForPerson(p,c.id).status==="unknown");
}

function carrierConditionsForPerson(p) {
  return (family.conditions||[]).filter(c => {
    const s=conditionStateForPerson(p,c.id);
    return s.status==="carrier" && ["autosomal_recessive","x_linked_recessive"].includes(c.inheritance);
  });
}

function affectedConditionsForPerson(p) {
  return (family.conditions||[]).filter(c=>conditionStateForPerson(p,c.id).status==="affected");
}

function normalizeLayoutOverrides(
  value,
  people
) {
  const validUids =
    new Set(
      (people || [])
        .map(p =>
          String(
            p.uid || ""
          ).trim()
        )
        .filter(Boolean)
    );

  const source =
    value &&
    typeof value === "object"
      ? value
      : {};

  const rawBranchOrder =
    source.branch_order &&
    typeof source.branch_order === "object"
      ? source.branch_order
      : {};

  const branchOrder = {};

  Object.entries(rawBranchOrder)
    .forEach(([generation,anchors]) => {
      if (!Array.isArray(anchors)) {
        return;
      }

      const clean =
        [...new Set(
          anchors
            .map(uid =>
              String(uid || "").trim()
            )
            .filter(uid =>
              uid &&
              (
                !validUids.size ||
                validUids.has(uid)
              )
            )
        )];

      if (clean.length >= 2) {
        branchOrder[
          String(generation)
        ] = clean;
      }
    });

  const rawGenerationFloor =
    source.generation_floor &&
    typeof source.generation_floor === "object"
      ? source.generation_floor
      : {};

  const generationFloor = {};

  Object.entries(rawGenerationFloor)
    .forEach(([uid,value]) => {
      const cleanUid =
        String(uid || "").trim();

      const numeric =
        Number(value);

      if (
        !cleanUid ||
        (
          validUids.size &&
          !validUids.has(cleanUid)
        ) ||
        !Number.isInteger(numeric) ||
        numeric < 0
      ) {
        return;
      }

      generationFloor[cleanUid] =
        numeric;
    });

  // 0.8.67: desplazamientos horizontales voluntarios respecto al
  // resultado automático. No guardamos píxeles de pantalla ni generación.
  const rawManualX = source.manual_x && typeof source.manual_x === "object"
    ? source.manual_x : {};
  const manualX = {};
  Object.entries(rawManualX).forEach(([uid,value]) => {
    const x = Number(value);
    if (validUids.has(uid) && Number.isFinite(x) && Math.abs(x) >= 0.5) {
      manualX[uid] = Math.max(-10000,Math.min(10000,x));
    }
  });

  return {
    branch_order:branchOrder,
    generation_floor:generationFloor,
    manual_x:manualX,
    sibling_visual_order:Object.fromEntries(
      Object.entries(source.sibling_visual_order && typeof source.sibling_visual_order === "object"
        ? source.sibling_visual_order : {})
      .filter(([uid,rank])=>validUids.has(uid) && Number.isInteger(Number(rank))
        && Number(rank)>=0 && Number(rank)<10000)
      .map(([uid,rank])=>[uid,Number(rank)])
    ),
    // 4.16: preferencias visuales de generación (independientes del nacimiento).
    generation_visual_order:Object.fromEntries(
      Object.entries(source.generation_visual_order && typeof source.generation_visual_order === "object"
        ? source.generation_visual_order : {})
      .filter(([gen,order])=>/^(0|[1-9]\d*)$/.test(gen) && Number(gen)<=100
        && Array.isArray(order))
      .map(([gen,order])=>[gen,[...new Set(order.filter(uid=>typeof uid==="string" && validUids.has(uid)))].slice(0,1000)])
      .filter(([gen,order])=>order.length>0)
    )
  };
}


function synchronizeAffectedFromConditions(
  p,
  hasPedigreeConditions
) {
  if (!p) return p;

  if (
    hasPedigreeConditions &&
    supportsPedigreeConditions(p)
  ) {
    p.affected =
      isPersonAffectedByAnyCondition(p);

    if (
      p.clinical &&
      typeof p.clinical === "object"
    ) {
      p.clinical.phenotype_status =
        p.affected
          ? "affected"
          : "unaffected";
    }
  } else if (
    supportsPedigreeConditions(p)
  ) {
    /*
     * Sin condiciones del pedigree no existe ya un control manual de
     * "Afectado". Los registros nuevos quedan como no afectados.
     * El fallback legacy de importaciones antiguas se conserva solo
     * mientras no se edite el registro.
     */
    p.affected = !!p.affected;
  }

  return p;
}


function normalizeFamily(data) {
  if (!data || !Array.isArray(data.people)) return data;

  data.schema_version = "4.19";

  // <=4.0: la numeración I-1, II-1... siempre era visible.
  // Por compatibilidad, cualquier JSON sin esta opción conserva ese comportamiento.
  data.show_pedigree_numbers =
    data.show_pedigree_numbers !== false;

  // <=4.7: no existía el comentario general del pedigree.
  data.pedigree_comments = String(data.pedigree_comments || "");

  // 4.12: revisión general persistente del pedigree.
  const reviewStatus =
    (
      data.review_status &&
      typeof data.review_status === "object"
    )
      ? data.review_status
      : {};

  data.review_status = {
    reviewed:
      reviewStatus.reviewed === true,
    reviewed_at:
      reviewStatus.reviewed === true
        ? String(
            reviewStatus.reviewed_at || ""
          )
        : "",
    reviewed_signature:
      reviewStatus.reviewed === true
        ? String(reviewStatus.reviewed_signature || "")
        : ""
  };

  // <=4.1: no existía orden manual de ramas.
  data.layout_overrides =
    normalizeLayoutOverrides(
      data.layout_overrides,
      data.people
    );

  data.conditions = Array.isArray(data.conditions) ? data.conditions.map(normalizeCondition) : [];

  data.relationships = Array.isArray(data.relationships) ? data.relationships : [];
  data.relationships.forEach(r => {
    if (r.type === "gestation") {
      r.carrier = String(r.carrier || "");
      r.target = String(r.target || "");
    }
    if (r.type === "union") {
      r.intergenerational = !!r.intergenerational;
      r.consanguineous = !!r.consanguineous;
      r.consanguinity_degree = String(r.consanguinity_degree || "");
      r.relationship_status = ["ended","separated","divorced"].includes(r.relationship_status)
        ? "ended"
        : "current";
      r.reproductive_status = ["none","no_children","infertility"].includes(r.reproductive_status)
        ? r.reproductive_status
        : "none";
      r.reproductive_attribution =
        r.reproductive_attribution === "union" ||
        (r.people || []).includes(r.reproductive_attribution)
          ? r.reproductive_attribution
          : "union";
      r.reproductive_reason = String(r.reproductive_reason || "");
    }
  });

  // Compatibilidad con los JSON del piloto 0.2, donde el identificador
  // visible (I-1, II-2...) era también el identificador interno.
  const needsMigration = data.people.some(p => !p.uid && p.id);

  if (!needsMigration) {
    data.people = data.people.map(p => {
      const recordTypeValue = p.record_type || "person";
      const grouped = recordTypeValue === "multiple";
      const fetus = recordTypeValue === "fetus";
      const stillbirth = recordTypeValue === "stillbirth";
      const fetalEvent = fetus || stillbirth;
      const donor = ["sperm_donor","ovum_donor"].includes(
        recordTypeValue
      );
      const gestationalCarrier =
        recordTypeValue === "gestational_carrier";

      const clinical =
        normalizeClinicalData(p);

      return {
        ...p,
        record_type:recordTypeValue,
        brief_info:
          (
            recordTypeValue === "person" ||
            donor ||
            gestationalCarrier ||
            ["multiple","fetus","stillbirth","sab","top","ect"].includes(recordTypeValue)
          )
            ? String(p.brief_info || "").trim()
            : "",
        gender:gestationalCarrier
          ? "woman"
          : (fetalEvent
              ? (["man","woman","unspecified"].includes(p.gender)
                  ? p.gender
                  : "unspecified")
              : (p.gender || "unspecified")),
        sex_at_birth:
          (fetalEvent || gestationalCarrier)
            ? ""
            : (p.sex_at_birth || ""),
        multiple_count:grouped
          ? normalizedMultipleCount(p)
          : null,
        donation_targets: donor ? donationTargetUids(p) : [],
        donation_target: isSurrogateOvumDonor(p)
          ? (donationTargetUid(p) || null) : null,
        gestation_target:gestationalCarrier
          ? (String(p.gestation_target || "").trim() || null)
          : null,
        surrogate:
          recordTypeValue === "ovum_donor" &&
          p.surrogate === true,
        age: supportsQuickAge(p) && normalizedBirthYear(p.birth_year) === null
          ? (p.age ?? null) : null,
        birth_year: supportsQuickAge(p) ? normalizedBirthYear(p.birth_year) : null,
        gestational_age_weeks:p.gestational_age_weeks ?? null,
        intended_parent_uids:intendedParentUids(p),
        notes:String(p.notes || ""),
        family_history_unknown:
          (grouped || fetalEvent || donor || gestationalCarrier)
            ? false
            : !!p.family_history_unknown,
        adoption_status:
          recordTypeValue === "person" && p.adoption_status === "out"
            ? "out"
            : "none",
        reproductive_status:
          !grouped &&
          !fetalEvent &&
          !donor &&
          !gestationalCarrier &&
          ["none","no_children","infertility"].includes(p.reproductive_status)
            ? p.reproductive_status
            : "none",
        reproductive_reason:
          (grouped || fetalEvent || donor || gestationalCarrier)
            ? ""
            : String(p.reproductive_reason || ""),
        condition_states:
          supportsPedigreeConditions(p)
            ? normalizeConditionStates(p)
            : [],
        affected:
          (grouped || donor || gestationalCarrier)
            ? false
            : clinical.phenotype_status === "affected",
        consultand:
          (grouped || fetalEvent || donor || gestationalCarrier)
            ? false
            : !!p.consultand,
        proband:
          (grouped || fetalEvent || donor || gestationalCarrier)
            ? false
            : !!p.proband,
        deceased:
          (grouped || fetalEvent || gestationalCarrier)
            ? false
            : !!p.deceased,
        clinical
      };
    });

    data.people =
      data.people.map(p =>
        synchronizeAffectedFromConditions(
          p,
          data.conditions.length > 0
        )
      );

    data.layout_overrides =
      normalizeLayoutOverrides(
        data.layout_overrides,
        data.people
      );

    return data;
  }

  const idMap = new Map();
  data.people.forEach((p, i) => {
    if (p.id) idMap.set(p.id, "P" + (i + 1));
  });

  data.people = data.people.map((p, i) => {
    const clinical = normalizeClinicalData(p);
    return {
      uid:p.uid || idMap.get(p.id) || ("P" + (i + 1)),
      record_type:p.record_type || "person",
      label:p.label || "",
      brief_info:
        (
          (p.record_type || "person") === "person" ||
          [
            "multiple","fetus","stillbirth","sab","top","ect",
            "sperm_donor","ovum_donor","gestational_carrier"
          ].includes(p.record_type || "person")
        )
          ? String(p.brief_info || "").trim()
          : "",
      gender:
        (p.record_type || "person") === "gestational_carrier"
          ? "woman"
          : (["fetus","stillbirth"].includes(p.record_type || "person")
              ? (["man","woman","unspecified"].includes(p.gender)
                  ? p.gender
                  : "unspecified")
              : (p.gender || "unspecified")),
      sex_at_birth:
        ["fetus","stillbirth","gestational_carrier"]
          .includes(p.record_type || "person")
          ? ""
          : (p.sex_at_birth || ""),
      multiple_count:
        (p.record_type || "person") === "multiple"
          ? normalizedMultipleCount(p)
          : null,
      donation_targets:
        ["sperm_donor","ovum_donor"].includes(p.record_type || "person")
          ? donationTargetUids(p) : [],
      donation_target:
        isSurrogateOvumDonor(p) ? (donationTargetUid(p) || null) : null,
      gestation_target:
        (p.record_type || "person") === "gestational_carrier"
          ? (String(p.gestation_target || "").trim() || null)
          : null,
      surrogate:
        (p.record_type || "person") === "ovum_donor" &&
        p.surrogate === true,
      affected:
        ["multiple","gestational_carrier"].includes(p.record_type || "person")
          ? false
          : clinical.phenotype_status === "affected",
      consultand:
        ["multiple","fetus","stillbirth","gestational_carrier"].includes(p.record_type || "person")
          ? false
          : !!p.consultand,
      proband:
        ["multiple","fetus","stillbirth","gestational_carrier"].includes(p.record_type || "person")
          ? false
          : !!p.proband,
      deceased:
        ["multiple","fetus","stillbirth","gestational_carrier"].includes(p.record_type || "person")
          ? false
          : !!p.deceased,
      family_history_unknown:
        ["multiple","fetus","stillbirth","gestational_carrier"].includes(p.record_type || "person")
          ? false
          : !!p.family_history_unknown,
      adoption_status:
        (p.record_type || "person") === "person" && p.adoption_status === "out"
          ? "out"
          : "none",
      reproductive_status:
        !["multiple","fetus","stillbirth","gestational_carrier"].includes(p.record_type || "person") &&
        ["none","no_children","infertility"].includes(p.reproductive_status)
          ? p.reproductive_status
          : "none",
      reproductive_reason:
        ["multiple","fetus","stillbirth","gestational_carrier"].includes(p.record_type || "person")
          ? ""
          : String(p.reproductive_reason || ""),
      birth_order:p.birth_order ?? null,
      generation_override:p.generation_override ?? null,
      age: supportsQuickAge(p) && normalizedBirthYear(p.birth_year) === null
        ? (p.age ?? null) : null,
      birth_year: supportsQuickAge(p) ? normalizedBirthYear(p.birth_year) : null,
      gestational_age_weeks:p.gestational_age_weeks ?? null,
      intended_parent_uids:intendedParentUids(p).map(uid => idMap.get(uid) || uid),
      notes:String(p.notes || ""),
      condition_states:
        supportsPedigreeConditions(p)
          ? normalizeConditionStates(p)
          : [],
      clinical
    };
  });

  data.relationships = (data.relationships || []).map(r => {
    if (r.type === "union") {
      return {
        type: "union",
        people: (r.people || []).map(x => idMap.get(x) || x),
        intergenerational: !!r.intergenerational,
        consanguineous: !!r.consanguineous,
        consanguinity_degree: String(r.consanguinity_degree || ""),
        relationship_status: ["ended","separated","divorced"].includes(r.relationship_status)
          ? "ended"
          : "current",
        reproductive_status: ["none","no_children","infertility"].includes(r.reproductive_status)
          ? r.reproductive_status
          : "none",
        reproductive_attribution:
          r.reproductive_attribution === "union" ||
          (r.people || []).includes(idMap.get(r.reproductive_attribution) || r.reproductive_attribution)
            ? (idMap.get(r.reproductive_attribution) || r.reproductive_attribution)
            : "union",
        reproductive_reason: String(r.reproductive_reason || "")
      };
    }

    if (r.type === "gestation") {
      return {
        type:"gestation",
        carrier:idMap.get(r.carrier) || r.carrier,
        target:idMap.get(r.target) || r.target
      };
    }

    if (r.type === "parentage") {
      return {
        type: "parentage",
        parents: (r.parents || []).map(x => idMap.get(x) || x),
        children: (r.children || []).map(x => idMap.get(x) || x),
        descent_type: r.descent_type === "adoptive" ? "adoptive" : "biological"
      };
    }

    if (r.type === "sibling") {
      return {
        type: "sibling",
        members: (r.members || []).map(x => idMap.get(x) || x)
      };
    }

    if (r.type === "twin") {
      return {
        type: "twin",
        members: (r.members || []).map(x => idMap.get(x) || x),
        zygosity: r.zygosity || "unknown"
      };
    }

    return r;
  });

  data.people =
    data.people.map(p =>
      synchronizeAffectedFromConditions(
        p,
        data.conditions.length > 0
      )
    );

  data.layout_overrides =
    normalizeLayoutOverrides(
      data.layout_overrides,
      data.people
    );

  return data;
}

function validate(data) {
  if (!data || !Array.isArray(data.people) || !Array.isArray(data.relationships)) {
    throw new Error(t("validation.family.structure"));
  }

  const uids = new Set();
  data.people.forEach(p => {
    if (!p.uid) throw new Error(t("validation.person.uidRequired"));
    if (uids.has(p.uid)) throw new Error("UID duplicado: " + p.uid);

    if (
      recordType(p) === "person" &&
      !["none","out"].includes(p.adoption_status || "none")
    ) {
      throw new Error(t("validation.person.adoptionState"));
    }

    if (recordType(p) === "multiple") {
      const count = normalizedMultipleCount(p);

      if (
        count !== "n" &&
        (!Number.isInteger(count) || count < 2)
      ) {
        throw new Error(
          t("validation.multiple.countField")
        );
      }

      p.multiple_count = count;

      if (p.affected || isClinicallyAffected(p)) {
        throw new Error(
          t("validation.multiple.affectedGroup")
        );
      }
    }

    if (isDonorRecord(p)) {
      const targets =
        donationTargetUids(p);

      if (!targets.length) {
        throw new Error(
          t("validation.donor.targetRequired")
        );
      }

      if (
        targets.includes(p.uid)
      ) {
        throw new Error(
          t("validation.donor.notSelf")
        );
      }

      if (isSurrogateOvumDonor(p) && targets.length > 1) {
        throw new Error(t("validation.ovumDonor.oneOutcome"));
      }
    }

    if (
      isSurrogateOvumDonor(p) &&
      !donationTargetUid(p)
    ) {
      throw new Error(
        t("validation.surrogate.pregnancyRequired")
      );
    }

    if (isGestationalCarrierRecord(p)) {
      const target = gestationTargetUid(p);

      if (!target) {
        throw new Error(
          t("validation.gestationalCarrier.pregnancyRequired")
        );
      }

      if (target === p.uid) {
        throw new Error(
          t("validation.gestationalCarrier.notSelf")
        );
      }
    }

    uids.add(p.uid);
  });

  // Los progenitores intencionales son una anotación explícita, no
  // sustituyen relaciones biológicas, gestacionales ni adoptivas.
  data.people.forEach(p => {
    const raw = Array.isArray(p.intended_parent_uids)
      ? p.intended_parent_uids : [];
    const ids = intendedParentUids(p);
    if (raw.length && !supportsIntendedParentage(p)) {
      throw new Error(t("validation.intendedParent.outcome"));
    }
    if (ids.length !== raw.length || ids.length > 2) {
      throw new Error(t("validation.intendedParent.maxTwo"));
    }
    for (const uid of ids) {
      const parent = data.people.find(other => other.uid === uid);
      if (!parent || recordType(parent) !== "person" || uid === p.uid) {
        throw new Error(t("validation.intendedParent.invalid"));
      }
    }
  });

  data.people.forEach(p => {
    if (!isDonorRecord(p)) return;

    donationTargetUids(p)
      .forEach(target => {
        const targetRecord =
          data.people.find(
            x => x.uid === target
          );

        if (
          !targetRecord ||
          ![
            "person",
            "fetus",
            "stillbirth",
            "sab",
            "top",
            "ect"
          ].includes(
            recordType(targetRecord)
          )
        ) {
          throw new Error(
            t("validation.donation.outcomeType")
          );
        }
      });
  });

  data.people.forEach(p => {
    if (!isGestationalCarrierRecord(p)) return;

    const target = gestationTargetUid(p);
    const targetRecord = data.people.find(x => x.uid === target);

    if (
      !targetRecord ||
      !["fetus","stillbirth","sab","top","ect"]
        .includes(recordType(targetRecord))
    ) {
      throw new Error(
        t("validation.gestationalCarrier.outcomeType")
      );
    }

    if (
      data.people.some(other =>
        other.uid !== p.uid &&
        isPregnancyCarrierRecord(other) &&
        pregnancyCarrierTargetUid(other) === target
      )
    ) {
      throw new Error(
        t("validation.pregnancy.oneCarrier")
      );
    }
  });

  data.people.forEach(p => {
    if (!isSurrogateOvumDonor(p)) return;

    const target = donationTargetUid(p);

    if (
      data.people.some(other =>
        other.uid !== p.uid &&
        isPregnancyCarrierRecord(other) &&
        pregnancyCarrierTargetUid(other) === target
      )
    ) {
      throw new Error(
        t("validation.pregnancy.oneCarrier")
      );
    }
  });

  const gestationTargets = new Set();
  data.relationships.forEach(r => {
    if (r.type === "gestation") {
      const carrier = data.people.find(p => p.uid === r.carrier);
      const target = data.people.find(p => p.uid === r.target);
      if (!canBeExplicitGestator(carrier)) {
        throw new Error(t("validation.gestation.afabRequired"));
      }
      if (!eligibleGestationOutcome(target) || r.carrier === r.target) {
        throw new Error(t("validation.gestation.outcomeRequired"));
      }
      if (gestationTargets.has(r.target)) {
        throw new Error(t("validation.gestation.duplicate"));
      }
      if (isAncestor(r.target,r.carrier,data.relationships)) {
        throw new Error(t("validation.gestation.cycle"));
      }
      if (data.people.some(p => isPregnancyCarrierRecord(p) &&
          pregnancyCarrierTargetUid(p) === r.target)) {
        throw new Error(t("validation.gestation.carrierConflict"));
      }
      gestationTargets.add(r.target);
    }
    if (r.type === "union") {
      (r.people || []).forEach(uid => {
        if (!uids.has(uid)) throw new Error(t("validation.relationship.personNotFound"));
      });

      if (!["none","no_children","infertility"].includes(r.reproductive_status || "none")) {
        throw new Error(t("validation.relationship.reproductiveStatus"));
      }

      if (
        r.reproductive_attribution &&
        r.reproductive_attribution !== "union" &&
        !(r.people || []).includes(r.reproductive_attribution)
      ) {
        throw new Error(t("validation.relationship.reproductiveAttribution"));
      }
    }

    if (r.type === "parentage") {
      (r.parents || []).concat(r.children || []).forEach(uid => {
        if (!uids.has(uid)) throw new Error(t("validation.relationship.personNotFound"));
      });

      if (!["biological", "adoptive"].includes(r.descent_type || "biological")) {
        throw new Error(t("validation.parentage.type"));
      }
    }

    if (r.type === "sibling") {
      (r.members || []).forEach(uid => {
        if (!uids.has(uid)) throw new Error(t("validation.sibling.personNotFound"));
      });
    }

    if (r.type === "twin") {
      const zygosity = r.zygosity || "unknown";
      const expectedMembers =
        zygosity === "trizygotic" ? 3 : 2;

      if (
        !Array.isArray(r.members) ||
        r.members.length !== expectedMembers
      ) {
        throw new Error(
          zygosity === "trizygotic"
            ? t("validation.triplets.cardinality")
            : t("validation.twins.cardinality")
        );
      }

      r.members.forEach(uid => {
        if (!uids.has(uid)) {
          throw new Error(
            t("validation.multipleGestation.personNotFound")
          );
        }
      });

      if (
        !["monozygotic","dizygotic","unknown","trizygotic"]
          .includes(zygosity)
      ) {
        throw new Error(
          t("validation.multipleGestation.type")
        );
      }
    }
  });
}

function generationMap() {
  const g = new Map();
  const fixed = new Set();

  const generationFloors =
    (
      family.layout_overrides &&
      family.layout_overrides.generation_floor &&
      typeof family.layout_overrides.generation_floor === "object"
    )
      ? family.layout_overrides.generation_floor
      : {};

  family.people.forEach(p => {
    const manual = Number.isInteger(p.generation_override) && p.generation_override >= 1
      ? p.generation_override - 1
      : null;

    if (manual !== null) {
      g.set(p.uid, manual);
      fixed.add(p.uid);
    } else {
      const floor =
        Number(
          generationFloors[p.uid]
        );

      g.set(
        p.uid,
        Number.isInteger(floor) &&
        floor >= 0
          ? floor
          : 0
      );
    }
  });

  const parentage = family.relationships.filter(r => r.type === "parentage");
  const donors = family.people.filter(
    p =>
      isDonorRecord(p) &&
      !isSurrogateOvumDonor(p) &&
      donationTargetUids(p).length
  );
  const gestationalCarriers = family.people.filter(
    p =>
      isPregnancyCarrierRecord(p) &&
      pregnancyCarrierTargetUid(p)
  );
  const explicitGestations = family.relationships.filter(r => r.type === "gestation");
  const unions = family.relationships.filter(r => r.type === "union");
  const siblings = family.relationships.filter(r => r.type === "sibling");
  const twins = family.relationships.filter(r => r.type === "twin");

  for (let pass = 0; pass < family.people.length * 4 + 8; pass++) {
    let changed = false;

    // Las parejas ordinarias deben representarse en la misma generación.
    // 0.8.59: una unión intergeneracional conserva la generación
    // genealógica propia de cada miembro.
    unions.forEach(r => {
      if (r.intergenerational) return;

      const members = (r.people || []).filter(uid => g.has(uid));
      if (members.length !== 2) return;

      const a = members[0];
      const b = members[1];
      const ga = g.get(a) || 0;
      const gb = g.get(b) || 0;

      if (fixed.has(a) && fixed.has(b)) {
        // Dos niveles manuales distintos se respetan: el usuario manda.
        return;
      }

      if (fixed.has(a) && !fixed.has(b)) {
        if (gb !== ga) {
          g.set(b, ga);
          changed = true;
        }
        return;
      }

      if (!fixed.has(a) && fixed.has(b)) {
        if (ga !== gb) {
          g.set(a, gb);
          changed = true;
        }
        return;
      }

      const wanted = Math.max(ga, gb);
      if (ga !== wanted) {
        g.set(a, wanted);
        changed = true;
      }
      if (gb !== wanted) {
        g.set(b, wanted);
        changed = true;
      }
    });

    // Los hermanos deben compartir generación.
    siblings.forEach(r => {
      const members = (r.members || []).filter(uid => g.has(uid));
      if (!members.length) return;

      const fixedMembers = members.filter(uid => fixed.has(uid));

      if (fixedMembers.length) {
        const wanted = g.get(fixedMembers[0]) || 0;
        members.forEach(uid => {
          if (!fixed.has(uid) && (g.get(uid) || 0) !== wanted) {
            g.set(uid, wanted);
            changed = true;
          }
        });
      } else {
        const wanted = Math.max(...members.map(uid => g.get(uid) || 0));
        members.forEach(uid => {
          if ((g.get(uid) || 0) !== wanted) {
            g.set(uid, wanted);
            changed = true;
          }
        });
      }
    });

    // Gemelos, trillizos, etc. deben permanecer en la misma generación.
    twins.forEach(r => {
      const members = (r.members || []).filter(uid => g.has(uid));
      if (members.length < 2) return;

      const fixedMembers = members.filter(uid => fixed.has(uid));

      if (fixedMembers.length) {
        const wanted = g.get(fixedMembers[0]) || 0;
        members.forEach(uid => {
          if (!fixed.has(uid) && (g.get(uid) || 0) !== wanted) {
            g.set(uid, wanted);
            changed = true;
          }
        });
      } else {
        const wanted = Math.max(...members.map(uid => g.get(uid) || 0));
        members.forEach(uid => {
          if ((g.get(uid) || 0) !== wanted) {
            g.set(uid, wanted);
            changed = true;
          }
        });
      }
    });

    // Un descendiente debe quedar al menos una generación por debajo
    // del progenitor situado más abajo.
    parentage.forEach(r => {
      const parents = (r.parents || []).filter(uid => g.has(uid));
      const children = (r.children || []).filter(uid => g.has(uid));
      if (!parents.length || !children.length) return;

      const pg = Math.max(...parents.map(uid => g.get(uid) || 0));
      const wantedChild = pg + 1;

      children.forEach(child => {
        if (fixed.has(child)) return;

        if ((g.get(child) || 0) < wantedChild) {
          g.set(child, wantedChild);
          changed = true;
        }
      });
    });

    // 0.8.66 — una gestación representada únicamente mediante G o
    // surrogate también determina una generación de descendencia.
    // Antes, si se retiraba la filiación biológica incorrecta (caso T30),
    // el embarazo podía quedar en la misma fila que la gestante.
    gestationalCarriers.forEach(carrier => {
      const target = pregnancyCarrierTargetUid(carrier);
      if (!target || !g.has(target) || !g.has(carrier.uid)) return;
      if (fixed.has(target)) return;
      const wanted = (g.get(carrier.uid) || 0) + 1;
      if ((g.get(target) || 0) < wanted) {
        g.set(target,wanted);
        changed = true;
      }
    });

    // Una gestación explícita también determina una generación inferior
    // aunque todavía no se haya registrado filiación genética.
    explicitGestations.forEach(rel => {
      if (!g.has(rel.carrier) || !g.has(rel.target) || fixed.has(rel.target)) return;
      const wanted = (g.get(rel.carrier) || 0) + 1;
      if ((g.get(rel.target) || 0) < wanted) {
        g.set(rel.target,wanted);
        changed = true;
      }
    });

    // El donante pertenece a la misma generación que la pareja receptora.
    // La filiación convencional se conserva en datos para inferir esa
    // generación, aunque luego se suprima visualmente para el resultado.
    donors.forEach(donor => {
      if (fixed.has(donor.uid)) return;

      const targets =
        donationTargetUids(donor)
          .filter(target =>
            g.has(target)
          );

      if (!targets.length) return;

      const parentGens = [];
      const fallbackGens = [];

      targets.forEach(target => {
        parentagesOf(target)
          .forEach(rel => {
            (rel.parents || [])
              .forEach(parentUid => {
                if (g.has(parentUid)) {
                  parentGens.push(
                    g.get(parentUid) || 0
                  );
                }
              });
          });

        fallbackGens.push(
          Math.max(
            0,
            (g.get(target) || 0)-1
          )
        );
      });

      const wanted =
        parentGens.length
          ? Math.max(...parentGens)
          : Math.max(...fallbackGens);

      if ((g.get(donor.uid) || 0) !== wanted) {
        g.set(donor.uid,wanted);
        changed = true;
      }
    });


    gestationalCarriers.forEach(carrier => {
      if (fixed.has(carrier.uid)) return;

      const inUnion = unions.some(r =>
        (r.people || []).includes(carrier.uid)
      );

      if (inUnion) return;

      const target = pregnancyCarrierTargetUid(carrier);
      if (!target || !g.has(target)) return;

      const parentGens = [];

      parentagesOf(target).forEach(rel => {
        (rel.parents || []).forEach(parentUid => {
          if (
            parentUid !== carrier.uid &&
            g.has(parentUid)
          ) {
            parentGens.push(g.get(parentUid) || 0);
          }
        });
      });

      const wanted = parentGens.length
        ? Math.max(...parentGens)
        : Math.max(0,(g.get(target) || 0)-1);

      if ((g.get(carrier.uid) || 0) !== wanted) {
        g.set(carrier.uid,wanted);
        changed = true;
      }
    });

    if (!changed) break;
  }

  return g;
}

function siblingOrderMap() {
  const order = new Map();

  family.relationships
    .filter(r => r.type === "parentage")
    .forEach(r => {
      const kids = (r.children || [])
        .map(personByUid)
        .filter(Boolean)
        .sort((a,b) => {
          const ao = Number.isFinite(a.birth_order) ? a.birth_order : 999999;
          const bo = Number.isFinite(b.birth_order) ? b.birth_order : 999999;
          return ao - bo || a.uid.localeCompare(b.uid, "es", {numeric:true});
        });

      kids.forEach((p,i) => order.set(p.uid, i));
    });

  family.relationships
    .filter(r => r.type === "sibling")
    .forEach(r => {
      const siblings = (r.members || [])
        .map(personByUid)
        .filter(Boolean)
        .sort((a,b) => {
          const ao = Number.isFinite(a.birth_order) ? a.birth_order : 999999;
          const bo = Number.isFinite(b.birth_order) ? b.birth_order : 999999;
          return ao - bo || a.uid.localeCompare(b.uid, "es", {numeric:true});
        });

      siblings.forEach((p,i) => {
        if (!order.has(p.uid)) order.set(p.uid, i);
      });
    });

  return order;
}


function orderExplicitSiblingGroupsWithinGeneration(people) {
  const ordered = [...people];

  if (ordered.length < 2) return ordered;

  const present = new Set(ordered.map(p => p.uid));
  const baselineIndex = new Map(
    ordered.map((p,index)=>[p.uid,index])
  );
  const adjacency = new Map(
    ordered.map(p => [p.uid,new Set()])
  );

  // ÚNICAMENTE una relación explícita "sibling" crea aquí una fratría.
  // Compartir generación, edad, posición o birth_order no crea vínculos.
  family.relationships
    .filter(r => r.type === "sibling")
    .forEach(r => {
      const members = [...new Set(r.members || [])]
        .filter(uid => present.has(uid));

      for (let i=0; i<members.length; i++) {
        for (let j=i+1; j<members.length; j++) {
          adjacency.get(members[i]).add(members[j]);
          adjacency.get(members[j]).add(members[i]);
        }
      }
    });

  const visited = new Set();
  const blocks = [];

  ordered.forEach(person => {
    if (visited.has(person.uid)) return;

    const stack = [person.uid];
    const members = [];
    visited.add(person.uid);

    while (stack.length) {
      const uid = stack.pop();
      members.push(uid);

      adjacency.get(uid).forEach(next => {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      });
    }

    // Dentro de la fratría conservamos la ordenación que ya había
    // calculado el motor (birth_order/uid y posteriores preferencias).
    members.sort(
      (a,b)=>
        baselineIndex.get(a) -
        baselineIndex.get(b)
    );

    blocks.push({
      members,
      anchor:Math.min(
        ...members.map(uid=>baselineIndex.get(uid))
      )
    });
  });

  // Cada fratría explícita es un bloque independiente.
  // Los individuos sin relación sibling son bloques de un solo miembro.
  blocks.sort((a,b)=>a.anchor-b.anchor);

  return blocks.flatMap(block =>
    block.members
      .map(personByUid)
      .filter(Boolean)
  );
}

function areUnion(uidA, uidB) {
  return family.relationships.some(r =>
    r.type === "union" &&
    sameSet(r.people || [], [uidA, uidB])
  );
}

function twinRelationFor(uidA, uidB) {
  return family.relationships.find(r =>
    r.type === "twin" &&
    (r.members || []).includes(uidA) &&
    (r.members || []).includes(uidB)
  ) || null;
}

function exactMultipleBirthRelation(memberUids) {
  return family.relationships.find(r =>
    r.type === "twin" &&
    sameSet(r.members || [], memberUids || [])
  ) || null;
}

function areTwins(uidA, uidB) {
  return !!twinRelationFor(uidA, uidB);
}

function siblingWeight(uid) {
  let weight = 0;

  family.relationships.forEach(r => {
    if (
      r.type === "parentage" &&
      (r.children || []).includes(uid)
    ) {
      weight += 2;
    }

    if (
      r.type === "sibling" &&
      (r.members || []).includes(uid)
    ) {
      weight += 1;
    }

    if (
      r.type === "twin" &&
      (r.members || []).includes(uid)
    ) {
      weight += 2;
    }
  });

  return weight;
}

function relationshipPairType(uidA, uidB) {
  if (areTwins(uidA, uidB)) return "twin";
  if (areUnion(uidA, uidB)) return "union";
  return null;
}


function stabilizeTwoPartnerUnions(
  people,
  baselinePeople=null
) {
  let arr = [...people];

  const baseline =
    Array.isArray(baselinePeople) &&
    baselinePeople.length
      ? baselinePeople
      : people;

  const baselineIndex =
    new Map(
      baseline.map(
        (p,index) => [
          p.uid,
          index
        ]
      )
    );

  const familyOrderAnchor =
    members => {
      const indices =
        (members || [])
          .filter(uid =>
            baselineIndex.has(uid)
          )
          .map(uid =>
            baselineIndex.get(uid)
          );

      if (!indices.length) {
        return Infinity;
      }

      return (
        indices.reduce(
          (a,b) => a+b,
          0
        ) /
        indices.length
      );
    };

  const orderedOriginMembers =
    uid => {
      const members =
        originSibshipMembersForLayout(
          uid
        );

      return [...new Set(members)]
        .filter(member =>
          arr.some(
            p => p.uid === member
          )
        )
        .sort((a,b) => {
          const pa =
            personByUid(a);

          const pb =
            personByUid(b);

          const ao =
            pa &&
            Number.isFinite(
              pa.birth_order
            )
              ? pa.birth_order
              : 999999;

          const bo =
            pb &&
            Number.isFinite(
              pb.birth_order
            )
              ? pb.birth_order
              : 999999;

          if (ao !== bo) {
            return ao-bo;
          }

          const ai =
            baselineIndex.has(a)
              ? baselineIndex.get(a)
              : 999999;

          const bi =
            baselineIndex.has(b)
              ? baselineIndex.get(b)
              : 999999;

          return (
            ai-bi ||
            a.localeCompare(
              b,
              "es",
              {numeric:true}
            )
          );
        });
    };

  family.people.forEach(person => {
    const unionRelations =
      family.relationships
        .filter(r =>
          r.type === "union" &&
          !r.intergenerational &&
          (r.people || []).length === 2 &&
          (r.people || []).includes(person.uid)
        )
        .filter(r => {
          const other =
            r.people[0] === person.uid
              ? r.people[1]
              : r.people[0];

          return arr.some(
            p => p.uid === other
          );
        });

    const uniquePartners =
      [...new Set(
        unionRelations.map(r =>
          r.people[0] === person.uid
            ? r.people[1]
            : r.people[0]
        )
      )];

    if (uniquePartners.length !== 2) {
      return;
    }

    const shared =
      arr.find(
        p => p.uid === person.uid
      );

    if (!shared) {
      return;
    }

    /*
     * 0.8.59 — caso clave:
     * una de las dos parejas pertenece a otra fratría/familia de origen
     * representada y la otra no.
     *
     * El componente de tres personas NO se inserta donde aparezca primero
     * uno de sus miembros. En su lugar reconstruimos también las dos
     * fratrías afectadas y las dejamos enfrentadas por sus bordes internos.
     *
     * Familia izquierda:
     *
     *   hermanos...  pareja-local  HUB — PAREJA-CROSS  ...hermanos
     *
     * Si la otra familia está a la izquierda, se usa la imagen especular.
     */
    const crossPartners =
      uniquePartners.filter(uid =>
        isCrossFamilyUnionForLayout(
          person.uid,
          uid
        )
      );

    if (crossPartners.length === 1) {
      const crossUid =
        crossPartners[0];

      const localUid =
        uniquePartners.find(
          uid => uid !== crossUid
        );

      const hubFamily =
        orderedOriginMembers(
          person.uid
        );

      const crossFamily =
        orderedOriginMembers(
          crossUid
        );

      const localOrigin =
        originSibshipMembersForLayout(
          localUid
        );

      /*
       * Aplicamos esta regla sólo cuando realmente hay dos fratrías
       * representadas. La pareja local puede ser un individuo externo
       * aislado o compartir origen con el HUB; no debe introducir una
       * tercera fratría independiente.
       */
      const localHasIndependentSibship =
        localOrigin.length >= 2 &&
        !shareRepresentedOrigin(
          person.uid,
          localUid
        );

      if (
        hubFamily.length >= 2 &&
        crossFamily.length >= 2 &&
        !localHasIndependentSibship
      ) {
        const hubFamilySet =
          new Set(hubFamily);

        const crossFamilySet =
          new Set(crossFamily);

        /*
         * Seguridad: si por una topología excepcional ambas fratrías
         * comparten miembros, dejamos actuar al algoritmo general.
         */
        const overlap =
          [...hubFamilySet]
            .some(uid =>
              crossFamilySet.has(uid)
            );

        if (!overlap) {
          const hubFamilyIsLeft =
            familyOrderAnchor(
              hubFamily
            ) <=
            familyOrderAnchor(
              crossFamily
            );

          const hubOthers =
            hubFamily.filter(
              uid => uid !== person.uid
            );

          const crossOthers =
            crossFamily.filter(
              uid => uid !== crossUid
            );

          const blockUids =
            hubFamilyIsLeft
              ? [
                  ...hubOthers,
                  localUid,
                  person.uid,
                  crossUid,
                  ...crossOthers
                ]
              : [
                  ...crossOthers,
                  crossUid,
                  person.uid,
                  localUid,
                  ...hubOthers
                ];

          const affected =
            new Set(
              blockUids
            );

          const affectedIndices =
            arr
              .map((p,index) =>
                affected.has(p.uid)
                  ? index
                  : null
              )
              .filter(index =>
                index !== null
              );

          if (affectedIndices.length) {
            const minIndex =
              Math.min(
                ...affectedIndices
              );

            const insertAt =
              arr
                .slice(
                  0,
                  minIndex
                )
                .filter(p =>
                  !affected.has(p.uid)
                )
                .length;

            const peopleByUid =
              new Map(
                arr.map(p => [
                  p.uid,
                  p
                ])
              );

            const rebuilt =
              blockUids
                .map(uid =>
                  peopleByUid.get(uid)
                )
                .filter(Boolean);

            arr =
              arr.filter(p =>
                !affected.has(p.uid)
              );

            arr.splice(
              insertAt,
              0,
              ...rebuilt
            );

            return;
          }
        }
      }
    }

    /*
     * Fallback general para dos parejas cuando no existe el patrón
     * "dos fratrías enfrentadas" anterior.
     *
     * Conservamos la lógica de 0.8.38: primera pareja en su lado previo,
     * segunda pareja al lado contrario del individuo compartido.
     */
    const involved =
      new Set([
        person.uid,
        ...uniquePartners
      ]);

    const positions =
      arr
        .map((p,i) =>
          involved.has(p.uid)
            ? i
            : null
        )
        .filter(i =>
          i !== null
        );

    if (!positions.length) {
      return;
    }

    const insertAt =
      Math.min(
        ...positions
      );

    const firstUnion =
      unionRelations[0];

    const firstPartnerUid =
      firstUnion.people[0] ===
      person.uid
        ? firstUnion.people[1]
        : firstUnion.people[0];

    const secondPartnerUid =
      uniquePartners.find(
        uid =>
          uid !== firstPartnerUid
      );

    const firstPartner =
      arr.find(
        p =>
          p.uid ===
          firstPartnerUid
      );

    const secondPartner =
      arr.find(
        p =>
          p.uid ===
          secondPartnerUid
      );

    if (
      !firstPartner ||
      !secondPartner
    ) {
      return;
    }

    const sharedBaselineIndex =
      baselineIndex.has(person.uid)
        ? baselineIndex.get(person.uid)
        : null;

    const firstBaselineIndex =
      baselineIndex.has(firstPartnerUid)
        ? baselineIndex.get(firstPartnerUid)
        : null;

    let orderedTriple;

    if (
      Number.isInteger(
        sharedBaselineIndex
      ) &&
      Number.isInteger(
        firstBaselineIndex
      ) &&
      sharedBaselineIndex !==
        firstBaselineIndex
    ) {
      const firstPartnerWasRight =
        firstBaselineIndex >
        sharedBaselineIndex;

      orderedTriple =
        firstPartnerWasRight
          ? [
              secondPartner,
              shared,
              firstPartner
            ]
          : [
              firstPartner,
              shared,
              secondPartner
            ];
    } else {
      const firstPartnerWasRight =
        firstUnion.people[0] ===
        person.uid;

      orderedTriple =
        firstPartnerWasRight
          ? [
              secondPartner,
              shared,
              firstPartner
            ]
          : [
              firstPartner,
              shared,
              secondPartner
            ];
    }

    arr =
      arr.filter(p =>
        !involved.has(p.uid)
      );

    arr.splice(
      insertAt,
      0,
      ...orderedTriple
    );
  });

  return arr;
}

function stabilizeMultiPartnerUnions(people) {
  let arr = [...people];

  // Solo actuamos sobre "estrellas" claras: una persona con >=3 parejas
  // presentes en la misma generación. Es un caso raro y se trata de forma
  // conservadora para no alterar topologías más complejas.
  const hubs = family.people
    .map(person => {
      const partners = family.relationships
        .filter(r =>
          r.type === "union" &&
          (r.people || []).length === 2 &&
          (r.people || []).includes(person.uid)
        )
        .map(r => r.people[0] === person.uid ? r.people[1] : r.people[0])
        .filter(uid => arr.some(p => p.uid === uid));

      return {
        uid: person.uid,
        partners: [...new Set(partners)]
      };
    })
    .filter(item =>
      item.partners.length >= 3 &&
      arr.some(p => p.uid === item.uid)
    )
    .sort((a,b) =>
      b.partners.length - a.partners.length ||
      arr.findIndex(p => p.uid === a.uid) -
      arr.findIndex(p => p.uid === b.uid)
    );

  const claimed = new Set();

  hubs.forEach(hub => {
    if (claimed.has(hub.uid)) return;

    const members = new Set([hub.uid, ...hub.partners]);

    // Si dos hubs complejos se solapan, no intentamos resolver ese caso
    // automáticamente en esta versión.
    if ([...members].some(uid => claimed.has(uid))) return;

    const existing = arr
      .filter(p => members.has(p.uid))
      .map(p => p.uid);

    if (existing.length !== hub.partners.length + 1) return;

    const partnerPeople = hub.partners
      .map(uid => arr.find(p => p.uid === uid))
      .filter(Boolean)
      .sort((a,b) =>
        arr.findIndex(p => p.uid === a.uid) -
        arr.findIndex(p => p.uid === b.uid)
      );

    const shared = arr.find(p => p.uid === hub.uid);
    if (!shared) return;

    const positions = arr
      .map((p,i) => members.has(p.uid) ? i : null)
      .filter(i => i !== null);

    const insertAt = Math.min(...positions);

    // Repartimos las parejas a ambos lados del individuo común.
    // Para 3 parejas: 1 | HUB | 2
    // Para 4 parejas: 2 | HUB | 2
    const leftCount = Math.floor(partnerPeople.length / 2);
    const left = partnerPeople.slice(0,leftCount);
    const right = partnerPeople.slice(leftCount);

    arr = arr.filter(p => !members.has(p.uid));
    arr.splice(insertAt,0,...left,shared,...right);

    members.forEach(uid => claimed.add(uid));
  });

  return arr;
}


function knownParentSetKeys(uid) {
  return [...new Set(
    parentagesOf(uid)
      .filter(r => (r.parents || []).length)
      .map(r => normalizedParentSetKey(r.parents || []))
      .filter(Boolean)
  )];
}

function explicitSiblingGroupKeys(uid) {
  return family.relationships
    .filter(r =>
      r.type === "sibling" &&
      (r.members || []).includes(uid) &&
      (r.members || []).length >= 2
    )
    .map(r =>
      "SIB:" + [...new Set(r.members || [])]
        .sort()
        .join("|")
    );
}

function originGroupKeys(uid) {
  const parentKeys = knownParentSetKeys(uid);

  // Si conocemos los progenitores, esa filiación es la referencia más
  // fuerte para la familia de origen.
  if (parentKeys.length) return parentKeys;

  // Si no hay padres representados, una relación explícita de hermanos
  // sigue definiendo una fratría/familia de origen visual válida.
  return [...new Set(explicitSiblingGroupKeys(uid))];
}

function explicitSiblingAnchor(uid,pos) {
  const groups = family.relationships
    .filter(r =>
      r.type === "sibling" &&
      (r.members || []).includes(uid) &&
      (r.members || []).length >= 2
    );

  const anchors = [];

  groups.forEach(r => {
    const xs = (r.members || [])
      .filter(member => pos.has(member))
      .map(member => pos.get(member).x);

    if (xs.length) {
      anchors.push(
        xs.reduce((a,b)=>a+b,0) / xs.length
      );
    }
  });

  if (!anchors.length) return null;

  return anchors.reduce((a,b)=>a+b,0) / anchors.length;
}

function originAnchor(uid,pos) {
  const pAnchor = parentAnchor(uid,pos);
  if (pAnchor !== null) return pAnchor;

  return explicitSiblingAnchor(uid,pos);
}

function isCrossFamilyUnionForLayout(a,b) {
  const setsA = originGroupKeys(a);
  const setsB = originGroupKeys(b);

  // Si alguno no tiene ninguna familia/fratría de origen representada,
  // mantenemos el comportamiento habitual.
  if (!setsA.length || !setsB.length) return false;

  // Si comparten la misma familia de origen, no son dos bloques
  // independientes a efectos de layout.
  const shareOrigin = setsA.some(key => setsB.includes(key));

  return !shareOrigin;
}


function unionCountForLayout(uid) {
  return family.relationships.filter(r =>
    r.type === "union" &&
    !r.intergenerational &&
    (r.people || []).length === 2 &&
    (r.people || []).includes(uid)
  ).length;
}


/*
 * T19d — componente rígido de uniones múltiples.
 *
 * Una cadena/estrella de uniones múltiples es una unidad horizontal propia.
 * Conocer después la ascendencia de uno de sus miembros NO debe romper la
 * configuración de esas uniones ni separar a sus miembros. La filiación
 * superior se adapta al bloque; el bloque no se reconstruye por esa filiación.
 */
function multipleUnionComponentMapForLayout() {
  const unions = family.relationships
    .filter(r =>
      r.type === "union" &&
      !r.intergenerational &&
      (r.people || []).length === 2
    );

  const adjacency = new Map();

  unions.forEach(r => {
    const [a,b] = r.people;

    if (!adjacency.has(a)) adjacency.set(a,new Set());
    if (!adjacency.has(b)) adjacency.set(b,new Set());

    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  });

  const visited = new Set();
  const result = new Map();

  adjacency.forEach((_,start) => {
    if (visited.has(start)) return;

    const stack = [start];
    const members = [];
    visited.add(start);

    while (stack.length) {
      const uid = stack.pop();
      members.push(uid);

      (adjacency.get(uid) || new Set())
        .forEach(next => {
          if (!visited.has(next)) {
            visited.add(next);
            stack.push(next);
          }
        });
    }

    const set = new Set(members);
    const componentEdges = unions
      .filter(r =>
        set.has(r.people[0]) &&
        set.has(r.people[1])
      );

    const hasMultipleMember = members
      .some(uid =>
        (adjacency.get(uid) || new Set()).size >= 2
      );

    if (
      componentEdges.length < 2 ||
      !hasMultipleMember
    ) {
      return;
    }

    const key = members
      .slice()
      .sort()
      .join("|");

    members.forEach(uid =>
      result.set(uid,key)
    );
  });

  return result;
}

function sameMultipleUnionComponentForLayout(
  a,
  b,
  componentMap=null
) {
  const map =
    componentMap ||
    multipleUnionComponentMapForLayout();

  const ka = map.get(a);
  const kb = map.get(b);

  return !!ka && ka === kb;
}

function isMultipleUnionRelationForLayout(
  relation,
  componentMap=null
) {
  if (
    !relation ||
    relation.type !== "union" ||
    (relation.people || []).length !== 2
  ) {
    return false;
  }

  return sameMultipleUnionComponentForLayout(
    relation.people[0],
    relation.people[1],
    componentMap
  );
}

function shareRepresentedOrigin(a,b) {
  const originA = originGroupKeys(a);
  const originB = originGroupKeys(b);

  if (!originA.length || !originB.length) return false;

  return originA.some(key => originB.includes(key));
}

function simpleMaleFemaleUnionOrder(a,b) {
  if (!areUnion(a,b)) return null;
  if (areTwins(a,b)) return null;

  // Parejas con varias uniones se dejan al motor complejo.
  if (
    unionCountForLayout(a) !== 1 ||
    unionCountForLayout(b) !== 1
  ) {
    return null;
  }

  // Si ambos pertenecen a la misma fratría/familia de origen
  // representada, el orden de nacimiento de hermanos tiene prioridad.
  if (shareRepresentedOrigin(a,b)) return null;

  // Parejas de dos familias distintas se resuelven con la heurística
  // cross-family, donde la legibilidad puede exigir invertir el orden.
  if (isCrossFamilyUnionForLayout(a,b)) return null;

  const pa = personByUid(a);
  const pb = personByUid(b);

  if (!pa || !pb) return null;

  if (pa.gender === "man" && pb.gender === "woman") {
    return [a,b];
  }

  if (pa.gender === "woman" && pb.gender === "man") {
    return [b,a];
  }

  return null;
}

function makeRelationshipBlocks(people) {
  const original = [...people];
  const present = new Set(original.map(p => p.uid));
  const index = new Map(original.map((p, i) => [p.uid, i]));
  const adjacency = new Map(original.map(p => [p.uid, new Set()]));
  const multiUnionMap =
    multipleUnionComponentMapForLayout();

  family.relationships.forEach(r => {
    let pair = null;

    if (r.type === "union" && (r.people || []).length === 2) {
      const [a,b] = r.people;

      if (
        !isCrossFamilyUnionForLayout(a,b) ||
        sameMultipleUnionComponentForLayout(
          a,
          b,
          multiUnionMap
        )
      ) {
        pair = r.people;
      }
    } else if (r.type === "twin" && (r.members || []).length >= 2) {
      const members = (r.members || [])
        .filter(uid => present.has(uid));

      for (let i=1; i<members.length; i++) {
        adjacency.get(members[i-1]).add(members[i]);
        adjacency.get(members[i]).add(members[i-1]);
      }

      return;
    }

    if (!pair || !present.has(pair[0]) || !present.has(pair[1])) return;

    adjacency.get(pair[0]).add(pair[1]);
    adjacency.get(pair[1]).add(pair[0]);
  });

  const visited = new Set();
  const components = [];

  original.forEach(p => {
    if (visited.has(p.uid)) return;

    const stack = [p.uid];
    const members = [];
    visited.add(p.uid);

    while (stack.length) {
      const uid = stack.pop();
      members.push(uid);

      adjacency.get(uid).forEach(next => {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      });
    }

    components.push(members);
  });

  function orderComponent(members) {
    if (members.length <= 1) return members;

    if (members.length === 2) {
      const preferredUnionOrder =
        simpleMaleFemaleUnionOrder(members[0],members[1]);

      if (preferredUnionOrder) {
        return preferredUnionOrder;
      }
    }

    const local = new Set(members);
    const degrees = members.map(uid =>
      [...adjacency.get(uid)].filter(x => local.has(x)).length
    );

    // En nuestros bloques habituales (pareja, gemelos, gemelos con parejas)
    // el grafo es una cadena. La recorremos de extremo a extremo.
    if (Math.max(...degrees) <= 2) {
      const endpoints = members
        .filter(uid =>
          [...adjacency.get(uid)].filter(x => local.has(x)).length <= 1
        )
        .sort((a, b) => (index.get(a) || 0) - (index.get(b) || 0));

      const start = endpoints[0] || members[0];
      const ordered = [];
      let previous = null;
      let current = start;

      while (current !== null) {
        ordered.push(current);

        const next = [...adjacency.get(current)]
          .filter(x => local.has(x) && x !== previous && !ordered.includes(x))
          .sort((a, b) => (index.get(a) || 0) - (index.get(b) || 0))[0];

        previous = current;
        current = next === undefined ? null : next;
      }

      if (ordered.length === members.length) return ordered;
    }

    return [...members].sort(
      (a, b) => (index.get(a) || 0) - (index.get(b) || 0)
    );
  }

  const orderedComponents = components
    .map(members => ({
      members: orderComponent(members),
      minIndex: Math.min(...members.map(uid => index.get(uid)))
    }))
    .sort((a, b) => a.minIndex - b.minIndex);

  const result = [];

  orderedComponents.forEach(component => {
    component.members.forEach(uid => {
      const p = personByUid(uid);
      if (p) result.push(p);
    });
  });

  return result;
}



function connectFamilyBlock(adjacency, a, b) {
  if (!adjacency.has(a) || !adjacency.has(b) || a === b) return;
  adjacency.get(a).add(b);
  adjacency.get(b).add(a);
}

function generationFamilyBlocks(arr) {
  const ordered = [...arr];
  const present = new Set(ordered.map(p => p.uid));
  const adjacency = new Map(ordered.map(p => [p.uid, new Set()]));
  const multiUnionMap =
    multipleUnionComponentMapForLayout();

  const connectCompatible = (a,b) => {
    const ka = multiUnionMap.get(a);
    const kb = multiUnionMap.get(b);

    // Un componente de uniones múltiples es atómico: una fratría/origen
    // externo no puede absorber uno solo de sus miembros.
    if (ka || kb) {
      if (!ka || ka !== kb) return;
    }

    connectFamilyBlock(
      adjacency,
      a,
      b
    );
  };

  family.relationships.forEach(r => {
    if (r.type === "union" && (r.people || []).length === 2) {
      const [a,b] = r.people;

      if (
        present.has(a) &&
        present.has(b) &&
        (
          !isCrossFamilyUnionForLayout(a,b) ||
          sameMultipleUnionComponentForLayout(
            a,
            b,
            multiUnionMap
          )
        )
      ) {
        connectFamilyBlock(adjacency,a,b);
      }
    }

    if (r.type === "twin" && (r.members || []).length >= 2) {
      const members = (r.members || [])
        .filter(uid => present.has(uid));

      for (let i=1; i<members.length; i++) {
        connectCompatible(
          members[i-1],
          members[i]
        );
      }
    }

    if (r.type === "sibling") {
      const members = (r.members || []).filter(uid => present.has(uid));
      for (let i=1; i<members.length; i++) {
        connectCompatible(
        members[i-1],
        members[i]
      );
      }
    }

    if (r.type === "parentage") {
      const children = (r.children || []).filter(uid => present.has(uid));
      for (let i=1; i<children.length; i++) {
        connectFamilyBlock(adjacency,children[i-1],children[i]);
      }
    }
  });

  // Fratría visual mixta:
  // si varios hijos dependen de la MISMA pareja pero la filiación de cada
  // uno está almacenada en relaciones separadas (p. ej. un hijo biológico
  // y otro adoptivo), deben mantener el espaciado normal de hermanos.
  //
  // Solo agrupamos aquí a individuos con una única filiación conocida.
  // Si un adoptado tiene simultáneamente padres biológicos y adoptivos
  // representados, no fusionamos ambas familias en un único megabloque.
  const soleParentSetGroups = new Map();

  ordered.forEach(person => {
    const rels = parentagesOf(person.uid)
      .filter(r => (r.parents || []).length);

    if (rels.length !== 1) return;

    const key = normalizedParentSetKey(rels[0].parents || []);
    if (!key) return;

    if (!soleParentSetGroups.has(key)) {
      soleParentSetGroups.set(key, []);
    }

    soleParentSetGroups.get(key).push(person.uid);
  });

  soleParentSetGroups.forEach(members => {
    for (let i=1; i<members.length; i++) {
      connectCompatible(
        members[i-1],
        members[i]
      );
    }
  });

  const visited = new Set();
  const blocks = [];

  ordered.forEach(person => {
    if (visited.has(person.uid)) return;

    const stack = [person.uid];
    const members = new Set();
    visited.add(person.uid);

    while (stack.length) {
      const uid = stack.pop();
      members.add(uid);

      adjacency.get(uid).forEach(next => {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      });
    }

    // Mantener el orden horizontal ya calculado en la fila.
    blocks.push(
      ordered
        .filter(p => members.has(p.uid))
        .map(p => p.uid)
    );
  });

  return blocks;
}

function branchOrderOverrides() {
  if (
    !family.layout_overrides ||
    typeof family.layout_overrides !==
      "object"
  ) {
    family.layout_overrides = {
      branch_order:{},
      generation_floor:{}
    };
  }

  if (
    !family.layout_overrides.branch_order ||
    typeof family.layout_overrides.branch_order !==
      "object"
  ) {
    family.layout_overrides.branch_order =
      {};
  }

  if (
    !family.layout_overrides.generation_floor ||
    typeof family.layout_overrides.generation_floor !==
      "object"
  ) {
    family.layout_overrides.generation_floor =
      {};
  }

  return family.layout_overrides.branch_order;
}

function generationFloorOverrides() {
  branchOrderOverrides();

  return family.layout_overrides
    .generation_floor;
}

function shiftManualBranchOrdersForInsertedGeneration() {
  const current =
    branchOrderOverrides();

  const shifted = {};

  Object.entries(current)
    .forEach(([generation,anchors]) => {
      const numeric =
        Number(generation);

      if (
        !Number.isInteger(numeric) ||
        !Array.isArray(anchors)
      ) {
        return;
      }

      shifted[
        String(numeric + 1)
      ] = [...anchors];
    });

  family.layout_overrides
    .branch_order =
      shifted;
}

/*
 * 0.8.59 — insertar una nueva generación superior.
 *
 * Si se añaden progenitores a un individuo que actualmente está en
 * Generación I, no desplazamos únicamente esa rama. Guardamos como suelo
 * de generación la posición actual + 1 para TODO el pedigree ya existente,
 * dejando a los nuevos progenitores en la nueva Generación I.
 *
 * Ejemplo:
 *   antes: I-7 + resto de fundadores en I
 *   después: nuevos padres en I; todo el árbol previo pasa a II, III, IV...
 *
 * Este dato es puramente de layout y vive en layout_overrides.
 */
function prepareTopGenerationInsertion(
  parentUids,
  childUids
) {
  const parents =
    new Set(
      (parentUids || [])
        .filter(Boolean)
    );

  const children =
    [...new Set(
      (childUids || [])
        .filter(Boolean)
    )];

  if (
    !parents.size ||
    !children.length
  ) {
    return false;
  }

  const before =
    generationMap();

  const needsInsertion =
    children.some(uid =>
      before.has(uid) &&
      before.get(uid) === 0
    );

  if (!needsInsertion) {
    return false;
  }

  const floors =
    generationFloorOverrides();

  family.people.forEach(person => {
    if (parents.has(person.uid)) {
      floors[person.uid] = 0;
      return;
    }

    const current =
      before.has(person.uid)
        ? before.get(person.uid)
        : 0;

    floors[person.uid] =
      Math.max(
        0,
        current + 1
      );

    if (
      Number.isInteger(
        person.generation_override
      ) &&
      person.generation_override >= 1
    ) {
      person.generation_override =
        Math.min(
          20,
          person.generation_override + 1
        );
    }
  });

  shiftManualBranchOrdersForInsertedGeneration();

  return true;
}

function prepareGenerationInsertionForRelation(
  a,
  bs,
  type
) {
  const targets =
    [...new Set(
      (bs || [])
        .filter(Boolean)
    )];

  if (
    !a ||
    !targets.length
  ) {
    return false;
  }

  if (
    type === "child" ||
    type === "adoptive_child" ||
    type === "adopted_out_child"
  ) {
    return prepareTopGenerationInsertion(
      targets,
      [a]
    );
  }

  if (
    type === "parent" ||
    type === "adoptive_parent"
  ) {
    return prepareTopGenerationInsertion(
      [a],
      targets
    );
  }

  return false;
}

function manualBranchOrderForGeneration(
  gen
) {
  const value =
    branchOrderOverrides()[
      String(gen)
    ];

  return Array.isArray(value)
    ? value.filter(Boolean)
    : [];
}

function generationHasManualBranchOrder(
  gen
) {
  return (
    manualBranchOrderForGeneration(gen)
      .length >= 2
  );
}

function manualBranchRank(
  memberUids,
  gen
) {
  const order =
    manualBranchOrderForGeneration(
      gen
    );

  if (!order.length) {
    return null;
  }

  let best = null;

  order.forEach((uid,index) => {
    if (
      (memberUids || [])
        .includes(uid)
    ) {
      best =
        best === null
          ? index
          : Math.min(
              best,
              index
            );
    }
  });

  return best;
}

function manualBranchAnchorForMembers(
  memberUids,
  gen
) {
  const existing =
    manualBranchOrderForGeneration(gen)
      .find(uid =>
        (memberUids || [])
          .includes(uid)
      );

  if (existing) {
    return existing;
  }

  return (memberUids || [])
    .slice()
    .sort((a,b) =>
      a.localeCompare(
        b,
        "es",
        {numeric:true}
      )
    )[0] || null;
}

function saveManualBranchOrder(
  gen,
  orderedBlocks
) {
  const anchors =
    (orderedBlocks || [])
      .map(block =>
        manualBranchAnchorForMembers(
          block.members || block,
          gen
        )
      )
      .filter(Boolean);

  if (anchors.length < 2) {
    delete branchOrderOverrides()[
      String(gen)
    ];
    return;
  }

  branchOrderOverrides()[
    String(gen)
  ] = anchors;
}

function clearManualBranchOrder(
  gen
) {
  delete branchOrderOverrides()[
    String(gen)
  ];
}

function pruneManualBranchOrders() {
  family.layout_overrides =
    normalizeLayoutOverrides(
      family.layout_overrides,
      family.people
    );
}

function applyManualBranchOrderToBlocks(
  blocks,
  gen
) {
  if (
    !generationHasManualBranchOrder(
      gen
    )
  ) {
    return blocks;
  }

  return [...blocks]
    .map((block,index) => ({
      ...block,
      manualOriginalIndex:
        Number.isFinite(
          block.originalIndex
        )
          ? block.originalIndex
          : index,
      manualRank:
        manualBranchRank(
          block.members || block,
          gen
        )
    }))
    .sort((a,b) => {
      const ar =
        a.manualRank;

      const br =
        b.manualRank;

      if (
        ar !== null &&
        br !== null
      ) {
        return (
          ar-br ||
          a.manualOriginalIndex-
          b.manualOriginalIndex
        );
      }

      /*
       * Si aparece una rama nueva después de haber guardado un override,
       * conservamos el orden automático entre ramas no reconocidas y las
       * situamos detrás de las ramas explicitamente ordenadas.
       */
      if (ar !== null) return -1;
      if (br !== null) return 1;

      return (
        a.manualOriginalIndex-
        b.manualOriginalIndex
      );
    });
}

function applyManualBranchOrderToGenerationPeople(
  gen,
  arr
) {
  if (
    !generationHasManualBranchOrder(
      gen
    ) ||
    !arr ||
    arr.length < 2
  ) {
    return arr;
  }

  const peopleByUid =
    new Map(
      arr.map(p => [
        p.uid,
        p
      ])
    );

  const blocks =
    generationFamilyBlocks(arr)
      .map((members,index) => ({
        members,
        originalIndex:index
      }));

  const orderedBlocks =
    applyManualBranchOrderToBlocks(
      blocks,
      gen
    );

  const result = [];

  orderedBlocks
    .forEach(block => {
      block.members
        .forEach(uid => {
          const person =
            peopleByUid.get(uid);

          if (person) {
            result.push(person);
          }
        });
    });

  /*
   * Seguridad para cualquier persona que no haya entrado en los bloques
   * por un caso excepcional.
   */
  arr.forEach(p => {
    if (
      !result.some(x =>
        x.uid === p.uid
      )
    ) {
      result.push(p);
    }
  });

  return result;
}


function parentAnchor(uid, pos) {
  const rels = family.relationships.filter(r =>
    r.type === "parentage" &&
    (r.children || []).includes(uid)
  );

  const anchors = [];

  rels.forEach(r => {
    const xs = (r.parents || [])
      .filter(parent => pos.has(parent))
      .map(parent => pos.get(parent).x);

    if (xs.length) {
      anchors.push(xs.reduce((a,b)=>a+b,0) / xs.length);
    }
  });

  if (!anchors.length) return null;
  return anchors.reduce((a,b)=>a+b,0) / anchors.length;
}

function blockGeometry(memberUids) {
  let x = 0;
  const offsets = [0];

  for (let i=1; i<memberUids.length; i++) {
    const prev = memberUids[i-1];
    const uid = memberUids[i];
    const pairType = relationshipPairType(prev,uid);

    x += pairType === "twin"
      ? C.twinGap
      : (pairType === "union" ? C.coupleGap : C.siblingGap);

    offsets.push(x);
  }

  const min = Math.min(...offsets);
  const max = Math.max(...offsets);
  const center = (min + max) / 2;

  return {
    relative: offsets.map(v => v-center),
    width: max-min
  };
}

function currentBlockCenter(memberUids,pos) {
  const xs = memberUids.filter(uid=>pos.has(uid)).map(uid=>pos.get(uid).x);
  if (!xs.length) return 0;
  return (Math.min(...xs)+Math.max(...xs))/2;
}

function desiredBlockCenter(memberUids,pos) {
  const multiUnionMap =
    multipleUnionComponentMapForLayout();

  if (
    memberUids.some(uid =>
      multiUnionMap.has(uid)
    )
  ) {
    return currentBlockCenter(
      memberUids,
      pos
    );
  }

  const anchors = memberUids
    .map(uid=>parentAnchor(uid,pos))
    .filter(x=>x!==null);

  if (!anchors.length) return currentBlockCenter(memberUids,pos);

  return anchors.reduce((a,b)=>a+b,0)/anchors.length;
}


function normalizedParentSetKey(parents) {
  return [...new Set((parents || []).slice().sort())].join("|");
}

function parentSetsForChild(uid) {
  return family.relationships
    .filter(r =>
      r.type === "parentage" &&
      (r.children || []).includes(uid) &&
      (r.parents || []).length
    )
    .map(r => [...new Set((r.parents || []).slice().sort())]);
}

function parentSetsForBlock(memberUids) {
  const seen = new Set();
  const result = [];

  memberUids.forEach(uid => {
    parentSetsForChild(uid).forEach(parentSet => {
      const key = normalizedParentSetKey(parentSet);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(parentSet);
      }
    });
  });

  return result;
}

function sameParentSet(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function shareAnyParent(a, b) {
  return a.some(value => b.includes(value));
}


function primaryParentSetForBlock(memberUids) {
  const sets = parentSetsForBlock(memberUids);

  // Solo imponemos territorio cuando el bloque tiene una filiación
  // inequívoca. Si ambos miembros de una pareja tienen ascendencia propia,
  // no forzamos el bloque hacia una de las dos familias.
  if (sets.length !== 1) return null;

  return sets[0];
}

function parentSetAnchor(parentSet, pos) {
  const xs = (parentSet || [])
    .filter(uid => pos.has(uid))
    .map(uid => pos.get(uid).x);

  if (!xs.length) return null;
  return xs.reduce((a,b)=>a+b,0) / xs.length;
}

function computeUnionTerritories(blocks, pos) {
  blocks.forEach(block => {
    block.minCenter = -Infinity;
    block.maxCenter = Infinity;
    block.primaryParentSet = primaryParentSetForBlock(block.members);
  });

  const bySharedParent = new Map();

  blocks.forEach(block => {
    const parentSet = block.primaryParentSet;
    if (!parentSet || parentSet.length !== 2) return;

    const anchor = parentSetAnchor(parentSet, pos);
    if (anchor === null) return;

    parentSet.forEach(parentUid => {
      if (!pos.has(parentUid)) return;

      if (!bySharedParent.has(parentUid)) {
        bySharedParent.set(parentUid, []);
      }

      bySharedParent.get(parentUid).push({
        block,
        parentSet,
        anchor
      });
    });
  });

  bySharedParent.forEach((entries, parentUid) => {
    const distinct = [];
    const seen = new Set();

    entries.forEach(entry => {
      const key = normalizedParentSetKey(entry.parentSet);
      if (seen.has(key)) return;
      seen.add(key);
      distinct.push(entry);
    });

    if (distinct.length < 2) return;

    distinct.sort((a,b)=>a.anchor-b.anchor);

    const padding = 12;

    distinct.forEach((entry, index) => {
      const block = entry.block;
      const half = block.width / 2;

      if (index > 0) {
        const left = distinct[index - 1];
        const boundary = (left.anchor + entry.anchor) / 2 + padding;
        block.minCenter = Math.max(block.minCenter, boundary + half);
      }

      if (index < distinct.length - 1) {
        const right = distinct[index + 1];
        const boundary = (entry.anchor + right.anchor) / 2 - padding;
        block.maxCenter = Math.min(block.maxCenter, boundary - half);
      }
    });
  });
}

function clampBlockCenter(block, value) {
  if (block.minCenter <= block.maxCenter) {
    return Math.max(
      block.minCenter,
      Math.min(block.maxCenter, value)
    );
  }

  // Si el bloque es demasiado ancho para el territorio disponible,
  // priorizamos el anclaje parental y dejamos que el algoritmo de
  // colisiones haga el ajuste mínimo necesario.
  return value;
}

function adjacentFamilyBlockGap(leftBlock, rightBlock) {
  const baseGap = C.symbolSize + 14;

  const leftSets = leftBlock.parentSets || [];
  const rightSets = rightBlock.parentSets || [];

  if (!leftSets.length || !rightSets.length) {
    return baseGap;
  }

  let gap = baseGap;
  let hasExactSameUnion = false;
  let hasSharedParentDifferentUnion = false;

  leftSets.forEach(leftSet => {
    rightSets.forEach(rightSet => {
      if (sameParentSet(leftSet, rightSet)) {
        hasExactSameUnion = true;
      } else if (shareAnyParent(leftSet, rightSet)) {
        hasSharedParentDifferentUnion = true;
      }
    });
  });

  // Distintas fratrías con progenitor común (medio hermanos o hijos
  // de distintas uniones de un mismo individuo) necesitan más aire
  // para que los grupos queden separados visualmente.
  if (hasSharedParentDifferentUnion) {
    gap = Math.max(gap, C.siblingGap + 18);
  } else if (!hasExactSameUnion) {
    gap = Math.max(gap, C.siblingGap);
  }

  return gap;
}

function placeGenerationFamilyBlocks(gen,byGen,pos) {
  const arr = byGen.get(gen);
  if (!arr || !arr.length) return;

  let blocks = generationFamilyBlocks(arr).map((members,index)=>{
    const geometry = blockGeometry(members);

    return {
      members,
      relative: geometry.relative,
      width: geometry.width,
      desired: desiredBlockCenter(members,pos),
      parentSets: parentSetsForBlock(members),
      originalIndex: index
    };
  });

  if (
    generationHasManualBranchOrder(
      gen
    )
  ) {
    blocks =
      applyManualBranchOrderToBlocks(
        blocks,
        gen
      );
  } else {
    blocks.sort((a,b)=>
      a.desired-b.desired ||
      a.originalIndex-b.originalIndex
    );
  }

  computeUnionTerritories(blocks,pos);

  // Posición inicial: anclaje parental limitado por el territorio
  // reservado para esa unión.
  blocks.forEach(block=>{
    block.center = clampBlockCenter(block,block.desired);
  });

  // Pasada izquierda -> derecha: resolver colisiones respetando,
  // siempre que sea posible, el territorio de cada unión.
  for (let i=1;i<blocks.length;i++) {
    const left = blocks[i-1];
    const block = blocks[i];
    const requiredGap = adjacentFamilyBlockGap(left,block);

    const minimum =
      left.center +
      left.width/2 +
      requiredGap +
      block.width/2;

    if (block.center < minimum) {
      block.center = clampBlockCenter(block,minimum);
    }
  }

  // Pasada derecha -> izquierda para recuperar anclajes que hayan
  // sido empujados en exceso.
  for (let i=blocks.length-2;i>=0;i--) {
    const block = blocks[i];
    const right = blocks[i+1];
    const requiredGap = adjacentFamilyBlockGap(block,right);

    const maximum =
      right.center -
      right.width/2 -
      requiredGap -
      block.width/2;

    if (block.center > maximum) {
      block.center = clampBlockCenter(block,maximum);
    }
  }

  // Seguridad final: nunca permitimos solapamiento físico entre bloques,
  // incluso si un caso extremo supera el territorio ideal.
  for (let i=1;i<blocks.length;i++) {
    const left = blocks[i-1];
    const block = blocks[i];
    const requiredGap = adjacentFamilyBlockGap(left,block);

    const minimum =
      left.center +
      left.width/2 +
      requiredGap +
      block.width/2;

    if (block.center < minimum) {
      block.center = minimum;
    }
  }

  blocks.forEach(block=>{
    block.members.forEach((uid,i)=>{
      const point = pos.get(uid);
      if (point) {
        point.x = block.center + block.relative[i];
      }
    });
  });
}


function orderedSubset(order,members) {
  const set = new Set(members || []);
  return order.filter(uid => set.has(uid));
}

function preservesFamilySiblingOrder(originalOrder,candidateOrder) {
  const groups = [];

  family.relationships.forEach(r => {
    if (r.type === "parentage" && (r.children || []).length >= 2) {
      groups.push(r.children || []);
    }

    if (r.type === "sibling" && (r.members || []).length >= 2) {
      groups.push(r.members || []);
    }
  });

  return groups.every(members => {
    const before = orderedSubset(originalOrder,members);
    const after = orderedSubset(candidateOrder,members);

    if (before.length < 2 || after.length < 2) return true;
    return before.join("|") === after.join("|");
  });
}



function siblingOrderGroups() {
  const groups = [];
  const seen = new Set();

  family.relationships.forEach(r => {
    let members = null;

    if (r.type === "parentage" && (r.children || []).length >= 2) {
      members = r.children || [];
    } else if (r.type === "sibling" && (r.members || []).length >= 2) {
      members = r.members || [];
    }

    if (!members) return;

    const orderedMembers = [...new Set(members)]
      .map(personByUid)
      .filter(Boolean)
      .sort((a,b)=>{
        const ao = Number.isFinite(a.birth_order) ? a.birth_order : 999999;
        const bo = Number.isFinite(b.birth_order) ? b.birth_order : 999999;

        return ao-bo ||
          a.uid.localeCompare(b.uid,"es",{numeric:true});
      })
      .map(p=>p.uid);

    if (orderedMembers.length < 2) return;

    const key = orderedMembers.slice().sort().join("|");

    if (!seen.has(key)) {
      seen.add(key);
      groups.push(orderedMembers);
    }
  });

  return groups;
}

function siblingBirthOrderPenalty(candidateOrder) {
  const index = new Map(
    candidateOrder.map((uid,i)=>[uid,i])
  );

  let inversions = 0;

  siblingOrderGroups().forEach(group => {
    for (let i=0;i<group.length;i++) {
      for (let j=i+1;j<group.length;j++) {
        const left = index.get(group[i]);
        const right = index.get(group[j]);

        if (
          left !== undefined &&
          right !== undefined &&
          left > right
        ) {
          inversions += 1;
        }
      }
    }
  });

  return inversions;
}

function rankCrossFamilyCandidates(order,candidates,a,b,pos) {
  return [...candidates].sort((x,y)=>{
    const xInterleave =
      crossFamilySibshipInterleavingPenalty(x,a,b);
    const yInterleave =
      crossFamilySibshipInterleavingPenalty(y,a,b);

    // En un pedigree complejo prima que las dos fratrías no queden
    // intercaladas. Esta es la razón para relajar el orden visual.
    if (xInterleave !== yInterleave) {
      return xInterleave-yInterleave;
    }

    const xBirth = siblingBirthOrderPenalty(x);
    const yBirth = siblingBirthOrderPenalty(y);

    // Entre soluciones igual de claras, alteramos lo mínimo posible
    // el orden de nacimiento real.
    if (xBirth !== yBirth) return xBirth-yBirth;

    const xScore =
      crossFamilyUnionCandidateScore(order,x,a,b,pos);
    const yScore =
      crossFamilyUnionCandidateScore(order,y,a,b,pos);

    return xScore-yScore;
  });
}


function originSibshipMembersForLayout(uid) {
  const biological = parentageOf(uid,"biological");

  if (
    biological &&
    (biological.children || []).length >= 2
  ) {
    return [...new Set(biological.children || [])];
  }

  const anyParentage = parentageOf(uid);

  if (
    anyParentage &&
    (anyParentage.children || []).length >= 2
  ) {
    return [...new Set(anyParentage.children || [])];
  }

  const siblingRel = siblingGroupOf(uid);

  if (
    siblingRel &&
    (siblingRel.members || []).length >= 2
  ) {
    return [...new Set(siblingRel.members || [])];
  }

  return [uid];
}

function makeInnerEdgeCandidate(order,leftUid,rightUid) {
  const leftFamily = new Set(
    originSibshipMembersForLayout(leftUid)
      .filter(uid => order.includes(uid))
  );

  const rightFamily = new Set(
    originSibshipMembersForLayout(rightUid)
      .filter(uid => order.includes(uid))
  );

  leftFamily.add(leftUid);
  rightFamily.add(rightUid);

  // Una pareja cross-family no debería compartir miembros de fratría.
  // Si ocurre, no aplicamos esta optimización.
  for (const uid of leftFamily) {
    if (rightFamily.has(uid) && uid !== leftUid && uid !== rightUid) {
      return null;
    }
  }

  const affected = new Set([
    ...leftFamily,
    ...rightFamily
  ]);

  const affectedIndices = order
    .map((uid,index)=>affected.has(uid) ? index : null)
    .filter(index=>index !== null);

  if (!affectedIndices.length) return null;

  const minIndex = Math.min(...affectedIndices);

  // Los hermanos del miembro izquierdo se llevan hacia fuera a la
  // izquierda; los del miembro derecho hacia fuera a la derecha.
  // Entre hermanos desplazados conservamos su orden relativo actual.
  const leftOthers = order.filter(uid =>
    leftFamily.has(uid) && uid !== leftUid
  );

  const rightOthers = order.filter(uid =>
    rightFamily.has(uid) && uid !== rightUid
  );

  const block = [
    ...leftOthers,
    leftUid,
    rightUid,
    ...rightOthers
  ];

  const remaining = order.filter(uid => !affected.has(uid));

  const insertAt = order
    .slice(0,minIndex)
    .filter(uid => !affected.has(uid))
    .length;

  const candidate = [...remaining];
  candidate.splice(insertAt,0,...block);

  return candidate;
}

function makeInnerEdgeCandidates(order,a,b) {
  return [
    makeInnerEdgeCandidate(order,a,b),
    makeInnerEdgeCandidate(order,b,a)
  ].filter(Boolean);
}

function crossFamilySibshipInterleavingPenalty(candidateOrder,a,b) {
  const orientation = unionLeftRight(candidateOrder,a,b);
  const leftUid = orientation.leftUid;
  const rightUid = orientation.rightUid;

  const leftIndex = candidateOrder.indexOf(leftUid);
  const rightIndex = candidateOrder.indexOf(rightUid);

  if (
    leftIndex < 0 ||
    rightIndex < 0 ||
    leftIndex >= rightIndex
  ) {
    return 100000;
  }

  let penalty = 0;

  // Ideal:
  //
  //   [hermanos familia A] A — B [hermanos familia B]
  //
  // Cualquier hermano de A que quede a la derecha de A, o cualquier
  // hermano de B que quede a la izquierda de B, hace que las barras de
  // fratría tiendan a intercalarse/cruzarse.
  originSibshipMembersForLayout(leftUid).forEach(uid => {
    if (uid === leftUid) return;

    const index = candidateOrder.indexOf(uid);
    if (index > leftIndex) penalty += 1;
  });

  originSibshipMembersForLayout(rightUid).forEach(uid => {
    if (uid === rightUid) return;

    const index = candidateOrder.indexOf(uid);
    if (index >= 0 && index < rightIndex) penalty += 1;
  });

  return penalty;
}

function makeAdjacentCandidates(order,a,b) {
  const variants = [
    moveUidAfter(order,b,a),   // a-b, anclado en a
    moveUidBefore(order,a,b),  // a-b, anclado en b
    moveUidAfter(order,a,b),   // b-a, anclado en b
    moveUidBefore(order,b,a)   // b-a, anclado en a
  ];

  const unique = [];
  const seen = new Set();

  variants.forEach(candidate => {
    const key = candidate.join("|");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  });

  return unique;
}

function unionLeftRight(candidateOrder,a,b) {
  const ia = candidateOrder.indexOf(a);
  const ib = candidateOrder.indexOf(b);

  if (ia < 0 || ib < 0) {
    return {
      leftUid: a,
      rightUid: b
    };
  }

  return ia < ib
    ? {leftUid:a,rightUid:b}
    : {leftUid:b,rightUid:a};
}

function crossFamilyUnionOrientationPenalty(a,b,candidateOrder,pos) {
  const orientation = unionLeftRight(candidateOrder,a,b);
  const leftUid = orientation.leftUid;
  const rightUid = orientation.rightUid;

  let penalty = 0;

  const anchorA = originAnchor(a,pos);
  const anchorB = originAnchor(b,pos);

  // Regla principal:
  // si ambas familias de origen están representadas, el miembro cuya
  // fratría/ascendencia queda más a la izquierda debe quedar a la
  // izquierda de la pareja.
  if (
    anchorA !== null &&
    anchorB !== null &&
    Math.abs(anchorA-anchorB) > 1e-6
  ) {
    const expectedLeft = anchorA < anchorB ? a : b;

    if (leftUid !== expectedLeft) {
      penalty += 1000;
    }
  }

  // Regla secundaria:
  // si es una pareja hombre-mujer, preferimos hombre a la izquierda y
  // mujer a la derecha, pero solo como desempate suave.
  const leftPerson = personByUid(leftUid);
  const rightPerson = personByUid(rightUid);

  if (leftPerson && rightPerson) {
    if (leftPerson.gender === "woman" && rightPerson.gender === "man") {
      penalty += 15;
    }
  }

  return penalty;
}

function crossFamilyUnionCandidateScore(order,candidateOrder,a,b,pos) {
  return (
    crossFamilyUnionOrientationPenalty(a,b,candidateOrder,pos) * 10000 +
    orderDisplacement(order,candidateOrder)
  );
}

function moveUidAfter(order,uid,targetUid) {
  const next = order.filter(x => x !== uid);
  const targetIndex = next.indexOf(targetUid);

  if (targetIndex < 0) return [...order];

  next.splice(targetIndex+1,0,uid);
  return next;
}

function moveUidBefore(order,uid,targetUid) {
  const next = order.filter(x => x !== uid);
  const targetIndex = next.indexOf(targetUid);

  if (targetIndex < 0) return [...order];

  next.splice(targetIndex,0,uid);
  return next;
}

function orderDisplacement(original,candidate) {
  const index = new Map(original.map((uid,i)=>[uid,i]));

  return candidate.reduce(
    (sum,uid,i)=>sum+Math.abs((index.get(uid) ?? i)-i),
    0
  );
}

function crossFamilyUnionHasRepresentedSibship(
  relation
) {
  if (
    !relation ||
    relation.type !== "union" ||
    (relation.people || []).length !== 2
  ) {
    return false;
  }

  return relation.people
    .some(uid =>
      originSibshipMembersForLayout(uid)
        .length >= 2
    );
}


function compactCrossFamilySpouses(gen,byGen,pos) {
  const arr = byGen.get(gen);
  if (!arr || arr.length < 2) return;

  let order = [...arr]
    .sort((a,b)=>pos.get(a.uid).x-pos.get(b.uid).x)
    .map(p=>p.uid);

  const originalReference = [...order];

  const multiUnionMap =
    multipleUnionComponentMapForLayout();

  const relevantUnions = family.relationships
    .filter(r =>
      r.type === "union" &&
      (r.people || []).length === 2 &&
      r.people.every(uid => order.includes(uid)) &&
      isCrossFamilyUnionForLayout(r.people[0],r.people[1]) &&
      !isMultipleUnionRelationForLayout(
        r,
        multiUnionMap
      )
    );

  relevantUnions.forEach(r => {
    /*
     * 0.7.21:
     * si alguno de los miembros pertenece a una fratría representada,
     * NO acercamos artificialmente a la pareja. El orden de hermanos
     * permanece intacto y la relación se enrutará por debajo de la fila
     * cuando haya individuos entre ambos miembros.
     */
    if (
      crossFamilyUnionHasRepresentedSibship(
        r
      )
    ) {
      return;
    }

    const [a,b] = r.people;
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);

    if (ia < 0 || ib < 0) return;

    // Antes (0.6.20) se hacía return si ya eran adyacentes.
    // Eso impedía corregir una orientación mala A-B -> B-A.
    //
    // Ahora incluimos siempre:
    // - el orden actual
    // - candidatos adyacentes en ambas orientaciones
    const allAdjacentCandidates = [
      [...order],
      ...makeAdjacentCandidates(order,a,b),
      ...makeInnerEdgeCandidates(order,a,b)
    ]
      .filter(candidate => {
        const ca = candidate.indexOf(a);
        const cb = candidate.indexOf(b);

        return (
          ca >= 0 &&
          cb >= 0 &&
          Math.abs(ca-cb) === 1
        );
      });

    if (!allAdjacentCandidates.length) return;

    // Elimina duplicados antes de evaluar.
    const unique = [];
    const seen = new Set();

    allAdjacentCandidates.forEach(candidate => {
      const key = candidate.join("|");

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(candidate);
      }
    });

    // Primero localizamos la mejor solución estricta.
    const strictCandidates = unique
      .filter(candidate =>
        preservesFamilySiblingOrder(order,candidate)
      )
      .sort((x,y)=>{
        const xInterleave =
          crossFamilySibshipInterleavingPenalty(x,a,b);
        const yInterleave =
          crossFamilySibshipInterleavingPenalty(y,a,b);

        if (xInterleave !== yInterleave) {
          return xInterleave-yInterleave;
        }

        return (
          crossFamilyUnionCandidateScore(order,x,a,b,pos) -
          crossFamilyUnionCandidateScore(order,y,a,b,pos)
        );
      });

    // Si existe una solución que conserva birth order Y deja las dos
    // fratrías sin intercalar, no hay motivo para relajarlo.
    if (
      strictCandidates.length &&
      crossFamilySibshipInterleavingPenalty(
        strictCandidates[0],
        a,
        b
      ) === 0
    ) {
      order = strictCandidates[0];
      return;
    }

    /*
     * Si no existe una solución adyacente que preserve la estructura,
     * dejamos el orden como está. Ya no se relaja nunca el birth order
     * de una fratría para juntar físicamente a una pareja.
     *
     * Las uniones largas se resuelven geométricamente mediante el
     * enrutado inferior de relación, no alterando a los hermanos.
     */
    return;
  });

  if (order.join("|") === originalReference.join("|")) return;

  const oldXs = originalReference
    .map(uid=>pos.get(uid).x)
    .sort((a,b)=>a-b);

  const oldCenter =
    oldXs.reduce((a,b)=>a+b,0)/oldXs.length;

  const offsets = [0];

  for (let i=1;i<order.length;i++) {
    const prev = order[i-1];
    const current = order[i];
    const pairType = relationshipPairType(prev,current);

    offsets.push(
      offsets[i-1] +
      (pairType === "twin"
        ? C.twinGap
        : (pairType === "union" ? C.coupleGap : C.siblingGap))
    );
  }

  const rowWidth = offsets[offsets.length-1] || 0;
  const startX = oldCenter-rowWidth/2;

  order.forEach((uid,i)=>{
    const point = pos.get(uid);
    if (point) point.x=startX+offsets[i];
  });
}


function enforceCrossFamilyCoupleGap(gen,byGen,pos) {
  const arr = byGen.get(gen);
  if (!arr || arr.length < 2) return;

  const multiUnionMap =
    multipleUnionComponentMapForLayout();

  const relevantUnions = family.relationships.filter(r =>
    r.type === "union" &&
    (r.people || []).length === 2 &&
    r.people.every(uid => pos.has(uid)) &&
    (pos.get(r.people[0]).generation === gen) &&
    (pos.get(r.people[1]).generation === gen) &&
    isCrossFamilyUnionForLayout(r.people[0],r.people[1]) &&
    !isMultipleUnionRelationForLayout(
      r,
      multiUnionMap
    )
  );

  relevantUnions.forEach(r => {
    const ordered = [...arr]
      .sort((a,b)=>pos.get(a.uid).x-pos.get(b.uid).x)
      .map(p=>p.uid);

    const [a,b] = r.people;
    const ia = ordered.indexOf(a);
    const ib = ordered.indexOf(b);

    if (ia < 0 || ib < 0 || Math.abs(ia-ib) !== 1) return;

    const leftIndex = Math.min(ia,ib);
    const rightIndex = Math.max(ia,ib);
    const leftUid = ordered[leftIndex];
    const rightUid = ordered[rightIndex];

    const currentGap =
      pos.get(rightUid).x -
      pos.get(leftUid).x;

    const targetGap = C.coupleGap;

    if (currentGap >= targetGap - 0.5) return;

    const extra = targetGap-currentGap;
    const half = extra/2;

    // Abrimos exclusivamente la frontera entre las dos familias:
    // todo lo situado a la izquierda se desplaza junto hacia la izquierda
    // y todo lo situado a la derecha junto hacia la derecha.
    //
    // Así se conserva exactamente el espaciado interno de cada fratría.
    ordered.forEach((uid,index)=>{
      const point = pos.get(uid);
      if (!point) return;

      if (index <= leftIndex) {
        point.x -= half;
      } else if (index >= rightIndex) {
        point.x += half;
      }
    });
  });
}

function placeFamilyRowsTopDown(byGen,pos) {
  Array.from(byGen.keys())
    .sort((a,b)=>a-b)
    .forEach((gen,index)=>{
      if (index!==0) {
        placeGenerationFamilyBlocks(gen,byGen,pos);
      }

      // Después de colocar las familias de origen, aproximamos parejas
      // cross-family simples. Las cadenas/estrellas de uniones múltiples
      // son bloques rígidos y NO se reordenan al conocer una ascendencia
      // superior de uno de sus miembros (T19d).
      if (
        !generationHasManualBranchOrder(
          gen
        )
      ) {
        compactCrossFamilySpouses(
          gen,
          byGen,
          pos
        );
      }

      // La apertura del gap cross-family conserva el orden de la fila y
      // puede seguir aplicándose también con orden manual.
      enforceCrossFamilyCoupleGap(gen,byGen,pos);
    });
}


function descendantCenterForParentSet(parentUids,pos) {
  const parentKey =
    normalizedParentSetKey(parentUids || []);

  if (!parentKey) return null;

  const childUids = [];

  family.relationships
    .filter(r =>
      r.type === "parentage" &&
      normalizedParentSetKey(r.parents || []) === parentKey
    )
    .forEach(r => {
      (r.children || []).forEach(uid => {
        if (
          pos.has(uid) &&
          !childUids.includes(uid)
        ) {
          childUids.push(uid);
        }
      });
    });

  if (!childUids.length) return null;

  const xs = childUids
    .map(uid => pos.get(uid).x)
    .filter(Number.isFinite);

  if (!xs.length) return null;

  // El punto de caída de la descendencia debe intentar coincidir con
  // el centro geométrico de la barra que abarca a los hijos.
  return (
    Math.min(...xs) +
    Math.max(...xs)
  ) / 2;
}

/*
 * T19h — centro profundo de rama para ORDENACIÓN.
 *
 * El centrado geométrico de una pareja sigue usando a sus hijos directos:
 * eso es correcto para dibujar la caída a su fratría.
 *
 * Pero el ORDEN relativo entre ramas puede depender de generaciones
 * inferiores. Un hijo situado muy a la derecha puede tener a su vez una
 * fratría completa todavía más a la derecha, y esa información debe
 * influir al decidir si dos ramas están invertidas.
 *
 * Por tanto distinguimos:
 *
 *   desired  -> centro de hijos DIRECTOS (centrado visual)
 *   orderKey -> centro de descendencia TERMINAL/PROFUNDA (orden de ramas)
 */

function directChildrenForParentSet(
  parentUids,
  pos
) {
  const parentKey =
    normalizedParentSetKey(
      parentUids || []
    );

  if (!parentKey) return [];

  const result = [];

  family.relationships
    .filter(r =>
      r.type === "parentage" &&
      normalizedParentSetKey(
        r.parents || []
      ) === parentKey
    )
    .forEach(r => {
      (r.children || [])
        .forEach(uid => {
          if (
            pos.has(uid) &&
            !result.includes(uid)
          ) {
            result.push(uid);
          }
        });
    });

  return result;
}

function representedChildrenOfUid(
  uid,
  pos
) {
  const result = [];

  family.relationships
    .filter(r =>
      r.type === "parentage" &&
      (r.parents || []).includes(uid)
    )
    .forEach(r => {
      (r.children || [])
        .forEach(childUid => {
          if (
            pos.has(childUid) &&
            childUid !== uid &&
            !result.includes(childUid)
          ) {
            result.push(childUid);
          }
        });
    });

  return result;
}

function terminalDescendantXsFromUid(
  uid,
  pos,
  path=null
) {
  if (!pos.has(uid)) {
    return [];
  }

  const visited =
    path
      ? new Set(path)
      : new Set();

  if (visited.has(uid)) {
    return [
      pos.get(uid).x
    ];
  }

  visited.add(uid);

  const children =
    representedChildrenOfUid(
      uid,
      pos
    )
      .filter(childUid =>
        !visited.has(childUid)
      );

  if (!children.length) {
    return [
      pos.get(uid).x
    ];
  }

  const xs = [];

  children.forEach(childUid => {
    const branchXs =
      terminalDescendantXsFromUid(
        childUid,
        pos,
        visited
      );

    if (branchXs.length) {
      xs.push(...branchXs);
    } else if (pos.has(childUid)) {
      xs.push(
        pos.get(childUid).x
      );
    }
  });

  return xs.length
    ? xs
    : [pos.get(uid).x];
}

function deepDescendantCenterForParentSet(
  parentUids,
  pos
) {
  const children =
    directChildrenForParentSet(
      parentUids,
      pos
    );

  if (!children.length) {
    return null;
  }

  const xs = [];

  children.forEach(uid => {
    xs.push(
      ...terminalDescendantXsFromUid(
        uid,
        pos
      )
    );
  });

  const finite =
    xs.filter(Number.isFinite);

  if (!finite.length) {
    return null;
  }

  /*
   * Usamos el centro del ENVELOPE terminal, igual que el centro de barra
   * usado para hijos directos. Así una fratría numerosa no pesa más solo
   * por tener más individuos.
   */
  return (
    Math.min(...finite) +
    Math.max(...finite)
  ) / 2;
}

function deepDescendantCenterForBranchMembers(
  memberUids,
  pos
) {
  const members =
    new Set(memberUids || []);

  const roots = [];

  family.relationships
    .filter(r =>
      r.type === "parentage" &&
      (r.parents || []).length &&
      (r.parents || []).every(uid =>
        members.has(uid)
      )
    )
    .forEach(r => {
      (r.children || [])
        .forEach(uid => {
          if (
            pos.has(uid) &&
            !roots.includes(uid)
          ) {
            roots.push(uid);
          }
        });
    });

  if (!roots.length) {
    return null;
  }

  const xs = [];

  roots.forEach(uid => {
    xs.push(
      ...terminalDescendantXsFromUid(
        uid,
        pos
      )
    );
  });

  const finite =
    xs.filter(Number.isFinite);

  if (!finite.length) {
    return null;
  }

  return (
    Math.min(...finite) +
    Math.max(...finite)
  ) / 2;
}


function simpleUnionForBottomUpCentering(uid,gen,pos) {
  const unions = family.relationships.filter(r =>
    r.type === "union" &&
    (r.people || []).length === 2 &&
    (r.people || []).includes(uid)
  );

  // Las uniones múltiples requieren el enrutado específico existente.
  if (unions.length !== 1) return null;

  const union = unions[0];
  const [a,b] = union.people || [];

  if (!pos.has(a) || !pos.has(b)) return null;

  if (
    pos.get(a).generation !== gen ||
    pos.get(b).generation !== gen
  ) {
    return null;
  }

  if (
    unionCountForLayout(a) !== 1 ||
    unionCountForLayout(b) !== 1
  ) {
    return null;
  }

  return union;
}

/*
 * T17c — cadenas / componentes de múltiples uniones.
 *
 * Para cada unión con descendencia conocemos el centro geométrico de
 * sus hijos C. Queremos que el punto medio de la pareja coincida con C:
 *
 *      (xA + xB) / 2 = C
 *
 * o, equivalentemente:
 *
 *      xA + xB = 2*C
 *
 * Si varias uniones comparten personas, resolvemos TODAS esas ecuaciones
 * simultáneamente. Así funciona tanto:
 *
 *   A -- B -- C
 *
 * como:
 *
 *   A -- B -- C -- D
 *
 * y también estrellas de varias parejas alrededor de una persona común.
 *
 * Para componentes bipartitos (los habituales en estas cadenas), todas
 * las posiciones pueden expresarse como:
 *
 *      x_i = signo_i * t + constante_i
 *
 * Elegimos t minimizando el movimiento total respecto al layout actual,
 * pero lo limitamos al intervalo que conserva:
 *
 * - el orden horizontal ya resuelto;
 * - la separación mínima entre individuos consecutivos;
 * - las líneas de pareja sin colapsar.
 *
 * Las ecuaciones de centrado siguen cumpliéndose exactamente después de
 * limitar t, porque el parámetro libre desplaza alternativamente ambos
 * lados del componente.
 */

function unionDescendantCenter(
  union,
  pos
) {
  if (
    !union ||
    union.type !== "union" ||
    (union.people || []).length !== 2
  ) {
    return null;
  }

  return descendantCenterForParentSet(
    union.people,
    pos
  );
}

function descendantBearingUnionEdges(
  gen,
  pos
) {
  return family.relationships
    .filter(union =>
      union.type === "union" &&
      (union.people || []).length === 2
    )
    .map(union => {
      const [a,b] =
        union.people || [];

      if (
        !pos.has(a) ||
        !pos.has(b) ||
        pos.get(a).generation !== gen ||
        pos.get(b).generation !== gen
      ) {
        return null;
      }

      const center =
        unionDescendantCenter(
          union,
          pos
        );

      if (
        center === null ||
        !Number.isFinite(center)
      ) {
        return null;
      }

      return {
        union,
        a,
        b,
        center
      };
    })
    .filter(Boolean);
}

function unionEdgeComponents(
  edges
) {
  const byUid =
    new Map();

  edges.forEach(edge => {
    [edge.a,edge.b]
      .forEach(uid => {
        if (!byUid.has(uid)) {
          byUid.set(uid,[]);
        }

        byUid.get(uid).push(edge);
      });
  });

  const components = [];
  const visitedEdges =
    new Set();

  edges.forEach(startEdge => {
    if (
      visitedEdges.has(
        startEdge
      )
    ) {
      return;
    }

    const stack =
      [startEdge];

    const componentEdges = [];
    const componentUids =
      new Set();

    while (stack.length) {
      const edge =
        stack.pop();

      if (
        visitedEdges.has(edge)
      ) {
        continue;
      }

      visitedEdges.add(edge);
      componentEdges.push(edge);
      componentUids.add(edge.a);
      componentUids.add(edge.b);

      [edge.a,edge.b]
        .forEach(uid => {
          (byUid.get(uid) || [])
            .forEach(next => {
              if (
                !visitedEdges.has(next)
              ) {
                stack.push(next);
              }
            });
        });
    }

    components.push({
      edges:componentEdges,
      uids:[...componentUids]
    });
  });

  return components;
}

function multipleUnionComponentIsRelevant(
  component
) {
  if (
    !component ||
    component.edges.length < 2
  ) {
    return false;
  }

  const degree =
    new Map();

  component.edges
    .forEach(edge => {
      [edge.a,edge.b]
        .forEach(uid => {
          degree.set(
            uid,
            (degree.get(uid) || 0)+1
          );
        });
    });

  return [...degree.values()]
    .some(value =>
      value >= 2
    );
}

function symbolicMultipleUnionSolution(
  component
) {
  if (
    !component ||
    !component.edges.length
  ) {
    return null;
  }

  const adjacency =
    new Map(
      component.uids.map(uid => [
        uid,
        []
      ])
    );

  component.edges
    .forEach(edge => {
      adjacency.get(edge.a)
        .push({
          other:edge.b,
          center:edge.center
        });

      adjacency.get(edge.b)
        .push({
          other:edge.a,
          center:edge.center
        });
    });

  const root =
    component.uids[0];

  /*
   * x_root = 1*t + 0
   */
  const expr =
    new Map([
      [
        root,
        {sign:1,constant:0}
      ]
    ]);

  const queue =
    [root];

  let fixedT = null;

  while (queue.length) {
    const uid =
      queue.shift();

    const current =
      expr.get(uid);

    for (
      const link of
      adjacency.get(uid) || []
    ) {
      const predicted = {
        sign:-current.sign,
        constant:
          2*link.center-
          current.constant
      };

      if (
        !expr.has(link.other)
      ) {
        expr.set(
          link.other,
          predicted
        );

        queue.push(
          link.other
        );

        continue;
      }

      const existing =
        expr.get(link.other);

      if (
        existing.sign ===
        predicted.sign
      ) {
        /*
         * Un ciclo par con ecuaciones incompatibles no puede centrarse
         * exactamente. Dejamos el componente al layout anterior.
         */
        if (
          Math.abs(
            existing.constant-
            predicted.constant
          ) > 0.75
        ) {
          return null;
        }

        continue;
      }

      /*
       * Ciclo impar: la ecuación fija un valor concreto de t.
       */
      const denominator =
        existing.sign-
        predicted.sign;

      const candidateT =
        (
          predicted.constant-
          existing.constant
        ) /
        denominator;

      if (
        fixedT !== null &&
        Math.abs(
          fixedT-candidateT
        ) > 0.75
      ) {
        return null;
      }

      fixedT =
        candidateT;
    }
  }

  return {
    expr,
    fixedT
  };
}

function preferredMultipleUnionParameter(
  solution,
  component,
  pos
) {
  if (
    solution.fixedT !== null
  ) {
    return solution.fixedT;
  }

  let numerator = 0;
  let denominator = 0;

  component.uids
    .forEach(uid => {
      if (!pos.has(uid)) return;

      const expression =
        solution.expr.get(uid);

      if (!expression) return;

      const currentX =
        pos.get(uid).x;

      numerator +=
        expression.sign *
        (
          currentX-
          expression.constant
        );

      denominator +=
        expression.sign *
        expression.sign;
    });

  if (!denominator) {
    return 0;
  }

  /*
   * Valor de t que minimiza:
   *
   *   Σ (x_nuevo - x_actual)^2
   */
  return numerator/denominator;
}

function expressionForRowConstraint(
  uid,
  solution,
  pos
) {
  if (
    solution.expr.has(uid)
  ) {
    return solution.expr.get(uid);
  }

  if (!pos.has(uid)) {
    return null;
  }

  /*
   * Persona externa al componente: posición fija.
   */
  return {
    sign:0,
    constant:pos.get(uid).x
  };
}

function minimumRowSpacingForLayout(
  leftUid,
  rightUid
) {
  const pairType =
    relationshipPairType(
      leftUid,
      rightUid
    );

  if (
    pairType === "union"
  ) {
    return C.coupleGap;
  }

  if (
    pairType === "twin"
  ) {
    return C.twinGap;
  }

  return C.siblingGap;
}

function multipleUnionFeasibleParameterRange(
  solution,
  component,
  gen,
  pos
) {
  let minimum =
    -Infinity;

  let maximum =
    Infinity;

  const row =
    family.people
      .filter(p =>
        pos.has(p.uid) &&
        pos.get(p.uid).generation === gen
      )
      .sort((a,b) =>
        pos.get(a.uid).x-
        pos.get(b.uid).x
      );

  for (
    let i=1;
    i<row.length;
    i++
  ) {
    const leftUid =
      row[i-1].uid;

    const rightUid =
      row[i].uid;

    /*
     * Si ninguno pertenece al componente, la restricción no depende de t.
     */
    if (
      !solution.expr.has(leftUid) &&
      !solution.expr.has(rightUid)
    ) {
      continue;
    }

    const left =
      expressionForRowConstraint(
        leftUid,
        solution,
        pos
      );

    const right =
      expressionForRowConstraint(
        rightUid,
        solution,
        pos
      );

    if (!left || !right) {
      return null;
    }

    const required =
      minimumRowSpacingForLayout(
        leftUid,
        rightUid
      );

    /*
     * xR - xL >= required
     *
     * (sR-sL)t + (bR-bL) >= required
     */
    const coefficient =
      right.sign-left.sign;

    const constant =
      right.constant-
      left.constant;

    const rhs =
      required-constant;

    if (
      Math.abs(coefficient) <
      1e-9
    ) {
      if (
        constant <
        required-0.5
      ) {
        return null;
      }

      continue;
    }

    const boundary =
      rhs/coefficient;

    if (coefficient > 0) {
      minimum =
        Math.max(
          minimum,
          boundary
        );
    } else {
      maximum =
        Math.min(
          maximum,
          boundary
        );
    }

    if (
      minimum >
      maximum+0.5
    ) {
      return null;
    }
  }

  return {
    minimum,
    maximum
  };
}

function clampMultipleUnionParameter(
  value,
  range
) {
  if (!range) return null;

  let result = value;

  if (
    Number.isFinite(
      range.minimum
    )
  ) {
    result =
      Math.max(
        result,
        range.minimum
      );
  }

  if (
    Number.isFinite(
      range.maximum
    )
  ) {
    result =
      Math.min(
        result,
        range.maximum
      );
  }

  return result;
}

function applyMultipleUnionComponentCentering(
  component,
  gen,
  pos
) {
  if (
    !multipleUnionComponentIsRelevant(
      component
    )
  ) {
    return false;
  }

  const solution =
    symbolicMultipleUnionSolution(
      component
    );

  if (!solution) {
    return false;
  }

  const range =
    multipleUnionFeasibleParameterRange(
      solution,
      component,
      gen,
      pos
    );

  if (!range) {
    return false;
  }

  let parameter =
    preferredMultipleUnionParameter(
      solution,
      component,
      pos
    );

  if (
    solution.fixedT !== null
  ) {
    /*
     * Si un ciclo impar fija t, no podemos modificarlo sin dejar de
     * cumplir las ecuaciones de centrado.
     */
    if (
      parameter <
        range.minimum-0.5 ||
      parameter >
        range.maximum+0.5
    ) {
      return false;
    }
  } else {
    parameter =
      clampMultipleUnionParameter(
        parameter,
        range
      );
  }

  if (
    parameter === null ||
    !Number.isFinite(parameter)
  ) {
    return false;
  }

  const targets =
    new Map();

  component.uids
    .forEach(uid => {
      const expression =
        solution.expr.get(uid);

      if (
        !expression ||
        !pos.has(uid)
      ) {
        return;
      }

      targets.set(
        uid,
        expression.sign*
          parameter+
          expression.constant
      );
    });

  /*
   * Comprobación final: cada unión debe quedar realmente centrada sobre
   * sus hijos. Esto protege frente a errores numéricos o componentes
   * incompatibles.
   */
  for (
    const edge of
    component.edges
  ) {
    const a =
      targets.get(edge.a);

    const b =
      targets.get(edge.b);

    if (
      !Number.isFinite(a) ||
      !Number.isFinite(b) ||
      Math.abs(
        (a+b)/2-
        edge.center
      ) > 0.75
    ) {
      return false;
    }
  }

  let changed = false;

  targets.forEach((x,uid) => {
    const point =
      pos.get(uid);

    if (
      Math.abs(
        point.x-x
      ) >= 0.5
    ) {
      point.x = x;
      changed = true;
    }
  });

  return changed;
}

function centerMultipleUnionsOnOwnDescendants(
  byGen,
  pos
) {
  const generations =
    Array.from(byGen.keys())
      .sort((a,b)=>b-a);

  generations.forEach(gen => {
    const edges =
      descendantBearingUnionEdges(
        gen,
        pos
      );

    if (edges.length < 2) {
      return;
    }

    const components =
      unionEdgeComponents(
        edges
      );

    components
      .filter(
        multipleUnionComponentIsRelevant
      )
      .forEach(component => {
        applyMultipleUnionComponentCentering(
          component,
          gen,
          pos
        );
      });
  });
}


function buildBottomUpRowUnits(gen,byGen,pos) {
  const arr = byGen.get(gen) || [];

  const ordered = [...arr]
    .filter(p => pos.has(p.uid))
    .sort((a,b)=>
      pos.get(a.uid).x -
      pos.get(b.uid).x
    );

  const index = new Map(
    ordered.map((p,i)=>[p.uid,i])
  );

  const used = new Set();
  const units = [];
  const multiUnionMap =
    multipleUnionComponentMapForLayout();

  ordered.forEach(person => {
    if (used.has(person.uid)) return;

    const multiKey =
      multiUnionMap.get(person.uid);

    if (multiKey) {
      const members = ordered
        .filter(p =>
          multiUnionMap.get(p.uid) ===
            multiKey
        )
        .map(p => p.uid);

      if (members.length >= 3) {
        const xs = members
          .map(uid => pos.get(uid).x);

        const currentCenter =
          (
            Math.min(...xs) +
            Math.max(...xs)
          ) / 2;

        units.push({
          members,
          currentCenter,
          desired:currentCenter,
          orderKey:currentCenter,
          targeted:false,
          rigidMultipleUnion:true
        });

        members.forEach(uid =>
          used.add(uid)
        );

        return;
      }
    }

    const union =
      simpleUnionForBottomUpCentering(
        person.uid,
        gen,
        pos
      );

    if (union) {
      const [a,b] = union.people;
      const partner =
        a === person.uid ? b : a;

      // Solo movemos como bloque parejas ya adyacentes en el layout.
      // No intentamos "arreglar" aquí uniones complejas o enrutadas.
      if (
        !used.has(partner) &&
        index.has(partner) &&
        Math.abs(
          index.get(person.uid) -
          index.get(partner)
        ) === 1
      ) {
        const members = [person.uid,partner]
          .sort((u,v)=>
            pos.get(u).x -
            pos.get(v).x
          );

        const xs = members.map(uid=>pos.get(uid).x);
        const currentCenter =
          (Math.min(...xs)+Math.max(...xs))/2;

        const desired =
          descendantCenterForParentSet(
            union.people,
            pos
          );

        const deepOrderKey =
          deepDescendantCenterForParentSet(
            union.people,
            pos
          );

        units.push({
          members,
          currentCenter,
          desired:
            desired === null
              ? currentCenter
              : desired,
          orderKey:
            deepOrderKey === null
              ? (
                  desired === null
                    ? currentCenter
                    : desired
                )
              : deepOrderKey,
          targeted:desired !== null
        });

        used.add(person.uid);
        used.add(partner);
        return;
      }
    }

    const currentCenter =
      pos.get(person.uid).x;

    // También admitimos filiaciones con un único progenitor si no forma
    // parte de una unión que deba conservarse como estructura compleja.
    const singleDesired =
      unionCountForLayout(person.uid) === 0
        ? descendantCenterForParentSet(
            [person.uid],
            pos
          )
        : null;

    const singleDeepOrderKey =
      unionCountForLayout(person.uid) === 0
        ? deepDescendantCenterForParentSet(
            [person.uid],
            pos
          )
        : null;

    units.push({
      members:[person.uid],
      currentCenter,
      desired:
        singleDesired === null
          ? currentCenter
          : singleDesired,
      orderKey:
        singleDeepOrderKey === null
          ? (
              singleDesired === null
                ? currentCenter
                : singleDesired
            )
          : singleDeepOrderKey,
      targeted:singleDesired !== null
    });

    used.add(person.uid);
  });

  units.forEach(unit => {
    const xs = unit.members
      .map(uid=>pos.get(uid).x);

    const center =
      (Math.min(...xs)+Math.max(...xs))/2;

    unit.relative =
      unit.members.map(uid =>
        pos.get(uid).x-center
      );

    unit.width =
      Math.max(...xs)-Math.min(...xs);

    unit.center = unit.desired;

    if (
      !Number.isFinite(
        unit.orderKey
      )
    ) {
      unit.orderKey =
        unit.targeted
          ? unit.desired
          : unit.currentCenter;
    }
  });

  return units;
}

function bottomUpUnitGap(left,right,pos) {
  const leftUid =
    left.members
      .slice()
      .sort((a,b)=>pos.get(a).x-pos.get(b).x)
      .at(-1);

  const rightUid =
    right.members
      .slice()
      .sort((a,b)=>pos.get(a).x-pos.get(b).x)
      [0];

  if (
    leftUid &&
    rightUid &&
    areTwins(leftUid,rightUid)
  ) {
    return C.twinGap;
  }

  if (
    leftUid &&
    rightUid &&
    areUnion(leftUid,rightUid)
  ) {
    return C.coupleGap;
  }

  // Entre unidades familiares distintas mantenemos aire suficiente
  // para conservar una lectura clara de la generación.
  return C.siblingGap;
}

function applyBottomUpRowCenters(units,pos) {
  if (!units.length) return;

  /*
   * 0.7.46 — centrado elástico LOCAL (PAVA / regresión isotónica).
   *
   * En 0.7.44 el centrado bottom-up se resolvía con tres barridos
   * izquierda->derecha / derecha->izquierda. Ese método conserva el orden,
   * pero cuando varias familias compiten por espacio tiende a "empujar" el
   * conflicto hacia un lado. El resultado puede ser una pareja claramente
   * descentrada sobre su descendencia aunque exista una solución mejor
   * repartiendo pequeños desplazamientos entre los bloques vecinos.
   *
   * Aquí convertimos la restricción de separación entre unidades en un
   * problema isotónico 1-D. Cada unidad tiene un centro PREFERIDO:
   *   - pareja/progenitor con descendencia: centro de su propia fratría;
   *   - resto: posición actual.
   *
   * Las unidades parentales reciben un peso muy alto. Por tanto el motor
   * prefiere apartar localmente bloques vecinos antes que perder el centrado
   * parental. No se inserta ningún "corte" global ni espacio artificial:
   * solo se mueve lo mínimo necesario para satisfacer las separaciones.
   *
   * Esto mantiene compactas las filas y deja al renderer la diagonal como
   * último recurso cuando dos restricciones estructurales son incompatibles.
   */

  const n = units.length;
  const prefix = new Array(n).fill(0);

  for (let i=1; i<n; i++) {
    const left = units[i-1];
    const right = units[i];
    const gap = bottomUpUnitGap(left,right,pos);

    prefix[i] =
      prefix[i-1] +
      left.width/2 +
      gap +
      right.width/2;
  }

  // x_i >= x_(i-1) + separación_i  <=>  z_i=x_i-prefix_i no decrece.
  const blocks = [];

  for (let i=0; i<n; i++) {
    const unit = units[i];
    const preferred = unit.targeted
      ? unit.desired
      : unit.currentCenter;

    // El centrado parental domina; los bloques no dirigidos absorben el
    // ajuste. Las cadenas rígidas conservan algo más de inercia.
    const weight = unit.targeted
      ? 100
      : (unit.rigidMultipleUnion ? 8 : 1);

    const value = preferred-prefix[i];

    blocks.push({
      first:i,
      last:i,
      weight,
      weighted:value*weight,
      value
    });

    // PAVA: fusiona únicamente los vecinos que violan el orden. Así el
    // reajuste queda confinado al entorno real del conflicto.
    while (
      blocks.length >= 2 &&
      blocks[blocks.length-2].value >
        blocks[blocks.length-1].value + 1e-9
    ) {
      const right = blocks.pop();
      const left = blocks.pop();
      const mergedWeight = left.weight+right.weight;
      const mergedWeighted = left.weighted+right.weighted;

      blocks.push({
        first:left.first,
        last:right.last,
        weight:mergedWeight,
        weighted:mergedWeighted,
        value:mergedWeighted/mergedWeight
      });
    }
  }

  blocks.forEach(block => {
    for (let i=block.first; i<=block.last; i++) {
      units[i].center = block.value+prefix[i];
    }
  });

  units.forEach(unit => {
    unit.members.forEach((uid,index) => {
      const point = pos.get(uid);

      if (point) {
        point.x = unit.center+unit.relative[index];
      }
    });
  });
}

/*
 * T19e — ordenar bloques parentales raíz según su descendencia.
 *
 * Problema:
 * dos parejas independientes de la generación superior pueden haberse
 * creado en un orden que no coincide con la posición horizontal de sus
 * hijos. El centrado bottom-up anterior respetaba SIEMPRE ese orden, de
 * modo que una pareja podía quedar forzada al lado contrario de su propia
 * descendencia y su línea de filiación cruzaba otra familia.
 *
 * Nueva prioridad:
 * - la pareja / bloque sigue siendo atómico;
 * - hermanos o individuos con familia de origen representada NO se
 *   reordenan;
 * - solamente bloques raíz independientes, con descendencia representada,
 *   pueden intercambiar su orden;
 * - el criterio es el centro de SU descendencia.
 *
 * Esto no altera el orden de nacimiento de una fratría. Solo permuta
 * familias raíz independientes entre sí.
 */

/*
 * T19f — reordenación bottom-up de RAMAS independientes.
 *
 * La 0.7.11 solo permitía permutar familias raíz. Eso resolvía cruces en
 * generación I, pero no los que nacen varias generaciones más abajo.
 *
 * Ahora una unidad parental de cualquier generación puede intercambiar
 * posición con otra unidad adyacente cuando:
 *
 *   1) ambas tienen descendencia representada;
 *   2) pertenecen a familias de origen distintas;
 *   3) no existe entre ellas una relación estructural directa;
 *   4) el centro de sus descendencias aparece invertido.
 *
 * El intercambio se hace únicamente entre unidades completas. Después,
 * como centerParentsOverDescendantsBottomUp() recorre de abajo hacia
 * arriba, la nueva posición se propaga de forma natural a las parejas
 * parentales de generaciones superiores en la MISMA pasada.
 *
 * Importante:
 * - NO se intercambian dos unidades que compartan familia de origen;
 *   por tanto el orden de nacimiento de una fratría sigue protegido.
 * - una cadena de múltiples uniones que buildBottomUpRowUnits() haya
 *   marcado como rigidMultipleUnion continúa siendo un único bloque.
 */

function bottomUpUnitOriginKeys(
  unit
) {
  const keys =
    new Set();

  (unit.members || [])
    .forEach(uid => {
      originGroupKeys(uid)
        .forEach(key =>
          keys.add(key)
        );
    });

  return keys;
}

function bottomUpUnitsShareOrigin(
  a,
  b
) {
  const aKeys =
    bottomUpUnitOriginKeys(a);

  const bKeys =
    bottomUpUnitOriginKeys(b);

  if (
    !aKeys.size ||
    !bKeys.size
  ) {
    return false;
  }

  for (const key of aKeys) {
    if (bKeys.has(key)) {
      return true;
    }
  }

  return false;
}

function bottomUpUnitsHaveDirectStructuralLink(
  a,
  b
) {
  const aSet =
    new Set(a.members || []);

  const bSet =
    new Set(b.members || []);

  return family.relationships
    .some(r => {
      if (
        r.type === "union" &&
        (r.people || []).length === 2
      ) {
        const [x,y] =
          r.people;

        return (
          (
            aSet.has(x) &&
            bSet.has(y)
          ) ||
          (
            aSet.has(y) &&
            bSet.has(x)
          )
        );
      }

      if (
        r.type === "twin" ||
        r.type === "sibling"
      ) {
        const members =
          r.members || [];

        return (
          members.some(uid =>
            aSet.has(uid)
          ) &&
          members.some(uid =>
            bSet.has(uid)
          )
        );
      }

      /*
       * Normalmente progenitores e hijos están en generaciones distintas,
       * pero protegemos también cualquier caso con generation_override:
       * una filiación directa nunca debe usarse como frontera permutable.
       */
      if (
        r.type === "parentage"
      ) {
        const parents =
          r.parents || [];

        const children =
          r.children || [];

        return (
          (
            parents.some(uid =>
              aSet.has(uid)
            ) &&
            children.some(uid =>
              bSet.has(uid)
            )
          ) ||
          (
            parents.some(uid =>
              bSet.has(uid)
            ) &&
            children.some(uid =>
              aSet.has(uid)
            )
          )
        );
      }

      return false;
    });
}

function canSwapBottomUpBranchUnits(
  left,
  right
) {
  if (
    !left ||
    !right ||
    !left.targeted ||
    !right.targeted
  ) {
    return false;
  }

  /*
   * Los bloques rígidos de múltiples uniones pueden desplazarse como una
   * unidad por otras reglas, pero aquí no los hacemos atravesar otra rama.
   * Conservamos así T19d.
   */
  if (
    left.rigidMultipleUnion ||
    right.rigidMultipleUnion
  ) {
    return false;
  }

  /*
   * Esta es la diferencia esencial respecto a 0.7.11:
   * TENER ascendencia representada ya NO bloquea un intercambio.
   *
   * Lo que lo bloquea es COMPARTIR esa ascendencia. Dos ramas de familias
   * distintas sí pueden cambiar de lado; dos hermanos de la misma familia,
   * no.
   */
  if (
    bottomUpUnitsShareOrigin(
      left,
      right
    )
  ) {
    return false;
  }

  if (
    bottomUpUnitsHaveDirectStructuralLink(
      left,
      right
    )
  ) {
    return false;
  }

  return true;
}

function reorderIndependentBranchUnitsByDescendants(
  units
) {
  if (units.length < 2) {
    return units;
  }

  const result =
    [...units];

  /*
   * Bubble-sort restringido a intercambios adyacentes seguros.
   *
   * Esto es deliberado: una rama nunca "salta" por encima de una barrera
   * estructural. La inversión solo se corrige cuando las dos unidades
   * contiguas pueden intercambiarse sin alterar ninguna fratría.
   */
  const maxPasses =
    result.length *
    result.length;

  for (
    let pass=0;
    pass<maxPasses;
    pass++
  ) {
    let changed = false;

    for (
      let i=0;
      i<result.length-1;
      i++
    ) {
      const left =
        result[i];

      const right =
        result[i+1];

      if (
        !canSwapBottomUpBranchUnits(
          left,
          right
        )
      ) {
        continue;
      }

      /*
       * Si la rama izquierda tiene su descendencia a la derecha de la
       * descendencia de la rama derecha, mantener el orden actual obliga
       * a cruzar al menos una línea de filiación. Permutamos ambas ramas.
       */
      if (
        left.orderKey >
        right.orderKey+0.5
      ) {
        result[i] =
          right;

        result[i+1] =
          left;

        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return result;
}


/*
 * T19g — ramas de familia de origen con hermanos.
 *
 * T19f reordena unidades parentales (parejas o progenitores). Si entre dos
 * parejas existe un hermano de una de ellas sin descendencia, ese hermano
 * actúa correctamente como barrera para no alterar el orden de la fratría,
 * pero también impide desplazar la RAMA COMPLETA.
 *
 * Ejemplo:
 *
 *   familia A: II-1 -- II-2
 *   familia B: II-3, II-4 -- II-5
 *
 * donde II-3 e II-4 son hermanos. Si la descendencia de II-4/II-5 queda a
 * la izquierda de la descendencia de II-1/II-2, no debemos hacer pasar
 * II-4 por encima de II-3. Debemos intercambiar:
 *
 *   [II-3, II-4, II-5]   <->   [II-1, II-2]
 *
 * preservando intacto el orden interno de cada bloque.
 *
 * generationFamilyBlocks() ya sabe construir exactamente estas unidades:
 * fratrías de origen + parejas compatibles. T19g reutiliza esos bloques
 * en una pasada bottom-up antes de T19f.
 */

function familyBranchDirectDescendantCenter(
  memberUids,
  pos
) {
  const members =
    new Set(memberUids || []);

  const childUids = [];

  family.relationships
    .filter(r =>
      r.type === "parentage" &&
      (r.parents || []).length &&
      /*
       * Solo descendencias cuyo conjunto parental pertenece ENTERO al
       * bloque. Una unión cross-family cuyos miembros estén repartidos
       * entre dos bloques no debe arrastrar ninguno de ellos por separado.
       */
      (r.parents || []).every(uid =>
        members.has(uid)
      )
    )
    .forEach(r => {
      (r.children || [])
        .forEach(uid => {
          if (
            pos.has(uid) &&
            !childUids.includes(uid)
          ) {
            childUids.push(uid);
          }
        });
    });

  if (!childUids.length) {
    return null;
  }

  const xs =
    childUids
      .map(uid =>
        pos.get(uid).x
      )
      .filter(Number.isFinite);

  if (!xs.length) {
    return null;
  }

  return (
    Math.min(...xs) +
    Math.max(...xs)
  ) / 2;
}

function familyBranchOriginKeys(
  memberUids
) {
  const result =
    new Set();

  (memberUids || [])
    .forEach(uid => {
      originGroupKeys(uid)
        .forEach(key =>
          result.add(key)
        );
    });

  return result;
}

function familyBranchBlocksShareOrigin(
  a,
  b
) {
  const aKeys =
    a.originKeys ||
    familyBranchOriginKeys(
      a.members
    );

  const bKeys =
    b.originKeys ||
    familyBranchOriginKeys(
      b.members
    );

  if (
    !aKeys.size ||
    !bKeys.size
  ) {
    return false;
  }

  for (const key of aKeys) {
    if (bKeys.has(key)) {
      return true;
    }
  }

  return false;
}

function familyBranchContainsSiblingStructure(
  memberUids
) {
  const members =
    new Set(memberUids || []);

  return family.relationships
    .some(r => {
      if (
        r.type === "parentage" &&
        (r.children || []).length >= 2
      ) {
        return (
          (r.children || [])
            .filter(uid =>
              members.has(uid)
            )
            .length >= 2
        );
      }

      if (
        r.type === "sibling" &&
        (r.members || []).length >= 2
      ) {
        return (
          (r.members || [])
            .filter(uid =>
              members.has(uid)
            )
            .length >= 2
        );
      }

      return false;
    });
}

function familyBranchContainsRigidMultipleUnion(
  memberUids,
  multiUnionMap=null
) {
  const map =
    multiUnionMap ||
    multipleUnionComponentMapForLayout();

  return (memberUids || [])
    .some(uid =>
      map.has(uid)
    );
}

function familyBranchBlocksHaveDirectLink(
  a,
  b
) {
  const aSet =
    new Set(a.members || []);

  const bSet =
    new Set(b.members || []);

  return family.relationships
    .some(r => {
      if (
        r.type === "union" &&
        (r.people || []).length === 2
      ) {
        const [x,y] =
          r.people;

        return (
          (
            aSet.has(x) &&
            bSet.has(y)
          ) ||
          (
            aSet.has(y) &&
            bSet.has(x)
          )
        );
      }

      if (
        r.type === "sibling" ||
        r.type === "twin"
      ) {
        const members =
          r.members || [];

        return (
          members.some(uid =>
            aSet.has(uid)
          ) &&
          members.some(uid =>
            bSet.has(uid)
          )
        );
      }

      if (
        r.type === "parentage"
      ) {
        const parents =
          r.parents || [];

        const children =
          r.children || [];

        return (
          (
            parents.some(uid =>
              aSet.has(uid)
            ) &&
            children.some(uid =>
              bSet.has(uid)
            )
          ) ||
          (
            parents.some(uid =>
              bSet.has(uid)
            ) &&
            children.some(uid =>
              aSet.has(uid)
            )
          )
        );
      }

      return false;
    });
}

function buildBottomUpFamilyBranchBlocks(
  gen,
  byGen,
  pos
) {
  const arr =
    byGen.get(gen) || [];

  const multiUnionMap =
    multipleUnionComponentMapForLayout();

  return generationFamilyBlocks(arr)
    .map((members,index) => {
      const orderedMembers =
        [...members]
          .filter(uid =>
            pos.has(uid)
          )
          .sort((a,b) =>
            pos.get(a).x-
            pos.get(b).x
          );

      if (!orderedMembers.length) {
        return null;
      }

      const geometry =
        blockGeometry(
          orderedMembers
        );

      const xs =
        orderedMembers.map(uid =>
          pos.get(uid).x
        );

      const currentCenter =
        (
          Math.min(...xs) +
          Math.max(...xs)
        ) / 2;

      const desired =
        familyBranchDirectDescendantCenter(
          orderedMembers,
          pos
        );

      const deepOrderKey =
        deepDescendantCenterForBranchMembers(
          orderedMembers,
          pos
        );

      return {
        members:orderedMembers,
        relative:geometry.relative,
        width:geometry.width,
        currentCenter,
        desired:
          desired === null
            ? currentCenter
            : desired,
        orderKey:
          deepOrderKey === null
            ? (
                desired === null
                  ? currentCenter
                  : desired
              )
            : deepOrderKey,
        center:
          desired === null
            ? currentCenter
            : desired,
        targeted:
          desired !== null,
        originKeys:
          familyBranchOriginKeys(
            orderedMembers
          ),
        hasSiblingStructure:
          familyBranchContainsSiblingStructure(
            orderedMembers
          ),
        rigidMultipleUnion:
          familyBranchContainsRigidMultipleUnion(
            orderedMembers,
            multiUnionMap
          ),
        originalIndex:index
      };
    })
    .filter(Boolean)
    .sort((a,b) =>
      a.currentCenter-
      b.currentCenter
    );
}

function canSwapBottomUpFamilyBranches(
  left,
  right
) {
  if (
    !left ||
    !right ||
    !left.targeted ||
    !right.targeted
  ) {
    return false;
  }

  /*
   * T19g se activa para el problema nuevo de "hermanos como barrera".
   * Si ninguno de los dos bloques contiene estructura de fratría, T19f
   * ya resuelve el caso con menos intervención.
   */
  if (
    !left.hasSiblingStructure &&
    !right.hasSiblingStructure
  ) {
    return false;
  }

  /*
   * Nunca descomponemos ni hacemos atravesar una rama que contenga una
   * cadena rígida de múltiples uniones (T19d).
   */
  if (
    left.rigidMultipleUnion ||
    right.rigidMultipleUnion
  ) {
    return false;
  }

  /*
   * Mismo origen => son partes de la misma familia y el orden interno
   * tiene prioridad. generationFamilyBlocks() normalmente ya las habrá
   * unido, pero mantenemos la protección explícita.
   */
  if (
    familyBranchBlocksShareOrigin(
      left,
      right
    )
  ) {
    return false;
  }

  if (
    familyBranchBlocksHaveDirectLink(
      left,
      right
    )
  ) {
    return false;
  }

  return true;
}

function reorderBottomUpFamilyBranches(
  blocks
) {
  if (blocks.length < 2) {
    return blocks;
  }

  const result =
    [...blocks];

  const maxPasses =
    result.length *
    result.length;

  for (
    let pass=0;
    pass<maxPasses;
    pass++
  ) {
    let changed = false;

    for (
      let i=0;
      i<result.length-1;
      i++
    ) {
      const left =
        result[i];

      const right =
        result[i+1];

      if (
        !canSwapBottomUpFamilyBranches(
          left,
          right
        )
      ) {
        continue;
      }

      if (
        left.orderKey >
        right.orderKey+0.5
      ) {
        result[i] =
          right;

        result[i+1] =
          left;

        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return result;
}

function bottomUpFamilyBranchGap(
  left,
  right
) {
  /*
   * Son bloques familiares distintos. siblingGap es deliberadamente
   * mayor que el mero tamaño del símbolo y evita que, al intercambiarlos,
   * se peguen visualmente dos ramas independientes.
   */
  return C.siblingGap;
}

function applyBottomUpFamilyBranchCenters(
  blocks,
  pos
) {
  if (!blocks.length) return;

  /*
   * Primera pasada: respetamos el orden ya decidido por T19g.
   */
  for (
    let i=1;
    i<blocks.length;
    i++
  ) {
    const left =
      blocks[i-1];

    const block =
      blocks[i];

    const gap =
      bottomUpFamilyBranchGap(
        left,
        block
      );

    const minimum =
      left.center +
      left.width/2 +
      gap +
      block.width/2;

    if (
      block.center <
      minimum
    ) {
      block.center =
        minimum;
    }
  }

  /*
   * Recuperamos el centro deseado desde la derecha cuando hay espacio.
   */
  for (
    let i=blocks.length-2;
    i>=0;
    i--
  ) {
    const block =
      blocks[i];

    const right =
      blocks[i+1];

    const gap =
      bottomUpFamilyBranchGap(
        block,
        right
      );

    const maximum =
      right.center -
      right.width/2 -
      gap -
      block.width/2;

    const preferred =
      block.targeted
        ? block.desired
        : block.currentCenter;

    if (
      block.center >
        preferred &&
      preferred <= maximum
    ) {
      block.center =
        preferred;
    } else if (
      block.center >
      maximum
    ) {
      block.center =
        maximum;
    }
  }

  /*
   * Seguridad final izquierda -> derecha.
   */
  for (
    let i=1;
    i<blocks.length;
    i++
  ) {
    const left =
      blocks[i-1];

    const block =
      blocks[i];

    const gap =
      bottomUpFamilyBranchGap(
        left,
        block
      );

    const minimum =
      left.center +
      left.width/2 +
      gap +
      block.width/2;

    if (
      block.center <
      minimum
    ) {
      block.center =
        minimum;
    }
  }

  blocks.forEach(block => {
    block.members
      .forEach((uid,index) => {
        const point =
          pos.get(uid);

        if (point) {
          point.x =
            block.center +
            block.relative[index];
        }
      });
  });
}

function reorderSiblingFamilyBranchesBottomUp(
  gen,
  byGen,
  pos
) {
  let blocks =
    buildBottomUpFamilyBranchBlocks(
      gen,
      byGen,
      pos
    );

  if (
    blocks.length < 2 ||
    !blocks.some(block =>
      block.targeted &&
      block.hasSiblingStructure
    )
  ) {
    return false;
  }

  const before =
    blocks
      .map(block =>
        block.members.join(",")
      )
      .join(" || ");

  blocks =
    reorderBottomUpFamilyBranches(
      blocks
    );

  const after =
    blocks
      .map(block =>
        block.members.join(",")
      )
      .join(" || ");

  /*
   * Aunque no haya cambio de orden, no recentramos aquí la fila: T19g
   * existe para corregir inversiones de ramas con hermanos. Así reducimos
   * al mínimo el riesgo sobre layouts ya resueltos.
   */
  if (before === after) {
    return false;
  }

  applyBottomUpFamilyBranchCenters(
    blocks,
    pos
  );

  return true;
}


function centerParentsOverDescendantsBottomUp(byGen,pos) {
  const generations =
    Array.from(byGen.keys())
      .sort((a,b)=>b-a);

  generations.forEach(gen => {
    const manualOrder =
      generationHasManualBranchOrder(
        gen
      );

    /*
     * T19g/T19f/T19h siguen siendo la solución automática.
     * Si el usuario ha fijado explícitamente el orden de esta generación,
     * NO volvemos a permutar las ramas automáticamente.
     */
    if (!manualOrder) {
      reorderSiblingFamilyBranchesBottomUp(
        gen,
        byGen,
        pos
      );
    }

    let units =
      buildBottomUpRowUnits(
        gen,
        byGen,
        pos
      );

    if (!units.some(unit=>unit.targeted)) {
      return;
    }

    if (!manualOrder) {
      units =
        reorderIndependentBranchUnitsByDescendants(
          units
        );
    }

    /*
     * El orden puede ser manual, pero el centrado y las separaciones
     * continúan siendo automáticos.
     */
    applyBottomUpRowCenters(
      units,
      pos
    );
  });
}



/*
 * T10 — Fratrías independientes de progenitor único.
 *
 * Caso objetivo:
 * dos hermanos de una generación superior tienen sendas fratrías en la
 * generación inferior. Si el tallo vertical del progenitor derecho entra
 * en la barra de la fratría izquierda, no desplazamos una rama lejana:
 * movemos localmente ese progenitor hacia la derecha, conservando el orden.
 *
 * Es una corrección geométrica deliberadamente local; no calcula anchuras
 * recursivas de subárboles ni sustituye el motor general de layout.
 */
const INDEPENDENT_SIBSHIP_CLEARANCE = 28;
const SINGLE_PARENT_NEIGHBOR_CLEARANCE =
  C.symbolSize + 22;

function sameRepresentedGeneration(a,b,pos) {
  return (
    pos.has(a) &&
    pos.has(b) &&
    pos.get(a).generation ===
      pos.get(b).generation
  );
}

function nearestHorizontalNeighbor(
  uid,
  direction,
  pos
) {
  if (!pos.has(uid)) return null;

  const point = pos.get(uid);
  const candidates = family.people
    .filter(p =>
      p.uid !== uid &&
      sameRepresentedGeneration(
        uid,
        p.uid,
        pos
      )
    )
    .map(p => ({
      uid:p.uid,
      x:pos.get(p.uid).x
    }))
    .filter(item =>
      direction > 0
        ? item.x > point.x
        : item.x < point.x
    )
    .sort((a,b) =>
      direction > 0
        ? a.x-b.x
        : b.x-a.x
    );

  return candidates[0] || null;
}

function movableSingleParentUid(entry) {
  if (
    !entry ||
    !entry.parentUids ||
    entry.parentUids.length !== 1
  ) {
    return null;
  }

  const uid = entry.parentUids[0];

  // Una pareja visible debe moverse como unidad; no la tratamos aquí.
  if (unionCountForLayout(uid) !== 0) {
    return null;
  }

  return uid;
}

function moveSingleParentLocally(
  uid,
  requestedDelta,
  pos
) {
  if (
    !uid ||
    !pos.has(uid) ||
    !Number.isFinite(requestedDelta) ||
    Math.abs(requestedDelta) < 0.5
  ) {
    return 0;
  }

  const point = pos.get(uid);
  const direction =
    requestedDelta > 0 ? 1 : -1;
  const neighbor =
    nearestHorizontalNeighbor(
      uid,
      direction,
      pos
    );

  let allowed =
    Math.abs(requestedDelta);

  if (neighbor) {
    const free =
      direction > 0
        ? neighbor.x - point.x -
          SINGLE_PARENT_NEIGHBOR_CLEARANCE
        : point.x - neighbor.x -
          SINGLE_PARENT_NEIGHBOR_CLEARANCE;

    allowed = Math.min(
      allowed,
      Math.max(0,free)
    );
  }

  if (allowed < 0.5) return 0;

  const applied = direction*allowed;
  point.x += applied;
  return applied;
}

function singleParentSibshipEntries(pos) {
  return family.relationships
    .filter(r =>
      r.type === "parentage" &&
      (r.parents || []).length === 1 &&
      (r.children || []).filter(uid =>
        pos.has(uid)
      ).length >= 2
    )
    .map(r =>
      parentageBaseGeometry(
        r,
        pos
      )
    )
    .filter(Boolean);
}

function endpointComesFromParent(
  entry,
  side
) {
  if (!entry) return false;

  const endpoint =
    side === "left"
      ? entry.minX
      : entry.maxX;

  return Math.abs(
    endpoint-entry.px
  ) < 0.75;
}

function independentSibshipPair(a,b) {
  if (!a || !b) return false;

  if (
    Math.abs(a.cy-b.cy) > 1
  ) {
    return false;
  }

  if (
    sameSet(
      a.parentUids || [],
      b.parentUids || []
    )
  ) {
    return false;
  }

  return true;
}

function singleParentSibshipDesiredCenter(
  entry
) {
  if (
    !entry ||
    !Array.isArray(entry.descentXs) ||
    !entry.descentXs.length
  ) {
    return null;
  }

  const minChildX =
    Math.min(...entry.descentXs);

  const maxChildX =
    Math.max(...entry.descentXs);

  return (
    minChildX +
    maxChildX
  ) / 2;
}

function canShiftAsSimpleSibling(
  anchorUid,
  candidateUid
) {
  if (
    !anchorUid ||
    !candidateUid ||
    anchorUid === candidateUid
  ) {
    return false;
  }

  if (
    !shareOriginGroup(
      anchorUid,
      candidateUid
    )
  ) {
    return false;
  }

  if (
    unionCountForLayout(
      candidateUid
    ) !== 0
  ) {
    return false;
  }

  if (
    hasRepresentedDescendants(
      candidateUid
    )
  ) {
    return false;
  }

  return true;
}

function centerSingleParentWithSiblingPush(
  uid,
  targetX,
  pos
) {
  if (
    !uid ||
    !pos.has(uid) ||
    !Number.isFinite(targetX)
  ) {
    return 0;
  }

  if (
    unionCountForLayout(uid) !== 0
  ) {
    return 0;
  }

  const point = pos.get(uid);
  const requestedDelta =
    targetX-point.x;

  if (
    Math.abs(requestedDelta) < 0.5
  ) {
    return 0;
  }

  const direction =
    requestedDelta > 0 ? 1 : -1;

  const row = family.people
    .filter(p =>
      p.uid !== uid &&
      pos.has(p.uid) &&
      pos.get(p.uid).generation ===
        point.generation
    )
    .map(p => ({
      uid:p.uid,
      x:pos.get(p.uid).x
    }))
    .filter(item =>
      direction > 0
        ? item.x > point.x
        : item.x < point.x
    )
    .sort((a,b) =>
      direction > 0
        ? a.x-b.x
        : b.x-a.x
    );

  const movable = [];
  let blocker = null;

  for (const item of row) {
    if (
      canShiftAsSimpleSibling(
        uid,
        item.uid
      )
    ) {
      movable.push(item);
      continue;
    }

    blocker = item;
    break;
  }

  let allowed =
    Math.abs(requestedDelta);

  if (blocker) {
    const edge =
      movable.length
        ? movable[movable.length-1]
        : {
            uid,
            x:point.x
          };

    const free =
      direction > 0
        ? blocker.x-edge.x-
          SINGLE_PARENT_NEIGHBOR_CLEARANCE
        : edge.x-blocker.x-
          SINGLE_PARENT_NEIGHBOR_CLEARANCE;

    allowed = Math.min(
      allowed,
      Math.max(0,free)
    );
  }

  if (allowed < 0.5) {
    return 0;
  }

  const applied =
    direction*allowed;

  /*
   * El progenitor se desplaza hacia el centro de su propia fratría.
   * Los hermanos simples que quedarían atravesados se desplazan como
   * una cola rígida, conservando exactamente sus separaciones mutuas.
   *
   * Si aparece una pareja, otro progenitor con descendencia o una
   * unidad distinta, actúa como barrera y el centrado queda limitado.
   */
  point.x += applied;

  movable.forEach(item => {
    pos.get(item.uid).x +=
      applied;
  });

  return applied;
}

function singleParentCenterCandidates(
  pos
) {
  return singleParentSibshipEntries(pos)
    .map(entry => {
      const uid =
        movableSingleParentUid(
          entry
        );

      if (!uid || !pos.has(uid)) {
        return null;
      }

      const targetX =
        singleParentSibshipDesiredCenter(
          entry
        );

      if (
        targetX === null ||
        !Number.isFinite(targetX)
      ) {
        return null;
      }

      return {
        uid,
        entry,
        targetX,
        currentX:pos.get(uid).x,
        generation:
          pos.get(uid).generation
      };
    })
    .filter(Boolean);
}

function singleParentCandidateComponents(
  candidates
) {
  const result = [];
  const visited = new Set();

  candidates.forEach(candidate => {
    if (visited.has(candidate.uid)) {
      return;
    }

    const stack = [candidate];
    const component = [];
    visited.add(candidate.uid);

    while (stack.length) {
      const current =
        stack.pop();

      component.push(current);

      candidates.forEach(other => {
        if (
          visited.has(other.uid) ||
          other.generation !==
            current.generation
        ) {
          return;
        }

        if (
          shareOriginGroup(
            current.uid,
            other.uid
          )
        ) {
          visited.add(other.uid);
          stack.push(other);
        }
      });
    }

    result.push(component);
  });

  return result;
}

function isSimpleSiblingForCentering(
  uid
) {
  return (
    unionCountForLayout(uid) === 0 &&
    !hasRepresentedDescendants(uid)
  );
}

function simultaneousCenterSingleParentComponent(
  component,
  pos
) {
  if (!component.length) return false;

  const orderedTargets =
    [...component]
      .sort((a,b) =>
        a.currentX-b.currentX
      );

  /*
   * Cada progenitor objetivo es un ANCLA: su x deseada es el centro
   * geométrico de su propia fratría.
   */
  for (
    let i=1;
    i<orderedTargets.length;
    i++
  ) {
    if (
      orderedTargets[i].targetX <=
      orderedTargets[i-1].targetX
    ) {
      return false;
    }
  }

  const generation =
    orderedTargets[0].generation;

  const targetMap =
    new Map(
      orderedTargets.map(item => [
        item.uid,
        item.targetX
      ])
    );

  const componentUids =
    orderedTargets.map(item =>
      item.uid
    );

  const row =
    family.people
      .filter(p =>
        pos.has(p.uid) &&
        pos.get(p.uid).generation ===
          generation &&
        componentUids.some(uid =>
          p.uid === uid ||
          shareOriginGroup(
            uid,
            p.uid
          )
        )
      )
      .map(p => ({
        uid:p.uid,
        currentX:pos.get(p.uid).x,
        isTarget:
          targetMap.has(p.uid),
        movableSimple:
          !targetMap.has(p.uid) &&
          isSimpleSiblingForCentering(
            p.uid
          )
      }))
      .sort((a,b) =>
        a.currentX-b.currentX
      );

  if (!row.length) return false;

  const targetIndexes =
    row
      .map((item,index) =>
        item.isTarget
          ? index
          : -1
      )
      .filter(index =>
        index >= 0
      );

  if (!targetIndexes.length) {
    return false;
  }

  /*
   * Para esta heurística todos los elementos NO objetivo que debamos
   * recolocar tienen que ser hermanos simples. Parejas u otras ramas
   * estructurales siguen siendo barreras y fuerzan el fallback.
   */
  const firstTargetIndex =
    targetIndexes[0];

  const lastTargetIndex =
    targetIndexes[
      targetIndexes.length-1
    ];

  for (
    let i=firstTargetIndex;
    i<=lastTargetIndex;
    i++
  ) {
    const item = row[i];

    if (
      !item.isTarget &&
      !item.movableSimple
    ) {
      return false;
    }
  }

  const tentative =
    new Map();

  targetIndexes.forEach(index => {
    const item = row[index];

    tentative.set(
      item.uid,
      targetMap.get(item.uid)
    );
  });

  /*
   * Entre dos progenitores centrados distribuimos cualquier hermano
   * simple respetando COMO MÍNIMO el espaciado normal de hermanos.
   *
   * Esto evita casos como II-3 / II-4 o II-5 / II-6, donde el hermano
   * sin descendencia quedaba pegado a la rama desplazada.
   */
  for (
    let t=0;
    t<targetIndexes.length-1;
    t++
  ) {
    const leftIndex =
      targetIndexes[t];
    const rightIndex =
      targetIndexes[t+1];

    const left =
      row[leftIndex];
    const right =
      row[rightIndex];

    const leftX =
      tentative.get(left.uid);
    const rightX =
      tentative.get(right.uid);

    const countBetween =
      rightIndex-leftIndex-1;

    const minimumDistance =
      (countBetween+1) *
      C.siblingGap;

    if (
      rightX-leftX <
      minimumDistance-0.5
    ) {
      /*
       * No hay sitio para conservar simultáneamente los centros y el
       * espaciado normal. No inventamos una solución agresiva aquí.
       */
      return false;
    }

    if (countBetween > 0) {
      const step =
        (rightX-leftX) /
        (countBetween+1);

      for (
        let j=1;
        j<=countBetween;
        j++
      ) {
        const item =
          row[leftIndex+j];

        if (!item.movableSimple) {
          return false;
        }

        tentative.set(
          item.uid,
          leftX+step*j
        );
      }
    }
  }

  /*
   * Hermanos simples a la izquierda del primer progenitor objetivo:
   * se colocan hacia fuera con el siblingGap normal.
   */
  for (
    let i=firstTargetIndex-1;
    i>=0;
    i--
  ) {
    const item = row[i];
    const next = row[i+1];

    if (!item.movableSimple) {
      return false;
    }

    tentative.set(
      item.uid,
      tentative.get(next.uid)-
        C.siblingGap
    );
  }

  /*
   * Hermanos simples a la derecha del último progenitor objetivo:
   * mismo criterio hacia fuera.
   */
  for (
    let i=lastTargetIndex+1;
    i<row.length;
    i++
  ) {
    const item = row[i];
    const previous = row[i-1];

    if (!item.movableSimple) {
      return false;
    }

    tentative.set(
      item.uid,
      tentative.get(previous.uid)+
        C.siblingGap
    );
  }

  /*
   * Seguridad: respetar cualquier persona de la misma generación que
   * no pertenezca a esta familia de origen. Si la nueva disposición
   * invadiera otro bloque, dejamos que actúe el fallback conservador.
   */
  const rowUids =
    new Set(
      row.map(item =>
        item.uid
      )
    );

  const external =
    family.people
      .filter(p =>
        pos.has(p.uid) &&
        pos.get(p.uid).generation ===
          generation &&
        !rowUids.has(p.uid)
      )
      .map(p => ({
        uid:p.uid,
        x:pos.get(p.uid).x
      }));

  for (const item of row) {
    const x =
      tentative.get(item.uid);

    if (!Number.isFinite(x)) {
      return false;
    }

    const conflict =
      external.some(other =>
        Math.abs(other.x-x) <
        SINGLE_PARENT_NEIGHBOR_CLEARANCE
      );

    if (conflict) {
      return false;
    }
  }

  row.forEach(item => {
    pos.get(item.uid).x =
      tentative.get(item.uid);
  });

  return true;
}

function centerSingleParentsOverOwnSibships(
  pos
) {
  const candidates =
    singleParentCenterCandidates(
      pos
    );

  const components =
    singleParentCandidateComponents(
      candidates
    )
      .sort((a,b) => {
        const ag =
          Math.max(
            ...a.map(item =>
              item.generation
            )
          );

        const bg =
          Math.max(
            ...b.map(item =>
              item.generation
            )
          );

        return bg-ag;
      });

  components.forEach(component => {
    /*
     * 0.6.94:
     * los progenitores centrales ya no se consideran bloqueadores entre
     * sí. Primero intentamos resolver simultáneamente toda la familia de
     * origen, fijando cada progenitor en el centro de su propia fratría.
     */
    const resolved =
      simultaneousCenterSingleParentComponent(
        component,
        pos
      );

    if (resolved) return;

    /*
     * Fallback 0.6.93 para configuraciones más complejas:
     * múltiples uniones, centros incompatibles, otros bloques, etc.
     */
    [...component]
      .sort((a,b) =>
        a.currentX-b.currentX
      )
      .forEach(candidate => {
        centerSingleParentWithSiblingPush(
          candidate.uid,
          candidate.targetX,
          pos
        );
      });
  });
}

function resolveIndependentSingleParentSibshipCollisions(
  pos
) {
  const maxIterations = 12;

  for (
    let iteration=0;
    iteration<maxIterations;
    iteration++
  ) {
    const entries =
      singleParentSibshipEntries(pos)
        .sort((a,b) =>
          a.cy-b.cy ||
          a.minX-b.minX ||
          a.px-b.px
        );

    let changed = false;

    outer:
    for (let i=0;i<entries.length;i++) {
      for (let j=i+1;j<entries.length;j++) {
        let left = entries[i];
        let right = entries[j];

        if (!independentSibshipPair(left,right)) {
          continue;
        }

        if (right.minX < left.minX) {
          [left,right] = [right,left];
        }

        const currentGap =
          right.minX-left.maxX;

        if (
          currentGap >=
          INDEPENDENT_SIBSHIP_CLEARANCE
        ) {
          continue;
        }

        const needed =
          INDEPENDENT_SIBSHIP_CLEARANCE-
          currentGap;

        /*
         * Preferencia T10:
         * si el borde conflictivo de la fratría derecha es el tallo de
         * su progenitor único, desplazamos ESE progenitor a la derecha.
         */
        if (
          endpointComesFromParent(
            right,
            "left"
          )
        ) {
          const uid =
            movableSingleParentUid(right);
          const moved =
            moveSingleParentLocally(
              uid,
              needed,
              pos
            );

          if (Math.abs(moved) >= 0.5) {
            changed = true;
            break outer;
          }
        }

        /*
         * Caso simétrico: el borde derecho de la fratría izquierda es
         * su propio progenitor. Lo desplazamos hacia la izquierda.
         */
        if (
          endpointComesFromParent(
            left,
            "right"
          )
        ) {
          const uid =
            movableSingleParentUid(left);
          const moved =
            moveSingleParentLocally(
              uid,
              -needed,
              pos
            );

          if (Math.abs(moved) >= 0.5) {
            changed = true;
            break outer;
          }
        }
      }
    }

    if (!changed) break;
  }
}

function hasRepresentedDescendants(uid) {
  return family.relationships.some(r =>
    r.type === "parentage" &&
    (r.parents || []).includes(uid) &&
    (r.children || []).length
  );
}

function shareOriginGroup(a,b) {
  const aKeys = originGroupKeys(a);
  const bKeys = originGroupKeys(b);

  return aKeys.some(key =>
    bKeys.includes(key)
  );
}

function compactRightEdgeSimpleSiblingOutlier(
  byGen,
  pos
) {
  Array.from(byGen.keys()).forEach(gen => {
    const ordered = (byGen.get(gen) || [])
      .filter(p => pos.has(p.uid))
      .sort((a,b) =>
        pos.get(a.uid).x-
        pos.get(b.uid).x
      );

    if (ordered.length < 2) return;

    const left = ordered[ordered.length-2];
    const right = ordered[ordered.length-1];

    if (
      unionCountForLayout(right.uid) !== 0 ||
      hasRepresentedDescendants(right.uid) ||
      !shareOriginGroup(
        left.uid,
        right.uid
      )
    ) {
      return;
    }

    const leftX = pos.get(left.uid).x;
    const rightPoint = pos.get(right.uid);
    const gap = rightPoint.x-leftX;

    /*
     * La pasada bottom-up puede dejar desplazado al último individuo
     * simple de una fratría. Solo corregimos un hueco claramente anómalo;
     * los huecos moderados se respetan.
     */
    if (gap <= C.siblingGap*1.75) {
      return;
    }

    rightPoint.x =
      leftX+C.siblingGap;
  });
}

function gestationRecipientParentUids(carrier) {
  const target = pregnancyCarrierTargetUid(carrier);
  if (!target) return [];

  const biological = parentagesOf(target)
    .filter(r =>
      (r.descent_type || "biological") === "biological" &&
      (r.parents || []).length
    );

  const preferred = biological.length
    ? biological
    : parentagesOf(target).filter(r => (r.parents || []).length);

  return [...new Set(
    preferred
      .flatMap(r => r.parents || [])
      .filter(uid => uid !== carrier.uid)
  )];
}

function placeStandaloneGestationalCarriers(byGen,pos) {
  const carriers = family.people.filter(p =>
    isPregnancyCarrierRecord(p) &&
    pregnancyCarrierTargetUid(p) &&
    pos.has(p.uid)
  );

  const minimumGap = C.coupleGap * 0.82;

  carriers.forEach(carrier => {
    const inUnion = family.relationships.some(r =>
      r.type === "union" &&
      (r.people || []).includes(carrier.uid)
    );

    if (inUnion) return;

    const point = pos.get(carrier.uid);
    const targetUid = pregnancyCarrierTargetUid(carrier);
    const targetPoint =
      targetUid && pos.has(targetUid)
        ? pos.get(targetUid)
        : null;

    if (!targetPoint) return;

    const parents = gestationRecipientParentUids(carrier)
      .filter(uid => pos.has(uid));

    let x = parents.length
      ? Math.max(...parents.map(uid => pos.get(uid).x)) + C.coupleGap
      : targetPoint.x + C.siblingGap;

    const occupied = [...pos.entries()]
      .filter(([uid,p]) =>
        uid !== carrier.uid &&
        p.generation === point.generation
      )
      .map(([uid,p]) => ({uid,x:p.x}));

    let attempts = 0;

    while (
      occupied.some(item => Math.abs(item.x-x) < minimumGap) &&
      attempts < 50
    ) {
      x += C.coupleGap;
      attempts += 1;
    }

    point.x = x;
  });
}

function alignGestationTargetsUnderCarriers(pos) {
  family.people
    .filter(p =>
      isPregnancyCarrierRecord(p) &&
      pregnancyCarrierTargetUid(p) &&
      pos.has(p.uid)
    )
    .forEach(carrier => {
      const targetUid = pregnancyCarrierTargetUid(carrier);
      if (!pos.has(targetUid)) return;

      pos.get(targetUid).x =
        pos.get(carrier.uid).x;
    });
}


function donorRecipientParentUids(donor) {
  const targets =
    donationTargetUids(donor);

  if (!targets.length) return [];

  const result = [];

  targets.forEach(target => {
    const biological =
      parentagesOf(target)
        .filter(r =>
          (r.descent_type || "biological") === "biological" &&
          (r.parents || []).length
        );

    const preferred =
      biological.length
        ? biological
        : parentagesOf(target)
            .filter(r =>
              (r.parents || []).length
            );

    preferred.forEach(r => {
      (r.parents || [])
        .forEach(uid =>
          result.push(uid)
        );
    });
  });

  return [...new Set(result)];
}

function donorTargetAnchorPoint(
  donor,
  pos
) {
  const points =
    donationTargetUids(donor)
      .filter(uid =>
        pos.has(uid)
      )
      .map(uid =>
        pos.get(uid)
      );

  if (!points.length) {
    return null;
  }

  return {
    x:
      points.reduce(
        (sum,p) => sum+p.x,
        0
      ) / points.length,
    y:
      points.reduce(
        (sum,p) => sum+p.y,
        0
      ) / points.length
  };
}

function donorTargetGroupKey(donor) {
  return donationTargetUids(donor)
    .slice()
    .sort()
    .join(",");
}

function placeDonorsBesideRecipientCouples(byGen,pos) {
  const donors = family.people
    .filter(p =>
      isDonorRecord(p) &&
      !isSurrogateOvumDonor(p) &&
      donationTargetUids(p).length &&
      pos.has(p.uid) &&
      !family.relationships.some(r => r.type === "union" && (r.people || []).includes(p.uid))
    )
    .sort((a,b) => {
      const ag =
        pos.get(a.uid)?.generation ?? 0;
      const bg =
        pos.get(b.uid)?.generation ?? 0;

      if (ag !== bg) return ag - bg;

      const ap =
        donorTargetAnchorPoint(
          a,
          pos
        );

      const bp =
        donorTargetAnchorPoint(
          b,
          pos
        );

      const ax =
        ap
          ? ap.x
          : (pos.get(a.uid)?.x ?? 0);

      const bx =
        bp
          ? bp.x
          : (pos.get(b.uid)?.x ?? 0);

      return ax-bx;
    });

  const minimumGap = C.coupleGap * 0.82;
  const donorGap = C.coupleGap;

  function sameGenerationOccupiedXs(gen,excludeUids=[]) {
    const excluded = new Set(
      Array.isArray(excludeUids)
        ? excludeUids
        : [excludeUids]
    );

    return [...pos.entries()]
      .filter(([uid,p]) =>
        !excluded.has(uid) &&
        p.generation === gen
      )
      .map(([uid,p]) => ({
        uid,
        x:p.x
      }));
  }

  function resolveCandidateX(baseX,direction,occupied) {
    let x = baseX;
    let attempts = 0;

    while (
      occupied.some(item => Math.abs(item.x - x) < minimumGap) &&
      attempts < 50
    ) {
      x += direction * C.coupleGap;
      attempts += 1;
    }

    return x;
  }

  function crossingScore(candidateX,targetX,occupied,ignoreUids=[]) {
    const low = Math.min(candidateX,targetX);
    const high = Math.max(candidateX,targetX);

    return occupied.filter(item =>
      !ignoreUids.includes(item.uid) &&
      item.x > low &&
      item.x < high
    ).length;
  }

  function donorTypeOrder(donor) {
    if (recordType(donor) === "ovum_donor") return 0;
    if (recordType(donor) === "sperm_donor") return 1;
    return 2;
  }

  function orderedDonorGroup(group) {
    return [...group].sort((a,b) =>
      donorTypeOrder(a) - donorTypeOrder(b) ||
      a.uid.localeCompare(
        b.uid,
        "es",
        {numeric:true}
      )
    );
  }

  function blockPositions(anchorX,direction,count) {
    if (direction < 0) {
      // El ancla es el donante más próximo a la pareja.
      // El bloque se extiende hacia la izquierda.
      return Array.from(
        {length:count},
        (_,i) =>
          anchorX -
          (count - 1 - i) * donorGap
      );
    }

    // El ancla es el donante más próximo a la pareja.
    // El bloque se extiende hacia la derecha.
    return Array.from(
      {length:count},
      (_,i) => anchorX + i * donorGap
    );
  }

  function blockCollides(xs,occupied) {
    return xs.some(x =>
      occupied.some(
        item =>
          Math.abs(item.x - x) <
          minimumGap
      )
    );
  }

  function resolveBlockAnchor(
    baseAnchor,
    direction,
    count,
    occupied
  ) {
    let anchor = baseAnchor;
    let attempts = 0;
    let xs =
      blockPositions(
        anchor,
        direction,
        count
      );

    while (
      blockCollides(xs,occupied) &&
      attempts < 50
    ) {
      anchor +=
        direction * C.coupleGap;

      xs =
        blockPositions(
          anchor,
          direction,
          count
        );

      attempts += 1;
    }

    return {
      anchor,
      xs
    };
  }

  function blockCrossingScore(
    xs,
    targetX,
    occupied,
    ignoreUids=[]
  ) {
    return xs.reduce(
      (sum,x) =>
        sum +
        crossingScore(
          x,
          targetX,
          occupied,
          ignoreUids
        ),
      0
    );
  }

  function placementBases(donor,targetPoint) {
    const parents =
      donorRecipientParentUids(donor)
        .filter(uid => pos.has(uid));

    let leftBase;
    let rightBase;
    let ignored = [];

    if (parents.length) {
      const parentXs =
        parents.map(
          uid => pos.get(uid).x
        );

      ignored = [...parents];

      leftBase =
        Math.min(...parentXs) -
        C.coupleGap;

      rightBase =
        Math.max(...parentXs) +
        C.coupleGap;
    } else {
      leftBase =
        targetPoint.x -
        C.siblingGap;

      rightBase =
        targetPoint.x +
        C.siblingGap;
    }

    return {
      leftBase,
      rightBase,
      ignored
    };
  }

  /*
   * Doble donación (o varios donantes con un mismo resultado):
   * se trata como un único bloque para evitar que el algoritmo coloque
   * un donante a cada lado de la pareja receptora.
   */
  const groupedByTarget = new Map();

  donors.forEach(donor => {
    const targetKey =
      donorTargetGroupKey(donor);

    const generation =
      pos.get(donor.uid)
        ?.generation ?? 0;

    const key =
      `${generation}::${targetKey}`;

    if (!groupedByTarget.has(key)) {
      groupedByTarget.set(key,[]);
    }

    groupedByTarget
      .get(key)
      .push(donor);
  });

  const processed = new Set();

  [...groupedByTarget.values()]
    .filter(group => group.length > 1)
    .sort((a,b) => {
      const ap =
        donorTargetAnchorPoint(
          a[0],
          pos
        );

      const bp =
        donorTargetAnchorPoint(
          b[0],
          pos
        );

      return (
        (ap ? ap.x : 0) -
        (bp ? bp.x : 0)
      );
    })
    .forEach(rawGroup => {
      const group =
        orderedDonorGroup(rawGroup);

      const targetPoint =
        donorTargetAnchorPoint(
          group[0],
          pos
        );

      if (!targetPoint) return;

      const gen =
        pos.get(group[0].uid)
          .generation;

      const groupUids =
        group.map(d => d.uid);

      const {
        leftBase,
        rightBase,
        ignored
      } =
        placementBases(
          group[0],
          targetPoint
        );

      const occupied =
        sameGenerationOccupiedXs(
          gen,
          groupUids
        );

      const left =
        resolveBlockAnchor(
          leftBase,
          -1,
          group.length,
          occupied
        );

      const right =
        resolveBlockAnchor(
          rightBase,
          +1,
          group.length,
          occupied
        );

      const leftScore =
        blockCrossingScore(
          left.xs,
          targetPoint.x,
          occupied,
          ignored
        );

      const rightScore =
        blockCrossingScore(
          right.xs,
          targetPoint.x,
          occupied,
          ignored
        );

      let chosen;

      if (leftScore < rightScore) {
        chosen = left;
      } else if (
        rightScore < leftScore
      ) {
        chosen = right;
      } else {
        const leftCenter =
          left.xs.reduce(
            (a,b) => a+b,
            0
          ) /
          left.xs.length;

        const rightCenter =
          right.xs.reduce(
            (a,b) => a+b,
            0
          ) /
          right.xs.length;

        const leftDistance =
          Math.abs(
            leftCenter -
            targetPoint.x
          );

        const rightDistance =
          Math.abs(
            rightCenter -
            targetPoint.x
          );

        if (
          leftDistance <
          rightDistance
        ) {
          chosen = left;
        } else if (
          rightDistance <
          leftDistance
        ) {
          chosen = right;
        } else {
          // Conservamos el desempate histórico hacia la derecha.
          chosen = right;
        }
      }

      group.forEach((donor,i) => {
        pos.get(donor.uid).x =
          chosen.xs[i];

        processed.add(donor.uid);
      });
    });

  /*
   * Donante único:
   * conserva el comportamiento validado de 0.6.57–0.6.73.
   */
  donors.forEach(donor => {
    if (processed.has(donor.uid)) {
      return;
    }

    const point = pos.get(donor.uid);
    const gen = point.generation;

    const targetPoint =
      donorTargetAnchorPoint(
        donor,
        pos
      );

    if (!targetPoint) return;

    const {
      leftBase,
      rightBase,
      ignored
    } =
      placementBases(
        donor,
        targetPoint
      );

    const occupied =
      sameGenerationOccupiedXs(
        gen,
        donor.uid
      );

    const leftX =
      resolveCandidateX(
        leftBase,
        -1,
        occupied
      );

    const rightX =
      resolveCandidateX(
        rightBase,
        +1,
        occupied
      );

    const leftScore =
      crossingScore(
        leftX,
        targetPoint.x,
        occupied,
        ignored
      );

    const rightScore =
      crossingScore(
        rightX,
        targetPoint.x,
        occupied,
        ignored
      );

    let chosenX;

    if (leftScore < rightScore) {
      chosenX = leftX;
    } else if (
      rightScore < leftScore
    ) {
      chosenX = rightX;
    } else {
      const leftDistance =
        Math.abs(
          leftX -
          targetPoint.x
        );

      const rightDistance =
        Math.abs(
          rightX -
          targetPoint.x
        );

      if (
        leftDistance <
        rightDistance
      ) {
        chosenX = leftX;
      } else if (
        rightDistance <
        leftDistance
      ) {
        chosenX = rightX;
      } else {
        chosenX = rightX;
      }
    }

    point.x = chosenX;
  });
}

/*
 * 0.8.68 — participantes reproductivos junto a la pareja receptora.
 *
 * Los pasadores anteriores evitan colisiones BUSCANDO un hueco. Cuando la
 * pareja está entre hermanos, eso puede mandar D/G después de toda la
 * fratría (FAM001: II-3 -> II-4 -> D). Para respetar la lectura de Bennett,
 * preferimos INSERTAR D/G al costado de la pareja y abrir el corredor
 * desplazando hacia fuera lo imprescindible. El miembro desplazado sigue
 * siendo el mismo y las líneas de fratría se redibujan con sus coordenadas.
 *
 * Nunca se crean enlaces de pareja o de filiación desde D/G: este cambio
 * afecta exclusivamente a las coordenadas de representación.
 */
function reproductiveRecipientUidsForTarget(targetUid,pos) {
  const target = personByUid(targetUid);
  if (!target) return [];

  // En doble donación + G (T30) los progenitores intencionales se
  // identifican expresamente: no hay que inventar filiación biológica.
  let recipients = intendedParentUids(target)
    .filter(uid => pos.has(uid));

  if (!recipients.length) {
    const parentages = parentagesOf(targetUid)
      .filter(r => (r.parents || []).some(uid => pos.has(uid)));
    const biological = parentages.filter(r =>
      (r.descent_type || "biological") === "biological"
    );
    recipients = [...new Set(
      (biological.length ? biological : parentages)
        .flatMap(r => r.parents || [])
        .filter(uid => pos.has(uid) &&
          !isDonorRecord(personByUid(uid)) &&
          !isPregnancyCarrierRecord(personByUid(uid)))
    )];
  }

  // Si únicamente consta el progenitor gestante, añadir su pareja real
  // de esa generación. El donante NO constituye una pareja por este hecho.
  const expanded = new Set(recipients);
  family.relationships
    .filter(r => r.type === "union" && (r.people || []).length === 2)
    .forEach(r => {
      const [a,b] = r.people;
      if (expanded.has(a) && pos.has(b) &&
          pos.get(a).generation === pos.get(b).generation &&
          !isDonorRecord(personByUid(b)) &&
          !isPregnancyCarrierRecord(personByUid(b))) expanded.add(b);
      if (expanded.has(b) && pos.has(a) &&
          pos.get(a).generation === pos.get(b).generation &&
          !isDonorRecord(personByUid(a)) &&
          !isPregnancyCarrierRecord(personByUid(a))) expanded.add(a);
    });
  return [...expanded];
}

function placeReproductiveSupportNearRecipients(byGen,pos) {
  const auxiliary = family.people
    .filter(p => (
      isDonorRecord(p) || isPregnancyCarrierRecord(p)
    ) && pos.has(p.uid))
    .filter(p => !family.relationships.some(r =>
      r.type === "union" && (r.people || []).includes(p.uid)))
    .map(p => ({
      person:p,
      targets: isDonorRecord(p) ? donationTargetUids(p) :
        [pregnancyCarrierTargetUid(p)].filter(Boolean)
    }))
    .filter(item => item.targets.some(uid => pos.has(uid)));

  const groups = new Map();
  auxiliary.forEach(item => {
    // Un mismo donante puede participar en varias gestaciones. Si las
    // parejas receptoras son distintas no se puede poner junto a todas;
    // elegimos la gestación más próxima al centro de sus destinos.
    const validTargets = item.targets.filter(uid => pos.has(uid));
    const targetCenter = validTargets.reduce((sum,uid) =>
      sum + pos.get(uid).x,0) / validTargets.length;
    const primaryTarget = [...validTargets].sort((a,b) =>
      Math.abs(pos.get(a).x-targetCenter) -
      Math.abs(pos.get(b).x-targetCenter))[0];
    const candidateRecipients = reproductiveRecipientUidsForTarget(
      primaryTarget,pos).filter(uid => pos.has(uid));
    if (!candidateRecipients.length) return;

    const gen = pos.get(item.person.uid).generation;
    const recipients = candidateRecipients.filter(uid =>
      pos.get(uid).generation === gen);
    if (!recipients.length) return;

    const key = `${gen}::${recipients.slice().sort().join(",")}`;
    if (!groups.has(key)) groups.set(key,{
      generation:gen, recipients, members:[], targets:new Set()
    });
    const group = groups.get(key);
    group.members.push(item.person);
    item.targets.forEach(uid => group.targets.add(uid));
  });

  const minimumGap = C.coupleGap * 0.82;
  const positions = [...groups.values()].sort((a,b) => {
    const ax = Math.max(...a.recipients.map(uid => pos.get(uid).x));
    const bx = Math.max(...b.recipients.map(uid => pos.get(uid).x));
    return ax - bx;
  });

  positions.forEach(group => {
    const recipientXs = group.recipients.map(uid => pos.get(uid).x);
    const left = Math.min(...recipientXs);
    const right = Math.max(...recipientXs);
    const gen = group.generation;
    const memberUids = new Set(group.members.map(p => p.uid));
    const protectedUids = new Set([...group.recipients,...memberUids]);
    const occupied = [...pos.entries()]
      .filter(([uid,p]) => p.generation === gen && !protectedUids.has(uid))
      .map(([uid,p]) => ({uid,x:p.x}));

    // Determinismo en el orden de un bloque D+D+G: óvulo, esperma,
    // gestante. Con G al extremo, el embarazo puede quedar bajo G.
    group.members.sort((a,b) => {
      const order = p => isPregnancyCarrierRecord(p) ? 2 :
        (recordType(p) === "ovum_donor" ? 0 : 1);
      return order(a)-order(b) || a.uid.localeCompare(b.uid,"es",{numeric:true});
    });

    const count = group.members.length;
    const rightXs = Array.from({length:count},(_,i) =>
      right + (i+1)*C.coupleGap);
    const leftXs = Array.from({length:count},(_,i) =>
      left - (count-i)*C.coupleGap);

    function evaluate(side,xs) {
      // Se inserta un bloque contiguo sin alterar el orden relativo de las
      // personas que ya había a ese lado. A diferencia de buscar un hueco,
      // el coste mide el espacio que realmente hay que abrir.
      const edge = side === 1 ? right : left;
      const outward = occupied.filter(item =>
        side === 1 ? item.x > edge + 0.1 : item.x < edge - 0.1);
      const nearest = outward.length ?
        (side === 1 ? Math.min(...outward.map(p=>p.x)) :
          Math.max(...outward.map(p=>p.x))) : null;
      const blockEdge = side === 1 ? xs[xs.length-1] : xs[0];
      const shift = nearest === null ? 0 : Math.max(0,
        side === 1 ? blockEdge + minimumGap - nearest :
          nearest - (blockEdge - minimumGap));
      // No romper uniones existentes que atraviesen la frontera de inserción.
      const crossedUnion = family.relationships.some(r => {
        if (r.type !== "union" || (r.people || []).length !== 2) return false;
        const [a,b] = r.people;
        if (!pos.has(a) || !pos.has(b) ||
            pos.get(a).generation !== gen || pos.get(b).generation !== gen) return false;
        const aMoves = outward.some(item => item.uid===a);
        const bMoves = outward.some(item => item.uid===b);
        return aMoves !== bMoves;
      });
      return {side,xs,outward,shift,cost: shift*outward.length +
        (crossedUnion ? 100000 : 0)};
    }

    const toRight = evaluate(1,rightXs);
    const toLeft = evaluate(-1,leftXs);
    // Preferencia derecha, pero se utiliza el lado izquierdo cuando la
    // inserción a la derecha desplazaría mucho más la familia.
    const chosen = toLeft.cost + C.coupleGap*0.15 < toRight.cost
      ? toLeft : toRight;

    chosen.outward.forEach(item => {
      const point = pos.get(item.uid);
      point.x += chosen.side*chosen.shift;
    });
    group.members.forEach((p,i) => { pos.get(p.uid).x = chosen.xs[i]; });
  });

  // Se aplica DESPUÉS de la nueva posición de G/surrogate. Nunca
  // movemos el feto bajo un donante que no haya llevado la gestación.
  alignGestationTargetsUnderCarriers(pos);
}

/* Bennett et al., 2025 correction, Fig. 5.1.d:
 * Keep the pregnancy below the explicitly assigned AFAB gestator, with
 * a single sperm donor diagonally to the left. This is intentionally
 * restricted to a standalone, single-outcome donor and a pregnancy that
 * has no sibling on the same parentage relation; shared donors and
 * complex sibships retain the existing layout algorithms.
 */
function alignFigureFiveGestationWithSpermDonor(pos) {
  family.relationships.filter(r => r.type === "gestation").forEach(r => {
    const carrierPoint = pos.get(r.carrier);
    const targetPoint = pos.get(r.target);
    const target = personByUid(r.target);
    if (!carrierPoint || !targetPoint ||
        !target || !["fetus","stillbirth","sab","top","ect"].includes(recordType(target))) return;
    if (hasPregnancyCarrierForTarget(r.target)) return;
    if (parentagesOf(r.target).some(rel => (rel.children || []).length > 1)) return;
    const donorRecords = donorRecordsForTarget(r.target,"sperm_donor");
    if (donorRecords.length !== 1) return;
    const donor = donorRecords[0];
    if (donationTargetUids(donor).length !== 1 || !pos.has(donor.uid) ||
        family.relationships.some(rel => rel.type === "union" && (rel.people || []).includes(donor.uid))) return;
    const donorPoint = pos.get(donor.uid);
    if (donorPoint.generation !== carrierPoint.generation) return;

    const clearance = C.coupleGap * .83;
    const proposedDonorX = carrierPoint.x - C.coupleGap;
    const donorSpaceClear = [...pos.entries()].every(([uid,point]) =>
      uid === donor.uid || uid === r.carrier ||
      point.generation !== donorPoint.generation ||
      Math.abs(point.x-proposedDonorX) >= clearance
    );
    const targetSpaceClear = [...pos.entries()].every(([uid,point]) =>
      uid === r.target || point.generation !== targetPoint.generation ||
      Math.abs(point.x-carrierPoint.x) >= C.siblingGap * .76
    );
    if (donorSpaceClear && targetSpaceClear) {
      donorPoint.x = proposedDonorX;
      targetPoint.x = carrierPoint.x;
    }
  });
}

function normalizeLayoutBounds(pos) {
  const points = Array.from(pos.values());
  if (!points.length) return {width:760};

  let minX = Math.min(...points.map(p=>p.x));
  let maxX = Math.max(...points.map(p=>p.x));

  /*
   * 0.7.61 — compactación final conservadora del lienzo.
   *
   * En pedigrees muy amplios las sucesivas fases de centrado pueden dejar
   * TODO el árbol desplazado hacia la derecha. Hasta ahora sólo corregíamos
   * el caso contrario (minX < marginX), por lo que ese hueco quedaba
   * incorporado al ancho final del SVG.
   *
   * Aquí no modificamos absolutamente ninguna distancia interna ni el orden
   * de las ramas: trasladamos el layout completo como un bloque rígido para
   * que su extremo izquierdo quede siempre en el margen normal. De este modo
   * se elimina únicamente espacio exterior demostrablemente vacío, se
   * conservan los overrides manuales relativos y no pueden aparecer cruces
   * nuevos por esta operación.
   */
  /*
   * 0.7.62 — la compactación a la izquierda sólo se aplica cuando el
   * pedigree necesita realmente desplazamiento horizontal. Si el árbol
   * cabe en el viewport, conservamos el centrado calculado por el motor.
   *
   * Seguimos corrigiendo siempre el caso minX < marginX para que ningún
   * símbolo invada el margen izquierdo.
   */
  const container = $("pedigreeContainer");
  const availableWidth =
    container && container.clientWidth > 0
      ? container.clientWidth
      : 760;

  const naturalWidthBeforeCompaction =
    Math.max(760,maxX+C.marginX);

  const needsHorizontalScroll =
    naturalWidthBeforeCompaction > availableWidth + 2;

  let shift = 0;

  // 0.7.63 — en pedigrees anchos conservamos un pequeño colchón
  // adicional a la izquierda. Los árboles que caben en pantalla siguen
  // usando exactamente el centrado normal de 0.7.62.
  const compactLeftMargin = C.marginX + 25;

  if (minX < C.marginX) {
    shift = C.marginX-minX;
  } else if (needsHorizontalScroll && minX > compactLeftMargin) {
    shift = compactLeftMargin-minX;
  }

  if (Math.abs(shift) > 0.01) {
    pos.forEach(p=>p.x+=shift);
    minX += shift;
    maxX += shift;
  }

  return {width:Math.max(760,maxX+C.marginX)};
}

function snapshotLayoutX(
  pos
) {
  return new Map(
    [...pos.entries()]
      .map(([uid,point]) => [
        uid,
        point.x
      ])
  );
}

function maximumLayoutXChange(
  before,
  pos
) {
  let maximum = 0;

  before.forEach((x,uid) => {
    if (!pos.has(uid)) return;

    maximum =
      Math.max(
        maximum,
        Math.abs(
          pos.get(uid).x-x
        )
      );
  });

  return maximum;
}

/*
 * T23 — primero POSICIONAR, después enrutar.
 *
 * T22c introdujo correctamente la diagonal como fallback cuando el punto
 * medio parental y el centro de la descendencia no coinciden. Sin embargo,
 * antes de aceptar esa diagonal debemos intentar una última reconciliación
 * geométrica cuando el movimiento es estructuralmente seguro.
 *
 * Prioridad:
 *
 *   1) mover horizontalmente una pareja parental simple y libre;
 *   2) si los padres no pueden moverse, mover una fratría terminal/libre;
 *   3) solo si ninguna operación es posible, mantener la diagonal T22c.
 *
 * Ejemplos objetivo:
 * - I-3/I-4: pareja raíz simple -> mover la pareja sobre II-5/II-6.
 * - III-1/III-3 -> IV-1: unión compleja/no adyacente -> mover IV-1 al
 *   punto medio de los padres.
 * - II-1/II-2: si el bloque vecino impide llegar al centro, se desplaza
 *   solo hasta el límite seguro y la diferencia restante queda diagonal.
 */

function representedOriginIsEmptyForUid(
  uid
) {
  return (
    originGroupKeys(uid)
      .length === 0
  );
}

function exactUnitIndexForMembers(
  units,
  memberUids
) {
  const wanted =
    new Set(memberUids || []);

  return units.findIndex(unit => {
    if (
      !unit ||
      !Array.isArray(unit.members) ||
      unit.members.length !==
        wanted.size
    ) {
      return false;
    }

    return unit.members
      .every(uid =>
        wanted.has(uid)
      );
  });
}

function bottomUpUnitCenterBounds(
  units,
  index,
  pos
) {
  const unit =
    units[index];

  if (!unit) {
    return {
      minimum:-Infinity,
      maximum:Infinity
    };
  }

  let minimum =
    -Infinity;

  let maximum =
    Infinity;

  if (index > 0) {
    const left =
      units[index-1];

    minimum =
      left.currentCenter +
      left.width/2 +
      bottomUpUnitGap(
        left,
        unit,
        pos
      ) +
      unit.width/2;
  }

  if (index < units.length-1) {
    const right =
      units[index+1];

    maximum =
      right.currentCenter -
      right.width/2 -
      bottomUpUnitGap(
        unit,
        right,
        pos
      ) -
      unit.width/2;
  }

  return {
    minimum,
    maximum
  };
}

/*
 * 0.7.38 — expansión horizontal antes de aceptar diagonales.
 *
 * Cuando el centro deseado de una unidad parental o de una fratría queda
 * fuera del hueco disponible, no lo recortamos inmediatamente contra el
 * vecino. Primero abrimos la fila desplazando hacia fuera los bloques que
 * estorban. Esto aumenta el ancho total del pedigree, pero conserva el orden
 * y permite que el eje parental quede vertical sobre su descendencia.
 */
function shiftLayoutMembers(memberUids,delta,pos) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) return;
  (memberUids || []).forEach(uid => {
    const point = pos.get(uid);
    if (point) point.x += delta;
  });
}


function personVisualHalfWidthForCollision(uid) {
  const p = personByUid(uid);
  if (!p) return C.symbolSize/2;

  // Los corchetes de adopción sobresalen del símbolo. El cálculo replica
  // la geometría usada por shape(): outer = h + 8; inner = 4.5.
  if (isAdoptedPerson(p)) {
    return C.symbolSize/2 + 12.5;
  }

  return C.symbolSize/2;
}

function safeOutwardBranchShift(memberUids,requestedDelta,byGen,pos) {
  if (!memberUids || !memberUids.length || !Number.isFinite(requestedDelta)) {
    return 0;
  }

  const moving = new Set(memberUids.filter(uid => pos.has(uid)));
  if (!moving.size) return 0;

  const clearance = 24;
  let minimumDelta = -Infinity;
  let maximumDelta = Infinity;

  const generations = [...new Set(
    [...moving].map(uid => pos.get(uid).generation)
  )];

  generations.forEach(gen => {
    const movingHere = [...moving]
      .filter(uid => pos.get(uid).generation === gen);

    const fixedHere = (byGen.get(gen) || [])
      .map(p => p.uid)
      .filter(uid => pos.has(uid) && !moving.has(uid));

    movingHere.forEach(movingUid => {
      const mp = pos.get(movingUid);
      const mh = personVisualHalfWidthForCollision(movingUid);

      fixedHere.forEach(fixedUid => {
        const fp = pos.get(fixedUid);
        const fh = personVisualHalfWidthForCollision(fixedUid);

        if (fp.x < mp.x) {
          minimumDelta = Math.max(
            minimumDelta,
            fp.x + fh + clearance - (mp.x - mh)
          );
        } else if (fp.x > mp.x) {
          maximumDelta = Math.min(
            maximumDelta,
            fp.x - fh - clearance - (mp.x + mh)
          );
        }
      });
    });
  });

  const delta = Math.max(
    minimumDelta,
    Math.min(maximumDelta, requestedDelta)
  );

  if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) return 0;
  shiftLayoutMembers([...moving],delta,pos);
  return delta;
}

/*
 * 0.8.12 — separación final de ramas junto a adopciones complejas.
 *
 * Un Adopted in que conserva también a sus progenitores biológicos puede
 * recibir dos filiaciones distintas. Durante el centrado iterativo, esa rama
 * doble puede acercarse demasiado a un hermano biológico simple y los
 * corchetes de adopción quedan prácticamente pegados al símbolo vecino.
 *
 * No abrimos toda la generación: movemos hacia fuera únicamente la rama
 * simple adyacente, manteniendo juntos sus descendientes y parejas libres.
 * Así se conserva la geometría de la familia adoptiva/biológica compleja y
 * se evita el solapamiento visual de símbolos/corchetes.
 */
function resolveComplexAdoptionNeighborSpacing(byGen,pos) {
  const requiredClearance = 24;

  for (let pass=0; pass<4; pass++) {
    let changed = false;

    Array.from(byGen.keys()).sort((a,b)=>a-b).forEach(gen => {
      const ordered = (byGen.get(gen) || [])
        .map(p => p.uid)
        .filter(uid => pos.has(uid))
        .sort((a,b)=>pos.get(a).x-pos.get(b).x);

      for (let i=0; i<ordered.length-1; i++) {
        const leftUid = ordered[i];
        const rightUid = ordered[i+1];

        if (relationshipPairType(leftUid,rightUid) === "union" ||
            relationshipPairType(leftUid,rightUid) === "twin") {
          continue;
        }

        const leftDual = hasBiologicalAndAdoptiveParentage(leftUid);
        const rightDual = hasBiologicalAndAdoptiveParentage(rightUid);

        // Esta corrección es deliberadamente específica: una rama con
        // filiación biológica+adoptiva junto a una rama simple.
        if (leftDual === rightDual) continue;

        const simpleUid = leftDual ? rightUid : leftUid;
        const complexUid = leftDual ? leftUid : rightUid;
        const simplePerson = personByUid(simpleUid);
        const complexPerson = personByUid(complexUid);

        if (!simplePerson || !complexPerson || !isAdoptedPerson(complexPerson)) {
          continue;
        }

        const simpleX = pos.get(simpleUid).x;
        const complexX = pos.get(complexUid).x;
        const currentGap = Math.abs(complexX-simpleX);
        const neededGap =
          personVisualHalfWidthForCollision(simpleUid) +
          personVisualHalfWidthForCollision(complexUid) +
          requiredClearance;

        if (currentGap >= neededGap-0.5) continue;

        const direction = simpleX < complexX ? -1 : 1;
        const requestedDelta = direction*(neededGap-currentGap);

        const members =
          collectMovableDescendantBranchForParentage(
            {children:[simpleUid]},
            pos
          ) || [simpleUid];

        // Si por una unión anclada la rama compleja acabara dentro del bloque
        // a mover, no hacemos nada: sería peor desestructurar ambas familias.
        if (members.includes(complexUid)) continue;

        const applied = safeOutwardBranchShift(
          members,
          requestedDelta,
          byGen,
          pos
        );

        if (Math.abs(applied) >= 0.5) {
          changed = true;
        }
      }
    });

    if (!changed) break;
  }
}

function makeRoomForBottomUpUnitCenter(units,index,desired,pos) {
  const bounds = bottomUpUnitCenterBounds(units,index,pos);
  if (!Number.isFinite(desired)) return;

  if (desired < bounds.minimum && index > 0) {
    const extra = bounds.minimum-desired;
    for (let i=0;i<index;i++) {
      shiftLayoutMembers(units[i].members,-extra,pos);
      units[i].currentCenter -= extra;
      units[i].center = (units[i].center ?? units[i].currentCenter)-extra;
    }
  } else if (desired > bounds.maximum && index < units.length-1) {
    const extra = desired-bounds.maximum;
    for (let i=index+1;i<units.length;i++) {
      shiftLayoutMembers(units[i].members,extra,pos);
      units[i].currentCenter += extra;
      units[i].center = (units[i].center ?? units[i].currentCenter)+extra;
    }
  }
}

function makeRoomForGenerationFamilyBlock(targetMembers,generation,byGen,pos,desired) {
  const arr = byGen.get(generation) || [];
  const blocks = generationFamilyBlocks(arr)
    .map(members => {
      const xs = members.filter(uid=>pos.has(uid)).map(uid=>pos.get(uid).x);
      if (!xs.length) return null;
      return {
        members,
        center:(Math.min(...xs)+Math.max(...xs))/2,
        width:Math.max(...xs)-Math.min(...xs),
        parentSets:parentSetsForBlock(members)
      };
    })
    .filter(Boolean)
    .sort((a,b)=>a.center-b.center);

  const wanted = new Set(targetMembers || []);
  const index = blocks.findIndex(block =>
    block.members.length === wanted.size &&
    block.members.every(uid=>wanted.has(uid))
  );
  if (index < 0 || !Number.isFinite(desired)) return;

  const block = blocks[index];
  let minimum=-Infinity, maximum=Infinity;
  if (index>0) {
    const left=blocks[index-1];
    minimum=left.center+left.width/2+adjacentFamilyBlockGap(left,block)+block.width/2;
  }
  if (index<blocks.length-1) {
    const right=blocks[index+1];
    maximum=right.center-right.width/2-adjacentFamilyBlockGap(block,right)-block.width/2;
  }

  if (desired < minimum && index>0) {
    const extra=minimum-desired;
    for (let i=0;i<index;i++) shiftLayoutMembers(blocks[i].members,-extra,pos);
  } else if (desired > maximum && index<blocks.length-1) {
    const extra=desired-maximum;
    for (let i=index+1;i<blocks.length;i++) shiftLayoutMembers(blocks[i].members,extra,pos);
  }
}

function translateMembersToCenter(
  memberUids,
  targetCenter,
  pos
) {
  const xs =
    (memberUids || [])
      .filter(uid =>
        pos.has(uid)
      )
      .map(uid =>
        pos.get(uid).x
      );

  if (
    !xs.length ||
    !Number.isFinite(
      targetCenter
    )
  ) {
    return 0;
  }

  const currentCenter =
    (
      Math.min(...xs) +
      Math.max(...xs)
    ) / 2;

  const delta =
    targetCenter-currentCenter;

  if (
    Math.abs(delta) <
    0.5
  ) {
    return 0;
  }

  (memberUids || [])
    .forEach(uid => {
      const point =
        pos.get(uid);

      if (point) {
        point.x += delta;
      }
    });

  return delta;
}

function tryPhysicallyCenterSimpleRootPair(
  parentage,
  byGen,
  pos
) {
  const parentUids =
    (parentage.parents || [])
      .filter(uid =>
        pos.has(uid)
      );

  if (
    parentUids.length !== 2
  ) {
    return 0;
  }

  const union =
    unionForParents(
      parentUids
    );

  if (
    !union ||
    unionCountForLayout(
      parentUids[0]
    ) !== 1 ||
    unionCountForLayout(
      parentUids[1]
    ) !== 1
  ) {
    return 0;
  }

  /*
   * Esta pasada es deliberadamente conservadora: mueve parejas raíz
   * libres. Si uno de sus miembros tiene una familia de origen
   * representada, desplazar solo la pareja podría falsear la fratría
   * superior o el birth_order.
   */
  if (
    !parentUids.every(uid =>
      representedOriginIsEmptyForUid(
        uid
      )
    )
  ) {
    return 0;
  }

  const p0 =
    pos.get(parentUids[0]);

  const p1 =
    pos.get(parentUids[1]);

  if (
    p0.generation !==
      p1.generation
  ) {
    return 0;
  }

  const generation =
    p0.generation;

  const desired =
    descendantCenterForParentSet(
      parentUids,
      pos
    );

  if (
    desired === null ||
    !Number.isFinite(desired)
  ) {
    return 0;
  }

  const units =
    buildBottomUpRowUnits(
      generation,
      byGen,
      pos
    );

  const unitIndex =
    exactUnitIndexForMembers(
      units,
      parentUids
    );

  if (unitIndex < 0) {
    return 0;
  }

  const unit =
    units[unitIndex];

  /*
   * Una cadena rígida de múltiples uniones nunca se mueve mediante T23.
   */
  if (
    unit.rigidMultipleUnion
  ) {
    return 0;
  }

  // 0.7.38: si un vecino impide el centrado, ensanchamos primero la fila.
  makeRoomForBottomUpUnitCenter(
    units,
    unitIndex,
    desired,
    pos
  );

  const bounds =
    bottomUpUnitCenterBounds(
      units,
      unitIndex,
      pos
    );

  const target =
    Math.max(
      bounds.minimum,
      Math.min(
        bounds.maximum,
        desired
      )
    );

  return translateMembersToCenter(
    parentUids,
    target,
    pos
  );
}

function personIsTerminalForMidpointShift(
  uid
) {
  if (
    unionCountForLayout(uid) !== 0
  ) {
    return false;
  }

  if (
    hasRepresentedDescendants(
      uid
    )
  ) {
    return false;
  }

  return true;
}

function exactGenerationFamilyBlockForChildren(
  childUids,
  generation,
  byGen
) {
  const arr =
    byGen.get(generation) || [];

  const wanted =
    new Set(childUids || []);

  return generationFamilyBlocks(arr)
    .find(members =>
      members.length ===
        wanted.size &&
      members.every(uid =>
        wanted.has(uid)
      )
    ) || null;
}

function generationFamilyBlockCenterBounds(
  targetMembers,
  generation,
  byGen,
  pos
) {
  const arr =
    byGen.get(generation) || [];

  const blocks =
    generationFamilyBlocks(arr)
      .map((members,index) => {
        const xs =
          members
            .filter(uid =>
              pos.has(uid)
            )
            .map(uid =>
              pos.get(uid).x
            );

        if (!xs.length) {
          return null;
        }

        return {
          members,
          originalIndex:index,
          center:
            (
              Math.min(...xs) +
              Math.max(...xs)
            ) / 2,
          width:
            Math.max(...xs) -
            Math.min(...xs),
          parentSets:
            parentSetsForBlock(
              members
            )
        };
      })
      .filter(Boolean)
      .sort((a,b) =>
        a.center-b.center
      );

  const wanted =
    new Set(targetMembers || []);

  const index =
    blocks.findIndex(block =>
      block.members.length ===
        wanted.size &&
      block.members.every(uid =>
        wanted.has(uid)
      )
    );

  if (index < 0) {
    return null;
  }

  const block =
    blocks[index];

  let minimum =
    -Infinity;

  let maximum =
    Infinity;

  if (index > 0) {
    const left =
      blocks[index-1];

    minimum =
      left.center +
      left.width/2 +
      adjacentFamilyBlockGap(
        left,
        block
      ) +
      block.width/2;
  }

  if (
    index <
    blocks.length-1
  ) {
    const right =
      blocks[index+1];

    maximum =
      right.center -
      right.width/2 -
      adjacentFamilyBlockGap(
        block,
        right
      ) -
      block.width/2;
  }

  return {
    minimum,
    maximum
  };
}

function parentMidpointForPhysicalShift(
  parentUids,
  pos
) {
  const xs =
    (parentUids || [])
      .filter(uid =>
        pos.has(uid)
      )
      .map(uid =>
        pos.get(uid).x
      );

  if (!xs.length) {
    return null;
  }

  return xs.reduce(
    (sum,x) =>
      sum+x,
    0
  ) / xs.length;
}

function tryPhysicallyCenterTerminalChildren(
  parentage,
  byGen,
  pos
) {
  const parentUids =
    (parentage.parents || [])
      .filter(uid =>
        pos.has(uid)
      );

  const childUids =
    (parentage.children || [])
      .filter(uid =>
        pos.has(uid)
      );

  if (
    !parentUids.length ||
    !childUids.length
  ) {
    return 0;
  }

  /*
   * Solo movemos una fratría terminal/libre. Si uno de los hijos forma
   * pareja o tiene descendencia, desplazar el bloque podría arrastrar una
   * rama compleja y se deja al layout general.
   */
  if (
    !childUids.every(uid =>
      personIsTerminalForMidpointShift(
        uid
      )
    )
  ) {
    return 0;
  }

  const generations =
    childUids.map(uid =>
      pos.get(uid).generation
    );

  if (
    !generations.every(g =>
      g === generations[0]
    )
  ) {
    return 0;
  }

  const generation =
    generations[0];

  const familyBlock =
    exactGenerationFamilyBlockForChildren(
      childUids,
      generation,
      byGen
    );

  if (!familyBlock) {
    return 0;
  }

  const desired =
    parentMidpointForPhysicalShift(
      parentUids,
      pos
    );

  if (
    desired === null ||
    !Number.isFinite(desired)
  ) {
    return 0;
  }

  // 0.7.38: preferimos abrir espacio horizontal a conservar una diagonal.
  makeRoomForGenerationFamilyBlock(
    familyBlock,
    generation,
    byGen,
    pos,
    desired
  );

  const bounds =
    generationFamilyBlockCenterBounds(
      familyBlock,
      generation,
      byGen,
      pos
    );

  if (!bounds) {
    return 0;
  }

  const target =
    Math.max(
      bounds.minimum,
      Math.min(
        bounds.maximum,
        desired
      )
    );

  return translateMembersToCenter(
    familyBlock,
    target,
    pos
  );
}


/*
 * 0.7.39 — centrado de una rama descendente completa.
 *
 * 0.7.38 no resolvía el caso en el que los progenitores no podían moverse
 * porque uno de ellos pertenecía a una fratría superior, y los hijos ya no
 * eran terminales. En ese patrón la diagonal seguía apareciendo aunque toda
 * la rama inferior pudiera desplazarse como un bloque rígido.
 *
 * Aquí recogemos la descendencia de la filiación, incluyendo parejas "libres"
 * (sin familia de origen representada) y sus descendientes, y desplazamos el
 * conjunto hasta el eje parental. No arrastramos una pareja que esté anclada
 * a otra fratría de origen: en ese caso conservamos el fallback diagonal.
 */
function collectMovableDescendantBranchForParentage(parentage,pos) {
  const roots=(parentage.children || []).filter(uid=>pos.has(uid));
  if (!roots.length) return null;

  const moving=new Set(roots);
  const queue=[...roots];

  while (queue.length) {
    const uid=queue.shift();

    // Descendencia biológica/adoptiva representada desde este individuo.
    family.relationships.forEach(r=>{
      if (r.type !== "parentage") return;
      if (!(r.parents || []).includes(uid)) return;
      (r.children || []).forEach(child=>{
        if (pos.has(child) && !moving.has(child)) {
          moving.add(child);
          queue.push(child);
        }
      });
    });

    // Parejas necesarias para mantener intacta la geometría de la rama.
    family.relationships.forEach(r=>{
      if (r.type !== "union" || !(r.people || []).includes(uid)) return;
      (r.people || []).forEach(partner=>{
        if (partner===uid || !pos.has(partner) || moving.has(partner)) return;
        // Una pareja con ascendencia/fratría propia representada pertenece a
        // otra rama y no debe ser arrastrada automáticamente.
        if (!representedOriginIsEmptyForUid(partner)) return;
        moving.add(partner);
        queue.push(partner);
      });
    });
  }

  // Si una unión queda partida, el bloque no es seguro de mover.
  for (const r of family.relationships) {
    if (r.type !== "union") continue;
    const people=(r.people || []).filter(uid=>pos.has(uid));
    const inside=people.filter(uid=>moving.has(uid));
    if (inside.length && inside.length !== people.length) return null;
  }

  return [...moving];
}

function branchCenterForParentage(parentage,pos) {
  const xs=(parentage.children || [])
    .filter(uid=>pos.has(uid))
    .map(uid=>pos.get(uid).x);
  if (!xs.length) return null;
  return (Math.min(...xs)+Math.max(...xs))/2;
}

function tryPhysicallyCenterMovableDescendantBranch(parentage,byGen,pos) {
  const parentUids=(parentage.parents || []).filter(uid=>pos.has(uid));
  if (!parentUids.length) return 0;

  const desired=parentMidpointForPhysicalShift(parentUids,pos);
  const current=branchCenterForParentage(parentage,pos);
  if (!Number.isFinite(desired) || !Number.isFinite(current)) return 0;

  const delta=desired-current;
  if (Math.abs(delta)<0.5) return 0;

  const members=collectMovableDescendantBranchForParentage(parentage,pos);
  if (!members || !members.length) return 0;

  /*
   * No movemos hacia encima de individuos ajenos de la misma generación.
   * Calculamos el intervalo permitido para el desplazamiento del bloque.
   */
  const moving=new Set(members);
  let minDelta=-Infinity, maxDelta=Infinity;

  const generations=[...new Set(members.map(uid=>pos.get(uid).generation))];
  for (const gen of generations) {
    const row=(byGen.get(gen) || []).map(p=>p.uid).filter(uid=>pos.has(uid));
    const own=row.filter(uid=>moving.has(uid));
    if (!own.length) continue;
    const ownXs=own.map(uid=>pos.get(uid).x);
    const left=Math.min(...ownXs), right=Math.max(...ownXs);

    row.filter(uid=>!moving.has(uid)).forEach(uid=>{
      const x=pos.get(uid).x;
      if (x<left) minDelta=Math.max(minDelta,x+C.siblingGap-left);
      if (x>right) maxDelta=Math.min(maxDelta,x-C.siblingGap-right);
    });
  }

  const safeDelta=Math.max(minDelta,Math.min(maxDelta,delta));
  if (!Number.isFinite(safeDelta) || Math.abs(safeDelta)<0.5) return 0;
  shiftLayoutMembers(members,safeDelta,pos);
  return safeDelta;
}

function refineParentChildMidpointPositioning(
  byGen,
  pos
) {
  const relations =
    family.relationships
      .filter(r =>
        r.type === "parentage"
      )
      .sort((a,b) => {
        const aParents =
          (a.parents || [])
            .filter(uid =>
              pos.has(uid)
            );

        const bParents =
          (b.parents || [])
            .filter(uid =>
              pos.has(uid)
            );

        const aGeneration =
          aParents.length
            ? Math.max(
                ...aParents.map(uid =>
                  pos.get(uid).generation
                )
              )
            : -1;

        const bGeneration =
          bParents.length
            ? Math.max(
                ...bParents.map(uid =>
                  pos.get(uid).generation
                )
              )
            : -1;

        /*
         * Primero las generaciones superiores. Una pareja raíz puede
         * recolocarse y después el resto del árbol ve ya ese nuevo centro.
         */
        return (
          aGeneration-
          bGeneration
        );
      });

  const maxIterations = 5;

  for (
    let iteration=0;
    iteration<maxIterations;
    iteration++
  ) {
    let maximumMove = 0;

    relations.forEach(r => {
      /*
       * 1) Intentar mover físicamente la pareja parental.
       */
      const parentMove =
        tryPhysicallyCenterSimpleRootPair(
          r,
          byGen,
          pos
        );

      maximumMove =
        Math.max(
          maximumMove,
          Math.abs(parentMove)
        );

      /*
       * 2) Recalculado el punto parental, intentar mover una fratría
       *    terminal/libre. Esto resuelve de forma natural hijos únicos
       *    como IV-1 bajo una pareja cross-family no adyacente.
       */
      const childMove =
        tryPhysicallyCenterTerminalChildren(
          r,
          byGen,
          pos
        );

      maximumMove =
        Math.max(
          maximumMove,
          Math.abs(childMove)
        );

      /*
       * 3) Si la fratría ya tiene estructura propia y por eso no era
       *    "terminal", intentar desplazar toda su rama como bloque.
       */
      const branchMove =
        tryPhysicallyCenterMovableDescendantBranch(
          r,
          byGen,
          pos
        );

      maximumMove =
        Math.max(
          maximumMove,
          Math.abs(branchMove)
        );
    });

    if (
      maximumMove <
      0.5
    ) {
      break;
    }
  }
}


function stabilizeParentCentering(
  byGen,
  pos
) {
  const maxIterations = 8;

  for (
    let iteration=0;
    iteration<maxIterations;
    iteration++
  ) {
    const before =
      snapshotLayoutX(pos);

    /*
     * 1) Las ramas de progenitor único se resuelven de abajo arriba.
     *    Los hermanos simples conservan el siblingGap normal.
     */
    centerSingleParentsOverOwnSibships(
      pos
    );

    /*
     * 2) T17c: resolvemos simultáneamente cada componente de uniones
     *    conectadas con descendencia. Cada punto medio de unión intenta
     *    coincidir con el centro de SU propia descendencia, manteniendo
     *    el orden horizontal y las separaciones mínimas.
     */
    centerMultipleUnionsOnOwnDescendants(
      byGen,
      pos
    );

    /*
     * 3) Recentramos parejas simples y demás unidades parentales usando
     *    ya las posiciones definitivas de las generaciones inferiores.
     *
     *    Como centerParentsOverDescendantsBottomUp() recorre de abajo
     *    hacia arriba, un cambio en generación III puede propagarse en
     *    la MISMA pasada hasta una pareja de generación II y sus
     *    ascendientes de generación I.
     */
    centerParentsOverDescendantsBottomUp(
      byGen,
      pos
    );

    /*
     * 4) Restricción de seguridad T10: fratrías independientes no deben
     *    tocarse ni fundirse visualmente.
     */
    resolveIndependentSingleParentSibshipCollisions(
      pos
    );

    /*
     * T22a:
     * la compactación del último hermano simple forma parte de la misma
     * convergencia. Si cambia el centro real de los hijos, la siguiente
     * iteración vuelve a centrar a los progenitores sobre esa posición.
     */
    compactRightEdgeSimpleSiblingOutlier(
      byGen,
      pos
    );

    const change =
      maximumLayoutXChange(
        before,
        pos
      );

    if (change < 0.5) {
      break;
    }
  }
}



/*
 * 0.7.47 — relajación horizontal final de BLOQUES parentales.
 *
 * La 0.7.46 centra correctamente durante la convergencia bottom-up, pero
 * refineParentChildMidpointPositioning() puede desplazar después ramas
 * descendentes para resolver conflictos locales. En pedigrees amplios eso
 * deja huecos reutilizables y algunas parejas vuelven a quedar descentradas,
 * produciendo diagonales que ya no son necesarias.
 *
 * Esta pasada NO abre cortes globales (0.7.45), NO reordena personas y NO
 * mueve descendencia. Recalcula, con la geometría ya definitiva, el centro
 * preferido de cada unidad parental y aplica el mismo ajuste isotónico local
 * de 0.7.46. De este modo aprovechamos los huecos existentes desplazando
 * parejas/bloques completos lo mínimo imprescindible.
 */
/*
 * 0.7.53 — compactación LOCAL de fratrías excesivamente extendidas.
 *
 * Problema observado en LEZANA_2: una fratría puede conservar un hueco
 * horizontal enorme entre dos hijos porque las ramas inferiores han ido
 * separándose durante las distintas fases del layout. La barra de fratría
 * termina midiendo varios miles de píxeles aunque no exista contenido útil
 * que justifique ese hueco.
 *
 * No reducimos siblingGap globalmente (0.7.52) ni abrimos/cerramos cortes
 * en todo el pedigree (0.7.45). Solo actuamos BAJO la generación de la
 * fratría afectada: si dos hijos consecutivos del mismo parentage están
 * absurdamente separados, cerramos parte de ese corredor desplazando como
 * conjunto todo lo situado a la derecha del corte en esa generación y las
 * inferiores. Las generaciones superiores no se tocan; después el centrado
 * parental normal vuelve a alinear los progenitores con su descendencia.
 *
 * El objetivo no es llevar cada par a siblingGap exacto. Conservamos un
 * margen generoso para parejas, textos y ramas complejas y solo eliminamos
 * huecos claramente patológicos.
 */
function compactOverstretchedSibshipCorridors(byGen,pos) {
  const MAX_PASSES = 6;
  const triggerGap = C.siblingGap * 2.75;   // 440 px con la configuración actual
  const targetGap  = C.siblingGap * 1.65;   // 264 px: compacto, pero con aire
  const minShift = 24;

  for (let pass=0; pass<MAX_PASSES; pass++) {
    let changed = false;

    const parentages = family.relationships
      .filter(r =>
        r.type === "parentage" &&
        (r.children || []).filter(uid => pos.has(uid)).length >= 2
      )
      .map(r => {
        const children = [...new Set(r.children || [])]
          .filter(uid => pos.has(uid))
          .sort((a,b) => pos.get(a).x-pos.get(b).x);
        const gen = children.length ? pos.get(children[0]).generation : null;
        return {r,children,gen};
      })
      .filter(entry =>
        entry.gen !== null &&
        entry.children.every(uid => pos.get(uid).generation === entry.gen)
      )
      .sort((a,b) => b.gen-a.gen);

    outer:
    for (const entry of parentages) {
      const {children,gen} = entry;

      for (let i=0; i<children.length-1; i++) {
        const leftUid = children[i];
        const rightUid = children[i+1];
        const leftX = pos.get(leftUid).x;
        const rightX = pos.get(rightUid).x;
        const gap = rightX-leftX;

        if (gap <= triggerGap) continue;

        const cutX = (leftX+rightX)/2;
        let shift = gap-targetGap;

        /*
         * No permitimos que el cierre deje dos individuos de la misma fila
         * a menos del mínimo estructural correspondiente. Calculamos cuánto
         * puede cerrarse realmente en todas las filas afectadas por el corte.
         */
        let allowed = shift;

        Array.from(byGen.keys())
          .filter(g => g >= gen)
          .forEach(g => {
            const row = (byGen.get(g) || [])
              .filter(p => pos.has(p.uid))
              .map(p => ({uid:p.uid,x:pos.get(p.uid).x}))
              .sort((a,b)=>a.x-b.x);

            const left = row.filter(p => p.x < cutX).at(-1);
            const right = row.find(p => p.x >= cutX);
            if (!left || !right) return;

            const pairType = relationshipPairType(left.uid,right.uid);
            const required = pairType === "twin"
              ? C.twinGap
              : (pairType === "union" ? C.coupleGap : C.siblingGap);

            allowed = Math.min(
              allowed,
              Math.max(0,(right.x-left.x)-required)
            );
          });

        if (allowed < minShift) continue;

        /*
         * Desplazamos el semiplano descendente derecho. Al mover todas las
         * generaciones desde la fratría hacia abajo se conservan parejas y
         * subárboles completos que estén a ese lado del corredor.
         */
        pos.forEach(point => {
          if (
            point.generation >= gen &&
            point.x >= cutX
          ) {
            point.x -= allowed;
          }
        });

        changed = true;
        break outer;
      }
    }

    if (!changed) break;

    /* Recentrado local tras cada cierre; no reordenamos ramas. */
    const generations = Array.from(byGen.keys()).sort((a,b)=>b-a);
    generations.forEach(gen => {
      const units = buildBottomUpRowUnits(gen,byGen,pos);
      if (!units.some(unit=>unit.targeted)) return;
      applyBottomUpRowCenters(units,pos);
    });
  }
}

function relaxFinalParentalBlocks(byGen,pos) {
  const generations = Array.from(byGen.keys()).sort((a,b)=>b-a);

  // Dos pasadas bastan para propagar hacia arriba un ajuste de una fila sin
  // convertir esta fase en una nueva convergencia agresiva.
  for (let pass=0; pass<2; pass++) {
    generations.forEach(gen => {
      const units = buildBottomUpRowUnits(gen,byGen,pos);
      if (!units.some(unit=>unit.targeted)) return;
      applyBottomUpRowCenters(units,pos);
    });
  }
}

/*
 * 0.8.67 — colocación horizontal manual, sin cambiar ascendencia ni orden.
 * Para cada anclaje, se empujan únicamente los vecinos de su misma fila que
 * invadirían su espacio. Se mantiene la secuencia automática de personas;
 * nunca se intercambian hermanos ni se cambia de generación al arrastrar.
 * La persona arrastrada más recientemente tiene prioridad durante el gesto.
 */
let liveDragUid = null;
let personDragState = null;
let suppressDraggedPersonClick = false;

function manualHorizontalOverrides() {
  branchOrderOverrides();
  if (!family.layout_overrides.manual_x ||
      typeof family.layout_overrides.manual_x !== "object") {
    family.layout_overrides.manual_x = {};
  }
  return family.layout_overrides.manual_x;
}

/*
 * 0.8.73: reordenación horizontal libre dentro de UNA generación.
 * Es un orden de PRESENTACIÓN independiente de birth_order y filiación.
 * Las parejas y gemelos de la misma fila se desplazan como bloques rígidos.
 * No trasladamos grupos entre generaciones, ni modificamos relaciones.
 */
let siblingReorderMode = false; // conserva el nombre para el control ya existente

function visualSiblingOverrides() {
  branchOrderOverrides();
  if (!family.layout_overrides.sibling_visual_order ||
      typeof family.layout_overrides.sibling_visual_order !== "object") {
    family.layout_overrides.sibling_visual_order = {};
  }
  return family.layout_overrides.sibling_visual_order;
}

function generationVisualOverrides() {
  branchOrderOverrides();
  if (!family.layout_overrides.generation_visual_order ||
      typeof family.layout_overrides.generation_visual_order !== "object") {
    family.layout_overrides.generation_visual_order = {};
  }
  return family.layout_overrides.generation_visual_order;
}

// Se conserva la función anterior para importar preferencias 4.15.
function siblingGroupForVisualReordering(uid,pos) {
  if (!pos || !pos.has(uid)) return [];
  const gen = pos.get(uid).generation;
  const graph = new Map(
    family.people.filter(p=>pos.has(p.uid) && pos.get(p.uid).generation===gen)
      .map(p=>[p.uid,new Set()])
  );
  family.relationships.forEach(r=>{
    const list = r.type === "sibling" ? r.members :
      r.type === "parentage" ? r.children : null;
    if (!Array.isArray(list) || list.length<2) return;
    const members = [...new Set(list)].filter(id=>graph.has(id));
    members.forEach(a=>members.forEach(b=>{
      if (a!==b) graph.get(a).add(b);
    }));
  });
  if (!graph.has(uid)) return [];
  const found=new Set([uid]), queue=[uid];
  while (queue.length) {
    for (const next of graph.get(queue.pop())) {
      if (!found.has(next)) {found.add(next); queue.push(next);}
    }
  }
  return [...found].sort((a,b)=>pos.get(a).x-pos.get(b).x ||
    a.localeCompare(b,"es",{numeric:true}));
}

function canVisuallyReorderSiblingGroup(group,pos) {
  if (group.length<2) return false;
  const gen=pos.get(group[0]).generation;
  const row=family.people.filter(p=>pos.has(p.uid) && pos.get(p.uid).generation===gen)
    .map(p=>p.uid).sort((a,b)=>pos.get(a).x-pos.get(b).x ||
      a.localeCompare(b,"es",{numeric:true}));
  const indices=group.map(uid=>row.indexOf(uid));
  if (Math.max(...indices)-Math.min(...indices)+1!==group.length) return false;
  if (family.relationships.some(r=>
    (r.type==="union" && (r.people||[]).some(uid=>group.includes(uid))) ||
    (r.type==="twin" && (r.members||[]).some(uid=>group.includes(uid)))
  )) return false;
  return true;
}

function applySiblingVisualPositions(byGen,pos) {
  const saved=visualSiblingOverrides();
  if (!Object.keys(saved).length) return;
  const done=new Set();
  [...pos.keys()].forEach(uid=>{
    if (done.has(uid) || saved[uid]===undefined) return;
    const siblings=siblingGroupForVisualReordering(uid,pos);
    siblings.forEach(id=>done.add(id));
    if (!canVisuallyReorderSiblingGroup(siblings,pos)) return;
    const current=siblings.map(id=>({uid:id,x:pos.get(id).x}));
    const visuallyOrdered=[...siblings].sort((a,b)=>{
      const ar=Number.isInteger(saved[a]) ? saved[a] : 10000;
      const br=Number.isInteger(saved[b]) ? saved[b] : 10000;
      return ar-br || siblings.indexOf(a)-siblings.indexOf(b);
    });
    visuallyOrdered.forEach((id,i)=>{pos.get(id).x=current[i].x;});
  });
}

function horizontalGenerationRow(pos,gen) {
  return [...pos.keys()].filter(uid=>pos.get(uid).generation===gen)
    .sort((a,b)=>pos.get(a).x-pos.get(b).x || a.localeCompare(b,"es",{numeric:true}));
}

// Agrupa únicamente conexiones que NO deben romperse mediante un arrastre:
// parejas, cadenas de parejas y gemelos. Las fratrías NO son rígidas aquí.
function horizontalGenerationBlocks(pos,gen) {
  const row=horizontalGenerationRow(pos,gen);
  const present=new Set(row);
  const adjacency=new Map(row.map(uid=>[uid,new Set()]));
  const connect=(a,b)=>{
    if (!present.has(a) || !present.has(b) || a===b) return;
    adjacency.get(a).add(b); adjacency.get(b).add(a);
  };
  family.relationships.forEach(r=>{
    if (r.type==='union' && Array.isArray(r.people) && r.people.length===2)
      connect(r.people[0],r.people[1]);
    if (r.type==='twin' && Array.isArray(r.members)) {
      for (let i=1;i<r.members.length;i++) connect(r.members[0],r.members[i]);
    }
  });
  const visited=new Set(), components=[];
  for (const uid of row) {
    if (visited.has(uid)) continue;
    const queue=[uid], component=new Set(); visited.add(uid);
    while (queue.length) {
      const next=queue.pop(); component.add(next);
      for (const linked of adjacency.get(next)) if (!visited.has(linked)) {
        visited.add(linked); queue.push(linked);
      }
    }
    const members=row.filter(id=>component.has(id));
    // La fila ya debe contener el bloque junto. Si no lo está, por seguridad
    // NO permitimos mover a ninguno de sus integrantes.
    const indices=members.map(id=>row.indexOf(id));
    const contiguous=Math.max(...indices)-Math.min(...indices)+1===members.length;
    components.push({members,contiguous});
  }
  return components;
}

function reorderGenerationBlockOrder(pos,gen,movingUid,targetIndex) {
  const blocks=horizontalGenerationBlocks(pos,gen);
  const source=blocks.findIndex(b=>b.members.includes(movingUid));
  if (source<0 || !blocks[source].contiguous || !blocks.every(b=>b.contiguous)) return null;
  const bounded=Math.max(0,Math.min(blocks.length-1,targetIndex));
  if (source===bounded) return null;
  const desired=[...blocks];
  desired.splice(source,1);
  desired.splice(bounded,0,blocks[source]);
  return desired.flatMap(b=>b.members);
}

function applyGenerationVisualPositions(byGen,pos) {
  const saved=generationVisualOverrides();
  Object.entries(saved).forEach(([genText,sequence])=>{
    const gen=Number(genText);
    if (!Array.isArray(sequence) || sequence.length===0) return;
    const row=horizontalGenerationRow(pos,gen);
    if (row.length<2) return;
    const blocks=horizontalGenerationBlocks(pos,gen);
    // No reagrupar parejas ya alejadas por un layout complejo.
    if (!blocks.every(b=>b.contiguous)) return;
    const ranks=new Map(sequence.map((uid,i)=>[uid,i]));
    const candidates=blocks.map((b,i)=>({
      ...b,index:i,
      rank:Math.min(...b.members.map(uid=>ranks.has(uid)?ranks.get(uid):100000+i))
    }));
    candidates.sort((a,b)=>a.rank-b.rank || a.index-b.index);
    const ordered=candidates.flatMap(b=>b.members);
    if (ordered.every((uid,i)=>uid===row[i])) return;
    // Cada bloque conserva EXACTAMENTE sus separaciones internas.
    // La inserción solo recalcula espacios entre bloques: así una pareja
    // no acaba estirada por ocupar el hueco de una rama distinta.
    const originalPositions=new Map(row.map(uid=>[uid,pos.get(uid).x]));
    let rightEdge=null, previousUid=null;
    candidates.forEach((block,i)=>{
      const first=block.members[0];
      const originalLeft=originalPositions.get(first);
      const left=i===0 ? originalPositions.get(row[0]) :
        rightEdge+minimumRowSpacingForLayout(previousUid,first);
      block.members.forEach(uid=>{
        pos.get(uid).x=left+(originalPositions.get(uid)-originalLeft);
      });
      const last=block.members[block.members.length-1];
      rightEdge=pos.get(last).x;
      previousUid=last;
    });
  });
}

function updateSiblingReorderButton() {
  const button=$("pedigreeReorderSiblingsBtn");
  if (!button) return;
  button.setAttribute("aria-pressed",String(siblingReorderMode));
  button.classList.toggle("is-active",siblingReorderMode);
  button.title=siblingReorderMode
    ? t("action.reorder.enabledTitle")
    : t("action.reorder.enableTitle");
  button.setAttribute('aria-label', t("action.reorder.toggle"));
  const container=$("pedigreeContainer");
  if (container) container.classList.toggle("is-sibling-reorder-mode",siblingReorderMode);
}

function updateManualLayoutResetButton() {
  const button = $("pedigreeResetManualPositionsBtn");
  if (!button) return;
  const count = Object.keys(manualHorizontalOverrides()).length +
    Object.keys(visualSiblingOverrides()).length +
    Object.keys(generationVisualOverrides()).length;
  button.disabled = count === 0;
  button.title = count
    ? t("action.layout.restoreAutomatic")
    : t("toolbar.layout.noneToReset");
}

function resetManualHorizontalPositions() {
  if (personDragState || !Object.keys(manualHorizontalOverrides()).length &&
      !Object.keys(visualSiblingOverrides()).length &&
      !Object.keys(generationVisualOverrides()).length) return;
  pushUndoState();
  family.layout_overrides.manual_x = {};
  family.layout_overrides.sibling_visual_order = {};
  family.layout_overrides.generation_visual_order = {};
  renderPedigree();
  message(t("message.layout.restored"),"success");
}

function applyDraggedHorizontalPositions(byGen,pos) {
  const saved = manualHorizontalOverrides();
  const anchors = Object.keys(saved).filter(uid =>
    pos.has(uid) && Number.isFinite(Number(saved[uid]))
      && Math.abs(Number(saved[uid])) >= 0.5
  );
  if (!anchors.length) return;

  // Cada fila se conserva en su orden físico ORIGINAL, no por la posición
  // deseada. No permitir reordenación implícita evita cambiar I-1, I-2, etc.
  const rows = new Map();
  byGen.forEach((people,gen) => {
    rows.set(gen,[...people]
      .filter(p => pos.has(p.uid))
      .sort((a,b) => pos.get(a.uid).x-pos.get(b.uid).x ||
        a.uid.localeCompare(b.uid,"es",{numeric:true}))
      .map(p => p.uid));
  });

  // La última persona que se está desplazando se procesa al final,
  // para que su posición solicitada sea la que manda visualmente.
  const ordered = liveDragUid && anchors.includes(liveDragUid)
    ? anchors.filter(uid=>uid !== liveDragUid).concat(liveDragUid)
    : anchors;

  ordered.forEach(uid => {
    const point = pos.get(uid);
    if (!point) return;
    const members = rows.get(point.generation) || [];
    const index = members.indexOf(uid);
    if (index < 0) return;

    // Base automática independiente de desplazamientos de otros anclajes.
    // Se guarda antes de recolocar a cualquiera de la fila.
    const desired = manualBaseX.get(uid) + Number(saved[uid]);
    point.x = desired;
    for (let i=index-1;i>=0;i--) {
      const left = pos.get(members[i]);
      const right = pos.get(members[i+1]);
      left.x = Math.min(left.x,
        right.x-minimumRowSpacingForLayout(members[i],members[i+1]));
    }
    for (let i=index+1;i<members.length;i++) {
      const left = pos.get(members[i-1]);
      const right = pos.get(members[i]);
      right.x = Math.max(right.x,
        left.x+minimumRowSpacingForLayout(members[i-1],members[i]));
    }
  });
}

// Se obtiene al final de calculateLayout, antes de aplicar anclajes.
let manualBaseX = new Map();

function calculateLayout() {
  const g = generationMap();
  const siblingOrder = siblingOrderMap();
  const byGen = new Map();

  family.people.forEach(p=>{
    const gen = g.get(p.uid) || 0;
    if (!byGen.has(gen)) byGen.set(gen,[]);
    byGen.get(gen).push(p);
  });

  byGen.forEach((arr,gen)=>{
    arr.sort((a,b)=>{
      const ao = siblingOrder.has(a.uid) ? siblingOrder.get(a.uid) : 999999;
      const bo = siblingOrder.has(b.uid) ? siblingOrder.get(b.uid) : 999999;
      return ao-bo || a.uid.localeCompare(b.uid,"es",{numeric:true});
    });

    // La generación solo determina la fila vertical.
    // Después de la ordenación básica, reconstruimos bloques usando
    // EXCLUSIVAMENTE relaciones sibling explícitas. De esta forma,
    // dos fratrías distintas de la misma generación nunca se mezclan
    // por tener ambos grupos birth_order 1,2,3.
    const siblingGrouped =
      orderExplicitSiblingGroupsWithinGeneration(arr);

    const relationshipBlocks =
      makeRelationshipBlocks(
        siblingGrouped
      );

    let arranged =
      stabilizeMultiPartnerUnions(
        stabilizeTwoPartnerUnions(
          relationshipBlocks,
          siblingGrouped
        )
      );

    arranged =
      applyManualBranchOrderToGenerationPeople(
        gen,
        arranged
      );

    byGen.set(
      gen,
      arranged
    );
  });

  const rowOffsets = new Map();
  let maxRowWidth = 0;

  byGen.forEach((arr,gen)=>{
    const offsets = [];
    let x = 0;

    arr.forEach((p,i)=>{
      if (i===0) {
        offsets.push(0);
        return;
      }

      const prev = arr[i-1];
      const pairType = relationshipPairType(prev.uid,p.uid);

      x += pairType==="twin"
        ? C.twinGap
        : (pairType==="union" ? C.coupleGap : C.siblingGap);

      offsets.push(x);
    });

    rowOffsets.set(gen,offsets);
    const width = offsets.length ? offsets[offsets.length-1] : 0;
    maxRowWidth = Math.max(maxRowWidth,width);
  });

  const initialWidth = Math.max(760,C.marginX*2+maxRowWidth);
  const maxGen = Math.max(0,...Array.from(byGen.keys()));
  const pos = new Map();

  Array.from(byGen.keys()).sort((a,b)=>a-b).forEach(gen=>{
    const arr = byGen.get(gen);
    const offsets = rowOffsets.get(gen) || [0];
    const rowWidth = offsets.length ? offsets[offsets.length-1] : 0;
    const startX = initialWidth/2-rowWidth/2;
    const y = C.marginTop+gen*C.generationGap;

    arr.forEach((p,i)=>{
      pos.set(p.uid,{
        x:startX+offsets[i],
        y,
        generation:gen
      });
    });
  });

  // Primera pasada top-down:
  // cada fratría/unidad familiar se alinea con su unión parental.
  placeFamilyRowsTopDown(byGen,pos);

  /*
   * Centrado iterativo de progenitores.
   *
   * En árboles de varias generaciones una corrección en una fila inferior
   * cambia el centro de descendencia de la fila superior. Por eso ya no
   * hacemos una única pasada: repetimos de abajo hacia arriba hasta que
   * las posiciones se estabilizan.
   */
  stabilizeParentCentering(
    byGen,
    pos
  );

  /*
   * T23:
   * antes de aceptar cualquier diagonal residual de filiación, hacemos
   * una última pasada conservadora de POSICIONAMIENTO físico.
   *
   * - parejas raíz simples: se desplazan hacia el centro de sus hijos
   *   hasta el límite que permitan los bloques vecinos;
   * - fratrías terminales/libres: se desplazan al punto medio parental;
   * - únicamente la diferencia que no pueda resolverse así quedará como
   *   diagonal en drawParentage().
   */
  refineParentChildMidpointPositioning(
    byGen,
    pos
  );

  /*
   * 0.7.53: cerramos únicamente corredores absurdamente largos dentro
   * de una misma fratría. Después la relajación parental de 0.7.47 puede
   * aprovechar la nueva geometría sin alterar el espaciado global.
   */
  compactOverstretchedSibshipCorridors(
    byGen,
    pos
  );


  /*
   * 0.7.47: aprovechamos el espacio libre que queda tras el refinado final.
   * Solo se relajan bloques parentales completos; no se ensanchan fratrías
   * ni se introduce el corte global descartado de 0.7.45.
   */
  relaxFinalParentalBlocks(
    byGen,
    pos
  );

  /*
   * T22a: la compactación residual ya se ha integrado en la convergencia
   * de stabilizeParentCentering(), por lo que aquí no volvemos a modificar
   * la posición de los hijos después de haber centrado a sus progenitores.
   */

  // Gestante G: si no está emparejada, se coloca junto a los
  // progenitores; después el embarazo se alinea directamente bajo G.
  placeStandaloneGestationalCarriers(
    byGen,
    pos
  );

  alignGestationTargetsUnderCarriers(
    pos
  );

  // Los donantes se colocan después, usando la posición definitiva
  // del embarazo.
  placeDonorsBesideRecipientCouples(
    byGen,
    pos
  );

  // 0.8.68: abrir hueco junto a la pareja receptora antes que relegar D/G
  // detrás de los hermanos. Conserva la posición anterior como fallback si
  // el destino no permite identificar progenitores receptores.
  placeReproductiveSupportNearRecipients(byGen,pos);

  // Reproducción asistida: sólo Figura 5.1.d con gestación explícita.
  alignFigureFiveGestationWithSpermDonor(pos);

  // 0.8.12: última corrección visual para adopciones complejas. Se ejecuta
  // después de todos los centrados para que éstos no vuelvan a cerrar el hueco.
  resolveComplexAdoptionNeighborSpacing(
    byGen,
    pos
  );

  // Los ajustes de arrastre se aplican AL FINAL del motor automático:
  // así ningún centrado posterior deshace las posiciones del usuario.
  // Guardamos la coordenada base para que un nuevo arrastre arranque desde
  // la posición efectivamente dibujada, aunque otros anclajes la hayan movido.
  const automaticX = new Map([...pos.entries()].map(([uid,p]) => [uid,p.x]));
  manualBaseX = automaticX;
  applyDraggedHorizontalPositions(byGen,pos);
  applySiblingVisualPositions(byGen,pos);
  applyGenerationVisualPositions(byGen,pos);

  const bounds = normalizeLayoutBounds(pos);
  const height = C.marginTop*2+maxGen*C.generationGap+145;

  return {g,byGen,pos,width:bounds.width,height,automaticX};
}

function assignPedigreeNumbers(layout) {
  const numbers = new Map();

  Array.from(layout.byGen.keys()).sort((a,b)=>a-b).forEach(gen => {
    const arr = [...layout.byGen.get(gen)].sort((a,b) => {
      return layout.pos.get(a.uid).x - layout.pos.get(b.uid).x;
    });

    arr.forEach((p,i) => {
      numbers.set(p.uid, `${roman(gen+1)}-${i+1}`);
    });
  });

  currentNumbers = numbers;
  return numbers;
}

function safeConditionPatternToken(condition) {
  return String(
    condition && condition.id
      ? condition.id
      : "condition"
  )
    .replace(
      /[^A-Za-z0-9_-]/g,
      "-"
    );
}

function conditionCarrierPatternId(condition) {
  return `cond-carrier-${safeConditionPatternToken(condition)}`;
}

function addConditionPatternDefs(defs) {
  (family.conditions || [])
    .forEach(condition => {
      const patternName =
        normalizeCarrierPattern(
          condition.carrier_pattern
        );

      const pattern = svgEl("pattern", {
        id:conditionCarrierPatternId(condition),
        width:8,
        height:8,
        patternUnits:"userSpaceOnUse"
      });

      const color =
        conditionColor(condition);

      const lineAttrs = {
        stroke:color,
        "stroke-width":1.15,
        fill:"none",
        "stroke-linecap":"square"
      };

      if (patternName === "crosshatch") {
        pattern.appendChild(svgEl("path", {
          d:
            "M-2,2 L2,-2 M0,8 L8,0 M6,10 L10,6 " +
            "M-2,6 L2,10 M0,0 L8,8 M6,-2 L10,2",
          ...lineAttrs
        }));
      } else if (patternName === "diagonal") {
        pattern.appendChild(svgEl("path", {
          d:
            "M-2,2 L2,-2 M0,8 L8,0 M6,10 L10,6",
          ...lineAttrs
        }));
      } else if (patternName === "horizontal") {
        pattern.appendChild(svgEl("path", {
          d:"M0,2 L8,2 M0,6 L8,6",
          ...lineAttrs
        }));
      } else if (patternName === "vertical") {
        pattern.appendChild(svgEl("path", {
          d:"M2,0 L2,8 M6,0 L6,8",
          ...lineAttrs
        }));
      } else if (patternName === "dots") {
        [
          [2,2],
          [6,2],
          [2,6],
          [6,6]
        ].forEach(([cx,cy]) => {
          pattern.appendChild(svgEl("circle", {
            cx,
            cy,
            r:1.05,
            fill:color,
            stroke:"none"
          }));
        });
      }

      defs.appendChild(pattern);
    });
}

function conditionPatternFill(condition,status="affected") {
  if (!condition) return "#111111";

  if (status === "carrier") {
    return `url(#${conditionCarrierPatternId(condition)})`;
  }

  return conditionColor(condition);
}

function addSymbolClip(group,p,x,y,id) {
  const h=C.symbolSize/2, s=C.symbolSize;
  const clip=svgEl("clipPath",{id});
  const type = recordType(p);

  if (
    type === "sab" ||
    type === "top" ||
    type === "ect"
  ) {
    const th = 15;
    const tw = 17;

    clip.appendChild(
      svgEl(
        "polygon",
        {
          points:`${x},${y-th} ${x+tw},${y+th} ${x-tw},${y+th}`
        }
      )
    );
  } else if (p.gender==="man") {
    clip.appendChild(svgEl("rect",{x:x-h,y:y-h,width:s,height:s}));
  } else if (p.gender==="woman") {
    clip.appendChild(svgEl("circle",{cx:x,cy:y,r:h}));
  } else {
    clip.appendChild(svgEl("polygon",{points:`${x},${y-h} ${x+h},${y} ${x},${y+h} ${x-h},${y}`}));
  }

  group.appendChild(clip);
}

function polarPoint(cx,cy,r,angle) {
  return {
    x: cx + r*Math.cos(angle),
    y: cy + r*Math.sin(angle)
  };
}

function drawConditionOverlays(group,p,x,y) {
  if (!supportsPedigreeConditions(p)) return;

  const allConditions = family.conditions || [];
  if (!allConditions.length) return;

  const activeStates = allConditions
    .map((condition,index)=>{
      const state = conditionStateForPerson(p,condition.id);

      if (state.status === "affected") {
        return {condition, status:"affected", index};
      }

      if (
        state.status === "carrier" &&
        ["autosomal_recessive","x_linked_recessive"].includes(condition.inheritance)
      ) {
        return {condition, status:"carrier", index};
      }

      return null;
    })
    .filter(Boolean);

  if (!activeStates.length) return;

  const h = C.symbolSize/2;
  const s = C.symbolSize;
  const clipId = `condition-clip-${p.uid}`;
  addSymbolClip(group,p,x,y,clipId);

  // Con 1 o 2 condiciones globales mantenemos la representación clásica
  // por mitades verticales. Con 3 o más condiciones globales usamos
  // porciones radiales fijas, respetando la posición de cada condición
  // entre individuos según el orden de family.conditions.
  if (allConditions.length <= 2) {
    const w = s/activeStates.length;

    activeStates.forEach((item,i)=>{
      group.appendChild(svgEl("rect",{
        x:x-h+i*w,
        y:y-h,
        width:w,
        height:s,
        fill:conditionPatternFill(item.condition,item.status),
        "clip-path":`url(#${clipId})`,
        class:`condition-overlay condition-overlay-${item.status}`
      }));
    });

    return;
  }

  const totalSlots = allConditions.length;
  const step = (Math.PI * 2) / totalSlots;
  const outerRadius = Math.max(s*1.8, h*Math.SQRT2 + 6);
  const startAngle = -Math.PI / 2;

  activeStates.forEach(item => {
    const a1 = startAngle + (item.index * step);
    const a2 = a1 + step;
    const p1 = polarPoint(x,y,outerRadius,a1);
    const p2 = polarPoint(x,y,outerRadius,a2);

    group.appendChild(svgEl("polygon",{
      points:`${x},${y} ${p1.x},${p1.y} ${p2.x},${p2.y}`,
      fill:conditionPatternFill(item.condition,item.status),
      "clip-path":`url(#${clipId})`,
      class:`condition-overlay condition-overlay-${item.status}`
    }));
  });
}

function drawConditionStateMarkers(
  group,
  p,
  x,
  y
) {
  if (!supportsPedigreeConditions(p)) {
    return;
  }

  const h = C.symbolSize/2;

  const documentedEvaluation =
    hasDocumentedEvaluationForAnyCondition(
      p
    );

  if (
    isPersonUnknownForAnyCondition(
      p
    )
  ) {
    const qx = x+h+5;
    const qy =
      documentedEvaluation
        ? y-h+7
        : y+h+11;

    group.appendChild(
      svgEl(
        "text",
        {
          x:qx,
          y:qy,
          class:"unknown-condition-mark"
        },
        "?"
      )
    );
  }

  if (documentedEvaluation) {
    group.appendChild(
      svgEl(
        "text",
        {
          x:x+h+5,
          y:y+h+11,
          class:"documented-evaluation-mark"
        },
        "*"
      )
    );
  }

  const clinical =
    normalizeClinicalData(p);

  if (
    (
      isPersonPresymptomaticForAnyCondition(
        p
      ) ||
      (
        recordType(p) === "person" &&
        clinical.carrier_status ===
          "presymptomatic"
      )
    ) &&
    !isClinicallyAffected(p)
  ) {
    group.appendChild(
      svgEl(
        "line",
        {
          x1:x,
          y1:y-h+2,
          x2:x,
          y2:y+h-2,
          class:"presymptomatic-mark"
        }
      )
    );
  }
}


function shape(group, p, x, y) {
  const s = C.symbolSize, h = s/2;
  const type = recordType(p);
  const fill =
    type === "multiple"
      ? "unaffected"
      : ((family.conditions || []).length
          ? "unaffected"
          : (isClinicallyAffected(p) ? "affected" : "unaffected"));

  if (type === "gestational_carrier") {
    group.appendChild(svgEl("circle", {
      cx:x,
      cy:y,
      r:h,
      class:"person-shape unaffected"
    }));

    drawConditionOverlays(group,p,x,y);

    group.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"gestational-carrier-g-mark"
    },"G"));

    drawConditionStateMarkers(group,p,x,y);

    return;
  }

  if (type === "stillbirth") {
    let sbNode;

    if (p.gender === "man") {
      sbNode = svgEl("rect", {
        x:x-h,
        y:y-h,
        width:s,
        height:s,
        class:`person-shape ${fill}`
      });
    } else if (p.gender === "woman") {
      sbNode = svgEl("circle", {
        cx:x,
        cy:y,
        r:h,
        class:`person-shape ${fill}`
      });
    } else {
      sbNode = svgEl("polygon", {
        points:`${x},${y-h} ${x+h},${y} ${x},${y+h} ${x-h},${y}`,
        class:`person-shape ${fill}`
      });
    }

    group.appendChild(sbNode);

    drawConditionOverlays(group,p,x,y);
    drawConditionStateMarkers(group,p,x,y);

    group.appendChild(svgEl("line", {
      x1:x-h-4,
      y1:y+h+4,
      x2:x+h+4,
      y2:y-h-4,
      class:"deceased-mark"
    }));

    return;
  }

  if (type === "fetus") {
    let fetusNode;

    if (p.gender === "man") {
      fetusNode = svgEl("rect", {
        x:x-h,
        y:y-h,
        width:s,
        height:s,
        class:`person-shape ${fill}`
      });
    } else if (p.gender === "woman") {
      fetusNode = svgEl("circle", {
        cx:x,
        cy:y,
        r:h,
        class:`person-shape ${fill}`
      });
    } else {
      fetusNode = svgEl("polygon", {
        points:`${x},${y-h} ${x+h},${y} ${x},${y+h} ${x-h},${y}`,
        class:`person-shape ${fill}`
      });
    }

    group.appendChild(fetusNode);

    drawConditionOverlays(group,p,x,y);

    group.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"fetus-p-mark"
    },"P"));

    drawConditionStateMarkers(group,p,x,y);

    return;
  }

  if (type === "sab" || type === "top" || type === "ect") {
    // Eventos gestacionales representados con triángulo.
    // TOP y ECT usan la misma geometría, incluida la barra diagonal,
    // y se distinguen por la etiqueta inferior.
    const th = 15;
    const tw = 17;

    group.appendChild(svgEl("polygon", {
      points:`${x},${y-th} ${x+tw},${y+th} ${x-tw},${y+th}`,
      class:`person-shape ${fill}`
    }));

    drawConditionOverlays(
      group,
      p,
      x,
      y
    );

    if (type === "top" || type === "ect") {
      group.appendChild(svgEl("line", {
        x1:x-tw-3, y1:y+th+3,
        x2:x+tw+3, y2:y-th-3,
        class:"deceased-mark"
      }));
    }

    drawConditionStateMarkers(
      group,
      p,
      x,
      y
    );

    return;
  }

  let node;

  if (p.gender === "man") {
    node = svgEl("rect", {
      x:x-h, y:y-h, width:s, height:s,
      class:`person-shape ${fill}`
    });
  } else if (p.gender === "woman") {
    node = svgEl("circle", {
      cx:x, cy:y, r:h,
      class:`person-shape ${fill}`
    });
  } else {
    node = svgEl("polygon", {
      points:`${x},${y-h} ${x+h},${y} ${x},${y+h} ${x-h},${y}`,
      class:`person-shape ${fill}`
    });
  }

  group.appendChild(node);

  if (type === "multiple") {
    const count = String(p.multiple_count || "");
    const fontSize =
      count.length <= 2 ? 13.5 :
      count.length === 3 ? 11.7 :
      count.length === 4 ? 9.9 : 8.1;

    group.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"multiple-count-mark",
      "font-size":fontSize
    },count));

    return;
  }

  drawConditionOverlays(group,p,x,y);

  if (isDonorRecord(p)) {
    group.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"donor-d-mark"
    },"D"));
  }

  if (isAdoptedPerson(p)) {
    const outer = h + 8;
    const top = y - h - 2;
    const bottom = y + h + 2;
    const inner = 4.5;

    group.appendChild(svgEl("path", {
      d:`M ${x-outer} ${top} L ${x-outer-inner} ${top} L ${x-outer-inner} ${bottom} L ${x-outer} ${bottom}`,
      class:"adoption-bracket"
    }));

    group.appendChild(svgEl("path", {
      d:`M ${x+outer} ${top} L ${x+outer+inner} ${top} L ${x+outer+inner} ${bottom} L ${x+outer} ${bottom}`,
      class:"adoption-bracket"
    }));
  }

  if (p.deceased) {
    group.appendChild(svgEl("line", {
      x1:x-h-4, y1:y+h+4,
      x2:x+h+4, y2:y-h-4,
      class:"deceased-mark"
    }));
  }

  if (p.consultand || p.proband) {
    // Consultante: flecha.
    // Probando: la misma flecha acompañada de "P".
    group.appendChild(svgEl("line", {
      x1:x-h-38,
      y1:y+h+30,
      x2:x-h-6,
      y2:y+h+5,
      class:"proband-arrow"
    }));

    if (p.proband) {
      // Recuperamos la posición usada antes de 0.6.45.
      group.appendChild(svgEl("text", {
        x:x-h-50,
        y:y+h+36,
        class:"proband-p"
      }, "P"));
    }
  }

  if (recordType(p) === "person" && p.family_history_unknown) {
    group.appendChild(svgEl("line", {
      x1:x,
      y1:y-h,
      x2:x,
      y2:y-h-8,
      class:"pedigree-line"
    }));

    group.appendChild(svgEl("text", {
      x:x,
      y:y-h-14,
      class:"family-history-unknown-mark"
    }, "?"));
  }

  drawConditionStateMarkers(
    group,
    p,
    x,
    y
  );
}


function personHasRegisteredChildren(uid) {
  return family.relationships.some(r =>
    r.type === "parentage" &&
    (r.parents || []).includes(uid) &&
    (r.children || []).length > 0
  );
}

function individualReproductiveStatusActive(p) {
  return !!(
    p &&
    recordType(p) === "person" &&
    ["no_children","infertility"].includes(p.reproductive_status)
  );
}

function drawIndividualReproductiveStatusMarker(group,p,x,y) {
  if (!individualReproductiveStatusActive(p)) return;

  const status = p.reproductive_status;
  const reason = String(p.reproductive_reason || "").trim();
  const h = C.symbolSize/2;

  const x0 = x;
  const y0 = y + h + 3;
  const stem = 14;
  const barHalf = 10;
  const barY = y0 + stem;

  group.appendChild(svgEl("line", {
    x1:x0,y1:y0,
    x2:x0,y2:barY,
    class:"individual-reproductive-status-line"
  }));

  group.appendChild(svgEl("line", {
    x1:x0-barHalf,y1:barY,
    x2:x0+barHalf,y2:barY,
    class:"individual-reproductive-status-bar"
  }));

  if (status === "infertility") {
    group.appendChild(svgEl("line", {
      x1:x0-barHalf,y1:barY+6,
      x2:x0+barHalf,y2:barY+6,
      class:"individual-reproductive-status-bar"
    }));
  }

  if (reason) {
    group.appendChild(svgEl("text", {
      x:x0,
      y:barY + (status === "infertility" ? 20 : 15),
      class:"individual-reproductive-status-reason"
    },reason));
  }
}

function individualReproductiveLabelOffset(p) {
  if (!individualReproductiveStatusActive(p)) return 0;

  const reason = String(p.reproductive_reason || "").trim();

  if (reason) return 50;
  return p.reproductive_status === "infertility" ? 38 : 32;
}

function annotations(p) {
  const a = [];
  const type = recordType(p);

  if (
    ![
      "person",
      "multiple",
      "sperm_donor",
      "ovum_donor",
      "gestational_carrier"
    ].includes(type)
  ) {
    if (p.gestational_age_weeks) {
      a.push(`${p.gestational_age_weeks} sem`);
    }
    return a;
  }

  const match =
    (p.gender === "man" && p.sex_at_birth === "male") ||
    (p.gender === "woman" && p.sex_at_birth === "female");

  if (!match && p.sex_at_birth) {
    const code = {
      male:"AMAB",
      female:"AFAB",
      unassigned:"UAAB"
    }[p.sex_at_birth];
    if (code) a.push(code);
  }

  const chronology = personalChronologyLabel(p);
  if (chronology) a.push(chronology);

  return a;
}


let conditionHoverHideTimer = null;
let conditionHoverInteractionLock = false;
let conditionHoverActiveUid = null;

function conditionHoverHasFocus() {
  const card = conditionHoverCard();

  return !!(
    card &&
    document.activeElement &&
    card.contains(
      document.activeElement
    )
  );
}

function cancelConditionHoverHide() {
  if (
    conditionHoverHideTimer !== null
  ) {
    clearTimeout(
      conditionHoverHideTimer
    );

    conditionHoverHideTimer = null;
  }
}

function scheduleConditionHoverHide(
  delay=260
) {
  cancelConditionHoverHide();

  /*
   * Un select nativo puede disparar mouseleave de la tarjeta mientras su
   * menú está abierto. Mientras haya interacción/foco dentro del tooltip,
   * no programamos su cierre.
   */
  if (
    conditionHoverInteractionLock ||
    conditionHoverHasFocus()
  ) {
    return;
  }

  conditionHoverHideTimer =
    setTimeout(
      () => {
        conditionHoverHideTimer = null;

        if (
          conditionHoverInteractionLock ||
          conditionHoverHasFocus()
        ) {
          return;
        }

        hideConditionHoverCard();
      },
      delay
    );
}


function conditionHoverCard() {
  return $("conditionHoverCard");
}

function hideConditionHoverCard() {
  cancelConditionHoverHide();

  conditionHoverInteractionLock = false;
  conditionHoverActiveUid = null;

  const card = conditionHoverCard();
  if (!card) return;

  card.hidden = true;
  card.setAttribute("aria-hidden","true");
  card.replaceChildren();
}

function appendConditionHoverRow(container,label,value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return;
  }

  const row = document.createElement("div");
  row.className = "condition-hover-row";

  const key = document.createElement("div");
  key.className = "condition-hover-key";
  key.textContent = label;

  const val = document.createElement("div");
  val.className = "condition-hover-value";
  val.textContent = String(value);

  row.append(key,val);
  container.appendChild(row);
}

const HOVER_RELATION_TYPES = [
  {value:"parent", i18nKey:"tooltip.relation.type.parent"},
  {value:"child", i18nKey:"tooltip.relation.type.child"},
  {value:"adoptive_parent", i18nKey:"tooltip.relation.type.adoptive_parent"},
  {value:"adoptive_child", i18nKey:"tooltip.relation.type.adoptive_child"},
  {value:"adopted_out_child", i18nKey:"tooltip.relation.type.adopted_out_child"},
  {value:"sibling", i18nKey:"tooltip.relation.type.sibling"},
  {value:"twin", i18nKey:"tooltip.relation.type.twin"},
  {value:"union", i18nKey:"tooltip.relation.type.union"},
  {value:"ended_union", i18nKey:"tooltip.relation.type.ended_union"},
  {value:"consanguineous_union", i18nKey:"tooltip.relation.type.consanguineous_union"},
  {value:"gestates", i18nKey:"tooltip.relation.type.gestates"},
  {value:"donates", i18nKey:"tooltip.relation.type.donates"},
  // Este flujo poco frecuente solo está dentro de ⋯ Más; no en los atajos.
  {value:"existing_donor", i18nKey:"tooltip.relation.type.existingDonor"}
];

function hoverRelationCandidates(
  aUid,
  type
) {
  return family.people
    .filter(p => {
      if (p.uid === aUid) return false;
      if (type === "gestates") return eligibleGestationOutcome(p);
      if (type === "donates") return ["person","fetus","stillbirth","sab","top","ect"].includes(recordType(p));
      if (type === "existing_donor") return isDonorRecord(p) && !isSurrogateOvumDonor(p) &&
        donorRecordsForTarget(aUid,recordType(p)).every(other => other.uid === p.uid);

      if (
        type === "twin"
      ) {
        return (
          recordType(p) === "person" &&
          areSiblings(
            aUid,
            p.uid
          )
        );
      }

      if (unionLikeRelationType(type) && !canFormPartnership(p)) return false;
      if (["child","adoptive_parent","adoptive_child","adopted_out_child"].includes(type) &&
          !["person","gestational_carrier"].includes(recordType(p))) return false;

      return true;
    });
}

function restoreConditionHoverCardForUid(
  uid
) {
  const card =
    conditionHoverCard();

  const p =
    personByUid(uid);

  if (
    !card ||
    !p ||
    !buildConditionHoverCard(p)
  ) {
    return false;
  }

  card.hidden = false;
  card.setAttribute(
    "aria-hidden",
    "false"
  );

  conditionHoverActiveUid =
    uid;

  return true;
}


function quickAddHoverRelations(
  a,
  bs,
  type,
  zygosity="unknown"
) {
  const targets =
    [...new Set(
      (bs || [])
        .filter(Boolean)
    )];

  if (
    !a ||
    !targets.length ||
    targets.includes(a)
  ) {
    message(
      "Selecciona al menos otra persona para crear la relación.",
      "error"
    );
    return false;
  }

  /*
   * Las mismas restricciones que el editor avanzado.
   */
  if (unionLikeRelationType(type) &&
      (!canFormPartnership(personByUid(a)) ||
       targets.some(uid => !canFormPartnership(personByUid(uid))))) {
    message(t("validation.union.eligible"), "error");
    return false;
  }
  if (type === "donates" && (!isDonorRecord(personByUid(a)) ||
      isSurrogateOvumDonor(personByUid(a)))) {
    message(t("validation.sharedDonor.donorRequired"),"error"); return false;
  }
  if (type === "existing_donor" &&
      (targets.length !== 1 || !["person","fetus","stillbirth","sab","top","ect"].includes(recordType(personByUid(a))))) {
    message(t("validation.sharedDonor.chooseOneDonor"),"error"); return false;
  }
  if (type === "gestates" && targets.length !== 1) {
    message(t("validation.gestation.oneOutcome"),"error");
    return false;
  }
  if (
    type === "twin"
  ) {
    const requiredB =
      zygosity === "trizygotic"
        ? 2
        : 1;

    if (
      targets.length !==
      requiredB
    ) {
      message(
        zygosity === "trizygotic"
          ? t("validation.relation.selectThreePersons")
          : t("validation.relation.selectTwoPersons"),
        "error"
      );
      return false;
    }
  }

  if (
    type === "consanguineous_union" &&
    targets.length !== 1
  ) {
    message(
      t("validation.relation.consanguineousPartner"),
      "error"
    );
    return false;
  }

  if (
    (
      type === "union" ||
      type === "ended_union"
    ) &&
    targets.length !== 1
  ) {
    message(
      t("validation.relation.selectPartner"),
      "error"
    );
    return false;
  }

  if (
    (
      type === "child" ||
      type === "adoptive_child" ||
      type === "adopted_out_child"
    ) &&
    targets.length > 2
  ) {
    message(
      t("validation.relation.maxTwoParents"),
      "error"
    );
    return false;
  }

  let undoPushed = false;

  try {
    pushUndoState();
    undoPushed = true;

    if (type === "donates") {
      assignExistingDonorTargets(a,targets);
    } else if (type === "existing_donor") {
      const donorUid = targets[0];
      const donor = personByUid(donorUid);
      assignExistingDonorTargets(donorUid,[...donationTargetUids(donor),a]);
    } else if (type === "gestates") {
      assignGestation(a, targets[0]);
    } else if (
      type === "twin"
    ) {
      addMultipleBirth(
        [a, ...targets],
        zygosity
      );
    } else {
      prepareGenerationInsertionForRelation(
        a,
        targets,
        type
      );

      targets.forEach(b => {
        if (
          type === "union"
        ) {
          setUnionStatus(
            a,
            b,
            "current"
          );
        } else if (
          type === "ended_union"
        ) {
          setUnionStatus(
            a,
            b,
            "ended"
          );
        } else if (
          type === "consanguineous_union"
        ) {
          setConsanguineousUnion(
            a,
            b,
            ""
          );
        } else if (
          type === "sibling"
        ) {
          addSibling(
            a,
            b
          );
        } else if (
          type === "child"
        ) {
          addParent(
            b,
            a,
            "biological"
          );
        } else if (
          type === "adoptive_child"
        ) {
          addParent(
            b,
            a,
            "adoptive"
          );
        } else if (
          type === "adopted_out_child"
        ) {
          addParent(
            b,
            a,
            "biological"
          );
          markAdoptedOut(a);
        } else if (
          type === "adoptive_parent"
        ) {
          addParent(
            a,
            b,
            "adoptive"
          );
        } else {
          addParent(
            a,
            b,
            "biological"
          );
        }
      });
    }

    if (
      type === "parent" ||
      type === "child" ||
      type === "adopted_out_child"
    ) {
      resolveSiblingGroupsWithParents();
    }

    conditionHoverInteractionLock = true;

    renderPedigree();

    restoreConditionHoverCardForUid(
      a
    );

    conditionHoverInteractionLock = false;

    message(
      type === "existing_donor" ? t("message.sharedDonor.linked") :
      (targets.length === 1
        ? "Relación añadida."
        : t("relationship.addedCount",{count:targets.length})),
      "success"
    );

    return true;
  } catch (err) {
    if (undoPushed) {
      const previous =
        undoHistory.pop();

      if (previous) {
        family = previous;
      }

      updateUndoButton();
    }

    conditionHoverInteractionLock = true;

    renderPedigree();

    restoreConditionHoverCardForUid(
      a
    );

    conditionHoverInteractionLock = false;

    message(
      "No se añadió ninguna relación: " +
      err.message,
      "error"
    );

    return false;
  }
}

function hoverChildShortcutPartnerUid(
  anchorUid
) {
  const unions =
    family.relationships.filter(r =>
      r.type === "union" &&
      Array.isArray(r.people) &&
      r.people.length === 2 &&
      r.people.includes(
        anchorUid
      )
    );

  /*
   * Con varias uniones no adivinamos de qué pareja es el nuevo hijo.
   * En ese caso el alta debe hacerse desde la relación normal/avanzada.
   */
  if (
    unions.length !== 1
  ) {
    return null;
  }

  const partnerUid =
    unions[0].people.find(uid =>
      uid !== anchorUid
    );

  return (
    partnerUid &&
    personByUid(partnerUid)
  )
    ? partnerUid
    : null;
}


/* 0.8.69 — los atajos D se vinculan al registro pulsado como
 * resultado reproductivo; jamás se crea una pareja con el donante. */
function quickCreateDonorFromHover(anchorUid, donorType) {
  const target = personByUid(anchorUid);
  if (!target || ![
    "person", "fetus", "stillbirth", "sab", "top", "ect"
  ].includes(recordType(target))) {
    message(t("validation.donation.recordType"), "error");
    return false;
  }
  if (!["sperm_donor", "ovum_donor"].includes(donorType)) return false;
  if (donorRecordsForTarget(anchorUid, donorType).length) {
    message(t("validation.donation.duplicateType"), "warning");
    return false;
  }

  pushUndoState();
  const donor = quickDefaultRecord(donorType);
  if (donorType === "sperm_donor") {
    donor.donation_targets = [anchorUid];
  } else {
    donor.donation_target = anchorUid;
  }
  family.people.push(donor);
  conditionHoverInteractionLock = true;
  try {
    renderPedigree();
    restoreConditionHoverCardForUid(anchorUid);
  } finally {
    conditionHoverInteractionLock = false;
  }
  message(
    donorType === "sperm_donor"
      ? t("message.donation.spermAdded")
      : t("message.donation.ovumAdded"),
    "success"
  );
  return true;
}

function quickCreateRelativeFromHover(
  anchorUid,
  kind
) {
  if (kind === "sperm_donor" || kind === "ovum_donor") {
    return quickCreateDonorFromHover(anchorUid, kind);
  }
  const anchorPerson =
    personByUid(
      anchorUid
    );

  if (!anchorPerson) {
    return false;
  }

  const siblingKinds =
    new Set([
      "brother",
      "sister"
    ]);

  const childKinds =
    new Set([
      "son",
      "daughter",
      "unknown_child",
      "multiple_child",
      "sab_child",
      "top_child",
      "ect_child",
      "fetus_child",
      "stillbirth_child"
    ]);

  const childPartnerUid =
    childKinds.has(kind)
      ? hoverChildShortcutPartnerUid(anchorUid)
      : null;

  const siblingAnchorAllowed =
    [
      "person",
      "gestational_carrier",
      "multiple",
      "fetus",
      "stillbirth",
      "sab",
      "top",
      "ect"
    ].includes(
      recordType(
        anchorPerson
      )
    );

  if (
    siblingKinds.has(kind) &&
    !siblingAnchorAllowed
  ) {
    message(
      t("validation.shortcut.siblingNotSupported"),
      "error"
    );
    return false;
  }

  if (
    childKinds.has(kind) &&
    !childPartnerUid
  ) {
    const representedUnions =
      family.relationships.filter(r =>
        r.type === "union" &&
        Array.isArray(r.people) &&
        r.people.length === 2 &&
        r.people.includes(anchorUid)
      );

    /*
     * v1.0.3: con varias parejas, Feto y Mortinato no atribuyen la
     * descendencia a una unión arbitraria: se crea únicamente la
     * filiación respecto al individuo seleccionado. La segunda
     * filiación se podrá especificar en Relaciones avanzadas.
     */
    if (
      representedUnions.length > 1 &&
      !["fetus_child", "stillbirth_child"].includes(kind)
    ) {
      message(
        t("validation.shortcut.multiplePartners"),
        "error"
      );
      return false;
    }
  }

  let newPerson = null;
  let successText = "";

  if (
    kind === "brother"
  ) {
    newPerson =
      quickDefaultPerson(
        "man",
        "male"
      );

    successText =
      t("message.sibling.brotherAdded");
  } else if (
    kind === "sister"
  ) {
    newPerson =
      quickDefaultPerson(
        "woman",
        "female"
      );

    successText =
      t("message.sibling.sisterAdded");
  } else if (
    kind === "son"
  ) {
    newPerson =
      quickDefaultPerson(
        "man",
        "male"
      );

    successText =
      t("message.child.sonAdded");
  } else if (
    kind === "daughter"
  ) {
    newPerson =
      quickDefaultPerson(
        "woman",
        "female"
      );

    successText =
      t("message.child.daughterAdded");
  } else if (
    kind === "unknown_child"
  ) {
    newPerson =
      quickDefaultPerson(
        "unspecified",
        ""
      );

    successText =
      t("message.child.unknownAdded");
  } else if (
    kind === "fetus_child"
  ) {
    newPerson = quickDefaultRecord("fetus", {
      gender:"unspecified",
      sexAtBirth:""
    });
    successText = t("message.child.fetusAdded");
  } else if (
    kind === "stillbirth_child"
  ) {
    newPerson = quickDefaultRecord("stillbirth", {
      gender:"unspecified",
      sexAtBirth:""
    });
    successText = t("message.child.stillbirthAdded");
  } else if (
    kind === "multiple_child"
  ) {
    newPerson =
      quickDefaultRecord(
        "multiple",
        {
          gender:"unspecified",
          sexAtBirth:"",
          multipleCount:"n"
        }
      );

    successText =
      t("message.child.multipleAdded");
  } else if (
    ["sab_child", "top_child", "ect_child"].includes(kind)
  ) {
    const eventType =
      kind.replace("_child", "");

    newPerson =
      quickDefaultRecord(
        eventType,
        {
          gender:"unspecified",
          sexAtBirth:""
        }
      );

    successText =
      t("relationship.childEventAdded",{type:eventType.toUpperCase()});
  } else if (
    kind === "parents"
  ) {
    /* Se crea más abajo como pareja parental completa. */
  } else if (
    kind === "partner"
  ) {
    const partnerAnchorAllowed = canFormPartnership(anchorPerson);

    if (
      !partnerAnchorAllowed ||
      ![
        "man",
        "woman"
      ].includes(
        anchorPerson.gender
      )
    ) {
      message(
        t("validation.partner.genderRequired"),
        "error"
      );
      return false;
    }

    const oppositeGender =
      anchorPerson.gender === "man"
        ? "woman"
        : "man";

    const oppositeSex =
      oppositeGender === "man"
        ? "male"
        : "female";

    newPerson =
      quickDefaultPerson(
        oppositeGender,
        oppositeSex
      );

    successText =
      oppositeGender === "man"
        ? t("message.partner.maleAdded")
        : t("message.partner.femaleAdded");
  } else {
    return false;
  }

  let undoPushed = false;

  try {
    pushUndoState();
    undoPushed = true;

    if (kind === "parents") {
      const existingBiological =
        parentageOf(anchorUid, "biological");

      if (
        existingBiological &&
        (existingBiological.parents || []).length
      ) {
        throw new Error(
          t("validation.parents.alreadyBiological")
        );
      }

      /*
       * 0.7.51 — generar los dos UID de forma secuencial.
       * nextUid() mira family.people; si padre y madre se construyen antes
       * de insertar ninguno, ambos reciben el mismo UID (Pxx).
       */
      const father =
        quickDefaultPerson(
          "man",
          "male"
        );

      family.people.push(
        father
      );

      const mother =
        quickDefaultPerson(
          "woman",
          "female"
        );

      family.people.push(
        mother
      );

      family.relationships.push(
        quickDefaultUnion(
          father.uid,
          mother.uid
        )
      );

      prepareTopGenerationInsertion(
        [
          father.uid,
          mother.uid
        ],
        [anchorUid]
      );

      addParent(
        father.uid,
        anchorUid,
        "biological"
      );
      addParent(
        mother.uid,
        anchorUid,
        "biological"
      );

      successText =
        t("message.parents.added");
    } else {
      family.people.push(
        newPerson
      );
    }

    if (
      kind === "parents"
    ) {
      resolveSiblingGroupsWithParents();
    } else if (
      kind === "brother" ||
      kind === "sister"
    ) {
      addSibling(
        anchorUid,
        newPerson.uid
      );
    } else if (
      childKinds.has(kind)
    ) {
      /*
       * El nuevo hijo pertenece a la pareja, no solo al individuo sobre
       * el que abrimos el tooltip.
       */
      addParent(
        anchorUid,
        newPerson.uid,
        "biological"
      );

      if (childPartnerUid) {
        addParent(
          childPartnerUid,
          newPerson.uid,
          "biological"
        );
      }
    } else {
      setUnionStatus(
        anchorUid,
        newPerson.uid,
        "current"
      );
    }

    conditionHoverInteractionLock =
      true;

    renderPedigree();

    restoreConditionHoverCardForUid(
      anchorUid
    );

    conditionHoverInteractionLock =
      false;

    message(
      successText,
      "success"
    );

    return true;
  } catch (err) {
    if (undoPushed) {
      const previous =
        undoHistory.pop();

      if (previous) {
        family =
          previous;
      }

      updateUndoButton();
    }

    conditionHoverInteractionLock =
      true;

    renderPedigree();

    restoreConditionHoverCardForUid(
      anchorUid
    );

    conditionHoverInteractionLock =
      false;

    message(
      "No se pudo añadir el registro: " +
      err.message,
      "error"
    );

    return false;
  }
}

function hoverQuickCreateButton(
  className,
  title,
  symbolClass,
  symbolText,
  onClick
) {
  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    `condition-hover-create-shortcut ${className}`;

  button.title =
    title;

  button.setAttribute(
    "aria-label",
    title
  );

  const icon =
    document.createElement(
      "span"
    );

  icon.className =
    `condition-hover-create-icon ${symbolClass}`;

  icon.setAttribute(
    "aria-hidden",
    "true"
  );

  if (symbolText) {
    icon.textContent =
      symbolText;
  }

  const plus =
    document.createElement(
      "span"
    );

  plus.className =
    "condition-hover-create-plus";

  plus.setAttribute(
    "aria-hidden",
    "true"
  );

  plus.textContent =
    "+";

  button.append(
    icon,
    plus
  );

  button.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      cancelConditionHoverHide();
      conditionHoverInteractionLock =
        true;
      onClick();
    }
  );

  return button;
}


/* 0.8.75 — situación reproductiva individual desde «Añadir familiar».
 * Usa los mismos campos del formulario avanzado y el mismo icono Bennett.
 * No crea relaciones ni asigna la situación a una pareja.
 */
function setIndividualReproductiveStatusFromHover(uid,status) {
  const p = personByUid(uid);
  if (!p || recordType(p) !== "person" ||
      !["no_children","infertility"].includes(status)) return;

  const next = (p.reproductive_status || "none") === status
    ? "none"
    : status;

  if (next === "no_children" && personHasRegisteredChildren(uid)) {
    message(
      t("validation.child.noChildrenConflict"),
      "error"
    );
    return;
  }

  if (next === (p.reproductive_status || "none")) return;

  pushUndoState();
  p.reproductive_status = next;
  // No arrastrar un motivo anotado para otra situación reproductiva.
  p.reproductive_reason = "";

  const keepCardOpen = conditionHoverActiveUid === uid &&
    conditionHoverCard() && !conditionHoverCard().hidden;
  renderPedigree();
  if (keepCardOpen) restoreConditionHoverCardForUid(uid);
}

function hoverIndividualReproductiveButton(p,status) {
  const active = p.reproductive_status === status;
  const blocked = status === "no_children" &&
    !active && personHasRegisteredChildren(p.uid);
  const name = status === "no_children"
    ? "No descendencia por elección / motivo desconocido"
    : "Infertilidad";

  const button = document.createElement("button");
  button.type = "button";
  button.className = `condition-hover-create-shortcut reproductive-individual ${status}` +
    (active ? " is-active" : "");
  button.title = blocked
    ? `${name}: no disponible porque ya hay descendencia registrada`
    : `${active ? "Quitar" : "Marcar"}: ${name}`;
  button.setAttribute("aria-label",button.title);
  button.setAttribute("aria-pressed",active ? "true" : "false");
  button.disabled = blocked;

  const icon = document.createElement("span");
  icon.className = `condition-hover-reproductive-icon ${status}`;
  icon.setAttribute("aria-hidden","true");
  button.appendChild(icon);

  button.addEventListener("click",event => {
    event.preventDefault();
    event.stopPropagation();
    cancelConditionHoverHide();
    setIndividualReproductiveStatusFromHover(p.uid,status);
  });
  return button;
}

function appendHoverManualLayoutControls(card,p) {
  if (!card || !p || !currentLayout || !currentLayout.pos.has(p.uid)) return;

  const branch = currentManualBranchContext(p.uid);
  const couple = currentManualCoupleLevelContext(p.uid);

  const section = document.createElement("div");
  section.className = "condition-hover-layout";

  const title = document.createElement("div");
  title.className = "condition-hover-layout-title";
  title.textContent = t("tooltip.manual.position");

  const buttons = document.createElement("div");
  buttons.className = "condition-hover-layout-actions";

  const makeButton = (symbol,label,disabled,onClick,extraClass="") => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `condition-hover-layout-button ${extraClass}`.trim();
    button.title = label;
    button.setAttribute("aria-label",label);
    button.disabled = !!disabled;
    button.textContent = symbol;
    button.addEventListener("click",event => {
      event.preventDefault();
      event.stopPropagation();
      cancelConditionHoverHide();
      onClick();
    });
    return button;
  };

  const leftDisabled = !branch || branch.blockIndex <= 0;
  const rightDisabled = !branch || branch.blockIndex >= branch.blocks.length-1;
  const upDisabled = !couple || !couple.eligible || couple.generation-1 < couple.minimumGeneration;
  const downDisabled = !couple || !couple.eligible || couple.generation+1 > couple.maximumGeneration;
  const branchManual = !!(branch && generationHasManualBranchOrder(branch.generation));
  const coupleManual = !!(couple && couple.manualActive);

  buttons.append(
    makeButton("←","Mover rama a la izquierda",leftDisabled,() => moveSelectedBranchManually(-1,p.uid)),
    makeButton("→","Mover rama a la derecha",rightDisabled,() => moveSelectedBranchManually(1,p.uid)),
    makeButton("↑","Subir pareja un nivel",upDisabled,() => moveSelectedCoupleGeneration(-1,p.uid)),
    makeButton("↓","Bajar pareja un nivel",downDisabled,() => moveSelectedCoupleGeneration(1,p.uid)),
    makeButton("↺","Restablecer posición automática",!(branchManual || coupleManual),() => resetHoverManualLayout(p.uid),"is-reset")
  );

  section.append(title,buttons);
  card.appendChild(section);
}

function resetHoverManualLayout(uid) {
  const branch = currentManualBranchContext(uid);
  const couple = currentManualCoupleLevelContext(uid);
  const branchManual = !!(branch && generationHasManualBranchOrder(branch.generation));
  const coupleManual = !!(couple && couple.memberUids && couple.manualActive);

  if (!branchManual && !coupleManual) return;

  pushUndoState();

  if (branchManual) {
    clearManualBranchOrder(branch.generation);
  }

  if (coupleManual) {
    couple.memberUids.forEach(memberUid => {
      const person = personByUid(memberUid);
      if (person) person.generation_override = null;
    });
    removeManualBranchAnchorsForUids(couple.memberUids);
  }

  renderPedigree();
  message(t("message.layout.automaticRestored"),"success");
}


function appendHoverRelationControls(
  card,
  p,
  shortcutHost = card
) {
  if (
    !card ||
    !p
  ) {
    return;
  }

  if (
    ![
      "person",
      "gestational_carrier",
      "sperm_donor",
      "ovum_donor",
      "multiple",
      "fetus",
      "stillbirth",
      "sab",
      "top",
      "ect"
    ].includes(
      recordType(p)
    )
  ) {
    return;
  }

  const section =
    document.createElement(
      "div"
    );

  section.className =
    "condition-hover-relation";

  const title =
    document.createElement(
      "div"
    );

  title.className =
    "condition-hover-relation-title";

  title.textContent =
    t("app.relationFormTitle.text");

  const typeSelect =
    document.createElement(
      "select"
    );

  typeSelect.className =
    "condition-hover-relation-type";

  HOVER_RELATION_TYPES
    .filter(item => item.value !== "gestates" || canBeExplicitGestator(p))
    .filter(item => item.value !== "donates" || (isDonorRecord(p) && !isSurrogateOvumDonor(p)))
    .filter(item => item.value !== "existing_donor" ||
      (["person","fetus","stillbirth","sab","top","ect"].includes(recordType(p)) &&
       family.people.some(d => isDonorRecord(d) && !isSurrogateOvumDonor(d))))
    .filter(item => isDonorRecord(p)
      ? (unionLikeRelationType(item.value) || item.value === "donates")
      : (!unionLikeRelationType(item.value) || canFormPartnership(p)))
    .forEach(item => {
      typeSelect.appendChild(
        new Option(
          t(item.i18nKey),
          item.value
        )
      );
    });

  const advancedType =
    $("relationType");

  if (
    advancedType &&
    HOVER_RELATION_TYPES.some(
      item =>
        item.value ===
        advancedType.value
    )
  ) {
    typeSelect.value =
      advancedType.value;
  }

  const targetWrap =
    document.createElement(
      "div"
    );

  targetWrap.className =
    "condition-hover-relation-targets";

  const targetHelp =
    document.createElement(
      "div"
    );

  targetHelp.className =
    "condition-hover-relation-help";

  const targetList =
    document.createElement(
      "div"
    );

  targetList.className =
    "condition-hover-relation-list";

  const targetActions =
    document.createElement(
      "div"
    );

  targetActions.className =
    "condition-hover-relation-list-actions";

  const selectAllButton =
    document.createElement(
      "button"
    );

  selectAllButton.type =
    "button";

  selectAllButton.textContent =
    t("tooltip.relation.all");

  const clearButton =
    document.createElement(
      "button"
    );

  clearButton.type =
    "button";

  clearButton.textContent =
    t("tooltip.relation.none");

  targetActions.append(
    selectAllButton,
    clearButton
  );

  targetWrap.append(
    targetHelp,
    targetList,
    targetActions
  );

  const twinSelect =
    document.createElement(
      "select"
    );

  twinSelect.className =
    "condition-hover-twin-type";

  [
    ["monozygotic",t("tooltip.relation.twin.monozygotic")],
    ["dizygotic",t("tooltip.relation.twin.dizygotic")],
    ["unknown",t("tooltip.relation.twin.unknown")],
    ["trizygotic",t("tooltip.relation.twin.trizygotic")]
  ].forEach(([value,label]) => {
    twinSelect.appendChild(
      new Option(
        label,
        value
      )
    );
  });

  function selectedTargets() {
    return [
      ...targetList.querySelectorAll(
        'input[type="checkbox"]:checked'
      )
    ].map(input =>
      input.value
    );
  }

  function relationTargetLimitText() {
    const type =
      typeSelect.value;

    if (type === "gestates") return t("validation.gestation.oneOutcome");
    if (type === "donates") return t("help.sharedDonor.advanced");
    if (type === "existing_donor") return t("help.sharedDonor.fromRecipient");
    if (
      type === "twin"
    ) {
      return twinSelect.value ===
        "trizygotic"
          ? t("validation.relation.exactTwo")
          : t("validation.relation.exactOne");
    }

    if (
      [
        "union",
        "ended_union",
        "consanguineous_union"
      ].includes(type)
    ) {
      return t("validation.relation.exactOne");
    }

    if (
      type === "child" ||
      type === "adoptive_child" ||
      type === "adopted_out_child"
    ) {
      return t("tooltip.relation.oneOrTwoParents");
    }

    return t("tooltip.relation.multiplePeople");
  }

  function refreshTargetHelp() {
    targetHelp.textContent =
      relationTargetLimitText();
  }

  function refreshTargets() {
    const previous =
      new Set(
        selectedTargets()
      );

    targetList.replaceChildren();

    const candidates =
      hoverRelationCandidates(
        p.uid,
        typeSelect.value
      );

    if (!candidates.length) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "condition-hover-relation-empty";

      empty.textContent =
        typeSelect.value === "twin"
          ? t("tooltip.relation.noSiblings")
          : t("tooltip.relation.noPeople");

      targetList.appendChild(
        empty
      );
    } else {
      candidates.forEach(candidate => {
        const label =
          document.createElement(
            "label"
          );

        label.className =
          "condition-hover-target-option";

        const input =
          document.createElement(
            "input"
          );

        input.type =
          "checkbox";

        input.value =
          candidate.uid;

        input.checked =
          previous.has(
            candidate.uid
          );

        const text =
          document.createElement(
            "span"
          );

        text.textContent =
          displayName(
            candidate.uid
          );

        input.addEventListener(
          "change",
          () => {
            conditionHoverInteractionLock = true;
            cancelConditionHoverHide();
          }
        );

        label.append(
          input,
          text
        );

        targetList.appendChild(
          label
        );
      });
    }

    twinSelect.hidden =
      typeSelect.value !==
      "twin";
    if (typeSelect.value === "donates") {
      const chosen = new Set(donationTargetUids(p));
      targetList.querySelectorAll('input[type="checkbox"]')
        .forEach(el => { el.checked = chosen.has(el.value); });
    }

    /*
     * "Todos" solo tiene sentido para relaciones realmente múltiples.
     */
    const singleOnly =
      [
        "union",
        "ended_union",
        "consanguineous_union",
        "gestates",
        "existing_donor"
      ].includes(
        typeSelect.value
      ) ||
      (
        typeSelect.value === "twin" &&
        twinSelect.value !==
          "trizygotic"
      );

    selectAllButton.disabled =
      singleOnly;

    refreshTargetHelp();
  }

  [
    typeSelect,
    twinSelect,
    targetWrap
  ].forEach(control => {
    control.addEventListener(
      "pointerdown",
      () => {
        conditionHoverInteractionLock = true;
        cancelConditionHoverHide();
      }
    );

    control.addEventListener(
      "focusin",
      () => {
        conditionHoverInteractionLock = true;
        cancelConditionHoverHide();
      }
    );
  });

  typeSelect.addEventListener(
    "change",
    () => {
      if (
        advancedType &&
        [...advancedType.options]
          .some(option =>
            option.value ===
            typeSelect.value
          )
      ) {
        advancedType.value =
          typeSelect.value;

        updateRelationTypeFields();
      }

      refreshTargets();

      conditionHoverInteractionLock = true;
      cancelConditionHoverHide();
    }
  );

  twinSelect.addEventListener(
    "change",
    () => {
      /*
       * Al cambiar entre gemelos/trillizos limpiamos la selección para
       * evitar conservar accidentalmente un número de personas inválido.
       */
      targetList.querySelectorAll(
        'input[type="checkbox"]'
      ).forEach(input => {
        input.checked = false;
      });

      refreshTargets();

      conditionHoverInteractionLock = true;
      cancelConditionHoverHide();
    }
  );

  selectAllButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      targetList.querySelectorAll(
        'input[type="checkbox"]'
      ).forEach(input => {
        input.checked = true;
      });

      conditionHoverInteractionLock = true;
      cancelConditionHoverHide();
    }
  );

  clearButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      targetList.querySelectorAll(
        'input[type="checkbox"]'
      ).forEach(input => {
        input.checked = false;
      });

      conditionHoverInteractionLock = true;
      cancelConditionHoverHide();
    }
  );

  refreshTargets();

  const addButton =
    document.createElement(
      "button"
    );

  addButton.type =
    "button";

  addButton.className =
    "condition-hover-relation-add";

  addButton.textContent =
    t("tooltip.relation.add");

  addButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      cancelConditionHoverHide();

      const targets =
        selectedTargets();

      if (!targets.length) {
        message(
          "Selecciona al menos una persona.",
          "error"
        );
        return;
      }

      quickAddHoverRelations(
        p.uid,
        targets,
        typeSelect.value,
        twinSelect.value
      );
    }
  );

  /*
   * Altas ultrarrápidas:
   * crean simultáneamente el nuevo individuo y su relación con el nodo
   * sobre el que está abierto el tooltip.
   */
  const createShortcuts =
    document.createElement(
      "div"
    );

  createShortcuts.className =
    "condition-hover-create-shortcuts";

  const brotherButton =
    hoverQuickCreateButton(
      "brother",
      "Añadir hermano",
      "male",
      "",
      () =>
        quickCreateRelativeFromHover(
          p.uid,
          "brother"
        )
    );

  const sisterButton =
    hoverQuickCreateButton(
      "sister",
      "Añadir hermana",
      "female",
      "",
      () =>
        quickCreateRelativeFromHover(
          p.uid,
          "sister"
        )
    );

  if (!isDonorRecord(p)) {
    createShortcuts.append(brotherButton, sisterButton);
  }

  const canAddOppositePartner = canFormPartnership(p) &&
    [
      "man",
      "woman"
    ].includes(
      p.gender
    );

  if (
    canAddOppositePartner
  ) {
    const oppositeClass =
      p.gender === "man"
        ? "female"
        : "male";

    const partnerButton =
      hoverQuickCreateButton(
        "partner",
        p.gender === "man"
          ? "Añadir pareja mujer"
          : "Añadir pareja hombre",
        `partner ${oppositeClass}`,
        "",
        () =>
          quickCreateRelativeFromHover(
            p.uid,
            "partner"
          )
      );

    createShortcuts.appendChild(
      partnerButton
    );
  }

  /*
   * Hijo / hija solo si existe una pareja inequívoca.
   * Si hay múltiples uniones, no asumimos automáticamente a cuál pertenece
   * la nueva descendencia.
   */
  const childPartnerUid =
    hoverChildShortcutPartnerUid(
      p.uid
    );

  const hoverUnionCount =
    family.relationships.filter(r =>
      r.type === "union" &&
      Array.isArray(r.people) &&
      r.people.length === 2 &&
      r.people.includes(p.uid)
    ).length;

  const canAddChildShortcut =
    ["person", "gestational_carrier"].includes(recordType(p)) &&
    hoverUnionCount <= 1;

  if (
    canAddChildShortcut
  ) {
    const sonButton =
      hoverQuickCreateButton(
        "son",
        childPartnerUid ? "Añadir hijo de esta pareja" : "Añadir hijo",
        "child male",
        "",
        () =>
          quickCreateRelativeFromHover(
            p.uid,
            "son"
          )
      );

    const daughterButton =
      hoverQuickCreateButton(
        "daughter",
        childPartnerUid ? "Añadir hija de esta pareja" : "Añadir hija",
        "child female",
        "",
        () =>
          quickCreateRelativeFromHover(
            p.uid,
            "daughter"
          )
      );

    const unknownChildButton =
      hoverQuickCreateButton(
        "unknown-child",
        childPartnerUid
          ? "Añadir hijo de género y sexo desconocidos de esta pareja"
          : "Añadir hijo de género y sexo desconocidos",
        "child unspecified",
        "",
        () =>
          quickCreateRelativeFromHover(
            p.uid,
            "unknown_child"
          )
      );

    const fetusButton =
      hoverQuickCreateButton(
        "fetus-child",
        childPartnerUid
          ? "Añadir feto de esta pareja (sexo desconocido por defecto)"
          : "Añadir feto (sexo desconocido por defecto)",
        "fetus-symbol",
        "P",
        () => quickCreateRelativeFromHover(p.uid, "fetus_child")
      );

    const stillbirthButton =
      hoverQuickCreateButton(
        "stillbirth-child",
        childPartnerUid
          ? "Añadir mortinato (SB) de esta pareja (sexo desconocido por defecto)"
          : "Añadir mortinato (SB) (sexo desconocido por defecto)",
        "stillbirth-symbol",
        "",
        () => quickCreateRelativeFromHover(p.uid, "stillbirth_child")
      );

    createShortcuts.append(
      sonButton,
      daughterButton,
      unknownChildButton,
      fetusButton,
      stillbirthButton
    );

    const multipleButton =
      hoverQuickCreateButton(
        "multiple-child",
        childPartnerUid ? "Añadir varios individuos de esta pareja" : t("label.record.addMultiple"),
        "child multiple",
        "n",
        () =>
          quickCreateRelativeFromHover(
            p.uid,
            "multiple_child"
          )
      );

    const sabButton =
      hoverQuickCreateButton(
        "sab-child",
        childPartnerUid ? "Añadir SAB de esta pareja" : "Añadir SAB",
        "child pregnancy-event sab",
        "SAB",
        () =>
          quickCreateRelativeFromHover(
            p.uid,
            "sab_child"
          )
      );

    const topButton =
      hoverQuickCreateButton(
        "top-child",
        childPartnerUid ? "Añadir TOP de esta pareja" : "Añadir TOP",
        "child pregnancy-event top",
        "TOP",
        () =>
          quickCreateRelativeFromHover(
            p.uid,
            "top_child"
          )
      );

    const ectButton =
      hoverQuickCreateButton(
        "ect-child",
        childPartnerUid ? "Añadir ECT de esta pareja" : "Añadir ECT",
        "child pregnancy-event ect",
        "ECT",
        () =>
          quickCreateRelativeFromHover(
            p.uid,
            "ect_child"
          )
      );

    createShortcuts.append(
      multipleButton,
      sabButton,
      topButton,
      ectButton
    );
  } else if (
    ["person", "gestational_carrier"].includes(recordType(p)) &&
    hoverUnionCount > 1
  ) {
    // Con múltiples parejas, solo se vincula como progenitor al
    // individuo seleccionado; no se presupone la segunda filiación.
    const fetusButton = hoverQuickCreateButton(
      "fetus-child",
      "Añadir feto como descendiente (otra filiación sin especificar)",
      "fetus-symbol",
      "P",
      () => quickCreateRelativeFromHover(p.uid, "fetus_child")
    );
    const stillbirthButton = hoverQuickCreateButton(
      "stillbirth-child",
      "Añadir mortinato (SB) como descendiente (otra filiación sin especificar; sexo desconocido)",
      "stillbirth-symbol",
      "",
      () => quickCreateRelativeFromHover(p.uid, "stillbirth_child")
    );
    createShortcuts.append(fetusButton, stillbirthButton);
  }

  // Atajos reproductivos directos: el registro de partida es el
  // hijo, feto o embarazo resultante, no un progenitor presumido.
  if (["person","fetus","stillbirth","sab","top","ect"].includes(recordType(p))) {
    const spermDonorButton = hoverQuickCreateButton(
      "sperm-donor", "Añadir donante de esperma para este individuo/embarazo",
      "donor sperm", "D",
      () => quickCreateRelativeFromHover(p.uid, "sperm_donor")
    );
    const ovumDonorButton = hoverQuickCreateButton(
      "ovum-donor", "Añadir donante de óvulos para este individuo/embarazo",
      "donor ovum", "D",
      () => quickCreateRelativeFromHover(p.uid, "ovum_donor")
    );
    createShortcuts.append(spermDonorButton, ovumDonorButton);
  }

  // Solo personas ordinarias: excluye feto, SAB, TOP, ECT, mortinato,
  // donantes, gestante G/surrogate y agrupaciones «varios individuos».
  if (recordType(p) === "person") {
    createShortcuts.append(
      hoverIndividualReproductiveButton(p,"no_children"),
      hoverIndividualReproductiveButton(p,"infertility")
    );
  }

  const existingBiologicalParents =
    parentageOf(
      p.uid,
      "biological"
    );

  const canAddParentsShortcut =
    !existingBiologicalParents ||
    !(existingBiologicalParents.parents || []).length;

  if (canAddParentsShortcut && !isDonorRecord(p)) {
    const parentsButton =
      hoverQuickCreateButton(
        "parents",
        "Añadir padre y madre",
        "parents",
        "",
        () =>
          quickCreateRelativeFromHover(
            p.uid,
            "parents"
          )
      );

    createShortcuts.appendChild(
      parentsButton
    );
  }

  section.append(
    title,
    typeSelect,
    targetWrap,
    twinSelect,
    addButton
  );

  card.appendChild(
    section
  );

  /*
   * 0.8.59 — los iconos de alta rápida NO forman parte del bloque
   * avanzado "Añadir relación". Son atajos de uso frecuente y permanecen
   * siempre visibles en la tarjeta.
   */
  if (
    shortcutHost &&
    createShortcuts.childElementCount
  ) {
    shortcutHost.appendChild(
      createShortcuts
    );
  }
}

function editPersonFromHover(
  uid
) {
  const p =
    personByUid(uid);

  if (!p) {
    return;
  }

  cancelConditionHoverHide();

  /*
   * El mismo individuo queda seleccionado en el pedigree/área clínica y,
   * a la vez, se carga en el formulario detallado del panel izquierdo.
   * Así la edición queda visualmente conectada con el símbolo del árbol.
   */
  selectedPersonUid =
    uid;

  updateNotesPanel();

  if (currentSvg) {
    currentSvg
      .querySelectorAll(".person")
      .forEach(node => {
        node.classList.toggle(
          "selected-person",
          node.getAttribute(
            "data-uid"
          ) === uid
        );
      });
  }

  prepareRelationFromPedigreeSelection(
    uid
  );

  editPerson(
    uid
  );

  /*
   * Al entrar en modo edición ya no necesitamos conservar el tooltip
   * encima del árbol.
   */
  hideConditionHoverCard();
}


function cyclePersonGenderFromHover(uid) {
  const p = personByUid(uid);
  if (!p || !["person", "fetus", "stillbirth"].includes(recordType(p))) {
    return;
  }

  if (["fetus", "stillbirth"].includes(recordType(p))) {
    pushUndoState();
    p.gender = {
      unspecified:"man", man:"woman", woman:"unspecified"
    }[p.gender] || "unspecified";
    // Sexo fetal no equivale a sexo asignado al nacimiento.
    p.sex_at_birth = "";
    const keepFetalCardOpen = conditionHoverActiveUid === uid &&
      conditionHoverCard() && !conditionHoverCard().hidden;
    renderPedigree();
    if (keepFetalCardOpen) {
      restoreConditionHoverCardForUid(uid);
    }
    return;
  }

  pushUndoState();

  /*
   * Atajo visual deliberadamente simple: hombre -> mujer -> no especificado
   * -> hombre. "Género diverso" sigue disponible en el formulario completo
   * y no se fuerza dentro de este ciclo rápido.
   */
  const nextGender = {
    man: "woman",
    woman: "unspecified",
    unspecified: "man",
    gender_diverse: "man"
  }[p.gender] || "man";

  p.gender = nextGender;

  /*
   * El atajo representa conjuntamente género y sexo asignado para evitar
   * combinaciones accidentales Hombre/AFAB o Mujer/AMAB. El estado
   * no especificado deja el sexo como desconocido/no registrado.
   */
  p.sex_at_birth = {
    man: "male",
    woman: "female",
    unspecified: ""
  }[nextGender] ?? "";

  renderPedigree();
}


/* 0.7.57 — estados rápidos desde el tooltip */
function togglePersonDeceasedFromHover(uid) {
  const p = personByUid(uid);
  if (!p || recordType(p) !== "person") return;
  pushUndoState();
  p.deceased = !p.deceased;
  renderPedigree();
}

function togglePersonProbandFromHover(uid) {
  const p = personByUid(uid);
  if (!p || recordType(p) !== "person") return;
  pushUndoState();
  const willBeProband = !p.proband;
  if (willBeProband) {
    family.people.forEach(person => { person.proband = false; });
  }
  p.proband = willBeProband;
  renderPedigree();
}

function togglePersonConsultandFromHover(uid) {
  const p = personByUid(uid);
  if (!p || recordType(p) !== "person") return;

  pushUndoState();
  p.consultand = !p.consultand;
  renderPedigree();
}

function togglePersonSimpleAffectedFromHover(uid) {
  const p = personByUid(uid);
  if (!p || recordType(p) !== "person") return;

  /*
   * La afectación rápida solo representa pedigrees simplificados. Cuando
   * existen condiciones clínicas, la afectación se deriva de ellas.
   */
  if ((family.conditions || []).length) {
    message(
      t("validation.affected.fromClinical"),
      "error"
    );
    return;
  }

  pushUndoState();
  p.affected = !p.affected;
  p.clinical = normalizeClinicalData(p);
  p.clinical.phenotype_status = p.affected ? "affected" : "unaffected";
  renderPedigree();
}

function makeHoverStateButton(className, title, iconText, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `condition-hover-state ${className}${active ? " is-active" : ""}`;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.setAttribute("aria-pressed", active ? "true" : "false");

  const icon = document.createElement("span");
  icon.className = "condition-hover-state-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = iconText;
  button.appendChild(icon);

  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    cancelConditionHoverHide();
    onClick();
  });
  return button;
}


function appendHoverQuickPersonFields(card,p) {
  if (!p || !supportsRecordLabel(p)) return;

  const includeAge =
    supportsQuickAge(p);

  const includeGestationalAge =
    supportsQuickGestationalAge(p);

  const includeMultipleCount =
    supportsQuickMultipleCount(p);

  const includeAuxiliary =
    includeAge ||
    includeGestationalAge ||
    includeMultipleCount;

  const wrap = document.createElement("div");
  wrap.className = "condition-hover-quick-edit";

  const topRow = document.createElement("div");
  topRow.className =
    "condition-hover-quick-edit-row condition-hover-quick-edit-top" +
    (includeAuxiliary ? (includeAge ? " chronology-aux" : "") : " no-aux") +
    (
      includeGestationalAge ||
      includeMultipleCount
        ? " wide-aux"
        : ""
    );

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className =
    "condition-hover-quick-input condition-hover-quick-label";
  labelInput.value = p.label || "";
  labelInput.placeholder = "Nombre / alias";
  labelInput.title = "Nombre / alias opcional";
  labelInput.setAttribute(
    "aria-label",
    "Nombre o alias opcional"
  );
  labelInput.autocomplete = "off";

  let auxiliaryInput = null;

  let chronologyMode = null;
  if (includeAge) {
    chronologyMode = document.createElement("select");
    chronologyMode.className = "condition-hover-quick-input condition-hover-chronology-mode";
    chronologyMode.setAttribute("aria-label", t("individual.chronologyMode"));
    chronologyMode.append(
      new Option(t("individual.ageOption"), "age"),
      new Option(t("individual.birthYearOption"), "birth_year")
    );
    chronologyMode.value = p.birth_year != null ? "birth_year" : "age";
    auxiliaryInput = document.createElement("input");
    auxiliaryInput.type = "number";
    auxiliaryInput.className =
      "condition-hover-quick-input condition-hover-quick-age";
    auxiliaryInput.step = "1";
    const setChronologyMode = () => {
      const year = chronologyMode.value === "birth_year";
      auxiliaryInput.value = year ? (p.birth_year ?? "") : (p.age ?? "");
      auxiliaryInput.placeholder = t(year ? "individual.birthYearPlaceholder" : "individual.ageOption");
      auxiliaryInput.title = t(year ? "individual.birthYear" : "individual.age");
      auxiliaryInput.setAttribute("aria-label", auxiliaryInput.title);
      auxiliaryInput.min = year ? "1000" : "0";
      auxiliaryInput.max = year ? String(new Date().getFullYear()) : "130";
    };
    chronologyMode.addEventListener("change", setChronologyMode);
    setChronologyMode();
  } else if (includeGestationalAge) {
    auxiliaryInput = document.createElement("input");
    auxiliaryInput.type = "number";
    auxiliaryInput.className =
      "condition-hover-quick-input condition-hover-quick-meta";
    auxiliaryInput.value =
      p.gestational_age_weeks ?? "";
    auxiliaryInput.placeholder = "EG sem";
    auxiliaryInput.title =
      "Edad gestacional (semanas)";
    auxiliaryInput.setAttribute(
      "aria-label",
      "Edad gestacional en semanas"
    );
    auxiliaryInput.min = "1";
    auxiliaryInput.max = "45";
    auxiliaryInput.step = "1";
  } else if (includeMultipleCount) {
    auxiliaryInput = document.createElement("input");
    auxiliaryInput.type = "text";
    auxiliaryInput.className =
      "condition-hover-quick-input condition-hover-quick-meta";
    auxiliaryInput.value =
      p.multiple_count ?? "";
    auxiliaryInput.placeholder = "Nº indiv.";
    auxiliaryInput.title =
      t("action.multiple.count");
    auxiliaryInput.setAttribute(
      "aria-label",
      "Número de individuos"
    );
    auxiliaryInput.autocomplete = "off";
  }

  topRow.appendChild(labelInput);

  if (auxiliaryInput) {
    if (chronologyMode) topRow.appendChild(chronologyMode);
    topRow.appendChild(auxiliaryInput);
  }

  const bottomRow = document.createElement("div");
  bottomRow.className =
    "condition-hover-quick-edit-row condition-hover-quick-edit-bottom";

  const briefInput = document.createElement("input");
  briefInput.type = "text";
  briefInput.className =
    "condition-hover-quick-input condition-hover-quick-brief";
  briefInput.value = p.brief_info || "";
  briefInput.placeholder = "Breve información";
  briefInput.title = "Breve información";
  briefInput.setAttribute(
    "aria-label",
    "Breve información"
  );
  briefInput.autocomplete = "off";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "condition-hover-quick-save";
  saveButton.textContent = "✓";
  saveButton.title = "Guardar datos rápidos";
  saveButton.setAttribute(
    "aria-label",
    "Guardar datos rápidos"
  );

  const saveQuickFields = () => {
    const label = labelInput.value.trim();
    const brief = briefInput.value.trim();

    let age = p.age ?? null;
    let birthYear = p.birth_year ?? null;
    let gestationalAge =
      p.gestational_age_weeks ?? null;
    let multipleCount =
      p.multiple_count ?? null;

    if (includeAge) {
      const raw = auxiliaryInput.value.trim();
      const yearMode = chronologyMode.value === "birth_year";
      age = null;
      birthYear = null;
      if (raw !== "") {
        const parsed = Number(raw);
        const valid = Number.isInteger(parsed) && (yearMode
          ? parsed >= 1000 && parsed <= new Date().getFullYear()
          : parsed >= 0 && parsed <= 130);
        if (!valid) {
          auxiliaryInput.setCustomValidity(t(yearMode
            ? "validation.birthYear.range" : "validation.age.integerRange"));
          auxiliaryInput.reportValidity();
          return;
        }
        if (yearMode) birthYear = parsed;
        else age = parsed;
      }
      auxiliaryInput.setCustomValidity("");
    }

    if (includeGestationalAge) {
      const raw = auxiliaryInput.value.trim();

      gestationalAge = null;

      if (raw !== "") {
        const parsed = Number(raw);

        if (
          !Number.isInteger(parsed) ||
          parsed < 1 ||
          parsed > 45
        ) {
          auxiliaryInput.setCustomValidity(
            t("validation.gestationalAge.integerRange")
          );
          auxiliaryInput.reportValidity();
          return;
        }

        gestationalAge = parsed;
      }

      auxiliaryInput.setCustomValidity("");
    }

    if (includeMultipleCount) {
      const raw =
        auxiliaryInput.value.trim().toLowerCase();

      if (raw === "n") {
        multipleCount = "n";
      } else {
        const parsed = Number(raw);

        if (
          raw === "" ||
          !Number.isInteger(parsed) ||
          parsed < 2
        ) {
          auxiliaryInput.setCustomValidity(
            t("validation.multiple.integerOrN")
          );
          auxiliaryInput.reportValidity();
          return;
        }

        multipleCount = parsed;
      }

      auxiliaryInput.setCustomValidity("");
    }

    const sameMultipleCount =
      String(multipleCount ?? "") ===
      String(p.multiple_count ?? "");

    if (
      label === String(p.label || "") &&
      brief === String(p.brief_info || "") &&
      age === (p.age ?? null) &&
      birthYear === (p.birth_year ?? null) &&
      gestationalAge ===
        (p.gestational_age_weeks ?? null) &&
      sameMultipleCount
    ) {
      return;
    }

    pushUndoState();

    p.label = label;
    p.brief_info = brief;

    if (includeAge) {
      p.age = age;
      p.birth_year = birthYear;
    }

    if (includeGestationalAge) {
      p.gestational_age_weeks =
        gestationalAge;
    }

    if (includeMultipleCount) {
      p.multiple_count =
        multipleCount;
    }

    selectedPersonUid = p.uid;

    renderPedigree();

    const refreshed =
      personByUid(p.uid);

    const node = currentSvg
      ? Array.from(
          currentSvg.querySelectorAll(".person")
        ).find(
          item =>
            item.getAttribute("data-uid") === p.uid
        )
      : null;

    if (refreshed && node) {
      showConditionHoverCardForFocus(
        refreshed,
        node
      );
    }

    message(t("individual.quickSaved"), "success");
  };

  saveButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      cancelConditionHoverHide();
      saveQuickFields();
    }
  );

  [
    labelInput,
    briefInput,
    ...(auxiliaryInput ? [auxiliaryInput] : [])
  ].forEach(input => {
    input.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          saveQuickFields();
        }
      }
    );
  });

  bottomRow.append(
    briefInput,
    saveButton
  );

  wrap.append(
    topRow,
    bottomRow
  );

  card.appendChild(wrap);
}

function hoverCardHeadingText(p) {
  if (!p) return "";

  const number =
    pedigreeNumbersVisible()
      ? (
          currentNumbers.get(
            p.uid
          ) || ""
        )
      : "";

  const label =
    String(
      p.label || ""
    ).trim();

  if (number && label) {
    return `${number} · ${label}`;
  }

  if (number) {
    return number;
  }

  if (label) {
    return label;
  }

  return (
    clinicalRecordTypeLabel(p) ||
    p.uid
  );
}

function hoverCardMetaText(p) {
  if (!p) return "";

  const parts = [];

  const descriptor =
    window.PedigrAPPi18n.uiText(clinicalRecordTypeLabel(p));

  if (descriptor) {
    parts.push(descriptor);
  }

  if (personalChronologyLabel(p)) {
    parts.push(personalChronologyLabel(p));
  } else if (
    p.gestational_age_weeks !== null &&
    p.gestational_age_weeks !== undefined &&
    p.gestational_age_weeks !== ""
  ) {
    parts.push(
      `${p.gestational_age_weeks} sem`
    );
  }

  return parts.join(" · ");
}

function hoverSectionLabel(
  text
) {
  const label =
    document.createElement(
      "div"
    );

  label.className =
    "condition-hover-block-label";

  label.textContent =
    window.PedigrAPPi18n?.uiText(text) ?? text;

  return label;
}

function buildConditionHoverCard(p) {
  const card = conditionHoverCard();
  if (!card) return false;

  card.replaceChildren();

  if (!p) {
    return false;
  }

  conditionHoverActiveUid =
    p.uid;

  card.dataset.uid =
    p.uid;

  /*
   * 0.8.59 — ficha operativa:
   *   1. Identidad + edición rápida
   *   2. Estado
   *   3. Información clínica
   *   4. Añadir familiar
   *   5. Resumen clínico
   *   6. Más opciones
   *   7. Editar / Eliminar
   */
  const closeButton =
    document.createElement(
      "button"
    );

  closeButton.type =
    "button";

  closeButton.className =
    "condition-hover-close";

  closeButton.title =
    "Cerrar";

  closeButton.setAttribute(
    "aria-label",
    t("action.tooltip.close")
  );

  closeButton.textContent =
    "×";

  closeButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      hideConditionHoverCard();
    }
  );

  card.appendChild(
    closeButton
  );

  /* --------------------------------------------------------
   * 1. Cabecera del registro
   * ----------------------------------------------------- */
  const identityBlock =
    document.createElement(
      "div"
    );

  identityBlock.className =
    "condition-hover-identity";

  const heading =
    document.createElement(
      "div"
    );

  heading.className =
    "condition-hover-person";

  heading.textContent =
    hoverCardHeadingText(p);

  const meta =
    document.createElement(
      "div"
    );

  meta.className =
    "condition-hover-person-meta";

  meta.textContent =
    hoverCardMetaText(p);

  identityBlock.appendChild(
    heading
  );

  if (meta.textContent) {
    identityBlock.appendChild(
      meta
    );
  }

  card.appendChild(
    identityBlock
  );

  appendHoverQuickPersonFields(
    card,
    p
  );

  /* --------------------------------------------------------
   * Preparar opciones avanzadas + atajos familiares.
   * Los controles avanzados siguen siendo exactamente los mismos.
   * ----------------------------------------------------- */
  const familyShortcutHost =
    document.createElement(
      "div"
    );

  familyShortcutHost.className =
    "condition-hover-family-shortcut-host";

  const advancedContent =
    document.createElement(
      "div"
    );

  advancedContent.className =
    "condition-hover-more-content";

  advancedContent.hidden =
    true;

  appendHoverManualLayoutControls(
    advancedContent,
    p
  );

  appendHoverRelationControls(
    advancedContent,
    p,
    familyShortcutHost
  );

  const hasAdvancedOptions =
    advancedContent.childElementCount > 0;

  /* --------------------------------------------------------
   * 2. Estado rápido
   * ----------------------------------------------------- */
  if (recordType(p) === "person") {
    const stateBlock =
      document.createElement(
        "div"
      );

    stateBlock.className =
      "condition-hover-block condition-hover-state-block";

    stateBlock.appendChild(
      hoverSectionLabel(
        t("tooltip.section.state")
      )
    );

    const stateActions =
      document.createElement(
        "div"
      );

    stateActions.className =
      "condition-hover-state-actions";

    const genderButton =
      document.createElement(
        "button"
      );

    genderButton.type =
      "button";

    genderButton.className =
      "condition-hover-gender";

    genderButton.title =
      "Cambiar género y sexo: hombre/masculino → mujer/femenino → no especificado/desconocido";

    genderButton.setAttribute(
      "aria-label",
      "Cambiar género y sexo"
    );

    const genderIcon =
      document.createElement(
        "span"
      );

    genderIcon.className =
      "condition-hover-gender-icon";

    genderIcon.setAttribute(
      "aria-hidden",
      "true"
    );

    genderIcon.textContent =
      "⚥";

    genderButton.appendChild(
      genderIcon
    );

    genderButton.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();
        cancelConditionHoverHide();
        cyclePersonGenderFromHover(
          p.uid
        );
      }
    );

    const deceasedButton =
      makeHoverStateButton(
        "condition-hover-deceased",
        p.deceased
          ? "Quitar estado fallecido"
          : "Marcar como fallecido",
        "💀",
        !!p.deceased,
        () =>
          togglePersonDeceasedFromHover(
            p.uid
          )
      );

    const probandButton =
      makeHoverStateButton(
        "condition-hover-proband",
        p.proband
          ? "Quitar probando"
          : "Marcar como probando",
        "↗P",
        !!p.proband,
        () =>
          togglePersonProbandFromHover(
            p.uid
          )
      );

    const consultandButton =
      makeHoverStateButton(
        "condition-hover-consultand",
        p.consultand
          ? "Quitar consultante"
          : "Marcar como consultante",
        "↗C",
        !!p.consultand,
        () =>
          togglePersonConsultandFromHover(
            p.uid
          )
      );

    const simpleAffected =
      !(family.conditions || []).length &&
      !!p.affected;

    const affectedButton =
      makeHoverStateButton(
        "condition-hover-affected",
        (family.conditions || []).length
          ? t("message.clinical.affectedClinical")
          : (
              simpleAffected
                ? "Quitar afectado"
                : "Marcar como afectado"
            ),
        "●",
        simpleAffected,
        () =>
          togglePersonSimpleAffectedFromHover(
            p.uid
          )
      );

    if (
      (family.conditions || []).length
    ) {
      affectedButton.disabled =
        true;

      affectedButton.classList.add(
        "is-clinical"
      );
    }

    stateActions.append(
      genderButton,
      deceasedButton,
      probandButton,
      consultandButton,
      affectedButton
    );

    stateBlock.appendChild(
      stateActions
    );

    card.appendChild(
      stateBlock
    );
  }

  if (["fetus", "stillbirth"].includes(recordType(p))) {
    const fetalState = document.createElement("div");
    fetalState.className = "condition-hover-block condition-hover-state-block";
    fetalState.appendChild(hoverSectionLabel(t("tooltip.section.fetalSex")));
    const actions = document.createElement("div");
    actions.className = "condition-hover-state-actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "condition-hover-gender";
    button.title = "Cambiar sexo fetal: desconocido → masculino → femenino → desconocido";
    button.setAttribute("aria-label", "Cambiar sexo fetal");
    const symbol = document.createElement("span");
    symbol.className = "condition-hover-gender-icon";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = ({ man:"□", woman:"○" })[p.gender] || "◇";
    button.appendChild(symbol);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      cancelConditionHoverHide();
      cyclePersonGenderFromHover(p.uid);
    });
    actions.appendChild(button);
    fetalState.appendChild(actions);
    card.appendChild(fetalState);
  }

  /* --------------------------------------------------------
   * 3. Acción clínica principal
   * ----------------------------------------------------- */
  if (supportsClinicalInformation(p)) {
    const clinicalBlock =
      document.createElement(
        "div"
      );

    clinicalBlock.className =
      "condition-hover-block condition-hover-clinical-block";

    const clinicalButton =
      document.createElement(
        "button"
      );

    clinicalButton.type =
      "button";

    clinicalButton.className =
      "condition-hover-clinical";

    clinicalButton.textContent =
      "Información clínica y genética";

    clinicalButton.title =
      "Abrir Información clínica y genética";

    clinicalButton.setAttribute(
      "aria-label",
      "Abrir Información clínica y genética"
    );

    clinicalButton.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        hideConditionHoverCard();

        openClinicalDrawer(
          p.uid
        );
      }
    );

    clinicalBlock.appendChild(
      clinicalButton
    );

    card.appendChild(
      clinicalBlock
    );
  }

  /* --------------------------------------------------------
   * 4. Añadir familiar
   * ----------------------------------------------------- */
  if (
    familyShortcutHost.childElementCount
  ) {
    const familyBlock =
      document.createElement(
        "div"
      );

    familyBlock.className =
      "condition-hover-block condition-hover-family-block";

    familyBlock.appendChild(
      hoverSectionLabel(
        t("tooltip.section.addFamily")
      )
    );

    familyBlock.appendChild(
      familyShortcutHost
    );

    card.appendChild(
      familyBlock
    );
  }

  /* --------------------------------------------------------
   * 5. Resumen de condiciones ya registradas
   * ----------------------------------------------------- */
  const conditions =
    supportsPedigreeConditions(p)
      ? (family.conditions || [])
      : [];

  if (conditions.length) {
    const clinicalSummary =
      document.createElement(
        "div"
      );

    clinicalSummary.className =
      "condition-hover-block condition-hover-clinical-summary";

    clinicalSummary.appendChild(
      hoverSectionLabel(
        t("tooltip.section.clinicalSummary")
      )
    );

    conditions.forEach(condition => {
      const state =
        conditionStateForPerson(
          p,
          condition.id
        );

      const section =
        document.createElement(
          "div"
        );

      section.className =
        "condition-hover-section";

      const title =
        document.createElement(
          "div"
        );

      title.className =
        "condition-hover-title";

      title.textContent =
        condition.name ||
        condition.id;

      section.appendChild(
        title
      );

      const metaParts = [];

      if (condition.gene) {
        metaParts.push(
          condition.gene
        );
      }

      const inheritance =
        INHERITANCE_LABELS[
          condition.inheritance
        ] ||
        condition.inheritance;

      if (inheritance) {
        metaParts.push(
          inheritance
        );
      }

      if (metaParts.length) {
        const conditionMeta =
          document.createElement(
            "div"
          );

        conditionMeta.className =
          "condition-hover-meta";

        conditionMeta.textContent =
          metaParts.join(" · ");

        section.appendChild(
          conditionMeta
        );
      }

      appendConditionHoverRow(
        section,
        t("clinical.field.status"),
        CONDITION_STATUS_LABELS[
          state.status
        ] ||
          state.status
      );

      appendConditionHoverRow(
        section,
        t("clinical.field.molecular"),
        MOLECULAR_RESULT_LABELS[
          state.molecular_result
        ] ||
          state.molecular_result
      );

      appendConditionHoverRow(
        section,
        t("clinical.field.variant"),
        state.variant
      );

      if (state.zygosity) {
        appendConditionHoverRow(
          section,
          t("clinical.field.zygosity"),
          ZYGOSITY_LABELS[
            state.zygosity
          ] ||
            state.zygosity
        );
      }

      appendConditionHoverRow(
        section,
        t("clinical.field.genotype"),
        state.genotype
      );

      if (
        state.documented_evaluation
      ) {
        appendConditionHoverRow(
          section,
          t("clinical.field.documentedLabel"),
          t("clinical.field.recordReviewed")
        );
      }

      clinicalSummary.appendChild(
        section
      );
    });

    card.appendChild(
      clinicalSummary
    );
  }

  /* --------------------------------------------------------
   * 6. Más opciones
   * ----------------------------------------------------- */
  if (hasAdvancedOptions) {
    const moreBlock =
      document.createElement(
        "div"
      );

    moreBlock.className =
      "condition-hover-block condition-hover-more-block";

    const moreButton =
      document.createElement(
        "button"
      );

    moreButton.type =
      "button";

    moreButton.className =
      "condition-hover-more-button";

    moreButton.innerHTML =
      '<span aria-hidden="true">⋯</span> ' + t('ui.more');

    moreButton.title =
      "Más opciones: Posición manual y Añadir relación entre personas existentes";

    moreButton.setAttribute(
      "aria-label",
      "Más opciones: Posición manual y Añadir relación entre personas existentes"
    );

    moreButton.setAttribute(
      "aria-expanded",
      "false"
    );

    moreButton.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();
        cancelConditionHoverHide();

        const willOpen =
          advancedContent.hidden;

        advancedContent.hidden =
          !willOpen;

        moreButton.setAttribute(
          "aria-expanded",
          willOpen
            ? "true"
            : "false"
        );

        moreButton.title =
          willOpen
            ? "Ocultar opciones avanzadas"
            : "Más opciones: Posición manual y Añadir relación entre personas existentes";

        requestAnimationFrame(
          () =>
            keepConditionHoverCardInViewport(
              card
            )
        );
      }
    );

    moreBlock.append(
      moreButton,
      advancedContent
    );

    card.appendChild(
      moreBlock
    );
  }

  /* --------------------------------------------------------
   * 7. Pie: Editar / Eliminar
   * ----------------------------------------------------- */
  const footer =
    document.createElement(
      "div"
    );

  footer.className =
    "condition-hover-footer";

  const editButton =
    document.createElement(
      "button"
    );

  editButton.type =
    "button";

  editButton.className =
    "condition-hover-edit";

  editButton.title =
    "Editar este registro";

  editButton.setAttribute(
    "aria-label",
    "Editar este registro"
  );

  const editIcon =
    document.createElement(
      "span"
    );

  editIcon.className =
    "condition-hover-edit-icon";

  editIcon.setAttribute(
    "aria-hidden",
    "true"
  );

  editIcon.textContent =
    "✎";

  const editLabel =
    document.createElement(
      "span"
    );

  editLabel.textContent =
    "Editar";

  editButton.append(
    editIcon,
    editLabel
  );

  editButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      editPersonFromHover(
        p.uid
      );
    }
  );

  const deleteButton =
    document.createElement(
      "button"
    );

  deleteButton.type =
    "button";

  deleteButton.className =
    "condition-hover-delete";

  deleteButton.textContent =
    "Eliminar";

  deleteButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      cancelConditionHoverHide();
      deletePerson(
        p.uid
      );
    }
  );

  footer.append(
    editButton,
    deleteButton
  );

  card.appendChild(
    footer
  );

  return true;
}

function keepConditionHoverCardInViewport(card) {
  if (!card || card.hidden) return;

  const margin = 12;
  const rect = card.getBoundingClientRect();

  let left = rect.left;
  let top = rect.top;

  if (rect.right > window.innerWidth - margin) {
    left -= rect.right - (window.innerWidth - margin);
  }

  if (rect.bottom > window.innerHeight - margin) {
    top -= rect.bottom - (window.innerHeight - margin);
  }

  left = Math.max(
    margin,
    Math.min(
      left,
      window.innerWidth - rect.width - margin
    )
  );

  top = Math.max(
    margin,
    Math.min(
      top,
      window.innerHeight - rect.height - margin
    )
  );

  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function positionConditionHoverCard(clientX,clientY) {
  const card = conditionHoverCard();
  if (!card || card.hidden) return;

  const margin = 12;
  const offset = 14;

  let left = clientX + offset;
  let top = clientY + offset;

  const rect = card.getBoundingClientRect();

  if (left + rect.width + margin > window.innerWidth) {
    left = clientX - rect.width - offset;
  }

  if (top + rect.height + margin > window.innerHeight) {
    top = clientY - rect.height - offset;
  }

  left = Math.max(
    margin,
    Math.min(
      left,
      window.innerWidth - rect.width - margin
    )
  );

  top = Math.max(
    margin,
    Math.min(
      top,
      window.innerHeight - rect.height - margin
    )
  );

  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function showConditionHoverCardForMouse(p,event) {
  cancelConditionHoverHide();

  const card = conditionHoverCard();

  if (
    !card ||
    !buildConditionHoverCard(p)
  ) {
    hideConditionHoverCard();
    return;
  }

  card.hidden = false;
  card.setAttribute("aria-hidden","false");

  positionConditionHoverCard(
    event.clientX,
    event.clientY
  );
}


function singleParentRelationsForUid(uid) {
  return family.relationships.filter(r =>
    r.type === "parentage" &&
    Array.isArray(r.parents) &&
    r.parents.length === 1 &&
    r.parents[0] === uid &&
    Array.isArray(r.children) &&
    r.children.length
  );
}

function singleParentLabelOffsetX(p,pos) {
  if (!p || !pos || !pos.has(p.uid)) return 0;

  const rels = singleParentRelationsForUid(p.uid);
  if (!rels.length) return 0;

  const self = pos.get(p.uid);
  const generation = p.generation;

  const peers = family.people
    .filter(other =>
      other.uid !== p.uid &&
      other.generation === generation &&
      pos.has(other.uid)
    )
    .map(other => pos.get(other.uid).x)
    .sort((a,b) => a - b);

  const leftNeighbor = peers.filter(x => x < self.x).pop();
  const rightNeighbor = peers.find(x => x > self.x);

  const leftGap = Number.isFinite(leftNeighbor)
    ? self.x - leftNeighbor
    : Infinity;
  const rightGap = Number.isFinite(rightNeighbor)
    ? rightNeighbor - self.x
    : Infinity;

  const offset = Math.round(C.symbolSize * 0.72);

  // Preferimos el lado con más aire libre. Si empatan, a la derecha.
  return rightGap >= leftGap ? offset : -offset;
}

function showConditionHoverCardForFocus(p,node) {
  cancelConditionHoverHide();

  const card = conditionHoverCard();

  if (
    !card ||
    !node ||
    !buildConditionHoverCard(p)
  ) {
    hideConditionHoverCard();
    return;
  }

  card.hidden = false;
  card.setAttribute("aria-hidden","false");

  const rect = node.getBoundingClientRect();

  positionConditionHoverCard(
    rect.left + rect.width/2,
    rect.top + rect.height/2
  );
}

function drawPerson(svg,p,position,numbers,pos) {
  const grouped = isMultipleIndividualsRecord(p);

  const attrs = {
    class:"person",
    "data-uid":p.uid,
    "aria-label":pedigreeDisplayName(p.uid),
    tabindex:"0",
    role:"button",
    "aria-describedby":"conditionHoverCard"
  };

  const g = svgEl("g", attrs);

  // La línea de gestación llega al símbolo por debajo; las etiquetas
  // mantienen un pequeño halo blanco para leerse sobre su trazado.
  if (isPregnancyCarrierRecord(p) && pregnancyCarrierTargetUid(p)) {
    g.classList.add("pregnancy-carrier-record");
  }

  /*
   * 0.8.59 — interacción por clic.
   *
   * El tooltip ya no aparece por hover ni por simple foco. Pulsar el
   * individuo abre la tarjeta contextual y NO desplaza automáticamente
   * a "Información clínica y genética".
   *
   * Enter/Espacio ofrecen el mismo comportamiento para teclado.
   */
  g.setAttribute(
    "aria-haspopup",
    "dialog"
  );

  g.setAttribute(
    "aria-controls",
    "conditionHoverCard"
  );

  g.removeAttribute(
    "aria-describedby"
  );

  g.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      if (suppressDraggedPersonClick || (personDragState && personDragState.moved)) {
        event.preventDefault();
        return;
      }
      showConditionHoverCardForMouse(
        p,
        event
      );
    }
  );

  g.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        event.stopPropagation();

        showConditionHoverCardForFocus(
          p,
          g
        );
      }
    }
  );

  if (selectedPersonUid === p.uid) {
    g.classList.add("selected-person");
  }

  shape(g,p,position.x,position.y);
  drawIndividualReproductiveStatusMarker(
    g,
    p,
    position.x,
    position.y
  );

  if (hasPersonNotes(p)) {
    const offset = C.symbolSize / 2 + 7;

    const indicator = svgEl("circle", {
      cx: position.x + offset,
      cy: position.y - offset,
      r: 4,
      class: "comment-indicator"
    });

    indicator.appendChild(svgEl("title", {}, "Tiene comentario"));
    g.appendChild(indicator);
  }

  let y = position.y + C.symbolSize/2 + C.labelGap;

  const directReproductiveOffset =
    individualReproductiveLabelOffset(p);

  const unionReproductiveOffset =
    reproductiveUnionForPerson(p.uid) ? 34 : 0;

  y += Math.max(
    directReproductiveOffset,
    unionReproductiveOffset
  );

  const type = recordType(p);
  const textOffsetX = singleParentLabelOffsetX(
    p,
    pos
  );
  const textX = position.x + textOffsetX;

  let hasTextLine = false;

  if (pedigreeNumbersVisible()) {
    g.appendChild(svgEl("text", {
      x:textX,
      y,
      class:"person-label"
    }, numbers.get(p.uid)));

    hasTextLine = true;
  }

  const nextTextY = gap => {
    if (hasTextLine) {
      y += gap;
    } else {
      hasTextLine = true;
    }

    return y;
  };

  if (["stillbirth","sab","top","ect"].includes(type)) {
    g.appendChild(svgEl("text", {
      x:textX,
      y:nextTextY(12),
      class:"pregnancy-loss-label"
    }, reproductiveEventLabel(p)));
  }

  if (
    supportsRecordLabel(p) &&
    String(p.label || "").trim()
  ) {
    g.appendChild(svgEl("text", {
      x:textX,
      y:nextTextY(13),
      class:"person-alias"
    }, String(p.label).trim()));
  }

  if (
    supportsRecordBriefInfo(p) &&
    String(p.brief_info || "").trim()
  ) {
    g.appendChild(svgEl("text", {
      x:textX,
      y:nextTextY(12),
      class:"person-brief-info"
    }, String(p.brief_info).trim()));
  }

  const chronologyAnnotation = personalChronologyLabel(p);
  annotations(p).forEach(txt => {
    g.appendChild(svgEl("text", {
      x:textX,
      y:nextTextY(12),
      class:"person-subtext" +
        (chronologyAnnotation && txt === chronologyAnnotation ? " person-chronology-label" : "")
    }, txt));
  });

  const intended = intendedParentAnnotation(p,numbers);
  if (intended) {
    g.appendChild(svgEl("text", {
      x:textX,
      y:nextTextY(15),
      class:"intended-parent-title"
    }, intended.title));
    g.appendChild(svgEl("text", {
      x:textX,
      y:nextTextY(12),
      class:"intended-parent-codes"
    }, intended.ids));
  }

  svg.appendChild(g);
}



function partnerCount(uid) {
  return family.relationships.filter(r =>
    r.type === "union" &&
    !r.intergenerational &&
    (r.people || []).includes(uid)
  ).length;
}

/*
 * T21 — unión de pareja por debajo de las fratrías.
 *
 * Cuando dos personas de familias de origen distintas forman pareja y
 * quedan hermanos entre ellas, no se modifica el orden de nacimiento para
 * hacerlas adyacentes. La línea de relación baja por debajo de la fila,
 * recorre un carril horizontal y vuelve a subir al otro miembro.
 *
 * El carril se sitúa por debajo de los textos visibles de esa generación.
 * Varias uniones inferiores cuyos intervalos se solapan ocupan carriles
 * diferentes.
 */

function crossFamilyUnderSibshipRouteCandidate(
  relation,
  pos
) {
  if (
    !relation ||
    relation.type !== "union" ||
    (relation.people || []).length !== 2
  ) {
    return null;
  }

  const [uidA,uidB] =
    relation.people;

  if (
    !pos.has(uidA) ||
    !pos.has(uidB) ||
    !isCrossFamilyUnionForLayout(
      uidA,
      uidB
    ) ||
    !crossFamilyUnionHasRepresentedSibship(
      relation
    )
  ) {
    return null;
  }

  const multiUnionMap =
    multipleUnionComponentMapForLayout();

  if (
    isMultipleUnionRelationForLayout(
      relation,
      multiUnionMap
    )
  ) {
    return null;
  }

  const a =
    pos.get(uidA);

  const b =
    pos.get(uidB);

  if (
    a.generation !== b.generation ||
    Math.abs(a.y-b.y) > 1
  ) {
    return null;
  }

  const minX =
    Math.min(a.x,b.x);

  const maxX =
    Math.max(a.x,b.x);

  const h =
    C.symbolSize/2;

  const blockers =
    [...pos.entries()]
      .filter(([uid,p]) =>
        uid !== uidA &&
        uid !== uidB &&
        p.generation === a.generation &&
        p.x > minX+h &&
        p.x < maxX-h
      )
      .map(([uid,p]) => ({
        uid,
        x:p.x,
        y:p.y
      }))
      .sort((x,y) =>
        x.x-y.x
      );

  if (!blockers.length) {
    return null;
  }

  return {
    relation,
    generation:a.generation,
    rowY:a.y,
    minX,
    maxX,
    blockers
  };
}

function intervalsOverlap(
  aMin,
  aMax,
  bMin,
  bMax,
  margin=16
) {
  return !(
    aMax+margin < bMin ||
    bMax+margin < aMin
  );
}

function crossFamilyUnderSibshipLaneMap(
  pos
) {
  const result =
    new Map();

  const candidates =
    family.relationships
      .map(r =>
        crossFamilyUnderSibshipRouteCandidate(
          r,
          pos
        )
      )
      .filter(Boolean)
      .sort((a,b) =>
        a.generation-b.generation ||
        a.minX-b.minX ||
        a.maxX-b.maxX
      );

  const rows =
    new Map();

  candidates.forEach(candidate => {
    const key =
      candidate.generation;

    if (!rows.has(key)) {
      rows.set(key,[]);
    }

    const lanes =
      rows.get(key);

    let lane = 0;

    while (true) {
      if (!lanes[lane]) {
        lanes[lane] = [];
      }

      const conflict =
        lanes[lane]
          .some(existing =>
            intervalsOverlap(
              candidate.minX,
              candidate.maxX,
              existing.minX,
              existing.maxX,
              20
            )
          );

      if (!conflict) {
        break;
      }

      lane += 1;
    }

    lanes[lane].push(candidate);
    result.set(
      candidate.relation,
      lane
    );
  });

  return result;
}

function generationTextBottomY(
  generation,
  pos
) {
  const bottoms =
    [...pos.entries()]
      .filter(([uid,p]) =>
        p.generation === generation
      )
      .map(([uid,p]) =>
        estimatedPersonTextBottomY(
          personByUid(uid),
          p
        )
      )
      .filter(Number.isFinite);

  if (!bottoms.length) {
    const any =
      [...pos.values()]
        .find(p =>
          p.generation === generation
        );

    return any
      ? any.y+C.symbolSize/2
      : 0;
  }

  return Math.max(...bottoms);
}

function nextGenerationTopY(
  generation,
  pos
) {
  const ys =
    [...pos.values()]
      .filter(p =>
        p.generation > generation
      )
      .map(p =>
        p.y-C.symbolSize/2
      )
      .filter(Number.isFinite);

  return ys.length
    ? Math.min(...ys)
    : null;
}

function underRouteVerticalAnchorIsClear(
  x,
  laneY,
  relation,
  pos
) {
  const children =
    unionChildren(
      relation.people[0],
      relation.people[1]
    )
      .filter(uid =>
        pos.has(uid)
      );

  if (!children.length) {
    return true;
  }

  const childTopY =
    Math.min(
      ...children.map(uid =>
        pos.get(uid).y -
        C.symbolSize/2
      )
    );

  const ignore =
    new Set([
      ...(relation.people || []),
      ...children
    ]);

  const safety =
    C.symbolSize/2 + 10;

  /*
   * Solo importan símbolos situados por DEBAJO del carril. Una persona
   * de la misma generación que esté encima del carril no bloquea la
   * vertical de descendencia.
   */
  return ![...pos.entries()]
    .some(([uid,p]) =>
      !ignore.has(uid) &&
      p.y-C.symbolSize/2 >
        laneY+2 &&
      p.y+C.symbolSize/2 <
        childTopY-2 &&
      Math.abs(p.x-x) <
        safety
    );
}


function underSibshipRouteGeometry(
  relation,
  pos
) {
  const candidate =
    crossFamilyUnderSibshipRouteCandidate(
      relation,
      pos
    );

  if (!candidate) {
    return null;
  }

  const [uidA,uidB] =
    relation.people;

  const a =
    pos.get(uidA);

  const b =
    pos.get(uidB);

  const h =
    C.symbolSize/2;

  const laneMap =
    crossFamilyUnderSibshipLaneMap(
      pos
    );

  const laneIndex =
    laneMap.get(relation) || 0;

  const rowTextBottom =
    generationTextBottomY(
      candidate.generation,
      pos
    );

  let laneY =
    rowTextBottom +
    22 +
    laneIndex*18;

  /*
   * Si existe otra generación debajo, reservamos un corredor mínimo antes
   * de sus símbolos. Normalmente el generationGap de 200 px deja espacio
   * de sobra para el carril y para la posterior barra de descendencia.
   */
  const nextTop =
    nextGenerationTopY(
      candidate.generation,
      pos
    );

  if (nextTop !== null) {
    laneY =
      Math.min(
        laneY,
        nextTop-45
      );
  }

  /*
   * Para no atravesar los textos centrados bajo cada cónyuge, el trazado
   * baja unos píxeles desde el símbolo y hace un pequeño codo hacia el
   * interior antes del tramo vertical largo.
   */
  const direction =
    b.x >= a.x
      ? 1
      : -1;

  const elbowY =
    a.y+h+8;

  const legOffset =
    h+10;

  const aLegX =
    a.x +
    direction*legOffset;

  const bLegX =
    b.x -
    direction*legOffset;

  /*
   * Punto de salida de descendencia:
   * preferimos un corredor libre entre individuos de la fila para evitar
   * que la vertical inferior quede exactamente bajo otro símbolo.
   */
  const sameRow =
    [...pos.entries()]
      .filter(([uid,p]) =>
        p.generation ===
          candidate.generation &&
        p.x >= candidate.minX &&
        p.x <= candidate.maxX
      )
      .map(([uid,p]) => ({
        uid,
        x:p.x
      }))
      .sort((x,y) =>
        x.x-y.x
      );

  const labelSafeRadius =
    h+30;

  const corridors = [];

  for (
    let i=1;
    i<sameRow.length;
    i++
  ) {
    const left =
      sameRow[i-1].x+
      labelSafeRadius;

    const right =
      sameRow[i].x-
      labelSafeRadius;

    if (right > left) {
      corridors.push({
        left,
        right,
        center:(left+right)/2,
        width:right-left
      });
    }
  }

  const children =
    unionChildren(
      uidA,
      uidB
    )
      .filter(uid =>
        pos.has(uid)
      );

  let desiredAnchor =
    (a.x+b.x)/2;

  if (children.length) {
    const childXs =
      children
        .map(uid =>
          pos.get(uid).x
        )
        .filter(Number.isFinite);

    if (childXs.length) {
      desiredAnchor =
        (
          Math.min(...childXs) +
          Math.max(...childXs)
        ) / 2;
    }
  }

  /*
   * T22b:
   * usamos el centro REAL de la descendencia siempre que el corredor
   * vertical por debajo del carril esté libre. Ya no exigimos que el
   * anchor coincida con un hueco entre personas de la misma generación.
   */
  let anchorX =
    desiredAnchor;

  if (
    !underRouteVerticalAnchorIsClear(
      desiredAnchor,
      laneY,
      relation,
      pos
    ) &&
    corridors.length
  ) {
    corridors.sort((x,y) =>
      Math.abs(x.center-desiredAnchor)-
        Math.abs(y.center-desiredAnchor) ||
      y.width-x.width ||
      x.center-y.center
    );

    anchorX =
      corridors[0].center;
  }

  /*
   * 0.7.44 — el anclaje de descendencia DEBE pertenecer físicamente
   * al tramo horizontal de la unión enrutada.
   *
   * Antes T22b podía elegir el centro real de los hijos incluso cuando
   * éste quedaba fuera de [aLegX,bLegX]. En ese caso la filiación nacía
   * en un punto donde no existía línea de pareja: visualmente los hijos
   * parecían dejar de pertenecer a sus progenitores al añadir una familia
   * vecina. Conservamos la preferencia por el centro de la descendencia,
   * pero la proyectamos sobre el tramo real de la unión. El desplazamiento
   * restante lo absorbe después drawParentage() con horizontal larga o,
   * si hay conflicto semántico, con su fallback diagonal.
   */
  const routeMinX = Math.min(aLegX,bLegX);
  const routeMaxX = Math.max(aLegX,bLegX);

  anchorX = Math.max(
    routeMinX,
    Math.min(routeMaxX,anchorX)
  );

  const points =
    [
      [a.x,a.y+h],
      [a.x,elbowY],
      [aLegX,elbowY],
      [aLegX,laneY],
      [bLegX,laneY],
      [bLegX,elbowY],
      [b.x,elbowY],
      [b.x,b.y+h]
    ];

  return {
    routed:true,
    routeSide:"below",
    y:(a.y+b.y)/2,
    laneY,
    anchorX,
    anchorY:laneY,
    blockers:candidate.blockers,
    points
  };
}


function pointOnSymbolEdgeToward(
  from,
  to
) {
  const dx =
    to.x-from.x;

  const dy =
    to.y-from.y;

  const distance =
    Math.hypot(dx,dy);

  if (!distance) {
    return {
      x:from.x,
      y:from.y
    };
  }

  /*
   * Aproximación deliberadamente simple:
   * usamos el radio/semilado del símbolo como distancia desde el centro.
   * Para cuadrados, círculos y rombos evita que la diagonal atraviese
   * visualmente el centro del símbolo.
   */
  const inset =
    C.symbolSize/2;

  return {
    x:
      from.x +
      dx/distance*inset,
    y:
      from.y +
      dy/distance*inset
  };
}

function intergenerationalUnionRouteGeometry(
  relation,
  pos
) {
  if (
    !relation ||
    relation.type !== "union" ||
    !relation.intergenerational ||
    (relation.people || []).length !== 2
  ) {
    return null;
  }

  const [uidA,uidB] =
    relation.people;

  const a =
    pos.get(uidA);

  const b =
    pos.get(uidB);

  if (
    !a ||
    !b ||
    a.generation === b.generation
  ) {
    return null;
  }

  const startPoint =
    pointOnSymbolEdgeToward(
      a,
      b
    );

  const endPoint =
    pointOnSymbolEdgeToward(
      b,
      a
    );

  const anchorX =
    (
      startPoint.x +
      endPoint.x
    )/2;

  const anchorY =
    (
      startPoint.y +
      endPoint.y
    )/2;

  /*
   * 0.8.59:
   * pareja intergeneracional = una sola diagonal.
   * No se crean carriles externos, codos ni desplazamientos del árbol.
   */
  return {
    routed:true,
    intergenerational:true,
    routeSide:"diagonal",
    y:anchorY,
    laneY:anchorY,
    anchorX,
    anchorY,
    blockers:[],
    endMarkSegment:{
      x1:startPoint.x,
      y1:startPoint.y,
      x2:endPoint.x,
      y2:endPoint.y
    },
    points:[
      [
        startPoint.x,
        startPoint.y
      ],
      [
        endPoint.x,
        endPoint.y
      ]
    ]
  };
}

function unionRouteGeometry(r,pos) {
  if (!r || r.type !== "union" || !(r.people || []).length === 2) return null;

  const intergenerationalRoute =
    intergenerationalUnionRouteGeometry(
      r,
      pos
    );

  if (intergenerationalRoute) {
    return intergenerationalRoute;
  }

  /*
   * T21 tiene prioridad para parejas entre dos familias de origen:
   * si hay hermanos/personas entre ambos miembros, la línea pasa por
   * DEBAJO de la generación sin recolocar la fratría.
   */
  const underRoute =
    underSibshipRouteGeometry(
      r,
      pos
    );

  if (underRoute) {
    return underRoute;
  }

  const a = pos.get(r.people[0]);
  const b = pos.get(r.people[1]);
  if (!a || !b) return null;

  const y = (a.y + b.y) / 2;
  const minX = Math.min(a.x,b.x);
  const maxX = Math.max(a.x,b.x);
  const h = C.symbolSize / 2;

  const sameRowPeople = [...pos.entries()]
    .filter(([uid,p]) => Math.abs(p.y - y) < 1)
    .map(([uid,p]) => ({uid,x:p.x}))
    .sort((u,v) => u.x-v.x);

  const blockers = sameRowPeople.filter(item =>
    !r.people.includes(item.uid) &&
    item.x > minX + h &&
    item.x < maxX - h
  );

  if (!blockers.length) {
    return {
      routed:false,
      y,
      anchorX:(a.x+b.x)/2,
      anchorY:y,
      blockers:[]
    };
  }

  // En uniones enrutadas de 3+ parejas la línea sale por la PARTE
  // SUPERIOR de ambos símbolos para evitar falsas continuidades con
  // personas intermedias y para alejarse de las etiquetas inferiores.
  const aTopY = a.y - h;
  const bTopY = b.y - h;

  const laneY =
    Math.min(aTopY,bTopY) -
    34 -
    (blockers.length - 1) * 16;

  // Corredores verticales libres entre personas de la misma fila.
  // Aumentamos la zona de seguridad respecto a símbolos y leyendas.
  const labelSafeRadius = h + 34;
  const centers = sameRowPeople
    .filter(item => item.x >= minX && item.x <= maxX)
    .map(item => item.x);

  const freeCorridors = [];

  for (let i=1; i<centers.length; i++) {
    const left = centers[i-1] + labelSafeRadius;
    const right = centers[i] - labelSafeRadius;

    if (right > left) {
      freeCorridors.push({
        left,
        right,
        center:(left+right)/2,
        width:right-left
      });
    }
  }

  // Si una de las dos personas es el progenitor común con varias uniones,
  // la bajada de descendencia debe preferir la zona más cercana a él/ella,
  // no a la pareja remota. Así evitamos cruzar la etiqueta de esa pareja.
  const aPartners = partnerCount(r.people[0]);
  const bPartners = partnerCount(r.people[1]);

  let desiredAnchor = (a.x+b.x)/2;

  if (aPartners > bPartners) {
    desiredAnchor = a.x + (b.x - a.x) * 0.30;
  } else if (bPartners > aPartners) {
    desiredAnchor = b.x + (a.x - b.x) * 0.30;
  }

  /*
   * 0.8.65 / T25b: una tercera unión enrutada no puede elegir su eje
   * sólo por proximidad al progenitor compartido: podría coincidir con
   * la bajada de otra unión, haciendo que dos fratrías parezcan una.
   *
   * Si existe descendencia propia de la pareja, tomamos su centro real
   * como objetivo y elegimos el corredor LIBRE más próximo a ese centro.
   * No movemos ni reordenamos individuos, ni alteramos las uniones sin
   * descendencia. El eje escogido se utiliza tanto para la línea de
   * pareja como para su línea de filiación (parentageBaseGeometry).
   */
  if (Math.max(aPartners,bPartners) >= 3) {
    const ownChildXs = family.relationships
      .filter(rel =>
        rel.type === "parentage" &&
        (rel.parents || []).length === 2 &&
        r.people.every(uid => rel.parents.includes(uid))
      )
      .flatMap(rel => rel.children || [])
      .filter(uid =>
        pos.has(uid) &&
        !hasSpermDonorForTarget(uid) &&
        !hasGestationalCarrierForTarget(uid)
      )
      .map(uid => pos.get(uid).x);

    if (ownChildXs.length) {
      desiredAnchor = (
        Math.min(...ownChildXs) +
        Math.max(...ownChildXs)
      ) / 2;
    }
  }

  let anchorX = desiredAnchor;

  if (freeCorridors.length) {
    freeCorridors.sort((u,v) =>
      Math.abs(u.center-desiredAnchor) - Math.abs(v.center-desiredAnchor) ||
      v.width-u.width ||
      u.center-v.center
    );

    anchorX = freeCorridors[0].center;
  }

  return {
    routed:true,
    routeSide:"above",
    y,
    laneY,
    anchorX,
    anchorY:laneY,
    blockers,
    aTopY,
    bTopY,
    points:[
      [a.x,aTopY],
      [a.x,laneY],
      [b.x,laneY],
      [b.x,bTopY]
    ]
  };
}

function shiftedRoutePoints(points,dy) {
  return points.map(([x,y]) => [x,y+dy]);
}

function routePointsString(points) {
  return points.map(([x,y]) => `${x},${y}`).join(" ");
}

function drawRoutedUnionLine(svg,route,className,dy=0) {
  svg.appendChild(svgEl("polyline", {
    points:routePointsString(shiftedRoutePoints(route.points,dy)),
    class:className
  }));
}


function intergenerationalParallelPoints(
  route,
  offset
) {
  if (
    !route ||
    !Array.isArray(route.points) ||
    route.points.length < 2
  ) {
    return [];
  }

  const [a,b] =
    route.points;

  const dx =
    b[0]-a[0];

  const dy =
    b[1]-a[1];

  const length =
    Math.hypot(dx,dy) || 1;

  /*
   * Vector perpendicular unitario:
   * (-dy, dx) / longitud
   */
  const nx =
    -dy/length;

  const ny =
    dx/length;

  return route.points.map(
    ([x,y]) => [
      x+nx*offset,
      y+ny*offset
    ]
  );
}

function drawIntergenerationalConsanguinityLine(
  svg,
  route,
  delta
) {
  svg.appendChild(
    svgEl(
      "polyline",
      {
        points:
          routePointsString(
            intergenerationalParallelPoints(
              route,
              delta
            )
          ),
        class:"consanguinity-line"
      }
    )
  );
}

function unionForParents(parentUids) {
  if (!Array.isArray(parentUids) || parentUids.length !== 2) return null;

  return family.relationships.find(r =>
    r.type === "union" &&
    sameSet(r.people || [],parentUids)
  ) || null;
}


function unionHasRegisteredChildren(r) {
  return !!(
    r &&
    (r.people || []).length === 2 &&
    unionChildren(r.people[0],r.people[1]).length
  );
}

function drawReproductiveStatusMarker(svg,r,pos,unionAnchor=null) {
  const status = r.reproductive_status || "none";

  if (!["no_children","infertility"].includes(status)) return;

  const attribution = r.reproductive_attribution || "union";
  const reason = String(r.reproductive_reason || "").trim();

  let x;
  let y0;

  if (attribution !== "union" && pos.has(attribution)) {
    const p = pos.get(attribution);
    x = p.x;
    y0 = p.y + C.symbolSize/2 + 4;
  } else if (unionAnchor) {
    x = unionAnchor.x;
    y0 = unionAnchor.y + 2;

    // En infertilidad puede existir descendencia previa/obtenida tras
    // tratamiento. Se desplaza ligeramente el marcador para no solaparlo
    // con la línea vertical de descendencia.
    if (status === "infertility" && unionHasRegisteredChildren(r)) {
      x -= 28;
    }
  } else {
    return;
  }

  const stem = 16;
  const barHalf = 10;
  const barY = y0 + stem;

  svg.appendChild(svgEl("line", {
    x1:x,y1:y0,
    x2:x,y2:barY,
    class:"reproductive-status-line"
  }));

  svg.appendChild(svgEl("line", {
    x1:x-barHalf,y1:barY,
    x2:x+barHalf,y2:barY,
    class:"reproductive-status-bar"
  }));

  if (status === "infertility") {
    svg.appendChild(svgEl("line", {
      x1:x-barHalf,y1:barY+6,
      x2:x+barHalf,y2:barY+6,
      class:"reproductive-status-bar"
    }));
  }

  if (reason) {
    svg.appendChild(svgEl("text", {
      x,
      y:barY + (status === "infertility" ? 20 : 15),
      class:"reproductive-status-reason"
    },reason));
  }
}

function relationshipEndMarkX(
  x1,
  x2,
  avoidX
) {
  const minX = Math.min(x1,x2);
  const maxX = Math.max(x1,x2);
  const h = C.symbolSize / 2;

  // Reservamos espacio suficiente para que el corte y las diagonales
  // no entren dentro de los símbolos de la pareja.
  const safeLeft =
    minX + h + 19;

  const safeRight =
    maxX - h - 19;

  if (safeRight <= safeLeft) {
    return (minX + maxX) / 2;
  }

  // Queremos alejarnos del punto de donde parte la descendencia.
  // En una pareja simple ese punto suele ser el centro; en uniones
  // enrutadas puede estar desplazado.
  const preferredOffset = 30;

  const leftCandidate =
    Math.max(
      safeLeft,
      avoidX - preferredOffset
    );

  const rightCandidate =
    Math.min(
      safeRight,
      avoidX + preferredOffset
    );

  const leftDistance =
    Math.abs(leftCandidate - avoidX);

  const rightDistance =
    Math.abs(rightCandidate - avoidX);

  if (rightDistance > leftDistance) {
    return rightCandidate;
  }

  if (leftDistance > rightDistance) {
    return leftCandidate;
  }

  // Empate: preferimos el lado derecho para mantener un criterio
  // determinista.
  return rightCandidate;
}


let relationshipActionMenuNode = null;

function currentUnionRelationship(r) {
  if (!r || r.type !== "union") return null;

  return family.relationships.find(candidate =>
    candidate.type === "union" &&
    sameSet(candidate.people || [], r.people || [])
  ) || null;
}

function hideRelationshipActionMenu() {
  if (!relationshipActionMenuNode) return;
  relationshipActionMenuNode.hidden = true;
}

function relationshipActionMenu() {
  if (relationshipActionMenuNode) {
    return relationshipActionMenuNode;
  }

  const menu = document.createElement("div");
  menu.className = "relationship-action-menu";
  menu.hidden = true;
  menu.setAttribute("role","dialog");
  menu.setAttribute("aria-label",t("action.relationship.moreOptions"));

  menu.addEventListener("pointerdown", event => {
    event.stopPropagation();
  });

  document.body.appendChild(menu);
  relationshipActionMenuNode = menu;

  document.addEventListener("pointerdown", event => {
    if (
      relationshipActionMenuNode &&
      !relationshipActionMenuNode.hidden &&
      !relationshipActionMenuNode.contains(event.target)
    ) {
      hideRelationshipActionMenu();
    }
  });

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      relationshipActionMenuNode &&
      !relationshipActionMenuNode.hidden
    ) {
      hideRelationshipActionMenu();
    }
  });

  window.addEventListener(
    "resize",
    hideRelationshipActionMenu,
    {passive:true}
  );

  // El menú es fijo y puede desplazarse internamente en pantallas
  // pequeñas. Se cierra al pulsar fuera, Escape o redimensionar,
  // pero no por un scroll provocado al enfocar sus propios campos.

  return menu;
}

function positionRelationshipActionMenu(menu,clientX,clientY) {
  const margin = 10;
  const offset = 8;

  menu.style.left = `${clientX + offset}px`;
  menu.style.top = `${clientY + offset}px`;

  const rect = menu.getBoundingClientRect();

  let left = clientX + offset;
  let top = clientY + offset;

  if (left + rect.width > window.innerWidth - margin) {
    left = clientX - rect.width - offset;
  }

  if (top + rect.height > window.innerHeight - margin) {
    top = clientY - rect.height - offset;
  }

  left = Math.max(
    margin,
    Math.min(
      left,
      window.innerWidth - rect.width - margin
    )
  );

  top = Math.max(
    margin,
    Math.min(
      top,
      window.innerHeight - rect.height - margin
    )
  );

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function relationshipActionRow(
  labelText,
  checked,
  onChange
) {
  const label = document.createElement("label");
  label.className = "relationship-action-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!checked;

  const text = document.createElement("span");
  text.textContent = labelText;

  checkbox.addEventListener("change", () => {
    onChange(checkbox.checked);
  });

  label.append(
    checkbox,
    text
  );

  return label;
}

function showRelationshipActionMenu(
  r,
  clientX,
  clientY
) {
  const rel = currentUnionRelationship(r);
  if (!rel) return;

  hideConditionHoverCard();

  const menu = relationshipActionMenu();
  menu.replaceChildren();

  const title = document.createElement("div");
  title.className = "relationship-action-title";
  title.textContent = "Relación de pareja";
  menu.appendChild(title);

  if (
    Array.isArray(rel.people) &&
    rel.people.length === 2
  ) {
    const names = document.createElement("div");
    names.className = "relationship-action-couple";
    names.textContent =
      `${pedigreeDisplayName(rel.people[0])} — ${pedigreeDisplayName(rel.people[1])}`;
    menu.appendChild(names);
  }

  const ended =
    ["ended","separated","divorced"].includes(
      rel.relationship_status
    );

  menu.appendChild(
    relationshipActionRow(
      "Relación finalizada",
      ended,
      checked => {
        const current = currentUnionRelationship(rel);
        if (!current) return;

        pushUndoState();
        current.relationship_status =
          checked ? "ended" : "current";

        hideRelationshipActionMenu();
        renderPedigree();

        message(
          checked
            ? t("message.relationship.ended")
            : t("message.relationship.restored"),
          "success"
        );
      }
    )
  );

  menu.appendChild(
    relationshipActionRow(
      "Relación consanguínea",
      !!rel.consanguineous,
      checked => {
        const current = currentUnionRelationship(rel);
        if (!current) return;

        pushUndoState();
        current.consanguineous = !!checked;

        /*
         * Conservamos consanguinity_degree si ya existía.
         * Mientras consanguineous=false no se representa; si el usuario
         * vuelve a activarlo, no pierde un grado previamente anotado.
         */
        hideRelationshipActionMenu();
        renderPedigree();

        message(
          checked
            ? t("message.relationship.consanguinityAdded")
            : t("message.relationship.consanguinityRemoved"),
          "success"
        );
      }
    )
  );

  /* 0.8.74 — atajo de situación reproductiva sobre la propia unión.
   * Usa exactamente el mismo modelo y validación que Relaciones avanzadas;
   * no almacena estados duplicados ni atribuye automáticamente una causa.
   */
  const reproductiveSection = document.createElement("div");
  reproductiveSection.className = "relationship-reproductive-section";

  const reproductiveLabel = document.createElement("label");
  reproductiveLabel.className = "relationship-reproductive-label";
  reproductiveLabel.textContent = "Situación reproductiva";

  const reproductiveSelect = document.createElement("select");
  reproductiveSelect.className = "relationship-reproductive-select";
  reproductiveSelect.setAttribute("aria-label", t("action.relationship.reproductiveStatus"));
  reproductiveSelect.replaceChildren(
    new Option("Sin información especial", "none"),
    new Option("No descendencia por elección / motivo desconocido", "no_children"),
    new Option("Infertilidad", "infertility")
  );
  reproductiveSelect.value = rel.reproductive_status || "none";
  reproductiveLabel.appendChild(reproductiveSelect);
  reproductiveSection.appendChild(reproductiveLabel);

  const reproductiveDetails = document.createElement("div");
  reproductiveDetails.className = "relationship-reproductive-details";

  const attributionLabel = document.createElement("label");
  attributionLabel.className = "relationship-reproductive-label";
  attributionLabel.textContent = "Atribución";

  const attributionSelect = document.createElement("select");
  attributionSelect.className = "relationship-reproductive-select";
  attributionSelect.setAttribute("aria-label", t("action.relationship.reproductiveAttribution"));
  attributionSelect.replaceChildren(
    new Option("Pareja / no especificado", "union"),
    new Option(pedigreeDisplayName(rel.people[0]), "a"),
    new Option(pedigreeDisplayName(rel.people[1]), "b")
  );
  attributionSelect.value =
    rel.reproductive_attribution === rel.people[0] ? "a" :
    rel.reproductive_attribution === rel.people[1] ? "b" : "union";
  attributionLabel.appendChild(attributionSelect);
  reproductiveDetails.appendChild(attributionLabel);

  const reasonLabel = document.createElement("label");
  reasonLabel.className = "relationship-reproductive-label";
  reasonLabel.textContent = "Motivo (opcional)";

  const reasonInput = document.createElement("input");
  reasonInput.className = "relationship-reproductive-reason";
  reasonInput.type = "text";
  reasonInput.maxLength = 120;
  reasonInput.placeholder = t("help.relationship.reasonPlaceholder");
  reasonInput.value = rel.reproductive_reason || "";
  reasonLabel.appendChild(reasonInput);
  reproductiveDetails.appendChild(reasonLabel);
  reproductiveSection.appendChild(reproductiveDetails);

  const reproductiveSave = document.createElement("button");
  reproductiveSave.type = "button";
  reproductiveSave.className = "relationship-reproductive-save";
  reproductiveSave.textContent = "Guardar situación reproductiva";
  reproductiveSection.appendChild(reproductiveSave);

  function updateReproductiveShortcutVisibility() {
    reproductiveDetails.hidden = reproductiveSelect.value === "none";
    if (!menu.hidden) {
      positionRelationshipActionMenu(menu, clientX, clientY);
    }
  }

  reproductiveSelect.addEventListener("change", updateReproductiveShortcutVisibility);

  reproductiveSave.addEventListener("click", () => {
    const current = currentUnionRelationship(rel);
    if (!current) {
      hideRelationshipActionMenu();
      message(t("validation.relationship.notFound"), "error");
      return;
    }

    const status = reproductiveSelect.value;
    const attribution = status === "none" ? "union" : attributionSelect.value;
    const reason = status === "none" ? "" : reasonInput.value.trim();
    const storedAttribution = attribution === "a" ? current.people[0]
      : attribution === "b" ? current.people[1] : "union";

    if (
      (current.reproductive_status || "none") === status &&
      (current.reproductive_attribution || "union") === storedAttribution &&
      (current.reproductive_reason || "") === reason
    ) {
      hideRelationshipActionMenu();
      return;
    }

    pushUndoState();
    try {
      setUnionReproductiveData(
        current.people[0], current.people[1], status, attribution, reason
      );
    } catch (err) {
      const previous = undoHistory.pop();
      if (previous) family = previous;
      updateUndoButton();
      message("No se guardó la situación reproductiva: " + err.message, "error");
      return;
    }

    hideRelationshipActionMenu();
    renderPedigree();
    message(t("message.relationship.reproductiveUpdated"), "success");
  });

  menu.appendChild(reproductiveSection);
  updateReproductiveShortcutVisibility();

  menu.hidden = false;

  positionRelationshipActionMenu(
    menu,
    clientX,
    clientY
  );

  const firstControl =
    menu.querySelector("input");

  if (firstControl) {
    firstControl.focus({
      preventScroll:true
    });
  }
}

function addRelationshipHitTarget(svg,r,route,x1,x2,y) {
  const attrs = route && route.routed
    ? {
        points:routePointsString(route.points),
        class:"relationship-hit-target"
      }
    : {
        x1,
        y1:y,
        x2,
        y2:y,
        class:"relationship-hit-target"
      };

  const hit = route && route.routed
    ? svgEl("polyline",attrs)
    : svgEl("line",attrs);

  hit.setAttribute("role","button");
  hit.setAttribute("tabindex","0");
  hit.setAttribute(
    "aria-label",
    t("action.relationship.moreOptions")
  );

  hit.addEventListener("pointerdown", event => {
    event.stopPropagation();
  });

  hit.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();

    showRelationshipActionMenu(
      r,
      event.clientX,
      event.clientY
    );
  });

  hit.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    event.stopPropagation();

    const rect =
      hit.getBoundingClientRect();

    showRelationshipActionMenu(
      r,
      rect.left + rect.width/2,
      rect.top + rect.height/2
    );
  });

  svg.appendChild(hit);
}

function drawIntergenerationalEndedMark(
  svg,
  route
) {
  if (
    !route ||
    !Array.isArray(route.points) ||
    route.points.length < 2
  ) {
    return;
  }

  const [a,b] =
    route.points;

  const midX =
    (a[0]+b[0])/2;

  const midY =
    (a[1]+b[1])/2;

  const dx =
    b[0]-a[0];

  const dy =
    b[1]-a[1];

  const length =
    Math.hypot(dx,dy) || 1;

  const ux =
    dx/length;

  const uy =
    dy/length;

  const nx =
    -uy;

  const ny =
    ux;

  /*
   * Abrimos un hueco corto sobre la diagonal.
   */
  svg.appendChild(
    svgEl(
      "line",
      {
        x1:
          midX-ux*10,
        y1:
          midY-uy*10,
        x2:
          midX+ux*10,
        y2:
          midY+uy*10,
        class:"relationship-route-mask"
      }
    )
  );

  /*
   * Dos pequeñas barras paralelas entre sí y aproximadamente
   * perpendiculares a la relación.
   */
  [-4,4].forEach(step => {
    const cx =
      midX+ux*step;

    const cy =
      midY+uy*step;

    svg.appendChild(
      svgEl(
        "line",
        {
          x1:
            cx-nx*8,
          y1:
            cy-ny*8,
          x2:
            cx+nx*8,
          y2:
            cy+ny*8,
          class:"relationship-end-mark"
        }
      )
    );
  });
}

function drawUnion(svg,r,pos) {
  if (!r.people || r.people.length !== 2) return;

  const a = pos.get(r.people[0]);
  const b = pos.get(r.people[1]);
  if (!a || !b) return;

  const x1 = a.x;
  const x2 = b.x;
  const y = (a.y + b.y) / 2;
  const ended = ["ended","separated","divorced"].includes(
    r.relationship_status
  );
  const midX = (x1 + x2) / 2;
  const gap = 22;
  const route = unionRouteGeometry(r,pos);

  // La línea de descendencia sigue saliendo del centro/anchor de la
  // unión, pero las marcas // de relación finalizada se desplazan para
  // no coincidir visualmente con ella.
  const straightEndMarkX =
    relationshipEndMarkX(
      x1,
      x2,
      midX
    );

  const drawStraightLineAt = (lineY,className) => {
    if (!ended) {
      svg.appendChild(svgEl("line", {
        x1,y1:lineY,
        x2,y2:lineY,
        class:className
      }));
      return;
    }

    svg.appendChild(svgEl("line", {
      x1,y1:lineY,
      x2:straightEndMarkX-gap/2,y2:lineY,
      class:className
    }));

    svg.appendChild(svgEl("line", {
      x1:straightEndMarkX+gap/2,y1:lineY,
      x2,y2:lineY,
      class:className
    }));
  };

  if (route && route.routed) {
    const laneMidX = route.anchorX;

    if (route.intergenerational) {
      if (r.consanguineous) {
        drawIntergenerationalConsanguinityLine(
          svg,
          route,
          -3
        );

        drawIntergenerationalConsanguinityLine(
          svg,
          route,
          3
        );

        const degree =
          String(
            r.consanguinity_degree || ""
          ).trim();

        if (degree) {
          svg.appendChild(
            svgEl(
              "text",
              {
                x:
                  route.anchorX,
                y:
                  route.anchorY-10,
                class:"consanguinity-label"
              },
              degree
            )
          );
        }
      } else {
        drawRoutedUnionLine(
          svg,
          route,
          "relationship-route-line",
          0
        );
      }

      if (ended) {
        drawIntergenerationalEndedMark(
          svg,
          route
        );
      }

      drawReproductiveStatusMarker(
        svg,
        r,
        pos,
        {
          x:route.anchorX,
          y:route.anchorY
        }
      );

      addRelationshipHitTarget(
        svg,
        r,
        route,
        x1,
        x2,
        y
      );

      return;
    }

    if (r.consanguineous) {
      drawRoutedUnionLine(svg,route,"consanguinity-line",-4);
      drawRoutedUnionLine(svg,route,"consanguinity-line",4);

      const degree = String(r.consanguinity_degree || "").trim();
      if (degree) {
        svg.appendChild(svgEl("text", {
          x:laneMidX,
          y:route.laneY-11,
          class:"consanguinity-label"
        },degree));
      }
    } else {
      drawRoutedUnionLine(svg,route,"relationship-route-line",0);
    }

    if (ended) {
      const routedEndMarkX =
        relationshipEndMarkX(
          x1,
          x2,
          route.anchorX
        );

      // En un carril enrutado la interrupción // se coloca lejos del
      // anchor de descendencia; así no se superpone con la línea vertical.
      svg.appendChild(svgEl("rect", {
        x:routedEndMarkX-gap/2,
        y:route.laneY-10,
        width:gap,
        height:20,
        class:"relationship-route-mask"
      }));

      [-4,4].forEach(dx => {
        svg.appendChild(svgEl("line", {
          x1:routedEndMarkX+dx-4,
          y1:route.laneY+10,
          x2:routedEndMarkX+dx+4,
          y2:route.laneY-10,
          class:"relationship-end-mark"
        }));
      });
    }

    drawReproductiveStatusMarker(
      svg,
      r,
      pos,
      {x:route.anchorX,y:route.laneY}
    );

    addRelationshipHitTarget(svg,r,route,x1,x2,y);
    return;
  }

  if (r.consanguineous) {
    const offset = 4;
    drawStraightLineAt(y-offset,"consanguinity-line");
    drawStraightLineAt(y+offset,"consanguinity-line");

    const degree = String(r.consanguinity_degree || "").trim();
    if (degree) {
      svg.appendChild(svgEl("text", {
        x:midX,
        y:y-offset-7,
        class:"consanguinity-label"
      },degree));
    }
  } else {
    drawStraightLineAt(y,"pedigree-line");
  }

  if (ended) {
    [-4,4].forEach(dx => {
      svg.appendChild(svgEl("line", {
        x1:straightEndMarkX+dx-4,
        y1:y+10,
        x2:straightEndMarkX+dx+4,
        y2:y-10,
        class:"relationship-end-mark"
      }));
    });
  }

  drawReproductiveStatusMarker(
    svg,
    r,
    pos,
    {x:midX,y}
  );

  addRelationshipHitTarget(svg,r,route,x1,x2,y);
}

function drawMultipleBirthBranch(
  svg,
  rel,
  junctionY,
  childTop,
  pos
) {
  const members = (rel.members || [])
    .filter(uid => pos.has(uid))
    .sort((a,b)=>pos.get(a).x-pos.get(b).x);

  if (members.length < 2) return;

  const points = members.map(uid => pos.get(uid));
  const midX =
    points.reduce((sum,p)=>sum+p.x,0) /
    points.length;

  points.forEach(p => {
    svg.appendChild(svgEl("line", {
      x1:midX,
      y1:junctionY,
      x2:p.x,
      y2:childTop,
      class:"pedigree-line"
    }));
  });

  if (
    rel.zygosity === "monozygotic" &&
    points.length === 2
  ) {
    const t = 0.58;
    const a = points[0];
    const b = points[1];
    const y =
      junctionY +
      (childTop-junctionY)*t;
    const x1 = midX + (a.x-midX)*t;
    const x2 = midX + (b.x-midX)*t;

    svg.appendChild(svgEl("line", {
      x1:Math.min(x1,x2),
      y1:y,
      x2:Math.max(x1,x2),
      y2:y,
      class:"twin-zygosity-mark"
    }));
  } else if (
    rel.zygosity === "unknown" &&
    points.length === 2
  ) {
    svg.appendChild(svgEl("text", {
      x:midX,
      y:junctionY+13,
      class:"twin-question"
    }, "?"));
  }

  // Tricigóticos: tres ramas desde un punto común, sin línea
  // transversal ni signo de interrogación.
}

function drawTwinBranch(
  svg,
  twinRel,
  uidA,
  uidB,
  junctionY,
  childTop,
  pos
) {
  drawMultipleBirthBranch(
    svg,
    twinRel,
    junctionY,
    childTop,
    pos
  );
}

function twinsInsideMembers(memberUids) {
  const set = new Set(memberUids);

  return family.relationships.filter(r =>
    r.type === "twin" &&
    Array.isArray(r.members) &&
    r.members.length >= 2 &&
    r.members.every(uid => set.has(uid))
  );
}


function siblingGroupGeometry(r,pos) {
  const memberUids = (r.members || [])
    .filter(uid => pos.has(uid));

  if (memberUids.length < 2) return null;

  const members = memberUids.map(uid => pos.get(uid));
  const twins = twinsInsideMembers(memberUids);
  const twinMembers = new Set(
    twins.flatMap(t => t.members || [])
  );

  const topY =
    Math.min(...members.map(p => p.y)) -
    C.symbolSize/2;

  const descentXs = [];

  memberUids.forEach(uid => {
    if (!twinMembers.has(uid)) {
      descentXs.push(pos.get(uid).x);
    }
  });

  twins.forEach(t => {
    const points = (t.members || [])
      .filter(uid => pos.has(uid))
      .map(uid => pos.get(uid));

    if (points.length) {
      descentXs.push(
        points.reduce((sum,p)=>sum+p.x,0) /
        points.length
      );
    }
  });

  if (!descentXs.length) return null;

  return {
    relation:r,
    topY,
    minX:Math.min(...descentXs),
    maxX:Math.max(...descentXs)
  };
}

function siblingIntervalsOverlap(a,b,margin=8) {
  return !(
    a.maxX + margin < b.minX ||
    b.maxX + margin < a.minX
  );
}

function buildSiblingLaneMap(pos) {
  const result = new Map();

  const geometries = family.relationships
    .filter(r => r.type === "sibling")
    .map(r => siblingGroupGeometry(r,pos))
    .filter(Boolean)
    .sort((a,b)=>
      a.topY-b.topY ||
      a.minX-b.minX ||
      a.maxX-b.maxX
    );

  // Las fratrías de una misma fila comparten baseY, pero solo pueden
  // compartir carril si sus intervalos horizontales no se solapan.
  const rows = new Map();

  geometries.forEach(g => {
    const rowKey = Math.round(g.topY);

    if (!rows.has(rowKey)) {
      rows.set(rowKey,[]);
    }

    const lanes = rows.get(rowKey);
    let lane = 0;

    while (true) {
      if (!lanes[lane]) {
        lanes[lane] = [];
      }

      const conflict = lanes[lane]
        .some(existing =>
          siblingIntervalsOverlap(existing,g)
        );

      if (!conflict) break;
      lane += 1;
    }

    lanes[lane].push(g);

    // Carriles adicionales se desplazan hacia arriba para no sugerir
    // que dos fratrías diferentes son una única barra horizontal.
    result.set(g.relation,-lane*14);
  });

  return result;
}

function drawSiblingGroup(svg,r,pos,laneOffset=0) {
  const memberUids = (r.members || []).filter(uid => pos.has(uid));
  const members = memberUids.map(uid => pos.get(uid));
  if (members.length < 2) return;

  const twins = twinsInsideMembers(memberUids);
  const twinMembers = new Set(
    twins.flatMap(t => t.members || [])
  );

  const topY = Math.min(...members.map(p => p.y)) - C.symbolSize/2;
  const sibY = topY - 28 + laneOffset;

  const descentXs = [];

  memberUids.forEach(uid => {
    if (!twinMembers.has(uid)) {
      descentXs.push(pos.get(uid).x);
    }
  });

  twins.forEach(t => {
    const points = (t.members || [])
      .filter(uid => pos.has(uid))
      .map(uid => pos.get(uid));

    if (points.length) {
      descentXs.push(
        points.reduce((sum,p)=>sum+p.x,0) /
        points.length
      );
    }
  });

  if (descentXs.length > 1) {
    svg.appendChild(svgEl("line", {
      x1:Math.min(...descentXs),
      y1:sibY,
      x2:Math.max(...descentXs),
      y2:sibY,
      class:"pedigree-line"
    }));
  }

  memberUids.forEach(uid => {
    if (twinMembers.has(uid)) return;
    const p = pos.get(uid);

    svg.appendChild(svgEl("line", {
      x1:p.x, y1:sibY,
      x2:p.x, y2:topY,
      class:"pedigree-line"
    }));
  });

  twins.forEach(t => {
    drawMultipleBirthBranch(
      svg,
      t,
      sibY,
      topY,
      pos
    );
  });
}


function hasBiologicalAndAdoptiveParentage(uid) {
  return !!(
    parentageOf(uid,"biological") &&
    parentageOf(uid,"adoptive")
  );
}

function childDescentGeometryForParentage(r,uid,pos,parentAnchorX) {
  const child = pos.get(uid);

  if (!child) return null;

  const descentType =
    r.descent_type === "adoptive"
      ? "adoptive"
      : "biological";

  // Bennett/NSGC: cuando se representan simultáneamente la filiación
  // biológica y la adoptiva, ambas deben permanecer visualmente
  // distinguibles. La adoptiva queda vertical/discontinua bajo la familia
  // adoptiva; la biológica entra por un trazado propio, sin solaparse.
  if (
    descentType === "biological" &&
    hasBiologicalAndAdoptiveParentage(uid)
  ) {
    const half = C.symbolSize/2;

    // La entrada biológica se hace desde el lado más próximo al anclaje
    // de sus progenitores biológicos.
    let side = -1;

    if (parentAnchorX > child.x + 1) {
      side = 1;
    } else if (parentAnchorX < child.x - 1) {
      side = -1;
    }

    return {
      branchX: child.x + side*(half + 24),
      targetX: child.x,
      targetY: child.y - half,
      diagonal: true
    };
  }

  return {
    branchX: child.x,
    targetX: child.x,
    targetY: child.y - C.symbolSize/2,
    diagonal: false
  };
}


function isPregnancyLossUid(uid) {
  const p = personByUid(uid);
  const type = recordType(p);
  return type === "sab" || type === "top" || type === "ect";
}

function pregnancyLossTriangleHalfHeight() {
  // Debe coincidir con `th` utilizado en shape() para SAB/TOP.
  return 15;
}

function pregnancyLossStemLength() {
  // SAB/TOP/ECT: aumentamos al doble el tramo vertical entre la
  // barra de fratría y el vértice superior del triángulo.
  return 16;
}

function buildPregnancyLossVisualY(pos,parentageLaneMap) {
  const result = new Map();

  family.relationships
    .filter(r => r.type === "parentage")
    .forEach(r => {
      const losses = (r.children || [])
        .filter(uid => pos.has(uid) && isPregnancyLossUid(uid));

      if (!losses.length) return;

      // IMPORTANTE: calculamos la barra de fratría con las posiciones
      // generacionales normales. La pérdida no debe arrastrar hacia arriba
      // la barra del resto de los hermanos.
      const g = parentageBaseGeometry(
        r,
        pos,
        {includeArtTargets:true}
      );
      if (!g) return;

      const sibY =
        g.baseSibY +
        (parentageLaneMap.get(r) || 0);

      const centerY =
        sibY +
        pregnancyLossStemLength() +
        pregnancyLossTriangleHalfHeight();

      losses.forEach(uid => {
        // Si excepcionalmente aparece en más de una filiación,
        // conservamos la posición más alta/cercana a una barra.
        if (!result.has(uid) || centerY < result.get(uid)) {
          result.set(uid,centerY);
        }
      });
    });

  return result;
}


function estimatedPersonTextBottomY(p,position) {
  if (!p || !position) {
    return position
      ? position.y
      : 0;
  }

  let y =
    position.y +
    C.symbolSize/2 +
    C.labelGap;

  const directReproductiveOffset =
    individualReproductiveLabelOffset(p);

  const unionReproductiveOffset =
    reproductiveUnionForPerson(p.uid)
      ? 34
      : 0;

  y += Math.max(
    directReproductiveOffset,
    unionReproductiveOffset
  );

  const type =
    recordType(p);

  let hasTextLine =
    pedigreeNumbersVisible();

  let bottom =
    hasTextLine
      ? y
      : position.y +
        C.symbolSize/2;

  const addLine = gap => {
    if (hasTextLine) {
      y += gap;
    } else {
      hasTextLine = true;
    }

    bottom = y;
  };

  if (
    ["stillbirth","sab","top","ect"]
      .includes(type)
  ) {
    addLine(12);
  } else if (
    (
      type === "person" ||
      isDonorRecord(p) ||
      isGestationalCarrierRecord(p)
    ) &&
    p.label
  ) {
    addLine(13);
  }

  if (
    (
      type === "person" ||
      isDonorRecord(p) ||
      isGestationalCarrierRecord(p)
    ) &&
    String(
      p.brief_info || ""
    ).trim()
  ) {
    addLine(12);
  }

  annotations(p)
    .forEach(() => {
      addLine(12);
    });

  return bottom + 5;
}

function minimumSiblingBarYBelowParentText(parentUids,pos) {
  const bottoms = (parentUids || [])
    .filter(uid => pos.has(uid))
    .map(uid => {
      const p = personByUid(uid);
      const point = pos.get(uid);
      return estimatedPersonTextBottomY(p,point);
    })
    .filter(Number.isFinite);

  if (!bottoms.length) return null;

  // Dejamos más aire entre la última línea textual y la barra
  // horizontal de fratría. Esto alarga el tramo vertical de
  // descendencia y evita que los textos se monten sobre la barra.
  return Math.max(...bottoms) + 18;
}


function donationTargetTopAnchor(
  targetUid,
  pos,
  pregnancyLossVisualY=null
) {
  const p = personByUid(targetUid);
  const point = pos.get(targetUid);

  if (!p || !point) return null;

  const type = recordType(p);

  const y =
    pregnancyLossVisualY &&
    pregnancyLossVisualY.has(targetUid)
      ? pregnancyLossVisualY.get(targetUid)
      : point.y;

  if (["sab","top","ect"].includes(type)) {
    return {
      x:point.x,
      y:y-pregnancyLossTriangleHalfHeight()
    };
  }

  return {
    x:point.x,
    y:y-C.symbolSize/2
  };
}

function donorLowerCornerAnchor(
  donor,
  point,
  targetX
) {
  const h = C.symbolSize/2;
  const towardLeft = targetX < point.x;
  const sign = towardLeft ? -1 : 1;

  if (donor.gender === "man") {
    // Cuadrado: esquina inferior exacta orientada hacia el resultado.
    return {
      x:point.x + sign*h,
      y:point.y + h
    };
  }

  if (donor.gender === "woman") {
    // Círculo: equivalente geométrico a la esquina inferolateral.
    const d = h / Math.sqrt(2);

    return {
      x:point.x + sign*d,
      y:point.y + d
    };
  }

  // Rombo / género no especificado: punto inferolateral sobre el borde.
  return {
    x:point.x + sign*(h/2),
    y:point.y + h/2
  };
}


function explicitGestatingPersonUid(targetUid) {
  const relation = family.relationships.find(r =>
    r.type === "gestation" && r.target === targetUid
  );
  return relation ? relation.carrier : null;
}

function canBeExplicitGestator(p) {
  return !!p && recordType(p) === "person" &&
    p.sex_at_birth === "female";
}

function eligibleGestationOutcome(p) {
  return !!p && ["person","fetus","stillbirth","sab","top","ect"]
    .includes(recordType(p));
}

function assignGestation(carrierUid,targetUid) {
  const carrier = personByUid(carrierUid);
  const target = personByUid(targetUid);
  if (!canBeExplicitGestator(carrier)) {
    throw new Error(t("validation.gestation.afabRequired"));
  }
  if (!eligibleGestationOutcome(target) || carrierUid === targetUid) {
    throw new Error(t("validation.gestation.outcomeRequired"));
  }
  if (hasPregnancyCarrierForTarget(targetUid)) {
    throw new Error(t("validation.gestation.carrierConflict"));
  }
  if (isAncestor(targetUid,carrierUid)) {
    throw new Error(t("validation.gestation.cycle"));
  }
  const previous = family.relationships.find(r =>
    r.type === "gestation" && r.target === targetUid
  );
  if (previous) previous.carrier = carrierUid;
  else family.relationships.push({
    type:"gestation",carrier:carrierUid,target:targetUid
  });
}

function spermRecipientMotherUid(targetUid) {
  // Figure 5.1.d (2025): a transgender man (AFAB) may carry a
  // pregnancy. An explicit gestator always takes precedence over gender.
  const assigned = explicitGestatingPersonUid(targetUid);
  if (assigned) return assigned;
  const parentUids = [];

  // Preferimos filiación biológica; si no existe, usamos cualquier
  // filiación representada para localizar a la mujer gestante.
  const all = parentagesOf(targetUid)
    .filter(r => (r.parents || []).length);

  const biological = all.filter(r =>
    (r.descent_type || "biological") === "biological"
  );

  const rels = biological.length
    ? biological
    : all;

  rels.forEach(r => {
    (r.parents || []).forEach(uid => {
      if (!parentUids.includes(uid)) {
        parentUids.push(uid);
      }
    });
  });

  const parents = parentUids
    .map(personByUid)
    .filter(Boolean);

  const bySexAtBirth = parents.find(p =>
    p.sex_at_birth === "female"
  );
  if (bySexAtBirth) return bySexAtBirth.uid;

  // Backward compatibility for legacy records with unknown sex at birth.
  const byGender = parents.find(p => p.gender === "woman");
  return byGender ? byGender.uid : null;
}

function maternalBottomAnchor(
  mother,
  point
) {
  if (!mother || !point) return null;

  // La línea sale del centro inferior del símbolo materno,
  // como en la figura Bennett/NSGC corregida.
  return {
    x:point.x,
    y:point.y + C.symbolSize/2
  };
}

function gestationalCarrierBottomAnchor(carrier,point) {
  if (!carrier || !point) return null;

  return {
    x:point.x,
    y:point.y + C.symbolSize/2
  };
}

function geneticParentageStartAnchor(relation,pos) {
  const parentUids = (relation.parents || [])
    .filter(uid => pos.has(uid));

  if (!parentUids.length) return null;

  if (parentUids.length === 2) {
    const unionRel = unionForParents(parentUids);

    if (unionRel) {
      const route = unionRouteGeometry(unionRel,pos);

      if (route && route.routed) {
        return {
          x:route.anchorX,
          y:route.anchorY
        };
      }

      const a = pos.get(parentUids[0]);
      const b = pos.get(parentUids[1]);

      return {
        x:(a.x+b.x)/2,
        y:(a.y+b.y)/2
      };
    }
  }

  if (parentUids.length === 1) {
    const point = pos.get(parentUids[0]);

    return {
      x:point.x,
      y:point.y + C.symbolSize/2
    };
  }

  const points = parentUids.map(uid => pos.get(uid));

  return {
    x:points.reduce((sum,p)=>sum+p.x,0)/points.length,
    y:Math.max(...points.map(p=>p.y)) + C.symbolSize/2
  };
}

function drawGestationalGeneticLinks(
  svg,
  pos,
  pregnancyLossVisualY=null
) {
  family.people
    .filter(p =>
      isGestationalCarrierRecord(p) &&
      gestationTargetUid(p)
    )
    .forEach(carrier => {
      const targetUid = gestationTargetUid(carrier);

      // Con donante de esperma, la línea genética desde quien aporta
      // el óvulo ya se dibuja por la lógica específica de esperma.
      if (hasSpermDonorForTarget(targetUid)) return;

      const target = donationTargetTopAnchor(
        targetUid,
        pos,
        pregnancyLossVisualY
      );

      if (!target) return;

      parentagesOf(targetUid)
        .filter(r =>
          (r.descent_type || "biological") === "biological"
        )
        .forEach(rel => {
          const parents = (rel.parents || [])
            .filter(uid =>
              uid !== carrier.uid &&
              pos.has(uid)
            );

          if (!parents.length) return;

          const start = geneticParentageStartAnchor(
            {...rel,parents},
            pos
          );

          if (!start) return;

          svg.appendChild(svgEl("line", {
            x1:start.x,
            y1:start.y,
            x2:target.x,
            y2:target.y,
            class:"pedigree-line"
          }));
        });
    });
}

function drawGestationalCarrierLinks(
  svg,
  pos,
  pregnancyLossVisualY=null
) {
  family.people
    .filter(p =>
      isPregnancyCarrierRecord(p) &&
      pregnancyCarrierTargetUid(p) &&
      pos.has(p.uid)
    )
    .forEach(carrier => {
      const target = donationTargetTopAnchor(
        pregnancyCarrierTargetUid(carrier),
        pos,
        pregnancyLossVisualY
      );

      if (!target) return;

      const start = gestationalCarrierBottomAnchor(
        carrier,
        pos.get(carrier.uid)
      );

      if (!start) return;

      svg.appendChild(svgEl("line", {
        x1:start.x,
        y1:start.y,
        x2:target.x,
        y2:target.y,
        class:"pedigree-line"
      }));
    });
}


function drawExplicitGestationWithoutSpermLinks(svg,pos,pregnancyLossVisualY=null) {
  family.relationships.filter(r => r.type === "gestation").forEach(r => {
    if (hasSpermDonorForTarget(r.target) ||
        hasPregnancyCarrierForTarget(r.target) ||
        parentagesOf(r.target).length ||
        !pos.has(r.carrier)) return;
    const target = donationTargetTopAnchor(r.target,pos,pregnancyLossVisualY);
    if (!target) return;
    const carrier = personByUid(r.carrier);
    const start = maternalBottomAnchor(carrier,pos.get(r.carrier));
    if (!start) return;
    svg.appendChild(svgEl("line",{
      x1:start.x,y1:start.y,x2:target.x,y2:target.y,
      class:"pedigree-line"
    }));
  });
}

// Bennett 2025 fig. 5.1.c: a single sperm donor + one recorded parent
// share a horizontal genetic-origin connector and ONE sibling bar. The
// synthetic connector is visual only; it never creates a union in JSON.
function sharedSpermDonorConnector(rel,pos) {
  if (rel.type !== "parentage" || (rel.parents||[]).length !== 1 ||
      (rel.children||[]).length < 2 || rel.descent_type === "adoptive") return null;
  const parent = personByUid(rel.parents[0]);
  if (!parent || !pos.has(parent.uid)) return null;
  const donor = family.people.find(p => recordType(p) === "sperm_donor" &&
      (rel.children||[]).every(uid => donationTargetUids(p).includes(uid)) &&
      donationTargetUids(p).length >= 2 && pos.has(p.uid) &&
      !family.relationships.some(r => r.type === "union" && (r.people||[]).includes(p.uid)));
  if (!donor) return null;
  const a=pos.get(parent.uid), b=pos.get(donor.uid);
  if (a.generation !== b.generation || Math.abs(a.y-b.y)>1 ||
      Math.abs(a.x-b.x)>C.coupleGap*1.5 ||
      Math.abs(a.x-b.x)<C.symbolSize*1.25) return null;
  // No horizontal synthetic connector may pass through another symbol.
  if ([...pos].some(([uid,q]) => uid !== parent.uid && uid !== donor.uid &&
      q.generation === a.generation &&
      q.x>Math.min(a.x,b.x)+C.symbolSize/2 &&
      q.x<Math.max(a.x,b.x)-C.symbolSize/2)) return null;
  return {parent,donor,parentPoint:a,donorPoint:b,midX:(a.x+b.x)/2};
}

function sharedDonorFraternityGroups(donor,pos,parentageLaneMap=null,siblingLaneMap=null) {
  const remaining = new Set(donationTargetUids(donor).filter(uid => pos.has(uid)));
  const groups = [];
  family.relationships.filter(r => r.type === "parentage" || r.type === "sibling")
    .forEach(r => {
      const members = r.type === "parentage" ? (r.children || []) : (r.members || []);
      const covered = members.filter(uid => remaining.has(uid));
      if (covered.length < 2) return;
      const points = covered.map(uid => pos.get(uid));
      if (points.some(p => !p) || new Set(points.map(p => p.generation)).size !== 1) return;
      const barY = r.type === "parentage"
        ? (parentageBaseGeometry(r,pos)?.baseSibY ?? null) +
          (parentageLaneMap?.get(r) || 0)
        : Math.min(...members.filter(uid => pos.has(uid)).map(uid => pos.get(uid).y)) -
          C.symbolSize/2 - 28 + (siblingLaneMap?.get(r) || 0);
      if (!Number.isFinite(barY)) return;
      groups.push({relation:r,targets:covered,barY,x:
        (Math.min(...points.map(p => p.x))+Math.max(...points.map(p => p.x)))/2});
      covered.forEach(uid => remaining.delete(uid));
    });
  return {groups,remaining};
}

function drawSpermDonorMaternalLinks(
  svg,
  pos,
  pregnancyLossVisualY=null
) {
  family.people
    .filter(p =>
      recordType(p) === "sperm_donor" &&
      donationTargetUids(p).length
    )
    .forEach(donor => {
      donationTargetUids(donor)
        .forEach(targetUid => {
          // Si la gestación la lleva una surrogate que además aporta
          // el óvulo, su línea vertical D→resultado ya representa el
          // vínculo genético/gestacional materno.
          if (hasSurrogateForTarget(targetUid)) return;
          if (sharedDonorFraternityGroups(donor,pos).groups.some(group =>
              group.relation.type === "parentage" && group.targets.includes(targetUid))) return;

          const motherUid =
            spermRecipientMotherUid(
              targetUid
            );

          if (
            !motherUid ||
            !pos.has(motherUid)
          ) {
            return;
          }

          const target =
            donationTargetTopAnchor(
              targetUid,
              pos,
              pregnancyLossVisualY
            );

          if (!target) return;

          const mother =
            personByUid(motherUid);

          const start =
            maternalBottomAnchor(
              mother,
              pos.get(motherUid)
            );

          if (!start) return;

          svg.appendChild(
            svgEl("line", {
              x1:start.x,
              y1:start.y,
              x2:target.x,
              y2:target.y,
              class:"pedigree-line"
            })
          );
        });
    });
}

function drawDonorLinks(
  svg,
  pos,
  pregnancyLossVisualY=null,
  parentageLaneMap=null,
  siblingLaneMap=null
) {
  family.people
    .filter(p =>
      isDonorRecord(p) &&
      !isSurrogateOvumDonor(p) &&
      donationTargetUids(p).length &&
      pos.has(p.uid)
    )
    .forEach(donor => {
      const donorPoint = pos.get(donor.uid);
      const sharing = sharedDonorFraternityGroups(donor,pos,parentageLaneMap,siblingLaneMap);
      sharing.groups.forEach(group => {
        const special = sharedSpermDonorConnector(group.relation,pos);
        if (special && special.donor.uid === donor.uid) {
          const a=special.parentPoint, b=special.donorPoint;
          const direction=Math.sign(b.x-a.x);
          svg.appendChild(svgEl("line",{
            x1:a.x+direction*C.symbolSize/2,y1:a.y,
            x2:b.x-direction*C.symbolSize/2,y2:b.y,
            class:"donor-link-line shared-donor-fraternity-link"
          }));
        } else {
          const start=donorLowerCornerAnchor(donor,donorPoint,group.x);
          svg.appendChild(svgEl("line",{
            x1:start.x,y1:start.y,x2:group.x,y2:group.barY,
            class:"donor-link-line shared-donor-fraternity-link"
          }));
        }
      });
      [...sharing.remaining].forEach(targetUid => {
          const target =
            donationTargetTopAnchor(
              targetUid,
              pos,
              pregnancyLossVisualY
            );

          if (!target) return;

          const start =
            donorLowerCornerAnchor(
              donor,
              donorPoint,
              target.x
            );

          svg.appendChild(
            svgEl("line", {
              x1:start.x,
              y1:start.y,
              x2:target.x,
              y2:target.y,
              class:"donor-link-line"
            })
          );
        });
    });
}

function parentageBaseGeometry(
  r,
  pos,
  options={}
) {
  const parentUids = (r.parents || []).filter(uid => pos.has(uid));
  const includeArtTargets = !!options.includeArtTargets;

  // ART:
  // la filiación convencional hacia un embarazo con donante de esperma
  // o gestante G se dibuja mediante enlaces específicos.
  const childUids = (r.children || [])
    .filter(uid =>
      pos.has(uid) &&
      (
        includeArtTargets ||
        (
          (!hasSpermDonorForTarget(uid) ||
            family.people.some(donor =>
              recordType(donor) === "sperm_donor" &&
              donationTargetUids(donor).filter(id => (r.children||[]).includes(id)).length >= 2 &&
              donationTargetUids(donor).includes(uid))) &&
          !hasGestationalCarrierForTarget(uid)
        )
      )
    );
  const lineClass = (r.descent_type || "biological") === "adoptive"
    ? "adoptive-line"
    : "pedigree-line";

  const parents = parentUids.map(uid => pos.get(uid));
  const children = childUids.map(uid => pos.get(uid));

  if (!parents.length || !children.length) return null;

  let px = parents.reduce((s,p)=>s+p.x,0)/parents.length;
  const py = Math.max(...parents.map(p=>p.y));
  const cy = Math.min(...children.map(c=>c.y));

  let pBottom = py + C.symbolSize/2;
  let routedUnion = false;

  if (parentUids.length === 2) {
    const unionRel = unionForParents(parentUids);
    const route = unionRel ? unionRouteGeometry(unionRel,pos) : null;

    if (route && route.routed) {
      px = route.anchorX;
      pBottom = route.anchorY;
      routedUnion = true;
    } else {
      // La descendencia parte directamente de la línea de pareja.
      pBottom = (parents[0].y + parents[1].y) / 2;
    }
  }

  // In the narrow figure-5.1.c pattern, stem drops from the middle
  // of the donor–parent connector instead of an individual child link.
  const sharedConnector = sharedSpermDonorConnector(r,pos);
  if (sharedConnector && !includeArtTargets) {
    px = sharedConnector.midX;
    pBottom = sharedConnector.parentPoint.y;
  }

  const cTop = cy - C.symbolSize/2;
  const sibFraction = routedUnion ? 0.68 : 0.48;

  let baseSibY =
    pBottom +
    (cTop-pBottom) * sibFraction;

  // La barra de fratría no debe atravesar el texto situado debajo de
  // los progenitores. Si hay alias, sexo asignado al nacimiento, edad,
  // etc., desplazamos la barra hacia abajo respetando un margen.
  const minimumBelowParentText =
    minimumSiblingBarYBelowParentText(
      parentUids,
      pos
    );

  if (minimumBelowParentText !== null) {
    // Conservamos al menos 28 px de caída hasta la parte superior
    // de los símbolos de los hijos.
    const latestSafeY = cTop - 28;

    baseSibY = Math.min(
      Math.max(
        baseSibY,
        minimumBelowParentText
      ),
      latestSafeY
    );
  }

  const twins = twinsInsideMembers(childUids);
  const twinMembers = new Set(
    twins.flatMap(t => t.members || [])
  );

  const descentXs = [];
  const childDescentGeometry = new Map();

  childUids.forEach(uid => {
    if (twinMembers.has(uid)) return;

    const geometry =
      childDescentGeometryForParentage(
        r,
        uid,
        pos,
        px
      );

    if (!geometry) return;

    childDescentGeometry.set(uid,geometry);
    descentXs.push(geometry.branchX);
  });

  twins.forEach(t => {
    const points = (t.members || [])
      .filter(uid => pos.has(uid))
      .map(uid => pos.get(uid));

    if (points.length) {
      descentXs.push(
        points.reduce((sum,p)=>sum+p.x,0) /
        points.length
      );
    }
  });

  /*
   * T22c:
   * la barra de fratría pertenece a los hijos. px ya no alarga
   * artificialmente esa barra cuando los progenitores quedan descentrados.
   */
  const childHorizontalXs =
    descentXs.length
      ? [...descentXs]
      : [px];

  const childMinX =
    Math.min(
      ...childHorizontalXs
    );

  const childMaxX =
    Math.max(
      ...childHorizontalXs
    );

  const childJunctionX =
    (
      childMinX +
      childMaxX
    ) / 2;

  return {
    relation:r,
    parentUids,
    childUids,
    lineClass,
    px,
    pBottom,
    cTop,
    cy,
    baseSibY,
    twins,
    twinMembers,
    childDescentGeometry,
    descentXs,
    childJunctionX,
    minX:childMinX,
    maxX:childMaxX
  };
}

/*
 * 0.7.42 — protección semántica de las fratrías.
 *
 * 0.7.40 prioriza el trazado ortogonal prolongando la barra de una
 * fratría hasta el eje parental. Es una buena solución mientras esa
 * prolongación discurra por espacio libre. En pedigrees densos puede,
 * sin embargo, atravesar el intervalo REAL ocupado por los hijos de otra
 * familia y hacer visualmente ambigua (o aparentemente rota) esa fratría.
 *
 * Regla 0.7.42: una prolongación horizontal nunca invade el núcleo de
 * otra fratría de la misma generación. Si para llegar al eje parental
 * tendría que hacerlo, esa relación recupera localmente la diagonal.
 * La diagonal pasa así a ser el último recurso, pero antes que alterar la
 * lectura de una filiación ya establecida.
 */
let parentageDiagonalFallback = new Set();

function parentageExtensionInterval(entry) {
  if (!entry) return null;
  if (entry.px < entry.minX) {
    return {min:entry.px,max:entry.minX};
  }
  if (entry.px > entry.maxX) {
    return {min:entry.maxX,max:entry.px};
  }
  return null;
}

function extensionInvadesSiblingCore(entry,other) {
  if (!entry || !other || entry===other) return false;
  if (Math.abs(entry.cy-other.cy) > 1) return false;
  if (sameSet(entry.parentUids || [],other.parentUids || [])) return false;

  const ext = parentageExtensionInterval(entry);
  if (!ext) return false;

  // Margen pequeño: tocar el extremo de otra barra no cuenta como invasión.
  const margin = 4;
  return Math.min(ext.max,other.maxX-margin) >
         Math.max(ext.min,other.minX+margin);
}

function computeParentageDiagonalFallback(entries) {
  const fallback = new Set();

  entries.forEach(entry => {
    if (!parentageExtensionInterval(entry)) return;
    if (entries.some(other => extensionInvadesSiblingCore(entry,other))) {
      fallback.add(entry.relation);
    }
  });

  return fallback;
}

function parentageIntervalsOverlap(a,b) {
  if (!a || !b) return false;

  // Solo comparamos fratrías que desembocan en la misma generación.
  if (Math.abs(a.cy-b.cy) > 1) return false;

  /*
   * 0.7.41 — desde 0.7.40 una barra de fratría puede prolongarse hasta
   * el eje parental para evitar una diagonal. El detector de carriles
   * seguía comparando únicamente el intervalo ocupado por los hijos
   * (minX..maxX), por lo que dos barras prolongadas podían terminar
   * superpuestas aunque sus descendientes no lo estuvieran.
   *
   * Para decidir si dos fratrías necesitan carriles verticales distintos
   * usamos ahora exactamente el intervalo horizontal que drawParentage()
   * terminará dibujando: hijos + eje parental.
   */
  const aDiagonal = parentageDiagonalFallback.has(a.relation);
  const bDiagonal = parentageDiagonalFallback.has(b.relation);
  const aMin = aDiagonal ? a.minX : Math.min(a.minX,a.px);
  const aMax = aDiagonal ? a.maxX : Math.max(a.maxX,a.px);
  const bMin = bDiagonal ? b.minX : Math.min(b.minX,b.px);
  const bMax = bDiagonal ? b.maxX : Math.max(b.maxX,b.px);

  const overlap =
    Math.min(aMax,bMax) -
    Math.max(aMin,bMin);

  return overlap > 4;
}

function parentageLaneMinimumY(
  entry,
  pos
) {
  const textMinimum =
    minimumSiblingBarYBelowParentText(
      entry.parentUids || [],
      pos
    );

  /*
   * Evitamos que una barra quede pegada a la unión/progenitor aunque
   * no haya texto. Para las uniones enrutadas pBottom puede estar
   * bastante arriba, por lo que sigue quedando amplio margen.
   */
  const structuralMinimum =
    entry.pBottom + 24;

  if (textMinimum === null) {
    return structuralMinimum;
  }

  return Math.max(
    structuralMinimum,
    textMinimum
  );
}

function parentageLaneMaximumY(
  entry
) {
  /*
   * Mantenemos la misma reserva vertical que parentageBaseGeometry():
   * al menos 28 px antes de la parte superior de los hijos.
   */
  return entry.cTop - 28;
}

function chooseAbsoluteParentageLanes(
  component,
  pos,
  preferredGap
) {
  if (!component.length) {
    return null;
  }

  /*
   * Igual que antes: los anclajes parentales más a la derecha ocupan
   * los carriles superiores. Esto reduce el número de cruces de tallos
   * en las múltiples uniones.
   */
  const ordered =
    [...component]
      .sort((a,b) =>
        b.px-a.px ||
        family.relationships.indexOf(
          a.relation
        ) -
        family.relationships.indexOf(
          b.relation
        )
      );

  /*
   * Buscamos un gap que realmente quepa entre progenitores e hijos.
   * Partimos de 24 px y, solo si el espacio vertical es insuficiente,
   * reducimos gradualmente hasta un mínimo de 14 px.
   */
  const gaps = [];

  for (
    let gap=preferredGap;
    gap>=14;
    gap-=2
  ) {
    gaps.push(gap);
  }

  for (const gap of gaps) {
    let lowerBound =
      -Infinity;

    let upperBound =
      Infinity;

    ordered.forEach((entry,index) => {
      const minimum =
        parentageLaneMinimumY(
          entry,
          pos
        );

      const maximum =
        parentageLaneMaximumY(
          entry
        );

      /*
       * targetY = origin + index*gap
       */
      lowerBound =
        Math.max(
          lowerBound,
          minimum-index*gap
        );

      upperBound =
        Math.min(
          upperBound,
          maximum-index*gap
        );
    });

    if (
      lowerBound >
      upperBound
    ) {
      continue;
    }

    /*
     * Elegimos el origen más próximo posible a las alturas base que ya
     * había calculado el motor, pero todos los carriles quedan ahora a
     * una distancia ABSOLUTA y conocida.
     */
    const preferredOrigins =
      ordered.map((entry,index) =>
        entry.baseSibY-
        index*gap
      );

    const preferredOrigin =
      preferredOrigins.reduce(
        (sum,value) =>
          sum+value,
        0
      ) /
      preferredOrigins.length;

    const origin =
      Math.max(
        lowerBound,
        Math.min(
          upperBound,
          preferredOrigin
        )
      );

    return {
      ordered,
      gap,
      targetYs:
        ordered.map(
          (_,index) =>
            origin+index*gap
        )
    };
  }

  return null;
}

function buildParentageLaneMap(pos) {
  const entries = family.relationships
    .filter(r =>
      r.type === "parentage"
    )
    .map(r =>
      parentageBaseGeometry(
        r,
        pos
      )
    )
    .filter(Boolean);

  /*
   * 0.7.44 — el fallback semántico debe decidirse AQUÍ, cuando ya
   * disponemos de la geometría definitiva de todas las filiaciones.
   * En 0.7.42 este cálculo quedó accidentalmente en una rutina simbólica
   * del layout y, por tanto, no se ejecutaba durante el render normal.
   * Resultado: la protección existía en drawParentage(), pero el Set
   * permanecía vacío y las barras seguían prolongándose sobre fratrías
   * vecinas.
   */
  parentageDiagonalFallback =
    computeParentageDiagonalFallback(entries);

  const adjacency =
    new Map(
      entries.map(entry => [
        entry,
        new Set()
      ])
    );

  for (
    let i=0;
    i<entries.length;
    i++
  ) {
    for (
      let j=i+1;
      j<entries.length;
      j++
    ) {
      const a =
        entries[i];

      const b =
        entries[j];

      if (
        !parentageIntervalsOverlap(
          a,
          b
        )
      ) {
        continue;
      }

      /*
       * Dos relaciones de filiación de la misma pareja siguen siendo
       * una misma unidad familiar a efectos de carril.
       */
      if (
        sameSet(
          a.parentUids || [],
          b.parentUids || []
        )
      ) {
        continue;
      }

      adjacency.get(a).add(b);
      adjacency.get(b).add(a);
    }
  }

  const laneMap =
    new Map();

  const visited =
    new Set();

  const preferredLaneGap = 24;

  entries.forEach(start => {
    if (
      visited.has(start)
    ) {
      return;
    }

    const component = [];
    const stack = [start];

    while (stack.length) {
      const current =
        stack.pop();

      if (
        visited.has(current)
      ) {
        continue;
      }

      visited.add(current);
      component.push(current);

      adjacency
        .get(current)
        .forEach(next => {
          if (
            !visited.has(next)
          ) {
            stack.push(next);
          }
        });
    }

    if (
      component.length === 1
    ) {
      laneMap.set(
        component[0].relation,
        0
      );
      return;
    }

    const lanes =
      chooseAbsoluteParentageLanes(
        component,
        pos,
        preferredLaneGap
      );

    if (lanes) {
      lanes.ordered
        .forEach((entry,index) => {
          /*
           * drawParentage() sigue esperando un offset, pero ahora ese
           * offset se obtiene a partir de un targetY absoluto.
           */
          laneMap.set(
            entry.relation,
            lanes.targetYs[index]-
              entry.baseSibY
          );
        });

      return;
    }

    /*
     * Fallback conservador para un caso sin espacio vertical suficiente.
     * Mantenemos el comportamiento antiguo, pero con 18 px.
     */
    component.sort((a,b) =>
      b.px-a.px ||
      family.relationships.indexOf(
        a.relation
      ) -
      family.relationships.indexOf(
        b.relation
      )
    );

    const fallbackGap = 18;

    component.forEach((entry,index) => {
      const centered =
        index-
        (component.length-1)/2;

      laneMap.set(
        entry.relation,
        centered*fallbackGap
      );
    });
  });

  return laneMap;
}

function drawParentage(svg,r,pos,laneOffset=0,collector=null,pregnancyLossVisualY=null) {
  const g = parentageBaseGeometry(r,pos);
  if (!g) return;

  const sibY = g.baseSibY + laneOffset;

  const junctionX =
    Number.isFinite(
      g.childJunctionX
    )
      ? g.childJunctionX
      : g.px;

  const parentAligned =
    Math.abs(
      g.px-junctionX
    ) < 0.75;

  /*
   * T23 ya ha intentado antes resolver físicamente esta desalineación:
   * mover la pareja cuando es seguro y, en su defecto, mover una fratría
   * terminal/libre.
   *
   * Por tanto:
   * - si el posicionamiento ha podido resolverlo, la línea es vertical;
   * - solo la diferencia que siga siendo estructuralmente inevitable se
   *   representa mediante una diagonal al centro real de la fratría.
   */
  /*
   * 0.7.40 — la diagonal parental deja de ser el fallback normal.
   *
   * Si el layout no ha podido centrar físicamente progenitores y
   * descendencia, prolongamos la barra horizontal de la fratría hasta el
   * eje parental. Así la caída desde la pareja sigue siendo vertical y el
   * desplazamiento lateral se absorbe con una horizontal más larga.
   *
   * En pedigrees amplios esto es deliberadamente preferible a llenar el
   * dibujo de diagonales. Las diagonales quedan reservadas para geometrías
   * que realmente las necesitan (p. ej. adopciones/ramas especiales).
   */
  const useDiagonalFallback =
    !parentAligned &&
    parentageDiagonalFallback.has(r);

  const routedMinX = (parentAligned || useDiagonalFallback)
    ? g.minX
    : Math.min(g.minX,g.px);
  const routedMaxX = (parentAligned || useDiagonalFallback)
    ? g.maxX
    : Math.max(g.maxX,g.px);

  svg.appendChild(svgEl("line", {
    x1:g.px,
    y1:g.pBottom,
    x2:useDiagonalFallback ? junctionX : g.px,
    y2:sibY,
    class:g.lineClass
  }));

  if (Math.abs(routedMaxX-routedMinX) > 0.5) {
    svg.appendChild(svgEl("line", {
      x1:routedMinX,
      y1:sibY,
      x2:routedMaxX,
      y2:sibY,
      class:g.lineClass
    }));
  }

  const verticals = useDiagonalFallback ? [] : [{
    x:g.px,
    y1:g.pBottom,
    y2:sibY,
    lineClass:g.lineClass,
    kind:"parent"
  }];

  g.childUids.forEach(uid => {
    if (g.twinMembers.has(uid)) return;

    const c = pos.get(uid);
    let geometry =
      g.childDescentGeometry.get(uid) || {
        branchX:c.x,
        targetX:c.x,
        targetY:g.cTop,
        diagonal:false
      };

    // SAB/TOP: el vértice del triángulo queda muy cerca de la barra
    // de fratría, con una caída vertical corta independiente del nivel
    // normal de la generación.
    if (
      pregnancyLossVisualY &&
      pregnancyLossVisualY.has(uid)
    ) {
      const lossCenterY = pregnancyLossVisualY.get(uid);

      geometry = {
        branchX:c.x,
        targetX:c.x,
        targetY:
          lossCenterY -
          pregnancyLossTriangleHalfHeight(),
        diagonal:false
      };
    }

    if (geometry.diagonal) {
      // Filiación biológica hacia un individuo adoptado con ambas
      // familias representadas: trazado independiente, continuo y
      // diagonal. Termina en un lateral superior de los corchetes/símbolo.
      svg.appendChild(svgEl("line", {
        x1:geometry.branchX,
        y1:sibY,
        x2:geometry.targetX,
        y2:geometry.targetY,
        class:g.lineClass
      }));

      return;
    }

    svg.appendChild(svgEl("line", {
      x1:geometry.branchX,
      y1:sibY,
      x2:geometry.targetX,
      y2:geometry.targetY,
      class:g.lineClass
    }));

    verticals.push({
      x:geometry.branchX,
      y1:sibY,
      y2:geometry.targetY,
      lineClass:g.lineClass,
      kind:"child"
    });
  });

  g.twins.forEach(t => {
    drawMultipleBirthBranch(
      svg,
      t,
      sibY,
      g.cTop,
      pos
    );
  });

  if (collector) {
    collector.push({
      relation:r,
      lineClass:g.lineClass,
      sibY,
      minX:routedMinX,
      maxX:routedMaxX,
      verticals,
      parentDescent:{
        x1:g.px,
        y1:g.pBottom,
        x2:g.px,
        y2:sibY,
        diagonal:false
      }
    });
  }
}

function segmentContainsY(segment,y) {
  const minY=Math.min(segment.y1,segment.y2);
  const maxY=Math.max(segment.y1,segment.y2);

  return y>minY+2 && y<maxY-2;
}

function horizontalContainsX(horizontal,x) {
  return (
    x>horizontal.minX+3 &&
    x<horizontal.maxX-3
  );
}

function drawParentageCrossingBridges(svg,geometries) {
  const crossings=[];
  const seen=new Set();

  for (let i=0;i<geometries.length;i++) {
    for (let j=i+1;j<geometries.length;j++) {
      const a=geometries[i];
      const b=geometries[j];

      if (sameSet(
        a.relation.parents || [],
        b.relation.parents || []
      )) {
        continue;
      }

      const pairs=[
        [a,b],
        [b,a]
      ];

      pairs.forEach(([verticalOwner,horizontalOwner])=>{
        verticalOwner.verticals.forEach(v=>{
          if (
            horizontalContainsX(horizontalOwner,v.x) &&
            segmentContainsY(v,horizontalOwner.sibY)
          ) {
            const key=
              `${Math.round(v.x)}|${Math.round(horizontalOwner.sibY)}|${v.lineClass}`;

            if (seen.has(key)) return;
            seen.add(key);

            crossings.push({
              x:v.x,
              y:horizontalOwner.sibY,
              verticalLineClass:v.lineClass,
              horizontalLineClass:horizontalOwner.lineClass
            });
          }
        });
      });
    }
  }

  crossings.forEach(crossing=>{
    // 0.8.16 — cruce inequívoco entre fratrías.
    // Abrimos un pequeño hueco y dibujamos un "puente" semicircular
    // en la barra horizontal. Así queda claro que las líneas se cruzan
    // pero NO existe un nodo de parentesco en la intersección.
    const radius = 6;

    svg.appendChild(svgEl("rect", {
      x:crossing.x-radius-1,
      y:crossing.y-5,
      width:(radius+1)*2,
      height:10,
      class:"pedigree-crossing-gap"
    }));

    // La vertical continúa por debajo del puente.
    svg.appendChild(svgEl("line", {
      x1:crossing.x,
      y1:crossing.y-7,
      x2:crossing.x,
      y2:crossing.y+7,
      class:crossing.verticalLineClass
    }));

    // Pequeño salto de la fratría horizontal sobre la línea vertical.
    svg.appendChild(svgEl("path", {
      d:`M ${crossing.x-radius} ${crossing.y} Q ${crossing.x} ${crossing.y-8} ${crossing.x+radius} ${crossing.y}`,
      fill:"none",
      class:`${crossing.horizontalLineClass} pedigree-crossing-bridge`
    }));
  });
}


function routedUnionSegments(r,pos) {
  const route = unionRouteGeometry(r,pos);
  if (!route || !route.routed || !Array.isArray(route.points)) {
    return {horizontals:[], verticals:[]};
  }

  const lineClass =
    r.consanguineous
      ? "consanguinity-line"
      : "relationship-route-line";

  const horizontals=[];
  const verticals=[];

  for (let i=0;i<route.points.length-1;i++) {
    const a=route.points[i];
    const b=route.points[i+1];

    if (
      !Array.isArray(a) ||
      !Array.isArray(b) ||
      a.length<2 ||
      b.length<2
    ) {
      continue;
    }

    const [x1,y1]=a;
    const [x2,y2]=b;

    if (Math.abs(y1-y2)<0.5 && Math.abs(x1-x2)>0.5) {
      horizontals.push({
        minX:Math.min(x1,x2),
        maxX:Math.max(x1,x2),
        y:y1,
        lineClass,
        relation:r
      });
    } else if (
      Math.abs(x1-x2)<0.5 &&
      Math.abs(y1-y2)>0.5
    ) {
      verticals.push({
        x:x1,
        y1,
        y2,
        lineClass,
        relation:r
      });
    }
  }

  return {horizontals,verticals};
}

function pointStrictlyInsideHorizontal(h,x) {
  return x>h.minX+4 && x<h.maxX-4;
}

function pointStrictlyInsideVertical(v,y) {
  const minY=Math.min(v.y1,v.y2);
  const maxY=Math.max(v.y1,v.y2);
  return y>minY+4 && y<maxY-4;
}

function appendCrossingBridge(
  svg,
  x,
  y,
  horizontalLineClass,
  verticalLineClass
) {
  const radius=6;

  // Enmascaramos exclusivamente una pequeña zona alrededor del cruce.
  // Después restauramos la vertical y dibujamos un pequeño arco en la
  // horizontal, convención visual de "pasa por encima / no conecta".
  svg.appendChild(svgEl("rect",{
    x:x-radius-1,
    y:y-5,
    width:(radius+1)*2,
    height:10,
    class:"pedigree-crossing-gap"
  }));

  svg.appendChild(svgEl("line",{
    x1:x,
    y1:y-7,
    x2:x,
    y2:y+7,
    class:verticalLineClass
  }));

  svg.appendChild(svgEl("path",{
    d:`M ${x-radius} ${y} Q ${x} ${y-8} ${x+radius} ${y}`,
    fill:"none",
    class:`${horizontalLineClass} pedigree-crossing-bridge`
  }));
}

function drawRoutedUnionCrossingBridges(svg,pos,parentageGeometries) {
  const routed = family.relationships
    .filter(r=>r.type==="union")
    .map(r=>({
      relation:r,
      ...routedUnionSegments(r,pos)
    }))
    .filter(item =>
      item.horizontals.length ||
      item.verticals.length
    );

  if (!routed.length || !parentageGeometries.length) return;

  const seen=new Set();

  routed.forEach(routeGeom=>{
    // Caso que faltaba en 0.8.13:
    // una unión enrutada horizontalmente (p. ej. pareja entre dos fratrías)
    // atraviesa una caída vertical de otra fratría/filiación.
    routeGeom.horizontals.forEach(h=>{
      parentageGeometries.forEach(pg=>{
        pg.verticals.forEach(v=>{
          if (
            pointStrictlyInsideHorizontal(h,v.x) &&
            pointStrictlyInsideVertical(v,h.y)
          ) {
            const key=
              `${Math.round(v.x)}|${Math.round(h.y)}|route-h`;

            if (seen.has(key)) return;
            seen.add(key);

            appendCrossingBridge(
              svg,
              v.x,
              h.y,
              h.lineClass,
              v.lineClass
            );
          }
        });
      });
    });

    // Caso simétrico:
    // una pata vertical de una unión enrutada atraviesa la barra horizontal
    // de una fratría. El puente se dibuja siempre sobre la horizontal.
    routeGeom.verticals.forEach(v=>{
      parentageGeometries.forEach(pg=>{
        if (
          pointStrictlyInsideHorizontal(
            {minX:pg.minX,maxX:pg.maxX},
            v.x
          ) &&
          pointStrictlyInsideVertical(v,pg.sibY)
        ) {
          const key=
            `${Math.round(v.x)}|${Math.round(pg.sibY)}|route-v`;

          if (seen.has(key)) return;
          seen.add(key);

          appendCrossingBridge(
            svg,
            v.x,
            pg.sibY,
            pg.lineClass,
            v.lineClass
          );
        }
      });
    });
  });
}


/*
 * 0.8.16 — detector geométrico general de cruces.
 * Analiza los segmentos SVG estructurales realmente dibujados, de modo que
 * también cubre donantes, gestantes, adopciones y trazados diagonales.
 */
function structuralLineClass(node) {
  const classes=String(node.getAttribute("class")||"")
    .split(/\s+/).filter(Boolean);
  const allowed=[
    "pedigree-line",
    "adoptive-line",
    "donor-link-line",
    "relationship-route-line",
    "consanguinity-line"
  ];
  return allowed.find(name=>classes.includes(name)) || null;
}

function structuralSegmentsFromSvg(svg) {
  const segments=[];
  let sourceIndex=0;

  svg.querySelectorAll("line, polyline").forEach(node=>{
    const lineClass=structuralLineClass(node);
    if (!lineClass) return;
    if (
      node.classList.contains("pedigree-crossing-bridge") ||
      node.classList.contains("pedigree-crossing-redraw")
    ) return;

    const sourceId=sourceIndex++;
    const tag=node.tagName.toLowerCase();

    if (tag==="line") {
      const x1=Number(node.getAttribute("x1"));
      const y1=Number(node.getAttribute("y1"));
      const x2=Number(node.getAttribute("x2"));
      const y2=Number(node.getAttribute("y2"));
      if ([x1,y1,x2,y2].every(Number.isFinite) && Math.hypot(x2-x1,y2-y1)>0.5) {
        segments.push({x1,y1,x2,y2,lineClass,sourceId});
      }
      return;
    }

    const nums=String(node.getAttribute("points")||"")
      .replace(/,/g," ").trim().split(/\s+/)
      .map(Number).filter(Number.isFinite);

    for (let i=0;i+3<nums.length;i+=2) {
      const x1=nums[i], y1=nums[i+1], x2=nums[i+2], y2=nums[i+3];
      if (Math.hypot(x2-x1,y2-y1)>0.5) {
        segments.push({x1,y1,x2,y2,lineClass,sourceId});
      }
    }
  });

  return segments;
}

function segmentInteriorIntersection(a,b) {
  const r={x:a.x2-a.x1,y:a.y2-a.y1};
  const q={x:b.x1,y:b.y1};
  const p={x:a.x1,y:a.y1};
  const sv={x:b.x2-b.x1,y:b.y2-b.y1};
  const cross=(u,v)=>u.x*v.y-u.y*v.x;
  const denom=cross(r,sv);
  if (Math.abs(denom)<1e-7) return null;

  const qp={x:q.x-p.x,y:q.y-p.y};
  const t=cross(qp,sv)/denom;
  const u=cross(qp,r)/denom;
  if (t<=0 || t>=1 || u<=0 || u>=1) return null;

  const lenA=Math.hypot(r.x,r.y);
  const lenB=Math.hypot(sv.x,sv.y);
  const endpointMargin=7;
  if (
    t*lenA<endpointMargin || (1-t)*lenA<endpointMargin ||
    u*lenB<endpointMargin || (1-u)*lenB<endpointMargin
  ) return null;

  return {x:p.x+t*r.x,y:p.y+t*r.y};
}

function segmentHorizontalness(seg) {
  const dx=Math.abs(seg.x2-seg.x1);
  const dy=Math.abs(seg.y2-seg.y1);
  return dx/(dx+dy+1e-9);
}

function crossingOverUnder(a,b) {
  const ha=segmentHorizontalness(a);
  const hb=segmentHorizontalness(b);
  if (Math.abs(ha-hb)>0.08) {
    return ha>hb ? {over:a,under:b} : {over:b,under:a};
  }
  return a.sourceId>b.sourceId ? {over:a,under:b} : {over:b,under:a};
}

function appendRotatedCrossingBridge(svg,intersection,over,under) {
  const radius=6;
  const maskRadius=7.4;
  const unit=seg=>{
    const dx=seg.x2-seg.x1, dy=seg.y2-seg.y1;
    const len=Math.hypot(dx,dy)||1;
    return {x:dx/len,y:dy/len};
  };
  const ou=unit(over);
  const uu=unit(under);

  svg.appendChild(svgEl("circle",{
    cx:intersection.x,cy:intersection.y,r:maskRadius,
    class:"pedigree-crossing-gap"
  }));

  svg.appendChild(svgEl("line",{
    x1:intersection.x-uu.x*(radius+2),
    y1:intersection.y-uu.y*(radius+2),
    x2:intersection.x+uu.x*(radius+2),
    y2:intersection.y+uu.y*(radius+2),
    class:`${under.lineClass} pedigree-crossing-redraw`
  }));

  const p1={x:intersection.x-ou.x*radius,y:intersection.y-ou.y*radius};
  const p2={x:intersection.x+ou.x*radius,y:intersection.y+ou.y*radius};
  let normal={x:-ou.y,y:ou.x};
  if (normal.y>0) normal={x:-normal.x,y:-normal.y};
  const control={x:intersection.x+normal.x*8,y:intersection.y+normal.y*8};

  svg.appendChild(svgEl("path",{
    d:`M ${p1.x} ${p1.y} Q ${control.x} ${control.y} ${p2.x} ${p2.y}`,
    fill:"none",
    class:`${over.lineClass} pedigree-crossing-bridge`
  }));
}

function drawAllStructuralCrossingBridges(svg) {
  const segments=structuralSegmentsFromSvg(svg);
  const crossings=[];

  for (let i=0;i<segments.length;i++) {
    for (let j=i+1;j<segments.length;j++) {
      const a=segments[i], b=segments[j];
      if (a.sourceId===b.sourceId) continue;
      const intersection=segmentInteriorIntersection(a,b);
      if (!intersection) continue;
      if (crossings.some(c=>Math.hypot(c.x-intersection.x,c.y-intersection.y)<4.5)) continue;
      const {over,under}=crossingOverUnder(a,b);
      crossings.push({x:intersection.x,y:intersection.y,over,under});
    }
  }

  crossings.forEach(c=>appendRotatedCrossingBridge(
    svg,{x:c.x,y:c.y},c.over,c.under
  ));
}

function escapeHtml(value) {
  return String(value||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function inheritanceOptions(selected) {
  return Object.entries(INHERITANCE_LABELS).map(([v])=>`<option value="${v}" data-i18n="condition.inheritance.${v}" ${v===selected?"selected":""}>${escapeHtml(t("condition.inheritance."+v))}</option>`).join("");
}
function conditionColorOptions(selected) {
  const normalized =
    normalizeConditionColor(
      selected,
      0
    );

  return CONDITION_COLORS
    .map(item =>
      `<option value="${item.value}" data-i18n-color="${item.i18nKey}" ${item.value===normalized?"selected":""}>` +
      t("legend.solidFill",{label:t(item.i18nKey)}) +
      `</option>`
    )
    .join("");
}

function refreshConditionColorOptionLabels(){
  document.querySelectorAll('.condition-color option[data-i18n-color]').forEach(option=>{
    const key=option.getAttribute('data-i18n-color');
    option.textContent=t('legend.solidFill',{label:t(key)});
  });
}

function carrierTextureOptions(selected) {
  const normalized =
    normalizeCarrierPattern(
      selected
    );

  return CARRIER_TEXTURES
    .map(item =>
      `<option value="${item.value}" data-i18n="${item.i18nKey}" ${item.value===normalized?"selected":""}>${escapeHtml(t(item.i18nKey))}</option>`
    )
    .join("");
}


function updateConditionPatternPreviews(row) {
  if (!row) return;

  const colorSelect =
    row.querySelector(
      ".condition-color"
    );

  const textureSelect =
    row.querySelector(
      ".condition-carrier-texture"
    );

  if (!colorSelect) return;

  const color =
    normalizeConditionColor(
      colorSelect.value,
      0
    );

  const texture =
    normalizeCarrierPattern(
      textureSelect
        ? textureSelect.value
        : "crosshatch"
    );

  row.querySelectorAll(
    ".condition-pattern-preview"
  )
    .forEach(node => {
      node.style.setProperty(
        "--condition-color",
        color
      );
    });

  const carrier =
    row.querySelector(
      ".condition-pattern-preview.carrier"
    );

  if (carrier) {
    CARRIER_TEXTURES
      .forEach(item => {
        carrier.classList.remove(
          `pattern-${item.value}`
        );
      });

    carrier.classList.add(
      `pattern-${texture}`
    );
  }
}

function renderConditionsManager() {
  const list=$("conditionsList"), empty=$("conditionsEmpty");
  if(!list||!empty) return;

  list.replaceChildren();
  empty.hidden=(family.conditions||[]).length>0;

  (family.conditions||[]).forEach(c=>{
    const row=document.createElement("div");
    row.className="condition-row";
    row.dataset.conditionId=c.id;

    const color = conditionColor(c);

    row.innerHTML=`
      <div class="field"><label data-i18n="condition.editor.name">${t("condition.editor.name")}</label><input class="condition-name" type="text" value="${escapeHtml(c.name)}" data-i18n-placeholder="condition.editor.namePlaceholder" placeholder="${t("condition.editor.namePlaceholder")}"></div>
      <div class="field"><label data-i18n="condition.editor.gene">${t("condition.editor.gene")}</label><input class="condition-gene" type="text" value="${escapeHtml(c.gene)}" placeholder="CFTR"></div>
      <div class="field"><label data-i18n="condition.editor.inheritance">${t("condition.editor.inheritance")}</label><select class="condition-inheritance">${inheritanceOptions(c.inheritance)}</select></div>

      <div class="field condition-pattern-field">
        <label data-i18n="condition.editor.affectedPattern">${t("condition.editor.affectedPattern")}</label>
        <div class="condition-pattern-editor">
          <span class="condition-pattern-preview affected" style="--condition-color:${color}" aria-hidden="true"></span>
          <select class="condition-color">${conditionColorOptions(color)}</select>
        </div>
      </div>

      <div class="field condition-pattern-field">
        <label data-i18n="condition.editor.carrierPattern">${t("condition.editor.carrierPattern")}</label>
        <div class="condition-pattern-editor">
          <span class="condition-pattern-preview carrier pattern-${normalizeCarrierPattern(c.carrier_pattern)}" style="--condition-color:${color}" aria-hidden="true"></span>
          <select class="condition-carrier-texture">${carrierTextureOptions(c.carrier_pattern)}</select>
        </div>
      </div>

      <div class="condition-row-actions"><button type="button" class="save-condition-btn" data-i18n="condition.editor.save">${t("condition.editor.save")}</button><button type="button" class="danger delete-condition-btn" data-i18n="condition.editor.delete">${t("condition.editor.delete")}</button></div>`;

    row.querySelector(".condition-color")
      .addEventListener(
        "change",
        () => updateConditionPatternPreviews(row)
      );

    row.querySelector(".condition-carrier-texture")
      .addEventListener(
        "change",
        () => updateConditionPatternPreviews(row)
      );

    row.querySelector(".save-condition-btn")
      .addEventListener("click",()=>saveConditionRow(row));

    row.querySelector(".delete-condition-btn")
      .addEventListener("click",()=>deleteCondition(c.id));

    list.appendChild(row);
  });

  renderClinicalLegend();
  renderPersonConditionAssignments();
}

function addCondition() {
  pushUndoState();

  const i=(family.conditions||[]).length;

  family.conditions.push({
    id:nextConditionId(),
    name:"",
    gene:"",
    inheritance:"unknown",
    color:CONDITION_COLORS[
      i % CONDITION_COLORS.length
    ].value,
    affected_pattern:"solid",
    carrier_pattern:"crosshatch"
  });

  renderConditionsManager();
  scheduleLivePedigreeQc();

  const rows=$("conditionsList")
    .querySelectorAll(".condition-row");

  if(rows.length) {
    rows[rows.length-1]
      .querySelector(".condition-name")
      .focus();
  }
}

function saveConditionRow(row) {
  const c=conditionById(row.dataset.conditionId);
  if(!c) return;

  const next={
    ...c,
    name:row.querySelector(".condition-name").value.trim(),
    gene:row.querySelector(".condition-gene").value.trim(),
    inheritance:row.querySelector(".condition-inheritance").value,
    color:normalizeConditionColor(
      row.querySelector(".condition-color").value,
      (family.conditions||[]).findIndex(x=>x.id===c.id)
    ),
    affected_pattern:"solid",
    carrier_pattern:normalizeCarrierPattern(
      row.querySelector(
        ".condition-carrier-texture"
      ).value
    )
  };

  if(!next.name){
    message(t("validation.condition.nameRequired"),"error");
    return;
  }

  if(JSON.stringify(c)===JSON.stringify(next)){
    message(t("message.condition.unchanged"));
    return;
  }

  pushUndoState();
  Object.assign(c,next);
  renderPedigree();
  message(t("condition.message.updated"),"success");
}

function deleteCondition(id) {
  const c=conditionById(id); if(!c) return; if(!confirm(t("condition.confirmDelete",{name:c.name||c.id}))) return;
  pushUndoState(); family.conditions=family.conditions.filter(x=>x.id!==id);
  family.people.forEach(p=>p.condition_states=(p.condition_states||[]).filter(s=>s.condition_id!==id));
  renderPedigree(); message(t("condition.message.deleted"),"success");
}


function personSexForInheritance(p) {
  if (p.sex_at_birth === "male") return "male";
  if (p.sex_at_birth === "female") return "female";
  return "unknown";
}

function validateConditionState(p, condition, state) {
  const warnings = [];
  const inheritance = condition.inheritance;
  const sex = personSexForInheritance(p);

  if (state.status === "carrier") {
    if (inheritance === "autosomal_dominant") {
      warnings.push(
        t("validation.condition.dominantCarrier")
      );
    }

    if (inheritance === "x_linked_dominant") {
      warnings.push(
        t("validation.condition.xDominantCarrier")
      );
    }

    if (inheritance === "mitochondrial") {
      warnings.push(
        t("validation.condition.mitochondrialCarrier")
      );
    }

    if (inheritance === "x_linked_recessive" && sex === "male") {
      warnings.push(
        t("validation.condition.xRecessiveMale")
      );
    }
  }

  if (
    inheritance === "autosomal_recessive" &&
    state.status === "carrier" &&
    state.zygosity &&
    !["heterozygous", "other"].includes(state.zygosity)
  ) {
    warnings.push(
      t("validation.condition.recessiveZygosity")
    );
  }

  if (
    inheritance === "x_linked_recessive" &&
    sex === "male" &&
    state.molecular_result === "positive" &&
    state.zygosity &&
    state.zygosity !== "hemizygous" &&
    state.zygosity !== "other"
  ) {
    warnings.push(
      t("validation.condition.xMaleZygosity")
    );
  }

  if (
    inheritance === "mitochondrial" &&
    state.molecular_result === "positive" &&
    state.zygosity &&
    !["heteroplasmy", "homoplasmy", "other"].includes(state.zygosity)
  ) {
    warnings.push(
      t("validation.condition.mitochondrialZygosity")
    );
  }

  if (
    state.molecular_result === "negative" &&
    ["carrier", "presymptomatic"].includes(state.status)
  ) {
    warnings.push(
      t("validation.condition.molecularConflict")
    );
  }

  if (
    state.molecular_result === "positive" &&
    !state.variant.trim()
  ) {
    warnings.push(
      "El resultado molecular es positivo, pero no se ha especificado la variante."
    );
  }

  if (
    state.molecular_result === "negative" &&
    state.variant.trim()
  ) {
    warnings.push(
      t("validation.condition.variantConflict")
    );
  }

  return warnings;
}

function updateConditionRowValidation(row, p, condition) {
  const state = {
    status: row.querySelector(".person-condition-status").value,
    molecular_result: row.querySelector(".person-condition-molecular").value,
    variant: row.querySelector(".person-condition-variant").value.trim(),
    zygosity: row.querySelector(".person-condition-zygosity").value,
    genotype: row.querySelector(".person-condition-genotype").value.trim()
  };

  const warnings = validateConditionState(p, condition, state);
  const box = row.querySelector(".condition-validation");

  if (!warnings.length) {
    box.classList.remove("visible");
    box.textContent = "";
    return;
  }

  box.classList.add("visible");
  box.innerHTML =
    "<strong>Revisar:</strong> " +
    warnings.map(escapeHtml).join(" ");
}

function renderPersonConditionAssignments() {
  const container = $("personConditionAssignments");
  const empty = $("personConditionAssignmentsEmpty");

  if (!container || !empty) return;

  container.replaceChildren();

  const p = selectedPerson();
  const conditions = family.conditions || [];

  if (
    !p ||
    !supportsPedigreeConditions(p) ||
    !conditions.length
  ) {
    empty.hidden = false;

    if (!p) {
      empty.textContent =
        t("validation.person.selectInTree");
    } else if (
      !supportsPedigreeConditions(p)
    ) {
      empty.textContent =
        t("validation.record.noConditionState");
    } else {
      empty.textContent =
        "Define primero una condición del pedigree.";
    }

    return;
  }

  empty.hidden = true;

  conditions.forEach(condition => {
    const state = conditionStateForPerson(p, condition.id);
    const row = document.createElement("div");
    row.className = "person-condition-row";
    row.dataset.conditionId = condition.id;

    const nameBox = document.createElement("div");
    nameBox.innerHTML = `
      <div class="person-condition-name">${escapeHtml(condition.name || condition.id)}</div>
      <div class="person-condition-meta">
        ${condition.gene ? escapeHtml(condition.gene) : `<span data-i18n="clinical.field.noGene">${t("clinical.field.noGene")}</span>`} ·
        <span data-i18n="condition.inheritance.${escapeHtml(condition.inheritance)}">${escapeHtml(INHERITANCE_LABELS[condition.inheritance] || condition.inheritance)}</span>
      </div>
    `;

    const statusField = document.createElement("div");
    statusField.className = "field";
    const statusLabel = document.createElement("label");
    statusLabel.setAttribute("data-i18n", "clinical.field.status");
    statusLabel.textContent = t("clinical.field.status");
    const statusSelect = document.createElement("select");
    statusSelect.className = "person-condition-status";

    Object.entries(CONDITION_STATUS_LABELS).forEach(([value,label]) => {
      const option = new Option(label, value);
      option.setAttribute("data-i18n", "condition.status." + (value || "unspecified"));
      if (value === state.status) option.selected = true;
      statusSelect.appendChild(option);
    });
    statusField.append(statusLabel, statusSelect);

    const molecularField = document.createElement("div");
    molecularField.className = "field";
    const molecularLabel = document.createElement("label");
    molecularLabel.setAttribute("data-i18n", "clinical.field.molecular");
    molecularLabel.textContent = t("clinical.field.molecular");
    const molecularSelect = document.createElement("select");
    molecularSelect.className = "person-condition-molecular";

    Object.entries(MOLECULAR_RESULT_LABELS).forEach(([value,label]) => {
      const option = new Option(label, value);
      option.setAttribute("data-i18n", "condition.molecular." + (value || "unspecified"));
      if (value === state.molecular_result) option.selected = true;
      molecularSelect.appendChild(option);
    });
    molecularField.append(molecularLabel, molecularSelect);

    const details = document.createElement("div");
    details.className = "person-condition-details";

    const variantField = document.createElement("div");
    variantField.className = "field";
    const variantLabel = document.createElement("label");
    variantLabel.setAttribute("data-i18n", "clinical.field.variant");
    variantLabel.textContent = t("clinical.field.variant");
    const variantInput = document.createElement("input");
    variantInput.type = "text";
    variantInput.className = "person-condition-variant";
    variantInput.value = state.variant || "";
    variantInput.placeholder = "p. ej. NM_...:c.123A>G";
    variantField.append(variantLabel, variantInput);

    const zygosityField = document.createElement("div");
    zygosityField.className = "field";
    const zygosityLabel = document.createElement("label");
    zygosityLabel.setAttribute("data-i18n", "clinical.field.zygosity");
    zygosityLabel.textContent = t("clinical.field.zygosity");
    const zygositySelect = document.createElement("select");
    zygositySelect.className = "person-condition-zygosity";

    Object.entries(ZYGOSITY_LABELS).forEach(([value,label]) => {
      const option = new Option(label, value);
      option.setAttribute("data-i18n", "condition.zygosity." + (value || "unspecified"));
      if (value === state.zygosity) option.selected = true;
      zygositySelect.appendChild(option);
    });
    zygosityField.append(zygosityLabel, zygositySelect);

    const genotypeField = document.createElement("div");
    genotypeField.className = "field";
    const genotypeLabel = document.createElement("label");
    genotypeLabel.setAttribute("data-i18n", "clinical.field.genotype");
    genotypeLabel.textContent = t("clinical.field.genotype");
    const genotypeInput = document.createElement("input");
    genotypeInput.type = "text";
    genotypeInput.className = "person-condition-genotype";
    genotypeInput.value = state.genotype || "";
    genotypeInput.placeholder = t("clinical.field.genotypePlaceholder");
    genotypeInput.setAttribute("data-i18n-placeholder", "clinical.field.genotypePlaceholder");
    genotypeField.append(genotypeLabel, genotypeInput);

    const documentedField = document.createElement("div");
    documentedField.className =
      "person-condition-documented field";

    const documentedLabel = document.createElement("label");
    documentedLabel.className = "checkbox-row";

    const documentedInput = document.createElement("input");
    documentedInput.type = "checkbox";
    documentedInput.className =
      "person-condition-documented-evaluation";
    documentedInput.checked =
      !!state.documented_evaluation;

    const documentedText = document.createElement("span");
    documentedText.setAttribute("data-i18n", "clinical.field.documented");
    documentedText.textContent = t("clinical.field.documented");

    documentedLabel.append(
      documentedInput,
      documentedText
    );
    documentedField.appendChild(documentedLabel);

    const validation = document.createElement("div");
    validation.className = "condition-validation";

    details.append(variantField, zygosityField, genotypeField);
    row.append(
      nameBox,
      statusField,
      molecularField,
      details,
      documentedField,
      validation
    );
    container.appendChild(row);

    [
      statusSelect,
      molecularSelect,
      variantInput,
      zygositySelect,
      genotypeInput,
      documentedInput
    ].forEach(control => {
      control.addEventListener("input", () => {
        $("notesStatus").textContent = "";
        updateConditionRowValidation(row, p, condition);
      });
      control.addEventListener("change", () => {
        $("notesStatus").textContent = "";
        updateConditionRowValidation(row, p, condition);
      });
    });

    updateConditionRowValidation(row, p, condition);
  });
}

function collectPersonConditionAssignments() {
  const p = selectedPerson();

  if (
    !p ||
    !supportsPedigreeConditions(p)
  ) {
    return [];
  }

  return [...$("personConditionAssignments").querySelectorAll(".person-condition-row")]
    .map(row => ({
      condition_id: row.dataset.conditionId,
      status: row.querySelector(".person-condition-status").value,
      molecular_result: row.querySelector(".person-condition-molecular").value,
      variant: row.querySelector(".person-condition-variant").value.trim(),
      zygosity: row.querySelector(".person-condition-zygosity").value,
      genotype: row.querySelector(".person-condition-genotype").value.trim(),
      documented_evaluation:
        row.querySelector(
          ".person-condition-documented-evaluation"
        ).checked
    }));
}


function setLegendVisibility(id,visible) {
  const node = $(id);
  if (node) node.hidden = !visible;
}

function mainLegendUsage() {
  const actualPeople = family.people.filter(
    p => recordType(p) === "person"
  );

  const symbolPeople = family.people.filter(
    p => ["person","multiple"].includes(recordType(p))
  );

  const hasMale = symbolPeople.some(p => p.gender === "man");
  const hasFemale = symbolPeople.some(p => p.gender === "woman");
  const hasDiverseGender = symbolPeople.some(
    p => !["man","woman"].includes(p.gender)
  );

  const hasMultipleIndividuals = family.people.some(
    p =>
      recordType(p) === "multiple" &&
      normalizedMultipleCount(p) !== "n"
  );

  const hasMultipleIndividualsUnknown = family.people.some(
    p =>
      recordType(p) === "multiple" &&
      normalizedMultipleCount(p) === "n"
  );

  const hasFetus = family.people.some(
    p => recordType(p) === "fetus"
  );

  const hasStillbirth = family.people.some(
    p => recordType(p) === "stillbirth"
  );

  const hasDonor = family.people.some(
    p => isDonorRecord(p) && !isSurrogateOvumDonor(p)
  );

  const hasSurrogate = family.people.some(
    p => isSurrogateOvumDonor(p)
  );

  const hasGestationalCarrier = family.people.some(
    p => isGestationalCarrierRecord(p)
  );

  const hasAffected =
    !(family.conditions || []).length &&
    family.people.some(p => isClinicallyAffected(p));

  const hasDeceased = actualPeople.some(p => !!p.deceased);
  const hasConsultand = actualPeople.some(p => !!p.consultand);
  const hasProband = actualPeople.some(p => !!p.proband);

  const hasSab = family.people.some(
    p => recordType(p) === "sab"
  );
  const hasTop = family.people.some(
    p => recordType(p) === "top"
  );
  const hasEct = family.people.some(
    p => recordType(p) === "ect"
  );

  const hasAdoptedIn = actualPeople.some(
    p => isAdoptedInPerson(p)
  );

  const hasAdoptedOut = actualPeople.some(
    p => isAdoptedOutPerson(p)
  );

  const hasAdopted = hasAdoptedIn || hasAdoptedOut;

  const hasAdoptiveLine = family.relationships.some(
    r =>
      r.type === "parentage" &&
      (r.descent_type || "biological") === "adoptive"
  );

  const hasEndedUnion = family.relationships.some(
    r =>
      r.type === "union" &&
      ["ended","separated","divorced"].includes(
        r.relationship_status || "current"
      )
  );

  const hasComment = family.people.some(
    p => hasPersonNotes(p)
  );

  const hasFamilyHistoryUnknown = actualPeople.some(
    p => !!p.family_history_unknown
  );

  const hasNoChildren =
    family.relationships.some(
      r =>
        r.type === "union" &&
        r.reproductive_status === "no_children"
    ) ||
    actualPeople.some(
      p => p.reproductive_status === "no_children"
    );

  const hasInfertility =
    family.relationships.some(
      r =>
        r.type === "union" &&
        r.reproductive_status === "infertility"
    ) ||
    actualPeople.some(
      p => p.reproductive_status === "infertility"
    );

  const hasTrizygotic = family.relationships.some(
    r =>
      r.type === "twin" &&
      r.zygosity === "trizygotic" &&
      (r.members || []).length === 3
  );

  return {
    hasMale,
    hasFemale,
    hasDiverseGender,
    hasAffected,
    hasDeceased,
    hasConsultand,
    hasProband,
    hasSab,
    hasTop,
    hasEct,
    hasAdopted,
    hasAdoptedIn,
    hasAdoptedOut,
    hasAdoptiveLine,
    hasEndedUnion,
    hasComment,
    hasFamilyHistoryUnknown,
    hasNoChildren,
    hasInfertility,
    hasTrizygotic,
    hasMultipleIndividuals,
    hasMultipleIndividualsUnknown,
    hasFetus,
    hasStillbirth,
    hasDonor,
    hasSurrogate,
    hasGestationalCarrier
  };
}

function renderMainLegend() {
  const used = mainLegendUsage();

  setLegendVisibility("maleLegend", used.hasMale);
  setLegendVisibility("femaleLegend", used.hasFemale);
  setLegendVisibility(
    "diverseGenderLegend",
    used.hasDiverseGender
  );
  setLegendVisibility(
    "genericAffectedLegend",
    used.hasAffected
  );
  setLegendVisibility("deceasedLegend", used.hasDeceased);
  setLegendVisibility(
    "consultandLegend",
    used.hasConsultand
  );
  setLegendVisibility("probandLegend", used.hasProband);
  setLegendVisibility("sabLegend", used.hasSab);
  setLegendVisibility("topLegend", used.hasTop);
  setLegendVisibility("ectLegend", used.hasEct);
  setLegendVisibility("adoptedInLegend", used.hasAdoptedIn);
  setLegendVisibility("adoptedOutLegend", used.hasAdoptedOut);
  setLegendVisibility(
    "adoptiveLineLegend",
    used.hasAdoptiveLine
  );
  setLegendVisibility(
    "endedUnionLegend",
    used.hasEndedUnion
  );
  setLegendVisibility("commentLegend", used.hasComment);
  setLegendVisibility(
    "familyHistoryUnknownLegend",
    used.hasFamilyHistoryUnknown
  );
  setLegendVisibility(
    "noChildrenLegend",
    used.hasNoChildren
  );
  setLegendVisibility(
    "infertilityLegend",
    used.hasInfertility
  );
  setLegendVisibility(
    "trizygoticLegend",
    used.hasTrizygotic
  );
  setLegendVisibility(
    "multipleIndividualsLegend",
    used.hasMultipleIndividuals
  );
  setLegendVisibility(
    "multipleIndividualsUnknownLegend",
    used.hasMultipleIndividualsUnknown
  );
  setLegendVisibility(
    "fetusLegend",
    used.hasFetus
  );
  setLegendVisibility(
    "stillbirthLegend",
    used.hasStillbirth
  );
  setLegendVisibility(
    "donorLegend",
    used.hasDonor
  );
  setLegendVisibility(
    "surrogateLegend",
    used.hasSurrogate
  );
  setLegendVisibility(
    "gestationalCarrierLegend",
    used.hasGestationalCarrier
  );

  const notes = [];

  if (used.hasComment) {
    notes.push(
      t("legend.comment.dot")
    );
  }

  if (used.hasSab || used.hasTop || used.hasEct) {
    notes.push(
      t("legend.pregnancy.affected")
    );
  }

  if (used.hasAdopted || used.hasAdoptiveLine) {
    notes.push(
      t("legend.adoption.brackets")
    );
  }

  if (used.hasEndedUnion) {
    notes.push(
      t("legend.relationship.ended")
    );
  }

  if (used.hasSurrogate) {
    notes.push(
      t("legend.surrogate.egg")
    );
  }

  const note = $("legendDynamicNote");

  if (note) {
    note.textContent = notes.join(" ");
    note.hidden = notes.length === 0;
  }
}

function renderClinicalLegend() {
  const legend = document.querySelector(".legend-card");
  if (!legend) return;

  let block = legend.querySelector("#autoClinicalLegend");

  if (!block) {
    block = document.createElement("div");
    block.id = "autoClinicalLegend";
    block.className = "auto-legend";
    legend.appendChild(block);
  }

  block.replaceChildren();

  const conditions = family.conditions || [];

  // La leyenda general se reconstruye en cada render y solo muestra
  // elementos que están realmente presentes en el SVG actual.
  renderMainLegend();

  if (!conditions.length) return;

  let renderedConditionSections = 0;

  conditions.forEach(condition => {
    const section = document.createElement("div");
    section.className = "auto-legend-condition";

    const heading = document.createElement("div");
    heading.className = "auto-legend-condition-title";

    const gene = condition.gene ? ` · ${condition.gene}` : "";
    const inheritance =
      INHERITANCE_LABELS[condition.inheritance] || condition.inheritance;

    heading.textContent =
      `${condition.name || condition.id}${gene} · ${inheritance}`;

    section.appendChild(heading);

    const statusesUsed = new Set();

    family.people
      .filter(p =>
        supportsPedigreeConditions(p)
      )
      .forEach(p => {
        const state = (p.condition_states || [])
          .find(s => s.condition_id === condition.id);

        if (!state || !state.status) return;

        if (state.status === "affected") {
          statusesUsed.add("affected");
        }

        if (
          state.status === "carrier" &&
          ["autosomal_recessive","x_linked_recessive"]
            .includes(condition.inheritance)
        ) {
          statusesUsed.add("carrier");
        }

        if (state.status === "presymptomatic") {
          statusesUsed.add("presymptomatic");
        }

        if (state.status === "unknown") {
          statusesUsed.add("unknown");
        }
      });

    const statusesToShow = [
      "affected",
      "carrier",
      "presymptomatic",
      "unknown"
    ].filter(status => statusesUsed.has(status));

    // Una condición definida pero todavía no utilizada no añade
    // símbolos ni texto a la leyenda.
    if (!statusesToShow.length) return;

    statusesToShow.forEach(status => {
      const item = document.createElement("div");
      item.className = "auto-legend-status";

      const swatch = document.createElement("span");

      let legendPattern = condition.affected_pattern || "solid";

      if (status === "carrier") {
        legendPattern =
          normalizeCarrierPattern(
            condition.carrier_pattern
          );
      }

      swatch.className =
        `legend-status-swatch ${status} pattern-${legendPattern}`;

      swatch.style.setProperty(
        "--condition-color",
        conditionColor(condition)
      );

      if (status !== "presymptomatic" && status !== "unknown") {
        const fill = document.createElement("span");
        fill.className = "status-fill";
        swatch.appendChild(fill);
      }

      const text = document.createElement("span");

      if (status === "affected") {
        text.textContent =
          t("pdf.status.affected", {name:condition.name || condition.id});
      } else if (status === "carrier") {
        text.textContent =
          t("pdf.status.carrier", {name:condition.name || condition.id});
      } else if (status === "presymptomatic") {
        text.textContent =
          t("pdf.status.presymptomatic", {name:condition.name || condition.id});
      } else {
        text.textContent =
          t("pdf.status.unknown", {name:condition.name || condition.id});
      }

      item.append(swatch, text);
      section.appendChild(item);
    });

    block.appendChild(section);
    renderedConditionSections += 1;
  });

  if (!renderedConditionSections) {
    block.replaceChildren();
    return;
  }

  const title = document.createElement("div");
  title.className = "auto-legend-title";
  title.textContent = t('legend.conditionsRepresented');
  block.insertBefore(title, block.firstChild);

  const help = document.createElement("div");
  help.className = "auto-legend-help";
  help.textContent =
    t('legend.condition.sectors') + ' ' + t('legend.condition.zygosity');
  block.appendChild(help);

  const helpUnknown = document.createElement("div");
  helpUnknown.className = "auto-legend-help";
  helpUnknown.textContent =
    t("legend.condition.unknown");
  block.appendChild(helpUnknown);
}

function hasPersonNotes(p) {
  return !!(p && typeof p.notes === "string" && p.notes.trim() !== "");
}

function representedSiblingPeersOutsidePair(
  uid,
  pairUids
) {
  const pair =
    new Set(pairUids || []);

  const peers =
    new Set();

  /*
   * Hermanos por filiación compartida.
   */
  parentagesOf(uid)
    .forEach(r => {
      (r.children || [])
        .forEach(childUid => {
          if (
            childUid !== uid &&
            !pair.has(childUid)
          ) {
            peers.add(childUid);
          }
        });
    });

  /*
   * Relaciones explícitas sibling/twin.
   */
  family.relationships
    .filter(r =>
      (
        r.type === "sibling" ||
        r.type === "twin"
      ) &&
      (r.members || [])
        .includes(uid)
    )
    .forEach(r => {
      (r.members || [])
        .forEach(memberUid => {
          if (
            memberUid !== uid &&
            !pair.has(memberUid)
          ) {
            peers.add(memberUid);
          }
        });
    });

  return [...peers];
}

function manualCoupleGenerationBounds(
  memberUids,
  pos
) {
  const members =
    new Set(memberUids || []);

  const parentGenerations = [];
  const childGenerations = [];

  /*
   * La pareja debe quedar al menos una generación por debajo de cualquiera
   * de sus progenitores representados.
   */
  (memberUids || [])
    .forEach(uid => {
      parentagesOf(uid)
        .forEach(r => {
          (r.parents || [])
            .forEach(parentUid => {
              if (
                !members.has(parentUid) &&
                pos.has(parentUid)
              ) {
                parentGenerations.push(
                  pos.get(parentUid).generation
                );
              }
            });
        });
    });

  /*
   * Y al menos una generación por encima de cualquiera de sus hijos.
   * Incluimos descendencia compartida y descendencia individual previa.
   */
  family.relationships
    .filter(r =>
      r.type === "parentage" &&
      (r.parents || [])
        .some(uid =>
          members.has(uid)
        )
    )
    .forEach(r => {
      (r.children || [])
        .forEach(childUid => {
          if (
            !members.has(childUid) &&
            pos.has(childUid)
          ) {
            childGenerations.push(
              pos.get(childUid).generation
            );
          }
        });
    });

  const minimumGeneration =
    parentGenerations.length
      ? Math.max(...parentGenerations)+1
      : 0;

  const maximumGeneration =
    childGenerations.length
      ? Math.min(...childGenerations)-1
      : 19;

  return {
    minimumGeneration,
    maximumGeneration
  };
}

function currentManualCoupleLevelContext(uid = selectedPersonUid) {
  const p =
    uid
      ? personByUid(uid)
      : null;

  if (
    !p ||
    !currentLayout ||
    !currentLayout.pos.has(
      p.uid
    )
  ) {
    return null;
  }

  const unions =
    family.relationships
      .filter(r =>
        r.type === "union" &&
        (r.people || []).length === 2 &&
        (r.people || [])
          .includes(p.uid)
      );

  if (unions.length !== 1) {
    return {
      eligible:false,
      reason:
        unions.length > 1
          ? t("validation.manual.multipleUnions")
          : t("validation.manual.noCouple")
    };
  }

  const union =
    unions[0];

  const memberUids =
    [...union.people];

  const partnerUid =
    memberUids.find(uid =>
      uid !== p.uid
    );

  if (
    !partnerUid ||
    !currentLayout.pos.has(
      partnerUid
    )
  ) {
    return {
      eligible:false,
      reason:
        t("validation.manual.positionUnknown")
    };
  }

  /*
   * Ambos miembros deben ser pareja simple. Esto evita separar cadenas
   * rígidas de múltiples uniones.
   */
  if (
    unionCountForLayout(p.uid) !== 1 ||
    unionCountForLayout(partnerUid) !== 1
  ) {
    return {
      eligible:false,
      reason:
        t("validation.manual.rigidUnion")
    };
  }

  /*
   * No se permite mover verticalmente a un individuo separándolo de una
   * fratría representada. Para esos casos habría que mover una rama
   * generacional completa, que es una operación distinta.
   */
  const siblingPeers =
    [
      ...representedSiblingPeersOutsidePair(
        p.uid,
        memberUids
      ),
      ...representedSiblingPeersOutsidePair(
        partnerUid,
        memberUids
      )
    ];

  if (siblingPeers.length) {
    return {
      eligible:false,
      reason:
        t("validation.manual.siblingGroup")
    };
  }

  const generations =
    memberUids.map(uid =>
      currentLayout.pos
        .get(uid)
        .generation
    );

  const sameGeneration =
    generations.every(g =>
      g === generations[0]
    );

  const manualActive =
    memberUids.some(uid => {
      const person =
        personByUid(uid);

      return !!(
        person &&
        Number.isInteger(
          person.generation_override
        ) &&
        person.generation_override >= 1
      );
    });

  if (!sameGeneration) {
    return {
      eligible:false,
      manualActive,
      memberUids,
      reason:
        t("validation.manual.conflictingLevels")
    };
  }

  const generation =
    generations[0];

  const bounds =
    manualCoupleGenerationBounds(
      memberUids,
      currentLayout.pos
    );

  return {
    eligible:true,
    union,
    memberUids,
    generation,
    manualActive,
    ...bounds
  };
}

function manualCoupleLevelLabel(
  context
) {
  if (
    !context ||
    !context.memberUids
  ) {
    return "";
  }

  return context.memberUids
    .map(uid =>
      currentNumbers.get(uid) ||
      uid
    )
    .join(" · ");
}

function removeManualBranchAnchorsForUids(
  uids
) {
  const removed =
    new Set(uids || []);

  const overrides =
    branchOrderOverrides();

  Object.keys(overrides)
    .forEach(generation => {
      const clean =
        (overrides[generation] || [])
          .filter(uid =>
            !removed.has(uid)
          );

      if (clean.length >= 2) {
        overrides[generation] =
          clean;
      } else {
        delete overrides[generation];
      }
    });
}

function updateManualCoupleLevelPanel() {
  const info =
    $("manualCoupleLevelInfo");

  const upBtn =
    $("moveCoupleUpBtn");

  const downBtn =
    $("moveCoupleDownBtn");

  const resetBtn =
    $("resetCoupleLevelBtn");

  if (
    !info ||
    !upBtn ||
    !downBtn ||
    !resetBtn
  ) {
    return;
  }

  const context =
    currentManualCoupleLevelContext();

  if (!context) {
    info.textContent =
      t("validation.manual.selectCouple");

    upBtn.disabled = true;
    downBtn.disabled = true;
    resetBtn.disabled = true;
    return;
  }

  if (!context.eligible) {
    info.textContent =
      context.reason ||
      t("validation.manual.cannotMoveCouple");

    upBtn.disabled = true;
    downBtn.disabled = true;
    resetBtn.disabled =
      !context.manualActive;

    return;
  }

  const level =
    roman(
      context.generation+1
    );

  info.textContent =
    t("label.manual.couple",{name:manualCoupleLevelLabel(context),level,
      status:t(context.manualActive?"label.manual.levelActive":"label.manual.levelAutomatic")});

  upBtn.disabled =
    context.generation-1 <
    context.minimumGeneration;

  downBtn.disabled =
    context.generation+1 >
    context.maximumGeneration;

  resetBtn.disabled =
    !context.manualActive;
}

function moveSelectedCoupleGeneration(
  direction,
  uid = selectedPersonUid
) {
  const context =
    currentManualCoupleLevelContext(uid);

  if (
    !context ||
    !context.eligible
  ) {
    message(
      context && context.reason
        ? context.reason
        : t("validation.manual.selectSimpleCouple"),
      "error"
    );
    return;
  }

  const targetGeneration =
    context.generation +
    (
      direction < 0
        ? -1
        : 1
    );

  if (
    targetGeneration <
      context.minimumGeneration ||
    targetGeneration >
      context.maximumGeneration ||
    targetGeneration < 0 ||
    targetGeneration > 19
  ) {
    message(
      t("validation.manual.breakParentage"),
      "error"
    );
    return;
  }

  pushUndoState();

  /*
   * generation_override es 1-based en el modelo.
   * Fijamos AMBOS miembros para que la operación sea atómica.
   */
  context.memberUids
    .forEach(uid => {
      const person =
        personByUid(uid);

      if (person) {
        person.generation_override =
          targetGeneration+1;
      }
    });

  /*
   * Si la pareja tenía un ancla horizontal manual en otra generación,
   * eliminamos solo esas referencias obsoletas. El resto de órdenes
   * manuales se conserva.
   */
  removeManualBranchAnchorsForUids(
    context.memberUids
  );

  renderPedigree();

  message(
    direction < 0
      ? t("message.manual.coupleMovedUp")
      : t("message.manual.coupleMovedDown"),
    "success"
  );
}

function resetSelectedCoupleGeneration(uid = selectedPersonUid) {
  const context =
    currentManualCoupleLevelContext(uid);

  if (
    !context ||
    !context.memberUids ||
    !context.manualActive
  ) {
    return;
  }

  pushUndoState();

  context.memberUids
    .forEach(uid => {
      const person =
        personByUid(uid);

      if (person) {
        person.generation_override =
          null;
      }
    });

  removeManualBranchAnchorsForUids(
    context.memberUids
  );

  renderPedigree();

  message(
    t("message.manual.coupleReset"),
    "success"
  );
}


function currentManualBranchContext(uid = selectedPersonUid) {
  const p =
    uid
      ? personByUid(uid)
      : null;

  if (
    !p ||
    !currentLayout ||
    !currentLayout.pos.has(
      p.uid
    )
  ) {
    return null;
  }

  const generation =
    currentLayout.pos
      .get(p.uid)
      .generation;

  const arr =
    currentLayout.byGen
      .get(generation) || [];

  const blocks =
    generationFamilyBlocks(arr)
      .map((members,index) => {
        const xs =
          members
            .filter(uid =>
              currentLayout.pos.has(uid)
            )
            .map(uid =>
              currentLayout.pos
                .get(uid).x
            );

        return {
          members,
          originalIndex:index,
          center:
            xs.length
              ? (
                  Math.min(...xs) +
                  Math.max(...xs)
                ) / 2
              : index
        };
      })
      .sort((a,b) =>
        a.center-b.center
      );

  const blockIndex =
    blocks.findIndex(block =>
      block.members.includes(
        p.uid
      )
    );

  if (blockIndex < 0) {
    return null;
  }

  return {
    generation,
    blocks,
    blockIndex,
    block:blocks[blockIndex]
  };
}

function manualBranchBlockLabel(
  block
) {
  if (
    !block ||
    !block.members
  ) {
    return "";
  }

  return block.members
    .map(uid =>
      currentNumbers.get(uid) ||
      uid
    )
    .join(" · ");
}

function updateManualBranchOrderPanel() {
  const info =
    $("manualBranchOrderInfo");

  const leftBtn =
    $("moveBranchLeftBtn");

  const rightBtn =
    $("moveBranchRightBtn");

  const resetBtn =
    $("resetBranchOrderBtn");

  if (
    !info ||
    !leftBtn ||
    !rightBtn ||
    !resetBtn
  ) {
    return;
  }

  const context =
    currentManualBranchContext();

  if (!context) {
    info.textContent =
      t("validation.manual.selectBranch");

    leftBtn.disabled = true;
    rightBtn.disabled = true;
    resetBtn.disabled = true;
    return;
  }

  const romanGeneration =
    roman(
      context.generation+1
    );

  const manual =
    generationHasManualBranchOrder(
      context.generation
    );

  info.textContent =
    t("label.manual.branch",{name:manualBranchBlockLabel(context.block),generation:romanGeneration,
      status:t(manual?"label.manual.orderActive":"label.manual.orderAutomatic")});

  leftBtn.disabled =
    context.blockIndex <= 0;

  rightBtn.disabled =
    context.blockIndex >=
      context.blocks.length-1;

  resetBtn.disabled =
    !manual;
}

function moveSelectedBranchManually(
  direction,
  uid = selectedPersonUid
) {
  const context =
    currentManualBranchContext(uid);

  if (!context) {
    message(
      t("validation.manual.selectBranchFirst"),
      "error"
    );
    return;
  }

  const targetIndex =
    context.blockIndex +
    (
      direction < 0
        ? -1
        : 1
    );

  if (
    targetIndex < 0 ||
    targetIndex >=
      context.blocks.length
  ) {
    return;
  }

  pushUndoState();

  const blocks =
    [...context.blocks];

  const tmp =
    blocks[
      context.blockIndex
    ];

  blocks[
    context.blockIndex
  ] =
    blocks[targetIndex];

  blocks[targetIndex] =
    tmp;

  saveManualBranchOrder(
    context.generation,
    blocks
  );

  renderPedigree();

  message(
    direction < 0
      ? t("message.manual.branchMovedLeft")
      : t("message.manual.branchMovedRight"),
    "success"
  );
}

function resetSelectedGenerationManualOrder(uid = selectedPersonUid) {
  const context =
    currentManualBranchContext(uid);

  if (!context) return;

  if (
    !generationHasManualBranchOrder(
      context.generation
    )
  ) {
    return;
  }

  pushUndoState();

  clearManualBranchOrder(
    context.generation
  );

  renderPedigree();

  message(
    t("manual.branchOrderRestored",{generation:roman(context.generation+1)}),
    "success"
  );
}


function selectedPerson() {
  return selectedPersonUid ? personByUid(selectedPersonUid) : null;
}

function clinicalGenderLabel(p) {
  if (!p) return "";

  return {
    man:t("person.gender.man"),
    woman:t("person.gender.woman"),
    gender_diverse:t("person.gender.gender_diverse"),
    unspecified:t("label.gender.unknown")
  }[p.gender] || "";
}

function clinicalRecordTypeLabel(p) {
  if (!p) return "";

  const type =
    recordType(p);

  if (type === "person") {
    return clinicalGenderLabel(p);
  }

  if (type === "multiple") {
    return multipleIndividualsLabel(p);
  }

  if (isDonorRecord(p)) {
    return donorRecordLabel(p);
  }

  if (isGestationalCarrierRecord(p)) {
    return t("person.type.gestationalCarrier");
  }

  return window.PedigrAPPi18n?.uiText(reproductiveEventLabel(p)) ||
    t("person.type.record");
}

function clinicalSelectedIndicatorText(p) {
  if (!p) {
    return "Pincha sobre un individuo del árbol.";
  }

  const parts = [];

  const number =
    currentNumbers.get(p.uid);

  if (number) {
    parts.push(number);
  }

  if (
    p.label &&
    String(p.label).trim()
  ) {
    parts.push(
      String(p.label).trim()
    );
  }

  const descriptor =
    clinicalRecordTypeLabel(p);

  if (descriptor) {
    parts.push(descriptor);
  }

  if (personalChronologyLabel(p)) {
    parts.push(personalChronologyLabel(p));
  } else if (
    p.gestational_age_weeks !== null &&
    p.gestational_age_weeks !== undefined &&
    p.gestational_age_weeks !== ""
  ) {
    parts.push(
      `${p.gestational_age_weeks} sem`
    );
  }

  return parts
    .filter(Boolean)
    .join(" · ");
}

/*
 * 0.8.59 — orden clínico = orden visual del pedigree:
 * primero generación superior y, dentro de cada generación, izquierda→derecha.
 */
function clinicalNavigationUids() {
  const people =
    [...(family.people || [])];

  if (
    currentLayout &&
    currentLayout.pos
  ) {
    return people
      .filter(p =>
        currentLayout.pos.has(
          p.uid
        )
      )
      .sort((a,b) => {
        const pa =
          currentLayout.pos.get(
            a.uid
          );

        const pb =
          currentLayout.pos.get(
            b.uid
          );

        return (
          pa.generation -
            pb.generation ||
          pa.x - pb.x ||
          a.uid.localeCompare(
            b.uid,
            "es",
            {numeric:true}
          )
        );
      })
      .map(p => p.uid);
  }

  return people.map(p => p.uid);
}

/*
 * Huella no criptográfica para comparar ediciones clínicas: no es firma
 * electrónica ni validación de autoría. Excluimos exclusivamente la propia
 * anotación de revisión. Se ordenan claves para tolerar serializaciones.
 */
function pedigreeContentSignature() {
  const canonical = value => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.keys(value).filter(key => key !== "review_status")
          .sort().map(key => [key,canonical(value[key])])
      );
    }
    return value;
  };
  const data = JSON.stringify(canonical(family));
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i=0; i<data.length; i++) {
    h ^= BigInt(data.charCodeAt(i));
    h = BigInt.asUintN(64,h * prime);
  }
  return `fnv1a64:${data.length}:${h.toString(16).padStart(16,"0")}`;
}

function reviewContentState() {
  const r = family.review_status;
  if (!r || r.reviewed !== true) return 'pending';
  if (!r.reviewed_signature) return 'historical';
  return r.reviewed_signature === pedigreeContentSignature() ? 'current' : 'outdated';
}

function familyReviewStatus() {
  if (
    !family.review_status ||
    typeof family.review_status !== "object"
  ) {
    family.review_status = {
      reviewed:false,
      reviewed_at:""
    };
  }

  return family.review_status;
}

function familyReviewDateLabel(
  value
) {
  const text =
    String(value || "").trim();

  if (!text) {
    return "";
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return text;
  }

  try {
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        dateStyle:"short",
        timeStyle:"short"
      }
    ).format(date);
  } catch (err) {
    return date.toLocaleString(
      "es-ES"
    );
  }
}

function updateFamilyReviewIndicator() {
  const status =
    familyReviewStatus();

  const indicator =
    $("reviewedIndicator");

  const button =
    $("clinicalReviewBtn");

  const reviewed =
    status.reviewed === true;

  const reviewState = reviewContentState();
  const rereviewButton = $("rereviewFamilyBtn");
  if (rereviewButton) rereviewButton.hidden = !["outdated","historical"].includes(reviewState);

  const dateLabel =
    reviewed
      ? familyReviewDateLabel(
          status.reviewed_at
        )
      : "";

  if (indicator) {
    indicator.hidden =
      !reviewed;

    indicator.textContent =
      reviewed
        ? reviewState === "outdated"
          ? t("review.changedSince",{date:dateLabel||t("label.review.unavailableDate")})
          : reviewState === "historical"
            ? t("review.legacySince",{date:dateLabel||t("label.review.unavailableDate")})
            : (dateLabel ? t("review.reviewedSince",{date:dateLabel}) : t("review.reviewed"))
        : "";
    indicator.classList.toggle("review-is-outdated", reviewState === "outdated");
    indicator.classList.toggle("review-is-historical", reviewState === "historical");

    indicator.title = reviewed
      ? reviewState === "outdated"
        ? t("message.review.contentChanged")
        : reviewState === "historical"
          ? t("message.review.legacy")
          : (dateLabel ? t("review.reviewedAt",{date:dateLabel}) : t("review.reviewedStatus"))
      : "";
  }

  if (button) {
    button.classList.toggle(
      "is-active",
      reviewed
    );

    button.setAttribute(
      "aria-pressed",
      reviewed
        ? "true"
        : "false"
    );

    button.title =
      reviewed
        ? (
            dateLabel
              ? t("review.reviewCancelAt",{date:dateLabel})
              : t("review.reviewCancel")
          )
        : t("review.mark");

    button.setAttribute(
      "aria-label",
      reviewed
        ? t("action.review.cancel")
        : t("review.mark")
    );
  }
}

async function toggleFamilyReviewStatus() {
  syncHeaderToFamily();

  const status =
    familyReviewStatus();

  const alreadyReviewed =
    status.reviewed === true;

  const question =
    alreadyReviewed
      ? t("confirm.review.cancel")
      : t("confirm.review.mark");

  if (!confirm(question)) {
    return false;
  }

  pushUndoState();

  if (alreadyReviewed) {
    family.review_status = {
      reviewed:false,
      reviewed_at:"",
      reviewed_signature:""
    };
  } else {
    family.review_status = {
      reviewed:true,
      reviewed_at: new Date().toISOString(),
      reviewed_signature: pedigreeContentSignature()
    };
  }

  updateFamilyReviewIndicator();
  updateUnsavedIndicator();

  const saved =
    await saveFamily({
      silentSuccess:true
    });

  if (!saved) {
    showToast(
      alreadyReviewed
        ? t("message.review.cancelUnsaved")
        : t("message.review.markUnsaved"),
      "info",
      4200
    );

    return false;
  }

  if (alreadyReviewed) {
    showToast(
      t("message.review.cancelSaved"),
      "info",
      3400
    );

    return true;
  }

  const label =
    familyReviewDateLabel(
      family.review_status
        .reviewed_at
    );

  showToast(
    `Pedigree revisado y guardado${
      label
        ? ` · ${label}`
        : ""
    }.`,
    "success",
    3800
  );

  return true;
}

async function reviewCurrentFamilyVersion() {
  if (!["outdated","historical"].includes(reviewContentState())) return false;
  syncHeaderToFamily();
  if (!confirm(t("confirm.review.current"))) return false;
  pushUndoState();
  family.review_status = {
    reviewed:true,
    reviewed_at:new Date().toISOString(),
    reviewed_signature:pedigreeContentSignature()
  };
  updateFamilyReviewIndicator();
  updateUnsavedIndicator();
  const saved = await saveFamily({silentSuccess:true});
  showToast(saved ? t("message.review.currentSaved") : t("message.review.currentUnsaved"), saved ? "success" : "info", 3800);
  return saved;
}
$("rereviewFamilyBtn").addEventListener("click",reviewCurrentFamilyVersion);

function announceLoadedFamilyReview() {
  const status =
    familyReviewStatus();

  if (status.reviewed !== true) {
    return;
  }

  const label =
    familyReviewDateLabel(
      status.reviewed_at
    );

  showToast(
    label
      ? t("review.reviewAtSince",{date:label})
      : t("label.review.marked"),
    "info",
    4500
  );
}

function clinicalNeighborLabel(uid) {
  if (!uid) return "";

  return (
    currentNumbers.get(uid) ||
    pedigreeDisplayName(uid) ||
    uid
  );
}

function updateClinicalNavigationControls() {
  const previousButton =
    $("clinicalPrevBtn");

  const nextButton =
    $("clinicalNextBtn");

  const previousLabel =
    $("clinicalPrevLabel");

  const nextLabel =
    $("clinicalNextLabel");

  const position =
    $("clinicalNavPosition");

  if (
    !previousButton ||
    !nextButton ||
    !previousLabel ||
    !nextLabel ||
    !position
  ) {
    return;
  }

  const uids =
    clinicalNavigationUids();

  const index =
    selectedPersonUid
      ? uids.indexOf(
          selectedPersonUid
        )
      : -1;

  if (
    index < 0 ||
    !uids.length
  ) {
    previousButton.disabled = true;
    nextButton.disabled = true;
    previousLabel.textContent =
      "Anterior";
    nextLabel.textContent =
      "Siguiente";
    position.textContent = "";
    previousButton.title = "";
    nextButton.title = "";
    return;
  }

  const previousUid =
    index > 0
      ? uids[index-1]
      : null;

  const nextUid =
    index < uids.length-1
      ? uids[index+1]
      : null;

  previousButton.disabled =
    !previousUid;

  nextButton.disabled =
    !nextUid;

  previousLabel.textContent =
    previousUid
      ? clinicalNeighborLabel(
          previousUid
        )
      : "Anterior";

  nextLabel.textContent =
    nextUid
      ? clinicalNeighborLabel(
          nextUid
        )
      : "Siguiente";

  position.textContent =
    `${index+1} de ${uids.length}`;

  previousButton.title =
    previousUid
      ? `Anterior: ${
          pedigreeDisplayName(
            previousUid
          )
        }`
      : "No hay registro anterior";

  nextButton.title =
    nextUid
      ? `Siguiente: ${
          pedigreeDisplayName(
            nextUid
          )
        }`
      : "No hay registro siguiente";

  previousButton.setAttribute(
    "aria-label",
    previousButton.title
  );

  nextButton.setAttribute(
    "aria-label",
    nextButton.title
  );
}

function clinicalEditorHasPendingChanges() {
  const p =
    selectedPerson();

  if (!p) return false;

  const textarea =
    $("personNotes");

  if (!textarea) return false;

  const currentState =
    JSON.stringify({
      notes:p.notes || "",
      condition_states:
        normalizeConditionStates(p)
    });

  const editorState =
    JSON.stringify({
      notes:textarea.value,
      condition_states:
        collectPersonConditionAssignments()
    });

  return currentState !==
    editorState;
}

function navigateClinicalPerson(
  direction
) {
  const uids =
    clinicalNavigationUids();

  const currentIndex =
    selectedPersonUid
      ? uids.indexOf(
          selectedPersonUid
        )
      : -1;

  if (currentIndex < 0) {
    return false;
  }

  const targetIndex =
    currentIndex +
    (
      direction < 0
        ? -1
        : 1
    );

  if (
    targetIndex < 0 ||
    targetIndex >= uids.length
  ) {
    return false;
  }

  if (
    clinicalEditorHasPendingChanges() &&
    !confirm(
      t("validation.review.unsavedRecord")
    )
  ) {
    return false;
  }

  const targetUid =
    uids[targetIndex];

  selectPerson(
    targetUid,
    {
      scrollToClinical:false,
      syncSearch:true
    }
  );

  centerPedigreeOnPerson(
    targetUid,
    "smooth"
  );

  const drawer =
    $("personNotesCard");

  if (drawer) {
    drawer.scrollTo({
      top:0,
      behavior:"smooth"
    });
  }

  return true;
}

function updateNotesPanel() {
  const p = selectedPerson();
  const textarea = $("personNotes");
  const saveBtn = $("savePersonNotesBtn");
  const closeBtn = $("clearPersonSelectionBtn");
  const title = $("notesPersonTitle");
  const status = $("notesStatus");

  if (!p) {
    selectedPersonUid = null;
    title.textContent = t("app.notesPersonTitle.text");
    textarea.value = "";
    textarea.disabled = true;
    saveBtn.disabled = true;
    closeBtn.hidden = true;
    status.textContent = "";
    updateClinicalNavigationControls();
    renderPersonConditionAssignments();
    updateManualBranchOrderPanel();
    updateManualCoupleLevelPanel();
    return;
  }

  title.textContent =
    clinicalSelectedIndicatorText(
      p
    );
  textarea.disabled = false;
  textarea.value = p.notes || "";
  saveBtn.disabled = false;
  closeBtn.hidden = false;
  status.textContent = "";

  updateClinicalNavigationControls();
  renderPersonConditionAssignments();
  updateManualBranchOrderPanel();
  updateManualCoupleLevelPanel();
}

function prepareRelationFromPedigreeSelection(
  uid
) {
  const selectA =
    $("relationA");

  if (
    !selectA ||
    !uid
  ) {
    return false;
  }

  /*
   * Si estábamos editando la situación reproductiva de una unión,
   * pulsar un individuo del árbol vuelve deliberadamente al flujo de
   * "Añadir relación".
   */
  if (
    editingUnionReproductiveIndex !== null
  ) {
    resetRelationReproductiveEdit();
  }

  updateRelationSelectors();

  const canSelect =
    [...selectA.options]
      .some(option =>
        option.value === uid
      );

  if (!canSelect) {
    return false;
  }

  selectA.value = uid;

  /*
   * Regeneramos B después de fijar A para excluir al propio individuo y
   * respetar los filtros específicos del tipo de relación seleccionado.
   */
  updateRelationBList();
  updateReproductiveRelationFields();

  return true;
}


let clinicalDrawerOpen = false;

function openClinicalDrawer(uid) {
  if (
    !uid ||
    !personByUid(uid)
  ) {
    return false;
  }

  selectPerson(
    uid,
    {
      scrollToClinical:false,
      syncSearch:true
    }
  );

  const drawer =
    $("personNotesCard");

  const backdrop =
    $("clinicalDrawerBackdrop");

  if (!drawer) {
    return false;
  }

  clinicalDrawerOpen = true;

  document.body.classList.add(
    "clinical-drawer-open"
  );

  drawer.setAttribute(
    "aria-hidden",
    "false"
  );

  if (backdrop) {
    backdrop.hidden = false;
    backdrop.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  const closeButton =
    $("clearPersonSelectionBtn");

  if (closeButton) {
    closeButton.hidden = false;

    requestAnimationFrame(
      () => closeButton.focus({
        preventScroll:true
      })
    );
  }

  return true;
}

function closeClinicalDrawer({
  clearSelection=false
}={}) {
  const drawer =
    $("personNotesCard");

  const backdrop =
    $("clinicalDrawerBackdrop");

  clinicalDrawerOpen = false;

  document.body.classList.remove(
    "clinical-drawer-open"
  );

  if (drawer) {
    drawer.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  if (backdrop) {
    backdrop.hidden = true;
    backdrop.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  if (clearSelection) {
    clearPersonSelection({
      closeDrawer:false
    });
  }

  return true;
}

function selectPerson(uid,options={}) {
  if (!personByUid(uid)) return;

  const {
    scrollToClinical=false,
    syncSearch=true
  } = options;

  selectedPersonUid = uid;
  updateNotesPanel();

  if (currentSvg) {
    currentSvg.querySelectorAll(".person").forEach(node => {
      node.classList.toggle(
        "selected-person",
        node.getAttribute("data-uid") === uid
      );
    });
  }

  /*
   * Las relaciones rápidas permanecen en el hover. El clic tiene ahora
   * una función distinta y directa: editar el estado clínico del individuo.
   * Dejamos además Registro A sincronizado para el editor avanzado.
   */
  prepareRelationFromPedigreeSelection(
    uid
  );

  if (syncSearch) {
    syncPedigreeSearchFromSelection();
  }

  const conditionCard =
    $("conditionAssignmentsCard");

  if (scrollToClinical && conditionCard) {
    conditionCard.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }
}

function clearPersonSelection(
  options={}
) {
  const {
    closeDrawer=true
  } = options;

  selectedPersonUid = null;
  updateNotesPanel();
  syncPedigreeSearchFromSelection();

  if (currentSvg) {
    currentSvg.querySelectorAll(".person.selected-person")
      .forEach(node => node.classList.remove("selected-person"));
  }

  if (
    closeDrawer &&
    clinicalDrawerOpen
  ) {
    closeClinicalDrawer({
      clearSelection:false
    });
  }
}

function saveSelectedPersonNotes() {
  const p = selectedPerson();
  if (!p) return;

  const newNotes =
    $("personNotes").value;

  const currentConditionStates =
    normalizeConditionStates(p);

  const newConditionStates =
    collectPersonConditionAssignments();

  const clinicalWarnings = [];

  newConditionStates.forEach(state => {
    const condition =
      conditionById(state.condition_id);

    if (!condition) return;

    validateConditionState(
      p,
      condition,
      state
    ).forEach(text => {
      clinicalWarnings.push(
        `${condition.name || condition.id}: ${text}`
      );
    });
  });

  const oldState = JSON.stringify({
    notes:p.notes || "",
    condition_states:currentConditionStates
  });

  const newState = JSON.stringify({
    notes:newNotes,
    condition_states:newConditionStates
  });

  if (oldState === newState) {
    $("notesStatus").textContent =
      "Sin cambios.";
    return;
  }

  pushUndoState();

  p.notes = newNotes;
  p.condition_states = newConditionStates;

  /*
   * Cualquier edición clínica abandona el modo "Afectado" simplificado.
   * Si hay condiciones, el estado pasa a derivarse exclusivamente de ellas.
   */
  p.affected = false;
  if ((family.conditions || []).length) {
    p.affected =
      isPersonAffectedByAnyCondition(p);
  }
  p.clinical = normalizeClinicalData(p);
  p.clinical.phenotype_status = p.affected ? "affected" : "unaffected";

  renderPedigree();
  selectPerson(
    p.uid,
    {
      scrollToClinical:false,
      syncSearch:true
    }
  );

  $("notesStatus").textContent =
    clinicalWarnings.length
      ? `Guardado con ${clinicalWarnings.length} aviso(s) de coherencia.`
      : t("message.clinical.saved");

  message(
    "Información clínica y genética actualizada. Pulsa Guardar para persistir el caso.",
    "success"
  );
}


function equalizePedigreeVerticalMargins(svg) {
  if (!svg || typeof svg.getBBox !== "function") return;

  const viewBox = String(
    svg.getAttribute("viewBox") || ""
  )
    .trim()
    .split(/\s+/)
    .map(Number);

  if (
    viewBox.length !== 4 ||
    viewBox.some(v => !Number.isFinite(v))
  ) {
    return;
  }

  let bbox;

  try {
    bbox = svg.getBBox();
  } catch (err) {
    return;
  }

  if (
    !bbox ||
    !Number.isFinite(bbox.y) ||
    !Number.isFinite(bbox.height) ||
    bbox.height <= 0
  ) {
    return;
  }

  const [viewX, viewY, viewWidth] = viewBox;

  // El margen superior real es la distancia entre el inicio del viewBox
  // y el primer elemento visible. Usamos exactamente ese mismo margen
  // por debajo del último elemento visible.
  const topMargin = Math.max(
    12,
    bbox.y - viewY
  );

  const contentBottom =
    bbox.y + bbox.height;

  const newHeight = Math.ceil(
    contentBottom -
    viewY +
    topMargin
  );

  svg.setAttribute(
    "viewBox",
    `${viewX} ${viewY} ${viewWidth} ${newHeight}`
  );
}

/*
 * Visualización en pantalla:
 * los pedigrees grandes ya NO se reducen para intentar encajarlos en la
 * tarjeta. La escala mínima es el 100 % de la geometría natural del SVG.
 *
 * - Si el árbol cabe, aprovecha el ancho disponible como hasta ahora.
 * - Si no cabe, conserva el tamaño natural de símbolos/textos/líneas y
 *   activa scroll horizontal.
 *
 * Esto solo afecta a la visualización interactiva. SVG/PNG/PDF conservan
 * sus mecanismos de exportación actuales.
 */
const MIN_PEDIGREE_SCREEN_SCALE = 1.00;
const PEDIGREE_ZOOM_MIN = 0.30;
const PEDIGREE_ZOOM_MAX = 2.50;
const PEDIGREE_ZOOM_STEP = 1.15;
let pedigreeZoom = 1.00;
let pedigreePanState = null;
let editorPanelCollapsed = false;
let pedigreeFocusMode = false;

function pedigreeSvgViewBox(svg) {
  if (!svg) return null;

  const raw = String(svg.getAttribute("viewBox") || "")
    .trim()
    .split(/\s+/)
    .map(Number);

  if (
    raw.length !== 4 ||
    !raw.every(Number.isFinite) ||
    raw[2] <= 0 ||
    raw[3] <= 0
  ) {
    return null;
  }

  return {x:raw[0], y:raw[1], width:raw[2], height:raw[3]};
}

function pedigreeSvgViewBoxWidth(svg) {
  const box = pedigreeSvgViewBox(svg);
  return box ? box.width : 0;
}

function clampPedigreeZoom(value) {
  return Math.min(
    PEDIGREE_ZOOM_MAX,
    Math.max(PEDIGREE_ZOOM_MIN, value)
  );
}

function updatePedigreeZoomIndicator() {
  const indicator = $("pedigreeZoomIndicator");
  if (!indicator) return;
  indicator.textContent = `${Math.round(pedigreeZoom * 100)} %`;
}

function applyPedigreeViewportSizing(svg,container) {
  if (!svg || !container) return;

  const viewBox = pedigreeSvgViewBox(svg);
  if (!viewBox) return;

  const renderedWidth = Math.max(1, viewBox.width * pedigreeZoom);

  svg.style.width = `${renderedWidth}px`;
  svg.style.minWidth = `${renderedWidth}px`;
  svg.style.maxWidth = "none";
  svg.style.height = "auto";
  svg.style.marginLeft = "auto";
  svg.style.marginRight = "auto";

  container.classList.toggle(
    "pedigree-scroll-active",
    container.scrollWidth > container.clientWidth + 2 ||
    container.scrollHeight > container.clientHeight + 2
  );

  updatePedigreeZoomIndicator();
}

function capturePedigreeViewportCenter(container) {
  if (!container || !currentSvg || !currentSvg.isConnected) return null;

  const totalW = Math.max(container.clientWidth, container.scrollWidth);
  const totalH = Math.max(container.clientHeight, container.scrollHeight);

  return {
    x:(container.scrollLeft + container.clientWidth/2) / Math.max(1,totalW),
    y:(container.scrollTop + container.clientHeight/2) / Math.max(1,totalH)
  };
}

function restorePedigreeViewportCenter(container,state) {
  if (!container) return;

  if (!state) {
    centerPedigreeViewport();
    return;
  }

  const totalW = Math.max(container.clientWidth, container.scrollWidth);
  const totalH = Math.max(container.clientHeight, container.scrollHeight);

  container.scrollLeft = Math.max(
    0,
    state.x * totalW - container.clientWidth/2
  );
  container.scrollTop = Math.max(
    0,
    state.y * totalH - container.clientHeight/2
  );
}

function centerPedigreeViewport() {
  const container = $("pedigreeContainer");
  if (!container) return;

  container.scrollLeft = Math.max(
    0,
    (container.scrollWidth - container.clientWidth) / 2
  );
  container.scrollTop = Math.max(
    0,
    (container.scrollHeight - container.clientHeight) / 2
  );
}

function setPedigreeZoom(nextZoom,anchorClientX=null,anchorClientY=null) {
  const container = $("pedigreeContainer");
  if (!container || !currentSvg) return;

  const next = clampPedigreeZoom(nextZoom);
  if (Math.abs(next - pedigreeZoom) < 0.0001) return;

  const containerRect = container.getBoundingClientRect();
  const oldSvgRect = currentSvg.getBoundingClientRect();

  const anchorX = Number.isFinite(anchorClientX)
    ? anchorClientX
    : containerRect.left + container.clientWidth/2;
  const anchorY = Number.isFinite(anchorClientY)
    ? anchorClientY
    : containerRect.top + container.clientHeight/2;

  const fx = oldSvgRect.width > 0
    ? Math.min(1,Math.max(0,(anchorX-oldSvgRect.left)/oldSvgRect.width))
    : 0.5;
  const fy = oldSvgRect.height > 0
    ? Math.min(1,Math.max(0,(anchorY-oldSvgRect.top)/oldSvgRect.height))
    : 0.5;

  pedigreeZoom = next;
  applyPedigreeViewportSizing(currentSvg,container);

  const newSvgRect = currentSvg.getBoundingClientRect();
  container.scrollLeft +=
    (newSvgRect.left + fx*newSvgRect.width) - anchorX;
  container.scrollTop +=
    (newSvgRect.top + fy*newSvgRect.height) - anchorY;

  updatePedigreeZoomIndicator();
}

function fitPedigreeToViewport() {
  const container = $("pedigreeContainer");
  if (!container || !currentSvg) return;

  const viewBox = pedigreeSvgViewBox(currentSvg);
  if (!viewBox) return;

  const padding = 24;
  const scaleX = Math.max(1,container.clientWidth-padding) / viewBox.width;
  const scaleY = Math.max(1,container.clientHeight-padding) / viewBox.height;
  pedigreeZoom = clampPedigreeZoom(Math.min(scaleX,scaleY));
  applyPedigreeViewportSizing(currentSvg,container);
  centerPedigreeViewport();
}

/*
 * Ajusta sólo al ancho. Es útil cuando el pedigree tiene muchas generaciones:
 * ocupa toda la anchura disponible y deja que el usuario navegue verticalmente.
 */
function fitPedigreeToWidth() {
  const container = $("pedigreeContainer");
  if (!container || !currentSvg) return;

  const viewBox = pedigreeSvgViewBox(currentSvg);
  if (!viewBox) return;

  const padding = 24;
  const scaleX = Math.max(1,container.clientWidth-padding) / viewBox.width;

  pedigreeZoom = clampPedigreeZoom(scaleX);
  applyPedigreeViewportSizing(currentSvg,container);

  container.scrollLeft = Math.max(
    0,
    (container.scrollWidth-container.clientWidth)/2
  );
}

/*
 * 0.8.59 — al cargar/importar un pedigree, encuadrarlo automáticamente
 * al ancho disponible. Dos frames permiten que el SVG y el grid terminen
 * primero su reflow antes de calcular el ancho real del visor.
 */
function fitPedigreeToWidthAfterLoad() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fitPedigreeToWidth();
    });
  });
}

/*
 * Conserva el punto visual al modificar la interfaz (plegar panel o modo foco).
 * El segundo frame deja que el navegador termine primero el nuevo grid/layout.
 */
function refreshPedigreeViewportAfterUiChange(previousCenter=null) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const container = $("pedigreeContainer");
      if (!container || !currentSvg) return;

      applyPedigreeViewportSizing(currentSvg,container);
      restorePedigreeViewportCenter(container,previousCenter);
    });
  });
}

function setEditorPanelCollapsed(collapsed) {
  const workspace = $("workspace");
  const button = $("pedigreeToggleEditorBtn");
  if (!workspace || !button) return;

  const container = $("pedigreeContainer");
  const previousCenter = capturePedigreeViewportCenter(container);

  editorPanelCollapsed = !!collapsed;
  workspace.classList.toggle("editor-collapsed",editorPanelCollapsed);

  button.textContent = editorPanelCollapsed ? "▶" : "◀";
  button.title = editorPanelCollapsed
    ? t("action.editor.show")
    : t("action.editor.hide");
  button.setAttribute(
    "aria-label",
    editorPanelCollapsed
      ? t("action.editor.show")
      : t("action.editor.hide")
  );
  button.setAttribute(
    "aria-pressed",
    editorPanelCollapsed ? "true" : "false"
  );

  refreshPedigreeViewportAfterUiChange(previousCenter);
}

let stickyActionFrame = null;

function updateStickyActionBarVisibility() {
  const bar =
    $("stickyPedigreeActions");

  const source =
    document.querySelector(
      ".top-tool-row"
    );

  if (
    !bar ||
    !source
  ) {
    return;
  }

  const rect =
    source.getBoundingClientRect();

  const shouldShow =
    !pedigreeFocusMode &&
    rect.bottom < 8;

  bar.classList.toggle(
    "is-visible",
    shouldShow
  );

  bar.setAttribute(
    "aria-hidden",
    shouldShow
      ? "false"
      : "true"
  );
}

function scheduleStickyActionBarUpdate() {
  if (
    stickyActionFrame !== null
  ) {
    return;
  }

  stickyActionFrame =
    requestAnimationFrame(
      () => {
        stickyActionFrame = null;
        updateStickyActionBarVisibility();
      }
    );
}

function returnToPedigreeFromStickyBar() {
  const pedigreeCard =
    document.querySelector(
      ".pedigree-card"
    );

  if (!pedigreeCard) {
    return;
  }

  pedigreeCard.scrollIntoView({
    behavior:"smooth",
    block:"start"
  });

  const container =
    $("pedigreeContainer");

  if (container) {
    requestAnimationFrame(
      () => {
        container.focus({
          preventScroll:true
        });
      }
    );
  }
}

function refreshPedigreeFocusModeLanguage(){
  const button=$("pedigreeFocusModeBtn");
  if(!button)return;
  button.title=pedigreeFocusMode ? t("action.focus.exit") : t("toolbar.focus.enable");
  button.setAttribute("aria-label",pedigreeFocusMode ? t("action.focus.exitShort") : t("toolbar.focus.enableAria"));
}

function setPedigreeFocusMode(active) {
  const button = $("pedigreeFocusModeBtn");
  const container = $("pedigreeContainer");
  if (!button || !container) return;

  const previousCenter = capturePedigreeViewportCenter(container);

  pedigreeFocusMode = !!active;
  document.body.classList.toggle(
    "pedigree-focus-mode",
    pedigreeFocusMode
  );

  button.textContent = pedigreeFocusMode ? "⤡" : "⤢";
  button.title = pedigreeFocusMode
    ? t("action.focus.exit")
    : t("toolbar.focus.enable");
  button.setAttribute(
    "aria-label",
    pedigreeFocusMode
      ? t("action.focus.exitShort")
      : t("toolbar.focus.enableAria")
  );
  button.setAttribute(
    "aria-pressed",
    pedigreeFocusMode ? "true" : "false"
  );

  refreshPedigreeViewportAfterUiChange(previousCenter);
  scheduleStickyActionBarUpdate();
}

function isEditableKeyboardTarget(target) {
  if (!target || !(target instanceof Element)) return false;

  return !!target.closest(
    "input, textarea, select, [contenteditable='true'], [contenteditable='']"
  );
}

function resetPedigreeZoom() {
  pedigreeZoom = 1.00;
  const container = $("pedigreeContainer");
  if (container && currentSvg) {
    applyPedigreeViewportSizing(currentSvg,container);
    centerPedigreeViewport();
  }
}

function normalizePedigreeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function pedigreeSearchLabel(p) {
  if (!p) return "";

  const number = currentNumbers.get(p.uid) || "";
  const visible = pedigreeDisplayName(p.uid);

  if (visible && visible !== p.uid) return visible;
  if (number) return p.label ? `${number} · ${p.label}` : number;
  return p.label || p.uid;
}

function updatePedigreeSearchOptions() {
  const list = $("pedigreePersonSearchList");
  if (!list) return;

  list.replaceChildren();

  family.people.forEach(p => {
    const option = document.createElement("option");
    option.value = pedigreeSearchLabel(p);
    option.dataset.uid = p.uid;
    list.appendChild(option);
  });
}

function syncPedigreeSearchFromSelection() {
  const input = $("pedigreePersonSearch");
  if (!input) return;

  input.classList.remove("is-not-found");
  input.title = t('layout.search.title');
  input.value = selectedPersonUid
    ? pedigreeSearchLabel(personByUid(selectedPersonUid))
    : "";
}

function findPedigreePersonFromSearch(query) {
  const q = normalizePedigreeSearchText(query);
  if (!q) return null;

  const candidates = family.people.map(p => {
    const number = currentNumbers.get(p.uid) || "";
    const label = p.label || "";
    const display = pedigreeSearchLabel(p);
    const fields = [display,number,label,p.uid] 
      .filter(Boolean)
      .map(normalizePedigreeSearchText);

    return {p,fields};
  });

  const exact = candidates.find(item => item.fields.some(value => value === q));
  if (exact) return exact.p;

  const starts = candidates.find(item => item.fields.some(value => value.startsWith(q)));
  if (starts) return starts.p;

  const partial = candidates.find(item => item.fields.some(value => value.includes(q)));
  return partial ? partial.p : null;
}

function centerPedigreeOnPerson(uid,behavior="smooth") {
  const container = $("pedigreeContainer");
  if (!container || !currentSvg || !uid) return false;

  const node = [...currentSvg.querySelectorAll(".person")]
    .find(item => item.getAttribute("data-uid") === uid);

  if (!node) return false;

  const containerRect = container.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();

  const targetLeft = container.scrollLeft +
    (nodeRect.left + nodeRect.width/2) -
    (containerRect.left + container.clientWidth/2);

  const targetTop = container.scrollTop +
    (nodeRect.top + nodeRect.height/2) -
    (containerRect.top + container.clientHeight/2);

  container.scrollTo({
    left:Math.max(0,targetLeft),
    top:Math.max(0,targetTop),
    behavior
  });

  return true;
}

function searchAndCenterPedigreePerson() {
  const input = $("pedigreePersonSearch");
  if (!input) return;

  const p = findPedigreePersonFromSearch(input.value);

  if (!p) {
    input.classList.add("is-not-found");
    input.title = t("validation.person.noneFound");
    input.focus();
    return;
  }

  input.classList.remove("is-not-found");
  input.title = t('layout.search.title');
  selectPerson(p.uid,{scrollToClinical:false,syncSearch:true});
  centerPedigreeOnPerson(p.uid);
}

function installPedigreeViewer() {
  const container = $("pedigreeContainer");
  if (!container || container.dataset.viewerInstalled === "1") return;

  container.dataset.viewerInstalled = "1";

  const zoomIn = $("pedigreeZoomInBtn");
  const reorderButton=$("pedigreeReorderSiblingsBtn");
  if (reorderButton) reorderButton.addEventListener("click",()=>{
    if (personDragState) return;
    siblingReorderMode=!siblingReorderMode;
    updateSiblingReorderButton();
    message(siblingReorderMode
      ? t("message.reorder.enabled")
      : t("message.reorder.disabled"),"info");
  });
  updateSiblingReorderButton();
  const zoomOut = $("pedigreeZoomOutBtn");
  const fit = $("pedigreeFitBtn");
  const fitWidth = $("pedigreeFitWidthBtn");
  const center = $("pedigreeCenterBtn");
  const actual = $("pedigreeActualSizeBtn");
  const toggleEditor = $("pedigreeToggleEditorBtn");
  const focusMode = $("pedigreeFocusModeBtn");
  const personSearch = $("pedigreePersonSearch");
  const personSearchBtn = $("pedigreePersonSearchBtn");

  if (personSearchBtn) {
    personSearchBtn.addEventListener("click",searchAndCenterPedigreePerson);
  }

  if (personSearch) {
    personSearch.addEventListener("input",() => {
      personSearch.classList.remove("is-not-found");
      personSearch.title = "";
    });

    personSearch.addEventListener("keydown",event => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchAndCenterPedigreePerson();
      }
    });
  }

  if (zoomIn) zoomIn.addEventListener("click", () => {
    setPedigreeZoom(pedigreeZoom * PEDIGREE_ZOOM_STEP);
  });

  if (zoomOut) zoomOut.addEventListener("click", () => {
    setPedigreeZoom(pedigreeZoom / PEDIGREE_ZOOM_STEP);
  });

  if (fit) fit.addEventListener("click", fitPedigreeToViewport);
  if (fitWidth) fitWidth.addEventListener("click", fitPedigreeToWidth);
  if (center) center.addEventListener("click", centerPedigreeViewport);
  if (actual) actual.addEventListener("click", resetPedigreeZoom);

  if (toggleEditor) {
    toggleEditor.addEventListener("click",() => {
      setEditorPanelCollapsed(!editorPanelCollapsed);
    });
  }

  if (focusMode) {
    focusMode.addEventListener("click",() => {
      setPedigreeFocusMode(!pedigreeFocusMode);
    });
  }

  container.addEventListener("wheel", event => {
    if (!currentSvg) return;

    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    setPedigreeZoom(
      pedigreeZoom * factor,
      event.clientX,
      event.clientY
    );
  }, {passive:false});

  // Clic breve: mantiene la ficha contextual. Más de 6 px horizontales:
  // arrastra el individuo; el fondo conserva su pan habitual.
  container.addEventListener("pointerdown",event => {
    if (event.button !== 0 || (event.pointerType !== "mouse" && event.pointerType !== "pen")) return;
    const node = event.target.closest && event.target.closest(".person[data-uid]");
    if (!node || !currentLayout || !currentSvg) return;
    const uid = node.getAttribute("data-uid");
    if (!currentLayout.pos.has(uid)) return;
    const reorderBlocks=siblingReorderMode
      ? horizontalGenerationBlocks(currentLayout.pos,currentLayout.pos.get(uid).generation) : [];
    const moveIndex=reorderBlocks.findIndex(b=>b.members.includes(uid));
    if (siblingReorderMode && (moveIndex<0 || !reorderBlocks.every(b=>b.contiguous))) {
      message(t("validation.reorder.separatedGroup"),"warning");
      return;
    }
    syncHeaderToFamily();
    const view = currentSvg.viewBox.baseVal;
    const rect = currentSvg.getBoundingClientRect();
    personDragState = {
      uid,pointerId:event.pointerId,container,
      startClientX:event.clientX,startClientY:event.clientY,
      startX:currentLayout.pos.get(uid).x,
      autoX:currentLayout.automaticX.get(uid),
      // Restar la base automática permite comenzar el gesto desde la
      // coordenada actual incluso tras ajustes anteriores de la misma fila.
      initialOffset:currentLayout.pos.get(uid).x - currentLayout.automaticX.get(uid),
      pxPerUnit:Math.max(.05,rect.width/Math.max(1,view.width)),
      before:cloneFamilyState(family),
      reorder:siblingReorderMode,
      reorderBlocks,
      generation:currentLayout.pos.get(uid).generation,
      sourceIndex:moveIndex,
      targetIndex:moveIndex,
      marker:null,
      moved:false,frame:null,lastDraw:0,pendingX:null
    };
  });

  const updateSiblingReorderPreview=(state,clientDx)=>{
    if (!state.reorder || !currentSvg || !currentLayout) return;
    const desired=state.startX+clientDx/state.pxPerUnit;
    // El bloque entero (pareja o gemelos) actúa como una sola unidad.
    const extents=state.reorderBlocks.map(b=>{
      const xs=b.members.map(uid=>currentLayout.pos.get(uid)?.x ?? 0);
      return {left:Math.min(...xs),right:Math.max(...xs)};
    });
    const distance=span=>desired<span.left ? span.left-desired :
      desired>span.right ? desired-span.right : 0;
    let nearest=0;
    extents.forEach((span,i)=>{
      if (distance(span)<distance(extents[nearest])) nearest=i;
    });
    state.targetIndex=nearest;
    if (state.marker && state.marker.isConnected) state.marker.remove();
    state.marker=null;
    if (nearest===state.sourceIndex) return;
    const markerX=nearest>state.sourceIndex
      ? extents[nearest].right+42 : extents[nearest].left-42;
    const rowPoint=currentLayout.pos.get(state.uid);
    const marker=svgEl("line",{
      x1:markerX,y1:rowPoint.y-48,x2:markerX,y2:rowPoint.y+48,
      class:"sibling-reorder-drop-marker","pointer-events":"none"
    });
    currentSvg.appendChild(marker);
    state.marker=marker;
  };
  const flushPersonDrag = () => {
    const state = personDragState;
    if (!state || !state.moved || state.pendingX === null) return;
    const requested = state.pendingX;
    state.pendingX = null;
    // Gesto vertical: no cambia la posición horizontal.
    if (Math.abs(requested) < 6) return;
    if (state.reorder) {
      updateSiblingReorderPreview(state,requested);
      return;
    }
    const dx = requested / state.pxPerUnit;
    const overrides = manualHorizontalOverrides();
    const writeOffset = fraction => {
      const x = Math.round((state.initialOffset + dx*fraction)*10)/10;
      if (Math.abs(x) >= .5) overrides[state.uid] = x;
      else delete overrides[state.uid];
    };
    liveDragUid = state.uid;
    writeOffset(1);

    // Si desplazar un hermano empuja al grupo contra el margen izquierdo,
    // la normalización del lienzo podría invertir aparentemente el gesto.
    // Limitamos el arrastre al máximo realmente disponible: nunca debe
    // desplazarse a la derecha cuando el ratón se lleva a la izquierda.
    let trial = calculateLayout();
    const actualX = trial.pos.get(state.uid)?.x ?? state.startX;
    const backwards = dx < 0
      ? actualX > state.startX + 0.5
      : (dx > 0 && actualX < state.startX - 0.5);
    if (backwards) {
      let lo = 0, hi = 1;
      for (let step = 0; step < 7; step++) {
        const fraction = (lo+hi)/2;
        writeOffset(fraction);
        trial = calculateLayout();
        const actual = trial.pos.get(state.uid)?.x ?? state.startX;
        const valid = dx < 0
          ? actual <= state.startX + .5
          : actual >= state.startX - .5;
        if (valid) lo = fraction;
        else hi = fraction;
      }
      if (lo < 0.01) {
        const original = state.before.layout_overrides?.manual_x?.[state.uid];
        if (Number.isFinite(Number(original)) && original !== undefined) {
          overrides[state.uid] = original;
        } else {
          delete overrides[state.uid];
        }
      } else writeOffset(lo);
    }
    renderPedigree();
  };

  document.addEventListener("pointermove",event => {
    const state = personDragState;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX-state.startClientX;
    const dy = event.clientY-state.startClientY;
    if (!state.moved && Math.hypot(dx,dy) <= 6) return;
    if (!state.moved) {
      state.moved = true;
      suppressDraggedPersonClick = true;
      hideConditionHoverCard();
      hideRelationshipActionMenu();
      container.classList.add("is-dragging-person");
      try { container.setPointerCapture(state.pointerId); } catch (_) {}
    }
    state.pendingX = dx;
    event.preventDefault();
    // Evita el redibujado del SVG y los paneles en cada evento de ratón.
    if (state.frame === null) {
      state.frame = requestAnimationFrame(() => {
        if (personDragState !== state) return;
        state.frame = null;
        const now = performance.now();
        if (now-state.lastDraw >= 32) {
          flushPersonDrag();
          state.lastDraw = now;
        } else if (state.pendingX !== null) {
          state.frame = requestAnimationFrame(() => {
            if (personDragState !== state) return;
            state.frame = null;
            flushPersonDrag();
            state.lastDraw = performance.now();
          });
        }
      });
    }
  },{passive:false});

  const finishPersonDrag = (event,cancelled=false) => {
    const state = personDragState;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.frame !== null) cancelAnimationFrame(state.frame);
    state.frame = null;
    container.classList.remove("is-dragging-person");
    if (container.hasPointerCapture(state.pointerId)) {
      container.releasePointerCapture(state.pointerId);
    }
    if (state.moved && !cancelled) {
      state.pendingX = event.clientX-state.startClientX;
      flushPersonDrag();
    }
    if (state.marker && state.marker.isConnected) state.marker.remove();
    let changed=false;
    if (state.reorder) {
      if (state.moved && !cancelled && state.targetIndex!==state.sourceIndex) {
        const desired=reorderGenerationBlockOrder(currentLayout.pos,state.generation,
          state.uid,state.targetIndex);
        if (desired) {
          generationVisualOverrides()[String(state.generation)]=desired;
          // La nueva preferencia de fila reemplaza los desplazamientos
          // manuales de sus integrantes: evita anclajes contradictorios.
          const offsets=manualHorizontalOverrides();
          const oldSiblingRanks=visualSiblingOverrides();
          desired.forEach(uid=>{delete offsets[uid]; delete oldSiblingRanks[uid];});
          changed=true;
        }
      }
    } else {
      const drawnX = currentLayout?.pos?.get(state.uid)?.x ?? state.startX;
      changed = state.moved && !cancelled && Math.abs(drawnX-state.startX) > 0.75;
    }
    if (!changed && !state.reorder) {
      family.layout_overrides.manual_x =
        {...(state.before.layout_overrides && state.before.layout_overrides.manual_x || {})};
    }
    if (changed) {
      undoHistory.push(state.before);
      trimHistory(undoHistory);
      redoHistory.length = 0;
      updateUndoButton();
    }
    personDragState = null;
    liveDragUid = null;
    if (state.moved) {
      suppressDraggedPersonClick = true;
      // El clic sintético se emite inmediatamente después del pointerup.
      setTimeout(() => { suppressDraggedPersonClick = false; },0);
      renderPedigree();
      if (changed) message(state.reorder
        ? t("message.reorder.updated")
        : t("message.reorder.positionUpdated"),"success");
    }
  };
  document.addEventListener("pointerup", event => finishPersonDrag(event));
  document.addEventListener("pointercancel", event => finishPersonDrag(event,true));
  // Un gesto arrastrado no debe reabrir la ficha en el click sintético.
  container.addEventListener("click",event => {
    if (suppressDraggedPersonClick) {
      event.preventDefault();
      event.stopPropagation();
    }
  },true);

  const reset = $("pedigreeResetManualPositionsBtn");
  if (reset) reset.addEventListener("click",resetManualHorizontalPositions);
  updateManualLayoutResetButton();

  container.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (
      event.target &&
      event.target.closest &&
      (
        event.target.closest(".person") ||
        event.target.closest(".relationship-hit-target")
      )
    ) return;

    pedigreePanState = {
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      scrollLeft:container.scrollLeft,
      scrollTop:container.scrollTop,
      moved:false
    };

    container.classList.add("is-panning");
    hideConditionHoverCard();
    container.setPointerCapture(event.pointerId);
  });

  container.addEventListener("pointermove", event => {
    if (!pedigreePanState || pedigreePanState.pointerId !== event.pointerId) return;

    const dx = event.clientX-pedigreePanState.startX;
    const dy = event.clientY-pedigreePanState.startY;

    if (Math.hypot(dx,dy) > 4) {
      pedigreePanState.moved = true;
    }

    container.scrollLeft = pedigreePanState.scrollLeft - dx;
    container.scrollTop = pedigreePanState.scrollTop - dy;
    event.preventDefault();
  });

  const endPan = event => {
    if (!pedigreePanState || pedigreePanState.pointerId !== event.pointerId) return;

    const wasMoved = pedigreePanState.moved;
    pedigreePanState = null;
    container.classList.remove("is-panning");

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    // Un clic real sobre el fondo limpia la selección persistente.
    // Un arrastre de navegación no la modifica.
    if (!wasMoved) {
      clearPersonSelection();
    }
  };

  container.addEventListener("pointerup",endPan);
  container.addEventListener("pointercancel",endPan);

  container.addEventListener("keydown", event => {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setPedigreeZoom(pedigreeZoom * PEDIGREE_ZOOM_STEP);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setPedigreeZoom(pedigreeZoom / PEDIGREE_ZOOM_STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      resetPedigreeZoom();
    }
  });

  document.addEventListener("keydown", event => {
    const key =
      String(
        event.key || ""
      ).toLowerCase();

    const commandKey =
      event.ctrlKey ||
      event.metaKey;

    /* Guardar el caso y evitar t("action.export.savePage") del navegador. */
    if (
      commandKey &&
      key === "s" &&
      !event.altKey
    ) {
      event.preventDefault();
      saveFamily();
      return;
    }

    /*
     * Esc: panel clínico (su listener específico) > tooltip > modo foco.
     */
    if (event.key === "Escape") {
      if (clinicalDrawerOpen) {
        return;
      }

      const hoverCard =
        conditionHoverCard();

      if (
        hoverCard &&
        !hoverCard.hidden
      ) {
        event.preventDefault();
        hideConditionHoverCard();
        return;
      }

      if (pedigreeFocusMode) {
        event.preventDefault();
        setPedigreeFocusMode(false);
        return;
      }
    }

    if (
      isEditableKeyboardTarget(
        event.target
      )
    ) {
      return;
    }

    /* F: buscador del pedigree. */
    if (
      key === "f" &&
      !commandKey &&
      !event.altKey &&
      !event.shiftKey &&
      !clinicalDrawerOpen
    ) {
      const search =
        $("pedigreePersonSearch");

      if (search) {
        event.preventDefault();

        search.focus({
          preventScroll:false
        });

        search.select();
      }

      return;
    }

    /*
     * +/-: zoom global. Si el foco está dentro del visor, el listener
     * local ya lo procesa y evitamos un doble incremento.
     */
    const target =
      event.target;

    const insidePedigree =
      target &&
      typeof target.closest ===
        "function" &&
      target.closest(
        "#pedigreeContainer"
      );

    if (
      !insidePedigree &&
      !commandKey &&
      !event.altKey &&
      (
        event.key === "+" ||
        event.key === "="
      )
    ) {
      event.preventDefault();

      setPedigreeZoom(
        pedigreeZoom *
        PEDIGREE_ZOOM_STEP
      );

      return;
    }

    if (
      !insidePedigree &&
      !commandKey &&
      !event.altKey &&
      (
        event.key === "-" ||
        event.key === "_"
      )
    ) {
      event.preventDefault();

      setPedigreeZoom(
        pedigreeZoom /
        PEDIGREE_ZOOM_STEP
      );

      return;
    }

    /*
     * En campos de texto no interceptamos Undo/Redo: allí sigue actuando
     * el deshacer nativo de la edición.
     */
    if (!commandKey) {
      return;
    }

    if (key === "z") {
      event.preventDefault();

      if (event.shiftKey) {
        redoLastChange();
      } else {
        undoLastChange();
      }
    } else if (key === "y") {
      event.preventDefault();
      redoLastChange();
    }
  });

  window.addEventListener("resize", () => {
    if (currentSvg) applyPedigreeViewportSizing(currentSvg,container);
  }, {passive:true});

  updatePedigreeZoomIndicator();
}

/* ============================================================
 * 0.8.62 - QC automático en directo, no certificación clínica.
 * El semáforo solo muestra el resultado de la comprobación más reciente.
 * No se almacena el QC en la familia ni se abre el panel al modificar.
 * ============================================================ */
let qcLastResult = null;
let qcLiveTimer = null;
let qcLayoutAvailable = true;
let qcRenderError = "";
const qcSvgGeometryCache = new WeakMap();

function qcTrafficState(result) {
  if (!result) return "pending";
  if (result.status === "empty") return "empty";
  if (result.status === "unavailable") return "error";
  if (result.counts.error > 0) return "error";
  if (result.counts.warning > 0) return "warning";
  if (result.counts.info > 0) return "info";
  return "ok";
}

function updateLiveQcIndicator() {
  const btn = $("validatePedigreeBtn");
  const mini = $("qcMiniIndicator");
  if (!btn) return;

  const result = qcLastResult;
  const state = qcTrafficState(result);
  const label = !result ? t("qc.indicator.pending")
    : state === "empty" ? t("qc.indicator.empty")
    : t("qc.indicator.counts",{errors:result.counts.error,warnings:result.counts.warning,notes:result.counts.info});
  const layoutIssues = result ? result.issues.filter(issue => issue.category === "layout").length : 0;

  btn.dataset.qcState = state;
  btn.classList.toggle("qc-has-layout-issues", layoutIssues > 0);
  btn.title = t("qc.indicator.title",{
    label, graphics:layoutIssues ? t("qc.indicator.graphics",{count:layoutIssues}) : "",
    action:$("pedigreeQcPanel").hidden ? t("qc.action.open") : t("qc.action.close")
  });
  btn.setAttribute("aria-label", t("qc.indicator.aria",{label}));

  if (mini) {
    mini.hidden = !result || state === "empty";
    mini.textContent = state === "error"
      ? t("qc.mini.errors",{errors:result.counts.error,warnings:result.counts.warning})
      : state === "warning" ? t("qc.mini.warnings",{warnings:result.counts.warning,notes:result.counts.info})
      : state === "info" ? t("qc.mini.info",{notes:result.counts.info})
      : state === "ok" ? t("qc.mini.ok") : t("qc.mini.pending");
    mini.className = "qc-mini-indicator qc-mini-" + (state === "empty" ? "pending" : state);
    mini.title = t("qc.mini.title",{label});
    mini.setAttribute("aria-label", t("qc.mini.aria",{label}));
  }
}

function closePedigreeQc() {
  $("pedigreeQcPanel").hidden = true;
  $("validatePedigreeBtn").setAttribute("aria-expanded", "false");
  $("validatePedigreeBtn").classList.remove("is-active");
  updateLiveQcIndicator();
}

function scheduleLivePedigreeQc(layoutAvailable = true) {
  qcLayoutAvailable = layoutAvailable;
  if (qcLiveTimer !== null) clearTimeout(qcLiveTimer);
  // Varias ediciones seguidas se agrupan para mantener fluida la interfaz.
  qcLiveTimer = setTimeout(recalculateLivePedigreeQc, 140);
}

function collectQcSvgGeometry(svg) {
  const result={textIssues:[],boundsIssue:false};
  if (!svg || typeof svg.getBBox !== "function") return result;
  if (qcSvgGeometryCache.has(svg)) return qcSvgGeometryCache.get(svg);
  try {
    const bounds=svg.getBBox();
    const values=String(svg.getAttribute("viewBox")||"").trim().split(/[\s,]+/).map(Number);
    if (values.length===4 && values.every(Number.isFinite)) {
      result.boundsIssue=bounds.x < values[0]-2 || bounds.y < values[1]-2 ||
        bounds.x+bounds.width > values[0]+values[2]+2 || bounds.y+bounds.height > values[1]+values[3]+2;
    }
    const nodes=[...svg.querySelectorAll("g.person[data-uid]")];
    const symbols=nodes.map(node=>({uid:node.getAttribute("data-uid"),box:node.querySelector(".person-shape")?.getBBox()}))
      .filter(e=>e.box && e.box.width > 0 && e.box.height > 0);
    const textSelectors=".person-label, .person-alias, .person-brief-info, .person-subtext, .pregnancy-loss-label";
    const marked=new Set();
    for (const node of nodes) {
      const uid=node.getAttribute("data-uid");
      for (const txt of node.querySelectorAll(textSelectors)) {
        const a=txt.getBBox();
        if (!a.width || !a.height) continue;
        for (const {uid:other,box:b} of symbols) {
          if (uid===other) continue;
          const overlapX=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);
          const overlapY=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
          if (overlapX>3 && overlapY>3) {
            const key=`${uid}/${other}`;
            if (marked.has(key)) continue;
            marked.add(key);
            result.textIssues.push({uids:[uid,other],detail:t("qc.geometry.labelOverlap",{first:pedigreeDisplayName(uid),second:pedigreeDisplayName(other)})});
          }
        }
      }
    }
  } catch(err) { console.warn(t("label.qc.geometryUnavailable"),err); }
  qcSvgGeometryCache.set(svg, result);
  return result;
}

function openQcPerson(uid) {
  if (!personByUid(uid)) return;
  selectPerson(uid, {scrollToClinical:false, syncSearch:true});
  const pedigree = document.querySelector(".pedigree-card");
  if (pedigree) pedigree.scrollIntoView({behavior:"smooth",block:"center"});
  centerPedigreeOnPerson(uid);
}

/* 0.8.64: etiquetas de QC basadas en la numeración del layout actual.
 * Los UID internos se mantienen para relaciones, navegación y persistencia.
 * Si no se ha podido calcular layout, se conserva el identificador de reserva.
 */
function qcPedigreeDisplayLabel(uid) {
  const person = personByUid(uid);
  if (!person) return uid;
  const number = currentNumbers.get(uid) || "";
  const description = String(person.label || "").trim() ||
    (recordType(person) === "person" ? "" : unnumberedDisplayName(uid));
  return number
    ? `${number}${description ? ` - ${description}` : ""}`
    : (description || uid);
}

function recalculateLivePedigreeQc() {
  if (qcLiveTimer !== null) {
    clearTimeout(qcLiveTimer);
    qcLiveTimer = null;
  }
  if (!window.PedigrAPPQC) {
    qcLastResult = {
      status: "unavailable", counts: {error:1, warning:0, info:0},
      issues: [{severity:"error", category:"structure", code:"QC_UNAVAILABLE",
        title:t("label.qc.unavailable"), detail:"No se ha podido cargar pedigree-qc.js.",
        source:"PedigrAPP", uids:[]}]
    };
  } else {
    try {
      qcLastResult = window.PedigrAPPQC.analyze(family, {
        positions: qcLayoutAvailable && currentLayout ? currentLayout.pos : null,
        svgGeometry: qcLayoutAvailable ? collectQcSvgGeometry(currentSvg) : null,
        // No depende de la preferencia «Mostrar numeración»: el QC siempre
        // identifica los registros mediante I-1, II-3… y su nombre si existe.
        displayLabels: new Map(family.people.map(p => [p.uid, qcPedigreeDisplayLabel(p.uid)]))
      });
    } catch (err) {
      console.error(t("label.qc.automatic"), err);
      qcLastResult = {
        status: "unavailable", counts: {error:1, warning:0, info:0},
        issues: [{severity:"error", category:"structure", code:"QC_RUNTIME_ERROR",
          title:"No se ha podido completar el QC", detail:err.message || String(err),
          source:"PedigrAPP", uids:[]}]
      };
    }
  }
  if (qcRenderError && qcLastResult && qcLastResult.status !== "unavailable") {
    qcLastResult.issues.unshift({
      severity:"error", category:"layout", code:"QC_RENDER_ERROR",
      title:"No se ha podido dibujar el pedigree",
      detail:qcRenderError,
      source:t("label.qc.renderer"), uids:[]
    });
    qcLastResult.counts.error++;
  }
  updateLiveQcIndicator();
  // Un pedigree que cambia no abre jamás el panel. Si estaba abierto, se
  // actualiza respetando en lo posible la posición del lector.
  if (!$("pedigreeQcPanel").hidden) paintPedigreeQcDetails();
}

function paintPedigreeQcDetails() {
  const summary = $("pedigreeQcSummary");
  const list = $("pedigreeQcIssues");
  const previousScrollTop = list.scrollTop;
  summary.replaceChildren();
  list.replaceChildren();
  const result = qcLastResult;
  if (!result) {
    summary.textContent = t("qc.loading");
    return;
  }
  const heading = document.createElement("strong");
  heading.textContent = result.status === "unavailable"
    ? t("qc.heading.unavailable")
    : result.status === "empty"
    ? t("qc.heading.empty")
    : result.counts.error ? t("qc.heading.error")
    : result.counts.warning ? t("qc.heading.warning")
    : t("qc.heading.clear");
  summary.appendChild(heading);

  const totals = document.createElement("span");
  totals.className = "pedigree-qc-totals";
  const graphic = result.issues.filter(issue => issue.category === "layout").length;
  totals.textContent = t("qc.totals", {errors:result.counts.error,warnings:result.counts.warning,notes:result.counts.info,graphics:graphic});
  summary.appendChild(totals);

  for (const issue of result.issues) {
    const item = document.createElement("article");
    item.className = `pedigree-qc-issue qc-${issue.severity}`;
    const title = document.createElement("h3");
    const prefix = t("qc.severity." + issue.severity);
    const categoryName = t("qc.category." + issue.category);
    title.textContent = `${prefix} · ${issue.title}`;
    const category = document.createElement("span");
    category.className = "pedigree-qc-category";
    category.textContent = categoryName;
    item.appendChild(category);
    item.appendChild(title);
    const explanation = document.createElement("p");
    explanation.textContent = issue.detail;
    item.appendChild(explanation);
    const footer = document.createElement("div");
    footer.className = "pedigree-qc-issue-footer";
    const source = document.createElement("span");
    source.className = "pedigree-qc-source";
    const qcSourceMap = {
      "Integridad de datos · PedigrAPP":"qc.source.integrity",
      "Bennett et al., 2022, figura 3; corrección de 2025, figura 3":"qc.source.relations",
      "Bennett et al., 2022, figura 2; corrección de 2025, figura 2":"qc.source.conditions",
      "Corrección de 2025, figura 4":"qc.source.pregnancy",
      "Corrección de 2025, figura 5":"qc.source.art",
      "Corrección de 2025, figuras 1 y 2":"qc.source.clinical"
    };
    source.textContent = `${issue.code} · ${qcSourceMap[issue.source] ? t(qcSourceMap[issue.source]) : issue.source}`;
    footer.appendChild(source);
    const uid = (issue.uids || []).find(id => personByUid(id));
    if (uid) {
      const find = document.createElement("button");
      find.type = "button";
      find.className = "pedigree-qc-person-link";
      find.textContent = t("qc.find",{person:qcPedigreeDisplayLabel(uid)});
      find.addEventListener("click", () => openQcPerson(uid));
      footer.appendChild(find);
    }
    item.appendChild(footer);
    list.appendChild(item);
  }
  if (!result.issues.length) {
    const done = document.createElement("p");
    done.className = "pedigree-qc-empty";
    done.textContent = t("qc.noIssues");
    list.appendChild(done);
  }
  list.scrollTop = previousScrollTop;
}

function openPedigreeQc() {
  // Evitar mostrar datos desfasados si aún no ha vencido el debounce.
  if (qcLiveTimer !== null || !qcLastResult) recalculateLivePedigreeQc();
  $("pedigreeQcPanel").hidden = false;
  $("validatePedigreeBtn").setAttribute("aria-expanded", "true");
  $("validatePedigreeBtn").classList.add("is-active");
  paintPedigreeQcDetails();
  updateLiveQcIndicator();
}

function togglePedigreeQc() {
  if ($("pedigreeQcPanel").hidden) openPedigreeQc();
  else closePedigreeQc();
}

$("validatePedigreeBtn").addEventListener("click", togglePedigreeQc);
$("pedigreeQcRefreshBtn").addEventListener("click", recalculateLivePedigreeQc);
$("qcMiniIndicator").addEventListener("click", togglePedigreeQc);
$("pedigreeQcCloseBtn").addEventListener("click", closePedigreeQc);

function renderPedigree() {
  qcRenderError = "";
  hideConditionHoverCard();
  hideRelationshipActionMenu();

  try {
    validate(family);
    const layout = calculateLayout();
    currentLayout = layout;

    const numbers = assignPedigreeNumbers(layout);

    const svg = svgEl("svg", {
      xmlns:svgNS,
      viewBox:`0 0 ${layout.width} ${layout.height}`,
      class:"pedigree-svg"
    });

    const defs = svgEl("defs");
    const marker = svgEl("marker", {
      id:"arrowhead",
      markerWidth:8, markerHeight:8,
      refX:6, refY:3,
      orient:"auto",
      markerUnits:"strokeWidth"
    });
    marker.appendChild(svgEl("path", {
      d:"M0,0 L0,6 L7,3 z",
      fill:"#111"
    }));
    defs.appendChild(marker);
    addConditionPatternDefs(defs);
    svg.appendChild(defs);

    Array.from(layout.byGen.keys()).sort((a,b)=>a-b).forEach(gen => {
      svg.appendChild(svgEl("text", {
        x:54,
        y:C.marginTop + gen*C.generationGap + 5,
        class:"generation-label"
      }, roman(gen+1)));
    });

    family.relationships.filter(r=>r.type==="union")
      .forEach(r=>drawUnion(svg,r,layout.pos));

    const parentageLaneMap = buildParentageLaneMap(layout.pos);

    const pregnancyLossVisualY =
      buildPregnancyLossVisualY(
        layout.pos,
        parentageLaneMap
      );

    const parentageRenderGeometries = [];

    family.relationships
      .filter(r=>r.type==="parentage")
      .forEach(r=>drawParentage(
        svg,
        r,
        layout.pos,
        parentageLaneMap.get(r) || 0,
        parentageRenderGeometries,
        pregnancyLossVisualY
      ));
// Gestante G: contribución genética (si procede) y línea sólida
    // gestante -> embarazo.
    drawGestationalGeneticLinks(
      svg,
      layout.pos,
      pregnancyLossVisualY
    );

    drawGestationalCarrierLinks(
      svg,
      layout.pos,
      pregnancyLossVisualY
    );

    // Donación de esperma:
    // línea genética + diagonal donante -> resultado.
    drawSpermDonorMaternalLinks(
      svg,
      layout.pos,
      pregnancyLossVisualY
    );
    // In the absence of a sperm donor or existing parentage, still
    // show the gestation explicitly recorded for this outcome.
    drawExplicitGestationWithoutSpermLinks(svg,layout.pos,pregnancyLossVisualY);

    // Donación de esperma y de óvulos:
    // diagonal desde el donante hasta la parte superior del resultado.
    const siblingLaneMap = buildSiblingLaneMap(layout.pos);
    drawDonorLinks(svg,layout.pos,pregnancyLossVisualY,
      parentageLaneMap,siblingLaneMap);

    family.relationships
      .filter(r=>r.type==="sibling")
      .forEach(r=>drawSiblingGroup(
        svg,
        r,
        layout.pos,
        siblingLaneMap.get(r) || 0
      ));

    // Detector general, ejecutado cuando TODAS las líneas estructurales
    // (incluidos donantes/gestantes y diagonales) ya están en el SVG.
    drawAllStructuralCrossingBridges(svg);

    family.people.forEach(p => {
      const position = layout.pos.get(p.uid);
      if (!position) return;

      if (pregnancyLossVisualY.has(p.uid)) {
        drawPerson(
          svg,
          p,
          {
            ...position,
            y:pregnancyLossVisualY.get(p.uid)
          },
          numbers,
          layout.pos
        );
      } else {
        drawPerson(svg,p,position,numbers,layout.pos);
      }
    });

    const pedigreeContainer =
      $("pedigreeContainer");

    const previousViewportCenter =
      capturePedigreeViewportCenter(pedigreeContainer);

    pedigreeContainer.replaceChildren(svg);

    // Una vez insertado en el DOM podemos medir el contenido real
    // (símbolos, líneas y textos) y hacer simétricos los márgenes
    // verticales del área del pedigree.
    equalizePedigreeVerticalMargins(svg);

    /*
     * En árboles grandes no reducimos indefinidamente el SVG para que
     * quepa en la tarjeta. A partir de una escala mínima conservamos
     * el tamaño de los símbolos y aparece scroll horizontal.
     */
    applyPedigreeViewportSizing(
      svg,
      pedigreeContainer
    );

    currentSvg = svg;

    /*
     * Conservamos zoom y centro visual tras cualquier edición/re-render.
     * Si es el primer render, el pedigree queda centrado al 100 %.
     */
    restorePedigreeViewportCenter(
      pedigreeContainer,
      previousViewportCenter
    );
    updatePedigreeZoomIndicator();

    $("status").textContent = family.people.length ? "" : t('layout.empty');
    $("status").className = "status";

    renderPeopleTable();
    updateRelationSelectors();
    renderRelations();
    updateEditorListCounts();
    renderConditionsManager();
    updatePedigreeSearchOptions();

    if (selectedPersonUid && !personByUid(selectedPersonUid)) {
      clearPersonSelection();
    } else {
      updateNotesPanel();
      syncPedigreeSearchFromSelection();
    }

    updateFamilyReviewIndicator();
    updateUnsavedIndicator();
    updateManualLayoutResetButton();
    scheduleLivePedigreeQc();
  } catch (e) {
    console.error(e);
    $("status").textContent = "Error: " + e.message;
    $("status").className = "status error";
    qcRenderError = e.message || String(e);
    scheduleLivePedigreeQc(false);
  }
}

function updateEditorListCounts() {
  const node = $("editorListsCount");
  if (!node) return;

  const peopleCount =
    Array.isArray(family.people)
      ? family.people.length
      : 0;

  const relationCount =
    Array.isArray(family.relationships)
      ? family.relationships.length
      : 0;

  node.textContent =
    t(peopleCount===1?"review.peopleCountSingular":"review.peopleCount",{count:peopleCount})+" · " +
    t(relationCount===1?"review.relationCountSingular":"review.relationCount",{count:relationCount});
}

function renderPeopleTable() {
  const tbody = $("peopleTableBody");
  tbody.replaceChildren();

  family.people.forEach(p => {
    const tr = document.createElement("tr");

    const num = document.createElement("td");
    num.textContent = currentNumbers.get(p.uid) || p.uid;

    const alias = document.createElement("td");
    alias.textContent =
      recordType(p) === "person"
        ? (p.label || "—")
        : (isDonorRecord(p)
            ? (
                p.label
                  ? `${donorRecordLabel(p)} · ${p.label}`
                  : donorRecordLabel(p)
              )
            : (isGestationalCarrierRecord(p)
                ? gestationalCarrierLabel(p)
                : (recordType(p) === "multiple"
                    ? multipleIndividualsLabel(p)
                    : reproductiveEventLabel(p))));

    const actionsTd = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "person-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = t('action.edit');
    edit.onclick = () => editPerson(p.uid);

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = t('action.delete');
    del.onclick = () => deletePerson(p.uid);

    actions.append(edit,del);
    actionsTd.appendChild(actions);
    tr.append(num,alias,actionsTd);
    tbody.appendChild(tr);
  });
}


function updatePersonReproductiveFields() {
  const isPerson = $("recordType").value === "person";
  const status = $("personReproductiveStatus").value;
  const active = isPerson && status !== "none";

  $("personReproductiveReasonField").classList.toggle(
    "hidden",
    !active
  );
}


function updateGestationTargetOptions(
  preferredValue=null
) {
  const select = $("gestationTarget");
  if (!select) return;

  const editingUid = $("editingUid").value || "";
  const wanted =
    preferredValue !== null
      ? preferredValue
      : select.value;

  select.replaceChildren(
    new Option("— Seleccionar —","")
  );

  family.people
    .filter(p =>
      p.uid !== editingUid &&
      [
        "fetus",
        "stillbirth",
        "sab",
        "top",
        "ect"
      ].includes(recordType(p))
    )
    .forEach(p => {
      select.appendChild(
        new Option(
          displayName(p.uid),
          p.uid
        )
      );
    });

  if (
    [...select.options]
      .some(o => o.value === wanted)
  ) {
    select.value = wanted;
  }
}


function selectedDonationTargetUids() {
  const donorType =
    $("recordType").value;

  if (false && donorType === "sperm_donor") {
    const container =
      $("donationTargetsCheckboxes");

    if (!container) return [];

    return [
      ...container.querySelectorAll(
        'input[type="checkbox"][data-donation-target]:checked'
      )
    ]
      .map(input =>
        String(input.value || "").trim()
      )
      .filter(Boolean);
  }

  const select =
    $("donationTarget");

  if (!select) return [];

  const value =
    String(
      select.value || ""
    ).trim();

  return value
    ? [value]
    : [];
}

function updateDonationTargetOptions(
  preferredValues=null
) {
  const select =
    $("donationTarget");

  const checkboxContainer =
    $("donationTargetsCheckboxes");

  if (
    !select ||
    !checkboxContainer
  ) {
    return;
  }

  const editingUid =
    $("editingUid").value || "";

  const donorType =
    $("recordType").value;

  // Gestión multidescendiente solo en Relaciones avanzadas / … Más.
  const isSpermDonor = false;

  let wanted;

  if (
    preferredValues !== null
  ) {
    wanted =
      Array.isArray(preferredValues)
        ? preferredValues
        : [preferredValues];
  } else {
    wanted =
      selectedDonationTargetUids();
  }

  wanted =
    [...new Set(
      wanted
        .map(value =>
          String(value || "").trim()
        )
        .filter(Boolean)
    )];

  const candidates =
    family.people
      .filter(p =>
        p.uid !== editingUid &&
        [
          "person",
          "fetus",
          "stillbirth",
          "sab",
          "top",
          "ect"
        ].includes(recordType(p))
      );

  select.replaceChildren();
  checkboxContainer.replaceChildren();

  if (isSpermDonor) {
    select.classList.add(
      "hidden"
    );

    checkboxContainer.classList.remove(
      "hidden"
    );

    $("donationTargetLabel")
      .textContent =
        "Hijos / fetos / embarazos resultantes";

    $("donationTargetHelp")
      .textContent =
        t("help.donation.spermTarget");

    if (!candidates.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "field-help";

      empty.textContent =
        t("validation.donation.noOutcomes");

      checkboxContainer.appendChild(
        empty
      );

      return;
    }

    candidates.forEach(p => {
      const row =
        document.createElement("div");

      row.className =
        "donation-target-checkbox-item";

      const input =
        document.createElement("input");

      input.type = "checkbox";
      input.value = p.uid;
      input.dataset.donationTarget =
        "1";
      input.id =
        `donationTarget_${p.uid}`;

      input.checked =
        wanted.includes(p.uid);

      const label =
        document.createElement("label");

      label.htmlFor =
        input.id;

      label.textContent =
        displayName(p.uid);

      row.appendChild(input);
      row.appendChild(label);

      checkboxContainer.appendChild(row);
    });

    return;
  }

  checkboxContainer.classList.add(
    "hidden"
  );

  select.classList.remove(
    "hidden"
  );

  select.appendChild(
    new Option(
      "— Seleccionar —",
      ""
    )
  );

  $("donationTargetLabel")
    .textContent =
      "Hijo / feto / embarazo resultante";

  $("donationTargetHelp")
    .textContent =
      donorType === "ovum_donor_surrogate"
        ? t("help.donation.surrogateTarget")
        : t("help.donation.ovumTarget");

  candidates.forEach(p => {
    select.appendChild(
      new Option(
        displayName(p.uid),
        p.uid
      )
    );
  });

  if (wanted.length) {
    select.value = wanted[0];
  }
  if (editingUid && isDonorRecord(personByUid(editingUid)) &&
      donationTargetUids(personByUid(editingUid)).length > 1) {
    select.disabled = true;
    $("donationTargetHelp").textContent = t("help.sharedDonor.editAdvanced");
  } else {
    select.disabled = false;
  }
}

function selectedIntendedParentUids() {
  const list = $("intendedParentCheckboxes");
  return list
    ? [...list.querySelectorAll('input[type="checkbox"]:checked')]
        .map(item => item.value)
    : [];
}

function updateIntendedParentOptions(preferredValues=null) {
  const list = $("intendedParentCheckboxes");
  if (!list) return;
  const wanted = preferredValues === null
    ? selectedIntendedParentUids()
    : preferredValues;
  const values = new Set(wanted);
  const editingUid = $("editingUid").value;
  list.replaceChildren();
  const candidates = family.people.filter(p =>
    recordType(p) === "person" && p.uid !== editingUid
  );
  if (!candidates.length) {
    const hint = document.createElement("small");
    hint.className = "field-help";
    hint.textContent = t("validation.intendedParent.addFirst");
    list.appendChild(hint);
    return;
  }
  candidates.forEach(p => {
    const row = document.createElement("label");
    row.className = "intended-parent-item";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = p.uid;
    input.checked = values.has(p.uid);
    row.appendChild(input);
    row.appendChild(document.createTextNode(displayName(p.uid)));
    list.appendChild(row);
  });
}

function updateRecordTypeFields() {
  const type = $("recordType").value;
  const isSurrogate = type === "ovum_donor_surrogate";
  const isPerson = type === "person";
  const isMultiple = type === "multiple";
  const isFetus = type === "fetus";
  const isStillbirth = type === "stillbirth";
  const isFetalEvent = isFetus || isStillbirth;
  const isDonor =
    type === "sperm_donor" ||
    type === "ovum_donor" ||
    isSurrogate;
  const isGestationalCarrier =
    type === "gestational_carrier";

  const isPersonOrMultiple =
    isPerson ||
    isMultiple ||
    isDonor;

  const isPersonBasic =
    isPerson ||
    isDonor ||
    isGestationalCarrier;

  const supportsLabel =
    isPersonBasic ||
    ["multiple","fetus","stillbirth","sab","top","ect"].includes(type);

  const supportsBriefInfo =
    supportsLabel;

  const isPregnancyEvent =
    ["fetus","stillbirth","sab","top","ect"].includes(type);

  document.querySelectorAll(".person-only-field").forEach(node => {
    node.classList.toggle("hidden", !isPerson);
  });

  document.querySelectorAll(".person-basic-field").forEach(node => {
    node.classList.toggle("hidden", !isPersonBasic);
  });

  document.querySelectorAll(".person-label-field").forEach(node => {
    node.classList.toggle("hidden", !supportsLabel);
  });

  document.querySelectorAll(".brief-info-field").forEach(node => {
    node.classList.toggle("hidden", !supportsBriefInfo);
  });

  document.querySelectorAll(".person-or-multiple-field").forEach(node => {
    node.classList.toggle("hidden", !isPersonOrMultiple);
  });

  document.querySelectorAll(".multiple-only-field").forEach(node => {
    node.classList.toggle("hidden", !isMultiple);
  });

  document.querySelectorAll(".fetus-only-field").forEach(node => {
    node.classList.toggle("hidden", !isFetalEvent);
  });

  document.querySelectorAll(".donor-only-field").forEach(node => {
    node.classList.toggle("hidden", !isDonor);
  });

  document.querySelectorAll(".gestational-carrier-only-field").forEach(node => {
    node.classList.toggle("hidden", !isGestationalCarrier);
  });

  document.querySelectorAll(".pregnancy-loss-only-field").forEach(node => {
    node.classList.toggle("hidden", !isPregnancyEvent);
  });

  document.querySelectorAll(".intended-parent-field").forEach(node => {
    node.classList.toggle("hidden", !INTENDED_PARENT_TARGET_TYPES.has(type));
  });
  if (INTENDED_PARENT_TARGET_TYPES.has(type)) {
    updateIntendedParentOptions();
  }

  if (!isPerson) {
    $("consultand").checked = false;
    $("proband").checked = false;
    $("familyHistoryUnknown").checked = false;
    $("personReproductiveStatus").value = "none";
    $("personReproductiveReason").value = "";
  }

  if (isDonor) {
    updateDonationTargetOptions();
  }

  if (isGestationalCarrier) {
    updateGestationTargetOptions();
  }

  updatePersonReproductiveFields();

  refreshRecordFormTexts();
}

function refreshRecordFormTexts() {
  // Update labels only: must never reset fields in an already-open form.
  const type = $("recordType").value;
  const isPerson = type === "person";
  const isMultiple = type === "multiple";
  const isFetus = type === "fetus";
  const isStillbirth = type === "stillbirth";
  const isGestationalCarrier = type === "gestational_carrier";
  const isSurrogate = type === "ovum_donor_surrogate";
  const isDonor = type === "sperm_donor" || type === "ovum_donor" || isSurrogate;
  if ($("editingUid").value) {
    $("submitPersonBtn").textContent = t("action.record.saveChanges");
    $("personFormTitle").textContent = t("action.editor.editName",{name:displayName($("editingUid").value)});
  } else if (isPerson) {
    $("submitPersonBtn").textContent = t("label.record.addPerson");
    $("personFormTitle").textContent = t("label.record.addPerson");
  } else if (isMultiple) {
    $("submitPersonBtn").textContent = t("label.record.addMultiple");
    $("personFormTitle").textContent = t("label.record.addMultiple");
  } else if (isFetus) {
    $("submitPersonBtn").textContent = t("label.record.addFetus");
    $("personFormTitle").textContent = t("label.record.addFetus");
  } else if (isStillbirth) {
    $("submitPersonBtn").textContent = t("label.record.addStillbirth");
    $("personFormTitle").textContent = t("label.record.addStillbirth");
  } else if (isGestationalCarrier) {
    $("submitPersonBtn").textContent = t("action.record.addGestationalCarrier");
    $("personFormTitle").textContent = t("action.record.addGestationalCarrier");
  } else if (isSurrogate) {
    $("submitPersonBtn").textContent = t("action.record.addSurrogate");
    $("personFormTitle").textContent = t("action.record.addSurrogate");
  } else if (isDonor) {
    const donorLabel =
      type === "ovum_donor"
        ? t("label.donor.ovum")
        : t("label.donor.sperm");

    $("submitPersonBtn").textContent =
      t(type === "ovum_donor" ? "label.record.addOvumDonor" : "label.record.addSpermDonor");

    $("personFormTitle").textContent =
      t(type === "ovum_donor" ? "label.record.addOvumDonor" : "label.record.addSpermDonor");
  } else {
    const eventLabel = {
      sab:"SAB",
      top:"TOP",
      ect:"ECT"
    }[type] || t("label.record.gestationalEvent");

    $("submitPersonBtn").textContent =
      t("label.record.addPregnancyEvent",{event:eventLabel});

    $("personFormTitle").textContent =
      t("label.record.addPregnancyEvent",{event:eventLabel});
  }
}

const MANAGEMENT_DISCLOSURE_IDS = [
  "creationCardDisclosure",
  "relationCard",
  "editorListsDisclosure"
];

function managementDisclosures() {
  return MANAGEMENT_DISCLOSURE_IDS
    .map(id => $(id))
    .filter(Boolean);
}

function openManagementDisclosure(
  id,
  {
    scroll=false
  }={}
) {
  const target =
    $(id);

  if (!target) {
    return false;
  }

  managementDisclosures()
    .forEach(details => {
      details.open =
        details === target;
    });

  if (scroll) {
    target.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }

  return true;
}

function installManagementAccordion() {
  managementDisclosures()
    .forEach(details => {
      details.addEventListener(
        "toggle",
        () => {
          if (!details.open) {
            return;
          }

          managementDisclosures()
            .forEach(other => {
              if (
                other !== details &&
                other.open
              ) {
                other.open = false;
              }
            });
        }
      );
    });
}

function resetPersonForm() {
  $("personForm").reset();
  $("editingUid").value = "";
  $("personFormTitle").textContent = t("label.record.addPerson");
  $("cancelEditBtn").hidden = true;

  const advanced = $("personAdvancedDetails");

  if (advanced) advanced.open = false;

  updateRecordTypeFields();
}

function editPerson(uid) {
  const p = personByUid(uid);
  if (!p) return;

  $("editingUid").value = uid;
  $("recordType").value = isSurrogateOvumDonor(p)
    ? "ovum_donor_surrogate"
    : recordType(p);
  $("personLabel").value = p.label || "";
  $("briefInfo").value = p.brief_info || "";
  $("gender").value = p.gender || "unspecified";
  $("sexAtBirth").value = p.sex_at_birth || "";
  $("fetalSex").value =
    ["fetus","stillbirth"].includes(recordType(p))
      ? (["man","woman","unspecified"].includes(p.gender)
          ? p.gender
          : "unspecified")
      : "unspecified";
  $("multipleCount").value =
    p.multiple_count ?? "";
  $("age").value = p.age ?? "";
  $("birthYear").value = p.birth_year ?? "";
  $("gestationalAge").value = p.gestational_age_weeks ?? "";
  $("birthOrder").value = p.birth_order ?? "";
  $("generationOverride").value = p.generation_override ?? "";
  $("consultand").checked = !!p.consultand;
  $("proband").checked = !!p.proband;
  $("deceased").checked = !!p.deceased;
  $("familyHistoryUnknown").checked = !!p.family_history_unknown;
  $("personReproductiveStatus").value =
    p.reproductive_status || "none";
  $("personReproductiveReason").value =
    p.reproductive_reason || "";

  $("personFormTitle").textContent = t("action.editor.editName",{name:displayName(uid)});
  $("cancelEditBtn").hidden = false;
  updateRecordTypeFields();
  updateIntendedParentOptions(intendedParentUids(p));

  const advanced = $("personAdvancedDetails");

  if (advanced) {
    advanced.open = !!(
      p.birth_order != null ||
      p.generation_override != null ||
      intendedParentUids(p).length > 0 ||
      (
        recordType(p) === "person" &&
        (
          (p.reproductive_status || "none") !== "none" ||
          String(p.reproductive_reason || "").trim()
        )
      )
    );
  }

  if (isDonorRecord(p)) {
    updateDonationTargetOptions(
      donationTargetUids(p)
    );
  }

  if (isGestationalCarrierRecord(p)) {
    updateGestationTargetOptions(
      gestationTargetUid(p) || ""
    );
  }

  // 0.8.59 — el formulario ya no vive en un panel lateral.
  // Al editar desde tabla o tooltip, llevamos la tarjeta horizontal a la vista.
  const creationCard =
    $("creationCardDisclosure") ||
    document.querySelector(
      ".creation-card"
    );

  if (creationCard) {
    openManagementDisclosure(
      "creationCardDisclosure"
    );

    creationCard.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }
}

function deletePerson(uid) {
  if (!confirm(t('confirm.person.delete',{name:displayName(uid)}))) return;

  pushUndoState();

  if (selectedPersonUid === uid) {
    selectedPersonUid = null;
  }

  family.people = family.people.filter(p => p.uid !== uid);
  delete manualHorizontalOverrides()[uid];

  // Si se borra el resultado de una donación, el donante permanece
  // pero queda sin vínculo hasta que se edite de nuevo.
  family.people.forEach(p => {
    if (Array.isArray(p.intended_parent_uids)) {
      p.intended_parent_uids = p.intended_parent_uids.filter(id => id !== uid);
    }
    if (isDonorRecord(p)) {
      p.donation_targets = donationTargetUids(p).filter(targetUid => targetUid !== uid);
      p.donation_target = isSurrogateOvumDonor(p)
        ? (p.donation_targets[0] || null) : null;
    }

    if (
      isGestationalCarrierRecord(p) &&
      gestationTargetUid(p) === uid
    ) {
      p.gestation_target = null;
    }
  });

  family.relationships = family.relationships.map(r => {
    if (r.type === "union") {
      return {...r, people:(r.people||[]).filter(x=>x!==uid)};
    }

    if (r.type === "parentage") {
      return {
        ...r,
        parents:(r.parents||[]).filter(x=>x!==uid),
        children:(r.children||[]).filter(x=>x!==uid)
      };
    }

    if (r.type === "sibling") {
      return {
        ...r,
        members:(r.members||[]).filter(x=>x!==uid)
      };
    }

    if (r.type === "twin") {
      return {
        ...r,
        members:(r.members||[]).filter(x=>x!==uid)
      };
    }

    return r;
  }).filter(r => {
    if (r.type === "gestation") {
      return r.carrier !== uid && r.target !== uid;
    }
    if (r.type === "union") return (r.people||[]).length === 2;
    if (r.type === "parentage") {
      return (r.parents||[]).length > 0 && (r.children||[]).length > 0;
    }
    if (r.type === "sibling") return (r.members||[]).length >= 2;
    if (r.type === "twin") {
      const expected =
        r.zygosity === "trizygotic" ? 3 : 2;
      return (r.members || []).length === expected;
    }
    return true;
  });

  pruneManualBranchOrders();

  resetPersonForm();
  renderPedigree();
}

$("quickAddManBtn").addEventListener(
  "click",
  () => quickAddSinglePerson("man")
);

$("quickAddWomanBtn").addEventListener(
  "click",
  () => quickAddSinglePerson("woman")
);

$("quickAddProbandManBtn").addEventListener(
  "click",
  () => quickAddRecord(
    "person",
    {
      gender:"man",
      sexAtBirth:"male",
      proband:true
    },
    t("message.person.probandMale")
  )
);

$("quickAddProbandWomanBtn").addEventListener(
  "click",
  () => quickAddRecord(
    "person",
    {
      gender:"woman",
      sexAtBirth:"female",
      proband:true
    },
    t("message.person.probandFemale")
  )
);

$("quickAddConsultandManBtn").addEventListener(
  "click",
  () => quickAddRecord(
    "person",
    {
      gender:"man",
      sexAtBirth:"male",
      consultand:true
    },
    t("message.person.consultandMale")
  )
);

$("quickAddConsultandWomanBtn").addEventListener(
  "click",
  () => quickAddRecord(
    "person",
    {
      gender:"woman",
      sexAtBirth:"female",
      consultand:true
    },
    t("message.person.consultandFemale")
  )
);

$("quickAddCoupleBtn").addEventListener(
  "click",
  quickAddMaleFemaleCouple
);

$("quickAddCouple1SonBtn").addEventListener(
  "click",
  () => quickAddCoupleWithChildren(
    "man",
    1
  )
);

$("quickAddCouple1DaughterBtn").addEventListener(
  "click",
  () => quickAddCoupleWithChildren(
    "woman",
    1
  )
);

$("quickAddCouple3SonsBtn").addEventListener(
  "click",
  () => quickAddCoupleWithThreeChildren("man")
);

$("quickAddCouple3DaughtersBtn").addEventListener(
  "click",
  () => quickAddCoupleWithThreeChildren("woman")
);

$("quickAddCoupleFetusBtn").addEventListener(
  "click",
  () => quickAddCoupleWithChildren("fetus", 1)
);

$("personForm").addEventListener("submit", e => {
  e.preventDefault();

  const editing = $("editingUid").value;
  const formType = $("recordType").value;
  const isSurrogate = formType === "ovum_donor_surrogate";
  const type = isSurrogate ? "ovum_donor" : formType;
  const isPerson = type === "person";
  const isMultiple = type === "multiple";
  const isFetus = type === "fetus";
  const isStillbirth = type === "stillbirth";
  const isFetalEvent = isFetus || isStillbirth;
  const isDonor =
    type === "sperm_donor" ||
    type === "ovum_donor";
  const isGestationalCarrier =
    type === "gestational_carrier";
  const isPersonOrMultiple =
    isPerson ||
    isMultiple ||
    isDonor;
  const isPregnancyEvent =
    ["fetus","stillbirth","sab","top","ect"].includes(type);

  const p = {
    uid: editing || nextUid(),
    record_type: type,
    label:
      (
        isPerson ||
        isDonor ||
        isGestationalCarrier ||
        ["multiple","fetus","stillbirth","sab","top","ect"].includes(type)
      )
        ? $("personLabel").value.trim()
        : "",
    brief_info:
      (
        isPerson ||
        isDonor ||
        isGestationalCarrier ||
        ["multiple","fetus","stillbirth","sab","top","ect"].includes(type)
      )
        ? $("briefInfo").value.trim()
        : "",
    gender:
      isGestationalCarrier
        ? "woman"
        : (isFetalEvent
            ? $("fetalSex").value
            : (isPersonOrMultiple
                ? $("gender").value
                : "unspecified")),
    sex_at_birth:
      isGestationalCarrier
        ? ""
        : (isPersonOrMultiple
            ? $("sexAtBirth").value
            : ""),
    multiple_count:
      isMultiple && $("multipleCount").value.trim() !== ""
        ? (
            $("multipleCount").value.trim().toLowerCase() === "n"
              ? "n"
              : Number($("multipleCount").value.trim())
          )
        : null,
    donation_targets:
      isDonor && editing && isDonorRecord(personByUid(editing)) &&
      donationTargetUids(personByUid(editing)).length > 1
        ? donationTargetUids(personByUid(editing))
        : (isDonor ? selectedDonationTargetUids() : []),
    donation_target:
      isSurrogate ? (selectedDonationTargetUids()[0] || null) : null,
    gestation_target:
      isGestationalCarrier
        ? ($("gestationTarget").value || null)
        : null,
    surrogate:isSurrogate,
    intended_parent_uids:
      INTENDED_PARENT_TARGET_TYPES.has(type)
        ? selectedIntendedParentUids()
        : [],
    /*
     * La afectación general ya no se edita en este formulario.
     * Se sincroniza exclusivamente desde condition_states más abajo.
     */
    affected:false,
    consultand:
      isPerson ? $("consultand").checked : false,
    proband:
      isPerson ? $("proband").checked : false,
    deceased:
      isPerson ? $("deceased").checked : false,
    family_history_unknown:
      isPerson ? $("familyHistoryUnknown").checked : false,
    adoption_status:
      isPerson &&
      editing &&
      personByUid(editing) &&
      personByUid(editing).adoption_status === "out"
        ? "out"
        : "none",
    reproductive_status:
      isPerson
        ? $("personReproductiveStatus").value
        : "none",
    reproductive_reason:
      isPerson &&
      $("personReproductiveStatus").value !== "none"
        ? $("personReproductiveReason").value.trim()
        : "",
    birth_order:
      $("birthOrder").value === ""
        ? null
        : Number($("birthOrder").value),
    generation_override:
      $("generationOverride").value === ""
        ? null
        : Number($("generationOverride").value),
    age: (isPerson || isDonor || isGestationalCarrier) &&
      $("birthYear").value === "" && $("age").value !== ""
      ? Number($("age").value) : null,
    birth_year: (isPerson || isDonor || isGestationalCarrier) &&
      $("birthYear").value !== "" ? Number($("birthYear").value) : null,
    gestational_age_weeks:
      isPregnancyEvent &&
      $("gestationalAge").value !== ""
        ? Number($("gestationalAge").value)
        : null,
    notes:
      editing &&
      personByUid(editing)
        ? (personByUid(editing).notes || "")
        : "",
    condition_states:
      editing &&
      personByUid(editing) &&
      supportsPedigreeConditions(
        personByUid(editing)
      )
        ? normalizeConditionStates(
            personByUid(editing)
          )
        : [],
    clinical:
      editing &&
      personByUid(editing)
        ? normalizeClinicalData(personByUid(editing))
        : defaultClinicalData({
            affected:false
          })
  };

  /*
   * Fuente única de verdad:
   * "Afectado" procede de Estado respecto a cada condición.
   * Conservamos p.affected/clinical.phenotype_status solo como campos
   * derivados de compatibilidad para JSON antiguos y código legado.
   */
  p.affected =
    supportsPedigreeConditions(p)
      ? isPersonAffectedByAnyCondition(p)
      : false;

  if (p.clinical) {
    p.clinical.phenotype_status =
      p.affected
        ? "affected"
        : "unaffected";
  }

  if (
    isDonor &&
    !donationTargetUids(p).length
  ) {
    message(
      recordType(p) === "sperm_donor"
        ? t("validation.donor.selectOutcomes")
        : t("validation.donor.selectOutcome"),
      "error"
    );
    return;
  }

  if (
    isSurrogate &&
    donationTargetUid(p) &&
    family.people.some(other =>
      other.uid !== p.uid &&
      isPregnancyCarrierRecord(other) &&
      pregnancyCarrierTargetUid(other) === donationTargetUid(p)
    )
  ) {
    message(
      t("validation.pregnancy.carrierExists"),
      "error"
    );
    return;
  }

  if (
    isGestationalCarrier &&
    !p.gestation_target
  ) {
    message(
      t("validation.pregnancy.selectOutcome"),
      "error"
    );
    return;
  }

  if (
    isGestationalCarrier &&
    family.people.some(other =>
      other.uid !== p.uid &&
      isPregnancyCarrierRecord(other) &&
      pregnancyCarrierTargetUid(other) === p.gestation_target
    )
  ) {
    message(
      t("validation.pregnancy.carrierExists"),
      "error"
    );
    return;
  }

  if (p.birth_year !== null && normalizedBirthYear(p.birth_year) !== p.birth_year) {
    message(t("validation.birthYear.range"), "error");
    return;
  }

  if (isMultiple) {
    const count = normalizedMultipleCount(p);

    if (
      count !== "n" &&
      (!Number.isInteger(count) || count < 2)
    ) {
      message(
        t("validation.record.multipleCount"),
        "error"
      );
      return;
    }

    p.multiple_count = count;
  }

  if (
    p.generation_override !== null &&
    (!Number.isInteger(p.generation_override) ||
     p.generation_override < 1 ||
     p.generation_override > 20)
  ) {
    message(t("validation.layout.manualLevel"), "error");
    return;
  }

  if (
    p.gestational_age_weeks !== null &&
    (!Number.isInteger(p.gestational_age_weeks) ||
     p.gestational_age_weeks < 1 ||
     p.gestational_age_weeks > 45)
  ) {
    message(t("validation.gestationalAge.requiredRange"), "error");
    return;
  }

  if (
    isPerson &&
    p.reproductive_status === "no_children" &&
    personHasRegisteredChildren(p.uid)
  ) {
    message(
      t("validation.child.noChildrenConflict"),
      "error"
    );
    return;
  }

  if (p.intended_parent_uids.length > 2) {
    message(t("validation.intendedParent.maxSelect"),"error");
    return;
  }

  pushUndoState();

  if (editing) {
    const i = family.people.findIndex(x=>x.uid===editing);
    family.people[i] = p;
  } else {
    family.people.push(p);
  }

  if (
    isMultiple &&
    selectedPersonUid === p.uid
  ) {
    selectedPersonUid = null;
  }

  if (p.proband) {
    family.people.forEach(x => {
      if (x.uid !== p.uid) x.proband = false;
    });
  }

  resetPersonForm();
  renderPedigree();

  if (editing) {
    message("Registro actualizado.", "success");
  } else {
    message(
      isPerson
        ? "Individuo añadido."
        : (isMultiple
            ? t("message.record.multipleAdded")
            : (isFetus
                ? t("message.record.fetusAdded")
                : (isStillbirth
                    ? "Mortinato añadido."
                    : (isGestationalCarrier
                        ? t("message.record.carrierAdded")
                        : (isSurrogate
                            ? t("message.record.surrogateAdded")
                            : (isDonor
                                ? t("message.record.donorAdded")
                                : t("message.record.gestationalEventAdded"))))))),
      "success"
    );
  }
});

$("cancelEditBtn").onclick = resetPersonForm;

function updateRelationSelectors() {
  const selectA = $("relationA");
  const oldA = selectA.value;

  selectA.replaceChildren(new Option("— Seleccionar —",""));

  family.people
    .filter(p => $("relationType").value === "donates"
      ? isDonorRecord(p) && !isSurrogateOvumDonor(p)
      : ($( "relationType" ).value === "gestates"
      ? canBeExplicitGestator(p)
      : (unionLikeRelationType($("relationType").value)
        ? canFormPartnership(p)
        : ["person","gestational_carrier","multiple","fetus","stillbirth","sab","top","ect"].includes(recordType(p)))))
    .forEach(p => {
      selectA.appendChild(
        new Option(
          displayName(p.uid),
          p.uid
        )
      );
    });

  if ([...selectA.options].some(o => o.value === oldA)) {
    selectA.value = oldA;
  }

  updateRelationBList();
  if ($("relationType").value === "donates") {
    const selected = new Set(donationTargetUids(personByUid(selectA.value)));
    document.querySelectorAll('#relationBList input[type="checkbox"]')
      .forEach(input => { input.checked = selected.has(input.value); });
  }
}

function selectedRelationB() {
  return [...document.querySelectorAll(
    '#relationBList input[type="checkbox"]:checked'
  )].map(input => input.value);
}


function unionLikeRelationType(type) {
  return [
    "union",
    "ended_union",
    "consanguineous_union"
  ].includes(type);
}

function updateReproductiveAttributionOptions() {
  const select = $("reproductiveAttribution");
  if (!select) return;

  const oldValue = select.value;
  const a = $("relationA").value;
  const bs = selectedRelationB();

  select.replaceChildren(
    new Option("Pareja / no especificado","union")
  );

  if (a) {
    select.appendChild(
      new Option(displayName(a), "a")
    );
  }

  if (bs.length === 1) {
    select.appendChild(
      new Option(displayName(bs[0]), "b")
    );
  }

  if ([...select.options].some(o => o.value === oldValue)) {
    select.value = oldValue;
  }
}

function updateReproductiveRelationFields() {
  const type = $("relationType").value;
  const unionLike = unionLikeRelationType(type);
  const status = $("reproductiveStatus").value;
  const active = unionLike && status !== "none";

  $("reproductiveStatusField").classList.toggle("hidden", !unionLike);
  $("reproductiveAttributionField").classList.toggle("hidden", !active);
  $("reproductiveReasonField").classList.toggle("hidden", !active);

  updateReproductiveAttributionOptions();
}

function resetRelationReproductiveEdit() {
  editingUnionReproductiveIndex = null;
  $("relationFormTitle").textContent = "Añadir relación";
  $("relationSubmitBtn").textContent = "Añadir relación";
  $("cancelRelationEditBtn").classList.add("hidden");
  $("relationA").disabled = false;
  $("relationType").disabled = false;
  $("reproductiveStatus").value = "none";
  $("reproductiveReason").value = "";
  updateRelationTypeFields();
}

function beginUnionReproductiveEdit(index) {
  const r = family.relationships[index];

  if (!r || r.type !== "union" || !(r.people || []).length === 2) return;

  editingUnionReproductiveIndex = index;

  const relationCard =
    $("relationCard");

  if (relationCard) {
    openManagementDisclosure(
      "relationCard"
    );
  }

  $("relationFormTitle").textContent = "Editar situación reproductiva";
  $("relationSubmitBtn").textContent = "Guardar situación reproductiva";
  $("cancelRelationEditBtn").classList.remove("hidden");

  $("relationA").value = r.people[0];
  $("relationType").value = "union";
  $("relationA").disabled = true;
  $("relationType").disabled = true;

  updateRelationBList();

  document.querySelectorAll(
    '#relationBList input[type="checkbox"]'
  ).forEach(input => {
    input.checked = input.value === r.people[1];
    input.disabled = true;
  });

  $("reproductiveStatus").value =
    r.reproductive_status || "none";
  $("reproductiveReason").value =
    r.reproductive_reason || "";

  updateReproductiveRelationFields();

  const stored = r.reproductive_attribution || "union";

  if (stored === r.people[0]) {
    $("reproductiveAttribution").value = "a";
  } else if (stored === r.people[1]) {
    $("reproductiveAttribution").value = "b";
  } else {
    $("reproductiveAttribution").value = "union";
  }

  $("relationCard").scrollIntoView({
    behavior:"smooth",
    block:"start"
  });
}

function updateRelationBList() {
  const box = $("relationBList");
  if (!box) return;

  const previous = new Set(selectedRelationB());
  const selectedA = $("relationA").value;

  box.replaceChildren();

  const relationType = $("relationType").value;

  const candidates = family.people.filter(p => {
    if (p.uid === selectedA) return false;
    if (relationType === "gestates") return eligibleGestationOutcome(p);
    if (relationType === "donates") return ["person","fetus","stillbirth","sab","top","ect"].includes(recordType(p));

    if (
      relationType === "twin" &&
      recordType(p) !== "person"
    ) {
      return false;
    }

    if (unionLikeRelationType(relationType) && !canFormPartnership(p)) return false;
    if (["child","adoptive_parent","adoptive_child","adopted_out_child"].includes(relationType) &&
        !["person","gestational_carrier"].includes(recordType(p))) return false;

    if (
      relationType === "twin" &&
      selectedA &&
      !areSiblings(selectedA, p.uid)
    ) {
      return false;
    }

    return true;
  });

  if (!candidates.length) {
    const empty = document.createElement("div");
    empty.className = "field-help";
    empty.textContent = relationType === "twin" && selectedA
      ? t("validation.multipleGestation.noSiblings")
      : (family.people.length
          ? "No hay otras personas disponibles."
          : t("validation.relationship.addPeopleFirst"));
    box.appendChild(empty);
    return;
  }

  candidates.forEach(p => {
    const label = document.createElement("label");
    label.className = "multi-person-option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = p.uid;
    input.checked = previous.has(p.uid);
    input.disabled = editingUnionReproductiveIndex !== null;

    const text = document.createElement("span");
    text.textContent = displayName(p.uid);

    label.append(input, text);
    box.appendChild(label);
  });

  updateReproductiveAttributionOptions();
}

function setAllRelationB(checked) {
  document.querySelectorAll(
    '#relationBList input[type="checkbox"]'
  ).forEach(input => {
    input.checked = checked;
  });
}

function sameSet(a,b) {
  const aa=[...a].sort(), bb=[...b].sort();
  return aa.length===bb.length && aa.every((v,i)=>v===bb[i]);
}


function unionBetween(a,b) {
  return family.relationships.find(r =>
    r.type === "union" &&
    (r.people || []).includes(a) &&
    (r.people || []).includes(b)
  ) || null;
}

function setConsanguineousUnion(a,b,degree="") {
  ensureUnion(a,b);
  const rel = unionBetween(a,b);
  if (!rel) return;

  rel.consanguineous = true;
  rel.consanguinity_degree = String(degree || "").trim();
}

function setUnionStatus(a,b,status="current") {
  const normalizedStatus = ["ended","separated","divorced"].includes(status)
    ? "ended"
    : status;

  if (!["current","ended"].includes(normalizedStatus)) {
    throw new Error(t("validation.relationship.status"));
  }

  ensureUnion(a,b);
  const rel = unionBetween(a,b);
  if (!rel) return;

  rel.relationship_status = normalizedStatus;
}

function personHasIndependentPedigreeContext(
  uid,
  otherUid
) {
  const person = personByUid(uid);

  if (
    person &&
    Number.isInteger(
      person.generation_override
    ) &&
    person.generation_override >= 1
  ) {
    return true;
  }

  return family.relationships.some(r => {
    if (r.type === "union") {
      if (
        sameSet(
          r.people || [],
          [uid,otherUid]
        )
      ) {
        return false;
      }

      return (r.people || []).includes(uid);
    }

    if (r.type === "parentage") {
      const isChild =
        (r.children || []).includes(uid);

      if (isChild) {
        return true;
      }

      const isParent =
        (r.parents || []).includes(uid);

      if (!isParent) {
        return false;
      }

      /*
       * Una descendencia que ya pertenece conjuntamente a ambos miembros
       * no se usa por sí sola para declarar una unión intergeneracional.
       * Esto evita convertir en intergeneracional a una pareja ordinaria
       * cuando uno de sus miembros carece de ascendencia representada.
       */
      return !(r.parents || []).includes(otherUid);
    }

    if (
      r.type === "sibling" ||
      r.type === "twin"
    ) {
      return (r.members || []).includes(uid);
    }

    return false;
  });
}

function shouldCreateIntergenerationalUnion(
  a,
  b
) {
  if (
    !currentLayout ||
    !currentLayout.pos ||
    !currentLayout.pos.has(a) ||
    !currentLayout.pos.has(b)
  ) {
    return false;
  }

  const pa =
    currentLayout.pos.get(a);

  const pb =
    currentLayout.pos.get(b);

  if (
    !pa ||
    !pb ||
    pa.generation === pb.generation
  ) {
    return false;
  }

  return (
    personHasIndependentPedigreeContext(a,b) &&
    personHasIndependentPedigreeContext(b,a)
  );
}

function ensureUnion(a,b) {
  if (a===b) return;
  if (!canFormPartnership(personByUid(a)) || !canFormPartnership(personByUid(b))) {
    throw new Error(t("validation.union.eligible"));
  }

  const existing =
    family.relationships.find(r =>
      r.type==="union" &&
      sameSet(
        r.people || [],
        [a,b]
      )
    ) || null;

  if (existing) {
    return;
  }

  const intergenerational =
    shouldCreateIntergenerationalUnion(
      a,
      b
    );

  family.relationships.push({
    type:"union",
    people:[a,b],
    intergenerational,
    consanguineous:false,
    consanguinity_degree:"",
    relationship_status:"current",
    reproductive_status:"none",
    reproductive_attribution:"union",
    reproductive_reason:""
  });
}



function unionChildren(a,b) {
  const children = new Set();

  family.relationships.forEach(r => {
    if (
      r.type === "parentage" &&
      sameSet(r.parents || [],[a,b])
    ) {
      (r.children || []).forEach(uid => children.add(uid));
    }
  });

  return [...children];
}

function setUnionReproductiveData(a,b,status="none",attribution="union",reason="") {
  if (!["none","no_children","infertility"].includes(status)) {
    throw new Error(t("validation.reproductive.status"));
  }

  ensureUnion(a,b);
  const rel = unionBetween(a,b);
  if (!rel) return;

  if (status === "no_children" && unionChildren(a,b).length) {
    throw new Error(
      t("validation.reproductive.noChildrenCouple")
    );
  }

  let storedAttribution = "union";

  if (attribution === "a") storedAttribution = a;
  if (attribution === "b") storedAttribution = b;

  rel.reproductive_status = status;
  rel.reproductive_attribution =
    status === "none" ? "union" : storedAttribution;
  rel.reproductive_reason =
    status === "none" ? "" : String(reason || "").trim();
}

function reproductiveUnionForPerson(uid) {
  return family.relationships.find(r =>
    r.type === "union" &&
    ["no_children","infertility"].includes(r.reproductive_status) &&
    r.reproductive_attribution === uid
  ) || null;
}

function reproductiveStatusLabel(status) {
  return {
    no_children:"no descendencia",
    infertility:"infertilidad"
  }[status] || "";
}

function removeParentFromOppositeDescent(parent,child,targetDescentType) {
  const oppositeType =
    targetDescentType === "adoptive"
      ? "biological"
      : "adoptive";

  let rel = family.relationships.find(r =>
    r.type === "parentage" &&
    (r.descent_type || "biological") === oppositeType &&
    (r.children || []).includes(child) &&
    (r.parents || []).includes(parent)
  );

  if (!rel) return false;

  // Si la relación agrupa varios hermanos, aislamos al hijo que estamos
  // reclasificando para no cambiar la filiación de los demás.
  if ((rel.children || []).length > 1) {
    rel.children = rel.children.filter(uid => uid !== child);

    rel = {
      type:"parentage",
      parents:[...(rel.parents || [])],
      children:[child],
      descent_type:oppositeType
    };

    family.relationships.push(rel);
  }

  rel.parents = (rel.parents || []).filter(uid => uid !== parent);

  // Si ya no quedan progenitores en esa filiación, la relación deja de
  // tener sentido y se elimina por completo.
  if (!(rel.parents || []).length) {
    family.relationships = family.relationships.filter(r => r !== rel);
  }

  return true;
}

function addParent(parent,child,descentType="biological") {
  if (parent===child) throw new Error(t("validation.parentage.selfParent"));

  if (!["biological","adoptive"].includes(descentType)) {
    throw new Error(t("validation.parentage.type"));
  }

  // Si el mismo vínculo progenitor-hijo existía con el tipo opuesto,
  // lo reclasificamos en vez de mantener dos líneas superpuestas.
  removeParentFromOppositeDescent(parent,child,descentType);

  if (descentType === "biological" && isAncestor(child,parent)) {
    throw new Error(t("validation.parentage.cycle"));
  }

  let rel = family.relationships.find(r =>
    r.type==="parentage" &&
    (r.children||[]).includes(child) &&
    (r.descent_type || "biological") === descentType
  );

  if (!rel) {
    rel = {
      type:"parentage",
      parents:[parent],
      children:[child],
      descent_type: descentType
    };
    family.relationships.push(rel);
  } else {
    if ((rel.parents||[]).includes(parent)) return;

    if ((rel.parents||[]).length >= 2) {
      throw new Error(t("validation.parentage.maxTwo"));
    }

    if ((rel.children||[]).length > 1) {
      rel.children = rel.children.filter(x => x !== child);

      rel = {
        type:"parentage",
        parents:[...(rel.parents||[]), parent],
        children:[child],
        descent_type: descentType
      };

      family.relationships.push(rel);
    } else {
      rel.parents.push(parent);
    }
  }

  if (rel.parents.length===2) {
    ensureUnion(rel.parents[0],rel.parents[1]);
  }

  family.relationships = family.relationships.filter(r =>
    r.type !== "parentage" ||
    ((r.parents || []).length && (r.children || []).length)
  );

  if (descentType === "biological") {
    mergeSiblingGroups();
  }
}

function isAncestor(candidateAncestor, person, relationships=family.relationships) {
  const seen = new Set();
  const stack = [candidateAncestor];

  while (stack.length) {
    const current = stack.pop();
    if (current===person) return true;
    if (seen.has(current)) continue;
    seen.add(current);

    relationships
      .filter(r=>r.type==="parentage" && (r.parents||[]).includes(current))
      .forEach(r => (r.children||[]).forEach(c=>stack.push(c)));
  }

  return false;
}

function mergeSiblingGroups() {
  const groups = [];

  family.relationships.filter(r=>r.type==="parentage").forEach(r => {
    const descentType = r.descent_type || "biological";
    const existing = groups.find(g =>
      sameSet(g.parents,r.parents||[]) &&
      (g.descent_type || "biological") === descentType
    );

    if (existing) {
      (r.children||[]).forEach(c => {
        if (!existing.children.includes(c)) existing.children.push(c);
      });
    } else {
      groups.push({
        type:"parentage",
        parents:[...(r.parents||[])],
        children:[...(r.children||[])],
        descent_type: descentType
      });
    }
  });

  const nonParentage = family.relationships.filter(r=>r.type!=="parentage");
  family.relationships = nonParentage.concat(groups);
}



function siblingGroupOf(uid) {
  return family.relationships.find(r =>
    r.type === "sibling" && (r.members || []).includes(uid)
  ) || null;
}

function removeSiblingRelationMember(uid) {
  family.relationships = family.relationships
    .map(r => {
      if (r.type !== "sibling") return r;
      return {
        ...r,
        members:(r.members || []).filter(x => x !== uid)
      };
    })
    .filter(r => r.type !== "sibling" || (r.members || []).length >= 2);
}

function resolveSiblingGroupsWithParents() {
  const siblingGroups = family.relationships.filter(r => r.type === "sibling");

  siblingGroups.forEach(group => {
    const members = [...(group.members || [])];
    const known = members
      .map(uid => ({uid, rel:parentageOf(uid)}))
      .find(x => x.rel && (x.rel.parents || []).length);

    if (!known) return;

    const parents = [...(known.rel.parents || [])];

    members.forEach(uid => {
      const existing = parentageOf(uid);

      if (!existing) {
        known.rel.children.push(uid);
        return;
      }

      if (existing === known.rel) return;

      if (sameSet(existing.parents || [], parents)) {
        if (!known.rel.children.includes(uid)) known.rel.children.push(uid);
        existing.children = (existing.children || []).filter(x => x !== uid);
      }
    });

    group._resolved = true;
  });

  family.relationships = family.relationships.filter(r => {
    if (r.type === "sibling" && r._resolved) return false;
    if (r.type === "parentage" && !(r.children || []).length) return false;
    return true;
  });

  mergeSiblingGroups();
}

function addSibling(a,b) {
  if (a === b) throw new Error(t("validation.sibling.self"));

  const relA = parentageOf(a);
  const relB = parentageOf(b);

  // Si ambos ya comparten progenitores, ya son hermanos.
  if (relA && relB && relA === relB) return;

  // Si uno tiene progenitores y el otro no, incorporamos al segundo
  // directamente a la misma línea de descendencia.
  if (relA && !relB) {
    if (!relA.children.includes(b)) relA.children.push(b);
    removeSiblingRelationMember(b);
    mergeSiblingGroups();
    return;
  }

  if (relB && !relA) {
    if (!relB.children.includes(a)) relB.children.push(a);
    removeSiblingRelationMember(a);
    mergeSiblingGroups();
    return;
  }

  // Si ambos tienen filiaciones distintas, no las fusionamos silenciosamente.
  if (relA && relB) {
    if (sameSet(relA.parents || [], relB.parents || [])) {
      relA.children = Array.from(new Set(
        (relA.children || []).concat(relB.children || [])
      ));
      family.relationships = family.relationships.filter(r => r !== relB);
      mergeSiblingGroups();
      return;
    }

    throw new Error(
      "Los dos individuos ya tienen progenitores distintos. " +
      t("validation.sibling.noAutoFullSibling")
    );
  }

  // Ninguno tiene progenitores conocidos: mantenemos un grupo explícito
  // de hermanos hasta que se documenten los padres de alguno.
  let groupA = siblingGroupOf(a);
  let groupB = siblingGroupOf(b);

  if (groupA && groupB && groupA !== groupB) {
    groupA.members = Array.from(new Set(
      (groupA.members || []).concat(groupB.members || [])
    ));
    family.relationships = family.relationships.filter(r => r !== groupB);
  } else if (groupA) {
    if (!groupA.members.includes(b)) groupA.members.push(b);
  } else if (groupB) {
    if (!groupB.members.includes(a)) groupB.members.push(a);
  } else {
    family.relationships.push({
      type:"sibling",
      members:[a,b]
    });
  }
}

function areSiblings(a,b) {
  const relA = parentageOf(a);
  const relB = parentageOf(b);

  if (
    relA &&
    relB &&
    sameSet(relA.parents || [], relB.parents || [])
  ) {
    return true;
  }

  if (
    family.relationships.some(r =>
      r.type === "sibling" &&
      (r.members || []).includes(a) &&
      (r.members || []).includes(b)
    )
  ) {
    return true;
  }

  return family.relationships.some(r =>
    r.type === "twin" &&
    (r.members || []).includes(a) &&
    (r.members || []).includes(b)
  );
}

function addMultipleBirth(memberUids,zygosity) {
  const members = [...new Set(memberUids || [])];

  const expectedMembers =
    zygosity === "trizygotic" ? 3 : 2;

  if (members.length !== expectedMembers) {
    throw new Error(
      zygosity === "trizygotic"
        ? t("validation.triplets.selectThree")
        : t("validation.twins.selectTwo")
    );
  }

  const people = members.map(personByUid);

  if (
    people.some(
      p => !p || recordType(p) !== "person"
    )
  ) {
    throw new Error(
      t("validation.multipleGestation.onlyIndividuals")
    );
  }

  for (let i=0; i<members.length; i++) {
    for (let j=i+1; j<members.length; j++) {
      if (!areSiblings(members[i],members[j])) {
        throw new Error(
          t("validation.multipleGestation.needSiblings")
        );
      }
    }
  }

  if (
    ![
      "monozygotic",
      "dizygotic",
      "unknown",
      "trizygotic"
    ].includes(zygosity)
  ) {
    throw new Error(
      t("validation.multipleGestation.invalidType")
    );
  }

  const existing =
    exactMultipleBirthRelation(members);

  if (existing) {
    existing.zygosity = zygosity;
    return;
  }

  const conflicting = family.relationships.find(r =>
    r.type === "twin" &&
    (r.members || []).some(uid => members.includes(uid))
  );

  if (conflicting) {
    throw new Error(
      t("validation.multipleGestation.duplicate")
    );
  }

  family.relationships.push({
    type:"twin",
    members,
    zygosity
  });
}

function addTwin(a,b,zygosity) {
  addMultipleBirth([a,b],zygosity);
}

function updateRelationTypeFields() {
  const type = $("relationType").value;
  const isTwin = type === "twin";
  const isGestation = type === "gestates";
  const isDonation = type === "donates";
  const isChild = type === "child";
  const isConsanguineous = type === "consanguineous_union";
  const isAdoptiveChild = type === "adoptive_child";
  const isAdoptedOutChild = type === "adopted_out_child";
  const isEndedUnion = type === "ended_union";

  $("twinZygosityField").classList.toggle("hidden", !isTwin);
  $("consanguinityDegreeField").classList.toggle("hidden", !isConsanguineous);
  const reproductiveActive =
    unionLikeRelationType(type) &&
    $("reproductiveStatus").value !== "none";

  $("selectAllBBtn").disabled =
    isTwin ||
    isGestation ||
    isChild ||
    isConsanguineous ||
    isAdoptiveChild ||
    isAdoptedOutChild ||
    isEndedUnion ||
    reproductiveActive ||
    editingUnionReproductiveIndex !== null;

  if (isTwin) {
    if ($("twinZygosity").value === "trizygotic") {
      $("relationBHelp").textContent =
        t("validation.multiple.tripletsWithA");
    } else {
      $("relationBHelp").textContent =
        t("validation.multiple.twinsWithA");
    }
  } else if (isConsanguineous) {
    $("relationBHelp").textContent =
      t("validation.relationship.consanguineousOne");
  } else if (isEndedUnion) {
    $("relationBHelp").textContent =
      t("validation.relationship.endedOne");
  } else if (isGestation) {
    $("relationBHelp").textContent = t("help.gestation.explicitAssignment");
  } else if (isDonation) {
    $("relationBHelp").textContent = t("help.sharedDonor.advanced");
  } else if (isChild) {
    $("relationBHelp").textContent =
      t("validation.parentage.oneOrTwoBio");
  } else if (isAdoptiveChild) {
    $("relationBHelp").textContent =
      t("validation.parentage.oneOrTwoAdoptive");
  } else if (isAdoptedOutChild) {
    $("relationBHelp").textContent =
      t("validation.parentage.oneOrTwoBioOut");
  } else if (type === "adoptive_parent") {
    $("relationBHelp").textContent =
      t("validation.adoption.batch");
  } else {
    $("relationBHelp").textContent =
      "Puedes seleccionar varias personas y crear todas las relaciones de una sola vez.";
  }

  updateRelationBList();
  updateReproductiveRelationFields();
}

const hoverCardElement =
  conditionHoverCard();

if (hoverCardElement) {
  /*
   * 0.8.59 — al ser una tarjeta abierta por clic, permanece visible
   * mientras el usuario interactúa con ella. Se cierra mediante ×,
   * al pulsar fuera o al abrir la tarjeta de otro individuo.
   */
  hoverCardElement.addEventListener(
    "pointerdown",
    event => {
      event.stopPropagation();
      cancelConditionHoverHide();
    }
  );
}

/*
 * Cierre intuitivo al pulsar fuera de la tarjeta.
 * Un clic sobre otro individuo no se intercepta: ese propio clic abrirá
 * inmediatamente su tarjeta contextual.
 */
document.addEventListener(
  "pointerdown",
  event => {
    const card =
      conditionHoverCard();

    if (
      !card ||
      card.hidden
    ) {
      return;
    }

    const target =
      event.target;

    if (
      card.contains(target)
    ) {
      return;
    }

    if (
      target &&
      typeof target.closest === "function" &&
      target.closest(".person")
    ) {
      return;
    }

    hideConditionHoverCard();
  }
);

$("addConditionBtn").addEventListener("click", addCondition);
$("recordType").addEventListener("change", () => {
  // Valores sugeridos al CREAR, nunca al abrir una ficha existente.
  if (!$("editingUid").value) {
    const type = $("recordType").value;
    if (type === "ovum_donor" || type === "ovum_donor_surrogate") {
      $("gender").value = "woman";
      $("sexAtBirth").value = "female";
    } else if (type === "sperm_donor") {
      $("gender").value = "man";
      $("sexAtBirth").value = "male";
    } else if (type === "fetus" || type === "stillbirth") {
      $("fetalSex").value = "unspecified";
    }
  }
  updateRecordTypeFields();
});
// Both fields are editable in the detailed form, but never stored together.
$("age").addEventListener("input", () => {
  if ($("age").value !== "") $("birthYear").value = "";
});
$("birthYear").addEventListener("input", () => {
  if ($("birthYear").value !== "") $("age").value = "";
});
$("personReproductiveStatus").addEventListener(
  "change",
  updatePersonReproductiveFields
);
$("savePersonNotesBtn").addEventListener("click", saveSelectedPersonNotes);

$("clinicalPrevBtn").addEventListener(
  "click",
  () => navigateClinicalPerson(-1)
);

$("clinicalNextBtn").addEventListener(
  "click",
  () => navigateClinicalPerson(1)
);

$("clinicalReviewBtn").addEventListener(
  "click",
  toggleFamilyReviewStatus
);

$("clearPersonSelectionBtn").addEventListener(
  "click",
  () => closeClinicalDrawer({
    clearSelection:false
  })
);

const clinicalDrawerBackdrop =
  $("clinicalDrawerBackdrop");

if (clinicalDrawerBackdrop) {
  clinicalDrawerBackdrop.addEventListener(
    "click",
    () => closeClinicalDrawer({
      clearSelection:false
    })
  );
}

document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape" &&
      clinicalDrawerOpen
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      closeClinicalDrawer({
        clearSelection:false
      });
    }
  }
);

// Los controles manuales de posición viven ahora en el tooltip (0.7.59).

$("personNotes").addEventListener(
  "input",
  () => {
    $("notesStatus").textContent = "";
  }
);

$("relationA").addEventListener("change", () => {
  updateRelationBList();
  if ($("relationType").value === "donates") {
    const chosen = new Set(donationTargetUids(personByUid($("relationA").value)));
    document.querySelectorAll('#relationBList input[type="checkbox"]')
      .forEach(el => { el.checked = chosen.has(el.value); });
  }
});
$("relationType").addEventListener("change", () => {
  updateRelationSelectors();
  updateRelationTypeFields();
});
$("twinZygosity").addEventListener("change", updateRelationTypeFields);
$("reproductiveStatus").addEventListener("change", updateRelationTypeFields);
$("relationBList").addEventListener("change", updateReproductiveRelationFields);
$("cancelRelationEditBtn").addEventListener("click", resetRelationReproductiveEdit);
$("selectAllBBtn").addEventListener("click", () => setAllRelationB(true));
$("clearAllBBtn").addEventListener("click", () => setAllRelationB(false));

$("relationForm").addEventListener("submit", e => {
  e.preventDefault();

  const a = $("relationA").value;
  const bs = selectedRelationB();
  const type = $("relationType").value;

  if (editingUnionReproductiveIndex !== null) {
    const r = family.relationships[editingUnionReproductiveIndex];

    if (!r || r.type !== "union" || !(r.people || []).length === 2) {
      resetRelationReproductiveEdit();
      message(t("validation.relationship.editMissing"), "error");
      return;
    }

    try {
      pushUndoState();

      setUnionReproductiveData(
        r.people[0],
        r.people[1],
        $("reproductiveStatus").value,
        $("reproductiveAttribution").value,
        $("reproductiveReason").value
      );

      resetRelationReproductiveEdit();
      renderPedigree();
      message(t("message.relationship.reproductiveUpdated"), "success");
    } catch (err) {
      const previous = undoHistory.pop();
      if (previous) family = previous;
      updateUndoButton();
      renderPedigree();
      message("No se guardó la situación reproductiva: " + err.message, "error");
    }

    return;
  }

  if (!a) {
    message(t("validation.parentage.targetA"), "error");
    return;
  }

  if (!bs.length) {
    message(t("validation.parentage.targetB"), "error");
    return;
  }

  if (bs.includes(a)) {
    message(t("validation.parentage.noSame"), "error");
    return;
  }

  if (type === "donates" && !isDonorRecord(personByUid(a))) {
    message(t("validation.sharedDonor.donorRequired"),"error"); return;
  }
  if (type === "gestates" && bs.length !== 1) {
    message(t("validation.gestation.oneOutcome"),"error");
    return;
  }

  if (type === "twin") {
    const zygosity = $("twinZygosity").value;
    const requiredB =
      zygosity === "trizygotic" ? 2 : 1;

    if (bs.length !== requiredB) {
      message(
        zygosity === "trizygotic"
          ? t("validation.multiple.tripletsB")
          : t("validation.multiple.twinsB"),
        "error"
      );
      return;
    }
  }

  if (type === "consanguineous_union" && bs.length !== 1) {
    message(t("validation.parentage.consanguinityPair"), "error");
    return;
  }

  if (type === "ended_union" && bs.length !== 1) {
    message(t("validation.parentage.endedPair"), "error");
    return;
  }

  if (
    unionLikeRelationType(type) &&
    $("reproductiveStatus").value !== "none" &&
    bs.length !== 1
  ) {
    message(
      t("validation.reproductive.oneB"),
      "error"
    );
    return;
  }

  if (type === "child" && bs.length > 2) {
    message(t("validation.parentage.twoParents"), "error");
    return;
  }

  if (type === "adoptive_child" && bs.length > 2) {
    message(t("validation.parentage.twoAdoptive"), "error");
    return;
  }

  if (type === "adopted_out_child" && bs.length > 2) {
    message(t("validation.parentage.twoBiological"), "error");
    return;
  }

  let undoPushed = false;

  try {
    // Todo el lote constituye un único paso para Deshacer.
    pushUndoState();
    undoPushed = true;

    if (type === "donates") {
      assignExistingDonorTargets(a,bs);
    } else if (type === "gestates") {
      assignGestation(a,bs[0]);
    } else if (type === "twin") {
      addMultipleBirth(
        [a, ...bs],
        $("twinZygosity").value
      );
    } else {
      prepareGenerationInsertionForRelation(
        a,
        bs,
        type
      );

      bs.forEach(b => {
      if (type === "union") {
        setUnionStatus(a, b, "current");
      } else if (type === "ended_union") {
        setUnionStatus(a, b, "ended");
      } else if (type === "consanguineous_union") {
        setConsanguineousUnion(a, b, $("consanguinityDegree").value);
      } else if (type === "sibling") {
        addSibling(a, b);
      } else if (type === "child") {
        addParent(b, a, "biological");
      } else if (type === "adoptive_child") {
        addParent(b, a, "adoptive");
      } else if (type === "adopted_out_child") {
        addParent(b, a, "biological");
        markAdoptedOut(a);
      } else if (type === "adoptive_parent") {
        addParent(a, b, "adoptive");
      } else {
        addParent(a, b, "biological");
      }

      if (unionLikeRelationType(type)) {
        setUnionReproductiveData(
          a,
          b,
          $("reproductiveStatus").value,
          $("reproductiveAttribution").value,
          $("reproductiveReason").value
        );
      }
    });
    }

    if (type === "parent" || type === "child" || type === "adopted_out_child") {
      resolveSiblingGroupsWithParents();
    }

    renderPedigree();

    const relationLabel = {
      union: t("label.relationship.partner"),
      ended_union: t("label.relationship.ended"),
      sibling: "hermano/a",
      twin: "gemelo/a o trillizo/a",
      parent: t("label.relationship.parent"),
      child: "hijo/a",
      adoptive_parent: t("label.relationship.adoptiveParent"),
      adoptive_child: t("label.relationship.adoptedIn"),
      adopted_out_child: t("label.relationship.adoptedOut"),
      consanguineous_union: t("label.relationship.consanguineousCouple"),
      gestates: t("label.relationship.gestates"),
      donates: t("label.relationship.donates")
    }[type] || t("label.relationship.generic");

    message(
      bs.length === 1
        ? "Relación añadida."
        : t("relationship.addedByType",{count:bs.length,type:relationLabel}),
      "success"
    );
  } catch (err) {
    // Una operación múltiple es atómica: si falla una relación,
    // restauramos el árbol completo al estado anterior.
    if (undoPushed) {
      const previous = undoHistory.pop();
      if (previous) family = previous;
      updateUndoButton();
    }

    renderPedigree();
    message("No se añadió ninguna relación: " + err.message, "error");
  }
});

function renderRelations() {
  const box = $("relationsList");
  box.replaceChildren();

  if (!family.relationships.length) {
    box.textContent = t('list.relationships.empty');
    return;
  }

  family.relationships.forEach((r,index) => {
    const row = document.createElement("div");
    row.className = "relation-row";

    const text = document.createElement("span");

    if (r.type==="union") {
      const statusLabel = ["ended","separated","divorced"].includes(
        r.relationship_status || "current"
      ) ? t("label.relationship.ended") : t("label.relationship.partner");

      const consanguinityLabel = r.consanguineous ? ' · '+t('list.relationships.consanguineous') : '';
      const intergenerationalLabel = r.intergenerational ? ' · '+t('list.relationships.intergenerational') : '';

      let reproductiveLabel = "";
      const reproductiveStatus = r.reproductive_status || "none";

      if (reproductiveStatus !== "none") {
        const who =
          r.reproductive_attribution &&
          r.reproductive_attribution !== "union"
            ? ` · ${displayName(r.reproductive_attribution)}`
            : "";

        const reason = String(r.reproductive_reason || "").trim();
        const reasonLabel = reason ? ` · ${reason}` : "";

        reproductiveLabel =
          ` · ${reproductiveStatusLabel(reproductiveStatus)}${who}${reasonLabel}`;
      }

      text.textContent =
        `${displayName(r.people[0])} — ${statusLabel}${consanguinityLabel}${intergenerationalLabel} — ${displayName(r.people[1])}${reproductiveLabel}`;
    } else if (r.type === "gestation") {
      text.textContent = t("list.relationships.gestation",{
        carrier:displayName(r.carrier),target:displayName(r.target)
      });
    } else if (r.type==="sibling") {
      text.textContent = t('list.relationships.siblings',{members:(r.members||[]).map(displayName).join(', ')});
    } else if (r.type==="twin") {
      if (
        r.zygosity === "trizygotic" &&
        (r.members || []).length === 3
      ) {
        text.textContent = t('list.relationships.trizygotic',{members:(r.members||[]).map(displayName).join(' + ')});
      } else {
        const zygosityLabel = {
          monozygotic:t("label.twin.monozygotic"),
          dizygotic:t("label.twin.dizygotic"),
          unknown:t('list.relationships.unknownZygosity')
        }[r.zygosity] || t('list.relationships.unknownZygosity');

        text.textContent = t('list.relationships.twins',{
          zygosity:zygosityLabel,members:(r.members||[]).map(displayName).join(' + ')
        });
      }
    } else {
      const parents=(r.parents||[]).map(displayName).join(" + ");
      const children=(r.children||[]).map(displayName).join(", ");
      const descentType = (r.descent_type || "biological") === "adoptive"
        ? t("label.parentage.adoptive")
        : t("label.parentage.biological");
      text.textContent = `${parents} → ${children} (${descentType})`;
    }

    let editReproductive = null;

    if (r.type === "union") {
      editReproductive = document.createElement("button");
      editReproductive.type = "button";
      editReproductive.textContent = t('list.relationships.reproductiveStatus');
      editReproductive.onclick = () =>
        beginUnionReproductiveEdit(index);
    }

    const del = document.createElement("button");
    del.type="button";
    del.textContent=t('action.delete');
    del.onclick = () => {
      pushUndoState();
      family.relationships.splice(index,1);
      renderPedigree();
      message(t('list.relationships.deleted'), 'success');
    };

    if (editReproductive) {
      row.append(text,editReproductive,del);
    } else {
      row.append(text,del);
    }

    box.appendChild(row);
  });
}

function syncHeaderToFamily() {
  family.family_id = $("familyId").value.trim();
  family.indication = $("indication").value.trim();
  family.pedigree_comments = $("pedigreeComments").value.trim();
}

function syncFamilyToHeader() {
  $("familyId").value = family.family_id || "";
  $("indication").value = family.indication || "";
  $("pedigreeComments").value = family.pedigree_comments || "";

  $("showPedigreeNumbers").checked =
    pedigreeNumbersVisible();
}

function syncHeaderAfterManualEdit() {
  syncHeaderToFamily();
  clearRedoHistory();
  updateUnsavedIndicator();
  updateFamilyReviewIndicator();
  scheduleLivePedigreeQc();
}

$("familyId").addEventListener(
  "input",
  syncHeaderAfterManualEdit
);

$("indication").addEventListener(
  "input",
  syncHeaderAfterManualEdit
);

$("pedigreeComments").addEventListener(
  "input",
  syncHeaderAfterManualEdit
);


$("showPedigreeNumbers").addEventListener(
  "change",
  event => {
    /*
     * Es una preferencia persistente de la familia y participa en
     * Deshacer/Rehacer igual que el resto de cambios editables.
     */
    pushUndoState();

    family.show_pedigree_numbers =
      !!event.target.checked;

    renderPedigree();

    message(
      family.show_pedigree_numbers
        ? t("message.numbering.visible")
        : t("message.numbering.hidden"),
      "success"
    );
  }
);

function normalizeSavedCaseSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("es")
    .trim();
}

function savedCaseById(id) {
  return savedCaseItems.find(
    item =>
      item.family_id === id
  ) || null;
}

function savedCaseMatchesSearch(
  item,
  query
) {
  if (!query) return true;

  const reviewText =
    item.reviewed === true
      ? 'revisado reviewed'
      : 'no revisado pendiente not reviewed pending';

  const haystack =
    normalizeSavedCaseSearch(
      `${item.family_id || ""} ${item.indication || ""} ${reviewText}`
    );

  return haystack.includes(query);
}

function savedCaseMatchesReviewFilter(
  item
) {
  if (
    savedCaseReviewFilter ===
      "reviewed"
  ) {
    return item.reviewed === true;
  }

  if (
    savedCaseReviewFilter ===
      "pending"
  ) {
    return item.reviewed !== true;
  }

  return true;
}

function updateSavedCaseReviewFilterButtons() {
  const reviewedCount =
    savedCaseItems.filter(
      item => item.reviewed === true
    ).length;

  const pendingCount =
    Math.max(
      0,
      savedCaseItems.length -
      reviewedCount
    );

  const config = [
    {
      id:"savedCaseFilterAllBtn",
      filter:"all",
      label:t('savedCases.filter.all',{count:savedCaseItems.length})
    },
    {
      id:"savedCaseFilterReviewedBtn",
      filter:"reviewed",
      label:t('savedCases.filter.reviewed',{count:reviewedCount})
    },
    {
      id:"savedCaseFilterPendingBtn",
      filter:"pending",
      label:t('savedCases.filter.pending',{count:pendingCount})
    }
  ];

  config.forEach(item => {
    const button =
      $(item.id);

    if (!button) {
      return;
    }

    const active =
      savedCaseReviewFilter ===
      item.filter;

    button.classList.toggle(
      "is-active",
      active
    );

    button.setAttribute(
      "aria-pressed",
      active
        ? "true"
        : "false"
    );

    button.textContent =
      item.label;
  });
}

function setSavedCaseReviewFilter(
  filter
) {
  savedCaseReviewFilter =
    ["all","reviewed","pending"]
      .includes(filter)
        ? filter
        : "all";

  updateSavedCaseReviewFilterButtons();
  renderSavedCaseResults();

  const search =
    $("savedCaseSearch");

  if (search) {
    search.focus({
      preventScroll:true
    });
  }
}

function filteredSavedCases() {
  const query =
    normalizeSavedCaseSearch(
      $("savedCaseSearch").value
    );

  return savedCaseItems
    .filter(item =>
      savedCaseMatchesReviewFilter(
        item
      )
    )
    .filter(item =>
      savedCaseMatchesSearch(
        item,
        query
      )
    )
    .slice(0,50);
}

function updateSavedCaseButtons() {
  const valid =
    !!savedCaseById(
      selectedSavedCaseId
    );

  $("loadFamilyBtn").disabled =
    !valid;

  $("deleteFamilyBtn").disabled =
    !valid;
}

function setSelectedSavedCase(
  id,
  options={}
) {
  const item =
    savedCaseById(id);

  if (!item) {
    selectedSavedCaseId = "";
    updateSavedCaseButtons();
    return;
  }

  selectedSavedCaseId =
    item.family_id;

  if (
    options.updateSearch !== false
  ) {
    $("savedCaseSearch").value =
      item.family_id;
  }

  const indication =
    String(
      item.indication || ""
    ).trim();

  const reviewLabel = item.reviewed === true
    ? t('savedCases.reviewed') : t('savedCases.pending');

  $("savedCaseSelection").textContent =
    [
      t('savedCases.selected',{id:item.family_id}),
      indication,
      reviewLabel
    ]
      .filter(Boolean)
      .join(" · ");

  updateSavedCaseButtons();
}

function clearSelectedSavedCase(
  clearSearch=false
) {
  selectedSavedCaseId = "";

  if (clearSearch) {
    $("savedCaseSearch").value = "";
  }

  $("savedCaseSelection").textContent = t('savedCases.selectHint');

  updateSavedCaseButtons();
}

function renderSavedCaseResults() {
  const box =
    $("savedCaseResults");

  box.replaceChildren();

  const matches =
    filteredSavedCases();

  if (!matches.length) {
    const empty =
      document.createElement("div");

    empty.className =
      "saved-case-empty";

    empty.textContent =
      savedCaseItems.length
        ? t('savedCases.noMatches')
        : t('savedCases.noSaved');

    box.appendChild(empty);
    box.classList.remove("hidden");
    return;
  }

  matches.forEach(item => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "saved-case-result";

    button.setAttribute(
      "role",
      "option"
    );

    button.setAttribute(
      "aria-selected",
      item.family_id ===
        selectedSavedCaseId
        ? "true"
        : "false"
    );

    const id =
      document.createElement("span");

    id.className =
      "saved-case-result-id";

    id.textContent =
      item.family_id;

    const heading =
      document.createElement("span");

    heading.className =
      "saved-case-result-heading";

    const reviewBadge =
      document.createElement("span");

    reviewBadge.className =
      "saved-case-review-badge " +
      (
        item.reviewed === true
          ? "is-reviewed"
          : "is-pending"
      );

    reviewBadge.textContent = item.reviewed === true
      ? t('savedCases.reviewed') : t('savedCases.pending');

    if (
      item.reviewed === true &&
      item.reviewed_at
    ) {
      const reviewDate =
        new Date(
          item.reviewed_at
        );

      if (
        !Number.isNaN(
          reviewDate.getTime()
        )
      ) {
        reviewBadge.title = t('savedCases.reviewedAt',{
          date:reviewDate.toLocaleString(window.PedigrAPPi18n?.current()==='en'?'en-GB':'es-ES')
        });
      }
    }

    heading.append(
      id,
      reviewBadge
    );

    const meta =
      document.createElement("span");

    meta.className =
      "saved-case-result-meta";

    const indication =
      String(
        item.indication || ""
      ).trim();

    let modified = "";

    if (item.modified) {
      const date =
        new Date(item.modified);

      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {
        modified =
          date.toLocaleDateString(window.PedigrAPPi18n?.current()==='en'?'en-GB':'es-ES');
      }
    }

    meta.textContent =
      [
        indication,
        modified
          ? t('savedCases.modified',{date:modified})
          : '' 
      ]
        .filter(Boolean)
        .join(" · ") ||
      t('savedCases.noIndication');

    button.append(
      heading,
      meta
    );

    button.addEventListener(
      "click",
      () => {
        setSelectedSavedCase(
          item.family_id
        );

        box.classList.add(
          "hidden"
        );
      }
    );

    box.appendChild(button);
  });

  box.classList.remove("hidden");
}

function exactSavedCaseFromSearch() {
  const value =
    $("savedCaseSearch").value
      .trim()
      .toLocaleLowerCase("es");

  if (!value) return null;

  return savedCaseItems.find(
    item =>
      String(item.family_id)
        .toLocaleLowerCase("es") ===
      value
  ) || null;
}

async function listSaved(
  preferredId=null
) {
  const previousId =
    preferredId ||
    selectedSavedCaseId;

  try {
    const items = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (
        !key ||
        !key.startsWith(LOCAL_STORAGE_PREFIX)
      ) {
        continue;
      }

      try {
        const raw = localStorage.getItem(key);
        const data = JSON.parse(raw || "null");

        if (!data || typeof data !== "object") {
          continue;
        }

        const familyId = String(
          data.family_id ||
          key.slice(LOCAL_STORAGE_PREFIX.length)
        );
        const reviewStatus =
          data.review_status &&
          typeof data.review_status === "object"
            ? data.review_status
            : {};

        items.push({
          family_id: familyId,
          indication: String(data.indication || ""),
          reviewed: reviewStatus.reviewed === true,
          reviewed_at:
            reviewStatus.reviewed === true
              ? String(reviewStatus.reviewed_at || "")
              : "",
          modified: String(data.updated_at || "")
        });
      } catch (err) {
        // One damaged localStorage record must not prevent opening the others.
      }
    }

    savedCaseItems = items.sort((a,b) =>
      a.family_id.localeCompare(
        b.family_id,
        window.PedigrAPPi18n?.current()==='en'?'en':'es',
        {numeric:true}
      )
    );

    updateSavedCaseReviewFilterButtons();

    if (
      previousId &&
      savedCaseById(previousId)
    ) {
      setSelectedSavedCase(previousId);
    } else {
      clearSelectedSavedCase(false);
    }
  } catch (err) {
    savedCaseItems = [];
    clearSelectedSavedCase(false);
    updateSavedCaseReviewFilterButtons();

    message(
      t("online.storage.accessFailure",{error:err.message}),
      "error"
    );
  }
}

function localStorageKeyForFamily(id) {
  return LOCAL_STORAGE_PREFIX + String(id || "");
}

function resolvedSavedCaseId() {
  if (
    savedCaseById(
      selectedSavedCaseId
    )
  ) {
    return selectedSavedCaseId;
  }

  const exact =
    exactSavedCaseFromSearch();

  if (exact) {
    setSelectedSavedCase(
      exact.family_id,
      {updateSearch:false}
    );

    return exact.family_id;
  }

  return "";
}

async function deleteSavedFamily(id) {
  if (!id) {
    message(
      t("validation.storage.selectSaved"),
      "error"
    );
    return;
  }

  const item = savedCaseById(id);
  const indication =
    item && String(item.indication || "").trim();
  const detail = indication ? `\n${indication}` : "";

  if (!confirm(t("online.storage.confirmDelete",{id,detail}))) {
    return;
  }

  try {
    localStorage.removeItem(
      localStorageKeyForFamily(id)
    );

    clearSelectedSavedCase(true);
    await listSaved();

    if (family.family_id === id) {
      markCurrentFamilyAsUnsaved();
    }

    message(
      family.family_id === id
        ? t("online.storage.deletedCurrent",{id})
        : t("online.storage.deleted",{id}),
      "success"
    );
  } catch(err) {
    message(
      t("online.storage.deleteFailure",{error:err.message}),
      "error"
    );
  }
}

async function saveFamily(
  options={}
) {
  const silentSuccess =
    !!(
      options &&
      typeof options === "object" &&
      options.silentSuccess === true
    );

  syncHeaderToFamily();

  try {
    validate(family);

    if (!family.family_id) {
      throw new Error(
        t("validation.storage.saveId")
      );
    }

    const savedFamily =
      cloneFamilyState(family);

    savedFamily.updated_at =
      new Date().toISOString();

    localStorage.setItem(
      localStorageKeyForFamily(
        savedFamily.family_id
      ),
      JSON.stringify(savedFamily)
    );

    family.updated_at =
      savedFamily.updated_at;

    await listSaved(
      savedFamily.family_id
    );

    markCurrentFamilyAsSaved();

    if (!silentSuccess) {
      message(
        t("online.storage.saved",{id:savedFamily.family_id}),
        "success"
      );
    }

    return true;
  } catch(err) {
    const quotaMessage =
      err && err.name === "QuotaExceededError"
        ? t("online.storage.quota")
        : "";

    message(
      (err && err.message
        ? err.message
        : String(err)) +
      quotaMessage,
      "error"
    );

    return false;
  }
}

async function loadFamily(id) {
  if (!id) return;

  try {
    const raw = localStorage.getItem(
      localStorageKeyForFamily(id)
    );

    if (!raw) {
      throw new Error(
        t("online.storage.missing")
      );
    }

    const data = JSON.parse(raw);

    family = normalizeFamily(data);
    validate(family);
    selectedPersonUid = null;
    clearUndoHistory();
    setSelectedSavedCase(id);
    syncFamilyToHeader();
    resetPersonForm();
    markCurrentFamilyAsSaved();
    renderPedigree();
    fitPedigreeToWidthAfterLoad();
    message(
      t("online.storage.loaded",{id}),
      "success"
    );
    announceLoadedFamilyReview();
  } catch(err) {
    message(
      t("online.storage.loadFailure",{error:err.message}),
      "error"
    );
  }
}

$("saveFamilyBtn").onclick =
  saveFamily;

$("loadFamilyBtn").onclick =
  () => {
    const id =
      resolvedSavedCaseId();

    if (!id) {
      message(
        t("validation.storage.searchSaved"),
        "error"
      );
      return;
    }

    loadFamily(id);
  };

$("deleteFamilyBtn").onclick =
  () => {
    const id =
      resolvedSavedCaseId();

    if (!id) {
      message(
        t("validation.storage.searchSaved"),
        "error"
      );
      return;
    }

    deleteSavedFamily(id);
  };

$("savedCaseFilterAllBtn").addEventListener(
  "click",
  () => setSavedCaseReviewFilter(
    "all"
  )
);

$("savedCaseFilterReviewedBtn").addEventListener(
  "click",
  () => setSavedCaseReviewFilter(
    "reviewed"
  )
);

$("savedCaseFilterPendingBtn").addEventListener(
  "click",
  () => setSavedCaseReviewFilter(
    "pending"
  )
);

$("savedCaseSearch").addEventListener(
  "focus",
  () => {
    renderSavedCaseResults();
  }
);

$("savedCaseSearch").addEventListener(
  "input",
  () => {
    const exact =
      exactSavedCaseFromSearch();

    if (exact) {
      setSelectedSavedCase(
        exact.family_id,
        {updateSearch:false}
      );
    } else {
      selectedSavedCaseId = "";
      $("savedCaseSelection").textContent =
        t("validation.storage.chooseResult");
      updateSavedCaseButtons();
    }

    renderSavedCaseResults();
  }
);

$("savedCaseSearch").addEventListener(
  "keydown",
  event => {
    if (event.key === "Escape") {
      $("savedCaseResults")
        .classList.add("hidden");
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    let id =
      resolvedSavedCaseId();

    if (!id) {
      const first =
        filteredSavedCases()[0];

      if (first) {
        setSelectedSavedCase(
          first.family_id
        );
        id = first.family_id;
      }
    }

    if (id) {
      $("savedCaseResults")
        .classList.add("hidden");
      loadFamily(id);
    }
  }
);

document.addEventListener(
  "click",
  event => {
    const picker =
      document.querySelector(
        ".saved-case-picker"
      );

    if (
      picker &&
      !picker.contains(
        event.target
      )
    ) {
      $("savedCaseResults")
        .classList.add("hidden");
    }
  }
);

$("newFamilyBtn").onclick=()=>{
  if (!confirm(t("confirm.family.new"))) return;
  family=emptyFamily();
  family.family_id="FAM"+String(Date.now()).slice(-6);
  selectedPersonUid = null;
  clearUndoHistory();
  syncFamilyToHeader();
  resetPersonForm();
  renderPedigree();
  message("Nueva familia creada.","success");
};

$("resetTreeBtn").onclick=()=>{
  if (!family.people.length && !family.relationships.length) {
    message(t('message.tree.alreadyEmpty'));
    return;
  }

  if (!confirm(
    t('confirm.tree.reset') + ' ' + t('message.family.idKept')
  )) return;

  syncHeaderToFamily();
  pushUndoState();

  family.people = [];
  family.relationships = [];
  selectedPersonUid = null;

  currentNumbers = new Map();
  resetPersonForm();
  renderPedigree();

  message(t('message.tree.resetDone'),'success');
};

$("undoBtn").onclick =
  undoLastChange;

$("redoBtn").onclick =
  redoLastChange;

const stickyUndoButton =
  $("stickyUndoBtn");

const stickyRedoButton =
  $("stickyRedoBtn");

const stickySaveButton =
  $("stickySaveBtn");

const stickyReturnButton =
  $("stickyReturnToTreeBtn");

if (stickyUndoButton) {
  stickyUndoButton.addEventListener(
    "click",
    undoLastChange
  );
}

if (stickyRedoButton) {
  stickyRedoButton.addEventListener(
    "click",
    redoLastChange
  );
}

if (stickySaveButton) {
  stickySaveButton.addEventListener(
    "click",
    saveFamily
  );
}

if (stickyReturnButton) {
  stickyReturnButton.addEventListener(
    "click",
    returnToPedigreeFromStickyBar
  );
}

window.addEventListener(
  "scroll",
  scheduleStickyActionBarUpdate,
  {passive:true}
);

window.addEventListener(
  "resize",
  scheduleStickyActionBarUpdate,
  {passive:true}
);

installManagementAccordion();

requestAnimationFrame(
  () => {
    updateUndoButton();
    updateUnsavedIndicator();
    updateStickyActionBarVisibility();
  }
);

function download(name,blob) {
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

$("exportJsonBtn").onclick=()=>{
  syncHeaderToFamily();
  download(
    (family.family_id||"pedigree")+".json",
    new Blob([JSON.stringify(family,null,2)],{type:"application/json;charset=utf-8"})
  );
};


function pedSafeToken(value, fallback="0") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(/\s+/g, "_");
}

function pedSexCode(person) {
  if (!person) return "0";
  if (person.sex_at_birth === "male" || person.gender === "man") return "1";
  if (person.sex_at_birth === "female" || person.gender === "woman") return "2";
  return "0";
}

function pedPhenotypeCode(person) {
  if (!person) return "-9";
  if (person.affected) return "2";
  if (person.clinical && person.clinical.phenotype_status === "unknown") return "-9";
  return "1";
}

function biologicalParentsForPed(uid) {
  const rel = (family.relationships || []).find(r =>
    r.type === "parentage" &&
    r.descent_type !== "adoptive" &&
    (r.children || []).includes(uid)
  );
  return rel ? (rel.parents || []).slice() : [];
}

function exportPedText() {
  const fid = pedSafeToken(family.family_id || "FAM001", "FAM001");
  const byUid = new Map((family.people || []).map(p => [p.uid, p]));
  const lines = [];
  const warnings = [];

  (family.people || []).forEach(person => {
    if ((person.record_type || "person") !== "person") {
      warnings.push(t('ped.export.omittedType',{uid:person.uid,type:person.record_type}));
      return;
    }

    const parents = biologicalParentsForPed(person.uid)
      .map(uid => byUid.get(uid))
      .filter(Boolean)
      .filter(p => (p.record_type || "person") === "person");

    let father = parents.find(p => pedSexCode(p) === "1") || null;
    let mother = parents.find(p => pedSexCode(p) === "2") || null;

    // PED clásico exige PID/MID. Si el sexo no permite asignar el rol,
    // no inventamos padre/madre: se exporta 0 y se avisa al usuario.
    if (parents.length && !father && !mother) {
      warnings.push(t("validation.ped.missingSexParents",{uid:person.uid}));
    } else if (parents.length > ((father ? 1 : 0) + (mother ? 1 : 0))) {
      warnings.push(t("validation.ped.parentageIncomplete",{uid:person.uid}));
    }

    lines.push([
      fid,
      pedSafeToken(person.uid, "0"),
      father ? pedSafeToken(father.uid, "0") : "0",
      mother ? pedSafeToken(mother.uid, "0") : "0",
      pedSexCode(person),
      pedPhenotypeCode(person)
    ].join("\t"));
  });

  return { text: lines.join("\n") + (lines.length ? "\n" : ""), warnings };
}

$("exportPedBtn").onclick=()=>{
  syncHeaderToFamily();
  const result = exportPedText();
  if (!result.text.trim()) {
    message(t("validation.export.noPEDCompatible"),"error");
    return;
  }
  if (result.warnings.length) {
    const preview = result.warnings.slice(0, 8).join("\n");
    const extra = result.warnings.length > 8
      ? '\n' + t('ped.export.moreWarnings',{count:result.warnings.length - 8})
      : "";
    if (!confirm(
      t('ped.export.incomplete') + '\n\n' +
      preview + extra + '\n\n' + t('ped.export.confirm')
    )) return;
  }
  download(
    (family.family_id||"pedigree")+".ped",
    new Blob([result.text],{type:"text/plain;charset=utf-8"})
  );
  message(t('ped.export.done'),'success');
};

function parsePedText(text) {
  const rows = [];
  const errors = [];
  const warnings = [];
  const seen = new Set();
  let detectedFid = "";

  String(text || "").split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const cols = line.split(/\s+/);
    if (cols.length < 6) {
      errors.push(t("ped.import.lineColumns",{line:index+1}));
      return;
    }
    const [fid, iid, pid, mid, sex, phenotype] = cols;
    if (!iid || iid === "0") {
      errors.push(t("ped.import.iidInvalid",{line:index+1}));
      return;
    }
    if (seen.has(iid)) {
      errors.push(t("ped.import.iidDuplicate",{line:index+1,iid}));
      return;
    }
    if (!["0","1","2"].includes(sex)) {
      warnings.push(t("ped.import.sexUnknown",{line:index+1,sex}));
    }
    if (!["0","-9","1","2"].includes(phenotype)) {
      warnings.push(t("ped.import.phenotypeUnknown",{line:index+1,phenotype}));
    }
    if (!detectedFid) detectedFid = fid;
    if (fid !== detectedFid) {
      errors.push(t("ped.import.fidMismatch",{line:index+1,fid}));
      return;
    }
    seen.add(iid);
    rows.push({ fid, iid, pid, mid, sex, phenotype, line:index + 1 });
  });

  if (!rows.length && !errors.length) errors.push(t("validation.storage.emptyPED"));

  const ids = new Set(rows.map(r => r.iid));
  rows.forEach(r => {
    [['father',r.pid],['mother',r.mid]].forEach(([role,id]) => {
      if (id !== "0" && !ids.has(id)) {
        errors.push(t('ped.import.referenceMissing',{line:r.line,role:t('ped.import.role.'+role),id}));
      }
    });
    if (r.pid !== "0" && r.pid === r.mid) {
      errors.push(t("ped.import.sameParents",{line:r.line}));
    }
  });

  if (errors.length) {
    throw new Error(errors.slice(0,10).join('\n') + (errors.length > 10 ? '\n' + t('ped.import.moreErrors',{count:errors.length-10}) : ''));
  }

  const imported = emptyFamily();
  imported.family_id = detectedFid || "FAM001";
  imported.people = rows.map(r => {
    const gender = r.sex === "1" ? "man" : r.sex === "2" ? "woman" : "unspecified";
    const sexAtBirth = r.sex === "1" ? "male" : r.sex === "2" ? "female" : "";
    const affected = r.phenotype === "2";
    const p = quickDefaultPerson(gender, sexAtBirth);
    p.uid = r.iid;
    p.label = r.iid;
    p.affected = affected;
    p.clinical.phenotype_status = affected ? "affected" : (r.phenotype === "1" ? "unaffected" : "unknown");
    return p;
  });

  const parentGroups = new Map();
  rows.forEach(r => {
    const parents = [r.pid, r.mid].filter(id => id && id !== "0");
    if (!parents.length) return;
    const key = `${r.pid}|${r.mid}`;
    if (!parentGroups.has(key)) parentGroups.set(key, { parents, children:[] });
    parentGroups.get(key).children.push(r.iid);
  });

  const unionKeys = new Set();
  parentGroups.forEach(group => {
    if (group.parents.length === 2) {
      const key = group.parents.slice().sort().join("|");
      if (!unionKeys.has(key)) {
        unionKeys.add(key);
        imported.relationships.push({
          type:"union",
          people:group.parents.slice(),
          intergenerational:false,
          consanguineous:false,
          consanguinity_degree:"",
          relationship_status:"current",
          reproductive_status:"none",
          reproductive_attribution:"union",
          reproductive_reason:""
        });
      }
    }
    imported.relationships.push({
      type:"parentage",
      parents:group.parents.slice(),
      children:group.children.slice(),
      descent_type:"biological"
    });
  });

  return { family: normalizeFamily(imported), rows, warnings };
}

$("importPedInput").addEventListener("change", async e=>{
  const f=e.target.files && e.target.files[0];
  if (!f) return;

  try {
    const parsed = parsePedText(await f.text());
    const founders = parsed.rows.filter(r => r.pid === "0" && r.mid === "0").length;
    const affected = parsed.rows.filter(r => r.phenotype === "2").length;
    const unknownSex = parsed.rows.filter(r => !["1","2"].includes(r.sex)).length;
    const warningText = parsed.warnings.length
      ? '\n\n'+t('ped.import.warnings')+'\n'+parsed.warnings.slice(0,8).join('\n')+(parsed.warnings.length>8 ? '\n…' : '')
      : "";

    const ok = confirm(
      t('ped.import.title')+'\n\n'+
      t('ped.import.family',{id:parsed.family.family_id})+'\n'+
      t('ped.import.individuals',{count:parsed.rows.length})+'\n'+
      t('ped.import.founders',{count:founders})+'\n'+
      t('ped.import.affected',{count:affected})+'\n'+
      t('ped.import.unknownSex',{count:unknownSex})+
      warningText+'\n\n'+t('ped.import.confirm')
    );
    if (!ok) return;

    pushUndoState();

    family = parsed.family;
    family.review_status = {
      reviewed:false,
      reviewed_at:""
    };
    selectedPersonUid = null;
    syncFamilyToHeader();
    resetPersonForm();
    renderPedigree();
    fitPedigreeToWidthAfterLoad();
    message(t('ped.import.done'),'success');
  } catch(err) {
    message(t('ped.import.failed',{error:err.message}),'error');
  } finally {
    e.target.value="";
  }
});



function wrapExportText(text,maxChars=105) {
  const source = String(text || "").trim();

  if (!source) return [];

  const words = source.split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach(word => {
    const candidate = line
      ? `${line} ${word}`
      : word;

    if (
      line &&
      candidate.length > maxChars
    ) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) lines.push(line);

  return lines;
}

function appendExportText(
  parent,
  x,
  y,
  text,
  className="export-report-text",
  maxChars=105,
  lineHeight=16
) {
  const lines = wrapExportText(
    text,
    maxChars
  );

  if (!lines.length) return y;

  const node = svgEl("text", {
    x,
    y,
    class:className
  });

  lines.forEach((line,index) => {
    node.appendChild(
      svgEl("tspan", {
        x,
        dy:index === 0 ? 0 : lineHeight
      },line)
    );
  });

  parent.appendChild(node);

  return y +
    Math.max(
      lineHeight,
      lines.length*lineHeight
    );
}

function exportConditionStatesForPerson(p) {
  if (
    !p ||
    !supportsPedigreeConditions(p)
  ) {
    return [];
  }

  return (p.condition_states || [])
    .map(state => ({
      state,
      condition:conditionById(
        state.condition_id
      )
    }))
    .filter(item =>
      item.condition &&
      item.state &&
      item.state.status
    );
}

function exportConditionStatusUsage(condition) {
  const statuses = new Set();

  family.people
    .filter(p =>
      supportsPedigreeConditions(p)
    )
    .forEach(p => {
      const state = (p.condition_states || [])
        .find(s =>
          s.condition_id === condition.id
        );

      if (!state || !state.status) return;

      if (state.status === "affected") {
        statuses.add("affected");
      }

      if (
        state.status === "carrier" &&
        [
          "autosomal_recessive",
          "x_linked_recessive"
        ].includes(condition.inheritance)
      ) {
        statuses.add("carrier");
      }

      if (state.status === "presymptomatic") {
        statuses.add("presymptomatic");
      }

      if (state.status === "unknown") {
        statuses.add("unknown");
      }
    });

  return [
    "affected",
    "carrier",
    "presymptomatic",
    "unknown"
  ].filter(status => statuses.has(status));
}

function exportPatternFill(pattern) {
  if (!pattern || pattern === "solid") {
    return "#111";
  }

  const supported = [
    "diagonal",
    "crosshatch",
    "dots",
    "horizontal",
    "vertical"
  ];

  if (supported.includes(pattern)) {
    return `url(#cond-${pattern})`;
  }

  return "#111";
}

function exportGeneralLegendEntries() {
  const used = mainLegendUsage();

  return [
    [used.hasMale,"male","Hombre / niño"],
    [used.hasFemale,"female","Mujer / niña"],
    [
      used.hasDiverseGender,
      "diamond",
      "Género diverso / no especificado"
    ],
    [
      used.hasAffected,
      "affected",
      "Afectado"
    ],
    [
      used.hasDeceased,
      "deceased",
      "Fallecido"
    ],
    [
      used.hasConsultand,
      "consultand",
      "Consultante"
    ],
    [
      used.hasProband,
      "proband",
      "Probando"
    ],
    [
      used.hasSab,
      "sab",
      "Aborto espontáneo (SAB)"
    ],
    [
      used.hasTop,
      "top",
      "Interrupción del embarazo (TOP)"
    ],
    [
      used.hasEct,
      "ect",
      "Embarazo ectópico (ECT)"
    ],
    [
      used.hasStillbirth,
      "stillbirth",
      "Mortinato (SB)"
    ],
    [
      used.hasAdoptedIn,
      "adopted_in",
      "Adoptado/a en la familia"
    ],
    [
      used.hasAdoptedOut,
      "adopted_out",
      "Dado/a en adopción"
    ],
    [
      used.hasAdoptiveLine,
      "adoptive_line",
      "Filiación adoptiva"
    ],
    [
      used.hasEndedUnion,
      "ended_union",
      "Relación finalizada"
    ],
    [
      used.hasFamilyHistoryUnknown,
      "history_unknown",
      "Historia familiar no disponible/desconocida"
    ],
    [
      used.hasNoChildren,
      "no_children",
      "No descendencia por elección / motivo desconocido"
    ],
    [
      used.hasInfertility,
      "infertility",
      "Infertilidad"
    ],
    [
      used.hasDonor,
      "donor",
      "Donante de gametos (D)"
    ],
    [
      used.hasSurrogate,
      "surrogate",
      "Surrogate: donante de óvulos y gestante"
    ],
    [
      used.hasGestationalCarrier,
      "gestational_carrier",
      "Gestante / gestational carrier (G)"
    ],
    [
      used.hasFetus,
      "fetus",
      "Feto / embarazo (P)"
    ],
    [
      used.hasMultipleIndividuals,
      "multiple",
      "Varios individuos (número conocido)"
    ],
    [
      used.hasMultipleIndividualsUnknown,
      "multiple_unknown",
      "Varios individuos (número desconocido/no especificado)"
    ],
    [
      used.hasTrizygotic,
      "trizygotic",
      "Trillizos tricigóticos"
    ]
  ]
    .filter(entry => entry[0])
    .map(([,kind,label]) => ({
      kind,
      label
    }));
}

function pdfLegendSvgBase() {
  const svg = svgEl("svg", {
    xmlns:svgNS,
    viewBox:"0 0 36 28",
    width:"36",
    height:"28"
  });

  const defs = svgEl("defs");

  const marker = svgEl("marker", {
    id:"arrowhead",
    markerWidth:8,
    markerHeight:8,
    refX:6,
    refY:3,
    orient:"auto",
    markerUnits:"strokeWidth"
  });

  marker.appendChild(svgEl("path", {
    d:"M0,0 L0,6 L7,3 z",
    fill:"#111"
  }));

  defs.appendChild(marker);
  addConditionPatternDefs(defs);
  svg.appendChild(defs);

  const style = svgEl(
    "style",
    {},
    `
      .export-report-icon {
        fill:#fff;
        stroke:#111;
        stroke-width:1.5;
      }
      .export-report-icon-filled {
        fill:#111;
        stroke:#111;
        stroke-width:1.5;
      }
      .export-report-icon-line {
        fill:none;
        stroke:#111;
        stroke-width:1.5;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .export-report-icon-text {
        fill:#111;
        font-family:Arial,Helvetica,sans-serif;
        font-size:10px;
        font-weight:700;
        text-anchor:middle;
        dominant-baseline:middle;
      }
      .export-report-icon-text-small {
        fill:#111;
        font-family:Arial,Helvetica,sans-serif;
        font-size:6px;
        font-weight:700;
        text-anchor:middle;
        dominant-baseline:middle;
      }
    `
  );

  svg.appendChild(style);

  return svg;
}

function serializePdfLegendSvg(svg) {
  return new XMLSerializer()
    .serializeToString(svg);
}

function pdfGeneralLegendIconSvg(kind) {
  const svg = pdfLegendSvgBase();

  drawExportLegendIcon(
    svg,
    kind,
    18,
    14
  );

  return serializePdfLegendSvg(svg);
}

function drawPdfConditionLegendPattern(
  parent,
  pattern,
  color,
  x,
  y
) {
  const inner = 12;
  const h = inner/2;

  if (!pattern || pattern === "solid") {
    parent.appendChild(svgEl("rect", {
      x:x-h,
      y:y-h,
      width:inner,
      height:inner,
      fill:color,
      stroke:"none"
    }));
    return;
  }

  const lineAttrs = {
    stroke:color,
    "stroke-width":1.05,
    fill:"none",
    "stroke-linecap":"square"
  };

  if (pattern === "horizontal") {
    [-4,0,4].forEach(dy => {
      parent.appendChild(svgEl("line", {
        x1:x-h,
        y1:y+dy,
        x2:x+h,
        y2:y+dy,
        ...lineAttrs
      }));
    });
    return;
  }

  if (pattern === "vertical") {
    [-4,0,4].forEach(dx => {
      parent.appendChild(svgEl("line", {
        x1:x+dx,
        y1:y-h,
        x2:x+dx,
        y2:y+h,
        ...lineAttrs
      }));
    });
    return;
  }

  if (pattern === "diagonal") {
    [
      [-6, 1, -1, 6],
      [-6,-4,  4, 6],
      [-4,-6,  6, 4],
      [ 1,-6,  6,-1]
    ].forEach(([x1,y1,x2,y2]) => {
      parent.appendChild(svgEl("line", {
        x1:x+x1,
        y1:y+y1,
        x2:x+x2,
        y2:y+y2,
        ...lineAttrs
      }));
    });
    return;
  }

  if (pattern === "crosshatch") {
    [
      [-6, 1, -1, 6],
      [-6,-4,  4, 6],
      [-4,-6,  6, 4],
      [ 1,-6,  6,-1],
      [-6,-1, -1,-6],
      [-6, 4,  4,-6],
      [-4, 6,  6,-4],
      [ 1, 6,  6, 1]
    ].forEach(([x1,y1,x2,y2]) => {
      parent.appendChild(svgEl("line", {
        x1:x+x1,
        y1:y+y1,
        x2:x+x2,
        y2:y+y2,
        ...lineAttrs
      }));
    });
    return;
  }

  if (pattern === "dots") {
    [-4,0,4].forEach(dx => {
      [-4,0,4].forEach(dy => {
        parent.appendChild(svgEl("circle", {
          cx:x+dx,
          cy:y+dy,
          r:0.85,
          fill:color,
          stroke:"none"
        }));
      });
    });
    return;
  }

  // Fallback conservador para cualquier patrón no reconocido.
  parent.appendChild(svgEl("rect", {
    x:x-h,
    y:y-h,
    width:inner,
    height:inner,
    fill:color,
    stroke:"none"
  }));
}

function drawPdfConditionLegendSwatch(
  parent,
  condition,
  status,
  x,
  y
) {
  const size = 14;
  const h = size/2;

  parent.appendChild(svgEl("rect", {
    x:x-h,
    y:y-h,
    width:size,
    height:size,
    fill:"#fff",
    stroke:"#111",
    "stroke-width":1.5
  }));

  if (
    status === "affected" ||
    status === "carrier"
  ) {
    const pattern =
      status === "carrier"
        ? normalizeCarrierPattern(
            condition.carrier_pattern
          )
        : "solid";

    drawPdfConditionLegendPattern(
      parent,
      pattern,
      conditionColor(condition),
      x,
      y
    );
    return;
  }

  if (status === "presymptomatic") {
    parent.appendChild(svgEl("line", {
      x1:x,
      y1:y-h+1,
      x2:x,
      y2:y+h-1,
      stroke:"#111",
      "stroke-width":1.5
    }));
    return;
  }

  if (status === "unknown") {
    parent.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"export-report-icon-text"
    },"?"));
  }
}

function pdfConditionLegendIconSvg(
  condition,
  status
) {
  const svg = pdfLegendSvgBase();

  /*
   * No usar fill="url(#...)" aquí:
   * Dompdf puede convertir esos pattern fills en negro sólido.
   * Para el PDF dibujamos rayas/puntos explícitos.
   */
  drawPdfConditionLegendSwatch(
    svg,
    condition,
    status,
    18,
    14
  );

  return serializePdfLegendSvg(svg);
}


function drawExportLegendIcon(
  parent,
  kind,
  x,
  y
) {
  const s = 14;
  const h = s/2;

  if (kind === "male") {
    parent.appendChild(svgEl("rect", {
      x:x-h,
      y:y-h,
      width:s,
      height:s,
      class:"export-report-icon"
    }));
    return;
  }

  if (kind === "female") {
    parent.appendChild(svgEl("circle", {
      cx:x,
      cy:y,
      r:h,
      class:"export-report-icon"
    }));
    return;
  }

  if (kind === "diamond") {
    parent.appendChild(svgEl("polygon", {
      points:
        `${x},${y-h} ` +
        `${x+h},${y} ` +
        `${x},${y+h} ` +
        `${x-h},${y}`,
      class:"export-report-icon"
    }));
    return;
  }

  if (kind === "affected") {
    parent.appendChild(svgEl("rect", {
      x:x-h,
      y:y-h,
      width:s,
      height:s,
      class:"export-report-icon-filled"
    }));
    return;
  }

  if (kind === "deceased") {
    parent.appendChild(svgEl("rect", {
      x:x-h,
      y:y-h,
      width:s,
      height:s,
      class:"export-report-icon"
    }));
    parent.appendChild(svgEl("line", {
      x1:x-h-2,
      y1:y+h+2,
      x2:x+h+2,
      y2:y-h-2,
      class:"export-report-icon-line"
    }));
    return;
  }

  if (kind === "stillbirth") {
    parent.appendChild(svgEl("rect", {
      x:x-h,
      y:y-h,
      width:s,
      height:s,
      class:"export-report-icon"
    }));
    parent.appendChild(svgEl("line", {
      x1:x-h-2,
      y1:y+h+2,
      x2:x+h+2,
      y2:y-h-2,
      class:"export-report-icon-line"
    }));
    return;
  }

  if (
    kind === "consultand" ||
    kind === "proband"
  ) {
    parent.appendChild(svgEl("line", {
      x1:x-8,
      y1:y+7,
      x2:x+5,
      y2:y-5,
      class:"export-report-icon-line",
      "marker-end":"url(#arrowhead)"
    }));

    if (kind === "proband") {
      parent.appendChild(svgEl("text", {
        x:x-13,
        y:y+8,
        class:"export-report-icon-text"
      },"P"));
    }

    return;
  }

  if (
    kind === "sab" ||
    kind === "top" ||
    kind === "ect"
  ) {
    parent.appendChild(svgEl("polygon", {
      points:
        `${x},${y-h} ` +
        `${x+h},${y+h} ` +
        `${x-h},${y+h}`,
      class:"export-report-icon"
    }));

    if (
      kind === "top" ||
      kind === "ect"
    ) {
      parent.appendChild(svgEl("line", {
        x1:x-h-2,
        y1:y+h+2,
        x2:x+h+2,
        y2:y-h-2,
        class:"export-report-icon-line"
      }));
    }

    return;
  }

  if (kind === "adopted_in" || kind === "adopted_out" || kind === "adopted") {
    const adoptedIn = kind === "adopted_in";

    // Pequeña línea de descendencia para diferenciar visualmente en leyenda:
    // discontinua = relación adoptiva (Adopted in), continua = biológica
    // (Adopted out). Los corchetes siguen identificando al individuo adoptado.
    parent.appendChild(svgEl("line", {
      x1:x,
      y1:y-h-6,
      x2:x,
      y2:y-h+1,
      class:"export-report-icon-line",
      ...(adoptedIn ? {"stroke-dasharray":"3 2"} : {})
    }));

    parent.appendChild(svgEl("circle", {
      cx:x,
      cy:y,
      r:h-1,
      class:"export-report-icon"
    }));
    parent.appendChild(svgEl("path", {
      d:
        `M ${x-h-4} ${y-h} ` +
        `L ${x-h-7} ${y-h} ` +
        `L ${x-h-7} ${y+h} ` +
        `L ${x-h-4} ${y+h}`,
      class:"export-report-icon-line"
    }));
    parent.appendChild(svgEl("path", {
      d:
        `M ${x+h+4} ${y-h} ` +
        `L ${x+h+7} ${y-h} ` +
        `L ${x+h+7} ${y+h} ` +
        `L ${x+h+4} ${y+h}`,
      class:"export-report-icon-line"
    }));
    return;
  }

  if (kind === "adoptive_line") {
    parent.appendChild(svgEl("line", {
      x1:x-9,
      y1:y,
      x2:x+9,
      y2:y,
      class:"export-report-icon-line",
      "stroke-dasharray":"5 4"
    }));
    return;
  }

  if (kind === "ended_union") {
    parent.appendChild(svgEl("line", {
      x1:x-10,
      y1:y,
      x2:x+10,
      y2:y,
      class:"export-report-icon-line"
    }));
    parent.appendChild(svgEl("line", {
      x1:x-2,
      y1:y+5,
      x2:x+2,
      y2:y-5,
      class:"export-report-icon-line"
    }));
    parent.appendChild(svgEl("line", {
      x1:x+3,
      y1:y+5,
      x2:x+7,
      y2:y-5,
      class:"export-report-icon-line"
    }));
    return;
  }

  if (kind === "history_unknown") {
    parent.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"export-report-icon-text"
    },"?"));
    return;
  }

  if (
    kind === "no_children" ||
    kind === "infertility"
  ) {
    parent.appendChild(svgEl("line", {
      x1:x,
      y1:y-8,
      x2:x,
      y2:y+2,
      class:"export-report-icon-line"
    }));
    parent.appendChild(svgEl("line", {
      x1:x-6,
      y1:y+2,
      x2:x+6,
      y2:y+2,
      class:"export-report-icon-line"
    }));

    if (kind === "infertility") {
      parent.appendChild(svgEl("line", {
        x1:x-6,
        y1:y+6,
        x2:x+6,
        y2:y+6,
        class:"export-report-icon-line"
      }));
    }

    return;
  }

  if (kind === "donor") {
    parent.appendChild(svgEl("circle", {
      cx:x,
      cy:y,
      r:h,
      class:"export-report-icon"
    }));
    parent.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"export-report-icon-text"
    },"D"));
    return;
  }

  if (kind === "surrogate") {
    const donorY = 7;
    const pregnancyY = 21;

    parent.appendChild(svgEl("circle", {
      cx:x,
      cy:donorY,
      r:5,
      class:"export-report-icon"
    }));
    parent.appendChild(svgEl("text", {
      x,
      y:donorY+1,
      class:"export-report-icon-text-small"
    },"D"));
    parent.appendChild(svgEl("line", {
      x1:x,
      y1:12,
      x2:x,
      y2:16,
      class:"export-report-icon-line"
    }));
    parent.appendChild(svgEl("polygon", {
      points:
        `${x},${pregnancyY-5} ` +
        `${x+5},${pregnancyY} ` +
        `${x},${pregnancyY+5} ` +
        `${x-5},${pregnancyY}`,
      class:"export-report-icon"
    }));
    parent.appendChild(svgEl("text", {
      x,
      y:pregnancyY+1,
      class:"export-report-icon-text-small"
    },"P"));
    return;
  }

  if (kind === "gestational_carrier") {
    parent.appendChild(svgEl("circle", {
      cx:x,
      cy:y,
      r:h,
      class:"export-report-icon"
    }));
    parent.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"export-report-icon-text"
    },"G"));
    return;
  }

  if (kind === "fetus") {
    parent.appendChild(svgEl("polygon", {
      points:
        `${x},${y-h} ` +
        `${x+h},${y} ` +
        `${x},${y+h} ` +
        `${x-h},${y}`,
      class:"export-report-icon"
    }));
    parent.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"export-report-icon-text"
    },"P"));
    return;
  }

  if (
    kind === "multiple" ||
    kind === "multiple_unknown"
  ) {
    parent.appendChild(svgEl("rect", {
      x:x-h,
      y:y-h,
      width:s,
      height:s,
      class:"export-report-icon"
    }));
    parent.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"export-report-icon-text"
    },kind === "multiple_unknown" ? "n" : "3"));
    return;
  }

  if (kind === "trizygotic") {
    parent.appendChild(svgEl("line", {
      x1:x,
      y1:y-8,
      x2:x,
      y2:y-2,
      class:"export-report-icon-line"
    }));

    [-7,0,7].forEach(dx => {
      parent.appendChild(svgEl("line", {
        x1:x,
        y1:y-2,
        x2:x+dx,
        y2:y+7,
        class:"export-report-icon-line"
      }));
    });

    return;
  }
}

function drawExportConditionSwatch(
  parent,
  condition,
  status,
  x,
  y
) {
  const size = 14;
  const h = size/2;

  parent.appendChild(svgEl("rect", {
    x:x-h,
    y:y-h,
    width:size,
    height:size,
    class:"export-report-icon"
  }));

  if (status === "affected") {
    parent.appendChild(svgEl("rect", {
      x:x-h+1,
      y:y-h+1,
      width:size-2,
      height:size-2,
      fill:conditionColor(condition),
      stroke:"none"
    }));
    return;
  }

  if (status === "carrier") {
    parent.appendChild(svgEl("rect", {
      x:x-h+1,
      y:y-h+1,
      width:size-2,
      height:size-2,
      fill:conditionPatternFill(
        condition,
        "carrier"
      ),
      stroke:"none"
    }));
    return;
  }

  if (status === "presymptomatic") {
    parent.appendChild(svgEl("line", {
      x1:x,
      y1:y-h+1,
      x2:x,
      y2:y+h-1,
      class:"export-report-icon-line"
    }));
    return;
  }

  if (status === "unknown") {
    parent.appendChild(svgEl("text", {
      x,
      y:y+1,
      class:"export-report-icon-text"
    },"?"));
  }
}

function appendExportReport(svgNode) {
  const rawViewBox =
    String(
      svgNode.getAttribute("viewBox") ||
      ""
    )
      .trim()
      .split(/\s+/)
      .map(Number);

  if (
    rawViewBox.length !== 4 ||
    rawViewBox.some(v => !Number.isFinite(v))
  ) {
    return;
  }

  const [
    viewX,
    viewY,
    viewWidth,
    originalHeight
  ] = rawViewBox;

  const left = viewX + 48;
  const right = viewX + viewWidth - 48;
  const contentWidth = Math.max(
    300,
    right-left
  );

  const report = svgEl("g", {
    class:"export-report"
  });

  let y =
    viewY +
    originalHeight +
    38;

  report.appendChild(svgEl("line", {
    x1:left,
    y1:y,
    x2:right,
    y2:y,
    class:"export-report-separator"
  }));

  y += 34;

  report.appendChild(svgEl("text", {
    x:left,
    y,
    class:"export-report-title"
  },t("label.pdf.pedigreeInfo")));

  y += 28;

  report.appendChild(svgEl("text", {
    x:left,
    y,
    class:"export-report-label"
  },"ID de familia"));

  y = appendExportText(
    report,
    left+110,
    y,
    family.family_id || "—",
    "export-report-text",
    80,
    16
  );

  y += 6;

  report.appendChild(svgEl("text", {
    x:left,
    y,
    class:"export-report-label"
  },"Indicación"));

  y = appendExportText(
    report,
    left+110,
    y,
    family.indication || "—",
    "export-report-text",
    Math.max(
      45,
      Math.floor(contentWidth/7)
    ),
    16
  );

  y += 24;

  // -------------------------------------------------------
  // Leyenda general
  // -------------------------------------------------------
  report.appendChild(svgEl("text", {
    x:left,
    y,
    class:"export-report-section-title"
  },t("label.pdf.legend")));

  y += 24;

  const generalEntries =
    exportGeneralLegendEntries();

  const columns =
    contentWidth >= 760 ? 2 : 1;

  const colWidth =
    contentWidth/columns;

  const rowHeight = 25;

  generalEntries.forEach((entry,index) => {
    const col =
      index % columns;

    const row =
      Math.floor(index/columns);

    const ix =
      left +
      col*colWidth +
      12;

    const iy =
      y +
      row*rowHeight;

    drawExportLegendIcon(
      report,
      entry.kind,
      ix,
      iy-4
    );

    appendExportText(
      report,
      ix+20,
      iy,
      entry.label,
      "export-report-text",
      Math.max(
        25,
        Math.floor(
          (colWidth-36)/7
        )
      ),
      15
    );
  });

  if (generalEntries.length) {
    y +=
      Math.ceil(
        generalEntries.length/columns
      )*rowHeight +
      10;
  }

  // -------------------------------------------------------
  // Leyenda específica de condiciones
  // -------------------------------------------------------
  const conditionLegendRows = [];

  (family.conditions || [])
    .forEach(condition => {
      exportConditionStatusUsage(condition)
        .forEach(status => {
          let label;

          if (status === "affected") {
            label =
              t("pdf.status.affected", {name:condition.name || condition.id});
          } else if (status === "carrier") {
            label =
              t("pdf.status.carrier", {name:condition.name || condition.id});
          } else if (status === "presymptomatic") {
            label =
              t("pdf.status.presymptomatic", {name:condition.name || condition.id});
          } else {
            label =
              t("pdf.status.unknown", {name:condition.name || condition.id});
          }

          conditionLegendRows.push({
            condition,
            status,
            label
          });
        });
    });

  if (conditionLegendRows.length) {
    report.appendChild(svgEl("text", {
      x:left,
      y,
      class:"export-report-section-title"
    },"Condiciones representadas"));

    y += 22;

    conditionLegendRows.forEach(row => {
      drawExportConditionSwatch(
        report,
        row.condition,
        row.status,
        left+12,
        y-4
      );

      y = appendExportText(
        report,
        left+34,
        y,
        row.label,
        "export-report-text",
        Math.max(
          50,
          Math.floor(
            (contentWidth-42)/7
          )
        ),
        15
      );

      y += 5;
    });

  }

  const dynamicNote =
    $("legendDynamicNote");

  if (
    dynamicNote &&
    !dynamicNote.hidden &&
    dynamicNote.textContent.trim()
  ) {
    y = appendExportText(
      report,
      left,
      y,
      dynamicNote.textContent.trim(),
      "export-report-muted",
      Math.max(
        60,
        Math.floor(contentWidth/7)
      ),
      15
    );

    y += 14;
  }

  // -------------------------------------------------------
  // Resumen de estados respecto a condiciones
  // -------------------------------------------------------
  const peopleWithConditionData =
    family.people
      .filter(p =>
        supportsPedigreeConditions(p) &&
        exportConditionStatesForPerson(p)
          .length > 0
      )
      .sort((a,b) => {
        const pa = currentNumbers.get(a.uid) || a.uid;
        const pb = currentNumbers.get(b.uid) || b.uid;

        return pa.localeCompare(
          pb,
          "es",
          {numeric:true}
        );
      });

  if (peopleWithConditionData.length) {
    report.appendChild(svgEl("text", {
      x:left,
      y,
      class:"export-report-section-title"
    },t("label.pdf.conditions")));

    y += 24;

    peopleWithConditionData
      .forEach(p => {
        report.appendChild(svgEl("text", {
          x:left,
          y,
          class:"export-report-person-title"
        },pedigreeDisplayName(p.uid)));

        y += 19;

        exportConditionStatesForPerson(p)
          .forEach(({state,condition}) => {
            const conditionHead = [
              condition.name || condition.id,
              condition.gene || ""
            ]
              .filter(Boolean)
              .join(" · ");

            report.appendChild(svgEl("text", {
              x:left+14,
              y,
              class:"export-report-condition-title"
            },conditionHead));

            y += 17;

            const parts = [];

            parts.push(
              `${t("pdf.label.status")} ${
                CONDITION_STATUS_LABELS[
                  state.status
                ] || state.status
              }`
            );

            parts.push(
              `${t("pdf.label.molecularResult")} ${
                MOLECULAR_RESULT_LABELS[
                  state.molecular_result
                ] ||
                state.molecular_result ||
                t("pdf.label.notProvided")
              }`
            );

            if (state.variant) {
              parts.push(
                `${t("pdf.label.variant")} ${state.variant}`
              );
            }

            if (state.zygosity) {
              parts.push(
                `${t("pdf.label.zygosity")} ${
                  ZYGOSITY_LABELS[
                    state.zygosity
                  ] || state.zygosity
                }`
              );
            }

            if (state.genotype) {
              parts.push(
                `${t("pdf.label.genotype")} ${state.genotype}`
              );
            }

            if (state.documented_evaluation) {
              parts.push(
                t("pdf.label.documented")
              );
            }

            parts.forEach(part => {
              y = appendExportText(
                report,
                left+28,
                y,
                part,
                "export-report-text",
                Math.max(
                  55,
                  Math.floor(
                    (contentWidth-36)/7
                  )
                ),
                15
              );
            });

            y += 8;
          });

        y += 8;
      });
  }

  y += 24;

  svgNode.appendChild(report);

  svgNode.setAttribute(
    "viewBox",
    `${viewX} ${viewY} ${viewWidth} ${Math.ceil(y-viewY)}`
  );

  svgNode.setAttribute(
    "height",
    String(
      Math.ceil(y-viewY)
    )
  );
}


/*
 * 0.7.90 — Exportación SVG clínica mínima: dibujo + leyenda.
 * No incluye ID/indicación, resumen de estados, comentarios ni cabeceras de informe.
 */
function appendExportLegendOnly(svgNode) {
  const rawViewBox = String(svgNode.getAttribute("viewBox") || "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  if (
    rawViewBox.length !== 4 ||
    rawViewBox.some(v => !Number.isFinite(v))
  ) {
    return;
  }

  const [viewX, viewY, viewWidth, originalHeight] = rawViewBox;
  const left = viewX + 48;
  const right = viewX + viewWidth - 48;
  const contentWidth = Math.max(300, right - left);

  const entries = exportGeneralLegendEntries().map(entry => ({
    type:"general",
    ...entry
  }));

  (family.conditions || []).forEach(condition => {
    exportConditionStatusUsage(condition).forEach(status => {
      let label;

      if (status === "affected") {
        label = t("pdf.status.affected", {name:condition.name || condition.id});
      } else if (status === "carrier") {
        label = t("pdf.status.carrier", {name:condition.name || condition.id});
      } else if (status === "presymptomatic") {
        label = t("pdf.status.presymptomatic", {name:condition.name || condition.id});
      } else {
        label = t("pdf.status.unknown", {name:condition.name || condition.id});
      }

      entries.push({
        type:"condition",
        condition,
        status,
        label
      });
    });
  });

  if (!entries.length) return;

  const report = svgEl("g", { class:"export-report export-legend-only" });
  const columns =
    contentWidth >= 1050 ? 4 :
    contentWidth >= 760 ? 3 :
    contentWidth >= 500 ? 2 : 1;
  const colWidth = contentWidth / columns;
  const maxChars = Math.max(22, Math.floor((colWidth - 42) / 7));

  let y = viewY + originalHeight + 30;

  for (let rowStart = 0; rowStart < entries.length; rowStart += columns) {
    let rowBottom = y + 16;

    for (let col = 0; col < columns; col += 1) {
      const entry = entries[rowStart + col];
      if (!entry) continue;

      const ix = left + col * colWidth + 12;

      if (entry.type === "condition") {
        drawExportConditionSwatch(
          report,
          entry.condition,
          entry.status,
          ix,
          y - 4
        );
      } else {
        drawExportLegendIcon(
          report,
          entry.kind,
          ix,
          y - 4
        );
      }

      const textBottom = appendExportText(
        report,
        ix + 20,
        y,
        entry.label,
        "export-report-text",
        maxChars,
        15
      );

      rowBottom = Math.max(rowBottom, textBottom);
    }

    y = rowBottom + 7;
  }

  y += 12;
  svgNode.appendChild(report);
  svgNode.setAttribute(
    "viewBox",
    `${viewX} ${viewY} ${viewWidth} ${Math.ceil(y - viewY)}`
  );
  svgNode.setAttribute("height", String(Math.ceil(y - viewY)));
}

function collectInlineSvgExportCss() {
  const chunks = [];

  for (const sheet of Array.from(document.styleSheets || [])) {
    try {
      const rules = Array.from(sheet.cssRules || []);
      if (!rules.length) continue;

      const cssText = rules
        .map(rule => rule.cssText)
        .join("\n");

      if (cssText.trim()) {
        chunks.push(cssText);
      }
    } catch (err) {
      // Hoja inaccesible (cross-origin, navegador, etc.). La ignoramos.
    }
  }

  return chunks.join("\n");
}

function makeStandaloneSvgForExport(svgNode,includeReport=true) {
  const cleanSvg = svgNode.cloneNode(true);

  // El zoom/pan del visor es exclusivamente de pantalla. No debe alterar
  // las dimensiones ni el encuadre de SVG, PNG o PDF exportados.
  ["width","min-width","max-width","height","margin-left","margin-right"]
    .forEach(property => cleanSvg.style.removeProperty(property));

  // Elementos exclusivos de la interfaz: no deben formar parte del
  // pedigree clínico exportado.
  cleanSvg.querySelectorAll(".comment-indicator")
    .forEach(node => node.remove());

  cleanSvg.querySelectorAll(".clinical-review-marker")
    .forEach(node => node.remove());

  cleanSvg.querySelectorAll(".reviewed-in-session")
    .forEach(node =>
      node.classList.remove(
        "reviewed-in-session"
      )
    );

  cleanSvg.querySelectorAll(".selected-person")
    .forEach(node => node.classList.remove("selected-person"));

  // Aseguramos que el SVG sea autocontenido.
  cleanSvg.setAttribute("xmlns","http://www.w3.org/2000/svg");
  cleanSvg.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");
  cleanSvg.setAttribute("version","1.1");

  // El SVG clínico exportado incluye informe/leyenda.
  // Para rasterizar a PNG usamos el mismo SVG autocontenido, pero
  // sin el informe añadido debajo: queremos únicamente el árbol.
  if (includeReport) {
    appendExportReport(cleanSvg);
  }

  const styleText = collectInlineSvgExportCss();

  if (styleText.trim()) {
    // Eliminamos posibles estilos previos de exportación para no duplicar.
    cleanSvg.querySelectorAll("style[data-export-style='1']")
      .forEach(node => node.remove());

    const styleEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style"
    );
    styleEl.setAttribute("type","text/css");
    styleEl.setAttribute("data-export-style","1");
    styleEl.textContent = styleText;

    const defs = cleanSvg.querySelector("defs");
    if (defs && defs.parentNode) {
      defs.parentNode.insertBefore(styleEl, defs.nextSibling);
    } else if (cleanSvg.firstChild) {
      cleanSvg.insertBefore(styleEl, cleanSvg.firstChild);
    } else {
      cleanSvg.appendChild(styleEl);
    }
  }

  return cleanSvg;
}


/*
 * 0.7.64 — refuerzo óptico global de todos los trazos gráficos del árbol
 * incluido en el PDF. El texto queda intacto.
 *
 * El PNG temporal del PDF se rasteriza a alta resolución y después se reduce.
 * Para que el resultado conserve el peso visual del layout, reforzamos de
 * forma proporcional todos los trazos gráficos conocidos: estructura,
 * contornos, fallecimiento, probando, gemelos, adopción, consanguinidad,
 * reproducción, donantes, etc. No se modifican elementos <text>, la leyenda
 * del informe ni las máscaras usadas para resolver cruces.
 */
function strengthenPedigreeStrokesForPdf(svgNode) {
  const strokeGroups = [
    [".pedigree-line", 2.55],
    [".person-shape", 2.55],
    [".proband-arrow", 2.55],
    [".deceased-mark", 2.55],
    [".reproductive-status-line", 2.55],
    [".reproductive-status-bar", 2.55],
    [".individual-reproductive-status-line", 2.55],
    [".individual-reproductive-status-bar", 2.55],
    [".donor-link-line", 2.30],
    [".twin-zygosity-mark", 2.15],
    [".relationship-end-mark", 2.15],
    [".relationship-route-line", 2.05],
    [".consanguinity-line", 2.05],
    [".adoptive-line", 2.05],
    [".presymptomatic-mark", 2.05],
    [".adoption-bracket", 1.80],
    [".comment-indicator", 1.55]
  ];

  strokeGroups.forEach(([selector,width]) => {
    svgNode.querySelectorAll(selector).forEach(node => {
      if (node.closest(".export-report") || node.matches("text")) return;
      node.style.setProperty("stroke-width", String(width), "important");
      node.style.setProperty("vector-effect", "none", "important");
    });
  });

  // Cobertura de seguridad para símbolos gráficos menos frecuentes que lleven
  // el grosor definido directamente en el propio SVG. Se respeta su proporción
  // original y nunca se toca texto, informe ni máscaras de cruces.
  svgNode.querySelectorAll("line,path,rect,circle,ellipse,polygon,polyline")
    .forEach(node => {
      if (
        node.closest(".export-report") ||
        node.classList.contains("relationship-route-mask") ||
        node.classList.contains("pedigree-crossing-gap")
      ) return;

      if (node.style.getPropertyValue("stroke-width")) return;

      const raw = node.getAttribute("stroke-width");
      const width = raw ? parseFloat(raw) : NaN;
      if (Number.isFinite(width) && width > 0) {
        node.style.setProperty(
          "stroke-width",
          String(Math.max(width * 1.28, width + 0.35)),
          "important"
        );
        node.style.setProperty("vector-effect", "none", "important");
      }
    });
}


function rasterExportDimensions(svgNode) {
  const viewBox = String(
    svgNode.getAttribute("viewBox") || ""
  )
    .trim()
    .split(/\s+/)
    .map(Number);

  let width;
  let height;

  if (
    viewBox.length === 4 &&
    viewBox.every(Number.isFinite) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0
  ) {
    width = viewBox[2];
    height = viewBox[3];
  } else {
    width =
      Number(svgNode.getAttribute("width")) ||
      svgNode.getBoundingClientRect().width ||
      1000;

    height =
      Number(svgNode.getAttribute("height")) ||
      svgNode.getBoundingClientRect().height ||
      700;
  }

  // Objetivo: suficiente resolución para uso posterior en un PDF A4/A3,
  // sin crear canvases desproporcionados.
  const targetWidth = 3600;
  const maxScale = 4;

  let scale = Math.min(
    maxScale,
    targetWidth / width
  );

  if (!Number.isFinite(scale) || scale <= 0) {
    scale = 1;
  }

  // Nunca reducimos un pedigree que ya sea muy ancho.
  scale = Math.max(1, scale);

  // Protección conservadora frente a límites de canvas del navegador.
  const maxCanvasSide = 12000;

  if (width * scale > maxCanvasSide) {
    scale = maxCanvasSide / width;
  }

  if (height * scale > maxCanvasSide) {
    scale = Math.min(
      scale,
      maxCanvasSide / height
    );
  }

  return {
    sourceWidth:width,
    sourceHeight:height,
    scale,
    width:Math.max(1,Math.round(width*scale)),
    height:Math.max(1,Math.round(height*scale))
  };
}

function exportCurrentPedigreePng() {
  if (!currentSvg) return;

  const cleanSvg =
    makeStandaloneSvgForExport(
      currentSvg,
      false
    );

  const dimensions =
    rasterExportDimensions(cleanSvg);

  const serialized =
    new XMLSerializer()
      .serializeToString(cleanSvg);

  const svgBlob = new Blob(
    [serialized],
    {
      type:"image/svg+xml;charset=utf-8"
    }
  );

  const url =
    URL.createObjectURL(svgBlob);

  const image = new Image();

  image.onload = () => {
    try {
      const canvas =
        document.createElement("canvas");

      canvas.width =
        dimensions.width;

      canvas.height =
        dimensions.height;

      const ctx =
        canvas.getContext("2d");

      if (!ctx) {
        throw new Error(
          t("export.image.canvasUnavailable")
        );
      }

      // Fondo blanco explícito para que el PNG se comporte de forma
      // predecible al insertarlo posteriormente en Dompdf.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);

        if (!blob) {
          message(
            "No se pudo generar el PNG.",
            "error"
          );
          return;
        }

        download(
          (family.family_id || "pedigree") +
            ".png",
          blob
        );

        message(
          `PNG generado (${canvas.width} × ${canvas.height} px).`,
          "success"
        );
      },"image/png");
    } catch (err) {
      URL.revokeObjectURL(url);

      message(
        "No se pudo generar el PNG: " +
          err.message,
        "error"
      );
    }
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);

    message(
      "No se pudo rasterizar el pedigree a PNG.",
      "error"
    );
  };

  image.src = url;
}

$("exportPngBtn").onclick = () => {
  exportCurrentPedigreePng();
};


function svgExportToPngBlob(
  svgNode,
  includeReport
) {
  return new Promise((resolve,reject) => {
    const cleanSvg =
      makeStandaloneSvgForExport(
        svgNode,
        includeReport
      );

    strengthenPedigreeStrokesForPdf(cleanSvg);

    // Esta función sólo se usa para el PNG temporal del PDF.
    // Forzamos blanco aquí para neutralizar el :root gris del CSS
    // global sin alterar Exportar SVG ni Exportar PNG.
    cleanSvg.style.setProperty(
      "background",
      "#ffffff",
      "important"
    );
    cleanSvg.style.setProperty(
      "background-color",
      "#ffffff",
      "important"
    );

    const dimensions =
      rasterExportDimensions(cleanSvg);

    const serialized =
      new XMLSerializer()
        .serializeToString(cleanSvg);

    const svgBlob = new Blob(
      [serialized],
      {
        type:"image/svg+xml;charset=utf-8"
      }
    );

    const url =
      URL.createObjectURL(svgBlob);

    const image = new Image();

    image.onload = () => {
      try {
        const canvas =
          document.createElement("canvas");

        canvas.width =
          dimensions.width;

        canvas.height =
          dimensions.height;

        const ctx =
          canvas.getContext("2d");

        if (!ctx) {
          throw new Error(
            t("export.image.canvasUnavailable")
          );
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);

          if (!blob) {
            reject(
              new Error(
                t("export.image.pngBlobFailed")
              )
            );
            return;
          }

          resolve({
            blob,
            width:canvas.width,
            height:canvas.height
          });
        },"image/png");
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      reject(
        new Error(
          t("validation.export.noPDF")
        )
      );
    };

    image.src = url;
  });
}

function buildPdfReportData() {
  const generalLegend =
    exportGeneralLegendEntries()
      .map(entry => ({
        ...entry,
        label: window.PedigrAPPi18n.uiText(entry.label),
        icon_svg:
          pdfGeneralLegendIconSvg(
            entry.kind
          )
      }));

  const reportDate = new Date();

  const reportDateTime =
    reportDate.toLocaleString(
      (window.PedigrAPPi18n?.current()==="en" ? "en-GB" : "es-ES"),
      {
        day:"2-digit",
        month:"2-digit",
        year:"numeric",
        hour:"2-digit",
        minute:"2-digit",
        hour12:false
      }
    );

  const conditionLegend = [];

  (family.conditions || [])
    .forEach(condition => {
      exportConditionStatusUsage(condition)
        .forEach(status => {
          let label;
          let pattern = "";

          if (status === "affected") {
            label =
              t("pdf.status.affected", {name:condition.name || condition.id});
            pattern = "solid";
          } else if (status === "carrier") {
            label =
              t("pdf.status.carrier", {name:condition.name || condition.id});
            pattern =
              normalizeCarrierPattern(
                condition.carrier_pattern
              );
          } else if (status === "presymptomatic") {
            label =
              t("pdf.status.presymptomatic", {name:condition.name || condition.id});
          } else {
            label =
              t("pdf.status.unknown", {name:condition.name || condition.id});
          }

          conditionLegend.push({
            status,
            pattern,
            label,
            icon_svg:
              pdfConditionLegendIconSvg(
                condition,
                status
              )
          });
        });
    });

  const dynamicNote =
    $("legendDynamicNote");

  const people =
    family.people
      .filter(p =>
        recordType(p) === "person" &&
        exportConditionStatesForPerson(p)
          .length > 0
      )
      .sort((a,b) => {
        const pa =
          currentNumbers.get(a.uid) ||
          a.uid;
        const pb =
          currentNumbers.get(b.uid) ||
          b.uid;

        return pa.localeCompare(
          pb,
          "es",
          {numeric:true}
        );
      })
      .map(p => ({
        title:pedigreeDisplayName(p.uid),
        conditions:
          exportConditionStatesForPerson(p)
            .map(({state,condition}) => {
              const conditionHead = [
                condition.name || condition.id,
                condition.gene || ""
              ]
                .filter(Boolean)
                .join(" · ");

              const lines = [];

              lines.push(
                `${t("pdf.label.status")} ${
                  CONDITION_STATUS_LABELS[
                    state.status
                  ] || state.status
                }`
              );

              lines.push(
                `${t("pdf.label.molecularResult")} ${
                  MOLECULAR_RESULT_LABELS[
                    state.molecular_result
                  ] ||
                  state.molecular_result ||
                  t("pdf.label.notProvided")
                }`
              );

              if (state.variant) {
                lines.push(
                  `${t("pdf.label.variant")} ${state.variant}`
                );
              }

              if (state.zygosity) {
                lines.push(
                  `${t("pdf.label.zygosity")} ${
                    ZYGOSITY_LABELS[
                      state.zygosity
                    ] || state.zygosity
                  }`
                );
              }

              if (state.genotype) {
                lines.push(
                  `${t("pdf.label.genotype")} ${state.genotype}`
                );
              }

              if (state.documented_evaluation) {
                lines.push(
                  t("pdf.label.documented")
                );
              }

              return {
                title:conditionHead,
                lines
              };
            })
      }));

  const extendedComments =
    family.people
      .filter(p =>
        recordType(p) === "person" &&
        String(p.notes || "").trim() !== ""
      )
      .sort((a,b) => {
        const pa =
          currentNumbers.get(a.uid) ||
          a.uid;
        const pb =
          currentNumbers.get(b.uid) ||
          b.uid;

        return pa.localeCompare(
          pb,
          "es",
          {numeric:true}
        );
      })
      .map(p => ({
        title:pedigreeDisplayName(p.uid),
        comment:String(p.notes || "").trim()
      }));

  const pedigreeContainer =
    $("pedigreeContainer");

  /*
   * La orientación PDF se decide por la geometría real del pedigree,
   * nunca por el zoom interactivo que tenga el usuario en pantalla.
   */
  const naturalWidth = pedigreeSvgViewBoxWidth(currentSvg);
  const clientWidth = pedigreeContainer ? pedigreeContainer.clientWidth : 0;
  const scrollExcess = Math.max(0, naturalWidth - clientWidth);
  const scrollRatio = clientWidth > 0 ? naturalWidth / clientWidth : 1;

  const widePedigree = !!(
    pedigreeContainer &&
    scrollExcess > 520 &&
    scrollRatio > 1.33
  );

  return {
    app_version:APP_VERSION,
    report_datetime:reportDateTime,
    wide_pedigree:widePedigree,
    show_pedigree_numbers:
      pedigreeNumbersVisible(),
    family_id:
      family.family_id || "—",
    indication:
      family.indication || "—",
    pedigree_comments:
      String(family.pedigree_comments || "").trim(),
    general_legend:
      generalLegend,
    condition_legend:
      conditionLegend,
    /*
     * PDF:
     * Los símbolos de las condiciones se integran directamente en
     * "LEYENDA EXPLICATIVA DEL ÁRBOL". Las notas explicativas dinámicas
     * continúan disponibles en la interfaz, pero no se exportan al informe.
     */
    people,
    extended_comments:extendedComments
  };
}


function pdfPrintEscape(value) {
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function pdfPrintLegendItems(items, columns, extraClass="") {
  const list = items || [];
  if (!list.length) return `<div class="legend-columns ${extraClass}" style="--legend-columns:${columns}"></div>`;

  const safeColumns = Math.max(1, Math.min(columns || 1, list.length));
  const base = Math.floor(list.length / safeColumns);
  const remainder = list.length % safeColumns;
  let index = 0;
  const buckets = [];

  for (let i = 0; i < safeColumns; i += 1) {
    const size = base + (i < remainder ? 1 : 0);
    buckets.push(list.slice(index, index + size));
    index += size;
  }

  return `<div class="legend-columns ${extraClass}" style="--legend-columns:${safeColumns}">${buckets.map(bucket => `
    <div class="legend-column">${bucket.map(item => `
      <div class="legend-item">
        <span class="legend-icon">${item.icon_svg || ""}</span>
        <span class="legend-label">${pdfPrintEscape(item.label || "")}</span>
      </div>`).join("")}</div>`).join("")}</div>`;
}

function pdfPrintPedigreeCommentsHtml(comment) {
  const clean = String(comment || "").trim();
  if (!clean) return "";

  return `<section class="report-section pedigree-comments-section">
    <h2>${pdfPrintEscape(t("pdf.section.pedigreeComments"))}</h2>
    <div class="pedigree-comments-text">${pdfPrintEscape(clean).replace(/\n/g,"<br>")}</div>
  </section>`;
}

function pdfPrintPeopleHtml(people) {
  if (!(people || []).length) return "";

  return `<section class="report-section clinical-section">
    <h2>${pdfPrintEscape(t("pdf.section.selectedIndividuals"))}</h2>
    <div class="people-grid">${people.map(person => `
      <div class="person-block">
        <div class="person-title">${pdfPrintEscape(person.title || "")}</div>
        ${(person.conditions || []).map(condition => `
          <div class="condition-block">
            ${condition.title ? `<div class="condition-title">${pdfPrintEscape(condition.title)}</div>` : ""}
            ${(condition.lines || []).map(line => `<div class="condition-line">${pdfPrintEscape(line)}</div>`).join("")}
          </div>`).join("")}
      </div>`).join("")}</div>
  </section>`;
}

function pdfPrintCommentsHtml(comments) {
  if (!(comments || []).length) return "";

  return `<section class="report-section comments-section">
    <h2>${pdfPrintEscape(t("pdf.section.extendedComments"))}</h2>
    ${comments.map(item => `
      <div class="extended-comment-block">
        <div class="extended-comment-title">${pdfPrintEscape(item.title || "")}</div>
        <div class="extended-comment-text">${pdfPrintEscape(item.comment || "").replace(/\n/g,"<br>")}</div>
      </div>`).join("")}
  </section>`;
}

/*
 * v1.0.4 — Cabecera del informe con el logo propio de PedigrAPP.
 * Incrustamos en el HTML de impresión una copia PNG del logo ya cargado
 * en la cabecera de la aplicación. Así no depende de rutas relativas,
 * de una descarga posterior ni de imágenes corporativas externas.
 * La URL absoluta original queda como alternativa si el logo todavía
 * no estuviese disponible cuando se pulse Exportar PDF.
 */
function pdfPrintLogoSource() {
  const image = document.querySelector(".app-logo");

  if (image && image.complete && image.naturalWidth > 0) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(image, 0, 0);
        return canvas.toDataURL("image/png");
      }
    } catch (err) {
      // Sin acceso a canvas: utilizar el mismo PNG por URL absoluta.
    }
  }

  return new URL("images/PedigrAPP_logo.png", document.baseURI).href;
}

function pdfPrintAppHeader(version) {
  return `<div class="report-app-header">
    <span class="report-app-brand">
      <img class="report-app-logo" src="${pdfPrintEscape(pdfPrintLogoSource())}" alt="PedigrAPP" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">
      <span class="report-app-name" hidden>PedigrAPP</span>
    </span>
    <span class="report-app-version">v${pdfPrintEscape(version || APP_VERSION)}</span>
  </div>`;
}

function pdfPrintMeta(report) {
  return `<div class="report-meta-line">
      <span>${report.report_datetime ? `${pdfPrintEscape(t("pdf.label.date"))} ${pdfPrintEscape(report.report_datetime)}` : ""}</span>
    </div>
    <div class="report-title-spacer" aria-hidden="true"></div>
    <div class="meta">
      <div class="meta-inline"><strong>ID:</strong> ${pdfPrintEscape(report.family_id || "—")}</div>
      <div class="meta-inline"><strong>${pdfPrintEscape(t("pdf.label.indication"))}</strong> ${pdfPrintEscape(report.indication || "—")}</div>
    </div>`;
}

/*
 * PDF vectorial 0.8.1
 * -------------------------------------------------
 * Chromium renderiza el SVG original del navegador para evitar las
 * diferencias geométricas observadas al interpretar SVG con Dompdf.
 * Sólo se modifica una COPIA destinada a impresión:
 *   - los trazos gráficos se suavizan ópticamente al 60 %;
 *   - texto, rellenos y geometría permanecen intactos;
 *   - SVG/PNG y layout interactivo no se modifican.
 */
function preparePedigreeSvgForVectorPdf(svgNode) {
  /*
   * 0.7.73
   * -------
   * 1) Leemos el grosor efectivo desde el SVG vivo, conectado al DOM.
   * 2) Neutralizamos temporalmente la selección para que el PDF no capture
   *    el stroke de 4 px del individuo seleccionado.
   * 3) Aplicamos el 60 % elemento a elemento en el clon de impresión.
   * 4) En símbolos con overlays clínicos, redibujamos el contorno por encima
   *    del relleno para que cuadrados/círculos/rombos conserven el mismo peso
   *    óptico que el resto del árbol.
   * 5) Eliminamos del clon el width/min-width/max-width usado por el scroll de
   *    pantalla: si se conserva, Chromium reduce TODA la página para acomodar
   *    un SVG de varios miles de píxeles. En impresión debe mandar el CSS
   *    width:100% y el SVG debe ajustarse a los márgenes A4 manteniendo ratio.
   */
  const selectedGroups = Array.from(
    svgNode.querySelectorAll('.person.selected-person')
  );
  selectedGroups.forEach(node => node.classList.remove('selected-person'));

  const strokeSnapshot = [];
  let strokeIndex = 0;
  let cleanSvg;

  try {
    svgNode.querySelectorAll('*').forEach(node => {
      if (!(node instanceof Element)) return;
      if (
        node.closest('.export-report') ||
        node.classList.contains('relationship-route-mask') ||
        node.classList.contains('pedigree-crossing-gap')
      ) {
        return;
      }

      const computed = window.getComputedStyle(node);
      const stroke = String(computed.stroke || '').trim().toLowerCase();
      const raw = parseFloat(computed.strokeWidth || '0');

      if (
        !stroke ||
        stroke === 'none' ||
        stroke === 'transparent' ||
        !Number.isFinite(raw) ||
        raw <= 0
      ) {
        return;
      }

      const id = `pdf-stroke-${strokeIndex++}`;
      node.setAttribute('data-pdf-stroke-id', id);
      strokeSnapshot.push({ node, id, width: raw });
    });

    cleanSvg = makeStandaloneSvgForExport(svgNode, false);
  } finally {
    strokeSnapshot.forEach(item => {
      item.node.removeAttribute('data-pdf-stroke-id');
    });
    selectedGroups.forEach(node => node.classList.add('selected-person'));
  }

  cleanSvg.style.setProperty('background', '#ffffff', 'important');
  cleanSvg.style.setProperty('background-color', '#ffffff', 'important');
  cleanSvg.removeAttribute('width');
  cleanSvg.removeAttribute('height');

  // El ancho de pantalla (p. ej. 6780 px) NO debe viajar a la impresión.
  ['width','min-width','max-width','height'].forEach(prop => {
    cleanSvg.style.removeProperty(prop);
  });

  cleanSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  /* 60 % REAL del grosor efectivo de pantalla, para todos los strokes. */
  strokeSnapshot.forEach(item => {
    const node = cleanSvg.querySelector(
      `[data-pdf-stroke-id="${item.id}"]`
    );
    if (!node) return;

    node.style.setProperty(
      'stroke-width',
      String(item.width * 0.60),
      'important'
    );
    node.style.setProperty('vector-effect', 'none', 'important');
    node.removeAttribute('data-pdf-stroke-id');
  });

  cleanSvg.querySelectorAll('[data-pdf-stroke-id]')
    .forEach(node => node.removeAttribute('data-pdf-stroke-id'));

  /*
   * Los rellenos de condiciones están recortados al interior del símbolo y
   * pueden cubrir ópticamente la mitad interna del stroke original. Añadimos
   * un segundo contorno SIN relleno, justo después de los overlays y antes de
   * marcas como fallecimiento/probando, para que el contorno visible vuelva a
   * ser exactamente el mismo que el calculado al 60 %.
   */
  cleanSvg.querySelectorAll('.person').forEach(group => {
    const shape = group.querySelector(':scope > .person-shape');
    const overlays = Array.from(
      group.querySelectorAll(':scope > .condition-overlay')
    );

    if (!shape || !overlays.length) return;

    const outline = shape.cloneNode(false);
    outline.removeAttribute('id');
    outline.classList.add('pdf-condition-outline');
    outline.setAttribute('fill', 'none');
    outline.style.setProperty('fill', 'none', 'important');
    outline.style.setProperty('pointer-events', 'none', 'important');
    outline.style.setProperty('vector-effect', 'none', 'important');

    const lastOverlay = overlays[overlays.length - 1];
    group.insertBefore(outline, lastOverlay.nextSibling);
  });

  return cleanSvg;
}

async function exportCurrentPedigreePdf() {
  if (!currentSvg) return;

  const button = $("exportPdfBtn");
  const originalTitle = button ? button.title : "";

  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.title = t("pdf.export.title");
    // NO sustituir textContent: eliminaría el SVG del botón.
  }

  try {
    syncHeaderToFamily();

    const cleanSvg = preparePedigreeSvgForVectorPdf(currentSvg);
    const svgText = new XMLSerializer().serializeToString(cleanSvg);
    const report = buildPdfReportData();

    /*
     * 0.7.82: calculamos el tamaño de impresión a partir del viewBox real.
     * Así un pedigree que no necesita todo el ancho no queda anclado a un
     * lateral: se limita por ancho/alto manteniendo ratio y se centra.
     */
    const pdfViewBox = String(cleanSvg.getAttribute("viewBox") || "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    const pdfTreeRatio = (
      pdfViewBox.length === 4 &&
      pdfViewBox.every(Number.isFinite) &&
      pdfViewBox[2] > 0 &&
      pdfViewBox[3] > 0
    ) ? pdfViewBox[2] / pdfViewBox[3] : 1;

    const portraitTreeWidthPt = Math.min(547.28, 330 * pdfTreeRatio);
    const landscapeTreeWidthPt = Math.min(777.89, 285 * pdfTreeRatio);
    const portraitTree = `<div class="tree-wrap"><div class="tree-frame" style="width:${portraitTreeWidthPt.toFixed(2)}pt">${svgText}</div></div>`;
    const landscapeTree = `<div class="tree-wrap"><div class="tree-frame" style="width:${landscapeTreeWidthPt.toFixed(2)}pt">${svgText}</div></div>`;

    const header = pdfPrintAppHeader(report.app_version || APP_VERSION);
    const meta = pdfPrintMeta(report);

    const combinedLegend = [
      ...(report.general_legend || []),
      ...(report.condition_legend || [])
    ];
    const generalPortrait = pdfPrintLegendItems(combinedLegend, 3, "legend-general legend-combined");
    const generalLandscape = pdfPrintLegendItems(combinedLegend, 4, "legend-general legend-landscape legend-combined");

    const pedigreeCommentsHtml = pdfPrintPedigreeCommentsHtml(report.pedigree_comments);
    const peopleHtml = pdfPrintPeopleHtml(report.people);
    const commentsHtml = pdfPrintCommentsHtml(report.extended_comments);

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      throw new Error(
        t("pdf.export.popupBlocked")
      );
    }

    const portraitBody = `
      <main class="page portrait-page">
        <div class="text-zone header-zone">${header}${meta}</div>
        ${portraitTree}
        <div class="text-zone report-content">
          <section class="report-section legend-section first-report-section">
            ${generalPortrait}
          </section>
          ${pedigreeCommentsHtml}
          ${peopleHtml}
          ${commentsHtml}
        </div>
      </main>`;

    const landscapeCover = `
      <section class="page landscape-page">
        ${header}${meta}
        ${landscapeTree}
        <div class="landscape-content">
          <section class="report-section legend-section first-report-section">
            ${generalLandscape}
          </section>
          ${pedigreeCommentsHtml}
          ${peopleHtml}
          ${commentsHtml}
        </div>
      </section>`;

    /*
     * Los valores se han rehecho desde 0.7.64 teniendo en cuenta las pruebas
     * 0.7.93 rebase desde 0.7.64, pero sin heredar su código:
     * - margen lateral intermedio (ni 70 pt de 0.7.64 ni ~18 pt de 0.7.69);
     * - leyenda cercana al árbol, sin solaparlo;
     * - poco aire DENTRO de cada leyenda;
     * - más aire ENTRE secciones;
     * - 0.7.92 iguala en vertical y horizontal el formato del resumen de
     *   individuos seleccionados y aumenta su separación respecto a la leyenda;
     * - sin alturas mínimas que puedan crear una página final vacía.
     */
    /*
     * 0.7.92: seguimos sin paginación propia. En horizontal evitamos CSS Grid en
     * el resumen clínico porque Firefox puede fragmentar una rejilla impresa y
     * materializar una página final vacía aunque todos sus elementos visibles
     * hayan cabido en la primera hoja. Se conserva visualmente el reparto a dos
     * columnas mediante flexbox.
     */

    const pageCss = report.wide_pedigree ? `
@page { size:A4 landscape; margin:0; }
` : `
@page { size:A4 portrait; margin:0; }
`;

    const bodyHtml = report.wide_pedigree
      ? landscapeCover
      : portraitBody;

    const html = `<!doctype html>
<html lang="${window.PedigrAPPi18n?.current()||"es"}">
<head>
<meta charset="utf-8">
<title>${pdfPrintEscape(report.family_id || "pedigree")}</title>
<style>
${pageCss}
* { box-sizing:border-box; }
html,body {
  margin:0;
  padding:0;
  background:#fff;
  color:#111;
  font-family:"DejaVu Sans",Arial,Helvetica,sans-serif;
}
body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.page {
  background:#fff;
}

.portrait-page,
.details-page {
  padding:45pt 24pt 32pt;
  font-size:8.1pt;
  line-height:1.34;
  box-decoration-break:clone;
  -webkit-box-decoration-break:clone;
}

/* A4 apaisado para pedigrees anchos */
.landscape-page {
  padding:24pt 32pt 22pt;
  font-size:7pt;
  line-height:1.18;
  width:100%;
  max-width:100%;
  /* No clonar el padding al fragmentar: Chromium podía crear una segunda
     página vacía sólo para materializar el padding inferior. */
  box-decoration-break:slice;
  -webkit-box-decoration-break:slice;
  break-after:auto;
  page-break-after:auto;
}

.report-app-header {
  width:100%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:0.5pt solid #bfc5ce;
  padding:0 0 5pt;
  margin:0 0 10pt;
}
.report-app-brand { display:flex; align-items:center; min-width:0; }
.report-app-logo { display:block; width:138pt; height:auto; max-width:100%; }
.report-app-logo[hidden], .report-app-name[hidden] { display:none !important; }
.report-app-name { font-size:12pt; font-weight:700; letter-spacing:-.02em; }
.report-app-version { font-size:6.5pt; color:#707781; white-space:nowrap; margin-left:10pt; }
.landscape-page .report-app-header { margin-bottom:4pt; padding-bottom:3pt; }
.landscape-page .report-app-logo { width:126pt; }
.landscape-page .report-app-name { font-size:10pt; }
.landscape-page .report-app-version { font-size:5.5pt; }

.report-meta-line {
  width:100%;
  display:flex;
  justify-content:space-between;
  color:#666;
  font-size:6.75pt;
  line-height:1.2;
  margin:0 0 7pt;
}
.landscape-page .report-meta-line {
  font-size:5.7pt;
  line-height:1.1;
  margin-bottom:3pt;
}

h1 {
  margin:0 0 9pt;
  font-size:13.5pt;
  line-height:1.15;
}
h2 {
  margin:0 0 2.5pt;
  font-size:9.18pt;
  line-height:1.16;
}
.landscape-page h1 {
  margin-bottom:3pt;
  font-size:10.8pt;
  line-height:1.05;
}
.landscape-page h2 {
  margin-bottom:1.5pt;
  font-size:7.7pt;
  line-height:1.05;
}

/* Mantiene el aire que ocupaba el antiguo título "INFORMACIÓN DEL PEDIGREE". */
.report-title-spacer { height:22.5pt; }
.landscape-page .report-title-spacer { height:14pt; }

.meta {
  display:flex;
  flex-direction:column;
  gap:3.4pt;
  margin-bottom:12pt;
}
.meta-inline {
  white-space:normal;
}
.landscape-page .meta {
  gap:1.2pt;
  margin-bottom:3pt;
  font-size:6.4pt;
}

/*
 * La cabecera y los apartados textuales tienen un margen algo mayor que el
 * árbol, pero claramente menor que el informe original de 0.7.64.
 */
.text-zone { margin-left:20pt; margin-right:20pt; }
.landscape-page > .report-app-header,
.landscape-page > .report-meta-line,
.landscape-page > h1,
.landscape-page > .meta,
.landscape-page > .report-section { margin-left:10pt; margin-right:10pt; }

.tree-wrap {
  width:100%;
  display:flex;
  justify-content:center;
  align-items:flex-start;
  margin:6pt 0 0;
  padding:0;
  break-inside:avoid;
}
.tree-frame {
  flex:0 1 auto;
  max-width:100%;
  margin:0 auto;
}
.tree-frame svg {
  display:block;
  width:100%;
  height:auto;
  max-width:100%;
  margin:0 auto;
  overflow:visible;
}
.landscape-page .tree-wrap { margin:1pt 0 0; }

/* Más separación ENTRE apartados, poco espacio dentro de cada apartado. */
.report-section { margin:13pt 0 0; padding:0; }
.first-report-section { margin-top:0; }
.report-content { margin-top:-7pt; }
.landscape-page .legend-section { margin-top:-6pt; }
.landscape-page .landscape-content {
  margin-left:10pt;
  margin-right:10pt;
  max-width:calc(100% - 20pt);
  overflow:visible;
}
 .legend-section + .clinical-section { margin-top:28pt; }
.pedigree-comments-section {
  margin-top:24pt;
}
.pedigree-comments-section h2 {
  margin-bottom:4pt;
  font-size:8.25pt;
  line-height:1.16;
}
.pedigree-comments-text {
  font-size:7.02pt;
  line-height:1.35;
  color:#222;
  white-space:normal;
}
.pedigree-comments-section + .clinical-section {
  margin-top:18pt;
}
.landscape-page .pedigree-comments-section {
  margin-top:24pt;
}
.landscape-page .pedigree-comments-section h2 {
  margin-bottom:4pt;
  font-size:8.25pt;
  line-height:1.16;
}
.landscape-page .pedigree-comments-text {
  font-size:7.02pt;
  line-height:1.35;
}
.clinical-section h2 {
  margin-bottom:4pt;
  font-size:8.25pt;
  line-height:1.16;
}
.landscape-page .clinical-section h2 {
  margin-bottom:4pt;
  font-size:8.25pt;
  line-height:1.16;
}

.legend-columns {
  display:grid;
  grid-template-columns:repeat(var(--legend-columns),minmax(0,1fr));
  column-gap:9pt;
  align-items:start;
  width:100%;
  margin:0;
}
.legend-column {
  display:flex;
  flex-direction:column;
  gap:1.15pt;
  min-width:0;
}
.legend-item {
  display:flex;
  align-items:flex-start;
  min-width:0;
  padding:0;
  margin:0;
  font-size:6.75pt;
  line-height:.86;
}
.legend-icon {
  width:17pt;
  height:8pt;
  flex:0 0 17pt;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  margin-right:2pt;
  margin-top:.15pt;
  overflow:visible;
}
.legend-icon svg { width:16pt; height:10.8pt; overflow:visible; }
.legend-label { min-width:0; line-height:.86; }
.landscape-page .legend-columns { column-gap:6pt; }
.landscape-page .legend-column { gap:.9pt; }
.landscape-page .legend-item {
  padding:0;
  margin:0;
  font-size:5.25pt;
  line-height:.84;
}
.landscape-page .legend-icon {
  width:14pt;
  height:7pt;
  flex-basis:14pt;
  margin-right:1.4pt;
  margin-top:.1pt;
  overflow:visible;
}
.landscape-page .legend-icon svg { width:13pt; height:9.8pt; overflow:visible; }
.landscape-page .legend-label { line-height:.84; }

.people-grid {
  display:grid;
  grid-template-columns:1fr 1fr;
  column-gap:20pt;
}
/* Firefox puede dejar una página fantasma al fragmentar CSS Grid en paisaje.
   En la primera página apaisada mantenemos dos columnas con flexbox, evitando
   esa fragmentación sin cambiar la apariencia del resumen. */
.landscape-page .people-grid {
  display:flex;
  flex-wrap:wrap;
  column-gap:0;
  align-items:flex-start;
}
.landscape-page .person-block {
  flex:0 0 50%;
  width:50%;
  padding-right:10pt;
}
.landscape-page .person-block:nth-child(even) {
  padding-right:0;
  padding-left:10pt;
}
.person-block { break-inside:avoid; page-break-inside:avoid; margin:0 0 9pt; }
.person-title { margin:0 0 3pt; font-size:8.1pt; font-weight:bold; line-height:1.2; }
.condition-block { margin:0 0 5pt 8pt; break-inside:avoid; }
.condition-title { margin:0 0 1.5pt; font-size:7.29pt; font-weight:bold; line-height:1.2; }
.condition-line { margin:0 0 .8pt 8pt; font-size:7.02pt; line-height:1.22; }
.comments-section {
  margin-top:18pt;
}
.comments-section h2,
.landscape-page .comments-section h2 {
  margin-bottom:4pt;
  font-size:8.25pt;
  line-height:1.16;
}
.extended-comment-block {
  margin:0 0 9pt;
  break-inside:avoid;
  page-break-inside:avoid;
}
.extended-comment-title {
  margin:0 0 3pt;
  font-size:8.1pt;
  font-weight:bold;
  line-height:1.2;
}
.extended-comment-text {
  padding-left:8pt;
  font-size:7.02pt;
  line-height:1.22;
  color:#222;
}

/* Aviso sólo en pantalla: no forma parte del PDF. */
.print-help {
  margin:10pt 24pt;
  padding:7pt;
  border:1px solid #bbb;
  font:9pt Arial,sans-serif;
}
@media print {
  .print-help { display:none !important; }
}
</style>
</head>
<body>
<div class="print-help"><strong>PDF vectorial ${pdfPrintEscape(report.app_version || APP_VERSION)}.</strong> ${pdfPrintEscape(t("pdf.print.instructions"))}</div>
${bodyHtml}
<script>
(function(){
  var imgs=Array.from(document.images);
  Promise.all(imgs.map(function(img){
    return img.complete ? Promise.resolve() : new Promise(function(resolve){
      img.addEventListener('load',resolve,{once:true});
      img.addEventListener('error',resolve,{once:true});
    });
  })).then(function(){
    setTimeout(function(){ window.print(); },300);
  });
})();
<\/script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    message(
      t("pdf.export.success",{version:report.app_version||APP_VERSION}),
      "success"
    );
  } catch (err) {
    message(
      t("pdf.export.error",{error:err.message}),
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.title = originalTitle;
      // El icono SVG original nunca se altera.
    }
  }
}

$("exportPdfBtn").onclick = () => {
  exportCurrentPedigreePdf();
};

$("exportSvgBtn").onclick=()=>{
  if (!currentSvg) return;

  const cleanSvg =
    makeStandaloneSvgForExport(currentSvg, false);

  appendExportLegendOnly(cleanSvg);

  download(
    (family.family_id||"pedigree")+".svg",
    new Blob(
      [new XMLSerializer().serializeToString(cleanSvg)],
      { type:"image/svg+xml;charset=utf-8" }
    )
  );
};

$("importJsonInput").addEventListener("change", async e=>{
  const f=e.target.files && e.target.files[0];
  if (!f) return;

  try {
    const data=JSON.parse(await f.text());
    validate(data);
    family=normalizeFamily(data);
    selectedPersonUid = null;
    clearUndoHistory();
    syncFamilyToHeader();
    resetPersonForm();
    renderPedigree();
    fitPedigreeToWidthAfterLoad();
    message("JSON importado.","success");
    announceLoadedFamilyReview();
  } catch(err) {
    message("No se pudo importar: "+err.message,"error");
  }

  e.target.value="";
});

(async()=>{
  installPedigreeViewer();
  updateUndoButton();
  updateNotesPanel();
  updateRelationTypeFields();
  await listSaved();

  // 0.8.16 — inicio limpio: la aplicación arranca siempre con
  // un pedigree vacío, sin cargar automáticamente familia01.json.
  family = emptyFamily();
  selectedPersonUid = null;
  clearUndoHistory();
  syncFamilyToHeader();
  resetPersonForm();
  markCurrentFamilyAsSaved();
  renderPedigree();
})();
})();
