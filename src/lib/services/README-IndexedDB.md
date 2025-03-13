# IndexedDB Integration with Dexie.js

This application uses IndexedDB to store and manage all data persistently in the browser. The implementation leverages Dexie.js, a minimalistic wrapper around IndexedDB that provides a clean and simple API.

## Database Structure

The database structure is defined in `src/lib/services/db.ts` and consists of the following tables:

1. **chats** - Stores basic chat information
   - Primary key: `id`
   - Indexes: `title`, `updatedAt`, `createdAt`

2. **messages** - Stores all messages
   - Primary key: `id`
   - Indexes: `chatId`, `role`, `timestamp`

3. **mediaItems** - Stores media attachments 
   - Primary key: `id`
   - Indexes: `messageId`, `type`, `timestamp`

4. **settings** - Stores user settings
   - Primary key: `id`

## Data Flow

The data flow is structured as follows:

1. The database (`db.ts`) handles all direct interactions with IndexedDB
2. Stores (`chatStore.ts` and `settingsStore.ts`) interact with the database and maintain reactive state
3. UI components interact with the stores, not directly with the database

## Initialization Process

The application initializes in the following order:

1. `+layout.ts` loads when the application starts
2. The database is initialized via `db.initialize()` 
3. If there are existing chats/settings in localStorage, they are migrated to IndexedDB
4. The stores are initialized (`settingsStore.init()` and `chatStore.init()`)
5. The UI renders with data from the stores

## Benefits Over localStorage

- **Larger Storage Capacity**: IndexedDB offers much more storage space (typically 50-100MB or more) compared to localStorage's 5-10MB limit
- **Structured Data**: Better organization with tables and indexes
- **Asynchronous API**: Non-blocking operations for better performance
- **Complex Data Types**: Native support for storing objects, arrays, and binary data
- **Transaction Support**: ACID-compliant transactions for data integrity

## Media Storage

Media files are stored as follows:

- Small media items are stored directly in the database as data URLs or Base64 strings
- The `mediaItems` table stores metadata and references to the actual content
- Each media item is linked to a specific message via the `messageId` field

## Migrating from localStorage

When the application first runs with this implementation, it automatically:

1. Checks for existing data in localStorage
2. If found, migrates this data to the IndexedDB database
3. Preserves all chat history, messages, and settings

The migration code is designed to run only once and maintain data integrity during the transition.

## Future Expansion

This IndexedDB implementation provides a foundation for:

- Handling larger media files
- Implementing offline capabilities
- Adding client-side search functionality
- Synchronizing with a server database if needed 