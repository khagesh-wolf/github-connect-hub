import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'chiyadani-favorites';

export function useFavorites(phone: string) {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    if (!phone) return;
    
    try {
      const stored = localStorage.getItem(`${FAVORITES_KEY}-${phone}`);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, [phone]);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    if (!phone) return;
    
    try {
      localStorage.setItem(`${FAVORITES_KEY}-${phone}`, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const toggleFavorite = (menuItemId: string) => {
    const newFavorites = favorites.includes(menuItemId)
      ? favorites.filter(id => id !== menuItemId)
      : [...favorites, menuItemId];
    saveFavorites(newFavorites);
  };

  const isFavorite = (menuItemId: string) => favorites.includes(menuItemId);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  };
}
