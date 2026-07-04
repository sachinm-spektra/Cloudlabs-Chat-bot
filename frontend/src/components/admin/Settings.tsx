import { useState } from 'react'
import { Loader2, Check, KeyRound, User as UserIcon, Bell } from 'lucide-react'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const PREFS_KEY = 'cloudlabs-notification-prefs'

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return JSON.parse(raw) as { email: boolean; desktop: boolean }
  } catch {
    /* ignore */
  }
  return { email: true, desktop: false }
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()

  const [name, setName] = useState(user?.name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [prefs, setPrefs] = useState(loadPrefs)

  const savePrefs = (next: typeof prefs) => {
    setPrefs(next)
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  }

  const saveProfile = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === user?.name) return
    setSavingProfile(true)
    setProfileError('')
    try {
      const { data } = await authApi.updateMe(trimmed)
      updateUser(data)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch {
      setProfileError('Could not update your name. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async () => {
    setPasswordError('')
    if (!currentPassword || !newPassword) return
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    setSavingPassword(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 2000)
    } catch (err: any) {
      setPasswordError(err?.response?.data?.detail || 'Could not update your password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Settings</h2>

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Profile</h3>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">{user ? initials(user.name) : 'U'}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wide text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
              {user?.role}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full text-sm border border-gray-100 bg-gray-50 text-gray-400 rounded-lg px-3 py-2 cursor-not-allowed"
            />
          </div>
          {profileError && <p className="text-xs text-red-500">{profileError}</p>}
          <button
            onClick={saveProfile}
            disabled={savingProfile || !name.trim() || name.trim() === user?.name}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {savingProfile ? <Loader2 size={12} className="animate-spin" /> : profileSaved ? <Check size={12} /> : null}
            {savingProfile ? 'Saving…' : profileSaved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Security</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
          <button
            onClick={savePassword}
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {savingPassword ? <Loader2 size={12} className="animate-spin" /> : passwordSaved ? <Check size={12} /> : null}
            {savingPassword ? 'Updating…' : passwordSaved ? 'Updated!' : 'Update password'}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-800">Email notifications</p>
              <p className="text-xs text-gray-500">Get notified by email when a ticket needs attention.</p>
            </div>
            <button
              onClick={() => savePrefs({ ...prefs, email: !prefs.email })}
              className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${prefs.email ? 'bg-primary-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs.email ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-800">Desktop notifications</p>
              <p className="text-xs text-gray-500">Show a browser notification for new open tickets.</p>
            </div>
            <button
              onClick={() => savePrefs({ ...prefs, desktop: !prefs.desktop })}
              className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${prefs.desktop ? 'bg-primary-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs.desktop ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </label>
        </div>
      </div>
    </div>
  )
}
