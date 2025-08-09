# 🧠 MoodMate – Your AI Companion for Mental Wellness

MoodMate is a smart, AI-powered mental wellness assistant designed to support emotional health through journaling, emotion tracking, stress detection, habit formation, chatbot conversations, and psychologist booking. Built during the MindScape Hackathon 2025 (Theme: Mental Health Technology Support), the project was awarded *2nd Place* for its innovation and impact.

## 🚀 Features

- ✍ *Emotion Journal* – Write daily entries and receive insights with colored emotion word highlights and overall emotional scores.
- 📊 *Emotion & Stress Analysis* – Detect emotional patterns and stress levels using advanced AI models.
- 🤖 *Agentic Chatbot* – An intelligent assistant that tracks user goals, engages proactively, and supports wellness journeys.
- 📅 *Emotion Calendar* – Visualize daily emotional trends across time.
- 🎯 *Habit Builder* – Replace negative habits with positive alternatives using AI-suggested micro-habits.
- 🔐 *Secure Auth System* – Login/signup flow with bcrypt hashing and JWT token-based authentication.
- 🧑‍⚕ *Psychologist Booking Page* – Connects users to professionals through a commission-based booking model.
- 🧠 *Mental Health Risk Detection from Tweets* – Analyzes user-provided tweets to detect high-risk emotional content.

---

## 🛠 Tech Stack

- *Frontend*: ReactJS, TailwindCSS  
- *Backend*: FastAPI  
- *LLMs & Models*:  
  - IBM Watsonx Granite  
  - Hugging Face Transformers  
  - Mistral via OpenRouter  
- *Cloud*:  
  - AWS EC2 (hosting)  
  - AWS S3 (storage)   
- *Database*:  
  - DynamoDB  
- *Other*:  
  - bcrypt for password security  
  - APScheduler for scheduled tweet analysis  

---

### 🧠 AI & ML Models
- *Emotion Detection*: j-hartmann/emotion-english-distilroberta-base (via Hugging Face)
- *Stress & Mental Risk Analysis*: ibm-granite/granite-guardian-3.2-3b-a800m (via IBM Watsonx)
- *Conversational AI*: mistralai/mistral-small-3.2-24b-instruct via *OpenRouter API*

### ☁ Cloud & Infra (AWS)
- EC2 – Backend hosting
- S3 – File/data storage
- Lambda – Scheduled tasks and async processing
- DynamoDB – NoSQL database for journaling, chatbot memory, user data

---

## 🏆 Hackathon Achievement

- 🗓 *Event*: MindScape Hackathon 2025  
- 🧠 *Theme*: Mental Health Technology Support  
- 🏫 *Hosted by*: BNMIT, in association with IBM SkillsBuild, 1M1B, and AWS  
- 🥈 *Award*: Secured 2nd Place  

---

## 🔮 Future Scope

- 🎙 Integrate *voice journaling* with speech-to-text and sentiment analysis  
- 📅 Expand psychologist booking with *calendar sync* and *video consultation*  
- 📱 Launch a cross-platform *mobile app* using React Native or Flutter  
- 🧠 Enhance agentic AI with *vector memory* and *custom Retrieval-Augmented Generation (RAG)*  

---

## 🌍 Anticipated Impact

- Promote *daily emotional reflection* and long-term mental resilience  
- Enable *early detection* of mental health issues via LLM-powered analysis  
- Encourage *healthier lifestyle habits* with minimal friction  
- Improve access to support through a scalable psychologist network  

---
