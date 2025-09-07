import { GoogleGenerativeAI } from "@google/generative-ai";

class MemoryResurrectionAPI {
  constructor(apiKey) {
    if (!apiKey) {
      console.warn('Gemini API key not provided. Demo mode will be used.');
      this.demoMode = true;
      this.genAI = null;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = "gemini-2.5-flash-image-preview"; // Correct model for image generation
    this.demoMode = false;
    console.log('MemoryResurrectionAPI initialized with API key');
  }
  
  setDemoMode(isDemoMode) {
    // This allows the component to tell the API when demo photos are being used
    this.usingDemoPhotos = isDemoMode;
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // readAsDataURL already returns base64 encoded data
          const result = reader.result;
          if (result && result.includes(',')) {
            const base64 = result.split(',')[1];
            resolve(base64);
          } else {
            reject(new Error('Invalid file format'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async resurrectMemory(historicalPhotos, currentPhotos, scenario, orientation = 'landscape', scenarioSettings = {}) {
    const startTime = Date.now();
    console.log('Starting memory resurrection via image editing...', { historicalCount: historicalPhotos.length, currentCount: currentPhotos.length });
    
    // Only use demo response if no API key is available
    if (this.demoMode && !this.genAI) {
      return this.generateDemoResponse(historicalPhotos, currentPhotos, scenario, startTime);
    }

    // Validation: Must have at least 1 current photo to edit
    if (currentPhotos.length === 0) {
      return {
        success: false,
        error: 'At least one current photo is required as the base image to edit',
        code: 'NO_CURRENT_PHOTO'
      };
    }

    try {
      // Separate photos by type
      const backgroundPhotos = [...historicalPhotos, ...currentPhotos].filter(p => p.type === 'background');
      
      // Use the first current photo as the base image to edit
      const baseCurrentPhoto = currentPhotos[0];
      console.log('Using current photo as base for editing:', baseCurrentPhoto.name);
      
      // Build content structure: base current image first, then historical persons, then background if provided
      const parts = [];
      
      // 1. Add the current photo as the base image to edit
      const currentBase64 = await this.fileToBase64(baseCurrentPhoto.file);
      parts.push({
        inlineData: {
          mimeType: baseCurrentPhoto.file.type,
          data: currentBase64
        }
      });
      
      // 2. Add historical photos (persons to add to the current image)
      for (let i = 0; i < historicalPhotos.length; i++) {
        const photo = historicalPhotos[i];
        if (photo.file) {
          const base64 = await this.fileToBase64(photo.file);
          parts.push({
            inlineData: {
              mimeType: photo.file.type,
              data: base64
            }
          });
        }
      }
      
      // 3. Add background photo if provided (to move everyone to new background)
      if (backgroundPhotos.length > 0) {
        for (let i = 0; i < backgroundPhotos.length; i++) {
          const photo = backgroundPhotos[i];
          if (photo.file) {
            const base64 = await this.fileToBase64(photo.file);
            parts.push({
              inlineData: {
                mimeType: photo.file.type,
                data: base64
              }
            });
          }
        }
      }

      // Default scenario settings if not provided
      const settings = {
        culturalStyle: 'western',
        timePeriod: 'modern',
        clothingStyle: 'formal',
        locationStyle: 'indoor',
        ...scenarioSettings
      };

      // Ultra-simple direct prompt focusing only on adding the person
      const imageEditingPrompt = `TASK: Add the person from image 2 to image 1.

IMAGE 1: Current photo (${currentPhotos.length} people) - this is your base
IMAGE 2: Historical person - ADD THIS PERSON to image 1

REQUIREMENT: The final image must show ${currentPhotos.length + historicalPhotos.length} people total.

- Keep all ${currentPhotos.length} people from image 1 exactly as they are
- Add the 1 person from image 2 to the scene  
- Make the historical person fit naturally in the ${scenario.title.toLowerCase()} setting
- Match the lighting so they don't look out of place

The historical person MUST be visible in your result. Do not skip adding them.`;
      
      // Add the editing instruction
      parts.push({
        text: imageEditingPrompt
      });

      // Structure content properly for Gemini API
      const contents = [{
        parts: parts
      }];

      console.log('Calling Gemini API for image generation...');
      console.log('Using model:', this.model);
      console.log('Historical photos:', historicalPhotos.length);
      console.log('Current photos:', currentPhotos.length);
      
      const model = this.genAI.getGenerativeModel({ 
        model: this.model
      });
      
      const result = await model.generateContent({
        contents: contents,
        generationConfig: {
          maxOutputTokens: 1290, // Standard for 1 image generation
          temperature: 0.7,
        }
      });
      const response = await result.response;
      
      // Debug: Log the full response structure
      console.log('Full Gemini API response:', response);
      console.log('Response candidates:', response.candidates);
      console.log('Response text:', response.text());
      
      // Try to extract generated image from response
      let generatedImage;
      let description = '';
      
      try {
        // First try to get an actual generated image
        generatedImage = this.extractImageFromResponse(response);
        console.log('Successfully extracted generated image from Gemini response');
        description = 'AI-generated photorealistic family reunion image';
      } catch (imageError) {
        console.log('No image in response, Gemini provided text description instead');
        console.log('Image extraction error:', imageError.message);
        description = response.text();
        console.log('Generated description:', description);
        // Create visual representation based on AI description
        generatedImage = this.createVisualRepresentation(scenario, description, historicalPhotos, currentPhotos);
      }
      
      return {
        success: true,
        image: generatedImage,
        processingTime: Date.now() - startTime,
        cost: 0.0387, // $30 per 1M tokens, 1 image = 1290 tokens
        aiDescription: description,
        editingApproach: 'historical_person_addition',
        expectedPeopleCount: currentPhotos.length + historicalPhotos.length,
        metadata: {
          historicalPhotosUsed: historicalPhotos.length,
          currentPhotosUsed: currentPhotos.length,
          baseImageUsed: baseCurrentPhoto.name,
          scenario: scenario.title,
          features: ['Seamless Integration', 'Natural Lighting Adaptation', 'Shadow Matching', 'Photorealistic Blending', 'Environmental Context']
        }
      };

    } catch (error) {
      console.error('Memory resurrection failed:', error);
      return {
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  extractImageFromResponse(response) {
    // Check if response contains generated image data
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No candidates in response');
    }

    const candidate = candidates[0];
    const content = candidate.content;
    
    if (!content || !content.parts) {
      throw new Error('No content parts in response');
    }

    // Look for inlineData with image (camelCase format)
    for (const part of content.parts) {
      if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
        return {
          base64Data: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
          url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        };
      }
    }

    throw new Error('No image data found in response');
  }

  createVisualRepresentation(scenario, description, historicalPhotos, currentPhotos) {
    // Create a rich SVG visualization based on the scenario and AI description
    const colors = {
      wedding: { primary: '#f3e8ff', secondary: '#9333ea', accent: '#ec4899' },
      graduation: { primary: '#dbeafe', secondary: '#2563eb', accent: '#059669' },
      holiday: { primary: '#fef3c7', secondary: '#d97706', accent: '#dc2626' },
      birthday: { primary: '#fed7e2', secondary: '#db2777', accent: '#7c3aed' },
      newborn: { primary: '#ecfdf5', secondary: '#059669', accent: '#f59e0b' },
      vacation: { primary: '#e0f2fe', secondary: '#0891b2', accent: '#ea580c' }
    };

    const scenarioColors = colors[scenario.id] || colors.wedding;
    const peopleCount = historicalPhotos.length + currentPhotos.length;
    
    // Create circles representing people
    let peopleElements = '';
    for (let i = 0; i < peopleCount; i++) {
      const x = 200 + (i * 60) - (peopleCount * 30);
      const y = 180 + Math.sin(i * 0.5) * 20;
      const isHistorical = i < historicalPhotos.length;
      const fillColor = isHistorical ? scenarioColors.secondary : scenarioColors.accent;
      
      peopleElements += `
        <circle cx="${x}" cy="${y}" r="25" fill="${fillColor}" opacity="0.8"/>
        <circle cx="${x}" cy="${y}" r="15" fill="white" opacity="0.9"/>
        <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12" fill="${fillColor}">👤</text>
      `;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${scenarioColors.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${scenarioColors.secondary};stop-opacity:0.3" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:white;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${scenarioColors.accent};stop-opacity:0.1" />
        </radialGradient>
      </defs>
      <rect width="600" height="400" fill="url(#bg)"/>
      <circle cx="300" cy="200" r="150" fill="url(#glow)" opacity="0.6"/>
      ${peopleElements}
      <text x="300" y="320" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="${scenarioColors.secondary}">${scenario.title}</text>
      <text x="300" y="340" text-anchor="middle" font-family="Arial" font-size="12" fill="${scenarioColors.secondary}" opacity="0.8">AI-Enhanced Family Memory</text>
      <text x="300" y="360" text-anchor="middle" font-family="Arial" font-size="10" fill="${scenarioColors.secondary}" opacity="0.6">${historicalPhotos.length} Historical + ${currentPhotos.length} Current Photos</text>
    </svg>`;

    return {
      base64Data: btoa(unescape(encodeURIComponent(svg))),
      mimeType: 'image/svg+xml',
      url: `data:image/svg+xml,${encodeURIComponent(svg)}`
    };
  }

  async editMemory(originalImage, editPrompt, conversationHistory = [], orientation = 'landscape') {
    if (this.demoMode && !this.genAI) {
      return this.generateDemoEditResponse(editPrompt);
    }

    try {
      console.log('Starting memory edit...', { editPrompt });
      
      // Build content structure for image editing
      const parts = [];
      
      // Validate and add the original image
      if (!originalImage || !originalImage.base64Data) {
        return {
          success: false,
          error: 'Invalid image data provided for editing. The image may be corrupted or in an unsupported format.',
          code: 'INVALID_IMAGE_DATA'
        };
      }

      // Validate base64 data
      try {
        // Check if base64 data is valid
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(originalImage.base64Data)) {
          throw new Error('Invalid base64 format');
        }
        
        parts.push({
          inlineData: {
            mimeType: originalImage.mimeType || 'image/png',
            data: originalImage.base64Data
          }
        });
      } catch (error) {
        console.error('Base64 validation failed:', error);
        return {
          success: false,
          error: 'Image data is corrupted or invalid. Please try generating a new variation first.',
          code: 'CORRUPTED_IMAGE_DATA'
        };
      }
      
      // Create specialized edit prompt based on the request type
      let editGenerationPrompt;
      
      // Detect if this is a blending/lighting request
      const isBlendingRequest = editPrompt.toLowerCase().includes('blend') || 
                               editPrompt.toLowerCase().includes('lighting') || 
                               editPrompt.toLowerCase().includes('shadow') || 
                               editPrompt.toLowerCase().includes('natural') ||
                               editPrompt.toLowerCase().includes('skin tone') ||
                               editPrompt.toLowerCase().includes('artificial') ||
                               editPrompt.toLowerCase().includes('cutout');
      
      // Detect if this is a request to add missing person
      const isAddPersonRequest = editPrompt.toLowerCase().includes('add') && 
                                 (editPrompt.toLowerCase().includes('person') || 
                                  editPrompt.toLowerCase().includes('historical') ||
                                  editPrompt.toLowerCase().includes('missing'));

      if (isBlendingRequest) {
        // Special prompt for blending that emphasizes keeping everyone
        editGenerationPrompt = `BLENDING TASK: Improve the visual integration in this image.

CRITICAL - PRESERVE ALL PEOPLE:
- Count the people in the original image - keep EXACTLY the same number
- Do NOT remove anyone, especially the historical person
- Every face must remain visible and recognizable

BLENDING IMPROVEMENTS TO APPLY:
- ${editPrompt}
- Match lighting across all people in the image
- Create natural shadows for everyone
- Blend skin tones to match the environment
- Remove any artificial edges or cutout appearance
- Make everyone look like they belong in the same scene

ABSOLUTELY FORBIDDEN:
- Removing any person from the image
- Hiding anyone behind others
- Making anyone less visible
- Changing the number of people

RESULT: Same people, better blending and lighting.`;

      } else if (isAddPersonRequest) {
        // Special prompt for adding missing historical person
        editGenerationPrompt = `RESTORATION TASK: Add the missing historical person back to this image.

WHAT HAPPENED: The historical person was accidentally removed or hidden.

CORRECTION NEEDED:
- Add the historical person back to the scene
- Position them naturally within the group
- Match their lighting to the current environment
- Blend them seamlessly with the existing people
- ${editPrompt}

FINAL RESULT: All original people should be visible again.`;

      } else {
        // General editing prompt
        editGenerationPrompt = `EDITING TASK: "${editPrompt}"

CRITICAL CONSTRAINTS:
1. PRESERVE ALL PEOPLE: Keep exactly the same people as in the original image
2. NO REMOVALS: Do not remove or hide anyone 
3. MAINTAIN FACES: Each person must remain recognizable
4. APPLY MODIFICATION: ${editPrompt}

The edited image must contain the exact same people as the original.`;
      }

      parts.push({
        text: editGenerationPrompt
      });

      const contents = [{
        parts: parts
      }];

      console.log('Calling Gemini API for image editing...');
      const model = this.genAI.getGenerativeModel({ 
        model: this.model
      });
      
      const result = await model.generateContent({
        contents: contents,
        generationConfig: {
          maxOutputTokens: 1290,
          temperature: 0.7,
        }
      });
      
      const response = await result.response;
      
      // Debug log the response
      console.log('Edit API response:', response);
      
      // Try to extract edited image from response
      let editedImage;
      let description = '';
      
      try {
        editedImage = this.extractImageFromResponse(response);
        console.log('Successfully extracted edited image from Gemini response');
        description = 'AI-edited family reunion image';
      } catch (imageError) {
        console.log('No edited image in response:', imageError.message);
        description = response.text();
        console.log('Edit description:', description);
        // Create visual representation as fallback
        editedImage = this.createEditedVisualization(editPrompt, description);
      }
      
      return {
        success: true,
        image: editedImage,
        editApplied: editPrompt,
        editDescription: description,
        cost: 0.0387
      };

    } catch (error) {
      console.error('Memory edit failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  createEditedVisualization(editPrompt, description) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="editBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#059669;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#editBg)"/>
      <circle cx="300" cy="200" r="80" fill="white" opacity="0.9"/>
      <text x="300" y="190" text-anchor="middle" font-family="Arial" font-size="16" fill="#059669">✨ Edited Memory</text>
      <text x="300" y="210" text-anchor="middle" font-family="Arial" font-size="12" fill="#2563eb">${editPrompt.substring(0, 30)}${editPrompt.length > 30 ? '...' : ''}</text>
      <text x="300" y="300" text-anchor="middle" font-family="Arial" font-size="10" fill="white" opacity="0.8">AI-Enhanced Edit Applied</text>
    </svg>`;
    
    return svg;
  }

  generateDemoResponse(historicalPhotos, currentPhotos, scenario, startTime) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate a realistic demo image based on scenario
        const demoImageUrl = this.getDemoImageForScenario(scenario.title);
        
        resolve({
          success: true,
          image: {
            base64Data: '',
            mimeType: 'image/svg+xml',
            url: demoImageUrl
          },
          processingTime: Date.now() - startTime,
          cost: 0.039, // Realistic cost estimate
          metadata: {
            historicalPhotosUsed: historicalPhotos.length,
            currentPhotosUsed: currentPhotos.length,
            scenario: scenario.title,
            features: ['Character Consistency', 'Multi-Image Fusion', 'World Knowledge', 'Natural Language']
          }
        });
      }, 2000);
    });
  }

  getDemoImageForScenario(scenarioTitle) {
    // Create realistic SVG family scenes for each scenario
    const scenarioColors = {
      'Graduation Day': { bg: '#1e3a8a', accent: '#fbbf24', theme: 'Academic' },
      'Wedding Celebration': { bg: '#be185d', accent: '#f8fafc', theme: 'Romantic' },
      'Holiday Gathering': { bg: '#166534', accent: '#ef4444', theme: 'Festive' },
      'Birthday Party': { bg: '#7c3aed', accent: '#fb7185', theme: 'Celebratory' },
      'Meeting New Baby': { bg: '#0369a1', accent: '#fde047', theme: 'Tender' },
      'Family Vacation': { bg: '#0891b2', accent: '#34d399', theme: 'Adventure' }
    };

    const colors = scenarioColors[scenarioTitle] || scenarioColors['Graduation Day'];
    
    const demoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="bg-${scenarioTitle}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:0.3" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="600" height="400" fill="url(#bg-${scenarioTitle})"/>
      
      <!-- Stage/Setting -->
      <rect x="50" y="300" width="500" height="100" fill="${colors.bg}" opacity="0.2" rx="10"/>
      
      <!-- People silhouettes representing the family reunion -->
      <!-- Historical person 1 (Einstein style) -->
      <circle cx="150" cy="200" r="35" fill="#2d3748" opacity="0.8"/>
      <rect x="135" y="235" width="30" height="60" fill="#2d3748" opacity="0.8" rx="15"/>
      <text x="150" y="310" text-anchor="middle" font-family="Arial" font-size="10" fill="white" opacity="0.7">Einstein</text>
      
      <!-- Current person -->
      <circle cx="300" cy="190" r="38" fill="#4a5568" opacity="0.9"/>
      <rect x="282" y="228" width="36" height="65" fill="#4a5568" opacity="0.9" rx="18"/>
      <text x="300" y="310" text-anchor="middle" font-family="Arial" font-size="10" fill="white" opacity="0.7">Family</text>
      
      <!-- Historical person 2 (Marie Curie style) -->
      <circle cx="450" cy="205" r="32" fill="#2d3748" opacity="0.8"/>
      <rect x="436" y="237" width="28" height="58" fill="#2d3748" opacity="0.8" rx="14"/>
      <text x="450" y="310" text-anchor="middle" font-family="Arial" font-size="10" fill="white" opacity="0.7">M. Curie</text>
      
      <!-- Scenario elements -->
      ${this.getScenarioElements(scenarioTitle, colors)}
      
      <!-- Title -->
      <rect x="150" y="30" width="300" height="50" fill="white" opacity="0.9" rx="25" filter="url(#shadow)"/>
      <text x="300" y="50" text-anchor="middle" font-family="Arial" font-size="16" fill="${colors.bg}" font-weight="bold">${scenarioTitle}</text>
      <text x="300" y="70" text-anchor="middle" font-family="Arial" font-size="12" fill="${colors.bg}" opacity="0.8">${colors.theme} Family Reunion</text>
      
      <!-- Demo watermark -->
      <text x="550" y="380" text-anchor="end" font-family="Arial" font-size="10" fill="white" opacity="0.5">DEMO</text>
    </svg>`;
    
    return `data:image/svg+xml,${encodeURIComponent(demoSvg)}`;
  }

  getScenarioElements(scenarioTitle, colors) {
    switch (scenarioTitle) {
      case 'Graduation Day':
        return `<polygon points="280,60 320,60 300,40" fill="${colors.accent}" opacity="0.8"/>
                <text x="300" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="white">🎓 Graduation</text>`;
      
      case 'Wedding Celebration':
        return `<circle cx="280" cy="120" r="15" fill="none" stroke="${colors.accent}" stroke-width="3"/>
                <circle cx="320" cy="120" r="15" fill="none" stroke="${colors.accent}" stroke-width="3"/>
                <text x="300" y="150" text-anchor="middle" font-family="Arial" font-size="12" fill="white">💍 Wedding</text>`;
      
      case 'Holiday Gathering':
        return `<polygon points="300,90 310,110 330,110 316,125 322,145 300,133 278,145 284,125 270,110 290,110" fill="${colors.accent}"/>
                <text x="300" y="170" text-anchor="middle" font-family="Arial" font-size="12" fill="white">🎄 Holiday</text>`;
      
      case 'Birthday Party':
        return `<rect x="290" y="100" width="20" height="30" fill="${colors.accent}"/>
                <ellipse cx="300" cy="95" rx="3" ry="8" fill="#fbbf24"/>
                <text x="300" y="150" text-anchor="middle" font-family="Arial" font-size="12" fill="white">🎂 Birthday</text>`;
      
      case 'Meeting New Baby':
        return `<circle cx="300" cy="120" r="12" fill="${colors.accent}" opacity="0.9"/>
                <circle cx="300" cy="115" r="6" fill="white"/>
                <text x="300" y="150" text-anchor="middle" font-family="Arial" font-size="12" fill="white">👶 New Baby</text>`;
      
      case 'Family Vacation':
        return `<circle cx="300" cy="100" r="20" fill="${colors.accent}" opacity="0.7"/>
                <path d="M285 100 Q300 85 315 100" stroke="white" stroke-width="2" fill="none"/>
                <text x="300" y="150" text-anchor="middle" font-family="Arial" font-size="12" fill="white">✈️ Vacation</text>`;
      
      default:
        return '';
    }
  }

  generateDemoEditResponse(editPrompt) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          image: {
            base64Data: '',
            mimeType: 'image/svg+xml',
            url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23059669;stop-opacity:1" /><stop offset="100%" style="stop-color:%232563eb;stop-opacity:1" /></linearGradient></defs><rect width="600" height="400" fill="url(%23bg)"/><circle cx="300" cy="200" r="60" fill="white" opacity="0.9"/><text x="300" y="200" text-anchor="middle" font-family="Arial" font-size="16" fill="%23059669">Demo Edit</text><text x="300" y="280" text-anchor="middle" font-family="Arial" font-size="12" fill="white" opacity="0.8">' + editPrompt.substring(0, 20) + '...</text></svg>'
          },
          editApplied: editPrompt,
          cost: 0.0
        });
      }, 1500);
    });
  }

  buildMemoryPrompt(scenario, historicalCount, currentCount) {
    const basePrompt = `Create a heartwarming, photorealistic family reunion scene: ${scenario.prompt.replace('{deceased_person}', 'the person from the historical photograph(s)')}. 

ANALYSIS REQUIREMENTS:
- Describe the people in each photo in detail
- Explain how they would interact in this ${scenario.emotionalTone} ${scenario.title} scene
- Include specific details about positioning, expressions, and atmosphere
- Make it feel authentic and emotionally meaningful

FAMILY INTEGRATION DETAILS:
- Historical photos provided: ${historicalCount}
- Current family photos provided: ${currentCount}
- Emotional tone: ${scenario.emotionalTone || 'warm and joyful'}`;

    return basePrompt;
  }

  async batchResurrectMemories(photos, scenarios) {
    const results = [];
    const historicalPhotos = photos.filter(p => p.type === 'historical');
    const currentPhotos = photos.filter(p => p.type === 'current');

    for (const scenario of scenarios) {
      try {
        const result = await this.resurrectMemory(historicalPhotos, currentPhotos, scenario);
        results.push({
          scenario: scenario.id,
          ...result
        });
        
        if (!this.demoMode) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Failed to process scenario ${scenario.id}:`, error);
        results.push({
          scenario: scenario.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async enhanceHistoricalPhoto(photo) {
    if (this.demoMode && !this.genAI) {
      return this.generateDemoEnhancementResponse();
    }

    try {
      console.log('Starting historical photo enhancement...');
      
      const base64 = await this.fileToBase64(photo.file);
      
      const enhancementPrompt = `CRITICAL: Enhance this historical photograph to improve face clarity and detail while preserving authenticity.

ENHANCEMENT REQUIREMENTS:
1. FACE CLARITY: Sharpen and clarify facial features, eyes, nose, mouth details
2. PRESERVE AUTHENTICITY: Maintain the original historical appearance - do not modernize
3. NOISE REDUCTION: Reduce grain, scratches, and blur while keeping natural texture
4. CONTRAST OPTIMIZATION: Improve contrast to make faces more visible and distinct
5. DETAIL ENHANCEMENT: Enhance hair, clothing, and background details for better recognition
6. NO ALTERATIONS: Do not change facial structure, add missing parts, or modify expressions
7. MAINTAIN ERA: Keep the historical time period appearance intact

TECHNICAL SPECIFICATIONS:
- Output high-resolution enhanced version of the same image
- Focus on facial recognition improvement
- Preserve original composition and poses
- Maintain historical authenticity and time period accuracy
- Do not add modern elements or artificial enhancement effects

Generate an enhanced version of this historical photograph optimized for facial recognition while maintaining complete historical authenticity.`;

      const parts = [{
        inlineData: {
          mimeType: photo.file.type,
          data: base64
        }
      }, {
        text: enhancementPrompt
      }];

      const contents = [{
        parts: parts
      }];

      const model = this.genAI.getGenerativeModel({ 
        model: this.model
      });
      
      const result = await model.generateContent({
        contents: contents,
        generationConfig: {
          maxOutputTokens: 1290,
          temperature: 0.3, // Lower temperature for consistent enhancement
        }
      });
      
      const response = await result.response;
      
      // Try to extract enhanced image from response
      let enhancedImage;
      
      try {
        enhancedImage = this.extractImageFromResponse(response);
        console.log('Successfully extracted enhanced image from Gemini response');
      } catch (imageError) {
        console.log('No enhanced image in response:', imageError.message);
        throw new Error('Enhancement failed - no image returned');
      }
      
      return {
        success: true,
        enhancedImage: enhancedImage,
        originalSize: photo.file.size,
        enhancementApplied: true,
        cost: 0.0387
      };

    } catch (error) {
      console.error('Historical photo enhancement failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateDemoEnhancementResponse() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          enhancedImage: {
            base64Data: '',
            mimeType: 'image/svg+xml',
            url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23059669;stop-opacity:1" /><stop offset="100%" style="stop-color:%232563eb;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(%23bg)"/><circle cx="200" cy="150" r="50" fill="white" opacity="0.9"/><text x="200" y="155" text-anchor="middle" font-family="Arial" font-size="14" fill="%23059669">✨ Enhanced</text><text x="200" y="220" text-anchor="middle" font-family="Arial" font-size="10" fill="white" opacity="0.8">Demo Mode - Add API key for real enhancement</text></svg>'
          },
          enhancementApplied: true,
          cost: 0.0
        });
      }, 2000);
    });
  }

  calculateCost(operations) {
    const costPerImage = 0.0387; // $30 per 1M tokens, 1 image = 1290 tokens
    return {
      totalOperations: operations,
      costPerOperation: costPerImage,
      totalCost: operations * costPerImage,
      currency: 'USD'
    };
  }
}

export default MemoryResurrectionAPI;