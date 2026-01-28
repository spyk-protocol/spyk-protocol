'use client';

interface NetworkStatusProps {
  network?: string;
  balance?: string;
  connected?: boolean;
}

export function NetworkStatus({
  network = 'devnet',
  balance = '0.00',
  connected = false
}: NetworkStatusProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-zinc-800/50 border-b border-zinc-800">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-zinc-600'}`} />
          <span className="text-sm text-zinc-400">
            Network: <span className="text-zinc-200 font-medium">{network}</span>
          </span>
        </div>
        <div className="h-4 w-px bg-zinc-700" />
        <span className="text-sm text-zinc-400">
          Balance: <span className="text-zinc-200 font-medium">{balance} SOL</span>
        </span>
      </div>
      {!connected && (
        <span className="text-xs text-zinc-500">Connect wallet to interact</span>
      )}
    </div>
  );
}
