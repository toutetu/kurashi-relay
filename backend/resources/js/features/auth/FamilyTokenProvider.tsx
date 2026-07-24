/* eslint-disable react-refresh/only-export-components */
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearFamilyToken,
  getFamilyToken,
  isFamilyTokenRequired,
  saveFamilyToken,
  subscribeFamilyTokenRequired,
} from "../../api/familyToken";
import { Button } from "../../components/ui/Button";

type FamilyTokenContextValue = {
  hasSavedToken: boolean;
  openFamilyTokenDialog: () => void;
  removeSavedToken: () => void;
};

const FamilyTokenContext = createContext<FamilyTokenContextValue | null>(null);

export function useFamilyToken() {
  const value = useContext(FamilyTokenContext);
  if (value === null) {
    throw new Error("useFamilyToken must be used inside FamilyTokenProvider.");
  }
  return value;
}

export function FamilyTokenProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasSavedToken, setHasSavedToken] = useState(
    () => getFamilyToken() !== null,
  );
  const [dialogOpen, setDialogOpen] = useState(isFamilyTokenRequired);
  const [required, setRequired] = useState(isFamilyTokenRequired);
  const [tokenInput, setTokenInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeFamilyTokenRequired(() => {
        setHasSavedToken(false);
        setRequired(true);
        setDialogOpen(true);
        setInputError(null);
      }),
    [],
  );

  const openFamilyTokenDialog = () => {
    setRequired(false);
    setTokenInput("");
    setInputError(null);
    setDialogOpen(true);
  };

  const removeSavedToken = () => {
    clearFamilyToken();
    setHasSavedToken(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      saveFamilyToken(tokenInput);
    } catch (error) {
      setInputError(
        error instanceof Error
          ? error.message
          : "あいことばを入力してください。",
      );
      return;
    }

    setHasSavedToken(true);
    setRequired(false);
    setDialogOpen(false);
    setTokenInput("");
    setInputError(null);
    void queryClient.refetchQueries({ type: "active" });
  };

  return (
    <FamilyTokenContext.Provider
      value={{
        hasSavedToken,
        openFamilyTokenDialog,
        removeSavedToken,
      }}
    >
      {children}
      {dialogOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[var(--text)]/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="family-token-title"
            aria-describedby="family-token-description"
            className="w-full max-w-md rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xl sm:p-7"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-deep)]">
              <ShieldCheck aria-hidden="true" size={24} />
            </span>
            <h2 id="family-token-title" className="mt-4 text-xl font-black">
              あいことばを入力
            </h2>
            <p
              id="family-token-description"
              className="mt-2 leading-relaxed text-[var(--muted-text)]"
            >
              家族の記録を守るためのあいことばです。半角の英字・数字（と . _ -）で入力してください。この端末だけに保存します。
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label
                className="block text-sm font-bold text-[var(--text)]"
                htmlFor="family-aikotoba-input"
              >
                あいことば
              </label>
              <input
                id="family-aikotoba-input"
                name="aikotoba"
                type="text"
                inputMode="latin"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                autoFocus
                value={tokenInput}
                onChange={(event) => {
                  setTokenInput(event.target.value);
                  setInputError(null);
                }}
                placeholder="例：akichan-home"
                className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-base font-medium text-[var(--text)] caret-[var(--text)] outline-none transition [-webkit-text-security:none] [text-security:none] focus:border-[var(--primary)] focus:ring-3 focus:ring-[var(--primary-soft)]"
              />
              {tokenInput.length > 0 && (
                <p className="break-all text-sm text-[var(--muted-text)]">
                  入力中:{" "}
                  <span className="font-bold text-[var(--text)]">{tokenInput}</span>
                </p>
              )}
              {inputError && (
                <p
                  role="alert"
                  className="text-sm font-bold text-[var(--danger-text)]"
                >
                  {inputError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {!required && (
                  <Button
                    purpose="low"
                    tone="default"
                    onClick={() => setDialogOpen(false)}
                  >
                    キャンセル
                  </Button>
                )}
                <Button type="submit" icon={KeyRound}>
                  保存してつづける
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </FamilyTokenContext.Provider>
  );
}
