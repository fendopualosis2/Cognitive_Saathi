// Simple, universally recognizable everyday objects for memory games
export interface SimpleObjectItem {
  id: string;
  name: string;
  symbol: string;
  category: string;
  image: string;
}

export const SIMPLE_OBJECTS_CATALOG: SimpleObjectItem[] = [
  {
    id: 'apple',
    name: 'Apple',
    symbol: '🍎',
    category: 'Fruit',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'clock',
    name: 'Clock',
    symbol: '⏰',
    category: 'Household',
    image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'key',
    name: 'Key',
    symbol: '🔑',
    category: 'Everyday',
    image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'cup',
    name: 'Coffee Cup',
    symbol: '☕',
    category: 'Kitchen',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'book',
    name: 'Book',
    symbol: '📖',
    category: 'Reading',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'flower',
    name: 'Flower',
    symbol: '🌸',
    category: 'Nature',
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sun',
    name: 'Sun',
    symbol: '☀️',
    category: 'Nature',
    image: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'tree',
    name: 'Tree',
    symbol: '🌳',
    category: 'Nature',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'bell',
    name: 'Bell',
    symbol: '🔔',
    category: 'Household',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'house',
    name: 'House',
    symbol: '🏠',
    category: 'Everyday',
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'lamp',
    name: 'Lamp',
    symbol: '💡',
    category: 'Household',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'umbrella',
    name: 'Umbrella',
    symbol: '☂️',
    category: 'Everyday',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'guitar',
    name: 'Guitar',
    symbol: '🎸',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'bicycle',
    name: 'Bicycle',
    symbol: '🚲',
    category: 'Outdoors',
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'heart',
    name: 'Heart',
    symbol: '❤️',
    category: 'Symbol',
    image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'star',
    name: 'Star',
    symbol: '⭐',
    category: 'Symbol',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&auto=format&fit=crop&q=80',
  },
];
