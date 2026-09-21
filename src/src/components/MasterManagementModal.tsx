import React, { useState, useRef } from 'react';
import { MasterData, AppUser, UserRole } from '../types';
import { saveMasterDataToFirestore } from '../firebase';
import * as XLSX from 'xlsx';
import { 
  X, Plus, Trash2, SlidersHorizontal, ArrowUp, ArrowDown, Edit2, Check, 
  Info, FileSpreadsheet, Download, Upload, ShieldCheck, Lock, Users, 
  Key, Eye, EyeOff, UserPlus, UserCheck, ShieldAlert, Search
} from 'lucide-react';

interface MasterManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  masters: MasterData;
  setMasters: React.Dispatch<React.SetStateAction<MasterData>>;
  currentUser?: AppUser | null;
  allUsers?: AppUser[];
  onAddUser?: (newUser: AppUser) => Promise<{ success: boolean; quotaExceeded?: boolean; error?: string } | void> | void;
  onDeleteUser?: (userToDelete: AppUser) => void;
  onUpdateUserRole?: (updatedUser: AppUser) => void;
  showToast?: (message: string) => void;
}

export const MasterManagementModal: React.FC<MasterManagementModalProps> = ({
  isOpen,
  onClose,
  masters,
  setMasters,
  currentUser,
  allUsers = [],
  onAddUser,
  onDeleteUser,
  onUpdateUserRole,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<keyof MasterData | 'users'>('categories');
  const [newItemText, setNewItemText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputAllRef = useRef<HTMLInputElement | null>(null);

  // User Management State
  const [userSearchText, setUserSearchText] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newSecondaryPasswordInput, setNewSecondaryPasswordInput] = useState('');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Delete Confirmation States for Master items (Iframe safe - no window.confirm)
  const [confirmDeleteItemIndex, setConfirmDeleteItemIndex] = useState<number | null>(null);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [confirmDeleteAllInTab, setConfirmDeleteAllInTab] = useState(false);

  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('User');
  const [newUserPassword, setNewUserPassword] = useState('1234');
  const [newUserSecondaryPassword, setNewUserSecondaryPassword] = useState('');

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'Admin';

  // Merge default accounts with allUsers
  const defaultAccounts: AppUser[] = [
    { id: 'admin', username: 'admin', name: 'Devdutt Thaker', role: 'Admin', password: 'Malvee@0911', secondaryPassword: '0911' },
  ];
  const userMap = new Map<string, AppUser>();
  defaultAccounts.forEach(u => userMap.set((u.username || u.id).toLowerCase(), u));
  if (allUsers && Array.isArray(allUsers)) {
    allUsers.forEach(u => {
      if (u && (u.id || u.username)) {
        userMap.set((u.username || u.id).toLowerCase(), u);
      }
    });
  }
  const combinedUsers = Array.from(userMap.values()).sort((a, b) => {
    const roleRank: Record<string, number> = { 'Admin': 1, 'Super User': 2, 'User': 3 };
    const rankA = roleRank[a.role] || 3;
    const rankB = roleRank[b.role] || 3;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });

  const filteredUsers = combinedUsers.filter(u => {
    if (!userSearchText.trim()) return true;
    const q = userSearchText.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleStartEditPassword = (u: AppUser) => {
    setEditingPasswordUserId(u.id);
    const pass = u.password || (u.role === 'Admin' ? 'Malvee@0911' : '1234');
    const secPass = u.secondaryPassword || (u.role === 'Admin' ? '0911' : '');
    setNewPasswordInput(pass);
    setNewSecondaryPasswordInput(secPass);
  };

  const handleSavePassword = (u: AppUser) => {
    if (!newPasswordInput.trim()) {
      if (showToast) showToast('⚠️ પાસવર્ડ ખાલી રાખી શકાતો નથી.');
      return;
    }
    const updated: AppUser = {
      ...u,
      password: newPasswordInput.trim(),
      secondaryPassword: newSecondaryPasswordInput.trim() || undefined
    };
    if (onAddUser) {
      onAddUser(updated);
    } else if (onUpdateUserRole) {
      onUpdateUserRole(updated);
    }
    setEditingPasswordUserId(null);
    if (showToast) showToast(`🔑 ${u.name} નો નવો પાસવર્ડ સેવ થઈ ગયો!`);
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newUserName.trim();
    const uname = newUserUsername.trim().toLowerCase().replace(/\s+/g, '');
    const pass = newUserPassword.trim() || '1234';
    const secPass = newUserSecondaryPassword.trim();

    if (!name || !uname) {
      if (showToast) showToast('⚠️ નામ અને યુઝરનેમ દાખલ કરવું જરૂરી છે.');
      return;
    }

    const newUserObj: AppUser = {
      id: uname,
      username: uname,
      name: name,
      role: newUserRole,
      password: pass,
      secondaryPassword: secPass || undefined
    };

    if (onAddUser) {
      onAddUser(newUserObj);
    }
    setShowAddUserForm(false);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('1234');
    setNewUserSecondaryPassword('');
    if (showToast) showToast(`✨ નવો યુઝર "${name}" (${newUserRole}) ઉમેરાઈ ગયો.`);
  };

  const handleTabChange = (tab: keyof MasterData | 'users') => {
    setActiveTab(tab);
    setSelectedIndices([]);
    setEditingIndex(null);
    setConfirmDeleteItemIndex(null);
    setConfirmDeleteSelected(false);
    setConfirmDeleteAllInTab(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'users') return;
    const val = newItemText.trim();
    if (!val) return;

    setMasters((prev) => {
      const currentList = prev[activeTab] || [];
      if (currentList.includes(val)) {
        if (showToast) showToast(`ℹ️ "${val}" પહેલેથી જ અસ્તિત્વમાં છે.`);
        return prev;
      }
      const updatedList = [...currentList, val];
      const updated = { ...prev, [activeTab]: updatedList };
      localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updated));
      localStorage.setItem('my_book_collection_masters', JSON.stringify(updated));
      saveMasterDataToFirestore(updated).catch((err) => console.error('Firestore save masters error:', err));
      return updated;
    });
    setNewItemText('');
    if (showToast) showToast(`✨ "${val}" ઉમેરાઈ ગયું.`);
  };

  const handleExecuteRemoveItem = (indexToRemove: number) => {
    if (activeTab === 'users') return;
    const currentList = masters[activeTab] || [];
    const itemToRemove = currentList[indexToRemove];
    if (!itemToRemove) return;

    const updatedList = currentList.filter((_, idx) => idx !== indexToRemove);
    const updated = { ...masters, [activeTab]: updatedList };

    setMasters(updated);
    localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updated));
    localStorage.setItem('my_book_collection_masters', JSON.stringify(updated));
    saveMasterDataToFirestore(updated).catch((err) => console.error('Firestore save masters error:', err));

    setSelectedIndices((prev) =>
      prev.filter((i) => i !== indexToRemove).map((i) => (i > indexToRemove ? i - 1 : i))
    );
    setConfirmDeleteItemIndex(null);
    if (showToast) showToast(`🗑️ "${itemToRemove}" સફળતાપૂર્વક ડીલીટ થઈ ગયું.`);
  };

  const handleMoveUp = (index: number) => {
    if (activeTab === 'users' || index === 0) return;
    setMasters((prev) => {
      const currentList = [...(prev[activeTab] || [])];
      const temp = currentList[index - 1];
      currentList[index - 1] = currentList[index];
      currentList[index] = temp;
      const updated = { ...prev, [activeTab]: currentList };
      localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updated));
      localStorage.setItem('my_book_collection_masters', JSON.stringify(updated));
      saveMasterDataToFirestore(updated).catch((err) => console.error('Firestore save masters error:', err));
      return updated;
    });
  };

  const handleMoveDown = (index: number) => {
    if (activeTab === 'users') return;
    const currentList = masters[activeTab] || [];
    if (index >= currentList.length - 1) return;
    setMasters((prev) => {
      const list = [...(prev[activeTab] || [])];
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
      const updated = { ...prev, [activeTab]: list };
      localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updated));
      localStorage.setItem('my_book_collection_masters', JSON.stringify(updated));
      saveMasterDataToFirestore(updated).catch((err) => console.error('Firestore save masters error:', err));
      return updated;
    });
  };

  const handleStartEdit = (index: number, text: string) => {
    setEditingIndex(index);
    setEditingText(text);
  };

  const handleSaveEdit = (index: number) => {
    if (activeTab === 'users') return;
    const val = editingText.trim();
    if (!val) {
      setEditingIndex(null);
      return;
    }
    setMasters((prev) => {
      const currentList = [...(prev[activeTab] || [])];
      currentList[index] = val;
      const updated = { ...prev, [activeTab]: currentList };
      localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updated));
      localStorage.setItem('my_book_collection_masters', JSON.stringify(updated));
      saveMasterDataToFirestore(updated).catch((err) => console.error('Firestore save masters error:', err));
      return updated;
    });
    setEditingIndex(null);
    setEditingText('');
    if (showToast) showToast('✏️ નામ સુધારાઈ ગયું.');
  };

  const tabLabels: Record<keyof MasterData, string> = {
    categories: 'Categories (શ્રેણીઓ / વિભાગ)',
    authors: 'Authors (લેખકો)',
    languages: 'Languages (ભાષાઓ)',
    publishers: 'Publishers (પ્રકાશકો)',
    bookTypes: 'Book Types (પ્રકાર)',
    translators: 'Translators (અનુવાદકો)',
  };

  const handleExecuteDeleteAllInTab = () => {
    if (activeTab === 'users') return;
    const currentList = masters[activeTab] || [];
    const count = currentList.length;
    if (count === 0) {
      if (showToast) showToast(`ℹ️ "${tabLabels[activeTab]}" માં કોઈ નામ જ નથી.`);
      setConfirmDeleteAllInTab(false);
      return;
    }

    const categoryTitle = tabLabels[activeTab] || activeTab;

    setMasters((prev) => {
      const updated = { ...prev, [activeTab]: [] };
      localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updated));
      localStorage.setItem('my_book_collection_masters', JSON.stringify(updated));
      saveMasterDataToFirestore(updated).catch((err) => console.error('Firestore save masters error:', err));
      return updated;
    });
    setSelectedIndices([]);
    setConfirmDeleteAllInTab(false);
    if (showToast) showToast(`🗑️ "${categoryTitle}" ના તમામ ${count} નામ સફળતાપૂર્વક ડીલીટ થઈ ગયા.`);
  };

  const handleExecuteDeleteSelected = () => {
    if (activeTab === 'users') return;
    if (selectedIndices.length === 0) {
      if (showToast) showToast('ℹ️ મહેરબાની કરીને ડીલીટ કરવા માટે નામ પસંદ કરો.');
      setConfirmDeleteSelected(false);
      return;
    }

    const countToDelete = selectedIndices.length;
    const selectedSet = new Set(selectedIndices);
    setMasters((prev) => {
      const currentList = prev[activeTab] || [];
      const updatedList = currentList.filter((_, idx) => !selectedSet.has(idx));
      const updated = { ...prev, [activeTab]: updatedList };
      localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updated));
      localStorage.setItem('my_book_collection_masters', JSON.stringify(updated));
      saveMasterDataToFirestore(updated).catch((err) => console.error('Firestore save masters error:', err));
      return updated;
    });
    setSelectedIndices([]);
    setConfirmDeleteSelected(false);
    if (showToast) showToast(`🗑️ પસંદ કરેલા ${countToDelete} નામ સફળતાપૂર્વક ડીલીટ થઈ ગયા.`);
  };

  const currentList = activeTab !== 'users' ? (masters[activeTab] || []) : [];
  const isAllSelected = currentList.length > 0 && selectedIndices.length === currentList.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(currentList.map((_, idx) => idx));
    }
  };

  const handleToggleSelectItem = (idx: number) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // --- Excel Import & Export Functions ---
  const handleExportCurrentTabExcel = () => {
    if (!isAdmin) {
      if (showToast) showToast('માત્ર Admin ને માસ્ટર Export કરવાની મંજૂરી છે.');
      return;
    }
    if (activeTab === 'users') return;
    const currentItems = masters[activeTab] || [];
    const tabName = tabLabels[activeTab] || activeTab;
    const sheetData = currentItems.map((item, idx) => ({
      'ક્રમ (Sr No)': idx + 1,
      'નામ (Name)': item
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab.toUpperCase().slice(0, 31));
    XLSX.writeFile(wb, `Master_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    if (showToast) showToast(`"${tabName}" ની યાદી એક્સેલ ફાઇલમાં Export થઈ ગઈ!`);
  };

  const handleExportAllMastersExcel = () => {
    if (!isAdmin) {
      if (showToast) showToast('માત્ર Admin ને માસ્ટર Export કરવાની મંજૂરી છે.');
      return;
    }
    const wb = XLSX.utils.book_new();
    (Object.keys(masters) as Array<keyof MasterData>).forEach((key) => {
      const list = masters[key] || [];
      const sheetData = list.map((item, idx) => ({
        'ક્રમ (Sr No)': idx + 1,
        'નામ (Name)': item
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, key.toUpperCase().slice(0, 31));
    });
    XLSX.writeFile(wb, `All_Masters_${new Date().toISOString().slice(0, 10)}.xlsx`);
    if (showToast) showToast('તમામ માસ્ટર ડેટા એક્સેલ ફાઇલમાં Export થઈ ગયો!');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      if (showToast) showToast('માત્ર Admin ને એક્સેલથી ડેટા Import કરવાની મંજૂરી છે.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        let totalAdded = 0;
        let updatedMasters = { ...masters };

        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { header: 1 });

          const extractedNames: string[] = [];
          rawData.forEach((row: any) => {
            if (Array.isArray(row)) {
              row.forEach((cell) => {
                if (cell !== null && cell !== undefined) {
                  const val = String(cell).trim();
                  if (val && !['sr no', 'sr', 'no', 'ક્રમ', 'name', 'નામ', 'index'].includes(val.toLowerCase()) && !/^\d+$/.test(val)) {
                    extractedNames.push(val);
                  }
                }
              });
            } else if (typeof row === 'object') {
              Object.values(row).forEach((val) => {
                if (val !== null && val !== undefined) {
                  const str = String(val).trim();
                  if (str && !['sr no', 'sr', 'no', 'ક્રમ', 'name', 'નામ', 'index'].includes(str.toLowerCase()) && !/^\d+$/.test(str)) {
                    extractedNames.push(str);
                  }
                }
              });
            }
          });

          if (extractedNames.length > 0) {
            const currentList = updatedMasters[activeTab] || [];
            const newUnique = extractedNames.filter((n) => !currentList.includes(n));
            if (newUnique.length > 0) {
              totalAdded += newUnique.length;
              const mergedList = Array.from(new Set([...currentList, ...newUnique]));
              if (activeTab === 'authors' || activeTab === 'translators') {
                updatedMasters.authors = mergedList;
                updatedMasters.translators = mergedList;
              } else {
                updatedMasters[activeTab] = mergedList;
              }
            }
          }
        });

        if (totalAdded > 0) {
          setMasters(updatedMasters);
          localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updatedMasters));
          saveMasterDataToFirestore(updatedMasters).catch((err) => console.error('Firestore save masters error:', err));
          if (showToast) showToast(`✅ ${totalAdded} નવા નામ "${tabLabels[activeTab]}" માં સફળતાપૂર્વક Import થયા!`);
        } else {
          if (showToast) showToast('ℹ️ કોઈ નવા નામ મળ્યા નથી અથવા બધા નામ પહેલેથી જ હાજર છે.');
        }
      } catch (err) {
        console.error('Excel Import Error:', err);
        if (showToast) showToast('⚠️ એક્સેલ ફાઇલ ડિકોડ કરવામાં ભૂલ આવી. કૃપા કરીને સાચી એક્સેલ ફાઇલ પસીદ કરો.');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportAllMastersExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      if (showToast) showToast('માત્ર Admin ને એક્સેલથી ડેટા Import કરવાની મંજૂરી છે.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        let totalAdded = 0;
        let updatedMasters = { ...masters };
        const allKeys: (keyof MasterData)[] = ['categories', 'authors', 'languages', 'publishers', 'bookTypes', 'translators'];

        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { header: 1 });

          const extractedNames: string[] = [];
          rawData.forEach((row: any) => {
            if (Array.isArray(row)) {
              row.forEach((cell) => {
                if (cell !== null && cell !== undefined) {
                  const val = String(cell).trim();
                  if (val && !['sr no', 'sr', 'no', 'ક્રમ', 'name', 'નામ', 'index'].includes(val.toLowerCase()) && !/^\d+$/.test(val)) {
                    extractedNames.push(val);
                  }
                }
              });
            } else if (typeof row === 'object') {
              Object.values(row).forEach((val) => {
                if (val !== null && val !== undefined) {
                  const str = String(val).trim();
                  if (str && !['sr no', 'sr', 'no', 'ક્રમ', 'name', 'નામ', 'index'].includes(str.toLowerCase()) && !/^\d+$/.test(str)) {
                    extractedNames.push(str);
                  }
                }
              });
            }
          });

          if (extractedNames.length > 0) {
            const lowerSheet = sheetName.toLowerCase();
            let targetCategories: (keyof MasterData)[] = [];

            if (lowerSheet.includes('cat') || lowerSheet.includes('શ્રેણી') || lowerSheet.includes('વિભાગ')) {
              targetCategories.push('categories');
            } else if (lowerSheet.includes('aut') || lowerSheet.includes('લેખક')) {
              targetCategories.push('authors', 'translators');
            } else if (lowerSheet.includes('lan') || lowerSheet.includes('ભાષા')) {
              targetCategories.push('languages');
            } else if (lowerSheet.includes('pub') || lowerSheet.includes('પ્રકાશક')) {
              targetCategories.push('publishers');
            } else if (lowerSheet.includes('book') || lowerSheet.includes('boo') || lowerSheet.includes('પ્રકાર')) {
              targetCategories.push('bookTypes');
            } else if (lowerSheet.includes('tra') || lowerSheet.includes('અનુવાદક')) {
              targetCategories.push('translators', 'authors');
            } else {
              // If sheet name is generic or workbook has 1 sheet, populate into all master keys
              targetCategories = [...allKeys];
            }

            targetCategories.forEach((cat) => {
              const currentList = updatedMasters[cat] || [];
              const newUnique = extractedNames.filter((n) => !currentList.includes(n));
              if (newUnique.length > 0) {
                totalAdded += newUnique.length;
                const mergedList = Array.from(new Set([...currentList, ...newUnique]));
                updatedMasters[cat] = mergedList;
                if (cat === 'authors' || cat === 'translators') {
                  updatedMasters.authors = mergedList;
                  updatedMasters.translators = mergedList;
                }
              }
            });
          }
        });

        if (totalAdded > 0) {
          setMasters(updatedMasters);
          localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updatedMasters));
          saveMasterDataToFirestore(updatedMasters).catch((err) => console.error('Firestore save masters error:', err));
          if (showToast) showToast(`✅ ${totalAdded} નવા નામ તમામ માસ્ટર વિભાગોમાં સફળતાપૂર્વક Import થયા!`);
        } else {
          if (showToast) showToast('ℹ️ કોઈ નવા નામ મળ્યા નથી અથવા બધા નામ પહેલેથી જ હાજર છે.');
        }
      } catch (err) {
        console.error('Excel All Import Error:', err);
        if (showToast) showToast('⚠️ એક્સેલ ફાઇલ ડિકોડ કરવામાં ભૂલ આવી. કૃપા કરીને સાચી એક્સેલ ફાઇલ પસંદ કરો.');
      }
      if (fileInputAllRef.current) {
        fileInputAllRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-indigo-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-300" />
            <h3 className="text-lg font-bold">MASTER MANAGEMENT (માસ્ટર મેનેજમેન્ટ)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-indigo-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          {(Object.keys(tabLabels) as Array<keyof MasterData>).map((key) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === key
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tabLabels[key]} ({masters[key]?.length || 0})
            </button>
          ))}

          {/* Admin-only Users & Passwords Tab */}
          {isAdmin && (
            <button
              onClick={() => handleTabChange('users')}
              className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer font-bold ${
                activeTab === 'users'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-900 bg-amber-100/70 hover:bg-amber-200/80 border border-amber-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users & Passwords (યુઝર્સ અને પાસવર્ડ)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'users' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {combinedUsers.length}
              </span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {activeTab === 'users' ? (
            /* ================= ADMIN USERS & PASSWORDS VIEW ================= */
            <div className="space-y-4">
              {/* Top Banner */}
              <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3.5 rounded-xl text-xs flex items-start gap-2.5 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-sm text-amber-900 mb-0.5">
                    🔑 એડમિન કંટ્રોલ: તમામ યુઝર્સ અને પાસવર્ડ મેનેજમેન્ટ
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    અહીંથી તમે તમામ વપરાશકર્તાઓના <strong>પાસવર્ડ જોઈ શકો છો (Eye 👁️ આઇકન પર ક્લિક કરીને)</strong>, <strong>સીધો નવો પાસવર્ડ સેટ કરી શકો છો (બદલો બટન)</strong>, યુઝરનો રોલ (Admin/Super User/User) બદલી શકો છો, અથવા નવો યુઝર ઉમેરી શકો છો.
                  </p>
                </div>
              </div>

              {/* Action Bar: Search & Add User */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchText}
                    onChange={(e) => setUserSearchText(e.target.value)}
                    placeholder="નામ, યુઝરનેમ અથવા રોલથી શોધો..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 focus:border-amber-600 rounded-xl text-xs text-slate-900 outline-none"
                  />
                  {userSearchText && (
                    <button
                      onClick={() => setUserSearchText('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{showAddUserForm ? 'ફોર્મ બંધ કરો' : '+ નવો યુઝર ઉમેરો'}</span>
                </button>
              </div>

              {/* Add User Form Drawer */}
              {showAddUserForm && (
                <form
                  onSubmit={handleCreateNewUser}
                  className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-amber-700" />
                    <span>નવું યુઝર એકાઉન્ટ ઉમેરો (Add New User Account):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        પૂરું નામ (Full Name) *
                      </label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="દા.ત. રમેશભાઈ પટેલ"
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        યુઝરનેમ (Username / ID) *
                      </label>
                      <input
                        type="text"
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        placeholder="દા.ત. ramesh (સ્પેસ વગર)"
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        રોલ (Role / હોદ્દો) *
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-600"
                      >
                        <option value="User">User (સામાન્ય યુઝર - બુક એન્ટ્રી/સુધારો)</option>
                        <option value="Super User">Super User (સુપર યુઝર - ખાસ એક્સેસ)</option>
                        <option value="Admin">Admin (એડમિન - સંપૂર્ણ નિયંત્રણ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        મુખ્ય પાસવર્ડ (Password) *
                      </label>
                      <input
                        type="text"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="દા.ત. 1234 અથવા મજબૂત પાસવર્ડ"
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        સેકન્ડરી પાસવર્ડ / PIN (ઓપ્શનલ)
                      </label>
                      <input
                        type="text"
                        value={newUserSecondaryPassword}
                        onChange={(e) => setNewUserSecondaryPassword(e.target.value)}
                        placeholder="ઓપ્શનલ 4-અંક PIN દા.ત. 0911"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-600 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      રદ કરો
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>યુઝર સેવ કરો (Save User)</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Users List Table */}
              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    કોઈ યુઝર મળ્યા નથી.
                  </div>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const isRevealed = !!revealedPasswords[u.id];
                    const isEditingPass = editingPasswordUserId === u.id;
                    const displayPassword = u.password || (u.role === 'Admin' ? 'Malvee@0911' : '1234');
                    const displaySecPassword = u.secondaryPassword || (u.role === 'Admin' ? '0911' : '');
                    const isDevdutt = (u.username || u.id).toLowerCase() === 'admin' || (u.name || '').toLowerCase().includes('devdutt');

                    return (
                      <div
                        key={u.id || idx}
                        className="p-3 hover:bg-slate-50/80 transition-all space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {/* User Identity */}
                          <div className="flex items-center gap-2.5 min-w-[200px]">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isDevdutt && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full border border-amber-300">
                                    Primary Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                @{u.username || u.id}
                              </div>
                            </div>
                          </div>

                          {/* Role Badge / Dropdown */}
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              disabled={isDevdutt}
                              onChange={(e) => {
                                const newRole = e.target.value as UserRole;
                                if (onUpdateUserRole) {
                                  onUpdateUserRole({ ...u, role: newRole });
                                }
                              }}
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                                u.role === 'Admin'
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : u.role === 'Super User'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              <option value="Admin">Admin</option>
                              <option value="Super User">Super User</option>
                              <option value="User">User</option>
                            </select>

                            {/* Delete User Button (not for primary admin) */}
                            {!isDevdutt && (
                              confirmDeleteUserId === u.id ? (
                                <div className="flex items-center gap-1 animate-in fade-in">
                                  <button
                                    onClick={() => {
                                      if (onDeleteUser) onDeleteUser(u);
                                      setConfirmDeleteUserId(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 cursor-pointer"
                                  >
                                    હા, ડીલીટ
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteUserId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] rounded hover:bg-slate-300 cursor-pointer"
                                  >
                                    ના
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteUserId(u.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                  title="આ યુઝર ખાતું ડીલીટ કરો"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Password Display & Edit Row */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          {isEditingPass ? (
                            /* Inline Edit Mode */
                            <div className="w-full space-y-2 pt-1">
                              <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                                <Key className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{u.name} માટે નવો પાસવર્ડ સેટ કરો:</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                    મુખ્ય પાસવર્ડ (Password) *
                                  </label>
                                  <input
                                    type="text"
                                    value={newPasswordInput}
                                    onChange={(e) => setNewPasswordInput(e.target.value)}
                                    className="w-full bg-white border border-indigo-400 rounded px-2 py-1 text-xs text-slate-900 font-mono outline-none"
                                    placeholder="નવો પાસવર્ડ"
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                    સેકન્ડરી PIN (ઓપ્શનલ)
                                  </label>
                                  <input
                                    type="text"
                                    value={newSecondaryPasswordInput}
                                    onChange={(e) => setNewSecondaryPasswordInput(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono outline-none"
                                    placeholder="દા.ત. 0911"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingPasswordUserId(null)}
                                  className="px-2.5 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  રદ કરો
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSavePassword(u)}
                                  className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>નવો પાસવર્ડ સેવ કરો</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Display Mode with Eye & Edit */
                            <>
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <Key className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-[11px] font-semibold text-slate-600">પાસવર્ડ:</span>
                                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900 text-xs">
                                    {isRevealed ? displayPassword : '••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordReveal(u.id)}
                                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition-all cursor-pointer"
                                    title={isRevealed ? 'પાસવર્ડ છુપાવો (Hide)' : 'પાસવર્ડ જુઓ (Show Password)'}
                                  >
                                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>

                                {displaySecPassword && (
                                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span className="text-[11px] font-semibold text-slate-600">PIN:</span>
                                    <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 text-xs">
                                      {isRevealed ? displaySecPassword : '••••'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleStartEditPassword(u)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="આ યુઝરનો પાસવર્ડ બદલો"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>પાસવર્ડ બદલો</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* ================= REGULAR MASTER DATA VIEW ================= */
            <>
              {/* Gujarati Instruction Banner */}
              <div className="mb-3 bg-indigo-50 border border-indigo-200 text-indigo-900 p-3 rounded-xl text-xs leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong>ક્રમ કેવી રીતે ગોઠવવો:</strong> નામને ઉપર કે નીચે કરવા માટે <strong>Up (↑)</strong> અને <strong>Down (↓)</strong> બટન વાપરો. તમે જે ક્રમ ગોઠવશો તે જ ક્રમમાં ડ્રોપડાઉનમાં દેખાશે. આ ડેટા પીસી રીસ્ટાર્ટ કર્યા પછી પણ બદલાશે નહીં.
                </div>
              </div>

              {/* Excel Import & Export Control Bar (Admin Only) */}
              <div className="mb-4 bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">
                    Excel Master Import & Export (એક્સેલ ટૂલ્સ):
                  </span>
                  {isAdmin ? (
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3 h-3" /> ADMIN CONTROL
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <Lock className="w-3 h-3" /> Admin permission required
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportExcel}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileInputAllRef}
                    onChange={handleImportAllMastersExcel}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAdmin) {
                        if (showToast) showToast('માત્ર Admin ને એક્સેલ Import કરવાની મંજૂરી છે.');
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    disabled={!isAdmin}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                      isAdmin
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title="આ વિભાગમાં એક્સેલ (.xlsx) થી નામ Import કરો"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>આ વિભાગ Import કરો</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isAdmin) {
                        if (showToast) showToast('માત્ર Admin ને એક્સેલ Import કરવાની મંજૂરી છે.');
                        return;
                      }
                      fileInputAllRef.current?.click();
                    }}
                    disabled={!isAdmin}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                      isAdmin
                        ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title="તમામ માસ્ટર વિભાગોમાં એક્સેલ (.xlsx) થી નામ Import કરો"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>બધા Import કરો</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCurrentTabExcel}
                    disabled={!isAdmin}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                      isAdmin
                        ? 'bg-indigo-700 hover:bg-indigo-800 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title="આ વિભાગના નામ એક્સેલ ફાઇલમાં ડાઉનલોડ કરો"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>આ વિભાગ Export કરો</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportAllMastersExcel}
                    disabled={!isAdmin}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                      isAdmin
                        ? 'bg-slate-800 hover:bg-slate-900 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title="બધા માસ્ટર ડેટા એક્સેલમાં Export કરો"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>બધા Export કરો</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder={`નવું નામ ઉમેરો (${tabLabels[activeTab as keyof MasterData]})...`}
                  className="flex-1 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-sm text-slate-900 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-sm rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ઉમેરો (Add)</span>
                </button>
              </form>

              {/* Selection Toolbar */}
              {masters[activeTab as keyof MasterData]?.length > 0 && (
                <div className="mb-2 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 text-xs font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>બધા પસંદ કરો (Select All)</span>
                  </label>

                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedIndices.length > 0 && (
                      confirmDeleteSelected ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-lg">
                          <span className="text-xs font-bold text-rose-700">પસંદ કરેલા ({selectedIndices.length}) ડીલીટ કરવા છે?</span>
                          <button
                            type="button"
                            onClick={handleExecuteDeleteSelected}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold cursor-pointer"
                          >
                            હા, ડીલીટ
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSelected(false)}
                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs cursor-pointer"
                          >
                            ના
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSelected(true)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          title="પસંદ કરેલા તમામ નામ એક સાથે ડીલીટ કરો"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>પસંદ કરેલા ({selectedIndices.length}) ડીલીટ કરો</span>
                        </button>
                      )
                    )}

                    {confirmDeleteAllInTab ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-lg">
                        <span className="text-xs font-bold text-rose-700">તમામ ({masters[activeTab as keyof MasterData]?.length || 0}) ડીલીટ કરવા છે?</span>
                        <button
                          type="button"
                          onClick={handleExecuteDeleteAllInTab}
                          className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          હા, બધા સાફ કરો
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteAllInTab(false)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs cursor-pointer"
                        >
                          ના
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAllInTab(true)}
                        className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        title="આ વિભાગના તમામ નામ એક સાથે ડીલીટ કરો"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>આ વિભાગના બધા ({masters[activeTab as keyof MasterData]?.length || 0}) ડીલીટ કરો</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* List Items with Order Controls */}
              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {(masters[activeTab as keyof MasterData] || []).map((item, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      className={`px-4 py-2.5 flex items-center justify-between text-sm transition-all ${
                        isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox, Index badge & Item text or Inline Edit input */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectItem(idx)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                          #{idx + 1}
                        </span>
                        {editingIndex === idx ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="bg-white border border-indigo-500 rounded px-2 py-1 text-sm text-slate-900 flex-1 outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(idx)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              title="Save name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className={`font-medium truncate ${isSelected ? 'text-indigo-950 font-semibold' : 'text-slate-800'}`}>
                            {item}
                          </span>
                        )}
                      </div>

                      {/* Actions: Up, Down, Edit, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className={`p-1.5 rounded transition-all ${
                            idx === 0
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 cursor-pointer'
                          }`}
                          title="Move Up (ઉપર કરો)"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === (masters[activeTab as keyof MasterData]?.length || 0) - 1}
                          className={`p-1.5 rounded transition-all ${
                            idx === (masters[activeTab as keyof MasterData]?.length || 0) - 1
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 cursor-pointer'
                          }`}
                          title="Move Down (નીચે કરો)"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(idx, item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                          title="Edit name (નામ સુધારો)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {confirmDeleteItemIndex === idx ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                            <span className="text-[11px] font-bold text-rose-700">ડીલીટ?</span>
                            <button
                              type="button"
                              onClick={() => handleExecuteRemoveItem(idx)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              હા
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteItemIndex(null)}
                              className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] cursor-pointer"
                            >
                              ના
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteItemIndex(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                            title="Delete item (દૂર કરો)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              {activeTab === 'users'
                ? `કુલ ${combinedUsers.length} યુઝર્સ નોંધાયેલા છે`
                : `કુલ ${masters[activeTab as keyof MasterData]?.length || 0} એન્ટ્રીઓ`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-800 hover:bg-indigo-900 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            પૂર્ણ કર્યું (Done)
          </button>
        </div>

      </div>
    </div>
  );
};
