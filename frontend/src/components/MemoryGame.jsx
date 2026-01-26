import React, { useState, useEffect } from 'react';

// Bank logo SVG component
const BankLogo = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F9BF3F"/>
        <stop offset="100%" stopColor="#e5a520"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="#16306C"/>
    <circle cx="50" cy="50" r="35" fill="none" stroke="url(#logoGrad)" strokeWidth="6"/>
    <text x="50" y="58" textAnchor="middle" fill="url(#logoGrad)" fontSize="28" fontWeight="bold" fontFamily="Arial">O</text>
    <path d="M30 75 L50 85 L70 75" stroke="url(#logoGrad)" strokeWidth="3" fill="none" strokeLinecap="round"/>
  </svg>
);

// Card icons for the game
const cardIcons = [
  { id: 'logo', icon: <BankLogo size={50} /> },
  { id: 'shield', icon: (
    <svg className="w-12 h-12" fill="#16306C" viewBox="0 0 24 24">
      <path d="M12 2L4 6v6c0 5.25 3.4 10.2 8 12 4.6-1.8 8-6.75 8-12V6l-8-4z"/>
    </svg>
  )},
  { id: 'star', icon: (
    <svg className="w-12 h-12" fill="#F9BF3F" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )},
  { id: 'coin', icon: (
    <svg className="w-12 h-12" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#F9BF3F"/>
      <text x="12" y="16" textAnchor="middle" fill="#16306C" fontSize="12" fontWeight="bold">$</text>
    </svg>
  )},
  { id: 'card', icon: (
    <svg className="w-12 h-12" fill="#16306C" viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#16306C"/>
      <rect x="2" y="8" width="20" height="4" fill="#F9BF3F"/>
    </svg>
  )},
  { id: 'lock', icon: (
    <svg className="w-12 h-12" fill="#16306C" viewBox="0 0 24 24">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="#16306C"/>
      <path d="M8 11V7a4 4 0 118 0v4" stroke="#16306C" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="16" r="2" fill="#F9BF3F"/>
    </svg>
  )},
  { id: 'user', icon: (
    <svg className="w-12 h-12" fill="#16306C" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" fill="#16306C"/>
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#16306C"/>
    </svg>
  )},
  { id: 'check', icon: (
    <svg className="w-12 h-12" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#16306C"/>
      <path d="M8 12l3 3 5-6" stroke="#F9BF3F" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
];

export default function MemoryGame({ onClose }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [bestScore, setBestScore] = useState(() => {
    return parseInt(localStorage.getItem('memoryGameBest') || '999');
  });

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
    setGameWon(false);
  };

  const handleCardClick = (uniqueId) => {
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
        setMatched(prev => [...prev, first, second]);
        setFlipped([]);

        // Check win
        if (matched.length + 2 === cards.length) {
          setGameWon(true);
          const newMoves = moves + 1;
          if (newMoves < bestScore) {
            setBestScore(newMoves);
            localStorage.setItem('memoryGameBest', newMoves.toString());
          }
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BankLogo size={40} />
              <div className="ml-3">
                <h2 className="text-xl font-bold">Memory Game</h2>
                <p className="text-sm opacity-80">Найди все пары!</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 py-3 bg-gray-50 border-b">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{moves}</p>
            <p className="text-xs text-gray-500">Ходов</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary">{matched.length / 2}</p>
            <p className="text-xs text-gray-500">Найдено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{bestScore === 999 ? '-' : bestScore}</p>
            <p className="text-xs text-gray-500">Рекорд</p>
          </div>
        </div>

        {/* Game Board */}
        <div className="p-4">
          {gameWon ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-primary mb-2">Победа!</h3>
              <p className="text-gray-600 mb-4">Вы нашли все пары за {moves} ходов!</p>
              {moves <= bestScore && (
                <p className="text-secondary font-semibold mb-4">🏆 Новый рекорд!</p>
              )}
              <button
                onClick={initGame}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Играть снова
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {cards.map((card) => {
                const isFlipped = flipped.includes(card.uniqueId) || matched.includes(card.uniqueId);
                const isMatched = matched.includes(card.uniqueId);

                return (
                  <button
                    key={card.uniqueId}
                    onClick={() => handleCardClick(card.uniqueId)}
                    disabled={isMatched}
                    className={`
                      aspect-square rounded-xl transition-all duration-300 transform
                      ${isFlipped ? 'rotate-y-180' : ''}
                      ${isMatched ? 'opacity-60 scale-95' : 'hover:scale-105'}
                    `}
                    style={{ perspective: '1000px' }}
                  >
                    <div
                      className={`
                        w-full h-full rounded-xl flex items-center justify-center
                        transition-all duration-300 shadow-md
                        ${isFlipped
                          ? 'bg-white border-2 border-secondary'
                          : 'bg-gradient-to-br from-primary to-primary/80 cursor-pointer hover:shadow-lg'
                        }
                      `}
                    >
                      {isFlipped ? (
                        card.icon
                      ) : (
                        <svg className="w-8 h-8 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 text-center border-t">
          <button
            onClick={initGame}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            🔄 Начать заново
          </button>
        </div>
      </div>
    </div>
  );
}
