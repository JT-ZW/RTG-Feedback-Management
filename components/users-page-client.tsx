'use client'

import { useState, useTransition } from 'react'
import {
  Users, UserPlus, Pencil, ShieldCheck, ShieldOff,
  Mail, Building2, X, Check, ChevronDown, AlertCircle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  inviteUser, updateUser, setUserActive,
} from '@/app/actions/user-management'
import {
  ROLE_OPTIONS,
  type OrgUser, type RoleValue, type InviteUserInput, type UpdateUserInput,
} from '@/lib/user-management-types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  initialUsers: OrgUser[]
  properties: { id: string; name: string }[]
  error?: string
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'org_admin' || role === 'super_admin'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isAdmin
        ? 'bg-rtg-gold-soft text-rtg-brown'
        : 'bg-stone-100 text-stone-600'
    }`}>
      {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
      {ROLE_OPTIONS.find(r => r.value === role)?.label ?? role.replace(/_/g, ' ')}
    </span>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-stone-300'}`} />
  )
}

// ─── Property Multi-Select ───────────────────────────────────────────────────

function PropertySelect({
  properties,
  selected,
  onChange,
}: {
  properties: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }
  const allSelected = selected.length === properties.length
  const toggleAll = () => onChange(allSelected ? [] : properties.map(p => p.id))

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-stone-200 rounded-xl text-sm text-stone-700 bg-white hover:border-stone-300 transition-colors"
      >
        <span className="truncate">
          {selected.length === 0
            ? 'Select properties…'
            : selected.length === properties.length
              ? 'All properties'
              : `${selected.length} propert${selected.length === 1 ? 'y' : 'ies'} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={toggleAll}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50 border-b border-stone-100"
          >
            <span className={`w-4 h-4 rounded border flex items-center justify-center ${allSelected ? 'bg-rtg-brown border-rtg-brown' : 'border-stone-300'}`}>
              {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </span>
            Select all
          </button>
          <div className="max-h-48 overflow-y-auto">
            {properties.map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() => toggle(p.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(p.id) ? 'bg-rtg-brown border-rtg-brown' : 'border-stone-300'}`}>
                  {selected.includes(p.id) && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Invite / Edit Form ───────────────────────────────────────────────────────

interface UserFormProps {
  properties: { id: string; name: string }[]
  editUser?: OrgUser
  onClose: () => void
  onSuccess: (message: string) => void
}

function UserForm({ properties, editUser, onClose, onSuccess }: UserFormProps) {
  const isEdit = !!editUser
  const [firstName, setFirstName] = useState(editUser?.firstName ?? '')
  const [lastName, setLastName] = useState(editUser?.lastName ?? '')
  const [email, setEmail] = useState(editUser?.email ?? '')
  const [role, setRole] = useState<RoleValue>(
    (editUser?.primaryRole as RoleValue) ?? ROLE_OPTIONS[0].value
  )
  const [selectedProps, setSelectedProps] = useState<string[]>(
    editUser?.properties.map(p => p.id) ?? []
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      let result: { success: boolean; error?: string }
      if (isEdit) {
        const input: UpdateUserInput = { userId: editUser!.id, role, propertyIds: selectedProps }
        result = await updateUser(input)
      } else {
        const input: InviteUserInput = { email, firstName, lastName, role, propertyIds: selectedProps }
        result = await inviteUser(input)
      }

      if (result.success) {
        onSuccess(isEdit ? 'User updated successfully.' : 'Invite sent! They will receive an email to set their password.')
        onClose()
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-rtg-gold" />
            <h2 className="text-sm font-semibold text-stone-900">
              {isEdit ? 'Edit User' : 'Invite User'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Tendai"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-rtg-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Moyo"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-rtg-gold"
                />
              </div>
            </div>
          )}

          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tendai@rtg.co.zw"
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-rtg-gold"
              />
            </div>
          )}

          {isEdit && (
            <div>
              <p className="text-xs font-medium text-stone-500 mb-0.5">User</p>
              <p className="text-sm font-semibold text-stone-800">{editUser!.firstName} {editUser!.lastName}</p>
              <p className="text-xs text-stone-400">{editUser!.email}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-colors ${
                    role === opt.value
                      ? 'border-rtg-brown bg-rtg-gold-soft'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-3 h-3 rounded-full border-2 ${role === opt.value ? 'border-rtg-brown bg-rtg-brown' : 'border-stone-300'}`} />
                    <span className="text-xs font-semibold text-stone-800">{opt.label}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 leading-snug pl-4.5">
                    {opt.value === 'org_admin' ? 'Full access + user management' : 'Cross-property analytics'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Assign to Properties
            </label>
            <PropertySelect
              properties={properties}
              selected={selectedProps}
              onChange={setSelectedProps}
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Select all properties for org-wide access.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-rtg-brown text-white rounded-xl hover:bg-rtg-brown/90 disabled:opacity-50 transition-colors"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UsersPageClient({ initialUsers, properties, error: initialError }: Props) {
  const [users, setUsers] = useState<OrgUser[]>(initialUsers)
  const [showInvite, setShowInvite] = useState(false)
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleSuccess = (message: string) => {
    toast.success(message)
    // Re-fetch by refreshing — Next.js revalidatePath handles this
    window.location.reload()
  }

  const handleToggleActive = async (user: OrgUser) => {
    setTogglingId(user.id)
    const result = await setUserActive(user.id, !user.isActive)
    if (result.success) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      toast.success(user.isActive ? `${user.firstName} has been deactivated.` : `${user.firstName} has been reactivated.`)
    } else {
      toast.error(result.error ?? 'Failed to update user status.')
    }
    setTogglingId(null)
  }

  const activeCount = users.filter(u => u.isActive).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">User Management</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {users.length} user{users.length !== 1 ? 's' : ''} · {activeCount} active
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rtg-brown text-white text-sm font-medium rounded-xl hover:bg-rtg-brown/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {initialError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{initialError}</p>
        </div>
      )}

      {/* User table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-stone-400" />
            </div>
            <p className="text-sm font-medium text-stone-600">No users yet</p>
            <p className="text-xs text-stone-400 mt-1">Invite your first team member to get started.</p>
            <button
              onClick={() => setShowInvite(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-rtg-brown text-white text-sm font-medium rounded-xl hover:bg-rtg-brown/90"
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </button>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-5 py-3">Role</th>
                <th className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-5 py-3 hidden md:table-cell">Properties</th>
                <th className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {users.map(user => (
                <tr key={user.id} className={`hover:bg-stone-50 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rtg-gold-soft flex items-center justify-center text-rtg-brown text-xs font-bold shrink-0">
                        {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-stone-800">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-stone-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <RoleBadge role={user.primaryRole} />
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {user.properties.length === 0 ? (
                        <span className="text-stone-300 text-xs">—</span>
                      ) : user.properties.length > 2 ? (
                        <>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{user.properties[0].name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">+{user.properties.length - 1} more</span>
                        </>
                      ) : (
                        user.properties.map(p => (
                          <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{p.name}</span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <StatusDot active={user.isActive} />
                      <span className="text-xs text-stone-500">{user.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingUser(user)}
                        title="Edit user"
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={togglingId === user.id}
                        title={user.isActive ? 'Deactivate user' : 'Reactivate user'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.isActive
                            ? 'text-stone-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {togglingId === user.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : user.isActive
                            ? <ShieldOff className="w-3.5 h-3.5" />
                            : <ShieldCheck className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <UserForm
          properties={properties}
          onClose={() => setShowInvite(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Edit modal */}
      {editingUser && (
        <UserForm
          properties={properties}
          editUser={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
