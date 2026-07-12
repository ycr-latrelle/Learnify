## S 

## S **Learnify** 

**Learnify** is a collaborative, AI-powered study application designed to help students learn together through interactive study sessions, real-time group chats, and intelligent AI assistance. 

## Ed 

## **Overview** 

Learnify enables students to: 

- Create or join **study sessions** (public or private) 

- Collaborate through **real-time group chats** 

- Receive **AI-powered assistance** for explanations, summaries, and quizzes 

The platform combines **modern web technologies** with **multi-model AI integration** to enhance the learning experience. 

## **Key Features** 

## ge **Study Sessions** 

- Public and private sessions 

- Invite system (links or codes) 

- Role-based participation (Host, Members) 

## SS) **Real-Time Group Chat** 

- Powered by Firebase 

- Instant messaging within study groups 

- Integrated AI responses inside chat 

## ee **AI-Powered Assistance** 

- Multi-model AI support: 

- OpenAI 

- QwenAI 

- (Planned: Claude, Gemini) 

- AI capabilities: 

- Explain concepts (ELI5 → College level) 

- Summarize discussions 

- Generate quizzes 

- Answer questions in context 

1 

## ai() **Authentication** 

- Firebase Authentication 

- Secure token validation via backend 

## **🏗️** eee **System Architecture** 

## eee 

`Frontend (React) ↓ ASP.NET Web API (Core Backend / Gateway) ↓ Flask API (AI Service Layer) ↓ AI Providers (OpenAI, Qwen, Claude, Gemini)` 

- `+ Firebase → Authentication & Real-time Chat + Supabase → User & Session Data Storage` 

## **⚙️** ®) **Tech Stack** 

## **Frontend** 

- React.js 

## **Backend** 

- ASP.NET Web API (C#) 

- Flask API (Python) 

## **Databases & Services** 

- Firebase (Authentication + Chat) 

- Supabase (User & Session Data) 

## **AI Integration** 

- OpenAI API 

- QwenAI API 

- Extensible for Claude & Gemini 

2 

## **Service Responsibilities** 

## **ASP.NET Web API** 

- API Gateway 

- Authentication validation (Firebase) 

- Rate limiting & caching 

- Business logic & routing 

- Communication with Flask AI service 

## **Flask AI Service** 

- AI orchestration layer 

- Model selection & routing 

- Prompt engineering 

- Context processing (chat history) 

- Unified AI response formatting 

## **AI Request Flow** 

```
User sends message
        ↓
Firebase stores message
        ↓
ASP.NET validates & processes request
        ↓
ASP.NET calls Flask AI service
        ↓
Flask processes context + calls AI model
        ↓
AI response returned to ASP.NET
        ↓
Stored in Firebase chat
        ↓
Displayed to users in real-time
```

## **Project Structure** 

```
Learnify/
│
├── frontend/                # React application
│
```

3 

```
├── backend/
│   ├── aspnet-api/          # ASP.NET Web API
│   └── ai-service/          # Flask AI service
│
├── docker-compose.yml       # (optional)
└── README.md
```

## **Getting Started** 

## **Prerequisites** 

- Node.js • .NET SDK 

- Python 3.x • Firebase account • Supabase account 

- API keys (OpenAI, Qwen, etc.) 

## **1. Frontend Setup** 

```
cdfrontend
npminstall
npmstart
```

## **2. ASP.NET Backend** 

```
cdbackend/aspnet-api
dotnetrun
```

## **3. Flask AI Service** 

```
cdbackend/ai-service
pipinstall-rrequirements.txt
pythonapp.py
```

4 

## wai? **Environment Variables** 

Create `.env` files for each service: 

## **ASP.NET** 

- Firebase credentials 

- Supabase connection • Flask service URL 

## **Flask** 

- OpenAI API Key 

- Qwen API Key • Other AI provider keys 

## sf 

## sf **Future Improvements** 

- AI personalization per student 

- Study analytics dashboard 

- Gamification system (XP, achievements) 

- Smart AI tutor with adaptive difficulty 

- Voice-based study sessions 

## **Status** 

Currently in development Planned for scalable, production-ready deployment 

## **Author** 

Antonio Tantiado 

## **License** 

This project is for educational and development purposes. 

5 

