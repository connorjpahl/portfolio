# Connor Pahl — Portfolio Website

A personal portfolio site built as part of Nucamp's Web Development Bootcamp.
It's a single page with sections for an intro, an about-me blurb, skills, a
live sports scoreboard, project cards, and a contact form.

## How to view it

No installation or build step required — just open `index.html` in a web
browser (double-click the file, or right-click → "Open with" your browser
of choice).

## The technologies, explained simply

This project uses the four core building blocks taught in the front-end
module of the bootcamp:

### HTML — the structure
Think of HTML as the skeleton of the page. It defines what's on the page
and in what order: headings, paragraphs, images, buttons, form fields, and
so on. It doesn't handle *how things look* — just *what exists*.
File: [`index.html`](index.html)

### CSS — the styling
CSS is the paint, layout, and design. It controls colors, fonts, spacing,
and how elements are arranged on the screen — including making the page
resize gracefully on phones, tablets, and desktops (this is called
**responsive design**).
File: [`css/style.css`](css/style.css)

### Bootstrap — a CSS/JS toolkit
Bootstrap is a pre-built library of ready-made design components (buttons,
navigation bars, cards, grids, form styles) so you don't have to design
every piece from scratch. It's loaded from a CDN (a hosted copy on the
internet), which is why there's no install step — the browser just
downloads it when the page loads. It also handles some interactive bits,
like the collapsing mobile navigation menu.

### JavaScript — the behavior
JavaScript makes the page interactive. Without it, a web page just sits
there. With it, the page can react to what a user does — for example,
highlighting the current section in the nav bar as you scroll, showing a
"back to top" button, or checking that a contact form was filled out
correctly before showing a success message.
File: [`js/script.js`](js/script.js)

### API — pulling in live data
An API (Application Programming Interface) is how one program asks another
program for data. This site's **Scoreboard** section calls the free, public
[MLB Stats API](https://statsapi.mlb.com) to fetch today's live scores for
the St. Louis Cardinals major league club and all four of its minor league
affiliates (Memphis Redbirds, Springfield Cardinals, Peoria Chiefs, and
Palm Beach Cardinals). The
JavaScript sends a `fetch()` request, gets back data in **JSON** format
(a structured, text-based way of representing data), and uses it to build
the score cards on the page — no page reload required, and it refreshes
itself automatically every 30 seconds while a game is being watched.
Clicking a card fetches that game's full box score in a popup, including
each player's stats for the game as well as their season-long AVG/OBP/SLG
(their "slash line") and OPS, and ERA/WHIP for pitchers.
File: [`js/scoreboard.js`](js/scoreboard.js)

## Project structure

```
portfolio/
├── index.html          # Page structure and content
├── css/
│   └── style.css       # Custom styling on top of Bootstrap
├── js/
│   ├── script.js        # Interactivity (nav highlighting, form validation, etc.)
│   └── scoreboard.js     # Fetches live Cardinals MLB/MiLB scores from the MLB Stats API
├── images/              # Profile photo and project screenshots (placeholders for now)
└── README.md
```

## Customizing this site

- Swap the placeholder text in the **About** section for your own bio.
- Replace `images/profile-placeholder.svg` with a real photo.
- Update the **Projects** section with real project names, descriptions,
  screenshots, and links as you build them throughout the course.
- Update the social links and email address in the footer.
- Update the phone number and email address in the **Contact Me** section.
- The Scoreboard section uses MLB's free public API, which is unofficial
  and undocumented (no guaranteed uptime or support), but requires no API
  key or sign-up. If a team has no game that day, its card will say so.
