import { GoogleGenAI, Modality } from '@google/genai';
import { ServerDB } from './db.js';
import { ReminderItem, RoutineTask } from '../src/types.js';

export const safetySettings = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

export const PATIENT_TOOL_DECLARATIONS = [
  {
    name: 'get_patient_profile',
    description: 'Retrieve the senior patient\'s name, preferred name, age, cultural region, daily streak, and care circle details.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
    },
  },
  {
    name: 'get_todays_routines',
    description: 'Retrieve all of today\'s scheduled routine tasks (e.g. morning walk, tea, gardening) and their completion status.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
    },
  },
  {
    name: 'get_reminders',
    description: 'Retrieve all medication, hydration, and health reminders along with their scheduled times and status.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
    },
  },
  {
    name: 'get_memories',
    description: 'Retrieve cherished family memories, Northeast cultural keepsakes, and stories from the patient\'s album.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
    },
  },
  {
    name: 'get_recent_activity',
    description: 'Retrieve recent cognitive exercise and memory game sessions, completion counts, and daily activity scores.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
    },
  },
  {
    name: 'get_caregiver_information',
    description: 'Retrieve the contact name, relationship, and phone number of the patient\'s linked family caregiver.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
    },
  },
  {
    name: 'create_reminder',
    description: 'Add a new medication, hydration, or daily reminder for the patient.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        title: { type: 'STRING' as const, description: 'Title of the reminder, e.g. "Evening Warm Milk & Tulsi"' },
        time: { type: 'STRING' as const, description: 'Time of day, e.g. "08:30 PM"' },
        description: { type: 'STRING' as const, description: 'Optional short comforting instruction' },
        type: {
          type: 'STRING' as const,
          description: 'Type of reminder',
          enum: ['MEDICINE', 'HYDRATION', 'ACTIVITY', 'APPOINTMENT', 'ROUTINE'],
        },
      },
      required: ['title', 'time'],
    },
  },
  {
    name: 'complete_routine',
    description: 'Mark a scheduled routine task as completed for today.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        taskTitleOrId: { type: 'STRING' as const, description: 'The title or ID of the routine task' },
      },
      required: ['taskTitleOrId'],
    },
  },
];

/**
 * Execute patient tools strictly bound to the authorized patientId verified by the server.
 * The model NEVER controls or supplies the patientId.
 */
export async function executePatientTool(
  authorizedPatientId: string,
  functionName: string,
  args: any
): Promise<any> {
  const patient = ServerDB.findPatient(authorizedPatientId);
  if (!patient) {
    return { error: 'Patient record not found.' };
  }

  switch (functionName) {
    case 'get_patient_profile': {
      return {
        fullName: patient.fullName,
        preferredName: patient.preferredName || patient.fullName,
        age: patient.age,
        region: patient.region,
        state: patient.state,
        dailyStreak: patient.dailyStreak || 0,
        todayCompletedCount: patient.todayCompletedCount || 0,
        hasCaregiver: Boolean(patient.hasCaregiver),
        caregiverName: patient.caregiverName || 'Self',
      };
    }

    case 'get_todays_routines': {
      const routines = ServerDB.getRoutines(authorizedPatientId);
      const pending = routines.filter((r) => !r.completed);
      return {
        totalRoutines: routines.length,
        completedCount: routines.filter((r) => r.completed).length,
        pendingCount: pending.length,
        nextActivity: pending.length > 0 ? pending[0] : (routines.length > 0 ? routines[0] : null),
        routines: routines.map((r) => ({
          id: r.id,
          title: r.title,
          time: r.time,
          timeSlot: r.timeSlot,
          completed: r.completed,
          notes: r.notes || '',
        })),
      };
    }

    case 'get_reminders': {
      const reminders = ServerDB.getReminders(authorizedPatientId);
      return {
        totalReminders: reminders.length,
        completedToday: reminders.filter((rem) => rem.completedToday).length,
        reminders: reminders.map((rem) => ({
          id: rem.id,
          title: rem.title,
          time: rem.time,
          description: rem.description,
          type: rem.type,
          completedToday: rem.completedToday,
        })),
      };
    }

    case 'get_memories': {
      const memories = ServerDB.getMemories(authorizedPatientId);
      return {
        totalMemories: memories.length,
        hasMemoriesUpdated: memories.length > 0,
        latestMemory: memories[0]
          ? {
              title: memories[0].title,
              category: memories[0].category,
              dateLabel: memories[0].dateLabel,
              photosCount: memories[0].images?.length || (memories[0].imageUrl ? 1 : 0),
              storySnippet: memories[0].story?.slice(0, 120),
            }
          : null,
        memories: memories.slice(0, 6).map((m) => ({
          id: m.id,
          title: m.title,
          category: m.category,
          region: m.region,
          dateLabel: m.dateLabel,
          story: m.story,
          photosCount: m.images?.length || (m.imageUrl ? 1 : 0),
          hasVoiceNote: Boolean(m.hasVoiceNote),
        })),
      };
    }

    case 'get_recent_activity': {
      const sessions = ServerDB.getSessions(authorizedPatientId);
      return {
        totalSessionsCompleted: sessions.length,
        recentSessions: sessions.slice(0, 4).map((s) => ({
          gameId: s.gameId,
          accuracy: s.accuracy,
          attempts: s.attempts,
          mistakes: s.mistakes,
          completedAt: s.completedAt,
        })),
        dailyStreak: patient.dailyStreak || 0,
      };
    }

    case 'get_caregiver_information': {
      return {
        hasCaregiver: Boolean(patient.hasCaregiver),
        caregiverName: patient.caregiverName || 'No caregiver linked',
        caregiverPhone: patient.caregiverPhone || 'None',
        relationship: 'Family Caregiver',
      };
    }

    case 'create_reminder': {
      const { title, time, description = '', type = 'ROUTINE' } = args;
      if (!title || !time) {
        return { error: 'Title and time are required to create a reminder.' };
      }

      const existingReminders = ServerDB.getReminders(authorizedPatientId);
      const newReminder: ReminderItem = {
        id: `rem-${Date.now()}`,
        patientId: authorizedPatientId,
        type: (type as any) || 'ROUTINE',
        title: title.trim(),
        description: description.trim() || 'Created with Saathi Voice Companion',
        time: time.trim(),
        period: time.toLowerCase().includes('pm') ? 'Evening' : 'Morning',
        completedToday: false,
        enabled: true,
      };

      const updated = [newReminder, ...existingReminders];
      ServerDB.saveReminders(authorizedPatientId, updated);

      return {
        success: true,
        message: `Successfully created reminder "${newReminder.title}" scheduled for ${newReminder.time}.`,
        reminder: newReminder,
      };
    }

    case 'complete_routine': {
      const { taskTitleOrId } = args;
      if (!taskTitleOrId) {
        return { error: 'Task title or ID is required.' };
      }

      const routines = ServerDB.getRoutines(authorizedPatientId);
      const targetLower = String(taskTitleOrId).toLowerCase().trim();

      let matched = routines.find(
        (r) => r.id === taskTitleOrId || r.title.toLowerCase().includes(targetLower)
      );

      if (!matched && routines.length > 0) {
        matched = routines.find((r) => !r.completed);
      }

      if (!matched) {
        return { error: 'No matching routine task found to mark completed.' };
      }

      matched.completed = true;
      ServerDB.saveRoutines(authorizedPatientId, routines);

      return {
        success: true,
        message: `Marked "${matched.title}" as completed!`,
        routine: matched,
      };
    }

    default:
      return { error: `Unknown tool function: ${functionName}` };
  }
}

/**
 * Summarizes a voice note from patient or caregiver into a rich keepsake memory
 */
export async function summarizeVoiceNoteWithGemini(
  ai: GoogleGenAI | null,
  transcript: string,
  patientName: string,
  preferredLanguage: string
): Promise<{
  title: string;
  story: string;
  region: string;
  category: string;
  audioPrompt: string;
  suggestedImageUrl: string;
}> {
  if (ai && transcript && transcript.trim().length > 5) {
    const prompt = `You are a warm, culturally sensitive memory curator for an eldercare app in Northeast India (Assam, Manipur, Meghalaya, Nagaland, Tripura).
A senior patient or their family caregiver recorded this spoken voice note about a cherished memory:
"${transcript}"

Create a comforting, structured keepsake memory from this voice note.
Guidelines:
1. "title": A concise, heartwarming title (3 to 6 words).
2. "story": A warm, coherent narrative summarizing the spoken memory in gentle, comforting language (2 to 3 sentences).
3. "region": One of ["Assam", "Manipur", "Meghalaya", "Nagaland", "Tripura"] that best fits the context (default to "Assam" if unspecified).
4. "category": One of ["Family", "Festival", "Place", "Tradition", "Childhood"].
5. "audioPrompt": A gentle reminiscing question to ask the patient about this memory.
6. "suggestedImageUrl": Pick the most fitting thematic photo URL:
   - Tea gardens / Nature: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80"
   - Bihu / Festival / Dhol / Music: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80"
   - Family / Home / Elders: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=80"
   - Handloom / Weaving / Craft: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80"
   - River / Brahmaputra / Sunset: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"

Respond ONLY with valid JSON in this structure:
{
  "title": "string",
  "story": "string",
  "region": "string",
  "category": "string",
  "audioPrompt": "string",
  "suggestedImageUrl": "string"
}`;

    try {

      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
          safetySettings: safetySettings as any,
        },
      });

      if (res.text) {
        const parsed = JSON.parse(res.text);
        if (parsed.title && parsed.story) {
          return {
            title: parsed.title,
            story: parsed.story,
            region: parsed.region || 'Assam',
            category: parsed.category || 'Family',
            audioPrompt: parsed.audioPrompt || 'Do you remember this beautiful moment together?',
            suggestedImageUrl:
              parsed.suggestedImageUrl ||
              'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
          };
        }
      }
      } catch (err) {
      try {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.4,
            safetySettings: safetySettings as any,
          },
        });
        if (fallbackRes.text) {
          const parsed = JSON.parse(fallbackRes.text);
          if (parsed.title && parsed.story) {
            return {
              title: parsed.title,
              story: parsed.story,
              region: parsed.region || 'Assam',
              category: parsed.category || 'Family',
              audioPrompt: parsed.audioPrompt || 'Do you remember this beautiful moment together?',
              suggestedImageUrl:
                parsed.suggestedImageUrl ||
                'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
            };
          }
        }
      } catch (fbErr: any) {
        // Handled cleanly by offline fallback below
      }
    }
  }

  // Graceful offline fallback summarizer
  const clean = transcript.trim();
  const firstSentence = clean.split(/[.!?\n]/)[0] || clean;
  const words = clean.split(/\s+/);
  const title = words.slice(0, 5).join(' ') || 'Cherished Spoken Memory';

  return {
    title: title.length > 30 ? `${title.slice(0, 30)}...` : title,
    story: clean || 'A comforting personal memory spoken with warmth from the heart.',
    region: 'Assam',
    category: 'Family',
    audioPrompt: 'Do you remember this heartwarming moment?',
    suggestedImageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
  };
}

/**
 * Transcribes audio recording with Gemini for Voice Companion and Memory Voice tools
 */
export async function transcribeAudioWithGemini(
  ai: GoogleGenAI | null,
  audioBase64: string,
  mimeType: string = 'audio/webm',
  preferredLanguage?: string
): Promise<string> {
  if (!ai || !audioBase64) {
    return '';
  }

  try {
    const langContext =
      preferredLanguage === 'as'
        ? 'The speaker is speaking Assamese (অসমীয়া) or Indian English.'
        : preferredLanguage === 'hi'
        ? 'The speaker is speaking Hindi (हिन्दी) or Indian English.'
        : preferredLanguage === 'mni'
        ? 'The speaker is speaking Manipuri (মৈতৈলোন্) or Indian English.'
        : 'The speaker is speaking in English or a regional Indian language (Assamese, Hindi, Bengali, Manipuri).';

    const prompt = `You are an expert audio transcription assistant specialized in senior eldercare conversations in Northeast India.
${langContext}
Listen to the user's spoken audio and transcribe what they said word-for-word.
Rules:
1. Output ONLY the plain transcribed text.
2. Do not include quotes, preamble, timestamps, commentary, or markdown formatting.
3. If the audio is silence, static, or unintelligible noise, output nothing (empty string).
4. Accurately capture questions, feelings, or questions about daily routines, medication, or memories.`;

    // Strip data url prefix if present
    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9-+.]+;base64,/, '');

    const audioContent = [
      {
        inlineData: {
          mimeType: mimeType || 'audio/webm',
          data: cleanBase64,
        },
      },
      prompt,
    ];

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: audioContent,
        config: {
          safetySettings: safetySettings as any,
        },
      });

      return res.text ? res.text.trim() : '';
    } catch (liteErr: any) {
      try {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: audioContent,
          config: {
            safetySettings: safetySettings as any,
          },
        });

        return fallbackRes.text ? fallbackRes.text.trim() : '';
      } catch (fbErr: any) {
        return '';
      }
    }
  } catch (err: any) {
    return '';
  }
}

/**
 * Convert linear 16-bit PCM audio buffer into standard WAV file format
 */
export function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataLength = pcmBuffer.length;
  const bufferLength = 44 + dataLength;

  header.write('RIFF', 0);
  header.writeUInt32LE(bufferLength - 8, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmBuffer]);
}

export async function generateGeminiVoice(
  ai: any,
  text: string,
  voiceProfile: string = 'soothing-female'
): Promise<string | null> {
  if (!ai || !text || text.trim().length === 0) return null;
  try {
    const cleanSpeech = text.replace(/[*#\[\]_]/g, '').replace(/[-•]\s+/g, '').replace(/[\n\r]+/g, ' ').trim();
    if (!cleanSpeech) return null;

    let voiceName = 'Aoede';
    let emotionPrompt = '';

    switch (voiceProfile) {
      case 'gentle-male':
        voiceName = 'Enceladus';
        emotionPrompt = `Speak in a gentle, warm, and comforting male voice. Speak very slowly, naturally, and peacefully without sounding robotic:`;
        break;
      case 'friendly-male':
        voiceName = 'Puck';
        emotionPrompt = `Speak in a friendly, approachable, and conversational male voice. Speak very slowly, naturally, and clearly without sounding robotic:`;
        break;
      case 'warm-female':
        voiceName = 'Sulafat';
        emotionPrompt = `Speak in a warm, kind, and approachable female voice. Speak very slowly, naturally, and gracefully without sounding robotic:`;
        break;
      case 'bright-female':
        voiceName = 'Zephyr';
        emotionPrompt = `Speak in a bright, cheerful, and uplifting female voice. Speak very slowly, naturally, and clearly without sounding robotic:`;
        break;
      case 'soothing-female':
      default:
        voiceName = 'Aoede';
        emotionPrompt = `Speak in a soft, close-up ASMR whisper tone. You are a warm, reassuring, and loving maternal figure. Speak tenderly, peacefully, and very slowly without sounding robotic:`;
        break;
    }

    const promptText = `${emotionPrompt} "${cleanSpeech.slice(0, 450)}"`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      } as any,
    });

    const pcmBase64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!pcmBase64) return null;

    const wavBuf = pcmToWav(Buffer.from(pcmBase64, 'base64'), 24000, 1, 16);
    return `data:audio/wav;base64,${wavBuf.toString('base64')}`;
  } catch (err) {
    console.error('[Voice Gen Error]:', err);
    return null;
  }
}

export interface SaathiCompanionParams {
  ai: GoogleGenAI | null;
  message: string;
  role?: string;
  patientId?: string;
  patientName?: string;
  preferredLanguage?: string;
  voiceProfile?: string;
  history?: Array<{ sender: 'user' | 'saathi'; text: string }>;
  userData?: {
    patient?: any;
    routines?: any[];
    reminders?: any[];
    memories?: any[];
    people?: any[];
    sessions?: any[];
    currentTime?: string;
    currentDate?: string;
  };
}

/**
 * Generate full-featured Saathi AI Companion response grounded in patient data with Gemini Thinking & Voice
 */
export async function generateSaathiCompanion(params: SaathiCompanionParams): Promise<{
  reply: string;
  thought: string;
  audioUrl: string | null;
  source: string;
  usedModel: string;
  executedTools: any[];
}> {
  const {
    ai,
    message,
    role = 'PATIENT',
    patientId: incomingPatientId,
    patientName: incomingName,
    preferredLanguage = 'en',
    voiceProfile = 'soothing-female',
    history = [],
    userData,
  } = params;

  // 1. Resolve Patient Data
  let patientId = incomingPatientId;
  if (!patientId) {
    const patients = ServerDB.getPatients();
    if (patients.length > 0) {
      patientId = patients[0].id;
    }
  }
  const authorizedPatientId = patientId || 'default-patient';
  const serverPatient = patientId ? ServerDB.findPatient(patientId) : null;
  const p = userData?.patient || serverPatient || {};
  const elderName = p.preferredName || p.fullName || incomingName || 'Friend';
  const age = p.age || 72;
  const region = p.region || 'Guwahati, Assam (NER)';
  const streak = p.dailyStreak || 1;

  // 2. Resolve Routines & Next Activity
  const routinesList: any[] =
    Array.isArray(userData?.routines) && userData!.routines!.length > 0
      ? userData!.routines!
      : ServerDB.getRoutines(authorizedPatientId);

  const completedRoutines = routinesList.filter((r) => r.completed);
  const pendingRoutines = routinesList.filter((r) => !r.completed);
  const nextActivity =
    pendingRoutines.length > 0 ? pendingRoutines[0] : (routinesList.length > 0 ? routinesList[0] : null);

  const formattedRoutines = routinesList.length > 0
    ? routinesList
        .map(
          (r, idx) =>
            `${idx + 1}. [${r.completed ? 'COMPLETED' : 'PENDING'}] ${r.time || ''} - ${r.title} ${r.notes ? `(${r.notes})` : ''}`
        )
        .join('\n')
    : 'No specific routines listed for today.';

  const nextActivityText = nextActivity
    ? `${nextActivity.title} scheduled at ${nextActivity.time || 'soon'} (Status: ${nextActivity.completed ? 'Already completed' : 'Pending - Next step'})`
    : 'All scheduled routines for today have been completed or quiet rest is recommended.';

  // 3. Resolve Reminders
  const remindersList: any[] =
    Array.isArray(userData?.reminders) && userData!.reminders!.length > 0
      ? userData!.reminders!
      : ServerDB.getReminders(authorizedPatientId);

  const formattedReminders = remindersList.length > 0
    ? remindersList
        .map(
          (rem, idx) =>
            `${idx + 1}. [${rem.completedToday ? 'TAKEN/DONE' : 'PENDING'}] ${rem.time || ''} - ${rem.title} (${rem.type}): ${rem.description || ''}`
        )
        .join('\n')
    : 'No active reminders.';

  // 4. Resolve Memories Tab Data
  const memoriesList: any[] =
    Array.isArray(userData?.memories) && userData!.memories!.length > 0
      ? userData!.memories!
      : ServerDB.getMemories(authorizedPatientId);

  const totalMemories = memoriesList.length;
  const latestMemory = memoriesList.length > 0 ? memoriesList[0] : null;

  const formattedMemories = memoriesList.length > 0
    ? memoriesList
        .slice(0, 6)
        .map((m, idx) => {
          const photoCount = m.imagesCount || (Array.isArray(m.images) ? m.images.length : (m.imageUrl ? 1 : 0));
          return `${idx + 1}. "${m.title}" (${m.category || 'Memory'}, Date: ${m.dateLabel || 'Cherished'}, Photos: ${photoCount} attached)\n   Story: ${m.story || 'A cherished keepsake'}`;
        })
        .join('\n')
    : 'No memories added to the album yet.';

  // 5. Resolve People in Life Data (People Tab)
  const peopleList: any[] =
    Array.isArray(userData?.people) && userData!.people!.length > 0
      ? userData!.people!
      : ServerDB.getPeople(authorizedPatientId);

  const formattedPeople = peopleList.length > 0
    ? peopleList
        .map((per, idx) => {
          const dates = [
            per.birthday ? `Birthday: ${per.birthday}` : null,
            per.marriageDate ? `Marriage/Anniversary: ${per.marriageDate}` : null,
          ].filter(Boolean).join(', ');

          return `${idx + 1}. ${per.name} (${per.relationship || 'Loved One'})\n   Who they are: ${per.description || 'Family member'}\n   ${dates ? `Important Dates: ${dates}\n   ` : ''}${per.likes ? `Likes: ${per.likes}\n   ` : ''}${per.dislikes ? `Dislikes: ${per.dislikes}\n   ` : ''}${per.personality ? `Personality: ${per.personality}` : ''}`;
        })
        .join('\n')
    : 'No loved ones added yet in the People tab.';

  // 6. Caregiver & Activity Telemetry
  const caregiverName = p.caregiverName || 'Devi Baruah';
  const caregiverPhone = p.caregiverPhone || '+91 98640 12345';
  const sessions = userData?.sessions || ServerDB.getSessions(authorizedPatientId);
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const systemInstruction = `You are Saathi, a warm, conversational, and highly intelligent female AI companion for ${elderName}.
CRITICAL CONTEXT:
- Today is ${currentDate}, and the current time is ${currentTime}.
- Caregiver: ${caregiverName}
- Schedule: ${formattedRoutines}

YOUR PRIME DIRECTIVE:
1. ANSWER CONFIDENTLY & CREATIVELY: Answer EVERY everyday question warmly. If asked "what should I eat?", give a specific, delicious, and healthy recommendation. If asked about the weather or outside world, use the current date/time to make a cheerful, educated guess based on the season. 
2. NEVER APOLOGIZE FOR LACK OF ACCESS: NEVER say "I don't have real-time access", "I am an AI", or "I cannot answer that". Always provide a helpful, human-like response.
3. THE "TOO HARD" RULE: ONLY if the question is highly complex (e.g., advanced coding, calculus, engineering), gently state that this is outside your current capacity as a companion, and smoothly change the subject to something comforting.
4. TOOLS: ONLY use tools if explicitly asked about medical data, routines, or reminders.
5. TONE: Speak in 1-4 soothing sentences. Respond ENTIRELY in ${preferredLanguage}.`;

  let reply = '';
  let thought = '';
  let usedModel = 'gemini-3.8-flash';
  const executedTools: any[] = [];

  if (ai) {
    try {
      const config = {
        systemInstruction,
        temperature: 0.7,
        tools: [{ functionDeclarations: PATIENT_TOOL_DECLARATIONS }]
      };

      const contents = [{ role: 'user', parts: [{ text: message }] }];
      let genRes: any;
      try {
        genRes = await ai.models.generateContent({ model: 'gemini-3.8-flash', contents, config: config as any });
      } catch (tier1Err: any) {
        // High demand or temporary service spike -> auto-fallback to high-availability gemini-3.1-flash-lite
        usedModel = 'gemini-3.1-flash-lite';
        genRes = await ai.models.generateContent({ model: 'gemini-3.1-flash-lite', contents, config: config as any });
      }

      if (genRes.functionCalls && genRes.functionCalls.length > 0) {
        const call = genRes.functionCalls[0];
        executedTools.push(call.name);
        let toolResult;
        try {
          toolResult = await executePatientTool(authorizedPatientId, call.name, call.args || {});
        } catch (e) {
          toolResult = { error: "Could not fetch data at this moment." };
        }

        const bypassConfig = { systemInstruction, temperature: 0.7 };
        const followUpContents = [
          { role: 'user', parts: [{ text: message }] },
          { role: 'user', parts: [{ text: `[SYSTEM: Tool '${call.name}' returned: ${JSON.stringify(toolResult)}. Answer the user smoothly based on this.]` }] }
        ];

        let followUpRes: any;
        try {
          followUpRes = await ai.models.generateContent({ model: usedModel, contents: followUpContents, config: bypassConfig as any });
        } catch (tier1FollowUpErr: any) {
          followUpRes = await ai.models.generateContent({ model: 'gemini-3.1-flash-lite', contents: followUpContents, config: bypassConfig as any });
        }
        reply = followUpRes.text || '';
      } else {
        reply = genRes.text || '';
      }
    } catch (err: any) {
      console.error('[Saathi API Error]:', err?.message);
    }
  }

  // 8. Context-Aware Multilingual Fallback (strictly for zero-connectivity/offline environments)
  if (!reply) {
    const isSchedule = /schedule|routine|today|plan|কৰিম|দিন|দিনচৰ্যা|समय/i.test(message);
    const isNext = /next|after|পৰৱৰ্তী|এরপর|কি কৰিম|क्या करू|आगे|मथংগী/i.test(message);
    const isMemory = /memory|memories|photo|album|ছবি|স্মৃতি|तस्वीर|याद|নিংশিং/i.test(message);
    const isMedicine = /medicine|tablet|pill|health|দৰব|ঔষধ|दवा|হিদাক/i.test(message);
    const isGreeting = /hello|hi|hey|নমস্কাৰ|नमस्ते|খুরুমজরি/i.test(message);

    if (preferredLanguage === 'as') {
      if (isNext) {
        reply = `আপোনাৰ পৰৱৰ্তী কাৰ্য্যসূচী হ'ল: ${nextActivity?.title || 'বাৰাণ্ডাত জিৰণি লোৱা'}। আপুনি ঘৰতে সম্পূৰ্ণ শান্তিত আছে।`;
      } else if (isSchedule) {
        reply = `আজি আপোনাৰ ${routinesList.length} টা কাৰ্য্যসূচী আছে। ${completedRoutines.length} টা সম্পূৰ্ণ হৈছে।`;
      } else if (isMemory) {
        reply = `আপোনাৰ সোঁৱৰণি (Memories) টেবটোত ${totalMemories} টা সুন্দৰ স্মৃতি সংৰক্ষিত আছে। শেহতীয়া স্মৃতিটো হ'ল "${latestMemory?.title || 'পৰিয়ালৰ স্মৃতি'}"।`;
      } else if (isMedicine) {
        reply = `আপোনাৰ ঔষধৰ সকলো বিৱৰণ সুৰক্ষিতভাৱে ৰখা হৈছে। সকলো সময়মতে হৈ আছে।`;
      } else if (isGreeting) {
        reply = `নমস্কাৰ ${elderName}! মই আপোনাৰ সাথী, আপোনাৰ লগত আছো। আপুনি কেনে অনুভৱ কৰিছে?`;
      } else {
        reply = `মই আপোনাৰ কথা শুনি আছোঁ, ${elderName}। আপুনি ঘৰতে শান্তিত আৰু সুৰক্ষিতভাৱে আছে।`;
      }
    } else if (preferredLanguage === 'hi') {
      if (isNext) {
        reply = `आपकी अगली गतिविधि है: ${nextActivity?.title || 'बरामदे में विश्राम'}। आप घर पर पूरी तरह सुरक्षित और शांत हैं।`;
      } else if (isSchedule) {
        reply = `आज आपकी ${routinesList.length} दिनचर्या निर्धारित हैं, जिनमें से ${completedRoutines.length} पूरी हो चुकी हैं।`;
      } else if (isMemory) {
        reply = `हाँ, आपकी मेमोरी टैब में कुल ${totalMemories} खूबसूरत यादें सुरक्षित हैं। हालिया याद "${latestMemory?.title || 'परिवार की याद'}" है।`;
      } else if (isMedicine) {
        reply = `आपकी दवाओं का रिकॉर्ड सुरक्षित है और सब कुछ सही समय पर चल रहा है।`;
      } else if (isGreeting) {
        reply = `नमस्ते ${elderName} जी! मैं साथी हूँ, आपके साथ। बताइए मैं आपकी क्या मदद करूँ?`;
      } else {
        reply = `मैं आपकी बात सुन रहा हूँ, ${elderName} जी। आप बिल्कुल सुरक्षित हैं।`;
      }
    } else if (preferredLanguage === 'mni') {
      if (isNext || isSchedule) {
        reply = `অদোমগী মথংগী থবক অসিনি: ${nextActivity?.title || 'য়ুমদা পোথাবা'}। অদোম য়ুমদা শান্তিনা লৈরি।`;
      } else if (isMemory) {
        reply = `হৌজিক মেমোরিজ তেবতা অপুনবা নিংশিংপোৎ ${totalMemories} লৈরে।`;
      } else if (isMedicine) {
        reply = `অদোমগী হিদাক্কী রেকোৰ্ড পুম্নমক শেংনা লৈরি।`;
      } else {
        reply = `খুরুমজরি ${elderName}। ঐহাক সাথীনি, অদোমগী লোইননা লৈরি।`;
      }
    } else {
      if (isNext) {
        reply = `Your next scheduled activity is ${nextActivity?.title || 'a peaceful rest'}, planned for ${nextActivity?.time || 'today'}.`;
      } else if (isSchedule) {
        reply = `Today you have ${routinesList.length} scheduled routines, and ${completedRoutines.length} are already completed.`;
      } else if (isMemory) {
        reply = `Your Memories tab currently has ${totalMemories} cherished keepsakes saved, including "${latestMemory?.title || 'Family Memories'}".`;
      } else if (isMedicine) {
        reply = `All your health and medication reminders are safely tracked and up to date.`;
      } else if (isGreeting) {
        reply = `Hello ${elderName}! I am right here with you. How are you feeling right now?`;
      } else {
        reply = `I am listening closely, ${elderName}. Tell me what's on your mind.`;
      }
    }
  }

  const audioUrl = (ai && reply) ? await generateGeminiVoice(ai, reply, voiceProfile) : null;

  return {
    reply,
    thought,
    audioUrl,
    source: reply ? 'gemini' : 'grounded-engine',
    usedModel,
    executedTools,
  };
}
