import React, { useState } from 'react';
import { Building2, ChevronDown, Bell, Plus, Check, X, Trash2, Settings, LogOut, User as UserIcon } from 'lucide-react';
import type { Building, User } from '../api/client';

interface TopHeaderProps {
  buildings: Building[];
  currentBuilding: Building | null;
  onSelectBuilding: (buildingId: string) => void;
  onAddBuilding: (payload: {
    name: string;
    building_type: string;
    gross_floor_area_m2: number;
    primary_use: string;
    address: string;
    timezone: string;
    currency: string;
    default_tariff_rate: number;
    number_of_floors: number;
  }) => Promise<void>;
  onDeleteBuilding: (buildingId: string) => Promise<void>;
  timeRange: string;
  setTimeRange: (range: string) => void;
  floorsCount?: number;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  buildings,
  currentBuilding,
  onSelectBuilding,
  onAddBuilding,
  onDeleteBuilding,
  timeRange,
  setTimeRange,
  floorsCount = 0,
  currentUser,
  onLogout
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [facilityName, setFacilityName] = useState('');
  const [buildingType, setBuildingType] = useState('Commercial Office');
  const [address, setAddress] = useState('');
  const [areaM2, setAreaM2] = useState('12000');
  const [numFloors, setNumFloors] = useState('0');
  const [tariffRate, setTariffRate] = useState('9.50');

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddBuilding({
        name: facilityName.trim(),
        building_type: buildingType,
        gross_floor_area_m2: parseFloat(areaM2) || 12000,
        primary_use: 'Commercial',
        address: address.trim() || 'Commercial Hub',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        default_tariff_rate: parseFloat(tariffRate) || 9.50,
        number_of_floors: parseInt(numFloors) || 0,
      });
      setFacilityName('');
      setAddress('');
      setNumFloors('0');
      setIsAddModalOpen(false);
      setDropdownOpen(false);
    } catch (err) {
      console.error('Error creating facility:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (bId: string) => {
    setDeletingId(bId);
    try {
      await onDeleteBuilding(bId);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const displayName = currentBuilding?.name ?? 'No Facility Selected';

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Facility Switcher */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center shrink-0">
              <Building2 className="w-3 h-3 text-blue-600" />
            </div>
            <div className="max-w-[180px]">
              <p className="text-xs font-semibold text-slate-800 truncate leading-none">{displayName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{floorsCount} floors</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute top-full left-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                {/* Header */}
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saved Facilities ({buildings.length})</p>
                </div>

                {/* Facility List */}
                <div className="max-h-56 overflow-y-auto">
                  {buildings.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-slate-400 text-center">No facilities yet.</p>
                  ) : buildings.map((b) => {
                    const isSelected = currentBuilding?.id === b.id;
                    return (
                      <div key={b.id} className={`flex items-center justify-between px-3 py-2 hover:bg-slate-50 ${isSelected ? 'bg-blue-50/60' : ''}`}>
                        <button
                          onClick={() => { onSelectBuilding(b.id); setDropdownOpen(false); }}
                          className="flex-1 text-left min-w-0 mr-2"
                        >
                          <div className="flex items-center space-x-1.5">
                            {isSelected && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
                            <p className={`text-xs font-medium truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{b.name}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 pl-4">{b.address || b.building_type}</p>
                        </button>
                        {confirmDeleteId === b.id ? (
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => handleDelete(b.id)}
                              disabled={deletingId === b.id}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                            >
                              {deletingId === b.id ? '...' : 'Delete'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(b.id); }}
                            className="p-1.5 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer Actions */}
                <div className="border-t border-slate-100 px-3 py-2 flex items-center space-x-2">
                  <button
                    onClick={() => { setDropdownOpen(false); setFacilityName(''); setAddress(''); setNumFloors('0'); setIsAddModalOpen(true); }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Facility</span>
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); setIsManageModalOpen(true); }}
                    className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Time Range + Notifications */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs">
          {['Today', '7 Days', '30 Days'].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                timeRange === r
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <button className="relative p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
        </button>

        {/* User Profile & Logout Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-2 p-1 pl-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-700 hidden md:inline truncate max-w-[120px]">
              {currentUser?.full_name?.split(' ')[0] || 'User'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
              {currentUser?.full_name
                ? currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                : 'NX'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-3 space-y-3">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {currentUser?.full_name
                      ? currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'NX'}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.full_name || 'ECO ⚡ VOLT User'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || 'admin@voltaris.ai'}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                      {currentUser?.role?.replace('_', ' ') || 'Auditor'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Database Authority
                  </div>
                  <div className="px-2 py-1.5 text-xs text-slate-600 font-mono flex items-center justify-between rounded-lg bg-slate-50">
                    <span>Database:</span>
                    <span className="text-emerald-700 font-semibold">voltaris3_db</span>
                  </div>
                </div>

                {onLogout && (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add Facility Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New Facility</h3>
                <p className="text-xs text-slate-500 mt-0.5">Zero mock floor plans — upload your own via AI</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={facilityName}
                  onChange={e => setFacilityName(e.target.value)}
                  placeholder="e.g. Cyber City Tech Hub"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Facility Type</label>
                  <select
                    value={buildingType}
                    onChange={e => setBuildingType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  >
                    <option value="Commercial Office">Commercial Office</option>
                    <option value="IT Campus">IT Campus</option>
                    <option value="R&D Lab">R&D Lab</option>
                    <option value="Data Center">Data Center</option>
                    <option value="Mixed-Use">Mixed-Use</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Initial Floors <span className="font-normal text-slate-400">(0 = upload)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={numFloors}
                    onChange={e => setNumFloors(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address / Location</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. Outer Ring Road, Bellandur, Bengaluru"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Floor Area (m²)</label>
                  <input
                    type="number"
                    min={100}
                    value={areaM2}
                    onChange={e => setAreaM2(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tariff (₹/kWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    value={tariffRate}
                    onChange={e => setTariffRate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !facilityName.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage Facilities Modal ── */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setIsManageModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage Facilities</h3>
                <p className="text-xs text-slate-500 mt-0.5">Switch, inspect, or permanently delete facilities</p>
              </div>
              <button onClick={() => setIsManageModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {buildings.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No facilities saved yet.</p>
              )}
              {buildings.map((b) => {
                const isActive = currentBuilding?.id === b.id;
                const isConfirming = confirmDeleteId === b.id;
                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border ${isActive ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'} transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{b.name}</h4>
                          {isActive && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{b.address || b.building_type}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-slate-500">
                          <span>{b.gross_floor_area_m2.toLocaleString()} m²</span>
                          <span>·</span>
                          <span>₹{b.default_tariff_rate.toFixed(2)}/kWh</span>
                          <span>·</span>
                          <span>{b.currency || 'INR'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => { onSelectBuilding(b.id); setIsManageModalOpen(false); }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                          >
                            Switch
                          </button>
                        )}
                        {isConfirming ? (
                          <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-200 rounded-lg p-1.5">
                            <span className="text-[10px] font-semibold text-rose-700">Delete all data?</span>
                            <button
                              onClick={() => handleDelete(b.id)}
                              disabled={deletingId === b.id}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                            >
                              {deletingId === b.id ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(b.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                onClick={() => { setIsManageModalOpen(false); setFacilityName(''); setAddress(''); setNumFloors('0'); setIsAddModalOpen(true); }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Facility</span>
              </button>
              <button
                onClick={() => { setIsManageModalOpen(false); setConfirmDeleteId(null); }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
