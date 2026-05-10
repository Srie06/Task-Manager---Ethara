"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import RoleGuard from "@/components/RoleGuard";
import api from "@/lib/api";
import useAuthClientState from "@/hooks/useAuthClientState";
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, User } from "lucide-react";

export default function AdminUsersPage() {
    const router = useRouter();
    const { mounted, token, role: myRole } = useAuthClientState();
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [error, setError] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "tasker", parent_id: "" });

    const [deleteConfirm, setDeleteConfirm] = useState(null);

    async function loadUsers() {
        try {
            const resp = await api.get("/users");
            setUsers(resp.data);
        } catch (err) { setError(err.response?.data?.error || "Failed to load users"); }
    }

    useEffect(() => {
        if (!mounted) return;
        if (!token) { router.push("/login"); return; }
        if (myRole !== 'admin') { router.push("/dashboard"); return; }
        loadUsers();
    }, [mounted, token, myRole, router]);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchSearch = String(u.name).toLowerCase().includes(searchTerm.toLowerCase()) || String(u.email).toLowerCase().includes(searchTerm.toLowerCase());
            const matchRole = roleFilter === "all" || u.role === roleFilter;
            return matchSearch && matchRole;
        });
    }, [users, searchTerm, roleFilter]);

    function openEdit(user) {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, password: "", role: user.role, parent_id: user.parent_id || "" });
        setIsModalOpen(true);
    }

    function openNew() {
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "tasker", parent_id: "" });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const payload = { ...formData, parent_id: formData.parent_id ? Number(formData.parent_id) : null };
            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, payload);
            } else {
                await api.post("/users", payload);
            }
            setIsModalOpen(false);
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to save user");
            alert(err.response?.data?.error || "Failed to save user");
        }
    }

    async function handleDelete() {
        if (!deleteConfirm) return;
        try {
            await api.delete(`/users/${deleteConfirm}`);
            setDeleteConfirm(null);
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete user");
            setDeleteConfirm(null);
        }
    }

    if (!mounted || myRole !== 'admin') return null;

    return (
        <>
            <Navbar />
            <main className="container-page pb-16 mt-8">
                <RoleGuard allow={["admin"]}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-stripe-textPrimary tracking-tight">User Management</h1>
                            <p className="text-stripe-textSecondary mt-1">Add, update, or remove users and their reporting structures.</p>
                        </div>
                        <button onClick={openNew} className="shrink-0 inline-flex items-center gap-2 rounded-md bg-stripe-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stripe-blue/90 transition-colors">
                            <Plus className="h-4 w-4" /> Add User
                        </button>
                    </div>

                    <div className="rounded-card border border-stripe-border bg-white shadow-card overflow-hidden">
                        <div className="p-4 border-b border-stripe-border flex flex-col sm:flex-row gap-4 bg-[#F8FAFC]">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 rounded-md border border-stripe-border focus:ring-1 focus:ring-stripe-blue text-sm outline-none"
                                />
                            </div>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="rounded-md border border-stripe-border px-3 py-1.5 text-sm bg-white min-w-[140px] focus:ring-1 focus:ring-stripe-blue outline-none"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="pl">Project Lead (PL)</option>
                                <option value="qr">Quality Reviewer (QR)</option>
                                <option value="tasker">Tasker</option>
                            </select>
                        </div>

                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[#F8FAFC] border-b border-stripe-border text-stripe-textSecondary">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Avatar</th>
                                        <th className="px-4 py-3 font-semibold">Name</th>
                                        <th className="px-4 py-3 font-semibold">Email</th>
                                        <th className="px-4 py-3 font-semibold">Role</th>
                                        <th className="px-4 py-3 font-semibold">Reports To</th>
                                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stripe-border">
                                    {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm border border-white">
                                                    {String(user.name).charAt(0).toUpperCase()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-stripe-textPrimary">{user.name}</td>
                                            <td className="px-4 py-3 text-stripe-textSecondary">{user.email}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 tracking-wide uppercase">{user.role}</span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-stripe-textSecondary">
                                                {user.parent_name || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => openEdit(user)} className="p-1.5 text-slate-400 hover:text-stripe-blue hover:bg-blue-50 rounded transition-colors mr-2">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => setDeleteConfirm(user.id)} className="p-1.5 text-slate-400 hover:text-stripe-danger hover:bg-rose-50 rounded transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-12 text-center text-stripe-textSecondary">
                                                <User className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </RoleGuard>
            </main>

            {/* CREATE / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                    <div className="w-full max-w-md bg-white rounded-card shadow-2xl relative z-10 flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-stripe-border">
                            <h2 className="text-lg font-bold">{editingUser ? "Edit User" : "Add New User"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 transition"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="user-form" className="space-y-4" onSubmit={handleSubmit}>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name</label>
                                    <input required className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                {!editingUser && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email <span className="text-rose-500">*</span></label>
                                        <input type="email" required className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                )}
                                {!editingUser && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Password <span className="text-rose-500">*</span></label>
                                        <input type="password" required={!editingUser} placeholder="min 6 characters" className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Role</label>
                                        <select className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                            <option value="admin">Admin</option>
                                            <option value="pl">Project Lead</option>
                                            <option value="qr">Quality Reviewer</option>
                                            <option value="tasker">Tasker</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Reports To (Parent)</label>
                                        <select className="w-full rounded-input border border-stripe-border px-3 py-2 text-sm focus:border-stripe-blue focus:ring-1 outline-none" value={formData.parent_id} onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}>
                                            <option value="">None</option>
                                            {users.filter(u => (u.id !== editingUser?.id) && (u.role === 'admin' || u.role === 'pl' || u.role === 'qr')).map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-stripe-border bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-semibold text-sm rounded border border-stripe-border hover:bg-slate-100 transition">Cancel</button>
                            <button form="user-form" type="submit" className="px-5 py-2 font-semibold text-sm rounded bg-stripe-blue text-white shadow-sm hover:bg-stripe-blue/90 transition">
                                {editingUser ? "Save Changes" : "Create User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
                    <div className="bg-white rounded-card shadow-2xl relative z-10 max-w-sm w-full p-6 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 mb-4">
                            <AlertTriangle className="h-6 w-6 text-rose-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete User?</h3>
                        <p className="text-sm text-slate-500 mb-6">Are you sure you want to permanently remove this user? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 font-semibold text-sm rounded border border-stripe-border hover:bg-slate-50 transition">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 font-semibold text-sm rounded bg-rose-600 text-white shadow-sm hover:bg-rose-700 transition">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
