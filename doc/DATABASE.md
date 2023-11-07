# Database

## Overview

This document presents an overview of our database. It is subject to change

### Users

This table holds required information for each `user` who has created an account

| Field         | Type         | Description     | Requirements     |
| ------------- | ------------ | --------------- | ---------------- |
| id            | serial       | unique id       | PK               |
| username      | varchar(255) |                 | Unique, Not Null |
| email         | varchar(254) |                 | Unique, Not Null |
| password      | varchar(255) | hashed password | Not Null         |
| salt          | varchar(255) |                 |                  |
| profile_image | varchar(255) | url to image    |                  |
| created_at    | timestamp    |                 | Not Null         |
| updated_at    | timestamp    |                 | Not Null         |

### Games

This table holds information for each `game` that a **logged in**`user` creates

| Field       | Type         | Description                                          | Requirements |
| ----------- | ------------ | ---------------------------------------------------- | ------------ |
| id          | serial       | unique id                                            | PK           |
| card_id     | int          | id for the card currently on top of the discard pile | FK           |
| player_id   | int          | id for player whose turn it is                       | FK           |
| max_players | int          | max number of players allowed in game                | Range [2,5]  |
| lobby_size  | int          | current lobby size                                   | Range [1,5]  |
| name        | varchar(20)  | name of game (for searching)                         | Unique       |
| password    | varchar(255) | password to enter game                               |              |
| direction   | enum         | turn direction                                       |              |
| active      | bool         | is the game active or not                            | Not Null     |
| created_at  | timestamp    |                                                      | Not Null     |
| updated_at  | timestamp    |                                                      | Not Null     |

### Game_Users

A logged in `user` must be able to play multiple games at once (each in a different tab). This table defines that relationship
allowing the `user` to play multiple games at the same time

| Field   | Type | Description     | Requirements |
| ------- | ---- | --------------- | ------------ |
| user_id | int  | id for the user | FK, PK       |
| game_id | int  | id for the game | FK, PK       |
| seat    | int  |                 |              |

### Cards

This is a lookup table for a deck of games

| Field  | Type | Description        | Requirements |
| ------ | ---- | ------------------ | ------------ |
| id     | int  | unique id          | PK, Serial   |
| color  | enum | color of the card  | Not Null     |
| symbol | enum | symbol of the card | Not Null     |

### Game_Cards

This table stores the information required for mapping each `user's` hand to the correct `game`

| Field      | Type | Description                                                     | Requirements |
| ---------- | ---- | --------------------------------------------------------------- | ------------ |
| card_id    | int  | unique id for card                                              | FK, PK       |
| game_id    | int  | unique id for game associated with this card                    | FK, PK       |
| user_id    | int  | unique id for user associated with this card & game             | FK, PK       |
| card_order | int  | shuffle order of card in deck and order of card in players hand | Not Null     |

### Directions

This is an enum that represents which direction turns are rotating in

| Value            |
| ---------------- |
| clockwise        |
| counterclockwise |

### Colors

This is an enum for the possible card colors

| Value  |
| ------ |
| red    |
| green  |
| blue   |
| yellow |
| wild   |

### Symbols

This is an enum for the possible card symbols

| Value          |
| -------------- |
| zero           |
| one            |
| two            |
| three          |
| four           |
| five           |
| six            |
| seven          |
| eight          |
| nine           |
| skip           |
| draw_two       |
| draw_four      |
| reverse        |
| wild           |
| wild_draw_four |
