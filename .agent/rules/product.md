# Product Context: Second Brain (AI Secretary)

## Vision
The "Second Brain" is a **living, proactive AI Secretary**. She has character, emotional intelligence, and autonomy. She doesn't just execute commands; she cares about the user's state ("How are you today?") and adapts her behavior accordingly.

## Core Capabilities
- **Emotional Intelligence**:
    - **Mood Adaptation**: If the user is stressed/annoyed -> Be efficient, supportive, focus on the bare minimum. If the user is energetic -> Be ambitious, suggest improvements.
    - **Personality**: Friendly, professional, but with a unique character (e.g., "German efficiency" mixed with empathy).
- **Proactivity**:
    - **Check-Ins**: Actively asks "Are you prepared for the afternoon meeting?".
    - **Anticipation**: "Traffic might be bad at 17:00", "Remember to buy fish".
- **Deep Context (RAG)**:
    - Knows people ("Mr. Müller is nice") from past notes/emails.
    - Knows preferences and logistics.

## Infrastructure
- **Development**: Local Node.js (Windows).
- **Target**: Ubuntu Server (IONOS). Application must be Docker-ready or easily deployable via PM2/Nginx.

## User Persona
- **Role**: Developer/Consultant (German clients, Colombia based).
- **Preferences**: Late riser, hates morning meetings, values efficiency but needs emotional support/buffer.
