const historyEntries = [];
let lastResult = null;
const SAVED_MEMBERS_KEY = "warikan_saved_members";
let savedMemberNames = [];
let currentNameTarget = null;
let currentSearchTarget = null;

function getSavedMemberNames() {
  return savedMemberNames.slice();
}

function getElements() {
  return {
    peopleCountInput: document.getElementById("peopleCount"),
    itemsContainer: document.getElementById("itemsContainer"),
    personsContainer: document.getElementById("personsContainer"),
    calcTitle: document.getElementById("calcTitle"),
    totalAmount: document.getElementById("totalAmount"),
    adjustedTotalAmount: document.getElementById("adjustedTotalAmount"),
    perPerson: document.getElementById("perPerson"),
    remainder: document.getElementById("remainder"),
    message: document.getElementById("message"),
    historyList: document.getElementById("historyList"),
    historyEmpty: document.getElementById("historyEmpty"),
    newCalcBtn: document.getElementById("newCalcBtn"),
    pageCalc: document.getElementById("pageCalc"),
    pageHistory: document.getElementById("pageHistory"),
    pageMembers: document.getElementById("pageMembers"),
    newMemberName: document.getElementById("newMemberName"),
    addMemberBtn: document.getElementById("addMemberBtn"),
    savedMembersList: document.getElementById("savedMembersList"),
    savedMembersEmpty: document.getElementById("savedMembersEmpty"),
    memberNamesDatalist: document.getElementById("memberNamesDatalist"),
    memberSelectDropdown: document.getElementById("memberSelectDropdown"),
    historySearchInput: document.getElementById("historySearchInput"),
    navCalc: document.getElementById("navCalc"),
    navHistory: document.getElementById("navHistory"),
    navMembers: document.getElementById("navMembers"),
  };
}

function createItemRow(initialAmount = "", initialLabel = "") {
  const row = document.createElement("div");
  row.className = "item-row";
  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.min = "0";
  amountInput.step = "1";
  amountInput.placeholder = "0";
  amountInput.inputMode = "decimal";
  amountInput.value = initialAmount;
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.placeholder = "メモ（例：飲み物、コース料理 など）";
  labelInput.value = initialLabel;
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-btn";
  removeBtn.title = "この行を削除";
  removeBtn.textContent = "－";
  removeBtn.addEventListener("click", () => {
    const allRows = document.querySelectorAll(".item-row");
    if (allRows.length <= 1) {
      amountInput.value = "";
      labelInput.value = "";
      return;
    }
    row.remove();
    calculate();
  });
  amountInput.addEventListener("input", () => calculate());
  row.appendChild(amountInput);
  row.appendChild(labelInput);
  row.appendChild(removeBtn);
  return row;
}

function parseAmount(value) {
  if (value === null || value === undefined) return 0;
  const trimmed = String(value).trim();
  if (trimmed === "") return 0;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return NaN;
  return Math.floor(num);
}

function parseSumExpression(value) {
  if (value === null || value === undefined) return 0;
  const trimmed = String(value).trim();
  if (trimmed === "") return 0;
  const normalized = trimmed.replace(/^\+/, "");
  const parts = normalized.split(/(?=[+-])/);
  let sum = 0;
  for (const part of parts) {
    const p = part.trim();
    if (p === "") continue;
    const num = Number(p);
    if (!Number.isFinite(num)) return NaN;
    sum += num;
  }
  return Number.isFinite(sum) ? Math.floor(sum) : NaN;
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function showPage(pageId) {
  const { pageCalc, pageHistory, pageMembers, navCalc, navHistory, navMembers } = getElements();
  const pages = [pageCalc, pageHistory, pageMembers];
  const navItems = [navCalc, navHistory, navMembers];
  const ids = ["pageCalc", "pageHistory", "pageMembers"];
  const idx = ids.indexOf(pageId);
  if (idx === -1) return;
  pages.forEach((p, i) => {
    if (p) {
      if (i === idx) {
        p.classList.add("is-active");
        p.removeAttribute("hidden");
      } else {
        p.classList.remove("is-active");
        p.setAttribute("hidden", "hidden");
      }
    }
  });
  navItems.forEach((n, i) => {
    if (n) n.classList.toggle("is-active", i === idx);
  });
  if (idx === 1) renderHistory();
  if (idx === 2) renderSavedMembers();
}

document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("memberSelectDropdown");
  if (
    (currentNameTarget || currentSearchTarget) &&
    dropdown &&
    !dropdown.contains(e.target) &&
    !e.target.closest(".person-select-member-btn") &&
    !e.target.closest("#historySearchSelectBtn")
  ) {
    hideMemberSelectDropdown();
  }
});

function loadSavedMembers() {
  try {
    const raw = localStorage.getItem(SAVED_MEMBERS_KEY);
    savedMemberNames = raw ? (JSON.parse(raw) || []) : [];
    if (!Array.isArray(savedMemberNames)) savedMemberNames = [];
  } catch {
    savedMemberNames = [];
  }
}

function saveSavedMembers() {
  try {
    localStorage.setItem(SAVED_MEMBERS_KEY, JSON.stringify(savedMemberNames));
  } catch (_) {}
}

function renderSavedMembers() {
  const { savedMembersList, savedMembersEmpty } = getElements();
  if (!savedMembersList || !savedMembersEmpty) return;
  savedMembersList.innerHTML = "";
  if (savedMemberNames.length === 0) {
    savedMembersEmpty.style.display = "block";
    return;
  }
  savedMembersEmpty.style.display = "none";
  savedMemberNames.forEach((name, index) => {
    const li = document.createElement("li");
    li.className = "saved-member-item";
    li.innerHTML = `<span class="saved-member-name">${escapeHtml(name)}</span><button type="button" class="saved-member-remove" data-index="${index}" aria-label="削除">×</button>`;
    li.querySelector(".saved-member-remove").addEventListener("click", () => {
      removeSavedMember(index);
      renderSavedMembers();
    });
    savedMembersList.appendChild(li);
  });
}

function addSavedMember(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  savedMemberNames.push(trimmed);
  saveSavedMembers();
  updateMemberNamesDatalist();
}

function removeSavedMember(index) {
  if (index < 0 || index >= savedMemberNames.length) return;
  savedMemberNames.splice(index, 1);
  saveSavedMembers();
  updateMemberNamesDatalist();
}

function updateMemberNamesDatalist() {
  const datalist = document.getElementById("memberNamesDatalist");
  if (!datalist) return;
  datalist.innerHTML = "";
  savedMemberNames.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    datalist.appendChild(opt);
  });
}

function updateMemberSelectDropdownContent() {
  const dropdown = document.getElementById("memberSelectDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";
  if (savedMemberNames.length === 0) {
    const p = document.createElement("p");
    p.className = "member-select-empty";
    p.textContent = "登録メンバーがいません";
    dropdown.appendChild(p);
    return;
  }
  savedMemberNames.forEach((name) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "member-select-option";
    btn.textContent = name;
    btn.addEventListener("click", () => {
      if (currentNameTarget) {
        currentNameTarget.value = name;
        currentNameTarget = null;
      } else if (currentSearchTarget) {
        currentSearchTarget.value = name;
        currentSearchTarget = null;
        renderHistory();
      }
      dropdown.setAttribute("hidden", "hidden");
    });
    dropdown.appendChild(btn);
  });
}

function showMemberSelectDropdown(nameInput) {
  currentNameTarget = nameInput;
  currentSearchTarget = null;
  const dropdown = document.getElementById("memberSelectDropdown");
  if (!dropdown) return;
  updateMemberSelectDropdownContent();
  dropdown.removeAttribute("hidden");
}

function showMemberSelectDropdownForSearch() {
  currentSearchTarget = document.getElementById("historySearchInput");
  currentNameTarget = null;
  const dropdown = document.getElementById("memberSelectDropdown");
  if (!dropdown) return;
  updateMemberSelectDropdownContent();
  dropdown.removeAttribute("hidden");
}

function hideMemberSelectDropdown() {
  currentNameTarget = null;
  currentSearchTarget = null;
  const dropdown = document.getElementById("memberSelectDropdown");
  if (dropdown) dropdown.setAttribute("hidden", "hidden");
}

function calculate() {
  const {
    peopleCountInput,
    itemsContainer,
    personsContainer,
    totalAmount,
    adjustedTotalAmount,
    perPerson,
    remainder,
    message,
    calcTitle,
  } = getElements();

  message.textContent = "";
  message.className = "message";
  lastResult = null;

  const people = parseInt(peopleCountInput.value, 10);
  if (!Number.isFinite(people) || people <= 0) {
    totalAmount.textContent = "- 円";
    adjustedTotalAmount.textContent = "- 円";
    perPerson.textContent = "- 円";
    remainder.textContent = "- 円";
    message.textContent = "人数は1人以上の整数で入力してください。";
    message.classList.add("is-error");
    return;
  }

  const rows = itemsContainer.querySelectorAll(".item-row");
  let total = 0;
  let hasAnyAmount = false;
  for (const row of rows) {
    const amountInput = row.querySelector('input[type="number"]');
    const amount = parseAmount(amountInput.value);
    if (Number.isNaN(amount)) {
      message.textContent = "金額は0以上の数値で入力してください。";
      message.classList.add("is-error");
      return;
    }
    if (amount > 0) hasAnyAmount = true;
    total += amount;
  }

  if (!hasAnyAmount) {
    totalAmount.textContent = "- 円";
    adjustedTotalAmount.textContent = "- 円";
    perPerson.textContent = "- 円";
    remainder.textContent = "- 円";
    message.textContent = "1つ以上の金額を入力してください。";
    message.classList.add("is-error");
    return;
  }

  const personRows = personsContainer.querySelectorAll(".person-row");
  const personExtra = [];
  let extraTotal = 0;
  for (let i = 0; i < people; i++) {
    const row = personRows[i];
    if (!row) {
      personExtra.push(0);
      continue;
    }
    const v = Number(row.dataset.extraAccum || "0");
    if (!Number.isFinite(v) || v < 0) {
      message.textContent = "個別欄の合計が正しくありません。もう一度入力してください。";
      message.classList.add("is-error");
      return;
    }
    const extraSumSpan = row.querySelector(".person-extra-sum");
    if (extraSumSpan) extraSumSpan.textContent = `${v.toLocaleString()} 円`;
    personExtra.push(v);
    extraTotal += v;
  }

  const adjustedTotal = total - extraTotal;
  if (adjustedTotal < 0) {
    totalAmount.textContent = `${total.toLocaleString()} 円`;
    adjustedTotalAmount.textContent = "- 円";
    perPerson.textContent = "- 円";
    remainder.textContent = "- 円";
    message.textContent = "個別に入力した金額の合計が、全体の合計金額を超えています。";
    message.classList.add("is-error");
    return;
  }

  const basePer = Math.floor(adjustedTotal / people);
  const rest = adjustedTotal - basePer * people;

  totalAmount.textContent = `${total.toLocaleString()} 円`;
  adjustedTotalAmount.textContent = `${adjustedTotal.toLocaleString()} 円`;
  perPerson.textContent = `${basePer.toLocaleString()} 円`;
  remainder.textContent = `${rest.toLocaleString()} 円`;

  for (let i = 0; i < people; i++) {
    const row = personRows[i];
    if (!row) continue;
    const finalPay = basePer + (personExtra[i] ?? 0);
    const totalSpan = row.querySelector(".person-total");
    if (totalSpan) totalSpan.textContent = `${finalPay.toLocaleString()} 円`;
  }

  const perPersonResults = [];
  for (let i = 0; i < people; i++) {
    const row = personRows[i];
    const nameInput = row?.querySelector(".person-name");
    const displayName = nameInput ? (nameInput.value.trim() || `${i + 1}人目`) : `${i + 1}人目`;
    perPersonResults.push({
      name: displayName,
      amount: basePer + (personExtra[i] ?? 0),
    });
  }
  lastResult = {
    title: (calcTitle && calcTitle.value.trim()) || "",
    total,
    adjustedTotal,
    basePer,
    rest,
    extraTotal,
    people,
    perPersonResults,
  };

  if (rest === 0 && extraTotal === 0) {
    message.textContent = `${people}人でちょうど割り切れました。`;
    message.classList.add("is-ok");
  } else if (rest === 0 && extraTotal > 0) {
    message.textContent = `個別調整分（合計 ${extraTotal.toLocaleString()} 円）を差し引いたうえで、残りは${people}人で割り切れました。`;
    message.classList.add("is-ok");
  } else {
    message.textContent = `合計 ${total.toLocaleString()} 円のうち、個別調整分として ${extraTotal.toLocaleString()} 円 を差し引きました。残りを${people}人で割ると1人あたり ${basePer.toLocaleString()} 円で、${rest.toLocaleString()} 円あまります。`;
    message.classList.add("is-ok");
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function saveHistory(entry) {
  const now = new Date();
  const timestamp = `${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  historyEntries.unshift({ ...entry, timestamp });
  if (historyEntries.length > 50) historyEntries.pop();
  renderHistory();
}

function renderHistory() {
  const { historyList, historyEmpty, historySearchInput } = getElements();
  if (!historyList || !historyEmpty) return;

  const query = (historySearchInput && historySearchInput.value.trim()) || "";
  const toShow = query
    ? historyEntries.filter(
        (item) =>
          item.perPersonResults &&
          item.perPersonResults.some((p) => p.name && String(p.name).includes(query))
      )
    : historyEntries;

  historyList.innerHTML = "";
  if (toShow.length === 0) {
    historyEmpty.style.display = "block";
    historyEmpty.textContent = query ? "該当する履歴がありません。" : "まだ履歴はありません。";
    return;
  }
  historyEmpty.style.display = "none";

  const fragment = document.createDocumentFragment();
  toShow.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "history-item-wrapper";

    const row = document.createElement("div");
    row.className = "history-item-row";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item";
    const title = item.title || "（無題）";
    btn.innerHTML = `<span class="history-item-left"><span class="history-item-title">${escapeHtml(title)}</span><span class="history-item-date">${item.timestamp}</span></span><span>${item.total.toLocaleString()} 円</span>`;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "history-item-delete";
    deleteBtn.title = "この履歴を削除";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = historyEntries.indexOf(item);
      if (i !== -1) {
        historyEntries.splice(i, 1);
        renderHistory();
      }
    });

    row.appendChild(btn);
    row.appendChild(deleteBtn);
    wrapper.appendChild(row);

    const personsHtml = (item.perPersonResults || [])
      .map(
        (p) =>
          `<div class="history-inline-row"><span>${escapeHtml(p.name)}</span><span>${p.amount.toLocaleString()} 円</span></div>`
      )
      .join("");

    const detail = document.createElement("div");
    detail.className = "history-inline-detail";
    detail.hidden = true;
    detail.innerHTML = `
      <div class="history-inline-title">${escapeHtml(item.title || "（無題）")} — ${item.timestamp}</div>
      <div class="history-inline-row"><span>合計</span><span>${item.total.toLocaleString()} 円</span></div>
      <div class="history-inline-row"><span>個別調整後</span><span>${item.adjustedTotal.toLocaleString()} 円</span></div>
      <div class="history-inline-row"><span>1人あたり</span><span>${item.basePer.toLocaleString()} 円</span></div>
      <div class="history-inline-row"><span>端数</span><span>${item.rest.toLocaleString()} 円</span></div>
      <div class="history-inline-row"><span>個別調整合計</span><span>${item.extraTotal.toLocaleString()} 円</span></div>
      <div class="history-inline-row"><span>人数</span><span>${item.people} 人</span></div>
      <div class="history-inline-persons">${personsHtml}</div>
    `;

    btn.addEventListener("click", () => {
      const isOpen = !detail.hidden;
      historyList.querySelectorAll(".history-inline-detail").forEach((d) => (d.hidden = true));
      historyList.querySelectorAll(".history-item").forEach((b) => b.classList.remove("is-open"));
      if (!isOpen) {
        detail.hidden = false;
        btn.classList.add("is-open");
      }
    });

    wrapper.appendChild(detail);
    fragment.appendChild(wrapper);
  });
  historyList.appendChild(fragment);
}

function resetAll() {
  const {
    peopleCountInput,
    itemsContainer,
    personsContainer,
    totalAmount,
    adjustedTotalAmount,
    perPerson,
    remainder,
    message,
    calcTitle,
  } = getElements();

  peopleCountInput.value = "2";
  if (calcTitle) calcTitle.value = "";
  itemsContainer.innerHTML = "";
  itemsContainer.appendChild(createItemRow());

  personsContainer.innerHTML = "";
  createPersonRows(2);
  personsContainer.querySelectorAll(".person-name").forEach((input) => {
    input.value = "";
  });

  totalAmount.textContent = "- 円";
  adjustedTotalAmount.textContent = "- 円";
  perPerson.textContent = "- 円";
  remainder.textContent = "- 円";
  message.textContent = "";
  message.className = "message";
  lastResult = null;
}

function createPersonRows(people) {
  const { personsContainer } = getElements();
  const savedNames = getSavedMemberNames();
  personsContainer.innerHTML = "";

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < people; i++) {
    const row = document.createElement("div");
    row.className = "person-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = `${i + 1}人目`;
    nameInput.className = "person-name";
    nameInput.setAttribute("list", "memberNamesDatalist");
    if (savedNames[i]) nameInput.value = savedNames[i];

    const nameWrap = document.createElement("div");
    nameWrap.className = "person-name-wrap";
    const selectMemberBtn = document.createElement("button");
    selectMemberBtn.type = "button";
    selectMemberBtn.className = "person-select-member-btn";
    selectMemberBtn.textContent = "選ぶ";
    selectMemberBtn.title = "登録メンバーから選択";
    selectMemberBtn.addEventListener("click", () => showMemberSelectDropdown(nameInput));
    nameWrap.appendChild(nameInput);
    nameWrap.appendChild(selectMemberBtn);

    const extraInput = document.createElement("input");
    extraInput.type = "text";
    extraInput.placeholder = "金額を入力して Enter";
    extraInput.className = "person-extra";

    const extraSumWrap = document.createElement("div");
    extraSumWrap.className = "person-extra-sum-wrap";
    const extraSumSpan = document.createElement("span");
    extraSumSpan.className = "person-extra-sum";
    extraSumSpan.textContent = "0 円";

    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "person-undo";
    undoBtn.textContent = "戻す";

    const totalSpan = document.createElement("span");
    totalSpan.className = "person-total";
    totalSpan.textContent = "— 円";

    row.dataset.extraAccum = "0";
    row.dataset.extraHistory = "[]";

    const commitExtra = () => {
      const raw = extraInput.value.trim();
      if (!raw) return;
      const addValue = parseSumExpression(raw);
      if (Number.isNaN(addValue) || addValue < 0) {
        alert("個別欄は「100」「100+200-50」のように、数値と + / - だけで入力してください。");
        return;
      }
      const current = Number(row.dataset.extraAccum || "0");
      let history = [];
      try {
        history = JSON.parse(row.dataset.extraHistory || "[]");
        if (!Array.isArray(history)) history = [];
      } catch {
        history = [];
      }
      history.push(current);
      row.dataset.extraHistory = JSON.stringify(history);
      const next = current + addValue;
      row.dataset.extraAccum = String(next);
      extraSumSpan.textContent = `${next.toLocaleString()} 円`;
      extraInput.value = "";
      calculate();
    };

    extraInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitExtra();
      }
    });
    extraInput.addEventListener("blur", () => commitExtra());

    undoBtn.addEventListener("click", () => {
      let history = [];
      try {
        history = JSON.parse(row.dataset.extraHistory || "[]");
        if (!Array.isArray(history)) history = [];
      } catch {
        history = [];
      }
      if (history.length === 0) {
        row.dataset.extraAccum = "0";
        extraSumSpan.textContent = "0 円";
      } else {
        const prev = history.pop();
        row.dataset.extraHistory = JSON.stringify(history);
        const safePrev = Number(prev || 0);
        row.dataset.extraAccum = String(safePrev);
        extraSumSpan.textContent = `${safePrev.toLocaleString()} 円`;
      }
      calculate();
    });

    row.appendChild(nameWrap);
    row.appendChild(extraInput);
    extraSumWrap.appendChild(extraSumSpan);
    extraSumWrap.appendChild(undoBtn);
    row.appendChild(extraSumWrap);
    row.appendChild(totalSpan);
    fragment.appendChild(row);
  }
  personsContainer.appendChild(fragment);
  updateMemberNamesDatalist();
}

function init() {
  const addRowBtn = document.getElementById("addRowBtn");
  const resetBtn = document.getElementById("resetBtn");
  const {
    itemsContainer,
    peopleCountInput,
    newCalcBtn,
    navCalc,
    navHistory,
    navMembers,
    newMemberName,
    addMemberBtn,
    historySearchInput,
  } = getElements();

  loadSavedMembers();
  updateMemberNamesDatalist();

  itemsContainer.appendChild(createItemRow());
  itemsContainer.appendChild(createItemRow());
  const initialPeople = parseInt(peopleCountInput.value, 10) || 2;
  createPersonRows(initialPeople);

  addRowBtn.addEventListener("click", () => itemsContainer.appendChild(createItemRow()));
  resetBtn.addEventListener("click", () => resetAll());

  peopleCountInput.addEventListener("input", () => {
    const people = parseInt(peopleCountInput.value, 10);
    if (!Number.isFinite(people) || people <= 0) {
      calculate();
      return;
    }
    createPersonRows(people);
    calculate();
  });

  [navCalc, navHistory, navMembers].forEach((btn, i) => {
    if (!btn) return;
    const pageIds = ["pageCalc", "pageHistory", "pageMembers"];
    btn.addEventListener("click", () => showPage(pageIds[i]));
  });

  if (historySearchInput) {
    historySearchInput.addEventListener("input", () => renderHistory());
  }
  const historySearchSelectBtn = document.getElementById("historySearchSelectBtn");
  if (historySearchSelectBtn) {
    historySearchSelectBtn.addEventListener("click", () => showMemberSelectDropdownForSearch());
  }

  if (addMemberBtn && newMemberName) {
    addMemberBtn.addEventListener("click", () => {
      addSavedMember(newMemberName.value);
      newMemberName.value = "";
      renderSavedMembers();
    });
    newMemberName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSavedMember(newMemberName.value);
        newMemberName.value = "";
        renderSavedMembers();
      }
    });
  }

  if (newCalcBtn) {
    newCalcBtn.addEventListener("click", () => {
      if (lastResult) saveHistory(lastResult);
      resetAll();
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
