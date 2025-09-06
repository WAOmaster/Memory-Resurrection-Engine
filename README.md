# Memory Resurrection Engine

AI-powered family photo generation app that reunites families across generations using Google Gemini AI.

## Features

- **Multi-Photo Upload**: Upload historical and current family photos
- **AI-Powered Generation**: Create realistic family reunion scenes using Google Gemini 2.0
- **Scenario Selection**: Choose from 6 different family scenarios (weddings, graduations, holidays, etc.)
- **Conversational Editing**: Refine generated images with natural language prompts
- **Demo Mode**: Try the app without API keys using sample data
- **Production Ready**: Built with React, Tailwind CSS, and modern web standards

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key (optional for demo mode)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Add your Google Gemini API key to `.env`:
```
REACT_APP_GEMINI_API_KEY=your_api_key_here
```

## Getting Your Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to your `.env` file

**Note**: The app works in demo mode without an API key, but you won't get real AI-generated images.

## Available Scripts

### `npm start`
Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm run build`
Builds the app for production to the `build` folder.

### `npm test`
Launches the test runner in interactive watch mode.

### `npm run lint`
Runs ESLint to check code quality.

## Usage

1. **Load Demo Data**: Click "Load Demo" to try the app with sample photos
2. **Upload Photos**: Click to upload your family photos (historical and current)
3. **Select Scenario**: Choose from available family scenarios
4. **Generate Memory**: Click "Create Memory" to generate AI family photos
5. **Edit Conversationally**: Use natural language to refine the generated images

## Scenarios Available

- **Wedding Celebration**: Family wedding scenes
- **Graduation Day**: Academic milestone celebrations  
- **Holiday Gathering**: Festive family traditions
- **Birthday Party**: Multi-generational birthday celebrations
- **Meeting New Baby**: Tender moments with newest family members
- **Family Vacation**: Travel and leisure family scenes

## API Integration

The app uses Google Gemini 2.0 Flash for:
- Multi-image fusion
- Character consistency maintenance
- Photorealistic image generation
- Natural language editing

Estimated cost: $0.039 per image generation.

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Static Hosting
The `build` folder can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting

### Environment Variables for Production
Make sure to set `REACT_APP_GEMINI_API_KEY` in your hosting platform's environment variables.

## Technologies Used

- **React 18**: Modern React with hooks
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icon library
- **Google Gemini AI**: Advanced AI image generation
- **Create React App**: Zero-configuration build tooling

## Project Structure

```
src/
├── components/
│   └── MemoryResurrectionEngine.js    # Main app component
├── services/
│   └── MemoryResurrectionAPI.js       # Google Gemini integration
├── App.js                             # App wrapper
├── index.js                           # React entry point
└── index.css                          # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the GitHub repository.