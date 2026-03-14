'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<{ userId: number; username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Add user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Change password form (for any user)
  const [changingPasswordFor, setChangingPasswordFor] = useState<number | null>(null);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Rename user
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ]).then(([usersData, meData]) => {
      setUsers(Array.isArray(usersData) ? usersData : []);
      setMe(meData);
      setLoading(false);
    });
  }, []);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Failed to add user');
      } else {
        setUsers(prev => [...prev, data]);
        setNewUsername('');
        setNewPassword('');
        setShowAddForm(false);
      }
    } catch {
      setAddError('Something went wrong');
    } finally {
      setAddLoading(false);
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete user');
    }
  }

  async function changePassword(userId: number) {
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    setPwLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || 'Failed to update password');
      } else {
        setChangingPasswordFor(null);
        setNewPw('');
        setConfirmPw('');
      }
    } catch {
      setPwError('Something went wrong');
    } finally {
      setPwLoading(false);
    }
  }

  async function renameUser(userId: number) {
    setRenameError('');
    setRenameLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: renameValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRenameError(data.error || 'Failed to update username');
      } else {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, username: data[1] as string } : u)));
        setRenamingId(null);
        setRenameValue('');
      }
    } catch {
      setRenameError('Something went wrong');
    } finally {
      setRenameLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage who can access this CRM</p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setAddError(''); }}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add user
        </button>
      </div>

      {/* Add user form */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">New user</h2>
          <form onSubmit={addUser} className="space-y-3">
            {addError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Min. 8 characters"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={addLoading} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {addLoading ? 'Creating...' : 'Create user'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-600 hover:text-slate-800 text-sm px-4 py-2 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 sm:px-5 py-3">Username</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">Role</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">Added</th>
              <th className="px-4 sm:px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} className={i < users.length - 1 ? 'border-b border-slate-100' : ''}>
                <td className="px-4 sm:px-5 py-4">
                  {renamingId === user.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 w-36"
                        autoFocus
                      />
                      {renameError && <span className="text-red-500 text-xs">{renameError}</span>}
                      <button onClick={() => renameUser(user.id)} disabled={renameLoading} className="text-brand-600 hover:text-brand-800 text-xs font-medium">Save</button>
                      <button onClick={() => { setRenamingId(null); setRenameError(''); }} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{user.username}</span>
                        {me?.userId === user.id && (
                          <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">you</span>
                        )}
                      </div>
                      <div className="sm:hidden text-xs text-slate-400 mt-0.5 capitalize">{user.role}</div>
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 hidden sm:table-cell">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium capitalize">{user.role}</span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500 hidden sm:table-cell">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 sm:px-5 py-4">
                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    <button
                      onClick={() => {
                        setRenamingId(user.id);
                        setRenameValue(user.username);
                        setRenameError('');
                        setChangingPasswordFor(null);
                      }}
                      className="text-slate-500 hover:text-slate-700 text-xs font-medium"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setChangingPasswordFor(user.id);
                        setNewPw('');
                        setConfirmPw('');
                        setPwError('');
                        setRenamingId(null);
                      }}
                      className="text-slate-500 hover:text-slate-700 text-xs font-medium"
                    >
                      Change password
                    </button>
                    {me?.userId !== user.id && (
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Change password inline panel */}
      {changingPasswordFor !== null && (
        <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Change password for{' '}
            <span className="text-slate-900">{users.find(u => u.id === changingPasswordFor)?.username}</span>
          </h2>
          <div className="space-y-3">
            {pwError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Repeat password"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => changePassword(changingPasswordFor)}
                disabled={pwLoading}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {pwLoading ? 'Saving...' : 'Update password'}
              </button>
              <button
                onClick={() => { setChangingPasswordFor(null); setPwError(''); }}
                className="text-slate-600 hover:text-slate-800 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
