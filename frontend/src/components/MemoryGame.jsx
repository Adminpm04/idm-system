import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../App';

// 3D Bank Logo SVG
const BankLogo3D = ({ size = 80 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))'}}>
    <defs>
      <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700"/>
        <stop offset="50%" stopColor="#F9BF3F"/>
        <stop offset="100%" stopColor="#B8860B"/>
      </linearGradient>
      <linearGradient id="logoBlue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e4080"/>
        <stop offset="50%" stopColor="#16306C"/>
        <stop offset="100%" stopColor="#0d1f45"/>
      </linearGradient>
      <filter id="innerShadow">
        <feOffset dx="0" dy="2"/>
        <feGaussianBlur stdDeviation="2" result="offset-blur"/>
        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
        <feFlood floodColor="#000" floodOpacity="0.3" result="color"/>
        <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
        <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#logoBlue)" filter="url(#innerShadow)"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="url(#logoGold)" strokeWidth="4"/>
    <circle cx="50" cy="50" r="32" fill="none" stroke="url(#logoGold)" strokeWidth="2" opacity="0.5"/>
    <text x="50" y="62" textAnchor="middle" fill="url(#logoGold)" fontSize="36" fontWeight="bold" fontFamily="Georgia, serif">O</text>
  </svg>
);

export default function MemoryGame({ onClose }) {
  const { t } = useLanguage();

  // 3D Card Icons (inside component to access t() for translations)
  const cardIcons = useMemo(() => [
    {
      id: 'logo',
      name: t('cardLogo') || 'Логотип',
      icon: <BankLogo3D size={70} />
    },
    {
      id: 'shield',
      name: t('cardShield') || 'Щит',
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 64 64" style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'}}>
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e4080"/>
              <stop offset="100%" stopColor="#16306C"/>
            </linearGradient>
          </defs>
          <path d="M32 4 L56 14 V30 C56 48 32 60 32 60 C32 60 8 48 8 30 V14 Z" fill="url(#shieldGrad)"/>
          <path d="M32 10 L50 18 V29 C50 43 32 53 32 53 C32 53 14 43 14 29 V18 Z" fill="none" stroke="#F9BF3F" strokeWidth="2"/>
          <path d="M22 32 L28 38 L42 24" stroke="#F9BF3F" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'star',
      name: t('cardStar') || 'Звезда',
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 64 64" style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'}}>
          <defs>
            <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700"/>
              <stop offset="50%" stopColor="#F9BF3F"/>
              <stop offset="100%" stopColor="#DAA520"/>
            </linearGradient>
          </defs>
          <path d="M32 4 L38 24 L58 24 L42 36 L48 56 L32 44 L16 56 L22 36 L6 24 L26 24 Z" fill="url(#starGrad)"/>
          <path d="M32 12 L36 24 L48 24 L38 32 L42 44 L32 36 L22 44 L26 32 L16 24 L28 24 Z" fill="#fff" opacity="0.3"/>
        </svg>
      )
    },
    {
      id: 'coin',
      name: t('cardCoin') || 'Монета',
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 64 64" style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'}}>
          <defs>
            <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700"/>
              <stop offset="30%" stopColor="#F9BF3F"/>
              <stop offset="70%" stopColor="#DAA520"/>
              <stop offset="100%" stopColor="#B8860B"/>
            </linearGradient>
            <linearGradient id="coinInner" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF8DC"/>
              <stop offset="100%" stopColor="#F9BF3F"/>
            </linearGradient>
          </defs>
          <ellipse cx="32" cy="34" rx="26" ry="26" fill="#B8860B"/>
          <ellipse cx="32" cy="30" rx="26" ry="26" fill="url(#coinGrad)"/>
          <ellipse cx="32" cy="30" rx="20" ry="20" fill="none" stroke="url(#coinInner)" strokeWidth="2"/>
          <text x="32" y="38" textAnchor="middle" fill="#16306C" fontSize="24" fontWeight="bold" fontFamily="Georgia">$</text>
        </svg>
      )
    },
    {
      id: 'card',
      name: t('cardMap') || 'Карта',
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 64 64" style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'}}>
          <defs>
            <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e4080"/>
              <stop offset="100%" stopColor="#16306C"/>
            </linearGradient>
          </defs>
          <rect x="4" y="12" width="56" height="40" rx="4" fill="url(#cardGrad)"/>
          <rect x="4" y="20" width="56" height="10" fill="#F9BF3F"/>
          <rect x="10" y="40" width="20" height="6" rx="2" fill="#F9BF3F" opacity="0.7"/>
          <rect x="34" y="40" width="10" height="6" rx="2" fill="#F9BF3F" opacity="0.5"/>
        </svg>
      )
    },
    {
      id: 'lock',
      name: t('cardLock') || 'Замок',
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 64 64" style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'}}>
          <defs>
            <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F9BF3F"/>
              <stop offset="100%" stopColor="#DAA520"/>
            </linearGradient>
          </defs>
          <rect x="12" y="28" width="40" height="32" rx="4" fill="url(#lockGrad)"/>
          <path d="M20 28 V20 C20 10 44 10 44 20 V28" fill="none" stroke="url(#lockGrad)" strokeWidth="6" strokeLinecap="round"/>
          <circle cx="32" cy="42" r="6" fill="#16306C"/>
          <rect x="30" y="42" width="4" height="10" fill="#16306C"/>
        </svg>
      )
    },
    {
      id: 'user',
      name: t('cardClient') || 'Клиент',
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 64 64" style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'}}>
          <defs>
            <linearGradient id="userGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e4080"/>
              <stop offset="100%" stopColor="#16306C"/>
            </linearGradient>
          </defs>
          <circle cx="32" cy="20" r="14" fill="url(#userGrad)"/>
          <ellipse cx="32" cy="54" rx="22" ry="14" fill="url(#userGrad)"/>
          <circle cx="32" cy="20" r="10" fill="#F9BF3F" opacity="0.3"/>
        </svg>
      )
    },
    {
      id: 'diamond',
      name: t('cardPremium') || 'Премиум',
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 64 64" style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'}}>
          <defs>
            <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#87CEEB"/>
              <stop offset="30%" stopColor="#4169E1"/>
              <stop offset="70%" stopColor="#1e4080"/>
              <stop offset="100%" stopColor="#16306C"/>
            </linearGradient>
          </defs>
          <path d="M32 4 L52 20 L32 60 L12 20 Z" fill="url(#diamondGrad)"/>
          <path d="M12 20 L32 20 L32 60 Z" fill="#fff" opacity="0.2"/>
          <path d="M32 4 L32 20 L12 20 Z" fill="#fff" opacity="0.3"/>
          <path d="M32 4 L52 20 L32 20 Z" fill="#000" opacity="0.1"/>
        </svg>
      )
    },
  ], [t]);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    return JSON.parse(localStorage.getItem('memoryGameBest') || '{"moves":999,"time":9999}');
  });

  // Timer
  useEffect(() => {
    let interval;
    if (isStarted && !gameWon) {
      interval = setInterval(() => setTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, gameWon]);

  // Initialize game
  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const gameCards = [...cardIcons, ...cardIcons]
      .map((card, index) => ({ ...card, uniqueId: index }))
      .sort(() => Math.random() - 0.5);
    setCards(gameCards);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTime(0);
    setGameWon(false);
    setIsStarted(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCardClick = (uniqueId) => {
    if (!isStarted) setIsStarted(true);
    if (flipped.length === 2) return;
    if (flipped.includes(uniqueId)) return;
    if (matched.includes(uniqueId)) return;

    const newFlipped = [...flipped, uniqueId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      const firstCard = cards.find(c => c.uniqueId === first);
      const secondCard = cards.find(c => c.uniqueId === second);

      if (firstCard.id === secondCard.id) {
        setTimeout(() => {
          setMatched(prev => [...prev, first, second]);
          setFlipped([]);

          // Check win
          if (matched.length + 2 === cards.length) {
            setGameWon(true);
            const newMoves = moves + 1;
            if (newMoves < bestScore.moves || (newMoves === bestScore.moves && time < bestScore.time)) {
              const newBest = { moves: newMoves, time };
              setBestScore(newBest);
              localStorage.setItem('memoryGameBest', JSON.stringify(newBest));
            }
          }
        }, 300);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#16306C] to-[#1a3d7a]">
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-secondary/20"
              style={{
                width: Math.random() * 10 + 5,
                height: Math.random() * 10 + 5,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="gameGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F9BF3F" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gameGrid)" />
          </svg>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 md:p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <BankLogo3D size={50} />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{t('memoryGame') || 'Memory Game'}</h1>
                <p className="text-secondary text-sm md:text-base">{t('findAllPairs')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 border border-white/20"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex-shrink-0 px-4 md:px-6 pb-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-2xl">
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white drop-shadow">{moves}</div>
                  <div className="text-xs md:text-sm text-white/60 uppercase tracking-wider">{t('moves')}</div>
                </div>
                <div className="w-px h-12 bg-white/20"></div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-secondary drop-shadow">{formatTime(time)}</div>
                  <div className="text-xs md:text-sm text-white/60 uppercase tracking-wider">{t('time')}</div>
                </div>
                <div className="w-px h-12 bg-white/20"></div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-green-400 drop-shadow">{matched.length / 2}/{cards.length / 2}</div>
                  <div className="text-xs md:text-sm text-white/60 uppercase tracking-wider">{t('found')}</div>
                </div>
                <div className="w-px h-12 bg-white/20 hidden md:block"></div>
                <div className="text-center hidden md:block">
                  <div className="text-xl font-bold text-yellow-300 drop-shadow">
                    {bestScore.moves === 999 ? '—' : `${bestScore.moves} / ${formatTime(bestScore.time)}`}
                  </div>
                  <div className="text-xs text-white/60 uppercase tracking-wider">{t('bestScore')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          {gameWon ? (
            <div className="text-center animate-fade-in">
              <div className="text-8xl mb-6 animate-bounce">🎉</div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">{t('victory')}</h2>
              <p className="text-xl text-white/80 mb-2">{t('youFoundAllPairs')}</p>
              <p className="text-2xl text-secondary mb-6">
                {moves} {t('movesIn')} {formatTime(time)}
              </p>
              {(moves < bestScore.moves || (moves === bestScore.moves && time <= bestScore.time)) && (
                <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl px-6 py-3 mb-6 inline-block border border-yellow-500/30">
                  <span className="text-yellow-300 text-xl font-bold">🏆 {t('newRecord')}</span>
                </div>
              )}
              <div>
                <button
                  onClick={initGame}
                  className="px-8 py-4 bg-gradient-to-r from-secondary to-yellow-500 text-primary font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-2xl"
                >
                  {t('playAgain')}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-2xl w-full">
              {cards.map((card) => {
                const isFlipped = flipped.includes(card.uniqueId) || matched.includes(card.uniqueId);
                const isMatched = matched.includes(card.uniqueId);

                return (
                  <div
                    key={card.uniqueId}
                    className="aspect-square perspective-1000"
                    style={{ perspective: '1000px' }}
                  >
                    <button
                      onClick={() => handleCardClick(card.uniqueId)}
                      disabled={isMatched || flipped.length === 2}
                      className={`
                        w-full h-full relative transition-all duration-500 transform-style-3d cursor-pointer
                        ${isFlipped ? 'rotate-y-180' : ''}
                        ${isMatched ? 'scale-95 opacity-70' : 'hover:scale-105'}
                      `}
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* Card Back */}
                      <div
                        className="absolute inset-0 rounded-xl flex items-center justify-center backface-hidden"
                        style={{
                          backfaceVisibility: 'hidden',
                          background: 'linear-gradient(145deg, #1e4080, #16306C)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }}
                      >
                        <div className="absolute inset-2 rounded-lg border-2 border-secondary/30 flex items-center justify-center">
                          <BankLogo3D size={40} />
                        </div>
                      </div>

                      {/* Card Front */}
                      <div
                        className="absolute inset-0 rounded-xl flex items-center justify-center backface-hidden"
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)'
                        }}
                      >
                        <div className="transform scale-90">
                          {card.icon}
                        </div>
                        {isMatched && (
                          <div className="absolute inset-0 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-12 h-12 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 text-center">
          <button
            onClick={initGame}
            className="text-white/60 hover:text-white transition-colors text-sm flex items-center justify-center mx-auto space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{t('startOver')}</span>
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
