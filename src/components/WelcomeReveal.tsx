import React from "react";

const WelcomeReveal: React.FC = () => {
  return (
    <div className="welcome-header">
      <div className="swap-stage">
        <div className="animation-group">
          <span className="basket">🛒</span>
          <div className="text-mask">
            <div className="text-mask-inner">
              <h1 className="welcome-text">Welcome</h1>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .welcome-header {
          background: linear-gradient(180deg, #1f8b4c 0%, #16703c 100%);
          padding: 40px 0 60px;
          text-align: center;
          overflow: hidden;
        }

        .swap-stage {
          position: relative;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* 
          The animation group stays perfectly centered. 
          As the mask grows, the basket naturally slides left.
        */
        .animation-group {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .basket {
          font-size: 32px;
          z-index: 2;
          /* No keyframes needed here; it moves organically with the flex layout */
        }

        /* 
          Grid transition trick: 0fr to 1fr smoothly animates width from 0 
          to exact max-content of the text without hardcoded pixel values.
        */
        .text-mask {
          display: grid;
          grid-template-columns: 0fr;
          animation: revealText 5s ease-in-out infinite;
        }

        .text-mask-inner {
          overflow: hidden;
          min-width: 0; /* CRITICAL: allows the grid item to shrink to 0 */
        }

        .welcome-text {
          font-size: 28px;
          font-family: 'Outfit', 'Poppins', system-ui, sans-serif;
          font-weight: 800;
          color: #fff;
          letter-spacing: 1px;
          white-space: nowrap;
          margin: 0;
          padding-left: 8px; /* Balanced spacing between basket and text */
        }

        /* Mask grows to reveal text, then shrinks back to "swallow" it */
        @keyframes revealText {
          0%, 15% { grid-template-columns: 0fr; }
          40%, 60% { grid-template-columns: 1fr; }
          85%, 100% { grid-template-columns: 0fr; }
        }
      `}</style>
    </div>
  );
};

export default WelcomeReveal;
