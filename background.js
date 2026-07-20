/**
 * Open CleanMD in Chrome Side Panel so the UI stays open while browsing the page.
 * (The classic action popup always closes on outside click — Side Panel does not.)
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.warn("sidePanel.setPanelBehavior", e));
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((e) => console.warn("sidePanel.setPanelBehavior", e));
