'use client';

import { FC, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletButton: FC = () => {
  const { publicKey, disconnect, connected } = useWallet();

  // Shorten wallet address for display
  const shortenedAddress = useMemo(() => {
    if (!publicKey) return null;
    const address = publicKey.toBase58();
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, [publicKey]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, [disconnect]);

  return (
    <div className="flex flex-col items-center gap-4">
      <WalletMultiButton />

      {connected && publicKey && (
        <div className="flex flex-col items-center gap-2 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connected Wallet
          </p>
          <p className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {shortenedAddress}
          </p>
          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500 break-all max-w-xs text-center">
            {publicKey.toBase58()}
          </p>
          <button
            onClick={handleDisconnect}
            className="mt-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletButton;
