# Second Brain - Personal Task & Memory Management

Ein eigenständiges Modul für persönliche Aufgabenverwaltung und Gedächtnis-Speicherung.

## Features

- ✅ **Aufgabenverwaltung** (Tasks, Todos, Termine, Events)
- ✅ **Kontext-Speicherung** (Notizen, Links, Informationen)
- ✅ **Semantische Suche** (optional mit Vector Store)
- ✅ **Prioritäts-Management** (Eisenhower-Matrix)
- ✅ **Benutzer-Präferenzen** (lernfähiges System)
- ✅ **REST API** (Express Routes)
- ✅ **Frontend-Komponente** (ES6 Modul)

## Installation

```bash
npm install
```

## Quick Start

### Backend Server starten

```bash
npm start
```

Der Server läuft standardmäßig auf `http://localhost:3001`

### Mit Umgebungsvariablen

```bash
PORT=3001 API_KEY=your-secret-key npm start
```

## Projekt-Struktur

```
.
├── src/
│   ├── storage/
│   │   └── BrainStorage.js    # Storage-Klasse
│   ├── api/
│   │   └── routes.js           # Express Routes
│   ├── index.js                # Haupt-Export
│   └── server.js               # Standalone Server
├── frontend/
│   └── SecondBrain.js         # ES6 Frontend-Modul
├── data/
│   └── brain/                  # Daten-Speicher (wird automatisch erstellt)
├── examples/
│   ├── standalone-server.js    # Beispiel-Server
│   └── frontend-example.html   # Beispiel-Frontend
├── package.json
└── README.md
```

## Verwendung

### Backend

```javascript
const express = require('express');
const { BrainStorage, createBrainRoutes } = require('./src');

const app = express();
app.use(express.json());

// Erstelle Storage-Instanz
const brainStorage = new BrainStorage({
    storagePath: './data/brain',
    vectorStore: null // Optional: Vector Store für semantische Suche
});

// Erstelle Routes
const brainRoutes = createBrainRoutes(brainStorage, {
    authMiddleware: (req, res, next) => {
        // Deine Auth-Logik hier
        next();
    }
});

app.use('/api/brain', brainRoutes);
app.listen(3001);
```

### Frontend

```javascript
import { secondBrain } from './frontend/SecondBrain.js';

// Setze API-URL
secondBrain.setApiBase('http://localhost:3001/api/brain');

// Lade Daten
await secondBrain.init();
```

## API-Endpunkte

### GET `/api/brain`
Lädt alle Brain-Daten (Tasks, Contexts, Graph, Preferences)

### GET `/api/brain/tasks?status=open&priority=high`
Lädt Tasks mit Filtern

**Query-Parameter:**
- `status`: `all`, `open`, `completed`, `deferred`
- `priority`: `all`, `low`, `medium`, `high`, `urgent`
- `category`: Kategorie-Name

### POST `/api/brain/tasks`
Erstellt eine neue Task

**Body:**
```json
{
    "title": "Aufgabe",
    "description": "Beschreibung",
    "type": "todo",
    "priority": "high",
    "deadline_at": "2026-02-10T10:00:00Z"
}
```

### PUT `/api/brain/tasks/:id`
Aktualisiert eine Task

### DELETE `/api/brain/tasks/:id`
Löscht eine Task

### POST `/api/brain/query`
Semantische Suche

**Body:**
```json
{
    "query": "Was gibt es heute zu tun?",
    "limit": 5,
    "threshold": 0.4
}
```

## Daten-Struktur

Daten werden in JSON-Format gespeichert:

```
data/brain/personal_brain.json
```

**Format:**
```json
{
    "tasks": [
        {
            "id": "unique-id",
            "title": "Aufgabe",
            "description": "...",
            "type": "todo",
            "priority": "high",
            "status": "open",
            "timestamp": "2026-02-02T10:00:00Z"
        }
    ],
    "contexts": [
        {
            "id": "unique-id",
            "content": "Notiz",
            "tags": ["tag1", "tag2"],
            "timestamp": "2026-02-02T10:00:00Z"
        }
    ],
    "graph": {
        "nodes": [],
        "edges": []
    },
    "preferences": {}
}
```

## Entwicklung

### Server im Watch-Modus

```bash
npm run dev
```

### Daten-Ordner

Der `data/` Ordner wird automatisch erstellt. Er ist in `.gitignore` enthalten.

## Lizenz

MIT

## Autor

Thomas Baier
