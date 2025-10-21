import { useEffect } from 'react';

export const useParallax = () => {
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      
      // Background elements move 50% slower
      const backgroundElements = document.querySelectorAll('.parallax-background');
      backgroundElements.forEach((element) => {
        const speed = 0.5;
        const yPos = scrolled * speed;
        (element as HTMLElement).style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
      
      // Orb elements move at different speeds for enhanced parallax
      const slowElements = document.querySelectorAll('.parallax-slow');
      slowElements.forEach((element) => {
        const speed = 0.3;
        const yPos = scrolled * speed;
        (element as HTMLElement).style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
      
      const mediumElements = document.querySelectorAll('.parallax-medium');
      mediumElements.forEach((element) => {
        const speed = 0.6;
        const yPos = scrolled * speed;
        (element as HTMLElement).style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
      
      const fastElements = document.querySelectorAll('.parallax-fast');
      fastElements.forEach((element) => {
        const speed = 0.8;
        const yPos = scrolled * speed;
        (element as HTMLElement).style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
      
      const ultraSlowElements = document.querySelectorAll('.parallax-ultra-slow');
      ultraSlowElements.forEach((element) => {
        const speed = 0.2;
        const yPos = scrolled * speed;
        (element as HTMLElement).style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
      
      const driftElements = document.querySelectorAll('.parallax-drift');
      driftElements.forEach((element) => {
        const speed = 0.7;
        const yPos = scrolled * speed;
        (element as HTMLElement).style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
};