# Secrets Hub

Secrets Hub is a polished front-end web application that connects to the Secrets API and lets users explore public secrets, authenticate, create content, update existing records, and manage personal submissions.

## Purpose

The app demonstrates how a modern web experience can sit on top of a real REST API while covering public, basic-auth, API-key, and bearer-token authentication flows.

## Features

- Register a new account
- Log in and persist a session
- Log out securely
- View a public random secret
- Browse the full secret collection
- Filter secrets by embarrassment score using the API key flow
- Create new secrets with validation
- Inspect a specific secret
- Update a secret with PUT
- Partially update a secret with PATCH
- Delete a secret with confirmation
- View only the secrets created by the signed-in user

## Technologies used

- HTML
- CSS
- JavaScript
- Fetch API
- Async/await
- DOM manipulation
- Local session storage

## How to run locally

1. Install Node.js if it is not already available on your machine.
2. From the project root, start the local proxy server:
   - `npm start`
3. Visit `http://localhost:3000` in the browser.

The app uses a small local proxy so browser requests can reach the remote Secrets API without CORS errors.

## Challenges encountered

- The API uses multiple authentication patterns across different endpoints, so the app needed a clean state manager to switch between basic auth, API key requests, and bearer tokens.
- The API returns different response shapes depending on the route, so the UI had to handle both object and array payloads carefully.
- Form validation and feedback were added so the experience feels like a real product rather than a raw API test page.

## What I learned

- How to integrate a REST API with multiple authentication methods in a single front-end experience.
- How to build a responsive dashboard with CRUD-style actions while keeping the UI easy to follow.
- How to provide meaningful loading, success, and error feedback for asynchronous requests.

## Deployment

This project is ready to be deployed as a static site on GitHub Pages, Netlify, or Vercel. Upload the project files to your hosting provider and open the published URL.
