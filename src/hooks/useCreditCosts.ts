'use client';

import { useState, useEffect } from 'react';

interface CreditCosts {
  text_generation: number;
  image_generation: number;
}

export function useCreditCosts() {
  const [costs, setCosts] = useState<CreditCosts>({ 
    text_generation: 1, 
    image_generation: 4 
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCosts = async () => {
      try {
        const response = await fetch('/api/user/credits');
        if (response.ok) {
          const data = await response.json();
          if (data.costs) {
            setCosts(data.costs);
          }
        }
      } catch (error) {
        console.error('Failed to fetch credit costs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCosts();
  }, []);

  return { costs, isLoading };
}