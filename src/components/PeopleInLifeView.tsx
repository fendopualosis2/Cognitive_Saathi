import React, { useState, useRef } from 'react';
import {
  Users,
  UserPlus,
  Heart,
  Calendar,
  Cake,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Edit3,
  Trash2,
  Plus,
  X,
  Image as ImageIcon,
  Phone,
  MapPin,
  Smile,
  Check,
  Search,
  Upload,
} from 'lucide-react';
import { PersonInLife, PersonImportantDate } from '../types';
import { speechService } from '../services/audioSpeech';

interface PeopleInLifeViewProps {
  people: PersonInLife[];
  patientId: string;
  patientName: string;
  isCaregiverView?: boolean;
  onAddPerson: (person: PersonInLife) => void;
  onUpdatePerson: (person: PersonInLife) => void;
  onDeletePerson: (personId: string) => void;
}

const COMMON_RELATIONSHIPS = [
  'Spouse',
  'Daughter',
  'Son',
  'Granddaughter',
  'Grandson',
  'Sister',
  'Brother',
  'Primary Caregiver',
  'Doctor / Nurse',
  'Close Friend',
  'Neighbor',
];

export const PeopleInLifeView: React.FC<PeopleInLifeViewProps> = ({
  people,
  patientId,
  patientName,
  isCaregiverView = false,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [speakingPersonId, setSpeakingPersonId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [customRelationship, setCustomRelationship] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [birthday, setBirthday] = useState('');
  const [marriageDate, setMarriageDate] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [personality, setPersonality] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [customDates, setCustomDates] = useState<PersonImportantDate[]>([]);
  const [newDateLabel, setNewDateLabel] = useState('');
  const [newDateValue, setNewDateValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setRelationship('Daughter');
    setCustomRelationship('');
    setImageUrl('');
    setDescription('');
    setBirthday('');
    setMarriageDate('');
    setLikes('');
    setDislikes('');
    setPersonality('');
    setPhone('');
    setLocation('');
    setCustomDates([]);
    setNewDateLabel('');
    setNewDateValue('');
    setEditingPersonId(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (person: PersonInLife) => {
    setEditingPersonId(person.id);
    setName(person.name);
    if (COMMON_RELATIONSHIPS.includes(person.relationship)) {
      setRelationship(person.relationship);
      setCustomRelationship('');
    } else {
      setRelationship('Other');
      setCustomRelationship(person.relationship);
    }
    setImageUrl(person.imageUrl || '');
    setDescription(person.description || '');
    setBirthday(person.birthday || '');
    setMarriageDate(person.marriageDate || '');
    setLikes(person.likes || '');
    setDislikes(person.dislikes || '');
    setPersonality(person.personality || '');
    setPhone(person.phone || '');
    setLocation(person.location || '');
    setCustomDates(person.importantDates || []);
    setIsModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read as Base64 data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomDate = () => {
    if (!newDateLabel.trim() || !newDateValue.trim()) return;
    const newEntry: PersonImportantDate = {
      id: `date-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: newDateLabel.trim(),
      date: newDateValue.trim(),
    };
    setCustomDates([...customDates, newEntry]);
    setNewDateLabel('');
    setNewDateValue('');
  };

  const handleRemoveCustomDate = (id: string) => {
    setCustomDates(customDates.filter((d) => d.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalRelationship =
      relationship === 'Other' && customRelationship.trim()
        ? customRelationship.trim()
        : relationship;

    const personData: PersonInLife = {
      id: editingPersonId || `person-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      patientId,
      name: name.trim(),
      relationship: finalRelationship,
      imageUrl: imageUrl.trim() || undefined,
      description: description.trim(),
      birthday: birthday.trim() || undefined,
      marriageDate: marriageDate.trim() || undefined,
      importantDates: customDates.length > 0 ? customDates : undefined,
      likes: likes.trim() || undefined,
      dislikes: dislikes.trim() || undefined,
      personality: personality.trim() || undefined,
      phone: phone.trim() || undefined,
      location: location.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (editingPersonId) {
      onUpdatePerson(personData);
    } else {
      onAddPerson(personData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleSpeakPerson = (person: PersonInLife) => {
    if (speakingPersonId === person.id) {
      speechService.stop();
      setSpeakingPersonId(null);
      return;
    }

    speechService.stop();
    setSpeakingPersonId(person.id);

    // Formulate comforting narration
    const parts: string[] = [];
    parts.push(`This is ${person.name}, your ${person.relationship}.`);
    if (person.description) {
      parts.push(person.description);
    }
    if (person.birthday) {
      parts.push(`Birthday is on ${person.birthday}.`);
    }
    if (person.marriageDate) {
      parts.push(`Wedding anniversary or marriage date is ${person.marriageDate}.`);
    }
    if (person.likes) {
      parts.push(`They love ${person.likes}.`);
    }
    if (person.personality) {
      parts.push(`Personality: ${person.personality}.`);
    }

    const narration = parts.join(' ');
    speechService.speak(narration, {
      force: true,
      rate: 0.9,
      onEnd: () => setSpeakingPersonId(null),
    });
  };

  const filteredPeople = people.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.relationship.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.personality && p.personality.toLowerCase().includes(q))
    );
  });

  return (
    <div id="people-in-life-container" className="space-y-4">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-teal-900 via-teal-850 to-teal-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-white">People in {patientName}'s Life</h2>
            <span className="bg-teal-700/80 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-teal-600">
              {people.length} {people.length === 1 ? 'Person' : 'People'}
            </span>
          </div>
          <p className="text-xs text-teal-200 mt-1 max-w-xl leading-relaxed">
            Familiar faces, loved ones, relationships, birthdays, and anniversaries to keep comforting memories vivid and close.
          </p>
        </div>

        <button
          id="add-person-btn"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-teal-950 rounded-2xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4 text-teal-950" />
          <span>Add Loved One</span>
        </button>
      </div>

      {/* Search Bar when there are multiple people */}
      {people.length > 2 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search loved ones by name, relationship, or trait..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-800 rounded-2xl focus:ring-2 focus:ring-teal-700 focus:outline-none shadow-2xs"
          />
        </div>
      )}

      {/* BLANK AT FIRST: Empty State */}
      {people.length === 0 ? (
        <div
          id="people-empty-state"
          className="bg-white dark:bg-stone-900 rounded-3xl p-8 sm:p-10 border border-stone-200 dark:border-stone-800 text-center shadow-2xs space-y-4"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-300">
            <Users className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
              No People Added Yet
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Add family members, close friends, or caregivers in {patientName}'s life.
              Record their photo, relationship, birthday, wedding anniversary, likes/dislikes,
              and personality traits so your loved one can easily recall and stay connected with them.
            </p>
          </div>

          <button
            id="add-first-person-btn"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-850 hover:bg-teal-900 text-white text-xs font-semibold rounded-2xl shadow-xs hover:shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4 text-amber-300" />
            <span>Add First Person</span>
          </button>
        </div>
      ) : (
        /* PEOPLE CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPeople.map((person) => {
            const isSpeaking = speakingPersonId === person.id;
            return (
              <div
                key={person.id}
                id={`person-card-${person.id}`}
                className={`bg-white dark:bg-stone-900 rounded-3xl border overflow-hidden shadow-2xs flex flex-col justify-between transition-all ${
                  isSpeaking
                    ? 'border-amber-400 ring-2 ring-amber-300/70 shadow-md'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div className="p-5 space-y-3.5">
                  {/* Card Header: Avatar, Name, Relationship & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {person.imageUrl ? (
                        <img
                          src={person.imageUrl}
                          alt={person.name}
                          className="w-16 h-16 rounded-2xl object-cover border border-stone-200 dark:border-stone-700 shadow-2xs shrink-0"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-800 to-teal-950 text-amber-300 font-serif font-bold text-2xl flex items-center justify-center border border-teal-700 shadow-2xs shrink-0">
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 leading-tight">
                            {person.name}
                          </h3>
                        </div>
                        <span className="inline-block mt-1 text-[11px] font-semibold text-teal-850 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                          {person.relationship}
                        </span>

                        {(person.location || person.phone) && (
                          <div className="flex items-center gap-2.5 text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                            {person.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-stone-400" />
                                {person.location}
                              </span>
                            )}
                            {person.phone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-3 h-3 text-stone-400" />
                                {person.phone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(person)}
                        className="p-1.5 text-stone-400 hover:text-teal-800 dark:hover:text-teal-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg transition-colors"
                        title="Edit person"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to remove ${person.name} from the loved ones circle?`)) {
                            onDeletePerson(person.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg transition-colors"
                        title="Delete person"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description / Story in Patient's Life */}
                  {person.description && (
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50/70 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-100 dark:border-stone-750">
                      {person.description}
                    </p>
                  )}

                  {/* Important Dates: Birthday, Marriage / Anniversary, Milestones */}
                  {(person.birthday || person.marriageDate || (person.importantDates && person.importantDates.length > 0)) && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        Important Dates & Anniversaries
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {person.birthday && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl">
                            <Cake className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Birthday: {person.birthday}</span>
                          </span>
                        )}

                        {person.marriageDate && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-900 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-xl">
                            <Heart className="w-3 h-3 text-rose-500 fill-rose-500/20 shrink-0" />
                            <span>Marriage / Anniversary: {person.marriageDate}</span>
                          </span>
                        )}

                        {person.importantDates?.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-900 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-xl"
                          >
                            <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
                            <span>{d.label}: {d.date}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Likes and Dislikes */}
                  {(person.likes || person.dislikes) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {person.likes && (
                        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl p-2.5 text-xs text-stone-700 dark:text-stone-300">
                          <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mb-0.5">
                            <ThumbsUp className="w-3 h-3 text-emerald-600" />
                            Likes & Comforts
                          </p>
                          <p className="text-[11px] text-emerald-950 dark:text-emerald-100 font-normal leading-relaxed">
                            {person.likes}
                          </p>
                        </div>
                      )}

                      {person.dislikes && (
                        <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 rounded-2xl p-2.5 text-xs text-stone-700 dark:text-stone-300">
                          <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1 mb-0.5">
                            <ThumbsDown className="w-3 h-3 text-rose-500" />
                            Dislikes / Avoid
                          </p>
                          <p className="text-[11px] text-rose-950 dark:text-rose-100 font-normal leading-relaxed">
                            {person.dislikes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Personality & Quirks */}
                  {person.personality && (
                    <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 rounded-2xl p-2.5 text-xs text-stone-700 dark:text-stone-300">
                      <p className="text-[10px] font-bold text-stone-600 dark:text-stone-400 flex items-center gap-1 mb-0.5">
                        <Smile className="w-3 h-3 text-teal-700 dark:text-teal-400" />
                        Personality & Characteristics
                      </p>
                      <p className="text-[11px] text-stone-800 dark:text-stone-200 font-normal leading-relaxed">
                        {person.personality}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Audio narration button */}
                <div className="p-4 pt-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850 flex items-center justify-between">
                  <button
                    onClick={() => handleSpeakPerson(person)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSpeaking
                        ? 'bg-amber-400 text-teal-950 shadow-xs ring-2 ring-amber-300'
                        : 'bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-teal-900 dark:text-teal-200 border border-stone-200 dark:border-stone-700 shadow-2xs'
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-teal-950" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                        <span>Listen to Summary</span>
                      </>
                    )}
                  </button>

                  <span className="text-[10px] text-stone-400 dark:text-stone-500">
                    Familiar memory guide
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT PERSON MODAL */}
      {isModalOpen && (
        <div
          id="person-form-modal"
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl max-w-xl w-full my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-300 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                    {editingPersonId ? 'Edit Loved One Profile' : 'Add Person in Life'}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Keep important family bonds, milestones, and details memorable
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Photo Upload with Preview */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Photo / Portrait
                </label>
                <div className="flex items-center gap-4">
                  {imageUrl ? (
                    <div className="relative group shrink-0">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-16 h-16 rounded-2xl object-cover border border-stone-300 dark:border-stone-600 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs text-[10px]"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-dashed border-stone-300 dark:border-stone-700 flex flex-col items-center justify-center text-stone-400 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                      <span>{imageUrl ? 'Change Photo' : 'Upload Picture'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <p className="text-[10px] text-stone-400 dark:text-stone-500">
                      Upload from phone or computer (JPG, PNG). Clear portraits help memory recognition.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name & Relationship */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ananya Baruah"
                    className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Relationship *
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    {COMMON_RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                    <option value="Other">Other (Type below)</option>
                  </select>
                </div>
              </div>

              {relationship === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Specify Relationship
                  </label>
                  <input
                    type="text"
                    value={customRelationship}
                    onChange={(e) => setCustomRelationship(e.target.value)}
                    placeholder="e.g. Niece, Childhood Friend, Yoga Teacher"
                    className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Description / Who They Are
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Eldest daughter living in Guwahati, visits every Sunday with homemade tea and snacks."
                  className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              {/* Important Dates: Birthday & Marriage */}
              <div className="bg-amber-50/40 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 space-y-2.5">
                <p className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  Important Dates & Anniversaries
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Birthday (e.g. 14 October)
                    </label>
                    <input
                      type="text"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      placeholder="e.g. 14 October, 1982"
                      className="w-full px-3 py-1.5 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Marriage / Wedding Anniversary
                    </label>
                    <input
                      type="text"
                      value={marriageDate}
                      onChange={(e) => setMarriageDate(e.target.value)}
                      placeholder="e.g. Married 24 December 1980"
                      className="w-full px-3 py-1.5 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>

                {/* Extra custom important dates list */}
                {customDates.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {customDates.map((cd) => (
                      <div
                        key={cd.id}
                        className="flex items-center justify-between text-[11px] bg-white dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700"
                      >
                        <span className="font-semibold text-stone-800 dark:text-stone-200">{cd.label}:</span>
                        <span className="text-stone-600 dark:text-stone-400 ml-1.5 flex-1">{cd.date}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomDate(cd.id)}
                          className="text-stone-400 hover:text-rose-600 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add another date row */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newDateLabel}
                    onChange={(e) => setNewDateLabel(e.target.value)}
                    placeholder="Milestone (e.g. Graduation)"
                    className="flex-1 px-2.5 py-1 text-[11px] border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                  <input
                    type="text"
                    value={newDateValue}
                    onChange={(e) => setNewDateValue(e.target.value)}
                    placeholder="Date/Year (e.g. 2012)"
                    className="flex-1 px-2.5 py-1 text-[11px] border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomDate}
                    className="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 rounded-lg text-[11px] font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Likes & Dislikes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3 text-emerald-600" />
                    Likes / Favorites
                  </label>
                  <textarea
                    rows={2}
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    placeholder="e.g. Assam black tea, singing Rabindra Sangeet, gardening"
                    className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                    <ThumbsDown className="w-3 h-3 text-rose-500" />
                    Dislikes / Triggers
                  </label>
                  <textarea
                    rows={2}
                    value={dislikes}
                    onChange={(e) => setDislikes(e.target.value)}
                    placeholder="e.g. Sudden loud noises, bitter vegetables, crowded markets"
                    className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              {/* Personality & Quirks */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                  <Smile className="w-3 h-3 text-teal-700" />
                  Personality & Traits
                </label>
                <input
                  type="text"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="e.g. Very soft-spoken, patient, warm contagious laugh, tells funny train stories"
                  className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              {/* Contact & Location (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Phone / Contact (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Location / City (Optional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Guwahati, Assam"
                    className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="save-person-form-btn"
                  type="submit"
                  className="px-5 py-2 bg-teal-850 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-3.5 h-3.5 text-amber-300" />
                  <span>{editingPersonId ? 'Save Changes' : 'Add to Circle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
