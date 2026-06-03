import React from 'react';

export function AnimatedBackground() {
  const items = [
    { cx: 5, cy: 20, svg: 'cart', size: 76, delay: 0 },
    { cx: 16, cy: 68, svg: 'apple', size: 58, delay: 1 },
    { cx: 24, cy: 34, svg: 'box', size: 70, delay: 2 },
    { cx: 38, cy: 78, svg: 'banana', size: 62, delay: 3 },
    { cx: 48, cy: 20, svg: 'tag', size: 56, delay: 4 },
    { cx: 60, cy: 60, svg: 'orange', size: 62, delay: 5 },
    { cx: 72, cy: 28, svg: 'bag', size: 70, delay: 6 },
    { cx: 84, cy: 72, svg: 'grapes', size: 54, delay: 7 },
    { cx: 93, cy: 18, svg: 'cart', size: 76, delay: 8 }
  ];

  const renderIcon = (type: string) => {
    switch (type) {
      case 'cart':
        return (
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6h15l-1.5 9h-12L4 2H2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'box':
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16V8a1 1 0 00-.553-.894l-8-4a1 1 0 00-.894 0l-8 4A1 1 0 003 8v8a1 1 0 00.553.894l8 4a1 1 0 00.894 0l8-4A1 1 0 0021 16z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'tag':
        return (
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.59 13.41L11 3.83 3.83 11 13.41 20.59 20.59 13.41z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'bag':
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 2h12v4a2 2 0 01-2 2H8a2 2 0 01-2-2V2zM3 8h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'apple':
        return (
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 7c-3 0-5 2.2-5 5.2C7 16.2 9.4 20 12 20s5-3.8 5-7.8C17 9.2 15 7 12 7z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 5c1.4-1.4 2.7-1.8 4-1.8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            <path d="M12.2 5.2c-.2-1.2-.8-2.2-1.8-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
        );
      case 'banana':
        return (
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6c1.8 7.4 5.7 10.7 10.7 10.7 1.7 0 3.2-.4 4.3-1.2-1 3-3.9 5.5-7.6 5.5-4.9 0-8.7-3.8-8.7-8.7C4.7 9 5.2 7.2 6 6z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5.2 5.2c.7-.7 1.7-1.2 2.8-1.3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
        );
      case 'orange':
        return (
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="13" r="6.2" stroke="currentColor" strokeWidth="1.25"/>
            <path d="M12 7c0-1.7.8-2.8 2.4-3.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            <path d="M13.3 6.6c1.5-.2 2.8.2 3.6 1.2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
        );
      case 'grapes':
        return (
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4c1.9 0 3.5 1.3 4 3.1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            <circle cx="12" cy="8.2" r="2" stroke="currentColor" strokeWidth="1.25"/>
            <circle cx="9.2" cy="11.3" r="2" stroke="currentColor" strokeWidth="1.25"/>
            <circle cx="14.8" cy="11.3" r="2" stroke="currentColor" strokeWidth="1.25"/>
            <circle cx="10.5" cy="14.5" r="2" stroke="currentColor" strokeWidth="1.25"/>
            <circle cx="13.5" cy="14.5" r="2" stroke="currentColor" strokeWidth="1.25"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animated-bg pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {items.map((it, idx) => (
        <div
          key={idx}
          className="bg-item"
          style={{
            left: `${it.cx}%`,
            top: `${it.cy}%`,
            animationDelay: `${it.delay}s`,
            width: `${it.size}px`,
            height: `${it.size}px`,
            color: ['#ff7a59', '#ffd166', '#6ee7b7', '#60a5fa', '#f472b6'][idx % 5]
          }}
        >
          {renderIcon(it.svg)}
        </div>
      ))}
    </div>
  );
}
