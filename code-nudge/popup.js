const KEYS = ["nudgesShown", "openedInCode", "keptInChat"];
const store = chrome.storage.local;

function render() {
  store.get([...KEYS, "enabled", "showMaybe"], (s) => {
    for (const k of KEYS) document.getElementById(k).textContent = s[k] || 0;
    document.getElementById("enabled").checked = s.enabled !== false;
    document.getElementById("showMaybe").checked = s.showMaybe !== false;
  });
}

for (const id of ["enabled", "showMaybe"]) {
  document.getElementById(id).addEventListener("change", (e) => store.set({ [id]: e.target.checked }));
}
document.getElementById("reset").addEventListener("click", () => {
  store.set({ nudgesShown: 0, openedInCode: 0, keptInChat: 0 }, render);
});

render();
