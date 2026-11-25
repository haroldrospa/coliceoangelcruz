import { useRef } from 'react';

// Coliseo Angel Cruz Sound Engine: Curated High-Fidelity Audio Signals
const SOUNDS = {
  WIN: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Crystal Coins
  BET: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Tactical Click
  NOTIFY: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Soft Digital Pop
  STRIKE: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' // Impact/Gong
};

export const playArenaBell = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const ringAt = (delay) => {
      const now = ctx.currentTime + delay;
      const frequencies = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6 arena bell harmonics
      const gains = [0.45, 0.35, 0.25, 0.15];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gainNode.gain.setValueAtTime(gains[idx], now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.9);
      });
    };
    // Triple arena bell strike: ding! ding! ding!
    ringAt(0);
    ringAt(0.3);
    ringAt(0.6);
  } catch (err) {
    console.warn('Bell synthesis error:', err);
  }
};

export const useSound = () => {
  const audioRefs = useRef({});

  // Pre-load all signals on first call to warm up the engine
  const preload = () => {
    Object.keys(SOUNDS).forEach(key => {
        if (!audioRefs.current[key]) {
            audioRefs.current[key] = new Audio(SOUNDS[key]);
            audioRefs.current[key].load();
        }
    });
  };

  const play = (soundKey) => {
    if (soundKey === 'BELL') {
      playArenaBell();
      return;
    }

    const url = SOUNDS[soundKey];
    if (!url) return;

    try {
        if (!audioRefs.current[soundKey]) {
            audioRefs.current[soundKey] = new Audio(url);
        }
        
        const audio = audioRefs.current[soundKey];
        audio.currentTime = 0;
        audio.volume = 0.5;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                console.log('Audio Blocked: Manual trigger required.');
            });
        }
    } catch (err) {
        console.error('Audio Err:', err);
    }
  };

  return { play, preload, playBell: playArenaBell };
};
