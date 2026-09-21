import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Trash2,
  Key,
  Phone,
  Shield,
  Heart,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Check,
  HeartHandshake,
} from 'lucide-react';
import { PatientProfile, CaretakerProfile, UserRole, CaregiverConnectionRequest } from '../types';

interface CaregiverCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  currentPatient: PatientProfile | null;
  currentCaretaker: CaretakerProfile | null;
  allPatients: PatientProfile[];
  onPatientLinked: (patient: PatientProfile, caretaker?: CaretakerProfile) => void;
  onPatientRemoved: (patientId: string) => void;
  onCaregiverUnlinked: (patient: PatientProfile) => void;
}

export const CaregiverCircleModal: React.FC<CaregiverCircleModalProps> = ({
  isOpen,
  onClose,
  role,
  currentPatient,
  currentCaretaker,
  allPatients,
  onPatientLinked,
  onPatientRemoved,
  onCaregiverUnlinked,
}) => {
  const [identifierInput, setIdentifierInput] = useState('');
  const [caregiverKeyInput, setCaregiverKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [caregiverRequests, setCaregiverRequests] = useState<CaregiverConnectionRequest[]>([]);
  const [patientRequests, setPatientRequests] = useState<CaregiverConnectionRequest[]>([]);

  const fetchRequests = async () => {
    try {
      if (role === 'CAREGIVER' && currentCaretaker) {
        const res = await fetch(`/api/caregiver-requests/caretaker/${currentCaretaker.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setCaregiverRequests(data);
        }
      } else if (role === 'PATIENT' && currentPatient) {
        const res = await fetch(`/api/caregiver-requests/patient/${currentPatient.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setPatientRequests(data);
        }
      }
    } catch {
      // ignore network errors
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, role, currentCaretaker?.id, currentPatient?.id]);

  if (!isOpen) return null;

  // Caregiver initiating connection request to patient
  const handleLinkPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCaretaker || !identifierInput.trim()) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/caretakers/${currentCaretaker.id}/link-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifierInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Could not find patient with that identifier.');
        setLoading(false);
        return;
      }

      if (data.pendingConfirmation) {
        setSuccess(
          `Connection request sent to ${data.patient?.fullName || 'patient'}! Waiting for confirmation on their app.`
        );
        setIdentifierInput('');
        fetchRequests();
      } else if (data.patient) {
        setSuccess(`Successfully linked ${data.patient.fullName || 'patient'} to your circle!`);
        setIdentifierInput('');
        onPatientLinked(data.patient, data.caretaker);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to link patient.');
    } finally {
      setLoading(false);
    }
  };

  // Patient responding to incoming connection request
  const handleRespondPatientRequest = async (requestId: string, action: 'ACCEPT' | 'DECLINE') => {
    if (!currentPatient) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/caregiver-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, patientId: currentPatient.id }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to respond to request.');
        setLoading(false);
        return;
      }

      if (action === 'ACCEPT') {
        setSuccess('Caregiver connection confirmed and linked successfully!');
        if (data.patient) {
          onPatientLinked(data.patient, data.caretaker);
        }
      } else {
        setSuccess('Connection request declined.');
      }
      setPatientRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      setError(err?.message || 'Failed to respond to request.');
    } finally {
      setLoading(false);
    }
  };

  // BUG #3 FIX: Caregiver removing patient syncing to backend
  const handleRemovePatient = async (patientId: string, patientName: string) => {
    if (!currentCaretaker) return;
    if (!confirm(`Are you sure you want to remove ${patientName} from your active care circle?`)) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/caretakers/${currentCaretaker.id}/remove-patient/${patientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiatorName: currentCaretaker.fullName }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to remove patient from care circle.');
        setLoading(false);
        return;
      }

      setSuccess(`${patientName} has been unlinked from your circle.`);
      onPatientRemoved(patientId);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove patient.');
    } finally {
      setLoading(false);
    }
  };

  // Patient linking caregiver
  const handlePatientLinkCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !caregiverKeyInput.trim()) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/patients/${currentPatient.id}/link-caregiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caregiverKey: caregiverKeyInput.trim(),
          patient: currentPatient,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to link caregiver key.');
        setLoading(false);
        return;
      }

      setSuccess('Caregiver linked successfully!');
      setCaregiverKeyInput('');
      if (data.patient) {
        onPatientLinked(data.patient, data.caretaker);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to link caregiver.');
    } finally {
      setLoading(false);
    }
  };

  // Patient unlinking caregiver
  const handlePatientUnlinkCaregiver = async () => {
    if (!currentPatient) return;
    if (!confirm('Are you sure you want to remove your linked caregiver and switch to self-care?')) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/patients/${currentPatient.id}/unlink-caregiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiator: 'PATIENT',
          initiatorName: currentPatient.fullName,
          initiatorId: currentPatient.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to unlink caregiver.');
        setLoading(false);
        return;
      }

      setSuccess('You have switched to self-care mode.');
      if (data.patient) {
        onCaregiverUnlinked(data.patient);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to unlink caregiver.');
    } finally {
      setLoading(false);
    }
  };

  const assignedList =
    currentCaretaker?.assignedPatientIds && currentCaretaker.assignedPatientIds.length > 0
      ? allPatients.filter((p) => currentCaretaker.assignedPatientIds.includes(p.id))
      : [];

  return (
    <div
      id="caregiver-circle-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3"
    >
      <div
        id="caregiver-circle-modal-container"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-teal-850 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-serif font-bold text-base">
                {role === 'CAREGIVER' ? 'Manage Care Circle' : 'Family Caregiver Settings'}
              </h2>
              <p className="text-xs text-teal-200">
                {role === 'CAREGIVER'
                  ? 'Add or remove seniors under your care'
                  : 'Connect with your family caregiver'}
              </p>
            </div>
          </div>
          <button
            id="close-caregiver-circle-modal-btn"
            onClick={onClose}
            className="p-1 rounded-full text-teal-200 hover:text-white hover:bg-teal-700/50"
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {role === 'CAREGIVER' && currentCaretaker && (
            <>
              {/* Caregiver Key Banner */}
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-teal-900">Your Family Caregiver Key</p>
                  <p className="text-lg font-mono font-bold text-teal-850 tracking-wider">
                    {currentCaretaker.caregiverKey || 'CG-ACTIVE'}
                  </p>
                  <p className="text-[11px] text-teal-700">
                    Share this key with family members or loved ones so they can connect with you.
                  </p>
                </div>
              </div>

              {/* Add Patient Form */}
              <form onSubmit={handleLinkPatient} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5">
                <label className="block text-xs font-semibold text-stone-800">
                  Add Senior by Patient Key, Mobile Number, or Username
                </label>
                <div className="flex gap-2">
                  <input
                    id="add-patient-identifier-input"
                    type="text"
                    required
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    placeholder="e.g. PT-100201 or 9876543210"
                    className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white"
                  />
                  <button
                    id="submit-link-patient-btn"
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Assigned Patients List */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Seniors Under Your Care ({assignedList.length})
                </h3>
                {assignedList.length === 0 ? (
                  <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-xl border border-dashed border-stone-300 text-center">
                    No patients currently assigned to your care circle. Add one above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignedList.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-xl shadow-2xs"
                      >
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{patient.fullName}</p>
                          <p className="text-xs text-stone-500">
                            Key: {patient.patientKey || 'PT-DEFAULT'} • Age: {patient.age}
                          </p>
                        </div>
                        <button
                          id={`remove-patient-btn-${patient.id}`}
                          onClick={() => handleRemovePatient(patient.id, patient.fullName)}
                          title="Remove from Care Circle"
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Confirmation Requests */}
              {caregiverRequests.filter((r) => r.status === 'PENDING').length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Awaiting Patient Confirmation (
                      {caregiverRequests.filter((r) => r.status === 'PENDING').length})
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {caregiverRequests
                      .filter((r) => r.status === 'PENDING')
                      .map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl"
                        >
                          <div>
                            <p className="text-sm font-semibold text-stone-900">{req.patientName}</p>
                            <p className="text-xs text-amber-800">
                              Patient ID: {req.patientKey} • Request sent
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full">
                            Pending approval
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {role === 'PATIENT' && currentPatient && (
            <div className="space-y-4">
              {/* Incoming Requests requiring patient confirmation */}
              {patientRequests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4" />
                    <span>Caregiver Connection Requests ({patientRequests.length})</span>
                  </h3>
                  {patientRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-stone-900">{req.caretakerName}</p>
                          <p className="text-xs text-stone-600">
                            {req.caretakerRelation || 'Caregiver'} • Phone: {req.caretakerPhone}
                          </p>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Wants to connect with you and assist with your daily routines.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleRespondPatientRequest(req.id, 'ACCEPT')}
                          disabled={loading}
                          className="flex-1 px-3 py-1.5 bg-teal-850 hover:bg-teal-900 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleRespondPatientRequest(req.id, 'DECLINE')}
                          disabled={loading}
                          className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <p className="text-xs font-semibold text-stone-800 mb-1">Your Patient Key</p>
                <p className="text-lg font-mono font-bold text-teal-850">
                  {currentPatient.patientKey || 'PT-DEFAULT'}
                </p>
                <p className="text-[11px] text-stone-500">
                  Share this key with your family caregiver so they can watch over your daily routines.
                </p>
              </div>

              {currentPatient.hasCaregiver && currentPatient.caregiverName ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">Linked Caregiver</p>
                      <p className="text-sm font-bold text-emerald-950">{currentPatient.caregiverName}</p>
                      {currentPatient.caregiverPhone && (
                        <p className="text-xs text-emerald-800">Phone: {currentPatient.caregiverPhone}</p>
                      )}
                    </div>
                    <button
                      id="patient-unlink-caregiver-btn"
                      onClick={handlePatientUnlinkCaregiver}
                      className="px-3 py-1.5 text-xs font-semibold bg-white text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-50"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePatientLinkCaregiver} className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-semibold text-stone-800">
                    Connect with Family Caregiver (Enter Caregiver Key)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="link-caregiver-key-input"
                      type="text"
                      required
                      value={caregiverKeyInput}
                      onChange={(e) => setCaregiverKeyInput(e.target.value)}
                      placeholder="e.g. CG-ABC123"
                      className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white"
                    />
                    <button
                      id="submit-link-caregiver-btn"
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50"
                    >
                      {loading ? 'Linking...' : 'Connect'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
