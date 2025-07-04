const axios = require('axios');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendRequestToOpenAI(model, message) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 1024,
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error(`Error sending request to OpenAI (attempt ${i + 1}):`, error.message, error.stack);
      if (i === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY);
    }
  }
}

async function sendRequestToAnthropic(model, message) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`Sending request to Anthropic with model: ${model} and message: ${message}`);
      const response = await anthropic.messages.create({
        model: model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 1024,
      });
      console.log(`Received response from Anthropic: ${JSON.stringify(response.content)}`);
      return response.content[0].text;
    } catch (error) {
      console.error(`Error sending request to Anthropic (attempt ${i + 1}):`, error.message, error.stack);
      if (i === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY);
    }
  }
}

async function sendLLMRequest(provider, model, message) {
  switch (provider.toLowerCase()) {
    case 'openai':
      return sendRequestToOpenAI(model, message);
    case 'anthropic':
      return sendRequestToAnthropic(model, message);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

// Generate social media content using OpenAI GPT-4.1 nano
async function generateSocialMediaContent(prompt, tone = 'professional', platforms = []) {
  try {
    console.log('🤖 Generating AI content with GPT-4.1 nano, prompt:', prompt);
    
    const toneInstructions = {
      professional: 'professional and informative',
      casual: 'casual and friendly',
      humorous: 'humorous and engaging',
      inspirational: 'motivational and inspiring',
      educational: 'educational and informative',
      promotional: 'promotional but not overly sales-focused',
      conversational: 'conversational and approachable'
    };

    const platformInstructions = platforms.length > 0 
      ? `This content will be posted on: ${platforms.join(', ')}. `
      : '';

    const systemMessage = `You are a social media content creator. Create engaging social media content that is ${toneInstructions[tone.toLowerCase()] || 'professional and engaging'}. 

${platformInstructions}Consider the following guidelines:
- Keep it concise and engaging
- Include relevant hashtags (2-5 hashtags maximum)
- Use emojis appropriately to enhance engagement
- Make it shareable and likely to generate interaction
- Ensure the content is authentic and valuable to the audience
- If multiple platforms are specified, create content that works well across all of them

User's request: ${prompt}

Generate only the social media post content, without any additional explanation or meta-commentary.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano', // Using GPT-4.1 nano as requested
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500, // Increased for social media content
      temperature: 0.7, // Good balance of creativity and coherence
    });

    const generatedContent = response.choices[0].message.content.trim();
    console.log('✅ AI content generated successfully');
    
    return generatedContent;
  } catch (error) {
    console.error('❌ Error generating AI content:', error);
    throw new Error(`Failed to generate AI content: ${error.message}`);
  }
}

module.exports = {
  sendLLMRequest,
  generateSocialMediaContent
};
