import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { connectWallet, getAccounts, subscribeAccounts } from "../lib/client";

interface GenKitState {
  account: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const GenKitContext = createContext<GenKitState>({
  account: null,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function GenKitProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let alive = true;
    getAccounts().then((accs) => {
      if (alive && accs.length) setAccount(accs[0]);
    });
    const unsub = subscribeAccounts((accs) => {
      setAccount(accs.length ? accs[0] : null);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAccount(addr);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => setAccount(null);

  return (
    <GenKitContext.Provider value={{ account, connecting, connect, disconnect }}>
      {children}
    </GenKitContext.Provider>
  );
}

export function useGenKit() {
  return useContext(GenKitContext);
}
