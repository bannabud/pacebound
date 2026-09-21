# Pacebound

Pacebound is a focused daily task tracker with a retro Pokemon battle interface. Set a task goal, choose a starter, log completed work, and use the battle screen to see your pace throughout the day.

## What It Does

- Set a daily task goal and optional workday length.
- Choose Charmander, Bulbasaur, or Squirtle as your starter.
- Track completed tasks with three categories:
  - `R` - Retenu / Flame Charge
  - `NR` - Non Retenu / Psybeam
  - `HL` - Hors Limite / Quick Attack
- See current pace, target pace, run status, active time, and progress.
- Pause, resume, undo the last task, or end the day.
- Watch the battle state change as tasks are completed, including evolution and revival events.
- Export the finished run as an `.xlsx` workbook with task, daily summary, category, and hourly summary sheets.

## Using the App

1. Enter your daily task goal.
2. Optionally enable custom workday hours.
3. Select a starter Pokemon.
4. Start the run with `THROW OUT`.
5. Select a task category and press `LINE COMPLETE` whenever a task is finished.
6. End the run to review the summary and export the data.

### Keyboard Controls

| Key | Action |
| --- | --- |
| `1` | Select `R` |
| `2` | Select `NR` |
| `3` | Select `HL` |
| `Space` | Complete a task |
| `P` | Pause or resume |
| `U` | Undo the last task |

## Tech Stack

- React 18
- Vite
- Vitest
- SheetJS (`xlsx`) for workbook export
- Static Pokemon sprites in `public/assets/pokemon/`

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Open [http://localhost:3000/](http://localhost:3000/) in your browser.

## Production Build

Create the production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

The app is configured with the `/pacebound/` base path for project-site hosting. Keep that base path aligned with the URL where the app is deployed. Sprite URLs use the Vite base path so the images continue to load in the production build.

## Project Structure

```text
src/
  App.jsx       Main application and run logic
  App.css       Interface, device shell, battle screen, and responsive styles
  index.jsx     React entry point
public/
  assets/
    pokemon/    Static starter and opponent sprites
index.html      HTML entry point
vite.config.js  Vite and deployment configuration
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Vite development server on port 3000 |
| `npm run build` | Build the production bundle |
| `npm run preview` | Serve the production bundle locally |
| `npm test` | Run the Vitest test runner |
