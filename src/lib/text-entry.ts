let textEntryGuardUntil = 0;
let keyboardDismissGuardUntil = 0;
let softKeyboardOpen = false;
let keyboardGuardInstalled = false;

const TEXT_ENTRY_GUARD_MS = 1500;
const KEYBOARD_DISMISS_GUARD_MS = 900;

export function markTextEntryInteraction() {
  if (typeof Date === "undefined") {
    return;
  }

  textEntryGuardUntil = Date.now() + TEXT_ENTRY_GUARD_MS;
}

export function isTextEntryElement(element: EventTarget | null) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.isContentEditable
  );
}

export function isSoftKeyboardOpen() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  if (isTextEntryElement(document.activeElement)) {
    const visual = window.visualViewport;
    if (!visual) {
      return true;
    }

    return visual.height < window.innerHeight * 0.92 || visual.offsetTop > 8;
  }

  const visual = window.visualViewport;
  if (!visual) {
    return false;
  }

  return visual.height < window.innerHeight * 0.78 || visual.offsetTop > 8;
}

export function isKeyboardDismissGuardActive() {
  return Date.now() < keyboardDismissGuardUntil;
}

function syncSoftKeyboardState() {
  const open = isSoftKeyboardOpen();

  if (open) {
    markTextEntryInteraction();
  } else if (softKeyboardOpen) {
    keyboardDismissGuardUntil = Date.now() + KEYBOARD_DISMISS_GUARD_MS;
    markTextEntryInteraction();
  }

  softKeyboardOpen = open;
}

export function installSoftKeyboardGuard() {
  if (typeof window === "undefined" || keyboardGuardInstalled) {
    return () => {};
  }

  keyboardGuardInstalled = true;
  syncSoftKeyboardState();

  window.visualViewport?.addEventListener("resize", syncSoftKeyboardState);
  window.visualViewport?.addEventListener("scroll", syncSoftKeyboardState);
  window.addEventListener("focusin", syncSoftKeyboardState, true);
  window.addEventListener("focusout", syncSoftKeyboardState, true);

  return () => {
    keyboardGuardInstalled = false;
    window.visualViewport?.removeEventListener("resize", syncSoftKeyboardState);
    window.visualViewport?.removeEventListener("scroll", syncSoftKeyboardState);
    window.removeEventListener("focusin", syncSoftKeyboardState, true);
    window.removeEventListener("focusout", syncSoftKeyboardState, true);
  };
}

export function isTextEntryActive() {
  if (typeof document === "undefined") {
    return false;
  }

  if (Date.now() < textEntryGuardUntil || Date.now() < keyboardDismissGuardUntil) {
    return true;
  }

  if (isTextEntryElement(document.activeElement)) {
    return true;
  }

  return isSoftKeyboardOpen();
}
