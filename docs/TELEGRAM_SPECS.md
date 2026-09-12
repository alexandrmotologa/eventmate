# Telegram specifications

This document outlines the bot commands, inline queries, and Mini App integration specifications for EventMate.

## Bot commands

| Command | Arguments | Scope | Description |
| :--- | :--- | :--- | :--- |
| `/start` | None | Private / Group | Displays welcome greeting, usage summary, and a button to launch the EventMate Studio. |
| `/meet` | `[title]` | Group / Private | Creates a 2D availability scheduling session for the next three days and posts an inline button to paint availability. |
| `/poll` | `[title]` | Group / Private | Creates a ranked-choice voting poll for the group. |
| `/golden` | `[event_id]` | Group / Private | Analyzes availability slots and posts the top three Golden Hour windows with quorum percentages. |
| `/help` | None | Private / Group | Displays command documentation and syntax examples. |

## Inline query interface

Users can type `@EventMateBot [event title]` in any Telegram chat to share an invitation card.

### Query response format
- **Type**: `article`
- **ID**: `eventmate-invite`
- **Title**: `Plan: [Title]`
- **Description**: `Invite members to paint availability on a 2D matrix`
- **Reply markup**: Inline keyboard with a `web_app` button pointing to the Mini App URL.

## Mini App webview integration

The client application utilizes the Telegram WebApp JavaScript bridge (`https://telegram.org/js/telegram-web-app.js` and `@twa-dev/sdk`).

### Initialization lifecycle
1. `window.Telegram.WebApp.ready()`: Signals to the Telegram client that the web application has finished loading.
2. `window.Telegram.WebApp.expand()`: Expands the Mini App webview to full vertical height.
3. Theme synchronization: Extracts background and accent colors from `window.Telegram.WebApp.themeParams`.

### Haptic feedback triggers
- `selectionChanged()`: Triggered on every cell painted or cleared during touch drag interactions.
- `notificationOccurred('success')`: Fired after availability submissions, slot locks, and ranked ballot submissions.
- `notificationOccurred('warning')`: Fired when validation fails.

## initData signature verification

Each HTTP request originating from the Telegram Mini App provides an `initData` query string. The backend verifies the authenticity of this string using the bot token.

### Verification algorithm
1. Parse the query string into key-value pairs.
2. Extract and remove the `hash` parameter.
3. Sort the remaining parameters in alphabetical order by key.
4. Construct the data check string by joining pairs with newline characters (`\n`): `key=value`.
5. Compute secret key using HMAC-SHA256: `secretKey = HMAC_SHA256("WebAppData", botToken)`.
6. Compute signature: `calculatedHash = HMAC_SHA256(secretKey, dataCheckString).hex()`.
7. Verify that `calculatedHash` equals the received `hash`.
8. In demo mode (`DEMO_MODE=true`), authentication checks allow local requests without live Telegram signatures.
