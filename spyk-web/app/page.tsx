import {
  Header,
  NetworkStatus,
  PaySection,
  DepositSection,
  WithdrawSection,
  TransferSection,
  BalanceDisplay
} from './components';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-3xl">
        <Header />
        <NetworkStatus />

        <main className="p-6 space-y-6">
          <PaySection />
          <DepositSection />
          <WithdrawSection />
          <TransferSection />
          <BalanceDisplay />
        </main>

        <footer className="px-6 py-4 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-600">
            SPYK Protocol Demo - Privacy-preserving transactions on Solana
          </p>
        </footer>
      </div>
    </div>
  );
}
