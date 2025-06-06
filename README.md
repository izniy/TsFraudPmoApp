# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# Web Scraping Educational Content

The project includes a web scraping script to collect scam education articles from various Singapore-based websites. The script is located in `scripts/scrapeEducationContent.js`.

## Setup

1. Ensure you have the required environment variables in your `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

2. The script requires the following dependencies (already included in package.json):
- axios: For making HTTP requests
- cheerio: For parsing HTML content
- dotenv: For loading environment variables

## Database Schema

The scraped articles are stored in the `educational_articles` table with the following structure:

- id: UUID (primary key)
- title: Text (article title)
- content: Text (article content)
- image_url: Text (URL to article image or placeholder)
- source_url: Text (original article URL)
- created_at: Timestamp
- updated_at: Timestamp

## Running the Script

To run the web scraping script:

```bash
npm run scrape
```

The script will:
1. Scrape articles from configured sources
2. Check for duplicates before insertion
3. Insert new articles into the Supabase database
4. Log the number of articles inserted and skipped

## Adding New Sources

To add a new source:

1. Create a new scraper function following the pattern of `scrapeScamShield()`
2. Add the new scraper to the `main()` function
3. Ensure proper error handling and logging

## Security

- The script uses appropriate request headers to avoid being blocked
- Row Level Security (RLS) is enabled on the database table
- Only the service role can insert new articles
- All users can read articles

## Error Handling

The script includes comprehensive error handling:
- HTTP request errors
- HTML parsing errors
- Database operation errors
- Duplicate article detection

## Maintenance

Regular maintenance tasks:
1. Update User-Agent strings if needed
2. Monitor for changes in website structures
3. Add new sources as they become available
4. Review and update scraping patterns if site layouts change
