import { useState, useEffect } from 'react';

/**
 * AnnouncementBanner Component
 *
 * Displays announcement banners at the top of pages.
 *
 * Props:
 *   - type: 'student' | 'public' - which announcements to show
 *     - 'student': Shows both student and public announcements (for logged-in pages)
 *     - 'public': Shows only public announcements (for landing page)
 */
export default function AnnouncementBanner({ type = 'student' }) {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    fetchAnnouncements();

    // Load dismissed announcements from localStorage
    const saved = localStorage.getItem('dismissedAnnouncements');
    if (saved) {
      try {
        setDismissed(JSON.parse(saved));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [type]);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`/api/announcements?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  const handleLinkClick = async (announcement) => {
    if (!announcement.link_url) return;

    // Track the click
    try {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: announcement.id }),
      });
    } catch (err) {
      // Don't block navigation on tracking failure
    }

    // Open link
    window.open(announcement.link_url, '_blank', 'noopener,noreferrer');
  };

  const handleDismiss = (id) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
  };

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(a => !dismissed.includes(a.id));

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="announcement-banners">
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className="announcement-banner"
          style={{
            backgroundColor: announcement.background_color || '#3b82f6',
            color: announcement.text_color || '#ffffff',
          }}
        >
          <div className="announcement-content">
            <span className="announcement-message">{announcement.message}</span>
            {announcement.link_url && (
              <button
                className="announcement-link"
                onClick={() => handleLinkClick(announcement)}
                style={{ color: announcement.text_color || '#ffffff' }}
              >
                {announcement.link_text || 'Learn More'} →
              </button>
            )}
          </div>
          <button
            className="announcement-dismiss"
            onClick={() => handleDismiss(announcement.id)}
            aria-label="Dismiss announcement"
            style={{ color: announcement.text_color || '#ffffff' }}
          >
            ×
          </button>
        </div>
      ))}

      <style jsx>{`
        .announcement-banners {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
        }

        .announcement-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .announcement-content {
          display: flex;
          align-items: center;
          gap: 15px;
          flex: 1;
          justify-content: center;
          flex-wrap: wrap;
        }

        .announcement-message {
          text-align: center;
        }

        .announcement-link {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .announcement-link:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .announcement-dismiss {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0 5px;
          opacity: 0.7;
          transition: opacity 0.2s;
          line-height: 1;
        }

        .announcement-dismiss:hover {
          opacity: 1;
        }

        @media (max-width: 600px) {
          .announcement-banner {
            padding: 8px 15px;
            font-size: 13px;
          }

          .announcement-content {
            gap: 10px;
          }

          .announcement-link {
            padding: 3px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
