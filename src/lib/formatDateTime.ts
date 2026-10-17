/**
 * Utility to format transaction date and exact time in 12-hour AM/PM format.
 */

export interface FormattedDateTime {
  date: string;
  time: string;
  combined: string;
}

export function formatTransactionDateTime(
  dateStr?: string,
  createdAtStr?: string
): FormattedDateTime {
  let dateObj: Date | null = null;
  let timeStr = '';
  let finalDateStr = '';

  // 1. Try to get valid Date from createdAt (has high-precision ISO timestamp)
  if (createdAtStr) {
    const d = new Date(createdAtStr);
    if (!isNaN(d.getTime())) {
      dateObj = d;
      timeStr = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  // 2. If no time found yet, check if dateStr itself is parseable as Date
  if (!timeStr && dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      dateObj = dateObj || d;
      timeStr = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  // 3. If dateStr has a 24h or 12h time substring like "17:14" or "05:14 PM"
  if (!timeStr && dateStr) {
    const timeMatch = dateStr.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?\b/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      const meridiem = timeMatch[3];

      if (meridiem) {
        timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${meridiem.toUpperCase()}`;
      } else {
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
      }
    }
  }

  // 4. Format Date part cleanly (e.g. "09 Oct 2026")
  if (dateStr) {
    // Strip time portion if present in dateStr
    const cleanDateOnly = dateStr
      .replace(/,?\s*\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/gi, '')
      .trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(cleanDateOnly)) {
      // ISO YYYY-MM-DD
      const [y, m, d] = cleanDateOnly.substring(0, 10).split('-');
      const dObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      finalDateStr = dObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(cleanDateOnly)) {
      // DD/MM/YYYY
      const [d, m, y] = cleanDateOnly.split('/');
      const dObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      finalDateStr = dObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } else {
      finalDateStr = cleanDateOnly || (dateObj ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');
    }
  } else if (dateObj) {
    finalDateStr = dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } else {
    finalDateStr = 'N/A';
  }

  const combined = timeStr ? `${finalDateStr} • ${timeStr}` : finalDateStr;

  return {
    date: finalDateStr,
    time: timeStr,
    combined
  };
}
