import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, setDoc, collection, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Shield, Settings, Globe, Coins, Plus, Trash2, Save, LogIn, LogOut, Lock, ShieldAlert, Users } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  
  const [vaultAddress, setVaultAddress] = useState('');
  const [networks, setNetworks] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  
  const [newNetwork, setNewNetwork] = useState({ name: '', chainId: '', rpcUrl: '', isActive: true });
  const [newToken, setNewToken] = useState({ address: '', symbol: '', decimals: 18, chainId: '' });
  const [newAdmin, setNewAdmin] = useState({ email: '', uid: '' });

  useEffect(() => {
    const sessionAdmin = localStorage.getItem('safeguard_admin_session');
    if (sessionAdmin === 'true') {
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (doc) => {
      if (doc.exists()) setVaultAddress(doc.data().vaultAddress);
    });

    const unsubNetworks = onSnapshot(collection(db, 'networks'), (snapshot) => {
      setNetworks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTokens = onSnapshot(collection(db, 'tokens'), (snapshot) => {
      setTokens(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAdmins = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAdmins(snapshot.docs.filter(d => d.data().role === 'admin').map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubConfig();
      unsubNetworks();
      unsubTokens();
      unsubAdmins();
    };
  }, [isAdmin]);

  const handleLogin = () => {
    const env = (import.meta as any).env;
    const passwordsStr = env.VITE_ADMIN_PASSWORDS || env.VITE_ADMIN_PASSWORD || '';
    
    if (!passwordsStr) {
      toast.error('Admin passwords not configured in environment');
      console.error('VITE_ADMIN_PASSWORDS or VITE_ADMIN_PASSWORD is missing');
      return;
    }

    const adminPasswords = passwordsStr.split(',').map((p: string) => p.trim());
    
    if (adminPasswords.includes(password.trim())) {
      setIsAdmin(true);
      localStorage.setItem('safeguard_admin_session', 'true');
      toast.success('Authenticated successfully');
    } else {
      toast.error('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('safeguard_admin_session');
    toast.success('Logged out');
  };

  const updateVault = async () => {
    try {
      await setDoc(doc(db, 'config', 'global'), { vaultAddress, updatedAt: new Date().toISOString() });
      toast.success('Vault address updated');
    } catch (error) {
      toast.error('Failed to update vault');
    }
  };

  const addNetwork = async () => {
    if (!newNetwork.name || !newNetwork.chainId) return;
    try {
      await addDoc(collection(db, 'networks'), { ...newNetwork, chainId: Number(newNetwork.chainId) });
      setNewNetwork({ name: '', chainId: '', rpcUrl: '', isActive: true });
      toast.success('Network added');
    } catch (error) {
      toast.error('Failed to add network');
    }
  };

  const addToken = async () => {
    if (!newToken.address || !newToken.symbol) return;
    try {
      await addDoc(collection(db, 'tokens'), { ...newToken, chainId: Number(newToken.chainId) });
      setNewToken({ address: '', symbol: '', decimals: 18, chainId: '' });
      toast.success('Token added');
    } catch (error) {
      toast.error('Failed to add token');
    }
  };

  const addAdmin = async () => {
    if (!newAdmin.uid || !newAdmin.email) return;
    try {
      await setDoc(doc(db, 'users', newAdmin.uid), { email: newAdmin.email, role: 'admin' });
      setNewAdmin({ email: '', uid: '' });
      toast.success('Admin added');
    } catch (error) {
      toast.error('Failed to add admin');
    }
  };

  const deleteItem = async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, col, id));
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono text-[#00ff41]">INITIALIZING_ADMIN_PROTOCOL...</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <Toaster position="top-center" richColors />
        <div className="glass-card p-12 rounded-3xl border-[#333] max-w-md w-full text-center">
          <Lock className="w-16 h-16 text-[#00ff41] mx-auto mb-6" />
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">King Admin</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">Secure terminal access. Please enter password to continue.</p>
          <div className="space-y-4">
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full h-14 bg-[#0a0a0a] border border-[#333] rounded-xl px-4 text-sm focus:border-[#00ff41] focus:outline-none text-center"
              placeholder="ENTER_PASSWORD"
            />
            <button 
              onClick={handleLogin}
              className="w-full h-14 bg-[#00ff41] text-black font-black uppercase tracking-widest rounded-xl hover:bg-[#00e03a] transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Access Terminal
            </button>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-4 text-[10px] text-gray-600 hover:text-gray-400 uppercase tracking-widest"
          >
            Return to Surface
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-mono">
      <Toaster position="top-center" richColors />
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00ff41]/10 flex items-center justify-center">
              <Settings className="w-6 h-6 text-[#00ff41]" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Command Center</h1>
              <p className="text-[10px] text-gray-500">ADMIN_SESSION: ACTIVE</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-widest">
            <LogOut className="w-4 h-4" /> Terminate Session
          </button>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Global Vault Settings */}
          <section className="lg:col-span-2 glass-card p-8 rounded-3xl border-[#00ff41]/20">
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

          {/* Admin Management */}
          <section className="glass-card p-8 rounded-3xl border-[#333]">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-[#00ff41]" />
              <h2 className="text-lg font-bold uppercase">Admins</h2>
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="User UID" 
                value={newAdmin.uid}
                onChange={e => setNewAdmin({...newAdmin, uid: e.target.value})}
                className="w-full h-12 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 text-xs"
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={newAdmin.email}
                onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                className="w-full h-12 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 text-xs"
              />
              <button onClick={addAdmin} className="w-full h-12 bg-white/5 hover:bg-white/10 text-white font-bold uppercase rounded-lg flex items-center justify-center gap-2 text-xs transition-all">
                <Plus className="w-4 h-4" /> Add Admin
              </button>
              
              <div className="mt-6 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-[#333]">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/80">{admin.email}</span>
                      <span className="text-[8px] text-gray-600 font-mono truncate max-w-[150px]">{admin.id}</span>
                    </div>
                    <button onClick={() => deleteItem('users', admin.id)} className="text-red-500 hover:text-red-400 p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
