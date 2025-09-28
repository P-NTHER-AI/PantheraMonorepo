import { Wallet, WalletId, useNetwork, useWallet } from "@txnlab/use-wallet-react";
import { Activity, Check, ChevronDown, Copy, Wallet as LucideWallet, Settings, Shield, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";

interface ConnectWalletProps {
  className?: string;
  showTransactions?: boolean;
  showNetworkInfo?: boolean;
}

const ConnectWallet: React.FC<ConnectWalletProps> = ({ className = "", showTransactions = true, showNetworkInfo = true }) => {
  const { wallets, activeAddress, algodClient } = useWallet();
  const { activeNetwork } = useNetwork();

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD;

  const [showDropdown, setShowDropdown] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "network">("overview");
  const [balance, setBalance] = useState(0);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: number) => {
    const num = bal / 1e6;
    if (num === 0) return "0";
    if (num < 0.001) return "<0.001";
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(3);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const copyAddress = async () => {
    if (activeAddress) {
      await navigator.clipboard.writeText(activeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getNetworkStatusColor = () => {
    if (!activeAddress) return "bg-gray-400";
    return "bg-green-400";
  };

  const getNetworkStatusText = () => {
    if (!activeAddress) return "Not Connected";
    return activeNetwork || "Connected";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".wallet-dropdown")) {
        setShowDropdown(false);
        setShowConnectors(false);
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get ALGO balance
  useEffect(() => {
    (async () => {
      if (!activeAddress) return;
      const accountInfo = await algodClient.accountInformation(activeAddress).do();
      setBalance(Number(accountInfo.amount));
    })();
  }, [activeAddress, algodClient]);

  if (!activeAddress) {
    return (
      <div className={`relative wallet-dropdown ${className}`}>
        <button
          onClick={() => setShowConnectors(!showConnectors)}
          className="bg-[#d8e9ea] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#b8d4d6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <LucideWallet size={16} />
          <span>Connect Wallet</span>
        </button>

        {/* Connector Selection Modal */}
        {showConnectors && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg font-semibold">Connect Wallet</h3>
                <button onClick={() => setShowConnectors(false)} className="text-[#a0a0a0] hover:text-white">
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {wallets?.map((wallet) => (
                  <button
                    key={`provider-${wallet.id}`}
                    onClick={() => {
                      return wallet.connect();
                    }}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 text-left hover:border-[#d8e9ea] transition-colors group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg flex items-center justify-center">
                        <LucideWallet size={16} className="text-black" />
                      </div>
                      <div>
                        <div className="text-white font-medium">{isKmd(wallet) ? "LocalNet Wallet" : wallet.metadata.name}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative wallet-dropdown ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:border-[#3a3a3a] px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
      >
        <div className={`w-2 h-2 rounded-full ${getNetworkStatusColor()}`} />
        <span className="font-medium">{formatAddress(activeAddress)}</span>
        <ChevronDown size={16} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl z-50">
          {/* Header */}
          <div className="p-4 border-b border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getNetworkStatusColor()}`} />
                <span className="text-sm font-medium text-white">{getNetworkStatusText()}</span>
              </div>
              <button onClick={() => setShowSettings(!showSettings)} className="p-1 text-[#a0a0a0] hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a0a0a0]">Address</span>
                <button onClick={copyAddress} className="flex items-center space-x-1 text-xs text-[#d8e9ea] hover:text-white">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <p className="text-sm font-mono text-white">{formatAddress(activeAddress)}</p>
            </div>

            <div className="mt-2">
              <span className="text-xs text-[#a0a0a0]">Balance</span>
              <p className="text-lg font-semibold text-white">{formatBalance(balance)} ALGO</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#2a2a2a]">
            {[
              { id: "overview" as const, label: "Overview", icon: Activity },
              ...(showTransactions ? [{ id: "transactions" as const, label: "Transactions", icon: Zap }] : []),
              ...(showNetworkInfo ? [{ id: "network" as const, label: "Network", icon: Shield }] : []),
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center space-x-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === id ? "text-[#d8e9ea] border-b-2 border-[#d8e9ea]" : "text-[#a0a0a0] hover:text-white"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === "overview" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                    <div className="text-xs text-[#a0a0a0]">Pending</div>
                    <div className="text-lg font-semibold text-orange-400">0</div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                    <div className="text-xs text-[#a0a0a0]">Success Rate</div>
                    <div className="text-lg font-semibold text-green-400">100.0%</div>
                  </div>
                </div>

                {/* {!networkStatus.isOnCoreNetwork && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-yellow-400">Wrong Network</span>
                    </div>
                    <p className="text-xs text-yellow-400/80 mt-1">Switch to Core network to use this app</p>
                    <button
                      onClick={switchToCoreTestnet}
                      disabled={isSwitchLoading}
                      className="mt-2 w-full bg-[#d8e9ea] hover:bg-[#b8d4d6] disabled:opacity-50 text-black text-xs py-2 rounded transition-colors font-medium"
                    >
                      {isSwitchLoading ? "Switching..." : "Switch to Core Testnet"}
                    </button>
                  </div>
                )} */}
              </div>
            )}

            {activeTab === "transactions" && showTransactions && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recent Transactions</span>
                  {/* {isProcessing && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />} */}
                </div>

                {/* {recentTransactions.length === 0 ? ( */}
                <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
                {/* ) : (
                  <div className="space-y-2">
                    {recentTransactions.map((tx) => (
                      <div key={tx.hash} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="text-xs font-medium capitalize">{tx.type}</div>
                          <div className="text-xs text-gray-500">{formatAddress(tx.hash)}</div>
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded ${
                            tx.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : tx.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {tx.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )} */}
              </div>
            )}

            {activeTab === "network" && showNetworkInfo && (
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Current Network</span>
                  <div className="mt-1 p-2 bg-white/5 rounded">
                    <div className="text-sm font-medium">{activeNetwork}</div>
                    {/* <div className="text-xs">Chain ID: {activeNetworkConfig.caipChainId}</div> */}
                  </div>
                </div>

                {/* <div className="space-y-2">
                  <span className="text-sm font-medium">Switch Network</span>
                  {supportedNetworks.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => (network.id === 1115 ? switchToCoreTestnet() : switchToCoreMainnet())}
                      disabled={isSwitchLoading || networkStatus.currentNetwork?.id === network.id}
                      className="w-full flex items-center justify-between p-2 border border-gray-200 rounded hover:border-blue-300 disabled:opacity-50 transition-colors"
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium">{network.name}</div>
                        <div className="text-xs text-gray-500">{network.isTestnet ? "Testnet" : "Mainnet"}</div>
                      </div>
                      {networkStatus.currentNetwork?.id === network.id && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                    </button>
                  ))}
                </div> */}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#2a2a2a]">
            <button
              onClick={async () => {
                if (wallets) {
                  const activeWallet = wallets.find((w) => w.isActive);
                  if (activeWallet) {
                    await activeWallet.disconnect();
                  } else {
                    // Required for logout/cleanup of inactive providers
                    // For instance, when you login to localnet wallet and switch network
                    // to testnet/mainnet or vice verse.
                    localStorage.removeItem("@txnlab/use-wallet:v3");
                    window.location.reload();
                  }
                }
              }}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 text-sm py-2 rounded transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectWallet;
