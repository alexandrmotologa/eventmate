export interface CalendarLinksOptions {
  title: string;
  description?: string;
  location?: string;
  startDateTime: Date;
  endDateTime: Date;
}

export interface CalendarLinksResult {
  googleUrl: string;
  outlookUrl: string;
  yahooUrl: string;
  startUtc: string;
  endUtc: string;
}

/**
 * Generate 1-click web calendar links for Google Calendar, Outlook Web, and Yahoo Calendar.
 */
export function generateCalendarLinks(opts: CalendarLinksOptions): CalendarLinksResult {
  const { title, description = '', location = '', startDateTime, endDateTime } = opts;

  const formatUtcCompact = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const startUtc = formatUtcCompact(startDateTime);
  const endUtc = formatUtcCompact(endDateTime);

  // Google Calendar URL
  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: description,
    location: location,
  });
  const googleUrl = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

  // Outlook Web URL
  const outlookParams = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: startDateTime.toISOString(),
    enddt: endDateTime.toISOString(),
    subject: title,
    body: description,
    location: location,
  });
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`;

  // Yahoo Calendar URL
  const yahooParams = new URLSearchParams({
    v: '60',
    view: 'd',
    type: '20',
    title: title,
    st: startUtc,
    et: endUtc,
    desc: description,
    in_loc: location,
  });
  const yahooUrl = `https://calendar.yahoo.com/?${yahooParams.toString()}`;

  return {
    googleUrl,
    outlookUrl,
    yahooUrl,
    startUtc,
    endUtc,
  };
}
