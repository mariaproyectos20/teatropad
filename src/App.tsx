import { useEffect, useRef, useState } from 'react';
import { Music as MusicIcon } from 'lucide-react';
import AudioPad from './components/AudioPad';
import Player from './components/Player';
import { AudioPadData, PlayingAudio } from './types/audio';
import { savePad, getAllPads, deletePad } from './lib/persistence';

const GRADIENT_COLORS = [
  'bg-gradient-to-br from-pink-500 to-rose-600',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-purple-500 to-violet-600',
  'bg-gradient-to-br from-pink-500 to-rose-600',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-blue-500 to-cyan-600',
  'bg-gradient-to-br from-blue-400 to-blue-600',
  'bg-gradient-to-br from-emerald-300 to-teal-400',
  'bg-gradient-to-br from-fuchsia-400 to-indigo-500',
  'bg-gradient-to-br from-amber-400 to-rose-500',
  'bg-gradient-to-br from-fuchsia-500 to-pink-600',
  'bg-gradient-to-br from-emerald-400 to-green-500',
  'bg-gradient-to-br from-amber-400 to-orange-500',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-blue-400 to-blue-600',
];

const PANEL_2_COLORS = [
  'bg-gradient-to-br from-teal-500 to-cyan-600',
  'bg-gradient-to-br from-cyan-500 to-blue-600',
  'bg-gradient-to-br from-indigo-500 to-purple-600',
  'bg-gradient-to-br from-lime-500 to-green-600',
  'bg-gradient-to-br from-green-500 to-emerald-600',
  'bg-gradient-to-br from-orange-500 to-red-600',
  'bg-gradient-to-br from-red-500 to-pink-600',
  'bg-gradient-to-br from-yellow-500 to-orange-600',
  'bg-gradient-to-br from-teal-400 to-cyan-500',
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-sky-500 to-blue-600',
  'bg-gradient-to-br from-lime-400 to-green-500',
  'bg-gradient-to-br from-rose-400 to-pink-500',
  'bg-gradient-to-br from-sky-400 to-indigo-500',
  'bg-gradient-to-br from-amber-300 to-orange-500',
];

function defaultPads(start = 0, colors = GRADIENT_COLORS): AudioPadData[] {
  return Array.from({ length: 15 }, (_, i) => ({
    id: start + i,
    file: null,
    fileName: null,
    audioUrl: null,
    color: colors[i],
  }));
}

export default function App() {
  const [currentPanel, setCurrentPanel] = useState<number>(1);
  const [pads1, setPads1] = useState<AudioPadData[]>(() => defaultPads(0, GRADIENT_COLORS));
  const [pads2, setPads2] = useState<AudioPadData[]>(() => defaultPads(15, PANEL_2_COLORS));
  const [playingAudio1, setPlayingAudio1] = useState<PlayingAudio | null>(null);
  const [playingAudio2, setPlayingAudio2] = useState<PlayingAudio | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  // Play-all state per panel
  const [isPlayingAll1, setIsPlayingAll1] = useState(false);
  const [isPlayingAll2, setIsPlayingAll2] = useState(false);
  const isPlayingAllRef1 = useRef(false);
  const isPlayingAllRef2 = useRef(false);
  const [playAllIndex1, setPlayAllIndex1] = useState<number | null>(null);
  const [playAllIndex2, setPlayAllIndex2] = useState<number | null>(null);

  const pads = currentPanel === 1 ? pads1 : pads2;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await getAllPads();
        if (!mounted || !stored || stored.length === 0) return;

        setPads1((prev) => {
          const next = [...prev];
          for (const rec of stored) {
            if (rec.id >= 0 && rec.id < 15 && rec.blob) {
              const url = URL.createObjectURL(rec.blob);
              const file = rec.fileName ? new File([rec.blob], rec.fileName) : null;
              next[rec.id] = { ...next[rec.id], file: file as File | null, fileName: rec.fileName, audioUrl: url };
            }
          }
          return next;
        });

        setPads2((prev) => {
          const next = [...prev];
          for (const rec of stored) {
            if (rec.id >= 15 && rec.id < 30 && rec.blob) {
              const idx = rec.id - 15;
              const url = URL.createObjectURL(rec.blob);
              const file = rec.fileName ? new File([rec.blob], rec.fileName) : null;
              next[idx] = { ...next[idx], file: file as File | null, fileName: rec.fileName, audioUrl: url };
            }
          }
          return next;
        });
      } catch (err) {
        console.warn('Failed to load persisted pads', err);
      }
    })();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleLoadAudio = (padId: number, file: File) => {
    const current = currentPanel === 1 ? pads1 : pads2;
    const pad = current.find((p) => p.id === padId);
    if (!pad) return;

    if (pad.audioUrl) URL.revokeObjectURL(pad.audioUrl);

    const existingAudio = audioRefs.current.get(padId);
    if (existingAudio) {
      existingAudio.pause();
      existingAudio.src = '';
    }

    const url = URL.createObjectURL(file);
    const updated = current.map((p) => (p.id === padId ? { ...p, file, fileName: file.name, audioUrl: url } : p));

    if (currentPanel === 1) setPads1(updated);
    else setPads2(updated);

    savePad(padId, file, file.name).catch((e) => console.error('persist error', e));
  };

  // Helpers for Play All feature
  const getQueueForPanel = (panel: number) => {
    const list = panel === 1 ? pads1 : pads2;
    return list.filter((p) => p.audioUrl).map((p) => p.id);
  };

  const stopPlayAll = (panel: number) => {
    if (panel === 1) {
      setIsPlayingAll1(false);
      isPlayingAllRef1.current = false;
      setPlayAllIndex1(null);
    } else {
      setIsPlayingAll2(false);
      isPlayingAllRef2.current = false;
      setPlayAllIndex2(null);
    }
  };

  const playQueueAt = (panel: number, index: number) => {
    const queue = getQueueForPanel(panel);
    if (!queue || queue.length === 0) return stopPlayAll(panel);
    if (index < 0 || index >= queue.length) return stopPlayAll(panel);

    const padId = queue[index];
    const isPanel1 = panel === 1;
    const setPlaying = isPanel1 ? setPlayingAudio1 : setPlayingAudio2;

    // create/play the audio for padId
    let audio = audioRefs.current.get(padId);
    const pad = (isPanel1 ? pads1 : pads2).find((p) => p.id === padId)!;
    if (!audio) {
      audio = new Audio(pad.audioUrl!);
      audio.loop = false;
      audioRefs.current.set(padId, audio);
    }

    // Attach a one-shot ended handler to move to next item if play-all is still active
    audio.addEventListener('ended', () => {
      const active = isPanel1 ? isPlayingAllRef1.current : isPlayingAllRef2.current;
      if (!active) {
        setPlaying(null);
        return;
      }
      const nextIndex = index + 1;
      if (nextIndex >= queue.length) {
        // finished queue
        stopPlayAll(panel);
        setPlaying(null);
      } else {
        // play next
        playQueueAt(panel, nextIndex);
      }
    }, { once: true });

    // Stop other playing audio in the other panel
    if (isPanel1 && playingAudio2) {
      playingAudio2.audio.pause();
      setPlayingAudio2(null);
    }
    if (!isPanel1 && playingAudio1) {
      playingAudio1.audio.pause();
      setPlayingAudio1(null);
    }

    // Start playback and set state
    setPlaying({ padId, audio });
    audio.currentTime = 0;
    audio.play();

    if (isPanel1) setPlayAllIndex1(index);
    else setPlayAllIndex2(index);
  };

  const handleTogglePlayAll = (panel: number) => {
    const isPanel1 = panel === 1;
    const active = isPanel1 ? isPlayingAll1 : isPlayingAll2;
    if (active) {
      stopPlayAll(panel);
      // pause current audio
      const playing = isPanel1 ? playingAudio1 : playingAudio2;
      if (playing) {
        playing.audio.pause();
      }
      return;
    }

    const queue = getQueueForPanel(panel);
    if (!queue || queue.length === 0) return; // nothing to play

    // determine start index: prefer currently playing pad if exists in queue, else 0
    const currentlyPlaying = panel === 1 ? playingAudio1?.padId : playingAudio2?.padId;
    let startIndex = 0;
    if (typeof currentlyPlaying === 'number') {
      const idx = queue.indexOf(currentlyPlaying);
      if (idx >= 0) startIndex = idx;
    }

    if (isPanel1) {
      setIsPlayingAll1(true);
      isPlayingAllRef1.current = true;
    } else {
      setIsPlayingAll2(true);
      isPlayingAllRef2.current = true;
    }

    playQueueAt(panel, startIndex);
  };

  const handlePlayAllNext = (panel: number) => {
    const isPanel1 = panel === 1;
    const queue = getQueueForPanel(panel);
    const curIndex = isPanel1 ? playAllIndex1 : playAllIndex2;
    if (curIndex === null || curIndex === undefined) return;
    const next = curIndex + 1;
    if (next >= queue.length) return stopPlayAll(panel);
    playQueueAt(panel, next);
  };

  const handlePlayAllPrev = (panel: number) => {
    const isPanel1 = panel === 1;
    const curIndex = isPanel1 ? playAllIndex1 : playAllIndex2;
    if (curIndex === null || curIndex === undefined) return;
    const prev = curIndex - 1;
    if (prev < 0) return; // already at first
    playQueueAt(panel, prev);
  };

  const handleDeletePad = async (padId: number) => {
    // stop audio if playing or referenced
    const existingAudio = audioRefs.current.get(padId);
    if (existingAudio) {
      existingAudio.pause();
      existingAudio.src = '';
      audioRefs.current.delete(padId);
    }

    setPads1((prev) => {
      if (padId < 15) {
        const next = [...prev];
        const idx = padId;
        if (next[idx]?.audioUrl) {
          try { URL.revokeObjectURL(next[idx].audioUrl!); } catch {}
        }
        next[idx] = { ...next[idx], file: null, fileName: null, audioUrl: null };
        return next;
      }
      return prev;
    });

    setPads2((prev) => {
      if (padId >= 15) {
        const next = [...prev];
        const idx = padId - 15;
        if (next[idx]?.audioUrl) {
          try { URL.revokeObjectURL(next[idx].audioUrl!); } catch {}
        }
        next[idx] = { ...next[idx], file: null, fileName: null, audioUrl: null };
        return next;
      }
      return prev;
    });

    if (playingAudio1?.padId === padId) {
      playingAudio1.audio.pause();
      setPlayingAudio1(null);
    }
    if (playingAudio2?.padId === padId) {
      playingAudio2.audio.pause();
      setPlayingAudio2(null);
    }

    try {
      await deletePad(padId);
    } catch (e) {
      console.warn('error deleting pad', e);
    }
  };

  const handlePlayPause = (padId: number) => {
    const pad = pads1.concat(pads2).find((p) => p.id === padId);
    if (!pad || !pad.audioUrl) return;
    const isPanel1 = padId < 15;
    const playingAudio = isPanel1 ? playingAudio1 : playingAudio2;
    const setPlaying = isPanel1 ? setPlayingAudio1 : setPlayingAudio2;

    if (playingAudio && playingAudio.padId !== padId) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
    }

    let audio = audioRefs.current.get(padId);
    if (!audio) {
      audio = new Audio(pad.audioUrl);
      // Ensure audio does NOT repeat automatically — play once and stop at end
      audio.loop = false;
      // When audio ends, clear the playing state for the current panel unless Play-All is active
      const isPanel1 = padId < 15;
      audio.addEventListener('ended', () => {
        const active = isPanel1 ? isPlayingAllRef1.current : isPlayingAllRef2.current;
        if (!active) setPlaying(null);
      });
      audioRefs.current.set(padId, audio);
    }

    if (playingAudio?.padId === padId) {
      if (audio.paused) audio.play();
      else audio.pause();
    } else {
      audio.play();
      setPlaying({ padId, audio });
    }
  };

  const handleClosePlayer = (panel: number) => {
    if (panel === 1) {
      if (!playingAudio1) return;
      playingAudio1.audio.pause();
      playingAudio1.audio.currentTime = 0;
      setPlayingAudio1(null);
    } else {
      if (!playingAudio2) return;
      playingAudio2.audio.pause();
      playingAudio2.audio.currentTime = 0;
      setPlayingAudio2(null);
    }
  };

  const currentPad1 = playingAudio1 ? pads1.find((p) => p.id === playingAudio1.padId) : null;
  const currentPad2 = playingAudio2 ? pads2.find((p) => p.id === playingAudio2.padId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-slate-800 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center gap-3">
              <MusicIcon size={40} className="text-cyan-400" />
              <h1 className="text-4xl font-bold">teatro pad</h1>
            </div>
            <div className="flex items-center">
              <div
                role="status"
                aria-live="polite"
                aria-label={isOnline ? 'Online' : 'Offline'}
                className="flex items-center"
              >
                <span className={`inline-block rounded-full w-3 h-3 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} mr-2`} />
                <span className="sr-only">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Mantén presionado para cargar audio • Click para reproducir</p>

          {/* moved status dot next to title */}
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <button onClick={() => setCurrentPanel(1)} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${currentPanel === 1 ? 'bg-cyan-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            Panel 1
          </button>
          <button onClick={() => setCurrentPanel(2)} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${currentPanel === 2 ? 'bg-cyan-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            Panel 2
          </button>
        </div>

        <div className="mb-6">
          {currentPanel === 1 && playingAudio1 && currentPad1 && (
            <Player
              audio={playingAudio1.audio}
              fileName={currentPad1.fileName || ''}
              onClose={() => handleClosePlayer(1)}
              isPlayingAll={isPlayingAll1}
              onTogglePlayAll={() => handleTogglePlayAll(1)}
              onPlayAllNext={() => handlePlayAllNext(1)}
              onPlayAllPrev={() => handlePlayAllPrev(1)}
              playAllQueueCount={getQueueForPanel(1).length}
              currentPlayAllIndex={playAllIndex1}
            />
          )}
          {currentPanel === 2 && playingAudio2 && currentPad2 && (
            <Player
              audio={playingAudio2.audio}
              fileName={currentPad2.fileName || ''}
              onClose={() => handleClosePlayer(2)}
              isPlayingAll={isPlayingAll2}
              onTogglePlayAll={() => handleTogglePlayAll(2)}
              onPlayAllNext={() => handlePlayAllNext(2)}
              onPlayAllPrev={() => handlePlayAllPrev(2)}
              playAllQueueCount={getQueueForPanel(2).length}
              currentPlayAllIndex={playAllIndex2}
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {pads.map((pad) => (
            <AudioPad
              key={pad.id}
              pad={pad}
              isPlaying={
                (playingAudio1?.padId === pad.id && !playingAudio1.audio.paused) ||
                (playingAudio2?.padId === pad.id && !playingAudio2.audio.paused)
              }
              onLoadAudio={handleLoadAudio}
              onPlayPause={handlePlayPause}
              onDelete={handleDeletePad}
            />
          ))}
        </div>

        <div className="text-center text-gray-500 text-xs">
          <p>Mantén presionado cualquier pad para cargar audio</p>
        </div>

        <footer className="mt-6 text-center text-gray-400 text-sm">
          <p>
            creado por :{' '}
            <a href="https://instagram.com/douglasdonaire" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
              @douglasdonaire
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
