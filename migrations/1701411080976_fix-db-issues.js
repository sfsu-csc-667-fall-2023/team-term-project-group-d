/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // USERS
  pgm.dropColumn("users", "profile_image");

  // GAMES
  pgm.dropConstraint("games", "games_card_id_key"); // games.card_id should NOT be unique - a single card id can be used in multiple games

  pgm.dropConstraint("games", "games_player_id_key"); // games.player_id should NOT be unique - a single user id can be used in multiple games

  pgm.dropColumn("games", "lobby_size");

  pgm.alterColumn("games", "max_players", { default: "4" });

  pgm.renameColumn("games", "player_id", "current_player_id");
  pgm.alterColumn("games", "current_player_id", { allowNull: true });

  pgm.renameColumn("games", "createdAt", "created_at");

  // GAME_CARDS
  pgm.dropConstraint("game_cards", "game_cards_pkey", { ifExists: true });
  pgm.alterColumn("game_cards", "user_id", { allowNull: true });
  pgm.addConstraint("game_cards", "game_cards_pkey", {
    primaryKey: ["card_id", "game_id"],
  });

  // GAME_USERS
  pgm.dropConstraint("game_users", "game_users_game_id_key"); // game_users.game_id should NOT be unique - prevents multiple users from being in same game

  pgm.dropConstraint("game_users", "game_users_seat_key"); // game_users.seat should NOT be unique - prevents users across multiple games from having same seat number

  pgm.alterColumn("game_users", "seat", { allowNull: true });
};

exports.down = (pgm) => {
  // USERS
  pgm.addColumn("users", {
    profile_image: { type: "varchar(255)", notNull: true, default: " " },
  });

  // GAMES
  pgm.addConstraint("games", "games_card_id_key", { unique: "card_id" });

  pgm.renameColumn("games", "current_player_id", "player_id");
  pgm.alterColumn("games", "player_id", { allowNull: false });

  pgm.addConstraint("games", "games_player_id_key", { unique: "player_id" });

  pgm.addColumn("games", { lobby_size: { type: "integer", default: "1" } });

  pgm.alterColumn("games", "max_players", { default: "5" });

  pgm.renameColumn("games", "created_at", "createdAt");

  // GAME_CARDS
  pgm.dropConstraint("game_cards", "game_cards_pkey", { ifExists: true });
  pgm.alterColumn("game_cards", "user_id", { allowNull: false });
  pgm.addConstraint("game_cards", "game_cards_pkey", {
    primaryKey: ["card_id", "game_id", "user_id"],
  });

  // GAME_USERS
  pgm.addConstraint("game_users", "game_users_game_id_key", {
    unique: "game_id",
  });

  pgm.addConstraint("game_users", "game_users_seat_key", { unique: "seat" });

  pgm.alterColumn("game_users", "seat", { allowNull: false });
};
