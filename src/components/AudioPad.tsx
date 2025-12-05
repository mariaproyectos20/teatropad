import { Music } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AudioPadData } from '../types/audio';

interface AudioPadProps {
  pad: AudioPadData;
  isPlaying: boolean;
  progress?: { current: number; duration: number } | null;
  onLoadAudio: (padId: number, file: File) => void;
  onPlayPause: (padId: number) => void;
  onDelete: (padId: number) => void;
}

export default function AudioPad({ pad, isPlaying, progress, onLoadAudio, onPlayPause, onDelete }: AudioPadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      openMenu();
      longPressTimer.current = null;
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      // normal click (no long press yet)
      if (pad.audioUrl) onPlayPause(pad.id);
    } else if (longPressTriggered.current) {
      // long press already triggered and opened menu: consume click
      longPressTriggered.current = false;
      return;
    } else {
      if (pad.audioUrl) onPlayPause(pad.id);
    }
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      openMenu();
      longPressTimer.current = null;
    }, 500);
  };

  const openMenu = () => {
    setMenuOpen(true);
    // compute position next tick
    requestAnimationFrame(() => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 144; // matches w-36 (~9rem)
      const padding = 8;
      let left = Math.round(rect.left + window.scrollX + rect.width - menuWidth);
      let top = Math.round(rect.top + window.scrollY + padding);
      // clamp to viewport
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      if (left + menuWidth + 8 > window.scrollX + vw) left = Math.max(window.scrollX + 8, window.scrollX + vw - menuWidth - 8);
      if (left < window.scrollX + 8) left = window.scrollX + 8;
      if (top + 40 > window.scrollY + vh) top = Math.max(window.scrollY + 8, window.scrollY + vh - 48);
      setMenuPos({ top, left });
    });
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuPos(null);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'audio/mpeg' || file.type === 'audio/wav')) {
      onLoadAudio(pad.id, file);
    }
    e.target.value = '';
  };

  const handleDelete = () => {
    closeMenu();
    onDelete(pad.id);
  };

  const handleChooseFile = () => {
    closeMenu();
    fileInputRef.current?.click();
  };

  // Truncate long file names to a maximum of 20 characters for better fit on phones
  const truncateFileName = (name: string) => {
    if (name.length <= 20) return name;
    return name.substring(0, 17) + '...';
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onDocClick = (e: MouseEvent) => {
      const menuEl = menuRef.current;
      const btnEl = buttonRef.current;
      if (!menuEl) return;
      if (menuEl.contains(e.target as Node)) return;
      if (btnEl && btnEl.contains(e.target as Node)) return;
      closeMenu();
    };

    const onScroll = () => closeMenu();
    const onResize = () => closeMenu();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(); };

    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <button
        className={`relative aspect-square rounded-2xl shadow-lg transition-all duration-200 active:scale-95 overflow-hidden ${pad.color} ${
          isPlaying ? 'ring-6 ring-white animate-pulse' : ''
        }`}
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <Music
            size={48}
            className={`mb-2 ${isPlaying ? 'animate-bounce' : ''} ${!pad.fileName ? 'opacity-50' : ''}`}
          />
          {pad.fileName && (
            <span className="text-xs font-medium px-2 text-center">
              {truncateFileName(pad.fileName)}
            </span>
          )}
        </div>
          {menuOpen && menuPos && createPortal(
            <div
              ref={menuRef}
              style={{ position: 'absolute', top: menuPos.top + 'px', left: menuPos.left + 'px', zIndex: 10000 }}
              aria-modal="false"
            >
              <div className="bg-slate-800 text-white rounded-md shadow-lg py-1 w-36">
                <button onClick={handleChooseFile} className="w-full text-left px-3 py-2 hover:bg-slate-700">Cargar audio</button>
                <button onClick={handleDelete} className="w-full text-left px-3 py-2 hover:bg-slate-700">Borrar</button>
              </div>
            </div>, document.body
          )}
          {/* progress bar */}
          {isPlaying && pad && (pad.fileName || pad.audioUrl) && (
            <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/20">
              <div
                className="h-1 bg-cyan-400 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, (progress?.current || 0) / ((progress?.duration || 1) || 1) * 100))}%` }}
              />
            </div>
          )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
