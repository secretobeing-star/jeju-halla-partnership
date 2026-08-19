"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";

export type PromptOptions = {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  presetOptions?: readonly string[];
  allowEmpty?: boolean;
};

export type AlertOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
};

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptRequest = PromptOptions & {
  resolve: (value: string | null) => void;
};

type AlertRequest = AlertOptions & {
  resolve: () => void;
};

type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type PromptModalContextValue = {
  prompt: (options: PromptOptions) => Promise<string | null>;
  alert: (options: AlertOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const PromptModalContext = createContext<PromptModalContextValue | null>(null);

export function usePromptModal() {
  const context = useContext(PromptModalContext);
  if (!context) {
    throw new Error("usePromptModal must be used within PromptModalProvider");
  }

  return context;
}

export default function PromptModalProvider({ children }: { children: React.ReactNode }) {
  const [promptState, setPromptState] = useState<PromptRequest | null>(null);
  const [alertState, setAlertState] = useState<AlertRequest | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmRequest | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setInputValue(options.defaultValue ?? "");
      setPromptState({ ...options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({ ...options, resolve });
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const closePrompt = useCallback((result: string | null) => {
    setPromptState((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((current) => {
      current?.resolve();
      return null;
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    setConfirmState((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const promptModalOpen = Boolean(promptState || alertState || confirmState);

  const closeTopPromptModal = useCallback(() => {
    if (promptState) {
      closePrompt(null);
      return;
    }

    if (alertState) {
      closeAlert();
      return;
    }

    if (confirmState) {
      closeConfirm(false);
    }
  }, [alertState, closeAlert, closeConfirm, closePrompt, confirmState, promptState]);

  useAppBackHandler(
    promptModalOpen,
    closeTopPromptModal,
    promptState ? "app-prompt" : alertState ? "app-alert" : confirmState ? "app-confirm" : "app-prompt-closed",
  );

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!promptState && !alertState && !confirmState) {
      document.body.classList.remove("app-prompt-open");
      return;
    }

    document.body.classList.add("app-prompt-open");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (promptState) {
          closePrompt(null);
        } else if (alertState) {
          closeAlert();
        } else if (confirmState) {
          closeConfirm(false);
        }
        return;
      }

      if (event.key === "Enter" && promptState && !promptState.multiline && !event.shiftKey) {
        event.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed && !promptState.allowEmpty) {
          return;
        }
        closePrompt(trimmed);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [alertState, closeAlert, closeConfirm, closePrompt, confirmState, inputValue, promptState]);

  function handlePromptConfirm() {
    if (!promptState) {
      return;
    }

    const trimmed = inputValue.trim();
    if (!trimmed && !promptState.allowEmpty) {
      return;
    }

    closePrompt(trimmed);
  }

  let promptLayer: ReactNode = null;

  if (promptState) {
    promptLayer = (
      <div className="app-prompt-overlay" role="presentation">
        <div
          className="app-prompt-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-prompt-title"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="app-prompt-title" className="app-prompt-title">
            {promptState.title}
          </h2>
          {promptState.description ? (
            <p className="app-prompt-description">{promptState.description}</p>
          ) : null}

          {promptState.presetOptions && promptState.presetOptions.length > 0 ? (
            <div className="app-prompt-presets">
              {promptState.presetOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setInputValue(option)}
                  className={`app-prompt-preset${inputValue === option ? " app-prompt-preset--active" : ""}`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}

          {promptState.multiline ? (
            <textarea
              ref={inputRef as RefObject<HTMLTextAreaElement>}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={promptState.placeholder}
              rows={4}
              className="app-prompt-input app-prompt-input--textarea"
            />
          ) : (
            <input
              ref={inputRef as RefObject<HTMLInputElement>}
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={promptState.placeholder}
              className="app-prompt-input"
            />
          )}

          <div className="app-prompt-actions">
            <button
              type="button"
              onClick={() => closePrompt(null)}
              className="app-prompt-button app-prompt-button--cancel"
            >
              {promptState.cancelLabel ?? "취소"}
            </button>
            <button
              type="button"
              onClick={handlePromptConfirm}
              className="app-prompt-button app-prompt-button--confirm"
            >
              {promptState.confirmLabel ?? "확인"}
            </button>
          </div>
        </div>
      </div>
    );
  } else if (alertState) {
    promptLayer = (
      <div className="app-prompt-overlay" role="presentation">
        <div
          className="app-prompt-dialog app-prompt-dialog--alert"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="app-alert-title"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="app-alert-title" className="app-prompt-title">
            {alertState.title}
          </h2>
          <p className="app-prompt-description app-prompt-description--pre">
            {alertState.message}
          </p>
          <div className="app-prompt-actions app-prompt-actions--single">
            <button
              type="button"
              onClick={closeAlert}
              className="app-prompt-button app-prompt-button--confirm"
            >
              {alertState.confirmLabel ?? "확인"}
            </button>
          </div>
        </div>
      </div>
    );
  } else if (confirmState) {
    promptLayer = (
      <div className="app-prompt-overlay" role="presentation">
        <div
          className="app-prompt-dialog app-prompt-dialog--alert"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="app-confirm-title"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="app-confirm-title" className="app-prompt-title">
            {confirmState.title}
          </h2>
          <p className="app-prompt-description app-prompt-description--pre">
            {confirmState.message}
          </p>
          <div className="app-prompt-actions">
            <button
              type="button"
              onClick={() => closeConfirm(false)}
              className="app-prompt-button app-prompt-button--cancel"
            >
              {confirmState.cancelLabel ?? "취소"}
            </button>
            <button
              type="button"
              onClick={() => closeConfirm(true)}
              className={`app-prompt-button ${
                confirmState.destructive
                  ? "app-prompt-button--danger"
                  : "app-prompt-button--confirm"
              }`}
            >
              {confirmState.confirmLabel ?? "확인"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PromptModalContext.Provider value={{ prompt, alert, confirm }}>
      {children}
      {portalTarget && promptLayer ? createPortal(promptLayer, portalTarget) : null}
    </PromptModalContext.Provider>
  );
}
