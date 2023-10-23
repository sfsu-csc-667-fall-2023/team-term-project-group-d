# Uno

## Project Specification

Milestone one presentation : [link](https://docs.google.com/presentation/d/1OMjyxKC7_71eLOA2IwYtNWtkrLsH_sS8Zbw9jitxQy8/edit?usp=sharing)

### Technologies

- Javascript
- HTML
- CSS
- Node.js
- Express.js
- Postgres
- EJS
- Socket.IO
- Render

### Features

- Homepage (non-authenticated)
- Homepage (authenticated)
- User Authentication
  - Login
  - Signup
  - Logout
  - Lock other features behind login, e.g : can only start a game if logged in
- Real Time Chat
  - Homepage (authenticated), pregame lobby, and in-game
- Necessary Game State
  - persisted in a database on the server (not in the client)
  - must be updated in real time in response to user events and interaction with the game
- User can reconnect to a game if they close the tab
- Arbitrary Number of games
  - app can support an infinite number of games
  - users can participate an any number of games in different tabs
- Appearance
  - looks like UNO
- User has
  - Profile Picture
  - username

### Game Features

- Official UNO [rules](https://www.unorules.com/)
- UNO deck
- Each player has a current hand
- Discard Pile
- Player can
  - play a game
  - leave a game
  - play a card
  - draw a card(s)
  - win a game
  - lose a game
  - type in in-game chat
  - create a game
- "UNO" button
- Turn rotation (clockwise rotation)
- Action cards

### Wireframes

Wireframes are inside the presentation linked above
