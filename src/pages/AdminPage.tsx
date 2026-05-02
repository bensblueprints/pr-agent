import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Trash2, Users, Shield, Mail } from 'lucide-react';

interface AdminUser {
  id: number;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, adminUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.isLoading && (!auth.user || auth.user.role !== 'admin')) {
      navigate('/chat');
      return;
    }
    if (auth.user?.role === 'admin') {
      loadData();
    }
  }, [auth.user, auth.isLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${auth.token}` } }),
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${auth.token}` } }),
      ]);
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      setUsers(usersData.users || []);
      setStats(statsData);
    } catch {
      setError('Failed to load admin data');
    }
    setLoading(false);
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ userId }),
      });
      loadData();
    } catch {
      setError('Delete failed');
    }
  };

  if (auth.isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem-3rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Portal</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="w-3 h-3" /> Total Users</div>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Shield className="w-3 h-3" /> Admins</div>
          <div className="text-2xl font-bold">{stats.adminUsers}</div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">ID</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Joined</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-xs text-muted-foreground">{u.id}</td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  {u.email}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  {u.id !== auth.user?.id && (
                    <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
