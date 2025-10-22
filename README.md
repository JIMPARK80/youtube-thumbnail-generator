# 🎬 YouTube Thumbnail Phrase Generator

AI-powered YouTube thumbnail phrase generation web application.

## ✨ Key Features

- **3-Step Generation**: Basic Info → Core Message → Thumbnail Creation
- **AI-Powered Generation**: High-quality phrase generation using Claude API
- **Keyword Highlighting**: Color-coded emphasis for numbers, warnings, and information
- **Real-time Editing**: Live editing of generated phrases
- **Usage Limiting**: Daily 100 requests per IP for cost management
- **Password Security**: Family/friends only access control

## 🚀 Deployment

### Vercel Deployment

1. **Connect GitHub Repository**
   - Import GitHub repository at Vercel.com
   - Set up automatic deployment

2. **Environment Variables Setup**
   ```
   CLAUDE_API_KEY=your-claude-api-key-here
   ACCESS_PASSWORD=your-secure-password
   ```

3. **Deployment Complete**
   - Access the URL provided by Vercel
   - Enter password to use the service

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Configure API key and password in .env file

# Start server
npm start
```

## 📋 Usage

1. **Enter Password**: Input family/friends access password
2. **Basic Information**: Video topic, target audience, gender, etc.
3. **Core Message Setup**: Shock points, authority elements, etc.
4. **Generate Phrases**: AI creates 5 thumbnail phrases
5. **Edit and Modify**: Real-time editing of generated phrases

## 🔧 Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **AI**: Claude API (Anthropic)
- **Deployment**: Vercel
- **Styling**: CSS3, Flexbox, Grid

## 📊 Usage Management

- **Daily Limit**: 100 requests per IP
- **Auto Reset**: Every midnight
- **Real-time Display**: Usage shown in header

## 🔐 Security

- **Password Authentication**: Access control
- **IP-based Limiting**: Usage management
- **API Key Protection**: Server-side processing

## 📝 License

Created for personal/family use.

---

Made with ❤️ for family and friends