import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { Shield, Settings, Globe, Coins, Plus, Trash2, Save, LogIn, LogOut, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [vaultAddress, setVaultAddress] = useState('');
  const [networks, setNetworks] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  
  const [newNetwork, setNewNetwork] = useState({ name: '', chainId: '', rpcUrl: '', isActive: true });
  const [newToken, setNewToken] = useState({ address: '', symbol: '', decimals: 18, chainId: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && u.email === 'duncanprono47@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    // Listen to global config
    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (doc) => {
      if (doc.exists()) setVaultAddress(doc.data().vaultAddress);
    });

    // Listen to networks
    const unsubNetworks = onSnapshot(collection(db, 'networks'), (snapshot) => {
      setNetworks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to tokens
    const unsubTokens = onSnapshot(collection(db, 'tokens'), (snapshot) => {
      setTokens(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubConfig();
      unsubNetworks();
      unsubTokens();
    };
  }, [isAdmin]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const updateVault = async () => {
    await setDoc(doc(db, 'config', 'global'), { vaultAddress, updatedAt: new Date().toISOString() });
    alert('Vault address updated');
  };

  const addNetwork = async () => {
    if (!newNetwork.name || !newNetwork.chainId) return;
    await addDoc(collection(db, 'networks'), { ...newNetwork, chainId: Number(newNetwork.chainId) });
    setNewNetwork({ name: '', chainId: '', rpcUrl: '', isActive: true });
  };

  const addToken = async () => {
    if (!newToken.address || !newToken.symbol) return;
    await addDoc(collection(db, 'tokens'), { ...newToken, chainId: Number(newToken.chainId) });
    setNewToken({ address: '', symbol: '', decimals: 18, chainId: '' });
  };

  const deleteItem = async (col: string, id: string) => {
    await deleteDoc(doc(db, col, id));
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono text-[#00ff41]">INITIALIZING_ADMIN_PROTOCOL...</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="glass-card p-12 rounded-3xl border-[#333] max-w-md w-full text-center">
          <Shield className="w-16 h-16 text-[#00ff41] mx-auto mb-6" />
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Restricted Access</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">This terminal is reserved for authorized administrators only. Please authenticate to continue.</p>
          <button 
            onClick={handleLogin}
            className="w-full h-14 bg-[#00ff41] text-black font-black uppercase tracking-widest rounded-xl hover:bg-[#00e03a] transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-mono">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00ff41]/10 flex items-center justify-center">
              <Settings className="w-6 h-6 text-[#00ff41]" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Command Center</h1>
              <p className="text-[10px] text-gray-500">ADMIN_SESSION: {user?.email}</p>
            </div>
          </div>
          <button onClick={() => auth.signOut()} className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-widest">
            <LogOut className="w-4 h-4" /> Terminate Session
          </button>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Global Vault Settings */}
          <section className="lg:col-span-3 glass-card p-8 rounded-3xl border-[#00ff41]/20">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-[#00ff41]" />
              <h2 className="text-lg font-bold uppercase">Global Rescue Vault</h2>
            </div>
            <div className="flex gap-4">
              <input 
                type="text"
                value={vaultAddress}
                onChange={(e) => setVaultAddress(e.target.value)}
                placeholder="Centralized Rescue Address (0x...)"
                className="flex-1 h-14 bg-[#0a0a0a] border border-[#333] rounded-xl px-4 text-sm focus:border-[#00ff41] focus:outline-none"
              />
              <button onClick={updateVault} className="h-14 px-8 bg-[#00ff41] text-black font-bold uppercase rounded-xl flex items-center gap-2">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
            <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
              * This address will be the default destination for all client rescue operations.
            </p>
          </section>

          {/* Networks Management */}
          <section className="glass-card p-8 rounded-3xl border-[#333]">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-[#00ff41]" />
              <h2 className="text-lg font-bold uppercase">Networks</h2>
            </div>
            
            <div className="space-y-4 mb-8">
              <input 
                type="text" 
                placeholder="Network Name" 
                value={newNetwork.name}
                onChange={e => setNewNetwork({...newNetwork, name: e.target.value})}
                className="w-full h-12 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 text-xs"
              />
              <input 
                type="number" 
                placeholder="Chain ID" 
                value={newNetwork.chainId}
                onChange={e => setNewNetwork({...newNetwork, chainId: e.target.value})}
                className="w-full h-12 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 text-xs"
              />
              <button onClick={addNetwork} className="w-full h-12 bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Network
              </button>
            </div>

            <div className="space-y-2">
              {networks.map(net => (
                <div key={net.id} className="p-3 bg-[#0a0a0a] border border-[#333] rounded-lg flex items-center justify-between">
                  <div className="text-xs">
                    <div className="font-bold">{net.name}</div>
                    <div className="text-[10px] text-gray-500">ID: {net.chainId}</div>
                  </div>
                  <button onClick={() => deleteItem('networks', net.id)} className="text-red-500/50 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Tokens Management */}
          <section className="lg:col-span-2 glass-card p-8 rounded-3xl border-[#333]">
            <div className="flex items-center gap-2 mb-6">
              <Coins className="w-5 h-5 text-[#00ff41]" />
              <h2 className="text-lg font-bold uppercase">Tracked Tokens</h2>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <input 
                type="text" 
                placeholder="Address" 
                value={newToken.address}
                onChange={e => setNewToken({...newToken, address: e.target.value})}
                className="h-12 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 text-xs"
              />
              <input 
                type="text" 
                placeholder="Symbol" 
                value={newToken.symbol}
                onChange={e => setNewToken({...newToken, symbol: e.target.value})}
                className="h-12 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 text-xs"
              />
              <input 
                type="number" 
                placeholder="Chain ID" 
                value={newToken.chainId}
                onChange={e => setNewToken({...newToken, chainId: e.target.value})}
                className="h-12 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 text-xs"
              />
              <button onClick={addToken} className="h-12 bg-[#00ff41] text-black rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Token
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {tokens.map(token => (
                <div key={token.id} className="p-4 bg-[#0a0a0a] border border-[#333] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#00ff41]/5 flex items-center justify-center text-[10px] font-bold text-[#00ff41]">
                      {token.symbol[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{token.symbol}</div>
                      <div className="text-[9px] text-gray-500 font-mono">{token.address.slice(0,10)}...</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] text-gray-600 font-bold">CHAIN: {token.chainId}</div>
                    <button onClick={() => deleteItem('tokens', token.id)} className="text-red-500/50 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
