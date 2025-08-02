const emotionWeights = {
    "happy": 9, "sad": 2, "angry": 3, "anxious": 3, "calm": 8, 
    "excited": 9, "tired": 4, "neutral": 5, "fearful": 2, "confident": 8, 
    "grateful": 9, "frustrated": 3, "lonely": 2, "hopeful": 7, 
    "embarrassed": 3, "curious": 6, "jealous": 3, "guilty": 3, 
    "ashamed": 2, "proud": 9, "content": 8, "disappointed": 3, 
    "surprised": 6, "bored": 4, "overwhelmed": 3, "stressed": 2
  };
  
  function calculateMoodScore(emotions) {
    if (!emotions.length) return 5; // Neutral baseline if no emotions detected
  
    let totalWeight = 0;
    let weightedSum = 0;
  
    emotions.forEach(({ emotion, intensity }) => {
      const weight = emotionWeights[emotion] || 5; // Default neutral weight if not found
      weightedSum += weight * intensity;
      totalWeight += intensity;
    });
  
    const rawScore = totalWeight ? (weightedSum / totalWeight) : 5;
  
    // Normalize to 0-10 scale
    return Math.round((rawScore / 9) * 10);
  }
  
  return calculateMoodScore(emotions);