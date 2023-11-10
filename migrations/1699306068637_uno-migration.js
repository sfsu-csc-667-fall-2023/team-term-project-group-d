/* eslint-disable camelcase */

const cardData = require("../data/seed-data");
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType("colors", ["red", "green", "blue", "yellow", "wild"]);
  pgm.createType("directions", ["clockwise", "counterclockwise"]);
  pgm.createType("symbols", [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "skip",
    "draw_two",
    "draw_four",
    "wild_draw_four",
    "reverse",
    "wild",
  ]);

  pgm.createTable("cards", {
    id: { type: "serial", primaryKey: true, notNull: true, unique: true },
    color: { type: "colors", notNull: true },
    symbol: { type: "symbols", notNull: true },
  });
  pgm.createTable("users", {
    id: { type: "serial", primaryKey: true, notNull: true },
    username: { type: "varchar(255)", notNull: true, unique: true },
    email: { type: "varchar(254)", notNull: true, unique: true },
    password: { type: "varchar(255)", notNull: true },
    salt: { type: "varchar(255)", notNull: true },
    profile_image: { type: "varchar(255)", notNull: true },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.createTable("games", {
    id: { type: "serial", primaryKey: true, notNull: true },
    card_id: {
      type: "integer",
      notNull: true,
      unique: true,
      references: "cards",
    },
    player_id: {
      type: "integer",
      notNull: true,
      unique: true,
      references: "users",
    },
    name: { type: "varchar(20)", notNull: true, unique: true },
    max_players: { type: "integer", default: 5 },
    lobby_size: { type: "integer", default: 1 },
    password: { type: "varchar(255)" },
    active: { type: "boolean", default: false },
    direction: { type: "directions", default: "clockwise" },
    createdAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    started_at: {
      type: "timestamp",
    },
  });
  pgm.createTable("game_cards", {
    card_id: { type: "integer", primaryKey: true, references: "cards" },
    game_id: { type: "integer", primaryKey: true, references: "games" },
    user_id: { type: "integer", primaryKey: true, references: "users" },
    card_order: { type: "integer" },
  });
  pgm.createTable("game_users", {
    users_id: {
      type: "integer",
      primaryKey: true,
      notNull: true,
      references: "users",
    },
    game_id: {
      type: "integer",
      primaryKey: true,
      notNull: true,
      unique: true,
      references: "games",
    },
    seat: { type: "integer", notNull: true, unique: true },
  });

  cardData.forEach((card) => {
    pgm.sql(
      `INSERT INTO cards (color, symbol) VALUES ('${card.color}', '${card.symbol}');`,
    );
  });
};

exports.down = (pgm) => {
  pgm.dropTable("users", { ifExists: true, cascade: true });
  pgm.dropTable("games", { ifExists: true, cascade: true });
  pgm.dropTable("cards", { ifExists: true, cascade: true });
  pgm.dropTable("game_cards", { ifExists: true, cascade: true });
  pgm.dropTable("game_users", { ifExists: true, cascade: true });

  pgm.dropType("colors", { ifExists: true, cascade: true });
  pgm.dropType("directions", { ifExists: true, cascade: true });
  pgm.dropType("symbols", { ifExists: true, cascade: true });
};
