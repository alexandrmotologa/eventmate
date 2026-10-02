import { Bot, InlineKeyboard } from 'grammy';
import { getDatabase } from '../db/database.js';
import { DEMO_EVENT_ID } from '../engine/seeder.js';
import { computeQuorumMatrix, findGoldenHours, Participant, SlotAvailability } from '../engine/overlap.js';

export function setupBot(token: string, webAppUrl: string): Bot | null {
  if (!token || token === 'mock_token' || token === 'YOUR_TELEGRAM_BOT_TOKEN') {
    console.log('[Telegram Bot] Mock token detected. Bot long polling skipped in demo/local mode.');
    return null;
  }

  const bot = new Bot(token);
  const db = getDatabase();

  // /start command
  bot.command('start', async (ctx) => {
    const keyboard = new InlineKeyboard().webApp('🟢 Open EventMate Studio', webAppUrl);

    await ctx.reply(
      `👋 *Welcome to EventMate!* 🦦\n\n` +
        `Stop scheduling chaos in your Telegram groups. EventMate lets your group paint availability schedules on a 2D calendar matrix and decide on locations using Ranked-Choice Voting.\n\n` +
        `Commands:\n` +
        `• \`/meet [title]\` — Start a group availability schedule\n` +
        `• \`/poll [title]\` — Start a ranked-choice group poll\n` +
        `• \`/golden\` — View top Golden Hours for the latest event\n` +
        `• \`/summary\` — View combined meetup & voting summary\n` +
        `• \`/help\` — Detailed instructions and inline bot features`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  });

  // /meet command
  bot.command('meet', async (ctx) => {
    const text = ctx.match?.trim() || 'Group Meetup';
    const chatId = ctx.chat.id.toString();
    const creatorName = ctx.from?.first_name || 'Member';
    const creatorId = ctx.from?.id ? ctx.from.id.toString() : 'tg-user';

    const eventId = 'ev-' + Date.now().toString(36);
    // Default dates: next 3 days
    const today = new Date();
    const dates: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    db.prepare(`
      INSERT INTO events (
        id, title, description, creator_id, creator_name, timezone,
        dates_json, start_hour, end_hour, slot_duration_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      text,
      `Scheduled in Telegram group ${ctx.chat.type === 'private' ? 'private' : ctx.chat.title || 'chat'}`,
      creatorId,
      creatorName,
      'UTC',
      JSON.stringify(dates),
      17,
      23,
      30
    );

    // Insert creator
    db.prepare(`
      INSERT INTO participants (id, event_id, telegram_user_id, name, avatar_color, is_required)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run('p-' + Date.now().toString(36), eventId, creatorId, creatorName, '#10B981');

    const appLaunchUrl = `${webAppUrl}?eventId=${eventId}`;
    const keyboard = new InlineKeyboard().webApp('🟢 Paint My Availability', appLaunchUrl);

    await ctx.reply(
      `📅 *New Event:* ${text}\n` +
        `Organized by *${creatorName}*\n\n` +
        `Tap below to paint the hours you are free. The bot will automatically detect the Golden Hour where everyone can attend!`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  });

  // /poll command
  bot.command('poll', async (ctx) => {
    const text = ctx.match?.trim() || 'Group Location Decision';
    const pollId = 'poll-' + Date.now().toString(36);

    db.prepare(`
      INSERT INTO polls (id, title, description, status)
      VALUES (?, ?, ?, ?)
    `).run(pollId, text, 'Ranked-choice poll created via Telegram group', 'OPEN');

    const defaultOptions = [
      { text: 'Trattoria / Italian', icon: '🍕', order: 1 },
      { text: 'Sushi & Asian Fusion', icon: '🍣', order: 2 },
      { text: 'Burger & Craft Beer', icon: '🍔', order: 3 },
      { text: 'Tacos & Cocktails', icon: '🌮', order: 4 },
    ];

    const insertOpt = db.prepare(`
      INSERT INTO poll_options (id, poll_id, text, icon, display_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    defaultOptions.forEach((opt, idx) => {
      insertOpt.run(`opt-${Date.now().toString(36)}-${idx + 1}`, pollId, opt.text, opt.icon, opt.order);
    });

    const appLaunchUrl = `${webAppUrl}?pollId=${pollId}`;
    const keyboard = new InlineKeyboard().webApp('🗳️ Cast Ranked Ballot', appLaunchUrl);

    await ctx.reply(
      `🗳️ *New Ranked-Choice Poll:* ${text}\n\n` +
        `Eliminate group indecision! Tap below to drag and rank options in order of your preference. Instant-Runoff will pick the true consensus winner.`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  });

  // /summary command
  bot.command('summary', async (ctx) => {
    const event: any = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 1').get();
    if (!event) {
      return ctx.reply('No active scheduling events found. Use /meet to create one.');
    }

    const participants: any[] = db
      .prepare('SELECT id, name, avatar_color as avatarColor, is_required as isRequired FROM participants WHERE event_id = ?')
      .all(event.id);
    const slots: any[] = db
      .prepare('SELECT participant_id as participantId, slot_key as slotKey, state FROM availability_slots WHERE event_id = ?')
      .all(event.id);

    const dates: string[] = JSON.parse(event.dates_json || '[]');
    const domainParticipants = participants.map((p) => ({
      id: p.id,
      name: p.name,
      avatarColor: p.avatarColor,
      isRequired: Boolean(p.isRequired),
    }));
    const domainSlots = slots.map((s) => ({
      participantId: s.participantId,
      slotKey: s.slotKey,
      state: s.state,
    }));

    const goldenHours = findGoldenHours(
      dates,
      event.start_hour,
      event.end_hour,
      event.slot_duration_minutes,
      domainParticipants,
      domainSlots,
      60
    );

    const top = goldenHours[0];
    let summaryText = `📅 *Event Summary: ${event.title}*\n\n`;
    if (top) {
      summaryText += `⏰ *Optimal Time:* ${top.date} ${top.startSlot.slice(11)} – ${top.endSlot.slice(11)}\n`;
      summaryText += `👥 *Confirmed Quorum:* ${top.availableCount}/${top.totalParticipants} free (${top.quorumPercentage}%)\n`;
      summaryText += `✓ Free: ${top.attendeeNames.join(', ')}\n`;
      if (top.missingNames.length > 0) {
        summaryText += `✗ Unavailable: ${top.missingNames.join(', ')}\n`;
      }
    } else {
      summaryText += `⏰ *Time:* Pending availability painting (${participants.length} members in roster)\n`;
    }

    const keyboard = new InlineKeyboard().webApp('🟢 Open Event Studio', `${webAppUrl}?eventId=${event.id}`);
    await ctx.reply(summaryText, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  // /golden command
  bot.command('golden', async (ctx) => {
    // Check demo event or look up latest
    const event: any = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 1').get();
    if (!event) {
      return ctx.reply('No active scheduling events found. Use /meet to create one.');
    }

    const participants: any[] = db
      .prepare('SELECT id, name, avatar_color as avatarColor, is_required as isRequired FROM participants WHERE event_id = ?')
      .all(event.id);
    const slots: any[] = db
      .prepare('SELECT participant_id as participantId, slot_key as slotKey, state FROM availability_slots WHERE event_id = ?')
      .all(event.id);

    const dates: string[] = JSON.parse(event.dates_json || '[]');
    const domainParticipants = participants.map((p) => ({
      id: p.id,
      name: p.name,
      avatarColor: p.avatarColor,
      isRequired: Boolean(p.isRequired),
    }));
    const domainSlots = slots.map((s) => ({
      participantId: s.participantId,
      slotKey: s.slotKey,
      state: s.state,
    }));

    const goldenHours = findGoldenHours(
      dates,
      event.start_hour,
      event.end_hour,
      event.slot_duration_minutes,
      domainParticipants,
      domainSlots,
      60
    );

    if (goldenHours.length === 0) {
      return ctx.reply(`📊 No overlapping slots recorded yet for *${event.title}*. Members need to paint their schedules first!`, {
        parse_mode: 'Markdown',
      });
    }

    const topSlotsFormatted = goldenHours
      .slice(0, 3)
      .map(
        (g, i) =>
          `*#${i + 1}* ${g.date} ${g.startSlot.slice(11)} – ${g.endSlot.slice(11)}\n` +
          `   👥 *${g.availableCount}/${g.totalParticipants} available (${g.quorumPercentage}%)*\n` +
          `   ✓ ${g.attendeeNames.join(', ')}`
      )
      .join('\n\n');

    const keyboard = new InlineKeyboard().webApp('🟢 View Heatmap', `${webAppUrl}?eventId=${event.id}`);

    await ctx.reply(
      `🏆 *Top Golden Hours for ${event.title}:*\n\n${topSlotsFormatted}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  });

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `🦦 *EventMate Telegram Help*\n\n` +
        `• \`/meet [title]\` — Creates an availability grid for group members to paint.\n` +
        `• \`/poll [title]\` — Creates a Ranked-Choice poll to eliminate indecision.\n` +
        `• \`/golden\` — Displays the optimal meeting times with quorum calculation.\n` +
        `• \`/summary\` — Shows an infographic text summary with attendance & voting.\n` +
        `• Inline: Type \`@${ctx.me.username} [meeting title]\` in any chat to send an invite card.`,
      { parse_mode: 'Markdown' }
    );
  });

  // Inline Queries
  bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim() || 'Group Scheduling';
    const appLaunchUrl = `${webAppUrl}?eventId=${DEMO_EVENT_ID}`;

    await ctx.answerInlineQuery([
      {
        type: 'article',
        id: 'eventmate-invite',
        title: `📅 Plan: ${query}`,
        description: 'Invite members to paint their availability on a 2D matrix',
        input_message_content: {
          message_text:
            `📅 *Event:* ${query}\n\n` +
            `Everyone, please paint when you are free so we can find our Golden Hour!`,
          parse_mode: 'Markdown',
        },
        reply_markup: new InlineKeyboard().webApp('🟢 Paint My Availability', appLaunchUrl),
      },
    ]);
  });

  return bot;
}
