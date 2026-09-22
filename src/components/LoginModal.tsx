import React, { useState, useEffect, useRef } from 'react';
import { AppUser, UserRole, AppTheme } from '../types';
import { ShieldCheck, UserCheck, Lock, LogIn, Key, Users, CheckCircle2, UserPlus, Info, AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: AppUser) => void;
  currentUser?: AppUser | null;
  allUsers?: AppUser[];
  onAddUser?: (newUser: AppUser) => void;
  onDeleteUser?: (userToDelete: AppUser) => void;
  onUpdateUserRole?: (updatedUser: AppUser) => void;
  theme?: AppTheme;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  currentUser,
  allUsers = [],
  onAddUser,
  onDeleteUser,
  onUpdateUserRole,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const isSepia = theme === 'sepia';
  // Default Admin and Super User accounts
  const defaultAccounts: AppUser[] = [
    { id: 'admin', username: 'admin', name: 'Devdutt Thaker', role: 'Admin', password: 'Malvee@0911', secondaryPassword: '0911' },
    { id: 'jignesh', username: 'jignesh', name: 'Jignesh Upadhyay', role: 'Super User', password: '1234' },
  ];

  // Merge cloud users with defaults
  const availableUsersMap = new Map<string, AppUser>();
  defaultAccounts.forEach(u => availableUsersMap.set((u.username || u.id).toLowerCase(), u));
  if (allUsers && Array.isArray(allUsers)) {
    allUsers.forEach(u => {
      if (u && (u.id || u.username)) {
        availableUsersMap.set((u.username || u.id).toLowerCase(), u);
      }
    });
  }
  
  // Sort users: Admin first, Super User second, User third
  const availableUsers = Array.from(availableUsersMap.values()).sort((a, b) => {
    const roleRank: Record<string, number> = {
      'Admin': 1,
      'Super User': 2,
      'User': 3,
    };
    const rankA = roleRank[a.role] || 3;
    const rankB = roleRank[b.role] || 3;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });

  const [selectedUserId, setSelectedUserId] = useState<string>('admin');
  const [selectedUserObj, setSelectedUserObj] = useState<AppUser>(() => {
    return availableUsers[0] || defaultAccounts[0];
  });

  useEffect(() => {
    if (availableUsers.length > 0) {
      const match = availableUsers.find(u => u.id === selectedUserId || u.username.toLowerCase() === selectedUserId.toLowerCase());
      if (match) {
        setSelectedUserObj(match);
      } else {
        setSelectedUserObj(availableUsers[0]);
        setSelectedUserId(availableUsers[0].id);
      }
    }
  }, [availableUsers, selectedUserId]);

  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [showNewPasswordText, setShowNewPasswordText] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [changePassSuccessMsg, setChangePassSuccessMsg] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [showAdminRevealedPass, setShowAdminRevealedPass] = useState<Record<string, boolean>>({});

  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const isAdminActive = Boolean(currentUser && currentUser.id !== 'guest_user' && currentUser.role === 'Admin');

  // Auto focus password box when modal opens or user form is closed
  useEffect(() => {
    if (isOpen && !showAddUserForm && !showChangePasswordForm) {
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
        passwordInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showAddUserForm, showChangePasswordForm, selectedUserId]);

  // Change password form state
  const [currentPasswordForChange, setCurrentPasswordForChange] = useState('');
  const [newPasswordForChange, setNewPasswordForChange] = useState('');
  const [secondaryPasswordForChange, setSecondaryPasswordForChange] = useState('');
  const [confirmPasswordForChange, setConfirmPasswordForChange] = useState('');

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('User');
  const [newPassword, setNewPassword] = useState('1234');
  const [newSecondaryPassword, setNewSecondaryPassword] = useState('');

  if (!isOpen) return null;

  const handleSelectAccount = (u: AppUser) => {
    setSelectedUserId(u.id);
    setSelectedUserObj(u);
    setPasswordInput('');
    setErrorMsg('');
    setChangePassSuccessMsg('');
    setShowChangePasswordForm(false);
    setTimeout(() => {
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    }, 30);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserObj) {
      setErrorMsg('Please select an operator account.');
      return;
    }

    // Dual Password verification for Admin or any user with secondaryPassword
    const primaryPass = selectedUserObj.password && selectedUserObj.password.trim() !== ''
      ? selectedUserObj.password.trim()
      : (selectedUserObj.role === 'Admin' ? 'Malvee@0911' : '1234');
    const secondaryPass = selectedUserObj.secondaryPassword 
      ? selectedUserObj.secondaryPassword.trim() 
      : (selectedUserObj.role === 'Admin' ? '0911' : '');
    const inputPass = passwordInput.trim();

    const isPassValid = inputPass === primaryPass || (secondaryPass && inputPass === secondaryPass);

    if (!isPassValid) {
      setErrorMsg(`ખોટો પાસવર્ડ! આ એકાઉન્ટ માટે સાચો પાસવર્ડ દાખલ કરો.`);
      return;
    }

    onLogin(selectedUserObj);
    onClose();
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setChangePassSuccessMsg('');

    if (!selectedUserObj) return;

    const primaryPass = selectedUserObj.password || (selectedUserObj.role === 'Admin' ? 'Malvee@0911' : '1234');
    const secondaryPass = selectedUserObj.secondaryPassword || (selectedUserObj.role === 'Admin' ? '0911' : '');
    const currentInput = currentPasswordForChange.trim();

    const isCurrentValid = isAdminActive || currentInput === primaryPass || (secondaryPass && currentInput === secondaryPass);

    if (!isCurrentValid) {
      setErrorMsg('Incorrect current password! Please enter your valid current password.');
      return;
    }

    if (!newPasswordForChange.trim()) {
      setErrorMsg('Please enter a new primary password.');
      return;
    }

    if (newPasswordForChange !== confirmPasswordForChange) {
      setErrorMsg('New password and confirm password do not match!');
      return;
    }

    const updatedUser: AppUser = {
      ...selectedUserObj,
      password: newPasswordForChange.trim(),
      secondaryPassword: secondaryPasswordForChange.trim() || selectedUserObj.secondaryPassword || (selectedUserObj.role === 'Admin' ? '0911' : '')
    };

    if (onAddUser) {
      onAddUser(updatedUser);
    }

    setSelectedUserObj(updatedUser);
    setChangePassSuccessMsg('Password updated successfully! Either valid password can be used for login.');
    setCurrentPasswordForChange('');
    setNewPasswordForChange('');
    setSecondaryPasswordForChange('');
    setConfirmPasswordForChange('');
    setShowChangePasswordForm(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newName.trim()) {
      alert('Please enter both username and full name.');
      return;
    }

    // New self-registered accounts are strictly created with 'User' role by default.
    // Elevated rights (Super User / Admin) must be granted by Admin.
    const safeRole: UserRole = 'User';

    const createdUsername = newUsername.trim().toLowerCase();
    const createdPassword = newPassword.trim() || '1234';

    const created: AppUser = {
      id: createdUsername,
      username: newUsername.trim(),
      name: newName.trim(),
      role: safeRole,
      password: createdPassword,
      secondaryPassword: newSecondaryPassword.trim() || ''
    };

    let res: any = null;
    if (onAddUser) {
      res = await onAddUser(created);
    }
    
    // Select newly created user in list and hide form
    setSelectedUserId(created.id);
    setSelectedUserObj(created);
    setShowAddUserForm(false);
    setNewUsername('');
    setNewName('');
    setNewPassword('1234');
    setNewSecondaryPassword('');

    if (res && res.quotaExceeded) {
      setChangePassSuccessMsg(`⚠️ એકાઉન્ટ "${created.name}" બન્યું (Local Storage). પણ Firebase લિમિટ હોવાથી આ ફક્ત આ બ્રાઉઝરમાં સેવ થયું છે. Password: "${created.password}".`);
    } else {
      setChangePassSuccessMsg(`✅ Account created for "${created.name}" (${created.role}). Password: "${created.password}". Select account above and enter password to log in.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className={`border-2 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
        isLight
          ? 'bg-white border-blue-400 text-slate-900 shadow-slate-300/40'
          : isSepia
          ? 'bg-[#fdfaf3] border-[#b87d2b]/60 text-[#3d2b1f] shadow-[#dfd0b8]/40'
          : 'bg-slate-900 border-blue-500/60 text-slate-100 shadow-blue-950/50'
      }`}>
        
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isLight
            ? 'bg-gradient-to-r from-blue-50 via-slate-50 to-blue-100 border-slate-200 text-slate-900'
            : isSepia
            ? 'bg-gradient-to-r from-[#f4ecd8] via-[#ede1cc] to-[#e6d5b8] border-[#dfd0b8] text-[#3d2b1f]'
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 border-slate-700 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${
              isLight
                ? 'bg-blue-100 border border-blue-200 text-blue-700'
                : isSepia
                ? 'bg-[#ede1cc] border border-[#dfd0b8] text-[#7c502b]'
                : 'bg-blue-600/20 border border-blue-500/40 text-blue-400'
            }`}>
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : isSepia ? 'text-[#3d2b1f]' : 'text-white'
              }`}>
                <span>System Operator Login</span>
              </h2>
              <p className={`text-xs ${
                isLight ? 'text-blue-700 font-semibold' : isSepia ? 'text-[#7c502b]' : 'text-blue-300'
              }`}>
                Select your account and enter password to login
              </p>
            </div>
          </div>
          {currentUser && (
            <button
              onClick={onClose}
              className={`text-sm font-bold px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300'
                  : isSepia
                  ? 'text-[#7c634e] hover:text-[#3d2b1f] bg-[#ede1cc] hover:bg-[#dfd0b8] border-[#dfd0b8]'
                  : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Account Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-200'
              }`}>
                <Users className={`w-4 h-4 ${isLight ? 'text-blue-600' : isSepia ? 'text-[#7c502b]' : 'text-blue-400'}`} />
                <span>1. Select Registered Account:</span>
              </label>
              {Boolean(currentUser && currentUser.id !== 'guest_user' && currentUser.role === 'Admin') && (
                <button
                  type="button"
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                    isLight
                      ? 'text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border-blue-300'
                      : isSepia
                      ? 'text-[#7c502b] hover:text-[#3d2b1f] bg-[#ede1cc] hover:bg-[#dfd0b8] border-[#dfd0b8]'
                      : 'text-blue-300 hover:text-white bg-blue-950 hover:bg-blue-900 border-blue-500/60'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add New User</span>
                </button>
              )}
            </div>

            {(() => {
              const isAdminActive = Boolean(currentUser && currentUser.id !== 'guest_user' && currentUser.role === 'Admin');
              return (
                <>
                  {isAdminActive ? (
                    <div className={`mb-2 p-2.5 rounded text-xs flex items-center gap-2 font-medium border ${
                      isLight
                        ? 'bg-blue-50 border-blue-300 text-blue-950'
                        : isSepia
                        ? 'bg-[#ede1cc] border-[#dfd0b8] text-[#3d2b1f]'
                        : 'bg-blue-950/90 border-blue-500/60 text-blue-100'
                    }`}>
                      <ShieldCheck className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-600' : isSepia ? 'text-[#7c502b]' : 'text-blue-400'}`} />
                      <span>👑 <b>એડમિન મોડ ઓન:</b> કોઈપણ યુઝર પસંદ કરો અને નીચે આપેલા <b>"એડમિન કંટ્રોલ - રાઈટ્સ બદલો"</b> મેનૂમાંથી તેને <b>Super User</b> કે <b>Admin</b> રાઈટ્સ આપો.</span>
                    </div>
                  ) : (
                    <div className={`mb-2 p-2.5 rounded text-xs flex items-center gap-2 font-medium border ${
                      isLight
                        ? 'bg-blue-50/90 border-blue-200 text-slate-800'
                        : isSepia
                        ? 'bg-[#f6ede0] border-[#dfd0b8] text-[#3d2b1f]'
                        : 'bg-slate-800/90 border-slate-700 text-slate-100'
                    }`}>
                      <Info className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-600' : isSepia ? 'text-[#7c502b]' : 'text-blue-400'}`} />
                      <span className={isLight ? 'text-slate-800' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-100'}>
                        પુસ્તકો ઉમેરવા/સુધારવા માટે અધિકૃત સંચાલક એકાઉન્ટ પસંદ કરી પાસવર્ડ દાખલ કરો.
                      </span>
                    </div>
                  )}
                  {/* List of accounts in clean List View */}
                  <div className={`flex flex-col gap-1.5 max-h-48 overflow-y-auto p-1.5 rounded-lg border ${
                    isLight
                      ? 'bg-slate-50 border-slate-200'
                      : isSepia
                      ? 'bg-[#f6ede0] border-[#dfd0b8]'
                      : 'bg-slate-950/90 border-slate-800'
                  }`}>
                    {availableUsers.map((u) => {
                      const isSelected = selectedUserObj?.id === u.id || selectedUserObj?.username === u.username;
                      const isCurrentlyAdmin = isAdminActive;
                      const canDelete = isCurrentlyAdmin && u.id !== 'admin' && u.username.toLowerCase() !== 'admin' && u.id !== currentUser?.id;

                return (
                  <div
                    key={u.id || u.username}
                    onClick={() => handleSelectAccount(u)}
                    className={`px-3 py-2 rounded-md border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? u.role === 'Admin'
                          ? isLight
                            ? 'bg-blue-50 border-2 border-blue-500 text-blue-950 shadow-sm ring-2 ring-blue-400/40'
                            : isSepia
                            ? 'bg-[#e8ecf4] border-2 border-blue-600 text-[#1e2e42] shadow-sm ring-2 ring-blue-400/30'
                            : 'bg-blue-950 border-2 border-blue-400 text-white shadow-md ring-2 ring-blue-500/50'
                          : u.role === 'Super User'
                          ? isLight
                            ? 'bg-amber-50 border-2 border-amber-500 text-amber-950 shadow-sm ring-2 ring-amber-400/40'
                            : isSepia
                            ? 'bg-[#faeed9] border-2 border-amber-600 text-[#523408] shadow-sm ring-2 ring-amber-400/30'
                            : 'bg-amber-950 border-2 border-amber-400 text-white shadow-md ring-2 ring-amber-500/50'
                          : isLight
                          ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 shadow-sm ring-2 ring-emerald-400/40'
                          : isSepia
                          ? 'bg-[#eaf2e7] border-2 border-emerald-600 text-[#183d16] shadow-sm ring-2 ring-emerald-400/30'
                          : 'bg-emerald-950 border-2 border-emerald-400 text-white shadow-md ring-2 ring-emerald-500/50'
                        : isLight
                        ? 'bg-white border-slate-200 hover:border-blue-400 text-slate-800 hover:bg-blue-50/40 shadow-2xs'
                        : isSepia
                        ? 'bg-[#fffdf8] border-[#dfd0b8] hover:border-[#b87d2b] text-[#3d2b1f] hover:bg-[#ede1cc]'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-100 hover:bg-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {u.role === 'Admin' ? (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 shrink-0 border ${
                          isLight
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : isSepia
                            ? 'bg-[#ede1cc] text-[#1e2e42] border-[#93c5fd]'
                            : 'bg-blue-900 text-blue-200 border-blue-500'
                        }`}>
                          <ShieldCheck className="w-3 h-3" />
                          ADMIN
                        </span>
                      ) : u.role === 'Super User' ? (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 shrink-0 border ${
                          isLight
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : isSepia
                            ? 'bg-[#ede1cc] text-[#78350f] border-[#fcd34d]'
                            : 'bg-amber-900 text-amber-200 border-amber-500'
                        }`}>
                          <ShieldCheck className="w-3 h-3" />
                          SUPER USER
                        </span>
                      ) : (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 shrink-0 border ${
                          isLight
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isSepia
                            ? 'bg-[#ede1cc] text-[#065f46] border-[#86efac]'
                            : 'bg-emerald-900 text-emerald-200 border-emerald-500'
                        }`}>
                          <UserCheck className="w-3 h-3" />
                          USER
                        </span>
                      )}

                      <div className="truncate flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${
                          isSelected
                            ? isLight
                              ? u.role === 'Admin' ? 'text-blue-950' : u.role === 'Super User' ? 'text-amber-950' : 'text-emerald-950'
                              : isSepia
                              ? '#1e2e42'
                              : 'text-white'
                            : isLight
                            ? 'text-slate-900'
                            : isSepia
                            ? 'text-[#3d2b1f]'
                            : 'text-white'
                        }`}>
                          {u.name}
                        </span>
                        <span className={`text-[10px] font-mono ${
                          isSelected
                            ? isLight
                              ? u.role === 'Admin' ? 'text-blue-700 font-semibold' : u.role === 'Super User' ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'
                              : isSepia
                              ? 'text-[#5c4033] font-semibold'
                              : u.role === 'Admin' ? 'text-blue-200 font-semibold' : u.role === 'Super User' ? 'text-amber-200 font-semibold' : 'text-emerald-200 font-semibold'
                            : isLight
                            ? 'text-slate-500'
                            : isSepia
                            ? 'text-[#7c634e]'
                            : 'text-slate-300'
                        }`}>
                          (@{u.username})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected && (
                        <span className="text-[10px] font-bold text-white bg-blue-600 border border-blue-400 px-2 py-0.5 rounded shadow">
                          Selected
                        </span>
                      )}

                      {canDelete && (
                        confirmDeleteUserId === (u.id || u.username) ? (
                          <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedUserObj?.id === u.id || selectedUserObj?.username === u.username) {
                                  setSelectedUserId('admin');
                                  setSelectedUserObj(defaultAccounts[0]);
                                }
                                if (onDeleteUser) onDeleteUser(u);
                                setConfirmDeleteUserId(null);
                              }}
                              className="text-[10px] bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-0.5 rounded cursor-pointer animate-pulse shrink-0"
                              title="Confirm Delete"
                            >
                              ડિલીટ કરો
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteUserId(null)}
                              className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteUserId(u.id || u.username);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/80 transition-colors ml-1 cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
    </div>

          {!showAddUserForm ? (
            <form onSubmit={handleSubmit} className={`space-y-3.5 pt-2 border-t ${
              isLight ? 'border-slate-200' : isSepia ? 'border-[#dfd0b8]' : 'border-slate-800'
            }`}>
              
              {/* Active Selected Account Details */}
              {selectedUserObj && (
                <div className={`p-3 rounded-lg border ${
                  selectedUserObj.role === 'Admin'
                    ? isLight
                      ? 'bg-blue-50 border-blue-300 text-blue-950'
                      : isSepia
                      ? 'bg-[#e8ecf4] border-[#93c5fd] text-[#1e2e42]'
                      : 'bg-blue-950/40 border-blue-500/50 text-blue-200'
                    : selectedUserObj.role === 'Super User'
                    ? isLight
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : isSepia
                      ? 'bg-[#faeed9] border-[#fcd34d] text-[#523408]'
                      : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : isSepia
                    ? 'bg-[#eaf2e7] border-[#86efac] text-[#183d16]'
                    : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-[11px] uppercase tracking-wider font-semibold ${
                        isLight ? 'text-slate-600' : isSepia ? 'text-[#7c634e]' : 'text-slate-300'
                      }`}>
                        Selected Operator:
                      </div>
                      <div className={`text-sm font-bold flex items-center gap-1.5 ${
                        isLight ? 'text-slate-900' : isSepia ? 'text-[#3d2b1f]' : 'text-white'
                      }`}>
                        <span>{selectedUserObj.name}</span>
                        <span className={`text-xs font-normal ${
                          isLight ? 'text-slate-600' : isSepia ? 'text-[#7c634e]' : 'text-slate-300'
                        }`}>(@{selectedUserObj.username})</span>
                      </div>
                    </div>
                    <div>
                      {selectedUserObj.role === 'Admin' ? (
                        <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 border border-blue-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> Admin Rights
                        </span>
                      ) : selectedUserObj.role === 'Super User' ? (
                        <span className="bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 border border-amber-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> Super User Rights
                        </span>
                      ) : (
                        <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 border border-emerald-400">
                          <UserCheck className="w-3.5 h-3.5" /> User Rights (Operator)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Admin Control: Change Rights of Selected User */}
                  {Boolean(currentUser && currentUser.id !== 'guest_user' && currentUser.role === 'Admin') && selectedUserObj.id !== 'admin' && (
                    <div className={`mt-3 pt-2.5 border-t p-2.5 rounded-md space-y-2 ${
                      isLight
                        ? 'border-slate-300 bg-white/80'
                        : isSepia
                        ? 'border-[#dfd0b8] bg-[#fdfaf3]/80'
                        : 'border-slate-700/80 bg-slate-950/60'
                    }`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                        <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          isLight ? 'text-amber-800' : isSepia ? 'text-[#78350f]' : 'text-amber-300'
                        }`}>
                          <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                          <span>👑 એડમિન કંટ્રોલ - રાઈટ્સ બદલો:</span>
                        </label>
                        <select
                          value={selectedUserObj.role}
                          onChange={(e) => {
                            const targetRole = e.target.value as UserRole;
                            const updated = { ...selectedUserObj, role: targetRole };
                            setSelectedUserObj(updated);
                            if (onUpdateUserRole) {
                              onUpdateUserRole(updated);
                            } else if (onAddUser) {
                              onAddUser(updated);
                            }
                            setChangePassSuccessMsg(`✅ "${selectedUserObj.name}" ના રાઈટ્સ સફળતાપૂર્વક બદલાઈને "${targetRole}" થયા!`);
                          }}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded outline-none cursor-pointer w-full sm:w-auto border ${
                            isLight
                              ? 'bg-white border-amber-400 text-amber-950 focus:ring-1 focus:ring-amber-500'
                              : isSepia
                              ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] focus:ring-1 focus:ring-[#b87d2b]'
                              : 'bg-slate-900 border-amber-500/80 text-amber-200 focus:ring-1 focus:ring-amber-400'
                          }`}
                        >
                          <option value="User">02. User (Search & View Only)</option>
                          <option value="Super User">01. Super User (Data Entry, Edit & Delete)</option>
                          <option value="Admin">00. Admin (Full System Access)</option>
                        </select>
                      </div>

                      {/* Admin Quick Reset Password */}
                      <div className={`flex items-center justify-end pt-2 border-t text-[11px] ${
                        isLight ? 'border-slate-200 text-slate-700' : isSepia ? 'border-[#dfd0b8] text-[#3d2b1f]' : 'border-slate-800 text-slate-300'
                      }`}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowChangePasswordForm(true);
                            setErrorMsg('');
                            setChangePassSuccessMsg('');
                          }}
                          className={`text-[11px] font-bold underline cursor-pointer flex items-center gap-1 ${
                            isLight ? 'text-amber-800 hover:text-amber-950' : isSepia ? 'text-[#78350f] hover:text-[#523408]' : 'text-amber-400 hover:text-amber-300'
                          }`}
                        >
                          <Key className="w-3 h-3" />
                          <span>✏️ આ યુઝરનો પાસવર્ડ રીસેટ કરો</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {changePassSuccessMsg && (
                <div className={`p-2.5 rounded text-xs font-semibold flex items-center gap-1.5 border ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : isSepia
                    ? 'bg-[#eaf2e7] border-[#86efac] text-[#183d16]'
                    : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{changePassSuccessMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className={`p-2.5 rounded text-xs font-semibold flex items-center gap-1.5 border ${
                  isLight
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : isSepia
                    ? 'bg-[#fbeeed] border-[#fca5a5] text-[#7f1d1d]'
                    : 'bg-rose-950/90 border-rose-500 text-rose-200'
                }`}>
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {!showChangePasswordForm ? (
                <>
                  {/* Password Input */}
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${
                      isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-300'
                    }`}>
                      2. Enter Account Password / PIN:
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordInputRef}
                        type={showPasswordText ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Enter Password..."
                        className={`w-full border px-3 py-2.5 rounded text-sm font-mono outline-none pr-10 ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            : isSepia
                            ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] placeholder-[#9c8571] focus:border-[#b87d2b] focus:ring-1 focus:ring-[#b87d2b]'
                            : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                        }`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className={`absolute right-3 top-3 cursor-pointer ${
                          isLight ? 'text-slate-500 hover:text-slate-800' : isSepia ? 'text-[#7c634e] hover:text-[#3d2b1f]' : 'text-slate-400 hover:text-white'
                        }`}
                        title={showPasswordText ? 'Hide Password' : 'Show Password'}
                      >
                        {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePasswordForm(true);
                        setErrorMsg('');
                        setChangePassSuccessMsg('');
                      }}
                      className={`text-[11px] underline font-semibold flex items-center gap-1 cursor-pointer ${
                        isLight ? 'text-blue-700 hover:text-blue-900' : isSepia ? 'text-[#7c502b] hover:text-[#3d2b1f]' : 'text-blue-400 hover:text-blue-300'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>🔑 Change Password</span>
                    </button>
                  </div>

                  {/* Action Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${
                        selectedUserObj?.role === 'Admin'
                          ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400'
                          : isSepia
                          ? 'bg-[#8d5b4c] hover:bg-[#724639] text-white border border-[#724639]'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
                      }`}
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Login & Continue ({selectedUserObj?.name})</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Change Password Form Sub-section */
                <div className={`p-3.5 rounded-lg border space-y-3 animate-in fade-in duration-200 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : isSepia
                    ? 'bg-[#f6ede0] border-[#dfd0b8] text-[#3d2b1f]'
                    : 'bg-slate-950 border-slate-700 text-white'
                }`}>
                  <div className={`flex items-center justify-between border-b pb-2 ${
                    isLight ? 'border-slate-200' : isSepia ? 'border-[#dfd0b8]' : 'border-slate-800'
                  }`}>
                    <h3 className={`text-xs font-bold uppercase flex items-center gap-1.5 ${
                      isLight ? 'text-amber-800' : isSepia ? 'text-[#78350f]' : 'text-amber-300'
                    }`}>
                      <Key className={`w-4 h-4 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                      <span>Change Password for {selectedUserObj?.name}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePasswordForm(false);
                        setErrorMsg('');
                      }}
                      className={`text-[11px] font-bold cursor-pointer ${
                        isLight ? 'text-slate-500 hover:text-slate-800' : isSepia ? 'text-[#7c634e] hover:text-[#3d2b1f]' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ✕ Cancel
                    </button>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1 ${
                      isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-200'
                    }`}>
                      1. Current Password {isAdminActive && <span className="text-emerald-600 dark:text-emerald-400 normal-case font-normal">(Admin માટે બાયપાસ - દાખલ કરવાની જરૂર નથી)</span>}
                    </label>
                    <input
                      type="password"
                      required={!isAdminActive}
                      placeholder={isAdminActive ? "Admin bypass (ખાલી રાખી શકો છો)..." : "Current password..."}
                      value={currentPasswordForChange}
                      onChange={(e) => setCurrentPasswordForChange(e.target.value)}
                      className={`w-full border px-3 py-2 rounded text-xs font-mono outline-none ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                          : isSepia
                          ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] placeholder-[#9c8571] focus:border-[#b87d2b]'
                          : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${
                        isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-200'
                      }`}>
                        2. New Primary Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="New primary password (e.g. Malvee@0911)"
                        value={newPasswordForChange}
                        onChange={(e) => setNewPasswordForChange(e.target.value)}
                        className={`w-full border px-3 py-2 rounded text-xs font-mono outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                            : isSepia
                            ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] placeholder-[#9c8571] focus:border-[#b87d2b]'
                            : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${
                        isLight ? 'text-amber-800' : isSepia ? 'text-[#78350f]' : 'text-amber-300'
                      }`}>
                        3. Secondary Password (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="Secondary password (e.g. 0911)"
                        value={secondaryPasswordForChange}
                        onChange={(e) => setSecondaryPasswordForChange(e.target.value)}
                        className={`w-full border px-3 py-2 rounded text-xs font-mono outline-none ${
                          isLight
                            ? 'bg-white border-amber-300 text-amber-950 placeholder-slate-400 focus:border-amber-500'
                            : isSepia
                            ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] placeholder-[#9c8571] focus:border-[#b87d2b]'
                            : 'bg-slate-900 border-amber-600/60 text-amber-200 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1 ${
                      isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-200'
                    }`}>
                      4. Confirm Primary Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Confirm primary password..."
                      value={confirmPasswordForChange}
                      onChange={(e) => setConfirmPasswordForChange(e.target.value)}
                      className={`w-full border px-3 py-2 rounded text-xs font-mono outline-none ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                          : isSepia
                          ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] placeholder-[#9c8571] focus:border-[#b87d2b]'
                          : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleChangePasswordSubmit}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded text-xs uppercase tracking-wider cursor-pointer shadow flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Update & Save Password</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* Add Custom User Form */
            <form onSubmit={handleCreateUser} className={`space-y-3.5 pt-2 p-4 rounded-lg border shadow-inner ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : isSepia
                ? 'bg-[#f6ede0] border-[#dfd0b8] text-[#3d2b1f]'
                : 'bg-slate-950 border-slate-700 text-white'
            }`}>
              <div className={`flex items-center justify-between border-b pb-2 ${
                isLight ? 'border-slate-200' : isSepia ? 'border-[#dfd0b8]' : 'border-slate-800'
              }`}>
                <h3 className={`text-xs font-bold uppercase flex items-center gap-1.5 ${
                  isLight ? 'text-blue-800' : isSepia ? 'text-[#7c502b]' : 'text-blue-300'
                }`}>
                  <UserPlus className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  <span>Add New Operator Account</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddUserForm(false)}
                  className={`text-[11px] font-bold cursor-pointer transition-colors ${
                    isLight ? 'text-slate-500 hover:text-slate-900' : isSepia ? 'text-[#7c634e] hover:text-[#3d2b1f]' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  ✕ Close
                </button>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${
                  isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-200'
                }`}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operator Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full border px-3 py-2 rounded text-xs outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                      : isSepia
                      ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] placeholder-[#9c8571] focus:border-[#b87d2b]'
                      : 'bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${
                  isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-200'
                }`}>
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="user123"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className={`w-full border px-3 py-2 rounded text-xs font-mono outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                      : isSepia
                      ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] placeholder-[#9c8571] focus:border-[#b87d2b]'
                      : 'bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-xs font-bold uppercase ${
                    isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-200'
                  }`}>
                    Set Account Password (Default: 1234)
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showNewPasswordText ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter password..."
                    className={`w-full border px-3 py-2 rounded text-xs font-mono outline-none pr-9 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                        : isSepia
                        ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] placeholder-[#9c8571] focus:border-[#b87d2b]'
                        : 'bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordText(!showNewPasswordText)}
                    className={`absolute right-2.5 top-2.5 cursor-pointer ${
                      isLight ? 'text-slate-500 hover:text-slate-900' : isSepia ? 'text-[#7c634e] hover:text-[#3d2b1f]' : 'text-slate-300 hover:text-white'
                    }`}
                    title={showNewPasswordText ? 'Hide Password' : 'Show Password'}
                  >
                    {showNewPasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className={`text-xs mt-2 leading-relaxed ${
                  isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-200'
                }`}>
                  આ એકાઉન્ટ માટે પાસવર્ડ સેટ કરો (બાય ડીફોલ્ટ: <span className={`font-mono font-bold px-1.5 py-0.5 rounded border ${
                    isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : isSepia ? 'bg-[#faeed9] text-[#78350f] border-[#fcd34d]' : 'bg-slate-900 text-amber-400 border-slate-700'
                  }`}>1234</span>). 
                  <span className={`block mt-1 font-medium ${
                    isLight ? 'text-blue-800' : isSepia ? 'text-[#7c502b]' : 'text-blue-200'
                  }`}>
                    ℹ️ નવું એકાઉન્ટ બાય ડીફોલ્ટ <b className={isLight ? 'text-emerald-700 font-bold' : isSepia ? 'text-[#2e7d32] font-bold' : 'text-emerald-300 font-bold'}>User</b> તરીકે બનશે. Super User અથવા Admin રાઈટ્સ માટે એડમિનનો સંપર્ક કરો.
                  </span>
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-[0.99]"
              >
                Create & Save New Operator Account
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};



