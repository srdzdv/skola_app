# Skola App

A school management mobile application built with React Native and Expo. Skola provides a centralized platform for managing school operations including student groups, communications, events, payments, access control, and administration.

## Features

### Grupos (Groups)
- Manage student groups and classes
- View class activities and lesson plans
- Send messages and share attachments within groups

### Comunicacion (Communication)
- School-wide messaging system
- Read receipts and seen-by tracking
- Real-time notifications via PubNub
- File and image attachments

### Eventos (Events)
- Create and manage school events
- RSVP and attendance tracking
- Event details with attachments

### Administracion (Administration)
- **Accesos** — QR code scanning for student entry/exit with real-time monitoring and reports
- **Estudiantes** — Student database and record management (expedientes)
- **Pagos** — Payment tracking and creation, account statements
- **Credenciales** — QR credential generation for students
- **Usuarios** — User management
- **Paquetes** — Service package management
- **Informacion** — School information and documents
- **Facturas** — Invoice creation and management

## Tech Stack

- **React Native** 0.81 with **Expo** 54 (Managed workflow, EAS builds)
- **TypeScript**
- **MobX-State-Tree** for state management
- **React Navigation** 6 (native stack + bottom tabs)
- **Parse Server** as the primary backend
- **Firebase** for authentication and Firestore
- **AWS S3** for file/image storage
- **PubNub** for real-time messaging
- **SQLite** for local caching
- **Expo Notifications** for push notifications

## Getting Started

### Prerequisites

- Node.js >= 16
- Expo CLI
- EAS CLI (for builds)

### Install

```bash
npm install
```

### Run

```bash
npm start
```

### Build

```bash
# iOS
npm run build:ios:dev       # Development device build
npm run build:ios:prod      # Production build

# Android
npm run build:android:dev   # Development device build
npm run build:android:prod  # Production build
```

## Project Structure

```
app/
├── components/    # Reusable UI components
├── config/        # Environment configuration
├── i18n/          # Internationalization
├── models/        # MobX-State-Tree stores
├── navigators/    # React Navigation setup
├── screens/       # Screen components
├── services/      # Backend integrations (Parse, Firebase, AWS, PubNub, SQLite)
├── theme/         # Colors, typography, spacing
├── utils/         # Helpers and utilities
└── app.tsx        # App entry point
```
