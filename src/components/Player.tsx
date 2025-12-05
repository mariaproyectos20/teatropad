import { Play, Pause, Square, X, SkipBack, SkipForward } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PlayerProps {
  audio: HTMLAudioElement | null;
  fileName: string;
  onClose: () => void;
  // Play All integration (optional)
  isPlayingAll?: boolean;
  onTogglePlayAll?: () => void;
  onPlayAllNext?: () => void;
  onPlayAllPrev?: () => void;
  playOnlyCurrentPanel?: boolean;
  setPlayOnlyCurrentPanel?: (v: boolean) => void;
  playAllQueueCount?: number;
  currentPlayAllIndex?: number | null;
}

export default function Player({
  audio,
  fileName,
  onClose,
  isPlayingAll,
  onTogglePlayAll,
  onPlayAllNext,
  onPlayAllPrev,
  playOnlyCurrentPanel,
  setPlayOnlyCurrentPanel,
  playAllQueueCount,
  currentPlayAllIndex,
}: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    setIsPlaying(!audio.paused);
    setDuration(audio.duration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audio]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleStop = () => {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    onClose();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const SHORT_NAME_LEN = 20;
  const truncatedName = fileName
    ? fileName.length > SHORT_NAME_LEN
      ? `${fileName.slice(0, SHORT_NAME_LEN - 1)}…`
      : fileName
    : '';

  return (
    <div className="w-full bg-gradient-to-r from-gray-900 to-slate-800 rounded-xl p-3 sm:p-4 shadow-xl border border-gray-700 max-w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm sm:text-base truncate">{truncatedName}</p>
          <p className="text-cyan-400 text-xs">En reproducción</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors ml-2"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-12 text-right sm:w-14">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
          <span className="text-xs text-gray-400 w-12 sm:w-14">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={handlePlayPause}
            className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-2.5 sm:p-3 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
          </button>
          <button
            onClick={handleStop}
            className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2.5 sm:p-3 transition-colors"
            aria-label="Stop"
          >
            <Square size={18} fill="white" />
          </button>

          {/* Play All controls (optional) */}
          {typeof onTogglePlayAll === 'function' && (
            <div className="flex items-center gap-2 ml-2 sm:ml-3">
              <button
                onClick={() => onPlayAllPrev && onPlayAllPrev()}
                aria-label="Anterior"
                className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2 transition-colors"
              >
                <SkipBack size={16} />
              </button>

              <button
                onClick={() => onTogglePlayAll && onTogglePlayAll()}
                aria-label="Reproducir todo"
                className={`bg-slate-700 hover:bg-slate-600 text-white rounded-full p-2 transition-colors ${isPlayingAll ? 'bg-cyan-500' : ''}`}
              >
                {isPlayingAll ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <button
                onClick={() => onPlayAllNext && onPlayAllNext()}
                aria-label="Siguiente"
                className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2 transition-colors"
              >
                <SkipForward size={16} />
              </button>

              <div className="text-xs text-gray-300 ml-2 sm:ml-3 text-center">
                {typeof currentPlayAllIndex === 'number' && typeof playAllQueueCount === 'number'
                  ? `${currentPlayAllIndex + 1}/${playAllQueueCount}`
                  : `${playAllQueueCount || 0} items`}
              </div>

              <div className="ml-2 sm:ml-3 flex items-center gap-2">
                <button
                  onClick={() => setPlayOnlyCurrentPanel && setPlayOnlyCurrentPanel(false)}
                  className={`px-2 py-0.5 rounded-md text-xs transition ${!Boolean(playOnlyCurrentPanel) ? 'bg-slate-700 text-white' : 'bg-transparent text-gray-400 hover:bg-slate-700'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setPlayOnlyCurrentPanel && setPlayOnlyCurrentPanel(true)}
                  className={`px-2 py-0.5 rounded-md text-xs transition ${Boolean(playOnlyCurrentPanel) ? 'bg-slate-700 text-white' : 'bg-transparent text-gray-400 hover:bg-slate-700'}`}
                >
                  Panel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
