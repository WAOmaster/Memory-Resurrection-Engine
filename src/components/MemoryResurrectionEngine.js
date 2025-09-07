import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Heart, Sparkles, Download, RefreshCw, Users, Clock, Wand2, Play, X, RotateCcw, Zap, Moon, Sun } from 'lucide-react';
import MemoryResurrectionAPI from '../services/MemoryResurrectionAPI';

const MemoryResurrectionEngine = () => {
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [editPrompt, setEditPrompt] = useState('');
  const [editingImageId, setEditingImageId] = useState(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(null);
  const [imageOrientation, setImageOrientation] = useState('landscape');
  const [enhancingPhotos, setEnhancingPhotos] = useState(new Set());
  const [demoMode, setDemoMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [scenarioSettings, setScenarioSettings] = useState({
    culturalStyle: 'western',
    timePeriod: 'modern',
    clothingStyle: 'formal',
    locationStyle: 'indoor'
  });
  const fileInputRef = useRef(null);

  const memoryAPI = new MemoryResurrectionAPI(process.env.REACT_APP_GEMINI_API_KEY);
  
  // Debug: Check if API key is available
  console.log('API Key available:', !!process.env.REACT_APP_GEMINI_API_KEY);

  // Close download options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.download-dropdown')) {
        setShowDownloadOptions(null);
      }
    };

    if (showDownloadOptions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDownloadOptions]);

  const scenarios = [
    {
      id: 'wedding',
      title: 'Wedding Celebration',
      description: 'Show your loved one celebrating at a modern family wedding',
      emotionalTone: 'joyful',
      prompt: 'A joyful family wedding celebration where {deceased_person} is present, smiling and celebrating with the current family members at a beautiful outdoor ceremony'
    },
    {
      id: 'graduation',
      title: 'Graduation Day',
      description: 'Capture the pride of graduation moments together',
      emotionalTone: 'proud',
      prompt: 'A proud graduation ceremony where {deceased_person} is present, beaming with pride as they celebrate this milestone with current family members'
    },
    {
      id: 'holiday',
      title: 'Holiday Gathering',
      description: 'Recreate festive family holiday traditions',
      emotionalTone: 'warm',
      prompt: 'A warm holiday family gathering where {deceased_person} is naturally integrated, sharing in the festive traditions and joy with current family'
    },
    {
      id: 'birthday',
      title: 'Birthday Party',
      description: 'Celebrate birthdays with multi-generational joy',
      emotionalTone: 'lively',
      prompt: 'A lively birthday celebration where {deceased_person} joins current family members in celebrating, sharing in the joy and laughter'
    },
    {
      id: 'newborn',
      title: 'Meeting New Baby',
      description: 'Show the moment of meeting newest family members',
      emotionalTone: 'tender',
      prompt: 'A tender moment where {deceased_person} meets and holds the newest family member, surrounded by current family in a loving scene'
    },
    {
      id: 'vacation',
      title: 'Family Vacation',
      description: 'Create memories of traveling together',
      emotionalTone: 'relaxed',
      prompt: 'A relaxed family vacation scene where {deceased_person} enjoys the destination and activities alongside current family members'
    }
  ];

  const loadDemoData = async () => {
    // Random demo sets - pick one randomly each time
    const demoSets = [
      // Set 1: Einstein + Modern Family
      [
        { id: 'demo1', name: 'einstein_portrait.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/256px-Albert_Einstein_Head.jpg', type: 'historical' },
        { id: 'demo2', name: 'modern_family.jpg', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=300&fit=crop&crop=faces', type: 'current' }
      ],
      // Set 2: Vintage Woman + Modern Couple  
      [
        { id: 'demo3', name: 'vintage_woman.jpg', url: 'https://images.unsplash.com/photo-1594736797933-d0f06ba0d6f4?w=300&h=400&fit=crop&crop=face', type: 'historical' },
        { id: 'demo4', name: 'couple_portrait.jpg', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop&crop=faces', type: 'current' }
      ],
      // Set 3: Historical Man + Family Group
      [
        { id: 'demo5', name: 'historical_gentleman.jpg', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop&crop=face', type: 'historical' },
        { id: 'demo6', name: 'family_group.jpg', url: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400&h=300&fit=crop&crop=faces', type: 'current' }
      ]
    ];

    // Pick a random demo set
    const randomSet = demoSets[Math.floor(Math.random() * demoSets.length)];
    
    const demoPhotos = await Promise.all(
      randomSet.map(photo => createDemoPhoto(photo.id, photo.name, photo.url, photo.type))
    );
    
    setUploadedPhotos(demoPhotos.filter(photo => photo !== null));
    setDemoMode(true);
    memoryAPI.setDemoMode(true);
    setConversationHistory([
      {
        type: 'system',
        content: 'Demo mode activated - showcasing Memory Resurrection Engine capabilities with real AI generation',
        timestamp: new Date()
      }
    ]);
    
    console.log(`Demo data loaded with set ${demoSets.indexOf(randomSet) + 1}:`, randomSet.map(p => p.name));
  };

  const createDemoPhoto = async (id, name, url, type) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], name, { type: blob.type });
      
      return {
        id,
        name,
        url,
        file,
        type,
        autoDetected: true
      };
    } catch (error) {
      console.error(`Failed to load demo photo ${name}:`, error);
      return null;
    }
  };

  const exitDemoMode = () => {
    setUploadedPhotos([]);
    setGeneratedImages([]);
    setDemoMode(false);
    memoryAPI.setDemoMode(false);
    setConversationHistory([]);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };


  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for image analysis
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas size (smaller for analysis performance)
          const maxSize = 100;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          
          // Draw and analyze image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Auto-detect photo type
          const detectedType = detectPhotoType(file, canvas, ctx);
          
          const newPhoto = {
            id: Date.now() + Math.random(),
            name: file.name,
            url: e.target.result,
            file: file,
            type: detectedType,
            autoDetected: true
          };
          setUploadedPhotos(prev => [...prev, newPhoto]);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };


  const generateMemoryImage = async () => {
    const currentPhotos = uploadedPhotos.filter(p => p.type === 'current');
    const historicalPhotos = uploadedPhotos.filter(p => p.type === 'historical');
    
    if (!selectedScenario) {
      alert('Please select a scenario first');
      return;
    }
    
    if (currentPhotos.length === 0) {
      alert('Please upload at least one Current photo as the base image to edit');
      return;
    }
    
    if (historicalPhotos.length === 0) {
      alert('Please upload at least one Historical photo of the person to add');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const historicalPhotos = uploadedPhotos.filter(p => p.type === 'historical');
      const currentPhotos = uploadedPhotos.filter(p => p.type === 'current');
      const scenario = scenarios.find(s => s.id === selectedScenario);
      
      if (demoMode) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const generatedImage = {
          id: Date.now(),
          scenario: scenario.title,
          description: `A beautiful ${scenario.emotionalTone} family scene where deceased family members are naturally integrated with current family, maintaining character consistency and emotional authenticity.`,
          url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23a855f7;stop-opacity:1" /><stop offset="100%" style="stop-color:%23ec4899;stop-opacity:1" /></linearGradient></defs><rect width="600" height="400" fill="url(%23bg)"/><circle cx="300" cy="200" r="60" fill="white" opacity="0.9"/><path d="M270 180 Q300 160 330 180 Q330 200 300 220 Q270 200 270 180" fill="%23ef4444"/><text x="300" y="260" text-anchor="middle" font-family="Arial" font-size="16" fill="white">Generated Memory Image</text><text x="300" y="280" text-anchor="middle" font-family="Arial" font-size="12" fill="white" opacity="0.8">Character Consistency ✓ Multi-Image Fusion ✓</text></svg>',
          timestamp: new Date(),
          historicalPhotosUsed: historicalPhotos.length,
          currentPhotosUsed: currentPhotos.length,
          quality: 'High',
          processingTime: '8.2 seconds',
          features: ['Character Consistency', 'Multi-Image Fusion', 'World Knowledge', 'Natural Language']
        };
        
        setGeneratedImages(prev => [generatedImage, ...prev]);
      } else {
        const result = await memoryAPI.resurrectMemory(historicalPhotos, currentPhotos, scenario, imageOrientation, scenarioSettings);
        
        if (result.success) {
          const generatedImage = {
            id: Date.now(),
            scenario: scenario.title,
            description: result.aiDescription || `AI-generated ${scenario.emotionalTone} family reunion scene`,
            url: result.image.url,
            timestamp: new Date(),
            historicalPhotosUsed: result.metadata.historicalPhotosUsed,
            currentPhotosUsed: result.metadata.currentPhotosUsed,
            quality: 'AI-Enhanced',
            processingTime: `${(result.processingTime / 1000).toFixed(1)} seconds`,
            features: result.metadata.features,
            cost: result.cost,
            aiAnalysis: result.aiDescription
          };
          
          setGeneratedImages(prev => [generatedImage, ...prev]);
        } else {
          console.error('Generation failed:', result.error);
          alert(`Generation failed: ${result.error}`);
        }
      }
      
      setConversationHistory(prev => [...prev, {
        type: 'generation',
        content: `Generated ${scenario.title} scene using ${historicalPhotos.length} historical and ${currentPhotos.length} current photos`,
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditRequest = async (targetImage = null) => {
    if (!editPrompt.trim()) return;
    
    const imageToEdit = targetImage || generatedImages[0];
    if (!imageToEdit) return;
    
    setIsGenerating(true);
    
    try {
      if (demoMode) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedImage = {
          ...imageToEdit,
          id: Date.now(),
          editHistory: [...(imageToEdit.editHistory || []), editPrompt],
          lastEdit: editPrompt,
          timestamp: new Date(),
          processingTime: "3.5 seconds"
        };
        
        setGeneratedImages(prev => [updatedImage, ...prev.filter(img => img.id !== imageToEdit.id)]);
      } else {
        // Extract base64 data safely from the image URL
        let base64Data = null;
        let mimeType = 'image/png';
        
        try {
          if (imageToEdit.url && imageToEdit.url.includes('data:')) {
            // Handle data URL format
            const parts = imageToEdit.url.split(',');
            if (parts.length > 1) {
              base64Data = parts[1];
              // Extract mime type
              const mimeMatch = parts[0].match(/data:([^;]+);/);
              if (mimeMatch) {
                mimeType = mimeMatch[1];
              }
            }
          } else if (imageToEdit.base64Data) {
            // Handle direct base64 data
            base64Data = imageToEdit.base64Data;
            mimeType = imageToEdit.mimeType || 'image/png';
          }
          
          if (!base64Data) {
            throw new Error('Unable to extract image data for editing');
          }
        } catch (error) {
          console.error('Image data extraction failed:', error);
          alert('Cannot edit this image - invalid image data. Try generating a new variation first.');
          return;
        }

        const result = await memoryAPI.editMemory(
          { base64Data, mimeType },
          editPrompt,
          conversationHistory,
          imageOrientation
        );
        
        if (result.success) {
          const updatedImage = {
            ...imageToEdit,
            id: Date.now(),
            url: result.image.url || result.image,
            editHistory: [...(imageToEdit.editHistory || []), editPrompt],
            lastEdit: editPrompt,
            timestamp: new Date(),
            processingTime: "API processing time",
            base64Data: result.image.base64Data,
            mimeType: result.image.mimeType
          };
          
          setGeneratedImages(prev => [updatedImage, ...prev.filter(img => img.id !== imageToEdit.id)]);
        } else {
          console.error('Edit failed:', result.error);
          alert(`Editing failed: ${result.error || 'Unknown error'}. Try generating a new variation instead.`);
        }
      }
      
      setConversationHistory(prev => [...prev, {
        type: 'edit',
        content: editPrompt,
        timestamp: new Date()
      }]);
      
      setEditPrompt('');
      
    } catch (error) {
      console.error('Edit failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (image, format = 'png') => {
    const filename = `memory-${image.scenario.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${format}`;
    
    if (format === 'svg' && image.url.includes('svg')) {
      // Direct SVG download with proper formatting
      const svgData = decodeURIComponent(image.url.replace('data:image/svg+xml,', ''));
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }
    
    // For PNG/JPEG conversion
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.naturalWidth || 1920;
      canvas.height = img.naturalHeight || 1080;
      
      // White background for JPEG
      if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);
      
      const quality = format === 'jpeg' ? 0.95 : undefined;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, `image/${format}`, quality);
    };
    
    img.crossOrigin = 'anonymous';
    img.src = image.url;
  };

  const generateVariation = async (originalImage) => {
    if (!originalImage || isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      const historicalPhotos = uploadedPhotos.filter(p => p.type === 'historical');
      const currentPhotos = uploadedPhotos.filter(p => p.type === 'current');
      const scenario = scenarios.find(s => s.title === originalImage.scenario);
      
      if (scenario) {
        if (demoMode) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const variationImage = {
            ...originalImage,
            id: Date.now(),
            description: `${originalImage.description} (Variation)`,
            timestamp: new Date(),
            processingTime: '7.8 seconds'
          };
          
          setGeneratedImages(prev => [variationImage, ...prev]);
        } else {
          const result = await memoryAPI.resurrectMemory(historicalPhotos, currentPhotos, scenario, imageOrientation, scenarioSettings);
          
          if (result.success) {
            const variationImage = {
              id: Date.now(),
              scenario: scenario.title,
              description: `${result.aiDescription || originalImage.description} (Variation)`,
              url: result.image.url,
              timestamp: new Date(),
              historicalPhotosUsed: result.metadata.historicalPhotosUsed,
              currentPhotosUsed: result.metadata.currentPhotosUsed,
              quality: 'AI-Enhanced',
              processingTime: `${(result.processingTime / 1000).toFixed(1)} seconds`,
              features: result.metadata.features,
              cost: result.cost,
              aiAnalysis: result.aiDescription
            };
            
            setGeneratedImages(prev => [variationImage, ...prev]);
          } else {
            console.error('Variation generation failed:', result.error);
            alert(`Variation generation failed: ${result.error}`);
          }
        }
        
        setConversationHistory(prev => [...prev, {
          type: 'variation',
          content: `Generated variation of ${scenario.title} scene`,
          timestamp: new Date()
        }]);
      }
      
    } catch (error) {
      console.error('Variation generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePhotoType = (photoId) => {
    setUploadedPhotos(prev => 
      prev.map(photo => {
        if (photo.id === photoId) {
          // Cycle through: current -> historical -> background -> current
          let newType;
          switch (photo.type) {
            case 'current':
              newType = 'historical';
              break;
            case 'historical':
              newType = 'background';
              break;
            case 'background':
              newType = 'current';
              break;
            default:
              newType = 'current';
          }
          return { ...photo, type: newType };
        }
        return photo;
      })
    );
  };

  const detectPhotoType = (file, canvas, ctx) => {
    // Auto-detect photo type based on image characteristics
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    let totalBrightness = 0;
    let colorVariance = 0;
    let sepiaCount = 0;
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      // Calculate brightness
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      
      // Check for sepia/vintage colors (historical indicator)
      const isSepia = (r > g && g > b && r - b > 30 && g - b > 10);
      if (isSepia) sepiaCount++;
      
      // Calculate color variance (low variance might indicate background)
      const variance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
      colorVariance += variance;
    }
    
    const pixelCount = pixels.length / 4;
    const avgBrightness = totalBrightness / pixelCount;
    const avgColorVariance = colorVariance / pixelCount;
    const sepiaRatio = sepiaCount / pixelCount;
    
    // Decision logic
    if (sepiaRatio > 0.3 || avgBrightness < 100) {
      return 'historical'; // Sepia or dark/vintage looking
    } else if (avgColorVariance < 20) {
      return 'background'; // Low color variance, likely background/landscape
    } else {
      return 'current'; // Default to current for colorful, bright images
    }
  };

  const removePhoto = (photoId) => {
    setUploadedPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const replacePhoto = (photoId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedPhotos(prev => prev.map(photo => 
            photo.id === photoId 
              ? { ...photo, url: e.target.result, file: file, name: file.name }
              : photo
          ));
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const enhancePhoto = async (photoId) => {
    const photo = uploadedPhotos.find(p => p.id === photoId);
    if (!photo || enhancingPhotos.has(photoId)) return;

    setEnhancingPhotos(prev => new Set([...prev, photoId]));

    try {
      // Use Gemini AI to enhance the historical photo for better face detection
      const result = await memoryAPI.enhanceHistoricalPhoto(photo);
      
      if (result.success) {
        setUploadedPhotos(prev => prev.map(p => 
          p.id === photoId 
            ? { ...p, url: result.enhancedImage.url, enhanced: true }
            : p
        ));
      } else {
        alert(`Enhancement failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Photo enhancement failed:', error);
      alert('Enhancement failed. Please try again.');
    } finally {
      setEnhancingPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'gradient-bg'
    }`}>
      {/* Header */}
      <header className={`shadow-sm border-b transition-colors duration-300 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-pink-500" />
              <div>
                <h1 className={darkMode ? 'text-3xl font-bold transition-colors duration-300 text-white' : 'text-3xl font-bold transition-colors duration-300 text-gray-900'}>Memory Resurrection Engine</h1>
                <p className={darkMode ? 'transition-colors duration-300 text-gray-300' : 'transition-colors duration-300 text-gray-600'}>Reunite families across generations with AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {!demoMode ? (
                <button
                  onClick={loadDemoData}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-purple-600 transition-colors flex items-center"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Load Demo
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full flex items-center">
                    <Play className="h-3 w-3 mr-1" />
                    Demo Mode
                  </div>
                  <button
                    onClick={exitDemoMode}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Exit Demo
                  </button>
                </div>
              )}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className={`text-sm px-3 py-1 rounded-full transition-colors duration-300 ${
                darkMode ? 'text-gray-400 bg-gray-700' : 'text-gray-500 bg-gray-100'
              }`}>
                Powered by Nano Banana
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Upload Section */}
          <div className="lg:col-span-1">
            {/* Saved Character Status */}
            <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
              <h2 className={darkMode ? 'text-xl font-bold text-white mb-4 flex items-center' : 'text-xl font-bold text-gray-900 mb-4 flex items-center'}>
                <Upload className="h-5 w-5 mr-2 text-blue-500" />
                Upload Photos for Editing
              </h2>
              
              <div className="space-y-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
                >
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Click to upload photos</p>
                  <p className="text-sm text-gray-400">Current photo + Historical person = AI-blended family reunion</p>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                
                {uploadedPhotos.length > 0 && (
                  <div className="space-y-2">
                    <h3 className={'font-medium ' + (darkMode ? 'text-white' : 'text-gray-900')}>Uploaded Photos ({uploadedPhotos.length})</h3>
                    <p className="text-xs text-gray-500 mb-2">Current = base photo • Historical = person to add</p>
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedPhotos.map(photo => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className={'w-full h-24 object-cover rounded-lg ' + (photo.enhanced ? 'ring-2 ring-green-400' : '')}
                          />
                          
                          {/* Photo Type Badge */}
                          <button
                            onClick={() => togglePhotoType(photo.id)}
                            className={'absolute top-1 right-1 px-2 py-1 text-xs rounded cursor-pointer hover:opacity-80 transition-opacity z-10 ' + 
                              (photo.type === 'historical' 
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                                : photo.type === 'background'
                                ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200')}
                            title="Click to cycle: Current → Historical → Background"
                          >
                            {photo.type === 'historical' ? 'Historical' : photo.type === 'background' ? 'Background' : 'Current'}
                            {photo.autoDetected && <span className="ml-1">🔍</span>}
                          </button>

                          {/* Enhancement Badge */}
                          {photo.enhanced && (
                            <div className="absolute top-1 left-1 bg-green-500 text-white px-2 py-1 text-xs rounded z-10">
                              ✨ Enhanced
                            </div>
                          )}
                          
                          {/* Photo Management Controls */}
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                            {/* Replace Photo */}
                            <button
                              onClick={() => replacePhoto(photo.id)}
                              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                              title="Replace Photo"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                            
                            {/* Enhance Photo (only for historical) */}
                            {photo.type === 'historical' && !photo.enhanced && (
                              <button
                                onClick={() => enhancePhoto(photo.id)}
                                disabled={enhancingPhotos.has(photo.id)}
                                className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Enhance Historical Photo"
                              >
                                {enhancingPhotos.has(photo.id) ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Zap className="h-3 w-3" />
                                )}
                              </button>
                            )}
                            
                            {/* Remove Photo */}
                            <button
                              onClick={() => removePhoto(photo.id)}
                              className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                              title="Remove Photo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scenario Selection */}
            <div className={'rounded-xl shadow-lg p-6 transition-colors duration-300 mt-6 ' + (darkMode ? 'bg-gray-800' : 'bg-white')}>
              <h2 className={darkMode ? 'text-xl font-bold text-white mb-4 flex items-center' : 'text-xl font-bold text-gray-900 mb-4 flex items-center'}>
                <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                Choose Scenario
              </h2>
              
              <div className="space-y-3">
                {scenarios.map(scenario => (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedScenario === scenario.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{scenario.title}</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{scenario.description}</p>
                  </button>
                ))}
              </div>

              {/* Image Orientation Selection */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Image Orientation</h4>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setImageOrientation('landscape')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      imageOrientation === 'landscape'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-4 h-3 bg-current rounded mr-2 opacity-60"></span>
                    Landscape (16:9)
                  </button>
                  <button
                    onClick={() => setImageOrientation('portrait')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      imageOrientation === 'portrait'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-3 h-4 bg-current rounded mr-2 opacity-60"></span>
                    Portrait (9:16)
                  </button>
                  <button
                    onClick={() => setImageOrientation('square')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      imageOrientation === 'square'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-3 h-3 bg-current rounded mr-2 opacity-60"></span>
                    Square (1:1)
                  </button>
                </div>
              </div>

              {/* Advanced Scenario Controls */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Advanced Scenario Settings</h4>
                  <button
                    onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {showAdvancedControls ? 'Hide' : 'Show'} Controls
                  </button>
                </div>
                
                {showAdvancedControls && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* Cultural Style */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cultural Style</label>
                      <select
                        value={scenarioSettings.culturalStyle}
                        onChange={(e) => setScenarioSettings({...scenarioSettings, culturalStyle: e.target.value})}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="western">Western</option>
                        <option value="traditional">Traditional</option>
                        <option value="multicultural">Multicultural</option>
                        <option value="vintage">Vintage</option>
                      </select>
                    </div>

                    {/* Time Period */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Time Period</label>
                      <select
                        value={scenarioSettings.timePeriod}
                        onChange={(e) => setScenarioSettings({...scenarioSettings, timePeriod: e.target.value})}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="modern">Modern (2020s)</option>
                        <option value="contemporary">Contemporary (2000s)</option>
                        <option value="classic">Classic (1980s-90s)</option>
                        <option value="vintage">Vintage (1950s-70s)</option>
                      </select>
                    </div>

                    {/* Clothing Style */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Clothing Style</label>
                      <select
                        value={scenarioSettings.clothingStyle}
                        onChange={(e) => setScenarioSettings({...scenarioSettings, clothingStyle: e.target.value})}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="formal">Formal</option>
                        <option value="semi-formal">Semi-formal</option>
                        <option value="casual">Casual</option>
                        <option value="elegant">Elegant</option>
                      </select>
                    </div>

                    {/* Location Style */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Setting</label>
                      <select
                        value={scenarioSettings.locationStyle}
                        onChange={(e) => setScenarioSettings({...scenarioSettings, locationStyle: e.target.value})}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="indoor">Indoor</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="studio">Studio</option>
                        <option value="natural">Natural Setting</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Validation Info */}
              {(uploadedPhotos.filter(p => p.type === 'current').length === 0 || uploadedPhotos.filter(p => p.type === 'historical').length === 0) && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Required for editing:</p>
                    <ul className="text-xs space-y-1 ml-2">
                      <li>• At least 1 <strong>Current</strong> photo (base image)</li>
                      <li>• At least 1 <strong>Historical</strong> photo (person to add)</li>
                      <li>• Optional: <strong>Background</strong> photo (moves ALL people to new setting)</li>
                    </ul>
                    {uploadedPhotos.filter(p => p.type === 'background').length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 rounded">
                        <p className="text-xs text-blue-800 font-medium">Background Mode Active:</p>
                        <p className="text-xs text-blue-700">All {uploadedPhotos.filter(p => p.type === 'current').length + uploadedPhotos.filter(p => p.type === 'historical').length} people will be moved to the new background setting.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={generateMemoryImage}
                disabled={!selectedScenario || uploadedPhotos.filter(p => p.type === 'current').length === 0 || uploadedPhotos.filter(p => p.type === 'historical').length === 0 || isGenerating}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {uploadedPhotos.filter(p => p.type === 'background').length > 0 
                      ? 'Moving Everyone to New Background...' 
                      : 'Editing Current Photo...'
                    }
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    {uploadedPhotos.filter(p => p.type === 'background').length > 0 
                      ? 'Move Everyone to New Background' 
                      : 'Add Historical Person(s)'
                    }
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Images Section */}
          <div className="lg:col-span-2">
            <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
              <h2 className={darkMode ? 'text-xl font-bold text-white mb-4 flex items-center' : 'text-xl font-bold text-gray-900 mb-4 flex items-center'}>
                <Users className="h-5 w-5 mr-2 text-green-500" />
                Edited Photos
              </h2>
              
              {generatedImages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p>No memories created yet</p>
                  <p className="text-sm">Upload photos and select a scenario to begin</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {generatedImages.map(image => (
                    <div key={image.id} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                            {image.scenario}
                            {demoMode && <span className="ml-2 text-orange-600 text-sm">(Demo Mode)</span>}
                          </h3>
                          <p className="text-sm text-gray-500 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {image.timestamp.toLocaleString()}
                            {image.processingTime && (
                              <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                {image.processingTime}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <div className="relative download-dropdown">
                            <button 
                              onClick={() => setShowDownloadOptions(showDownloadOptions === image.id ? null : image.id)}
                              className="flex items-center text-blue-600 hover:text-blue-700"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download HD
                            </button>
                            {showDownloadOptions === image.id && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                                <button
                                  onClick={() => {
                                    downloadImage(image, 'png');
                                    setShowDownloadOptions(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                >
                                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                  PNG (Best Quality)
                                </button>
                                <button
                                  onClick={() => {
                                    downloadImage(image, 'jpeg');
                                    setShowDownloadOptions(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                >
                                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                  JPEG (Smaller Size)
                                </button>
                                {image.url.includes('svg') && (
                                  <button
                                    onClick={() => {
                                      downloadImage(image, 'svg');
                                      setShowDownloadOptions(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                  >
                                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                    SVG (Vector)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => generateVariation(image)}
                            disabled={isGenerating}
                            className="flex items-center text-purple-600 hover:text-purple-700 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                            Variation
                          </button>
                        </div>
                      </div>
                      
                      <div className="mb-4 relative">
                        <img
                          src={image.url}
                          alt={"Generated " + image.scenario}
                          className="w-full h-96 object-contain rounded-lg bg-gray-50"
                          style={{
                            maxHeight: '70vh',
                            aspectRatio: '16/9'
                          }}
                        />
                        {demoMode && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                            DEMO
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Nano Banana Features Used:</span>
                            {image.quality && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                                {image.quality} Quality
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {image.features?.map((feature, idx) => (
                              <div key={idx} className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} bg-white rounded p-3`}>
                          <p className="font-medium mb-1">Editing Details:</p>
                          <p>Added {image.historicalPhotosUsed} historical person(s) to {image.currentPhotosUsed} current photo(s)</p>
                          {image.expectedPeopleCount && (
                            <div className="mt-2">
                              <p className="text-xs text-blue-600">
                                Expected {image.expectedPeopleCount} people in final image
                              </p>
                              <div className="mt-1 p-2 bg-yellow-50 rounded text-xs">
                                <p className="font-medium text-yellow-800">👁️ Quality Check:</p>
                                <p className="text-yellow-700">
                                  Can you see all {image.expectedPeopleCount} people with natural lighting and blending?
                                </p>
                                <div className="mt-1">
                                  <p className="font-medium text-yellow-800">If historical person is missing:</p>
                                  <ul className="text-yellow-600 ml-2">
                                    <li>• <strong>Try again</strong> - Generate a new variation</li>
                                    <li>• Enhance the historical photo first (⚡ button)</li>
                                    <li>• Use a clearer historical photo with visible face</li>
                                    <li>• Edit: "Add the missing historical person to the image"</li>
                                    <li>• Edit: "Make sure all {image.expectedPeopleCount} people are visible"</li>
                                  </ul>
                                </div>
                                <div className="mt-1">
                                  <p className="font-medium text-yellow-800">If blending looks unnatural:</p>
                                  <div className="ml-2 mb-2 p-2 bg-red-50 rounded text-xs">
                                    <p className="font-medium text-red-800">⚠️ Important:</p>
                                    <p className="text-red-700">Blending edits sometimes remove the historical person. If this happens, immediately edit with: "Add the missing historical person back to the image"</p>
                                  </div>
                                  <ul className="text-yellow-600 ml-2">
                                    <li>• Edit: "Improve lighting to match everyone in the scene"</li>
                                    <li>• Edit: "Create natural shadows for all people"</li>
                                    <li>• Edit: "Blend skin tones while keeping all people visible"</li>
                                    <li>• Edit: "Remove artificial edges but keep everyone in the image"</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                          {image.metadata?.baseImageUsed && (
                            <p className="text-xs text-gray-500 mt-1">
                              Base image: {image.metadata.baseImageUsed}
                            </p>
                          )}
                          {image.description && (
                            <p className="mt-2 text-xs text-gray-500">{image.description}</p>
                          )}
                          {image.editHistory && image.editHistory.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium text-xs">Conversational Edits:</p>
                              <ul className="text-xs text-gray-500 ml-2">
                                {image.editHistory.map((edit, idx) => (
                                  <li key={idx}>• {edit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {image.cost && (
                            <p className="mt-1 text-xs text-green-600">Cost: ${image.cost.toFixed(3)}</p>
                          )}
                        </div>
                        
                        {/* Individual Refine Section */}
                        <div className="mt-4 pt-4 border-t">
                          <button
                            onClick={() => setEditingImageId(editingImageId === image.id ? null : image.id)}
                            className="text-sm text-purple-600 hover:text-purple-700 flex items-center mb-3"
                          >
                            <Wand2 className="h-4 w-4 mr-1" />
                            {editingImageId === image.id ? 'Hide Refine Options' : 'Refine This Memory'}
                          </button>
                          
                          {editingImageId === image.id && (
                            <div className="space-y-3">
                              <div>
                                <div className="mb-3 p-2 bg-blue-50 rounded text-xs">
                                <p className="font-medium text-blue-800 mb-1">💡 Safe Editing Workflow:</p>
                                <ol className="text-blue-700 text-xs ml-2">
                                  <li>1. First check: Can you see all {image.expectedPeopleCount || 'expected'} people?</li>
                                  <li>2. If missing: "Add the missing historical person back"</li>
                                  <li>3. If visible but unblended: Use "while keeping all people visible" phrases</li>
                                  <li>4. If editing fails: Generate a Variation first</li>
                                </ol>
                              </div>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Quick suggestions:</p>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    "Add the missing historical person back to the image",
                                    `Make sure all ${image.expectedPeopleCount || 'expected'} people are visible`,
                                    "Improve lighting to match everyone in the scene",
                                    "Create natural shadows for all people",
                                    "Blend skin tones while keeping all people visible",
                                    "Remove artificial edges but keep everyone in the image"
                                  ].map(suggestion => (
                                    <button
                                      key={suggestion}
                                      onClick={() => setEditPrompt(suggestion)}
                                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={editPrompt}
                                  onChange={(e) => setEditPrompt(e.target.value)}
                                  placeholder="Describe what you'd like to change..."
                                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  onKeyPress={(e) => e.key === 'Enter' && handleEditRequest(image)}
                                />
                                <button
                                  onClick={() => handleEditRequest(image)}
                                  disabled={!editPrompt.trim() || isGenerating}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
                                >
                                  {isGenerating ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Wand2 className="h-4 w-4 mr-1" />
                                      Edit
                                    </>
                                  )}
                                </button>
                              </div>
                              
                              <p className="text-xs text-gray-500">
                                💡 Nano Banana maintains character consistency across all edits
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Photo Editing History */}
            {conversationHistory.length > 0 && (
              <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 mt-6 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Photo Editing History</h2>
                <div className="space-y-3">
                  {conversationHistory.map((entry, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        entry.type === 'generation' ? 'bg-purple-500' : 
                        entry.type === 'edit' ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{entry.content}</p>
                        <p className="text-xs text-gray-500">{entry.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryResurrectionEngine;