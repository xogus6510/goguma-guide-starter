const tabs = [...document.querySelectorAll('[role="tab"]')];
function select(index, focus = true) {
  for (const [i, tab] of tabs.entries()) {
    tab.setAttribute("aria-selected", String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = i !== index;
  }
  if (focus) tabs[index].focus();
}
for (const [i, tab] of tabs.entries()) {
  tab.addEventListener("click", () => select(i));
  tab.addEventListener("keydown", (event) => {
    const next = {
      ArrowRight: (i + 1) % tabs.length,
      ArrowLeft: (i + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  });
}
for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const card = button.closest(".card");
    const text = card.querySelector(".copy-text").textContent;
    const status = document.getElementById("status");
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "안내 문구를 복사했어요.";
    } catch {
      const box = card.querySelector("textarea");
      box.hidden = false;
      box.value = text;
      box.focus();
      box.select();
      status.textContent = "선택된 문구를 직접 복사해 주세요.";
    }
  });
}
